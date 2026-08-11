#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"
URL="${URL:-http://${HOST}:${PORT}/}"
SESSION="${PLAYWRIGHT_CLI_SESSION:-lid-test-smoke}"
BROWSER="${PLAYWRIGHT_BROWSER:-chrome}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PWCLI="${PWCLI:-$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh}"
SERVER_LOG="${SERVER_LOG:-/tmp/lid-test-http-${PORT}.log}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to run the static server." >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required by the Playwright CLI wrapper." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to wait for the local static server." >&2
  exit 1
fi

if [[ ! -x "$PWCLI" ]]; then
  echo "Playwright CLI wrapper not found or not executable: $PWCLI" >&2
  exit 1
fi

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
  if curl --fail --silent --show-error "$URL" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

curl --fail --silent --show-error "$URL" >/dev/null

"$PWCLI" --session "$SESSION" open "$URL" --browser "$BROWSER"
"$PWCLI" --session "$SESSION" resize 390 844
"$PWCLI" --session "$SESSION" eval "(() => {
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
})()"
"$PWCLI" --session "$SESSION" eval "async () => {
  const explanations = window.LID_SPECIFIC_EXPLANATIONS || {};
  if (Object.keys(explanations).length !== 460) {
    throw new Error('Expected 460 bespoke explanations');
  }
  if (!window.LID_QUESTIONS.every((question) => question.explanation === explanations[question.id])) {
    throw new Error('A catalogue question did not receive its bespoke explanation');
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
}"
"$PWCLI" --session "$SESSION" snapshot
"$PWCLI" --session "$SESSION" console
