export function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getStateNames(questions) {
  return [...new Set(questions
    .filter((question) => question.category === "state" && question.state)
    .map((question) => question.state))]
    .sort((a, b) => a.localeCompare(b, "de-DE"));
}

export function sampleByCategory(questions, category, count, selectedState = null) {
  return shuffle(questions.filter((question) => {
    if (question.category !== category) return false;
    return !selectedState || question.state === selectedState;
  })).slice(0, count);
}

export function orderStudyQuestionsByProgress(studyQuestions, questionStats) {
  const fresh = [];
  const studied = [];

  studyQuestions.forEach((question) => {
    if ((questionStats[String(question.id)]?.answered || 0) > 0) {
      studied.push(question);
    } else {
      fresh.push(question);
    }
  });

  return [...fresh, ...studied];
}
