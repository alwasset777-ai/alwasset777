// «الملف التقديمي لتطبيق مجموعة الوسيط» — PDF A4 بالعربية: المميزات، الفريق اللي كيعوضو التطبيق، والحلول لكل فئة من المشتركين، بصور التطبيق
// الاستعمال: 1) NODE_PATH=$(npm root -g) node tools/manual/shots.cjs SHOTS && node tools/manual/pitch-shots.cjs SHOTS
//            2) NODE_PATH=$(npm root -g) node tools/manual/pitch.cjs SHOTS OUT.pdf
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
// اللغة: PITCH_LANG=fr ← المحتوى بالفرنسية (pitch-content-fr.cjs) والصفحات من اليسار لليمين
const LANG = process.env.PITCH_LANG === 'fr' ? 'fr' : 'ar';
const C = require(LANG === 'fr' ? './pitch-content-fr.cjs' : './pitch-content.cjs');
const APP = path.join(__dirname, '..', '..', 'docs', 'bureau'); const SH = path.resolve(process.argv[2]); const OUT = path.resolve(process.argv[3]);
const VER = (fs.readFileSync(path.join(APP, 'sw.js'), 'utf8').match(/w777-bureau-v(\d+)/) || [])[1] || '';
const APP_URL = 'https://alwasset777-ai.github.io/alwasset777/bureau/';
const u = f => 'file://' + f; const img = n => u(path.join(SH, n + '.jpg'));
const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const two = n => String(n).padStart(2, '0');
// كل الصور خاصها تكون موجودة
const need = new Set(['home2', 'desk-home', 'desk-properties', 'login', 'register', ...C.roles.flatMap(r => r.shots), ...C.subs.flatMap(s => s.shots)]);
const miss = [...need].filter(n => !fs.existsSync(path.join(SH, n + '.jpg'))); if (miss.length) { console.error('MISSING', miss.join(', ')); process.exit(1); }
const fonts = [400, 500, 700, 800, 900].map(w => ['arabic', 'latin'].map(s => `@font-face{font-family:'Tajawal';font-weight:${w};src:url(${u(path.join(APP, 'fonts', `tajawal-${s}-${w}-normal.woff2`))}) format('woff2')}`).join('')).join('');
const phone = (n, cls = '') => `<div class="ph ${cls}"><img src="${img(n)}" alt=""></div>`;
const laptop = (n, cls = '') => `<div class="lap ${cls}"><div class="scr"><img src="${img(n)}" alt=""></div><div class="base"></div></div>`;
const LOGO_W = u(path.join(APP, 'icons/brand/logo-flat-white.png')), LOGO_D = u(path.join(APP, 'icons/brand/logo-flat.png'));

