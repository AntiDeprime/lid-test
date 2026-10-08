async () => {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const click = (selector) => {
    const element = document.querySelector(selector);
    if (!element) throw new Error('Missing selector: ' + selector);
    element.click();
  };
  const currentQuestion = () => {
    const prompt = document.querySelector('#question-title')?.textContent;
    return window.LID_QUESTIONS.find((question) => question.prompt === prompt);
  };
  const until = async (test, message, timeout = 8000) => {
    for (let waited = 0; !test(); waited += 25) {
      if (waited >= timeout) throw new Error(message);
      await delay(25);
    }
  };
  const clickAnswer = (wantCorrect) => {
    const question = currentQuestion();
    if (!question) throw new Error('Current question not found');
    const index = question.options.findIndex((option) => Boolean(option.correct) === wantCorrect);
    document.querySelectorAll('.answer-option')[index].click();
  };
  const finishExam = async (wantCorrect) => {
    for (let i = 0; i < 33; i += 1) {
      const beforeReveal = [...document.querySelectorAll('.answer-option')].some((button) => button.classList.contains('is-correct') || button.classList.contains('is-wrong'));
      if (beforeReveal) throw new Error('Exam simulation revealed correctness before result');
      clickAnswer(wantCorrect);
      if (i === 0 && wantCorrect) {
        click('#home-button');
        await delay(0);
        const dialog = document.querySelector('.confirm-modal');
        if (!dialog) throw new Error('Leaving an exam did not open the confirmation dialog');
        if (!dialog.textContent.includes('no result will be saved')) {
          throw new Error('Exam leave confirmation copy is misleading: ' + dialog.textContent);
        }
        if (document.activeElement !== dialog.querySelector('.primary-action')) {
          throw new Error('Confirmation dialog should focus the safe keep action');
        }
        dialog.querySelector('.primary-action').click();
        await delay(0);
        if (document.querySelector('.confirm-modal')) throw new Error('Keep going did not close the confirmation dialog');
        if (document.querySelector('#quiz-screen').classList.contains('is-hidden')) throw new Error('Keep going left the exam');
      }
      if (i < 32) {
        click('#next-button');
        await delay(0);
      } else {
        click('#next-button');
      }
    }
    await delay(0);
  };

  await delay(100);
  click('.consent-banner .secondary-action');
  click('#start-button');
  await delay(0);
  if (!document.querySelector('#timer-counter')?.textContent.includes('60:00')) {
    throw new Error('Exam timer did not start at 60:00');
  }
  await finishExam(true);
  if (document.querySelector('#result-title')?.textContent !== 'Passed') {
    throw new Error('All-correct exam did not pass');
  }
  if (document.querySelector('#result-screen')?.dataset.result !== 'pass' || !document.querySelector('.result-hero')) {
    throw new Error('Passed result is missing the visual result identity');
  }
  if (!document.querySelector('#result-context')?.textContent.includes('30 general')) {
    throw new Error('Result context does not describe exam composition');
  }

  click('#new-test-button');
  await delay(0);
  await finishExam(false);
  if (document.querySelector('#result-title')?.textContent !== 'Not passed') {
    throw new Error('All-wrong exam did not fail');
  }
  if (document.querySelector('#result-screen')?.dataset.result !== 'fail') {
    throw new Error('Failed result is missing its visual result state');
  }

  click('#result-home-button');
  click('[data-start-tab="catalogue"]');
  await delay(0);
  if (document.querySelector('[data-start-tab="catalogue"]')?.getAttribute('role') !== 'tab') {
    throw new Error('Catalogue tab is missing tab semantics');
  }
  if (document.querySelector('#catalogue-panel')?.getAttribute('role') !== 'tabpanel') {
    throw new Error('Catalogue panel is missing tabpanel semantics');
  }
  if (!document.querySelector('#catalogue-panel .section-heading-mark')) {
    throw new Error('Catalogue screen is missing the shared section-heading treatment');
  }
  const firstCatalogueItem = document.querySelector('.catalogue-item');
  if (!firstCatalogueItem) throw new Error('Catalogue item missing');
  if (document.querySelectorAll('.catalogue-item').length !== 24) {
    throw new Error('Catalogue initial batch size changed unexpectedly');
  }
  click('#catalogue-more-button');
  await delay(0);
  if (document.querySelectorAll('.catalogue-item').length !== 48) {
    throw new Error('Catalogue show more did not render the next batch');
  }
  if (!firstCatalogueItem.querySelector('.catalogue-answer')?.hidden) {
    throw new Error('Catalogue answer spoiler is visible by default');
  }
  firstCatalogueItem.querySelector('[aria-controls]')?.click();
  if (firstCatalogueItem.querySelector('.catalogue-answer')?.hidden) {
    throw new Error('Catalogue reveal button did not show answer');
  }

  document.querySelector('#catalogue-search').value = 'Grundgesetz';
  document.querySelector('#catalogue-search').dispatchEvent(new Event('input', { bubbles: true }));
  await delay(0);
  if (!document.querySelector('#catalogue-summary')?.textContent.includes('match')) {
    throw new Error('Catalogue search did not update summary');
  }

  click('[data-legal-panel="privacy"]');
  await delay(0);
  const legalCopy = document.querySelector('.legal-modal')?.textContent || '';
  if (/placeholder|Add the production/i.test(legalCopy)) {
    throw new Error('Legal copy still contains placeholder launch text');
  }
  if (getComputedStyle(document.querySelector('.legal-modal')).borderRadius === '0px') {
    throw new Error('Legal modal is missing the visual surface treatment');
  }
  click('.legal-modal .icon-action');

  click('#translation-toggle');
  click('#result-home-button');
  click('#practice-button');
  await delay(0);
  if (!document.querySelector('.answer-option')?.getAttribute('aria-label')) {
    throw new Error('Answer options are missing accessible labels before selection');
  }
  click('#translation-toggle');
  await until(() => document.querySelector('#question-translation')?.dataset.state === 'ready', 'Translation panel did not render in study mode');
  if (!document.querySelector('#question-translation').textContent.trim()) {
    throw new Error('Translation panel is empty in study mode');
  }
  if (document.querySelector('#translation-bar').classList.contains('is-hidden')) {
    throw new Error('Language picker is hidden while translations are on');
  }
  const studyQuestion = currentQuestion();
  const picker = document.querySelector('#translation-language');
  picker.value = 'ru';
  picker.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => document.querySelector('#question-translation')?.dataset.state === 'ready' && document.querySelector('#question-translation').lang === 'ru', 'Russian translation did not render');
  if (!/[а-яё]/i.test(document.querySelector('#question-translation').textContent)) {
    throw new Error('Russian translation panel has no Cyrillic text');
  }
  if (document.querySelector('#translation-label').textContent !== 'Русский') {
    throw new Error('Translation toolbar label did not follow the language choice');
  }
  if (!/[а-яё]/i.test(document.querySelector('.option-translation')?.textContent || '')) {
    throw new Error('Russian option translations are not shown');
  }
  if (window.localStorage.getItem('lidTranslationLanguage') !== 'ru') {
    throw new Error('Language choice was not saved');
  }
  // A question without a translation says so in the chosen language.
  const savedRussian = window.LID_TRANSLATIONS_RU[studyQuestion.id];
  delete window.LID_TRANSLATIONS_RU[studyQuestion.id];
  picker.value = 'en';
  picker.dispatchEvent(new Event('change', { bubbles: true }));
  picker.value = 'ru';
  picker.dispatchEvent(new Event('change', { bubbles: true }));
  await delay(0);
  if (!document.querySelector('#question-translation')?.textContent.includes('Russian translation is not available')) {
    throw new Error('Missing translation did not show the fallback message');
  }
  window.LID_TRANSLATIONS_RU[studyQuestion.id] = savedRussian;
  picker.value = 'en';
  picker.dispatchEvent(new Event('change', { bubbles: true }));
  await until(() => document.querySelector('#question-translation')?.dataset.state === 'ready' && document.querySelector('#question-translation').lang === 'en', 'English translation did not come back');
  click('#bookmark-toggle');
  click('#home-button');
  await delay(0);
  if (!document.querySelector('#bookmark-review-button')?.textContent.includes('bookmarked')) {
    throw new Error('Bookmark review queue did not update');
  }

  click('#start-button');
  await delay(0);
  if (document.querySelector('#translation-toggle')?.getAttribute('aria-pressed') !== 'false') {
    throw new Error('Exam simulation kept translations enabled');
  }
  if (!document.querySelector('#translation-toggle')?.disabled) {
    throw new Error('Exam simulation did not disable the translation toggle');
  }
  if (!document.querySelector('#question-translation')?.classList.contains('is-hidden')) {
    throw new Error('Exam simulation rendered a translation');
  }
  const realNow = Date.now;
  Date.now = () => realNow() + 61 * 60 * 1000;
  await delay(1100);
  Date.now = realNow;
  if (!document.querySelector('#result-status')?.textContent.includes('Time expired')) {
    throw new Error('Timeout result did not render');
  }

  click('#result-home-button');
  await delay(0);
  document.querySelector('#progress-tab').focus();
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await delay(0);
  if (document.activeElement?.id !== 'catalogue-tab' || document.querySelector('#catalogue-panel')?.hidden) {
    throw new Error('Tablist arrow navigation did not activate the catalogue tab');
  }

  click('[data-legal-panel="privacy"]');
  await delay(0);
  if (document.activeElement?.getAttribute('aria-label') !== 'Close') {
    throw new Error('Legal modal did not move focus to the close button');
  }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await delay(0);
  if (document.querySelector('.legal-modal')) {
    throw new Error('Legal modal did not close with Escape');
  }
  if (document.activeElement?.dataset.legalPanel !== 'privacy') {
    throw new Error('Legal modal did not restore focus to the opener');
  }

  click('#practice-button');
  await delay(0);
  click('.answer-option');
  click('#home-button');
  await delay(0);
  if (!document.querySelector('.confirm-modal')) throw new Error('Leaving an answered study run did not open the confirmation dialog');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await delay(0);
  if (document.querySelector('.confirm-modal') || document.querySelector('#quiz-screen').classList.contains('is-hidden')) {
    throw new Error('Escape should dismiss the leave dialog and keep the run');
  }
  click('#home-button');
  await delay(0);
  click('.confirm-leave');
  await delay(0);
  if (!document.querySelector('#quiz-screen').classList.contains('is-hidden') || document.querySelector('.confirm-modal')) {
    throw new Error('Confirming leave did not return to the start page');
  }

  click('#reset-progress-button');
  await delay(0);
  if (!document.querySelector('.confirm-modal')) throw new Error('Reset progress did not open the confirmation dialog');
  click('.confirm-modal .primary-action');
  await delay(0);
  if (document.querySelector('.confirm-modal') || !document.querySelector('#progress-empty')?.classList.contains('is-hidden')) {
    throw new Error('Keeping progress should close the dialog and leave progress untouched');
  }
  click('#reset-progress-button');
  await delay(0);
  click('.confirm-leave');
  await delay(0);
  if (document.querySelector('#progress-empty')?.classList.contains('is-hidden')) {
    throw new Error('Confirming reset did not clear saved progress');
  }

  const importBackup = async (text) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([text], 'backup.json', { type: 'application/json' }));
    const input = document.querySelector('#import-progress-input');
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(150);
  };
  if (!document.querySelector('#export-progress-button').disabled) {
    throw new Error('Export should be disabled when there is no progress to back up');
  }
  await importBackup('{"hello": 1}');
  if (!document.querySelector('#backup-status').textContent.includes('not a LiD Test Prep backup')) {
    throw new Error('Importing a non-backup file did not explain the problem');
  }
  await importBackup(JSON.stringify({
    format: 'lid-test-prep-progress',
    exportedAt: new Date().toISOString(),
    progress: { version: 1, questionStats: { 1: { answered: 2, correct: 1, wrong: 1 } }, weakQuestions: {}, bookmarkedQuestions: {}, testHistory: [] }
  }));
  if (!document.querySelector('#backup-status').textContent.includes('Backup imported')
    || document.querySelector('#answered-stat').textContent !== '1'
    || document.querySelector('#export-progress-button').disabled) {
    throw new Error('Importing a backup into an empty browser did not restore progress');
  }

  return {
    passedFlow: true,
    title: document.title,
    result: document.querySelector('#result-title')?.textContent
  };
}
