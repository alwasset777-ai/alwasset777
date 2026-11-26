// v245: 🗂️ وحدة «الميدان» M8 (إضافية): مفتوحة للجميع، 7 دروس، أزرار الأدوات، الاختبار كيعطي شارة (ماشي الشهادة)،
// الشهادة كتتفتح بالوحدات السبعة بلا M8، ومن بعد M7 ← الشهادة (ماشي M8)، PDF ديالها كاين
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
  await go('#/learn'); await ow('home');
  const h = await p.evaluate(() => ({ road: document.querySelectorAll('.ac-road a').length, bh: !!document.querySelector('.ac-bh'), m8: !!document.querySelector('a.ac-mod[href="#/learn/M8"]:not(.lk)'), prog: document.querySelector('.ac-hero small').textContent }));
  if (h.road !== 7) bad.push('road ' + h.road); if (!h.bh || !h.m8) bad.push('bonus card'); if (!/0 \/ 7/.test(h.prog)) bad.push('prog ' + h.prog);
  if (SHOT) await p.screenshot({ path: SHOT + '/v245-home.png', fullPage: true });
  await go('#/learn/M8'); await ow('m8');
  if (/🔒/.test(await p.textContent('#ac-root'))) bad.push('M8 locked');
  if (await p.$$eval('.ac-l', a => a.length) !== 7) bad.push('7 lessons');
  const links = await p.$$eval('.ac-links a', a => a.map(x => x.getAttribute('href')));
  if (links.join() !== '#/contracts,#/loan,#/estimate') bad.push('links ' + links);
  if (!/شارة/.test(await p.textContent('#ac-root'))) bad.push('badge text');
  if (SHOT) await p.screenshot({ path: SHOT + '/v245-m8.png', fullPage: true });
  for (let j = 0; j < 7; j++) { await go('#/learn/M8/' + j); if (!(await p.$('.ac-idea')) || !(await p.$('.ac-info'))) bad.push('lesson ' + j); await ow('l' + j); }
  if (SHOT) await p.screenshot({ path: SHOT + '/v245-lesson.png', fullPage: true });
  const answer = async m => {
    for (let k = 0; k < 10; k++) {
      await p.waitForSelector('.ac-exam .ac-o');
      await p.evaluate(m => { const qt = document.querySelector('.ac-exam .ac-q p').textContent.trim(); const q = window.W777_ACAD.modules.find(x => x.m === m).exam.find(e => e[0] === qt);
        [...document.querySelectorAll('.ac-exam .ac-o')].find(x => x.textContent.trim() === q[1][0]).click(); }, m);
      await p.waitForTimeout(60); await p.click('[data-x]'); await p.waitForTimeout(60);
    }
    await p.waitForSelector('.ac-score');
  };
  await go('#/learn/M8/exam'); await answer('M8');
  const r8 = await p.textContent('.ac-score');
  if (!/شارة/.test(r8) || await p.$('.ac-score a[href="#/learn/cert"]')) bad.push('M8 result');
  await go('#/learn/cert'); if (await p.$('.ac-cert')) bad.push('cert opened by M8');
  // الوحدات السبعة ناجحين (بلا M8) ← M7 ← الشهادة
  await p.evaluate(() => { const s = JSON.parse(localStorage.w777_acad); delete s.M8; ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'].forEach(m => { s[m] = { les: {}, tries: 1, best: 0.9, pass: Date.now() }; }); localStorage.w777_acad = JSON.stringify(s); });
  await go('#/learn/M7/exam'); await answer('M7');
  if (!(await p.$('.ac-score a[href="#/learn/cert"]'))) bad.push('M7 → cert');
  await go('#/learn/cert'); await p.fill('#ac-nm', 'متكون تجريبي'); await p.click('#ac-mk'); await p.waitForTimeout(500);
  const ct = (await p.textContent('.ac-cert').catch(() => '')) || '';
  if (!/W777-AC-/.test(ct) || /M8/.test(ct)) bad.push('cert 7 only');
  const pdf = await p.evaluate(() => fetch('files/formation/M8.pdf', { method: 'HEAD' }).then(r => r.status));
  if (pdf !== 200) bad.push('pdf ' + pdf);
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