const css = `${fonts}
@page{size:A4;margin:0}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:'Tajawal',sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:10.4pt;line-height:1.65}
.pg{width:210mm;height:297mm;position:relative;overflow:hidden;break-after:page;padding:15mm 15mm 16mm}
.pg:last-child{break-after:auto}
.lat{direction:ltr;unicode-bidi:isolate;display:inline-block}
h1,h2,h3,h4,p{margin:0}
.foot{position:absolute;bottom:7mm;left:15mm;right:15mm;display:flex;justify-content:space-between;align-items:center;font-size:7.4pt;color:#8a8a8a;border-top:.5px solid #e2e2e2;padding-top:2.2mm}
.foot b{color:#c8102e}
.kick{font-size:8.2pt;letter-spacing:.26em;color:#8a8a8a;font-weight:800}
.big{font-size:24pt;font-weight:900;line-height:1.2;margin-top:1.6mm}
.big span{color:#c8102e}
.lead{margin-top:3.4mm;font-size:11.2pt;color:#333;line-height:1.8}
.ph{border-radius:6.4mm;padding:1.5mm;background:#111;box-shadow:0 5mm 12mm -6mm rgba(0,0,0,.5),0 0 0 .4mm #2c2c2c inset}
.ph img{display:block;width:100%;height:auto;border-radius:5mm}
.lap{width:100%}
.lap .scr{background:#111;border-radius:3.4mm 3.4mm 0 0;padding:2.4mm 2.4mm 2.8mm;box-shadow:0 6mm 14mm -8mm rgba(0,0,0,.6)}
.lap .scr img{display:block;width:100%;border-radius:1mm}
.lap .base{height:4mm;margin:0 -6%;background:linear-gradient(#d9d9d9,#a9a9a9);border-radius:0 0 4mm 4mm;position:relative}
.lap .base::after{content:'';position:absolute;top:0;left:42%;right:42%;height:1.4mm;background:#8d8d8d;border-radius:0 0 2mm 2mm}
/* الغلاف */
.cover{background:#0d0d0d;color:#fff;padding:0}
.cover .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:9mm 9mm}
.cover .band{position:absolute;top:0;bottom:0;right:0;width:10mm;background:#c8102e}
.cover .top{position:absolute;top:18mm;right:24mm;left:18mm}
.cover .top img.lg{width:58mm;height:auto;display:block}
.cover .kk{margin-top:8mm;font-size:9pt;letter-spacing:.3em;color:#e8c4ca;font-weight:800}
.cover h1{margin-top:3mm;font-size:36pt;line-height:1.12;font-weight:900}
.cover h1 span{color:#c8102e}
.cover .sub{margin-top:4.6mm;font-size:13pt;color:#d8d8d8;font-weight:500;max-width:160mm;line-height:1.7}
.cover .stage{position:absolute;bottom:24mm;left:16mm;right:22mm;height:118mm}
.cover .stage .lap{position:absolute;left:0;bottom:6mm;width:132mm}
.cover .stage .ph{position:absolute;right:4mm;bottom:0;width:50mm;transform:rotate(3deg)}
.cover .bot{position:absolute;bottom:9mm;right:24mm;left:18mm;display:flex;justify-content:space-between;font-size:8.4pt;color:#bdbdbd}
.cover .bot b{color:#fff}
/* المشاكل */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-top:6mm}
.kpi{border:1px solid #e6e6e6;border-radius:4mm;padding:3.4mm 2mm;text-align:center;background:#fafafa}
.kpi b{display:block;font-size:21pt;font-weight:900;color:#c8102e;line-height:1.1}
.kpi small{font-size:8.4pt;color:#555;font-weight:700}
.probs{display:grid;grid-template-columns:1fr 1fr;gap:3.4mm;margin-top:7mm}
.prob{border-radius:4mm;overflow:hidden;border:1px solid #e3e3e3;display:flex;flex-direction:column}
.prob .pt{display:flex;gap:2.4mm;align-items:center;padding:3mm 3.6mm 1.4mm;font-weight:900;font-size:11pt}
.prob .pt i{font-style:normal;font-size:15pt}
.prob .pp{padding:0 3.6mm 2.6mm;color:#555;font-size:9.2pt;line-height:1.6}
.prob .pf{margin-top:auto;background:#111;color:#fff;padding:2.6mm 3.6mm;font-size:9.3pt;font-weight:700;line-height:1.55}
.prob .pf::before{content:var(--sol);color:#ff8a99;font-weight:900}
:root{--sol:'✓ الحل: '}
/* الفريق */
.team{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:6mm}
.tm{border:1px solid #e3e3e3;border-radius:4mm;padding:3mm 3.2mm;display:flex;gap:2.6mm;align-items:center;background:#fff}
.tm .n{font-size:8pt;font-weight:900;color:#fff;background:#c8102e;border-radius:2mm;min-width:7mm;height:7mm;display:grid;place-items:center}
.tm i{font-style:normal;font-size:16pt}
.tm:last-child:nth-child(3n+1){grid-column:2}
.tm b{display:block;font-size:9.6pt;line-height:1.35}.tm small{display:block;font-size:7.6pt;color:#888;unicode-bidi:plaintext;text-align:start}
.note{margin-top:6mm;background:#111;color:#fff;border-radius:4mm;padding:4mm 5mm;font-size:10.4pt;line-height:1.75;display:flex;gap:3mm}
.note b{color:#ffcfd6;white-space:nowrap}
.hub{display:flex;align-items:center;gap:6mm;margin-top:6mm;padding:4mm 5mm;border-radius:5mm;background:linear-gradient(135deg,#fff,#fbeef0);border:1px solid #f1d3d8}
.hub img{width:36mm;height:auto}
.hub p{font-size:11pt;line-height:1.75;color:#222}
.hub p b{color:#c8102e}
/* صفحة الموظف */
.rl .head{display:flex;align-items:flex-start;gap:4mm;padding-bottom:3mm;border-bottom:1.4px solid #111}
.rl .num{font-size:28pt;font-weight:900;line-height:.95;color:#c8102e;min-width:15mm}
.rl .head h2{font-size:18.5pt;font-weight:900;line-height:1.25}
.rl .head small{display:block;font-size:9.4pt;color:#777;font-weight:700;margin-top:.4mm;unicode-bidi:plaintext;text-align:start}
.rl .tag{margin-inline-start:auto;font-size:8pt;font-weight:800;color:#fff;background:#111;border-radius:99px;padding:.8mm 3.4mm;white-space:nowrap;align-self:flex-start}
.rl .job{margin-top:3.6mm;background:#f6f6f6;border-inline-start:1.4mm solid #9a9a9a;border-radius:0 3mm 3mm 0;padding:2.6mm 4mm;font-size:10.2pt;color:#333}
.rl .job b{color:#111}
.rl .mid{display:grid;grid-template-columns:1fr 62mm;gap:5mm;margin-top:4mm;align-items:start}
.rl h4{font-size:10.6pt;font-weight:900;margin:0 0 2mm;display:flex;align-items:center;gap:1.6mm}
.rl h4 i{font-style:normal;width:5.4mm;height:5.4mm;border-radius:1.4mm;background:#c8102e;color:#fff;display:inline-grid;place-items:center;font-size:7.6pt}
.rl ul{margin:0;padding:0;list-style:none}
.rl ul li{position:relative;padding-inline-start:6.4mm;margin-bottom:1.8mm;font-size:9.8pt;line-height:1.6}
.rl ul li::before{content:'✓';position:absolute;inset-inline-start:0;top:.2mm;width:4.6mm;height:4.6mm;border-radius:50%;background:#0a7a2f;color:#fff;font-size:7pt;font-weight:900;display:grid;place-items:center}
.ba{display:grid;gap:2.4mm}
.ba div{border-radius:3.4mm;padding:2.8mm 3.4mm;font-size:9.6pt;line-height:1.5}
.ba .b4{background:#fff3f4;border:1px solid #f3c5cb;color:#7a1220}
.ba .af{background:#effaf2;border:1px solid #bfe6c9;color:#0b5a25;font-weight:700}
.ba small{display:block;font-size:7.6pt;font-weight:900;letter-spacing:.06em;margin-bottom:.6mm}
.rl .phones{display:flex;gap:6mm;justify-content:center;margin-top:5mm}
.rl .phones .ph{width:63mm}
.rl .phones.n3 .ph{width:52mm}
.rl .phones.n1 .ph{width:68mm}
/* الوقت */
table.tt{width:100%;border-collapse:separate;border-spacing:0;margin-top:6mm;font-size:10.2pt}
.tt th{background:#111;color:#fff;font-weight:800;padding:2.6mm 3mm;text-align:right}
.tt th:first-child{border-radius:0 3mm 0 0}.tt th:last-child{border-radius:3mm 0 0 0}
.tt td{padding:2.6mm 3mm;border-bottom:.6px solid #e3e3e3}
.tt td:nth-child(2){color:#9b1c2c}.tt td:nth-child(3){color:#0a7a2f;font-weight:800}
.tt tr:nth-child(even) td{background:#fafafa}
.disc{margin-top:2.4mm;font-size:8pt;color:#888}
/* صفحة الفئة */
.sb .head{display:flex;align-items:center;gap:4mm;padding:4mm 5mm;border-radius:5mm;color:#fff}
.sb .head i{font-style:normal;font-size:24pt;background:rgba(255,255,255,.16);border-radius:4mm;width:16mm;height:16mm;display:grid;place-items:center}
.sb .head h2{font-size:19pt;font-weight:900;line-height:1.2}
.sb .head small{display:block;font-size:9pt;opacity:.85;font-weight:700}
.sb .cols{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:5mm}
.sb .col{border-radius:4mm;padding:3.4mm 4mm}
.sb .col h4{font-size:10.8pt;font-weight:900;margin-bottom:2.2mm}
.sb .col ul{margin:0;padding:0;list-style:none}
.sb .col li{position:relative;padding-inline-start:6.4mm;margin-bottom:1.8mm;font-size:9.7pt;line-height:1.58}
.sb .col li::before{position:absolute;inset-inline-start:0;top:.2mm;width:4.6mm;height:4.6mm;border-radius:50%;color:#fff;font-size:7pt;font-weight:900;display:grid;place-items:center}
.sb .pain{background:#fff3f4;border:1px solid #f3c5cb}.sb .pain h4{color:#9b1c2c}.sb .pain li::before{content:'✕';background:#c8102e}
.sb .fix{background:#effaf2;border:1px solid #bfe6c9}.sb .fix h4{color:#0a7a2f}.sb .fix li::before{content:'✓';background:#0a7a2f}
.sb .phones{display:flex;gap:7mm;justify-content:center;margin-top:5mm}
.sb .phones .ph{width:64mm}
/* سكشن */
.sec-open{background:#0d0d0d;color:#fff}
.sec-open .grid{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1.2px);background-size:6mm 6mm}
.sec-open .in{position:absolute;inset:0;padding:0 22mm;display:flex;flex-direction:column;justify-content:center}
.sec-open .nn{font-size:80pt;font-weight:900;color:#c8102e;line-height:1}
.sec-open h2{font-size:30pt;font-weight:900;margin-top:4mm;line-height:1.2}
.sec-open p{font-size:13pt;color:#ddd;margin-top:5mm;max-width:150mm;line-height:1.8}
.sec-open .chips{display:flex;flex-wrap:wrap;gap:2.4mm;margin-top:8mm;max-width:160mm}
.sec-open .chips span{border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:1.2mm 4mm;font-size:9.4pt}
.sec-open .band{position:absolute;bottom:0;left:0;right:0;height:7mm;background:#c8102e}
/* مشترك + البداية */
.feats{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:6mm}
.feats div{background:#f6f6f6;border-radius:4mm;padding:3.4mm}
.feats i{font-style:normal;font-size:17pt;display:block}
.feats b{display:block;font-size:10.6pt;margin-top:1mm}.feats small{color:#444;font-size:8.8pt;line-height:1.55;display:block}
.steps3{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:5mm}
.steps3 .st{text-align:center}
.steps3 .st .ph{width:46mm;margin:0 auto}
.steps3 .st b{display:block;margin-top:3mm;font-size:10.4pt}
.steps3 .st b span{display:inline-grid;place-items:center;width:6mm;height:6mm;border-radius:50%;background:#c8102e;color:#fff;font-size:8.4pt;margin-left:2.6mm;vertical-align:1px}
.steps3 .st small{color:#555;font-size:8.8pt}
.offer{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:4mm}
.offer div{border:1.2px solid #111;border-radius:4mm;padding:3mm;text-align:center}
.offer div i{font-style:normal;font-size:16pt;display:block}
.offer b{display:block;font-size:11pt;margin-top:.6mm}.offer small{color:#555;font-size:8.6pt}
/* الختام */
.end{background:#0d0d0d;color:#fff}
.end .grid{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1.2px);background-size:6mm 6mm}
.end .in{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6mm}
.end img.lg{width:72mm;height:auto}
.end h2{font-size:25pt;font-weight:900;line-height:1.3}
.end h2 span{color:#ff8a99}
.end .slog{font-size:14pt;color:#ffcfd6;font-weight:700}
.end .qr{background:#fff;border-radius:4mm;padding:4mm;width:46mm;height:46mm}
.end .qr svg{width:100%;height:100%;display:block}
.end .ct{font-size:11pt;line-height:2;color:#ddd}
.end .ct b{color:#fff}
.end .band{position:absolute;bottom:0;left:0;right:0;height:7mm;background:#c8102e}
`;

