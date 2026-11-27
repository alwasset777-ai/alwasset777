// v216: الشعار فالرأس كيبان ديما — صورة <img> محمّلة (ماشي خلفية 3D)، والاحتياط: أيقونة التطبيق ← الاسم مكتوب
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const OUT = process.env.SHOT || '/tmp/v216';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  // mode: ok = عادي، alt = logo.png ما كاينش، none = حتى أيقونة التطبيق ما كايناش
  for (const [mode, vp] of [['ok', { width: 390, height: 780 }], ['ok', { width: 1280, height: 800 }], ['alt', { width: 390, height: 780 }], ['none', { width: 390, height: 780 }]]) {
    const c = await b.newContext({ viewport: vp, serviceWorkers: 'block' }); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; });
    await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
    if (mode !== 'ok') await p.route(/icons\/logo\.png\?v=10/, r => r.fulfill({ status: 404, body: '' }));
    if (mode === 'none') await p.route(/icons\/icon-192\.png/, r => r.fulfill({ status: 404, body: '' }));
    await p.goto(BASE); await p.waitForTimeout(1200); await F.login(p, BASE); await p.waitForTimeout(2000);
    const r = await p.evaluate(() => {
      const co = document.querySelector('.topbar .coin'), im = co && co.querySelector('img'), box = co && co.getBoundingClientRect();
      const old = document.querySelector('.coin-f, .coin-e');
      return { coin: !!co, img: im ? { src: im.getAttribute('src'), nw: im.naturalWidth, disp: getComputedStyle(im).display } : null, txt: co ? co.classList.contains('coin-txt') : false,
        h: box ? Math.round(box.height) : 0, old: !!old, anim: co ? getComputedStyle(co).animationName : '' };
    });
    const tag = mode + '-' + vp.width;
    if (!r.coin || r.h < 40) bad.push(tag + ' coin ' + JSON.stringify(r));
    if (r.old) bad.push(tag + ' old 3D faces still there');
    if (mode === 'ok' && !(r.img && r.img.nw > 0 && /logo\.png/.test(r.img.src) && r.img.disp !== 'none')) bad.push(tag + ' logo ' + JSON.stringify(r.img));
    if (mode === 'ok' && !/^logo-(flip|turn3)$/.test(r.anim)) /* v259: logo-turn3 */ bad.push(tag + ' anim ' + r.anim);
    if (mode === 'alt' && !(r.img && r.img.nw > 0 && /icon-192/.test(r.img.src))) bad.push(tag + ' fallback ' + JSON.stringify(r.img));
    if (mode === 'none' && !(r.txt && !r.img)) bad.push(tag + ' text fallback ' + JSON.stringify(r));
    // صورة بلا حركة (باش نشوفو الشعار مقابل)
    await p.addStyleTag({ content: '.topbar .coin{animation:none!important}' }); await p.waitForTimeout(200);
    const el = await p.$('.topbar'); if (el) await el.screenshot({ path: `${OUT}-${tag}.png` });
    await c.close();
  }
  console.log(JSON.stringify({ bad, errs }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
