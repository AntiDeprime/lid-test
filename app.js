import { loadProgress, saveProgress as persistProgress } from "./modules/storage.js";
import { getStateNames } from "./modules/sampling.js";
import { createEmitter } from "./modules/emitter.js";
import { createContent } from "./modules/content.js";
import { loadLanguagePreference } from "./modules/preferences.js";
import { EXAM_DURATION_SECONDS } from "./modules/quiz-rules.js";
import { createCatalogueScreen } from "./screens/catalogue.js";
import { createPrivacyControls } from "./screens/privacy.js";
import { createProgressPanel } from "./screens/progress.js";
import { createQuizScreen } from "./screens/quiz.js";
import { createResultScreen } from "./screens/result.js";
import { createResumeCard } from "./screens/resume.js";
import { createStartScreen } from "./screens/start.js";

// Wires the screens together. Each screen lives in screens/ and gets this
// shared context; screens reach each other only through `events` and `actions`.
(() => {
  "use strict";

  const questions = window.LID_QUESTIONS || [];
  const content = createContent();
  const progress = loadProgress();
  const state = {
    mode: "exam",
    run: [],
    index: 0,
    selected: null,
    score: 0,
    answers: [],
    translationsEnabled: false,
    translationLanguage: loadLanguagePreference({ browserLanguages: navigator.languages || [] }),
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
    // Explanations and translations load on demand (see modules/content.js).
    content,
    stateNames: getStateNames(questions),
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
  createQuizScreen(ctx, { start, resume, resultView });
  ctx.actions.getSelectedState = start.getSelectedState;
  createPrivacyControls();
  registerServiceWorker();
  events.emit("progress-changed");
  resume.refresh();
  prefetchExplanations();

  // Explanations are only needed after an answer, so fetch them once the
  // first screen is idle instead of blocking it.
  function prefetchExplanations() {
    const prefetch = () => content.ensureExplanations().catch(() => {
      // They are requested again when the first answer needs them.
    });
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(prefetch, { timeout: 4000 });
    } else {
      window.setTimeout(prefetch, 1500);
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // Offline support is optional during local checks.
    });
  }
})();