const U = C.ui;
const pages = []; const foot = label => `<div class="foot"><span>${U.footL}</span><span>${e(label || '')}</span><span class="lat">${pages.length + 1}</span></div>`;
const R = C.roles.length; const T = s => String(s).replace(/\{R\}/g, R);
// 1) الغلاف
pages.push(`<section class="pg cover"><div class="grid"></div><div class="band"></div>
  <div class="top"><img class="lg" src="${LOGO_W}" alt="${e(U.brand)}">
    <div class="kk">${U.coverKick}</div>
    <h1>${U.coverH1}</h1>
    <p class="sub">${e(T(U.coverSub))}</p></div>
  <div class="stage">${laptop('desk-home')}${phone('home2')}</div>
  <div class="bot"><span>${U.coverPlace} · <b class="lat">2026</b></span><span>${U.version} <b class="lat">v${e(VER)}</b></span></div></section>`);
// 2) المشكل والحل
pages.push(`<section class="pg"><div class="kick">${U.k1}</div>
  <h2 class="big">${U.h1}</h2>
  <p class="lead">${e(U.lead1)}</p>
  <div class="kpis">${[[String(R), U.kpi[0]], ['+40', U.kpi[1]], ['7', U.kpi[2]], ['6', U.kpi[3]]].map(([n, t]) => `<div class="kpi"><b class="lat">${n}</b><small>${e(t)}</small></div>`).join('')}</div>
  <div class="probs">${C.problems.map(([i, t, p, f]) => `<div class="prob"><div class="pt"><i>${i}</i>${e(t)}</div><p class="pp">${e(p)}</p><div class="pf">${e(f)}</div></div>`).join('')}</div>
  ${foot(U.f1)}</section>`);
