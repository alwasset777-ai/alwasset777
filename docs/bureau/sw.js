/* Service Worker — تشغيل التطبيق بدون إنترنت */
const CACHE = 'w777-bureau-v187';
// صور عقارات الشبكة (روابط موقّعة من التخزين السحابي): ذاكرة خاصة كتبقى بين التحديثات
const IMG = 'w777-img-v1', IMG_MAX = 1500;
// الأصوات المحفوظة ديال المساعد (w777-tts) كتبقى حتى هي بين التحديثات
// 📴 ذاكرة دائمة للملفات اللي ماشي فـ SHELL (صور اللعبة، الدليل، الخرائط…): ما كتتمسحش مع كل تحديث
const RT = 'w777-rt-v1', RT_MAX = 900;
const FONTS = [400, 500, 700, 800, 900].flatMap(w => [`fonts/tajawal-arabic-${w}-normal.woff2`, `fonts/tajawal-latin-${w}-normal.woff2`]);
const HUB_ICONS = ['academy', 'ad-maker', 'add-appointment', 'add-property', 'add-request', 'agencies', 'associations', 'bell', 'brokers', 'chart', 'chat', 'contractors', 'disputes', 'disputes-ico', 'donations', 'donations-ico', 'estimate', 'events', 'finance-ico', 'finishing', 'games', 'globe', 'groups', 'guide', 'investors', 'loan-ico', 'map-ico', 'matching', 'news', 'news-ico', 'notaries', 'opp', 'projects', 'projects-ico', 'rentals', 'stays', 'terms', 'toolbox'];
const SHELL = ['./', 'index.html', 'styles.css', 'fonts.css', 'data.js', 'db.js', 'sync.js', 'app.js', 'guide-data.js', 'wasla-levels.js', 'wasla.js', 'games.js', 'academy-data.js', 'academy.js', 'finance-data.js', 'manifest.webmanifest', ...FONTS,
  'vendor/qrcode.js', 'icons/logo.png?v=10', 'icons/icon-192.png?v=9', 'icons/icon-512.png?v=9', 'icons/apple-touch-icon.png?v=9', 'icons/hero-bg.webp?v=2', 'icons/hero-bg2.webp?v=2',
  // كل أيقونات الخانات (نفس رقم النسخة ?v=8 فكل التطبيق)
  ...HUB_ICONS.map(n => `icons/hub/${n}.webp?v=8`),
  // إعدادات السحابة (بلاها التطبيق ما كيعرفش الحساب بلا إنترنت) + الخريطة + صانع الفيديو
  '../app/config.js', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'reels/index.html', 'reels/reels-bridge.js'];
// الأساس: إلا فشل واحد منهم ما كنثبتوش النسخة الجديدة (القديمة كتبقى خدامة)
const CORE = ['./', 'index.html', 'styles.css', 'fonts.css', 'data.js', 'db.js', 'sync.js', 'app.js', 'guide-data.js', '../app/config.js', 'manifest.webmanifest'];
const SHELL_SET = new Set(SHELL.map(u => new URL(u, self.registration.scope).href));

self.addEventListener('install', e => {
  // cache:'reload' — النسخة الجديدة من الخادم، ماشي من ذاكرة المتصفح
  // الباقي واحد بواحد: ملف ناقص ما كيطيحش التثبيت كامل
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })));
    await Promise.allSettled(SHELL.filter(u => !CORE.includes(u)).map(u => fetch(new Request(u, { cache: 'reload' })).then(r => r.ok ? c.put(u, r) : 0)));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMG && k !== RT && k !== 'w777-tts' && k !== 'w777-api').map(k => caches.delete(k))))
    .then(() => caches.open(RT).then(c => trim(c, RT_MAX))).then(() => caches.open(IMG).then(trimImg)).catch(() => {}).then(() => self.clients.claim()));
});
let trimN = 0;
async function trim(c, max) {
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}
const trimImg = c => trim(c, IMG_MAX);
let rtN = 0;
// صفحة بسيطة ملي تكون صفحة ما تفتحاتش قبل وما كاينش الإنترنت
const OFF_HTML = '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>بلا إنترنت</title><body style="font-family:system-ui,sans-serif;background:#0f0f10;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:16px"><div><div style="font-size:52px">📴</div><h2>ما كاينش الإنترنت</h2><p style="color:#bbb">هاد الصفحة ما تفتحاتش قبل فهاد الجهاز.<br>التطبيق خدام بلا إنترنت بالمعلومات المحفوظة.</p><p><a href="./" style="color:#fff;background:#d71920;padding:10px 18px;border-radius:12px;text-decoration:none">⬅ رجع للتطبيق</a> <button onclick="location.reload()" style="padding:10px 18px;border-radius:12px;border:0">↻ عاود</button></p></div></body></html>';
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
  // فيديوهات الدليل: من الشبكة مباشرة (ثقيلة، والفيديو كيحتاج طلبات جزئية)
  if (url.pathname.includes('/tuto/')) return;
  // ملفات التطبيق: من الذاكرة فورا (فتح سريع)، والتحديث كيتجاب فالخلفية للمرة الجاية.
  // كل نشر جديد كيبدل CACHE ← كيتثبت Service Worker جديد والصفحة كتتجدد مرة وحدة.
  const nav = req.mode === 'navigate';
  const appPage = nav && /\/bureau\/(index\.html)?$/.test(url.pathname);
  const inShell = appPage || SHELL_SET.has(url.href);
  // التحميلات الثقيلة (PDF، ZIP، فيديو، files/) ما كتدخلش للذاكرة الدائمة
  const big = /\/files\/|\.(pdf|zip|mp4|webm|mov)$/i.test(url.pathname);
  // الصفحات (HTML) والمعطيات (JSON) خارج SHELL: من الشبكة أولا (باش ما تبقاش صفحة قديمة مع سكريبت جديد)
  const fresh = !inShell && (nav || /\.(html|json)$/i.test(url.pathname));
  const save = res => {
    if (big || !(res.ok && res.status === 200 && res.type === 'basic')) return;
    const copy = res.clone();
    e.waitUntil(caches.open(inShell ? CACHE : RT).then(c => c.put(req, copy).then(() => { if (!inShell && ++rtN % 10 === 0) return trim(c, RT_MAX); })).catch(() => {}));
  };
  // بلا إنترنت: نفس الملف (حتى برقم ?v آخر) ← الصفحة الرئيسية ← صفحة «بلا إنترنت» ← 504
  const offline = async () => {
    if (appPage) return (await caches.match('./')) || (await caches.match('index.html'));
    const any = await caches.match(req, { ignoreSearch: true });
    if (any) return any;
    if (nav) return new Response(OFF_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    return new Response('', { status: 504, statusText: 'offline' });
  };
  if (fresh) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => { save(res); return res; }).catch(offline));
    return;
  }
  // ملفات التطبيق والصور: من الذاكرة فورا (فتح سريع)، والتحديث كيتجاب فالخلفية للمرة الجاية.
  e.respondWith(caches.match(req, { ignoreSearch: appPage }).then(hit => {
    const net = fetch(req, { cache: 'no-cache' }).then(res => { save(res); return res; });
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net.catch(offline);
  }));
});

// الضغط على تنبيه موعد ⏰: فتح التطبيق على صفحة المواعيد
/* 🔔 الإشعارات الفورية */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'مجموعة الوسيط', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'مجموعة الوسيط', {
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
