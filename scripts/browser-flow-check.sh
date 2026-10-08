#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"
URL="${URL:-http://${HOST}:${PORT}/}"
SESSION="${PLAYWRIGHT_CLI_SESSION:-lid-test-flow}"
BROWSER="${PLAYWRIGHT_BROWSER:-chrome}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PWCLI="${PWCLI:-$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh}"
SERVER_LOG="${SERVER_LOG:-/tmp/lid-test-flow-http-${PORT}.log}"
CHECKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/browser/checks"

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

"$PWCLI" --session "$SESSION" open "$URL" --browser "$BROWSER"
"$PWCLI" --session "$SESSION" eval "(() => { localStorage.clear(); return true; })()"
"$PWCLI" --session "$SESSION" open "$URL" --browser "$BROWSER"
"$PWCLI" --session "$SESSION" eval "$(cat "$CHECKS_DIR/flow-main.js")"
"$PWCLI" --session "$SESSION" eval "$(cat "$CHECKS_DIR/flow-resume-setup.js")"
"$PWCLI" --session "$SESSION" open "$URL" --browser "$BROWSER"
"$PWCLI" --session "$SESSION" eval "$(cat "$CHECKS_DIR/flow-resume-check.js")"
"$PWCLI" --session "$SESSION" open "$URL" --browser "$BROWSER"
"$PWCLI" --session "$SESSION" eval "$(cat "$CHECKS_DIR/flow-resume-expired.js")"
"$PWCLI" --session "$SESSION" console
