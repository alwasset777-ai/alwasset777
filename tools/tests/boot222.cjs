// v222: الدخول للتطبيق: شحال كيتسنى (شبكة بطيئة) + جلسة مقطوعة (رمز التجديد ما بقاش) ← بلا تكرار وبلا خطأ بالإنجليزية
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const DELAY = +process.env.DELAY || 1200;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = {}, bad = [], errs = [];
  async function boot(label, { dead = false, expiredTok = false } = {}) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(label + ': ' + e.message));
    await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; });
    await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
    // الحالة ديال الحساب (بحال الخادم الحقيقي) ← كتتحفظ فالجهاز
    await p.route(/rpc\/w777_my_status/, r => r.fulfill({ json: { ok: true, admin: true, member: true } }));
    await p.goto(BASE); await p.waitForTimeout(600); await F.login(p, BASE);
    await p.evaluate(() => { sessionStorage.w777_gate = '1'; location.hash = '#/'; }); await p.waitForTimeout(1500);
    // الحالة: رمز الدخول سالا (ساعة بلا استعمال)، والتجديد إما خدام ولا مقطوع
    if (expiredTok) await p.evaluate(() => { const s = JSON.parse(localStorage.w777_cloud); s.exp = Math.floor(Date.now() / 1000) - 10; localStorage.w777_cloud = JSON.stringify(s); });
    let tokCalls = 0;
    await p.route(/supabase\.co|\/(rest|auth|storage|functions)\/v1\//, async r => {
      const u = r.request().url();
      if (process.env.TRACE && label === process.env.TRACE) console.log(String(Date.now() - (global.T0 || 0)).padStart(6), r.request().method(), u.replace(/^https?:\/\/[^/]+/, '').slice(0, 110));
      if (/\/auth\/v1\/token/.test(u)) { tokCalls++; if (dead) { await new Promise(x => setTimeout(x, DELAY)); return r.fulfill({ status: 400, json: { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' } }); } }
      await new Promise(x => setTimeout(x, DELAY)); return r.fallback();
    });
    const t0 = Date.now(); global.T0 = t0;
    await p.reload();
    await p.waitForFunction(() => !document.getElementById('splash') || document.getElementById('splash').classList.contains('out'), null, { timeout: 30000 }).catch(() => {});
    const tSplash = Date.now() - t0; if (process.env.TRACE === label) console.log('SPLASH', tSplash);
    await p.waitForTimeout(6000);
    const st = await p.evaluate(() => ({ t: (document.querySelector('main, #main, .main') || document.body).innerText.slice(0, 600), on: window.W777_SYNC.isOn(), gated: document.body.classList.contains('gated') }));
    out[label] = { splashMs: tSplash, tokCalls, on: st.on, gated: st.gated, text: st.t.replace(/\s+/g, ' ').slice(0, 160) };
    await p.screenshot({ path: (process.env.SHOT || '/tmp/boot222') + '-' + label + '.png' });
    await c.close();
    return st;
  }
  await boot('normal');
  await boot('expired', { expiredTok: true });
  const d = await boot('dead', { expiredTok: true, dead: true });
  if (out.dead.tokCalls > 2) bad.push('token calls ' + out.dead.tokCalls);
  if (/Invalid Refresh Token|Refresh Token Not Found/i.test(d.t)) bad.push('english error shown');
  if (d.on) bad.push('still signed in after dead token');
  if (!/لأسباب الأمان خاصك تدخل من جديد/.test(d.t)) bad.push('no relogin note');
  console.log(JSON.stringify({ out, bad, errs }, null, 1));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
