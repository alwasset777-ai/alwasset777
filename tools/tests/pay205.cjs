// 💳 v205: طرق الأداء — المشترك: نافذة الأداء (المعلومات + نسخ + رفع الوصل) · المدير: القبول/الرفض + معلومات الحسابات
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const fs = require('fs'), os = require('os'), path = require('path');
const INFO = { id: 1, bank_name: 'بنك تجريبي', bank_holder: 'مجموعة الوسيط', rib: '000000000000000000000000', mt_name: 'اسم تجريبي', mt_city: 'مكناس', mt_phone: '0600000000', note: null };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [];
  const img = path.join(os.tmpdir(), 'w777-recu-' + Date.now() + '.png');
  fs.writeFileSync(img, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  // 1) المشترك
  {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push('m: ' + e.message));
    await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
    await p.route(/rest\/v1\/rpc\/w777_is_admin/, r => r.fulfill({ json: false }));
    await p.route(/rest\/v1\/w777_pay_info/, r => r.fulfill({ json: [INFO] }));
    await p.route(/rest\/v1\/w777_payments/, r => r.fulfill({ json: [{ id: 1, method: 'bank', amount: 199, status: 'approved', created_at: new Date().toISOString(), new_until: '2027-11-18' }] }));
    const up = [], sub = [];
    await p.route(/storage\/v1\/object\/w777-pay\//, r => { up.push(r.request().url()); r.fulfill({ json: { Key: 'x' } }); });
    await p.route(/rest\/v1\/rpc\/w777_pay_submit/, r => { sub.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ json: 7 }); });
    await p.goto(BASE); await F.login(p, BASE);
    await p.evaluate(() => { location.hash = '#/terms'; }); await p.waitForTimeout(1800);
    if (!(await p.$('#tr-pay'))) bad.push('no pay button on terms');
    else {
      await p.click('#tr-pay'); await p.waitForTimeout(800);
      const t = await p.evaluate(() => (document.querySelector('.modal') || {}).innerText || '');
      if (!/تحويل بنكي/.test(t) || !/وكالة تحويل الأموال/.test(t) || !/000000000000000000000000/.test(t) || !/مكناس/.test(t) || !/✅ مقبول/.test(t)) bad.push('modal ' + t.slice(0, 160));
      await p.click('#pay-send'); await p.waitForTimeout(300);
      if (sub.length) bad.push('sent without file');
      await p.setInputFiles('#pay-file', img); await p.fill('.modal [name=ref]', 'VIR-123');
      await p.click('#pay-send'); await p.waitForTimeout(1500);
      if (!up.length || !/w777-pay\/[0-9a-f-]+\/recu-/.test(up[0])) bad.push('upload ' + up[0]);
      const s0 = sub[0] || {};
      if (s0.p_method !== 'bank' || !(s0.p_amount > 0) || s0.p_ref !== 'VIR-123' || !/^[0-9a-f-]+\/recu-[a-z0-9]+\.(jpg|png)$/.test(s0.p_proof || '')) bad.push('submit ' + JSON.stringify(s0));
    }
    await c.close();
  }
  // 2) المدير
  {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push('a: ' + e.message));
    await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
    await p.route(/rest\/v1\/rpc\/w777_share_stats/, r => r.fulfill({ json: [] }));
    await p.route(/rest\/v1\/rpc\/w777_share_refs/, r => r.fulfill({ json: [] }));
    let rows = [{ id: 3, uid: 'u1', method: 'transfer', amount: 199, ref: 'CP-9', proof: 'u1/recu-a.jpg', status: 'pending', created_at: new Date().toISOString(), name: 'وكالة <i>تجريبية</i>', code: 'AG042', phone: '0612345678' }];
    const dec = [], patched = [];
    await p.route(/rest\/v1\/rpc\/w777_pay_list/, r => r.fulfill({ json: rows }));
    await p.route(/rest\/v1\/rpc\/w777_pay_decide/, r => { const j = JSON.parse(r.request().postData() || '{}'); dec.push(j); rows = rows.map(x => x.id === j.p_id ? { ...x, status: j.p_ok ? 'approved' : 'rejected', new_until: '2027-11-18' } : x); r.fulfill({ json: '2027-11-18' }); });
    await p.route(/rest\/v1\/w777_pay_info/, r => { if (r.request().method() === 'PATCH') { patched.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 204, body: '' }); } r.fulfill({ json: [INFO] }); });
    await p.goto(BASE); await F.login(p, BASE);
    await p.evaluate(() => { location.hash = '#/agencies/manage'; }); await p.waitForTimeout(2600);
    const a = await p.evaluate(() => { const e = document.querySelector('#pay-admin'); return e ? { t: e.innerText, h: e.innerHTML } : null; });
    if (!a || !/أداءات الاشتراك/.test(a.t) || !/AG042/.test(a.t) || /<i>تجريبية<\/i>/.test(a.h) || !(await p.$('#pay-admin .pay-ok'))) bad.push('admin ' + JSON.stringify(a && a.t.slice(0, 120)));
    else {
      await p.click('#pay-admin .pay-ok'); await p.waitForTimeout(300); await p.click('#cf-ok'); await p.waitForTimeout(800);
      if (JSON.stringify(dec) !== '[{"p_id":3,"p_ok":true}]') bad.push('decide ' + JSON.stringify(dec));
      const wa = await p.evaluate(() => { const x = document.querySelector('.modal a.wa'); return x ? decodeURIComponent(x.href) : ''; });
      if (!/wa\.me\/212612345678/.test(wa) || !/توصلنا بالأداء/.test(wa)) bad.push('wa ' + wa.slice(0, 100));
      await p.click('.modal button[data-close]').catch(() => {}); await p.waitForTimeout(800);
      await p.evaluate(() => { const d = document.querySelector('#pay-admin details.more-f'); if (d) d.open = true; });
      await p.fill('#payi [name=rib]', '111111111111111111111111'); await p.click('#payi-save'); await p.waitForTimeout(600);
      if (!patched.length || patched[0].rib !== '111111111111111111111111') bad.push('patch ' + JSON.stringify(patched));
    }
    await c.close();
  }
  fs.unlinkSync(img);
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
