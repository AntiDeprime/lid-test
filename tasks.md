# LiD Test Prep Feature Tasks

## High Priority

- [x] Split `app.js` by screen.
  - Move the start page, progress tab, catalogue, exam resume card, result screen, quiz screen (run lifecycle, timer, question and answer rendering), and privacy controls into `screens/`, each created from one shared context; `app.js` shrinks from about 1,600 lines to a 75-line composition root.
  - Screens never import each other: they react to `progress-changed` and `screen-shown` events and call each other through late-bound `actions`.
  - Move answer recording, bookmarking, formatting, and the progress queries (weak, bookmarked, incorrect, area stats, study sets, catalogue status) into pure modules with unit tests in `scripts/validate-progress.mjs`.
  - No user-facing change; the browser checks, including the keyboard and screenshot comparisons, pass unchanged.

- [x] Run portable browser checks in CI.
  - Add `scripts/browser/run-checks.mjs`, a Node and Playwright runner with its own `package.json` and lockfile: it serves the repo itself, so it needs no Python server or Codex wrapper.
  - Share the in-page assertions with the two Codex shell scripts through `scripts/browser/checks/`.
  - Add an offline check that stops the server and reloads from the service worker cache, a 390px layout check (launch cards in the first screen, compact toolbar, feedback under the answers, reachable Next, no overflow) with screenshots, and an axe-core scan of thirteen app states.
  - Fix what the scan found: answer buttons and the result "Start page" button now contain their visible text in their accessible name.
  - Run it as a second GitHub Actions job and keep the screenshots when it fails.
  - Harden the layout against wide fonts and long German words, which the first CI run exposed (it renders DejaVu Sans, not Inter): grid tracks and answer text now shrink with `minmax(0, 1fr)` and wrap long words, the hero heading scales down on small phones, and a `fit` section checks all 460 questions at 360px and 390px. `TEST_FONT` reproduces the CI font locally.

- [x] Validate PWA assets and derive the cache revision from the files.
  - Add `scripts/validate-pwa.js`: every manifest icon and every `ASSETS` entry exists, everything `index.html` loads and every module `app.js` imports is precached under the exact URL it is requested with, and the manifest keeps its install-critical fields.
  - Replace the hand-bumped `APP_REVISION` with `ASSET_HASH`, a hash of all precached files written by `node scripts/update-asset-hash.js` and checked in CI, so installed copies update whenever an asset changes.
  - Revalidate network-first requests in the service worker so a stale HTTP cache entry cannot pair an old module with a new release.
  - Document the release step in the README and run the check in GitHub Actions.

- [x] Protect saved progress with migrations and a file backup.
  - Replace the "version mismatch resets everything" load path with a migration chain (`migrateProgress`), so a future storage version bump upgrades saved progress instead of discarding it.
  - Keep progress the app cannot read under `lidTestPrepProgress.unreadable` instead of overwriting it, and sanitize loaded progress to the fields the app reads.
  - Add "Export backup" and "Import backup" to the Progress tab: a JSON file with the progress, validated and confirmed before it replaces what is saved, with Export disabled until there is progress.
  - Mention the backup in the reset confirmation, and cover migration, normalization, and backup parsing in `scripts/validate-progress.mjs` and the import flow in the browser flow check.

- [x] Tighten the quiz layout.
  - Show the correct/not-quite verdict and the "Why" explanation directly under the answers, with a check or cross mark as well as colour.
  - Keep Previous and Next in a bar that sticks to the bottom of the screen on mobile so the next action never scrolls away.
  - Stack the toolbar buttons icon-over-label in two groups on mobile so the toolbar takes two short rows instead of four stretched ones, keeping labels and 44px targets.
  - Keep the exam simulation free of feedback and verify study, review, and exam flows at 390px and desktop widths.

- [x] Streamline the first-run start screen.
  - Show the analytics consent choice in the page flow below the launch cards instead of a fixed banner that covers them.
  - Keep the mobile headline to two lines and move the proof points below the launch cards so both launch cards sit inside the first 844px screen at 390px.
  - Replace the first-run progress zeros and disabled queue buttons with one "Nothing studied yet" note, and show queues and stats once there is progress.
  - Hide the question preview card on mobile and keep the headline accent in the mint family so gold stays reserved for milestones.
  - Verify at 390px and desktop widths and run the smoke and flow browser checks.

- [x] Replace the app icon with a refined LiD mark.
  - Redraw the monogram so it reads as LiD at every size: L and i share one connected stroke, D stands apart, and the dot of the i is the paper-white accent on the mint tile.
  - Add PNG favicon, Apple touch, 192px, 512px, and maskable icons next to the SVG sources, and list them in the web app manifest and the `<head>`.
  - Precache the new icon files and bump the service-worker revision so installed copies update.
  - Update `docs/visual-identity.md` and the README with the new mark and the `scripts/render-icons.mjs` regeneration step.
  - Verify the start-screen lockup, favicon, and manifest icons through a local static server.

