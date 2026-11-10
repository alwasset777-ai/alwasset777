// زر «⋯» الواحد: إعلان فوري + تعديل كيحلو الصفحة الصحيحة، والضغطة الطويلة كتحدد البطاقة
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const bad = [];
  await p.route(/googleapis|gstatic|supabase/, r => r.abort());
  await p.goto('http://localhost:8777/bureau/'); await p.waitForTimeout(1200); await p.click('#seed'); await p.waitForTimeout(1200);
  const go = async h => { await p.evaluate(x => location.hash = x, h); await p.waitForTimeout(900); };
  await go('#/properties?status=');
  await p.click('#plist .prop-card >> nth=0 >> .pc-more'); await p.click('#plist .prop-card >> nth=0 >> .pc-mi[data-go*="ad-maker"]'); await p.waitForTimeout(700);
  if (!/^#\/ad-maker\?p=/.test(await p.evaluate(() => location.hash))) bad.push('ad link');
  await go('#/properties?status=');
  await p.click('#plist .prop-card >> nth=0 >> .pc-more'); await p.click('#plist .prop-card >> nth=0 >> .pc-mi[data-go$="/edit"]'); await p.waitForTimeout(700);
  if (!/^#\/property\/.+\/edit$/.test(await p.evaluate(() => location.hash))) bad.push('edit link');
  // الضغطة الطويلة (ماوس مضغوط 800ms) ← محدد، والبقاء فنفس الصفحة
  await go('#/properties?status=');
  await p.$eval('#plist .prop-card >> nth=1', e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
  const box = await p.$eval('#plist .prop-card >> nth=1', e => { const r = e.querySelector('.prop-body, h3, .price') || e; const q = r.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; }).catch(async () => { const r = await (await p.$$('#plist .prop-card'))[1].boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height - 40 }; });
  await p.mouse.move(box.x, box.y); await p.mouse.down(); await p.waitForTimeout(800); await p.mouse.up(); await p.waitForTimeout(300);
  const sel = await p.$$eval('#plist .prop-card.psel-on', x => x.length), bar = !!(await p.$('#psel-bar'));
  if (sel !== 1 || !bar || !/^#\/properties/.test(await p.evaluate(() => location.hash))) bad.push('longpress ' + sel + ' ' + bar);
  // الطلبات: «⋯» ← تعديل
  await go('#/requests?');
  await p.click('#rlist [data-sid] >> nth=0 >> .pc-more'); await p.click('#rlist [data-sid] >> nth=0 >> .pc-mi[data-go$="/edit"]'); await p.waitForTimeout(700);
  if (!/^#\/request\/.+\/edit$/.test(await p.evaluate(() => location.hash))) bad.push('req edit');
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
