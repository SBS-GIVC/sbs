// Minimal service worker (optional)
// Keeps prior behavior but avoids inline scripts in index.html.

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Network-first; no caching by default.
});
