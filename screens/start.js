import { createTabController } from "../modules/tabs.js";

// The start page: Bundesland and study-set pickers, the launch buttons, the
// review queues, and the Progress / Catalogue / Learn tabs.
export function createStartScreen(ctx) {
  const { questions, stateNames } = ctx;
  const $ = (id) => document.getElementById(id);
  const bundeslandSelect = $("bundesland-select");
  const studyFilter = $("study-filter");
  const startButton = $("start-button");
  const practiceButton = $("practice-button");
  const weakReviewButton = $("weak-review-button");
  const bookmarkReviewButton = $("bookmark-review-button");
  const startTabs = [...document.querySelectorAll("[data-start-tab]")];
  const startSections = {
    progress: $("progress-title").closest(".start-detail"),
    catalogue: $("catalogue-title").closest(".start-detail"),
    learn: $("included-title").closest(".start-detail")
  };
  const faqSection = $("faq-title").closest(".faq-section");
  const tabs = createTabController(startTabs, startSections, {
    onChange(selectedTab) {
      faqSection.classList.toggle("is-hidden", selectedTab !== "learn");
      faqSection.hidden = selectedTab !== "learn";
    }
  });

  function populateStateControls() {
    stateNames.forEach((stateName) => {
      const testOption = document.createElement("option");
      const studyOption = document.createElement("option");

      testOption.value = stateName;
      testOption.textContent = stateName;
      studyOption.value = `state:${stateName}`;
      studyOption.textContent = `${stateName} Bundesland questions`;

      bundeslandSelect.append(testOption);
      studyFilter.append(studyOption);
    });

    if (stateNames.includes("Berlin")) {
      bundeslandSelect.value = "Berlin";
    }
  }

  populateStateControls();
  tabs.selectTab("progress");
  startButton.addEventListener("click", () => ctx.actions.startRun());
  practiceButton.addEventListener("click", () => ctx.actions.startPracticeRun());
  weakReviewButton.addEventListener("click", () => ctx.actions.startWeakReview());
  bookmarkReviewButton.addEventListener("click", () => ctx.actions.startBookmarkReview());

  if (!questions.length) {
    startButton.disabled = true;
    practiceButton.disabled = true;
    weakReviewButton.disabled = true;
    startButton.textContent = "Question data missing";
  }

  return {
    selectTab: (name) => tabs.selectTab(name),
    getSelectedState: () => bundeslandSelect.value,
    getStudyFilter: () => studyFilter.value,
    setSelectedState(name) {
      if (name) bundeslandSelect.value = name;
    }
  };
}
