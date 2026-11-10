// صور الدليل الشامل: كل صفحة بالحساب التجريبي (معلومات خيالية)
// الاستعمال: cd docs && python3 -m http.server 8777 &  ثم  NODE_PATH=$(npm root -g) node tools/manual/shots.cjs OUTDIR
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs');
const BASE = 'http://localhost:8777/bureau/'; const OUT = process.argv[2];
const CERTS = [
  { cert_no: 'W777-AC-2026-K7Q2PA', cert_name: 'يوسف العلوي', cert_date: Date.now() - 3 * 864e5, avg: 0.92, mine: false, hidden: false },
  { cert_no: 'W777-AC-2026-M3ZX81', cert_name: 'سناء بنعلي', cert_date: Date.now() - 9 * 864e5, avg: 0.86, mine: true, hidden: false },
  { cert_no: 'W777-AC-2026-B8RT4C', cert_name: 'كريم التازي', cert_date: Date.now() - 20 * 864e5, avg: 0.79, mine: false, hidden: false }];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const mk = async () => { const c = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true });
    const p = await c.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
    await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_guide_seen = '1'; });
    await p.route(/googleapis|gstatic|unpkg|jsdelivr|cdnjs|tile\.|openstreetmap|vercel\.app/, r => r.abort()); await F.install(p);
    await p.route(/\/rest\/v1\/rpc\/w777_certs/, r => r.fulfill({ json: CERTS }));
    await p.route(/\/rest\/v1\/rpc\/w777_cert_uids/, r => r.fulfill({ json: [] }));
    await p.route(/\/rest\/v1\/rpc\/w777_cert_check/, r => r.fulfill({ json: [CERTS[0]] }));
    return p; };
  const clean = p => p.evaluate(() => { document.querySelectorAll('.wl-mod,.gd-tip,.toast').forEach(m => m.remove()); window.scrollTo(0, 0); });
  const shot = async (p, name, wait = 1400) => { await p.waitForTimeout(wait); await clean(p); await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 74 }); console.log('✓', name); };
  const go = async (p, h, name, wait) => { await p.evaluate(h => { location.hash = h; }, h); await shot(p, name, wait); };
  // 1) الدخول بالإيميل (بلا حساب): البوابة ← الكود ← البطاقة (خادم مزيف بحال tools/tests/otp.cjs)
  { const c = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true }); const a = await c.newPage();
    const user = { id: '22222222-2222-2222-2222-222222222222', email: 'nouveau@exemple.ma', factors: [] };
    await a.route(/translate|fonts\.googleapis|gstatic/, r => r.abort());
    await a.route(/\/(rest|storage|functions)\/v1\//, r => r.fulfill({ json: [] }));
    await a.route(/\/rest\/v1\/rpc\/w777_is_admin/, r => r.fulfill({ json: false }));
    await a.route(/\/rest\/v1\/rpc\/w777_my_status/, r => r.fulfill({ json: { admin: false, staff: false, member: false, ok: true, email: user.email } }));
    await a.route(/\/auth\/v1\/otp/, r => r.fulfill({ json: {} }));
    await a.route(/\/auth\/v1\/verify/, r => r.fulfill({ json: { access_token: 't', refresh_token: 'r', expires_in: 3600, user } }));
    await a.route(/\/auth\/v1\/user/, r => r.fulfill({ json: user }));
    await a.goto(BASE + '?gate=1#/'); await shot(a, 'login', 1800);
    await a.fill('#au-mail', user.email); await a.click('#au-send'); await a.waitForTimeout(900);
    await a.fill('#au-code', '123456'); await a.waitForTimeout(2200); await shot(a, 'register', 600);
    await c.close(); }
  // 2) الحساب التجريبي
  const p = await mk(); await p.goto(BASE); await p.waitForTimeout(1500);
  const sd = await p.$('#seed'); if (sd) { await sd.click(); await p.waitForTimeout(1500); }
  await F.addPhotos(p, BASE); await F.login(p, BASE);
  await go(p, '#/', 'home', 2200);
  await go(p, '#/properties', 'properties');
  const pid = await p.evaluate(async () => { const db = await new Promise(r => { const q = indexedDB.open('wasset777_bureau'); q.onsuccess = () => r(q.result); }); return new Promise(r => { const q = db.transaction('properties').objectStore('properties').getAll(); q.onsuccess = () => r((q.result.find(x => (x.media || []).length) || q.result[0] || {}).id); }); });
  if (pid) await go(p, '#/property/' + pid, 'property');
  await go(p, '#/property/new', 'property-new');
  await go(p, '#/requests', 'requests');
  await go(p, '#/matching', 'matching');
  await go(p, '#/appointment/new', 'appointment-new');
  await go(p, '#/rentals', 'rentals');
  await go(p, '#/loan', 'loan'); try { await p.fill('#lq-price', '850000'); await p.fill('#lq-down', '170000'); } catch (e) { /* */ } await shot(p, 'loan', 600);
  await go(p, '#/tamwil', 'tamwil', 2200);
  await go(p, '#/estimate', 'estimate');
  await go(p, '#/contracts', 'contracts');
  await go(p, '#/ownership', 'ownership');
  await go(p, '#/ad-maker', 'ad-maker', 1800);
  await go(p, '#/ad-maker?m=reels', 'reels', 2000);
  await go(p, '#/finance', 'finance');
  await go(p, '#/learn', 'learn', 2500);
  await go(p, '#/learn/M1/0', 'lesson', 1800);
  await go(p, '#/learn/certs', 'certs', 1500);
  await p.evaluate(() => { const s = {}; (window.W777_ACAD || { modules: [] }).modules.forEach(x => { s[x.m] = { les: {}, tries: 1, best: 0.9, pass: Date.now() }; }); s.cert = { name: 'سناء بنعلي', date: Date.now() - 9 * 864e5 }; localStorage.w777_acad = JSON.stringify(s); });
  await go(p, '#/learn', 'learn-done', 1200); await go(p, '#/learn/cert', 'cert', 1800);
  await go(p, '#/game', 'games', 1800);
  await go(p, '#/game/price', 'game-play', 2000);
  await go(p, '#/agencies', 'network', 2200);
  await go(p, '#/agencies/dir', 'directory', 1800);
  await go(p, '#/agencies/manage', 'manage', 2200);
  await go(p, '#/stays', 'stays', 1800);
  await go(p, '#/projects', 'projects', 1800);
  await go(p, '#/news', 'news', 1800);
  await go(p, '#/disputes', 'disputes', 1800);
  await go(p, '#/donations', 'donations', 1800);
  await go(p, '#/inbox', 'inbox', 1800);
  await go(p, '#/terms', 'terms', 1800);
  await go(p, '#/settings', 'settings', 1800);
  await go(p, '#/', 'home2', 1500);
  try { await p.click('#agent-fab'); await shot(p, 'agent', 2000); } catch (e) { console.log('agent', e.message); }
  // 3) الصفحات العمومية
  for (const [u, n] of [['brand.html', 'brand'], ['brand-print.html?t=sale', 'print-sale'], ['verify.html?no=W777-AC-2026-K7Q2PA', 'verify'], ['games.html', 'games-public']]) { await p.goto(BASE + u); await shot(p, n, 1600); }
  await b.close();
})();
