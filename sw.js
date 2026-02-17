const VERSION = 'vpwa-2';
const CACHE = `variety-pro-${VERSION}`;
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k.startsWith('variety-pro-') && k!==CACHE ? caches.delete(k) : null)))
      .then(()=>self.clients.claim())
  );
});

async function networkFirst(req){
  try{
    const fresh = await fetch(req);
    const c = await caches.open(CACHE);
    c.put(req, fresh.clone());
    return fresh;
  }catch(e){
    const cached = await caches.match(req);
    return cached || Response.error();
  }
}

async function cacheFirst(req){
  const cached = await caches.match(req);
  if(cached) return cached;
  const fresh = await fetch(req);
  const c = await caches.open(CACHE);
  c.put(req, fresh.clone());
  return fresh;
}

self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  if(url.origin !== self.location.origin) return;

  // HTML navigations: network-first to avoid stale app
  if(e.request.mode === 'navigate' || url.pathname.endsWith('.html')){
    e.respondWith(networkFirst(e.request));
    return;
  }

  // Icons cache-first
  if(url.pathname.includes('icon-')){
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // Default: stale while revalidate-ish
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const fetchPromise = fetch(e.request).then(fresh=>{
        caches.open(CACHE).then(c=>c.put(e.request, fresh.clone()));
        return fresh;
      }).catch(()=>cached);
      return cached || fetchPromise;
    })
  );
});
