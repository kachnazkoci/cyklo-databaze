const CACHE = 'cyklo-v20261017-viz2-year-gold';
const FILES = [
  './', './index.html', './manifest.webmanifest',
  './ASSETS/css/style.css', './ASSETS/js/config.js', './ASSETS/js/initial-data.js',
  './ASSETS/js/app.js', './ASSETS/images/icon-192.png', './ASSETS/images/icon-512.png',
  './DATA/cyklo_aktivity_2025_2026.csv', './DATA/strava_activities_2025_2026.csv'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('cyklo-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isStravaCsv = url.pathname.endsWith('/data/strava_activities_2025_2026.csv');
  const isAppShell = event.request.mode === 'navigate' || /\.(?:html|css|js)$/.test(url.pathname);

  if (isStravaCsv || isAppShell) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(response => {
        if (response.ok) {
          const copy = response.clone();
          const cacheKey = isStravaCsv ? './DATA/strava_activities_2025_2026.csv' : event.request;
          event.waitUntil(
            caches.open(CACHE).then(cache => cache.put(cacheKey, copy))
              .catch(error => console.warn('Cache update failed:', error))
          );
        }
        return response;
      }).catch(() => caches.match(isStravaCsv ? './DATA/strava_activities_2025_2026.csv' : event.request)
        .then(cached => cached || (isAppShell ? caches.match('./index.html') : undefined))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then(cache => cache.put(event.request, copy))
              .catch(error => console.warn('Resource cache update failed:', error))
          );
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

