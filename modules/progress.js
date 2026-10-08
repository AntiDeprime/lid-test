import { WEAK_CLEAR_STREAK } from "./quiz-rules.js";
import { scheduleAnswer } from "./scheduling.js";

export function summarizeProgress(progress, totalQuestions) {
  const stats = Object.values(progress.questionStats);
  const repeatedAnswers = stats.reduce((total, item) => total + item.answered, 0);
  const correct = stats.reduce((total, item) => total + item.correct, 0);
  const uniqueStudied = stats.filter((item) => item.answered > 0).length;
  const mastered = stats.filter((item) => {
    const answered = item.answered || 0;
    const correctAnswers = item.correct || 0;
    return answered > 0 && correctAnswers >= Math.max(2, answered - 1);
  }).length;
  const tests = progress.testHistory.length;
  const passedTests = progress.testHistory.filter((test) => test.passed).length;

  return {
    repeatedAnswers,
    correct,
    uniqueStudied,
    studyAccuracy: repeatedAnswers ? Math.round((correct / repeatedAnswers) * 100) : 0,
    mastery: totalQuestions ? Math.round((mastered / totalQuestions) * 100) : 0,
    tests,
    passRate: tests ? Math.round((passedTests / tests) * 100) : 0
  };
}

function updateWeakQuestion(progress, entry, questionId, now) {
  const current = progress.weakQuestions[questionId];
  if (!entry.isCorrect) {
    progress.weakQuestions[questionId] = {
      wrong: current ? (current.wrong || 0) + 1 : 1,
      correctStreak: 0,
      lastMissedAt: now.toISOString()
    };
    return;
  }

  if (!current) return;

  const correctStreak = (current.correctStreak || 0) + 1;
  if (correctStreak >= WEAK_CLEAR_STREAK) {
    delete progress.weakQuestions[questionId];
    return;
  }

  progress.weakQuestions[questionId] = {
    ...current,
    correctStreak
  };
}

// Records one answer in the question stats and the weak list. Returns false
// when neither is asked for, so callers know nothing changed.
export function applyAnswer(progress, entry, { countStats = true, trackWeak = true } = {}, now = new Date()) {
  if (!countStats && !trackWeak) return false;

  const questionId = String(entry.question.id);

  if (countStats) {
    const current = progress.questionStats[questionId] || {
      answered: 0,
      correct: 0,
      wrong: 0
    };

    Object.assign(current, scheduleAnswer(current, entry.isCorrect, now));
    current.answered += 1;
    if (entry.isCorrect) {
      current.correct += 1;
    } else {
      current.wrong += 1;
    }

    progress.questionStats[questionId] = current;
  }

  if (trackWeak) updateWeakQuestion(progress, entry, questionId, now);
  return true;
}

// Adds or removes a bookmark and returns whether the question is now bookmarked.
export function toggleBookmark(progress, questionId, now = new Date()) {
  const key = String(questionId);
  if (progress.bookmarkedQuestions[key]) {
    delete progress.bookmarkedQuestions[key];
    return false;
  }

  progress.bookmarkedQuestions[key] = { addedAt: now.toISOString() };
  return true;
}
