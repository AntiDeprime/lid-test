# Operations

How the checks, the offline cache, and the launch configuration work, and what is still open. For the data itself see [data-provenance.md](data-provenance.md).

## Checks and CI

`.github/workflows/validate.yml` runs on every push and pull request.

| Job | What it runs | What it protects |
| --- | --- | --- |
| `static-app` | `validate-data.js`, `validate-progress.mjs`, `validate-pwa.js`, `validate-site.mjs`, then serves the repository and fetches `index.html` | catalogue, translations and explanations; pure logic (progress, scheduling, readiness, languages, consent, legal text); manifest, precache list and cache revision; launch configuration consistency |
| `browser-checks` | `scripts/browser/run-checks.mjs` in Chromium (Playwright) | the sections `smoke`, `flow`, `offline`, `content`, `privacy`, `layout`, `fit`, `keyboard`, `review`, `visual` and `a11y`, described in the README |

Run all of it locally before pushing; the README has the commands. Two things differ between machines and cause most surprises:

- **Fonts.** GitHub's runner has no Inter and falls back to DejaVu Sans, which is wider and exposes overflow that passes on a developer machine. Reproduce with `TEST_FONT="DejaVu Sans" node run-checks.mjs`. The `visual` section always renders in DejaVu Sans with pinned Chromium flags and allows 0.8% of pixels to differ.
- **Baselines.** After an intended visual change run `UPDATE_BASELINES=1 ONLY=visual node run-checks.mjs`, look at the changed images in the diff, and commit them. Do not regenerate to make a failure go away.

## The offline cache

`service-worker.js` precaches everything in its `ASSETS` list, and the cache name contains `ASSET_HASH`, a hash of those files.

- After changing **any** file in `ASSETS`, run `node scripts/update-asset-hash.js` and commit the result. CI fails on a stale hash, because installed copies would keep serving the old files.
- Every file the app loads must be listed with the exact URL it is requested with, including the `?v=catalogue` suffix where it has one. `validate-pwa.js` checks index.html, the static import graph, and the lazily loaded explanation and translation files.
- A new module, screen, language or data file therefore needs an `ASSETS` entry. One missing file makes `cache.addAll` fail and silently removes offline support for everyone.
- `site-config.js` is precached; `robots.txt`, `sitemap.xml` and the share image are for crawlers and are not.

## Releasing

1. Branch, change, and run the validators and the browser checks.
2. If a precached file changed, run `node scripts/update-asset-hash.js`.
3. Update `tasks.md` and the README in the same change when behaviour or commands change.
4. Open a pull request and wait for both CI jobs.
5. Merge; the site is static, so deploying is publishing the repository root (the README describes GitHub Pages).

## Launching

The code is ready to go public. The public address, the operator's name and email, and the ownership of the analytics property are set; what is still open is listed below. `node scripts/validate-site.mjs` lists what is missing in the configuration, and `node scripts/validate-site.mjs --production` fails until it is all filled in (today: the postal address).

1. **The public address. Set:** `origin` in `site-config.js` is `https://alxy.sh/lid-test/`, and `node scripts/generate-site.mjs` has written the canonical link and social image URLs in `index.html`, `robots.txt` and `sitemap.xml`. Rerun the generator and commit what it changes whenever `origin` changes. The share image `assets/share-card.png` is rendered by `node scripts/render-share-card.mjs` (needs Inter). Crawlers read `robots.txt` only at the root of a host, so under `/lid-test/` the generated file is ignored: serve its `Sitemap:` line from `https://alxy.sh/robots.txt`, or submit `sitemap.xml` in Google Search Console.
2. **Who is responsible. Partly set:** `operator.name` is Aleksei Shchetinin and `operator.email` is antideprime@gmail.com, as given by the owner. `operator.address` is **empty and must come from the owner; never guess it.** Until it is set the Imprint and Privacy dialogs show name and email only. The wording follows common GDPR practice but is not legal advice; have it checked before launch, and check whether a full imprint with a postal address is required for this site (§ 5 DDG).
3. **The analytics property.** The tag uses measurement ID `G-6LN5H6T5LW` (`modules/analytics.js`); the owner confirmed the property is his. Still to do in the property itself: turn Google Signals and data sharing off, accept the data-processing terms, and note the retention period. If the property keeps data for a known number of months, set `analyticsRetentionMonths` so the Privacy dialog says so.
4. **Rights to the content. Not cleared.** See the next section.

### What BAMF's published terms say about reuse (checked 8 October 2026)

Read on bamf.de through a page-reading tool, so reread the Impressum yourself before relying on the wording below. This is a research note, not legal advice.

- **No licence for the questions was found.** The catalogue download page ("Datum: 26.05.2025", file updated 3 September 2025), the Online-Testcenter page and the BAMF Impressum contain no licence (no Creative Commons, no Datenlizenz Deutschland), no terms of use, and no statement allowing or forbidding copying or republishing. The only notice is the site-wide "© 2026 Bundesamt für Migration und Flüchtlinge". The catalogue is presented as preparation material for people taking the test, which is not the same as permission to republish it.
- **Images.** For images without a credit the Impressum says BAMF is "Urheber und damit Inhaber der ausschließlichen Nutzungsrechte" (author and holder of the exclusive rights of use), and it tells anyone who wants to use one to contact the press office ("wenden Sie sich an unsere Pressestelle"). That covers the unattributed catalogue images (flags, coats of arms, maps, the ballot paper) until BAMF says otherwise.
- **Third-party photographs.** Five image questions carry a photographer credit inside the catalogue itself: 55 and 216 (© Deutscher Bundestag, Achim Melde and Janine Schmitz), 70 and 181 (© Bundesregierung, Engelbert Reineke), 235 (© Bundesregierung, Richard Schulze-Vorberg). The credit is part of each prompt in `questions.js`, so the app already shows it. Reusing these photographs may need permission from those bodies, not only from BAMF.
- **Not settled.** Whether short test questions and their answer options are protected by copyright, whether the catalogue counts as an official work that is free of copyright (§ 5 UrhG), and whether the collection is protected as a database are legal questions this research cannot answer.
- **The edition may have moved on.** The download page is dated 26 May 2025, but the extract in this repository is stamped 7 May 2025. The PDF could not be downloaded from the build container, so nobody has compared the two. Compare them before launch (see `docs/data-provenance.md`, "Refreshing the catalogue").

Recommended next step: ask the BAMF press office in writing whether the questions and images may be republished in a free, non-official practice app, and keep the answer in `docs/data-provenance.md`. The owner decides whether to launch, or to launch without the unattributed images, before that answer arrives.

## What the app already does for privacy

- Nothing is sent to a server of the app; progress, bookmarks, an unfinished exam, the translation language and the analytics choice live in `localStorage`.
- Analytics is off until the user chooses to allow it, and the choice can be reversed from the start page footer at any time. Withdrawing stops collection on the open page, removes the `_ga` cookies the page can reach, and keeps the tag from loading on later visits (checked by the `privacy` browser section).
- The tag runs without advertising storage, Google Signals or ad personalization.

## Known limitations

- Translations are unreviewed by a translator or native speaker; the Russian wording that is least certain is listed in `docs/data-provenance.md`.
- There is no import tooling for the BAMF catalogue; a refresh is a manual, reviewed edit.
- Option translations are part of each answer button's accessible name, so a screen reader announces them in the German voice. Turn translations off for a clean German reading.
- Explanations are English only.
- The exam-readiness percentage is a cautious estimate from the learner's own answers, not a prediction validated against real exam results.
- `robots.txt` cannot be served from a repository path on a shared host (see Launching).
