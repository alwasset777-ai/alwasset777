// v258: الضغط على علم ← نافذة مشتركي الدولة؛ الضغط على مدينة (تحت الشريط) ← عقاراتها؛ خانة «الدولة» ← «واش قصدك ألمانيا؟»
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.goto(BASE + '#/'); await p.waitForSelector('#home-flags button.fl-item', { timeout: 10000 }).catch(() => bad.push('flags not buttons')); await p.waitForTimeout(800);
  // 1) علم فرنسا ← نافذة فيها مشتركين فرنسا (العدد = العدد اللي فالعلم)
  const fr = await p.evaluate(() => { const b = [...document.querySelectorAll('#home-flags .fl-item')].find(x => x.dataset.iso === 'FR'); return b ? +b.querySelector('small').textContent : null; });
  if (!fr) bad.push('no France flag');
  await p.evaluate(() => [...document.querySelectorAll('#home-flags .fl-item')].find(x => x.dataset.iso === 'FR').click()); await p.waitForTimeout(900);
  const md = await p.evaluate(() => { const m = document.querySelector('.modal'); return m ? { h: m.querySelector('h3').textContent, rows: m.querySelectorAll('.cty-list .list-row').length, href: (m.querySelector('.cty-list .list-row') || {}).getAttribute?.('href') } : null; });
  if (!md || !/فرنسا/.test(md.h) || !/🇫🇷/.test(md.h) || md.rows < 1 || md.rows > fr) bad.push('country modal ' + JSON.stringify({ md, fr }));
  // الضغط على مشترك ← الدليل بالبحث معمّر
  if (md && md.href) { await p.click('.cty-list .list-row'); await p.waitForTimeout(1500);
    const q = await p.evaluate(() => { const i = document.querySelector('#df [name=q]'); return i ? i.value : null; });
    if (!q || !/\/dir/.test(await p.evaluate(() => location.hash))) bad.push('dir search ' + q); }
  // 2) مدينة من الشريط اللي تحت ← عقارات الشبكة ديال المدينة
  await p.goto(BASE + '#/'); await p.waitForSelector('.bottomnav > .city-ticker [data-city]'); await p.waitForTimeout(600);
  const city = await p.evaluate(() => { const s = [...document.querySelectorAll('.bottomnav > .city-ticker [data-city]')].find(x => x.dataset.city === 'مكناس'); s.click(); return s.dataset.city; });
  await p.waitForTimeout(1800);
  const h = decodeURIComponent(await p.evaluate(() => location.hash));
  if (!h.startsWith('#/agencies?city=' + city)) bad.push('city tap hash ' + h);
  const nf = await p.evaluate(() => { const f = document.querySelector('#nf'); return f ? [f.querySelector('[name=city]').value, f.querySelector('[name=q]').value] : null; });
  if (!nf || (nf[0] !== city && nf[1] !== city)) bad.push('net filter ' + JSON.stringify(nf));
  // الضغطة على الشريط تحت ما كتحلّش الصفحة غير ملي كتكون على مدينة (الروابط ديال الشريط باقين خدامين)
  await p.goto(BASE + '#/'); await p.waitForTimeout(800); await p.click('.bottomnav a[href="#/requests"]'); await p.waitForTimeout(800);
  if (!/requests/.test(await p.evaluate(() => location.hash))) bad.push('nav link broken');
  // 3) خانة «الدولة»: Deuschland ← «واش قصدك ألمانيا؟» ← نعم
  const hint = await p.evaluate(async () => { const d = document.createElement('div'); d.className = 'field'; d.innerHTML = '<input name="country">'; document.querySelector('main').prepend(d);
    const i = d.querySelector('input'); i.value = 'Deuschland'; i.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 50));
    const h = d.querySelector('.cty-hint'); const txt = h ? h.textContent : ''; if (h) h.querySelector('[data-cty-yes]').click();
    const after = i.value, gone = !d.querySelector('.cty-hint');
    i.value = 'Zorglub'; i.dispatchEvent(new Event('change', { bubbles: true })); const unk = (d.querySelector('.cty-hint') || {}).textContent || '';
    i.value = 'فرنسا'; i.dispatchEvent(new Event('change', { bubbles: true })); const ok = !d.querySelector('.cty-hint'); d.remove();
    return { txt, after, gone, unk, ok }; });
  if (!/ألمانيا/.test(hint.txt) || hint.after !== 'ألمانيا' || !hint.gone || !/ما عرفناش/.test(hint.unk) || !hint.ok) bad.push('country hint ' + JSON.stringify(hint));
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
