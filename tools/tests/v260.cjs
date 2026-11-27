// v260: الضغطة الطويلة على الشعار فالرأس ← «🩺 فحص التطبيق» (#/check)؛ الضغطة العادية ← الرئيسية؛ الحركة (سحب) كتلغي
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  const center = async () => { const r = await p.$eval('.topbar .logo', e => { const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }); return r; };
  // 1) ضغطة طويلة من صفحة العقارات ← الفحص
  await p.goto(BASE + '#/properties'); await p.waitForTimeout(1200);
  let [x, y] = await center(); await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(950); await p.mouse.up(); await p.waitForTimeout(900);
  const h1 = await p.evaluate(() => location.hash);
  if (h1 !== '#/check') bad.push('long press → ' + h1);
  // 2) ضغطة عادية ← الرئيسية (ماشي الفحص)
  await p.goto(BASE + '#/properties'); await p.waitForTimeout(1000);
  [x, y] = await center(); await p.mouse.click(x, y); await p.waitForTimeout(900);
  const h2 = await p.evaluate(() => location.hash);
  if (!(h2 === '#/' || h2 === '' || h2 === '#')) bad.push('short click → ' + h2);
  // 3) الضغط مع السحب ← والو
  await p.goto(BASE + '#/properties'); await p.waitForTimeout(1000);
  [x, y] = await center(); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x - 40, y + 30, { steps: 4 }); await p.waitForTimeout(950); await p.mouse.up(); await p.waitForTimeout(600);
  if (await p.evaluate(() => location.hash) === '#/check') bad.push('drag triggered check');
  // 4) فالرئيسية (الشعار الكبير) حتى هو
  await p.goto(BASE + '#/'); await p.waitForTimeout(1200);
  [x, y] = await center(); await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(950); await p.mouse.up(); await p.waitForTimeout(900);
  if (await p.evaluate(() => location.hash) !== '#/check') bad.push('long press on home logo');
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
