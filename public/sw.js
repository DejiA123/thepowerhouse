// Minimal no-op service worker for debugging.
self.addEventListener('install', () => {
  console.log('🔧 Minimal SW: Installing and skipping waiting.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🔧 Minimal SW: Activating and claiming clients.');
  // Unregister the old, complex service worker.
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('🔧 Minimal SW: Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Do nothing. Let the browser handle the request.
  // This bypasses all caching logic from the old service worker.
  event.respondWith(fetch(event.request));
});

self.addEventListener('message', (event) => {
  console.log('🔧 Minimal SW: Ignoring message:', event.data);
  // Ignore all messages from the app.
});

console.log('🔧 Minimal SW: Loaded. All complex logic is disabled.');
