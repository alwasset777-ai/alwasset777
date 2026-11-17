// 🔗 v194: الرابط الخاص (?ref=) فـ decouvrir.html + «🔗 رابطك» فالدليل + 🏅 الروابط للمدير + QR ← الصفحة فقوالب الطبع
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [];
  // 1) الصفحة العمومية بالرابط الخاص
  {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar-MA' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push('page: ' + e.message));
    const logs = [];
    await p.route(/rest\/v1\/rpc\/w777_share_log/, r => { logs.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
    await p.route(/googleapis|gstatic/, r => r.abort());
    await p.route(/\/bureau\/\?gate=1/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>app</p>' }));
    await p.addInitScript(() => { window.__open = []; window.open = u => { window.__open.push(String(u)); return null; }; Object.defineProperty(navigator, 'share', { value: undefined }); });
    await p.goto(BASE + 'decouvrir.html?ref=AG042'); await p.waitForTimeout(800);
    if (!logs.some(l => l.p_kind === 'page' && l.p_via === 'view' && l.p_ref === 'AG042')) bad.push('view ref ' + JSON.stringify(logs));
    const href = await p.$eval('main:not([hidden]) [data-go="join"]', a => a.getAttribute('href'));
    if (href !== './?gate=1&ref=AG042') bad.push('join href ' + href);
    await p.click('main:not([hidden]) .hero [data-share]'); await p.waitForTimeout(300);
    const op = await p.evaluate(() => window.__open[0] || '');
    if (!decodeURIComponent(op).includes('ref=AG042')) bad.push('share ref ' + op);
    // الكود كيبقى فالجلسة حتى بلا ?ref
    await p.goto(BASE + 'decouvrir.html'); await p.waitForTimeout(500);
    await p.click('main:not([hidden]) .hero [data-go="join"]'); await p.waitForTimeout(500);
    if (!logs.some(l => l.p_via === 'join' && l.p_ref === 'AG042')) bad.push('join log ' + JSON.stringify(logs.slice(-3)));
    // كود خايب ما كيتقبلش
    const c2 = await b.newContext(); const p2 = await c2.newPage(); const l2 = [];
    await p2.route(/rest\/v1\/rpc\/w777_share_log/, r => { l2.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
    await p2.goto(BASE + 'decouvrir.html?ref=%3Cscript%3E'); await p2.waitForTimeout(600);
    if (l2.some(l => l.p_ref)) bad.push('bad ref accepted ' + JSON.stringify(l2));
    await c.close(); await c2.close();
  }
  // 2) التطبيق: «🔗» فالدليل + 🏅 الروابط فالإدارة
  {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push('app: ' + e.message));
    await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
    await p.route(/rest\/v1\/rpc\/w777_share_stats/, r => r.fulfill({ json: [{ kind: 'page', via: 'view', d7: 4, d30: 10, total: 20 }] }));
    await p.route(/rest\/v1\/rpc\/w777_share_refs/, r => r.fulfill({ json: [{ ref: 'AG042', name: 'وكالة <b>تجريبية</b>', kind: 'agency', views: 12, joins: 3, d30: 15 }, { ref: 'BR7', name: null, kind: null, views: 2, joins: 0, d30: 2 }] }));
    await p.goto(BASE); await F.login(p, BASE);
    await p.evaluate(() => { location.hash = '#/guide'; }); await p.waitForTimeout(1500);
    const rc = await p.evaluate(() => { const c = document.querySelector('.ref-card'); return c ? { url: c.querySelector('.ref-url').textContent, qr: c.querySelector('a[href*="brand-print"]').getAttribute('href') } : null; });
    if (!rc || !/decouvrir\.html$/.test(rc.url) || !/qr=page/.test(rc.qr)) bad.push('ref card ' + JSON.stringify(rc));
    await p.evaluate(() => { location.hash = '#/agencies/manage'; }); await p.waitForTimeout(2600);
    const rr = await p.evaluate(() => { const b = document.querySelector('#share-refs'); return b ? { t: b.innerText, html: b.innerHTML } : null; });
    if (!rr || !/الروابط الخاصة/.test(rr.t) || !/AG042/.test(rr.t) || !/BR7/.test(rr.t) || /<b>تجريبية<\/b>/.test(rr.html)) bad.push('refs list ' + JSON.stringify(rr && rr.t));
    await c.close();
  }
  // 3) قوالب الطبع: QR ← الصفحة مع الكود، ورجوع لواتساب
  {
    const c = await b.newContext({ viewport: { width: 1200, height: 900 } }); const p = await c.newPage();
    p.on('pageerror', e => errs.push('print: ' + e.message));
    await p.route(/googleapis|gstatic/, r => r.abort());
    await p.goto(BASE + 'brand-print.html?t=card&qr=page&ref=AG042'); await p.waitForTimeout(800);
    const s1 = await p.evaluate(() => ({ t: document.querySelector('[data-qr]').title, l: document.querySelector('[data-ql="card"]').textContent, sel: document.getElementById('qr-to').value }));
    if (!/\/decouvrir\.html\?ref=AG042$/.test(s1.t) || s1.l !== 'تعرّف علينا' || s1.sel !== 'page') bad.push('print page ' + JSON.stringify(s1));
    await p.selectOption('#qr-to', 'wa'); await p.waitForTimeout(200);
    const s2 = await p.evaluate(() => ({ t: document.querySelector('[data-qr]').title, l: document.querySelector('[data-ql="sign"]').textContent }));
    if (!/^https:\/\/wa\.me\/212/.test(s2.t) || s2.l !== 'سكاني ← واتساب') bad.push('print wa ' + JSON.stringify(s2));
    await c.close();
  }
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
