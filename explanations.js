window.LID_EXPLANATION_HELPERS = (() => {
  "use strict";

  function buildExplanation(question) {
    return window.LID_SPECIFIC_EXPLANATIONS?.[question.id] || "";
  }

  function attachExplanations(questions) {
    questions.forEach((question) => {
      question.explanation = buildExplanation(question);
    });
  }

  return { attachExplanations, buildExplanation };
})();

window.LID_EXPLANATION_HELPERS.attachExplanations(window.LID_QUESTIONS || []);
