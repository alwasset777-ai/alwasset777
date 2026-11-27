// v235: 📋 ملفات المهنة — كل فئة كتلقى «إضافة» ديالها (التشطيب بلا «إضافة عقار»…)، النماذج كتتحفظ فاللائحة المتزامنة works، الحسابات، قائمة «+»
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const OUT = process.env.SHOT || '/tmp/v235';
async function page(b, kind, errs) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(kind + ': ' + e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  const today = new Date().toISOString();
  await p.route(/\/rest\/v1\/rpc\/w777_is_admin/, r => r.fulfill({ json: false }));
  await p.route(/\/rest\/v1\/rpc\/w777_my_status/, r => r.fulfill({ json: { admin: false, staff: false, member: true, ok: true } }));
  await p.route(/\/rest\/v1\/w777_agencies\?uid=eq/, r => r.fulfill({ json: [{ code: 'X001', name: 'شركة الاختبار', phone: '0612345678', kind, active: true, terms_at: today, seat_no: 1, seat_zone: 'ma' }] }));
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  return p;
}
const addTiles = async p => { await p.goto(BASE + '#/'); await p.waitForSelector('[data-hm=add]', { timeout: 10000 }); await p.click('[data-hm=add]'); await p.waitForSelector('.add-drop .ad-it'); /* v259: خانة كتنزل تحت «إضافة» */
  const t = await p.$$eval('.add-drop .ad-it b', a => a.map(x => x.textContent.trim())); await p.click('[data-hm=add]'); await p.waitForTimeout(200); await shut(p); return t; };
