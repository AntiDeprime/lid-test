import { STORAGE_VERSION, migrateProgress, normalizeProgress } from "./storage.js";

export const BACKUP_FORMAT = "lid-test-prep-progress";
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

export function createBackup(progress, exportedAt = new Date()) {
  return {
    format: BACKUP_FORMAT,
    exportedAt: exportedAt.toISOString(),
    progress: { ...progress, version: STORAGE_VERSION }
  };
}

export function getBackupFilename(date = new Date()) {
  return `lid-test-prep-progress-${date.toISOString().slice(0, 10)}.json`;
}

// Reads backup text into progress the app can use, or says why it cannot.
export function parseBackup(text) {
  let data = null;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { ok: false, reason: "invalid", message: "That file is not a LiD Test Prep backup." };
  }

  if (!data || data.format !== BACKUP_FORMAT || !data.progress) {
    return { ok: false, reason: "invalid", message: "That file is not a LiD Test Prep backup." };
  }

  const migrated = migrateProgress(data.progress);
  if (!migrated) {
    return {
      ok: false,
      reason: "version",
      message: "This backup was made by a different version of the app and cannot be read."
    };
  }

  return { ok: true, progress: normalizeProgress(migrated) };
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

export function describeProgress(progress) {
  const studied = Object.values(progress.questionStats).filter((stat) => stat.answered > 0).length;
  const exams = progress.testHistory.length;
  const weak = Object.keys(progress.weakQuestions).length;
  const bookmarks = Object.keys(progress.bookmarkedQuestions).length;
  const parts = [
    studied ? plural(studied, "studied question", "studied questions") : "",
    exams ? plural(exams, "exam simulation", "exam simulations") : "",
    weak ? plural(weak, "weak question", "weak questions") : "",
    bookmarks ? plural(bookmarks, "bookmark", "bookmarks") : ""
  ].filter(Boolean);

  return {
    hasProgress: parts.length > 0,
    text: parts.length ? parts.join(", ") : "no progress"
  };
}
