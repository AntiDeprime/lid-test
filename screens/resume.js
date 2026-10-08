import { clearExamSession, loadExamSession } from "../modules/exam-session.js";
import { confirmDialog } from "../modules/confirm-dialog.js";
import { formatDuration } from "../modules/format.js";

// The "Resume your exam" card on the start page. It owns the saved exam that
// could be resumed; the quiz screen does the actual resuming.
export function createResumeCard(ctx) {
  const { questions } = ctx;
  const $ = (id) => document.getElementById(id);
  const startScreen = $("start-screen");
  const resumeCard = $("resume-card");
  const resumeTitle = $("resume-title");
  const resumeDetail = $("resume-detail");
  const resumeButton = $("resume-button");
  const resumeDiscardButton = $("resume-discard-button");
  let resumable = null;

  function render() {
    resumeCard.classList.toggle("is-hidden", !resumable);
    if (!resumable) return;

    const answered = resumable.answers.length;
    const total = resumable.run.length;
    if (resumable.expired) {
      resumeTitle.textContent = "Your exam ran out of time";
      resumeDetail.textContent = `${answered} of ${total} answered. See the result, or discard it.`;
      resumeButton.textContent = "See result";
    } else {
      resumeTitle.textContent = "Resume your exam";
      resumeDetail.textContent = `${answered} of ${total} answered · ${formatDuration(resumable.timeRemaining)} left`;
      resumeButton.textContent = "Resume exam";
    }
  }

  function refresh() {
    resumable = loadExamSession(questions);
    render();
  }

  // Forget the card without touching the saved exam (it was just resumed or replaced).
  function release() {
    resumable = null;
    render();
  }

  async function discard() {
    const confirmed = await confirmDialog({
      title: "Discard your exam?",
      message: "Your answers so far will be lost and no result will be saved.",
      confirmLabel: "Discard exam",
      cancelLabel: "Keep exam",
      trigger: resumeDiscardButton
    });
    if (!confirmed) return;

    clearExamSession();
    release();
  }

  resumeButton.addEventListener("click", () => ctx.actions.resumeExam());
  resumeDiscardButton.addEventListener("click", discard);
  ctx.events.on("screen-shown", (screen) => {
    if (screen === "start") refresh();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !startScreen.classList.contains("is-hidden")) refresh();
  });

  return { refresh, release, hasPending: () => Boolean(resumable) };
}
