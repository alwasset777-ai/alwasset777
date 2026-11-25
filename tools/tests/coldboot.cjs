// v226: كل صفحة كتتحل من الصفر (بحال الآيفون: الإشعارات مشعولة، بلا Service Worker من بعد التحديث، شبكة بطيئة) ← خاصها تبان فأقل من 5 ث، بلا خانة الإنقاذ، بلا أخطاء
const fs = require('fs'); const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const ROUTES = eval(fs.readFileSync(__dirname + '/assets.cjs', 'utf8').match(/const ROUTES = (\[[\s\S]*?\]);/)[1]).concat(['#/check', '#/qr']);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  await c.grantPermissions(['notifications'], { origin: 'http://localhost:8777' });
  const p = await c.newPage(); const errs = []; let cur = '';
  p.on('pageerror', e => errs.push(cur + ' ' + e.message));
  await p.addInitScript(() => { try { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; } catch (e) { return; } // إطار مقطوع (صانع الإعلانات بلا إنترنت فالاختبار)
    if (navigator.serviceWorker) { navigator.serviceWorker.register = () => new Promise(() => {}); navigator.serviceWorker.getRegistration = () => Promise.resolve(undefined); } });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.route(/rpc\/w777_my_status/, r => r.fulfill({ json: { ok: true, admin: true, member: true } }));
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE); await F.addPhotos(p, BASE);
  // شبكة بطيئة (600ms لكل طلب للسحابة)
  await p.route(/supabase\.co|\/(rest|auth|storage|functions)\/v1\//, async r => { await new Promise(x => setTimeout(x, 600)); return r.fallback(); });
  const slow = [], stuck = [];
  for (const h of ROUTES) {
    cur = h; const t0 = Date.now();
    await p.goto(BASE + '?cb=' + Date.now() + h);
    const ok = await p.waitForFunction(() => { const m = document.getElementById('main'); const sp = document.getElementById('splash'); return m && (m.innerText || '').trim().length > 20 && (!sp || sp.classList.contains('out')) && !document.querySelector('.boot-rescue'); }, null, { timeout: 9000 }).then(() => true).catch(() => false);
    const ms = Date.now() - t0;
    if (!ok || await p.$('.boot-rescue')) stuck.push(h); else if (ms > 5000) slow.push(h + ' ' + ms);
  }
  console.log(JSON.stringify({ n: ROUTES.length, stuck, slow, errs: errs.slice(0, 10) }));
  await b.close(); process.exit(stuck.length || errs.length ? 1 : 0);
})();
