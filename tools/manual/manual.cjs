// «الدليل الشامل لتطبيق مجموعة الوسيط» — PDF A4 بالعربية (الغلاف، الفهرس، فصل لكل خدمة بالصور، العرض، الأمان، الأسئلة)
// الاستعمال: 1) NODE_PATH=$(npm root -g) node tools/manual/shots.cjs SHOTS   2) NODE_PATH=$(npm root -g) node tools/manual/manual.cjs SHOTS OUT.pdf
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const C = require('./content.cjs');
const APP = path.join(__dirname, '..', '..', 'docs', 'bureau'); const SH = path.resolve(process.argv[2]); const OUT = path.resolve(process.argv[3]);
const VER = (fs.readFileSync(path.join(APP, 'sw.js'), 'utf8').match(/w777-bureau-v(\d+)/) || [])[1] || '';
const APP_URL = 'https://alwasset777-ai.github.io/alwasset777/bureau/';
const u = f => 'file://' + f; const img = n => u(path.join(SH, n + '.jpg'));
const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PART = Object.fromEntries(C.parts.map(p => [p.id, p]));
const fonts = [400, 500, 700, 800, 900].map(w => ['arabic', 'latin'].map(s => `@font-face{font-family:'Tajawal';font-weight:${w};src:url(${u(path.join(APP, 'fonts', `tajawal-${s}-${w}-normal.woff2`))}) format('woff2')}`).join('')).join('');
const phone = (n, cls = '') => `<div class="ph ${cls}"><img src="${img(n)}" alt=""></div>`;

