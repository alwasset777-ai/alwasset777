// v229: لمسات التزيين (زخرفة مغربية خفيفة، خط العناوين، حاشية ذهبية) — صور قبل/بعد + فحص بسيط
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const OUT = process.env.SHOT || '/tmp/deco'; const PAGES = [['home', '#/'], ['props', '#/properties'], ['settings', '#/settings'], ['request', '#/request/new']];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [];
  for (const dark of [0, 1]) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript((d) => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; if (d) localStorage.w777_theme = 'dark'; }, dark);
    await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
    await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
    for (const [n, h] of (dark ? PAGES.slice(1, 3) : PAGES)) {
      await p.goto(BASE + h); await p.waitForTimeout(1500);
      await p.screenshot({ path: `${OUT}-${n}${dark ? '-dark' : ''}.png` });
    }
    if (process.env.CHECK) {
      await p.goto(BASE + '#/settings'); await p.waitForTimeout(1200);
      const r = await p.evaluate(() => ({
        pat: getComputedStyle(document.body, '::after').backgroundImage.includes('svg'),
        op: +getComputedStyle(document.body, '::after').opacity,
        line: getComputedStyle(document.querySelector('.page-head'), '::after').backgroundImage.includes('gradient'),
        gold: getComputedStyle(document.querySelector('.card.card-pad')).backgroundImage.split('gradient').length - 1,
        click: (() => { const e = document.elementFromPoint(195, 420); return !!e && e !== document.body && e !== document.documentElement; })(),
      }));
      if (!r.pat || r.op > 0.08 || r.op <= 0) bad.push('pattern ' + JSON.stringify(r));
      if (!r.line) bad.push('no header line'); if (r.gold < 2) bad.push('no gold top'); if (!r.click) bad.push('pattern blocks clicks');
    }
    await p.close();
  }
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
