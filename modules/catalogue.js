export const CATALOGUE_RESULT_LIMIT = 24;

export function normalizeSearch(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("de-DE");
}

export function getCatalogueSummary(count, visibleCount, query) {
  const label = count === 1 ? "1 question" : `${count} questions`;
  const suffix = count > visibleCount ? ` Showing ${visibleCount} of ${count}.` : "";
  return query ? `${label} match your search.${suffix}` : `${label} in this view.${suffix}`;
}

export function getQuestionSearchText(question, translations = {}) {
  const translation = translations[question.id];
  return normalizeSearch([
    question.id,
    question.sourceNumber,
    question.prompt,
    question.state,
    question.options.map((option) => option.text).join(" "),
    translation?.prompt,
    Array.isArray(translation?.options) ? translation.options.join(" ") : ""
  ].filter(Boolean).join(" "));
}

export function getCatalogueQuestions(questions, filter, options = {}) {
  const { incorrectIds = new Set(), bookmarkedIds = new Set() } = options;

  if (filter === "general") {
    return questions.filter((question) => question.category === "general");
  }

  if (filter === "state") {
    return questions.filter((question) => question.category === "state");
  }

  if (filter === "incorrect") {
    return questions.filter((question) => incorrectIds.has(String(question.id)));
  }

  if (filter === "bookmarked") {
    return questions.filter((question) => bookmarkedIds.has(String(question.id)));
  }

  return questions.slice();
}

export function searchCatalogueQuestions(questions, query, translations = {}) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return questions;

  return questions.filter((question) => {
    return getQuestionSearchText(question, translations).includes(normalizedQuery);
  });
}
