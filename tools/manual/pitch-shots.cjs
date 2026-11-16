// صور إضافية لـ«الملف التقديمي» (فوق صور shots.cjs): صفحة كل فئة من المشتركين + الحاسوب + صفحات أخرى — معلومات خيالية
// الاستعمال: cd docs && python3 -m http.server 8777 &  ثم  NODE_PATH=$(npm root -g) node tools/manual/pitch-shots.cjs OUTDIR
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs');
const BASE = 'http://localhost:8777/bureau/'; const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const mk = async (vp, mobile) => { const c = await b.newContext({ viewport: vp, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: mobile, hasTouch: mobile });
    const p = await c.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
    await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_open_sound = '0'; });
    await p.route(/googleapis|gstatic|unpkg|jsdelivr|cdnjs|tile\.|openstreetmap|vercel\.app/, r => r.abort()); await F.install(p);
    await p.goto(BASE); await p.waitForTimeout(1500);
    const sd = await p.$('#seed'); if (sd) { await sd.click(); await p.waitForTimeout(1500); }
    await F.addPhotos(p, BASE); await F.login(p, BASE); return p; };
  const clean = p => p.evaluate(() => { document.querySelectorAll('.wl-mod,.gd-tip,.toast,#splash').forEach(m => m.remove()); window.scrollTo(0, 0); });
  const shot = async (p, name, wait = 1500) => { await p.waitForTimeout(wait); await clean(p); await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 76 }); console.log('✓', name); };
  const go = async (p, h, name, wait) => { await p.evaluate(h => { location.hash = h; }, h); await shot(p, name, wait); };
  // 📱 الهاتف
  const p = await mk({ width: 390, height: 780 }, true);
  for (const k of ['agencies', 'brokers', 'contractors', 'finishing', 'investors', 'notaries', 'associations']) await go(p, '#/' + k, 'cat-' + k, 2000);
  await go(p, '#/notaries/dir', 'cat-notaries-dir', 2000);
  await go(p, '#/contractors/dir', 'cat-contractors-dir', 2000);
  await go(p, '#/appointments', 'appointments');
  await go(p, '#/report', 'report', 2000);
  await go(p, '#/map', 'map', 2200);
  await go(p, '#/settings?s=data', 'settings-data', 1800);
  await go(p, '#/guide', 'guide', 1800);
  // عقار فيه الميزانين (المحل التجاري التجريبي)
  const shop = await p.evaluate(async () => { const db = await new Promise(r => { const q = indexedDB.open('wasset777_bureau'); q.onsuccess = () => r(q.result); }); return new Promise(r => { const q = db.transaction('properties').objectStore('properties').getAll(); q.onsuccess = () => r((q.result.find(x => x.type === 'shop') || {}).id); }); });
  if (shop) { await p.evaluate(h => { location.hash = h; }, '#/property/' + shop); await p.waitForTimeout(1500); await clean(p);
    await p.evaluate(() => { const k = document.querySelector('.kv'); if (k) window.scrollTo(0, k.getBoundingClientRect().top + scrollY - 260); }); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/property-shop.jpg`, type: 'jpeg', quality: 76 }); console.log('✓ property-shop'); }
  // 💻 الحاسوب
  const d = await mk({ width: 1280, height: 800 }, false);
  await go(d, '#/', 'desk-home', 2400);
  await go(d, '#/properties', 'desk-properties', 1800);
  await go(d, '#/finance', 'desk-finance', 1800);
  await b.close();
})();