- [x] Complete the official question-image catalogue.
  - Audit all 460 questions against the BAMF catalogue dated 7 May 2025.
  - Restore the six missing general-question visuals for questions 70, 176, 181, 187, 216, and 235.
  - Validate the exact 43 official image-dependent questions and check every image flow at a 390px viewport.

- [x] Restore the missing ballot illustration for general question 130.
  - Add the official four-ballot graphic referenced by the question.
  - Validate that questions with numbered image choices cannot omit their image data.
  - Verify the question flow and image legibility at a mobile viewport.

- [x] Establish and apply a complete visual identity.
  - Define the brand idea, personality, logo use, palette, typography, shape, depth, graphic language, component expression, motion, accessibility guardrails, and interface voice.
  - Add a recognizable product lockup and stronger hero/launch hierarchy to the start screen.
  - Extend the same visual language across progress, catalogue, learning, quiz, results, review cards, consent, and legal dialogs.
  - Keep the visual system responsive, accessible, restrained enough for sustained study, and free of decorative imagery that competes with question content.
  - Verify the start, quiz, catalogue, result, and overlay experiences at mobile and desktop widths.

- [x] Polish and clarify the quiz interface.
  - Define a research-informed set of reusable UI principles for hierarchy, grouping, consistency, touch targets, visible state, accessibility, and responsive behavior.
  - Separate question tools from session navigation instead of allowing unrelated controls to wrap into an ambiguous cluster.
  - Give every quiz action a consistent shape, a visible icon-and-text label, a 44px touch target, and a clear focus/pressed state.
  - Refresh the quiz panel, answer cards, progress treatment, and feedback states for a calmer, more professional learning experience.
  - Verify the toolbar at a 390px mobile viewport and expose question progress to assistive technology.

- [x] Redesign the first page into a clear, user-friendly introduction.
  - Explain that the app helps users prepare for the German Leben in Deutschland / Einbürgerungstest.
  - State the test format clearly: 33 questions, 30 general questions, 3 Bundesland questions, 17 correct answers needed to pass.
  - Show what users can do in the app: start a mock test, practice questions, review mistakes, and track progress as those features become available.
  - Add clear primary and secondary actions, such as "Start mock test" and "Practice questions".
  - Keep the first screen useful on mobile without hiding the main action too far down the page.

- [x] Add SEO-friendly page structure and metadata.
  - Update the page title to include high-intent search terms such as "Leben in Deutschland Test" and "Einbürgerungstest".
  - Add a concise meta description explaining the app and its exam-prep purpose.
  - Use one clear `h1` on the start page and structured `h2` sections for features, test format, and FAQ-style content.
  - Add Open Graph and Twitter card metadata for better link previews.
  - Add canonical URL support once the production domain is known. Production domain is not available in the repo yet, so no canonical URL was added.
  - Add structured data where useful, such as `WebApplication` or FAQ schema.

- [x] Improve result review.
  - Show all missed questions, not only the first six.
  - Add links from result items back into practice mode.
  - Show selected answer, correct answer, and explanation when available.

- [x] Persist progress locally.
  - Store answered questions, correct counts, wrong counts, and completed test history in `localStorage`.
  - Track progress across browser sessions.
  - Add a reset-progress action.

- [x] Add a wrong-answer review mode.
  - Save incorrectly answered questions across runs.
  - Let users practice only weak or missed questions.
  - Remove a question from the weak list after repeated correct answers.

- [x] Add timed exam mode.
  - Add a 60-minute countdown timer for realistic exam simulation.
  - Auto-finish the test when time expires.
  - Show elapsed or remaining time on the result screen.

- [x] Separate untimed practice from timed mock tests.
  - Make "Practice questions" start an untimed practice run instead of another 33-question exam.
  - Keep practice results separate from completed mock-test history.
  - Keep unanswered timeout items out of weak-question progress.

- [x] Add production-ready analytics privacy controls.
  - Gate Google Analytics behind an explicit consent flow or configure privacy-preserving consent defaults before loading tracking.
  - Add visible privacy and imprint/legal links appropriate for a Germany-focused education app.
  - Document the production privacy setup in the README.

- [x] Split learning feedback from realistic exam simulation.
  - Keep instant correctness, explanations, and weak-question tracking in study/practice modes.
  - Add a true exam-simulation mode that withholds correctness and explanations until the result screen.
  - Make the start-page copy clearly distinguish study practice from exam simulation.
  - Verify that exam simulation still uses 30 general questions, 3 selected Bundesland questions, a 60-minute timer, and the 17-correct pass threshold.

