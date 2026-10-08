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

The code is ready to go public; four facts only the owner can supply are not in the repository. `node scripts/validate-site.mjs` lists what is missing, and `node scripts/validate-site.mjs --production` fails until it is all filled in.

1. **The public address.** Set `origin` in `site-config.js` (a full `https://` URL ending in `/`; for a GitHub Pages project site that includes the repository path), then run `node scripts/generate-site.mjs` and commit what it changes: the canonical link and social image URLs in `index.html`, `robots.txt` and `sitemap.xml`. The share image `assets/share-card.png` is already rendered (`node scripts/render-share-card.mjs`, needs Inter). Crawlers read `robots.txt` only at the root of a host, so on a project site under a path the generated file is ignored; submit `sitemap.xml` in Google Search Console instead.
2. **Who is responsible.** Fill in `operator.name`, `operator.address` and `operator.email`. They appear in the Imprint and Privacy dialogs, which describe what the app really does (what is stored, the optional Google Analytics, how to withdraw consent, legal basis, rights). The wording follows common GDPR practice but is not legal advice; have it checked before launch, and check whether a full imprint is required for this site (§ 5 DDG).
3. **The analytics property.** The tag uses measurement ID `G-6LN5H6T5LW` (`modules/analytics.js`). Confirm it belongs to the operator, that Google Signals and data sharing are off in the property, and that the data-processing terms with Google are accepted. If the property keeps data for a known number of months, set `analyticsRetentionMonths` so the Privacy dialog says so.
4. **Rights to the content.** The questions and images come from the BAMF catalogue (7 May 2025). The repository does not record under what terms BAMF allows republishing them; confirm that before a public launch.

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
