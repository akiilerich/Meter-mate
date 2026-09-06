// Meter Tracker service worker — cache-first, offline-capable.
// Bump CACHE_NAME when shipping a new version so old caches get cleared.
const CACHE_NAME = 'meter-tracker-v3.5';
const APP_SHELL = [
  './meter-tracker.html',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// Cache-first for the app shell; network-first (with cache fallback) for
// anything else (e.g. the Google Fonts stylesheet), so the app still works
// offline even if a font request fails.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          // Only cache successful, same-origin-or-opaque responses
          if (response && (response.status === 200 || response.type === 'opaque')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline and not cached — nothing we can do
    })
  );
});
