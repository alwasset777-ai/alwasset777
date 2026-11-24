// v217: الأرقام ما كتتقلبش («30 000» ماشي «000 30») حتى فالمتصفحات اللي ما كتفهمش العلامات الخفية (Safari فـ canvas)
// 1) كل الأرقام المنسقة فيها «فراغ ثابت» بين الآلاف  2) الملصق: النصوص المرسومة بلا «رقم فراغ رقم» + القياس بالبكسلات بلا العلامات الخفية
// 3) «777» ما كتبانش مع اسم المجموعة فالملصق (الشعار فيه 777)
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], bad = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  // كنسجلو كاع النصوص اللي كتترسم فالـ canvas
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1';
    window.__drawn = []; const f = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { window.__drawn.push(String(t)); return f.call(this, t, ...a); }; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  // 1) القياس: نرسمو «1 000 000 درهم» بلا العلامات الخفية (بحال Safari) ← الترتيب من اليسار: درهم، 1، 000، 000
  const order = await p.evaluate(async () => {
    await document.fonts.ready;
    const out = {};
    for (const [k, sep] of [['space', ' '], ['nbsp', ' ']]) {
      const c = document.createElement('canvas'); c.width = 900; c.height = 90; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 900, 90); x.fillStyle = '#000'; x.direction = 'rtl'; x.textAlign = 'right'; x.font = '900 52px Tajawal, sans-serif';
      x.fillText(['1', '000', '000'].join(sep) + ' درهم', 880, 66);
      const d = x.getImageData(0, 0, 900, 90).data, cl = []; let st = -1, gap = 0;
      for (let col = 0; col < 900; col++) { let s = 0; for (let r = 0; r < 90; r++) if (d[(r * 900 + col) * 4] < 128) { s = 1; break; }
        if (s) { if (st < 0) st = col; gap = 0; } else if (st >= 0 && ++gap >= 6) { cl.push(col - gap - st + 1); st = -1; gap = 0; } }
      const narrow = cl.indexOf(Math.min(...cl)); out[k] = narrow === 1 ? 'ok' : 'reversed ' + JSON.stringify(cl);
    }
    return out;
  });
  if (order.nbsp !== 'ok') bad.push('nbsp order ' + order.nbsp);
  // حتى الفراغ العادي (عنوان قديم ولا نص المستعمل) كيتصحح وقت الرسم (numFix على fillText)
  if (order.space !== 'ok') bad.push('plain space order ' + order.space);
  // 2) النصوص فالصفحات (esc ← numFix): عنوان قديم بفراغ عادي كيبان بفراغ ثابت
  const fm = await p.evaluate(() => { const d = document.createElement('div'); document.body.appendChild(d);
    d.innerHTML = '<p dir="rtl" id="t1">مخزن 2 087 م² بـ 30 000 درهم</p>'; const ok = /\d \d/.test(document.getElementById('t1').textContent); d.remove(); return { rawHasPlain: ok }; });
  // واتساب: الرابط كيتصحح ملي كتضغط عليه
  const wa = await p.evaluate(() => { const a = document.createElement('a'); a.href = 'https://wa.me/?text=' + encodeURIComponent('الثمن 30 000 درهم · 2 087 م²'); document.body.appendChild(a);
    a.addEventListener('click', e => e.preventDefault()); a.click(); const t = decodeURIComponent(a.href.split('text=')[1]); a.remove(); return t; });
  if (/\d \d/.test(wa) || !/30\u00a0000/.test(wa)) bad.push('whatsapp ' + JSON.stringify(wa));
  // 3) الملصق الحقيقي: عقار 30 000 درهم و 2 087 م²
  await p.evaluate(async () => { const now = new Date().toISOString();
    await window.W777_DB.saveRec('properties', { id: 'pst1', ref: 'W777-0326', createdAt: now, updatedAt: now, status: 'available', type: 'warehouse', transaction: 'sale', city: 'مكناس', priceMin: 30000, areaTotal: 2087, areaBuilt: 2087, negotiable: true, media: [], title: 'مستودع / مخزن للبيع 2 087 م² بمكناس' });
    await window.W777_DB.put('settings', { key: 'officeName', value: 'مكتب الوسيط 777 للخدمات العقارية' }).catch(() => {});
    if (window.W777_TEST) await window.W777_TEST.loadAll(); window.__drawn = []; });
  await p.goto(BASE + '#/property/pst1'); await p.waitForTimeout(1500);
  const pg = await p.evaluate(() => { const t = document.querySelector('main') ? document.querySelector('main').textContent : document.body.textContent; return { nb: /2\u00a0087/.test(t), plain: /2 087/.test(t) }; });
  if (!pg.nb || pg.plain) bad.push('property page title ' + JSON.stringify(pg));
  await p.evaluate(() => document.getElementById('p-poster').click());
  await p.waitForSelector('.poster-prev img[src^="blob:"], .poster-prev img[src^="data:"]', { timeout: 15000 }).catch(() => bad.push('poster not rendered'));
  const drawn = await p.evaluate(() => window.__drawn.slice());
  const digitsSpace = drawn.filter(t => /\d \d/.test(t));
  if (digitsSpace.length) bad.push('plain space between digits: ' + JSON.stringify(digitsSpace));
  if (!drawn.some(t => /30 000/.test(t))) bad.push('price not NBSP: ' + JSON.stringify(drawn.filter(t => /\d/.test(t)).slice(0, 8)));
  const office = drawn.find(t => /الوسيط/.test(t) && /مكتب|مجموعة/.test(t));
  if (office && /777/.test(office)) bad.push('777 next to logo: ' + office);
  await p.evaluate(() => { const i = document.querySelector('.poster-prev img'); if (i) i.scrollIntoView(); });
  await p.screenshot({ path: (process.env.SHOT || '/tmp/v217') + '-poster.png' });
  console.log(JSON.stringify({ bad, errs, order, office }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
