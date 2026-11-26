// v241: الإصلاح الأوتوماتيكي ديال النسخة — جهاز عالق فنسخة قديمة (الـ Service Worker ما بغاش يتبدل) كيتصلح بوحدو مرة وحدة،
// وجهاز فآخر نسخة ما كيتقاس والو. + الـ Service Worker كيجاوب على «ver».
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const fs = require('fs'); const path = require('path');
const BASE = 'http://localhost:8777/bureau/';
const SW = fs.readFileSync(path.join(__dirname, '../../docs/bureau/sw.js'), 'utf8');
const REAL = (SW.match(/w777-bureau-(v\d+)/) || [])[1];
// نسخة قديمة بحال اللي عالقة فالأجهزة: بلا جواب على «ver»
const OLD = SW.replace(/w777-bureau-v\d+/, 'w777-bureau-v200').replace(/self\.addEventListener\('message'[\s\S]*?\n\}\);\n/, '');
if (OLD.includes("d === 'ver'")) throw new Error('old sw still answers ver');
async function run(b, stuck) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const errs = [], navs = [];
  await ctx.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_hide = '1'; window.W777_HEAL_DELAY = 600; window.W777_HEAL_WAIT = 1500; });
  // عالق: الـ Service Worker ديما كيجيه الملف القديم (v200)، والصفحة كتشوف نسخة جديدة فالخادم (v999)
  if (stuck) await ctx.route(/\/bureau\/sw\.js/, r => {
    const isSw = (r.request().headers()['service-worker'] || '') === 'script';
    r.fulfill({ status: 200, contentType: 'application/javascript', body: isSw ? OLD : SW.replace(/w777-bureau-v\d+/, 'w777-bureau-v999') });
  });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  p.on('framenavigated', f => { if (f === p.mainFrame()) navs.push(f.url()); });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.goto(BASE + '#/'); await p.waitForTimeout(1200);
  await p.reload(); await p.waitForTimeout(stuck ? 9000 : 6000);
  const st = await p.evaluate(async () => ({ heal: localStorage.getItem('w777_heal'), ctrl: !!(navigator.serviceWorker && navigator.serviceWorker.controller) }));
  const ver = await p.evaluate(() => new Promise(res => { const c = navigator.serviceWorker.controller; if (!c) return res(''); const ch = new MessageChannel(); ch.port1.onmessage = e => res(e.data); c.postMessage('ver', [ch.port2]); setTimeout(() => res('timeout'), 2000); }));
  await ctx.close(); return { st, navs: navs.filter(u => /[?&]u=/.test(u)).length, errs, ver };
}
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [];
  const ok = await run(b, false);
  if (ok.st.heal || ok.navs) bad.push('up-to-date healed ' + JSON.stringify(ok));
  if (ok.ver !== REAL) bad.push('sw ver ' + ok.ver + ' != ' + REAL);
  const s = await run(b, true);
  if (String(s.st.heal).split(':')[0] !== 'v999' || s.navs < 1) bad.push('stuck not healed ' + JSON.stringify(s));
  if (s.navs > 1) bad.push('heal loop ' + s.navs);
  const errs = [...ok.errs, ...s.errs];
  console.log(JSON.stringify({ bad, errs, ok: { ver: ok.ver }, stuck: { heal: s.st.heal, navs: s.navs } })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
