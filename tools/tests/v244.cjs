// v244: 🆕 «✓ تحدّث التطبيق — الجديد» (غير من بعد تحديث، مرة وحدة)، 📲 النسخة وآخر تحديث فالإعدادات، ⏳ المتأخرين كثر من 3 أيام للمدير
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const fs = require('fs'); const path = require('path');
const BASE = 'http://localhost:8777/bureau/';
const CUR = fs.readFileSync(path.join(__dirname, '../../docs/bureau/sw.js'), 'utf8').match(/w777-bureau-(v\d+)/)[1];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_hide = '1'; window.W777_HEAL_DELAY = 999999; });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.route(/rpc\/w777_errors_recent/, r => r.fulfill({ json: [] }));
  await p.route(/rpc\/w777_app_versions/, r => r.fulfill({ json: [{ ver: CUR, n: 2, last_at: new Date().toISOString() }, { ver: 'v230', n: 1, last_at: new Date(Date.now() - 6 * 864e5).toISOString() }] }));
  await p.route(/rpc\/w777_app_stale/, r => r.fulfill({ json: [{ name: 'وكالة تجربة', code: 'A099', kind: 'agency', phone: '0612345678', app_ver: 'v230', app_seen: new Date(Date.now() - 6 * 864e5).toISOString() }] }));
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  // 1) أول مرة فهاد الجهاز: بلا خانة «الجديد»
  await p.goto(BASE + '#/'); await p.waitForTimeout(3500);
  if (await p.$('.wn-card')) bad.push('whats-new on first install');
  // 2) من بعد تحديث (نسخة قبل) ← الخانة كتبان مرة وحدة
  await p.evaluate(() => { localStorage.w777_build = JSON.stringify({ v: 'v240', at: new Date(Date.now() - 864e5).toISOString() }); });
  await p.reload(); await p.waitForTimeout(3500);
  const wn = await p.$eval('.wn-card', e => e.textContent).catch(() => '');
  if (!new RegExp(CUR).test(wn) || !/<li>|🆕|📲|🔄|🎓|📝/.test(wn)) bad.push('whats-new ' + wn.slice(0, 80));
  await p.screenshot({ path: (process.env.SHOT || '/tmp/v244') + '-new.png' });
  await p.click('[data-wn-x]').catch(() => {}); await p.reload(); await p.waitForTimeout(3500);
  if (await p.$('.wn-card')) bad.push('whats-new shown twice');
  // 3) الإعدادات: النسخة + آخر تحديث (من v240)
  await p.goto(BASE + '#/settings?s=app'); await p.waitForSelector('#upd-at', { timeout: 8000 }).catch(() => bad.push('no upd-at'));
  await p.waitForTimeout(800);
  const line = await p.$eval('.upd-line', e => e.textContent).catch(() => '');
  if (!/v240/.test(line) || /…/.test(line)) bad.push('settings line ' + line);
  // 4) المدير: المتأخرين كثر من 3 أيام + ذكّرو واتساب
  await p.goto(BASE + '#/agencies/manage'); await p.waitForSelector('.ah-stale', { timeout: 12000 }).catch(() => bad.push('no stale box'));
  const st = await p.evaluate(() => { const d = document.querySelector('.ah-stale'); if (!d) return null; d.open = true; const a = d.querySelector('a.wa'); return { t: d.textContent, href: a ? a.getAttribute('href') : '' }; });
  if (!st || !/وكالة تجربة/.test(st.t) || !/v230/.test(st.t) || !/wa\.me\/212612345678/.test(st.href) || !/%D8%AD%D9%84%D9%91/.test(st.href)) bad.push('stale ' + JSON.stringify(st || {}).slice(0, 200));
  await (await p.$('#app-health')).screenshot({ path: (process.env.SHOT || '/tmp/v244') + '-stale.png' }).catch(() => {});
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
