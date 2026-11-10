// v176: عرض 777 (خارج المغرب نفس الدرجات) + بطاقة رقم الاشتراك + وثائق عقد الكراء + حساب القرض الساهل
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.S || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); const bad = [];
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  const ow = async t => { const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push(t + ' overflow ' + sw); };
  // 1) العرض والبطاقة
  const off = await p.evaluate(() => window.W777_TEST.offer()); if (!off.ok) bad.push('offer ' + JSON.stringify(off.c));
  const perk = await p.evaluate(() => { const d = new Date(); d.setMonth(d.getMonth() - 2); return [window.W777_TEST.perk({ seat_no: 12, seat_zone: 'out', kind: 'agency', terms_at: d.toISOString() }), window.W777_TEST.perk({ seat_no: 3, seat_zone: 'ma', kind: 'broker', terms_at: d.toISOString() }, true)]; });
  if (!/12/.test(perk[0]) || !/50%/.test(perk[0]) || !/خارج المغرب/.test(perk[0])) bad.push('perk out');
  if (!/perk-mini/.test(perk[1]) || !/مجاني مدى الحياة/.test(perk[1])) bad.push('perk mini');
  const msg = await p.evaluate(() => window.W777_TEST.msg()); if (/70 الأوائل خارج|مقعد مجاني مدى الحياة للوكالات/.test(msg) || !/خارج المغرب/.test(msg)) bad.push('msg');
  // 2) حساب القرض: 700 000 / تسبيق 200 000 / 20 عام / 5% ← القسط
  await p.goto(BASE + '#/loan'); await p.waitForTimeout(900); await ow('loan');
  await p.fill('#lq-price', '700000'); await p.fill('#lq-down', '200000'); await p.fill('#lq-rate', '5'); await p.fill('#lq-ins', '0'); await p.waitForTimeout(400);
  const m1 = await p.$eval('.ln-big', e => e.textContent.replace(/\D/g, ''));
  if (Math.abs(+m1 - 3300) > 3) bad.push('monthly ' + m1); // 500 000 على 20 عام بـ 5% ≈ 3 300
  await p.fill('#lq-down', '20'); await p.waitForTimeout(400);
  const h = await p.textContent('#lq-down-h'); if (!/20%/.test(h)) bad.push('down pct ' + h);
  await ow('loan filled');
  await p.click('.lq-cmp [data-y="25"]'); await p.waitForTimeout(300);
  if (!(await p.$('[data-k="years"] button.on[data-v="25"]'))) bad.push('years chip');
  if (SHOT) await p.screenshot({ path: SHOT + '/loan.png', fullPage: true });
  // 3) عقد كراء + صورة
  await p.goto(BASE + '#/rentals'); await p.waitForTimeout(900); await p.click('#ls-add'); await p.waitForTimeout(400);
  await p.fill('[name="tenant.name"]', 'مكتري تجريبي'); await p.fill('[name=rent]', '2500');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await p.setInputFiles('#ls-up', [{ name: 'contrat.png', mimeType: 'image/png', buffer: png }, { name: 'bail.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') }]);
  await p.waitForTimeout(1200);
  if (await p.$$eval('#ls-grid .media-item', a => a.length) !== 2) bad.push('lease grid');
  if (!(await p.$('#ls-cam[capture]'))) bad.push('camera input');
  if (SHOT) await p.screenshot({ path: SHOT + '/lease-form.png', fullPage: true });
  await p.click('#lsf-ok'); await p.waitForTimeout(1200);
  if (await p.$$eval('#ls-view .media-item', a => a.length) !== 2) bad.push('lease view');
  const files = await p.evaluate(async () => { const db = await new Promise(r => { const q = indexedDB.open('wasset777_bureau'); q.onsuccess = () => r(q.result); }); return new Promise(r => { const q = db.transaction('files').objectStore('files').getAll(); q.onsuccess = () => r(q.result.filter(f => /contrat|bail/.test(f.name)).length); }); });
  if (files !== 2) bad.push('files stored ' + files);
  await ow('rental'); if (SHOT) await p.screenshot({ path: SHOT + '/lease.png', fullPage: true });
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
