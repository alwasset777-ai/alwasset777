// 🎁 v197: مكافأة الروابط — المشترك كيشوف التقدم (كل 5 = شهر)، والمدير كيوافق ولا كيرفض + تهنئة واتساب
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.SHOT || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
  const bad = [], errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
  await p.route(/rest\/v1\/rpc\/w777_share_stats/, r => r.fulfill({ json: [{ kind: 'page', via: 'view', d7: 1, d30: 2, total: 3 }] }));
  await p.route(/rest\/v1\/rpc\/w777_share_refs/, r => r.fulfill({ json: [] }));
  await p.route(/rest\/v1\/rpc\/w777_my_refs/, r => r.fulfill({ json: [{ signups: 7, granted: 1, pending: 0 }] }));
  let rows = [{ id: 11, ref: 'AG042', milestone: 5, status: 'pending', name: 'وكالة <b>الأطلس</b>', phone: '0612345678', sub_until: null, signups: 5 },
    { id: 9, ref: 'BR7', milestone: 5, status: 'granted', new_until: '2027-06-18', name: 'وكالة النخيل', phone: null, signups: 6 }];
  const decided = [];
  await p.route(/rest\/v1\/rpc\/w777_rewards_list/, r => r.fulfill({ json: rows }));
  await p.route(/rest\/v1\/rpc\/w777_reward_decide/, r => { const j = JSON.parse(r.request().postData() || '{}'); decided.push(j);
    rows = rows.map(x => x.id === j.p_id ? { ...x, status: j.p_ok ? 'granted' : 'rejected', new_until: '2027-07-01' } : x);
    r.fulfill({ json: j.p_ok ? '2027-07-01' : null }); });
  await p.goto(BASE); await F.login(p, BASE);
  // 1) المشترك (ماشي مدير): التقدم فـ«🔗 رابطك الخاص»
  {
    const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const q = await c2.newPage();
    q.on('pageerror', e => errs.push('member: ' + e.message));
    await q.route(/googleapis|gstatic/, r => r.abort()); await F.install(q);
    await q.route(/rest\/v1\/rpc\/w777_is_admin/, r => r.fulfill({ json: false }));
    await q.route(/rest\/v1\/rpc\/w777_my_refs/, r => r.fulfill({ json: [{ signups: 7, granted: 1, pending: 0 }] }));
    await q.goto(BASE); await F.login(q, BASE);
    await q.evaluate(() => { location.hash = '#/guide'; }); await q.waitForTimeout(1800);
    const pr = await q.evaluate(() => { const e = document.querySelector('#ref-prog'); return e ? { t: e.innerText, w: e.querySelector('.rp-bar i') ? e.querySelector('.rp-bar i').style.width : '' } : null; });
    if (!pr || !/كل 5 تسجيلات = شهر مجاني/.test(pr.t) || !/7/.test(pr.t) || !/باقي ⁦?3/.test(pr.t) || !/خديتي/.test(pr.t) || pr.w !== '40%') bad.push('member ' + JSON.stringify(pr));
    if (SHOT) { await q.$eval('.ref-card', e => e.scrollIntoView()).catch(() => {}); await q.screenshot({ path: SHOT + '/rw-member.png' }); }
    await c2.close();
  }
  // 2) المدير: المكافآت
  await p.evaluate(() => { location.hash = '#/agencies/manage'; }); await p.waitForTimeout(2600);
  const ad = await p.evaluate(() => { const e = document.querySelector('#ref-rewards'); return e ? { t: e.innerText, html: e.innerHTML, ok: e.querySelectorAll('.rw-ok').length } : null; });
  if (!ad || !/مكافآت كتسنى الموافقة/.test(ad.t) || ad.ok !== 1 || !/AG042/.test(ad.t) || /<b>الأطلس<\/b>/.test(ad.html) || !/آخر القرارات/.test(ad.t)) bad.push('admin ' + JSON.stringify(ad && ad.t));
  if (SHOT) { await p.$eval('#ref-rewards', e => e.scrollIntoView()); await p.screenshot({ path: SHOT + '/rw-admin.png' }); }
  // إلغاء ← ما كيتصيفط والو
  await p.click('#ref-rewards .rw-ok'); await p.waitForTimeout(300); await p.click('.modal [data-close]'); await p.waitForTimeout(300);
  if (decided.length) bad.push('cancel sent');
  // الموافقة ← التهنئة فواتساب
  await p.click('#ref-rewards .rw-ok'); await p.waitForTimeout(300); await p.click('#cf-ok'); await p.waitForTimeout(800);
  if (JSON.stringify(decided) !== '[{"p_id":11,"p_ok":true}]') bad.push('decide ' + JSON.stringify(decided));
  const wa = await p.evaluate(() => { const a = document.querySelector('.modal a.wa'); return a ? decodeURIComponent(a.href) : ''; });
  if (!/wa\.me\/212612345678/.test(wa) || !/مبروك/.test(wa) || !/شهر مجاني/.test(wa)) bad.push('wa ' + wa.slice(0, 120));
  await p.click('.modal button[data-close]').catch(() => {}); await p.waitForTimeout(800);
  const after = await p.evaluate(() => document.querySelector('#ref-rewards').innerText);
  if (!/ما كاين حتى مكافأة كتسنى/.test(after)) bad.push('after ' + after.slice(0, 120));
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
