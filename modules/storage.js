export const STORAGE_KEY = "lidTestPrepProgress";
export const STORAGE_VERSION = 1;
export const UNREADABLE_PROGRESS_KEY = `${STORAGE_KEY}.unreadable`;

export function createEmptyProgress() {
  return {
    version: STORAGE_VERSION,
    questionStats: {},
    weakQuestions: {},
    bookmarkedQuestions: {},
    testHistory: []
  };
}

function getDefaultStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

// Each entry upgrades saved progress from that version to the next one, so a
// storage version bump keeps learners' data instead of resetting it.
const MIGRATIONS = {};
const MAX_TEST_HISTORY = 500;
const QUESTION_ID_PATTERN = /^[0-9]{1,6}$/;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toCount(value) {
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function toText(value) {
  return typeof value === "string" ? value : "";
}

function normalizeEntries(value, normalizeEntry) {
  const result = {};
  if (!isPlainObject(value)) return result;

  Object.entries(value).forEach(([questionId, entry]) => {
    if (!QUESTION_ID_PATTERN.test(questionId) || !isPlainObject(entry)) return;
    result[questionId] = normalizeEntry(entry);
  });
  return result;
}

function normalizeTestHistory(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((test) => isPlainObject(test) && typeof test.passed === "boolean" && Number.isFinite(test.correct) && Number.isFinite(test.total))
    .slice(-MAX_TEST_HISTORY)
    .map((test) => ({
      completedAt: toText(test.completedAt),
      correct: toCount(test.correct),
      total: toCount(test.total),
      passed: test.passed,
      questionIds: Array.isArray(test.questionIds) ? test.questionIds.filter(Number.isFinite) : [],
      wrongQuestionIds: Array.isArray(test.wrongQuestionIds) ? test.wrongQuestionIds.filter(Number.isFinite) : []
    }));
}

// Brings saved progress up to the current version, or returns null when it
// cannot be read (not an object, newer than this app, or no migration path).
export function migrateProgress(saved, { migrations = MIGRATIONS, targetVersion = STORAGE_VERSION } = {}) {
  if (!isPlainObject(saved) || !Number.isInteger(saved.version)) return null;

  let current = saved;
  while (current.version < targetVersion) {
    const migrate = migrations[current.version];
    if (typeof migrate !== "function") return null;
    const next = migrate(current);
    if (!isPlainObject(next)) return null;
    current = { ...next, version: current.version + 1 };
  }

  return current.version === targetVersion ? current : null;
}

export function normalizeProgress(saved) {
  return {
    version: STORAGE_VERSION,
    questionStats: normalizeEntries(saved.questionStats, (entry) => ({
      answered: toCount(entry.answered),
      correct: toCount(entry.correct),
      wrong: toCount(entry.wrong)
    })),
    weakQuestions: normalizeEntries(saved.weakQuestions, (entry) => ({
      wrong: toCount(entry.wrong),
      correctStreak: toCount(entry.correctStreak),
      lastMissedAt: toText(entry.lastMissedAt)
    })),
    bookmarkedQuestions: normalizeEntries(saved.bookmarkedQuestions, (entry) => ({
      addedAt: toText(entry.addedAt)
    })),
    testHistory: normalizeTestHistory(saved.testHistory)
  };
}

export function loadProgress(storage = getDefaultStorage()) {
  try {
    if (!storage) return createEmptyProgress();
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProgress();

    let saved = null;
    try {
      saved = JSON.parse(raw);
    } catch (error) {
      saved = null;
    }

    const migrated = migrateProgress(saved);
    if (migrated) return normalizeProgress(migrated);

    // Keep what could not be read so a version change never silently erases it.
    setStorageItem(UNREADABLE_PROGRESS_KEY, raw, storage);
    return createEmptyProgress();
  } catch (error) {
    return createEmptyProgress();
  }
}

export function saveProgress(progress, storage = getDefaultStorage()) {
  try {
    if (!storage) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    // Progress is helpful, but the quiz should still work if storage is blocked.
  }
}

export function getStorageItem(key, storage = getDefaultStorage()) {
  try {
    if (!storage) return null;
    return storage.getItem(key);
  } catch (error) {
    return null;
  }
}

export function setStorageItem(key, value, storage = getDefaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

export function removeStorageItem(key, storage = getDefaultStorage()) {
  try {
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}
