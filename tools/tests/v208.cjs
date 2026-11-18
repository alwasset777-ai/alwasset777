// 🤖 v208: منير — الصور مرتبة (الأوضح غلاف)، الزبناء المناسبين من بعد التسجيل، زر «سجّل بالكلام»، الصفحة أصغر، خلفية الدائرة حسب الخدمة، 10 صور
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
  const bad = [], errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
  let step = 0, sent = [];
  await p.route(/functions\/v1\/w777-agent/, async r => {
    const bd = JSON.parse(r.request().postData() || '{}'); if (bd.ping || bd.tts !== undefined) return r.fulfill({ json: { ok: true } });
    sent.push(bd); step++;
    if (step === 1) return r.fulfill({ json: { content: [{ type: 'tool_use', id: 't1', name: 'create_property', input: { property_type: 'apartment', transaction: 'sale', city: 'مكناس', district: 'حمرية', price: 800000, area: 90, bedrooms: 2, owner_name: 'مالك تجريبي', owner_phone: '0611223344' } }], stop_reason: 'tool_use' } });
    const last = (bd.messages || []).slice(-1)[0]; try { p.__res = JSON.parse(last.content[0].content); } catch (e) { /* */ }
    r.fulfill({ json: { content: [{ type: 'text', text: 'تسجل ✓' }], stop_reason: 'end_turn' } });
  });
  await p.goto(BASE); await F.login(p, BASE);
  // زبون تجريبي كيقلب على شقة فمكناس
  await p.evaluate(async () => { const now = new Date().toISOString();
    await window.W777_DB.saveRec('requests', { id: 'rq-test-208', ref: 'R-208', createdAt: now, updatedAt: now, status: 'new', transaction: 'sale', types: ['apartment'], city: 'مكناس', districts: ['حمرية'], budgetMin: 600000, budgetMax: 900000, bedrooms: 2, client: { name: 'زبون تجريبي', phone: '0622334455' } });
    await window.W777_TEST.loadAll(); localStorage.w777_agent_voice = '0'; });
  // الخلفية حسب الخدمة + الحجم
  for (const [h, want] of [['#/learn', 'academy'], ['#/properties', 'agencies'], ['#/game', 'games'], ['#/', 'home']]) {
    await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(900);
    if (!(await p.$('#agent-panel'))) { await p.evaluate(() => document.getElementById('agent-fab').click()); await p.waitForTimeout(1500); }
    const bg = await p.evaluate(() => { const s = document.getElementById('ag-stage'); return s ? s.dataset.bg : null; });
    if (bg !== want) bad.push(`bg ${h}=${bg}`);
  }
  const box = await p.evaluate(() => { const r = document.getElementById('agent-panel').getBoundingClientRect(), m = document.querySelector('.ag-3d').getBoundingClientRect(); return { w: r.width, h: r.height, a: m.width }; });
  if (box.w > 321 || box.a > 128) bad.push('size ' + JSON.stringify(box));
  const vbtn = await p.$('#ag-quick [data-q=voice]');
  const hasSR = await p.evaluate(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  if (hasSR && !vbtn) bad.push('no voice btn');
  // ترتيب الصور: صورة ضبابية/مظلمة وصورة واضحة ← الواضحة كتولي الغلاف
  const files = await p.evaluate(async () => {
    const mk = async (fn, name) => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const x = c.getContext('2d'); fn(x); const bl = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); return new File([bl], name, { type: 'image/jpeg' }); };
    const dark = await mk(x => { x.fillStyle = '#0a0a0a'; x.fillRect(0, 0, 800, 600); }, 'dark.jpg');
    const sharp = await mk(x => { x.fillStyle = '#9ab'; x.fillRect(0, 0, 800, 600); for (let i = 0; i < 800; i += 20) { x.fillStyle = i % 40 ? '#fff' : '#222'; x.fillRect(i, 0, 10, 600); } }, 'sharp.jpg');
    const dt = new DataTransfer(); [dark, sharp].forEach(f => dt.items.add(f)); const inp = document.getElementById('ag-file'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); return 2; });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__cf = setInterval(() => { const x = document.getElementById('cf-ok'); if (x) x.click(); }, 150); });
  await p.evaluate(() => document.getElementById('ag-form').requestSubmit());
  for (let i = 0; i < 40 && step < 2; i++) await p.waitForTimeout(400);
  await p.waitForTimeout(1000);
  const res = p.__res || {};
  if (!res.matching_clients || !res.matching_clients.some(x => x.name === 'زبون تجريبي')) bad.push('matches ' + JSON.stringify(res).slice(0, 200));
  const card = await p.evaluate(() => { const x = document.querySelector('.ag-mt'); return x ? { t: x.innerText, wa: !!x.querySelector('a.wa') } : null; });
  if (!card || !card.wa || !/زبون تجريبي/.test(card.t)) bad.push('card ' + JSON.stringify(card));
  const cov = await p.evaluate(async () => { const all = await window.W777_DB.all('properties'); const x = all.find(y => y.owner && y.owner.phone === '0611223344'); return x ? (x.media.find(m => m.id === x.cover) || {}).name : null; });
  if (cov !== 'sharp.jpg') bad.push('cover ' + cov);
  await p.screenshot({ path: process.env.SHOT || '/tmp/v208.png' });
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