## Medium Priority

- [x] Expand practice into full study mode.
  - Let users browse questions without a randomized run.
  - Support practice by category, all general questions, and selected Bundesland questions.
  - Allow previous/next navigation.
  - Keep answers hidden until the user selects an option.
  - Start with questions that have no saved attempts before showing already studied questions.

- [x] Add home navigation from quiz and result screens.
  - Let users return to the start page without restarting the browser session.
  - Confirm before leaving an answered active run, while making clear that selected answers are already saved.

- [x] Add bookmarks or pinned questions.
  - Let users mark difficult questions for later review.
  - Add a bookmarked-questions practice mode.
  - Persist bookmarks locally.

- [x] Add question search and catalogue browsing.
  - Add a searchable list of all questions.
  - Support jumping directly to a question by number.
  - Add filters for general questions, state questions, incorrect questions, and bookmarked questions.

- [x] Add basic statistics.
  - Show total questions attempted, accuracy, tests completed, and pass rate.
  - Show strongest and weakest areas if categories are added to the catalogue.
  - Show recent test results.

- [x] Add webpage visit monitoring.
  - Added consent-gated Google Analytics 4 support with measurement ID `G-6LN5H6T5LW`.
  - Track basic page visits and referral sources through GA4 after explicit consent.
  - Documented the setup and privacy/consent behavior in the README.

- [x] Add support for all 16 Bundesländer.
  - Extend the question catalogue from Berlin-only to the full BAMF set: 300 general questions plus 160 state-specific questions.
  - Add a Bundesland selector before starting a test.
  - Sample 30 general questions and 3 questions from the selected Bundesland.

- [x] Hide catalogue answer spoilers by default.
  - Do not show correct answers in the catalogue list unless the user explicitly reveals them.
  - Keep search and jump-to-question flows useful without exposing answers prematurely.
  - Preserve answer visibility after a user opens and answers a study question.

- [x] Improve progress and mastery statistics.
  - Separate repeated answer attempts from unique questions attempted.
  - Add a clearer mastery metric that cannot be inflated by repeating one easy question.
  - Keep exam-simulation pass rate separate from study/practice accuracy.
  - Show weak-question and bookmark counts as actionable queues, not general accuracy.

- [x] Simplify the start-page information architecture.
  - Keep the first viewport focused on the primary actions, Bundesland selection, and current progress.
  - Move FAQ, feature copy, and the full catalogue into collapsible sections, tabs, or lower-priority views.
  - Make repeat-user workflows faster on mobile.
  - Verify the first screen at mobile and desktop widths after changes.

- [x] Clarify Bundesland selection copy.
  - Explain that the selected Bundesland should match the user's primary residence for the state-specific exam questions.
  - Update labels and FAQ copy from generic "Mock test Bundesland" wording to clearer residence-based language.
  - Keep the selected Bundesland visible in exam-simulation and result context.

- [x] Expand browser coverage for critical flows.
  - Add checks for completing an exam simulation and seeing the correct pass/fail result.
  - Add checks for timeout behavior and unanswered-question handling.
  - Add checks for weak-question clearing, bookmarked-question review, translation fallback, catalogue jump, and reset progress.
  - Keep `scripts/browser-smoke-check.sh` fast, and add deeper checks as a separate script if needed.

## Lower Priority

- [x] Add CI validation before more feature work.
  - Run catalogue/data validation on pushes and pull requests.
  - Run pure app logic validation on pushes and pull requests.
  - Smoke-test that the static app is served successfully in CI.

- [x] Fix misleading active-run discard copy.
  - Make unfinished exam simulations clear that the result is not saved when leaving early.
  - Keep study/practice copy clear that already selected answers are saved locally.

- [x] Extract more app logic into focused modules.
  - Move catalogue filtering, search normalization, and catalogue summary copy into a pure helper module.
  - Add focused Node validation for the extracted catalogue helpers.
  - Include the new helper module in the service-worker cache list.

- [ ] Add production privacy and legal controls.
  - Add a real production privacy page or section with controller/contact details, legal basis, local-storage behavior, analytics behavior, and retention notes.
  - Add an explicit analytics revocation path after consent.
  - Replace placeholder-style imprint copy with production-ready legal details before public launch.

- [ ] Add production SEO assets.
  - Add canonical URL support when the production domain is known.
  - Add `robots.txt` and `sitemap.xml`.
  - Use absolute production URLs for Open Graph and Twitter images.

- [ ] Improve catalogue search quality and spoiler handling.
  - Add diacritic-tolerant search and ranked matches.
  - Highlight matched text in catalogue results.
  - Decide whether hidden answer text should remain searchable before reveal.

