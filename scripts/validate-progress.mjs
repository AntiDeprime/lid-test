import assert from "node:assert/strict";
import { applyAnswer, summarizeProgress, toggleBookmark } from "../modules/progress.js";
import { createEmitter } from "../modules/emitter.js";
import { MAX_BOX, REVIEW_INTERVAL_DAYS, isDue, scheduleAnswer } from "../modules/scheduling.js";
import { GUESS_RATE, MIN_STUDIED_FOR_ESTIMATE, estimateQuestionProbability, estimateReadiness, getReadinessLabel } from "../modules/readiness.js";
import { formatAnswer, formatDuration } from "../modules/format.js";
import {
  getAreaStats,
  getBookmarkedQuestions,
  getCatalogueStatus,
  getDueQuestions,
  getIncorrectQuestionIds,
  getStudyQuestions,
  getWeakQuestionIds
} from "../modules/progress-queries.js";
import {
  getCatalogueQuestions,
  getCatalogueSummary,
  normalizeSearch,
  searchCatalogueQuestions
} from "../modules/catalogue.js";
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  UNREADABLE_PROGRESS_KEY,
  createEmptyProgress,
  loadProgress,
  migrateProgress,
  normalizeProgress
} from "../modules/storage.js";
import {
  BACKUP_FORMAT,
  createBackup,
  describeProgress,
  getBackupFilename,
  parseBackup
} from "../modules/backup.js";
import {
  EXAM_SESSION_KEY,
  clearExamSession,
  createExamSnapshot,
  loadExamSession,
  restoreExamSession,
  saveExamSession
} from "../modules/exam-session.js";
import {
  EXAM_DURATION_SECONDS,
  PASS_THRESHOLD,
  TOTAL_GENERAL,
  TOTAL_STATE,
  createAnswerEntry,
  createExamRun,
  WEAK_CLEAR_STREAK,
  createUnansweredEntry,
  getPassResult
} from "../modules/quiz-rules.js";

const progress = {
  questionStats: {
    recovered: { answered: 3, correct: 2, wrong: 1 },
    repeatedEasy: { answered: 4, correct: 4, wrong: 0 },
    weak: { answered: 4, correct: 1, wrong: 3 }
  },
  testHistory: [
    { passed: true },
    { passed: false }
  ]
};

const summary = summarizeProgress(progress, 4);

assert.equal(summary.uniqueStudied, 3);
assert.equal(summary.studyAccuracy, 64);
assert.equal(summary.mastery, 50);
assert.equal(summary.tests, 2);
assert.equal(summary.passRate, 50);

assert.equal(getPassResult(PASS_THRESHOLD - 1), false);
assert.equal(getPassResult(PASS_THRESHOLD), true);

const question = {
  id: 1,
  options: [
    { text: "A", correct: false },
    { text: "B", correct: true },
    { text: "C", correct: false },
    { text: "D", correct: false }
  ]
};

assert.deepEqual(createAnswerEntry(question, 1), {
  question,
  selectedIndex: 1,
  correctIndex: 1,
  isCorrect: true
});
assert.deepEqual(createUnansweredEntry(question), {
  question,
  selectedIndex: null,
  correctIndex: 1,
  isCorrect: false,
  isUnanswered: true
});

const generalQuestions = Array.from({ length: TOTAL_GENERAL + 2 }, (_, index) => ({
  id: index + 1,
  category: "general"
}));
const stateQuestions = Array.from({ length: TOTAL_STATE + 2 }, (_, index) => ({
  id: 100 + index,
  category: "state",
  state: index < TOTAL_STATE ? "Berlin" : "Bayern"
}));

const run = createExamRun([...generalQuestions, ...stateQuestions], "Berlin", {
  sampleByCategory(items, category, count, selectedState = null) {
    return items.filter((item) => {
      if (item.category !== category) return false;
      return !selectedState || item.state === selectedState;
    }).slice(0, count);
  },
  shuffle(items) {
    return items.slice().reverse();
  }
});

assert.equal(run.length, TOTAL_GENERAL + TOTAL_STATE);
assert.equal(run.filter((item) => item.category === "general").length, TOTAL_GENERAL);
assert.equal(run.filter((item) => item.category === "state" && item.state === "Berlin").length, TOTAL_STATE);

