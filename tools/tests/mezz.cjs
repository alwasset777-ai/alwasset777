// 🏬 خانة «الميزانين» فـ«السعر والمساحة» (حدا المساحة الإجمالية): الحفظ، العرض، الوصف، والقيمة القديمة ديال المحل
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.S || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = [], bad = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await F.login(p, BASE);
  await p.evaluate(() => { location.hash = '#/property/new'; }); await p.waitForTimeout(1500);
  // البلاصة: مباشرة من بعد «المساحة الإجمالية»
  const pos = await p.evaluate(() => {
    const m = document.querySelector('[name="mezzanine"]'); if (!m) return 'missing';
    const f = m.closest('.field'), mb = m.closest('details.more-f'), prev = f.previousElementSibling ? null : mb && mb.previousElementSibling;
    return { label: f.querySelector('label').textContent, prev: prev && prev.querySelector('[name]') && prev.querySelector('[name]').name, dir: getComputedStyle(m).direction };
  });
  if (pos === 'missing' || pos.prev !== 'areaTotal' || !/الميزانين/.test(pos.label) || pos.dir !== 'ltr') bad.push('pos ' + JSON.stringify(pos));
  // خانة الخصائص القديمة ديال المحل ما بقاتش (باش ما تكونش جوج)
  await p.selectOption('[name="type"]', 'shop').catch(() => {}); await p.waitForTimeout(300);
  const dup = await p.$$eval('[name="mezzanine"], [name="specs.mezzanine"]', els => els.length);
  if (dup !== 1) bad.push('dup ' + dup);
  // الحفظ
  await p.fill('[name="owner.name"]', 'مالك تجريبي'); await p.fill('[name="owner.phone"]', '0600000000');
  const city = await p.$('[name="city"]');
  if (await city.evaluate(e => e.tagName) === 'SELECT') await p.selectOption('[name="city"]', { index: 1 }); else await p.fill('[name="city"]', 'مكناس');
  await p.click('[data-more=p3] > summary'); await p.fill('[name="areaTotal"]', '60'); await p.fill('[name="mezzanine"]', '25');
  if (SHOT) { const f = await p.$('[name="mezzanine"]'); await f.scrollIntoViewIfNeeded(); await p.screenshot({ path: SHOT + '/mezz-form.png' }); }
  await p.evaluate(() => document.querySelector('[name="mezzanine"]').form.requestSubmit()); await p.waitForTimeout(1800);
  const det = await p.evaluate(() => ({ h: location.hash, t: document.body.innerText }));
  if (!/#\/property\/[^/]+$/.test(det.h) || !/الميزانين\s*\u2066?25\u2069? م²/.test(det.t)) bad.push('detail ' + det.h);
  if (SHOT) await p.screenshot({ path: SHOT + '/mezz-detail.png', fullPage: false });
  // التعديل: القيمة كترجع فالخانة
  await p.evaluate(h => { location.hash = h + '/edit'; }, det.h); await p.waitForTimeout(1200);
  const v = await p.inputValue('[name="mezzanine"]'); if (v !== '25') bad.push('edit ' + v);
  // الوصف الأوتوماتيكي فيه الميزانين
  const btn = await p.$('#gen-desc, [data-act="gen-desc"]');
  if (btn) { await btn.click(); await p.waitForTimeout(400); const d = await p.inputValue('textarea[name="description"]'); if (!/ميزانين \u2066?25\u2069? م²/.test(d)) bad.push('desc'); }
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
