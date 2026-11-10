// v183: الإدارة — خانة لكل مسجّل (المعلومات + الاشتراك) + رسائل واتساب الجديدة بلا كلمة السر
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
const SHOT = process.env.S || '';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const bad = [];
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  const now = Date.now(), iso = d => new Date(d).toISOString();
  const NEW = { uid: '99999999-0000-4000-8000-000000000001', code: '0042', name: 'وكالة التسجيل الجديد', kind: 'agency', active: true, phone: '0661000000', email: 'nouveau@exemple.ma', city: 'مكناس', country: 'المغرب', terms_at: iso(now - 2 * 864e5), created_at: iso(now - 2 * 864e5), self_signup: true, seat_no: 9, seat_zone: 'ma' };
  const OLD = { uid: '99999999-0000-4000-8000-000000000002', code: '0700', name: 'Agence 700', kind: 'agency', active: true, phone: null, email: null, terms_at: null, created_at: iso(now - 400 * 864e5), self_signup: false };
  const SOON = { uid: '99999999-0000-4000-8000-000000000003', code: '0043', name: 'وكالة قربات تسالي', kind: 'agency', active: true, phone: '0662000000', email: 'soon@exemple.ma', city: 'فاس', country: 'المغرب', terms_at: iso(now - 175 * 864e5), created_at: iso(now - 175 * 864e5), self_signup: true, seat_no: 120, seat_zone: 'ma' };
  F.agencies.push(NEW, OLD, SOON); // كيتزادو لجدول الخادم المزيف
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  await p.goto(BASE + '#/agencies/manage'); await p.waitForTimeout(2500);
  const ow = async t => { const sw = await p.evaluate(() => document.documentElement.scrollWidth); if (sw > 391) bad.push(t + ' overflow ' + sw); };
  await ow('manage');
  // 1) العرض الافتراضي = المسجلين (خانات)، الجديد هو الأول، والقديم ما كيبانش
  const names = await p.$$eval('#aglist .mb-card .mb-top b', a => a.map(x => x.textContent));
  if (names[0] !== NEW.name) bad.push('first ' + names[0]);
  if (names.includes(OLD.name)) bad.push('old shown');
  const card = await p.$('#aglist .mb-card.new'); if (!card) bad.push('new card');
  else { const t = await card.textContent(); if (!/nouveau@exemple\.ma/.test(t) || !/المدة المجانية/.test(t) || !/9/.test(t)) bad.push('card info'); }
  if (!/⏰ تذكير/.test(await p.textContent('#aglist'))) bad.push('remind btn');
  // 2) الرسائل: ما فيهاش كلمة السر
  const inv = decodeURIComponent((await p.getAttribute('#ag-inv', 'href')).split('text=')[1]);
  if (/كلمة السر:/.test(inv) || !/الإيميل/.test(inv) || !/الكود/.test(inv)) bad.push('invite msg');
  const wel = decodeURIComponent((await p.getAttribute('#aglist .mb-card.new a.wa', 'href')).split('text=')[1]);
  if (/كلمة السر:/.test(wel) || !/0042|agence0042/.test(wel) || !/nouveau@exemple\.ma/.test(wel)) bad.push('welcome msg ' + wel.slice(0, 80));
  if (SHOT) { await p.waitForTimeout(1200); await p.screenshot({ path: SHOT + '/manage.png' }); const al = await p.$('#aglist .mb-card.new'); await al.scrollIntoViewIfNeeded(); await p.waitForTimeout(1200); await al.screenshot({ path: SHOT + '/manage-list.png' }); }
  if (await p.isVisible('#ag-oldrow')) bad.push('old row visible on reg');
  // 3) الحسابات القديمة: دعوة بلا كلمة السر
  await p.selectOption('[name=agf]', 'old'); await p.waitForTimeout(400);
  if (!/Agence 700/.test(await p.textContent('#aglist'))) bad.push('old filter');
  if (!(await p.isVisible('#ag-oldrow'))) bad.push('old row hidden');
  const oinv = await p.$$eval('#aglist a.wa', a => a.map(x => decodeURIComponent(x.href.split('text=')[1] || '')));
  if (!oinv.length || oinv.some(m => /كلمة السر:/.test(m))) bad.push('old invite');
  await ow('old');
  const ok = !bad.length && !errs.length; console.log(ok ? 'OK' : 'BAD', bad.join(' | '), errs.join(' | ')); await b.close(); process.exit(ok ? 0 : 1);
})();
