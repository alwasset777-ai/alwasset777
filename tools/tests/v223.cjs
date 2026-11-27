// v223: الفتح ما كيبقاش خاوي (قاعدة الآيفون معلّقة ← إعادة المحاولة، ولا خانة الإنقاذ) + تسجيل الأخطاء + قائمة «+» + 🩺 فحص + 🎬 وضع العرض
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [];
  const ctx = async (o = {}) => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
    p.on('pageerror', e => errs.push((o.tag || '') + ': ' + e.message));
    await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; });
    await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
    await p.route(/rpc\/w777_my_status/, r => r.fulfill({ json: { ok: true, admin: true, member: true } }));
    return { c, p }; };
  const mainLen = p => p.evaluate(() => (document.getElementById('main').innerText || '').trim().length);
  // 1) أول فتح ديال القاعدة ما كيجاوبش (بحال الآيفون) ← التطبيق كيعاود وكيتحل
  {
    const { c, p } = await ctx({ tag: 'idb1' });
    await p.addInitScript(() => { const o = indexedDB.open.bind(indexedDB); let n = 0; indexedDB.open = (...a) => { if (n++ === 0) return {}; return o(...a); }; });
    const t0 = Date.now(); await p.goto(BASE); await p.waitForFunction(() => (document.getElementById('main').innerText || '').trim().length > 50, null, { timeout: 15000 }).catch(() => bad.push('idb retry: still blank'));
    const ms = Date.now() - t0; if (ms > 9000) bad.push('idb retry slow ' + ms);
    if (await p.$('.boot-rescue')) bad.push('rescue shown on recoverable hang');
    await c.close();
  }
  // 2) القاعدة معلّقة نهائياً ← خانة الإنقاذ (ماشي صفحة خاوية) + الخطأ كيتسجل
  {
    const { c, p } = await ctx({ tag: 'idb2' }); const logs = [];
    await p.route(/rpc\/w777_log_error/, r => { logs.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
    await p.addInitScript(() => { indexedDB.open = () => ({}); });
    await p.goto(BASE); await p.waitForSelector('.boot-rescue', { timeout: 16000 }).catch(() => bad.push('no rescue card'));
    if (!(await p.$('#br-re')) || !(await p.$('#br-fix'))) bad.push('rescue buttons');
    if (!logs.some(l => l.p_kind === 'boot' && /boot-timeout @db/.test(l.p_msg || ''))) bad.push('boot not logged ' + JSON.stringify(logs).slice(0, 200));
    if (logs.some(l => /@|\d{8,}/.test((l.p_msg || '').replace(/@db|@route|@lock|@setup|@start/g, '')))) bad.push('personal data in log');
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v223') + '-rescue.png' });
    await c.close();
  }
  // 3) قائمة «+»: 5 خانات بالترتيب، بلا الحجز والوكالات + 🩺 الفحص + الإعدادات
  {
    const { c, p } = await ctx({ tag: 'app' });
    await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
    await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(1200);
    const items = await p.$$eval('#fab-menu a', a => a.map(x => x.getAttribute('href') + '|' + x.textContent.trim()));
    const hrefs = items.map(x => x.split('|')[0]);
    if (JSON.stringify(hrefs) !== JSON.stringify(['#/qr', '#/property/new', '#/request/new', '#/appointment/new', '#', '#/search'])) bad.push('fab order ' + JSON.stringify(items));
    if (items.some(x => /الحجز|الوكالات/.test(x))) bad.push('fab still has stays/agencies');
    // v259: الزر العائم «+» تحيد ← الإضافة من دائرة «إضافة» فالرئيسية (خانة كتنزل تحت الزر)
    if (await p.evaluate(() => getComputedStyle(document.querySelector('#fab')).display !== 'none')) bad.push('floating + still visible');
    await p.click('.hs-circ .hc[data-hm=add]'); await p.waitForTimeout(400);
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v223') + '-fab.png' });
    if (!(await p.$('.add-drop a[href="#/property/new"]'))) bad.push('add drop missing');
    await p.click('.hs-circ .hc[data-hm=add]'); await p.waitForTimeout(200);
    await p.evaluate(() => { location.hash = '#/check'; }); await p.waitForSelector('#ck-sum p', { timeout: 20000 }).catch(() => bad.push('check did not finish'));
    const ck = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.ck-row')].map(r => r.className + ' ' + r.innerText.replace(/\s+/g, ' ').slice(0, 70)), sum: document.getElementById('ck-sum').innerText }));
    if (ck.rows.length !== 6) bad.push('check rows ' + ck.rows.length);
    if (ck.rows.some(r => /⏳/.test(r))) bad.push('check pending ' + JSON.stringify(ck.rows));
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v223') + '-check.png', fullPage: true });
    console.log('check', JSON.stringify(ck));
    await p.evaluate(() => { location.hash = '#/settings?s=app'; }); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => { const c = [...document.querySelectorAll('.card')].find(x => /فحص قبل العرض/.test(x.innerText)); return c ? { hidden: c.hidden, demo: !!c.querySelector('[data-demo-in]') } : null; });
    if (!st || st.hidden || !st.demo) bad.push('settings card ' + JSON.stringify(st));
    await c.close();
  }
  // 4) 🎬 وضع العرض من شاشة الدخول: بلا حساب، معلومات خيالية، والخروج كيرجع لشاشة الدخول
  {
    const { c, p } = await ctx({ tag: 'demo' });
    await p.addInitScript(() => { sessionStorage.w777_gate = '1'; });
    await p.goto(BASE); await p.waitForSelector('body.gated', { timeout: 10000 }).catch(() => bad.push('no gate'));
    await p.click('[data-demo-in]'); await p.waitForSelector('#demo-bar', { timeout: 15000 }).catch(() => bad.push('no demo bar'));
    await p.waitForFunction(() => document.querySelectorAll('.hst').length > 0 || /عقار/.test(document.getElementById('main').innerText), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(3500);
    const d = await p.evaluate(async () => ({ gated: document.body.classList.contains('gated'), props: (await window.W777_DB.all('properties')).length, appts: (await window.W777_DB.all('appointments')).length, photos: (await window.W777_DB.all('properties')).filter(x => (x.media || []).length).length, on: window.W777_SYNC.isOn() }));
    if (d.gated || d.props < 5 || d.appts < 2 || d.photos < 3 || d.on) bad.push('demo ' + JSON.stringify(d));
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v223') + '-demo.png' });
    await p.click('#demo-bar [data-demo-exit]'); await p.waitForTimeout(2500);
    const after = await p.evaluate(async () => ({ bar: !!document.getElementById('demo-bar'), gated: document.body.classList.contains('gated'), demo: localStorage.w777_demo || '' }));
    if (after.bar || !after.gated || after.demo) bad.push('demo exit ' + JSON.stringify(after));
    await c.close();
  }
  console.log(JSON.stringify({ bad, errs }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
