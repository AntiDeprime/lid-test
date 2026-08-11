# LiD Test Prep

Static, mobile-first practice app for the German **Leben in Deutschland** / **Einbürgerungstest** question catalogue.

The exam simulation samples 33 questions per run: 30 general questions and 3 questions from the Bundesland selected for the user's place of residence. It uses a 60-minute timer, withholds correctness and explanations until the result screen, and applies the Einbürgerung threshold of 17 correct answers out of 33.

Study mode lets users browse all questions, only general questions, all Bundesland questions, one selected Bundesland question set, or bookmarked questions. It starts with questions that have no saved attempts, then continues with already studied questions. Answers stay hidden until the user selects an option, and selected answers are saved immediately. Study and review modes include instant correctness, explanations, learner hints, English translations where available, weak-question tracking, and bookmarks.

The start page also includes tabbed catalogue browsing with keyword search, direct question-number lookup, filters for all, general, Bundesland, previously incorrect, and bookmarked questions, and a "show more" control for browsing beyond the first batch. Catalogue answers are hidden by default unless the question was already studied or the user explicitly reveals the answer. Local statistics separate unique studied questions, repeated study accuracy, mastery, completed exam simulations, exam pass rate, weak-question queues, and bookmarks.

## Run Locally

Run a local static server from the repository root:

```sh
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

The app is static and has no package manager or build step. A local server keeps local checks consistent with GitHub Pages and the repository agent workflow.

The app's interaction conventions are documented in [`docs/ui-principles.md`](docs/ui-principles.md). The companion [`docs/visual-identity.md`](docs/visual-identity.md) defines the brand idea, logo use, palette, typography, shape, depth, graphic language, components, motion, accessibility guardrails, and interface voice.

## Checks

Validate the bundled question, translation, explanation, and image data:

```sh
node scripts/validate-data.js
```

Validate pure progress and quiz-rule behavior:

```sh
node scripts/validate-progress.mjs
```

These validation commands also run in GitHub Actions on pushes and pull requests. The CI workflow additionally starts a local static server and checks that `index.html` is served successfully.

Preferred browser smoke check:

```sh
scripts/browser-smoke-check.sh
```

The script starts `python3 -m http.server 8000 --bind 127.0.0.1`, waits for `http://127.0.0.1:8000/`, opens the app through the Codex Playwright CLI wrapper, verifies the start-page brand and launch hierarchy, checks 390px overflow and consent targets, checks the quiz toolbar structure, labels, 44px targets, and accessible progress, captures a snapshot, prints console output, then closes the browser and server.

Deeper browser flow check:

```sh
scripts/browser-flow-check.sh
```

The flow check completes passing and failing exam simulations, verifies the visual result states and withheld exam feedback, checks timeout handling, catalogue structure and answer reveal behavior, catalogue search, legal-modal presentation and focus, translation fallback, bookmarked review queue updates, and reset-safe localStorage setup.

Useful overrides:

```sh
PORT=8010 PLAYWRIGHT_CLI_SESSION=lid-test-check scripts/browser-smoke-check.sh
PLAYWRIGHT_BROWSER=firefox scripts/browser-smoke-check.sh
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

The app stores progress locally in the user's browser. The current analytics configuration denies advertising storage and personalization signals, enables analytics storage only after consent, and exposes visible privacy and imprint links with the local-data policy, analytics behavior, maintainer contact, and unofficial-app notice used by the static app.

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
- `modules/` contains focused JavaScript helpers for storage, sampling, progress summaries, learner hints, tabs, dialogs, and quiz rules.
- `questions.js` contains the question catalogue loaded by the page.
- `explanation-texts-*.js` contains one reviewed, question-specific learner explanation for each catalogue item.
- `explanations.js` attaches the reviewed explanation map to the question catalogue.
- `docs/explanation-guidelines.md` defines the evidence-informed rubric used to review and maintain explanations.
- `docs/ui-principles.md` defines the research-informed interaction and visual standards used for interface reviews.
- `docs/visual-identity.md` defines the reusable LiD Test Prep brand and visual system applied across every screen.
- `translations-en.js` contains local English translations for the bundled questions.
- `lid-v2-images/` contains image assets referenced by some questions.
- `scripts/validate-data.js` validates catalogue structure, translation coverage, learner explanations, and image references.

## Catalogue Notes

The current local catalogue contains all 300 general questions and 160 state questions: 10 questions for each of the 16 Bundesländer. English translations cover the bundled general catalogue and fall back gracefully where a state-question translation is not available. Every catalogue item has a bespoke explanation that is validated for exact ID coverage and generic fallback wording.
