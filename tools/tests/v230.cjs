// v230: الفئة «👤 آخر» (زبون ولا من خارج العقار): التسجيل، صفحة «حسابي» بلا دليل، القائمة الجانبية، المدير (الدليل + الإدارة + الدعوة)، join.html
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  // 1) مستعمل جديد كيتسجل بـ«آخر»
  {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push('reg: ' + e.message));
    const st = { registered: false, reg: null }, today = new Date().toISOString();
    const user = { id: '33333333-3333-3333-3333-333333333333', email: 'client@x.ma', factors: [] };
    await p.route(/translate|fonts\.googleapis|gstatic/, r => r.abort());
    await p.route(/\/(rest|storage|functions)\/v1\//, r => r.fulfill({ json: [] }));
    await p.route(/\/rest\/v1\/rpc\/w777_is_admin/, r => r.fulfill({ json: false }));
    await p.route(/\/rest\/v1\/rpc\/w777_my_status/, r => r.fulfill({ json: { admin: false, staff: false, member: st.registered, ok: true, email: 'client@x.ma' } }));
    await p.route(/\/rest\/v1\/rpc\/w777_register/, r => { st.reg = JSON.parse(r.request().postData()); st.registered = true; r.fulfill({ json: { code: 'U001', seat_no: 1, seat_zone: 'ma', terms_at: today } }); });
    await p.route(/\/rest\/v1\/w777_agencies\?uid=eq/, r => r.fulfill({ json: st.registered ? [{ code: 'U001', name: 'زبون الاختبار', kind: 'member', active: true, terms_at: today, seat_no: 1, seat_zone: 'ma' }] : [] }));
    await p.route(/\/auth\/v1\/otp/, r => r.fulfill({ json: {} }));
    await p.route(/\/auth\/v1\/verify/, r => r.fulfill({ json: { access_token: 'tok-c', refresh_token: 'r', expires_in: 3600, user } }));
    await p.route(/\/auth\/v1\/user/, r => r.fulfill({ json: user }));
    await p.goto(BASE + '?gate=1#/'); await p.waitForTimeout(1500);
    await p.fill('#au-mail', 'client@x.ma'); await p.click('#au-send'); await p.waitForTimeout(900);
    await p.fill('#au-code', '123456'); await p.waitForTimeout(2000);
    const kinds = await p.$$eval('.rg-kind', a => a.map(x => x.textContent.trim()));
    if (kinds.length !== 8 || !kinds.some(t => /آخر/.test(t))) bad.push('register kinds ' + kinds.join('|'));
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v230') + '-register.png', fullPage: true });
    await p.$eval('.rg-kind input[value=member]', i => { i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.fill('#rg [name=name]', 'زبون الاختبار'); await p.fill('#rg [name=phone]', '0612345678'); await p.fill('#rg [name=city]', 'مكناس');
    await p.check('#rg-ok'); await p.click('#rg-go'); await p.waitForTimeout(2200);
    if (!st.reg || st.reg.p_kind !== 'member') bad.push('register body ' + JSON.stringify(st.reg));
    await p.goto(BASE + '#/members'); await p.waitForTimeout(1500);
    const me = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('.page-head ~ * .seg a, .tabs a, .seg a')].map(a => a.textContent.trim()),
      browse: !!document.querySelector('a.btn[href="#/agencies"]'), form: !!document.getElementById('agme'),
      side: (() => { const a = document.querySelector('.sidenav a[data-nav=members]'); return a ? !a.hidden : null; })() }));
    if (!me.browse || !me.form || me.side !== true || me.tabs.some(t => /الدليل/.test(t))) bad.push('member page ' + JSON.stringify(me));
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v230') + '-member-me.png', fullPage: true });
    await p.goto(BASE + '#/members/dir'); await p.waitForTimeout(1200);
    if (!(await p.$('#agme'))) bad.push('member dir not blocked');
    await p.close();
  }
  // 2) المدير: الدليل + الإدارة + نافذة الإضافة فيها «آخر» + رسالة الدعوة
  {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push('admin: ' + e.message));
    await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1';
      window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
    await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
    await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
    await p.goto(BASE + '#/members'); await p.waitForTimeout(1500);
    const side = await p.evaluate(() => { const a = document.querySelector('.sidenav a[data-nav=members]'); return a && !a.hidden; });
    if (!side) bad.push('admin sidebar link');
    await p.goto(BASE + '#/members/manage?add=1'); await p.waitForSelector('#am-qr', { timeout: 10000 }).catch(() => bad.push('add modal'));
    const chips = await p.$$eval('.am-kinds .chip', a => a.map(x => x.textContent.trim()));
    if (chips.length !== 8 || !/آخر/.test(chips.join('|'))) bad.push('chips ' + chips.join('|'));
    const on = await p.$eval('.am-kinds .chip.on', a => a.textContent).catch(() => ''); if (!/آخر/.test(on)) bad.push('chip on ' + on);
    if (await p.$eval('#am-old', e => !!e.closest('details:not([hidden])')).catch(() => false)) bad.push('old codes visible');
    await p.fill('[name=am-phone]', '0611223344'); await p.click('#am-wa'); await p.waitForTimeout(200);
    const txt = decodeURIComponent(((await p.evaluate(() => window.__opened[0] || '')).split('text=')[1] || ''));
    if (!/آخر/.test(txt) || !/عقارات الشبكة/.test(txt) || !/k=member/.test(txt)) bad.push('invite ' + txt.slice(0, 160));
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v230') + '-admin-add.png' });
    await p.close();
  }
  // 3) صفحة العرض العمومية
  {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push('join: ' + e.message));
    await p.route(/supabase\.co|googleapis|gstatic/, r => r.fulfill({ json: [] }));
    await p.goto(BASE + 'join.html?k=member'); await p.waitForTimeout(1000);
    const j = await p.evaluate(() => document.body.textContent);
    if (!/الزبناء والعموم/.test(j)) bad.push('join member missing');
    await p.close();
  }
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