const css = `${fonts}
@page{size:A4;margin:0}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:'Tajawal',sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:10.6pt;line-height:1.7}
.pg{width:210mm;height:297mm;position:relative;overflow:hidden;break-after:page;padding:16mm 15mm 14mm}
.pg:last-child{break-after:auto}
.lat{direction:ltr;unicode-bidi:isolate;display:inline-block}
h1,h2,h3,p{margin:0}
.foot{position:absolute;bottom:7mm;left:15mm;right:15mm;display:flex;justify-content:space-between;align-items:center;font-size:7.6pt;color:#8a8a8a;border-top:.5px solid #e2e2e2;padding-top:2.4mm}
.foot b{color:#c8102e}
/* الغلاف */
.cover{background:#0d0d0d;color:#fff;padding:0}
.cover .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:9mm 9mm}
.cover .band{position:absolute;top:0;bottom:0;right:0;width:11mm;background:#c8102e}
.cover .top{position:absolute;top:20mm;right:24mm;left:18mm}
.cover .top img{width:62mm;height:auto;display:block}
.cover .kick{margin-top:9mm;font-size:9pt;letter-spacing:.32em;color:#e8c4ca;font-weight:700}
.cover h1{margin-top:3mm;font-size:39pt;line-height:1.08;font-weight:900}
.cover h1 span{color:#c8102e}
.cover .sub{margin-top:5mm;font-size:13.5pt;color:#d8d8d8;font-weight:500;max-width:150mm}
.cover .chips{margin-top:7mm;display:flex;flex-wrap:wrap;gap:2.2mm;max-width:160mm}
.cover .chips span{border:1px solid rgba(255,255,255,.28);border-radius:99px;padding:1mm 3.6mm;font-size:8.6pt;color:#eee}
.cover .phones{position:absolute;bottom:26mm;left:14mm;right:26mm;height:122mm}
.cover .phones .ph{position:absolute;width:56mm}
.cover .phones .p1{left:0;bottom:0;transform:rotate(-8deg)}
.cover .phones .p2{left:58mm;bottom:12mm;width:62mm;z-index:2}
.cover .phones .p3{left:124mm;bottom:0;transform:rotate(8deg)}
.cover .bot{position:absolute;bottom:10mm;right:24mm;left:18mm;display:flex;justify-content:space-between;font-size:8.6pt;color:#bdbdbd}
.cover .bot b{color:#fff}
.ph{border-radius:7mm;padding:1.6mm;background:#111;box-shadow:0 6mm 14mm -6mm rgba(0,0,0,.55),0 0 0 .4mm #2c2c2c inset}
.ph img{display:block;width:100%;height:auto;border-radius:5.6mm}
/* صفحات عامة */
.kick{font-size:8.4pt;letter-spacing:.26em;color:#8a8a8a;font-weight:700}
.big{font-size:25pt;font-weight:900;line-height:1.2;margin-top:2mm}
.big span{color:#c8102e}
.lead{margin-top:4mm;font-size:11.6pt;color:#333;line-height:1.85}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-top:8mm}
.kpi{border:1px solid #e6e6e6;border-radius:4mm;padding:4mm 3mm;text-align:center;background:#fafafa}
.kpi b{display:block;font-size:22pt;font-weight:900;color:#c8102e;line-height:1.1}
.kpi small{font-size:8.6pt;color:#555;font-weight:700}
.who{display:grid;grid-template-columns:repeat(7,1fr);gap:2.4mm;margin-top:7mm}
.who div{border-radius:4mm;background:#111;color:#fff;text-align:center;padding:4mm 1mm;font-size:8.4pt;font-weight:700}
.who div i{display:block;font-style:normal;font-size:17pt;margin-bottom:1mm}
.pillars{display:grid;grid-template-columns:1fr 1fr;gap:3.4mm;margin-top:8mm}
.pillar{border-inline-start:1.4mm solid #c8102e;background:#f6f6f6;border-radius:0 3mm 3mm 0;padding:3.2mm 4mm}
.pillar b{font-size:11pt}.pillar p{font-size:9.2pt;color:#444;margin-top:.6mm;line-height:1.6}
/* الفهرس */
.toc{margin-top:6mm;columns:2;column-gap:9mm}
.toc .tp{break-inside:avoid;margin-bottom:4.6mm}
.toc .tp h3{font-size:11pt;font-weight:900;display:flex;gap:2mm;align-items:center;padding-bottom:1.4mm;border-bottom:1.2px solid #111;margin-bottom:1.4mm}
.toc .tp h3 i{font-style:normal;width:7mm;height:7mm;border-radius:2mm;display:inline-grid;place-items:center;color:#fff;font-size:9pt}
.toc .row{display:flex;gap:2mm;font-size:9.6pt;padding:.7mm 0;border-bottom:.5px dotted #cfcfcf}
.toc .row b{color:#c8102e;min-width:7mm}.toc .row span{flex:1}.toc .row em{font-style:normal;color:#8a8a8a}
/* الفصول */
.ch .head{display:flex;align-items:flex-start;gap:4mm;padding-bottom:3mm;border-bottom:1.4px solid #111}
.ch .num{font-size:30pt;font-weight:900;line-height:.95;color:#c8102e;min-width:16mm}
.ch .head h2{font-size:19pt;font-weight:900;line-height:1.25}
.ch .head small{display:block;font-size:9.6pt;color:#666;font-weight:700;margin-top:.6mm}
.ch .part{margin-inline-start:auto;font-size:8pt;font-weight:800;color:#fff;border-radius:99px;padding:.8mm 3.4mm;white-space:nowrap;align-self:flex-start}
.ch .intro{margin-top:4mm;font-size:11.2pt;line-height:1.85;color:#222}
.ch .body{display:grid;grid-template-columns:1fr auto;gap:7mm;margin-top:5mm;align-items:start}
.ch .phones{display:flex;gap:4mm;justify-content:center}
.ch .phones .ph{width:60mm}
.ch .phones.one .ph{width:68mm}
.ch h4{font-size:10.6pt;font-weight:900;margin:0 0 2mm;display:flex;align-items:center;gap:1.6mm}
.ch h4 i{font-style:normal;width:5.4mm;height:5.4mm;border-radius:1.4mm;background:#c8102e;color:#fff;display:inline-grid;place-items:center;font-size:7.6pt}
.ch ol{margin:0;padding:0;list-style:none;counter-reset:s}
.ch ol li{counter-increment:s;position:relative;padding-inline-start:8mm;margin-bottom:2.2mm;font-size:9.9pt;line-height:1.65}
.ch ol li::before{content:counter(s);position:absolute;inset-inline-start:0;top:.4mm;width:5.6mm;height:5.6mm;border-radius:50%;background:#111;color:#fff;font-size:8pt;font-weight:800;display:grid;place-items:center}
.ch .feats{display:flex;flex-wrap:wrap;gap:1.8mm;margin-top:4mm}
.ch .feats span{background:#f3f3f3;border:1px solid #e3e3e3;border-radius:99px;padding:.8mm 3mm;font-size:8.8pt;font-weight:700}
.ch .feats span::before{content:'✓ ';color:#0a7a2f;font-weight:900}
.ch .tip{margin-top:5mm;background:#111;color:#fff;border-radius:3.4mm;padding:3.6mm 4.4mm;font-size:9.8pt;line-height:1.7;display:flex;gap:3mm}
.ch .tip b{color:#ffcfd6;white-space:nowrap}
.ch.wide .body{grid-template-columns:1fr}
.ch.wide .phones{margin-top:2mm}
/* العرض والأمان */
.offer{display:grid;grid-template-columns:repeat(3,1fr);gap:3.4mm;margin-top:6mm}
.offer div{border:1.2px solid #111;border-radius:4mm;padding:4mm;text-align:center}
.offer div i{font-style:normal;font-size:20pt;display:block}
.offer b{display:block;font-size:12pt;margin-top:1mm}.offer small{color:#555;font-size:9pt}
.sec{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:6mm}
.sec div{display:flex;gap:3mm;align-items:flex-start;background:#f6f6f6;border-radius:3mm;padding:3mm 3.6mm}
.sec i{font-style:normal;font-size:15pt;line-height:1}
.sec b{display:block;font-size:10.4pt}.sec small{color:#444;font-size:9pt;line-height:1.55}
.faq{margin-top:5mm}
.faq div{border-bottom:.6px solid #ddd;padding:2.6mm 0}
.faq b{display:block;font-size:10.6pt}.faq b::before{content:'؟ ';color:#c8102e;font-weight:900}
.faq p{font-size:9.8pt;color:#333;margin-top:.6mm}
/* الختام */
.end{background:#0d0d0d;color:#fff}
.end .grid{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1.2px);background-size:6mm 6mm}
.end .in{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6mm}
.end img.lg{width:74mm;height:auto}
.end h2{font-size:24pt;font-weight:900}
.end .slog{font-size:15pt;color:#ffcfd6;font-weight:700}
.end .qr{background:#fff;border-radius:4mm;padding:4mm;width:46mm;height:46mm}
.end .qr svg{width:100%;height:100%;display:block}
.end .ct{font-size:11pt;line-height:2;color:#ddd}
.end .ct b{color:#fff}
.end .band{position:absolute;bottom:0;left:0;right:0;height:7mm;background:#c8102e}
`;

