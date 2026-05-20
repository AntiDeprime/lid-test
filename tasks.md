# LiD Test Prep Feature Tasks

## High Priority

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

## Medium Priority

- [ ] Add study mode separate from exam mode.
  - Let users browse and answer questions without a 33-question exam session.
  - Support practice by category, all general questions, and selected Bundesland questions.
  - Allow previous/next navigation without forcing a randomized run.

- [ ] Add bookmarks or pinned questions.
  - Let users mark difficult questions for later review.
  - Add a bookmarked-questions practice mode.
  - Persist bookmarks locally.

- [ ] Add question search and catalogue browsing.
  - Add a searchable list of all questions.
  - Support jumping directly to a question by number.
  - Add filters for general questions, state questions, incorrect questions, and bookmarked questions.

- [ ] Add basic statistics.
  - Show total questions attempted, accuracy, tests completed, and pass rate.
  - Show strongest and weakest areas if categories are added to the catalogue.
  - Show recent test results.

- [ ] Add privacy-friendly webpage visit monitoring.
  - Choose a lightweight analytics option for the static site, such as Plausible, GoatCounter, Cloudflare Web Analytics, or another no-cookie provider.
  - Track basic page visits and referral sources without collecting unnecessary personal data.
  - Document any required setup, script snippet, and privacy implications in the README.

- [ ] Add support for all 16 Bundesländer.
  - Extend the question catalogue from Berlin-only to the full BAMF set: 300 general questions plus 160 state-specific questions.
  - Add a Bundesland selector before starting a test.
  - Sample 30 general questions and 3 questions from the selected Bundesland.

## Lower Priority

- [x] Add answer explanations.
  - Add short explanations for important or confusing questions.
  - Show explanations after answering and during review.
  - Keep official answer text separate from explanatory text.

- [x] Add English translations for bundled questions.
  - Add optional English translations for German prompts and answers.
  - Keep German as the default and official test language.

- [ ] Add richer learner hints and multilingual support.
  - Add optional learner hints for difficult German civic terms.
  - Consider multilingual translations beyond English.
  - Keep German as the default and official test language.

- [ ] Make the app installable as a PWA.
  - Add a web app manifest.
  - Add a service worker for asset and question-cache support.
  - Verify offline loading after deployment.
