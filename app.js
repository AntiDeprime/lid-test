(() => {
  "use strict";

  const TOTAL_GENERAL = 30;
  const TOTAL_STATE = 3;
  const PASS_THRESHOLD = 17;
  const EXAM_DURATION_SECONDS = 60 * 60;
  const STORAGE_KEY = "lidTestPrepProgress";
  const STORAGE_VERSION = 1;
  const WEAK_CLEAR_STREAK = 2;
  const LETTERS = ["A", "B", "C", "D"];

  const questions = window.LID_QUESTIONS || [];
  const translations = window.LID_TRANSLATIONS_EN || {};
  const progress = loadProgress();
  const state = {
    mode: "test",
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
    studyFilter: "all"
  };

  const $ = (id) => document.getElementById(id);
  const startScreen = $("start-screen");
  const quizScreen = $("quiz-screen");
  const resultScreen = $("result-screen");
  const startButton = $("start-button");
  const practiceButton = $("practice-button");
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
  const translationToggle = $("translation-toggle");
  const bookmarkToggle = $("bookmark-toggle");
  const questionKicker = $("question-kicker");
  const questionTitle = $("question-title");
  const questionTranslation = $("question-translation");
  const timerCounter = $("timer-counter");
  const scoreCounter = $("score-counter");
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
  const weakStat = $("weak-stat");
  const bookmarkStat = $("bookmark-stat");

  function createEmptyProgress() {
    return {
      version: STORAGE_VERSION,
      questionStats: {},
      weakQuestions: {},
      bookmarkedQuestions: {},
      testHistory: []
    };
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.version !== STORAGE_VERSION) return createEmptyProgress();
      return {
        version: STORAGE_VERSION,
        questionStats: saved.questionStats && typeof saved.questionStats === "object" ? saved.questionStats : {},
        weakQuestions: saved.weakQuestions && typeof saved.weakQuestions === "object" ? saved.weakQuestions : {},
        bookmarkedQuestions: saved.bookmarkedQuestions && typeof saved.bookmarkedQuestions === "object" ? saved.bookmarkedQuestions : {},
        testHistory: Array.isArray(saved.testHistory) ? saved.testHistory : []
      };
    } catch (error) {
      return createEmptyProgress();
    }
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      // Progress is helpful, but the quiz should still work if storage is blocked.
    }
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
    if (state.mode !== "test" || state.run.length !== TOTAL_GENERAL + TOTAL_STATE) return;

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
    const stats = Object.values(progress.questionStats);
    const answered = stats.reduce((total, item) => total + item.answered, 0);
    const correct = stats.reduce((total, item) => total + item.correct, 0);
    const tests = progress.testHistory.length;
    const passedTests = progress.testHistory.filter((test) => test.passed).length;
    const weakQuestionIds = getWeakQuestionIds();
    const bookmarkedQuestionIds = getBookmarkedQuestionIds();

    answeredStat.textContent = String(answered);
    accuracyStat.textContent = answered ? `${Math.round((correct / answered) * 100)}%` : "0%";
    testsStat.textContent = String(tests);
    passRateStat.textContent = tests ? `${Math.round((passedTests / tests) * 100)}%` : "0%";
    weakStat.textContent = String(weakQuestionIds.length);
    bookmarkStat.textContent = String(bookmarkedQuestionIds.length);
    weakReviewButton.disabled = weakQuestionIds.length === 0;
    weakReviewButton.textContent = weakQuestionIds.length
      ? `Review ${weakQuestionIds.length} weak ${weakQuestionIds.length === 1 ? "question" : "questions"}`
      : "No weak questions yet";
    bookmarkReviewButton.disabled = bookmarkedQuestionIds.length === 0;
    bookmarkReviewButton.textContent = bookmarkedQuestionIds.length
      ? `Review ${bookmarkedQuestionIds.length} bookmarked ${bookmarkedQuestionIds.length === 1 ? "question" : "questions"}`
      : "No bookmarks yet";
    resetProgressButton.disabled = answered === 0 && tests === 0 && weakQuestionIds.length === 0 && bookmarkedQuestionIds.length === 0;
  }

  function show(screen) {
    startScreen.classList.toggle("is-hidden", screen !== "start");
    quizScreen.classList.toggle("is-hidden", screen !== "quiz");
    resultScreen.classList.toggle("is-hidden", screen !== "result");
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function sampleByCategory(category, count) {
    return shuffle(questions.filter((question) => question.category === category)).slice(0, count);
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

    return orderStudyQuestionsByProgress(filteredQuestions);
  }

  function orderStudyQuestionsByProgress(studyQuestions) {
    const fresh = [];
    const studied = [];

    studyQuestions.forEach((question) => {
      if (hasSavedAnswer(question)) {
        studied.push(question);
      } else {
        fresh.push(question);
      }
    });

    return [...fresh, ...studied];
  }

  function hasSavedAnswer(question) {
    return (progress.questionStats[String(question.id)]?.answered || 0) > 0;
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
    return window.confirm(
      "Leave the current run? Answers you already selected are saved, but unanswered questions in this run will be skipped."
    );
  }

  function goHome() {
    if (!confirmDiscardActiveRun()) return;

    stopTimer();
    show("start");
  }

  function startRun() {
    if (!confirmDiscardActiveRun()) return;

    const general = sampleByCategory("general", TOTAL_GENERAL);
    const stateQuestions = sampleByCategory("state", TOTAL_STATE);
    state.mode = "test";
    state.run = shuffle([...general, ...stateQuestions]);
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

  function startWeakReview() {
    if (!confirmDiscardActiveRun()) return;

    const weakQuestions = getWeakQuestionIds()
      .map((questionId) => questions.find((item) => String(item.id) === questionId))
      .filter(Boolean);
    if (!weakQuestions.length) return;

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
    if (!bookmarkedQuestions.length) return;

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
    state.timeRemaining = state.mode === "test" ? EXAM_DURATION_SECONDS : 0;
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
    if (state.mode !== "test" || !state.startedAt) {
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
    const isTimedTest = state.mode === "test";
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

  function toggleTranslations() {
    state.translationsEnabled = !state.translationsEnabled;
    translationToggle.setAttribute("aria-pressed", String(state.translationsEnabled));
    translationToggle.title = state.translationsEnabled ? "Hide English translations" : "Show English translations";
    renderTranslations();
  }

  function renderBookmarkToggle(question) {
    const bookmarked = isBookmarked(question);
    bookmarkToggle.setAttribute("aria-pressed", String(bookmarked));
    bookmarkToggle.textContent = bookmarked ? "Bookmarked" : "Bookmark";
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
    scoreCounter.textContent = `${state.score} correct`;
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
    renderBookmarkToggle(question);
    renderImages(question);
    renderAnswers(question);
    renderTranslations();
  }

  function renderModeChrome(question, progress, total) {
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
        button.disabled = true;
        if (index === answeredEntry.correctIndex) button.classList.add("is-correct");
        if (index === answeredEntry.selectedIndex && !answeredEntry.isCorrect) button.classList.add("is-wrong");
      }
      answers.append(button);
    });
  }

  function getCurrentAnswerEntry(question = state.run[state.index]) {
    if (!question) return null;
    return state.answers.find((entry) => entry.question.id === question.id) || null;
  }

  function renderTranslations() {
    const question = state.run[state.index];
    if (!question) return;

    if (!state.translationsEnabled) {
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
    const correctIndex = question.options.findIndex((option) => option.correct);
    const isCorrect = selectedIndex === correctIndex;
    const answerEntry = {
      question,
      selectedIndex,
      correctIndex,
      isCorrect
    };
    state.selected = selectedIndex;
    state.score += isCorrect ? 1 : 0;
    state.answers.push(answerEntry);
    recordAnswer(answerEntry);

    [...answers.children].forEach((button, index) => {
      button.disabled = true;
      if (index === correctIndex) button.classList.add("is-correct");
      if (index === selectedIndex && !isCorrect) button.classList.add("is-wrong");
    });

    if (state.mode !== "study") {
      scoreCounter.textContent = `${state.score} correct`;
    }
    progressBar.style.width = `${((state.index + 1) / state.run.length) * 100}%`;
    questionHint.textContent = isCorrect ? "Correct answer." : "Wrong answer.";
    if (question.explanation) {
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

    if (state.mode === "test") {
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

      const answerEntry = {
        question,
        selectedIndex: null,
        correctIndex: question.options.findIndex((option) => option.correct),
        isCorrect: false,
        isUnanswered: true
      };
      state.answers.push(answerEntry);
      recordAnswer(answerEntry, { countStats: false, trackWeak: false });
    });
  }

  function renderResult() {
    if (state.mode !== "test") {
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
            ? "Bookmarked practice is untimed and stays separate from mock-test history."
          : "Practice mode is untimed and separate from mock-test history."
      ));
      resultTime.textContent = "";
      renderReview();
      return;
    }

    const passed = state.score >= PASS_THRESHOLD;
    resultTitle.textContent = passed ? "Passed" : "Not passed";
    resultScore.textContent = `${state.score} / ${state.run.length}`;
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
  renderProgressSummary();

  if (!questions.length) {
    startButton.disabled = true;
    practiceButton.disabled = true;
    weakReviewButton.disabled = true;
    startButton.textContent = "Question data missing";
  }
})();
