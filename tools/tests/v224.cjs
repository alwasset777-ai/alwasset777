// v224: 🔗 رابط التجربة ?demo=1&tour=1 ← وضع العرض + ▶️ العرض الأوتوماتيكي (كيدوز على الصفحات) + الزيارة كتتحسب، 📤 شارك الرابط، 🩺 صحة التطبيق فـ«🔑 الإدارة»
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [];
  // 1) زائر جديد كيحل رابط التجربة من واتساب
  {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push('link: ' + e.message)); const logs = [];
    await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; sessionStorage.w777_gate = '1'; });
    await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
    await p.route(/rpc\/w777_share_log/, r => { logs.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
    await p.goto(BASE + '?demo=1&tour=1&ref=WASSET'); await p.waitForSelector('#demo-bar', { timeout: 15000 }).catch(() => bad.push('no demo bar'));
    if (await p.$('body.gated')) bad.push('gated in demo');
    await p.waitForSelector('#tour-bar', { timeout: 15000 }).catch(() => bad.push('tour did not start'));
    if (/demo=1/.test(p.url())) bad.push('url not cleaned ' + p.url());
    if (!logs.some(l => l.p_kind === 'demo' && l.p_via === 'view' && l.p_ref === 'WASSET')) bad.push('visit not logged ' + JSON.stringify(logs));
    const seen = new Set();
    for (let i = 0; i < 5; i++) { const s = await p.evaluate(() => ({ h: location.hash, t: (document.getElementById('tb-t') || {}).textContent })); seen.add(s.h.split('?')[0]); await p.click('#tb-next'); await p.waitForTimeout(900); }
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v224') + '-tour.png' });
    if (seen.size < 4) bad.push('tour pages ' + JSON.stringify([...seen]));
    const blank = await p.evaluate(() => (document.getElementById('main').innerText || '').trim().length < 30); if (blank) bad.push('tour page blank');
    for (let i = 0; i < 6; i++) { if (!(await p.$('#tb-next'))) break; await p.click('#tb-next'); await p.waitForTimeout(700); }
    const end = await p.evaluate(() => { const b = document.getElementById('tour-bar'); return b ? { done: b.classList.contains('done'), t: b.innerText } : null; });
    if (!end || !end.done || !/سجّل مجاناً/.test(end.t)) bad.push('tour end ' + JSON.stringify(end));
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v224') + '-end.png' });
    // الضغط على صفحة بيدو كيوقف العرض
    await p.click('#tb-again'); await p.waitForTimeout(800); await p.evaluate(() => { location.hash = '#/requests'; }); await p.waitForTimeout(600);
    if (await p.$('#tour-bar')) bad.push('tour not stopped on manual nav');
    await c.close();
  }
  // 2) المدير: 📤 شارك رابط التجربة + 🩺 صحة التطبيق + رسالة الدعوة فيها الرابط
  {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push('admin: ' + e.message));
    await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; window.__op = []; window.open = u => { window.__op.push(String(u)); return null; }; Object.defineProperty(navigator, 'share', { value: undefined }); });
    await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
    await p.route(/rpc\/w777_my_status/, r => r.fulfill({ json: { ok: true, admin: true, member: true } }));
    await p.route(/rpc\/w777_errors_recent/, r => r.fulfill({ json: [
      { day: '2026-11-25', kind: 'boot', msg: 'Error: boot-timeout @db', place: 'boot', ver: 'v223', ua: 'ios18-safari-pwa', n: 3, last_at: new Date().toISOString() },
      { day: '2026-11-24', kind: 'error', msg: 'TypeError: x is <b>undefined</b>', place: 'route #/property', ver: 'v223', ua: 'android-chrome', n: 1, last_at: new Date(Date.now() - 864e5).toISOString() }] }));
    await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
    await p.evaluate(() => { location.hash = '#/settings?s=app'; }); await p.waitForTimeout(1500);
    await p.click('[data-demo-share]'); await p.waitForTimeout(300);
    const u = await p.evaluate(() => window.__op.slice(-1)[0] || ''), t = decodeURIComponent(u.split('text=')[1] || '');
    if (!/^https:\/\/wa\.me\/\?text=/.test(u) || !/\?demo=1&tour=1&ref=WASSET/.test(t)) bad.push('share ' + t.slice(0, 160));
    await p.evaluate(() => { location.hash = '#/agencies/manage'; }); await p.waitForSelector('#app-health .app-health', { timeout: 10000 }).catch(() => bad.push('no health card'));
    const h = await p.evaluate(() => { const b = document.getElementById('app-health'); return b ? { t: b.innerText, html: b.innerHTML } : null; });
    if (!h || !/صحة التطبيق/.test(h.t) || !/4 خطأ|⁦4⁩ خطأ/.test(h.t.replace(/[⁦-⁩]/g, '')) || !/آيفون \(iOS 18\)/.test(h.t) || !/الفتح تعطّل/.test(h.t) || /<b>undefined<\/b>/.test(h.html)) bad.push('health ' + JSON.stringify(h && h.t.slice(0, 300)));
    await (await p.$('#app-health')).screenshot({ path: (process.env.SHOT || '/tmp/v224') + '-health.png' });
    await p.click('#ag-new-mem'); await p.waitForSelector('#am-wa', { timeout: 8000 }).catch(() => {});
    await p.fill('[name=am-phone]', '0611223344'); await p.click('#am-wa'); await p.waitForTimeout(300);
    const iv = decodeURIComponent((await p.evaluate(() => window.__op.slice(-1)[0] || '')).split('text=')[1] || '');
    if (!/\?demo=1&tour=1&ref=WASSET/.test(iv) || !/\?gate=1&ref=WASSET/.test(iv)) bad.push('invite ' + iv.slice(0, 200));
    await c.close();
  }
  console.log(JSON.stringify({ bad, errs }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
