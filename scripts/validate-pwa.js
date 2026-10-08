#!/usr/bin/env node
"use strict";

// Checks that the installable app and its offline cache are consistent: one
// missing precached file makes cache.addAll fail, which silently removes
// offline support for everyone.

const fs = require("node:fs");
const path = require("node:path");
const {
  ROOT,
  computeAssetHash,
  normalizeAsset,
  readAssetHash,
  readServiceWorker,
  readServiceWorkerAssets
} = require("./pwa-assets.js");

const errors = [];
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const isLocal = (reference) => reference && !/^([a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(reference);

function fail(message) {
  errors.push(message);
}

function requireFile(file, origin) {
  if (!exists(file)) fail(`${origin} points at ${file}, which does not exist.`);
}

const serviceWorker = readServiceWorker();
const assets = readServiceWorkerAssets(serviceWorker);
const precached = new Set(assets.map((asset) => normalizeAsset(asset).key));

assets.forEach((asset) => requireFile(normalizeAsset(asset).file, "service-worker.js ASSETS entry"));
if (precached.size !== assets.length) fail("service-worker.js ASSETS lists the same file twice.");

function requirePrecached(reference, origin) {
  const { key, file } = normalizeAsset(reference);
  requireFile(file, origin);
  if (!precached.has(key)) {
    fail(`${origin} loads ${key}, but service-worker.js ASSETS does not precache that exact URL, so the app would not load offline.`);
  }
}

// Manifest icons exist and are precached.
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
(manifest.icons || []).forEach((icon) => {
  if (!isLocal(icon.src)) return;
  requirePrecached(icon.src, "manifest.webmanifest icon");
});
["start_url", "scope"].forEach((field) => {
  if (manifest[field] !== "./") fail(`manifest.webmanifest ${field} should be "./" so the app works from any base path.`);
});
if (!(manifest.icons || []).some((icon) => /\b192x192\b/.test(icon.sizes || ""))) fail("manifest.webmanifest needs a 192x192 icon.");
if (!(manifest.icons || []).some((icon) => /\b512x512\b/.test(icon.sizes || ""))) fail("manifest.webmanifest needs a 512x512 icon.");
if (!(manifest.icons || []).some((icon) => icon.purpose === "maskable")) fail("manifest.webmanifest needs a maskable icon.");

// Everything the page loads must be precached; other references must exist.
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].forEach(([, src]) => {
  if (isLocal(src)) requirePrecached(src, "index.html script");
});
[...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)].forEach(([, href]) => {
  if (isLocal(href)) requirePrecached(href, "index.html link");
});
[...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].forEach(([, src]) => {
  if (!isLocal(src)) return;
  const { file } = normalizeAsset(src);
  requireFile(file, "index.html image");
});
[...html.matchAll(/<meta\b[^>]*\bcontent="([^"]+\.(?:png|jpe?g|svg|webp))"/g)].forEach(([, content]) => {
  if (isLocal(content)) requireFile(normalizeAsset(content).file, "index.html meta image");
});

// The static import graph of the app must be precached too.
const seen = new Set();
function walkImports(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const source = fs.readFileSync(path.join(ROOT, file), "utf8");
  [...source.matchAll(/(?:import|export)\s[^"']*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g)].forEach((match) => {
    const specifier = match[1] || match[2] || match[3];
    if (!specifier.startsWith(".")) return;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
    requirePrecached(resolved, `${file} import`);
    if (exists(resolved)) walkImports(resolved);
  });
}
walkImports("app.js");

// Local url() references in the stylesheet must exist.
const css = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
[...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].forEach(([, reference]) => {
  if (isLocal(reference)) requireFile(normalizeAsset(reference).file, "styles.css url()");
});

// Files that are loaded on demand (modules/content.js and the language
// registry) are not in index.html, so they are checked from their lists.
async function checkLazyContent() {
  const { EXPLANATION_ATTACH_FILE, EXPLANATION_TEXT_FILES } = await import("../modules/content.js");
  const { DEFAULT_LANGUAGE, LANGUAGES } = await import("../modules/languages.js");

  [...EXPLANATION_TEXT_FILES, EXPLANATION_ATTACH_FILE].forEach((file) => {
    requirePrecached(file, "modules/content.js lazy explanation file");
  });
  LANGUAGES.forEach((language) => {
    requirePrecached(language.file, `modules/languages.js ${language.code} translations`);
  });
  if (!LANGUAGES.some((language) => language.code === DEFAULT_LANGUAGE)) {
    fail(`modules/languages.js DEFAULT_LANGUAGE ${DEFAULT_LANGUAGE} is not in LANGUAGES.`);
  }
  // Nothing the page needs for its first screen should wait for these files.
  const lazyKeys = new Set([...EXPLANATION_TEXT_FILES, EXPLANATION_ATTACH_FILE, ...LANGUAGES.map((language) => language.file)]);
  [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].forEach(([, src]) => {
    if (lazyKeys.has(src)) fail(`index.html loads ${src} up front, but modules/content.js loads it on demand; remove the script tag.`);
  });
}

function finish() {
  // The cache name must change whenever a precached file does.
  const recordedHash = readAssetHash(serviceWorker);
  const allAssetsExist = assets.every((asset) => exists(normalizeAsset(asset).file));
  const currentHash = allAssetsExist ? computeAssetHash(assets) : "unknown";
  if (!allAssetsExist) {
    fail("service-worker.js ASSET_HASH was not checked because a precached file is missing.");
  } else if (!recordedHash) {
    fail('service-worker.js needs a `const ASSET_HASH = "…";` line; run `node scripts/update-asset-hash.js`.');
  } else if (recordedHash !== currentHash) {
    fail(`service-worker.js ASSET_HASH is ${recordedHash} but the precached files hash to ${currentHash}. Run \`node scripts/update-asset-hash.js\` so installed copies pick up the change.`);
  }
  if (!/const CACHE_NAME = `lid-test-prep-\$\{ASSET_HASH\}`;/.test(serviceWorker)) {
    fail("service-worker.js CACHE_NAME must be derived from ASSET_HASH.");
  }

  if (errors.length) {
    console.error(`PWA validation failed with ${errors.length} problem${errors.length === 1 ? "" : "s"}:`);
    errors.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
  }

  console.log(`PWA validation passed: ${precached.size} precached files, cache revision ${currentHash}.`);
}

checkLazyContent().then(finish, (error) => {
  console.error(`PWA validation could not check the lazy-loaded content: ${error.message}`);
  process.exit(1);
});
