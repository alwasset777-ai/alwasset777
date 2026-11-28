// v261: ترحيب منير حسب الوقت + اليوم، حفلة الإنجازات (مرة وحدة، بلا حفلة على التحميل)، بلا «الرسائل» تحت الدائرة الصفراء
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.goto(BASE + '#/'); await p.waitForTimeout(2500);
  // 1) أول مرة: الأرقام كتتحفظ بلا حفلة
  if (await p.$('.cel-card')) bad.push('celebrated on first load');
  const saved = await p.evaluate(() => JSON.parse(localStorage.w777_cel || 'null'));
  if (!saved || typeof saved.p !== 'number') bad.push('counts not saved ' + JSON.stringify(saved));
  // 2) نجاح فوحدة فالأكاديمية ← حفلة وحدة
  await p.evaluate(() => { const a = JSON.parse(localStorage.w777_acad || '{}'); a.M1 = Object.assign(a.M1 || {}, { pass: 1, best: 0.9 }); localStorage.w777_acad = JSON.stringify(a); });
  await p.goto(BASE + '#/properties'); await p.waitForTimeout(1800);
  const cel = await p.evaluate(() => { const c = document.querySelector('.cel-card'); return c && { txt: c.textContent, fx: document.querySelectorAll('.cel-fx i').length, top: c.getBoundingClientRect().top }; });
  if (!cel || !/الأكاديمية/.test(cel.txt) || cel.fx < 20 || cel.top < 0) bad.push('no academy celebration ' + JSON.stringify(cel));
  if (SHOT) await p.screenshot({ path: SHOT + '/celebrate.png' });
  // القصاصات ما كتشدش الضغطات
  if (await p.evaluate(() => { const f = document.querySelector('.cel-fx'); return f && getComputedStyle(f).pointerEvents !== 'none'; })) bad.push('confetti catches clicks');
  // ✕ كتسد
  if (cel) { await p.click('.cel-card button'); await p.waitForTimeout(500); if (await p.$('.cel-card')) bad.push('card not closed'); }
  // 3) نفس الصفحة مرة أخرى ← بلا حفلة ثانية
  await p.goto(BASE + '#/requests'); await p.waitForTimeout(1800);
  if (await p.$('.cel-card')) bad.push('celebrated twice');
  // 4) قفزة كبيرة (تحميل البيانات) ← بلا حفلة
  await p.evaluate(() => { const s = JSON.parse(localStorage.w777_cel); s.p = 0; s.r = 0; localStorage.w777_cel = JSON.stringify(s); });
  await p.goto(BASE + '#/'); await p.waitForTimeout(1800);
  const jump = await p.evaluate(() => [JSON.parse(localStorage.w777_cel).p, !!document.querySelector('.cel-card')]);
  if (jump[0] > 3 && jump[1]) bad.push('celebrated a big jump');
  // 5) ترحيب منير: حسب الوقت + شنو عندك اليوم
  await p.click('#agent-fab'); await p.waitForTimeout(900);
  const hi = await p.$eval('#ag-body .ag-msg.bot', e => e.textContent);
  if (!/(صباح|مساء) الخير/.test(hi) || !/(اليوم)/.test(hi)) bad.push('hello ' + hi.slice(0, 90));
  if (SHOT) await p.screenshot({ path: SHOT + '/hello.png' });
  // 6) الدائرة الصفراء بلا كلمة «الرسائل»
  await p.goto(BASE + '#/'); await p.waitForTimeout(1500);
  if (await p.$('.grp-chat .chat-lbl')) bad.push('chat label still there');
  // 7) أيقونة «تعلم استعمال التطبيق» الجديدة كتتحمّل (?v=9)
  const ico = await p.evaluate(async () => { const i = new Image(); i.src = 'icons/hub/guide.webp?v=9'; await i.decode().catch(() => {}); return i.naturalWidth; });
  if (ico !== 256) bad.push('guide icon ' + ico);
  console.log(JSON.stringify({ bad, errs, hi: hi.slice(0, 80) })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
