// v250: ✨ لمعة السنان فآخر الجملة (العنصر + الحركة)، 🎚️ «حركة الفم» فالإعدادات (هادئة/عادية/حيوية، محفوظة فالجهاز)،
// 😊 منير كيتحرك شوية ملي ساكت وكيهز راسو ملي كتكتب
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const bad = [];
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE); await p.waitForTimeout(1200);
  // الإعداد
  let found = false;
  for (const s of ['app', 'office', 'data', 'security']) { await p.goto(BASE + '#/settings?s=' + s); await p.waitForTimeout(1200); if (await p.isVisible('#ag-mouth-set').catch(() => false)) { found = true; break; } }
  if (!found) bad.push('no mouth setting');
  else {
    if (await p.$$eval('#ag-mouth-set [data-mouth]', a => a.length) !== 3) bad.push('3 chips');
    if (!(await p.$('#ag-mouth-set [data-mouth="normal"].on'))) bad.push('default normal');
    await p.click('#ag-mouth-set [data-mouth="lively"]'); await p.waitForTimeout(300);
    if (await p.evaluate(() => localStorage.w777_mouth) !== 'lively' || !(await p.$('#ag-mouth-set [data-mouth="lively"].on'))) bad.push('lively not saved');
    await p.click('#ag-mouth-set [data-mouth="normal"]');
  }
  // منير: الحركة فالسكوت + «كنسمعك» + اللمعة
  await p.goto(BASE + '#/'); await p.waitForTimeout(1200); await p.click('#agent-fab'); await p.waitForTimeout(1500);
  const nods = []; for (let i = 0; i < 6; i++) { nods.push(await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#ag-stage')).getPropertyValue('--nod')) || 0)); await p.waitForTimeout(350); }
  if (Math.max(...nods) - Math.min(...nods) < 0.05) bad.push('idle still ' + nods.join(','));
  await p.fill('#ag-text', 'سلام'); await p.waitForTimeout(250);
  const ln = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#ag-stage')).getPropertyValue('--nod')) || 0);
  if (Math.abs(ln) < 0.6) bad.push('listen nod ' + ln);
  const sp = await p.evaluate(async () => { const s = document.querySelector('#ag-face .ag-spark'); if (!s) return null; s.classList.add('on'); await new Promise(r => setTimeout(r, 250)); return { a: getComputedStyle(s).animationName, o: +getComputedStyle(s).opacity, pe: getComputedStyle(s).pointerEvents }; });
  if (!sp || sp.a !== 'ag-spark' || !(sp.o > 0.3) || sp.pe !== 'none') bad.push('spark ' + JSON.stringify(sp));
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
