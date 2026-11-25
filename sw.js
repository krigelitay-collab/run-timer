// נבנה אוטומטית ב-tools/build-app.js. לא לערוך ידנית.
// האפליקציה נפתחת מהזיכרון של הטלפון (גם בלי קליטה) ומתעדכנת ברקע. בקשות לשרת (Apps Script) לא עוברות כאן.
const VERSION = 'rt-202611251958';
const FILES = ["./","index.html","timer.html","names.html","app.js","app.css","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","icons/apple-touch-icon.png"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then((cache) =>
    cache.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok) cache.put(new URL(req.url).pathname.endsWith('/') ? req : new Request(new URL(req.url).pathname), res.clone());
        return res;
      }).catch(() => hit);
      return hit || net;
    })));
});
