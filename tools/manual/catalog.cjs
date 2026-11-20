// «الكتالوج الشامل لتطبيق مجموعة الوسيط» — PDF A4: كل المراحل وكل الخدمات، لكل خدمة صورة + شنو هي + كيفاش + الفائدة
// الخط: Tajawal (خط الهوية) بالوزن 900 للعناوين البارزة. القاعدة: ما كنكتبوش 777 حدا الشعار.
// الاستعمال: 1) NODE_PATH=$(npm root -g) node tools/manual/shots.cjs SHOTS && node tools/manual/pitch-shots.cjs SHOTS && node tools/manual/catalog-shots.cjs SHOTS
//            2) NODE_PATH=$(npm root -g) node tools/manual/catalog.cjs SHOTS OUT.pdf
// v214 بالفرنسية: الصور بـ UI=fr (shots + pitch-shots + catalog-shots) ← CAT_LANG=fr node tools/manual/catalog.cjs SHOTS_FR OUT_FR.pdf
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const FRL = process.env.CAT_LANG === 'fr';
const C = require(FRL ? './catalog-content-fr.cjs' : './catalog-content.cjs'); const BASE_C = FRL ? C : require('./content.cjs');
const APP = path.join(__dirname, '..', '..', 'docs', 'bureau'); const SH = path.resolve(process.argv[2]); const OUT = path.resolve(process.argv[3]);
const VER = (fs.readFileSync(path.join(APP, 'sw.js'), 'utf8').match(/w777-bureau-v(\d+)/) || [])[1] || '';
const APP_URL = 'https://alwasset777-ai.github.io/alwasset777/bureau/';
const u = f => 'file://' + f; const img = n => u(path.join(SH, n + '.jpg'));
const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const two = n => String(n).padStart(2, '0');
const ALL = C.stages.flatMap(s => s.items);
const need = new Set(['home2', 'desk-home', 'home-groups', 'agent-quick', ...ALL.map(x => x.shot)]);
const miss = [...need].filter(n => !fs.existsSync(path.join(SH, n + '.jpg'))); if (miss.length) { console.error('MISSING', miss.join(', ')); process.exit(1); }
const fonts = [400, 500, 700, 800, 900].map(w => ['arabic', 'latin'].map(s => `@font-face{font-family:'Tajawal';font-weight:${w};src:url(${u(path.join(APP, 'fonts', `tajawal-${s}-${w}-normal.woff2`))}) format('woff2')}`).join('')).join('');
const phone = (n, cls = '') => /^desk-/.test(n) ? `<div class="lap ${cls}"><div class="scr"><img src="${img(n)}" alt=""></div><div class="base"></div></div>` : `<div class="ph ${cls}"><img src="${img(n)}" alt=""></div>`;
const LOGO_W = u(path.join(APP, 'icons/brand/logo-flat-white.png')), LOGO_D = u(path.join(APP, 'icons/brand/logo-flat.png'));
const BRAND = FRL ? 'Groupe Al Wasset' : 'مجموعة الوسيط';
// النصوص الثابتة (عربي / فرنسي)
const T = FRL ? {
  app: 'Application', cat: 'Catalogue complet', h1: `Application <span>${BRAND}</span><br>Tous les services en images`,
  sub: (n, k) => `${n} services en ${k} étapes : pour chacun, une vraie capture de l’application, ce que c’est, comment ça marche et ce que vous y gagnez.`,
  place: 'Meknès · Royaume du Maroc', ver: 'Version', road: 'LE PARCOURS · مسار المشترك', roadH: 'De l’inscription… <span>jusqu’à la vente</span>',
  roadP: `« ${BRAND} » réunit tout le travail d’une agence immobilière dans une seule application : biens, clients, assistant IA, marketing, finances et juridique, réseau, formation et sécurité. Voici les étapes que parcourt chaque adhérent, et les services de chacune.`,
  kpi0: 'services en images', nsv: n => `${n} services`, roadL: 'Le parcours', st: 'ÉTAPE · المرحلة', how: 'Comment ça marche :', gain: '★ Le plus :',
  offK: 'OFFRE 777 · العرض', offH: 'Offre 777 <span>pour les premiers</span>', offP: 'Chaque inscrit reçoit un numéro de place dans sa catégorie, et l’avantage dépend de l’ordre d’inscription. Nombre de membres illimité.',
  secH: 'Sécurité <span>et confidentialité</span>', faqH: 'Questions <span>fréquentes</span>', offL: 'Offre et sécurité',
  endH: 'Toute votre agence… <span>dans votre poche</span><br>Il suffit de commencer', slog: 'Avec Al Wasset, la solution est simple',
  ct: url => `Scannez le code ou ouvrez : <b class="lat">${url}</b><br>Inscription par e-mail · 6 mois offerts<br>📞 <b class="lat">0777 77 79 59</b> · <b class="lat">0777 77 78 48</b> — Meknès`,
  tocK: 'SOMMAIRE · الفهرس', tocH: (n, k) => `${n} services <span>en ${k} étapes</span>`, tocL: 'Sommaire',
} : {
  app: 'تطبيق', cat: 'الكتالوج الشامل', h1: `تطبيق <span>${BRAND}</span><br>كل الخدمات… بالصورة`,
  sub: (n, k) => `${n} خدمة فـ${k} مراحل: لكل خدمة صورة حقيقية من التطبيق، شنو هي، كيفاش كتخدم، والفائدة اللي كتربح منها.`,
  place: 'مكناس · المملكة المغربية', ver: 'النسخة', road: 'LE PARCOURS · رحلة المشترك', roadH: 'من التسجيل… <span>حتى الصفقة</span>',
  roadP: `«${BRAND}» تطبيق واحد كيجمع خدمة المكتب العقاري كاملة: العقارات، الزبناء، المساعد الذكي، التسويق، المال والقانون، الشبكة، التكوين، والأمان. هادي المراحل اللي كيدوز منها كل مشترك، وكل مرحلة فيها خدماتها.`,
  kpi0: 'خدمة بالصورة', nsv: n => `${n} خدمات`, roadL: 'رحلة المشترك', st: 'ÉTAPE · المرحلة', how: 'كيفاش كتخدم:', gain: '★ الفائدة:',
  offK: 'OFFRE 777 · العرض', offH: 'عرض 777 <span>للأوائل</span>', offP: 'كل واحد كيتسجل كياخد رقم مقعد فالفئة ديالو، والامتياز كيتحدد بالترتيب. عدد الأعضاء بلا حد.',
  secH: 'الأمان <span>والخصوصية</span>', faqH: 'أسئلة <span>متكررة</span>', offL: 'العرض والأمان',
  endH: 'مكتبك كامل… <span>فجيبك</span><br>غير بدا', slog: 'مع الوسيط… حلّك بسيط',
  ct: url => `سكاني الرمز ولا حل: <b class="lat">${url}</b><br>التسجيل بالإيميل · 6 أشهر مجانية<br>📞 <b class="lat">0777 77 79 59</b> · <b class="lat">0777 77 78 48</b> — مكناس`,
  tocK: 'SOMMAIRE · الفهرس', tocH: (n, k) => `${n} خدمة <span>فـ${k} مراحل</span>`, tocL: 'الفهرس',
};

