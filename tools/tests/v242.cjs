// v242: «آخر» من بعد الفترة المجانية بلا اشتراك ← غير الألعاب + دليل التطبيق + الأكاديمية؛ الوكالة الموقوفة كتبقى موقوفة كاملة؛
// 📲 نسخ التطبيق عند المشتركين (المدير) + كل جهاز كيقول النسخة ديالو؛ 🩺 الفحص كيحدّث بوحدو
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const fs = require('fs'); const path = require('path');
const BASE = 'http://localhost:8777/bureau/';
const SW = fs.readFileSync(path.join(__dirname, '../../docs/bureau/sw.js'), 'utf8');
async function open(b, kind, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const errs = [], pings = [], navs = [];
  await ctx.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_hide = '1'; window.W777_HEAL_DELAY = 999999; });
  if (opts.newer) await ctx.route(/\/bureau\/sw\.js/, r => (r.request().headers()['service-worker'] === 'script') ? r.fallback() : r.fulfill({ status: 200, contentType: 'application/javascript', body: SW.replace(/w777-bureau-v\d+/, 'w777-bureau-v999') }));
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('framenavigated', f => { if (f === p.mainFrame()) navs.push(f.url()); });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.route(/rpc\/w777_app_ping/, r => { pings.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
  if (kind !== 'admin') {
    const today = new Date().toISOString();
    await p.route(/\/rest\/v1\/rpc\/w777_is_admin/, r => r.fulfill({ json: false }));
    await p.route(/\/rest\/v1\/rpc\/w777_my_status/, r => r.fulfill({ json: { admin: false, staff: false, member: true, ok: !opts.stopped, kind } }));
    await p.route(/\/rest\/v1\/w777_agencies\?uid=eq/, r => r.fulfill({ json: opts.stopped ? [] : [{ code: 'U001', name: 'زبون', phone: '0612345678', kind, active: true, terms_at: today, seat_no: 1, seat_zone: 'ma' }] }));
  } else { await p.route(/rpc\/w777_errors_recent/, r => r.fulfill({ json: [] })); await p.route(/rpc\/w777_app_versions/, r => r.fulfill({ json: [{ ver: 'v242', n: 3, last_at: new Date().toISOString() }, { ver: 'v240', n: 1, last_at: new Date().toISOString() }] })); }
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  return { ctx, p, errs, pings, navs };
}
const stopped = p => p.evaluate(() => /الحساب موقوف/.test(document.getElementById('main').innerText));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  // 1) «آخر» موقوف: الرئيسية/العقارات ← موقوف (مع أزرار المجاني)، الألعاب/الأكاديمية/الدليل ← خدامين
  { const o = await open(b, 'member', { stopped: true }); const { p } = o;
    await p.goto(BASE + '#/'); await p.waitForTimeout(1500);
    if (!(await stopped(p))) bad.push('member home not stopped');
    const free = await p.$$eval('.st-free a', a => a.map(x => x.getAttribute('href')));
    if (free.join() !== '#/game,#/learn,#/guide') bad.push('free buttons ' + free.join());
    if (!(await p.$('#st-pay'))) bad.push('no pay button');
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v242') + '-member-stopped.png' });
    for (const r of ['#/game', '#/learn', '#/guide']) { await p.goto(BASE + r); await p.waitForTimeout(1400); if (await stopped(p)) bad.push('blocked ' + r); }
    await p.goto(BASE + '#/properties'); await p.waitForTimeout(1200); if (!(await stopped(p))) bad.push('member props not stopped');
    errs.push(...o.errs); await o.ctx.close(); }
  // 2) وكالة موقوفة: حتى الألعاب موقوفة (بلا تبديل)
  { const o = await open(b, 'agency', { stopped: true }); await o.p.goto(BASE + '#/game'); await o.p.waitForTimeout(1400);
    if (!(await stopped(o.p))) bad.push('agency game not stopped'); errs.push(...o.errs); await o.ctx.close(); }
  // 3) المدير: النسخ عند المشتركين + الجهاز كيقول النسخة ديالو
  { const o = await open(b, 'admin'); const { p } = o;
    await p.goto(BASE + '#/agencies/manage'); await p.waitForSelector('.ah-vers', { timeout: 12000 }).catch(() => bad.push('no versions line'));
    const t = await p.$eval('.ah-vers', e => e.textContent).catch(() => '');
    if (!/3 من 4/.test(t.replace(/[\u2066-\u2069]/g, '').replace(/\s+/g, ' ')) || !/v240/.test(t)) bad.push('versions ' + t.slice(0, 120));
    await p.waitForTimeout(4500);
    const sw = SW.match(/w777-bureau-(v\d+)/)[1];
    if (!o.pings.some(x => x.p_ver === sw)) bad.push('ping ' + JSON.stringify(o.pings));
    errs.push(...o.errs); await o.ctx.close(); }
  // 4) 🩺 الفحص: نسخة جديدة فالخادم ← التحديث كيبدا بوحدو
  { const o = await open(b, 'admin', { newer: true }); const { p } = o;
    await p.goto(BASE + '#/'); await p.waitForTimeout(1500); await p.reload(); await p.waitForTimeout(1500);
    o.navs.length = 0; await p.goto(BASE + '#/check'); await p.waitForTimeout(9000);
    if (!o.navs.some(u => /[?&]u=\d+#\/check/.test(u))) bad.push('check auto-update ' + JSON.stringify(o.navs.slice(-3)));
    errs.push(...o.errs); await o.ctx.close(); }
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