- [x] Add resume support for interrupted exam simulations.
  - Persist in-progress exam run state, selected answers, selected Bundesland, and start time.
  - Resume or discard stale unfinished exams explicitly.
  - Keep the timer accurate after refresh or mobile browser suspension.
  - Offer the unfinished exam as a "Resume your exam" card on the start page with Resume and Discard actions; an exam whose 60 minutes passed while away offers "See result" instead, dated to when the time ran out.
  - Ask before a new exam replaces an unfinished one, clear the saved exam when it finishes or the learner leaves it, and cover the pure snapshot logic in `scripts/validate-progress.mjs` and the resume flows in the browser flow check.

- [x] Make browser flow tests easier to maintain.
  - Move large inline Playwright assertions out of the shell script.
  - Keep fast smoke checks separate from deeper flow checks.
  - Make the deeper browser check practical to run in CI.

- [ ] Document data provenance and update workflow.
  - Record the official catalogue source, source date, and import/update process.
  - Add validation expectations for future catalogue refreshes.
  - Document how explanations and translations are maintained separately from official answer data.

- [x] Replace native confirmation dialogs with app dialogs.
  - Use the existing modal helper for reset-progress and leave-run confirmations.
  - Preserve focus management and mobile-friendly copy.
  - Focus the safe "Keep going" action first, dismiss with Escape, the close button, or the backdrop, and close any dialog that is replaced so its keyboard handler is released.
  - Cover the exam leave, study leave, and reset-progress dialogs in the browser flow check.

- [x] Add accessibility and visual regression checks.
  - Scan thirteen app states with axe-core (done with the portable browser checks).
  - Add a `keyboard` section that drives the app with real key presses: visible focus rings on the start page, the analytics choice, tab arrows, catalogue jump, answering with Space, a result-screen practice link, the leave dialog (safe focus, trap, Escape, focus restore), and a whole exam answered from the keyboard.
  - Fix what it found: after a screen change focus now moves to the new screen's heading (question, result, start page) and to the question heading after Next and Previous, and choosing from the consent banner hands focus to the next control instead of dropping it to the page body.
  - Add a `visual` section that compares eleven key screens (phone, desktop, saved progress, dialog, result) with committed baselines in `scripts/browser/baselines/`, rendered in a pinned font with Chromium's hinting and LCD text off and a 0.8% pixel tolerance, and regenerates them with `UPDATE_BASELINES=1`.

- [ ] Reduce first-load payload as content grows.
  - Consider lazy-loading translations and explanations.
  - Keep first exam-start performance fast on mobile.

- [ ] Expand operational documentation.
  - Document CI, release checks, cache-bump rules, production privacy requirements, and known limitations.

- [x] Address architecture and UX review follow-ups.
  - Extract reusable exam and answer rules from the main app wiring.
  - Make mastery recover after later correct study attempts.
  - Keep answered options keyboard-reviewable after selection.
  - Reduce inactive queue-button weight and improve first-visit consent layout.
  - Add focused progress and quiz-rule validation.

- [x] Add a site logo and favicon.
  - Created a lowercase connected pen-stroke LiD mark on the app's primary cyan button background.
  - Added the SVG favicon and wired it into the app metadata.
  - The mark was later redrawn; see "Replace the app icon with a refined LiD mark."

- [x] Add answer explanations.
  - Add short explanations for important or confusing questions.
  - Show explanations after answering and during review.
  - Keep official answer text separate from explanatory text.

- [x] Improve answer explanation quality.
  - Rewrite repetitive generated explanations into clearer learner-facing explanations.
  - Explain German-specific institutions, parties, rights, offices, elections, history, and Berlin terms where relevant.
  - Keep explanation copy separate from official question and answer data.
  - Replace lazy fallback explanation copy with topic-aware notes and validation that catches thin explanations.

- [x] Audit every answer explanation against an evidence-informed rubric.
  - Replace reusable topic fragments with one bespoke explanation for each of the 460 questions.
  - Explain the decisive fact for the correct option and the concrete mismatch in every distractor.
  - Remove abstract openings, repeated definitions, generic test-taking advice, and unrelated background.
  - Document the maintenance rubric and validate exact explanation coverage.

- [x] Add English translations for bundled questions.
  - Add optional English translations for German prompts and answers.
  - Keep German as the default and official test language.

- [x] Add richer learner hints.
  - Add optional learner hints for difficult German civic terms.
  - Keep German as the default and official test language.

- [x] Make the app installable as a PWA.
  - Add a web app manifest.
  - Add a service worker for asset and question-cache support.
  - Verify offline loading after deployment.

- [x] Split the single-page JavaScript into smaller modules.
  - Separate question sampling, storage/progress, quiz state transitions, catalogue rendering, and statistics rendering.
  - Keep the app build-free unless a module strategy requires a documented local-server workflow.
  - Add focused tests around pure sampling and progress functions once separated.