const css = `${fonts}
@page{size:A4;margin:0}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:'Tajawal',sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:10.2pt;line-height:1.65}
.pg{width:210mm;height:297mm;position:relative;overflow:hidden;break-after:page;padding:14mm 14mm 16mm}
.pg:last-child{break-after:auto}
.lat{direction:ltr;unicode-bidi:isolate;display:inline-block}
h1,h2,h3,h4,p{margin:0}
/* الحروف البارزة: الوزن 900 + ظل خفيف بحال النقش */
.emb{font-weight:900;letter-spacing:-.01em;text-shadow:0 .35mm 0 rgba(255,255,255,.9),0 .7mm 1.4mm rgba(0,0,0,.14)}
.dk .emb{text-shadow:0 .6mm 0 rgba(0,0,0,.55),0 0 6mm rgba(200,16,46,.35)}
.foot{position:absolute;bottom:7mm;left:14mm;right:14mm;display:flex;justify-content:space-between;align-items:center;font-size:7.4pt;color:#8a8a8a;border-top:.5px solid #e2e2e2;padding-top:2.2mm}
.foot b{color:#c8102e}
.foot img{height:4.2mm;vertical-align:middle}
.ph{border-radius:6mm;padding:1.4mm;background:#111;box-shadow:0 5mm 11mm -6mm rgba(0,0,0,.55),0 0 0 .4mm #2c2c2c inset}
.ph img{display:block;width:100%;height:auto;border-radius:4.8mm}
.lap{width:100%}
.lap .scr{background:#111;border-radius:3mm 3mm 0 0;padding:2mm 2mm 2.4mm;box-shadow:0 6mm 14mm -8mm rgba(0,0,0,.6)}
.lap .scr img{display:block;width:100%;border-radius:1mm}
.lap .base{height:3.6mm;margin:0 -6%;background:linear-gradient(#d9d9d9,#a9a9a9);border-radius:0 0 4mm 4mm;position:relative}
.lap .base::after{content:'';position:absolute;top:0;left:42%;right:42%;height:1.2mm;background:#8d8d8d;border-radius:0 0 2mm 2mm}
.kick{font-size:8.2pt;letter-spacing:.26em;color:#9a9a9a;font-weight:800}
.big{font-size:25pt;line-height:1.2;margin-top:1.4mm}
.big span{color:#c8102e}
.lead{margin-top:3.4mm;font-size:11.2pt;color:#333;line-height:1.85}
/* الغلاف */
.cover{background:#0b0b0b;color:#fff;padding:0}
.cover .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:9mm 9mm}
.cover .glow{position:absolute;width:150mm;height:150mm;left:-40mm;bottom:-30mm;border-radius:50%;background:radial-gradient(circle,rgba(200,16,46,.35),transparent 65%)}
.cover .band{position:absolute;top:0;bottom:0;right:0;width:9mm;background:linear-gradient(#c8102e,#8a0d17)}
.cover .top{position:absolute;top:17mm;right:22mm;left:18mm}
.cover .top img.lg{width:62mm;height:auto;display:block}
.cover .kk{margin-top:9mm;font-size:9pt;letter-spacing:.32em;color:#e8c4ca;font-weight:800}
.cover h1{margin-top:3mm;font-size:40pt;line-height:1.1}
.cover h1 span{color:#ff2d48}
.cover .sub{margin-top:5mm;font-size:13pt;color:#d8d8d8;font-weight:500;max-width:158mm;line-height:1.75}
.cover .pills{display:flex;gap:2.4mm;flex-wrap:wrap;margin-top:6mm}
.cover .pills span{border:1px solid rgba(255,255,255,.28);border-radius:99px;padding:1mm 3.6mm;font-size:9pt;font-weight:700}
.cover .stage{position:absolute;bottom:22mm;left:16mm;right:22mm;height:104mm}
.cover .stage .lap{position:absolute;left:0;bottom:6mm;width:126mm}
.cover .stage .ph{position:absolute;right:2mm;bottom:0;width:46mm;transform:rotate(3deg)}
.cover .stage .ph.p2{right:46mm;bottom:10mm;width:40mm;transform:rotate(-4deg);opacity:.96}
.cover .bot{position:absolute;bottom:8mm;right:22mm;left:18mm;display:flex;justify-content:space-between;font-size:8.4pt;color:#bdbdbd}
.cover .bot b{color:#fff}
/* الرحلة */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-top:6mm}
.kpi{border-radius:4mm;padding:3.6mm 2mm;text-align:center;background:linear-gradient(180deg,#fff,#f6f6f6);border:1px solid #e6e6e6}
.kpi b{display:block;font-size:24pt;color:#c8102e;line-height:1.05}
.kpi small{font-size:8.6pt;color:#555;font-weight:800}
.road{margin-top:7mm;position:relative;padding-inline-start:16mm}
.road::before{content:'';position:absolute;top:3mm;bottom:3mm;inset-inline-start:6.4mm;width:1.4mm;border-radius:1mm;background:linear-gradient(#c8102e,#111)}
.rs{position:relative;display:flex;align-items:center;gap:4mm;margin-bottom:3.1mm;background:#fff;border:1px solid #ececec;border-radius:3.6mm;padding:2.4mm 3.6mm;box-shadow:0 2mm 4mm -3mm rgba(0,0,0,.25)}
.rs .dot{position:absolute;right:-14.4mm;top:50%;transform:translateY(-50%);width:10mm;height:10mm;border-radius:50%;color:#fff;font-weight:900;font-size:10pt;display:grid;place-items:center;box-shadow:0 0 0 1.2mm #fff,0 1.6mm 3mm rgba(0,0,0,.35)}
.rs b{font-size:12pt;font-weight:900;min-width:50mm}
.rs small{font-size:8.8pt;color:#555;line-height:1.5;flex:1}
.rs em{font-style:normal;font-size:8pt;font-weight:900;color:#fff;background:#111;border-radius:99px;padding:.6mm 2.6mm;white-space:nowrap}
/* الفهرس */
.toc{columns:2;column-gap:7mm;margin-top:5mm}
.toc .tg{break-inside:avoid;margin-bottom:4mm}
.toc .tg h4{font-size:11pt;font-weight:900;display:flex;align-items:center;gap:2mm;padding-bottom:1mm;border-bottom:1.2px solid #111;margin-bottom:1.4mm}
.toc .tg h4 i{font-style:normal;color:#fff;border-radius:1.6mm;padding:0 1.8mm;font-size:8.6pt}
.toc .row{display:flex;align-items:baseline;gap:1.6mm;font-size:9.2pt;line-height:1.75}
.toc .row .d{flex:1;border-bottom:1px dotted #bbb;transform:translateY(-1mm)}
.toc .row .n{font-weight:900;color:#c8102e;font-size:9pt}
/* فاصل المرحلة */
.sec-open{color:#fff;padding:0}
.sec-open .grid{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.08) 1px,transparent 1.2px);background-size:6mm 6mm}
.sec-open .in{position:absolute;inset:0;padding:38mm 20mm 0;display:flex;flex-direction:column;justify-content:flex-start}
.sec-open .st{font-size:10pt;letter-spacing:.3em;font-weight:800;opacity:.75}
.sec-open .nn{font-size:96pt;line-height:.95;color:#fff;opacity:.95}
.sec-open h2{font-size:34pt;margin-top:3mm;line-height:1.15}
.sec-open .en{font-size:12pt;opacity:.7;font-weight:700;margin-top:1mm}
.sec-open p{font-size:13pt;margin-top:5mm;max-width:150mm;line-height:1.8;opacity:.92}
.sec-open .chips{display:flex;flex-wrap:wrap;gap:2.4mm;margin-top:8mm;max-width:112mm}
.sec-open .chips span{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:1.2mm 4mm;font-size:9.6pt;font-weight:700}
.sec-open .side{position:absolute;bottom:20mm;left:18mm;width:52mm;transform:rotate(-5deg)}
.sec-open .band{position:absolute;bottom:0;left:0;right:0;height:7mm;background:rgba(0,0,0,.35)}
/* صفحة الخدمات: جوج خدمات */
.sv .ph-head{display:flex;align-items:center;gap:3mm;padding-bottom:2.4mm;border-bottom:1.4px solid #111;margin-bottom:4mm}
.sv .ph-head i{font-style:normal;color:#fff;font-weight:900;border-radius:2mm;padding:.4mm 2.6mm;font-size:9pt}
.sv .ph-head b{font-size:12pt;font-weight:900}
.sv .ph-head small{margin-inline-start:auto;font-size:8.4pt;color:#888;font-weight:700}
.card{display:grid;grid-template-columns:1fr 54mm;gap:6mm;align-items:center;height:115mm;padding:4mm 0;border-bottom:.6px dashed #d8d8d8}
.card:last-of-type{border-bottom:0}
.card.alt{grid-template-columns:54mm 1fr}
.card.alt .tx{order:2}
.card .vis{display:flex;justify-content:center;align-items:center}
.card .vis .ph{width:50mm}
.card .vis .lap{width:56mm}
.card .num{font-size:9pt;font-weight:900;color:#fff;background:var(--c);border-radius:99px;padding:.4mm 3mm;display:inline-block}
.card h3{font-size:19pt;line-height:1.2;margin-top:2mm;display:flex;align-items:center;gap:2.2mm}
.card h3 i{font-style:normal;font-size:17pt}
.card .en{font-size:9pt;color:#888;font-weight:700;margin-top:.4mm;unicode-bidi:plaintext;text-align:start}
.card .what{margin-top:3mm;font-size:10.6pt;line-height:1.75;color:#222}
.card h4{font-size:9.6pt;font-weight:900;margin-top:3.4mm;color:#111}
.card ol{margin:1.4mm 0 0;padding:0;list-style:none;counter-reset:s}
.card ol li{counter-increment:s;position:relative;padding-inline-start:7mm;margin-bottom:1.2mm;font-size:9.8pt;line-height:1.55}
.card ol li::before{content:counter(s);position:absolute;inset-inline-start:0;top:.2mm;width:5mm;height:5mm;border-radius:50%;background:var(--c);color:#fff;font-size:7.6pt;font-weight:900;display:grid;place-items:center}
.card .gain{margin-top:3.4mm;border-radius:3.4mm;padding:2.6mm 3.6mm;background:linear-gradient(135deg,#fff5f6,#fff);border:1px solid #f1cdd3;font-size:10pt;font-weight:800;color:#7a0d1c;line-height:1.6;display:flex;gap:2mm}
.card .gain::before{content:'${T.gain}';color:#c8102e;white-space:nowrap}
/* العرض والأمان */
.offer{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-top:4mm}
.offer div{border:1.2px solid #111;border-radius:4mm;padding:3mm;text-align:center}
.offer div i{font-style:normal;font-size:16pt;display:block}
.offer b{display:block;font-size:11.4pt;margin-top:.6mm;font-weight:900}.offer small{color:#555;font-size:8.8pt}
.feats{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-top:4mm}
.feats div{background:#f6f6f6;border-radius:4mm;padding:3.2mm}
.feats i{font-style:normal;font-size:16pt;display:block}
.feats b{display:block;font-size:10.2pt;margin-top:1mm;font-weight:900}.feats small{color:#444;font-size:8.6pt;line-height:1.5;display:block}
.faq{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:4mm}
.faq div{border-inline-start:1.2mm solid #c8102e;background:#fafafa;border-radius:0 3mm 3mm 0;padding:2.4mm 3.4mm}
.faq b{display:block;font-size:9.8pt;font-weight:900}.faq small{font-size:8.8pt;color:#444;line-height:1.55}
/* الختام */
.end{background:#0b0b0b;color:#fff}
.end .grid{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1.2px);background-size:6mm 6mm}
.end .in{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6mm}
.end img.lg{width:78mm;height:auto}
.end h2{font-size:27pt;line-height:1.3}
.end h2 span{color:#ff4d63}
.end .slog{font-size:15pt;color:#ffcfd6;font-weight:800}
.end .qr{background:#fff;border-radius:4mm;padding:4mm;width:48mm;height:48mm}
.end .qr svg{width:100%;height:100%;display:block}
.end .ct{font-size:11pt;line-height:2;color:#ddd}
.end .ct b{color:#fff}
.end .band{position:absolute;bottom:0;left:0;right:0;height:7mm;background:#c8102e}
${FRL ? `.rs .dot{right:auto;left:-14.4mm}.sec-open .side{left:auto;right:18mm;transform:rotate(5deg)}.cover .band{right:auto;left:0}.cover .top{right:18mm;left:22mm}.cover .bot{right:18mm;left:22mm}.rs b{min-width:58mm}.cover h1{font-size:33pt}.rs{margin-bottom:2.6mm;padding:2mm 3.4mm}.rs small{font-size:8.3pt;line-height:1.42}.offp .lead{font-size:10.2pt;line-height:1.6;margin-top:2.4mm}.offp .offer{gap:2.4mm}.offp .offer div{padding:2.2mm}.offp .feats{gap:2.4mm}.offp .feats div{padding:2.6mm}.offp .feats small{font-size:8pt;line-height:1.4}.offp .faq small{font-size:8.3pt;line-height:1.45}.offp h2.big[style]{margin-top:5mm!important}` : ''}
`;

