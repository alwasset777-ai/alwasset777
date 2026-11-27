// v253: الشريط التحتاني فالتيليفون ثابت لتحت ومعمّر (ما كيغطيش «حفظ»)، الأيقونات 29px، الترتيب ديال «خدمات المجموعة» و«مجموعة الوسيط» بالورقة، عدد المشتركين، نبض «مشترك جديد»
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SVC = ['تعلم استعمال التطبيق', 'أكاديمية مجموعة الوسيط', 'الأخبار العقارية', 'المطابقة الذكية', 'تدبير الكراء', 'مقارنة الأسعار', 'حساب القرض', 'عرض المشاريع', 'الحجز الفوري', 'المناسبات العقارية', 'المداخيل والمصاريف', 'الخريطة العقارية', 'الهبة', 'نزاعات وحلول', 'قانون التطبيق'];
const NET = ['مشترك جديد', 'الوكالات العقارية', 'الوسطاء', 'الموثقون', 'شركات المقاولات', 'شركات التشطيب', 'المستثمرون', 'الجمعيات السكنية'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const bad = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_guide_hide = '1'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.goto(BASE + '#/'); await p.waitForSelector('.hrow .hr-head'); await p.waitForTimeout(1500);
  // الشريط: لاصق لتحت، العرض كامل، بلا شفافية، العلو = --nav-h، الأيقونات 29px
  const n = await p.evaluate(() => { const el = document.querySelector('.bottomnav'), r = el.getBoundingClientRect(), st = getComputedStyle(el);
    const ic = [...el.querySelectorAll('.bn3d')].map(s => Math.round(parseFloat(getComputedStyle(s).width)));
    return { gap: Math.round(innerHeight - r.bottom), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), navH: parseFloat(getComputedStyle(document.body).getPropertyValue('--nav-h')), bg: st.backgroundColor, ic }; });
  if (n.gap !== 0 || n.left !== 0 || n.w !== 390) bad.push('nav not stuck to bottom ' + JSON.stringify(n));
  if (!/^rgb\(/.test(n.bg)) bad.push('nav background not solid ' + n.bg);
  if (Math.abs(n.h - n.navH) > 1) bad.push('nav height != --nav-h ' + JSON.stringify(n));
  if (n.ic.length < 5 || n.ic.some(x => x !== 29)) bad.push('icons not 29px ' + JSON.stringify(n.ic));
  // الترتيب + العدد فسطر الرئيسية
  const row = await p.$$eval('.hrow[data-hr=net] .hub-tile b', a => a.map(x => x.textContent));
  if (row.map(t => t.replace(/ · \d+$/, '')).join('|') !== NET.join('|')) bad.push('net row order ' + JSON.stringify(row));
  if (!row.some(t => / · \d+$/.test(t))) bad.push('no counts ' + JSON.stringify(row));
  if (/ · /.test(row[0])) bad.push('count on new member tile');
  if (!(await p.$('.hrow[data-hr=net] .hub-newmem .nm-ring'))) bad.push('no pulse ring');
  const svcRow = await p.$$eval('.hrow[data-hr=svc] .hub-tile b', a => a.map(x => x.textContent));
  if (svcRow.join('|') !== SVC.join('|')) bad.push('svc row order ' + JSON.stringify(svcRow));
  // النافذة: نفس الترتيب
  await p.click('.hrow[data-hr=svc] .hr-head'); await p.waitForTimeout(900);
  const svc = await p.$$eval('.modal .hub-menu .hub-tile b', a => a.map(x => x.textContent));
  if (svc.join('|') !== SVC.join('|')) bad.push('svc modal order ' + JSON.stringify(svc));
  await p.goto(BASE + '#/'); await p.reload(); await p.waitForSelector('.hrow .hr-head'); await p.waitForTimeout(1200);
  await p.click('.hrow[data-hr=net] .hr-head'); await p.waitForTimeout(1500);
  const net = await p.$$eval('.modal .hub-menu .hub-tile b', a => a.map(x => x.textContent));
  if (net.map(t => t.replace(/ · \d+$/, '')).join('|') !== NET.join('|')) bad.push('net modal order ' + JSON.stringify(net));
  // الاستمارة: «حفظ» فوق الشريط، والزر «+» ومنير مخبيين
  await p.goto(BASE + '#/'); await p.reload(); await p.waitForSelector('.hrow .hr-head');
  await p.goto(BASE + '#/property/new'); await p.waitForSelector('.form-actions'); await p.waitForTimeout(800);
  const f = await p.evaluate(() => { const a = document.querySelector('.form-actions').getBoundingClientRect(), nb = document.querySelector('.bottomnav').getBoundingClientRect();
    const vis = s => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; };
    const sv = document.querySelector('.form-actions .btn.primary, .form-actions button[type=submit]'); const r = sv && sv.getBoundingClientRect();
    const top = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { covered: a.bottom > nb.top + 1, fab: vis('#fab'), agent: vis('#agent-fab'), saveFree: !!(top && sv.contains(top)) }; });
  if (f.covered || f.fab || f.agent || !f.saveFree) bad.push('form ' + JSON.stringify(f));
  // الرجوع للرئيسية ← «+» ومنير كيرجعو
  await p.goto(BASE + '#/'); await p.waitForTimeout(800);
  if (!(await p.evaluate(() => getComputedStyle(document.querySelector('#fab')).display !== 'none'))) bad.push('fab hidden on home');
  await p.close();
  // الحاسوب: الشريط ما كيبانش (القائمة الجانبية) — ما تبدّل والو
  const d = await b.newPage({ viewport: { width: 1200, height: 900 } }); d.on('pageerror', e => errs.push(e.message)); await F.install(d);
  await d.goto(BASE); await d.waitForTimeout(800); await F.login(d, BASE); await d.goto(BASE + '#/'); await d.waitForTimeout(1200);
  if (await d.evaluate(() => getComputedStyle(document.querySelector('.bottomnav')).display !== 'none')) bad.push('desktop shows bottomnav');
  console.log(JSON.stringify({ bad, errs })); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
