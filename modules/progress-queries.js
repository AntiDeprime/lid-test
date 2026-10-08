import { orderStudyQuestionsByProgress } from "./sampling.js";

function knownIds(questions) {
  return new Set(questions.map((question) => String(question.id)));
}

export function getWeakQuestionIds(progress, questions) {
  const known = knownIds(questions);
  return Object.keys(progress.weakQuestions).filter((questionId) => known.has(questionId));
}

export function getBookmarkedQuestionIds(progress, questions) {
  const known = knownIds(questions);
  return Object.keys(progress.bookmarkedQuestions).filter((questionId) => known.has(questionId));
}

export function getBookmarkedQuestions(progress, questions) {
  return getBookmarkedQuestionIds(progress, questions)
    .map((questionId) => questions.find((question) => String(question.id) === questionId))
    .filter(Boolean);
}

export function getWeakQuestions(progress, questions) {
  return getWeakQuestionIds(progress, questions)
    .map((questionId) => questions.find((question) => String(question.id) === questionId))
    .filter(Boolean);
}

export function getIncorrectQuestionIds(progress, questions) {
  const known = knownIds(questions);
  return Object.entries(progress.questionStats)
    .filter(([, stats]) => (stats?.wrong || 0) > 0)
    .map(([questionId]) => questionId)
    .filter((questionId) => known.has(questionId));
}

export function isBookmarked(progress, question) {
  return Boolean(question && progress.bookmarkedQuestions[String(question.id)]);
}

// "Bookmarked", "Incorrect before", "Studied", or "New" for the catalogue.
export function getCatalogueStatus(progress, question) {
  const questionId = String(question.id);
  if (progress.bookmarkedQuestions[questionId]) return "Bookmarked";
  if ((progress.questionStats[questionId]?.wrong || 0) > 0) return "Incorrect before";
  if ((progress.questionStats[questionId]?.answered || 0) > 0) return "Studied";
  return "New";
}

// Accuracy per area (general questions, one entry per Bundesland); when there
// are several, the strongest and weakest area get a role.
export function getAreaStats(progress, questions) {
  const areaMap = new Map();

  questions.forEach((question) => {
    const stats = progress.questionStats[String(question.id)];
    if (!stats || !stats.answered) return;

    const key = question.category === "state" ? `state:${question.state || "Bundesland"}` : "general";
    const current = areaMap.get(key) || {
      label: question.category === "state" ? `${question.state || "Bundesland"} questions` : "General questions",
      answered: 0,
      correct: 0
    };

    current.answered += stats.answered || 0;
    current.correct += stats.correct || 0;
    areaMap.set(key, current);
  });

  const areas = [...areaMap.values()].map((area) => ({
    ...area,
    accuracy: Math.round((area.correct / area.answered) * 100)
  }));

  if (areas.length <= 1) return areas;

  const ranked = areas
    .filter((area) => area.answered > 0)
    .sort((a, b) => b.accuracy - a.accuracy || b.answered - a.answered);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];

  return areas.map((area) => ({
    ...area,
    role: area === strongest
      ? "strongest"
      : area === weakest && weakest.accuracy < strongest.accuracy
        ? "weakest"
        : ""
  }));
}

// Study questions for a filter value ("all", "general", "state",
// "state:<Bundesland>", or "bookmarked"), new questions first.
export function getStudyQuestions(filter, questions, progress) {
  if (filter === "bookmarked") return getBookmarkedQuestions(progress, questions);

  const [category, selectedState] = filter.split(":");
  const filtered = filter === "all"
    ? questions.slice()
    : questions.filter((question) => {
      if (question.category !== category) return false;
      return !selectedState || question.state === selectedState;
    });

  return orderStudyQuestionsByProgress(filtered, progress.questionStats);
}
