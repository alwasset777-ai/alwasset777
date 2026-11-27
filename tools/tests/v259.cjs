// v259: «إضافة» ← خانة كتنزل تحت الزر (الدوائر بنفس القياس)، الزر العائم «+» تحيد، الشعار كيدور حتى مع «تقليل الحركة» (دورة كل 3 ث)،
// نافذة الدولة ← «📲 راسلهم كاملين» (المدير)، المدن اللي فيها عقارات بزاف بالذهبي
const { chromium, devices } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const c = await b.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await c.route(/wa\.me/, r => r.fulfill({ status: 200, contentType: 'text/html', body: 'wa' })); // ما كنخرجوش للأنترنت
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.goto(BASE + '#/'); await p.waitForSelector('.hs-circ .hc[data-hm=add]'); await p.waitForTimeout(1500);
  // 1) الشعار كيدور حتى مع «تقليل الحركة»: 3 ث، والشكل كيتبدل
  const coin = await p.evaluate(async () => { const c = document.querySelector('.topbar .coin'); const s = getComputedStyle(c); const seen = new Set();
    for (let i = 0; i < 12; i++) { seen.add(getComputedStyle(c).transform); await new Promise(r => setTimeout(r, 100)); } return { name: s.animationName, dur: s.animationDuration, moves: seen.size > 2 }; });
  if (coin.name !== 'logo-turn3' || coin.dur !== '3s' || !coin.moves) bad.push('logo not turning ' + JSON.stringify(coin));
  // 2) الزر العائم «+» ما بقاش
  if (await p.evaluate(() => { const f = document.querySelector('#fab'); return f && getComputedStyle(f).display !== 'none'; })) bad.push('floating + still visible');
  // 3) «إضافة» ← خانة كتنزل تحت الزر، 4 دوائر (المدير) بنفس قياس دائرة «+»
  await p.click('.hs-circ .hc[data-hm=add]'); await p.waitForTimeout(500);
  const dd = await p.evaluate(() => { const d = document.querySelector('.add-drop'); if (!d) return null; const r = d.getBoundingClientRect(), card = document.querySelector('.hs-circ').getBoundingClientRect(), plus = document.querySelector('.hc[data-hm=add] .hc-c').getBoundingClientRect();
    const cs = [...d.querySelectorAll('.ad-c')].map(e => Math.round(e.getBoundingClientRect().width)); return { n: cs.length, cs, plus: Math.round(plus.width), below: r.top >= card.bottom - 1, modal: !!document.querySelector('.modal'), labels: [...d.querySelectorAll('b')].map(x => x.textContent), hrefs: [...d.querySelectorAll('a')].map(a => a.getAttribute('href')) }; });
  if (!dd || dd.n !== 4 || dd.cs.some(w => Math.abs(w - dd.plus) > 1) || !dd.below || dd.modal) bad.push('add drop ' + JSON.stringify(dd));
  // عمودي: الدوائر وحدة تحت وحدة، وفنفس الوسط ديال دائرة «+»
  const col = await p.evaluate(() => { const plus = document.querySelector('.hc[data-hm=add] .hc-c').getBoundingClientRect(), pc = plus.left + plus.width / 2;
    const cs = [...document.querySelectorAll('.add-drop .ad-c')].map(e => e.getBoundingClientRect()); return { x: cs.map(r => Math.round(r.left + r.width / 2 - pc)), down: cs.every((r, i) => !i || r.top > cs[i - 1].bottom) }; });
  if (!col.down || col.x.some(x => Math.abs(x) > 3)) bad.push('drop not vertical under + ' + JSON.stringify(col));
  if (dd && !dd.hrefs.includes('#/property/new')) bad.push('add drop links ' + JSON.stringify(dd.hrefs));
  if (SHOT) await p.screenshot({ path: SHOT + '/add-drop.png' });
  // ضغطة برّا ← كتسد؛ ضغطة على الزر ← كتحل وكتسد
  await p.mouse.click(200, 760); await p.waitForTimeout(300);
  if (await p.$('.add-drop')) bad.push('drop not closed on outside click');
  await p.click('.hs-circ .hc[data-hm=add]'); await p.waitForTimeout(300); await p.click('.hs-circ .hc[data-hm=add]'); await p.waitForTimeout(300);
  if (await p.$('.add-drop')) bad.push('drop not toggled');
  // الدائرة ← الصفحة
  await p.click('.hs-circ .hc[data-hm=add]'); await p.waitForTimeout(400); await p.click('.add-drop a[href="#/property/new"]'); await p.waitForTimeout(900);
  if (!/property\/new/.test(await p.evaluate(() => location.hash)) || await p.$('.add-drop')) bad.push('drop item navigation');
  // 4) نافذة الدولة ← «📲 راسلهم كاملين» (المدير): كل زر كيدي لواتساب بالرسالة والسمية
  await p.goto(BASE + '#/'); await p.waitForSelector('#home-flags button.fl-item'); await p.waitForTimeout(600);
  await p.evaluate(() => [...document.querySelectorAll('#home-flags .fl-item')].find(x => x.dataset.iso === 'FR').click()); await p.waitForTimeout(900);
  if (!(await p.$('#cty-wa'))) bad.push('no bulk whatsapp button');
  else {
    await p.click('#cty-wa'); await p.waitForTimeout(600);
    const [pop] = await Promise.all([c.waitForEvent('page', { timeout: 4000 }).catch(() => null), p.click('[data-wa="0"]')]);
    const u = pop ? pop.url() : ''; if (pop) await pop.close();
    const st = await p.evaluate(() => [document.querySelector('[data-wa="0"]').textContent, document.querySelector('#cw-count').textContent]);
    if (!/wa\.me\/\d+\?text=/.test(u) || !/✓/.test(st[0]) || !/1 من/.test(st[1])) bad.push('bulk wa ' + JSON.stringify({ u: u.slice(0, 60), st }));
  }
  // 5) المدن بالذهبي (فيها عقارات بزاف)
  await p.goto(BASE + '#/'); await p.waitForTimeout(3500);
  const hot = await p.$$eval('.city-ticker .ct-hot', a => a.map(e => e.dataset.city + e.dataset.n));
  if (!hot.length) bad.push('no gold cities');
  console.log(JSON.stringify({ bad, errs, hot: hot.slice(0, 4) })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
