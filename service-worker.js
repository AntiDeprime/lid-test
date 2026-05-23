const APP_REVISION = "2026-05-review-fixes";
const CACHE_NAME = `lid-test-prep-${APP_REVISION}`;
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=catalogue",
  "./questions.js?v=catalogue",
  "./explanations.js?v=catalogue",
  "./translations-en.js?v=catalogue",
  "./app.js?v=catalogue",
  "./modules/storage.js",
  "./modules/sampling.js",
  "./modules/progress.js",
  "./modules/hints.js",
  "./modules/tabs.js",
  "./modules/dialog.js",
  "./modules/quiz-rules.js",
  "./assets/favicon.svg",
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
  return fetch(request)
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
