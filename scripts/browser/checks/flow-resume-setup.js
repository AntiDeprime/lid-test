async () => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  localStorage.clear();
  sessionStorage.clear();
  document.querySelector('.consent-banner .secondary-action')?.click();
  document.querySelector('#start-button').click();
  await delay(0);
  for (let i = 0; i < 3; i += 1) {
    document.querySelectorAll('.answer-option')[0].click();
    document.querySelector('#next-button').click();
    await delay(0);
  }
  sessionStorage.setItem('resume-title', document.querySelector('#question-title').textContent);
  sessionStorage.setItem('resume-kicker', document.querySelector('#question-kicker').textContent);
  if (!localStorage.getItem('lidTestPrepExamSession')) throw new Error('Running exam was not saved for resume');
  return true;
}