const catalogueQuestions = [
  {
    id: 1,
    sourceNumber: 10,
    category: "general",
    prompt: "Was schützt das Grundgesetz?",
    options: [{ text: "Die Grundrechte" }]
  },
  {
    id: 2,
    sourceNumber: 301,
    category: "state",
    state: "Berlin",
    prompt: "Welches Wappen gehört zu Berlin?",
    options: [{ text: "Der Bär" }]
  }
];
const catalogueTranslations = {
  2: {
    prompt: "Which coat of arms belongs to Berlin?",
    options: ["The bear"]
  }
};

assert.equal(normalizeSearch("  GRUNDGESETZ  "), "grundgesetz");
assert.equal(getCatalogueSummary(460, 24, ""), "460 questions in this view. Showing 24 of 460.");
assert.equal(getCatalogueSummary(1, 1, "berlin"), "1 question match your search.");
assert.equal(getCatalogueQuestions(catalogueQuestions, "state").length, 1);
assert.equal(getCatalogueQuestions(catalogueQuestions, "bookmarked", { bookmarkedIds: new Set(["2"]) })[0].id, 2);
assert.equal(searchCatalogueQuestions(catalogueQuestions, "coat of arms", catalogueTranslations)[0].id, 2);

const sessionQuestions = [...generalQuestions, ...stateQuestions]
  .filter((item) => item.state !== "Bayern")
  .slice(0, TOTAL_GENERAL + TOTAL_STATE)
  .map((item) => ({
    ...item,
    options: [{ text: "A", correct: false }, { text: "B", correct: true }, { text: "C", correct: false }]
  }));
const sessionStart = 1_700_000_000_000;
const sessionAnswers = [
  createAnswerEntry(sessionQuestions[0], 1),
  createAnswerEntry(sessionQuestions[1], 0),
  createUnansweredEntry(sessionQuestions[2])
];
const snapshot = createExamSnapshot({
  run: sessionQuestions,
  answers: sessionAnswers,
  index: 1,
  selectedState: "Berlin",
  startedAt: sessionStart
});

assert.equal(snapshot.questionIds.length, TOTAL_GENERAL + TOTAL_STATE);
assert.deepEqual(snapshot.answers, [
  { questionId: sessionQuestions[0].id, selectedIndex: 1 },
  { questionId: sessionQuestions[1].id, selectedIndex: 0 }
]);

const resumed = restoreExamSession(JSON.parse(JSON.stringify(snapshot)), sessionQuestions, sessionStart + 10 * 60 * 1000);
assert.equal(resumed.expired, false);
assert.equal(resumed.timeRemaining, EXAM_DURATION_SECONDS - 600);
assert.equal(resumed.index, 1);
assert.equal(resumed.score, 1);
assert.equal(resumed.answers.length, 2);
assert.equal(resumed.selectedState, "Berlin");
assert.deepEqual(resumed.run.map((item) => item.id), snapshot.questionIds);
assert.equal(resumed.answers[0].question, sessionQuestions[0]);

const expired = restoreExamSession(snapshot, sessionQuestions, sessionStart + (EXAM_DURATION_SECONDS + 5) * 1000);
assert.equal(expired.expired, true);
assert.equal(expired.timeRemaining, 0);

assert.equal(restoreExamSession(null, sessionQuestions), null);
assert.equal(restoreExamSession({ ...snapshot, version: 99 }, sessionQuestions, sessionStart), null);
assert.equal(restoreExamSession({ ...snapshot, startedAt: sessionStart + 10 * 60 * 1000 }, sessionQuestions, sessionStart), null);
assert.equal(restoreExamSession({ ...snapshot, questionIds: snapshot.questionIds.slice(1) }, sessionQuestions, sessionStart), null);
assert.equal(restoreExamSession({ ...snapshot, questionIds: [...snapshot.questionIds.slice(1), 9999] }, sessionQuestions, sessionStart), null);
assert.equal(restoreExamSession({ ...snapshot, questionIds: [snapshot.questionIds[0], ...snapshot.questionIds.slice(0, -1)] }, sessionQuestions, sessionStart), null);

