import { getStorageItem, loadProgress, saveProgress as persistProgress, setStorageItem } from "./modules/storage.js";
import { getStateNames, sampleByCategory, shuffle } from "./modules/sampling.js";
import { createEmitter } from "./modules/emitter.js";
import { LETTERS, formatDuration } from "./modules/format.js";
import { applyAnswer, toggleBookmark } from "./modules/progress.js";
import {
  getBookmarkedQuestions,
  getStudyQuestions,
  getWeakQuestions,
  isBookmarked
} from "./modules/progress-queries.js";
import { getLearnerHint } from "./modules/hints.js";
import { showModalDialog } from "./modules/dialog.js";
import { confirmDialog } from "./modules/confirm-dialog.js";
import { clearExamSession, createExamSnapshot, loadExamSession, saveExamSession } from "./modules/exam-session.js";
import {
  EXAM_DURATION_SECONDS,
  PASS_THRESHOLD,
  TOTAL_GENERAL,
  TOTAL_STATE,
  createAnswerEntry,
  createExamRun,
  createUnansweredEntry
} from "./modules/quiz-rules.js";
import { createCatalogueScreen } from "./screens/catalogue.js";
import { createProgressPanel } from "./screens/progress.js";
import { createResultScreen } from "./screens/result.js";
import { createResumeCard } from "./screens/resume.js";
import { createStartScreen } from "./screens/start.js";