const shut = p => p.evaluate(() => document.querySelectorAll('.modal-bg').forEach(m => m.parentNode.removeChild(m)));
async function fill(p, vals) { for (const [k, v] of Object.entries(vals)) { const el = await p.$(`#wkf [name="${k}"]`); if (!el) throw new Error('no field ' + k);
  const tag = await el.evaluate(e => e.tagName + (e.type ? ':' + e.type : ''));
  await el.evaluate(e => { const d = e.closest('details'); if (d) d.open = true; });
  if (tag.startsWith('SELECT')) await el.selectOption(String(v)); else await el.fill(String(v)); } }
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  // 1) الوكالة: نفس القائمة القديمة
  { const p = await page(b, 'agency', errs); const t = await addTiles(p); if (!t.some(x => /إضافة عقار/.test(x)) || t.some(x => /عرض ثمن/.test(x))) bad.push('agency tiles ' + t.join('|'));
    if (await p.evaluate(() => !document.querySelector('.sidenav [data-nav=works]').hidden)) bad.push('agency works link'); await p.close(); }
  // 2) التشطيب: بلا «إضافة عقار» + عرض ثمن بالحساب
  { const p = await page(b, 'finishing', errs); const t = await addTiles(p);
    if (t.some(x => /إضافة عقار/.test(x)) || !t.some(x => /ورش تشطيب/.test(x)) || !t.some(x => /عرض ثمن/.test(x)) || !t.some(x => /طلب أشغال/.test(x))) bad.push('finishing tiles ' + t.join('|'));
    await p.click('[data-hm=add]'); await p.waitForSelector('.add-drop .ad-it'); await p.screenshot({ path: OUT + '-finishing-add.png' }); await p.click('[data-hm=add]');
    const fab = await p.$$eval('#fab-menu a', a => a.map(x => x.textContent)); if (fab.some(x => /إضافة عقار/.test(x)) || !fab.some(x => /عرض ثمن/.test(x))) bad.push('fab ' + fab.join('|'));
    await p.goto(BASE + '#/work/f_quote/new'); await p.waitForSelector('#wkf');
    await fill(p, { client: 'السيد أحمد', phone: '0611111111', project: 'شقة — حمرية', qty: 50, unitPrice: 120, tva: 20 });
    const calc = await p.$eval('#wk-calc', e => e.textContent); if (!/7\D?200/.test(calc)) bad.push('quote calc ' + calc);
    await p.screenshot({ path: OUT + '-quote.png', fullPage: true });
    await p.click('#wk-save'); await p.waitForTimeout(600);
    const list = await p.evaluate(() => [location.hash, document.querySelectorAll('.wk-item').length, (document.querySelector('.wk-item') || {}).textContent || '']);
    if (!/works\?t=f_quote/.test(list[0]) || list[1] !== 1 || !/السيد أحمد|حمرية/.test(list[2])) bad.push('quote list ' + JSON.stringify(list));
    const stored = await p.evaluate(async () => (await window.W777_TEST_DB?.getMeta?.('works', [])) || null);
    // بلا اسم الزبون ← ما كيتحفظش
    await p.goto(BASE + '#/work/f_quote/new'); await p.waitForSelector('#wkf'); await p.click('#wk-save'); await p.waitForTimeout(300);
    if (!/work\/f_quote\/new/.test(await p.evaluate(() => location.hash))) bad.push('required not enforced');
    if (!(await p.evaluate(() => !document.querySelector('.sidenav [data-nav=works]').hidden))) bad.push('finishing works link hidden');
    await p.close(); }
  // 3) الموثق: ملف توثيق
  { const p = await page(b, 'notary', errs); const t = await addTiles(p);
    if (t.some(x => /إضافة عقار/.test(x)) || !t.some(x => /ملف توثيق/.test(x)) || !t.some(x => /استشارة/.test(x))) bad.push('notary tiles ' + t.join('|'));
    await p.goto(BASE + '#/work/n_deed/new'); await p.waitForSelector('#wkf'); await fill(p, { dtype: 'بيع', seller: 'البائع', buyer: 'المشتري', price: 900000 });
    await p.click('#wk-save'); await p.waitForTimeout(500); if ((await p.$$('.wk-item')).length !== 1) bad.push('deed saved');
    await p.screenshot({ path: OUT + '-notary-list.png' }); await p.close(); }
  // 4) الجمعية: عضو ← مساهمة (العضو كيتختار من اللائحة)
  { const p = await page(b, 'association', errs);
    await p.goto(BASE + '#/work/a_member/new'); await p.waitForSelector('#wkf'); await fill(p, { client: 'كريم', due: 100000, paid: 40000 });
    const c = await p.$eval('#wk-calc', e => e.textContent); if (!/60\D?000/.test(c)) bad.push('member left ' + c);
    await p.click('#wk-save'); await p.waitForTimeout(500);
    await p.goto(BASE + '#/work/a_pay/new'); await p.waitForSelector('#wkf');
    const opts = await p.$$eval('#wkf [name=client] option', a => a.map(o => o.value)); if (!opts.includes('كريم')) bad.push('pay member select ' + opts.join('|'));
    await p.close(); }
  // 5) المستثمر: المحفظة (المردودية) + «عقار للبيع» باقي
  { const p = await page(b, 'investor', errs); const t = await addTiles(p); if (!t.some(x => /عقار للبيع/.test(x)) || !t.some(x => /المحفظة|عقار فالمحفظة/.test(x))) bad.push('investor tiles ' + t.join('|'));
    await p.goto(BASE + '#/work/i_asset/new'); await p.waitForSelector('#wkf'); await fill(p, { title: 'شقة', buyPrice: 600000, rent: 3000, costs: 6000 });
    const c = await p.$eval('#wk-calc', e => e.textContent); if (!/6\.0%/.test(c) || !/5\.0%/.test(c)) bad.push('asset yield ' + c); await p.close(); }
  // 6) المقاولة و«آخر»
  { const p = await page(b, 'contractor', errs); const t = await addTiles(p); if (t.some(x => /إضافة عقار/.test(x)) || !t.some(x => /ورش بناء/.test(x))) bad.push('contractor tiles ' + t.join('|')); await p.close(); }
  { const p = await page(b, 'member', errs); const t = await addTiles(p); if (t.some(x => /إضافة عقار/.test(x)) || !t.some(x => /عقار ديالي/.test(x)) || !t.some(x => /تصفح/.test(x))) bad.push('member tiles ' + t.join('|')); await p.close(); }
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
