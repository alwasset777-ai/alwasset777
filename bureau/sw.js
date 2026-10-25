/* Service Worker — تشغيل التطبيق بدون إنترنت */
const CACHE = 'w777-bureau-v80';
// صور عقارات الشبكة (روابط موقّعة من التخزين السحابي): ذاكرة خاصة كتبقى بين التحديثات
const IMG = 'w777-img-v1', IMG_MAX = 1500;
const FONTS = [400, 500, 700, 800, 900].flatMap(w => [`fonts/tajawal-arabic-${w}-normal.woff2`, `fonts/tajawal-latin-${w}-normal.woff2`]);
const SHELL = ['./', 'index.html', 'styles.css', 'fonts.css', 'data.js', 'db.js', 'sync.js', 'app.js', 'guide-data.js', 'manifest.webmanifest', ...FONTS,
  'vendor/qrcode.js', 'icons/logo.png?v=10', 'icons/icon-192.png?v=9', 'icons/icon-512.png?v=9', 'icons/apple-touch-icon.png?v=9', 'icons/hero-bg.webp?v=2', 'icons/hero-bg2.webp?v=2',
  ...['agencies', 'brokers', 'contractors', 'finishing', 'projects', 'events', 'stays', 'news', 'donations', 'disputes', 'investors', 'notaries', 'associations', 'terms'].map(n => `icons/hub/${n}.webp?v=6`)];

self.addEventListener('install', e => {
  // cache:'reload' — النسخة الجديدة من الخادم، ماشي من ذاكرة المتصفح
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMG).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
let trimN = 0;
async function trimImg(c) {
  const keys = await c.keys();
  for (let i = 0; i < keys.length - IMG_MAX; i++) await c.delete(keys[i]);
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // صور الشبكة: من الذاكرة مباشرة (المفتاح بلا التوقيع اللي كيتبدل)
  if (url.pathname.includes('/storage/v1/object/sign/')) {
    const key = url.origin + url.pathname;
    e.respondWith(caches.open(IMG).then(async c => {
      const hit = await c.match(key);
      if (hit) return hit;
      const res = await fetch(req.url, { mode: 'cors', credentials: 'omit' });
      if (res.ok) { await c.put(key, res.clone()); if (++trimN % 40 === 0) e.waitUntil(trimImg(c)); }
      return res;
    }).catch(() => fetch(req)));
    return;
  }
  if (url.origin !== location.origin) return;
  // ملفات التطبيق: من الذاكرة فورا (فتح سريع)، والتحديث كيتجاب فالخلفية للمرة الجاية.
  // كل نشر جديد كيبدل CACHE ← كيتثبت Service Worker جديد والصفحة كتتجدد مرة وحدة.
  const nav = req.mode === 'navigate';
  e.respondWith(caches.match(req, { ignoreSearch: nav }).then(hit => {
    const net = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net.catch(() => caches.match(nav ? './' : 'index.html'));
  }));
});

// الضغط على تنبيه موعد ⏰: فتح التطبيق على صفحة المواعيد
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL('./' + ((e.notification.data && e.notification.data.url) || ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});

/* 🔔 الإشعارات الفورية */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'الوسيط 777', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'الوسيط 777', {
    body: d.body || '', tag: d.tag || undefined, renotify: !!d.tag, icon: 'icons/icon-192.png?v=9', badge: 'icons/icon-192.png?v=9',
    lang: 'ar', dir: 'rtl', data: { url: d.url || '#/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '#/', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const w = list.find(c => c.url.startsWith(self.registration.scope));
    if (w) { w.focus(); return w.navigate ? w.navigate(url) : null; }
    return self.clients.openWindow(url);
  }));
});
