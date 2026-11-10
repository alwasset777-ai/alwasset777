// v179: دليل الهوية brand.html (الشعارات للتحميل، نسخ الألوان، بلا 777 حدا الشعار) + الرابط فالإعدادات
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.S || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const bad = [];
  const miss = []; p.on('response', r => { if (r.status() >= 400 && /\/bureau\//.test(r.url())) miss.push(r.status() + ' ' + r.url()); });
  await p.goto(BASE + 'brand.html'); await p.waitForTimeout(1200);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push('overflow ' + sw);
  // كل الصور تحملات
  const broken = await p.$$eval('img', a => a.filter(i => !i.complete || !i.naturalWidth).map(i => i.src)); if (broken.length) bad.push('img ' + broken.join(','));
  // روابط التحميل
  for (const h of await p.$$eval('a[download]', a => a.map(x => x.getAttribute('href')))) { const r = await p.request.get(BASE + h); if (!r.ok()) bad.push('dl ' + h); }
  if (await p.$$eval('a[download]', a => a.length) !== 5) bad.push('downloads count');
  // نسخ اللون
  if (await p.$$eval('#sw .card', a => a.length) !== 5) bad.push('swatches');
  await p.click('#sw .copy'); await p.waitForTimeout(200);
  const clip = await p.evaluate(() => navigator.clipboard.readText()); if (clip !== '#C8102E') bad.push('copy ' + clip);
  // قاعدة الشعار: 777 ما كيبانش فالعنوان ولا حدا الشعار (غير فالمثال الممنوع والأرقام والجدول)
  const t = await p.title(); if (/777/.test(t)) bad.push('title 777');
  if (/777/.test(await p.textContent('header.hero'))) bad.push('hero 777');
  if (SHOT) { await p.screenshot({ path: SHOT + '/brand-m.png', fullPage: true }); await p.setViewportSize({ width: 1200, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: SHOT + '/brand-d.png', fullPage: true }); }
  // الرابط من الإعدادات
  const q = await ctx.newPage(); q.on('pageerror', e => errs.push(e.message)); await q.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await q.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(q);
  await q.goto(BASE); await q.waitForTimeout(800); await F.login(q, BASE);
  await q.goto(BASE + '#/settings'); await q.waitForTimeout(1500);
  if (!(await q.$('.brand-card a[href="brand.html"]'))) bad.push('settings link');
  if (!(await q.$('#brand-share'))) bad.push('share btn');
  if (miss.length) bad.push('404 ' + miss.join(','));
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
