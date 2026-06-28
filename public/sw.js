const CACHE = 'lq-shell-v12';
const APP_SHELL = [
  '/',
  '/app.html',
  '/start.html',
  '/install.html',
  '/download.html',
  '/manifest.webmanifest',
  '/app.css?v=ultra14',
  '/saas-luxury.css?v=saas30',
  '/enterprise-vision.css?v=ev8',
  '/historic-upgrade.css?v=historic10',
  '/app.js?v=saas31',
  '/enterprise-vision.js?v=ev7',
  '/historic-upgrade.js?v=historic5',
  '/pwa-install.js?v=pwa1',
  '/assets/app-icon-192.png',
  '/assets/app-icon-512.png',
  '/assets/brand-logo-gold.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match('/app.html')))
  );
});
