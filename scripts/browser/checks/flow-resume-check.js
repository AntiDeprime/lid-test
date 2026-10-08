async () => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const card = document.querySelector('#resume-card');
  if (!card || card.classList.contains('is-hidden')) throw new Error('Resume card did not appear after a reload');
  if (!document.querySelector('#resume-detail').textContent.includes('3 of 33 answered')) {
    throw new Error('Resume card does not report progress: ' + document.querySelector('#resume-detail').textContent);
  }
  document.querySelector('#resume-button').click();
  await delay(0);
  if (document.querySelector('#question-title').textContent !== sessionStorage.getItem('resume-title')
    || document.querySelector('#question-kicker').textContent !== sessionStorage.getItem('resume-kicker')) {
    throw new Error('Resumed exam is not on the question it was left on');
  }
  document.querySelector('#home-button').click();
  await delay(0);
  document.querySelector('.confirm-leave').click();
  await delay(0);
  if (localStorage.getItem('lidTestPrepExamSession')) throw new Error('Leaving the exam did not clear the saved session');
  if (!document.querySelector('#resume-card').classList.contains('is-hidden')) throw new Error('Resume card stayed visible after leaving the exam');

  document.querySelector('#start-button').click();
  await delay(0);
  document.querySelectorAll('.answer-option')[0].click();
  const saved = JSON.parse(localStorage.getItem('lidTestPrepExamSession'));
  saved.startedAt -= 90 * 60 * 1000;
  localStorage.setItem('lidTestPrepExamSession', JSON.stringify(saved));
  return { resumeFlow: true };
}
