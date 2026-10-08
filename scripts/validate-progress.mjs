import assert from "node:assert/strict";
import { summarizeProgress } from "../modules/progress.js";
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
  questionStats: { 1: { answered: 3, correct: 2, wrong: 1 }, 2: { answered: 1, correct: 0, wrong: 1 } },
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
assert.deepEqual(cleaned.questionStats, { 1: { answered: 3, correct: 0, wrong: 0 } });
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

console.log("Progress and quiz-rule validation passed.");