const pages = []; const foot = label => `<div class="foot"><span><img src="${LOGO_D}" alt=""> &nbsp;${T.app} <b>${BRAND}</b> — ${T.cat}</span><span>${e(label || '')}</span><span class="lat">${pages.length + 1}</span></div>`;
const NS = ALL.length;
// 1) الغلاف
pages.push(`<section class="pg cover dk"><div class="grid"></div><div class="glow"></div><div class="band"></div>
  <div class="top"><img class="lg" src="${LOGO_W}" alt="${BRAND}">
    <div class="kk">CATALOGUE COMPLET · الكتالوج الشامل</div>
    <h1 class="emb">${T.h1}</h1>
    <p class="sub">${T.sub(NS, C.stages.length)}</p>
    <div class="pills">${C.stages.map(s => `<span>${e(s.n)} · ${e(s.t)}</span>`).join('')}</div></div>
  <div class="stage">${phone('desk-home')}${phone('home-groups', 'p2')}${phone('agent-quick')}</div>
  <div class="bot"><span>${T.place} · <b class="lat">2026</b></span><span>${T.ver} <b class="lat">v${e(VER)}</b></span></div></section>`);
// 2) الرحلة: المراحل
pages.push(`<section class="pg"><div class="kick">${T.road}</div>
  <h2 class="big emb">${T.roadH}</h2>
  <p class="lead">${T.roadP}</p>
  <div class="kpis">${[[String(NS), T.kpi0], ...C.kpis.slice(1)].map(([n, t]) => `<div class="kpi"><b class="lat emb">${e(n)}</b><small>${e(t)}</small></div>`).join('')}</div>
  <div class="road">${C.stages.map(s => `<div class="rs"><span class="dot lat" style="background:${s.c}">${e(s.n)}</span><b>${e(s.t)}</b><small>${e(s.p)}</small><em>${T.nsv(s.items.length)}</em></div>`).join('')}</div>
  ${foot(T.roadL)}</section>`);
