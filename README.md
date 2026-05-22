# LiD Test Prep

Static, mobile-first practice app for the German **Leben in Deutschland** / **Einbürgerungstest** question catalogue.

The app samples 33 questions per run: 30 general questions and 3 Berlin questions. The final result uses the Einbürgerung threshold of 17 correct answers out of 33.

Study mode lets users browse all questions, only general questions, the Berlin Bundesland question set, or bookmarked questions. It starts with questions that have no saved attempts, then continues with already studied questions. Answers stay hidden until the user selects an option, and selected answers are saved immediately. Users can bookmark difficult questions from any quiz or study screen and review those bookmarks later from the start page.

The start page also includes catalogue browsing with keyword search, direct question-number lookup, and filters for all, general, Berlin, previously incorrect, and bookmarked questions. Local statistics show attempted answers, accuracy, completed tests, pass rate, area performance, recent mock-test results, weak questions, and bookmarks.

## Run Locally

Run a local static server from the repository root:

```sh
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

The app is static and has no package manager or build step. A local server keeps local checks consistent with GitHub Pages and the repository agent workflow.

## Checks

Validate the bundled question, translation, and image data:

```sh
node scripts/validate-data.js
```

Preferred browser smoke check:

```sh
scripts/browser-smoke-check.sh
```

The script starts `python3 -m http.server 8000 --bind 127.0.0.1`, waits for `http://127.0.0.1:8000/`, opens the app through the Codex Playwright CLI wrapper, verifies the start page DOM, captures a snapshot, prints console output, then closes the browser and server.

Useful overrides:

```sh
PORT=8010 PLAYWRIGHT_CLI_SESSION=lid-test-check scripts/browser-smoke-check.sh
PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh" scripts/browser-smoke-check.sh
```

Manual Playwright path, matching the script:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

In another shell:

```sh
PWCLI="$HOME/.codex/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" --session lid-test-smoke open http://127.0.0.1:8000/
"$PWCLI" --session lid-test-smoke eval "(() => {
  const required = [
    ['title', document.title.includes('Leben in Deutschland Test')],
    ['start button', Boolean(document.querySelector('#start-button'))],
    ['study button', Boolean(document.querySelector('#practice-button'))],
    ['progress heading', document.querySelector('#progress-title')?.textContent === 'Your progress'],
    ['area stats', Boolean(document.querySelector('#area-stats'))],
    ['recent tests', Boolean(document.querySelector('#recent-tests'))],
    ['catalogue summary', document.querySelector('#catalogue-summary')?.textContent.includes('310 questions')]
  ];
  const missing = required.filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) throw new Error('Browser smoke check failed: ' + missing.join(', '));
  return {
    title: document.title,
    progress: document.querySelector('#progress-title').textContent,
    catalogue: document.querySelector('#catalogue-summary').textContent
  };
})()"
"$PWCLI" --session lid-test-smoke snapshot
"$PWCLI" --session lid-test-smoke console
"$PWCLI" --session lid-test-smoke close
```

Codex sandbox notes:

- `python3 -m http.server 8000 --bind 127.0.0.1` can run normally.
- Playwright CLI commands should be run with escalation in Codex because the wrapper uses `npx --package @playwright/cli`, may need npm registry access the first time, launches a browser process, and writes session artifacts under `.playwright-cli/`.
- The useful approved prefix is `["/Users/alekseishchetinin/.codex/skills/playwright/scripts/playwright_cli.sh"]`.
- If running the one-command script from Codex, escalate `bash scripts/browser-smoke-check.sh` for the same reason.
- `.playwright-cli/` is ignored because snapshots, console logs, and screenshots are local verification artifacts.

## Analytics

The page includes the Google Analytics 4 Google tag in `index.html` with measurement ID `G-6LN5H6T5LW`.

Because Google Analytics may use cookies or similar identifiers depending on account settings and jurisdiction, keep the site's privacy notice and consent approach aligned with the production deployment.

## GitHub Pages

Deploy from the repository root:

1. Push this repository to GitHub.
2. Open repository settings.
3. Go to **Pages**.
4. Set **Source** to **Deploy from a branch**.
5. Select the branch and `/ (root)` folder.

GitHub Pages will serve `index.html` as the app entry point.

## Files

- `index.html` contains the one-page UI structure and metadata.
- `styles.css` contains the app styling.
- `app.js` contains the vanilla JavaScript app logic.
- `questions.js` contains the question catalogue loaded by the page.
- `explanations.js` adds learner-facing explanations to the question catalogue without changing the official answer data.
- `translations-en.js` contains local English translations for the bundled questions.
- `lid-v2-images/` contains image assets referenced by some questions.
- `scripts/validate-data.js` validates catalogue structure, translation coverage, and image references.

## Catalogue Notes

The current local catalogue contains all 300 general questions and 10 Berlin state questions. This version is Berlin-only because the other Bundesland question sets are not present in the source material.
