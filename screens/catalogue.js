import {
  CATALOGUE_RESULT_LIMIT,
  getCatalogueQuestions,
  getCatalogueSummary,
  normalizeSearch,
  searchCatalogueQuestions
} from "../modules/catalogue.js";
import { formatAnswer } from "../modules/format.js";
import { getBookmarkedQuestionIds, getCatalogueStatus, getIncorrectQuestionIds } from "../modules/progress-queries.js";

// The searchable question catalogue on the start page, with a jump-to-number form.
export function createCatalogueScreen(ctx) {
  const { questions, progress } = ctx;
  const $ = (id) => document.getElementById(id);
  const catalogueSearch = $("catalogue-search");
  const catalogueFilter = $("catalogue-filter");
  const catalogueSummary = $("catalogue-summary");
  const catalogueResults = $("catalogue-results");
  const catalogueMoreButton = $("catalogue-more-button");
  const jumpForm = $("jump-form");
  const jumpQuestion = $("jump-question");
  let visibleCount = CATALOGUE_RESULT_LIMIT;
  let loadingCode = null;

  function resetLimit() {
    visibleCount = CATALOGUE_RESULT_LIMIT;
    render({ preserveLimit: true });
  }

  function showMore() {
    visibleCount += CATALOGUE_RESULT_LIMIT;
    render({ preserveLimit: true });
  }

  // A search also matches the translated text of the chosen language. That file
  // loads on the first search and the results refresh when it arrives.
  function getSearchTranslations(query) {
    if (!query) return {};
    const code = ctx.state.translationLanguage;
    const loaded = ctx.content.translationsFor(code);
    if (loaded) return loaded;
    if (loadingCode === code) return {};
    loadingCode = code;
    ctx.content.ensureTranslations(code).then(
      () => {
        loadingCode = null;
        if (code === ctx.state.translationLanguage) render({ preserveLimit: true });
      },
      () => {
        // German search keeps working without the translations.
        loadingCode = null;
      }
    );
    return {};
  }

  function render(options = {}) {
    if (!options.preserveLimit) {
      visibleCount = CATALOGUE_RESULT_LIMIT;
    }

    const query = normalizeSearch(catalogueSearch.value);
    const filter = catalogueFilter.value;
    const cataloguePool = getCatalogueQuestions(questions, filter, {
      incorrectIds: new Set(getIncorrectQuestionIds(progress, questions)),
      bookmarkedIds: new Set(getBookmarkedQuestionIds(progress, questions))
    });
    const translations = getSearchTranslations(query);
    const filteredQuestions = searchCatalogueQuestions(cataloguePool, query, translations);
    const visibleQuestions = filteredQuestions.slice(0, visibleCount);
    const hasMore = filteredQuestions.length > visibleQuestions.length;

    catalogueResults.replaceChildren();
    catalogueSummary.textContent = getCatalogueSummary(filteredQuestions.length, visibleQuestions.length, query);
    catalogueMoreButton.classList.toggle("is-hidden", !hasMore);
    catalogueMoreButton.textContent = hasMore
      ? `Show ${Math.min(CATALOGUE_RESULT_LIMIT, filteredQuestions.length - visibleQuestions.length)} more questions`
      : "All matching questions shown";

    if (!filteredQuestions.length) {
      const empty = document.createElement("p");
      empty.className = "catalogue-empty";
      empty.textContent = "No matching questions found.";
      catalogueResults.append(empty);
      catalogueMoreButton.classList.add("is-hidden");
      return;
    }

    visibleQuestions.forEach((question) => {
      catalogueResults.append(createItem(question));
    });
  }

  function createItem(question) {
    const item = document.createElement("article");
    const title = document.createElement("div");
    const meta = document.createElement("div");
    const numberTag = document.createElement("span");
    const typeTag = document.createElement("span");
    const statusTag = document.createElement("span");
    const prompt = document.createElement("p");
    const answer = document.createElement("p");
    const button = document.createElement("button");
    const correctIndex = question.options.findIndex((option) => option.correct);
    const answerId = `catalogue-answer-${question.id}`;

    item.className = "catalogue-item";
    title.className = "catalogue-item-title";
    meta.className = "catalogue-meta";
    numberTag.className = "catalogue-tag";
    typeTag.className = "catalogue-tag";
    statusTag.className = "catalogue-tag";
    prompt.className = "catalogue-prompt";
    answer.className = "catalogue-answer";
    answer.id = answerId;
    button.className = "secondary-action catalogue-study";
    button.type = "button";

    numberTag.textContent = `#${question.sourceNumber || question.id}`;
    typeTag.textContent = question.category === "state" ? question.state : "General";
    statusTag.textContent = getCatalogueStatus(progress, question);
    prompt.textContent = question.prompt;
    answer.textContent = `Answer: ${formatAnswer(question, correctIndex)}`;
    answer.hidden = !shouldShowAnswer(question);
    button.textContent = "Study";
    button.addEventListener("click", () => ctx.actions.startPracticeQuestion(question.id));
    const revealButton = document.createElement("button");
    revealButton.className = "secondary-action catalogue-study";
    revealButton.type = "button";
    revealButton.textContent = answer.hidden ? "Reveal answer" : "Hide answer";
    revealButton.setAttribute("aria-controls", answerId);
    revealButton.setAttribute("aria-expanded", String(!answer.hidden));
    revealButton.addEventListener("click", () => {
      answer.hidden = !answer.hidden;
      revealButton.textContent = answer.hidden ? "Reveal answer" : "Hide answer";
      revealButton.setAttribute("aria-expanded", String(!answer.hidden));
    });

    meta.append(numberTag, typeTag, statusTag);
    title.append(meta, prompt, answer);
    const actions = document.createElement("div");
    actions.className = "catalogue-actions";
    actions.append(revealButton, button);
    item.append(title, actions);
    return item;
  }

  // Answers stay hidden until the learner has answered the question once.
  function shouldShowAnswer(question) {
    return (progress.questionStats[String(question.id)]?.answered || 0) > 0;
  }

  function jumpToQuestionNumber(event) {
    event.preventDefault();
    const targetNumber = Number.parseInt(jumpQuestion.value, 10);
    if (!Number.isInteger(targetNumber)) return;

    const question = questions.find((item) => item.sourceNumber === targetNumber || item.id === targetNumber);
    if (!question) {
      catalogueSearch.value = String(targetNumber);
      catalogueFilter.value = "all";
      render();
      jumpQuestion.select();
      return;
    }

    ctx.actions.startPracticeQuestion(question.id);
  }

  catalogueSearch.addEventListener("input", resetLimit);
  catalogueFilter.addEventListener("change", resetLimit);
  catalogueMoreButton.addEventListener("click", showMore);
  jumpForm.addEventListener("submit", jumpToQuestionNumber);
  ctx.events.on("progress-changed", () => render({ preserveLimit: true }));
  ctx.events.on("language-changed", () => render({ preserveLimit: true }));

  return { render };
}
