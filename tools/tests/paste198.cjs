// 📋🎁 v198: لصق رسالة الزبون ← الاستمارة كتعمر بوحدها + تنبيه المكافآت فالرئيسية
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.SHOT || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
  const bad = [], errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
  let pend = 2;
  await p.route(/rest\/v1\/rpc\/w777_rewards_list/, r => r.fulfill({ json: Array.from({ length: pend }, (_, i) => ({ id: i + 1, ref: 'AG04' + i, milestone: 5, status: 'pending' })).concat([{ id: 9, ref: 'X', milestone: 5, status: 'granted' }]) }));
  await p.goto(BASE); await F.login(p, BASE);
  // 1) الرئيسية: التنبيه
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(2000);
  const hr = await p.evaluate(() => { const a = document.querySelector('#home-rw .home-rw'); return a ? { t: a.innerText, h: a.getAttribute('href') } : null; });
  if (!hr || !/⁦?2⁩? مكافآت كتسنى موافقتك/.test(hr.t) || hr.h !== '#/agencies/manage') bad.push('home ' + JSON.stringify(hr));
  if (SHOT) await p.screenshot({ path: SHOT + '/home-rw.png' });
  // بلا مكافآت ← ما كيبان والو
  pend = 0; await p.evaluate(() => { location.hash = '#/properties'; }); await p.waitForTimeout(600); await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(1800);
  if (await p.$('#home-rw .home-rw')) bad.push('home shown with 0');
  // 2) لصق رسالة الزبون
  const cases = [
    { msg: 'السلام عليكم، سميتي كريم بناني، كنقلب على شقة للكراء فمكناس حمرية، جوج بيوت، الميزانية بين 3000 و 4000 درهم. نمرتي 06 12 34 56 78',
      want: { 'client.name': 'كريم بناني', 'client.phone': '0612345678', trx: 'rent', types: ['apartment'], city: 'مكناس', budgetMin: 3000, budgetMax: 4000, bedroomsMin: '2', dist: 'حمرية' } },
    { msg: 'Bonjour, je suis Sara, je cherche une villa à vendre à Meknès, budget 250 millions, 300 m2. +212 661-000-111',
      want: { 'client.name': 'Sara', 'client.phone': '0661000111', trx: 'sale', types: ['villa'], city: 'مكناس', budgetMax: 2500000, areaMin: '300' } },
  ];
  for (const [i, k] of cases.entries()) {
    await p.evaluate(() => { location.hash = '#/requests'; }); await p.waitForTimeout(500);
    await p.evaluate(() => { location.hash = '#/request/new'; }); await p.waitForTimeout(1300);
    await p.click('#paste-msg'); await p.waitForTimeout(400);
    await p.fill('#pm-txt', k.msg); await p.click('#pm-go'); await p.waitForTimeout(700);
    const got = await p.evaluate(() => { const f = document.querySelector('#rform'); const v = n => (f.querySelector(`[name="${n}"]`) || {}).value || '';
      return { 'client.name': v('client.name'), 'client.phone': v('client.phone'), trx: (f.querySelector('[name=transaction]:checked') || {}).value, types: [...f.querySelectorAll('[name=types]:checked')].map(x => x.value),
        city: v('city'), budgetMin: +v('budgetMin').replace(/\D/g, '') || 0, budgetMax: +v('budgetMax').replace(/\D/g, '') || 0, bedroomsMin: v('bedroomsMin'), areaMin: v('areaMin'),
        dist: [...f.querySelectorAll('[name=districts]:checked')].map(x => x.value).join(','), desc: v('description').length }; });
    for (const [kk, w] of Object.entries(k.want)) {
      const g = got[kk];
      if (kk === 'dist' ? !String(g).includes(w) : JSON.stringify(g) !== JSON.stringify(w)) bad.push(`case${i} ${kk}: ${JSON.stringify(g)} ≠ ${JSON.stringify(w)}`);
    }
    if (!got.desc) bad.push(`case${i} desc empty`);
    if (SHOT && i === 0) await p.screenshot({ path: SHOT + '/paste.png', fullPage: true });
  }
  // الحفظ كيخدم من بعد اللصق
  await p.click('#rform button[type=submit]'); await p.waitForTimeout(1500);
  if (!/#\/request\/(?!new)/.test(await p.evaluate(() => location.hash))) bad.push('save ' + await p.evaluate(() => location.hash));
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