// 3) الفريق
pages.push(`<section class="pg"><div class="kick">${U.k2}</div>
  <h2 class="big">${T(U.h2)}</h2>
  <div class="hub"><img src="${LOGO_D}" alt="${e(U.brand)}"><p>${U.hub}</p></div>
  <div class="team">${C.roles.map((r, i) => `<div class="tm"><span class="n lat">${two(i + 1)}</span><i>${r.ic}</i><span><b>${e(r.t)}</b><small>${e(r.en)}</small></span></div>`).join('')}</div>
  <div class="note"><b>${U.noteT}</b><span>${e(U.note)}</span></div>
  ${foot(U.f2)}</section>`);
// 4) فاصل: الموظفين
pages.push(`<section class="pg sec-open"><div class="grid"></div><div class="in"><div class="nn lat">01</div><h2>${U.s1h}</h2>
  <p>${e(U.s1p)}</p>
  <div class="chips">${C.roles.map(r => `<span>${r.ic} ${e(r.t)}</span>`).join('')}</div></div><div class="band"></div></section>`);
// 5) صفحة لكل موظف
C.roles.forEach((r, i) => {
  pages.push(`<section class="pg rl"><div class="head"><div class="num lat">${two(i + 1)}</div><div><h2>${r.ic} ${e(r.t)}</h2><small>${e(r.en)}</small></div><span class="tag">${e(U.tag(i + 1, R))}</span></div>
    <p class="job"><b>${U.jobT}</b> ${e(r.job)}</p>
    <div class="mid"><div><h4><i>✓</i>${U.doesT}</h4><ul>${r.does.map(d => `<li>${e(d)}</li>`).join('')}</ul></div>
      <div class="ba"><div class="b4"><small>✕ ${U.before}</small>${e(r.before)}</div><div class="af"><small>✓ ${U.after}</small>${e(r.after)}</div></div></div>
    <div class="phones n${r.shots.length}">${r.shots.map(s => phone(s)).join('')}</div>
    ${foot(r.t)}</section>`);
});
// 6) الوقت
pages.push(`<section class="pg"><div class="kick">${U.k3}</div>
  <h2 class="big">${U.h3}</h2>
  <p class="lead">${e(U.lead3)}</p>
  <table class="tt"><thead><tr>${U.th.map(x => `<th>${e(x)}</th>`).join('')}</tr></thead><tbody>${C.times.map(([a, b, c]) => `<tr><td>${e(a)}</td><td>${e(b)}</td><td>${e(c)}</td></tr>`).join('')}</tbody></table>
  <p class="disc">${e(U.disc)}</p>
  <div class="note" style="margin-top:6mm"><b>${U.sumT}</b><span>${e(U.sum)}</span></div>
  <div style="margin:6mm auto 0;width:112mm">${laptop('desk-properties')}</div>
  ${foot(U.f3)}</section>`);
