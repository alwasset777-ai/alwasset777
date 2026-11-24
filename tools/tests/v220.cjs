// v220: «➕ إضافة مشترك جديد» فـ«🔑 الإدارة» + فالزر «+» للمدير: الدعوة بواتساب لرقم، QR ديال التسجيل، نسخ الرابط، 7 فئات
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], bad = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1';
    window.__opened = []; const o = window.open; window.open = (u, ...a) => { window.__opened.push(String(u)); return null; }; });
  await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
  await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
  // 1) الزر فالإدارة
  await p.goto(BASE + '#/agencies/manage'); await p.waitForSelector('#ag-new-mem', { timeout: 10000 }).catch(() => bad.push('no button'));
  const vis = await p.evaluate(() => { const b = document.getElementById('ag-new-mem'); if (!b) return 0; const r = b.getBoundingClientRect(); return r.width > 80 && r.top < 1400 ? 1 : 0; });
  if (!vis) bad.push('button not visible near top');
  await p.click('#ag-new-mem'); await p.waitForSelector('#am-qr svg', { timeout: 8000 }).catch(() => bad.push('qr not drawn'));
  const kinds = await p.$$eval('.am-kinds .chip', a => a.length); if (kinds !== 7) bad.push('kinds ' + kinds);
  // 2) واتساب بلا رقم ← ما كيتحلش؛ برقم مغربي ← wa.me/2126… والرسالة فيها رابط التطبيق والاسم
  await p.click('#am-wa'); await p.waitForTimeout(200);
  if ((await p.evaluate(() => window.__opened.length)) !== 0) bad.push('opened without phone');
  await p.fill('[name=am-name]', 'وكالة النور'); await p.fill('[name=am-phone]', '0611223344'); await p.click('#am-wa'); await p.waitForTimeout(200);
  const u = await p.evaluate(() => window.__opened[0] || '');
  const txt = decodeURIComponent((u.split('text=')[1] || ''));
  if (!/^https:\/\/wa\.me\/212611223344\?text=/.test(u)) bad.push('wa url ' + u.slice(0, 60));
  if (!/وكالة النور/.test(txt) || !/bureau\//.test(txt) || /كلمة السر:/.test(txt)) bad.push('message ' + txt.slice(0, 120));
  await p.screenshot({ path: (process.env.SHOT || '/tmp/v220') + '-modal.png' });
  // 3) الفئة: الوسطاء ← نفس النافذة برسالة «وسيط»
  await p.click('.am-kinds .chip[href*="brokers"]'); await p.waitForSelector('#am-wa', { timeout: 10000 }).catch(() => bad.push('broker modal'));
  const lbl = await p.$eval('#am-wa', b => b.textContent).catch(() => ''); if (!/وسيط/.test(lbl)) bad.push('broker label ' + lbl);
  // 4) الزر «+» فالرئيسية: خانة «مشترك جديد» للمدير
  if (await p.evaluate(() => document.querySelectorAll('.modal-bg').length) > 1) bad.push('two modals stacked');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  if (await p.$('.modal-bg')) await p.click('.modal [data-close]').catch(() => {});
  await p.waitForTimeout(300);
  await p.goto(BASE + '#/'); await p.waitForTimeout(1200);
  await p.click('[data-hm="add"]'); await p.waitForTimeout(500);
  const tile = await p.$('.hub-tile[href="#/agencies/manage?add=1"]'); if (!tile) bad.push('no hub tile');
  else { await tile.evaluate(t => t.click()); await p.waitForSelector('#am-qr', { timeout: 10000 }).catch(() => bad.push('hub → modal')); } // الدوائر كيدورو ← ضغطة مباشرة
  console.log(JSON.stringify({ bad, errs }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
