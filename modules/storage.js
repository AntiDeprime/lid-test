export const STORAGE_KEY = "lidTestPrepProgress";
export const STORAGE_VERSION = 1;

export function createEmptyProgress() {
  return {
    version: STORAGE_VERSION,
    questionStats: {},
    weakQuestions: {},
    bookmarkedQuestions: {},
    testHistory: []
  };
}

export function loadProgress(storage = window.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
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

export function saveProgress(progress, storage = window.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    // Progress is helpful, but the quiz should still work if storage is blocked.
  }
}
