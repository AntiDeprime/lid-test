# LiD Test Prep

Static, mobile-first practice app for the German **Leben in Deutschland** / **Einbürgerungstest** question catalogue.

The app samples 33 questions per run: 30 general questions and 3 Berlin questions. The final result uses the Einbürgerung threshold of 17 correct answers out of 33.

## Run Locally

Open `index.html` directly in a browser.

No Python, build step, package manager, or local server is required.

## GitHub Pages

Deploy from the repository root:

1. Push this repository to GitHub.
2. Open repository settings.
3. Go to **Pages**.
4. Set **Source** to **Deploy from a branch**.
5. Select the branch and `/ (root)` folder.

GitHub Pages will serve `index.html` as the app entry point.

## Files

- `index.html` contains the complete one-page UI, CSS, and vanilla JavaScript app logic.
- `questions.js` contains the question catalogue loaded by the page.
- `explanations.js` adds learner-facing explanations to the question catalogue without changing the official answer data.
- `translations-en.js` contains local English translations for the bundled questions.
- `lid-v2-images/` contains image assets referenced by some questions.

## Catalogue Notes

The current local catalogue contains all 300 general questions and 10 Berlin state questions. This version is Berlin-only because the other Bundesland question sets are not present in the source material.
