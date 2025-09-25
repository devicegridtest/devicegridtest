const CACHE_NAME = 'llm-chat-v8';
const urlsToCache = [
  '/',
  '/index.html',
  '/worker.js',  // ← ya está, pero asegúrate
  'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/+esm',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

