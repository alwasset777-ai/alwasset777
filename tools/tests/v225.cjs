// v225: ⚡ الخفة — بلا إعادة رفع الصور ملي كيعاود نفس الحساب يدخل، لائحة السحابة قبل الرفع، القاعدة فالآيفون، الحركات، الأخطاء كاملة + 📱 QR + 🔊 صوت العرض + 🎬 مسار التجربة
const fs = require('fs');
const { chromium } = require('playwright'); const F = require('../tuto/fake.cjs'); const BASE = 'http://localhost:8777/bureau/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const bad = [], errs = [];
  // 0) رقم النسخة فـapp.js = sw.js
  { const a = fs.readFileSync('docs/bureau/app.js', 'utf8').match(/APP_BUILD = '(v\d+)'/), s = fs.readFileSync('docs/bureau/sw.js', 'utf8').match(/w777-bureau-(v\d+)/); if (!a || !s || a[1] !== s[1]) bad.push('APP_BUILD ' + (a && a[1]) + ' vs sw ' + (s && s[1])); }
  const ctx = async (o = {}) => { const c = await b.newContext(Object.assign({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }, o.ua ? { userAgent: o.ua } : {})); const p = await c.newPage();
    p.on('pageerror', e => { if (!/probe-v225/.test(e.message)) errs.push((o.tag || '') + ': ' + e.message); });
    await p.addInitScript(() => { localStorage.w777_agent_voice = '0'; localStorage.w777_open_sound = '0'; localStorage.w777_guide_seen = '1'; });
    await p.route(/googleapis|gstatic|vercel\.app|tile\.openstreetmap|unpkg/, r => r.abort()); await F.install(p);
    await p.route(/rpc\/w777_my_status/, r => r.fulfill({ json: { ok: true, admin: true, member: true } }));
    return { c, p }; };
  // 1) الرفع: لائحة السحابة كتمنع إعادة رفع الصور اللي كاينين + نفس الحساب كيدخل ما كيمسحش «شنو ترفع»
  {
    const { c, p } = await ctx({ tag: 'sync', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1' });
    const ups = [], lists = []; let cloud = [];
    await p.route(/\/storage\/v1\/object\/list\//, r => { lists.push(1); r.fulfill({ json: cloud.map(n => ({ name: n })) }); });
    await p.route(/\/storage\/v1\/object\/w777-media\//, r => { if (r.request().method() === 'POST') ups.push(r.request().url().split('/').pop()); r.fulfill({ json: {} }); });
    await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE); await p.waitForTimeout(1500);
    // 30 صورة محلية فعقار (بحال الصور اللي ترفعو من قبل)
    const ids = await p.evaluate(async () => { const DB = window.W777_DB, blob = new Blob([new Uint8Array(1000)], { type: 'image/webp' }), ids = [];
      const pr = { id: 'p-v225', ref: 'W777-1', transaction: 'sale', type: 'apartment', city: 'مكناس', status: 'available', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), media: [] };
      for (let i = 0; i < 30; i++) { const id = 'ph-v225-' + i; ids.push(id); await DB.put('files', { id, owner: pr.id, kind: 'photo', name: id + '.webp', mime: 'image/webp', size: 1000, blob, thumb: blob }); pr.media.push({ id, kind: 'photo', name: id + '.webp', mime: 'image/webp', size: 1000 }); }
      await DB.saveRec('properties', pr); await DB.setMeta('sync_uploaded', {}); return ids; });
    cloud = ids.slice(0, 28).flatMap(id => [id, id + '.t']); // 28 فالسحابة، 2 باقين
    ups.length = 0;
    await p.evaluate(() => window.W777_SYNC.syncNow()); await p.waitForTimeout(3000);
    const real = ups.filter(x => !/\.t$/.test(x));
    if (!lists.length) bad.push('no cloud list');
    if (real.length !== 2) bad.push('uploads ' + real.length + ' ' + JSON.stringify(real.slice(0, 5)));
    const uid = await p.evaluate(async () => (await window.W777_DB.getMeta('sync_uid', null)));
    if (!uid) bad.push('sync_uid not stored');
    // الجلسة تقطعات ← نفس الحساب كيدخل من جديد ← «شنو ترفع» كيبقى
    const before = await p.evaluate(async () => Object.keys(await window.W777_DB.getMeta('sync_uploaded', {})).length);
    await p.evaluate(async () => { localStorage.removeItem('w777_cloud'); }); await p.reload(); await p.waitForTimeout(1200);
    await F.login(p, BASE); await p.waitForTimeout(1500);
    const after = await p.evaluate(async () => Object.keys(await window.W777_DB.getMeta('sync_uploaded', {})).length);
    if (after < before || before < 30) bad.push(`uploaded map reset ${before} → ${after}`);
    if (!(await p.evaluate(() => (document.getElementById('main').innerText || '').trim().length > 30))) bad.push('blank with Safari UA');
    await c.close();
  }
  // 2) الخفة: الحركات اللي كتدور ديما قليلة + التبديل فالإعدادات
  {
    const { c, p } = await ctx({ tag: 'lite' });
    await p.goto(BASE); await p.waitForTimeout(800); await F.login(p, BASE);
    await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(2500);
    const inf = () => p.evaluate(() => document.getAnimations().filter(a => { try { return a.effect.getTiming().iterations === Infinity && a.playState === 'running'; } catch (e) { return false; } }).length);
    const lite = await inf(), isLite = await p.evaluate(() => document.body.classList.contains('lite'));
    await p.evaluate(() => { localStorage.w777_lite = '0'; }); await p.reload(); await p.waitForTimeout(2500);
    const full = await inf();
    console.log('infinite animations: lite', lite, 'full', full);
    if (!isLite) bad.push('lite not default'); if (lite > 12 || lite >= full) bad.push(`lite anims ${lite} vs full ${full}`);
    await p.evaluate(() => { location.hash = '#/settings?s=app'; }); await p.waitForTimeout(1500);
    await p.click('#lite-on'); await p.waitForTimeout(300);
    if (!(await p.evaluate(() => document.body.classList.contains('lite') && localStorage.w777_lite === '1'))) bad.push('lite toggle');
    // 3) 📱 QR: من «+» ← جوج رموز (التجربة + التسجيل بالكود ديال المكتب)
    const first = await p.$eval('#fab-menu a', a => a.getAttribute('href')); if (first !== '#/qr') bad.push('fab first ' + first);
    await p.evaluate(() => { location.hash = '#/qr'; }); await p.waitForSelector('#qr-reg svg', { timeout: 8000 }).catch(() => bad.push('qr not drawn'));
    const q = await p.evaluate(() => ({ demo: (document.getElementById('qr-demo') || {}).title, reg: (document.getElementById('qr-reg') || {}).title, n: document.querySelectorAll('.qr-box svg').length }));
    if (q.n !== 2 || !/\?demo=1&tour=1&ref=WASSET$/.test(q.demo || '') || !/\?gate=1&ref=WASSET$/.test(q.reg || '')) bad.push('qr ' + JSON.stringify(q));
    await p.screenshot({ path: (process.env.SHOT || '/tmp/v225') + '-qr.png' });
    // 4) الأخطاء كتتسجل بالرسالة كاملة والنسخة
    const logs = [];
    await p.route(/rpc\/w777_log_error/, r => { logs.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
    await p.evaluate(() => { setTimeout(() => { throw new Error('probe-v225 boom'); }, 0); }); await p.waitForTimeout(800);
    const L = logs.find(l => /probe-v225 boom/.test(l.p_msg || ''));
    if (!L || L.p_ver !== (fs.readFileSync('docs/bureau/sw.js', 'utf8').match(/w777-bureau-(v\d+)/) || [])[1] || /https?:/.test(L.p_msg)) bad.push('error log ' + JSON.stringify(logs).slice(0, 200));
    // 5) 📊 مسار رابط التجربة
    await p.route(/rpc\/w777_share_stats/, r => r.fulfill({ json: [{ kind: 'demo', via: 'view', d7: 12, d30: 40, total: 55 }, { kind: 'demo', via: 'join', d7: 4, d30: 9, total: 11 }, { kind: 'demo', via: 'signup', d7: 2, d30: 5, total: 6 }] }));
    await p.evaluate(() => { location.hash = '#/agencies/manage'; }); await p.waitForSelector('.demo-funnel', { timeout: 10000 }).catch(() => bad.push('no funnel'));
    const fun = await p.evaluate(() => (document.querySelector('.demo-funnel') || {}).innerText || '');
    if (!/12\D+جرّبو\D+4\D+ضغطو\D+2\D+تسجلو/.test(fun.replace(/[⁦-⁩]/g, ''))) bad.push('funnel ' + fun.slice(0, 160));
    await c.close();
  }
  // 6) وضع العرض: «سجّل مجاناً» كيتحسب (join)، والعرض فيه زر الصوت
  {
    const { c, p } = await ctx({ tag: 'demo' }); const logs = [];
    await p.addInitScript(() => { sessionStorage.w777_gate = '1'; });
    await p.route(/rpc\/w777_share_log/, r => { logs.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 204, body: '' }); });
    await p.goto(BASE + '?demo=1&tour=1&ref=AG042'); await p.waitForSelector('#tour-bar', { timeout: 15000 }).catch(() => bad.push('tour'));
    if (!(await p.$('#tb-snd'))) bad.push('no sound button');
    await p.click('#tb-snd'); if ((await p.evaluate(() => localStorage.w777_tour_snd)) !== '0') bad.push('sound pref');
    await p.click('#demo-bar [data-demo-exit]'); await p.waitForTimeout(2000);
    if (!logs.some(l => l.p_kind === 'demo' && l.p_via === 'join' && l.p_ref === 'AG042')) bad.push('join not logged ' + JSON.stringify(logs));
    if (!(await p.evaluate(() => !!localStorage.w777_from_demo))) bad.push('from_demo flag');
    await c.close();
  }
  console.log(JSON.stringify({ bad, errs }));
  await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})();
