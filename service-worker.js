// ASSET_HASH covers every file in ASSETS. Regenerate it with
// `node scripts/update-asset-hash.js` after changing any of them.
const ASSET_HASH = "af2574bf8ae3";
const CACHE_NAME = `lid-test-prep-${ASSET_HASH}`;
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=catalogue",
  "./questions.js?v=catalogue",
  "./explanation-texts-001-115.js?v=catalogue",
  "./explanation-texts-116-230.js?v=catalogue",
  "./explanation-texts-231-345.js?v=catalogue",
  "./explanation-texts-346-460.js?v=catalogue",
  "./explanations.js?v=catalogue",
  "./translations-en.js?v=catalogue",
  "./translations-ru.js?v=catalogue",
  "./app.js?v=catalogue",
  "./modules/storage.js",
  "./modules/sampling.js",
  "./modules/progress.js",
  "./modules/hints.js",
  "./modules/tabs.js",
  "./modules/dialog.js",
  "./modules/confirm-dialog.js",
  "./modules/content.js",
  "./modules/languages.js",
  "./modules/preferences.js",
  "./modules/exam-session.js",
  "./modules/backup.js",
  "./modules/quiz-rules.js",
  "./modules/catalogue.js",
  "./modules/emitter.js",
  "./modules/format.js",
  "./modules/progress-queries.js",
  "./modules/readiness.js",
  "./modules/scheduling.js",
  "./screens/catalogue.js",
  "./screens/privacy.js",
  "./screens/progress.js",
  "./screens/quiz.js",
  "./screens/result.js",
  "./screens/resume.js",
  "./screens/start.js",
  "./screens/translation.js",
  "./assets/favicon.svg",
  "./assets/favicon-32.png",
  "./assets/apple-touch-icon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
  "./assets/lid-logo.svg",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate" || isFreshAsset(url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

function isFreshAsset(url) {
  return [".html", ".js", ".css", ".webmanifest"].some((suffix) => url.pathname.endsWith(suffix));
}

function networkFirst(request) {
  // no-cache revalidates with the server, so a stale HTTP cache entry cannot
  // pair an old file with the rest of a new release.
  return fetch(request, { cache: "no-cache" })
    .then((response) => cacheResponse(request, response))
    .catch(() => caches.match(request).then((cached) => {
      return cached || caches.match("./index.html");
    }));
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    return cached || fetch(request).then((response) => cacheResponse(request, response));
  });
}

function cacheResponse(request, response) {
  if (!response || !response.ok) return response;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  return response;
}