// 7) فاصل: المشتركين
pages.push(`<section class="pg sec-open"><div class="grid"></div><div class="in"><div class="nn lat">02</div><h2>${U.s2h}</h2>
  <p>${e(U.s2p)}</p>
  <div class="chips">${C.subs.map(s => `<span>${s.ic} ${e(s.t)}</span>`).join('')}</div></div><div class="band"></div></section>`);
// 8) صفحة لكل فئة
C.subs.forEach(s => {
  pages.push(`<section class="pg sb"><div class="head" style="background:${s.c}"><i>${s.ic}</i><div><small>${U.forT}</small><h2>${e(s.t)}</h2></div></div>
    <div class="cols"><div class="col pain"><h4>${U.painT}</h4><ul>${s.pains.map(x => `<li>${e(x)}</li>`).join('')}</ul></div>
      <div class="col fix"><h4>${U.fixT}</h4><ul>${s.fix.map(x => `<li>${e(x)}</li>`).join('')}</ul></div></div>
    <div class="phones">${s.shots.map(x => phone(x)).join('')}</div>
    ${foot(s.t)}</section>`);
});
// 9) مميزات مشتركة + البداية
pages.push(`<section class="pg"><div class="kick">${U.k4}</div>
  <h2 class="big">${U.h4}</h2>
  <div class="feats">${C.common.map(([i, t, s]) => `<div><i>${i}</i><b>${e(t)}</b><small>${e(s)}</small></div>`).join('')}</div>
  <h2 class="big" style="margin-top:8mm;font-size:19pt">${U.h5}</h2>
  <div class="steps3">${U.steps.map(([n, t, d], i) => `<div class="st">${phone(n)}<b><span class="lat">${i + 1}</span>${e(t)}</b><small>${e(d)}</small></div>`).join('')}</div>
  ${foot(U.f4)}</section>`);
