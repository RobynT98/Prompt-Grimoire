const CACHE = 'prompt-grimoire-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=6',
  './markdown-enhancements.css?v=6',
  './theme.js?v=6',
  './app.js?v=6',
  './markdown-enhancements.js?v=6',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request, { cache: 'no-store' });
      const type = response.headers.get('content-type') || '';
      const mayCache = response.ok && (
        event.request.mode !== 'navigate' || type.includes('text/html')
      );

      if (mayCache) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
