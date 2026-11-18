// 🔐 v204: النسخة الاحتياطية مشفّرة بكلمة سر (AES-256-GCM) — التصدير، الملف ما كيتقراش، كلمة سر غالطة، الاستيراد الصحيح
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const fs = require('fs'), os = require('os'), path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 1200, height: 900 }, serviceWorkers: 'block', acceptDownloads: true }); const p = await c.newPage();
  const bad = [], errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic/, r => r.abort());
  await p.goto(BASE); await p.waitForTimeout(1200);
  const sd = await p.$('#seed'); if (sd) { await sd.click(); await p.waitForTimeout(1500); }
  const n0 = await p.evaluate(async () => (await window.W777_DB.all('properties')).length);
  await p.evaluate(() => { location.hash = '#/settings?s=data'; }); await p.waitForTimeout(1500);
  await p.click('#bk-light'); await p.waitForTimeout(400);
  await p.fill('.modal [name=p1]', 'Wasset-2026!'); await p.fill('.modal [name=p2]', 'Wasset-2026!');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click('#bk-ok')]);
  const f = path.join(os.tmpdir(), 'w777-test-' + Date.now() + '.w777'); await dl.saveAs(f);
  const raw = fs.readFileSync(f);
  if (!/\.w777$/.test(dl.suggestedFilename()) || raw.slice(0, 8).toString() !== 'W777ENC1' || /wasset777-bureau|properties/.test(raw.toString('latin1'))) bad.push('enc file ' + dl.suggestedFilename());
  // كلمة سر غالطة
  await p.setInputFiles('#bk-import', f); await p.waitForTimeout(500);
  await p.fill('.modal [name=p1]', 'wrong-pass'); await p.click('#bk-ok'); await p.waitForTimeout(2500);
  const t1 = await p.evaluate(() => [...document.querySelectorAll('.toast, #toast')].map(x => x.textContent).join(' '));
  if (!/كلمة السر غالطة/.test(t1)) bad.push('wrong pw toast ' + t1.slice(0, 80));
  // الصحيحة ← نافذة الاستيراد بعدد العقارات
  await p.evaluate(() => { const i = document.getElementById('bk-import'); if (i) i.value = ''; });
  await p.setInputFiles('#bk-import', f); await p.waitForTimeout(500);
  await p.fill('.modal [name=p1]', 'Wasset-2026!'); await p.click('#bk-ok'); await p.waitForTimeout(2500);
  const h = await p.evaluate(() => (document.querySelector('.modal h3') || {}).textContent || '');
  if (!new RegExp('استيراد ⁦?' + n0).test(h)) bad.push('import modal ' + h + ' n0=' + n0);
  fs.unlinkSync(f);
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
