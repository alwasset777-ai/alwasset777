// v231: ❤️ «عجبني» على عقار الشبكة (رسالة للوكالة بالاسم والهاتف) + 🔔 تنبيهات البحث (الحفظ، الجديد، الرئيسية، المسح)
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [], posts = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  // زبون (الفئة «آخر») ماشي المدير
  const today = new Date().toISOString();
  await p.route(/\/rest\/v1\/rpc\/w777_is_admin/, r => r.fulfill({ json: false }));
  await p.route(/\/rest\/v1\/rpc\/w777_my_status/, r => r.fulfill({ json: { admin: false, staff: false, member: true, ok: true } }));
  await p.route(/\/rest\/v1\/w777_agencies\?uid=eq/, r => r.fulfill({ json: [{ code: 'U001', name: 'زبون الاختبار', phone: '0612345678', kind: 'member', active: true, terms_at: today, seat_no: 1, seat_zone: 'ma' }] }));
  await p.route(/\/rest\/v1\/w777_msgs$/, r => { if (r.request().method() === 'POST') { posts.push(JSON.parse(r.request().postData())); return r.fulfill({ status: 201, body: '' }); } return r.fallback(); });
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  // 🔔 1) حفظ تنبيه من «عقارات الشبكة»
  await p.goto(BASE + '#/agencies'); await p.waitForSelector('#al-save', { timeout: 10000 }).catch(() => bad.push('no alert button'));
  const total = await p.$$eval('#ngrid .prop-card', a => a.length);
  if (!total) bad.push('no network props');
  await p.click('#al-save'); await p.waitForSelector('#al-ok'); await p.click('#al-ok'); await p.waitForTimeout(300);
  const st = await p.evaluate(() => { const k = Object.keys(localStorage).find(k => k.startsWith('w777_alerts_')); const a = k ? JSON.parse(localStorage[k]) : []; return { k, n: a.length, seen: a[0] ? a[0].seen.length : -1 }; });
  if (st.n !== 1 || st.seen !== total) bad.push('alert saved ' + JSON.stringify(st) + ' total ' + total);
  // 2) «جديد»: كنخويو اللي شاف ← المودال كيبين العدد + الرئيسية
  await p.evaluate(k => { const a = JSON.parse(localStorage[k]); a[0].seen = []; localStorage[k] = JSON.stringify(a); }, st.k);
  await p.click('#al-list'); await p.waitForSelector('.al-card', { timeout: 6000 }).catch(() => bad.push('alerts modal'));
  const badge = await p.$eval('.al-card .badge', e => e.textContent).catch(() => '');
  const cards = await p.$$eval('.al-card .prop-card', a => a.length);
  if (!/جديد/.test(badge) || !cards) bad.push('fresh ' + badge + ' ' + cards);
  await p.screenshot({ path: (process.env.SHOT || '/tmp/v231') + '-alerts.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); if (await p.$('.modal [data-close]')) await p.click('.modal button[data-close]').catch(() => {});
  await p.goto(BASE + '#/'); await p.waitForTimeout(1500);
  const home = await p.$eval('#home-al', e => e.textContent).catch(() => 'NOEL');
  if (!/جديد|جداد/.test(home)) bad.push('home banner ' + home.slice(0, 60));
  await p.screenshot({ path: (process.env.SHOT || '/tmp/v231') + '-home.png' });
  // «✓ شفتهم» ← صفر
  await p.click('#home-al-go'); await p.waitForSelector('[data-al-seen]'); await p.click('[data-al-seen]'); await p.waitForTimeout(300);
  const b2 = await p.$eval('.al-card .badge', e => e.textContent).catch(() => ''); if (!/ما كاين/.test(b2)) bad.push('seen ' + b2);
  await p.click('[data-al-del]'); await p.waitForTimeout(200);
  if ((await p.evaluate(k => JSON.parse(localStorage[k]).length, st.k)) !== 0) bad.push('delete');
  if (await p.$('.modal button[data-close]')) await p.click('.modal button[data-close]').catch(() => {});
  // ❤️ 3) «عجبني» فصفحة العقار
  await p.goto(BASE + '#/agencies'); await p.waitForTimeout(1200);
  const href = await p.$eval('#ngrid .prop-card', a => a.getAttribute('href'));
  await p.goto(BASE + href); await p.waitForSelector('#net-like', { timeout: 8000 }).catch(() => bad.push('no like button'));
  await p.click('#net-like'); await p.waitForSelector('#lk-go');
  const pre = await p.$eval('[name=lk-phone]', i => i.value); if (pre !== '0612345678') bad.push('prefill ' + pre);
  await p.fill('[name=lk-note]', 'بغيت نزور العقار'); await p.click('#lk-go'); await p.waitForTimeout(800);
  const m = posts[0] || {};
  if (!m.recipient || !/زبون الاختبار/.test(m.body || '') || !/0612345678/.test(m.body || '') || !/بغيت نزور/.test(m.body || '') || !/#\/agencies\/p\//.test(m.body || '')) bad.push('like msg ' + JSON.stringify(m).slice(0, 200));
  const lbl = await p.$eval('#net-like', e => e.textContent); if (!/بعثتي/.test(lbl)) bad.push('like label ' + lbl);
  await p.goto(BASE + '#/agencies'); await p.waitForTimeout(1200);
  if (!(await p.$('#ngrid .net-liked'))) bad.push('liked heart on card');
  // المدير ما كيشوفش «عجبني»
  console.log(JSON.stringify({ bad, errs, posts: posts.length })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
