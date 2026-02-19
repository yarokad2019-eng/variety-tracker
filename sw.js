
const VERSION = 'v11';
const CACHE = 'variety-tracker-' + VERSION;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('variety-tracker-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Network-first for navigations and index
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/variety-tracker/') ) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        return cached || caches.match('/');
      }
    })());
    return;
  }

  // Cache-first for other GET
  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      cache.put(req, fresh.clone());
      return fresh;
    })());
  }
});