const foot = (n, label) => `<div class="foot"><span>تطبيق <b>مجموعة الوسيط</b> — الدليل الشامل</span><span>${e(label || '')}</span><span class="lat">${n}</span></div>`;
const pages = [];
// 1) الغلاف
pages.push(`<section class="pg cover"><div class="grid"></div><div class="band"></div>
  <div class="top"><img src="${u(path.join(APP, 'icons/brand/logo-flat-white.png'))}" alt="مجموعة الوسيط">
    <div class="kick">LE GUIDE COMPLET · الدليل الشامل</div>
    <h1>تطبيق <span>مجموعة الوسيط</span><br>مكتبك العقاري فجيبك</h1>
    <p class="sub">الشرح الكامل ديال التطبيق: كل خدمة، كيفاش تستعملها خطوة بخطوة، والمميزات اللي كتخليك تخدم بحال المحترفين.</p>
    <div class="chips">${['العقارات والزبناء', 'المطابقة الذكية', 'الكراء والمالية', 'التمويل والقرض', 'الإعلانات والفيديو', 'الوكيل «منير»', 'الشبكة المهنية', 'الأكاديمية والشهادة', '7 ألعاب'].map(x => `<span>${x}</span>`).join('')}</div></div>
  <div class="phones">${phone('learn', 'p1')}${phone('home', 'p2')}${phone('games', 'p3')}</div>
  <div class="bot"><span>مكناس · المملكة المغربية · <b class="lat">2026</b></span><span>النسخة <b class="lat">v${e(VER)}</b></span></div></section>`);
