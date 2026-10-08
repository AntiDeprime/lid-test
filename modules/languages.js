// The languages a question can be translated into. German is always the
// official text and is never listed here.
//
// `script` is the writing system translations must use; validate-data.js uses
// it to catch German left untranslated.
//
// To add a language: write translations-<code>.js (see docs/data-provenance.md),
// add an entry below, add the file to ASSETS in service-worker.js, and run
// `node scripts/update-asset-hash.js`. scripts/validate-data.js and
// scripts/validate-pwa.js check every entry.
export const DEFAULT_LANGUAGE = "en";

export const LANGUAGES = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    script: "Latin",
    file: "translations-en.js?v=catalogue",
    global: "LID_TRANSLATIONS_EN"
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    script: "Cyrillic",
    file: "translations-ru.js?v=catalogue",
    global: "LID_TRANSLATIONS_RU"
  }
];

export function isSupportedLanguage(code) {
  return LANGUAGES.some((language) => language.code === code);
}

export function getLanguage(code) {
  return LANGUAGES.find((language) => language.code === code)
    || LANGUAGES.find((language) => language.code === DEFAULT_LANGUAGE);
}

// The first browser language we have a translation for, e.g. ["ru-RU", "en"]
// -> "ru". Falls back to the default language.
export function detectLanguage(preferred = []) {
  for (const tag of preferred) {
    const code = String(tag || "").toLowerCase().split("-")[0];
    if (isSupportedLanguage(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}
