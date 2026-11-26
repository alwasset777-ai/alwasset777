// v237: خانات الرئيسية طالعين وقراب + 🔔 «دخول من جهاز جديد» (المرة الأولى بلا تنبيه، جهاز جديد ← تنبيه، «هادا أنا») + 🛡️ تذكير الشهر
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const OUT = process.env.SHOT || '/tmp/v237';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 428, height: 926 } }); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  const now = new Date().toISOString();
  let ses = [{ at: now, ip: '105.1.1.1', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', aal: 'aal1' }];
  await p.route(/\/rest\/v1\/rpc\/w777_sec_watch/, r => r.fulfill({ json: { admin_sessions: ses, admin_mfa: 0, multi_ip: [], agent_limit_hits: [] } }));
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  const home = async () => { await p.goto(BASE + '#/settings'); await p.waitForTimeout(300); await p.goto(BASE + '#/'); await p.waitForSelector('.hrow'); await p.waitForTimeout(900); };
  await home();
  // ⬆️ التخطيط: السطر الأول قريب من فوق والسطرين قراب
  const L = await p.evaluate(() => { const h = document.querySelector('.hero').getBoundingClientRect(), r = [...document.querySelectorAll('.hrow')].map(e => e.getBoundingClientRect()); return { top: r[0].top - h.top, gap: r[1].top - r[0].bottom }; });
  if (L.top > 56 || L.gap > 8) bad.push('layout ' + JSON.stringify(L));
  // 1) أول مرة: كلشي معروف، بلا تنبيه
  if ((await p.$eval('#home-sec', e => e.textContent.trim()))) bad.push('first visit alert');
  const k1 = await p.evaluate(() => JSON.parse(localStorage.w777_known_dev || 'null')); if (!Array.isArray(k1) || k1.length < 1) bad.push('seed ' + JSON.stringify(k1));
  // 2) جهاز جديد ← تنبيه
  ses = [{ at: now, ip: '41.250.3.3', ua: 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36', aal: 'aal1' }, ...ses];
  await p.evaluate(() => { localStorage.w777_sec_chk = '0'; }); await home();
  const t = await p.$eval('#home-sec', e => e.textContent);
  if (!/جهاز جديد/.test(t) || !/Android 14/.test(t) || /Android \(Android/.test(t) || !/41\.250\.3\.3/.test(t)) bad.push('alert ' + t.slice(0, 120));
  await p.screenshot({ path: OUT + '-alert.png' });
  // كيبقى ظاهر حتى بلا ما نعاودو نسولو الخادم
  await home(); if (!(await p.$('#sec-me'))) bad.push('alert persists');
  await p.click('#sec-me'); await p.waitForTimeout(200);
  if ((await p.$eval('#home-sec', e => e.textContent.trim()))) bad.push('me not cleared');
  await p.evaluate(() => { localStorage.w777_sec_chk = '0'; }); await home();
  if ((await p.$eval('#home-sec', e => e.textContent.trim()))) bad.push('known device alerted again');
  // 3) تذكير الشهر
  await p.evaluate(() => { localStorage.w777_sec_month = JSON.stringify('2020-01'); }); await home();
  if (!/تذكير الشهر/.test(await p.$eval('#home-sec', e => e.textContent))) bad.push('monthly');
  await p.screenshot({ path: OUT + '-month.png' });
  await p.click('#sec-later'); await home();
  if ((await p.$eval('#home-sec', e => e.textContent.trim()))) bad.push('later not saved');
  // لوحة الأمان: التحقق بخطوتين ماشي «تنبيه»
  await p.goto(BASE + '#/agencies/manage'); await p.waitForSelector('#sec-watch .section-title', { timeout: 10000 }).catch(() => bad.push('sec watch'));
  const sw = await p.$eval('#sec-watch', e => e.textContent).catch(() => ''); if (/فعّلو دابا/.test(sw) || !/مطفي باختيارك/.test(sw)) bad.push('sec watch mfa ' + sw.slice(0, 80));
  console.log(JSON.stringify({ bad, errs, L })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
