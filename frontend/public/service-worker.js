/* AyuCare Service Worker — PWA offline support */

const CACHE_NAME = 'ayucare-v1';

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  '/',
  '/patient/dashboard',
  '/patient/login',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
  '/manifest.json',
];

// ── Install: pre-cache app shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching app shell');
      // Use individual adds so one failure doesn't block everything
      return Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for assets ─────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin && !url.pathname.startsWith('/api')) return;

  // API calls — network first, fallback to cache
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful API responses for offline fallback
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets — cache first, fallback to network
  if (
    url.pathname.startsWith('/static/') ||
    url.pathname.endsWith('.png')  ||
    url.pathname.endsWith('.jpg')  ||
    url.pathname.endsWith('.svg')  ||
    url.pathname.endsWith('.ico')  ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
    return;
  }

  // HTML navigation — network first, fallback to cached index
  event.respondWith(
    fetch(request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      })
      .catch(() =>
        caches.match(request).then(cached => cached || caches.match('/'))
      )
  );
});

// ── Push notifications (optional — needs backend push setup) ──
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'AyuCare', {
      body:    data.body    || 'You have a new notification',
      icon:    '/icons/icon-192x192.png',
      badge:   '/icons/icon-72x72.png',
      tag:     data.tag     || 'ayucare-notification',
      data:    data.url     || '/patient/dashboard',
      actions: data.actions || [],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/patient/dashboard')
  );
});