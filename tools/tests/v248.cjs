// v248: 🗣️ فم منير طبيعي: الفك كيهبط شوية صغيرة (≤ 4% من الوجه) بحواف ذايبة، التجويف بلا حاشية ولا سنان مرسومين،
// والحركة (المحاكاة ديال الكلام) ناعمة: بلا قفزات كبيرة بين صورة وصورة، والفم كيتسد بين الكلمات
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const bad = [];
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE); await p.waitForTimeout(1200);
  await p.click('#agent-fab'); await p.waitForTimeout(1500);
  const m = await p.evaluate(() => { const f = document.querySelector('#ag-face').cloneNode(true); f.style.transform = 'none'; f.style.setProperty('--open', '1');
    const w = document.createElement('div'); w.style.cssText = 'position:fixed;left:0;top:0;width:300px;height:300px'; w.appendChild(f); document.body.appendChild(w);
    const jaw = getComputedStyle(f.querySelector('.ag-jaw')).transform, mo = getComputedStyle(f.querySelector('.ag-mouth'));
    const ty = jaw === 'none' ? 0 : parseFloat(jaw.split(',')[5]); const r = { ty, h: 300, shadow: mo.boxShadow, bg: mo.backgroundImage.slice(0, 40) }; w.remove();
    return r; });
  if (!(m.ty > 0 && m.ty / m.h <= 0.04)) bad.push('jaw ' + JSON.stringify(m));
  if (m.shadow !== 'none' || /241, 236, 226/.test(m.bg)) bad.push('mouth style ' + JSON.stringify(m));
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