const sloppy = restoreExamSession({
  ...snapshot,
  index: 99,
  answers: [
    { questionId: sessionQuestions[0].id, selectedIndex: 2 },
    { questionId: sessionQuestions[0].id, selectedIndex: 1 },
    { questionId: sessionQuestions[1].id, selectedIndex: 7 },
    { questionId: 424242, selectedIndex: 0 },
    null
  ]
}, sessionQuestions, sessionStart);
assert.equal(sloppy.index, TOTAL_GENERAL + TOTAL_STATE - 1);
assert.deepEqual(sloppy.answers.map((entry) => entry.selectedIndex), [2]);

const memory = new Map();
const storage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key)
};
assert.equal(loadExamSession(sessionQuestions, { storage }), null);
assert.equal(saveExamSession(snapshot, storage), true);
assert.ok(memory.has(EXAM_SESSION_KEY));
assert.equal(loadExamSession(sessionQuestions, { storage, now: sessionStart + 1000 }).answers.length, 2);
memory.set(EXAM_SESSION_KEY, "{not json");
assert.equal(loadExamSession(sessionQuestions, { storage }), null);
saveExamSession(snapshot, storage);
assert.equal(clearExamSession(storage), true);
assert.equal(loadExamSession(sessionQuestions, { storage }), null);

const storedProgress = {
  version: STORAGE_VERSION,
  questionStats: {
    1: { answered: 3, correct: 2, wrong: 1, box: 2, dueAt: "2026-01-04T00:00:00.000Z", lastAnsweredAt: "2026-01-01T09:00:00.000Z" },
    2: { answered: 1, correct: 0, wrong: 1, box: 1, dueAt: "", lastAnsweredAt: "" }
  },
  weakQuestions: { 2: { wrong: 1, correctStreak: 0, lastMissedAt: "2026-01-01T00:00:00.000Z" } },
  bookmarkedQuestions: { 1: { addedAt: "2026-01-01T00:00:00.000Z" } },
  testHistory: [{ completedAt: "2026-01-02T00:00:00.000Z", correct: 20, total: 33, passed: true, questionIds: [1, 2], wrongQuestionIds: [2] }]
};

// Migrations carry saved progress forward instead of resetting it.
const migrations = { 1: (saved) => ({ ...saved, questionStats: saved.questionStats }), 2: (saved) => ({ ...saved, upgraded: true }) };
const upgraded = migrateProgress({ ...storedProgress, version: 1 }, { migrations, targetVersion: 3 });
assert.equal(upgraded.version, 3);
assert.equal(upgraded.upgraded, true);
assert.deepEqual(upgraded.questionStats, storedProgress.questionStats);
assert.equal(migrateProgress({ ...storedProgress, version: 1 }, { migrations: {}, targetVersion: 3 }), null);
assert.equal(migrateProgress({ ...storedProgress, version: STORAGE_VERSION + 1 }), null);
assert.equal(migrateProgress("nope"), null);
assert.equal(migrateProgress({ questionStats: {} }), null);

const cleaned = normalizeProgress({
  questionStats: { 1: { answered: 3, correct: "2", wrong: -4, extra: true }, "not-an-id": { answered: 9 }, 2: "bad" },
  weakQuestions: [],
  bookmarkedQuestions: { 7: { addedAt: 5 } },
  testHistory: [{ passed: "yes" }, { passed: false, correct: 3, total: 33, completedAt: "d", questionIds: [1, "x"] }]
});
assert.deepEqual(cleaned.questionStats, { 1: { answered: 3, correct: 0, wrong: 0, box: 1, dueAt: "", lastAnsweredAt: "" } });
assert.deepEqual(cleaned.weakQuestions, {});
assert.deepEqual(cleaned.bookmarkedQuestions, { 7: { addedAt: "" } });
assert.equal(cleaned.testHistory.length, 1);
assert.deepEqual(cleaned.testHistory[0].questionIds, [1]);

const progressMemory = new Map();
const progressStorage = {
  getItem: (key) => (progressMemory.has(key) ? progressMemory.get(key) : null),
  setItem: (key, value) => progressMemory.set(key, String(value)),
  removeItem: (key) => progressMemory.delete(key)
};
assert.deepEqual(loadProgress(progressStorage), createEmptyProgress());
progressMemory.set(STORAGE_KEY, JSON.stringify(storedProgress));
assert.deepEqual(loadProgress(progressStorage), storedProgress);
progressMemory.set(STORAGE_KEY, JSON.stringify({ ...storedProgress, version: STORAGE_VERSION + 1 }));
assert.deepEqual(loadProgress(progressStorage), createEmptyProgress());
assert.equal(JSON.parse(progressMemory.get(UNREADABLE_PROGRESS_KEY)).version, STORAGE_VERSION + 1);
progressMemory.set(STORAGE_KEY, "{broken");
assert.deepEqual(loadProgress(progressStorage), createEmptyProgress());
assert.equal(progressMemory.get(UNREADABLE_PROGRESS_KEY), "{broken");

