/* Service Worker — تشغيل التطبيق بدون إنترنت */
const CACHE = 'w777-bureau-v11';
const SHELL = ['./', 'index.html', 'styles.css', 'data.js', 'db.js', 'sync.js', 'app.js', 'manifest.webmanifest',
  'icons/logo.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // الخطوط: من الذاكرة أولا
  if (url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }).catch(() => hit)));
    return;
  }
  if (url.origin !== location.origin) return;
  // ملفات التطبيق: الشبكة أولا (للتحديثات) ثم الذاكرة عند انقطاع الإنترنت
  // no-cache: يتحقق دائما من وجود نسخة جديدة بدل النسخة المحفوظة في المتصفح
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
