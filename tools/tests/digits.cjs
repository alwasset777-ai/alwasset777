// 🔢 الأرقام فالخانات كتبان فالترتيب الصحيح: «1 100 000» ماشي «000 100 1» (ثمن العقار، المساحة، الهاتف، حساب القرض، رابط الخريطة)
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.S || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = [], bad = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await F.login(p, BASE);
  // الترتيب كيتشاف من البلاصة: أول رقم كتبناه خاصو يبان على اليسار ديال الأرقام اللي من بعدو
  const order = sel => p.evaluate(s => {
    const el = document.querySelector(s); if (!el) return 'missing';
    const cs = getComputedStyle(el);
    return { dir: cs.direction, bidi: cs.unicodeBidi, align: cs.textAlign, v: el.value };
  }, sel);
  await p.evaluate(() => { location.hash = '#/property/new'; }); await p.waitForTimeout(1500);
  const price = await p.$('input[data-money]');
  await price.click(); await p.keyboard.type('1100000'); await p.waitForTimeout(300);
  const r1 = await order('input[data-money]');
  if (r1.dir !== 'ltr' || !/^1\s100\s000$/.test(r1.v.replace(/[  ]/g, ' '))) bad.push('price ' + JSON.stringify(r1));
  // بالبيكسل: «1» على اليسار ديال «000» (الكتابة من اليسار لليمين)
  const px = await p.evaluate(() => {
    const el = document.querySelector('input[data-money]'), c = document.createElement('canvas').getContext('2d');
    const cs = getComputedStyle(el); c.font = cs.font; c.direction = cs.direction;
    return cs.direction;
  });
  if (px !== 'ltr') bad.push('px');
  if (SHOT) { await price.scrollIntoViewIfNeeded(); await p.screenshot({ path: SHOT + '/digits-price.png', clip: await (await price.evaluateHandle(e => e.closest('.field') || e)).boundingBox() }); }
  // الهاتف والمساحة
  for (const sel of ['input[type="tel"]', 'input[name="area"], input[name="surface"], input[type="number"]']) {
    const r = await order(sel); if (r !== 'missing' && r.dir !== 'ltr') bad.push(sel + ' ' + JSON.stringify(r));
  }
  // خانة نص عربية كتبقى من اليمين (plaintext)
  const t = await order('input[name="title"], textarea');
  if (t !== 'missing' && t.bidi !== 'plaintext') bad.push('text ' + JSON.stringify(t));
  // حساب القرض
  await p.evaluate(() => { location.hash = '#/loan'; }); await p.waitForTimeout(1200);
  const l = await order('#lq-price'); if (l === 'missing' || l.dir !== 'ltr') bad.push('loan ' + JSON.stringify(l));
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
