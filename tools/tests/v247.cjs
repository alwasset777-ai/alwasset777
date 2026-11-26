// v247: 😎 صورة منير الجديدة + «حي أكثر»: النظارات كتتعرف أوتوماتيكيا (العينين غامقين) ← بلا رمشة بالجلد + لمعة العدسات،
// الهالة الذهبية كتدور (وأسرع ملي كيتكلم)، لمعة فالأيقونة، والضغط على الأيقونة باقي كيحل منير
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.SHOT || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const bad = [];
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE); await p.waitForTimeout(1500);
  const fab = await p.evaluate(() => { const f = document.querySelector('#agent-fab'); return f ? { img: (f.querySelector('img') || {}).src, shine: !!f.querySelector('.ag-shine'), anim: f.querySelector('.ag-shine') ? getComputedStyle(f.querySelector('.ag-shine'), '::before').animationName : '' } : null; });
  if (!fab || !/agent-mounir\.webp\?v=2/.test(fab.img) || !fab.shine || fab.anim !== 'ag-glint') bad.push('fab ' + JSON.stringify(fab));
  if (SHOT) await (await p.$('#agent-fab')).screenshot({ path: SHOT + '/v247-fab.png' });
  await p.click('#agent-fab'); await p.waitForTimeout(1800);
  const st = await p.evaluate(() => { const f = document.querySelector('#ag-face'), h = document.querySelector('.ag-halo'), l = f && f.querySelector('.ag-lens.l'), lid = f && f.querySelector('.ag-lid');
    const r = l && l.getBoundingClientRect(), fr = f && f.getBoundingClientRect();
    return { glasses: f && f.classList.contains('glasses'), halo: h && getComputedStyle(h).animationName, lens: l && getComputedStyle(l).display, lid: lid && getComputedStyle(lid).display,
      lx: r && fr ? +(((r.left + r.width / 2) - fr.left) / fr.width).toFixed(2) : 0, ly: r && fr ? +(((r.top + r.height / 2) - fr.top) / fr.height).toFixed(2) : 0, pe: h && getComputedStyle(h).pointerEvents }; });
  if (!st.glasses || st.halo !== 'ag-halo' || st.lens !== 'block' || st.lid !== 'none' || st.pe !== 'none') bad.push('stage ' + JSON.stringify(st));
  if (Math.abs(st.lx - 0.36) > 0.04 || Math.abs(st.ly - 0.54) > 0.05) bad.push('lens pos ' + JSON.stringify(st));
  if (SHOT) { await p.waitForTimeout(3600); await (await p.$('#ag-stage')).screenshot({ path: SHOT + '/v247-stage.png' }); }
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
