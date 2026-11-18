// 🎓 v199: دائرة الأكاديمية فـ«خدمات المجموعة» + منير بالفصحى ونصوص الدروس فالأكاديمية + صورة منير الافتراضية
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
  const bad = [], errs = [], sent = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
  // وكيل بلا صورة فالسحابة ← صورة منير الافتراضية
  await p.route(/rest\/v1\/w777_agent_config/, r => r.fulfill({ json: [{ name: 'منير', photo: null, ai_enabled: true }] }));
  await p.route(/rest\/v1\/rpc\/w777_agent_face/, r => r.fulfill({ json: [] }));
  await p.route(/functions\/v1\/w777-agent/, r => { const bd = JSON.parse(r.request().postData() || '{}'); if (bd.ping || bd.tts !== undefined) return r.fulfill({ json: { ok: true } });
    sent.push(bd); r.fulfill({ json: { content: [{ type: 'text', text: 'الوكيل العقاري هو الوسيط بين المالك والمشتري.' }], stop_reason: 'end_turn' } }); });
  await p.goto(BASE); await F.login(p, BASE);
  // 1) خدمات المجموعة ← دائرة الأكاديمية
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(1500);
  await p.click('[data-hm="svc"]'); await p.waitForTimeout(600);
  const tile = await p.evaluate(() => { const a = [...document.querySelectorAll('.modal .hub-tile')].find(x => x.getAttribute('href') === '#/learn'); return a ? { t: a.innerText, img: (a.querySelector('img') || {}).src || '' } : null; });
  if (!tile || !/أكاديمية مجموعة الوسيط/.test(tile.t) || !/academy\.webp/.test(tile.img) || /777/.test(tile.t)) bad.push('tile ' + JSON.stringify(tile));
  await p.evaluate(() => document.querySelector('.modal .hub-tile[href="#/learn"]').click()); await p.waitForTimeout(1500);
  if (!/^#\/learn/.test(await p.evaluate(() => location.hash))) bad.push('tile nav');
  // 2) الصورة الافتراضية = منير
  const fab = await p.evaluate(() => (document.querySelector('#agent-fab img') || {}).src || '');
  if (!/agent-mounir\.webp/.test(fab)) bad.push('fab ' + fab);
  // 3) فالدرس: الفصحى + نص الدرس
  await p.evaluate(() => { location.hash = '#/learn/M1/0'; }); await p.waitForTimeout(1500);
  await p.click('#agent-fab'); await p.waitForTimeout(700);
  await p.fill('#ag-text', 'شنو هو دور الوكيل العقاري؟'); await p.evaluate(() => document.getElementById('ag-form').requestSubmit());
  for (let i = 0; i < 20 && !sent.length; i++) await p.waitForTimeout(300);
  const s0 = sent[0] || {}, help = JSON.stringify((s0.ctx || {}).help || []);
  if (s0.lang !== 'ar' || !/العربية الفصحى/.test(help) || !/من هو الوكيل العقاري/.test(help)) bad.push('learn ' + JSON.stringify({ lang: s0.lang, help: help.slice(0, 200) }));
  // خارج الأكاديمية: اللغة كترجع للاختيار ديال المستعمل (الدارجة)
  await p.evaluate(() => { location.hash = '#/properties'; }); await p.waitForTimeout(1200);
  sent.length = 0;
  if (!(await p.$('#ag-text'))) { await p.click('#agent-fab'); await p.waitForTimeout(600); }
  await p.fill('#ag-text', 'شحال من عقار عندي؟'); await p.evaluate(() => document.getElementById('ag-form').requestSubmit());
  for (let i = 0; i < 20 && !sent.length; i++) await p.waitForTimeout(300);
  const s1 = sent[0] || {};
  if (s1.lang !== 'darija' || /العربية الفصحى/.test(JSON.stringify((s1.ctx || {}).help || ''))) bad.push('outside ' + JSON.stringify({ lang: s1.lang }));
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
