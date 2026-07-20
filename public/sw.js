const CACHE = 'lq-shell-v23';
const APP_SHELL = [
  '/manifest.webmanifest',
  '/assets/app-icon-192.png',
  '/assets/app-icon-512.png'
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
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(request) {
  return fetch(request)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return res;
    })
    .catch(() => caches.match(request));
}

self.addEventListener('push', (e) => {
  const body = e.data ? e.data.text() : 'تنبيه من Launch Quality';
  e.waitUntil(
    self.registration.showNotification('Launch Quality', {
      body,
      icon: '/assets/app-icon-192.png',
      badge: '/assets/app-icon-192.png',
      tag: 'lq-push',
    })
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

  // Brand assets + HTML/CSS/JS: always prefer network (fixes stale logo after deploy).
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname === '/' ||
    url.pathname === '/sw.js'
  ) {
    e.respondWith(
      networkFirst(e.request).catch(() => caches.match(e.request).then((cached) => cached || caches.match('/app.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
