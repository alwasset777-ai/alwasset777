// 🛡️ v210: اختبار الحماية — (1) CSP: حتى صفحة ما كتخرق السياسة، (2) XSS: كود مدسوس فالعقار/الزبون ما كيتنفذش،
// (3) clickjacking: الصفحة داخل إطار ديال موقع آخر كتخبّى، (4) لوحة «🛡️ مراقبة الأمان» للمدير + الطرد
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs');
const BASE = 'http://localhost:8777/bureau/', OTHER = 'http://127.0.0.1:8777/bureau/';
const PUB = ['verify.html?no=W777-0001', 'join.html', 'partner.html?t=x', 'stays.html', 'catalog.html', 'decouvrir.html', 'game.html', 'games.html', 'brand.html', 'brand-print.html', 'academy-print.html'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], viol = [], errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sample || '').slice(0, 40))); });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic|cloudflare/, r => r.abort()); await F.install(p);
  // (1) الصفحات العمومية
  for (const u of PUB) {
    await p.goto(BASE + u); await p.waitForTimeout(1200);
    const v = await p.evaluate(() => window.__viol); if (v.length) viol.push(u + ': ' + v.join(' ; '));
    const hid = await p.evaluate(() => getComputedStyle(document.documentElement).display === 'none'); if (hid) bad.push('hidden ' + u);
  }
  // (4) لوحة الأمان (بيانات مزيفة)
  let kicked = null;
  await p.route(/\/rest\/v1\/rpc\/w777_sec_watch/, r => r.fulfill({ json: { admin_mfa: 0, admin_ips_30d: 2, signups_24h: 3, signups_7d: 9, sessions_24h: 12, recovery_24h: 0, unconfirmed: 1,
    admin_sessions: [{ at: new Date().toISOString(), ip: '105.1.2.3', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', aal: 'aal1' }],
    multi_ip: [{ uid: '11111111-2222-4333-8444-555555555555', name: '<img src=x onerror="window.__xss=7">وكالة تجريبية', code: 'T1', ips: 6, sessions: 9, last: new Date().toISOString() }], agent_limit_hits: [] } }));
  await p.route(/\/rest\/v1\/rpc\/w777_kick/, r => { kicked = JSON.parse(r.request().postData() || '{}'); r.fulfill({ json: 2 }); });
  await p.goto(BASE); await F.login(p, BASE);
  // (2) XSS: كود مدسوس فالعقار والزبون
  const X = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>"\'><svg onload="window.__xss=3">';
  await p.evaluate(async X => { const now = new Date().toISOString();
    await window.W777_DB.saveRec('properties', { id: 'px-210', ref: 'W777-9210', createdAt: now, updatedAt: now, status: 'available', type: 'apartment', transaction: 'sale', city: 'مكناس', district: X, title: X, description: X, notes: X, priceMin: 500000, media: [], owner: { name: X, phone: '0600000000' }, features: [X], broker: { has: false } });
    await window.W777_DB.saveRec('requests', { id: 'rx-210', ref: 'R-9210', createdAt: now, updatedAt: now, status: 'new', transaction: 'sale', types: ['apartment'], city: 'مكناس', districts: [X], budgetMax: 900000, notes: X, client: { name: X, phone: '0611111111' } });
    await window.W777_DB.saveRec('appointments', { id: 'ax-210', createdAt: now, updatedAt: now, date: now.slice(0, 10), time: '10:00', title: X, place: X, client: X, notes: X });
    await window.W777_TEST.loadAll(); }, X);
  for (const h of ['#/', '#/properties', '#/property/px-210', '#/requests', '#/request/rx-210', '#/appointments', '#/matching', '#/search?q=' + encodeURIComponent('<img'), '#/agencies/manage']) {
    await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(1300);
  }
  const xss = await p.evaluate(() => window.__xss); if (xss) bad.push('XSS executed ' + xss);
  const v2 = await p.evaluate(() => window.__viol.filter(x => !/^script-src-attr|^script-src-elem.*inline/.test(x) || true)); // كل خرق كيتسجل
  const card = await p.evaluate(() => { const c = document.getElementById('sec-watch'); return c ? c.innerText : null; });
  if (!card || !/مراقبة الأمان/.test(card) || !/التحقق بخطوتين/.test(card) || !/105\.1\.2\.3/.test(card) || !/iPhone/.test(card)) bad.push('sec card ' + (card || '').slice(0, 120));
  await p.evaluate(() => { window.__cf = setInterval(() => { const x = document.getElementById('cf-ok'); if (x) x.click(); }, 150); });
  await p.evaluate(() => { const k = document.querySelector('.sec-kick'); if (k) k.click(); }); await p.waitForTimeout(1500);
  if (!kicked || kicked.p_uid !== '11111111-2222-4333-8444-555555555555') bad.push('kick ' + JSON.stringify(kicked));
  // الكود المدسوس كيبان كنص عادي، ماشي كعنصر
  const asText = await p.evaluate(() => !document.querySelector('#sec-watch img[src="x"]'));
  if (!asText) bad.push('injected <img> rendered as element in sec card');
  // (3) clickjacking: موقع آخر (127.0.0.1) كيحط التطبيق داخل إطار
  const q = await ctx.newPage(); await q.route(/googleapis|gstatic/, r => r.abort());
  await q.goto(OTHER + 'brand.html'); // أصل مختلف
  await q.evaluate(u => { document.body.innerHTML = `<iframe id="f" src="${u}" style="width:300px;height:300px"></iframe>`; }, BASE + 'verify.html');
  await q.waitForTimeout(2500);
  const fr = q.frames().find(f => f.url().startsWith(BASE));
  const framed = fr ? await fr.evaluate(() => getComputedStyle(document.documentElement).display).catch(() => 'gone') : 'gone';
  const topUrl = q.url();
  if (!(framed === 'none' || framed === 'gone' || topUrl.startsWith(BASE))) bad.push('clickjacking: framed page visible (' + framed + ')');
  console.log('violations:', viol.length ? viol.join(' | ') : 'none', '| app viol:', (v2 || []).length ? v2.join(' ; ') : 'none');
  const ok = !bad.length && !viol.length && !(v2 || []).length && !errs.length;
  console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.slice(0, 3).join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
