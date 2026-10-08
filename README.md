# LiD Test Prep

Static, mobile-first practice app for the German **Leben in Deutschland** / **Einbürgerungstest** question catalogue.

The exam simulation samples 33 questions per run: 30 general questions and 3 questions from the Bundesland selected for the user's place of residence. It uses a 60-minute timer, withholds correctness and explanations until the result screen, and applies the Einbürgerung threshold of 17 correct answers out of 33. A running exam is saved in the browser, so after a reload or a suspended mobile tab the start page offers to resume it (the 60-minute clock keeps counting real time) or discard it.

Study mode lets users browse all questions, only general questions, all Bundesland questions, one selected Bundesland question set, or bookmarked questions. It starts with questions that have no saved attempts, then continues with already studied questions. Answers stay hidden until the user selects an option, and selected answers are saved immediately. Study and review modes include instant correctness, explanations, learner hints, translations into English or Russian (the language picker appears under the German question once translations are on, and the choice is remembered), weak-question tracking, and bookmarks.

The start page also includes tabbed catalogue browsing with keyword search, direct question-number lookup, filters for all, general, Bundesland, previously incorrect, and bookmarked questions, and a "show more" control for browsing beyond the first batch. Catalogue answers are hidden by default unless the question was already studied or the user explicitly reveals the answer. Studied questions follow a five-box spaced-repetition schedule (a correct answer moves a question to the next box and a longer wait of 1, 3, 7, 14, or 30 days; a miss sends it back to box 1, due the next day). The start page offers a "Review due questions" run of up to 25 of the questions whose date has come, and the Progress tab shows an exam-readiness estimate: the chance of reaching 17 of 33 correct, computed from each question's smoothed accuracy, with unseen questions counted as one-in-four guesses and due questions counted a little less. Progress saved by the first storage version migrates automatically; its questions are due once and then scheduled from their next answer. Local statistics separate unique studied questions, repeated study accuracy, mastery, completed exam simulations, exam pass rate, weak-question queues, and bookmarks.

## Run Locally

Run a local static server from the repository root:

```sh
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

The app itself is static and has no package manager or build step; only the browser checks under `scripts/browser/` have their own `package.json`. A local server keeps local checks consistent with GitHub Pages and the repository agent workflow.

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

Validate the installable app and its offline cache (manifest icons, precached files, and the cache revision):

```sh
node scripts/validate-pwa.js
```

Validate the launch configuration and the files generated from it (canonical link, social image URLs, `robots.txt`, `sitemap.xml`). It passes while the app is unconfigured and lists what is still to fill in; add `--production` to fail until everything is set:

```sh
node scripts/validate-site.mjs
node scripts/validate-site.mjs --production
```

These validation commands also run in GitHub Actions on pushes and pull requests. The CI workflow additionally starts a local static server and checks that `index.html` is served successfully.

Portable browser checks, which also run in GitHub Actions:

```sh
cd scripts/browser
npm ci
npx playwright install chromium
node run-checks.mjs
```

The runner serves the repository with a built-in static server, drives Chromium through Playwright, and runs ten sections: `smoke` (start page and quiz toolbar at 390px), `flow` (exam simulations, catalogue, dialogs, exam resume, and backup import), `offline` (loads the app, stops the server, and reloads from the service worker cache; explanations and both translation languages must still load), `content` (explanations and translations load on demand, a language switch loads its own file, a failed fetch offers a retry, and the choice is saved), `layout` (390px first-screen, toolbar, and feedback layout with screenshots in `scripts/browser/artifacts/`), `fit` (every question, with each language's translations on and an answer picked, must fit 360px and 390px wide), `keyboard` (the app driven with real Tab, Space, Enter, arrow, and Escape key presses: visible focus rings, focus moving to the new screen's heading, dialog focus trap and restore, and a whole exam answered from the keyboard), `review` (spaced repetition and the exam-readiness estimate driven through the interface, starting from progress saved by the previous storage version so the migration runs too), `visual` (eleven key screens compared with the committed images in `scripts/browser/baselines/`), and `a11y` (an axe-core scan of the start page, tabs, dialogs, study and exam questions, resume card, and result screen). Set `ONLY=a11y,layout` to run some sections, `CHROMIUM_PATH` to reuse an installed Chromium, and `KEEP_ARTIFACTS=1` to keep screenshots from passing runs. GitHub Actions has no Inter font and renders the wider DejaVu Sans, which exposes layout overflow that passes on a developer machine; reproduce it locally with `TEST_FONT="DejaVu Sans" node run-checks.mjs`. The `visual` section renders in DejaVu Sans whatever the machine has (CI installs `fonts-dejavu-core`) and allows 0.8% of pixels to differ for antialiasing; after an intended visual change run `UPDATE_BASELINES=1 node run-checks.mjs` with `ONLY=visual`, then review the changed images in the diff before committing them. The in-page assertions live in `scripts/browser/checks/` and are shared with the two Codex scripts below.

Codex browser smoke check:

```sh
scripts/browser-smoke-check.sh
```

The script starts `python3 -m http.server 8000 --bind 127.0.0.1`, waits for `http://127.0.0.1:8000/`, opens the app through the Codex Playwright CLI wrapper, verifies the start-page brand and launch hierarchy, checks 390px overflow and consent targets, checks the quiz toolbar structure, labels, 44px targets, and accessible progress, captures a snapshot, prints console output, then closes the browser and server.

Deeper browser flow check:

