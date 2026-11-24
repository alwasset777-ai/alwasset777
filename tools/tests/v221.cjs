// v221: الدعوات فيها الرابط الخاص ديال المكتب (ref=WASSET) + سجل الدعوات فـ«🔑 الإدارة» (✅ تسجّل، ⏰ ذكّرو من بعد 3 أيام، ✕ مسح) + «🏢 مجموعة الوسيط (دعواتك)» فـ🏅 الروابط
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
  const errs = [], bad = [], calls = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1';
    window.__opened = []; window.open = u => { window.__opened.push(String(u)); return null; }; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  // سجل الدعوات المزيف: واحد قديم (4 أيام) ← تذكير، واحد تسجّل (نفس الرقم ديال عضو فالدليل)، واحد اليوم، واحد تذكّر البارح
  const ago = d => new Date(Date.now() - d * 864e5).toISOString();
  let inv = [
    { id: 1, kind: 'agency', name: 'وكالة <b>قديمة</b>', phone: '212611000001', created_at: ago(4), reminded_at: null, reminders: 0 },
    { id: 2, kind: 'broker', name: 'وسيط تسجّل', phone: '212600000101', created_at: ago(6), reminded_at: null, reminders: 0 },
    { id: 3, kind: 'notary', name: null, phone: '212611000003', created_at: ago(0), reminded_at: null, reminders: 0 },
    { id: 4, kind: 'agency', name: 'تذكّر البارح', phone: '212611000004', created_at: ago(8), reminded_at: ago(1), reminders: 1 },
  ];
  await p.route(/\/rest\/v1\/w777_invites/, r => { const req = r.request(), u = new URL(req.url()), m = req.method();
    calls.push({ m, q: u.search, body: req.postData() || '' });
    if (m === 'GET') return r.fulfill({ json: inv });
    if (m === 'POST') { const x = JSON.parse(req.postData() || '{}'); inv = [{ id: 9, created_at: ago(0), reminded_at: null, reminders: 0, ...x }, ...inv.filter(y => y.phone !== x.phone)]; return r.fulfill({ status: 201, body: '' }); }
    const id = (u.searchParams.get('id') || '').replace('eq.', '');
    if (m === 'PATCH') { const x = JSON.parse(req.postData() || '{}'); inv = inv.map(y => String(y.id) === id ? { ...y, ...x } : y); return r.fulfill({ status: 204, body: '' }); }
    if (m === 'DELETE') { inv = inv.filter(y => String(y.id) !== id); return r.fulfill({ status: 204, body: '' }); }
    r.fulfill({ json: [] }); });
  await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8777' });
  await p.route(/rest\/v1\/rpc\/w777_share_stats/, r => r.fulfill({ json: [{ kind: 'page', via: 'view', d7: 4, d30: 10, total: 20 }] }));
  await p.route(/rest\/v1\/rpc\/w777_share_refs/, r => { const mo = (JSON.parse(r.request().postData() || '{}') || {}).p_month;
    r.fulfill({ json: [{ ref: 'WASSET', name: null, kind: null, views: 9, joins: 3, signups: 2 }, { ref: 'AG042', name: 'وكالة الأطلس', kind: 'agency', views: 5, joins: 1, signups: mo ? 1 : 1 }] }); });
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.evaluate(() => { location.hash = '#/agencies/manage'; }); await p.waitForSelector('#invites .inv-card', { timeout: 10000 }).catch(() => bad.push('no invites card'));
  await p.waitForTimeout(800);
  // 1) اللائحة: الترتيب، الحالات، بلا HTML مدسوس
  const L = await p.evaluate(() => { const box = document.getElementById('invites'); if (!box) return null;
    return { t: box.innerText, html: box.innerHTML, rows: [...box.querySelectorAll('.inv-row')].map(r => ({ t: r.innerText, due: !!r.querySelector('[data-inv-r]'), ok: r.classList.contains('ok') })) }; });
  if (!L) bad.push('no list');
  else {
    if (L.rows.length !== 4) bad.push('rows ' + L.rows.length);
    if (!L.rows[0] || !L.rows[0].due || !/قديمة/.test(L.rows[0].t)) bad.push('first not due ' + JSON.stringify(L.rows[0]));
    if (L.rows.filter(r => r.due).length !== 1) bad.push('due count ' + L.rows.filter(r => r.due).length);
    const okRow = L.rows.find(r => /وسيط تسجّل/.test(r.t)); if (!okRow || !okRow.ok || !/✅ تسجّل/.test(okRow.t)) bad.push('registered row ' + JSON.stringify(okRow));
    const yRow = L.rows.find(r => /تذكّر البارح/.test(r.t)); if (!yRow || yRow.due || !/ذكّرتيه/.test(yRow.t)) bad.push('reminded row ' + JSON.stringify(yRow));
    const T0 = L.t.replace(/[\u2066-\u2069]/g, ''); if (!/✅ 1 تسجلو/.test(T0) || !/⏳ 3 كيتسناو/.test(T0) || !/⏰ 1 خاصهم تذكير/.test(T0)) bad.push('summary ' + L.t.split('\n').slice(0, 3).join(' | '));
    if (/<b>قديمة<\/b>/.test(L.html)) bad.push('xss name');
  }
  await p.$eval('#invites', e => e.scrollIntoView()); await p.waitForTimeout(1500);
  await (await p.$('#invites')).screenshot({ path: (process.env.SHOT || '/tmp/v221') + '-list.png' });
  // 2) ⏰ ذكّرو ← واتساب للرقم بالرابط WASSET + PATCH
  await p.click('#invites [data-inv-r]'); await p.waitForTimeout(700);
  const w = await p.evaluate(() => window.__opened.slice(-1)[0] || ''); const wt = decodeURIComponent(w.split('text=')[1] || '');
  if (!/^https:\/\/wa\.me\/212611000001\?text=/.test(w)) bad.push('remind url ' + w.slice(0, 60));
  if (!/\?gate=1&ref=WASSET/.test(wt) || !/كنذكّركم/.test(wt) || /كلمة السر:/.test(wt) || /<b>/.test(wt) && false) bad.push('remind text ' + wt.slice(0, 150));
  const pt = calls.find(x => x.m === 'PATCH'); if (!pt || !/id=eq\.1/.test(pt.q) || !/"reminders":1/.test(pt.body) || !/reminded_at/.test(pt.body)) bad.push('patch ' + JSON.stringify(pt));
  const due2 = await p.$$eval('#invites [data-inv-r]', a => a.length); if (due2 !== 0) bad.push('still due after remind ' + due2);
  // 3) ✕ مسح (مع التأكيد)
  await p.click('#invites .inv-row:last-child [data-inv-x]'); await p.waitForTimeout(400);
  await p.click('#cf-ok').catch(() => bad.push('no confirm')); await p.waitForTimeout(700);
  if (!calls.some(x => x.m === 'DELETE')) bad.push('no delete');
  // 4) دعوة جديدة ← الرابط WASSET فالرسالة + POST on_conflict=phone
  await p.click('#ag-new-mem'); await p.waitForSelector('#am-wa', { timeout: 8000 }).catch(() => bad.push('no modal'));
  await p.click('#am-link'); await p.waitForTimeout(300); const qrT = await p.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  await p.fill('[name=am-name]', 'وكالة النور'); await p.fill('[name=am-phone]', '0611223344'); await p.click('#am-wa'); await p.waitForTimeout(700);
  const u2 = await p.evaluate(() => window.__opened.slice(-1)[0] || ''); const t2 = decodeURIComponent(u2.split('text=')[1] || '');
  if (!/^https:\/\/wa\.me\/212611223344\?text=/.test(u2) || !/\?gate=1&ref=WASSET/.test(t2) || !/وكالة النور/.test(t2)) bad.push('invite ' + t2.slice(0, 160));
  const po = calls.find(x => x.m === 'POST'); if (!po || !/on_conflict=phone/.test(po.q) || !/"phone":"212611223344"/.test(po.body) || !/"name":"وكالة النور"/.test(po.body) || !/"kind":"agency"/.test(po.body)) bad.push('post ' + JSON.stringify(po));
  if (!/\?gate=1&ref=WASSET$/.test(qrT)) bad.push('copied link ' + qrT);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); if (await p.$('.modal-bg')) await p.click('.modal [data-close]').catch(() => {});
  await p.waitForTimeout(500);
  const newRow = await p.evaluate(() => [...document.querySelectorAll('#invites .inv-row')].some(r => /وكالة النور/.test(r.innerText)));
  if (!newRow) bad.push('new invite not listed');
  // 5) 🏅 الروابط: WASSET بسمية المكتب، وبلا شهادة شكر ليه فالشهر
  const R = await p.evaluate(() => { const b = document.querySelector('#share-refs'); return b ? b.innerText : ''; });
  if (!/مجموعة الوسيط \(دعواتك\)/.test(R)) bad.push('refs name ' + R.slice(0, 120));
  await p.click('#share-refs [data-rm]:not([data-rm=""])').catch(() => bad.push('no month chip')); await p.waitForTimeout(800);
  const certs = await p.$$eval('#share-refs .ref-cert', a => a.map(x => x.closest('.ss-row').innerText));
  if (certs.some(t => /دعواتك/.test(t)) || !certs.some(t => /الأطلس/.test(t))) bad.push('certs ' + JSON.stringify(certs));
  await p.screenshot({ path: (process.env.SHOT || '/tmp/v221') + '-refs.png' });
  console.log(JSON.stringify({ bad, errs }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
