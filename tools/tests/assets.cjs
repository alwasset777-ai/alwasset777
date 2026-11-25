// 🖼️ كل الصور والملفات كاينين: كندوزو على كل الصفحات (وحتى الأقسام الداخلية) وكنقلبو على أي ملف ناقص (404) ولا صورة مكسورة
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const ROUTES = ['#/', '#/search', '#/properties', '#/requests', '#/matching', '#/appointments', '#/settings?s=office', '#/settings?s=data', '#/settings?s=security', '#/settings?s=app',
  '#/agencies', '#/agencies/dir', '#/agencies/manage', '#/brokers', '#/contractors', '#/finishing', '#/investors', '#/notaries', '#/associations', '#/stays', '#/projects', '#/events', '#/news', '#/news/world', '#/donations', '#/disputes',
  '#/ownership', '#/contracts', '#/inbox', '#/map', '#/rentals', '#/finance', '#/loan', '#/tamwil', '#/estimate', '#/guide', '#/learn', '#/learn/certs', '#/learn/team', '#/terms', '#/terms/groups',
  '#/game', '#/game/wasla', '#/game/price', '#/game/scam', '#/game/calc', '#/game/tf', '#/game/million', '#/game/build',
  '#/ad-maker', '#/ad-maker?m=post', '#/ad-maker?m=reels', '#/ad-maker?m=project', '#/property/new', '#/request/new', '#/appointment/new', '#/report'];
const PUB = ['decouvrir.html', 'decouvrir.html?lang=fr', 'brand.html', 'brand-print.html', 'game.html', 'games.html', 'verify.html', 'join.html', 'partner.html', 'catalog.html', 'stays.html', 'install.html', 'install.html?lang=fr'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage();
  const miss = new Set(), errs = [];
  const watch = pg => {
    pg.on('pageerror', e => errs.push(e.message + ' @' + (pg.url().replace(BASE, '')) + ' ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')));
    pg.on('response', r => { const u = r.url(); if (u.startsWith('http://localhost:8777/') && r.status() >= 400) miss.add(r.status() + ' ' + u.replace('http://localhost:8777/', '')); });
  };
  watch(p);
  await p.addInitScript(() => { try { localStorage.w777_agent_voice = '0'; } catch (e) { /* إطار معزول (الاستوديو) */ } });
  await p.route(/googleapis|gstatic|tile\.openstreetmap|unpkg|jsdelivr|vercel\.app/, r => r.abort()); await F.install(p);
  await p.goto(BASE); const sd = await p.$('#seed'); if (sd) { await sd.click(); await p.waitForTimeout(800); }
  await F.login(p, BASE);
  const broken = new Set();
  const scan = async tag => {
    // كنهبطو حتى للتحت باش الصور «lazy» يتحملو
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(z => setTimeout(z, 60)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(500);
    const bad = await p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src') && i.src.startsWith(location.origin) && !i.closest('[hidden], .hidden')).map(i => i.getAttribute('src')));
    bad.forEach(s => broken.add(tag + ' → ' + s));
    // عنصر عندو hidden وكيبان (قاعدة display كتغلبو) ← شريط خاوي ولا زر ما خاصوش يبان
    const shown = await p.evaluate(() => [...document.querySelectorAll('#main [hidden], main [hidden], .modal [hidden]')].filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 2 && !e.closest('[hidden] [hidden]')).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className ? '.' + String(e.className).split(' ')[0] : '')));
    shown.forEach(s => broken.add(tag + ' ⇒ hidden-visible ' + s));
  };
  for (const r of ROUTES) { await p.evaluate(h => { location.hash = h; }, r); await p.waitForTimeout(1300); await scan(r); }
  // صفحة عقار + لوحة «المزيد»
  const pid = await p.evaluate(async () => (await window.W777_DB.all('properties'))[0].id);
  await p.evaluate(h => { location.hash = h; }, '#/property/' + pid); await p.waitForTimeout(1300); await scan('#/property');
  await p.evaluate(h => { location.hash = h; }, '#/'); await p.waitForTimeout(900);
  await p.click('#bn-more'); await p.waitForTimeout(800); await scan('more-sheet');
  for (const f of PUB) { const q = await c.newPage(); watch(q); await q.goto(BASE + f).catch(() => {}); await q.waitForTimeout(1200);
    const bad = await q.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src') && i.src.startsWith(location.origin)).map(i => i.getAttribute('src'))).catch(() => []);
    bad.forEach(s => broken.add(f + ' → ' + s)); await q.close(); }
  const m = [...miss].filter(u => !/supabase|\/rest\/v1|\/auth\/v1|\/storage\/v1|\/functions\/v1/.test(u));
  const ok = !m.length && !broken.size && !errs.length;
  console.log(ok ? 'OK' : 'BAD', 'routes', ROUTES.length + 2, 'public', PUB.length, '| missing', JSON.stringify(m.slice(0, 15)), '| broken', JSON.stringify([...broken].slice(0, 15)), '|', errs.slice(0, 4).join(' | '));
  await b.close(); process.exit(ok ? 0 : 1);
})();
