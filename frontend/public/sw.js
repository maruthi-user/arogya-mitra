/*
 * Arogya Mitra service worker: lets the app open on slow or dropped connections.
 *
 * - /api requests are never cached or intercepted: health and booking data must always be live,
 *   and responses can be private to the signed-in user.
 * - Page loads go to the network first and fall back to the cached app shell when offline.
 * - Static files (hashed build assets, icons, images) are served from cache and refreshed in the
 *   background.
 *
 * Bump VERSION to drop every older cache on the next visit.
 */
const VERSION = 'v1';
const SHELL = `arogya-shell-${VERSION}`;
const STATIC = `arogya-static-${VERSION}`;
const SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== SHELL && key !== STATIC).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL).then(cache => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (/^\/(assets|icons)\//.test(url.pathname) || url.pathname === '/favicon.png') {
    event.respondWith(
      caches.open(STATIC).then(cache =>
        cache.match(request).then(cached => {
          const fresh = fetch(request)
            .then(response => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || fresh;
        })
      )
    );
  }
});
