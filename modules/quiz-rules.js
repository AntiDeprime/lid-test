export const TOTAL_GENERAL = 30;
export const TOTAL_STATE = 3;
export const PASS_THRESHOLD = 17;
export const EXAM_DURATION_SECONDS = 60 * 60;

export function createExamRun(questions, selectedState, helpers) {
  const { sampleByCategory, shuffle } = helpers;
  const general = sampleByCategory(questions, "general", TOTAL_GENERAL);
  const stateQuestions = sampleByCategory(questions, "state", TOTAL_STATE, selectedState);

  if (general.length < TOTAL_GENERAL || stateQuestions.length < TOTAL_STATE) {
    return [];
  }

  return shuffle([...general, ...stateQuestions]);
}

export function createAnswerEntry(question, selectedIndex) {
  const correctIndex = question.options.findIndex((option) => option.correct);
  return {
    question,
    selectedIndex,
    correctIndex,
    isCorrect: selectedIndex === correctIndex
  };
}

export function createUnansweredEntry(question) {
  return {
    question,
    selectedIndex: null,
    correctIndex: question.options.findIndex((option) => option.correct),
    isCorrect: false,
    isUnanswered: true
  };
}

export function getPassResult(score) {
  return score >= PASS_THRESHOLD;
}
