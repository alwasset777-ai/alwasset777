// v222b: الجلسة مقطوعة ← شاشة الدخول ← الإيميل + الكود ← الرئيسية خاصها تبان (ماشي صفحة خاوية)
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [], logs = [];
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') logs.push(m.text().slice(0, 200)); });
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.route(/rpc\/w777_my_status/, r => r.fulfill({ json: { ok: true, admin: true, member: true } }));
  await p.goto(BASE); await p.waitForTimeout(600); await F.login(p, BASE);
  await p.evaluate(() => { sessionStorage.w777_gate = '1'; localStorage.w777_last_email = 'mounir.test@gmail.com'; location.hash = '#/'; }); await p.waitForTimeout(1500);
  // الجلسة تقطعات فالخادم
  await p.evaluate(() => { const s = JSON.parse(localStorage.w777_cloud); s.exp = Math.floor(Date.now() / 1000) - 10; localStorage.w777_cloud = JSON.stringify(s); });
  let dead = true;
  await p.route(/\/auth\/v1\/token/, r => dead ? r.fulfill({ status: 400, json: { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' } }) : r.fallback());
  await p.reload(); await p.waitForTimeout(3000);
  if (!(await p.$('body.gated'))) bad.push('no login screen');
  dead = false;
  // الدخول بالكود
  const em = await p.$eval('input[type=email], #au-mail, .auth-card input', i => i.value).catch(() => '');
  if (!/mounir\.test@gmail\.com/.test(em)) await p.fill('.auth-card input', 'mounir.test@gmail.com');
  await p.click('.auth-card .btn.gold'); await p.waitForSelector('#au-code', { timeout: 8000 }).catch(() => bad.push('no code screen'));
  await p.fill('#au-code', '123456'); await p.click('#au-ok', { timeout: 1500 }).catch(() => {});
  await p.waitForTimeout(5000);
  const r = await p.evaluate(() => { const m = document.querySelector('#main') || document.querySelector('main'); return { gated: document.body.classList.contains('gated'), hash: location.hash, len: m ? m.innerText.trim().length : -1, txt: m ? m.innerText.trim().slice(0, 120) : '' }; });
  if (r.gated || r.len < 50) bad.push('blank after login ' + JSON.stringify(r));
  await p.screenshot({ path: (process.env.SHOT || '/tmp/relogin222') + '.png' });
  console.log(JSON.stringify({ r, bad, errs, logs: logs.slice(0, 8) }, null, 1));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
