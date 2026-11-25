// v227: 📲 صفحة التثبيت المجانية install.html — الخطوات حسب الجهاز (آيفون/أندرويد)، الفرنسية، QR، الروابط بالكود، العدّاد، والرابط من شاشة QR فالتطبيق
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [];
  for (const [tag, ua, q] of [['ios', IOS, '?ref=WASSET'], ['android', AND, '?ref=AG042'], ['fr', IOS, '?lang=fr']]) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: ua, locale: 'ar-MA', serviceWorkers: 'block' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (/Content Security Policy/.test(m.text())) errs.push(tag + ' CSP: ' + m.text().slice(0, 120)); });
    const logs = []; await p.route(/rpc\/w777_share_log/, r => { logs.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
    await p.route(/googleapis|gstatic/, r => r.abort());
    await p.goto(BASE + 'install.html' + q); await p.waitForTimeout(900);
    const s = await p.evaluate(() => ({ ios: !document.getElementById('os-ios').classList.contains('hide'), and: !document.getElementById('os-android').classList.contains('hide'), qr: !!document.querySelector('#qr svg'), reg: document.getElementById('go-reg').getAttribute('href'), demo: document.getElementById('go-demo').getAttribute('href'), dir: document.documentElement.dir, h1: document.querySelector('h1').textContent }));
    if (!s.qr) bad.push(tag + ' qr');
    if (tag === 'ios' && (!s.ios || s.and || s.reg !== './?gate=1&ref=WASSET' || !/ref=WASSET/.test(s.demo))) bad.push('ios ' + JSON.stringify(s));
    if (tag === 'android' && (!s.and || s.ios || s.reg !== './?gate=1&ref=AG042')) bad.push('android ' + JSON.stringify(s));
    if (tag === 'fr' && (s.dir !== 'ltr' || !/Installez/.test(s.h1))) bad.push('fr ' + JSON.stringify(s));
    if (!logs.some(l => l.p_kind === 'install' && l.p_via === 'view')) bad.push(tag + ' visit not logged');
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v227') + '-' + tag + '.png', fullPage: true });
    await c.close();
  }
  // الرابط من شاشة QR فالتطبيق (بالكود ديال المكتب)
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
  p.on('pageerror', e => errs.push('app: ' + e.message));
  await p.addInitScript(() => { localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.route(/rpc\/w777_my_status/, r => r.fulfill({ json: { ok: true, admin: true, member: true } }));
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.evaluate(() => { location.hash = '#/qr'; }); await p.waitForTimeout(1500);
  const href = await p.$eval('a[href^="install.html"]', a => a.getAttribute('href')).catch(() => '');
  if (href !== 'install.html?ref=WASSET') bad.push('qr page link ' + href);
  console.log(JSON.stringify({ bad, errs }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