// 2) التطبيق فسطور
pages.push(`<section class="pg"><div class="kick">PRÉSENTATION · التطبيق فسطور</div>
  <h2 class="big">تطبيق واحد… <span>كل المهنة العقارية</span></h2>
  <p class="lead">«مجموعة الوسيط» تطبيق مغربي مصمم للمهنيين ديال العقار: كيجمع فبلاصة وحدة تسيير المكتب (العقارات، الزبناء، المواعيد، الكراء والمالية)، الأدوات الذكية (المطابقة، حساب القرض، مقارنة الأسعار، الوكيل «منير»)، التسويق (المنشورات، الفيديو، ملفات PDF)، وشبكة مهنية كاملة كتربط الوكالات والوسطاء والمقاولات والمستثمرين والموثقين داخل المغرب وخارجو. كيخدم من الهاتف والحاسوب، حتى بلا إنترنت، وبالعربية والفرنسية والإنجليزية.</p>
  <div class="kpis">${[['+40', 'خدمة وأداة'], ['7', 'فئات مهنية'], ['42', 'درس فالأكاديمية'], ['7', 'ألعاب عقارية'], ['25', 'أداة للوكيل «منير»'], ['+20', 'نموذج عقد'], ['3', 'استوديوهات إعلانية'], ['6', 'أشهر مجانية']].map(([n, t]) => `<div class="kpi"><b class="lat">${n}</b><small>${t}</small></div>`).join('')}</div>
  <h3 style="margin-top:9mm;font-size:13pt;font-weight:900">لمن هاد التطبيق؟</h3>
  <div class="who">${[['🏢', 'الوكالات'], ['🤝', 'الوسطاء'], ['🏗️', 'المقاولات'], ['🎨', 'التشطيب'], ['💼', 'المستثمرون'], ['⚖️', 'الموثقون'], ['🏘️', 'الوداديات']].map(([i, t]) => `<div><i>${i}</i>${t}</div>`).join('')}</div>
  <div class="pillars">${[['🏢 مكتب رقمي كامل', 'العقارات، الطلبات، المواعيد، الكراء، المالية والتقارير — منظمين ومتزامنين.'], ['🧠 ذكاء كيخدم معاك', 'المطابقة بالنسبة، الوكيل «منير» بالدارجة والصوت، والمخرج الذكي للفيديو.'], ['📣 تسويق احترافي', 'منشورات وفيديوهات وملفات PDF بهوية مكتبك، وكتالوج عمومي للزبناء.'], ['🌍 شبكة كتجيب الصفقات', 'عقارات الشبكة، الدليل، المشاريع، الحجز الفوري، والتعاون بين المكاتب.']].map(([t, p]) => `<div class="pillar"><b>${t}</b><p>${p}</p></div>`).join('')}</div>
  ${foot(2)}</section>`);
// 3) الفهرس
let n = 0; const chNo = C.chapters.map(() => ++n);
pages.push(`<section class="pg"><div class="kick">SOMMAIRE · الفهرس</div><h2 class="big">شنو كاين <span>فهاد الدليل</span></h2>
  <div class="toc">${C.parts.map(p => `<div class="tp"><h3><i style="background:${p.c}">${p.ic}</i>${e(p.t)}</h3>${C.chapters.map((c, i) => c.p === p.id ? `<div class="row"><b class="lat">${String(i + 1).padStart(2, '0')}</b><span>${e(c.t)}</span><em class="lat">${i + 4}</em></div>` : '').join('')}</div>`).join('')}
    <div class="tp"><h3><i style="background:#111">★</i>فالأخير</h3>${[['عرض 777 والاشتراك', C.chapters.length + 4], ['الأمان والخصوصية', C.chapters.length + 4], ['أسئلة متكررة', C.chapters.length + 5]].map(([t, pg]) => `<div class="row"><b>•</b><span>${t}</span><em class="lat">${pg}</em></div>`).join('')}</div></div>
  ${foot(3)}</section>`);
