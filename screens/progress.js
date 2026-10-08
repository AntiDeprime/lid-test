import { MAX_BACKUP_BYTES, createBackup, describeProgress, getBackupFilename, parseBackup } from "../modules/backup.js";
import { confirmDialog } from "../modules/confirm-dialog.js";
import { formatHistoryDate } from "../modules/format.js";
import { summarizeProgress } from "../modules/progress.js";
import { getAreaStats, getBookmarkedQuestionIds, getWeakQuestionIds } from "../modules/progress-queries.js";

// The progress tab on the start page: statistics, area performance, recent
// exam results, the weak and bookmarked review queues, and backup and reset.
export function createProgressPanel(ctx) {
  const { questions, progress } = ctx;
  const $ = (id) => document.getElementById(id);
  const weakReviewButton = $("weak-review-button");
  const bookmarkReviewButton = $("bookmark-review-button");
  const queueActions = $("queue-actions");
  const progressEmpty = $("progress-empty");
  const progressSummary = $("progress-summary");
  const progressInsights = $("progress-insights");
  const answeredStat = $("answered-stat");
  const accuracyStat = $("accuracy-stat");
  const testsStat = $("tests-stat");
  const passRateStat = $("pass-rate-stat");
  const masteryStat = $("mastery-stat");
  const weakStat = $("weak-stat");
  const bookmarkStat = $("bookmark-stat");
  const areaStats = $("area-stats");
  const recentTests = $("recent-tests");
  const resetProgressButton = $("reset-progress-button");
  const exportProgressButton = $("export-progress-button");
  const importProgressButton = $("import-progress-button");
  const importProgressInput = $("import-progress-input");
  const backupStatus = $("backup-status");

  function render() {
    const summary = summarizeProgress(progress, questions.length);
    const weakQuestionIds = getWeakQuestionIds(progress, questions);
    const bookmarkedQuestionIds = getBookmarkedQuestionIds(progress, questions);

    answeredStat.textContent = String(summary.uniqueStudied);
    accuracyStat.textContent = `${summary.studyAccuracy}%`;
    masteryStat.textContent = `${summary.mastery}%`;
    testsStat.textContent = String(summary.tests);
    passRateStat.textContent = `${summary.passRate}%`;
    weakStat.textContent = String(weakQuestionIds.length);
    bookmarkStat.textContent = String(bookmarkedQuestionIds.length);
    weakReviewButton.classList.toggle("is-hidden", weakQuestionIds.length === 0);
    weakReviewButton.textContent = `Review ${weakQuestionIds.length} weak ${weakQuestionIds.length === 1 ? "question" : "questions"}`;
    bookmarkReviewButton.classList.toggle("is-hidden", bookmarkedQuestionIds.length === 0);
    bookmarkReviewButton.textContent = `Review ${bookmarkedQuestionIds.length} bookmarked ${bookmarkedQuestionIds.length === 1 ? "question" : "questions"}`;
    queueActions.classList.toggle("is-hidden", weakQuestionIds.length === 0 && bookmarkedQuestionIds.length === 0);

    const hasProgress = summary.repeatedAnswers > 0 || summary.tests > 0 || weakQuestionIds.length > 0 || bookmarkedQuestionIds.length > 0;
    exportProgressButton.disabled = !hasProgress;
    progressEmpty.classList.toggle("is-hidden", hasProgress);
    progressSummary.classList.toggle("is-hidden", !hasProgress);
    progressInsights.classList.toggle("is-hidden", !hasProgress);
    resetProgressButton.classList.toggle("is-hidden", !hasProgress);
    renderAreaStats();
    renderRecentTests();
  }

  function renderAreaStats() {
    const areas = getAreaStats(progress, questions);
    areaStats.replaceChildren();

    if (!areas.length) {
      areaStats.append(createEmptyNote("Answer questions to see your strongest and weakest areas."));
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

  function renderRecentTests() {
    recentTests.replaceChildren();

    if (!progress.testHistory.length) {
      recentTests.append(createEmptyNote("Complete an exam simulation to see recent results here."));
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

  function createEmptyNote(text) {
    const note = document.createElement("p");
    note.className = "progress-empty";
    note.textContent = text;
    return note;
  }

  function setBackupStatus(message, isError = false) {
    backupStatus.textContent = message;
    backupStatus.classList.toggle("is-error", isError);
  }

  async function resetProgress() {
    const confirmed = await confirmDialog({
      title: "Reset saved progress?",
      message: "This clears your answers, weak questions, bookmarks, and exam history in this browser. It cannot be undone, so export a backup first if you want a copy.",
      confirmLabel: "Reset progress",
      cancelLabel: "Keep progress",
      trigger: resetProgressButton
    });
    if (!confirmed) return;

    progress.questionStats = {};
    progress.weakQuestions = {};
    progress.bookmarkedQuestions = {};
    progress.testHistory = [];
    ctx.commitProgress();
    setBackupStatus("");
  }

  function exportProgress() {
    const filename = getBackupFilename(new Date());
    const blob = new Blob([JSON.stringify(createBackup(progress), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupStatus(`Backup saved as ${filename}.`);
  }

  async function importProgress() {
    const file = importProgressInput.files && importProgressInput.files[0];
    importProgressInput.value = "";
    if (!file) return;

    if (file.size > MAX_BACKUP_BYTES) {
      setBackupStatus("That file is too large to be a LiD Test Prep backup.", true);
      return;
    }

    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setBackupStatus(parsed.message, true);
      return;
    }

    const incoming = describeProgress(parsed.progress);
    const current = describeProgress(progress);
    if (current.hasProgress) {
      const confirmed = await confirmDialog({
        title: "Replace your progress?",
        message: `This backup has ${incoming.text}. It replaces the ${current.text} saved in this browser.`,
        confirmLabel: "Replace progress",
        cancelLabel: "Keep current progress",
        trigger: importProgressButton
      });
      if (!confirmed) {
        setBackupStatus("Import cancelled. Your current progress is unchanged.");
        return;
      }
    }

    progress.questionStats = parsed.progress.questionStats;
    progress.weakQuestions = parsed.progress.weakQuestions;
    progress.bookmarkedQuestions = parsed.progress.bookmarkedQuestions;
    progress.testHistory = parsed.progress.testHistory;
    ctx.commitProgress();
    setBackupStatus(`Backup imported: ${incoming.text}.`);
  }

  resetProgressButton.addEventListener("click", resetProgress);
  exportProgressButton.addEventListener("click", exportProgress);
  importProgressButton.addEventListener("click", () => importProgressInput.click());
  importProgressInput.addEventListener("change", importProgress);
  ctx.events.on("progress-changed", render);

  return { render };
}