```sh
scripts/browser-flow-check.sh
```

The flow check completes passing and failing exam simulations, verifies the visual result states and withheld exam feedback, checks timeout handling, catalogue structure and answer reveal behavior, catalogue search, legal-modal presentation and focus, the leave-run and reset-progress confirmation dialogs, translation fallback, bookmarked review queue updates, and reset-safe localStorage setup.

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

The page supports Google Analytics 4 with measurement ID `G-6LN5H6T5LW`, but the Google tag is not loaded until the user explicitly allows analytics in the consent banner. The choice can be changed at any time from the start page footer: turning analytics off stops collection on the open page, removes the analytics cookies, and keeps the tag from loading on later visits.

The app stores progress locally in the user's browser. The Progress tab can export that progress to a JSON backup file and import it again, for example on a new device; saved progress is upgraded by migrations when the storage format changes, and data the app cannot read is kept under `lidTestPrepProgress.unreadable` rather than overwritten. The current analytics configuration denies advertising storage and personalization signals, enables analytics storage only after consent, and exposes visible privacy and imprint links with the local-data policy, analytics behavior, maintainer contact, and unofficial-app notice used by the static app.

## PWA

The app includes `manifest.webmanifest` and `service-worker.js` so it can be installed and can cache the shell, data files, modules, and visited assets for offline use after the first load.

App icons live in `assets/`: SVG sources (`favicon.svg`, `icon-maskable.svg`) and the PNGs derived from them (`favicon-32.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`). After changing an SVG source, regenerate the PNGs with `node scripts/render-icons.mjs` (needs Playwright and a Chromium build; set `CHROMIUM_PATH` to reuse an installed browser), then run `node scripts/update-asset-hash.js`.

The service worker names its cache after `ASSET_HASH`, a short hash of every file in its `ASSETS` list. After changing any precached file (or the list itself), run `node scripts/update-asset-hash.js` so installed copies pick up the update; `node scripts/validate-pwa.js` fails in CI when the hash is stale, when a precached or manifest file is missing, or when a file the page or the app's imports load is not precached. Network-first requests revalidate with the server (`cache: "no-cache"`), so a stale HTTP cache entry cannot pair an old file with a new release.

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
- `app.js` is the composition root: it builds the shared context (questions, saved progress, run state, an event emitter, and late-bound `actions`), creates every screen, and registers the service worker.
- `screens/` holds one module per part of the interface: the start page, progress tab, catalogue, exam resume card, quiz (with the run lifecycle and timer), result screen, and privacy controls, and the translation toggle and language picker. Each takes the shared context, so screens never import each other.
- `modules/` contains focused JavaScript helpers with no page dependencies where possible: storage, sampling, progress updates and queries, formatting, learner hints, tabs, dialogs, confirmation dialogs, exam resume snapshots, progress backups, an event emitter, the language registry, the lazy content loader, small preferences, and quiz rules.
- `questions.js` contains the question catalogue loaded by the page.
- `explanation-texts-*.js` contains one reviewed, question-specific learner explanation for each catalogue item.
- `explanations.js` attaches the reviewed explanation map to the question catalogue. These files load in the background after the first screen (`modules/content.js`), not as page scripts.
- `docs/explanation-guidelines.md` defines the evidence-informed rubric used to review and maintain explanations.
- `docs/ui-principles.md` defines the research-informed interaction and visual standards used for interface reviews.
- `docs/visual-identity.md` defines the reusable LiD Test Prep brand and visual system applied across every screen.
- `translations-en.js` and `translations-ru.js` contain the English and Russian translations of all 460 questions. They load when a learner turns translations on or searches the catalogue. `modules/languages.js` registers each language; `docs/data-provenance.md` explains how to add one, where the data comes from, and that the translations have not been reviewed by a professional translator.
- `site-config.js` holds the facts that cannot be known from the code: the public address and the operator's name, address and email. `scripts/generate-site.mjs` writes the canonical link, social image URLs, `robots.txt` and `sitemap.xml` from it; `scripts/validate-site.mjs` checks them; `scripts/render-share-card.mjs` renders `assets/share-card.png` from `scripts/share-card.html`.
- `docs/operations.md` explains CI, the cache-revision rule, releasing, the launch steps only the owner can do, and known limitations.
- `docs/data-provenance.md` records the official catalogue source and date, the catalogue refresh workflow, and how explanations and translations are maintained.
- `lid-v2-images/` contains image assets referenced by some questions.
- `assets/` contains the logo, favicon, and PWA icons.
- `scripts/render-icons.mjs` renders the PNG icons from the SVG sources in `assets/`.
- `scripts/browser/` holds the portable Playwright runner (`run-checks.mjs`), its `package.json`, and the in-page assertions in `checks/` that the Codex shell scripts reuse.
- `scripts/validate-pwa.js` checks the manifest, the precache list (including the lazily loaded explanation and translation files), and the cache revision; `scripts/update-asset-hash.js` regenerates `ASSET_HASH` in `service-worker.js`, with shared helpers in `scripts/pwa-assets.js`.
- `scripts/validate-data.js` validates catalogue structure, translation coverage for every registered language, learner explanations, and the exact official image-question set and file references.

## Catalogue Notes

The current local catalogue contains all 300 general questions and 160 state questions: 10 questions for each of the 16 Bundesländer. English and Russian translations cover every question; a question without a translation in a future language shows a plain message instead. Every catalogue item has a bespoke explanation that is validated for exact ID coverage and generic fallback wording.
