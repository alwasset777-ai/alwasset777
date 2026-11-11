// 📴 بلا إنترنت: التطبيق كيتحل وكيخدم (حتى من بعد تحديث)، الصفحات المحلية بلا أخطاء، وصفحات الشبكة كتقول «خاصها الإنترنت»
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs');
// خادم صغير خاص بهاد الاختبار (docs/) باش نقدرو نبدلو رقم النسخة ديال sw.js ونشوفو «التحديث»
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../../docs'), PORT = 8779, BASE = `http://localhost:${PORT}/bureau/`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
let SWVER = '';
const srv = http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (err, buf) => {
    if (err) { r.writeHead(404); return r.end(); }
    if (SWVER && f.endsWith('/bureau/sw.js')) buf = Buffer.from(buf.toString().replace(/w777-bureau-v\d+/, SWVER));
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); r.end(buf);
  });
}).listen(PORT);
const SHOT = process.env.S || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage(); const errs = []; const bad = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_agent_cfg = JSON.stringify({ name: 'منير', ai_enabled: true }); });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg|cloudflare/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(1500);
  const sd = await p.$('#seed'); if (sd) { await sd.click(); await p.waitForTimeout(1500); }
  await F.login(p, BASE); await p.waitForTimeout(1500);
  await p.evaluate(() => navigator.serviceWorker.ready);
  // 1) «تحديث»: كنمسحو الذاكرة القديمة ديال التطبيق بحال إلا تثبتات نسخة جديدة (الذاكرة الدائمة كتبقى)
  await p.reload(); await p.waitForTimeout(2500);
  for (const r of ['#/', '#/properties', '#/game', '#/learn', '#/agencies', '#/news']) { await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(1200); }
  const nProps = await p.evaluate(async () => { const db = await new Promise(r => { const q = indexedDB.open('wasset777_bureau'); q.onsuccess = () => r(q.result); }); return new Promise(r => { const q = db.transaction('properties').objectStore('properties').count(); q.onsuccess = () => r(q.result); }); });
  if (!nProps) bad.push('no seed props');
  // نسخة جديدة كتوصل (sw.js برقم آخر) ← الذاكرة القديمة كتتمسح، والدائمة كتبقى
  SWVER = 'w777-bureau-vTEST';
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  for (let i = 0; i < 40; i++) { if ((await p.evaluate(() => caches.keys())).includes('w777-bureau-vTEST') && !(await p.evaluate(() => caches.keys())).some(k => /w777-bureau-v\d/.test(k))) break; await p.waitForTimeout(500); }
  const keys = await p.evaluate(() => caches.keys());
  if (!keys.includes('w777-bureau-vTEST')) bad.push('update not installed ' + keys.join(','));
  await p.waitForTimeout(1500);
  // 2) بلا إنترنت (حتى السحابة المزيفة مقطوعة)
  await p.unrouteAll({ behavior: 'ignoreErrors' }); await c.setOffline(true);
  errs.length = 0;
  await p.goto(BASE + '#/').catch(e => bad.push('nav ' + e.message)); await p.waitForTimeout(3500);
  if (!(await p.$('.bottomnav, nav'))) bad.push('shell');
  const home = await p.evaluate(() => document.body.innerText);
  if (/This site can|ERR_INTERNET|No internet/i.test(home)) bad.push('browser offline page');
  if (!(await p.$('#net-off'))) bad.push('offline badge');
  if (SHOT) await p.screenshot({ path: SHOT + '/off-home.png' });
  const local = ['#/properties', '#/map', '#/requests', '#/matching', '#/appointments', '#/rentals', '#/loan', '#/estimate', '#/contracts', '#/ownership', '#/finance', '#/learn', '#/game', '#/game/wasla', '#/settings', '#/guide', '#/terms'];
  for (const r of local) {
    await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(1300);
    const t = await p.evaluate(() => (document.querySelector('#main, main') || document.body).innerText);
    if (/Failed to fetch|NetworkError|تعذر التحميل|غير متوفر/.test(t.replace(/📴 هاد الخانة كتحتاج الإنترنت/g, '')) || t.trim().length < 40) bad.push(r + ' :: ' + t.replace(/\s+/g, ' ').slice(0, 80));
  }
  // صفحة عقار
  const pid = await p.evaluate(async () => { const db = await new Promise(r => { const q = indexedDB.open('wasset777_bureau'); q.onsuccess = () => r(q.result); }); return new Promise(r => { const q = db.transaction('properties').objectStore('properties').getAll(); q.onsuccess = () => r((q.result[0] || {}).id); }); });
  await p.evaluate(h => { location.hash = h; }, '#/property/' + pid); await p.waitForTimeout(1300);
  if (!(await p.$('.ac, .card, .prop-hero, h1'))) bad.push('property page');
  // صفحات الشبكة: رسالة واضحة، ماشي «Failed to fetch»
  // اللي تفتحات قبل: كتبان من الذاكرة (بلا خطأ)
  for (const r of ['#/agencies', '#/news']) {
    await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(2500);
    const t = await p.evaluate(() => (document.querySelector('#main, main') || document.body).innerText);
    if (/Failed to fetch|تعذر التحميل|ما كاينش الإنترنت/.test(t)) bad.push(r + ' cached :: ' + t.replace(/\s+/g, ' ').slice(0, 90));
  }
  // اللي ما تفتحاتش قبل: رسالة واضحة + زر «عاود»
  for (const r of ['#/events', '#/projects']) {
    await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(2500);
    const t = await p.evaluate(() => (document.querySelector('#main, main') || document.body).innerText);
    if (!/ما كاينش الإنترنت/.test(t) || /Failed to fetch/.test(t) || !(await p.$('[data-net-retry]'))) bad.push(r + ' msg :: ' + t.replace(/\s+/g, ' ').slice(0, 90));
  }
  // صفحة عمومية ما تفتحاتش قبل ← صفحة «بلا إنترنت» ديالنا (ماشي ديال المتصفح)
  const p2 = await c.newPage(); await p2.goto(BASE + 'verify.html').catch(() => {}); await p2.waitForTimeout(800);
  if (!/ما كاينش الإنترنت/.test(await p2.evaluate(() => document.body.innerText).catch(() => ''))) bad.push('offline page'); await p2.close();
  if (SHOT) await p.screenshot({ path: SHOT + '/off-net.png' });
  // 3) زيادة عقار بلا إنترنت ← كيتسجل ف الجهاز
  await p.evaluate(h => { location.hash = h; }, '#/property/new'); await p.waitForTimeout(1200);
  // منير بلا إنترنت ← المساعد المحلي كيجاوب (ماشي خطأ)
  await p.evaluate(h => { location.hash = h; }, '#/'); await p.waitForTimeout(800);
  await p.click('#agent-fab'); await p.waitForTimeout(800);
  await p.fill('#ag-text', 'شحال الكوميسيون 2.5% على 90 مليون؟'); await p.evaluate(() => document.getElementById('ag-form').requestSubmit()); await p.waitForTimeout(2500);
  const agT = await p.evaluate(() => (document.querySelector('#ag-body, .ag-body, #agent') || document.body).innerText);
  if (!/المساعد المحلي/.test(agT)) bad.push('agent offline :: ' + agT.replace(/\s+/g, ' ').slice(-120));
  // 4) رجوع الإنترنت ← العلامة كتختفي
  await c.setOffline(false); await p.waitForTimeout(1500);
  if (await p.$('#net-off:not([hidden])')) bad.push('badge stays online');
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', 'props', nProps, '|', bad.join(' | '), '|', errs.slice(0, 5).join(' | ')); await b.close(); srv.close(); process.exit(ok ? 0 : 1);
})();
