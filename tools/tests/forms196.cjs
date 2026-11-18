// ➕ v196: الاستمارات المبسطة — الخانات الأساسية ظاهرة والباقي وراء «المزيد» (وكيتحفظ عادي)
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.SHOT || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await c.newPage();
  const bad = [], errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/googleapis|gstatic/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await F.login(p, BASE);
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.checkVisibility() && e.getBoundingClientRect().height > 0; }, sel);
  const go = async h => { await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(1300); };
  // 1) عقار
  await go('#/property/new');
  const P = { seg: await p.$$eval('#pform .seg label', ls => ls.filter(l => l.checkVisibility()).map(l => l.textContent.trim())),
    type: await vis('#pform [name=type]'), price: await vis('#pform [name=priceMax]'), area: await vis('#pform [name=areaTotal]'), pmin: await vis('#pform [name=priceMin]'),
    title: await vis('#pform [name=titleStatus]'), tnum: await vis('#pform [name=titleNumber]'), on: await vis('#pform [name="owner.name"]'), op: await vis('#pform [name="owner.phone"]'), cin: await vis('#pform [name="owner.cin"]'),
    spec: await vis('#spec-fields'), circles: await p.$$eval('#pform .dz-c .dz-o', x => x.length), broker: await vis('#has-broker'), desc: await vis('#pform [name=description]') };
  if (P.seg.join() !== 'بيع,كراء' || !P.type || !P.price || !P.area || P.pmin || !P.title || P.tnum || !P.on || !P.op || P.cin || P.spec || P.circles !== 3 || !P.broker || !P.desc) bad.push('prop ' + JSON.stringify(P));
  if (SHOT) await p.screenshot({ path: SHOT + '/prop.png', fullPage: true });
  await p.click('#pform .seg-more'); if ((await p.$$eval('#pform .seg label', ls => ls.filter(l => l.checkVisibility()).length)) < 5) bad.push('seg more');
  await p.click('#pform [data-more=p4] > summary'); await p.waitForTimeout(200); if (!(await vis('#spec-fields'))) bad.push('spec open');
  // الحفظ مع خانة مخبية
  await p.fill('#pform [name="owner.name"]', 'مالك تجريبي'); await p.fill('#pform [name="owner.phone"]', '0611223344');
  await p.fill('#pform [name=priceMax]', '900000'); await p.fill('#pform [name=areaTotal]', '95');
  await p.evaluate(() => { document.querySelector('#pform [name="owner.cin"]').value = 'X12345'; });
  await p.click('#pform button[type=submit]'); await p.waitForTimeout(1500);
  const sv = await p.evaluate(() => { const x = (window.W777_DEBUG && window.W777_DEBUG.S) ? null : null; return location.hash; });
  if (!/#\/property\/(?!new)/.test(sv)) bad.push('prop save ' + sv);
  else { await p.waitForTimeout(300); const t = await p.evaluate(() => document.body.innerText); if (!/مالك تجريبي/.test(t)) bad.push('prop saved view'); }
  // 2) طلب
  await go('#/request/new');
  const R = { seg: await p.$$eval('#rform .seg label', ls => ls.filter(l => l.checkVisibility()).map(l => l.textContent.trim())), types: await vis('#rform .type-picker'),
    n: await vis('#rform [name="client.name"]'), ph: await vis('#rform [name="client.phone"]'), em: await vis('#rform [name="client.email"]'), dist: await vis('#req-districts'), distBtn: await vis('#rform [data-more=r3] > summary'),
    bud: await vis('#rform [name=budgetMax]'), area: await vis('#rform [name=areaMin]'), beds: await vis('#rform [name=bedroomsMin]'), circles: await p.$$eval('#rform .dz-c', x => x.length),
    st: await vis('#rform [name=status]'), pr: await vis('#rform [name=priority]') };
  if (R.seg.join() !== 'بيع,كراء' || R.types || !R.n || !R.ph || R.em || R.dist || !R.distBtn || !R.bud || !R.area || R.beds || R.circles !== 2 || !R.st || R.pr) bad.push('req ' + JSON.stringify(R));
  if (SHOT) await p.screenshot({ path: SHOT + '/req.png', fullPage: true });
  // 3) موعد
  await go('#/appointment/new');
  const A = { n: await vis('#af [name=name]'), ph: await vis('#af [name=phone]'), d: await vis('#af [name=date]'), t: await vis('#af [name=time]'), pl: await vis('#af [name=place]'), ty: await vis('#af [name=type]'), no: await vis('#af [name=notes]') };
  if (!A.n || !A.ph || !A.d || !A.t || !A.pl || A.ty || A.no) bad.push('appt ' + JSON.stringify(A));
  if (SHOT) await p.screenshot({ path: SHOT + '/appt.png', fullPage: true });
  // 4) البحث
  await go('#/search');
  if (await p.$eval('#sf-card', e => e.classList.contains('hidden'))) { await p.click('#sf-toggle'); await p.waitForTimeout(300); }
  const Sx = { q: await vis('#sf [name=q]'), trx: await vis('#sf [name=trx]'), city: await vis('#sf [name=city]'), pmax: await vis('#sf [name=pmax]'), cat: await vis('#sf [name=cat]'), beds: await vis('#sf [name=beds]'), sort: await vis('#sf [name=sort]') };
  if (!Sx.q || !Sx.trx || !Sx.city || !Sx.pmax || Sx.cat || Sx.beds || !Sx.sort) bad.push('search ' + JSON.stringify(Sx));
  // «المزيد» كيبقى محلول من بعد تبديل الفئة (الصفحة كتعاود ترسم)
  await p.click('#sf [data-more=sf] > summary'); await p.waitForTimeout(200); if (!(await p.evaluate(() => document.querySelector('#sf [data-more=sf]').open))) bad.push('sf not opened'); await p.selectOption('#sf [name=cat]', { index: 1 }); await p.waitForTimeout(600);
  if (!(await vis('#sf [name=cat]'))) bad.push('search more persist ' + JSON.stringify(await p.evaluate(() => ({ open: (document.querySelector('#sf [data-more=sf]') || {}).open, hid: document.querySelector('#sf-card').className }))));
  if (SHOT) await p.screenshot({ path: SHOT + '/search.png', fullPage: true });
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
