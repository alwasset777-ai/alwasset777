// أكاديمية الوسيط 777: 7 وحدات، M2 مقفولة حتى النجاح فاختبار M1 (70%)، الدرس والأسئلة، الرسوب، الشهادة
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.S || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const bad = [];
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.evaluate(() => { localStorage.w777_acad = '{}'; });
  const ow = async t => { const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push(t + ' overflow ' + sw); };
  const go = async h => { await p.goto(BASE + h); await p.waitForTimeout(1300); };
  await go('#/learn'); await ow('home');
  if (await p.$$eval('.ac-mod', a => a.length) !== 7) bad.push('7 modules');
  if (await p.$$eval('.ac-mod.lk', a => a.length) !== 6) bad.push('6 locked');
  if (SHOT) await p.screenshot({ path: SHOT + '/ac-home.png', fullPage: true });
  // M2 مقفولة
  await go('#/learn/M2'); if (!/🔒/.test(await p.textContent('#ac-root'))) bad.push('M2 not locked');
  // الدرس 1: الأسئلة كتعلم الدرس
  await go('#/learn/M1/0'); await ow('lesson');
  for (let k = 0; k < 2; k++) { await p.click(`.ac-q >> nth=${k} >> .ac-o >> nth=0`); await p.waitForTimeout(150); }
  if (await p.$$eval('.ac-why', a => a.length) !== 2) bad.push('lesson why');
  if (SHOT) await p.screenshot({ path: SHOT + '/ac-lesson.png', fullPage: true });
  const done = await p.evaluate(() => Object.keys((JSON.parse(localStorage.w777_acad).M1 || {}).les || {}).length);
  if (done !== 1) bad.push('lesson done ' + done);
  // الاختبار: الأجوبة الغالطة ← رسوب
  const answer = async right => {
    for (let k = 0; k < 10; k++) {
      await p.waitForSelector('.ac-exam .ac-o');
      await p.evaluate(ok => {
        const qt = document.querySelector('.ac-exam .ac-q p').textContent.trim();
        const m = window.W777_ACAD.modules.find(x => x.m === 'M1'), q = m.exam.find(e => e[0] === qt);
        const bs = [...document.querySelectorAll('.ac-exam .ac-o')];
        const b = bs.find(x => (x.textContent.trim() === q[1][0]) === ok); b.click();
      }, right);
      await p.waitForTimeout(80); await p.click('[data-x]'); await p.waitForTimeout(80);
    }
    await p.waitForSelector('.ac-score');
  };
  await go('#/learn/M1/exam'); await answer(false);
  if (!(await p.$('.ac-score.no'))) bad.push('fail screen');
  await go('#/learn/M2'); if (!/🔒/.test(await p.textContent('#ac-root'))) bad.push('M2 opened after fail');
  // النجاح ← M2 تفتحات
  await go('#/learn/M1/exam'); await answer(true);
  if (!(await p.$('.ac-score.ok'))) bad.push('pass screen');
  if (SHOT) await p.screenshot({ path: SHOT + '/ac-pass.png', fullPage: true });
  await go('#/learn/M2'); if (/🔒/.test(await p.textContent('.ac-crumb + *'))) bad.push('M2 still locked');
  if (!(await p.$('.ac-lessons'))) bad.push('M2 lessons');
  // الشهادة: مقفولة، ومن بعد كل الوحدات ناجحة ← الاسم ← الشهادة
  await go('#/learn/cert'); if (await p.$('.ac-cert')) bad.push('cert open early');
  await p.evaluate(() => { const s = JSON.parse(localStorage.w777_acad); window.W777_ACAD.modules.forEach(x => { s[x.m] = Object.assign({ les: {}, tries: 1 }, s[x.m], { best: 0.9, pass: Date.now() }); }); localStorage.w777_acad = JSON.stringify(s); });
  await go('#/learn'); await go('#/learn/cert'); await p.fill('#ac-nm', 'متكون تجريبي'); await p.click('#ac-mk'); await p.waitForTimeout(500);
  const cert = await p.$('.ac-cert'); const txt = cert ? await cert.textContent() : '';
  if (!cert || !/متكون تجريبي/.test(txt) || !/W777-AC-/.test(txt)) bad.push('cert');
  await ow('cert');
  if (SHOT) { await p.setViewportSize({ width: 1100, height: 900 }); await p.waitForTimeout(300); await (await p.$('.ac-cert')).screenshot({ path: SHOT + '/ac-cert.png' }); }
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
