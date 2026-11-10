// v181: لوحة الشهادات — الكل كيشوف، التحميل غير لصاحب الشهادة وللمدير، المدير يخبّي
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.S || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); const bad = [];
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  const CERTS = [
    { cert_no: 'W777-AC-2026-AAA111', cert_name: 'يوسف العلوي', cert_date: 1762780000000, avg: 0.92, mine: false, hidden: false },
    { cert_no: 'W777-AC-2026-BBB222', cert_name: 'سناء بنعلي', cert_date: 1762700000000, avg: 0.81, mine: true, hidden: false },
    { cert_no: 'W777-AC-2026-CCC333', cert_name: 'حساب مخبي', cert_date: null, avg: 0.75, mine: false, hidden: true }];
  const hides = [];
  await p.route(/\/rest\/v1\/rpc\/w777_certs/, r => r.fulfill({ json: CERTS }));
  await p.route(/\/rest\/v1\/w777_cert_hidden/, r => { hides.push(r.request().method()); return r.fulfill({ status: 201, body: '' }); });
  await p.route(/\/rest\/v1\/w777_academy/, r => r.request().method() === 'POST' ? r.fulfill({ status: 201, body: '' }) : r.fulfill({ json: [] }));
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  const ow = async t => { const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push(t + ' overflow ' + sw); };
  // 1) الزر فالرئيسية + اللوحة
  await p.goto(BASE + '#/learn'); await p.waitForTimeout(2500);
  if (!(await p.$('a[href="#/learn/certs"]'))) bad.push('board btn');
  await p.goto(BASE + '#/learn/certs'); await p.waitForTimeout(1500); await ow('board');
  if (await p.$$eval('.ac-cc', a => a.length) !== 3) bad.push('board rows');
  if (!(await p.$('.ac-cc.me'))) bad.push('mine tag');
  if (SHOT) await p.screenshot({ path: SHOT + '/certs.png', fullPage: true });
  // 2) المدير: شهادة واحد آخر ← تحميل + خبّي
  await p.click('a[href="#/learn/certs/W777-AC-2026-AAA111"]'); await p.waitForTimeout(1200); await ow('view');
  if (await p.$('.ac-cert.ro')) bad.push('admin got read-only');
  if (!(await p.$('#ac-pr'))) bad.push('admin print'); if (!(await p.$('#ac-hide'))) bad.push('admin hide');
  if (!/يوسف العلوي/.test(await p.textContent('.ac-cert .nm'))) bad.push('cert name');
  await p.click('#ac-hide'); await p.waitForTimeout(800); if (hides[0] !== 'POST') bad.push('hide call ' + hides.join(','));
  // 3) مشترك عادي (ماشي مدير): شهادة غيرو ← للعرض فقط، بلا تحميل؛ شهادتو ← تحميل
  const view = async (no) => p.evaluate(async (no) => {
    const root = document.getElementById('ac-root') || document.querySelector('#main') || document.body;
    location.hash = '#/learn/certs/' + no;
    window.W777_ACADEMY.mount(root, ['learn', 'certs', no], { certs: async () => window.__C, admin: false });
    await new Promise(r => setTimeout(r, 600));
    return { ro: !!root.querySelector('.ac-cert.ro'), wm: !!root.querySelector('.ac-cert .wm'), pr: !!root.querySelector('#ac-pr'), hide: !!root.querySelector('#ac-hide') };
  }, no);
  await p.evaluate(c => { window.__C = c; }, CERTS);
  const other = await view('W777-AC-2026-AAA111');
  if (!other.ro || !other.wm || other.pr || other.hide) bad.push('member other ' + JSON.stringify(other));
  if (SHOT) await p.screenshot({ path: SHOT + '/cert-ro.png', fullPage: true });
  const mine = await view('W777-AC-2026-BBB222');
  if (mine.ro || !mine.pr || mine.hide) bad.push('member mine ' + JSON.stringify(mine));
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