(() => {
  "use strict";

  const ANALYTICS_ID = "G-6LN5H6T5LW";
  const ANALYTICS_CONSENT_KEY = "lidAnalyticsConsent";
  const LEGAL_NOTICE = {
    privacy: {
      title: "Privacy",
      paragraphs: [
        "This app stores study progress, weak questions, bookmarks, an unfinished exam simulation, and analytics consent locally in this browser.",
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

  const events = createEmitter();
  const ctx = {
    questions,
    translations,
    stateNames,
    progress,
    state,
    events,
    // Late-bound calls between screens; each screen registers what it offers.
    actions: {},
    saveProgress() {
      persistProgress(progress);
    },
    // Save progress and tell the screens that show it to redraw.
    commitProgress() {
      ctx.saveProgress();
      events.emit("progress-changed");
    }
  };
  const start = createStartScreen(ctx);
  const resume = createResumeCard(ctx);
  createProgressPanel(ctx);
  createCatalogueScreen(ctx);
  const resultView = createResultScreen(ctx);

  const $ = (id) => document.getElementById(id);
  const startScreen = $("start-screen");
  const startTitle = $("start-title");
  const quizScreen = $("quiz-screen");
  const resultScreen = $("result-screen");
  const consentSlot = $("consent-slot");
  const homeButton = $("home-button");
  const restartButton = $("restart-button");
  const nextButton = $("next-button");
  const previousButton = $("previous-button");
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
  const questionFeedback = $("question-feedback");
  const feedbackVerdict = $("feedback-verdict");
  const feedbackWhy = $("feedback-why");
  const questionHint = $("question-hint");
  const resultTitle = $("result-title");
  const analyticsStatus = $("analytics-status");

  function recordAnswer(entry, options = {}) {
    if (!applyAnswer(progress, entry, options)) return;
    ctx.commitProgress();
  }

  function recordCompletedTest() {
    if (state.mode !== "exam" || state.run.length !== TOTAL_GENERAL + TOTAL_STATE) return;

    progress.testHistory.push({
      completedAt: new Date(state.completedAt || Date.now()).toISOString(),
      correct: state.score,
      total: state.run.length,
      passed: state.score >= PASS_THRESHOLD,
      questionIds: state.run.map((question) => question.id),
      wrongQuestionIds: state.answers.filter((entry) => !entry.isCorrect).map((entry) => entry.question.id)
    });
    ctx.commitProgress();
  }

  function show(screen, { focus = true } = {}) {
    startScreen.classList.toggle("is-hidden", screen !== "start");
    quizScreen.classList.toggle("is-hidden", screen !== "quiz");
    resultScreen.classList.toggle("is-hidden", screen !== "result");
    events.emit("screen-shown", screen);
    if (focus) ({ start: startTitle, quiz: questionTitle, result: resultTitle })[screen].focus();
  }

  function persistExamSession() {
    if (state.mode !== "exam" || !state.startedAt) return;

    saveExamSession(createExamSnapshot({
      run: state.run,
      answers: state.answers,
      index: state.index,
      selectedState: state.selectedState,
      startedAt: state.startedAt
    }));
  }

  function resumeExam() {
    const saved = loadExamSession(questions);
    if (!saved) {
      resume.refresh();
      return;
    }

    state.mode = "exam";
    state.selectedState = saved.selectedState;
    start.setSelectedState(saved.selectedState);
    state.run = saved.run;
    setTranslationsEnabled(false);
    resetRunState();
    state.answers = saved.answers;
    state.score = saved.score;
    state.index = saved.index;
    resume.release();

    if (saved.expired) {
      state.startedAt = saved.startedAt;
      finishTest(true, saved.startedAt + EXAM_DURATION_SECONDS * 1000);
      return;
    }

    startTimer(saved.startedAt);
    renderQuestion();
    show("quiz");
  }

  function toggleCurrentBookmark() {
    const question = state.run[state.index];
    if (!question) return;

    toggleBookmark(progress, question.id);
    ctx.commitProgress();
    renderBookmarkToggle(question);
  }

  function hasActiveRun() {
    return !quizScreen.classList.contains("is-hidden") && state.run.length > 0 && state.answers.length > 0;
  }

  async function confirmDiscardActiveRun() {
    if (!hasActiveRun()) return true;
    if (state.mode === "exam") {
      return confirmDialog({
        title: "Leave the exam?",
        message: "Your exam is not finished, so no result will be saved.",
        confirmLabel: "Leave exam",
        cancelLabel: "Keep going"
      });
    }

    return confirmDialog({
      title: "Leave this run?",
      message: "Answers you already selected are saved. Unanswered questions in this run will be skipped.",
      confirmLabel: "Leave run",
      cancelLabel: "Keep studying"
    });
  }

  async function goHome() {
    if (!(await confirmDiscardActiveRun())) return;

    if (state.mode === "exam" && !quizScreen.classList.contains("is-hidden")) clearExamSession();
    stopTimer();
    show("start");
  }

  async function startRun() {
    if (!(await confirmDiscardActiveRun())) return;
    if (resume.hasPending()) {
      const replace = await confirmDialog({
        title: "Start a new exam?",
        message: "Your unfinished exam will be discarded.",
        confirmLabel: "Start new exam",
        cancelLabel: "Keep unfinished exam",
        trigger: $("start-button")
      });
      if (!replace) return;
    }

    const selectedState = start.getSelectedState();
    const examRun = createExamRun(questions, selectedState, { sampleByCategory, shuffle });
    if (!examRun.length) return;
    resume.release();

    state.mode = "exam";
    state.selectedState = selectedState;
    state.run = examRun;
    setTranslationsEnabled(false);
    resetRunState();
    startTimer();
    renderQuestion();
    show("quiz");
  }

  async function startPracticeRun() {
    if (!(await confirmDiscardActiveRun())) return;

    const studyFilter = start.getStudyFilter();
    const studyQuestions = getStudyQuestions(studyFilter, questions, progress);
    if (!studyQuestions.length) return;

    state.mode = "study";
    state.studyFilter = studyFilter;
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

    const studyQuestions = getStudyQuestions(state.studyFilter, questions, progress);
    if (!studyQuestions.length) return;

    state.run = studyQuestions;
    resetRunState();
    stopTimer();
    renderTimer();
    renderQuestion();
    show("quiz");
  }

  async function startPracticeQuestion(questionId) {
    if (!(await confirmDiscardActiveRun())) return;

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

  async function startWeakReview() {
    if (!(await confirmDiscardActiveRun())) return;

    const weakQuestions = getWeakQuestions(progress, questions);
    if (!weakQuestions.length) {
      start.selectTab("progress");
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

  async function startBookmarkReview() {
    if (!(await confirmDiscardActiveRun())) return;

    const bookmarkedQuestions = getBookmarkedQuestions(progress, questions);
    if (!bookmarkedQuestions.length) {
      start.selectTab("progress");
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

  function startTimer(startedAt = Date.now()) {
    state.startedAt = startedAt;
    state.completedAt = null;
    state.timeRemaining = Math.max(EXAM_DURATION_SECONDS - Math.floor((Date.now() - startedAt) / 1000), 0);
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
    const bookmarked = isBookmarked(progress, question);
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
    renderFeedback(question);
    renderLearnerHint(question);
    renderTranslations();
    persistExamSession();
  }

  function renderFeedback(question) {
    const entry = getCurrentAnswerEntry(question);
    const showFeedback = Boolean(entry) && state.mode !== "exam";
    const showExplanation = showFeedback && Boolean(question.explanation);

    questionFeedback.classList.toggle("is-hidden", !showFeedback);
    feedbackWhy.classList.toggle("is-hidden", !showExplanation);
    questionExplanation.classList.toggle("is-hidden", !showExplanation);
    questionExplanation.textContent = showExplanation ? question.explanation : "";
    feedbackVerdict.replaceChildren();
    feedbackVerdict.classList.remove("is-correct", "is-wrong");
    if (!showFeedback) return;

    const mark = document.createElement("span");
    const text = document.createElement("span");
    mark.className = "feedback-verdict-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = entry.isCorrect ? "✓" : "×";
    text.textContent = entry.isCorrect
      ? "Correct."
      : `Not quite. The correct answer is ${LETTERS[entry.correctIndex]}.`;
    feedbackVerdict.classList.add(entry.isCorrect ? "is-correct" : "is-wrong");
    feedbackVerdict.append(mark, text);
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
      nextButton.classList.toggle("is-hidden", state.selected === null);
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
      button.append(letter, document.createTextNode(" "), copy);
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
        button.setAttribute("aria-label", appendAnswerState(label, "Selected answer."));
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
      button.setAttribute("aria-label", appendAnswerState(label, "Your answer, incorrect."));
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
    } else {
      persistExamSession();
    }

    [...answers.children].forEach((button, index) => {
      button.setAttribute("aria-disabled", "true");
      applyAnswerAccessibility(button, question.options[index], index, answerEntry);
    });

    if (state.mode !== "study" && state.mode !== "exam") {
      scoreCounter.textContent = `${state.score} correct`;
    }
    progressBar.style.width = `${((state.index + 1) / state.run.length) * 100}%`;
    questionHint.textContent = state.mode === "study"
      ? "Answer saved for this study session. Use Previous and Next to browse."
      : "Answer saved. Continue when ready.";
    renderFeedback(question);
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
      questionTitle.focus();
      return;
    }

    if (state.selected === null) return;

    if (state.index === state.run.length - 1) {
      finishTest(false);
      return;
    }

    state.index += 1;
    renderQuestion();
    questionTitle.focus();
  }

  function previousQuestion() {
    if (state.mode !== "study" || state.index === 0) return;

    state.index -= 1;
    renderQuestion();
    questionTitle.focus();
  }

  function finishTest(endedByTimeout, completedAt = Date.now()) {
    stopTimer();
    state.completedAt = completedAt;
    state.endedByTimeout = endedByTimeout;

    if (state.mode === "exam") {
      completeUnansweredQuestions();
      recordCompletedTest();
      clearExamSession();
    }

    resultView.render();
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
    const copy = document.createElement("div");
    const badge = document.createElement("span");
    const text = document.createElement("p");
    const allow = document.createElement("button");
    const decline = document.createElement("button");
    banner.className = "consent-banner";
    banner.setAttribute("aria-label", "Analytics privacy choice");
    copy.className = "consent-copy";
    badge.className = "consent-badge";
    badge.textContent = "Privacy first";
    text.textContent = "Help improve this free study app by allowing privacy-conscious Google Analytics. Analytics stays off unless you consent.";
    allow.className = "primary-action";
    allow.type = "button";
    allow.textContent = "Allow analytics";
    decline.className = "secondary-action";
    decline.type = "button";
    decline.textContent = "Keep off";
    // Removing the banner would drop focus to the page body, so hand it to the
    // next control in reading order.
    const closeBanner = () => {
      banner.remove();
      document.querySelector('.start-tab[tabindex="0"]')?.focus();
    };
    allow.addEventListener("click", () => {
      setStorageItem(ANALYTICS_CONSENT_KEY, "granted");
      closeBanner();
      loadAnalytics();
    });
    decline.addEventListener("click", () => {
      setStorageItem(ANALYTICS_CONSENT_KEY, "denied");
      analyticsStatus.textContent = "Analytics off";
      closeBanner();
    });
    copy.append(badge, text);
    banner.append(copy, allow, decline);
    (consentSlot || document.body).append(banner);
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

  ctx.actions.startRun = startRun;
  ctx.actions.startPracticeRun = startPracticeRun;
  ctx.actions.startWeakReview = startWeakReview;
  ctx.actions.startBookmarkReview = startBookmarkReview;
  ctx.actions.goHome = goHome;
  ctx.actions.startPracticeQuestion = startPracticeQuestion;
  ctx.actions.resumeExam = resumeExam;
  ctx.actions.getSelectedState = start.getSelectedState;
  homeButton.addEventListener("click", goHome);
  restartButton.addEventListener("click", restartCurrentRun);
  previousButton.addEventListener("click", previousQuestion);
  nextButton.addEventListener("click", nextQuestion);
  translationToggle.addEventListener("click", toggleTranslations);
  bookmarkToggle.addEventListener("click", toggleCurrentBookmark);
  document.querySelectorAll("[data-legal-panel]").forEach((button) => {
    button.addEventListener("click", () => showLegalPanel(button.dataset.legalPanel, button));
  });
  setupAnalyticsConsent();
  registerServiceWorker();
  events.emit("progress-changed");
  resume.refresh();
})();
