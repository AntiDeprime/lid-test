import { getLanguage } from "./languages.js";

// Question data that is not needed to draw the first screen is loaded on
// demand. Every file listed here must also be in ASSETS in service-worker.js,
// with exactly this URL, so lazy loading keeps working offline.
export const EXPLANATION_TEXT_FILES = [
  "explanation-texts-001-115.js?v=catalogue",
  "explanation-texts-116-230.js?v=catalogue",
  "explanation-texts-231-345.js?v=catalogue",
  "explanation-texts-346-460.js?v=catalogue"
];
// Runs after the text files and attaches question.explanation to every question.
export const EXPLANATION_ATTACH_FILE = "explanations.js?v=catalogue";

export function loadScript(src, doc = document) {
  return new Promise((resolve, reject) => {
    const script = doc.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      script.remove();
      reject(new Error(`Could not load ${src}`));
    });
    doc.head.append(script);
  });
}

// `load` and `globals` are injectable so the loader can be tested without a browser.
export function createContent({ load = loadScript, globals = window } = {}) {
  let explanationsPromise = null;
  let explanationsReady = false;
  const translationPromises = new Map();

  function ensureExplanations() {
    if (!explanationsPromise) {
      explanationsPromise = Promise.all(EXPLANATION_TEXT_FILES.map((file) => load(file)))
        .then(() => load(EXPLANATION_ATTACH_FILE))
        .then(() => {
          explanationsReady = true;
        })
        .catch((error) => {
          // Forget the failure so the next request tries again.
          explanationsPromise = null;
          throw error;
        });
    }
    return explanationsPromise;
  }

  function ensureTranslations(code) {
    const language = getLanguage(code);
    if (!translationPromises.has(language.code)) {
      translationPromises.set(language.code, load(language.file)
        .then(() => {
          if (!globals[language.global]) throw new Error(`${language.file} did not define ${language.global}`);
        })
        .catch((error) => {
          translationPromises.delete(language.code);
          throw error;
        }));
    }
    return translationPromises.get(language.code);
  }

  return {
    explanationsLoaded: () => explanationsReady,
    ensureExplanations,
    ensureTranslations,
    // The translations of a language that has already loaded, else null.
    translationsFor(code) {
      return globals[getLanguage(code).global] || null;
    }
  };
}
