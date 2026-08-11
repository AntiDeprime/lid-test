import { getStorageItem, loadProgress, saveProgress as persistProgress, setStorageItem } from "./modules/storage.js";
import { getStateNames, orderStudyQuestionsByProgress, sampleByCategory, shuffle } from "./modules/sampling.js";
import { summarizeProgress } from "./modules/progress.js";
import { getLearnerHint } from "./modules/hints.js";
import { createTabController } from "./modules/tabs.js";
import { showModalDialog } from "./modules/dialog.js";
import {
  CATALOGUE_RESULT_LIMIT,
  getCatalogueQuestions as getCataloguePool,
  getCatalogueSummary,
  normalizeSearch,
  searchCatalogueQuestions
} from "./modules/catalogue.js";
import {
  EXAM_DURATION_SECONDS,
  PASS_THRESHOLD,
  TOTAL_GENERAL,
  TOTAL_STATE,
  createAnswerEntry,
  createExamRun,
  createUnansweredEntry,
  getPassResult
} from "./modules/quiz-rules.js";

(() => {
  "use strict";

  const ANALYTICS_ID = "G-6LN5H6T5LW";
  const ANALYTICS_CONSENT_KEY = "lidAnalyticsConsent";
  const WEAK_CLEAR_STREAK = 2;
  const LETTERS = ["A", "B", "C", "D"];
  const LEGAL_NOTICE = {
    privacy: {
      title: "Privacy",
      paragraphs: [
        "This app stores study progress, weak questions, bookmarks, and analytics consent locally in this browser.",
        "Google Analytics loads only after explicit consent. The tag is configured without advertising storage, Google Signals, or ad personalization signals.",
        "No account is required, and this static app does not send your answers or saved progress to an app server."
      ]
    },
    imprint: {
      title: "Imprint",
      paragraphs: [
        "LiD Test Prep is maintained as an educational open-source practice app for the Leben in Deutschland / Einbürgerungstest catalogue.",
        "Responsible project maintainer: AntiDeprime. Contact and issue reporting: https://github.com/AntiDeprime/lid-test/issues",
        "This app is not an official BAMF or government service."
      ]
    }
  };

  const questions = window.LID_QUESTIONS || [];
  const translations = window.LID_TRANSLATIONS_EN || {};
  const stateNames = getStateNames(questions);
  const progress = loadProgress();
  const state = {
    mode: "exam",
    run: [],
    index: 0,
    selected: null,
    score: 0,
    answers: [],
    translationsEnabled: false,
    timerId: null,
    startedAt: null,
    completedAt: null,
    timeRemaining: EXAM_DURATION_SECONDS,
    endedByTimeout: false,
    studyFilter: "all",
    selectedState: ""
  };

  const $ = (id) => document.getElementById(id);
  const startScreen = $("start-screen");
  const quizScreen = $("quiz-screen");
  const resultScreen = $("result-screen");
  const startButton = $("start-button");
  const practiceButton = $("practice-button");
  const bundeslandSelect = $("bundesland-select");
  const weakReviewButton = $("weak-review-button");
  const bookmarkReviewButton = $("bookmark-review-button");
  const homeButton = $("home-button");
  const restartButton = $("restart-button");
  const newTestButton = $("new-test-button");
  const resultHomeButton = $("result-home-button");
  const resetProgressButton = $("reset-progress-button");
  const nextButton = $("next-button");
  const previousButton = $("previous-button");
  const studyFilter = $("study-filter");
  const catalogueSearch = $("catalogue-search");
  const catalogueFilter = $("catalogue-filter");
  const catalogueSummary = $("catalogue-summary");
  const catalogueResults = $("catalogue-results");
  const catalogueMoreButton = $("catalogue-more-button");
  const jumpForm = $("jump-form");
  const jumpQuestion = $("jump-question");
  const translationToggle = $("translation-toggle");
  const bookmarkToggle = $("bookmark-toggle");
  const bookmarkLabel = $("bookmark-label");
  const questionKicker = $("question-kicker");
  const questionTitle = $("question-title");
  const questionTranslation = $("question-translation");
  const timerCounter = $("timer-counter");
  const scoreCounter = $("score-counter");
  const quizProgress = $("quiz-progress");
  const progressBar = $("progress-bar");
  const imageGrid = $("image-grid");
  const answers = $("answers");
  const questionExplanation = $("question-explanation");
  const questionHint = $("question-hint");
  const resultTitle = $("result-title");
  const resultScore = $("result-score");
  const resultStatus = $("result-status");
  const resultTime = $("result-time");
  const reviewHeading = $("review-heading");
  const reviewList = $("review-list");
  const answeredStat = $("answered-stat");
  const accuracyStat = $("accuracy-stat");
  const testsStat = $("tests-stat");
  const passRateStat = $("pass-rate-stat");
  const masteryStat = $("mastery-stat");
  const weakStat = $("weak-stat");
  const bookmarkStat = $("bookmark-stat");
  const areaStats = $("area-stats");
  const recentTests = $("recent-tests");
  const resultContext = $("result-context");
  const analyticsStatus = $("analytics-status");
  const startTabs = [...document.querySelectorAll("[data-start-tab]")];
  const startSections = {
    progress: $("progress-title").closest(".start-detail"),
    catalogue: $("catalogue-title").closest(".start-detail"),
    learn: $("included-title").closest(".start-detail")
  };
  const faqSection = $("faq-title").closest(".faq-section");
  const startTabController = createTabController(startTabs, startSections, {
    onChange(selectedTab) {
      faqSection.classList.toggle("is-hidden", selectedTab !== "learn");
      faqSection.hidden = selectedTab !== "learn";
    }
  });
  let catalogueVisibleCount = CATALOGUE_RESULT_LIMIT;

  function saveProgress() {
    persistProgress(progress);
  }

  function resetProgress() {
    if (!window.confirm("Reset all saved progress for this browser?")) return;

    progress.questionStats = {};
    progress.weakQuestions = {};
    progress.bookmarkedQuestions = {};
    progress.testHistory = [];
    saveProgress();
    renderProgressSummary();
  }

  function populateStateControls() {
    stateNames.forEach((stateName) => {
      const testOption = document.createElement("option");
      const studyOption = document.createElement("option");

      testOption.value = stateName;
      testOption.textContent = stateName;
      studyOption.value = `state:${stateName}`;
      studyOption.textContent = `${stateName} Bundesland questions`;

      bundeslandSelect.append(testOption);
      studyFilter.append(studyOption);
    });

    if (stateNames.includes("Berlin")) {
      bundeslandSelect.value = "Berlin";
    }
  }

  function recordAnswer(entry, options = {}) {
    const { countStats = true, trackWeak = true } = options;
    if (!countStats && !trackWeak) return;

    const questionId = String(entry.question.id);

    if (countStats) {
      const current = progress.questionStats[questionId] || {
        answered: 0,
        correct: 0,
        wrong: 0
      };

      current.answered += 1;
      if (entry.isCorrect) {
        current.correct += 1;
      } else {
        current.wrong += 1;
      }

      progress.questionStats[questionId] = current;
    }

    if (trackWeak) updateWeakQuestion(entry, questionId);
    saveProgress();
    renderProgressSummary();
  }

  function updateWeakQuestion(entry, questionId) {
    const current = progress.weakQuestions[questionId];
    if (!entry.isCorrect) {
      progress.weakQuestions[questionId] = {
        wrong: current ? (current.wrong || 0) + 1 : 1,
        correctStreak: 0,
        lastMissedAt: new Date().toISOString()
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

  function recordCompletedTest() {
    if (state.mode !== "exam" || state.run.length !== TOTAL_GENERAL + TOTAL_STATE) return;

    progress.testHistory.push({
      completedAt: new Date().toISOString(),
      correct: state.score,
      total: state.run.length,
      passed: state.score >= PASS_THRESHOLD,
      questionIds: state.run.map((question) => question.id),
      wrongQuestionIds: state.answers.filter((entry) => !entry.isCorrect).map((entry) => entry.question.id)
    });
    saveProgress();
    renderProgressSummary();
  }

  function renderProgressSummary() {
    const summary = summarizeProgress(progress, questions.length);
    const weakQuestionIds = getWeakQuestionIds();
    const bookmarkedQuestionIds = getBookmarkedQuestionIds();

    answeredStat.textContent = String(summary.uniqueStudied);
    accuracyStat.textContent = `${summary.studyAccuracy}%`;
    masteryStat.textContent = `${summary.mastery}%`;
    testsStat.textContent = String(summary.tests);
    passRateStat.textContent = `${summary.passRate}%`;
    weakStat.textContent = String(weakQuestionIds.length);
    bookmarkStat.textContent = String(bookmarkedQuestionIds.length);
    weakReviewButton.classList.toggle("is-empty-queue", weakQuestionIds.length === 0);
    weakReviewButton.setAttribute("aria-disabled", String(weakQuestionIds.length === 0));
    weakReviewButton.textContent = weakQuestionIds.length
      ? `Review ${weakQuestionIds.length} weak ${weakQuestionIds.length === 1 ? "question" : "questions"}`
      : "No weak questions yet";
    bookmarkReviewButton.classList.toggle("is-empty-queue", bookmarkedQuestionIds.length === 0);
    bookmarkReviewButton.setAttribute("aria-disabled", String(bookmarkedQuestionIds.length === 0));
    bookmarkReviewButton.textContent = bookmarkedQuestionIds.length
      ? `Review ${bookmarkedQuestionIds.length} bookmarked ${bookmarkedQuestionIds.length === 1 ? "question" : "questions"}`
      : "No bookmarks yet";
    resetProgressButton.disabled = summary.repeatedAnswers === 0 && summary.tests === 0 && weakQuestionIds.length === 0 && bookmarkedQuestionIds.length === 0;
    renderAreaStats();
    renderRecentTests();
    renderCatalogue({ preserveLimit: true });
  }

  function renderAreaStats() {
    const areas = getAreaStats();
    areaStats.replaceChildren();

    if (!areas.length) {
      areaStats.append(createEmptyProgressNote("Answer questions to see your strongest and weakest areas."));
      return;
    }

    areas.forEach((area) => {
      const item = document.createElement("div");
      const title = document.createElement("span");
      const value = document.createElement("b");
      const detail = document.createElement("small");

      item.className = `area-stat ${area.role ? `is-${area.role}` : ""}`.trim();
      title.textContent = area.label;
      value.textContent = `${area.accuracy}%`;
      detail.textContent = `${area.correct} of ${area.answered} correct${area.role ? `, ${area.role}` : ""}`;

      item.append(title, value, detail);
      areaStats.append(item);
    });
  }

  function getAreaStats() {
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

  function renderRecentTests() {
    recentTests.replaceChildren();

    if (!progress.testHistory.length) {
      recentTests.append(createEmptyProgressNote("Complete an exam simulation to see recent results here."));
      return;
    }

    progress.testHistory.slice(-3).reverse().forEach((test) => {
      const item = document.createElement("div");
      const score = document.createElement("b");
      const meta = document.createElement("span");
      const status = document.createElement("span");

      item.className = `recent-test ${test.passed ? "is-pass" : "is-fail"}`;
      score.textContent = `${test.correct} / ${test.total}`;
      meta.textContent = formatHistoryDate(test.completedAt);
      status.textContent = test.passed ? "Passed" : "Not passed";

      item.append(score, meta, status);
      recentTests.append(item);
    });
  }

  function createEmptyProgressNote(text) {
    const note = document.createElement("p");
    note.className = "progress-empty";
    note.textContent = text;
    return note;
  }

  function show(screen) {
    startScreen.classList.toggle("is-hidden", screen !== "start");
    quizScreen.classList.toggle("is-hidden", screen !== "quiz");
    resultScreen.classList.toggle("is-hidden", screen !== "result");
  }

  function getStudyQuestions(filter) {
    if (filter === "bookmarked") {
      return getBookmarkedQuestions();
    }

    const [category, selectedState] = filter.split(":");
    let filteredQuestions;

    if (filter === "all") {
      filteredQuestions = questions.slice();
    } else {
      filteredQuestions = questions.filter((question) => {
        if (question.category !== category) return false;
        return !selectedState || question.state === selectedState;
      });
    }

    return orderStudyQuestionsByProgress(filteredQuestions, progress.questionStats);
  }

  function getWeakQuestionIds() {
    return Object.keys(progress.weakQuestions).filter((questionId) => {
      return questions.some((question) => String(question.id) === questionId);
    });
  }

  function getBookmarkedQuestionIds() {
    return Object.keys(progress.bookmarkedQuestions).filter((questionId) => {
      return questions.some((question) => String(question.id) === questionId);
    });
  }

  function getBookmarkedQuestions() {
    return getBookmarkedQuestionIds()
      .map((questionId) => questions.find((question) => String(question.id) === questionId))
      .filter(Boolean);
  }

  function isBookmarked(question) {
    return Boolean(question && progress.bookmarkedQuestions[String(question.id)]);
  }

  function toggleCurrentBookmark() {
    const question = state.run[state.index];
    if (!question) return;

    const questionId = String(question.id);
    if (progress.bookmarkedQuestions[questionId]) {
      delete progress.bookmarkedQuestions[questionId];
    } else {
      progress.bookmarkedQuestions[questionId] = {
        addedAt: new Date().toISOString()
      };
    }

    saveProgress();
    renderBookmarkToggle(question);
    renderProgressSummary();
  }

  function hasActiveRun() {
    return !quizScreen.classList.contains("is-hidden") && state.run.length > 0 && state.answers.length > 0;
  }

  function confirmDiscardActiveRun() {
    if (!hasActiveRun()) return true;
    const message = state.mode === "exam"
      ? "Leave the current exam simulation? This unfinished exam result will not be saved."
      : "Leave the current run? Answers you already selected are saved, but unanswered questions in this run will be skipped.";
    return window.confirm(message);
  }

  function goHome() {
    if (!confirmDiscardActiveRun()) return;

    stopTimer();
    show("start");
  }

  function startRun() {
    if (!confirmDiscardActiveRun()) return;

    const selectedState = bundeslandSelect.value;
    const examRun = createExamRun(questions, selectedState, { sampleByCategory, shuffle });
    if (!examRun.length) return;

    state.mode = "exam";
    state.selectedState = selectedState;
    state.run = examRun;
    setTranslationsEnabled(false);
    resetRunState();
    startTimer();
    renderQuestion();
    show("quiz");
  }

  function startPracticeRun() {
    if (!confirmDiscardActiveRun()) return;

    const studyQuestions = getStudyQuestions(studyFilter.value);
    if (!studyQuestions.length) return;

    state.mode = "study";
    state.studyFilter = studyFilter.value;
    state.run = studyQuestions;
    resetRunState();
    stopTimer();
    renderTimer();
    renderQuestion();
    show("quiz");
  }

  function restartCurrentRun() {
    if (state.mode !== "study") {
      startRun();
      return;
    }

    const studyQuestions = getStudyQuestions(state.studyFilter);
    if (!studyQuestions.length) return;

    state.run = studyQuestions;
    resetRunState();
    stopTimer();
    renderTimer();
    renderQuestion();
    show("quiz");
  }

  function startPracticeQuestion(questionId) {
    if (!confirmDiscardActiveRun()) return;

    const question = questions.find((item) => item.id === questionId);
    if (!question) return;

    state.mode = "practice";
    state.run = [question];
    resetRunState();
    stopTimer();
    renderTimer();
    renderQuestion();
    show("quiz");
  }

  function startCatalogueQuestion(question) {
    if (!question) return;
    startPracticeQuestion(question.id);
  }

  function startWeakReview() {
    if (!confirmDiscardActiveRun()) return;

    const weakQuestions = getWeakQuestionIds()
      .map((questionId) => questions.find((item) => String(item.id) === questionId))
      .filter(Boolean);
    if (!weakQuestions.length) {
      startTabController.selectTab("progress");
      return;
    }

    state.mode = "weak-review";
    state.run = shuffle(weakQuestions);
    resetRunState();
    stopTimer();
    renderTimer();
    renderQuestion();
    show("quiz");
  }

  function startBookmarkReview() {
    if (!confirmDiscardActiveRun()) return;

    const bookmarkedQuestions = getBookmarkedQuestions();
    if (!bookmarkedQuestions.length) {
      startTabController.selectTab("progress");
      return;
    }

    state.mode = "bookmarks";
    state.run = bookmarkedQuestions;
    resetRunState();
    stopTimer();
    renderTimer();
    renderQuestion();
    show("quiz");
  }

  function resetRunState() {
    stopTimer();
    state.index = 0;
    state.selected = null;
    state.score = 0;
    state.answers = [];
    state.startedAt = null;
    state.completedAt = null;
    state.timeRemaining = state.mode === "exam" ? EXAM_DURATION_SECONDS : 0;
    state.endedByTimeout = false;
  }

  function startTimer() {
    state.startedAt = Date.now();
    state.completedAt = null;
    state.timeRemaining = EXAM_DURATION_SECONDS;
    state.endedByTimeout = false;
    renderTimer();
    state.timerId = window.setInterval(tickTimer, 1000);
  }

  function stopTimer() {
    if (!state.timerId) return;
    window.clearInterval(state.timerId);
    state.timerId = null;
  }

  function tickTimer() {
    if (state.mode !== "exam" || !state.startedAt) {
      stopTimer();
      return;
    }

    const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    state.timeRemaining = Math.max(EXAM_DURATION_SECONDS - elapsed, 0);
    renderTimer();

    if (state.timeRemaining === 0) {
      finishTest(true);
    }
  }

  function renderTimer() {
    const isTimedTest = state.mode === "exam";
    timerCounter.classList.toggle("is-hidden", !isTimedTest);
    timerCounter.classList.toggle("is-warning", isTimedTest && state.timeRemaining <= 5 * 60);
    timerCounter.textContent = formatDuration(isTimedTest ? state.timeRemaining : 0);
  }

  function formatDuration(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function formatHistoryDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function toggleTranslations() {
    if (state.mode === "exam") return;
    state.translationsEnabled = !state.translationsEnabled;
    renderTranslationToggle();
    renderTranslations();
  }

  function setTranslationsEnabled(enabled) {
    state.translationsEnabled = enabled;
    renderTranslationToggle();
  }

  function renderTranslationToggle() {
    const disabled = state.mode === "exam";
    translationToggle.disabled = disabled;
    translationToggle.setAttribute("aria-pressed", String(!disabled && state.translationsEnabled));
    translationToggle.title = disabled
      ? "English translations are disabled in exam simulation"
      : state.translationsEnabled ? "Hide English translations" : "Show English translations";
    translationToggle.setAttribute("aria-label", translationToggle.title);
  }

  function renderBookmarkToggle(question) {
    const bookmarked = isBookmarked(question);
    bookmarkToggle.setAttribute("aria-pressed", String(bookmarked));
    bookmarkLabel.textContent = bookmarked ? "Saved" : "Bookmark";
    bookmarkToggle.title = bookmarked ? "Remove bookmark" : "Bookmark question";
    bookmarkToggle.setAttribute("aria-label", bookmarked ? "Remove bookmark" : "Bookmark question");
  }

  function renderImages(question) {
    imageGrid.replaceChildren();
    imageGrid.className = `image-grid image-count-${question.images.length}`;
    imageGrid.classList.toggle("is-hidden", question.images.length === 0);

    question.images.forEach((image) => {
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      const caption = document.createElement("figcaption");
      img.src = image.src;
      img.alt = image.label;
      caption.textContent = image.label;
      figure.append(img, caption);
      imageGrid.append(figure);
    });
  }

  function renderQuestion() {
    const question = state.run[state.index];
    const progress = state.index + 1;
    const total = state.run.length;

    questionKicker.textContent = `Question ${progress} / ${total}`;
    questionTitle.textContent = question.prompt;
    scoreCounter.textContent = state.mode === "exam" ? "Exam simulation" : `${state.score} correct`;
    quizProgress.setAttribute("aria-valuemax", String(total));
    quizProgress.setAttribute("aria-valuenow", String(progress));
    quizProgress.setAttribute("aria-valuetext", `Question ${progress} of ${total}`);
    progressBar.style.width = `${((progress - 1) / total) * 100}%`;
    questionHint.textContent = "Choose one answer.";
    questionTranslation.replaceChildren();
    questionTranslation.classList.add("is-hidden");
    questionExplanation.textContent = "";
    questionExplanation.classList.add("is-hidden");
    previousButton.classList.add("is-hidden");
    nextButton.classList.add("is-hidden");
    nextButton.textContent = progress === total ? "Finish" : "Next";
    state.selected = getCurrentAnswerEntry(question)?.selectedIndex ?? null;

    renderTimer();
    renderModeChrome(question, progress, total);
    renderTranslationToggle();
    renderBookmarkToggle(question);
    renderImages(question);
    renderAnswers(question);
    renderLearnerHint(question);
    renderTranslations();
  }

  function renderLearnerHint(question) {
    if (state.mode === "exam" || state.selected !== null) return;

    const hint = getLearnerHint(question);
    if (!hint) return;
    questionHint.textContent = `Hint: ${hint}`;
  }

  function renderModeChrome(question, progress, total) {
    if (state.mode === "exam") {
      questionKicker.textContent = `Exam simulation ${progress} / ${total}`;
      questionHint.textContent = state.selected === null
        ? "Choose one answer. Correctness is shown after you finish."
        : "Answer saved. Continue when ready.";
      return;
    }

    if (state.mode !== "study") return;

    const label = question.category === "state" ? `${question.state} question` : "General question";
    questionKicker.textContent = `${label} ${progress} / ${total}`;
    scoreCounter.textContent = "Study mode";
    progressBar.style.width = `${(progress / total) * 100}%`;
    questionHint.textContent = state.selected === null
      ? "Choose one answer, or use Previous and Next to browse."
      : "Answer saved for this study session. Use Previous and Next to browse.";
    previousButton.classList.toggle("is-hidden", total <= 1);
    previousButton.disabled = state.index === 0;
    nextButton.classList.remove("is-hidden");
    nextButton.textContent = progress === total ? "Back to start" : "Next";

    if (state.selected !== null && question.explanation) {
      questionExplanation.textContent = question.explanation;
      questionExplanation.classList.remove("is-hidden");
    }
  }

  function renderAnswers(question) {
    answers.replaceChildren();
    const answeredEntry = getCurrentAnswerEntry(question);

    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      const letter = document.createElement("span");
      const copy = document.createElement("span");
      const text = document.createElement("span");
      const translation = document.createElement("span");

      button.className = "answer-option";
      button.type = "button";
      button.lang = "de";
      button.dataset.index = String(index);
      letter.className = "option-letter";
      letter.textContent = LETTERS[index];
      copy.className = "option-copy";
      text.textContent = option.text;
      translation.className = "option-translation is-hidden";
      translation.dataset.translationIndex = String(index);

      copy.append(text, translation);
      button.append(letter, copy);
      button.addEventListener("click", () => chooseAnswer(index));

      if (answeredEntry) {
        button.setAttribute("aria-disabled", "true");
        applyAnswerAccessibility(button, option, index, answeredEntry);
      } else {
        button.removeAttribute("aria-disabled");
        applyAnswerAccessibility(button, option, index, null);
      }
      answers.append(button);
    });
  }

  function applyAnswerAccessibility(button, option, index, answeredEntry) {
    const label = `${LETTERS[index]}. ${option.text}`;
    if (!answeredEntry) {
      button.setAttribute("aria-label", label);
      return;
    }

    if (state.mode === "exam") {
      if (index === answeredEntry.selectedIndex) {
        button.classList.add("is-selected");
        appendVisibleAnswerState(button, "Selected", "•");
        button.setAttribute("aria-label", appendAnswerState(label, "Your selected answer."));
      } else {
        button.setAttribute("aria-label", label);
      }
      return;
    }

    if (index === answeredEntry.correctIndex) {
      button.classList.add("is-correct");
      appendVisibleAnswerState(button, "Correct", "✓");
      button.setAttribute("aria-label", appendAnswerState(label, "Correct answer."));
      return;
    }

    if (index === answeredEntry.selectedIndex && !answeredEntry.isCorrect) {
      button.classList.add("is-wrong");
      appendVisibleAnswerState(button, "Your answer", "×");
      button.setAttribute("aria-label", appendAnswerState(label, "Your selected answer, incorrect."));
      return;
    }

    button.setAttribute("aria-label", label);
  }

  function appendVisibleAnswerState(button, text, symbol) {
    const stateLabel = document.createElement("span");
    stateLabel.className = "answer-state";
    stateLabel.setAttribute("aria-hidden", "true");
    stateLabel.textContent = `${symbol} ${text}`;
    button.querySelector(".option-copy")?.append(stateLabel);
  }

  function appendAnswerState(label, stateText) {
    const separator = /[.!?]$/.test(label.trim()) ? " " : ". ";
    return `${label}${separator}${stateText}`;
  }

  function getCurrentAnswerEntry(question = state.run[state.index]) {
    if (!question) return null;
    return state.answers.find((entry) => entry.question.id === question.id) || null;
  }

  function renderTranslations() {
    const question = state.run[state.index];
    if (!question) return;

    if (state.mode === "exam" || !state.translationsEnabled) {
      questionTranslation.classList.add("is-hidden");
      answers.querySelectorAll(".option-translation").forEach((item) => {
        item.classList.add("is-hidden");
        item.textContent = "";
      });
      return;
    }

    const translation = translations[question.id];
    if (translation) {
      showTranslation(question, translation);
    } else {
      showTranslationFallback();
    }
  }

  function showTranslation(question, translation) {
    questionTranslation.replaceChildren();
    const prompt = document.createElement("p");
    prompt.textContent = translation.prompt;
    questionTranslation.append(prompt);
    questionTranslation.classList.remove("is-hidden");

    question.options.forEach((option, index) => {
      const item = answers.querySelector(`[data-translation-index="${index}"]`);
      if (!item) return;
      item.textContent = translation.options[index] || option.text;
      item.classList.remove("is-hidden");
    });
  }

  function showTranslationFallback() {
    questionTranslation.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "English translation is not available for this question yet.";
    questionTranslation.append(message);
    questionTranslation.classList.remove("is-hidden");

    answers.querySelectorAll(".option-translation").forEach((item) => {
      item.classList.add("is-hidden");
      item.textContent = "";
    });
  }

  function chooseAnswer(selectedIndex) {
    if (getCurrentAnswerEntry()) return;

    const question = state.run[state.index];
    const answerEntry = createAnswerEntry(question, selectedIndex);
    state.selected = selectedIndex;
    state.score += answerEntry.isCorrect ? 1 : 0;
    state.answers.push(answerEntry);
    if (state.mode !== "exam") {
      recordAnswer(answerEntry);
    }

    [...answers.children].forEach((button, index) => {
      button.setAttribute("aria-disabled", "true");
      applyAnswerAccessibility(button, question.options[index], index, answerEntry);
    });

    if (state.mode !== "study" && state.mode !== "exam") {
      scoreCounter.textContent = `${state.score} correct`;
    }
    progressBar.style.width = `${((state.index + 1) / state.run.length) * 100}%`;
    questionHint.textContent = state.mode === "exam"
      ? "Answer saved. Continue when ready."
      : answerEntry.isCorrect ? "Correct answer." : "Wrong answer.";
    if (state.mode !== "exam" && question.explanation) {
      questionExplanation.textContent = question.explanation;
      questionExplanation.classList.remove("is-hidden");
    }
    nextButton.classList.remove("is-hidden");
    nextButton.focus();
  }

  function nextQuestion() {
    if (state.mode === "study") {
      if (state.index === state.run.length - 1) {
        show("start");
        return;
      }

      state.index += 1;
      renderQuestion();
      return;
    }

    if (state.selected === null) return;

    if (state.index === state.run.length - 1) {
      finishTest(false);
      return;
    }

    state.index += 1;
    renderQuestion();
  }

  function previousQuestion() {
    if (state.mode !== "study" || state.index === 0) return;

    state.index -= 1;
    renderQuestion();
  }

  function finishTest(endedByTimeout) {
    stopTimer();
    state.completedAt = Date.now();
    state.endedByTimeout = endedByTimeout;

    if (state.mode === "exam") {
      completeUnansweredQuestions();
      recordCompletedTest();
    }

    renderResult();
    show("result");
  }

  function completeUnansweredQuestions() {
    const answeredQuestionIds = new Set(state.answers.map((entry) => String(entry.question.id)));
    state.run.forEach((question) => {
      if (answeredQuestionIds.has(String(question.id))) return;

      const answerEntry = createUnansweredEntry(question);
      state.answers.push(answerEntry);
      recordAnswer(answerEntry, { countStats: false, trackWeak: false });
    });
  }

  function renderResult() {
    if (state.mode !== "exam") {
      resultTitle.textContent = state.mode === "weak-review"
        ? "Weak review complete"
        : state.mode === "bookmarks"
          ? "Bookmark review complete"
          : "Practice complete";
      resultScore.textContent = `${state.score} / ${state.run.length}`;
      resultStatus.className = "result-status";
      resultStatus.replaceChildren(createReviewText(
        state.mode === "weak-review"
          ? `Weak questions clear after ${WEAK_CLEAR_STREAK} correct answers in a row.`
          : state.mode === "bookmarks"
            ? "Bookmarked practice is untimed and stays separate from exam-simulation history."
          : "Practice mode is untimed and separate from exam-simulation history."
      ));
      resultTime.textContent = "";
      resultContext.textContent = "";
      renderReview();
      return;
    }

    const passed = getPassResult(state.score);
    resultTitle.textContent = passed ? "Passed" : "Not passed";
    resultScore.textContent = `${state.score} / ${state.run.length}`;
    resultContext.textContent = `Bundesland: ${state.selectedState || bundeslandSelect.value}. 30 general questions, 3 residence-based Bundesland questions, 60-minute limit.`;
    resultStatus.className = `result-status ${passed ? "is-pass" : "is-fail"}`;
    resultStatus.replaceChildren(createReviewText(
      state.endedByTimeout
        ? `Time expired. Unanswered questions count against this test result but are not saved as weak questions. Einbürgerung threshold: ${PASS_THRESHOLD} correct answers.`
        : `Einbürgerung threshold: ${PASS_THRESHOLD} correct answers.`
    ));
    resultTime.textContent = formatResultTime();
    renderReview();
  }

  function formatResultTime() {
    if (!state.startedAt || !state.completedAt) return "";

    const elapsed = Math.min(
      EXAM_DURATION_SECONDS,
      Math.max(0, Math.floor((state.completedAt - state.startedAt) / 1000))
    );
    const remaining = Math.max(EXAM_DURATION_SECONDS - elapsed, 0);

    if (state.endedByTimeout) {
      return `Time expired after ${formatDuration(EXAM_DURATION_SECONDS)}.`;
    }

    return `Finished in ${formatDuration(elapsed)} with ${formatDuration(remaining)} remaining.`;
  }

  function renderReview() {
    reviewList.replaceChildren();
    const missed = state.answers.filter((entry) => !entry.isCorrect);
    reviewHeading.textContent = missed.length === 1 ? "1 missed question" : `${missed.length} missed questions`;

    if (missed.length === 0) {
      const item = document.createElement("div");
      item.className = "review-item";
      reviewHeading.textContent = "Missed questions";
      item.append(createReviewTitle("No mistakes"));
      item.append(createReviewText("All answers in this run were correct."));
      reviewList.append(item);
      return;
    }

    missed.forEach((entry) => {
      const item = document.createElement("div");
      const selected = formatAnswer(entry.question, entry.selectedIndex);
      const correct = formatAnswer(entry.question, entry.correctIndex);
      const practiceButton = document.createElement("button");
      item.className = "review-item";
      item.append(createReviewTitle(entry.question.prompt));
      item.append(createReviewAnswer("Your answer", selected));
      item.append(createReviewAnswer("Correct answer", correct));

      if (entry.question.explanation) {
        const explanation = document.createElement("p");
        explanation.className = "review-explanation";
        explanation.textContent = entry.question.explanation;
        item.append(explanation);
      }

      practiceButton.className = "secondary-action review-practice";
      practiceButton.type = "button";
      practiceButton.textContent = "Practice this question";
      practiceButton.addEventListener("click", () => startPracticeQuestion(entry.question.id));
      item.append(practiceButton);
      reviewList.append(item);
    });
  }

  function createReviewTitle(text) {
    const title = document.createElement("strong");
    title.textContent = text;
    return title;
  }

  function createReviewText(text) {
    const paragraph = document.createElement("p");
    paragraph.className = "meta";
    paragraph.textContent = text;
    return paragraph;
  }

  function createReviewAnswer(label, answer) {
    const paragraph = document.createElement("p");
    const labelElement = document.createElement("b");
    paragraph.className = "review-answer";
    labelElement.textContent = `${label}: `;
    paragraph.append(labelElement, answer);
    return paragraph;
  }

  function formatAnswer(question, optionIndex) {
    if (!Number.isInteger(optionIndex)) return "No answer selected";

    const letter = LETTERS[optionIndex] || "";
    const option = question.options[optionIndex];
    return `${letter}. ${option ? option.text : "No answer selected"}`;
  }

  function getIncorrectQuestionIds() {
    return Object.entries(progress.questionStats)
      .filter(([, stats]) => (stats?.wrong || 0) > 0)
      .map(([questionId]) => questionId)
      .filter((questionId) => questions.some((question) => String(question.id) === questionId));
  }

  function resetCatalogueLimit() {
    catalogueVisibleCount = CATALOGUE_RESULT_LIMIT;
    renderCatalogue({ preserveLimit: true });
  }

  function showMoreCatalogueItems() {
    catalogueVisibleCount += CATALOGUE_RESULT_LIMIT;
    renderCatalogue({ preserveLimit: true });
  }

  function renderCatalogue(options = {}) {
    if (!options.preserveLimit) {
      catalogueVisibleCount = CATALOGUE_RESULT_LIMIT;
    }

    const query = normalizeSearch(catalogueSearch.value);
    const filter = catalogueFilter.value;
    const cataloguePool = getCataloguePool(questions, filter, {
      incorrectIds: new Set(getIncorrectQuestionIds()),
      bookmarkedIds: new Set(getBookmarkedQuestionIds())
    });
    const filteredQuestions = searchCatalogueQuestions(cataloguePool, query, translations);
    const visibleQuestions = filteredQuestions.slice(0, catalogueVisibleCount);
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
      catalogueResults.append(createCatalogueItem(question));
    });
  }

  function createCatalogueItem(question) {
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
    statusTag.textContent = getCatalogueStatus(question);
    prompt.textContent = question.prompt;
    answer.textContent = `Answer: ${formatAnswer(question, correctIndex)}`;
    answer.hidden = !shouldShowCatalogueAnswer(question);
    button.textContent = "Study";
    button.addEventListener("click", () => startCatalogueQuestion(question));
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

  function shouldShowCatalogueAnswer(question) {
    return (progress.questionStats[String(question.id)]?.answered || 0) > 0;
  }

  function getCatalogueStatus(question) {
    const questionId = String(question.id);
    if (progress.bookmarkedQuestions[questionId]) return "Bookmarked";
    if ((progress.questionStats[questionId]?.wrong || 0) > 0) return "Incorrect before";
    if ((progress.questionStats[questionId]?.answered || 0) > 0) return "Studied";
    return "New";
  }

  function jumpToQuestion(event) {
    event.preventDefault();
    const targetNumber = Number.parseInt(jumpQuestion.value, 10);
    if (!Number.isInteger(targetNumber)) return;

    const question = questions.find((item) => item.sourceNumber === targetNumber || item.id === targetNumber);
    if (!question) {
      catalogueSearch.value = String(targetNumber);
      catalogueFilter.value = "all";
      renderCatalogue();
      jumpQuestion.select();
      return;
    }

    startCatalogueQuestion(question);
  }

  function setupAnalyticsConsent() {
    const savedConsent = getStorageItem(ANALYTICS_CONSENT_KEY);
    if (savedConsent === "granted") {
      loadAnalytics();
      return;
    }

    if (savedConsent === "denied") {
      analyticsStatus.textContent = "Analytics off";
      return;
    }

    const banner = document.createElement("section");
    const text = document.createElement("p");
    const allow = document.createElement("button");
    const decline = document.createElement("button");
    banner.className = "consent-banner";
    banner.setAttribute("aria-label", "Analytics privacy choice");
    text.textContent = "Help improve this free study app by allowing privacy-conscious Google Analytics. Analytics stays off unless you consent.";
    allow.className = "primary-action";
    allow.type = "button";
    allow.textContent = "Allow analytics";
    decline.className = "secondary-action";
    decline.type = "button";
    decline.textContent = "Keep off";
    allow.addEventListener("click", () => {
      setStorageItem(ANALYTICS_CONSENT_KEY, "granted");
      banner.remove();
      loadAnalytics();
    });
    decline.addEventListener("click", () => {
      setStorageItem(ANALYTICS_CONSENT_KEY, "denied");
      analyticsStatus.textContent = "Analytics off";
      banner.remove();
    });
    banner.append(text, allow, decline);
    document.body.append(banner);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Offline support is optional during local checks.
    });
  }

  function loadAnalytics() {
    if (document.querySelector(`script[src*="${ANALYTICS_ID}"]`)) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("consent", "default", {
      ad_storage: "denied",
      analytics_storage: "granted",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", ANALYTICS_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
    document.head.append(script);
    analyticsStatus.textContent = "Analytics on";
  }

  function showLegalPanel(panel, trigger) {
    const content = LEGAL_NOTICE[panel] || LEGAL_NOTICE.privacy;
    const titleId = `legal-title-${panel}`;

    showModalDialog({
      className: "legal-modal",
      title: content.title,
      labelledBy: titleId,
      trigger,
      renderContent(modal) {
        content.paragraphs.forEach((paragraph) => {
          const copy = document.createElement("p");
          copy.textContent = paragraph;
          modal.append(copy);
        });
      }
    });
  }

  startButton.addEventListener("click", startRun);
  practiceButton.addEventListener("click", startPracticeRun);
  weakReviewButton.addEventListener("click", startWeakReview);
  bookmarkReviewButton.addEventListener("click", startBookmarkReview);
  homeButton.addEventListener("click", goHome);
  restartButton.addEventListener("click", restartCurrentRun);
  newTestButton.addEventListener("click", startRun);
  resultHomeButton.addEventListener("click", goHome);
  resetProgressButton.addEventListener("click", resetProgress);
  previousButton.addEventListener("click", previousQuestion);
  nextButton.addEventListener("click", nextQuestion);
  translationToggle.addEventListener("click", toggleTranslations);
  bookmarkToggle.addEventListener("click", toggleCurrentBookmark);
  catalogueSearch.addEventListener("input", resetCatalogueLimit);
  catalogueFilter.addEventListener("change", resetCatalogueLimit);
  catalogueMoreButton.addEventListener("click", showMoreCatalogueItems);
  jumpForm.addEventListener("submit", jumpToQuestion);
  document.querySelectorAll("[data-legal-panel]").forEach((button) => {
    button.addEventListener("click", () => showLegalPanel(button.dataset.legalPanel, button));
  });
  populateStateControls();
  startTabController.selectTab("progress");
  setupAnalyticsConsent();
  registerServiceWorker();
  renderProgressSummary();

  if (!questions.length) {
    startButton.disabled = true;
    practiceButton.disabled = true;
    weakReviewButton.disabled = true;
    startButton.textContent = "Question data missing";
  }
})();