// 3) الفهرس (أرقام الصفحات كتتعمر من بعد)
const TOC_AT = pages.length; pages.push('');
// 4) المراحل والخدمات
const pageOf = {}; let k = 0;
C.stages.forEach((s, si) => {
  const sideShot = s.items[0].shot;
  pages.push(`<section class="pg sec-open dk" style="background:linear-gradient(150deg,${s.c} 0%,#0b0b0b 78%)"><div class="grid"></div><div class="in">
    <div class="st">${T.st}</div><div class="nn lat emb">${e(s.n)}</div><h2 class="emb">${e(s.t)}</h2><div class="en">${e(s.en)}</div>
    <p>${e(s.p)}</p><div class="chips">${s.items.map(x => `<span>${x.ic} ${e(x.t)}</span>`).join('')}</div></div>
    ${/^desk-/.test(sideShot) ? '' : `<div class="side">${phone(sideShot)}</div>`}<div class="band"></div></section>`);
  for (let i = 0; i < s.items.length; i += 2) {
    const pair = s.items.slice(i, i + 2);
    const cards = pair.map((x, j) => { k++; pageOf[x.t] = pages.length + 1;
      return `<article class="card ${(k % 2) ? '' : 'alt'}" style="--c:${s.c}"><div class="tx"><span class="num lat">${two(k)} / ${NS}</span>
        <h3 class="emb"><i>${x.ic}</i>${e(x.t)}</h3><div class="en">${e(x.en)}</div>
        <p class="what">${e(x.what)}</p>
        <h4>${T.how}</h4><ol>${x.how.map(h => `<li>${e(h)}</li>`).join('')}</ol>
        <div class="gain">${e(x.gain)}</div></div>
        <div class="vis">${phone(x.shot)}</div></article>`; }).join('');
    pages.push(`<section class="pg sv"><div class="ph-head"><i class="lat" style="background:${s.c}">${e(s.n)}</i><b>${e(s.t)}</b><small>${e(s.en)}</small></div>${cards}${foot(s.t)}</section>`);
  }
});
// 5) العرض والأمان والأسئلة
pages.push(`<section class="pg offp"><div class="kick">${T.offK}</div>
  <h2 class="big emb">${T.offH}</h2>
  <p class="lead">${T.offP}</p>
  <div class="offer">${BASE_C.offer.map(([i, t, s]) => `<div><i>${i}</i><b>${e(t)}</b><small>${e(s)}</small></div>`).join('')}</div>
  <h2 class="big emb" style="margin-top:7mm;font-size:19pt">${T.secH}</h2>
  <div class="feats">${(FRL ? BASE_C.security : [...BASE_C.security.slice(0, 7), ['🛡️', 'مراقبة الأمان', 'تنبيه ملي يدخل شي حد مشبوه، وطرد من كل الأجهزة بضغطة.']]).map(([i, t, s]) => `<div><i>${i}</i><b>${e(t)}</b><small>${e(s)}</small></div>`).join('')}</div>
  <h2 class="big emb" style="margin-top:7mm;font-size:19pt">${T.faqH}</h2>
  <div class="faq">${BASE_C.faq.slice(0, 4).map(([q, a]) => `<div><b>${e(q)}</b><small>${e(a)}</small></div>`).join('')}</div>
  ${foot(T.offL)}</section>`);
