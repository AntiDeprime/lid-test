# Data provenance and update workflow

This page records where each kind of data in the app comes from, who can change it, and what must stay true when it changes. The official questions are the one part nobody here is free to edit; everything else is our own work and is kept in separate files so the two never mix.

## The layers

| Layer | Files | Source | Language |
| --- | --- | --- | --- |
| Official questions and answer key | `questions.js` | BAMF catalogue (below) | German |
| Official question images | `lid-v2-images/` | BAMF catalogue, extracted from the PDF | none |
| Learner explanations | `explanation-texts-*.js`, `explanations.js` | Written for this app | English |
| Translations | `translations-<code>.js`, registered in `modules/languages.js` | Written for this app | English, Russian |
| Reference extract | `gesamtfragenkatalog-lebenindeutschland-v2.md` | Extracted from the BAMF PDF | German |

Only `questions.js` and the images may claim to be the official test. Explanations and translations are study aids, and the app labels translations as unofficial. German stays the default and the only exam language.

## The official catalogue

- **Authority:** the Federal Office for Migration and Refugees (BAMF), *Gesamtfragenkatalog zum Test „Leben in Deutschland“ und zum „Einbürgerungstest“*. The reference extract is stamped *Stand der PDF-Vorlage: 07.05.2025*, and the BAMF Online-Testcenter is the second reference for answers.
- **Size:** 460 questions. Ids 1–300 are the general questions. Ids 301–460 are the Bundesland questions, ten per state in alphabetical order (301–310 Baden-Württemberg, 311–320 Bayern, 321–330 Berlin, and so on to 451–460 Thüringen). `id` equals the catalogue's own question number (`sourceNumber`); keep it that way, because saved progress, bookmarks and exam resumes are keyed by id.
- **Images:** 43 questions depend on an image (flags, coats of arms, maps, the ballot paper). They are the exact set listed in `OFFICIAL_IMAGE_QUESTION_IDS` in `scripts/validate-data.js`.
- **How it got into the repository:** `gesamtfragenkatalog-lebenindeutschland-v2.md` is a Markdown extract of the PDF (300 general questions and Berlin's ten). `questions.js` holds all 460 and was produced from the PDF with tooling that is not kept in this repository, so there is no import script to re-run. A catalogue refresh is therefore a manual, reviewed edit, described next.

## Refreshing the catalogue

When BAMF publishes a new catalogue:

1. Download the new PDF and note its date. Update the date above and in `gesamtfragenkatalog-lebenindeutschland-v2.md`.
2. Compare every question with `questions.js`: prompt, the four options and their order, the marked answer, and whether the question has an image. Do not trust a diff of extracted text alone; render the image questions and check them against the PDF pages.
3. If a question was reworded, removed or added, decide for each one what happens to its explanation and translations. A changed answer key or prompt means the explanation and every translation must be rewritten, not kept.
4. If question numbers move, saved progress would silently point at the wrong questions. Add a step to the migration chain in `modules/storage.js` (and bump `STORAGE_VERSION`) that remaps ids, and cover it in `scripts/validate-progress.mjs`.
5. Run `node scripts/validate-data.js`, `node scripts/validate-progress.mjs` and `node scripts/validate-pwa.js`, then `node scripts/update-asset-hash.js`, then the browser checks.

`scripts/validate-data.js` is the gate. It fails when:

- the catalogue is not exactly 460 questions (300 general, 160 state, ten for each of the 16 Bundesländer), ids repeat, or a question has other than four options with exactly one correct;
- the image set differs from the 43 official image questions, or an image file or label is missing;
- any question lacks exactly one bespoke explanation, or an explanation is generic, too thin or too long;
- any registered language lacks a translation for any question, has an entry for an id that is not a question, has an empty prompt or option, has a different option count than the German, uses the wrong writing system in a prompt, or turns two different German options into the same text.

## Explanations

Explanations are written by hand per question id in four files, attached to the questions at run time by `explanations.js`. They are English only. `docs/explanation-guidelines.md` is the review standard: accurate against the BAMF key, specific to the question, explaining the right answer and every distractor. They load after the first screen (`modules/content.js`) because they are only needed once someone has answered.

## Translations

Each language is one file, `translations-<code>.js`, that defines `window.LID_TRANSLATIONS_<CODE>` as `{ <id>: { prompt, options: [...] } }`, with the options in the same order as the German ones. The registry in `modules/languages.js` names the file, the global and the writing system. Translations load only when a learner turns them on or searches the catalogue, and they are precached by the service worker so they work offline.

To add a language: write the file, add a registry entry, add the file to `ASSETS` in `service-worker.js`, run `node scripts/update-asset-hash.js`, and run the validations. A language must cover all 460 questions to pass validation.

### How the current translations were made

- **English** (`translations-en.js`): written for this app in May 2026, covering the general questions and Berlin. The remaining 150 Bundesland questions were added in October 2026 from per-question-type tables (see below).
- **Russian** (`translations-ru.js`): produced in October 2026 with an AI assistant (Claude Code). The 300 general questions were translated from the German text, with the English translation as a cross-check, in four batches that followed one terminology list. The 160 Bundesland questions come from the same tables as the English ones.
- **Bundesland questions:** these repeat ten question types for every state (coat of arms, a district, term of the state parliament, voting age in local elections, flag colours, where to learn about politics, capital, a map position, head of government, a minister the state does not have). They were translated once per question type and answer wording and filled in per state, so place names, titles and colours are consistent. The tables are not kept in the repository; the generated entries are the record.
- **Review status:** no translation has been reviewed by a professional translator or a native speaker, and none has been proofread line by line. The Russian text was spot-checked only. The app tells learners the translations are unofficial.

### Russian terminology

Keep these choices when editing so the file stays consistent: Grundgesetz → Основной закон; Bundestag → Бундестаг; Bundesrat → Бундесрат; Bundesland → федеральная земля; Bundeskanzler → федеральный канцлер; Ministerpräsident → министр-президент (and only Premierminister → премьер-министр, so distractors stay distinct); Landkreis → район (Landkreis); Bezirk → округ (Bezirk); Regierender Bürgermeister → правящий бургомистр; Einbürgerung → натурализация; Saarland → Саар. German terms with no common Russian equivalent keep the German word in parentheses.

Questions whose Russian wording the translator was least sure of, worth reviewing first: 19, 38, 53, 54, 60, 62, 80, 92, 102, 137, 143, 144, 145, 158, 224, 260, 279, 282, 286, 290 and 299.

## What the app does not do

- It does not fetch questions, explanations or translations from any server other than its own static files.
- It does not check the answer key against BAMF automatically. The only protection against a wrong key is the review in step 2 above.
