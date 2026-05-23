#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"
URL="${URL:-http://${HOST}:${PORT}/}"
SESSION="${PLAYWRIGHT_CLI_SESSION:-lid-test-flow}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PWCLI="${PWCLI:-$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh}"
SERVER_LOG="${SERVER_LOG:-/tmp/lid-test-flow-http-${PORT}.log}"

server_pid=""

cleanup() {
  set +e
  "$PWCLI" --session "$SESSION" close >/dev/null 2>&1
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" >/dev/null 2>&1
    wait "$server_pid" >/dev/null 2>&1
  fi
}
trap cleanup EXIT

python3 -m http.server "$PORT" --bind "$HOST" >"$SERVER_LOG" 2>&1 &
server_pid="$!"

for _ in {1..30}; do
  if ! kill -0 "$server_pid" >/dev/null 2>&1; then
    echo "Local static server failed to start. Server log:" >&2
    sed -n '1,120p' "$SERVER_LOG" >&2 || true
    exit 1
  fi

  if curl --fail --silent --show-error "$URL" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

if ! curl --fail --silent --show-error "$URL" >/dev/null; then
  echo "Local static server did not become ready at $URL. Server log:" >&2
  sed -n '1,120p' "$SERVER_LOG" >&2 || true
  exit 1
fi

"$PWCLI" --session "$SESSION" open "$URL"
"$PWCLI" --session "$SESSION" eval "(() => { localStorage.clear(); return true; })()"
"$PWCLI" --session "$SESSION" open "$URL"
"$PWCLI" --session "$SESSION" eval "async () => {
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
  if (!document.querySelector('#result-context')?.textContent.includes('30 general')) {
    throw new Error('Result context does not describe exam composition');
  }

  click('#new-test-button');
  await delay(0);
  await finishExam(false);
  if (document.querySelector('#result-title')?.textContent !== 'Not passed') {
    throw new Error('All-wrong exam did not fail');
  }

  click('#result-home-button');
  click('[data-start-tab=\"catalogue\"]');
  await delay(0);
  if (document.querySelector('[data-start-tab=\"catalogue\"]')?.getAttribute('role') !== 'tab') {
    throw new Error('Catalogue tab is missing tab semantics');
  }
  if (document.querySelector('#catalogue-panel')?.getAttribute('role') !== 'tabpanel') {
    throw new Error('Catalogue panel is missing tabpanel semantics');
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

  click('[data-legal-panel=\"privacy\"]');
  await delay(0);
  const legalCopy = document.querySelector('.legal-modal')?.textContent || '';
  if (/placeholder|Add the production/i.test(legalCopy)) {
    throw new Error('Legal copy still contains placeholder launch text');
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
  if (!document.querySelector('#question-translation')?.textContent.trim()) {
    throw new Error('Translation panel did not render in study mode');
  }
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
    throw new Error('Exam simulation rendered an English translation');
  }
  const realNow = Date.now;
  Date.now = () => realNow() + 61 * 60 * 1000;
  await delay(1100);
  Date.now = realNow;
  if (!document.querySelector('#result-status')?.textContent.includes('Time expired')) {
    throw new Error('Timeout result did not render');
  }

  click('#result-home-button');
  document.querySelector('#progress-tab').focus();
  document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  await delay(0);
  if (document.activeElement?.id !== 'catalogue-tab' || document.querySelector('#catalogue-panel')?.hidden) {
    throw new Error('Tablist arrow navigation did not activate the catalogue tab');
  }

  click('[data-legal-panel=\"privacy\"]');
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

  return {
    passedFlow: true,
    title: document.title,
    result: document.querySelector('#result-title')?.textContent
  };
}"
"$PWCLI" --session "$SESSION" console