// 4) الفصول
C.chapters.forEach((c, i) => {
  const P = PART[c.p], one = c.shots.length === 1;
  pages.push(`<section class="pg ch${one ? '' : ' wide'}"><div class="head"><div class="num lat">${String(i + 1).padStart(2, '0')}</div><div><h2>${c.ic} ${e(c.t)}</h2><small>${e(c.tag)}</small></div><span class="part" style="background:${P.c}">${P.ic} ${e(P.t)}</span></div>
    <p class="intro">${e(c.intro)}</p>
    <div class="body">${one ? `<div><h4><i>✓</i>كيفاش تستعملها</h4><ol>${c.steps.map(s => `<li>${e(s)}</li>`).join('')}</ol><h4 style="margin-top:4mm"><i>★</i>المميزات</h4><div class="feats">${c.feats.map(f => `<span>${e(f)}</span>`).join('')}</div></div><div class="phones one">${phone(c.shots[0])}</div>`
      : `<div class="phones">${c.shots.map(s => phone(s)).join('')}</div><div style="display:grid;grid-template-columns:1.25fr 1fr;gap:6mm"><div><h4><i>✓</i>كيفاش تستعملها</h4><ol>${c.steps.map(s => `<li>${e(s)}</li>`).join('')}</ol></div><div><h4><i>★</i>المميزات</h4><div class="feats" style="margin-top:0">${c.feats.map(f => `<span>${e(f)}</span>`).join('')}</div></div></div>`}</div>
    <div class="tip"><b>💡 نصيحة:</b><span>${e(c.tip)}</span></div>
    ${foot(i + 4, P.t)}</section>`);
});
// 5) العرض + الأمان
const pn = C.chapters.length + 4;
pages.push(`<section class="pg"><div class="kick">OFFRE 777 · العرض والاشتراك</div><h2 class="big">عرض 777 <span>للأوائل</span></h2>
  <p class="lead">كل واحد كيتسجل كياخد رقم مقعد فالفئة ديالو، والامتياز كيتحدد بالترتيب. الرقم والامتياز والثمن ديال العام كيبانو فالرئيسية وفـ«حسابي». عدد الأعضاء بلا حد.</p>
  <div class="offer">${C.offer.map(([i, t, s]) => `<div><i>${i}</i><b>${e(t)}</b><small>${e(s)}</small></div>`).join('')}</div>
  <h2 class="big" style="margin-top:10mm;font-size:21pt">الأمان <span>والخصوصية</span></h2>
  <div class="sec">${C.security.map(([i, t, s]) => `<div><i>${i}</i><span><b>${e(t)}</b><small>${e(s)}</small></span></div>`).join('')}</div>
  ${foot(pn)}</section>`);
// 6) الأسئلة
pages.push(`<section class="pg"><div class="kick">FAQ · أسئلة متكررة</div><h2 class="big">عندك <span>سؤال؟</span></h2>
  <div class="faq">${C.faq.map(([q, a]) => `<div><b>${e(q)}</b><p>${e(a)}</p></div>`).join('')}</div>
  <div class="ch"><div class="tip" style="margin-top:8mm"><b>🤖 منير:</b><span>أي سؤال آخر؟ حل التطبيق وسول «منير» بالدارجة — ولا شوف «الدليل» فالقائمة: دروس قصيرة بالصور لكل خدمة.</span></div></div>
  ${foot(pn + 1)}</section>`);
// 7) الختام
pages.push(`<section class="pg end"><div class="grid"></div><div class="in">
  <img class="lg" src="${u(path.join(APP, 'icons/brand/logo-flat-white.png'))}" alt="مجموعة الوسيط">
  <h2>جاهز تبدا؟</h2><p class="slog">مع الوسيط… حلك بسيط</p>
  <div class="qr" id="qr"></div>
  <p class="ct">سكاني الرمز ولا حل: <b class="lat">${APP_URL}</b><br>التسجيل بالإيميل · 6 أشهر مجانية<br>📞 <b class="lat">0777 77 79 59</b> · <b class="lat">0777 77 78 48</b> — مكناس</p></div><div class="band"></div></section>`);

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${css}</style></head><body>${pages.join('')}
<script src="${u(path.join(APP, 'vendor/qrcode.js'))}"></script><script>const q=qrcode(0,'M');q.addData(${JSON.stringify(APP_URL)});q.make();document.getElementById('qr').innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});</script></body></html>`;
(async () => {
  const tmp = path.join(path.dirname(OUT), '_manual.html'); fs.writeFileSync(tmp, html);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); const p = await b.newPage();
  await p.goto('file://' + tmp, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  // فحص: حتى صفحة ما خرجات على 297mm
  const over = await p.$$eval('.pg', a => a.map((s, i) => [i + 1, s.scrollHeight - s.clientHeight]).filter(x => x[1] > 2));
  if (over.length) console.log('OVERFLOW', JSON.stringify(over));
  await p.pdf({ path: OUT, preferCSSPageSize: true, printBackground: true });
  await b.close(); if (!process.env.KEEP) fs.unlinkSync(tmp);
  console.log('PDF', OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + ' MB', 'pages', pages.length);
})();
