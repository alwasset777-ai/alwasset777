// v257: الرئيسية فالتيليفون — الدول واللغة فوق «خدمات المجموعة» (داخل الخانة الكبيرة، بلا الشريط الخاوي)، «المجموعات» على اليمين،
// المدن تحت الشريط التحتاني، الشعار دورة كل 3 ث، دائرة منير 75px، الأعلام (حتى «Deuschland») والدول كيتحركو من اليسار لليمين
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const R = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return getComputedStyle(e).display === 'none' || !r.width ? null : { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, s);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.goto(BASE + '#/'); await p.waitForSelector('#home-flags .fl-item', { timeout: 10000 }).catch(() => bad.push('no flags')); await p.waitForTimeout(1200);
  // الترتيب: الدول (داخل الخانة الكبيرة) ← خدمات المجموعة؛ الشريط الخاوي (hero-marq) مخبي
  const fl = await R(p, '#home-flags'), svc = await R(p, '.hrow[data-hr=svc]'), hero = await R(p, '.hero');
  if (!fl || !svc || fl.b > svc.t || fl.t < hero.t || !(await p.$('.hero > #home-flags'))) bad.push('flags not above services ' + JSON.stringify({ fl, svc }));
  if (await R(p, '.home-main .hero-marq')) bad.push('empty marquee band still visible');
  if (fl && svc && svc.t - hero.t > 120) bad.push('services not raised ' + (svc.t - hero.t));
  if (!(await p.$('#home-flags #btn-lang'))) bad.push('language button not in flags bar');
  // الدول كيتحركو (حتى بجوج دول) والعناصر باينين داخل الشريط
  const mv = await p.evaluate(async () => { const t = document.querySelector('.fl-track'), v = document.querySelector('.fl-view').getBoundingClientRect();
    const x0 = t.children[0].getBoundingClientRect().left; await new Promise(r => setTimeout(r, 1500)); const x1 = t.children[0].getBoundingClientRect().left;
    const inView = [...t.children].some(e => { const r = e.getBoundingClientRect(); return r.right > v.left + 10 && r.left < v.right - 10; });
    return { anim: getComputedStyle(t).animationName, dx: x1 - x0, inView }; });
  if (mv.anim !== 'flmove3' || mv.dx <= 0 || !mv.inView) bad.push('flags not moving left→right / not visible ' + JSON.stringify(mv));
  // التعرف على الدول
  const iso = await p.evaluate(() => ['Deuschland', 'ألمانيا', 'المانيا', 'Allemagne', 'germany', 'الولايات المتحدة', 'Espagne', 'المغرب', 'Fance', 'xyz'].map(n => window.W777_TEST.isoOf(n)));
  if (iso.join(',') !== 'DE,DE,DE,DE,DE,US,ES,MA,FR,') bad.push('isoOf ' + iso.join(','));
  if (await p.evaluate(() => window.W777_TEST.ctyAr('DE')) !== 'ألمانيا') bad.push('arabic name');
  // «المجموعات» على أقصى اليمين
  const gw = await R(p, '.grp-word2'), gs = await R(p, '.grp-strip');
  if (!gw || gs.r - gw.r > 24) bad.push('groups word not right ' + JSON.stringify({ gw, gs }));
  // المدن تحت الشريط التحتاني، والشريط ما كيغطيش «حفظ»… (العلو = --nav-h + safe)
  const nav = await R(p, '.bottomnav'), tk = await R(p, '.bottomnav > .city-ticker'), links = await R(p, '.bottomnav a');
  if (!tk || tk.t < links.b - 1 || tk.b > nav.b + 1) bad.push('city ticker not under nav ' + JSON.stringify({ tk, links, nav }));
  if (await p.$('.topbar .city-ticker')) bad.push('ticker still in header');
  const nh = await p.evaluate(() => parseFloat(getComputedStyle(document.body).getPropertyValue('--nav-h')));
  if (Math.abs(nav.h - nh) > 1) bad.push('nav height != --nav-h ' + nav.h + ' ' + nh);
  // الشعار: 3 ثواني، ومعمّر يمين الرأس
  const coin = await p.evaluate(() => [getComputedStyle(document.querySelector('.topbar .coin')).animationDuration, getComputedStyle(document.querySelector('.topbar .coin'), '::after').animationName]);
  if (coin[0] !== '3s' || !/^logo-sheen3?$/.test(coin[1])) /* v259: logo-sheen3 */ bad.push('logo spin ' + coin);
  const lg = await R(p, '.topbar .logo-pill'), top = await R(p, '.topbar');
  if (!lg || lg.h < 80 || lg.b > top.b) bad.push('logo size ' + JSON.stringify({ lg, top }));
  // منير 75px (+25%)
  const ag = await R(p, '#agent-fab'); if (!ag || Math.round(ag.w) !== 75) bad.push('agent size ' + JSON.stringify(ag));
  // صفحة أخرى: المدن ما كيبانوش، والشريط رجع للعلو العادي
  await p.goto(BASE + '#/properties'); await p.waitForTimeout(1200);
  if (await R(p, '.city-ticker')) bad.push('ticker visible off home');
  const nav2 = await R(p, '.bottomnav'); if (Math.round(nav2.h) !== 68) bad.push('nav height off home ' + nav2.h);
  await p.close();
  // الحاسوب: المدن فالرأس
  const d = await b.newPage({ viewport: { width: 1200, height: 900 } }); d.on('pageerror', e => errs.push(e.message)); await F.install(d);
  await d.goto(BASE); await d.waitForTimeout(800); await F.login(d, BASE); await d.goto(BASE + '#/'); await d.waitForTimeout(1500);
  if (!(await d.$('.topbar .city-ticker')) || !(await R(d, '.city-ticker'))) bad.push('desktop ticker not in header');
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
