// 📤 زر «شارك الملف التقديمي / الدليل» فـ«دليل التطبيق»: 1) الملف PDF نيت  2) الرابط إلا ما قدرش التيليفون يصيفط ملف  3) واتساب إلا ما كانتش المشاركة
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [];
  const run = async mode => {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(mode + ': ' + e.message));
    await p.addInitScript(m => {
      window.__sh = []; window.__open = [];
      const orig = window.open; window.open = (u, ...r) => { window.__open.push(String(u)); return null; };
      if (m === 'none') { try { delete Navigator.prototype.share; delete Navigator.prototype.canShare; } catch (e) { /* */ } Object.defineProperty(navigator, 'share', { value: undefined }); Object.defineProperty(navigator, 'canShare', { value: undefined }); return; }
      Object.defineProperty(navigator, 'canShare', { value: d => m === 'files' ? !!(d && d.files) : !(d && d.files) });
      Object.defineProperty(navigator, 'share', { value: async d => { window.__sh.push({ files: (d.files || []).map(f => [f.name, f.type, f.size]), url: d.url || '', text: d.text || '' }); } });
    }, mode);
    await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
    await p.goto(BASE); await F.login(p, BASE);
    await p.evaluate(() => { location.hash = '#/guide'; }); await p.waitForTimeout(1500);
    const n = await p.$$eval('[data-share-pdf]', a => a.map(x => x.dataset.sharePdf).join(','));
    if (n !== 'dalil,malaf,malaf_fr') bad.push(mode + ' btns ' + n);
    await p.click('[data-share-pdf="malaf"]'); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => ({ sh: window.__sh, open: window.__open }));
    if (mode === 'files') { const f = r.sh[0] && r.sh[0].files[0]; if (!f || f[0] !== 'malaf-taqdimi-majmouat-alwasset.pdf' || f[1] !== 'application/pdf' || f[2] < 100000) bad.push('files ' + JSON.stringify(r)); }
    if (mode === 'url') { const s = r.sh[0]; if (!s || s.files.length || !/malaf-taqdimi-majmouat-alwasset\.pdf$/.test(s.url) || !/مجموعة الوسيط/.test(s.text)) bad.push('url ' + JSON.stringify(r)); }
    if (mode === 'none') { const u = r.open[0] || ''; if (!/^https:\/\/wa\.me\/\?text=/.test(u) || !/malaf-taqdimi/.test(decodeURIComponent(u))) bad.push('wa ' + JSON.stringify(r)); }
    const dis = await p.$eval('[data-share-pdf="malaf"]', x => x.disabled); if (dis) bad.push(mode + ' still disabled');
    await c.close();
  };
  for (const m of ['files', 'url', 'none']) await run(m);
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
