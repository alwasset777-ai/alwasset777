// v262: الأكاديمية بشكل احترافي — كل درس فيه الأهداف، المصطلحات (عربي/فرنسي)، الخلاصة والتمرين؛ المسار بأسماء المراحل؛ 18 سؤال لكل وحدة
const { chromium } = require('playwright'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg|supabase\.co/, r => r.abort());
  await p.goto(BASE + '#/learn'); await p.waitForTimeout(2500);
  const data = await p.evaluate(() => { const A = window.W777_ACAD; return { ex: A.modules.map(m => m.exam.length), full: A.modules.every(m => m.lessons.every(l => l.goal && l.goal.length >= 2 && l.terms && l.terms.length >= 2 && l.sum && l.task)) }; });
  if (data.ex.some(x => x !== 18) || !data.full) bad.push('data ' + JSON.stringify(data));
  const road = await p.$$eval('.ac-road a small', a => a.map(x => x.textContent));
  if (road.join(',') !== 'الأساس,القانون,التقني,الأرقام,التجارة,التسويق,المقاولة') bad.push('road ' + road);
  await p.goto(BASE + '#/learn/M1/2'); await p.waitForTimeout(1500);
  const les = await p.evaluate(() => { const t = s => { const e = document.querySelector(s); return e ? e.textContent : ''; }; const secs = [...document.querySelectorAll('.ac-les .ac-sec h4')].map(h => h.textContent.slice(0, 12));
    return { goal: t('.ac-goal'), terms: document.querySelectorAll('.ac-terms dt').length, fr: t('.ac-terms dt span'), sum: t('.ac-sum'), task: t('.ac-task'), first: secs[0], mk: /مكناس\)/.test(document.body.textContent) }; });
  if (!/أهداف الدرس/.test(les.goal) || les.terms < 2 || !/Mandat/.test(les.fr) || !les.sum || !/تمرين/.test(les.task) || !/أهداف/.test(les.first) || les.mk) bad.push('lesson ' + JSON.stringify(les));
  if (SHOT) { await p.screenshot({ path: SHOT + '/lesson-top.png' }); await p.evaluate(() => document.querySelector('.ac-terms').scrollIntoView()); await p.screenshot({ path: SHOT + '/lesson-terms.png' }); }
  // الطبع (PDF) فيه نفس الأجزاء
  await p.goto(BASE + 'academy-print.html?m=M2'); await p.waitForTimeout(2500);
  const pr = await p.evaluate(() => [document.querySelectorAll('.ac-goal').length, document.querySelectorAll('.ac-task').length]);
  if (pr[0] !== 6 || pr[1] !== 6) bad.push('print ' + pr);
  console.log(JSON.stringify({ bad, errs, road })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
