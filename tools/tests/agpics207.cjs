// 📸 v207: منير — حتى 25 صورة فمرة وحدة، 3 الأولين كيمشيو للذكاء، و create_property كيزيد الصور كاملين للعقار + الأزرار السريعة
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const fs = require('fs'), os = require('os'), path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
  const bad = [], errs = [];
  p.on('pageerror', e => errs.push(e.message));
  // صور حقيقية صغيرة من اللعبة
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w777pics-'));
  const src = path.join(__dirname, '../../docs/bureau/game/img');
  const names = fs.readdirSync(src).filter(x => /\.webp$/.test(x)).slice(0, 3);
  const files = names.map((n, i) => { const f = path.join(dir, `p${i}.webp`); fs.copyFileSync(path.join(src, n), f); return f; });
  await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
  const sent = []; let step = 0;
  await p.route(/functions\/v1\/w777-agent/, async r => {
    const bd = JSON.parse(r.request().postData() || '{}'); if (bd.ping || bd.tts !== undefined) return r.fulfill({ json: { ok: true } });
    sent.push(bd); step++;
    if (step === 1) return r.fulfill({ json: { content: [{ type: 'tool_use', id: 't1', name: 'create_property', input: { property_type: 'apartment', transaction: 'sale', city: 'مكناس', district: 'حمرية', price: 900000, area: 95, owner_name: 'مالك تجريبي', owner_phone: '0611223344' } }], stop_reason: 'tool_use' } });
    const last = (bd.messages || []).slice(-1)[0]; let res = null; try { res = JSON.parse(last.content[0].content); } catch (e) { /* */ }
    p.__res = res;
    r.fulfill({ json: { content: [{ type: 'text', text: 'تسجل العقار بالصور ✓' }], stop_reason: 'end_turn' } });
  });
  await p.goto(BASE); await F.login(p, BASE);
  await p.evaluate(() => { localStorage.w777_agent_voice = '0'; location.hash = '#/properties'; }); await p.waitForTimeout(1200);
  await p.click('#agent-fab'); await p.waitForTimeout(2500);
  const chips = await p.$$eval('#ag-quick button', x => x.map(y => y.textContent));
  if (!chips.some(x => /سجّل عقار/.test(x)) || !chips.some(x => /سجّل طلب/.test(x)) || !chips.some(x => /سجّل موعد/.test(x))) bad.push('chips ' + JSON.stringify(chips));
  await p.setInputFiles('#ag-file', files); await p.waitForTimeout(1500);
  const strip = await p.evaluate(() => { const e = document.getElementById('ag-attc'); return e ? { t: e.innerText, imgs: e.querySelectorAll('.ag-pics img').length, hid: e.classList.contains('hidden') } : null; });
  if (!strip || strip.hid || strip.imgs !== 3 || !/3 صورة/.test(strip.t)) bad.push('strip ' + JSON.stringify(strip));
  await p.evaluate(() => { window.__cf = setInterval(() => { const x = document.getElementById('cf-ok'); if (x) x.click(); }, 150); });
  await p.evaluate(() => document.getElementById('ag-form').requestSubmit());
  for (let i = 0; i < 40 && step < 2; i++) await p.waitForTimeout(400);
  await p.waitForTimeout(800);
  const first = sent[0] || {}, um = (first.messages || []).slice(-1)[0] || {};
  const nImg = Array.isArray(um.content) ? um.content.filter(x => x.type === 'image').length : 0;
  const txt = Array.isArray(um.content) ? (um.content.find(x => x.type === 'text') || {}).text || '' : '';
  if (nImg !== 3 || !/3 صورة/.test(txt)) bad.push('ai payload imgs=' + nImg + ' ' + txt.slice(0, 60));
  const prop = await p.evaluate(async () => { const all = await window.W777_DB.all('properties'); const x = all.find(y => y.owner && y.owner.phone === '0611223344'); return x ? { n: (x.media || []).filter(m => m.kind === 'photo').length, cover: !!x.cover && x.cover === x.media[0].id, files: (await Promise.all(x.media.map(m => window.W777_DB.get('files', m.id)))).filter(f => f && f.blob && f.thumb).length } : null; });
  if (!prop || prop.n !== 3 || !prop.cover || prop.files !== 3) bad.push('prop ' + JSON.stringify(prop));
  const after = await p.evaluate(() => document.getElementById('ag-attc').classList.contains('hidden'));
  if (!after) bad.push('strip not cleared');
  fs.rmSync(dir, { recursive: true, force: true });
  // «سجّل طلب»: بالذكاء كيصيفط الطلب لمنير، والوضع المجاني كيحل الاستمارة
  const before = sent.length;
  await p.evaluate(() => { const x = document.querySelector('#ag-quick [data-q=req]'); if (x) x.click(); }); await p.waitForTimeout(1200);
  const h = await p.evaluate(() => location.hash);
  if (!/^#\/request\/new/.test(h) && sent.length === before) bad.push('quick req ' + h);
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
