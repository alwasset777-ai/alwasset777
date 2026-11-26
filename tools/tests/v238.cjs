// v238: العقارات الخيالية ديال «بيانات تجريبية» ما كتنشرش فالشبكة، والقدام كيتخباو، والعلامة «🧪 مثال»، والزر ← وضع العرض
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [], posted = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  const OW = '11111111-2222-3333-4444-555555555555', now = new Date().toISOString();
  const seed = { owner: OW, id: 'seed1', agency: 'وكالة تجربة', phone: '0600000000', city: 'مكناس', type: 'villa', trx: 'sale', price: 2900000, photo_ids: [], deleted: false, updated_at: now,
    data: { ref: 'W777-0002', title: 'فيلا للبيع 300 م² بالرياض - مكناس', transaction: 'sale', type: 'villa', city: 'مكناس', district: 'الرياض', priceMin: 2600000, priceMax: 2900000, areaTotal: 300 } };
  const real = { owner: OW, id: 'real1', agency: 'وكالة تجربة', phone: '0600000000', city: 'مكناس', type: 'villa', trx: 'sale', price: 2900000, photo_ids: ['ph1'], deleted: false, updated_at: now,
    data: { ref: 'W777-0002', title: 'فيلا حقيقية', transaction: 'sale', type: 'villa', city: 'مكناس', district: 'الرياض', priceMin: 2600000, priceMax: 2900000, areaTotal: 300 } };
  await p.route(/\/rest\/v1\/w777_shared_props/, r => {
    const m = r.request().method();
    if (m === 'GET') return r.fulfill({ json: [seed, real] });
    if (m === 'POST') { try { posted.push(...JSON.parse(r.request().postData())); } catch (e) { /* */ } return r.fulfill({ status: 201, body: '' }); }
    return r.fulfill({ status: 204, body: '' });
  });
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  // 1) الشبكة: الخيالي القديم مخبّي، الحقيقي (بالصور) باين — حتى بنفس المرجع
  await p.goto(BASE + '#/agencies'); await p.waitForSelector('#ngrid .prop-card', { timeout: 10000 }).catch(() => bad.push('no grid'));
  const hrefs = await p.$$eval('#ngrid .prop-card', a => a.map(x => x.getAttribute('href')));
  if (hrefs.some(h => /seed1/.test(h)) || !hrefs.some(h => /real1/.test(h))) bad.push('net filter ' + hrefs.join('|'));
  // 2) النشر: عقار خيالي (بالعلامة ولا بالبصمة) ما كيتنشرش، والحقيقي كيتنشر
  await p.evaluate(async () => {
    const base = { status: 'available', media: [], specs: {}, features: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), city: 'مكناس', transaction: 'sale' };
    await window.W777_DB.saveRec('properties', Object.assign({}, base, { id: 'loc-old', ref: 'W777-0006', type: 'farm', district: 'وسط المدينة', priceMin: 1800000, priceMax: 2000000, title: 'ضيعة' }));
    await window.W777_DB.saveRec('properties', Object.assign({}, base, { id: 'loc-flag', ref: 'X-9', type: 'shop', district: 'حمرية', priceMax: 500000, demo: true, title: 'محل' }));
    await window.W777_DB.saveRec('properties', Object.assign({}, base, { id: 'loc-real', ref: 'W777-0099', type: 'villa', district: 'الرياض', priceMax: 3100000, title: 'فيلا' }));
    await window.W777_TEST.loadAll(); await window.W777_SYNC.syncNow();
  });
  await p.waitForTimeout(1500);
  const ids = posted.map(x => x.id);
  if (ids.includes('loc-old') || ids.includes('loc-flag') || !ids.includes('loc-real')) bad.push('publish ' + ids.join('|'));
  // 3) «🧪 مثال» على البطاقة
  await p.goto(BASE + '#/properties?q=W777-0006'); await p.waitForTimeout(800);
  const badge = await p.$$eval('.prop-card', a => a.map(x => x.textContent).join(' ')); if (!/🧪 مثال/.test(badge)) bad.push('badge');
  console.log(JSON.stringify({ bad, errs, posted: ids.length })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
