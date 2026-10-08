import { formatAnswer, formatDuration } from "../modules/format.js";
import { EXAM_DURATION_SECONDS, PASS_THRESHOLD, WEAK_CLEAR_STREAK, getPassResult } from "../modules/quiz-rules.js";

// The result screen after an exam simulation or a practice run, with the
// list of missed questions.
export function createResultScreen(ctx) {
  const { state } = ctx;
  const $ = (id) => document.getElementById(id);
  const resultScreen = $("result-screen");
  const resultTitle = $("result-title");
  const resultScore = $("result-score");
  const resultStatus = $("result-status");
  const resultTime = $("result-time");
  const resultContext = $("result-context");
  const reviewHeading = $("review-heading");
  const reviewList = $("review-list");
  const newTestButton = $("new-test-button");
  const resultHomeButton = $("result-home-button");

  function render() {
    if (state.mode !== "exam") {
      resultScreen.dataset.result = "practice";
      resultTitle.textContent = state.mode === "due-review"
        ? "Review complete"
        : state.mode === "weak-review"
          ? "Weak review complete"
          : state.mode === "bookmarks"
            ? "Bookmark review complete"
            : "Practice complete";
      resultScore.textContent = `${state.score} / ${state.run.length}`;
      resultStatus.className = "result-status";
      resultStatus.replaceChildren(createReviewText(
        state.mode === "due-review"
          ? "Questions you got right come back after a longer wait; a miss brings the question back tomorrow."
          : state.mode === "weak-review"
            ? `Weak questions clear after ${WEAK_CLEAR_STREAK} correct answers in a row.`
            : state.mode === "bookmarks"
              ? "Bookmarked practice is untimed and stays separate from exam-simulation history."
              : "Practice mode is untimed and separate from exam-simulation history."
      ));
      resultTime.textContent = "";
      resultContext.textContent = "";
      renderReview();
      return;
    }

    const passed = getPassResult(state.score);
    resultScreen.dataset.result = passed ? "pass" : "fail";
    resultTitle.textContent = passed ? "Passed" : "Not passed";
    resultScore.textContent = `${state.score} / ${state.run.length}`;
    resultContext.textContent = `Bundesland: ${state.selectedState || ctx.actions.getSelectedState()}. 30 general questions, 3 residence-based Bundesland questions, 60-minute limit.`;
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
    if (missed.length && !ctx.content.explanationsLoaded()) {
      // Explanations load in the background; fill them in once they arrive.
      ctx.content.ensureExplanations().then(() => {
        if (!resultScreen.classList.contains("is-hidden")) renderReview();
      }, () => {
        // The review is still useful without the explanations.
      });
    }
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
      practiceButton.addEventListener("click", () => ctx.actions.startPracticeQuestion(entry.question.id));
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

  newTestButton.addEventListener("click", () => ctx.actions.startRun());
  resultHomeButton.addEventListener("click", () => ctx.actions.goHome());

  return { render };
}
