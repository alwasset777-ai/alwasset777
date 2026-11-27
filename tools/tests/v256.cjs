// v256: فوق الشاشة كحل (سطر الساعة + الخلفية ملي كتجبد الصفحة)، الدائرة الصفراء كتهتز ملي توصل رسالة جديدة (مرة وحدة)، زر «للفوق»
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOT ? 2 : 1 }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  // عدد الرسائل الجديدة: كنبدلوه باش نشوفو الهزة
  let unread = 0;
  await p.route(/\/rest\/v1\/w777_msgs\?select=id&recipient=/, r => r.fulfill({ status: 200, headers: { 'content-type': 'application/json', 'content-range': `0-0/${unread}`, 'access-control-expose-headers': 'content-range' }, body: '[]' }));
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.goto(BASE + '#/'); await p.waitForSelector('.grp-chat'); await p.waitForTimeout(1500);
  // 1) الكحل فوق: html كحل فالفوق، وعادي ملي كتنزل
  const bg0 = await p.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  if (bg0 !== 'rgb(0, 0, 0)') bad.push('html not black at top ' + bg0);
  const tbg = await p.evaluate(() => getComputedStyle(document.querySelector('.topbar')).backgroundImage);
  if (!/^linear-gradient\(rgb\(0, 0, 0\), rgb\(0, 0, 0\)\)/.test(tbg)) bad.push('status strip not solid ' + tbg.slice(0, 80));
  // 3) «للفوق»: مخبي فالفوق، كيبان من بعد التمرير، والضغط كيطلع
  const vis = () => p.evaluate(() => { const e = document.querySelector('#to-top'); if (!e) return null; const s = getComputedStyle(e); return s.display !== 'none' && +s.opacity > .5 && s.pointerEvents !== 'none'; });
  if (await vis()) bad.push('to-top visible at top');
  await p.setViewportSize({ width: 390, height: 560 }); await p.waitForTimeout(300); // صفحة أطول من الشاشة
  const sy = await p.evaluate(async () => { scrollTo(0, document.documentElement.scrollHeight); await new Promise(r => setTimeout(r, 600)); return [scrollY, innerHeight]; });
  if (sy[0] <= sy[1]) bad.push('page too short for test ' + sy);
  if (!(await vis())) bad.push('to-top not shown after scroll');
  const bg1 = await p.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  if (bg1 === 'rgb(0, 0, 0)') bad.push('html still black when scrolled down');
  const pos = await p.evaluate(() => { const r = document.querySelector('#to-top').getBoundingClientRect(), n = document.querySelector('.bottomnav').getBoundingClientRect(); return { cx: Math.round(r.left + r.width / 2), above: r.bottom < n.top }; });
  if (Math.abs(pos.cx - 195) > 2 || !pos.above) bad.push('to-top position ' + JSON.stringify(pos));
  if (SHOT) await p.screenshot({ path: SHOT + '/totop.png' });
  const dbg = await p.evaluate(() => [scrollY, innerHeight, document.querySelector('#to-top').className]);
  if (!/\bon\b/.test(dbg[2])) { bad.push('to-top state ' + JSON.stringify(dbg)); } else { await p.click('#to-top'); await p.waitForTimeout(1200); }
  if (await p.evaluate(() => scrollY) > 5) bad.push('to-top did not scroll up');
  await p.setViewportSize({ width: 390, height: 844 });
  // مخبي فالاستمارة
  await p.goto(BASE + '#/property/new'); await p.waitForSelector('.form-actions'); await p.evaluate(() => scrollTo(0, innerHeight * 2)); await p.waitForTimeout(500);
  if (await vis()) bad.push('to-top visible on form');
  // 2) الهزة: رسالة جديدة ← كتهتز مرة وحدة؛ نفس العدد ← ما كتهتزش
  await p.goto(BASE + '#/'); await p.waitForSelector('.grp-chat'); await p.waitForTimeout(800);
  const shake = async () => p.evaluate(async () => { const b = document.querySelector('.grp-chat'); const seen = { on: false }; const mo = new MutationObserver(() => { if (b.classList.contains('chat-shake')) seen.on = true; }); mo.observe(b, { attributes: true });
    await window.W777_TEST_paint(); await new Promise(r => setTimeout(r, 200)); mo.disconnect(); return seen.on || b.classList.contains('chat-shake'); });
  await p.evaluate(() => { window.W777_TEST_paint = () => new Promise(r => { window.dispatchEvent(new Event('w777-chat-refresh')); setTimeout(r, 400); }); });
  unread = 2; const s1 = await shake();
  const badge = await p.$eval('#chat-n', e => [e.textContent, e.classList.contains('hidden')]);
  await p.waitForTimeout(1700); // الهزة الأولى كملات
  const s2 = await shake();
  if (!s1) bad.push('no shake on new message'); if (s2) bad.push('shook again without new message');
  if (badge[0] !== '2' || badge[1]) bad.push('badge ' + JSON.stringify(badge));
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
