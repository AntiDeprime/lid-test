# LiD Test Prep

Static, mobile-first practice app for the German **Leben in Deutschland** / **Einbürgerungstest** question catalogue.

The exam simulation samples 33 questions per run: 30 general questions and 3 questions from the Bundesland selected for the user's place of residence. It uses a 60-minute timer, withholds correctness and explanations until the result screen, and applies the Einbürgerung threshold of 17 correct answers out of 33.

Study mode lets users browse all questions, only general questions, all Bundesland questions, one selected Bundesland question set, or bookmarked questions. It starts with questions that have no saved attempts, then continues with already studied questions. Answers stay hidden until the user selects an option, and selected answers are saved immediately. Study and review modes include instant correctness, explanations, learner hints, English translations where available, weak-question tracking, and bookmarks.

The start page also includes tabbed catalogue browsing with keyword search, direct question-number lookup, and filters for all, general, Bundesland, previously incorrect, and bookmarked questions. Catalogue answers are hidden by default unless the question was already studied or the user explicitly reveals the answer. Local statistics separate unique studied questions, repeated study accuracy, mastery, completed exam simulations, exam pass rate, weak-question queues, and bookmarks.

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

Deeper browser flow check:

```sh
scripts/browser-flow-check.sh
```

The flow check completes passing and failing exam simulations, verifies that exam feedback is withheld until results, checks timeout handling, catalogue answer reveal behavior, catalogue search, translation fallback, bookmarked review queue updates, and reset-safe localStorage setup.

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
    ['Bundesland selector', document.querySelectorAll('#bundesland-select option').length === 16],
    ['catalogue summary', document.querySelector('#catalogue-summary')?.textContent.includes('460 questions')]
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

The page supports Google Analytics 4 with measurement ID `G-6LN5H6T5LW`, but the Google tag is not loaded until the user explicitly allows analytics in the consent banner.

The app stores progress locally in the user's browser. The current analytics configuration denies advertising storage and personalization signals, enables analytics storage only after consent, and exposes visible privacy and imprint links. Replace the placeholder privacy and imprint copy with the production operator details before public launch.

## PWA

The app includes `manifest.webmanifest` and `service-worker.js` so it can be installed and can cache the shell, data files, modules, and visited assets for offline use after the first load.

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
- `app.js` contains the vanilla JavaScript app wiring and screen state.
- `modules/` contains focused JavaScript helpers for storage, sampling, progress summaries, and learner hints.
- `questions.js` contains the question catalogue loaded by the page.
- `explanations.js` adds learner-facing explanations to the question catalogue without changing the official answer data.
- `translations-en.js` contains local English translations for the bundled questions.
- `lid-v2-images/` contains image assets referenced by some questions.
- `scripts/validate-data.js` validates catalogue structure, translation coverage, and image references.

## Catalogue Notes

The current local catalogue contains all 300 general questions and 160 state questions: 10 questions for each of the 16 Bundesländer. English translations cover the bundled general catalogue and fall back gracefully where a state-question translation is not available.