const backup = createBackup(storedProgress, new Date("2026-10-08T09:30:00.000Z"));
assert.equal(backup.format, BACKUP_FORMAT);
assert.equal(backup.exportedAt, "2026-10-08T09:30:00.000Z");
assert.equal(getBackupFilename(new Date("2026-10-08T09:30:00.000Z")), "lid-test-prep-progress-2026-10-08.json");
const restored = parseBackup(JSON.stringify(backup));
assert.equal(restored.ok, true);
assert.deepEqual(restored.progress, storedProgress);
assert.equal(parseBackup("{broken").ok, false);
assert.equal(parseBackup("{broken").reason, "invalid");
assert.equal(parseBackup(JSON.stringify({ format: "other", progress: storedProgress })).reason, "invalid");
assert.equal(parseBackup(JSON.stringify({ format: BACKUP_FORMAT })).reason, "invalid");
assert.equal(parseBackup(JSON.stringify({ ...backup, progress: { ...storedProgress, version: STORAGE_VERSION + 1 } })).reason, "version");
assert.equal(describeProgress(storedProgress).text, "2 studied questions, 1 exam simulation, 1 weak question, 1 bookmark");
assert.equal(describeProgress(createEmptyProgress()).hasProgress, false);
assert.equal(describeProgress(createEmptyProgress()).text, "no progress");

// Recording answers: stats, weak questions, and clearing a weak question.
const makeQuestion = (id, category = "general", state = null) => ({
  id,
  category,
  state,
  prompt: `Question ${id}`,
  images: [],
  options: [{ text: "A", correct: false }, { text: "B", correct: true }, { text: "C", correct: false }, { text: "D", correct: false }]
});
const queryQuestions = [makeQuestion(1), makeQuestion(2), makeQuestion(301, "state", "Berlin"), makeQuestion(302, "state", "Hessen")];
const tracked = createEmptyProgress();
const at = new Date(2026, 9, 8, 9, 0, 0);

assert.equal(applyAnswer(tracked, createAnswerEntry(queryQuestions[0], 0), {}, at), true);
assert.deepEqual(tracked.questionStats[1], { answered: 1, correct: 0, wrong: 1, box: 1, dueAt: new Date(2026, 9, 9).toISOString(), lastAnsweredAt: at.toISOString() });
assert.deepEqual(tracked.weakQuestions[1], { wrong: 1, correctStreak: 0, lastMissedAt: at.toISOString() });
assert.equal(applyAnswer(tracked, createAnswerEntry(queryQuestions[0], 0), {}, at), true);
assert.equal(tracked.weakQuestions[1].wrong, 2);
for (let correctAnswer = 1; correctAnswer < WEAK_CLEAR_STREAK; correctAnswer += 1) {
  applyAnswer(tracked, createAnswerEntry(queryQuestions[0], 1), {}, at);
  assert.equal(tracked.weakQuestions[1].correctStreak, correctAnswer);
}
applyAnswer(tracked, createAnswerEntry(queryQuestions[0], 1), {}, at);
assert.equal(tracked.weakQuestions[1], undefined, "a weak question clears after enough correct answers in a row");
assert.deepEqual({ answered: tracked.questionStats[1].answered, correct: tracked.questionStats[1].correct, wrong: tracked.questionStats[1].wrong }, { answered: 2 + WEAK_CLEAR_STREAK, correct: WEAK_CLEAR_STREAK, wrong: 2 });
assert.equal(applyAnswer(tracked, createUnansweredEntry(queryQuestions[1]), { countStats: false, trackWeak: false }, at), false);
assert.equal(tracked.questionStats[2], undefined, "unanswered timeouts do not touch stats");
applyAnswer(tracked, createAnswerEntry(queryQuestions[1], 2), { trackWeak: false }, at);
assert.equal(tracked.weakQuestions[2], undefined, "stats-only answers stay out of the weak list");
assert.equal(tracked.questionStats[2].wrong, 1);

