/* Launch Quality — kill stale PWA caches immediately */
const KILL = 'lq-kill-cache-v51';
self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((c) => {
            try { c.navigate(c.url); } catch (_) {}
          });
        })
      )
  );
});
self.addEventListener('fetch', (e) => {
  // Never serve from cache — always network
  e.respondWith(fetch(e.request));
});
