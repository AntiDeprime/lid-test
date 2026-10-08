(() => {
  const required = [
    ['title', document.title.includes('Leben in Deutschland Test')],
    ['start button', Boolean(document.querySelector('#start-button'))],
    ['study button', Boolean(document.querySelector('#practice-button'))],
    ['brand lockup', document.querySelector('.brand-lockup img')?.getAttribute('src') === 'assets/lid-logo.svg'],
    ['hero proof points', document.querySelectorAll('.hero-proof-item').length === 3],
    ['launch cards', document.querySelectorAll('.launch-card').length === 2],
    ['progress heading', document.querySelector('#progress-title')?.textContent.includes('Your progress')],
    ['area stats', Boolean(document.querySelector('#area-stats'))],
    ['recent tests', Boolean(document.querySelector('#recent-tests'))],
    ['Bundesland selector', document.querySelectorAll('#bundesland-select option').length === 16],
    ['catalogue summary', document.querySelector('#catalogue-summary')?.textContent.includes('Showing 24 of 460')]
  ];
  const missing = required.filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) throw new Error('Browser smoke check failed: ' + missing.join(', '));
  if (document.documentElement.scrollWidth > window.innerWidth) {
    throw new Error('Start screen causes horizontal overflow at 390px');
  }
  const consentButtons = [...document.querySelectorAll('.consent-banner button')];
  if (consentButtons.some((button) => button.getBoundingClientRect().height < 44)) {
    throw new Error('A consent action has a touch target smaller than 44px');
  }
  return {
    title: document.title,
    progress: document.querySelector('#progress-title').textContent.trim(),
    catalogue: document.querySelector('#catalogue-summary').textContent
  };
})()
