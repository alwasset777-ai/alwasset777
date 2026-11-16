// 🌀 شاشة الفتح + 🔊 صوت الفتح (مرة فالنهار، كيتسد من الإعدادات) + القائمة بلا «مجموعات المشتركين» ولا «+ إضافة»
const { chromium } = require('playwright'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  // الصوت بلا لمس (بحال التطبيق المثبت فالأندرويد)
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
  const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage();
  const errs = [], bad = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic/, r => r.abort());
  await p.goto(BASE, { waitUntil: 'commit' }); await p.waitForTimeout(350);
  const early = await p.evaluate(() => { const s = document.getElementById('splash'); return !!s && getComputedStyle(s).opacity > 0.5 && !!s.querySelector('.sp-c3 img'); });
  if (!early) bad.push('splash not shown');
  await p.waitForTimeout(3000);
  const s1 = await p.evaluate(() => ({ gone: !document.getElementById('splash'), snd: window.__w777_snd || 0, day: localStorage.getItem('w777_snd_day') }));
  if (!s1.gone) bad.push('splash stays'); if (s1.snd !== 1 || s1.day !== new Date().toISOString().slice(0, 10)) bad.push('sound 1st ' + JSON.stringify(s1));
  // نفس النهار: بلا صوت
  await p.reload(); await p.waitForTimeout(2500);
  if (await p.evaluate(() => window.__w777_snd || 0)) bad.push('sound twice same day');
  // الإعدادات ← التطبيق: الخانة + الإطفاء + «جرّب»
  await p.evaluate(() => { location.hash = '#/settings?s=app'; }); await p.waitForTimeout(1200);
  if (!(await p.isVisible('#snd-on')) || !(await p.isChecked('#snd-on'))) bad.push('card');
  await p.uncheck('#snd-on'); await p.waitForTimeout(200);
  if (await p.evaluate(() => localStorage.getItem('w777_open_sound')) !== '0') bad.push('toggle');
  await p.click('#snd-try'); await p.waitForTimeout(500);
  if (await p.evaluate(() => window.__w777_snd || 0) !== 1) bad.push('try btn');
  await p.evaluate(() => localStorage.removeItem('w777_snd_day')); await p.reload(); await p.waitForTimeout(2500);
  if (await p.evaluate(() => window.__w777_snd || 0)) bad.push('sound while off');
  // القائمة
  const side = await p.evaluate(() => ({ groups: !!document.querySelector('.sidenav [href="#/terms/groups"]'), add: [...document.querySelectorAll('.sidenav a')].some(a => /إضافة (عقار|طلب)/.test(a.textContent)) }));
  if (side.groups || side.add) bad.push('menu ' + JSON.stringify(side));
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
