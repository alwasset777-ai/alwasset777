// v177: تزامن الأكاديمية مع السحابة + تقدم الفريق + ختم الشهادة + القرض ← الجهات المموّلة + لوحة المقاعد
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.S || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const bad = [];
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  const pushes = [];
  await p.route(/\/rest\/v1\/w777_academy/, async r => {
    const req = r.request(), url = req.url();
    if (req.method() === 'POST') { pushes.push(JSON.parse(req.postData() || '{}')); return r.fulfill({ status: 201, body: '' }); }
    if (/select=progress&uid=eq/.test(url)) return r.fulfill({ json: [{ progress: { M1: { les: { 0: 1, 1: 1 }, best: 0.8, pass: 1700000000000, tries: 2 } } }] });
    return r.fulfill({ json: [{ uid: 'u-x', progress: { M1: { les: { 0: 1 }, best: 0.9, pass: 1 }, M2: { les: { 0: 1, 1: 1 } } }, passed: 1, avg: 0.13, cert_no: null, updated_at: new Date().toISOString() }], headers: { 'content-range': '0-0/1' } });
  });
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.evaluate(() => { localStorage.w777_acad = JSON.stringify({ M1: { les: { 2: 1 }, best: 0.5, pass: 0, tries: 1 } }); });
  const ow = async t => { const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push(t + ' overflow ' + sw); };
  // 1) السحب والدمج: M1 ناجحة من السحابة ← M2 مفتوحة، والدروس مجموعين، والرفع بالمجموع
  await p.goto(BASE + '#/learn'); await p.waitForTimeout(3500);
  const st = await p.evaluate(() => JSON.parse(localStorage.w777_acad).M1);
  if (!st.pass || Object.keys(st.les).length !== 3 || st.best !== 0.8) bad.push('merge ' + JSON.stringify(st));
  if (await p.$$eval('.ac-mod.lk', a => a.length) !== 5) bad.push('M2 not unlocked');
  if (!pushes.length || pushes[pushes.length - 1].passed !== 1) bad.push('push ' + JSON.stringify(pushes.slice(-1)));
  // 2) تقدم الفريق
  if (!(await p.$('a[href="#/learn/team"]'))) bad.push('team btn');
  await p.goto(BASE + '#/learn/team'); await p.waitForTimeout(1500); await ow('team');
  if (!(await p.$('.ac-lessons .ac-l'))) bad.push('team rows');
  if (SHOT) await p.screenshot({ path: SHOT + '/team.png', fullPage: true });
  // 3) ختم الشهادة
  await p.evaluate(() => { const s = JSON.parse(localStorage.w777_acad); window.W777_ACAD.modules.forEach(x => { s[x.m] = { les: {}, tries: 1, best: 0.9, pass: Date.now() }; }); s.cert = { name: 'متكون تجريبي', date: Date.now() }; localStorage.w777_acad = JSON.stringify(s); });
  await p.goto(BASE + '#/learn'); await p.goto(BASE + '#/learn/cert'); await p.waitForTimeout(1200);
  if (!(await p.$('.ac-cert .seal svg image[href="icons/logo.png"]'))) bad.push('seal');
  if (SHOT) { await p.setViewportSize({ width: 1100, height: 900 }); await p.waitForTimeout(300); await (await p.$('.ac-cert')).screenshot({ path: SHOT + '/cert.png' }); await p.setViewportSize({ width: 390, height: 844 }); }
  // 4) القرض ← الجهات المموّلة
  await p.goto(BASE + '#/loan'); await p.waitForTimeout(800); await p.fill('#lq-price', '700000'); await p.fill('#lq-down', '140000'); await p.waitForTimeout(400);
  await p.click('a[href^="#/tamwil?pay="]'); await p.waitForTimeout(2500);
  if (!(await p.$('.fin-sim'))) bad.push('tamwil sim'); await ow('tamwil');
  await p.click('.fin-sim a'); await p.waitForTimeout(900);
  if (await p.inputValue('#lq-down') === '') bad.push('back to loan');
  // 5) لوحة المقاعد (المدير)
  await p.goto(BASE + '#/agencies/manage'); await p.waitForTimeout(2500);
  if (!(await p.$('.seat-board table'))) bad.push('seat board'); await ow('manage');
  if (SHOT) await p.screenshot({ path: SHOT + '/seats.png' });
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
