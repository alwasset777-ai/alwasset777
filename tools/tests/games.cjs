// الوسيط GAMES: صفحة 7 الشعارات + كل لعبة كتكمل حتى النتيجة (بلا أخطاء، بلا خروج على عرض التيليفون)
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.evaluate(() => { localStorage.w777_games = '{}'; });
  const bad = []; const ow = async t => { const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push(t + ' overflow ' + sw); };
  await p.goto(BASE + '#/game'); await p.waitForTimeout(1500);
  const n = await p.$$eval('.gm-lg', a => a.map(x => x.getAttribute('href'))); if (n.length !== 7) bad.push('hub ' + n.length); await ow('hub');
  // وصلة العقار من الصفحة + زر الرجوع
  await p.click('.gm-lg[href="#/game/wasla"]'); await p.waitForTimeout(2500);
  if (!(await p.$('#cw-root *'))) bad.push('wasla'); if (!(await p.$('.gm-back'))) bad.push('wasla back');
  for (const id of ['price', 'calc', 'law', 'scam']) {
    await p.goto(BASE + '#/game/' + id); await p.waitForTimeout(600);
    if (await p.$$eval('.gm-s', a => a.length) !== 5) bad.push(id + ' stages');
    if (!(await p.$('.gm-s.lk'))) bad.push(id + ' lock');
    await p.click('.gm-s'); await p.waitForTimeout(400);
    for (let i = 0; i < 8; i++) {
      await p.waitForSelector('.gm-o:not([disabled])'); await ow(id + ' q' + i);
      await p.click('.gm-o'); await p.waitForSelector('.gm-why');
      if (await p.$$eval('.gm-o.ok', a => a.length) !== 1) bad.push(id + ' noright');
      const w = await p.$eval('.gm-why', e => e.textContent.trim()); if (w.length < 25) bad.push(id + ' why');
      await p.click('.gm-w .gm-next'); await p.waitForTimeout(120);
    }
    await p.waitForSelector('.gm-res'); await ow(id + ' res');
  }
  // مليونير العقار: كريدي على أول عرض، ومن بعد السنين حتى النهاية
  await p.goto(BASE + '#/game/tycoon'); await p.waitForTimeout(500); await p.click('.gm-s'); await p.waitForTimeout(400); await ow('tycoon');
  for (let y = 0; y < 14 && !(await p.$('.gm-res')); y++) {
    const l = await p.$('[data-l]'); if (l) { await l.click(); await p.waitForTimeout(80); }
    if (await p.$('[data-n]')) await p.click('[data-n]'); await p.waitForTimeout(120);
  }
  if (!(await p.$('.gm-res'))) bad.push('tycoon end');
  // بني دارك: أول اختيار فكل خطوة
  await p.goto(BASE + '#/game/build'); await p.waitForTimeout(500); await p.click('.gm-s'); await p.waitForTimeout(400); await ow('build');
  for (let k = 0; k < 8; k++) { await p.click('.gm-c'); await p.waitForTimeout(120); }
  await p.waitForSelector('.gm-res'); console.log('build', await p.$eval('.gm-big', e => e.textContent));
  // النجوم كتبان فالصفحة الرئيسية ديال الألعاب
  await p.goto(BASE + '#/game'); await p.waitForTimeout(800); console.log('total', await p.$eval('.gm-top .gm-chip', e => e.textContent));
  // الصفحة العمومية games.html (بلا حساب)
  await p.goto(BASE + 'games.html'); await p.waitForTimeout(1200);
  if (await p.$$eval('.gm-lg', a => a.length) !== 7) bad.push('public hub');
  if (await p.$eval('.gm-lg', a => a.getAttribute('href')) !== 'game.html') bad.push('public wasla link');
  await p.click('.gm-lg[href="#/game/law"]'); await p.waitForTimeout(600); await p.click('.gm-s'); await p.waitForTimeout(400);
  if (!(await p.$('.gm-o'))) bad.push('public play'); await ow('public');
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
