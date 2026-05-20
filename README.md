# LiD Test Prep

Static, mobile-first practice app for the German **Leben in Deutschland** / **Einbürgerungstest** question catalogue.

The app samples 33 questions per run: 30 general questions and 3 Berlin questions. The final result uses the Einbürgerung threshold of 17 correct answers out of 33.

Study mode lets users browse all questions, only general questions, or the Berlin Bundesland question set. It starts with questions that have no saved attempts, then continues with already studied questions. Answers stay hidden until the user selects an option, and selected answers are saved immediately.

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
