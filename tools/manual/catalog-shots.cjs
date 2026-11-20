// صور إضافية لـ«الكتالوج الشامل» (فوق shots.cjs + pitch-shots.cjs): آخر الخدمات (منير بالصور، الزبناء المناسبين،
// لصق رسالة الزبون، البحث، الأداء، مراقبة الأمان، التحقق بخطوتين، الصفحات العمومية) — معلومات خيالية
// الاستعمال: cd docs && python3 -m http.server 8777 &  ثم  NODE_PATH=$(npm root -g) node tools/manual/catalog-shots.cjs OUTDIR
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs');
const BASE = 'http://localhost:8777/bureau/'; const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, serviceWorkers: 'block', isMobile: true, hasTouch: true });
  const p = await c.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_guide_seen = '1'; localStorage.w777_open_sound = '0'; });
  await p.route(/googleapis|gstatic|unpkg|jsdelivr|cdnjs|tile\.|openstreetmap|vercel\.app/, r => r.abort()); await F.install(p);
  // مجموعات الشبكة (باش تبان اليد والأيقونات فالرئيسية)
  await p.route(/w777_agent_config/, r => r.fulfill({ json: [{ id: 1, name: 'منير', ai_enabled: true, wa_group: 'https://chat.whatsapp.com/x', tg_group: 'https://t.me/x', fb_group: 'https://facebook.com/groups/x' }] }));
  // 🛡️ مراقبة الأمان (معلومات خيالية)
  await p.route(/\/rest\/v1\/rpc\/w777_sec_watch/, r => r.fulfill({ json: { admin_mfa: 1, admin_ips_30d: 2, signups_24h: 4, signups_7d: 19, sessions_24h: 37, recovery_24h: 0, unconfirmed: 1,
    admin_sessions: [{ at: new Date().toISOString(), ip: '105.66.12.40', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', aal: 'aal2' }, { at: new Date(Date.now() - 864e5).toISOString(), ip: '105.66.12.40', ua: 'Mozilla/5.0 (Macintosh; Mac OS X 14)', aal: 'aal2' }],
    multi_ip: [], agent_limit_hits: [] } }));
  // منير: كيسجل العقار ← بطاقة الزبناء المناسبين
  let step = 0;
  await p.route(/functions\/v1\/w777-agent/, async r => {
    const bd = JSON.parse(r.request().postData() || '{}'); if (bd.ping || bd.tts !== undefined || bd.game) return r.fulfill({ json: { ok: true } });
    step++;
    if (step === 1) return r.fulfill({ json: { content: [{ type: 'tool_use', id: 't1', name: 'create_property', input: { property_type: 'apartment', transaction: 'sale', city: 'مكناس', district: 'حمرية', price: 850000, area: 92, bedrooms: 2, owner_name: 'مالك تجريبي', owner_phone: '0611223344' } }], stop_reason: 'tool_use' } });
    r.fulfill({ json: { content: [{ type: 'text', text: 'تسجّل العقار W777 بالصور ✓ — وعندك زبون مناسب، واش نصيفط ليه الصور فواتساب؟' }], stop_reason: 'end_turn' } });
  });
  const clean = () => p.evaluate(() => { document.querySelectorAll('.wl-mod,.gd-tip,.toast,#splash').forEach(m => m.remove()); });
  const shot = async (name, wait = 1500) => { await p.waitForTimeout(wait); await clean(); await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 76 }); console.log('✓', name); };
  const go = async (h, name, wait) => { await p.evaluate(h => { location.hash = h; window.scrollTo(0, 0); }, h); await shot(name, wait); };
  await p.goto(BASE); await p.waitForTimeout(1500);
  const sd = await p.$('#seed'); if (sd) { await sd.click(); await p.waitForTimeout(1500); }
  await F.addPhotos(p, BASE); await F.login(p, BASE);
  // زبون كيقلب على شقة فمكناس (باش تبان بطاقة «زبون مناسب»)
  await p.evaluate(async () => { const now = new Date().toISOString();
    await window.W777_DB.saveRec('requests', { id: 'rq-cat', ref: 'R-0420', createdAt: now, updatedAt: now, status: 'new', transaction: 'sale', types: ['apartment'], city: 'مكناس', districts: ['حمرية'], budgetMin: 700000, budgetMax: 900000, bedrooms: 2, client: { name: 'سعيد المرابط', phone: '0622334455' } });
    if (window.W777_TEST) await window.W777_TEST.loadAll(); });
  // 🏠 الرئيسية: العدادات بالإبرة + المجموعات
  await go('#/', 'home-top', 3200);
  await p.evaluate(() => { const e = document.querySelector('.hstats'); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 120); }); await shot('home-gauges', 1800);
  await p.evaluate(() => { const e = document.querySelector('.grp-strip'); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 90); }); await shot('home-groups', 800);
  // 📋 لصق رسالة الزبون
  await go('#/request/new', 'request-form', 1500);
  try { await p.evaluate(() => document.getElementById('paste-msg').click()); await p.waitForTimeout(600);
    await p.evaluate(() => { const t = document.querySelector('.modal textarea'); if (t) { t.value = 'السلام عليكم، أنا سعيد 0622334455، كنقلب على شقة للبيع فمكناس حمرية، 2 بيوت، الميزانية 85 مليون'; t.dispatchEvent(new Event('input', { bubbles: true })); } });
    await shot('paste-msg', 600); } catch (e) { console.log('paste', e.message); }
  await p.keyboard.press('Escape').catch(() => {}); await p.evaluate(() => document.querySelectorAll('.modal-bg,.modal').forEach(m => m.remove()));
  // 🔎 البحث
  await go('#/search?q=' + encodeURIComponent('شقة حمرية'), 'search', 1800);
  // 🤖 منير: الأزرار السريعة + الصور + الزبون المناسب
  await go('#/properties', 'x', 600);
  await p.evaluate(() => document.getElementById('agent-fab').click()); await shot('agent-quick', 2200);
  const imgs = await p.evaluate(async () => { const out = []; for (const col of ['#c9b79c', '#8fa9c4', '#d8d2c4']) { const cv = document.createElement('canvas'); cv.width = 800; cv.height = 600; const x = cv.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 800, 600); for (let i = 0; i < 800; i += 40) { x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(i, 0, 18, 600); } out.push(await new Promise(r => cv.toBlob(b => r(b), 'image/jpeg', .9))); }
    const dt = new DataTransfer(); out.forEach((b, i) => dt.items.add(new File([b], 'photo' + i + '.jpg', { type: 'image/jpeg' }))); const inp = document.getElementById('ag-file'); inp.files = dt.files; inp.dispatchEvent(new Event('change')); return out.length; });
  await shot('agent-photos', 1200);
  await p.evaluate(() => { window.__cf = setInterval(() => { const x = document.getElementById('cf-ok'); if (x) x.click(); }, 150); document.getElementById('ag-form').requestSubmit(); });
  for (let i = 0; i < 30 && step < 2; i++) await p.waitForTimeout(400);
  await p.waitForTimeout(1500); await p.evaluate(() => { const m = document.querySelector('#ag-body .ag-mt'); const b = document.getElementById('ag-body'); if (m && b) b.scrollTop = m.offsetTop - 60; else if (b) b.scrollTop = b.scrollHeight; }); await shot('agent-match', 600);
  await p.evaluate(() => { const x = document.getElementById('ag-close'); if (x) x.click(); }); await p.waitForTimeout(600);
  // 🎓 منير فالأكاديمية (خلفية تعليمية)
  await p.evaluate(() => { location.hash = '#/learn'; }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('agent-fab').click()); await shot('agent-academy', 2000);
  await p.evaluate(() => { const x = document.getElementById('ag-close'); if (x) x.click(); }); await p.waitForTimeout(600);
  // 🔑 الإدارة: مراقبة الأمان + الأداءات
  await go('#/agencies/manage', 'manage-top', 2600);
  await p.evaluate(() => { const e = document.getElementById('sec-watch'); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70); }); await shot('sec-watch', 900);
  await p.evaluate(() => { const e = document.getElementById('pay-admin'); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70); }); await shot('pay-admin', 900);
  // 🔐 الأمان فالإعدادات (التحقق بخطوتين، القفل)
  await go('#/settings?s=security', 'settings-security', 2000);
  await go('#/settings?s=office', 'settings-office', 1800);
  await go('#/settings?s=app', 'settings-app', 1800);
  // 📅 المواعيد والتقارير والخريطة
  await go('#/appointments', 'appointments2', 1600);
  // 💳 نافذة الأداء (من صفحة القانون)
  await go('#/terms', 'terms2', 1600);
  try { await p.evaluate(() => { const x = document.getElementById('tr-pay'); if (x) x.click(); }); await shot('pay-modal', 1200); } catch (e) { console.log('pay', e.message); }
  await p.evaluate(() => document.querySelectorAll('.modal-bg,.modal').forEach(m => m.remove()));
  // 🌐 الصفحات العمومية
  for (const [u, n] of [['decouvrir.html', 'pub-decouvrir'], ['catalog.html', 'pub-catalog'], ['stays.html', 'pub-stays'], ['join.html', 'pub-join'], ['game.html', 'pub-wasla']]) { await p.goto(BASE + u); await shot(n, 2000); }
  await b.close();
})();
