import { DEFAULT_LANGUAGE, detectLanguage, isSupportedLanguage } from "./languages.js";

// Small settings that are not study progress, so they stay out of the
// versioned progress record and out of backups.
export const LANGUAGE_KEY = "lidTranslationLanguage";

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// The saved translation language, else the first supported browser language.
export function loadLanguagePreference({ storage = getStorage(), browserLanguages = [] } = {}) {
  try {
    const saved = storage?.getItem(LANGUAGE_KEY);
    if (isSupportedLanguage(saved)) return saved;
  } catch {
    // Storage can be blocked; fall through to the detected language.
  }
  return browserLanguages.length ? detectLanguage(browserLanguages) : DEFAULT_LANGUAGE;
}

export function saveLanguagePreference(code, storage = getStorage()) {
  if (!isSupportedLanguage(code)) return false;
  try {
    storage?.setItem(LANGUAGE_KEY, code);
    return Boolean(storage);
  } catch {
    return false;
  }
}
