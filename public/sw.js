const CACHE_NAME = 'note-app-shell-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/auth.js',
  '/app.js',
  '/firestore_ops.js',
  '/storage_ops.js',
  // Add paths to any specific Firebase SDK files you might self-host, though not common with ESM imports from CDN.
  // For CDN imports (like firebase/*.js from gstatic.com), caching them here can be tricky due to
  // opaque responses if not handled carefully with `cache.put(e.request, response.clone())` and ensuring CORS.
  // It's often better to let the browser cache CDN resources or use workbox for more complex strategies.
  // For this basic setup, we'll focus on local assets.
  '/favicon.ico' // Example: if you have a favicon
];

self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[ServiceWorker] Failed to cache app shell:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  // Remove old caches if any - useful when CACHE_NAME changes
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of open clients without waiting for reload
});

self.addEventListener('fetch', event => {
  console.log('[ServiceWorker] Fetch event for ', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('[ServiceWorker] Found in cache:', event.request.url);
          return response; // Serve from cache
        }
        console.log('[ServiceWorker] Network request for ', event.request.url);
        return fetch(event.request) // Fetch from network
          .then(networkResponse => {
            // Optional: Cache new requests dynamically if needed (more advanced)
            // Be careful with what you cache, especially for POST requests or API calls.
            // if (event.request.method === 'GET' && !event.request.url.includes('firestore.googleapis.com')) { // Example condition
            //   const responseToCache = networkResponse.clone();
            //   caches.open(CACHE_NAME) // Or a dynamic cache
            //     .then(cache => {
            //       cache.put(event.request, responseToCache);
            //     });
            // }
            return networkResponse;
          })
          .catch(error => {
            console.error('[ServiceWorker] Fetch failed; returning offline page if available or error for:', event.request.url, error);
            // Optionally, return a custom offline fallback page:
            // return caches.match('/offline.html');
          });
      })
  );
});
