// v226: الآيفون (الإشعارات مشعولة) ← «تحديث كامل» ← التطبيق كيتحل على الإعدادات بلا Service Worker ← كانت كتبقى معلّقة (serviceWorker.ready).
// + طلب للسحابة ما كيجاوبش ← الصفحة ما تبقاش معلّقة (مهلة).
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [];
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  await c.grantPermissions(['notifications'], { origin: 'http://localhost:8777' });
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1';
    // بحال الآيفون: المتصفح فيه الإشعارات والـ Service Worker، ولكن ما كاين حتى واحد مسجّل (من بعد «التحديث الكامل»)
    if (navigator.serviceWorker) { navigator.serviceWorker.register = () => new Promise(() => {}); navigator.serviceWorker.getRegistration = () => Promise.resolve(undefined); }
    window.PushManager = window.PushManager || function () {};
  });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.route(/rpc\/w777_my_status/, r => r.fulfill({ json: { ok: true, admin: true, member: true } }));
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  // 1) الفتح مباشرة على الإعدادات
  const t0 = Date.now(); await p.goto(BASE + '?u=1#/settings?s=app');
  const ok = await p.waitForFunction(() => !!document.querySelector('.st-form') || /تحديث التطبيق/.test(document.getElementById('main').innerText), null, { timeout: 12000 }).then(() => true).catch(() => false);
  const ms = Date.now() - t0;
  if (!ok) bad.push('settings stuck (no render in 12s)'); else if (ms > 5000) bad.push('settings slow ' + ms);
  if (await p.$('.boot-rescue')) bad.push('rescue shown');
  // 2) طلب كيبقى بلا جواب ← المهلة كترجع خطأ بلاصة الانتظار بلا نهاية
  await p.route(/rpc\/w777_has_secret/, () => { /* ما كنجاوبوش */ });
  const r = await p.evaluate(async () => { const t = Date.now(); try { await window.W777_SYNC.request('/rest/v1/rpc/w777_has_secret', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); return { ok: 1, t: Date.now() - t }; } catch (e) { return { err: String(e.message), t: Date.now() - t }; } });
  if (!r.err || r.t > 30000 || !/Failed to fetch/.test(r.err)) bad.push('timeout ' + JSON.stringify(r));
  console.log(JSON.stringify({ settingsMs: ms, hang: r, bad, errs }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