// 6) الختام
pages.push(`<section class="pg end dk"><div class="grid"></div><div class="in">
  <img class="lg" src="${LOGO_W}" alt="${BRAND}">
  <h2 class="emb">${T.endH}</h2><p class="slog">${T.slog}</p>
  <div class="qr" id="qr"></div>
  <p class="ct">${T.ct(APP_URL)}</p></div><div class="band"></div></section>`);
// الفهرس
const toc = `<section class="pg"><div class="kick">${T.tocK}</div>
  <h2 class="big emb">${T.tocH(NS, C.stages.length)}</h2>
  <div class="toc">${C.stages.map(s => `<div class="tg"><h4><i class="lat" style="background:${s.c}">${e(s.n)}</i>${e(s.t)}</h4>${s.items.map(x => `<div class="row"><span>${x.ic} ${e(x.t)}</span><span class="d"></span><span class="n lat">${pageOf[x.t]}</span></div>`).join('')}</div>`).join('')}</div>
  <div class="foot"><span><img src="${LOGO_D}" alt=""> &nbsp;${T.app} <b>${BRAND}</b> — ${T.cat}</span><span>${T.tocL}</span><span class="lat">${TOC_AT + 1}</span></div></section>`;
pages[TOC_AT] = toc;

const html = `<!doctype html><html lang="${FRL ? 'fr' : 'ar'}" dir="${FRL ? 'ltr' : 'rtl'}"><head><meta charset="utf-8"><style>${css}</style></head><body>${pages.join('')}
<script src="${u(path.join(APP, 'vendor/qrcode.js'))}"></script><script>const q=qrcode(0,'M');q.addData(${JSON.stringify(APP_URL)});q.make();document.getElementById('qr').innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});</script></body></html>`;
(async () => {
  const tmp = path.join(path.dirname(OUT), '_catalog.html'); fs.writeFileSync(tmp, FRL ? html.replace(/’/g, "'") : html);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage();
  await p.goto('file://' + tmp, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(900);
  // فحص: حتى صفحة ما خرجات، وحتى عنصر ما دخل تحت التذييل
  const over = await p.$$eval('.pg', a => a.map((s, i) => { const f = s.querySelector('.foot'); const fb = f ? f.getBoundingClientRect().top : s.getBoundingClientRect().bottom;
    let mx = 0; s.querySelectorAll('.card, .road, .toc, .offer, .feats, .faq, .kpis').forEach(x => { mx = Math.max(mx, x.getBoundingClientRect().bottom); });
    let tx = 0; s.querySelectorAll('.card .tx').forEach(x => { tx = Math.max(tx, x.scrollHeight - x.parentElement.clientHeight); });
    return [i + 1, Math.round(s.scrollHeight - s.clientHeight), Math.round(mx - fb), tx]; }).filter(x => x[1] > 2 || x[2] > 0 || x[3] > 0));
  if (over.length) console.log('OVERFLOW [page, scroll, underFooter, cardText]', JSON.stringify(over));
  if (process.env.PNG) { for (const n of process.env.PNG.split(',')) { const el = (await p.$$('.pg'))[+n - 1]; if (el) await el.screenshot({ path: `${process.env.PNGDIR}/cg-${n}.png` }); } }
  await p.pdf({ path: OUT, preferCSSPageSize: true, printBackground: true });
  await b.close(); if (!process.env.KEEP) fs.unlinkSync(tmp);
  console.log('PDF', OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB', 'pages', pages.length, 'services', NS);
})();