assert.equal(toggleBookmark(tracked, 301, at), true);
assert.deepEqual(tracked.bookmarkedQuestions[301], { addedAt: at.toISOString() });
assert.equal(toggleBookmark(tracked, 301, at), false);
assert.equal(tracked.bookmarkedQuestions[301], undefined);

// Queries over progress and questions, ignoring ids that are not in the catalogue.
const queried = createEmptyProgress();
queried.weakQuestions = { 1: { wrong: 1, correctStreak: 0, lastMissedAt: "" }, 999: { wrong: 1, correctStreak: 0, lastMissedAt: "" } };
queried.bookmarkedQuestions = { 302: { addedAt: "" }, 998: { addedAt: "" } };
queried.questionStats = { 1: { answered: 2, correct: 1, wrong: 1 }, 2: { answered: 2, correct: 2, wrong: 0 }, 301: { answered: 1, correct: 0, wrong: 1 }, 302: { answered: 1, correct: 1, wrong: 0 }, 997: { answered: 1, correct: 0, wrong: 1 } };
assert.deepEqual(getWeakQuestionIds(queried, queryQuestions), ["1"]);
assert.deepEqual(getBookmarkedQuestions(queried, queryQuestions).map((question) => question.id), [302]);
assert.deepEqual(getIncorrectQuestionIds(queried, queryQuestions).sort(), ["1", "301"]);
assert.equal(getCatalogueStatus(queried, queryQuestions[3]), "Bookmarked");
assert.equal(getCatalogueStatus(queried, queryQuestions[0]), "Incorrect before");
assert.equal(getCatalogueStatus(queried, queryQuestions[1]), "Studied");
assert.equal(getCatalogueStatus(createEmptyProgress(), queryQuestions[1]), "New");
assert.deepEqual(getStudyQuestions("state:Berlin", queryQuestions, queried).map((question) => question.id), [301]);
assert.deepEqual(getStudyQuestions("general", queryQuestions, createEmptyProgress()).map((question) => question.id), [1, 2]);
assert.deepEqual(getStudyQuestions("general", queryQuestions, { ...createEmptyProgress(), questionStats: { 1: { answered: 1, correct: 1, wrong: 0 } } }).map((question) => question.id), [2, 1], "new questions come before studied ones");
assert.deepEqual(getStudyQuestions("bookmarked", queryQuestions, queried).map((question) => question.id), [302]);

const areas = getAreaStats(queried, queryQuestions);
assert.equal(areas.find((area) => area.label === "General questions").accuracy, 75);
assert.equal(areas.find((area) => area.label === "Hessen questions").role, "strongest");
assert.equal(areas.find((area) => area.label === "Berlin questions").role, "weakest");
assert.equal(areas.find((area) => area.label === "General questions").role, "");
assert.equal(getAreaStats(createEmptyProgress(), queryQuestions).length, 0);

// Review schedule: Leitner boxes, due dates on local midnight, legacy progress due once.
const day = (year, month, date) => new Date(year, month - 1, date, 14, 30);
const first = scheduleAnswer(undefined, true, day(2026, 10, 8));
assert.equal(first.box, 1, "a first answer lands in box 1 even when correct");
assert.equal(first.dueAt, new Date(2026, 9, 9).toISOString());
const climbed = scheduleAnswer({ answered: 1, correct: 1, wrong: 0, box: 1 }, true, day(2026, 10, 9));
assert.equal(climbed.box, 2);
assert.equal(climbed.dueAt, new Date(2026, 9, 12).toISOString(), "box 2 waits 3 days");
assert.equal(scheduleAnswer({ answered: 4, correct: 4, wrong: 0, box: MAX_BOX }, true, day(2026, 10, 9)).box, MAX_BOX, "the top box does not overflow");
assert.equal(scheduleAnswer({ answered: 4, correct: 4, wrong: 0, box: MAX_BOX }, true, day(2026, 10, 9)).dueAt, new Date(2026, 10, 8).toISOString(), "box 5 waits 30 days");
assert.equal(scheduleAnswer({ answered: 4, correct: 3, wrong: 1, box: 4 }, false, day(2026, 10, 9)).box, 1, "a wrong answer returns to box 1");
assert.deepEqual(Object.values(REVIEW_INTERVAL_DAYS), [1, 3, 7, 14, 30]);
const answeredStats = { answered: 2, correct: 1, wrong: 1, box: 1, dueAt: new Date(2026, 9, 9).toISOString(), lastAnsweredAt: "" };
assert.equal(isDue(answeredStats, day(2026, 10, 8)), false, "not due the day before");
assert.equal(isDue(answeredStats, new Date(2026, 9, 9, 0, 0, 0)), true, "due from the start of its day");
assert.equal(isDue({ ...answeredStats, dueAt: "" }, day(2026, 10, 8)), true, "no date means due");
assert.equal(isDue({ ...answeredStats, dueAt: "not a date" }, day(2026, 10, 8)), true, "an unreadable date means due");
assert.equal(isDue({ answered: 0, correct: 0, wrong: 0, box: 1, dueAt: "" }, day(2026, 10, 8)), false, "unanswered questions are new, not due");
assert.equal(isDue(undefined, day(2026, 10, 8)), false);

