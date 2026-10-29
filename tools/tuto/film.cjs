// تصوير مراحل الدليل: كل مرحلة = صور متتالية (780×1440) + توقيت + نصوص الشرح
// الاستعمال: cd docs && python3 -m http.server 8777 &  ثم  NODE_PATH=$(npm root -g) node tools/tuto/film.cjs OUT [n1 n2 …]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const F = require('./fake.cjs');
const STAGES = require('./stages.cjs');
const BASE = 'http://localhost:8777/bureau/';

function engine(p, dir) {
  const frames = []; const caps = []; let t = 0;
  const push = (f, d) => { frames.push({ f, d }); t += d; };
  let n = 0;
  const file = () => path.join(dir, `f${String(n++).padStart(5, '0')}.jpg`);
  async function shot() { const f = file(); await p.screenshot({ path: f, type: 'jpeg', quality: 88 }); return f; }
  async function clean() { await p.evaluate(() => document.querySelectorAll('.wl-mod, .toast').forEach(m => m.remove())).catch(() => {}); }
  const E = {
    t: () => t,
    frames, caps,
    async hold(ms) { await clean(); push(await shot(), ms / 1000); },
    // تسجيل حي (الحركات كتبان بسرعتها الحقيقية)
    async live(ms) {
      const end = Date.now() + ms; let last = Date.now(), f = await shot();
      while (Date.now() < end) { const now = Date.now(); push(f, (now - last) / 1000); last = now; f = await shot(); }
      push(f, 0.08);
    },
    async go(hash, ms = 1200) {
      await p.evaluate(h => { location.hash = h; }, hash); await p.waitForTimeout(ms);
      await p.evaluate(() => window.scrollTo(0, 0)); await clean(); await p.waitForTimeout(150);
    },
    // تمرير ناعم: 15 صورة فالثانية
    async scroll(px, ms = 1600) {
      const steps = Math.max(6, Math.round(ms / 66));
      for (let i = 1; i <= steps; i++) {
        const k = i / steps, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const prev = (i - 1) / steps, ep = prev < .5 ? 2 * prev * prev : 1 - Math.pow(-2 * prev + 2, 2) / 2;
        await p.evaluate(dy => window.scrollBy(0, dy), Math.round(px * (e - ep)));
        push(await shot(), ms / steps / 1000);
      }
    },
    async scrollTo(sel, ms = 1400) {
      const y = await p.evaluate(s => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return r.top - 120; }, sel).catch(() => null);
      if (y == null) { console.warn('  ! no', sel); return; }
      await E.scroll(y, ms);
    },
    // ضغطة: دائرة حمراء فبلاصة الصبع ومن بعد الضغط الحقيقي
    async tap(sel, after = 900) {
      const loc = typeof sel === 'string' ? p.locator(sel).first() : sel;
      if (!(await loc.count().catch(() => 0))) { console.warn('  ! tap: no', sel); return false; }
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      const b = await loc.boundingBox(); if (!b) { console.warn('  ! tap: hidden', sel); return false; }
      const x = b.x + b.width / 2, y = b.y + b.height / 2;
      await p.evaluate(([x, y]) => {
        const d = document.createElement('div'); d.className = 'tt-tap'; d.style.cssText = `left:${x}px;top:${y}px`;
        document.body.appendChild(d); setTimeout(() => d.remove(), 900);
      }, [x, y]);
      await E.live(420);
      await loc.click({ force: true }).catch(e => console.warn('  ! click', e.message.slice(0, 80)));
      await E.live(after);
      return true;
    },
    async type(sel, text) {
      const loc = p.locator(sel).first(); if (!(await loc.count())) { console.warn('  ! type: no', sel); return; }
      await loc.scrollIntoViewIfNeeded().catch(() => {}); await loc.fill('');
      for (let i = 1; i <= text.length; i += 2) { await loc.fill(text.slice(0, i)); push(await shot(), 0.09); }
      await loc.fill(text); push(await shot(), 0.4);
    },
    async eval(fn, arg) { return p.evaluate(fn, arg).catch(() => null); },
    async cap(text, fn) { const a = t; await fn(); caps.push({ text, a, b: t }); },
    page: p,
  };
  return E;
}

(async () => {
  const [out, ...only] = process.argv.slice(2);
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 720 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true, locale: 'ar-MA' });
  await c.addInitScript(() => {
    try { localStorage.setItem('w777_guide_hide', '1'); } catch (e) { /* */ }
    addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = `.tt-tap{position:fixed;z-index:2147483647;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;pointer-events:none;
        background:radial-gradient(circle,rgba(200,16,46,.45) 0 34%,rgba(200,16,46,.18) 35% 60%,transparent 61%);border:3px solid rgba(200,16,46,.9);
        animation:ttp .85s ease-out forwards}@keyframes ttp{0%{transform:scale(.5);opacity:1}60%{transform:scale(1);opacity:1}100%{transform:scale(1.35);opacity:0}}
        ::-webkit-scrollbar{display:none}`;
      document.head.appendChild(s);
    });
  });
  const p = await c.newPage();
  p.on('pageerror', e => console.log('  pageerror', e.message.slice(0, 120)));
  p.on('dialog', d => d.accept());
  await p.route(/googleapis|gstatic|unpkg|jsdelivr|cdnjs|tile\.|openstreetmap|vercel\.app|wa\.me/, r => r.abort());
  await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(1500);
  const sd = await p.$('#seed'); if (sd) { await sd.click(); await p.waitForTimeout(1500); }
  await F.addPhotos(p, BASE);
  let logged = false;
  for (const S of STAGES) {
    if (only.length && !only.includes(String(S.n))) { if (S.n === 1 && !logged) { logged = await F.login(p, BASE); } continue; }
    if (S.n > 1 && !logged) logged = await F.login(p, BASE);
    const dir = path.join(out, String(S.n).padStart(2, '0'));
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    console.log('stage', S.n, S.t);
    const E = engine(p, dir);
    await E.go('#/', 900);
    await S.film(E);
    if (S.n === 1) logged = await p.evaluate(() => window.W777_SYNC && window.W777_SYNC.isOn());
    await p.evaluate(() => document.querySelectorAll('.modal-back, .modal').forEach(m => m.remove())).catch(() => {});
    await p.keyboard.press('Escape').catch(() => {});
    fs.writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify({ n: S.n, frames: E.frames.map(x => ({ f: path.basename(x.f), d: +x.d.toFixed(3) })), caps: E.caps, total: E.t() }, null, 1));
    console.log('  ', E.frames.length, 'frames', E.t().toFixed(1) + 's');
  }
  await b.close();
})();
