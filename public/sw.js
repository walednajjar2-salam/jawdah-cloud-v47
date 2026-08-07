/* Launch Quality — self-destructing worker.
   Nothing registers this file any more; it exists only so a device still carrying
   an older worker replaces it with one that deletes itself. Ordering matters:
   unregister() last, because claiming and reloading windows through a
   registration that has already been torn down can reject and abandon the rest
   of the cleanup, leaving the stale shell on screen. */
const KILL = 'lq-self-destruct-v72';

async function purge() {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch (_) {}
}

self.addEventListener('install', (e) => {
  e.waitUntil(purge().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    await purge();
    try { await self.clients.claim(); } catch (_) {}
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => { try { c.navigate(c.url); } catch (_) {} });
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
  })());
});

self.addEventListener('fetch', (e) => {
  // Never answer from a cache — the network is the only source of truth.
  e.respondWith(fetch(e.request));
});
