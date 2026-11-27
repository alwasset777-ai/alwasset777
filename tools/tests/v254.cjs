// v254: رأس الرئيسية فالتيليفون: الشعار كبير كيعمّر اليمين (السطرين)، الستوريات بين الشعار والمزامنة، المزامنة على اليسار بسهم دائري؛
// الرسائل دائرة صفراء مع «المجموعات» (بلا زر فالرأس)؛ الخانة القديمة ديال الستوريات مخبّية؛ الحاسوب بلا تبديل فالستوريات
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const rect = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return getComputedStyle(e).display === 'none' || !r.width ? null : { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, s);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.goto(BASE + '#/'); await p.waitForSelector('#hd-rail .pr-story-add', { timeout: 10000 }).catch(() => bad.push('no stories in header')); await p.waitForTimeout(1200);
  const top = await rect(p, '.topbar'), logo = await rect(p, '.topbar .logo-pill'), sync = await rect(p, '#btn-sync'), rail = await rect(p, '#hd-rail'), tick = await rect(p, '.city-ticker');
  // الشعار: كبير، على اليمين، من الفوق للتحت ديال الرأس
  if (!logo || logo.h < 80 || logo.t > top.t + 10 || logo.b < top.b - 10 || logo.r < top.r - 20) bad.push('logo ' + JSON.stringify({ logo, top }));
  // المزامنة على اليسار، والستوريات بين المزامنة والشعار
  if (!sync || sync.l > 20) bad.push('sync not left ' + JSON.stringify(sync));
  if (!rail || rail.l < sync.r - 1 || rail.r > logo.l + 1) bad.push('rail position ' + JSON.stringify({ rail, sync, logo }));
  if (!tick || tick.r > logo.l + 1) bad.push('ticker under logo ' + JSON.stringify(tick));
  if (await rect(p, '#home-rail')) bad.push('old stories card still visible');
  if (!(await p.$('#btn-sync path[d^="M20 12a8 8"]'))) bad.push('sync icon not circular arrows');
  if (await p.$('.topbar #btn-chat')) bad.push('chat still in header');
  // الرسائل: دائرة صفراء فـ«المجموعات» بنفس قياس الدوائر
  const ch = await rect(p, '.grp-strip .grp-chat');
  if (!ch || Math.abs(ch.w - 48) > 3) bad.push('chat circle ' + JSON.stringify(ch));
  if (!(await p.$('.grp-chat svg #chy'))) bad.push('chat not yellow');
  await p.click('.grp-strip .grp-chat'); await p.waitForTimeout(800);
  if (!/#\/inbox/.test(await p.evaluate(() => location.hash))) bad.push('chat circle link');
  // الستوري الجديد من الرأس
  await p.goto(BASE + '#/'); await p.waitForSelector('#hd-rail .pr-story-add'); await p.waitForTimeout(800);
  await p.click('#hd-rail .pr-story-add'); await p.waitForTimeout(800);
  if (!(await p.$('.modal-bg, .st-comp, .st-view'))) bad.push('story composer from header');
  // صفحة أخرى: الستوريات مخبيين، الرجوع باين، المزامنة على اليسار
  await p.goto(BASE + '#/properties'); await p.reload(); await p.waitForTimeout(1500);
  if (await rect(p, '#hd-rail')) bad.push('rail visible off home');
  const s2 = await rect(p, '#btn-sync'); if (!s2 || s2.l > 20) bad.push('sync not left on properties');
  if (!(await rect(p, '#btn-back'))) bad.push('no back button');
  await p.close();
  // الحاسوب: الستوريات فبلاصتهم القديمة
  const d = await b.newPage({ viewport: { width: 1200, height: 900 } }); d.on('pageerror', e => errs.push(e.message)); await F.install(d);
  await d.goto(BASE); await d.waitForTimeout(800); await F.login(d, BASE); await d.goto(BASE + '#/'); await d.waitForTimeout(2500);
  if (!(await rect(d, '#home-rail'))) bad.push('desktop stories card missing');
  if (await rect(d, '#hd-rail')) bad.push('desktop header rail visible');
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
