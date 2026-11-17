// 🌐 v193: صفحة «تعرّف على التطبيق» (عربي/فرنسي) + العدّاد (w777_share_log) + زر الملف الفرنسي + لوحة الأرقام للمدير
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [];
  // 1) الصفحة العمومية: اللغة، الصور، الأزرار، والعدّاد
  for (const [loc, want] of [['ar-MA', 'ar'], ['fr-FR', 'fr']]) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, locale: loc }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(loc + ': ' + e.message));
    const logs = [];
    await p.route(/rest\/v1\/rpc\/w777_share_log/, r => { logs.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
    await p.route(/googleapis|gstatic/, r => r.abort());
    await p.addInitScript(() => { window.__open = []; window.open = u => { window.__open.push(String(u)); return null; }; Object.defineProperty(navigator, 'share', { value: undefined }); });
    await p.goto(BASE + 'decouvrir.html'); await p.waitForTimeout(900);
    const st = await p.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, vis: [...document.querySelectorAll('main[data-lang]')].filter(m => !m.hidden).map(m => m.dataset.lang),
      roles: document.querySelectorAll('main:not([hidden]) .role').length, subs: document.querySelectorAll('main:not([hidden]) .blk.sub').length, sw: document.documentElement.scrollWidth }));
    if (st.lang !== want || st.vis.join() !== want || st.roles !== 13 || st.subs !== 8 || st.sw > 390 || st.dir !== (want === 'fr' ? 'ltr' : 'rtl')) bad.push(loc + ' page ' + JSON.stringify(st));
    // كل الصور كاينين
    const imgs = await p.$$eval('main img, header img', a => a.map(i => i.getAttribute('src')));
    for (const src of [...new Set(imgs)]) { const r = await p.request.get(BASE + src); if (r.status() !== 200) bad.push(loc + ' img ' + src + ' ' + r.status()); }
    // الملف PDF ديال اللغة
    const pdf = await p.$eval('main:not([hidden]) [data-go="pdf"]', a => a.getAttribute('href'));
    const pr = await p.request.get(BASE + pdf); if (pr.status() !== 200 || +(pr.headers()['content-length'] || 0) < 100000) bad.push(loc + ' pdf ' + pdf + ' ' + pr.status());
    if (want === 'fr' && !/fr\.pdf$/.test(pdf)) bad.push('fr pdf link ' + pdf);
    // زيارة وحدة فالجلسة (حتى مع إعادة التحميل)
    await p.reload(); await p.waitForTimeout(700);
    const views = logs.filter(l => l.p_kind === 'page' && l.p_via === 'view');
    if (views.length !== 1 || views[0].p_lang !== want) bad.push(loc + ' views ' + JSON.stringify(logs));
    // المشاركة بلا navigator.share ← واتساب + عدّة
    await p.click('main:not([hidden]) .hero [data-share]'); await p.waitForTimeout(400);
    const op = await p.evaluate(() => window.__open);
    if (!/^https:\/\/wa\.me\/\?text=/.test(op[0] || '') || !decodeURIComponent(op[0]).includes('decouvrir.html?lang=' + want)) bad.push(loc + ' share ' + JSON.stringify(op));
    if (!logs.some(l => l.p_kind === 'page' && l.p_via === 'wa')) bad.push(loc + ' share log');
    // تبديل اللغة باليد
    const other = want === 'ar' ? 'fr' : 'ar';
    await p.click(`.lgs [data-lg="${other}"]`); await p.waitForTimeout(300);
    const sw2 = await p.evaluate(() => [document.documentElement.lang, [...document.querySelectorAll('main[data-lang]')].filter(m => !m.hidden).map(m => m.dataset.lang).join()]);
    if (sw2[0] !== other || sw2[1] !== other) bad.push(loc + ' toggle ' + sw2);
    await c.close();
  }
  // 2) التطبيق: زر الملف الفرنسي + العدّاد، ولوحة الأرقام للمدير
  {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push('app: ' + e.message));
    const logs = [];
    await p.addInitScript(() => { window.__sh = []; Object.defineProperty(navigator, 'canShare', { value: d => !!(d && d.files) }); Object.defineProperty(navigator, 'share', { value: async d => { window.__sh.push((d.files || []).map(f => f.name)); } }); });
    await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
    await p.route(/rest\/v1\/rpc\/w777_share_log/, r => { logs.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
    await p.route(/rest\/v1\/rpc\/w777_share_stats/, r => r.fulfill({ json: [{ kind: 'malaf', via: 'file', d7: 3, d30: 5, total: 9 }, { kind: 'page', via: 'view', d7: 4, d30: 10, total: 20 }, { kind: 'malaf_fr', via: 'wa', d7: 1, d30: 1, total: 1 }] }));
    await p.goto(BASE); await F.login(p, BASE);
    await p.evaluate(() => { location.hash = '#/guide'; }); await p.waitForTimeout(1500);
    const links = await p.$$eval('a[href*="dossier-presentation"], a[href="decouvrir.html"], [data-share-pdf="malaf_fr"]', a => a.length);
    if (links !== 3) bad.push('guide links ' + links);
    await p.click('[data-share-pdf="malaf_fr"]'); await p.waitForTimeout(1500);
    const sh = await p.evaluate(() => window.__sh);
    if (!sh[0] || sh[0][0] !== 'dossier-presentation-groupe-alwasset-fr.pdf') bad.push('fr share ' + JSON.stringify(sh));
    if (!logs.some(l => l.p_kind === 'malaf_fr' && l.p_via === 'file' && l.p_lang === 'fr')) bad.push('app log ' + JSON.stringify(logs));
    await p.evaluate(() => { location.hash = '#/agencies/manage'; }); await p.waitForTimeout(2500);
    const ss = await p.evaluate(() => { const c = document.querySelector('.share-stats'); return c ? c.innerText.replace(/[⁦⁩]/g, '') : ''; });
    if (!/المشاركات والزيارات/.test(ss) || !/30/.test(ss) || !/16/.test(ss) || !/صفحة «تعرّف على التطبيق»/.test(ss)) bad.push('stats ' + ss.slice(0, 200));
    await c.close();
  }
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
