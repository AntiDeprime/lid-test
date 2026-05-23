export function summarizeProgress(progress, totalQuestions) {
  const stats = Object.values(progress.questionStats);
  const repeatedAnswers = stats.reduce((total, item) => total + item.answered, 0);
  const correct = stats.reduce((total, item) => total + item.correct, 0);
  const uniqueStudied = stats.filter((item) => item.answered > 0).length;
  const mastered = stats.filter((item) => item.correct > 0 && item.wrong === 0).length;
  const tests = progress.testHistory.length;
  const passedTests = progress.testHistory.filter((test) => test.passed).length;

  return {
    repeatedAnswers,
    correct,
    uniqueStudied,
    studyAccuracy: repeatedAnswers ? Math.round((correct / repeatedAnswers) * 100) : 0,
    mastery: totalQuestions ? Math.round((mastered / totalQuestions) * 100) : 0,
    tests,
    passRate: tests ? Math.round((passedTests / tests) * 100) : 0
  };
}
