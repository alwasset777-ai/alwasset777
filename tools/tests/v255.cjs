// v255: بلا ضباب فوق (الرأس معمّر)، الستوري الجديد كيضوي (ما تشافش)، كلمة «الرسائل» تحت الدائرة الصفراء، زر المزامنة كيدور غير ملي كيرفع
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.goto(BASE + '#/'); await p.waitForSelector('#hd-rail .pr-item.has-st', { timeout: 10000 }).catch(() => bad.push('no stories')); await p.waitForTimeout(1200);
  // 1) الضوء: الستوري اللي ما تشافش عندو box-shadow ذهبي (فالخفيف ثابت)، اللي تشاف بلا ضوء
  const glow = await p.$$eval('#hd-rail .pr-item.has-st', a => a.map(e => [e.classList.contains('st-seen'), getComputedStyle(e).boxShadow]));
  const unseen = glow.filter(g => !g[0]);
  if (!unseen.length || unseen.some(g => !/243, 179, 61/.test(g[1]))) bad.push('no glow on unseen ' + JSON.stringify(glow));
  // الضوء ما يتقطعش: الشريط فيه فراغ فوق وتحت
  const pad = await p.$eval('#hd-rail .pr-view', e => parseFloat(getComputedStyle(e).paddingTop));
  if (pad < 6) bad.push('glow clipped (padding ' + pad + ')');
  // ملي يتشاف ← الضوء كيمشي
  await p.click('#hd-rail .pr-item.has-st:not(.st-seen)'); await p.waitForTimeout(900);
  await p.keyboard.press('Escape'); await p.waitForTimeout(1500);
  const after = await p.$$eval('#hd-rail .pr-item.has-st.st-seen', a => a.map(e => getComputedStyle(e).boxShadow));
  if (!after.length || after.some(s => /243, 179, 61/.test(s))) bad.push('seen still glowing ' + JSON.stringify(after));
  // 2) «الرسائل» تحت الدائرة
  const lb = await p.evaluate(() => { const c = document.querySelector('.grp-chat'), l = c && c.querySelector('.chat-lbl'); if (!l) return null; const a = c.getBoundingClientRect(), r = l.getBoundingClientRect(); return { txt: l.textContent, below: r.top >= a.bottom - 1, center: Math.abs((r.left + r.right) / 2 - (a.left + a.right) / 2) < 3 }; });
  if (!lb || lb.txt !== 'الرسائل' || !lb.below || !lb.center) bad.push('chat label ' + JSON.stringify(lb));
  // 3) المزامنة: كتدور غير فـsyncing
  const spin = await p.evaluate(() => { const bt = document.querySelector('#btn-sync'), sv = bt.querySelector('svg'), o = {};
    for (const st of ['syncing', 'ok', 'idle']) { bt.dataset.state = st; o[st] = getComputedStyle(sv).animationName; } bt.dataset.state = 'ok'; return o; });
  if (spin.syncing !== 'sync-spin' || spin.ok !== 'none' || spin.idle !== 'none') bad.push('sync spin ' + JSON.stringify(spin));
  // 4) بلا ضباب: الرأس معمّر حتى من بعد التمرير، بلا ظل وبلا blur
  await p.evaluate(() => scrollTo(0, 420)); await p.waitForTimeout(600);
  const tb = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('.topbar')); return { bg: s.backgroundImage, sh: s.boxShadow, bf: s.backdropFilter, sc: document.querySelector('.topbar').classList.contains('lv-scrolled') }; });
  if (!tb.sc || /rgba\(/.test(tb.bg) || tb.sh !== 'none' || (tb.bf && tb.bf !== 'none')) bad.push('topbar fog ' + JSON.stringify(tb));
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
