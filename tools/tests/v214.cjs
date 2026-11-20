// v214: «شحال يسوى؟» اختيار المدينة (الأسئلة كاملة على المدينة المختارة، مكناس بالأحياء، «كل المدن» كترجع التنوع)
// + أمثلة الأكاديمية ماشي غير مكناس + زر «الكتالوج بالفرنسية» فالدليل
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.evaluate(() => { localStorage.w777_games = '{}'; localStorage.removeItem('w777_price_city'); });
  const bad = [];
  const play = async () => { // كيلعب مرحلة 1 وكيرجع «فين» ديال كل سؤال + سطر المعلومات
    await p.click('.gm-s'); await p.waitForTimeout(300); const W = [];
    for (let i = 0; i < 8; i++) {
      await p.waitForSelector('.gm-o:not([disabled])');
      W.push(await p.$eval('.gm-card span:nth-child(2)', e => e.textContent.replace('📍', '').trim()));
      if (i === 0) W.meta = await p.$eval('.gm-meta span', e => e.textContent);
      await p.click('.gm-o'); await p.waitForSelector('.gm-why'); await p.click('.gm-w .gm-next'); await p.waitForTimeout(80);
    }
    await p.waitForSelector('.gm-res'); return W;
  };
  // 1) الاختيار كيبان، فيه كل المدن
  await p.goto(BASE + '#/game/price'); await p.waitForTimeout(700);
  const opts = await p.$$eval('#gm-city option', a => a.map(o => o.value));
  if (opts.length < 50 || opts[0] !== '') bad.push('options ' + opts.length);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push('overflow ' + sw);
  await p.screenshot({ path: process.env.SHOT || '/tmp/v214-city.png' });
  // 2) طنجة ← كل الأسئلة على طنجة
  await p.selectOption('#gm-city', 'طنجة'); await p.waitForTimeout(300);
  if (await p.evaluate(() => localStorage.w777_price_city) !== 'طنجة') bad.push('not saved');
  let W = await play(); if (W.some(w => w !== 'طنجة')) bad.push('tanger ' + W.join(',')); if (!W.meta.includes('طنجة')) bad.push('meta ' + W.meta);
  // 3) مكناس ← أحياء مكناس
  await p.goto(BASE + '#/game'); await p.goto(BASE + '#/game/price'); await p.waitForTimeout(600);
  if (await p.$eval('#gm-city', s => s.value) !== 'طنجة') bad.push('not restored');
  await p.selectOption('#gm-city', 'مكناس'); W = await play(); if (W.some(w => !w.includes('مكناس'))) bad.push('meknes ' + W.join(','));
  // 4) كل المدن ← تنوع
  await p.goto(BASE + '#/game'); await p.goto(BASE + '#/game/price'); await p.waitForTimeout(600);
  await p.selectOption('#gm-city', ''); W = await play(); if (new Set(W).size < 3) bad.push('all ' + W.join(','));
  // 5) الأكاديمية: أمثلة من مدن متنوعة
  await p.evaluate(() => window.W777_ACAD || new Promise(r => { const s = document.createElement('script'); s.src = 'academy-data.js'; s.onload = r; document.head.appendChild(s); }));
  const ac = await p.evaluate(() => { const t = JSON.stringify(window.W777_ACAD || {}); return { mk: (t.match(/مكناس|حمرية/g) || []).length, cities: ['طنجة', 'الرباط', 'مراكش', 'أكادير', 'وجدة', 'فاس', 'الدار البيضاء'].filter(c => t.includes(c)).length }; });
  if (ac.mk > 3 || ac.cities < 6) bad.push('academy ' + JSON.stringify(ac));
  // 6) الكتالوج بالفرنسية فالدليل
  await p.goto(BASE + '#/guide'); await p.waitForTimeout(1200);
  const fr = await p.$$eval('a[href*="catalogue-services-groupe-alwasset-fr.pdf"]', a => a.length); if (!fr) bad.push('fr catalog link');
  const sh = await p.$$eval('[data-share-pdf]', a => a.map(x => x.dataset.sharePdf)); if (!sh.includes('catalog_fr')) bad.push('share ' + sh);
  console.log(JSON.stringify({ bad, errs, academy: ac }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
