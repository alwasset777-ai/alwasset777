// v182: صفحة التحقق verify.html + QR فالشهادة + شارة «متكوّن معتمد» فالدليل
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.S || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const bad = [];
  // 1) verify.html (زائر بلا حساب)
  const v = await b.newPage({ viewport: { width: 390, height: 844 } }); v.on('pageerror', e => errs.push(e.message));
  await v.route(/\/rest\/v1\/rpc\/w777_cert_check/, r => { const no = JSON.parse(r.request().postData() || '{}').no; return r.fulfill({ json: no === 'W777-AC-2026-OK1234' ? [{ cert_no: no, cert_name: 'يوسف العلوي', cert_date: 1762780000000, avg: 0.92 }] : [] }); });
  await v.goto(BASE + 'verify.html?no=w777-ac-2026-ok1234'); await v.waitForTimeout(900);
  if (!(await v.$('.ok')) || !/يوسف العلوي/.test(await v.textContent('.ok .nm'))) bad.push('verify ok');
  if (SHOT) await v.screenshot({ path: SHOT + '/verify-ok.png', fullPage: true });
  await v.fill('#no', 'W777-AC-2026-BAD999'); await v.click('#f button'); await v.waitForTimeout(700);
  if (!(await v.$('.no'))) bad.push('verify no');
  if (!/no=W777-AC-2026-BAD999/.test(v.url())) bad.push('verify url');
  const sw = await v.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push('verify overflow');
  if (SHOT) await v.screenshot({ path: SHOT + '/verify-no.png', fullPage: true });
  // 2) التطبيق: QR فالشهادة + الشارة فالدليل
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.route(/\/rest\/v1\/w777_academy/, r => r.request().method() === 'POST' ? r.fulfill({ status: 201, body: '' }) : r.fulfill({ json: [] }));
  let certUid = null;
  await p.route(/\/rest\/v1\/rpc\/w777_cert_uids/, r => r.fulfill({ json: certUid ? [certUid] : [] }));
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.evaluate(() => { const s = {}; window.W777_ACAD && 0; s.cert = { name: 'متكون تجريبي', date: 1762780000000 }; localStorage.w777_acad = JSON.stringify(s); });
  await p.goto(BASE + '#/learn'); await p.waitForTimeout(2500);
  await p.evaluate(() => { const s = JSON.parse(localStorage.w777_acad); window.W777_ACAD.modules.forEach(x => { s[x.m] = { les: {}, tries: 1, best: 0.9, pass: Date.now() }; }); localStorage.w777_acad = JSON.stringify(s); });
  await p.goto(BASE + '#/learn/cert'); await p.waitForTimeout(1500);
  const q = await p.$('.ac-cert .qr[data-qr]'); if (!q) bad.push('cert qr el');
  else { const d = await q.getAttribute('data-qr'); if (!/verify\.html\?no=W777-AC-/.test(d)) bad.push('qr url ' + d); if (!(await p.$('.ac-cert .qr svg'))) bad.push('qr svg'); }
  if (SHOT) { await p.setViewportSize({ width: 1100, height: 900 }); await p.waitForTimeout(300); await (await p.$('.ac-cert')).screenshot({ path: SHOT + '/cert-qr.png' }); await p.setViewportSize({ width: 390, height: 844 }); }
  // الدليل: uid ديال أول وسيط
  certUid = await p.evaluate(async () => { const r = await window.W777_SYNC.request('/rest/v1/w777_agencies?select=uid,kind'); const j = await r.json(); return (j.find(a => a.kind === 'broker') || {}).uid; });
  await p.goto(BASE + '#/brokers'); await p.waitForTimeout(2200);
  const n = await p.$$eval('.dir-card .cert-b', a => a.length); if (n !== 1) bad.push('badge count ' + n);
  if (SHOT) await p.screenshot({ path: SHOT + '/badge.png' });
  const sw2 = await p.evaluate(() => document.documentElement.scrollWidth); if (sw2 > 391) bad.push('dir overflow');
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
