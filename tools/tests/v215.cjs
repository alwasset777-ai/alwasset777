// v215: المدينة فـ«مليونير العقار» و«بني دارك»، تقرير الأسبوع فالرئيسية، منير كيقترح الثمن، زر الكتالوج فـ decouvrir.html
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], bad = [], logs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.route(/w777_agent_config/, r => r.fulfill({ json: [{ id: 1, name: 'منير', ai_enabled: true }] }));
  await p.route(/\/rest\/v1\/rpc\/w777_week_stats/, r => r.fulfill({ json: { signups: 12, shares: 34, visits: 56, joins: 7 } }));
  await p.route(/\/rest\/v1\/rpc\/w777_share_log/, r => { logs.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
  let step = 0;
  await p.route(/functions\/v1\/w777-agent/, async r => {
    const bd = JSON.parse(r.request().postData() || '{}'); if (bd.ping || bd.tts !== undefined || bd.game) return r.fulfill({ json: { ok: true } });
    step++;
    if (step === 1) return r.fulfill({ json: { content: [{ type: 'tool_use', id: 't1', name: 'create_property', input: { property_type: 'apartment', transaction: 'sale', city: 'مكناس', district: 'حمرية', price: 900000, area: 100, bedrooms: 3, owner_name: 'مالك تجريبي', owner_phone: '0611223344' } }], stop_reason: 'tool_use' } });
    p.__res = JSON.parse(r.request().postData() || '{}');
    r.fulfill({ json: { content: [{ type: 'text', text: 'تسجّل ✓' }], stop_reason: 'end_turn' } });
  });
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.evaluate(() => { localStorage.w777_games = '{}'; localStorage.removeItem('w777_price_city'); });
  const ow = async t => { const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push(t + ' overflow ' + sw); };
  // 1) مليونير العقار: طنجة ← كل العروض فطنجة
  await p.goto(BASE + '#/game/tycoon'); await p.waitForTimeout(600);
  if (!(await p.$('#gm-city'))) bad.push('tycoon picker');
  await p.selectOption('#gm-city', 'طنجة'); await p.click('.gm-s'); await p.waitForTimeout(400); await ow('tycoon');
  let T = await p.$$eval('.gm-it .in b', a => a.map(x => x.textContent));
  if (!T.length || T.some(t => !t.endsWith('طنجة'))) bad.push('tycoon offers ' + T.join('|'));
  await p.click('[data-n]'); await p.waitForTimeout(200);
  T = await p.$$eval('.gm-it .in b', a => a.map(x => x.textContent)); if (T.some(t => !t.endsWith('طنجة'))) bad.push('tycoon y2 ' + T.join('|'));
  // 2) بني دارك: نفس الاختيار (مشترك) ← الرباط أغلى من المرجع
  await p.goto(BASE + '#/game'); await p.goto(BASE + '#/game/build'); await p.waitForTimeout(600);
  if (await p.$eval('#gm-city', s => s.value) !== 'طنجة') bad.push('shared city');
  const ppmOf = async () => { await p.click('.gm-s'); await p.waitForTimeout(300); const t = await p.$eval('.gm-how', e => e.textContent); return [+((t.match(/~([^د]+)د\/م²/) || [, '0'])[1].replace(/\D/g, '')), t]; };
  await p.selectOption('#gm-city', ''); let [p0] = await ppmOf();
  await p.goto(BASE + '#/game'); await p.goto(BASE + '#/game/build'); await p.waitForTimeout(500);
  await p.selectOption('#gm-city', 'الرباط'); let [p1, t1] = await ppmOf(); await ow('build');
  if (!(p0 === 3200 && p1 > p0 && t1.includes('الرباط') && t1.includes('الميزانية'))) bad.push(`build ppm ${p0}→${p1} ${t1}`);
  for (let k = 0; k < 8; k++) { await p.click('.gm-c'); await p.waitForTimeout(80); }
  if (!(await p.$('.gm-res'))) bad.push('build end');
  // 3) الرئيسية: «📅 أسبوعك» + أرقام الشبكة للمدير
  await p.evaluate(async () => { const now = new Date().toISOString(); await window.W777_DB.saveRec('properties', { id: 'wk1', ref: 'W777-9001', createdAt: now, updatedAt: now, status: 'available', type: 'apartment', transaction: 'sale', city: 'فاس', priceMin: 500000, media: [] }); if (window.W777_TEST) await window.W777_TEST.loadAll(); });
  await p.goto(BASE + '#/game'); await p.goto(BASE + '#/'); await p.waitForTimeout(1800);
  const wk = await p.evaluate(() => { const c = document.getElementById('home-week'); return c ? { n: c.querySelectorAll('.wk-it').length, txt: c.textContent, rows: new Set([...c.querySelectorAll('.wk-it')].map(e => Math.round(e.offsetTop))).size } : null; });
  if (wk && wk.rows !== 1) bad.push('week not one row ' + wk.rows); // v219: سطر واحد
  if (!wk || wk.n !== 8 || !/12/.test(wk.txt) || !/56/.test(wk.txt)) bad.push('week ' + JSON.stringify(wk)); await ow('home');
  await p.evaluate(() => { document.querySelectorAll('#splash').forEach(x => x.remove()); const c = document.getElementById('home-week'); if (c) window.scrollTo(0, c.getBoundingClientRect().top + scrollY - 240); }); await p.waitForTimeout(1200);
  await p.screenshot({ path: (process.env.SHOT || '/tmp/v215') + '-week.png' });
  // 4) منير: تسجيل عقار ← بطاقة «💡 الثمن المقترح» + price_hint للذكاء
  await p.goto(BASE + '#/properties'); await p.waitForTimeout(600);
  await p.evaluate(() => document.getElementById('agent-fab').click()); await p.waitForTimeout(1200);
  await p.fill('#ag-text', 'سجّل شقة فحمرية 100 م² بـ 90 مليون');
  await p.evaluate(() => { window.__cf = setInterval(() => { const x = document.getElementById('cf-ok'); if (x) x.click(); }, 150); document.getElementById('ag-form').requestSubmit(); });
  for (let i = 0; i < 30 && step < 2; i++) await p.waitForTimeout(300);
  await p.waitForTimeout(800);
  const ph = await p.evaluate(() => { const c = document.querySelector('#ag-body .ag-ph'); return c ? c.textContent : ''; });
  if (!/الثمن المقترح/.test(ph) || !/السوق/.test(ph)) bad.push('price card ' + ph);
  const tr = JSON.stringify(p.__res || {}); if (!/price_hint/.test(tr) || !/suggested_price/.test(tr)) bad.push('price_hint to AI');
  await p.evaluate(() => { const m = document.querySelector('#ag-body .ag-ph'); const b = document.getElementById('ag-body'); if (m && b) b.scrollTop = m.offsetTop - 60; });
  await p.screenshot({ path: (process.env.SHOT || '/tmp/v215') + '-price.png' });
  // 5) decouvrir.html: زر الكتالوج بجوج لغات + العدّاد
  for (const [q, lg, kind] of [['', 'ar', 'catalog'], ['?lang=fr', 'fr', 'catalog_fr']]) {
    await p.goto(BASE + 'decouvrir.html' + q); await p.waitForTimeout(700);
    const href = await p.$eval(`main[data-lang="${lg}"] [data-go="cat"]`, a => a.getAttribute('href'));
    if (!href.includes(lg === 'fr' ? 'catalogue-services-groupe-alwasset-fr' : 'catalogue-khadamat')) bad.push('cat href ' + href);
    const ok = await p.evaluate(h => fetch(h).then(r => r.ok), href); if (!ok) bad.push('cat 404 ' + href);
    await p.$eval(`main[data-lang="${lg}"] [data-go="cat"]`, a => { a.removeAttribute('download'); a.addEventListener('click', e => e.preventDefault()); a.click(); });
    await p.waitForTimeout(300);
    if (!logs.some(l => l.p_kind === kind && l.p_via === 'file')) bad.push('cat log ' + kind);
  }
  console.log(JSON.stringify({ bad, errs }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
