// v232: «خدمات المجموعة» و«مجموعة الوسيط» فالرئيسية ← سطرين: العنوان على اليمين + الدوائر كتتمرر باليد؛ الضغط على العنوان كيحل النافذة الكاملة
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  for (const vw of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
    const p = await b.newPage({ viewport: vw, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
    await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
    await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
    await p.goto(BASE + '#/'); await p.waitForSelector('.hrow[data-hr=svc]', { timeout: 10000 }).catch(() => bad.push('no rows'));
    const r = await p.evaluate(() => [...document.querySelectorAll('.hrow')].map(row => { const h = row.querySelector('.hr-head').getBoundingClientRect(), s = row.querySelector('.hr-strip'), sr = s.getBoundingClientRect();
      return { k: row.dataset.hr, tiles: s.querySelectorAll('.hub-tile').length, headRight: h.left > sr.left, scroll: s.scrollWidth > s.clientWidth + 10, page: document.documentElement.scrollWidth <= innerWidth + 1 }; }));
    const svc = r.find(x => x.k === 'svc'), net = r.find(x => x.k === 'net');
    if (!svc || svc.tiles < 10 || !svc.headRight || !svc.scroll || !svc.page) bad.push(vw.width + ' svc ' + JSON.stringify(svc));
    if (!net || net.tiles !== 7 || !net.headRight || !net.page) bad.push(vw.width + ' net ' + JSON.stringify(net));
    // ⭕ v233: 4 دوائر فسطر واحد (إضافة، بحث، إعلانات فورية، التمويل العقاري)
    const circ = await p.$$eval('.hs-circ .hc .hc-c', a => a.map(c => { const r = c.getBoundingClientRect(), st = getComputedStyle(c); return [Math.round(r.top), Math.round(r.width - r.height), parseFloat(st.borderTopLeftRadius) >= r.width / 2 - 1]; }));
    if (circ.length !== 4 || new Set(circ.map(c => c[0])).size !== 1 || circ.some(c => c[1] || !c[2])) bad.push(vw.width + ' circles ' + JSON.stringify(circ));
    if (await p.$('.hero-big3 [data-hm=add]')) bad.push('old add button still in hero');
    await p.$eval('.hrow[data-hr=svc]', e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v232') + '-' + vw.width + '.png' });
    // التمرير باليد ← كيتحرك
    const moved = await p.$eval('.hrow[data-hr=svc] .hr-strip', s => { const a = s.scrollLeft; s.scrollBy({ left: -200 }); return new Promise(r => setTimeout(() => r(Math.abs(s.scrollLeft - a) > 50), 400)); });
    if (!moved) bad.push(vw.width + ' strip does not scroll');
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v232') + '-' + vw.width + '-scrolled.png' });
    // الدائرة ← الصفحة
    await p.click('.hrow[data-hr=net] .hub-tile[href="#/brokers"]'); await p.waitForTimeout(800);
    if (!/brokers/.test(await p.evaluate(() => location.hash))) bad.push('tile link');
    await p.goto(BASE + '#/'); await p.waitForSelector('.hrow .hr-head');
    await p.click('.hrow[data-hr=svc] .hr-head'); await p.waitForTimeout(500);
    if (!(await p.$('.modal .hub-menu'))) bad.push('head opens modal');
    await p.close();
  }
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
