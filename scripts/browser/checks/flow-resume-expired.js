async () => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  if (!document.querySelector('#resume-title').textContent.includes('ran out of time')) {
    throw new Error('Expired exam is not described as out of time');
  }
  document.querySelector('#resume-button').click();
  await delay(0);
  if (!document.querySelector('#result-status')?.textContent.includes('Time expired')) {
    throw new Error('Expired exam did not open its timed-out result');
  }
  if (localStorage.getItem('lidTestPrepExamSession')) throw new Error('Finishing an expired exam did not clear the saved session');
  return { expiredResume: true };
}
