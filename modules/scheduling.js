// Spaced repetition for studied questions: a five-box Leitner schedule. A
// correct answer moves a question to the next box and a longer wait; a wrong
// answer sends it back to box 1. Due dates fall on local midnight, so a
// question is due from the start of its day.
export const MAX_BOX = 5;
// A due review run holds at most this many questions, so a long break never
// turns into a wall of reviews.
export const DUE_REVIEW_LIMIT = 25;
export const REVIEW_INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

function startOfLocalDay(date, extraDays = 0) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + extraDays);
}

export function clampBox(value) {
  return Number.isInteger(value) ? Math.min(MAX_BOX, Math.max(1, value)) : 1;
}

// New box and due date after an answer. A question's first answer always
// lands in box 1, because one answer is weak evidence either way.
export function scheduleAnswer(stats, isCorrect, now = new Date()) {
  const firstAnswer = !stats || !stats.answered;
  const box = firstAnswer || !isCorrect ? 1 : clampBox((stats.box || 1) + 1);

  return {
    box,
    dueAt: startOfLocalDay(now, REVIEW_INTERVAL_DAYS[box]).toISOString(),
    lastAnsweredAt: now.toISOString()
  };
}

// An answered question is due when its date has come, or when it has no date
// (progress saved before scheduling existed is due once).
export function isDue(stats, now = new Date()) {
  if (!stats || !stats.answered) return false;
  if (!stats.dueAt) return true;

  const dueTime = Date.parse(stats.dueAt);
  return Number.isNaN(dueTime) || dueTime <= now.getTime();
}

export function getDueSortKey(stats) {
  const dueTime = stats.dueAt ? Date.parse(stats.dueAt) : 0;
  return Number.isNaN(dueTime) ? 0 : dueTime;
}