// 10) العرض
pages.push(`<section class="pg"><div class="kick">${U.k5}</div>
  <h2 class="big">${U.h6}</h2>
  <p class="lead">${e(U.lead6)}</p>
  <div class="offer">${C.offer.map(([i, t, s]) => `<div><i>${i}</i><b>${e(t)}</b><small>${e(s)}</small></div>`).join('')}</div>
  <h2 class="big" style="margin-top:9mm;font-size:19pt">${U.h7}</h2>
  <div class="feats">${C.security.slice(0, 6).map(([i, t, s]) => `<div><i>${i}</i><b>${e(t)}</b><small>${e(s)}</small></div>`).join('')}</div>
  ${foot(U.f5)}</section>`);
// 11) الختام
pages.push(`<section class="pg end"><div class="grid"></div><div class="in">
  <img class="lg" src="${LOGO_W}" alt="${e(U.brand)}">
  <h2>${U.endH}</h2><p class="slog">${e(U.slogan)}</p>
  <div class="qr" id="qr"></div>
  <p class="ct">${U.scan} <b class="lat">${APP_URL}</b><br>${U.endL2}<br>📞 <b class="lat">0777 77 79 59</b> · <b class="lat">0777 77 78 48</b> — ${U.city}</p></div><div class="band"></div></section>`);

let html = `<!doctype html><html lang="${U.lang}" dir="${U.dir}"><head><meta charset="utf-8"><style>${css}${U.css || ''}</style></head><body>${pages.join('')}
<script src="${u(path.join(APP, 'vendor/qrcode.js'))}"></script><script>const q=qrcode(0,'M');q.addData(${JSON.stringify(APP_URL)});q.make();document.getElementById('qr').innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});</script></body></html>`;
// الفاصلة ’ كتبان معوجة فخط Tajawal ← كنستعملو ' العادية
if (LANG === 'fr') html = html.replace(/’/g, "'");
(async () => {
  const tmp = path.join(path.dirname(OUT), '_pitch.html'); fs.writeFileSync(tmp, html);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage();
  await p.goto('file://' + tmp, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  // فحص: حتى صفحة ما خرجات على 297mm، وحتى عنصر ما دخل تحت التذييل
  const over = await p.$$eval('.pg', a => a.map((s, i) => { const f = s.querySelector('.foot'); const fb = f ? f.getBoundingClientRect().top : s.getBoundingClientRect().bottom;
    let mx = 0; s.querySelectorAll('.phones, .lap, .feats, .team, .probs, table, .steps3, .offer, .cols, .note').forEach(x => { mx = Math.max(mx, x.getBoundingClientRect().bottom); });
    return [i + 1, Math.round(s.scrollHeight - s.clientHeight), Math.round(mx - fb)]; }).filter(x => x[1] > 2 || x[2] > 0));
  if (over.length) console.log('OVERFLOW [page, scroll, underFooter px]', JSON.stringify(over));
  if (process.env.PNG) { for (const n of process.env.PNG.split(',')) { const el = (await p.$$('.pg'))[+n - 1]; if (el) await el.screenshot({ path: `${process.env.PNGDIR}/pg-${n}.png` }); } }
  await p.pdf({ path: OUT, preferCSSPageSize: true, printBackground: true });
  await b.close(); if (!process.env.KEEP) fs.unlinkSync(tmp);
  console.log('PDF', OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB', 'pages', pages.length);
})();
