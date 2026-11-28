// v263: 📋 مراجعة ملف العقار (حسب النوع، الحفظ، الأوتوماتيكي)، 🚩 علامات الخطر، ✍️ توقيع الزائر بالصبع ← ورقة الزيارة
// (وضع العرض: معلومات خيالية فقاعدة منفصلة)
const { chromium } = require('playwright'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.SHOT;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; localStorage.w777_demo = '1'; localStorage.w777_cel_demo = '{"p":0,"r":0,"d":0,"a":0}'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg|supabase\.co/, r => r.abort());
  const SEL = 'a[href^="#/property/"]:not([href="#/property/new"])';
  await p.goto(BASE + '#/'); await p.waitForTimeout(5000); await p.goto(BASE + '#/properties'); await p.waitForSelector(SEL, { timeout: 20000 }); await p.waitForTimeout(800);
  const href = await p.$eval(SEL, a => a.getAttribute('href'));
  await p.goto(BASE + href); await p.waitForSelector('#pck', { timeout: 10000 }).catch(() => bad.push('no checklist card'));
  const c1 = await p.evaluate(() => { const c = document.querySelector('#pck'); return c && { n: c.querySelectorAll('[data-ck]').length, badge: c.querySelector('.badge').textContent, flags: c.querySelectorAll('.pck-flags li').length, mandate: /تفويض مكتوب/.test(c.textContent) }; });
  if (!c1 || c1.n < 7 || !c1.mandate) bad.push('checklist ' + JSON.stringify(c1));
  if (!c1 || c1.flags < 1) bad.push('no red flags (no mandate) ' + JSON.stringify(c1));
  // ✓ خانة ← محفوظة من بعد إعادة الفتح
  await p.click('#pck [data-ck="ids"]'); await p.waitForTimeout(700);
  await p.reload(); await p.waitForSelector('#pck'); await p.waitForTimeout(800);
  const c2 = await p.evaluate(() => ({ ids: document.querySelector('#pck [data-ck="ids"]').checked, badge: document.querySelector('#pck .badge').textContent }));
  if (!c2.ids || c2.badge === c1.badge) bad.push('check not saved ' + JSON.stringify([c1.badge, c2]));
  // التفويض ← العلامة «بلا تفويض» كتمشي والخانة كتولي أوتوماتيكية
  await p.click('#md-edit'); await p.waitForTimeout(500); await p.click('#mdf-ok'); await p.waitForTimeout(900);
  const c3 = await p.evaluate(() => ({ auto: document.querySelector('#pck [data-ck="mandate"]').disabled && document.querySelector('#pck [data-ck="mandate"]').checked, noMandFlag: ![...document.querySelectorAll('#pck .pck-flags li')].some(l => /تفويض مكتوب/.test(l.textContent)) }));
  if (!c3.auto || !c3.noMandFlag) bad.push('mandate auto ' + JSON.stringify(c3));
  if (SHOT) { await p.evaluate(() => document.querySelector('#pck').scrollIntoView()); await p.screenshot({ path: SHOT + '/checklist.png' }); }
  // ✍️ زيارة جديدة بالتوقيع
  await p.click('#v-add'); await p.waitForSelector('.modal .sig-pad'); await p.fill('.modal [name=name]', 'زائر تجريبي');
  await p.$eval('.modal .sig-pad', e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400);
  const box = await (await p.$('.modal .sig-pad')).boundingBox();
  await p.mouse.move(box.x + 30, box.y + 80); await p.mouse.down();
  for (let i = 1; i <= 12; i++) await p.mouse.move(box.x + 30 + i * 18, box.y + 80 - Math.sin(i / 2) * 40);
  await p.mouse.up();
  if (SHOT) await p.screenshot({ path: SHOT + '/sign.png' });
  await p.click('#vf-ok'); await p.waitForTimeout(1000);
  const vis = await p.evaluate(() => ({ signed: document.querySelectorAll('.badge.green[title="موقّعة"]').length, toSign: document.querySelectorAll('[data-vsig]').length }));
  if (vis.signed < 1) bad.push('visit not signed ' + JSON.stringify(vis));
  // الطباعة: الصورة ديال التوقيع فالورقة
  await p.evaluate(() => { window.print = () => {}; });
  await p.click('[data-vbon]'); await p.waitForTimeout(1500);
  const pr = await p.evaluate(() => { const f = [...document.querySelectorAll('iframe')].pop(); try { const d = f.contentDocument; const i = d.querySelector('.sig img'); return { img: !!i, w: i ? i.naturalWidth : 0 }; } catch (e) { return { err: e.message }; } });
  if (!pr.img) bad.push('signature not printed ' + JSON.stringify(pr));
  // 🎓 «تحدي الأكاديمية» فلعبة «صح ولا غلط»: 10 أسئلة من الوحدات ← النتيجة، والنجوم ديال اللعبة ما تمسّاوش
  for (const url of [BASE + '#/game/law', BASE + 'games.html#/game/law']) {
    await p.goto(url); await p.waitForSelector('[data-acad]', { timeout: 10000 }).catch(() => bad.push('no academy challenge ' + url));
    const before = await p.evaluate(() => localStorage.w777_games || '');
    await p.click('[data-acad]'); await p.waitForSelector('.gm-o', { timeout: 8000 }).catch(() => bad.push('challenge did not start ' + url));
    const q1 = await p.$eval('.gm-body', e => e.innerText.slice(0, 200)).catch(() => '');
    if (!/M[1-7] · /.test(q1)) bad.push('question ' + q1.slice(0, 80));
    for (let i = 0; i < 10; i++) { const o = await p.$('.gm-o:not([disabled])'); if (!o) break; await o.click(); await p.waitForTimeout(150); const nx = await p.$('.gm-next'); if (nx) await nx.click(); await p.waitForTimeout(150); }
    const res = await p.$('.gm-res'); if (!res) bad.push('no result ' + url);
    const after = await p.evaluate(() => { try { const g = JSON.parse(localStorage.w777_games || '{}'); return JSON.stringify(g.law || null); } catch (e) { return 'x'; } });
    const lawBefore = (() => { try { return JSON.stringify(JSON.parse(before || '{}').law || null); } catch (e) { return 'x'; } })();
    if (after !== lawBefore) bad.push('law stars changed');
  }
  console.log(JSON.stringify({ bad, errs, c1, c3 })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
