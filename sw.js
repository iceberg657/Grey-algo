// A robust service worker for caching assets and handling updates.

const CACHE_VERSION = 2; // Increment this version number when you deploy updates.
const CACHE_NAME = `greyquant-cache-v${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  './#/', // Match the PWA start_url from manifest.json
  '/icon.svg',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
];

// On install, cache the core assets and take control immediately.
self.addEventListener('install', event => {
  console.log(`Service Worker: Installing v${CACHE_VERSION}...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
  );
});

// On activation, clean up old caches and take control of clients.
self.addEventListener('activate', event => {
  console.log(`Service Worker: Activating v${CACHE_VERSION}...`);
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // Tell the active service worker to take control of the page immediately.
        return self.clients.claim();
    })
  );
});

// Serve cached content and fall back to network (cache-first strategy).
self.addEventListener('fetch', event => {
  // We only want to cache GET requests for http/https URLs.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response from cache.
        if (response) {
          return response;
        }

        // Not in cache - go to the network and cache the new response.
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response.
            // We don't cache non-200 responses.
            if (!response || response.status !== 200) {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});