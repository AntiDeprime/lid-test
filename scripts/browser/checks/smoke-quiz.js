async () => {
  // Explanations load in the background after the first screen.
  for (let waited = 0; !window.LID_EXPLANATION_HELPERS && waited < 8000; waited += 25) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const explanations = window.LID_SPECIFIC_EXPLANATIONS || {};
  if (Object.keys(explanations).length !== 460) {
    throw new Error('Expected 460 bespoke explanations');
  }
  if (!window.LID_QUESTIONS.every((question) => question.explanation === explanations[question.id])) {
    throw new Error('A catalogue question did not receive its bespoke explanation');
  }

  const imageQuestions = window.LID_QUESTIONS.filter((question) => question.images.length > 0);
  if (imageQuestions.length !== 43) {
    throw new Error('Expected 43 image-dependent questions, found ' + imageQuestions.length);
  }

  for (const question of imageQuestions) {
    document.querySelector('[data-start-tab="catalogue"]').click();
    document.querySelector('#jump-question').value = String(question.id);
    document.querySelector('#jump-form').requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const renderedImages = [...document.querySelectorAll('#image-grid img')];
    await Promise.all(renderedImages.map((image) => image.decode()));
    if (document.querySelector('#question-title')?.textContent !== question.prompt) {
      throw new Error('Catalogue jump did not open image question ' + question.id);
    }
    if (renderedImages.length !== question.images.length) {
      throw new Error('Question ' + question.id + ' did not render every image');
    }
    if (renderedImages.some((image) => image.naturalWidth === 0 || !image.alt.trim())) {
      throw new Error('Question ' + question.id + ' has a broken or unlabeled image');
    }
    if (document.documentElement.scrollWidth > window.innerWidth) {
      throw new Error('Question ' + question.id + ' causes horizontal overflow at 390px');
    }
    if (question.id === 130 && renderedImages[0].getBoundingClientRect().height < 280) {
      throw new Error('Question 130 ballot image is too small to read at 390px');
    }

    document.querySelector('#home-button').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  document.querySelector('#practice-button').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const toolbar = document.querySelector('#quiz-toolbar');
  const toolbarGroups = [...document.querySelectorAll('#quiz-toolbar [role=group]')];
  const toolbarButtons = [...document.querySelectorAll('#quiz-toolbar .toolbar-action')];
  if (!toolbar || toolbarGroups.length !== 2 || toolbarButtons.length !== 4) {
    throw new Error('Quiz actions are not organized into two clear toolbar groups');
  }
  if (toolbarButtons.some((button) => !button.querySelector('.toolbar-label')?.textContent.trim())) {
    throw new Error('A quiz toolbar action is missing a visible text label');
  }
  if (toolbarButtons.some((button) => button.getBoundingClientRect().height < 44)) {
    throw new Error('A quiz toolbar action has a touch target smaller than 44px');
  }
  if (new Set(toolbarButtons.map((button) => getComputedStyle(button).borderRadius)).size !== 1) {
    throw new Error('Quiz toolbar actions do not use one consistent shape');
  }
  if (toolbar.scrollWidth > toolbar.clientWidth || document.documentElement.scrollWidth > window.innerWidth) {
    throw new Error('Quiz toolbar causes horizontal overflow at 390px');
  }
  const quizProgress = document.querySelector('#quiz-progress');
  if (quizProgress?.getAttribute('role') !== 'progressbar' || quizProgress.getAttribute('aria-valuenow') !== '1') {
    throw new Error('Quiz progress is not exposed accessibly');
  }
  const prompt = document.querySelector('#question-title')?.textContent;
  const question = window.LID_QUESTIONS.find((item) => item.prompt === prompt);
  if (!question) throw new Error('Study question was not found in the catalogue');
  const correctIndex = question.options.findIndex((option) => option.correct);
  document.querySelectorAll('.answer-option')[correctIndex].click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const explanation = document.querySelector('#question-explanation');
  if (explanation?.classList.contains('is-hidden') || explanation?.textContent !== question.explanation) {
    throw new Error('Study mode did not reveal the bespoke explanation');
  }
  if (!document.querySelector('.answer-option.is-correct .answer-state')?.textContent.includes('Correct')) {
    throw new Error('Correct feedback relies on color without a visible state label');
  }
  return { questionId: question.id, explanation: explanation.textContent };
}
