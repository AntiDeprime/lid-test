#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"
URL="${URL:-http://${HOST}:${PORT}/}"
SESSION="${PLAYWRIGHT_CLI_SESSION:-lid-test-smoke}"
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

"$PWCLI" --session "$SESSION" open "$URL"
"$PWCLI" --session "$SESSION" eval "(() => {
  const required = [
    ['title', document.title.includes('Leben in Deutschland Test')],
    ['start button', Boolean(document.querySelector('#start-button'))],
    ['study button', Boolean(document.querySelector('#practice-button'))],
    ['progress heading', document.querySelector('#progress-title')?.textContent === 'Your progress'],
    ['area stats', Boolean(document.querySelector('#area-stats'))],
    ['recent tests', Boolean(document.querySelector('#recent-tests'))],
    ['Bundesland selector', document.querySelectorAll('#bundesland-select option').length === 16],
    ['catalogue summary', document.querySelector('#catalogue-summary')?.textContent.includes('Showing 24 of 460')]
  ];
  const missing = required.filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) throw new Error('Browser smoke check failed: ' + missing.join(', '));
  return {
    title: document.title,
    progress: document.querySelector('#progress-title').textContent,
    catalogue: document.querySelector('#catalogue-summary').textContent
  };
})()"
"$PWCLI" --session "$SESSION" snapshot
"$PWCLI" --session "$SESSION" console
