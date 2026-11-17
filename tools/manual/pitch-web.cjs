// صفحة عمومية «تعرّف على التطبيق» (docs/bureau/decouvrir.html) بالعربية والفرنسية — من نفس محتوى الملف التقديمي
// الاستعمال: node tools/manual/pitch-web.cjs SHOTS_AR SHOTS_FR   (الصور من shots.cjs + pitch-shots.cjs، والفرنسية بـ UI=fr)
// الصور كتتصغر لـ webp فـ docs/bureau/files/decouvrir/{ar,fr}/ (ImageMagick)
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const APP = path.join(__dirname, '..', '..', 'docs', 'bureau');
const SRC = { ar: path.resolve(process.argv[2]), fr: path.resolve(process.argv[3]) };
const L = { ar: require('./pitch-content.cjs'), fr: require('./pitch-content-fr.cjs') };
const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const two = n => String(n).padStart(2, '0');
const PDF = { ar: 'files/guide/malaf-taqdimi-majmouat-alwasset.pdf', fr: 'files/guide/dossier-presentation-groupe-alwasset-fr.pdf' };
// نصوص الصفحة (زايدة على نصوص الملف)
const W = {
  ar: { title: 'تعرّف على تطبيق مجموعة الوسيط', desc: 'فريق عمل كامل فجيبك: 13 مهمة كيقوم بها التطبيق، وحلول لكل مهنة عقارية — بالصور.', join: '✅ سجّل فابور (6 أشهر)', pdf: '📄 حمّل الملف PDF', share: '📤 شارك الصفحة',
    probs: 'المشكل والحل', team: 'الفريق اللي كيعوضو التطبيق', subs: 'حل لكل مشترك', start: 'كيفاش تبدا', toTop: 'فوق', shareMsg: '💼 تعرّف على تطبيق مجموعة الوسيط: فريق عمل كامل فجيبك' },
  fr: { title: 'Découvrir l’application Groupe Al Wasset', desc: 'Une équipe complète dans votre poche : 13 postes assurés par l’application et des solutions pour chaque métier de l’immobilier — en images.', join: '✅ Inscription gratuite (6 mois)', pdf: '📄 Télécharger le PDF', share: '📤 Partager la page',
    probs: 'Le constat', team: 'L’équipe que l’application remplace', subs: 'Une solution par métier', start: 'Démarrer', toTop: 'Haut', shareMsg: '💼 Découvrez l’application Groupe Al Wasset : une équipe complète dans votre poche' },
};
// 1) الصور: webp عرض 420 (كافي للتيليفون والحاسوب)
const shotsOf = C => [...new Set(['home2', 'desk-home', ...C.ui.steps.map(s => s[0]), ...C.roles.flatMap(r => r.shots), ...C.subs.flatMap(s => s.shots)])];
for (const lg of ['ar', 'fr']) {
  const out = path.join(APP, 'files', 'decouvrir', lg); fs.mkdirSync(out, { recursive: true });
  for (const n of shotsOf(L[lg])) {
    const src = path.join(SRC[lg], n + '.jpg'), dst = path.join(out, n + '.webp');
    if (!fs.existsSync(src)) { console.error('MISSING', lg, n); process.exit(1); }
    execFileSync('convert', [src, '-resize', n.startsWith('desk') ? '1100x' : '420x', '-strip', '-quality', '68', dst]);
  }
}
// 2) الصفحة
const img = (lg, n, cls = 'ph') => `<div class="${cls}"><img src="files/decouvrir/${lg}/${n}.webp" alt="" loading="lazy" decoding="async"></div>`;
const section = lg => {
  const C = L[lg], U = C.ui, w = W[lg], R = C.roles.length, T = s => String(s).replace(/\{R\}/g, R);
  return `<main class="lg-${lg}" lang="${lg}" dir="${U.dir}" data-lang="${lg}"${lg === 'ar' ? '' : ' hidden'}>
  <section class="hero"><div class="in">
    <div class="kk">${U.coverKick}</div>
    <h1>${U.coverH1}</h1>
    <p class="sub">${e(T(U.coverSub))}</p>
    <div class="cta"><a class="b red" href="./?gate=1" data-go="join">${w.join}</a><a class="b" href="${PDF[lg]}" download data-go="pdf">${w.pdf}</a><button class="b" type="button" data-share>${w.share}</button></div>
    <div class="kpis">${[[String(R), U.kpi[0]], ['+40', U.kpi[1]], ['7', U.kpi[2]], ['6', U.kpi[3]]].map(([n, t]) => `<div><b>${n}</b><small>${e(t)}</small></div>`).join('')}</div></div>
    <div class="stage">${img(lg, 'desk-home', 'lap')}${img(lg, 'home2')}</div></section>
  <section class="blk"><div class="kick">${U.k1}</div><h2>${U.h1}</h2><p class="lead">${e(U.lead1)}</p>
    <div class="probs">${C.problems.map(([i, t, p, f]) => `<div class="prob"><div class="pt"><i>${i}</i>${e(t)}</div><p>${e(p)}</p><div class="pf"><b>✓</b> ${e(f)}</div></div>`).join('')}</div></section>
  <section class="blk"><div class="kick">${U.k2}</div><h2>${T(U.h2)}</h2>
    <div class="team">${C.roles.map((r, i) => `<a class="tm" href="#r-${lg}-${i + 1}"><span class="n">${two(i + 1)}</span><i>${r.ic}</i><span><b>${e(r.t)}</b><small>${e(r.en)}</small></span></a>`).join('')}</div>
    <div class="note"><b>${U.noteT}</b> ${e(U.note)}</div></section>
  ${C.roles.map((r, i) => `<section class="blk role" id="r-${lg}-${i + 1}"><div class="rh"><span class="num">${two(i + 1)}</span><div><h3>${r.ic} ${e(r.t)}</h3><small>${e(r.en)}</small></div></div>
    <p class="job"><b>${U.jobT}</b> ${e(r.job)}</p>
    <div class="two"><ul class="ok">${r.does.map(d => `<li>${e(d)}</li>`).join('')}</ul>
      <div class="ba"><div class="b4"><small>✕ ${U.before}</small>${e(r.before)}</div><div class="af"><small>✓ ${U.after}</small>${e(r.after)}</div></div></div>
    <div class="shots">${r.shots.map(s => img(lg, s)).join('')}</div></section>`).join('')}
  <section class="blk"><div class="kick">${U.k3}</div><h2>${U.h3}</h2><p class="lead">${e(U.lead3)}</p>
    <div class="tt">${C.times.map(([a, b, c]) => `<div class="tr"><b>${e(a)}</b><span class="no">✕ ${e(b)}</span><span class="yes">✓ ${e(c)}</span></div>`).join('')}</div>
    <p class="disc">${e(U.disc)}</p><div class="note"><b>${U.sumT}</b> ${e(U.sum)}</div></section>
  <section class="blk"><div class="kick">${U.k4.split('·')[0]}· ${e(w.subs)}</div><h2>${U.s2h}</h2><p class="lead">${e(U.s2p)}</p></section>
  ${C.subs.map(s => `<section class="blk sub"><div class="sh" style="background:${s.c}"><i>${s.ic}</i><div><small>${U.forT}</small><h3>${e(s.t)}</h3></div></div>
    <div class="cols"><div class="pain"><h4>${U.painT}</h4><ul>${s.pains.map(x => `<li>${e(x)}</li>`).join('')}</ul></div><div class="fix"><h4>${U.fixT}</h4><ul>${s.fix.map(x => `<li>${e(x)}</li>`).join('')}</ul></div></div>
    <div class="shots">${s.shots.map(x => img(lg, x)).join('')}</div></section>`).join('')}
  <section class="blk"><div class="kick">${U.k4}</div><h2>${U.h4}</h2>
    <div class="feats">${C.common.map(([i, t, s]) => `<div><i>${i}</i><b>${e(t)}</b><small>${e(s)}</small></div>`).join('')}</div>
    <h2 style="margin-top:28px">${U.h5}</h2>
    <div class="steps">${U.steps.map(([n, t, d], i) => `<div class="st">${img(lg, n)}<b><span>${i + 1}</span> ${e(t)}</b><small>${e(d)}</small></div>`).join('')}</div></section>
  <section class="blk"><div class="kick">${U.k5}</div><h2>${U.h6}</h2><p class="lead">${e(U.lead6)}</p>
    <div class="offer">${C.offer.map(([i, t, s]) => `<div><i>${i}</i><b>${e(t)}</b><small>${e(s)}</small></div>`).join('')}</div>
    <h2 style="margin-top:28px">${U.h7}</h2>
    <div class="feats">${C.security.slice(0, 6).map(([i, t, s]) => `<div><i>${i}</i><b>${e(t)}</b><small>${e(s)}</small></div>`).join('')}</div></section>
  <section class="end"><img src="icons/brand/logo-flat-white.webp" alt="${e(U.brand)}" width="220" height="116"><h2>${U.endH}</h2><p>${e(U.slogan)}</p>
    <div class="cta"><a class="b red" href="./?gate=1" data-go="join">${w.join}</a><a class="b" href="${PDF[lg]}" download data-go="pdf">${w.pdf}</a><button class="b" type="button" data-share>${w.share}</button></div>
    <p class="ct">📞 <span dir="ltr">0777 77 79 59</span> · <span dir="ltr">0777 77 78 48</span> — ${U.city}</p></section>
</main>`;
};
const css = `
:root{--red:#c8102e;--ink:#111;--mut:#5f6368;--line:#e6e6e6;--soft:#f6f6f6}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:#fff;color:var(--ink);font-family:'Tajawal',system-ui,sans-serif;font-size:16px;line-height:1.7;-webkit-text-size-adjust:100%}
img{max-width:100%;display:block}
.top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(13,13,13,.94);backdrop-filter:blur(8px);color:#fff}
.top img{height:38px;width:auto}.top .nm{font-weight:800;font-size:15px;white-space:nowrap}
@media (max-width:420px){.top .nm{display:none}}.top .sp{flex:1}
.top .lgs{display:flex;gap:4px;background:rgba(255,255,255,.1);border-radius:99px;padding:3px}
.top .lgs button{border:0;background:none;color:#fff;font:inherit;font-weight:800;font-size:13px;padding:5px 12px;border-radius:99px;cursor:pointer}
.top .lgs button.on{background:#fff;color:#111}
main{display:block}.hero .in,.blk{max-width:1100px;margin-inline:auto}.blk{width:100%}
.hero{background:#0d0d0d;color:#fff;padding:28px 16px 0;overflow:hidden;position:relative}
.hero::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:28px 28px}
.hero .in{position:relative}
.kk,.kick{font-size:11px;letter-spacing:.24em;font-weight:800}
.kk{color:#e8c4ca}.kick{color:#8a8a8a}
h1{font-size:30px;line-height:1.2;margin:10px 0 0;font-weight:900}h1 span,h2 span{color:var(--red)}
.hero h1 span{color:#ff4d5e}
.sub{color:#d8d8d8;font-size:16px;margin:12px 0 0}
.cta{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.b{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 18px;border-radius:14px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:inherit;font:inherit;font-weight:800;font-size:15px;text-decoration:none;cursor:pointer}
.b.red{background:var(--red);border-color:var(--red);color:#fff}
.blk .b,.end .b{border-color:var(--line)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:20px}
.kpis div{border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:10px 4px;text-align:center}
.kpis b{display:block;font-size:24px;color:#ff4d5e;line-height:1.1;direction:ltr}.kpis small{font-size:11.5px;color:#ccc;line-height:1.35;display:block}
.stage{position:relative;margin-top:24px;height:300px}
.stage .lap{position:absolute;inset-inline-start:0;bottom:-6px;width:86%;border:6px solid #222;border-bottom:0;border-radius:14px 14px 0 0;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,.6)}
.stage .ph{position:absolute;inset-inline-end:6px;bottom:-40px;width:150px}
.ph{border-radius:22px;padding:5px;background:#111;box-shadow:0 14px 30px -14px rgba(0,0,0,.55)}
.ph img{border-radius:18px;width:100%;height:auto}
.blk{padding:30px 16px;border-bottom:1px solid var(--line)}
h2{font-size:24px;line-height:1.3;margin:6px 0 0;font-weight:900}
h3{font-size:20px;margin:0;font-weight:900;line-height:1.3}
.lead{color:#333;margin:10px 0 0}
.probs{display:grid;gap:10px;margin-top:16px}
.prob{border:1px solid var(--line);border-radius:16px;overflow:hidden}
.prob .pt{display:flex;gap:8px;align-items:center;padding:12px 14px 2px;font-weight:900}.prob .pt i{font-style:normal;font-size:20px}
.prob p{margin:0;padding:0 14px 10px;color:var(--mut);font-size:14.5px}
.prob .pf{background:#111;color:#fff;padding:10px 14px;font-weight:700;font-size:14.5px}.prob .pf b{color:#ff8a99}
.team{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}
.tm{display:flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:10px;text-decoration:none;color:inherit}
.tm .n{background:var(--red);color:#fff;font-weight:900;font-size:11px;border-radius:7px;min-width:26px;height:26px;display:grid;place-items:center}
.tm i{font-style:normal;font-size:20px}.tm b{display:block;font-size:13.5px;line-height:1.35}.tm small{display:block;font-size:11px;color:#888;unicode-bidi:plaintext;text-align:start}
.note{margin-top:16px;background:#111;color:#fff;border-radius:16px;padding:14px 16px;font-size:15px}.note b{color:#ffcfd6}
.role .rh{display:flex;gap:12px;align-items:flex-start}
.role .num{font-size:34px;font-weight:900;color:var(--red);line-height:.95}
.role small{color:#777;font-weight:700;unicode-bidi:plaintext;display:block;text-align:start}
.job{background:var(--soft);border-inline-start:4px solid #999;border-radius:12px;padding:10px 14px;margin:14px 0 0;font-size:15px}
.two{display:grid;gap:12px;margin-top:14px}
ul.ok,.cols ul{list-style:none;margin:0;padding:0}
ul.ok li,.cols li{position:relative;padding-inline-start:28px;margin-bottom:8px;font-size:15px}
ul.ok li::before,.fix li::before{content:'✓';position:absolute;inset-inline-start:0;top:2px;width:20px;height:20px;border-radius:50%;background:#0a7a2f;color:#fff;font-size:11px;font-weight:900;display:grid;place-items:center}
.pain li::before{content:'✕';position:absolute;inset-inline-start:0;top:2px;width:20px;height:20px;border-radius:50%;background:var(--red);color:#fff;font-size:11px;font-weight:900;display:grid;place-items:center}
.ba{display:grid;gap:8px}.ba div{border-radius:14px;padding:10px 14px;font-size:15px}
.ba small{display:block;font-size:11px;font-weight:900;letter-spacing:.05em}
.b4{background:#fff3f4;border:1px solid #f3c5cb;color:#7a1220}.af{background:#effaf2;border:1px solid #bfe6c9;color:#0b5a25;font-weight:700}
.shots{display:flex;gap:14px;justify-content:center;margin-top:18px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x mandatory}
.shots .ph{flex:0 0 200px;scroll-snap-align:center}
.tt{display:grid;gap:8px;margin-top:14px}.tr{border:1px solid var(--line);border-radius:14px;padding:10px 14px;display:grid;gap:2px}
.tr .no{color:#9b1c2c;font-size:14px}.tr .yes{color:#0a7a2f;font-weight:800}
.disc{font-size:12.5px;color:#888;margin:6px 0 0}
.sub .sh{display:flex;gap:12px;align-items:center;color:#fff;border-radius:18px;padding:14px 16px}.sub .sh i{font-style:normal;font-size:30px}
.sub .sh small{opacity:.85;font-weight:700}
.cols{display:grid;gap:10px;margin-top:12px}.cols>div{border-radius:16px;padding:12px 14px}.cols h4{margin:0 0 8px;font-size:16px}
.pain{background:#fff3f4;border:1px solid #f3c5cb}.pain h4{color:#9b1c2c}.fix{background:#effaf2;border:1px solid #bfe6c9}.fix h4{color:#0a7a2f}
.feats,.offer{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
.feats div{background:var(--soft);border-radius:14px;padding:12px}.feats i,.offer i{font-style:normal;font-size:22px;display:block}
.feats b,.offer b{display:block;font-size:15px}.feats small,.offer small{color:#444;font-size:13px;line-height:1.5;display:block}
.offer div{border:1.5px solid #111;border-radius:14px;padding:12px;text-align:center}
.steps{display:grid;gap:16px;margin-top:14px}.st{text-align:center}.st .ph{width:170px;margin:0 auto}
.st b{display:block;margin-top:10px}.st b span{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--red);color:#fff;font-size:12px}
.st small{color:var(--mut)}
.end{background:#0d0d0d;color:#fff;text-align:center;padding:40px 16px;display:flex;flex-direction:column;align-items:center;gap:10px}
.end h2 span{color:#ff8a99}.end p{margin:0;color:#ffcfd6;font-weight:700}.end .cta{justify-content:center}.end .ct{color:#ccc;font-weight:500}
.end .b{border-color:rgba(255,255,255,.3)}
.fab{position:fixed;inset-inline-end:14px;bottom:14px;z-index:6;width:44px;height:44px;border-radius:50%;border:0;background:#111;color:#fff;font-size:18px;box-shadow:0 6px 16px rgba(0,0,0,.3);cursor:pointer}
@media (min-width:760px){
  .hero{padding:44px 32px 0}h1{font-size:44px}.stage{height:440px;max-width:860px;margin:30px auto 0}.stage .lap{width:640px;inset-inline-start:auto;inset-inline-end:150px}.stage .ph{width:210px}
  .blk{padding:44px 32px}h2{font-size:30px}
  .probs{grid-template-columns:1fr 1fr}.team{grid-template-columns:repeat(3,1fr)}
  .two{grid-template-columns:1fr 300px;align-items:start}.cols{grid-template-columns:1fr 1fr}
  .feats{grid-template-columns:repeat(3,1fr)}.offer{grid-template-columns:repeat(3,1fr)}.steps{grid-template-columns:repeat(3,1fr)}
  .tt{grid-template-columns:1fr 1fr}.shots .ph{flex-basis:230px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;
const js = `
(function () {
  'use strict';
  var Q = new URLSearchParams(location.search), M = document.querySelectorAll('main[data-lang]');
  var pick = function () { var q = Q.get('lang'); if (q === 'fr' || q === 'ar') return q;
    try { var s = localStorage.getItem('w777_page_lang'); if (s === 'fr' || s === 'ar') return s; } catch (e) {}
    return /^fr/i.test(navigator.language || '') ? 'fr' : 'ar'; };
  var W = ${JSON.stringify({ ar: { title: W.ar.title, desc: W.ar.desc, msg: W.ar.shareMsg }, fr: { title: W.fr.title, desc: W.fr.desc, msg: W.fr.shareMsg } })};
  var cur = 'ar';
  function set(lg) { cur = lg;
    M.forEach(function (m) { m.hidden = m.dataset.lang !== lg; });
    document.documentElement.lang = lg; document.documentElement.dir = lg === 'fr' ? 'ltr' : 'rtl';
    document.title = W[lg].title;
    document.querySelectorAll('.lgs button').forEach(function (b) { b.classList.toggle('on', b.dataset.lg === lg); b.setAttribute('aria-pressed', b.dataset.lg === lg); });
    try { localStorage.setItem('w777_page_lang', lg); } catch (e) {} }
  // 📊 العدّاد: النوع واللغة والطريقة فقط (بلا اسم ولا حساب)
  // 🔗 الرابط الخاص ديال المشترك (?ref=CODE): كيتحفظ فالجلسة
  var REF = (function () { var r = Q.get('ref') || ''; if (!/^[A-Za-z0-9_-]{1,24}$/.test(r)) { try { r = sessionStorage.getItem('w777_ref') || ''; } catch (e) { r = ''; } } else { try { sessionStorage.setItem('w777_ref', r); } catch (e) {} }
    return /^[A-Za-z0-9_-]{1,24}$/.test(r) ? r : ''; })();
  function log(kind, via, lang) { try { var C = window.__ALWASSET_SUPABASE__ || {}, u = String(C.url || '').replace(/\\/+$/, ''), k = C.anonKey || ''; if (!u || !k) return;
    fetch(u + '/rest/v1/rpc/w777_share_log', { method: 'POST', keepalive: true, credentials: 'omit', headers: { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_kind: kind, p_via: via, p_lang: lang, p_ref: REF || null }) }).catch(function () {}); } catch (e) {} }
  window.__w777_log = log;
  set(pick());
  document.querySelectorAll('.lgs button').forEach(function (b) { b.onclick = function () { set(b.dataset.lg); window.scrollTo(0, 0); }; });
  try { if (!sessionStorage.getItem('w777_page_seen')) { sessionStorage.setItem('w777_page_seen', '1'); log('page', 'view', cur); } } catch (e) { log('page', 'view', cur); }
  document.querySelectorAll('[data-go="join"]').forEach(function (a) { if (REF) a.href = './?gate=1&ref=' + REF; a.addEventListener('click', function () { log('page', 'join', cur); }); });
  document.querySelectorAll('[data-go="pdf"]').forEach(function (a) { a.addEventListener('click', function () { log(cur === 'fr' ? 'malaf_fr' : 'malaf', 'file', cur); }); });
  document.querySelectorAll('[data-share]').forEach(function (b) { b.onclick = function () {
    var url = location.href.split('#')[0].split('?')[0] + '?lang=' + cur + (REF ? '&ref=' + REF : ''), text = W[cur].msg;
    if (navigator.share) { navigator.share({ title: W[cur].title, text: text, url: url }).then(function () { log('page', 'link', cur); }).catch(function () {}); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(text + '\\n' + url), '_blank', 'noopener'); log('page', 'wa', cur); }; });
  var f = document.querySelector('.fab'); if (f) f.onclick = function () { window.scrollTo(0, 0); };
})();
`;
const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${e(W.ar.title)}</title>
  <meta name="description" content="${e(W.ar.desc)}">
  <meta property="og:title" content="${e(W.ar.title)}">
  <meta property="og:description" content="${e(W.ar.desc)}">
  <meta property="og:image" content="files/decouvrir/ar/home2.webp">
  <meta name="theme-color" content="#0d0d0d">
  <link rel="icon" href="icons/icon-192.png">
  <link rel="stylesheet" href="fonts.css">
  <!-- مولّدة بـ tools/manual/pitch-web.cjs — بدّل المحتوى فـ pitch-content*.cjs ماشي هنا -->
  <style>${css}</style>
</head>
<body>
  <header class="top"><img src="icons/brand/logo-flat-white.webp" alt="مجموعة الوسيط" width="72" height="38"><span class="nm">مجموعة الوسيط</span><span class="sp"></span>
    <div class="lgs" role="group" aria-label="Langue / اللغة"><button type="button" data-lg="ar">العربية</button><button type="button" data-lg="fr">Français</button></div></header>
  ${section('ar')}
  ${section('fr')}
  <button class="fab" type="button" aria-label="↑">↑</button>
  <script src="../app/config.js" onerror="void 0"></script>
  <script>${js}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(APP, 'decouvrir.html'), html);
const kb = d => Math.round(fs.readdirSync(d).reduce((n, f) => n + fs.statSync(path.join(d, f)).size, 0) / 1024);
console.log('decouvrir.html', Math.round(html.length / 1024) + ' KB', '| images ar', kb(path.join(APP, 'files/decouvrir/ar')) + ' KB', 'fr', kb(path.join(APP, 'files/decouvrir/fr')) + ' KB');
