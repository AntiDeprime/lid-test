import assert from "node:assert/strict";
import { summarizeProgress } from "../modules/progress.js";
import {
  getCatalogueQuestions,
  getCatalogueSummary,
  normalizeSearch,
  searchCatalogueQuestions
} from "../modules/catalogue.js";
import {
  PASS_THRESHOLD,
  TOTAL_GENERAL,
  TOTAL_STATE,
  createAnswerEntry,
  createExamRun,
  createUnansweredEntry,
  getPassResult
} from "../modules/quiz-rules.js";

const progress = {
  questionStats: {
    recovered: { answered: 3, correct: 2, wrong: 1 },
    repeatedEasy: { answered: 4, correct: 4, wrong: 0 },
    weak: { answered: 4, correct: 1, wrong: 3 }
  },
  testHistory: [
    { passed: true },
    { passed: false }
  ]
};

const summary = summarizeProgress(progress, 4);

assert.equal(summary.uniqueStudied, 3);
assert.equal(summary.studyAccuracy, 64);
assert.equal(summary.mastery, 50);
assert.equal(summary.tests, 2);
assert.equal(summary.passRate, 50);

assert.equal(getPassResult(PASS_THRESHOLD - 1), false);
assert.equal(getPassResult(PASS_THRESHOLD), true);

const question = {
  id: 1,
  options: [
    { text: "A", correct: false },
    { text: "B", correct: true },
    { text: "C", correct: false },
    { text: "D", correct: false }
  ]
};

assert.deepEqual(createAnswerEntry(question, 1), {
  question,
  selectedIndex: 1,
  correctIndex: 1,
  isCorrect: true
});
assert.deepEqual(createUnansweredEntry(question), {
  question,
  selectedIndex: null,
  correctIndex: 1,
  isCorrect: false,
  isUnanswered: true
});

const generalQuestions = Array.from({ length: TOTAL_GENERAL + 2 }, (_, index) => ({
  id: index + 1,
  category: "general"
}));
const stateQuestions = Array.from({ length: TOTAL_STATE + 2 }, (_, index) => ({
  id: 100 + index,
  category: "state",
  state: index < TOTAL_STATE ? "Berlin" : "Bayern"
}));

const run = createExamRun([...generalQuestions, ...stateQuestions], "Berlin", {
  sampleByCategory(items, category, count, selectedState = null) {
    return items.filter((item) => {
      if (item.category !== category) return false;
      return !selectedState || item.state === selectedState;
    }).slice(0, count);
  },
  shuffle(items) {
    return items.slice().reverse();
  }
});

assert.equal(run.length, TOTAL_GENERAL + TOTAL_STATE);
assert.equal(run.filter((item) => item.category === "general").length, TOTAL_GENERAL);
assert.equal(run.filter((item) => item.category === "state" && item.state === "Berlin").length, TOTAL_STATE);

const catalogueQuestions = [
  {
    id: 1,
    sourceNumber: 10,
    category: "general",
    prompt: "Was schützt das Grundgesetz?",
    options: [{ text: "Die Grundrechte" }]
  },
  {
    id: 2,
    sourceNumber: 301,
    category: "state",
    state: "Berlin",
    prompt: "Welches Wappen gehört zu Berlin?",
    options: [{ text: "Der Bär" }]
  }
];
const catalogueTranslations = {
  2: {
    prompt: "Which coat of arms belongs to Berlin?",
    options: ["The bear"]
  }
};

assert.equal(normalizeSearch("  GRUNDGESETZ  "), "grundgesetz");
assert.equal(getCatalogueSummary(460, 24, ""), "460 questions in this view. Showing 24 of 460.");
assert.equal(getCatalogueSummary(1, 1, "berlin"), "1 question match your search.");
assert.equal(getCatalogueQuestions(catalogueQuestions, "state").length, 1);
assert.equal(getCatalogueQuestions(catalogueQuestions, "bookmarked", { bookmarkedIds: new Set(["2"]) })[0].id, 2);
assert.equal(searchCatalogueQuestions(catalogueQuestions, "coat of arms", catalogueTranslations)[0].id, 2);

console.log("Progress and quiz-rule validation passed.");
