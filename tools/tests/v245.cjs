// v245/v246: ملفات المدير (نماذج الوثائق، لائحة المراجعة، الحاسبة) موزعة داخل M1–M7 — بلا وحدة M8،
// 16 سؤال لكل وحدة، النقاط الجديدة كتبان فالدروس المناسبة، والاختبار والشهادة بحال ما كانو
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.SHOT || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const bad = [];
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.evaluate(() => { localStorage.w777_acad = '{}'; });
  const go = async h => { await p.goto(BASE + h); await p.waitForTimeout(1300); };
  const ow = async t => { const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push(t + ' overflow ' + sw); };
  await go('#/learn');
  const info = await p.evaluate(() => { const M = window.W777_ACAD.modules; return { n: M.length, ex: M.map(m => m.exam.length), les: M.reduce((a, m) => a + m.lessons.length, 0) }; });
  if (info.n !== 7 || info.les !== 42 || info.ex.some(x => x !== 16)) bad.push('data ' + JSON.stringify(info));
  if (await p.$$eval('.ac-mod', a => a.length) !== 7 || await p.$('a[href="#/learn/M8"]')) bad.push('M8 still shown');
  // النقاط الجديدة فالبلايص ديالها (الدرس كيتحل والنص كاين)
  await p.evaluate(() => { const s = {}; ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'].forEach(m => { s[m] = { les: {}, tries: 1, best: 0.9, pass: Date.now() }; }); localStorage.w777_acad = JSON.stringify(s); });
  const want = [['M1/2', 'تبقى العمولة مستحقة'], ['M1/5', 'بطاقة المالك'], ['M2/1', 'لائحة مراجعة ملف البيع'], ['M2/2', '16 يوليوز 2026'], ['M2/4', 'ثابت التاريخ'], ['M2/5', '31.18'],
    ['M3/0', 'الوكالة الحضرية'], ['M4/1', 'مدة الاسترجاع'], ['M4/2', 'النقد الذي يحتاجه المشتري'], ['M4/3', 'جزافاً 15%'], ['M5/3', '12 شهراً'], ['M5/5', 'قبل يوم 10'], ['M6/4', 'رابط الموقع'], ['M7/2', 'الرسم المهني']];
  for (const [h, t] of want) { await go('#/learn/' + h); const tx = await p.textContent('.ac-pts'); if (!tx.includes(t)) bad.push('missing ' + h + ' ' + t); await ow(h); }
  if (SHOT) await p.screenshot({ path: SHOT + '/v245-lesson.png', fullPage: true });
  // الأرقام بالفراغ الثابت (ما كتتقلبش)
  const nb = await p.evaluate(() => /283 300/.test(JSON.stringify(window.W777_ACAD.modules[3])));
  if (!nb) bad.push('nbsp');
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