const scheduled = createEmptyProgress();
applyAnswer(scheduled, createAnswerEntry(queryQuestions[0], 1), {}, day(2026, 10, 8));
assert.equal(scheduled.questionStats[1].box, 1);
applyAnswer(scheduled, createAnswerEntry(queryQuestions[0], 1), {}, day(2026, 10, 9));
assert.equal(scheduled.questionStats[1].box, 2);
applyAnswer(scheduled, createAnswerEntry(queryQuestions[0], 0), {}, day(2026, 10, 12));
assert.equal(scheduled.questionStats[1].box, 1, "a miss resets the box");
assert.equal(scheduled.questionStats[1].answered, 3);
applyAnswer(scheduled, createUnansweredEntry(queryQuestions[1]), { countStats: false, trackWeak: false }, day(2026, 10, 12));
assert.equal(scheduled.questionStats[2], undefined, "timeouts are not scheduled");

const dueProgress = createEmptyProgress();
dueProgress.questionStats = {
  1: { answered: 2, correct: 2, wrong: 0, box: 3, dueAt: new Date(2026, 9, 5).toISOString(), lastAnsweredAt: "" },
  2: { answered: 1, correct: 1, wrong: 0, box: 1, dueAt: new Date(2026, 9, 20).toISOString(), lastAnsweredAt: "" },
  301: { answered: 3, correct: 1, wrong: 2, box: 1, dueAt: "", lastAnsweredAt: "" },
  302: { answered: 1, correct: 0, wrong: 1, box: 1, dueAt: new Date(2026, 9, 5).toISOString(), lastAnsweredAt: "" },
  999: { answered: 1, correct: 0, wrong: 1, box: 1, dueAt: "", lastAnsweredAt: "" }
};
assert.deepEqual(getDueQuestions(dueProgress, queryQuestions, day(2026, 10, 8)).map((question) => question.id), [301, 302, 1], "undated first, then longest-waiting, then lowest box; unknown ids ignored; future dates excluded");

// Version 1 progress migrates with a box from its record and a due-once schedule.
const legacy = { version: 1, questionStats: { 1: { answered: 5, correct: 5, wrong: 0 }, 2: { answered: 2, correct: 0, wrong: 2 }, 3: "bad" }, weakQuestions: {}, bookmarkedQuestions: {}, testHistory: [] };
const migratedLegacy = normalizeProgress(migrateProgress(legacy));
assert.equal(migratedLegacy.version, STORAGE_VERSION);
assert.deepEqual(migratedLegacy.questionStats[1], { answered: 5, correct: 5, wrong: 0, box: MAX_BOX, dueAt: "", lastAnsweredAt: "" });
assert.deepEqual(migratedLegacy.questionStats[2], { answered: 2, correct: 0, wrong: 2, box: 1, dueAt: "", lastAnsweredAt: "" });
assert.equal(migratedLegacy.questionStats[3], undefined);
assert.equal(parseBackup(JSON.stringify({ format: BACKUP_FORMAT, exportedAt: "2026-10-01T00:00:00.000Z", progress: legacy })).ok, true, "a version 1 backup still imports");
const legacyStorage = new Map([[STORAGE_KEY, JSON.stringify(legacy)]]);
const loadedLegacy = loadProgress({ getItem: (key) => legacyStorage.get(key) ?? null, setItem: (key, value) => legacyStorage.set(key, value) });
assert.equal(loadedLegacy.questionStats[1].box, MAX_BOX, "stored version 1 progress is upgraded, not discarded");
assert.equal(legacyStorage.has(UNREADABLE_PROGRESS_KEY), false);

