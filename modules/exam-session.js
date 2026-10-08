import { EXAM_DURATION_SECONDS, TOTAL_GENERAL, TOTAL_STATE, createAnswerEntry } from "./quiz-rules.js";
import { getStorageItem, removeStorageItem, setStorageItem } from "./storage.js";

export const EXAM_SESSION_KEY = "lidTestPrepExamSession";
export const EXAM_SESSION_VERSION = 1;

const EXAM_LENGTH = TOTAL_GENERAL + TOTAL_STATE;
const CLOCK_SKEW_MS = 60 * 1000;

export function createExamSnapshot({ run, answers, index, selectedState, startedAt }) {
  return {
    version: EXAM_SESSION_VERSION,
    selectedState,
    startedAt,
    index,
    questionIds: run.map((question) => question.id),
    answers: answers
      .filter((entry) => !entry.isUnanswered && Number.isInteger(entry.selectedIndex))
      .map((entry) => ({ questionId: entry.question.id, selectedIndex: entry.selectedIndex }))
  };
}

// Turns a stored snapshot back into a run, or returns null when it cannot be trusted.
export function restoreExamSession(snapshot, questions, now = Date.now()) {
  if (!snapshot || typeof snapshot !== "object" || snapshot.version !== EXAM_SESSION_VERSION) return null;
  if (!Number.isFinite(snapshot.startedAt) || snapshot.startedAt > now + CLOCK_SKEW_MS) return null;
  if (!Array.isArray(snapshot.questionIds) || snapshot.questionIds.length !== EXAM_LENGTH) return null;

  const byId = new Map(questions.map((question) => [question.id, question]));
  const run = snapshot.questionIds.map((id) => byId.get(id));
  if (run.some((question) => !question) || new Set(snapshot.questionIds).size !== EXAM_LENGTH) return null;

  const runIds = new Set(snapshot.questionIds);
  const answered = new Set();
  const answers = [];
  (Array.isArray(snapshot.answers) ? snapshot.answers : []).forEach((saved) => {
    if (!saved || !runIds.has(saved.questionId) || answered.has(saved.questionId)) return;
    const question = byId.get(saved.questionId);
    if (!Number.isInteger(saved.selectedIndex) || saved.selectedIndex < 0 || saved.selectedIndex >= question.options.length) return;
    answered.add(saved.questionId);
    answers.push(createAnswerEntry(question, saved.selectedIndex));
  });

  const elapsedSeconds = Math.max(0, Math.floor((now - snapshot.startedAt) / 1000));
  const timeRemaining = Math.max(EXAM_DURATION_SECONDS - elapsedSeconds, 0);
  const index = Number.isInteger(snapshot.index) ? Math.min(Math.max(snapshot.index, 0), EXAM_LENGTH - 1) : 0;

  return {
    run,
    answers,
    index,
    score: answers.filter((entry) => entry.isCorrect).length,
    selectedState: typeof snapshot.selectedState === "string" ? snapshot.selectedState : "",
    startedAt: snapshot.startedAt,
    timeRemaining,
    expired: timeRemaining === 0
  };
}

export function loadExamSession(questions, { now = Date.now(), storage } = {}) {
  try {
    const raw = getStorageItem(EXAM_SESSION_KEY, storage);
    if (!raw) return null;
    return restoreExamSession(JSON.parse(raw), questions, now);
  } catch (error) {
    return null;
  }
}

export function saveExamSession(snapshot, storage) {
  return setStorageItem(EXAM_SESSION_KEY, JSON.stringify(snapshot), storage);
}

export function clearExamSession(storage) {
  return removeStorageItem(EXAM_SESSION_KEY, storage);
}