// Readiness: the estimated chance of passing from the learner's own answers.
const readinessQuestions = [
  ...Array.from({ length: 300 }, (_, index) => makeQuestion(index + 1)),
  ...Array.from({ length: 10 }, (_, index) => makeQuestion(301 + index, "state", "Berlin")),
  ...Array.from({ length: 10 }, (_, index) => makeQuestion(401 + index, "state", "Hessen"))
];
const noon = new Date(2026, 9, 8, 12);
const nothing = estimateReadiness(createEmptyProgress(), readinessQuestions, "Berlin", noon);
assert.equal(nothing.hasEstimate, false);
assert.ok(nothing.passChance < 0.001, "guessing alone almost never passes");
assert.ok(Math.abs(nothing.expectedScore - 33 * GUESS_RATE) < 1e-9);
assert.equal(nothing.label, "Keep studying");
const mastered = createEmptyProgress();
readinessQuestions.forEach((question) => {
  mastered.questionStats[question.id] = { answered: 12, correct: 12, wrong: 0, box: 5, dueAt: new Date(2026, 10, 1).toISOString(), lastAnsweredAt: "" };
});
const ready = estimateReadiness(mastered, readinessQuestions, "Berlin", noon);
assert.equal(ready.hasEstimate, true);
assert.ok(ready.passChance > 0.99, `fully studied should be ready, got ${ready.passChance}`);
assert.equal(ready.label, "Looking ready");
assert.equal(ready.studied, readinessQuestions.length);
const halfway = createEmptyProgress();
readinessQuestions.slice(0, 160).forEach((question) => {
  halfway.questionStats[question.id] = { answered: 6, correct: 5, wrong: 1, box: 3, dueAt: new Date(2026, 10, 1).toISOString(), lastAnsweredAt: "" };
});
const partial = estimateReadiness(halfway, readinessQuestions, "Berlin", noon);
assert.ok(partial.passChance > nothing.passChance && partial.passChance < ready.passChance, "readiness grows with study");
const overdue = createEmptyProgress();
overdue.questionStats = Object.fromEntries(Object.entries(halfway.questionStats).map(([id, stats]) => [id, { ...stats, dueAt: new Date(2026, 8, 1).toISOString() }]));
assert.ok(estimateReadiness(overdue, readinessQuestions, "Berlin", noon).passChance < partial.passChance, "questions that are due count for less");
assert.ok(estimateQuestionProbability({ answered: 1, correct: 1, wrong: 0, box: 1, dueAt: new Date(2026, 10, 1).toISOString() }, noon) < estimateQuestionProbability({ answered: 8, correct: 8, wrong: 0, box: 4, dueAt: new Date(2026, 10, 1).toISOString() }, noon), "more correct answers raise the estimate");
assert.ok(estimateQuestionProbability({ answered: 4, correct: 3, wrong: 1, box: 1, dueAt: new Date(2026, 10, 1).toISOString() }, noon) <= 0.5, "a question last missed is capped");
assert.equal(estimateQuestionProbability(undefined, noon), GUESS_RATE);
assert.equal(MIN_STUDIED_FOR_ESTIMATE, 10);
assert.deepEqual([0.1, 0.3, 0.7, 0.9].map(getReadinessLabel), ["Keep studying", "Getting closer", "Nearly ready", "Looking ready"]);

// Formatting and events.
assert.equal(formatDuration(3600), "60:00");
assert.equal(formatDuration(65), "1:05");
assert.equal(formatDuration(-4), "0:00");
assert.equal(formatAnswer(queryQuestions[0], 1), "B. B");
assert.equal(formatAnswer(queryQuestions[0], null), "No answer selected");
const emitter = createEmitter();
const heard = [];
const stopHearing = emitter.on("changed", (value) => heard.push(value));
emitter.emit("changed", 1);
stopHearing();
emitter.emit("changed", 2);
assert.deepEqual(heard, [1]);

console.log("Progress and quiz-rule validation passed.");
