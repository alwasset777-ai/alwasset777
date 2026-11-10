/* ============================================================
   الوسيط GAMES — 6 ألعاب عقارية بالمراحل (تسلية + تعليم) + «وصلة العقار» (wasla.js)
   W777_GAMES.hub(root)            ← صفحة 7 الشعارات (#/game)
   W777_GAMES.mount(root, id)      ← لعبة (#/game/<id>)
   التقدم (النجوم) محفوظ فالمتصفح: localStorage «w777_games»
   الأرقام القانونية والمصاريف تقريبية ومأخوذة من مراجع المكتب (للتأكد ديما مع الموثق)
   ============================================================ */
(function () {
  'use strict';
  const LS = 'w777_games';
  const IMG = 'game/img/';
  const WM = 'icons/games/wordmark.webp?v=1';
  const STAGES = 5;
  let GEN = 0; // غير نسخة وحدة خدامة (ملي كتبدل الصفحة، المؤقتات القديمة كتوقف)

  const GAMES = [
    { id: 'wasla', name: 'وصلة العقار', style: 'كلمات بالصور', icon: '🧩', color: '#c8102e' },
    { id: 'price', name: 'شحال يسوى؟', style: 'خمّن الثمن', icon: '🏷️', color: '#e67e22', how: 'كيبان ليك عقار حقيقي من السوق (النوع، الحي، المساحة). ختار الثمن الصحيح ولا قول واش الثمن رخيص، معقول ولا غالي. من بعد كل جواب كتعلم ثمن المتر فداك الحي.' },
    { id: 'scam', name: 'كاشف النصب', style: 'نصب ولا سليم؟', icon: '🕵️', color: '#6c3483', how: 'كتقرا حالة حقيقية (إعلان، رسالة، صفقة). قرر: 🚩 نصب / خطر ولا ✅ سليم. كل جواب كيعلمك علامة من علامات النصب باش تحمي راسك وزبناءك.' },
    { id: 'calc', name: 'الحاسبة السريعة', style: 'حساب ضد الساعة', icon: '⚡', color: '#1f6feb', how: 'حسابات العقار اليومية (ثمن المتر، السنتيم، العمولة، المصاريف، المردودية) ضد الساعة. كل ما جاوبتي أسرع كتربح نقط أكثر. الطريقة ديال الحساب كتبان من بعد كل سؤال.' },
    { id: 'law', name: 'صح ولا غلط', style: 'قانون العقار', icon: '⚖️', color: '#0a7a2f', how: 'جملة على قانون العقار فالمغرب (الكراء، الشراء، المصاريف، السانديك، القوانين الجديدة). قول صح ولا غلط، وتعلم الشرح والمرجع. (معلومات عامة — للتأكد ديما مع الموثق ولا المحامي)' },
    { id: 'tycoon', name: 'مليونير العقار', style: 'استثمر حتى المليون', icon: '💰', color: '#b8860b', how: 'عندك رأس مال صغير. كل عام كيبانو 3 عروض فالسوق: شري كاش ولا بالكريدي، خلص الأقساط، جمع الكراء، وبيع فالوقت المناسب. وصل للهدف قبل ما يسالي الوقت. المصاريف (7%)، العمولة، الضريبة والفراغ محسوبين.' },
    { id: 'build', name: 'بني دارك', style: 'بناء بالميزانية', icon: '🏗️', color: '#8d6e63', how: 'من البقعة حتى رخصة السكن: ختار فكل خطوة (المهندس، الرخصة، الدراسة، المقاول، التشطيب…). كمل الدار بلا ما تفوت الميزانية والمدة، وبجودة مزيانة. كل اختيار كيعلمك قاعدة فالبناء بالمغرب.' },
  ];
  const G = id => GAMES.find(g => g.id === id);

  // ---------- أدوات ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // الأرقام ديما معزولة (LTR) باش ما يتقلبوش وسط الجملة العربية
  const grp = n => '⁦' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '⁩';
  const nf = grp;
  const dh = n => nf(n) + ' د';
  const mil = n => { const m = n / 10000; return '⁦' + (Math.round(m * 10) / 10).toString().replace('.', ',') + '⁩ مليون'; };
  const pct = (n, d = 1) => '⁦' + (Math.round(n * 10 ** d) / 10 ** d).toString().replace('.', ',') + '%⁩';
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const round = (n, s) => Math.round(n / s) * s;
  const load = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } };
  const store = s => { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) { /* */ } };
  const prog = id => { const s = load(); return s[id] || { stars: [], best: [] }; };
  const starsOf = id => {
    if (id === 'wasla') { try { const w = JSON.parse(localStorage.getItem('w777_wasla') || '{}'); return Object.values((w.prog || {}).ar || {}).reduce((a, p) => a + (p.stars || 0), 0); } catch (e) { return 0; } }
    return (prog(id).stars || []).reduce((a, x) => a + (x || 0), 0);
  };
  const isOpen = (id, si) => si === 0 || ((prog(id).stars || [])[si - 1] || 0) > 0;
  function saveRes(id, si, stars, pts) {
    const s = load(), p = s[id] || { stars: [], best: [] };
    p.stars[si] = Math.max(p.stars[si] || 0, stars); p.best[si] = Math.max(p.best[si] || 0, pts || 0);
    s[id] = p; store(s);
  }
  const starTxt = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  // ثلاثة اختيارات غالطة مختلفة + الصحيح، مرتبين عشوائياً
  function mcq(ans, wrong, show) {
    const seen = new Set([show(ans)]), w = [];
    for (const x of wrong) { if (x == null || !(x > 0) || w.length >= 3) continue; const t = show(x); if (seen.has(t)) continue; seen.add(t); w.push(t); }
    let k = 2; while (w.length < 3) { const t = show(ans * (1 + 0.1 * k++)); if (!seen.has(t)) { seen.add(t); w.push(t); } }
    const opts = shuffle([show(ans), ...w]);
    return { opts, ans: opts.indexOf(show(ans)) };
  }
  let CRED = null;
  const credits = () => CRED || (CRED = fetch(IMG + 'credits.json').then(r => r.json()).catch(() => ({})));

  // ---------- الستايل ----------
  function css() {
    if (document.getElementById('gm-css')) return;
    const st = document.createElement('style');
    st.id = 'gm-css';
    st.textContent = `
.gm{--c:#c8102e;--k:#111;max-width:980px;margin:0 auto;color:var(--k)}
.gm *{box-sizing:border-box}
.gm-top{display:flex;align-items:center;gap:10px;background:var(--k);color:#fff;border-radius:18px;padding:10px 12px;border-bottom:4px solid var(--c)}
.gm-top h2{margin:0;font-size:19px;flex:1;line-height:1.2;min-width:0}.gm-top h2 small{display:block;font-size:12px;opacity:.75;font-weight:600}
.gm-top .gm-hl{width:52px;height:52px;border-radius:50%;background:#fff;border:2px solid var(--c);object-fit:cover;flex:0 0 52px}
.gm-top .gm-mi{width:46px;height:46px;flex:0 0 46px;border-radius:50%;background:#fff;border:3px solid var(--c);display:flex;align-items:center;justify-content:center;font-size:24px}
.gm-chip{background:#fff;color:var(--k);border-radius:999px;padding:5px 10px;font-weight:800;font-size:13px;white-space:nowrap}
.gm-ib{background:var(--c);color:#fff;border:0;border-radius:12px;min-width:40px;height:40px;font-size:18px;cursor:pointer;font-weight:800;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.gm-hub{display:flex;flex-wrap:wrap;justify-content:center;gap:16px 14px;margin:18px 0 8px}
.gm-lg{width:calc(50% - 7px);max-width:240px;text-decoration:none;color:var(--k);display:flex;flex-direction:column;align-items:center;gap:6px;animation:gmPop .55s cubic-bezier(.2,1.4,.4,1) both;animation-delay:calc(var(--i) * 80ms);-webkit-tap-highlight-color:transparent}
@media(min-width:720px){.gm-lg{width:calc(25% - 11px)}}
.gm-disc{position:relative;width:100%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 50% 35%,#fff 0 60%,#f4f4f4 100%);border:6px solid #707070;box-shadow:0 10px 24px rgba(0,0,0,.18),inset 0 0 0 4px #fff,inset 0 0 0 7px var(--c);container-type:inline-size;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;transition:transform .25s;animation:gmFloat 5s ease-in-out infinite;animation-delay:calc(var(--i) * -0.7s)}
.gm-lg:hover .gm-disc,.gm-lg:focus-visible .gm-disc{transform:rotate(-4deg) scale(1.05)}
.gm-lg:active .gm-disc{transform:scale(.95)}
.gm-disc .ic{font-size:13cqw;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}
.gm-disc .nm{font-weight:900;font-size:10.5cqw;line-height:1.08;max-width:80%;margin-top:1.5cqw;color:#141414;letter-spacing:-.2px}
.gm-disc .ln{display:block;width:62%;height:1.2cqw;min-height:2px;background:var(--c);border-radius:2px;margin:2.2cqw 0 1.6cqw;position:relative}
.gm-disc .ln::after{content:'';position:absolute;inset-inline-start:-1px;top:-2cqw;width:2.6cqw;height:2.6cqw;border-top:1.1cqw solid var(--c);border-inline-start:1.1cqw solid var(--c);transform:rotate(-45deg)}
.gm-disc img{width:66%;height:auto;display:block}
.gm-disc .st{margin-top:2cqw;background:var(--c);color:#fff;border-radius:999px;font-size:5.6cqw;font-weight:800;padding:.8cqw 3.4cqw;white-space:nowrap;max-width:82%;overflow:hidden;text-overflow:ellipsis}
.gm-new{position:absolute;top:2%;inset-inline-end:2%;background:#c8102e;color:#fff;font-size:5.5cqw;font-weight:900;border-radius:999px;padding:.6cqw 2.6cqw;box-shadow:0 3px 8px rgba(200,16,46,.4);animation:gmPulse 1.6s ease-in-out infinite}
.gm-sc{font-weight:800;font-size:13px;color:#555;display:flex;gap:6px;align-items:center}.gm-sc b{color:#e0a800;letter-spacing:1px}
.gm-intro{background:#fff;border:2px solid var(--k);border-radius:16px;padding:10px 14px;margin-top:12px;font-weight:700;line-height:1.6;font-size:14px}
@keyframes gmPop{from{opacity:0;transform:scale(.4) rotate(-12deg)}to{opacity:1;transform:none}}
@keyframes gmFloat{0%,100%{translate:0 0}50%{translate:0 -5px}}
@keyframes gmPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
@media(prefers-reduced-motion:reduce){.gm-lg,.gm-disc,.gm-new{animation:none}}
.gm-how{background:#fff;border:2px solid var(--k);border-radius:16px;padding:12px 14px;margin-top:12px;line-height:1.7;font-size:14px}
.gm-stg{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}
@media(min-width:720px){.gm-stg{grid-template-columns:1fr 1fr}}
.gm-s{display:flex;align-items:center;gap:12px;background:#fff;border:2px solid var(--k);border-radius:16px;padding:10px 12px;text-align:start;cursor:pointer;font:inherit;color:var(--k);box-shadow:0 4px 0 var(--c)}
.gm-s .n{width:46px;height:46px;flex:0 0 46px;border-radius:50%;background:var(--c);color:#fff;font-size:21px;font-weight:900;display:flex;align-items:center;justify-content:center}
.gm-s b{display:block;font-size:16px}.gm-s small{display:block;color:#666;font-size:12.5px;margin-top:2px}
.gm-s .sr{margin-inline-start:auto;color:#e0a800;font-size:17px;letter-spacing:1px;white-space:nowrap}
.gm-s.lk{opacity:.5;cursor:not-allowed;box-shadow:none}.gm-s.lk .n{background:#999}
.gm-s:not(.lk):active{transform:translateY(2px);box-shadow:0 2px 0 var(--c)}
.gm-bar{height:9px;background:#e7e7e7;border-radius:9px;overflow:hidden;margin-top:12px}.gm-bar i{display:block;height:100%;background:var(--c);transition:width .3s}
.gm-meta{display:flex;justify-content:space-between;gap:8px;font-weight:800;font-size:13.5px;margin:8px 2px 0;flex-wrap:wrap}
.gm-tm{height:6px;background:#eee;border-radius:6px;overflow:hidden;margin-top:6px}.gm-tm i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#c8102e,#ffb300);transform-origin:right;}
.gm-q{background:#fff;border:2px solid var(--k);border-radius:18px;padding:12px;margin-top:10px;box-shadow:0 6px 18px rgba(0,0,0,.08)}
.gm-img{width:100%;max-height:210px;object-fit:cover;border-radius:14px;display:block;background:#eee}
.gm-cred{font-size:10px;color:#888;margin:3px 2px 0;direction:ltr;text-align:left;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.gm-card{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.gm-card span{background:#f3f3f3;border-radius:10px;padding:5px 10px;font-weight:800;font-size:14px}
.gm-card span.big{background:var(--k);color:#fff}
.gm-qt{font-size:18px;font-weight:800;margin:10px 2px;line-height:1.55}
.gm-qt .tag{display:inline-block;background:var(--c);color:#fff;border-radius:8px;font-size:12px;padding:2px 8px;margin-inline-end:6px;vertical-align:middle}
.gm-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.gm-opts.n3,.gm-opts.n2{grid-template-columns:1fr}
@media(min-width:560px){.gm-opts.n2{grid-template-columns:1fr 1fr}}
.gm-o{min-height:54px;border-radius:14px;border:2px solid var(--k);background:#fff;font:inherit;font-size:16.5px;font-weight:900;cursor:pointer;color:var(--k);padding:8px;box-shadow:0 3px 0 var(--k);touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .08s}
.gm-o:not([disabled]):active{transform:translateY(2px);box-shadow:none}
.gm-o small{display:block;font-size:13px;font-weight:700;opacity:.75;margin-top:2px}
.gm-o.ok{background:#0a7a2f;color:#fff;border-color:#0a7a2f;box-shadow:0 3px 0 #055a20;animation:gmPop .35s}
.gm-o.bad{background:#c8102e;color:#fff;border-color:#c8102e;box-shadow:0 3px 0 #8a0b1f;animation:gmShake .4s}
.gm-o[disabled]{cursor:default}
@keyframes gmShake{0%,100%{translate:0}25%{translate:-6px}75%{translate:6px}}
.gm-why{margin-top:10px;border-radius:14px;padding:10px 12px;line-height:1.7;font-size:14.5px;border:2px solid}
.gm-why.y{background:#e8f5e9;border-color:#0a7a2f}.gm-why.n{background:#fdecee;border-color:#c8102e}
.gm-why b.t{display:block;font-size:16px;margin-bottom:2px}
.gm-next{display:block;width:100%;text-align:center;text-decoration:none;line-height:50px;margin-top:10px;min-height:50px;border:0;border-radius:14px;background:var(--c);color:#fff;font:inherit;font-weight:900;font-size:17px;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.35)}
.gm-next.alt{background:#fff;color:var(--k);border:2px solid var(--k);box-shadow:0 3px 0 var(--k)}
.gm-res{text-align:center;background:#fff;border:2px solid var(--k);border-radius:20px;padding:18px 14px;margin-top:12px}
.gm-big{font-size:46px;color:#e0a800;letter-spacing:4px;animation:gmPop .6s}
.gm-res h3{margin:6px 0;font-size:22px}.gm-res p{margin:6px 0;line-height:1.6}
.gm-row{display:flex;gap:8px;flex-wrap:wrap}.gm-row>*{flex:1 1 140px}
.gm-kpi{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}
@media(min-width:720px){.gm-kpi{grid-template-columns:repeat(4,1fr)}}
.gm-kpi>div{background:#fff;border:2px solid var(--k);border-radius:14px;padding:8px 10px}.gm-kpi small{display:block;color:#666;font-weight:700;font-size:12px}.gm-kpi b{font-size:17px}
.gm-kpi .goal{grid-column:1/-1}
.gm-h{margin:16px 2px 6px;font-size:16px}
.gm-list{display:grid;grid-template-columns:1fr;gap:8px}
@media(min-width:720px){.gm-list{grid-template-columns:repeat(3,1fr)}}
.gm-it{background:#fff;border:2px solid var(--k);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.gm-it img{width:100%;height:110px;object-fit:cover;background:#eee}
.gm-it .in{padding:8px 10px;display:flex;flex-direction:column;gap:3px;font-size:13.5px;flex:1}
.gm-it .in b{font-size:15.5px}
.gm-it .bt{display:flex;gap:6px;padding:0 10px 10px}
.gm-it .bt button{flex:1;min-height:40px;border-radius:11px;border:0;background:var(--k);color:#fff;font:inherit;font-weight:800;font-size:13.5px;cursor:pointer}
.gm-it .bt button.c{background:var(--c)}
.gm-it .bt button[disabled]{opacity:.35;cursor:not-allowed}
.gm-log{background:#fff;border:2px dashed #999;border-radius:14px;padding:8px 12px;margin-top:10px;font-size:13.5px;line-height:1.7}
.gm-log div+div{border-top:1px solid #eee}
.gm-up{color:#0a7a2f;font-weight:800}.gm-dn{color:#c8102e;font-weight:800}
.gm-ch{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}
@media(min-width:720px){.gm-ch{grid-template-columns:repeat(3,1fr)}}
.gm-c{background:#fff;border:2px solid var(--k);border-radius:16px;padding:10px 12px;text-align:start;font:inherit;color:var(--k);cursor:pointer;box-shadow:0 3px 0 var(--c);display:flex;flex-direction:column;gap:4px}
.gm-c b{font-size:15.5px}.gm-c span{font-size:13px;color:#555}.gm-c i{font-style:normal;font-weight:800;font-size:13.5px}
.gm-c:active{transform:translateY(2px);box-shadow:none}
.gm-meter{height:10px;border-radius:10px;background:#eee;overflow:hidden;margin-top:4px}.gm-meter i{display:block;height:100%;background:var(--c)}
.gm-meter.over i{background:#c8102e}
.gm-toast{position:fixed;inset-inline:16px;bottom:88px;margin:auto;max-width:420px;background:#111;color:#fff;border-radius:14px;padding:10px 14px;font-weight:800;text-align:center;z-index:99;animation:gmPop .3s}
`;
    document.head.appendChild(st);
  }

  function top(g, chip, back) {
    return `<div class="gm-top"><a class="gm-ib" href="${back || '#/game'}" aria-label="رجوع" title="رجوع">→</a>
      ${g ? `<span class="gm-mi" aria-hidden="true">${g.icon}</span><h2>${esc(g.name)}<small>${esc(g.style)}</small></h2>` : `<img class="gm-hl" src="icons/hub/games.webp?v=1" alt=""><h2>الوسيط GAMES<small>7 ألعاب عقارية: تلعب وتتعلم</small></h2>`}
      ${chip ? `<span class="gm-chip">${chip}</span>` : ''}</div>`;
  }
  function toast(t) { const d = document.createElement('div'); d.className = 'gm-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }

  // ============ صفحة 7 الشعارات ============
  // o (اختياري، للصفحة العمومية): { wasla: رابط وصلة العقار، home: رابط الرجوع }
  function hub(root, o) {
    o = o || {}; css(); GEN++;
    const tot = GAMES.reduce((a, g) => a + (g.id === 'wasla' ? 0 : starsOf(g.id)), 0);
    root.innerHTML = `<div class="gm">${top(null, `⭐ ${tot}/${(GAMES.length - 1) * STAGES * 3}`, o.home || '#/')}
      <div class="gm-hub">${GAMES.map((g, i) => {
        const s = starsOf(g.id);
        return `<a class="gm-lg" href="${g.id === 'wasla' && o.wasla ? o.wasla : '#/game/' + g.id}" style="--i:${i};--c:${g.color}" aria-label="${esc(g.name)} — ${esc(g.style)}">
          <span class="gm-disc">${g.id !== 'wasla' && !s ? '<span class="gm-new">جديد</span>' : ''}<span class="ic" aria-hidden="true">${g.icon}</span><b class="nm">${esc(g.name)}</b><i class="ln"></i><img src="${WM}" alt="الوسيط 777" decoding="async"><span class="st">${esc(g.style)}</span></span>
          <span class="gm-sc">${g.id === 'wasla' ? `<b>★</b> ${s}` : `<b>${starTxt(Math.min(3, Math.round(s / STAGES)))}</b> ${s}/${STAGES * 3}`}</span></a>`;
      }).join('')}</div>
      <div class="gm-intro">🎮 كل لعبة فيها ${STAGES} مراحل كتفتح وحدة بوحدة. ربح النجوم ⭐، تعلم قواعد العقار، وتحدى صحابك!</div>
      ${o.share ? `<a class="gm-next" href="https://wa.me/?text=${encodeURIComponent('🎮 الوسيط GAMES — 7 ألعاب عقارية: خمّن الثمن، اكشف النصب، استثمر حتى المليون وبني دارك! ' + o.share)}" target="_blank" rel="noopener">📤 شارك الألعاب مع الزبناء فواتساب</a>` : ''}</div>`;
  }

  // ============ صفحة المراحل (مشتركة) ============
  function stagesView(root, g, def) {
    const p = prog(g.id);
    root.innerHTML = `<div class="gm" style="--c:${g.color}">${top(g, `⭐ ${starsOf(g.id)}/${STAGES * 3}`)}
      <div class="gm-how"><b>كيفاش تلعب؟</b><br>${esc(g.how)}</div>
      <div class="gm-stg">${def.stages.map((s, i) => {
        const open = isOpen(g.id, i), n = (p.stars || [])[i] || 0;
        return `<button class="gm-s ${open ? '' : 'lk'}" data-s="${i}" ${open ? '' : 'aria-disabled="true"'}><span class="n">${open ? i + 1 : '🔒'}</span><span><b>${esc(s.name)}</b><small>${esc(s.sub)}</small></span><span class="sr">${n ? starTxt(n) : open ? '▶' : ''}</span></button>`;
      }).join('')}</div></div>`;
    root.querySelectorAll('.gm-s').forEach(b => b.onclick = () => {
      const i = +b.dataset.s;
      if (!isOpen(g.id, i)) return toast('🔒 ربح نجمة فالمرحلة اللي قبل باش تتفتح');
      def.play(root, g, i);
    });
  }
  function result(root, g, def, si, stars, pts, msg, lesson) {
    saveRes(g.id, si, stars, pts);
    const hasNext = si + 1 < def.stages.length && stars > 0;
    root.querySelector('.gm-body').innerHTML = `<div class="gm-res">
      <div class="gm-big">${starTxt(stars)}</div>
      <h3>${stars === 3 ? 'ممتاز! خبير حقيقي 🏆' : stars === 2 ? 'برافو عليك! 👏' : stars === 1 ? 'نجحتي! زيد تحسن 💪' : 'ما نجحتيش هاد المرة 😅'}</h3>
      <p>${msg}</p>${lesson ? `<p class="muted" style="color:#555">💡 ${lesson}</p>` : ''}
      <div class="gm-row" style="margin-top:12px">${hasNext ? '<button class="gm-next" data-a="next">المرحلة الموالية ⏭️</button>' : ''}
        <button class="gm-next ${hasNext ? 'alt' : ''}" data-a="again">🔁 عاود</button><button class="gm-next alt" data-a="map">📋 المراحل</button></div></div>`;
    root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'next') def.play(root, g, si + 1); else if (a === 'again') def.play(root, g, si); else stagesView(root, g, def);
    });
  }

  // ============ محرك الأسئلة (4 ألعاب) ============
  function quiz(root, g, def, si) {
    const gen = ++GEN, S = def.stages[si], qs = def.make(si), n = qs.length;
    let k = 0, ok = 0, pts = 0, t0 = 0, tid = null, done = false;
    root.innerHTML = `<div class="gm" style="--c:${g.color}">${top(g, `مرحلة ${si + 1}/${STAGES}`, '#/game/' + g.id)}<div class="gm-body"></div></div>`;
    root.querySelector('.gm-top a').onclick = e => { e.preventDefault(); GEN++; stagesView(root, g, def); };
    const alive = () => gen === GEN && root.isConnected;
    function paint() {
      const q = qs[k]; done = false;
      root.querySelector('.gm-body').innerHTML = `
        <div class="gm-bar"><i style="width:${k / n * 100}%"></i></div>
        <div class="gm-meta"><span>${esc(S.name)} · سؤال ${k + 1}/${n}</span><span>✅ ${ok}</span><span>🏅 ${grp(pts)}</span></div>
        ${S.timer ? '<div class="gm-tm"><i></i></div>' : ''}
        <div class="gm-q">${q.img ? `<img class="gm-img" src="${IMG}${q.img}.webp" alt="" decoding="async"><div class="gm-cred" data-k="${q.img}"></div>` : ''}${q.card || ''}
          <p class="gm-qt">${q.tag ? `<span class="tag">${esc(q.tag)}</span>` : ''}${esc(q.q)}</p>
          <div class="gm-opts n${q.opts.length === 2 ? 2 : q.opts.length === 3 ? 3 : 4}">${q.opts.map((o, i) => `<button class="gm-o" data-i="${i}">${o.split('|').map((x, j) => j ? `<small>${esc(x)}</small>` : esc(x)).join('')}</button>`).join('')}</div>
          <div class="gm-w"></div></div>`;
      if (q.img) credits().then(c => { const x = c[q.img], el = root.querySelector('.gm-cred'); if (x && el) el.textContent = `📷 ${x.by} · ${x.lic}`; });
      root.querySelectorAll('.gm-o').forEach(b => b.onclick = () => answer(+b.dataset.i));
      t0 = Date.now();
      if (S.timer) {
        const bar = root.querySelector('.gm-tm i');
        clearInterval(tid);
        tid = setInterval(() => {
          if (!alive()) return clearInterval(tid);
          const left = 1 - (Date.now() - t0) / (S.timer * 1000);
          if (bar) bar.style.transform = `scaleX(${Math.max(0, left)})`;
          if (left <= 0) { clearInterval(tid); answer(-1); }
        }, 100);
      }
    }
    function answer(i) {
      if (done || !alive()) return; done = true; clearInterval(tid);
      const q = qs[k], right = i === q.ans;
      root.querySelectorAll('.gm-o').forEach((b, j) => { b.disabled = true; if (j === q.ans) b.classList.add('ok'); else if (j === i) b.classList.add('bad'); });
      if (right) { ok++; const sec = (Date.now() - t0) / 1000; pts += 100 + (S.timer ? Math.max(0, Math.round((S.timer - sec) / S.timer * 100)) : 0); }
      const w = root.querySelector('.gm-w');
      w.innerHTML = `<div class="gm-why ${right ? 'y' : 'n'}"><b class="t">${right ? pick(['✅ صحيح! برافو', '✅ هو هاداك! 👏', '✅ ممتاز!']) : i < 0 ? '⏰ سالا الوقت!' : '❌ لا، ماشي هاداك'}</b>${esc(q.why)}</div>
        <button class="gm-next">${k + 1 < n ? 'التالي ⬅️' : 'النتيجة 🏁'}</button>`;
      w.querySelector('.gm-next').onclick = () => { k++; if (k < n) paint(); else finish(); };
      w.querySelector('.gm-next').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function finish() {
      const stars = ok >= n ? 3 : ok >= n - 2 ? 2 : ok >= Math.ceil(n * 0.6) ? 1 : 0;
      result(root, g, def, si, stars, pts, `جاوبتي صحيح على <b>${ok}/${n}</b> — ${grp(pts)} نقطة.${stars ? '' : ` خاصك ${Math.ceil(n * 0.6)} على الأقل.`}`, def.lesson ? def.lesson(si) : '');
    }
    paint();
  }

  // ---------- مرجع الأثمنة (من data.js، وإلا جدول صغير) ----------
  function market() {
    const M = (window.W777_DATA || {}).MARKET;
    const dist = M ? (M.districts['مكناس'] || []).filter(r => r[1] || r[2]).map(r => ({ name: r[0][0], apt: r[1], villa: r[2] })) : [{ name: 'حمرية', apt: 6750, villa: 8760 }, { name: 'البساتين', apt: 5840 }, { name: 'مرجان', apt: 5363, villa: 7150 }, { name: 'ويسلان', apt: 4350, villa: 6053 }, { name: 'المنزه', apt: 6870, villa: 7630 }];
    const big = ['الدار البيضاء', 'الرباط', 'مراكش', 'طنجة', 'أكادير', 'فاس', 'القنيطرة', 'تمارة', 'المحمدية', 'إفران'];
    const cities = M ? big.filter(c => M.cities[c] && M.cities[c][0]).map(c => ({ name: c, apt: M.cities[c][0], villa: M.cities[c][1] })) : [{ name: 'الدار البيضاء', apt: 12000, villa: 17000 }, { name: 'الرباط', apt: 13000, villa: 18000 }, { name: 'مراكش', apt: 9000, villa: 12000 }];
    return { dist, cities, src: M ? 'Yakeey و Agenz (' + M.updated + ')' : 'مرجع تقريبي' };
  }
  function propCard(p) {
    return `<div class="gm-card"><span class="big">${p.kind === 'villa' ? '🏡 فيلا' : '🏢 شقة'}${p.rooms ? ' · ' + p.rooms + ' بيوت' : ''}</span><span>📍 ${esc(p.where)}</span><span>📐 ${nf(p.area)} م²</span>${p.price ? `<span>💵 ${dh(p.price)}</span>` : ''}</div>`;
  }

  // ============ 1) شحال يسوى؟ ============
  const PRICE = {
    stages: [
      { name: 'شقق مكناس', sub: 'ختار الثمن الصحيح — الفرق كبير' },
      { name: 'فيلات وشقق مكناس', sub: 'الفيلا ثمن المتر ديالها مختلف' },
      { name: 'المدن الكبرى', sub: 'كازا، الرباط، مراكش، طنجة…' },
      { name: 'رخيص ولا غالي؟', sub: 'قارن ثمن الإعلان مع السوق' },
      { name: 'الخبير', sub: 'الفرق صغير — ركّز مزيان' },
    ],
    make(si) {
      const m = market(), out = [];
      for (let i = 0; i < 8; i++) {
        let kind = 'apt', loc;
        if (si === 0) loc = pick(m.dist.filter(d => d.apt));
        else if (si === 1 || si === 3) { loc = pick(m.dist); kind = loc.villa && (!loc.apt || Math.random() < 0.5) ? 'villa' : 'apt'; }
        else { loc = pick(si === 4 ? [...m.cities, ...m.dist] : m.cities); kind = loc.villa && Math.random() < 0.4 ? 'villa' : 'apt'; }
        if (!loc[kind]) kind = loc.apt ? 'apt' : 'villa';
        const ref = loc[kind], area = kind === 'villa' ? R(15, 40) * 10 : R(11, 26) * 5;
        const rooms = kind === 'villa' ? R(4, 6) : area < 70 ? 2 : area < 100 ? 3 : 4;
        const where = m.dist.includes(loc) ? loc.name + ' — مكناس' : loc.name;
        const img = kind === 'villa' ? pick(['villa', 'pool', 'garden', 'gate']) : pick(['building', 'salon', 'balcony', 'kitchen', 'tower', 'bedroom']);
        const fair = round(ref * area, 10000);
        if (si <= 2) {
          const f = si === 0 ? [0.55, 0.7, 1.4, 1.7] : si === 1 ? [0.65, 0.8, 1.25, 1.5] : [0.7, 0.82, 1.2, 1.4];
          const r = mcq(fair, shuffle(f).map(x => round(fair * x, 10000)), x => `${grp(x)} درهم|${(Math.round(x / 1000) / 10).toString().replace('.', ',')} مليون سنتيم`);
          out.push({ img, card: propCard({ kind, rooms, where, area }), q: 'شحال يسوى هاد العقار تقريباً؟', ...r,
            why: `ثمن المتر المرجعي ${kind === 'villa' ? 'للفيلات' : 'للشقق'} فـ ${where} تقريباً ${grp(ref)} د/م² × ${area} م² ≈ ${grp(fair)} درهم (${grp(fair / 10000)} مليون سنتيم). المرجع: ${m.src} — أثمنة تقريبية، والحالة والطابق والتشطيب كيبدلو الثمن.` });
        } else {
          const t = R(0, 2), band = si === 3 ? [[0.72, 0.84], [0.96, 1.04], [1.18, 1.32]] : [[0.82, 0.88], [0.97, 1.03], [1.12, 1.2]];
          const f = band[t][0] + Math.random() * (band[t][1] - band[t][0]), price = round(ref * area * f, 5000), ppm = price / area, d = Math.round((ppm - ref) / ref * 100);
          out.push({ img, card: propCard({ kind, rooms, where, area, price }), q: 'هاد الثمن بالنسبة للسوق:', opts: ['🟢 رخيص (تحت السوق)', '🟡 معقول (قريب من السوق)', '🔴 غالي (فوق السوق)'], ans: t,
            why: `ثمن المتر فالإعلان = ${grp(price)} ÷ ${area} ≈ ${grp(ppm)} د/م²، والمرجع فـ ${where} ≈ ${grp(ref)} د/م² ← الفرق ${d > 0 ? '+' : ''}${d}%. ${t === 0 ? 'رخيص: تحقق علاش (الحالة، الوثائق، الطابق) قبل ما تفرح!' : t === 2 ? 'غالي: فاوض بالمعطيات ديال السوق.' : 'قريب من ثمن السوق (±5%).'}` });
        }
      }
      return out;
    },
    lesson: si => si < 3 ? 'القاعدة: الثمن ≈ ثمن المتر فالحي × المساحة. و1 مليون سنتيم = 10 000 درهم.' : 'قبل أي زيارة، حسب ثمن المتر وقارنو مع الحي — هادي أول خطوة فالتقييم.',
  };

  // ============ 2) الحاسبة السريعة ============
  const CALC = {
    stages: [
      { name: 'ثمن المتر', sub: 'الثمن ÷ المساحة', timer: 35 },
      { name: 'المليون والريال', sub: 'سنتيم ↔ درهم', timer: 30 },
      { name: 'العمولة', sub: '2,5% · شهر الكراء · 10%', timer: 30 },
      { name: 'مصاريف الشراء', sub: 'التسجيل 4% · المحافظة 1,5% · التسبيق', timer: 35 },
      { name: 'المردودية', sub: 'الكراء السنوي ÷ الثمن', timer: 45 },
    ],
    make(si) {
      const out = [];
      for (let i = 0; i < 8; i++) {
        const t = i % 3;
        if (si === 0) {
          const A = R(12, 28) * 5, ppm = R(40, 95) * 100, P = ppm * A;
          if (t !== 2) out.push({ img: 'calc', tag: 'شقة', q: `شقة ${A} م² بـ ${grp(P)} درهم. شحال ثمن المتر المربع؟`, ...mcq(ppm, [ppm + 500, ppm - 500, ppm + 1000, ppm - 1000, Math.round(ppm * 1.2 / 100) * 100], x => grp(x) + ' د/م²'), why: `ثمن المتر = الثمن ÷ المساحة = ${grp(P)} ÷ ${A} = ${grp(ppm)} د/م².` });
          else out.push({ img: 'plot', tag: 'بقعة', q: `بقعة ${A} م² والمتر بـ ${grp(ppm)} درهم. شحال الثمن؟`, ...mcq(P, [P + A * 500, P - A * 500, P * 10, Math.round(P * 1.15 / 1000) * 1000], x => grp(x) + ' د'), why: `الثمن = ثمن المتر × المساحة = ${grp(ppm)} × ${A} = ${grp(P)} درهم.` });
        } else if (si === 1) {
          if (t === 0) { const m = R(6, 90) * 5, D = m * 10000; out.push({ img: 'money', q: `${m} مليون سنتيم = شحال بالدرهم؟`, ...mcq(D, [D / 10, D * 10, D / 100], x => grp(x) + ' درهم'), why: `1 مليون سنتيم = 10 000 درهم ← ${m} × 10 000 = ${grp(D)} درهم.` }); }
          else if (t === 1) { const m = R(5, 120) * 5, D = m * 10000; out.push({ img: 'money', q: `${grp(D)} درهم = شحال بالمليون (سنتيم)؟`, ...mcq(m, [m * 10, m / 10, m * 100], x => (Math.round(x * 10) / 10).toString().replace('.', ',') + ' مليون'), why: `كنقسمو على 10 000: ${grp(D)} ÷ 10 000 = ${m} مليون سنتيم.` }); }
          else { const k = R(2, 40) * 5, D = k * 1000 / 20; out.push({ img: 'money', q: `${k} ألف ريال = شحال بالدرهم؟`, ...mcq(D, [D * 2, D * 10, D / 2, k * 1000 / 5], x => grp(x) + ' درهم'), why: `1 درهم = 20 ريال ← ${grp(k * 1000)} ÷ 20 = ${grp(D)} درهم.` }); }
        } else if (si === 2) {
          if (t === 0) { const P = R(30, 300) * 10000, r = pick([2.5, 2.5, 3, 2]), c = P * r / 100; out.push({ img: 'handshake', q: `بيع بـ ${grp(P)} درهم، والعمولة المكتوبة فالوكالة ${String(r).replace('.', ',')}%. شحال العمولة؟`, ...mcq(c, [c * 10, c / 10, P * (r + 1) / 100, c * 2], x => grp(x) + ' د'), why: `${grp(P)} × ${String(r).replace('.', ',')} ÷ 100 = ${grp(c)} درهم. (العمولة ما محدداش بالقانون: العرف 2,5% من كل طرف، وكتكتب فالوكالة قبل الخدمة.)` }); }
          else if (t === 1) { const L = R(15, 90) * 100; out.push({ img: 'key', q: `كراء ${grp(L)} د فالشهر، والعمولة شهر من كل طرف. شحال كتربح الوكالة من الطرفين؟`, ...mcq(2 * L, [L, L / 2, 3 * L, L * 12], x => grp(x) + ' د'), why: `شهر من الكاري + شهر من المالك = 2 × ${grp(L)} = ${grp(2 * L)} درهم.` }); }
          else { const L = R(20, 80) * 100, f = L * 12 * 0.1; out.push({ img: 'office', q: `تسيير كراء ${grp(L)} د/الشهر بنسبة 10%. شحال الأتعاب فالعام؟`, ...mcq(f, [L * 0.1, L * 1.2 * 10, f * 2, L], x => grp(x) + ' د'), why: `10% × ${grp(L)} = ${grp(L * 0.1)} د فالشهر × 12 = ${grp(f)} درهم فالعام.` }); }
        } else if (si === 3) {
          const P = R(25, 200) * 10000, ty = i % 4;
          if (ty === 0) out.push({ img: 'stamp', q: `شقة بـ ${grp(P)} د. واجبات التسجيل تقريباً 4%. شحال؟`, ...mcq(P * 0.04, [P * 0.4, P * 0.004, P * 0.015, P * 0.06], x => grp(x) + ' د'), why: `${grp(P)} × 4 ÷ 100 = ${grp(P * 0.04)} درهم (النسبة العادية للسكن؛ كاينين تخفيضات لبعض الحالات — الموثق كيعطي الرقم النهائي).` });
          else if (ty === 1) out.push({ img: 'plan', q: `شقة بـ ${grp(P)} د. رسوم المحافظة العقارية تقريباً 1,5%. شحال؟`, ...mcq(P * 0.015, [P * 0.15, P * 0.04, P * 0.0015, P * 0.025], x => grp(x) + ' د'), why: `${grp(P)} × 1,5 ÷ 100 = ${grp(P * 0.015)} درهم (+ رسوم ثابتة صغيرة).` });
          else if (ty === 2) { const T = P * 1.065; out.push({ img: 'calc', q: `شقة بـ ${grp(P)} د والمصاريف كاملة تقريباً 6,5%. شحال خاصك فالمجموع؟`, ...mcq(T, [P * 1.65, P * 1.0065, P * 1.04, P * 1.13], x => grp(x) + ' د'), why: `${grp(P)} + 6,5% (${grp(P * 0.065)}) = ${grp(T)} درهم. المصاريف العادية: تسجيل ~4% + محافظة ~1,5% + موثق ~1% مع TVA.` }); }
          else out.push({ img: 'bank', q: `شقة بـ ${grp(P)} د، والبنك كيمول 80%. شحال التسبيق ديالك (بلا المصاريف)؟`, ...mcq(P * 0.2, [P * 0.8, P * 0.02, P * 0.25, P * 0.1], x => grp(x) + ' د'), why: `التسبيق = 20% × ${grp(P)} = ${grp(P * 0.2)} درهم، وزيد عليه المصاريف (~6,5%) من جيبك.` });
        } else {
          const ty = i % 3;
          if (ty !== 2) {
            const P = R(25, 150) * 10000, y0 = pick([4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8]), L = Math.max(500, round(P * y0 / 100 / 12, 50)), y = L * 12 / P * 100;
            out.push({ img: 'building', q: `شقة بـ ${grp(P)} د كتكرا ${grp(L)} د فالشهر. شحال المردودية الخام فالعام؟`, ...mcq(Math.round(y * 10) / 10, [y + 1.5, y - 1.5, y * 2, y / 12 * 10, y + 3], x => pct(x)), why: `(${grp(L)} × 12) ÷ ${grp(P)} × 100 = ${pct(y)}. والمردودية الصافية (بعد الفراغ، السانديك، الصيانة، الضريبة) كتكون أقل بـ 2 حتى 3 نقط تقريباً.` });
          } else {
            const P = R(30, 150) * 10000, y = pick([5, 6, 7, 8]), L = Math.round(P * y / 100 / 12);
            out.push({ img: 'key', q: `باش تكون المردودية الخام ${y}% على شقة بـ ${grp(P)} د، شحال خاص الكراء الشهري؟`, ...mcq(L, [L * 2, L / 2, P * y / 100, L + 1000], x => grp(x) + ' د'), why: `${grp(P)} × ${y}% = ${grp(P * y / 100)} د فالعام ÷ 12 = ${grp(L)} د فالشهر.` });
          }
        }
      }
      return shuffle(out);
    },
    lesson: si => ['ثمن المتر = الثمن ÷ المساحة.', '1 مليون سنتيم = 10 000 درهم، و1 درهم = 20 ريال.', 'العمولة ديما مكتوبة فالوكالة قبل الخدمة.', 'المصاريف كتقرب 6 حتى 7% فوق الثمن — حسبها قبل القرض.', 'المردودية الخام = الكراء السنوي ÷ الثمن × 100.'][si],
  };

  // ============ 3) صح ولا غلط (قانون العقار) ============
  // [المرحلة، الجملة، صح؟، الشرح]
  const LAW = [
    [0, 'عقد كراء السكن خاصو يكون مكتوب.', true, 'القانون 67-12 كيفرض عقد كراء مكتوب بتاريخ ثابت، فيه الأطراف، العقار، الثمن والمدة.'],
    [0, 'الضمانة (التسبيق) فكراء السكن تقدر توصل 4 شهور.', false, 'حسب القانون 67-12، الضمانة ما كتفوتش جوج شهور ديال الكراء، وكترجع فالخروج.'],
    [0, 'بيان الحالة كيتدار فالدخول وفالخروج، بالصور ومزيان يكون موقّع من الطرفين.', true, 'بيان الحالة كيحمي الطرفين: بلاه صعيب تبرر أي خصم من الضمانة.'],
    [0, 'إلا ما خلصش الكاري، المالك يقدر يبدل القفل ويخرج حوايجو بيدو.', false, 'الإفراغ ما كيكونش غير بحكم من المحكمة ومسطرة قانونية. العدالة الخاصة ممنوعة.'],
    [0, 'كراء المحلات التجارية عندو قانون خاص بيه هو 49-16.', true, 'السكن والمهني كيخضعو لـ 67-12، والكراء التجاري لـ 49-16 بقواعد مختلفة.'],
    [0, 'الضمانة كترجع للكاري فالخروج، ناقص غير المبالغ المبررة (خسائر، فواتير…).', true, 'الخصم من الضمانة خاصو يكون مبرر، وبيان الحالة هو الحجة.'],
    [0, 'مراجعة ثمن كراء السكن كتكون كل 3 سنين، وبحد أقصى 8%.', true, 'حسب القانون 07-03 الخاص بمراجعة الكراء: كل 3 سنين، و8% كحد أقصى للسكن (10% للمهني والتجاري).'],
    [0, 'الكاري عندو الحق ياخذ وصل (quittance) ملي كيخلص.', true, 'المكري ملزم يعطي وصل الأداء — وهو حجة الكاري.'],
    [1, 'الرسم العقاري (titre foncier) نهائي وما كيقبلش الطعن.', true, 'ظهير التحفيظ العقاري: الرسم العقاري نهائي ولا يقبل الطعن، وهو أقوى حماية للملكية.'],
    [1, 'شهادة الملكية كتجيبها من الوكالة الوطنية للمحافظة العقارية (ANCFCC).', true, 'المحافظة العقارية (ANCFCC) هي اللي كتعطي شهادة الملكية والتصاميم.'],
    [1, 'شهادة الملكية الحديثة كتبين واش العقار فيه رهن ولا حجز.', true, 'لهذا ديما كنطلبوها حديثة قبل أي بيع: بلا رهن، بلا حجز، بلا تعرض.'],
    [1, 'إلا كان العقار ديال بزاف الورثة، يكفي واحد فيهم يوقع على البيع.', false, 'خاص الملاك كاملين يوقعو (كل واحد على حصتو)، ولا وكالة رسمية من اللي غايب.'],
    [1, 'رخصة السكن (permis d\'habiter) كتثبت أن البناية مطابقة وصالحة للسكن.', true, 'رخصة السكن ولا شهادة المطابقة من الوثائق الأساسية فملف البيع والقرض.'],
    [1, 'العربون خاصو يتعطى يد بيد للبائع باش يكون محمي.', false, 'العربون كيمشي لحساب الموثق بالتحويل ولا بشيك مضمون — عمرو يد بيد.'],
    [1, 'الموثق كيحط فلوس البيع فصندوق الإيداع والتدبير (CDG) حتى تكمل الإجراءات.', true, 'القانون 32-09 المنظم لمهنة التوثيق: الأموال كتودع عند صندوق الإيداع والتدبير — حماية للطرفين.'],
    [1, 'العقار غير المحفظ (الملك) خاصو حذر أكثر قبل الشراء.', true, 'بلا رسم عقاري، الحماية أضعف: تحقق قانوني مزيان (العدل، المحامي) ولا التحفيظ.'],
    [2, 'واجبات التسجيل فشراء سكن عادي تقريباً 4% من الثمن.', true, 'النسبة العادية ~4% للسكن (كاينين تخفيضات لبعض البرامج) — الموثق كيعطي الرقم النهائي.'],
    [2, 'رسوم المحافظة العقارية تقريباً 1,5% من الثمن.', true, '~1,5% + رسوم ثابتة صغيرة (الشهادة…).'],
    [2, 'مصاريف الشراء كاملة (تسجيل + محافظة + موثق) كتقرب 6 حتى 7%.', true, 'هادو بلا عمولة الوكالة — خاصك تحسبهم فالتسبيق ديالك.'],
    [2, 'عمولة الوكالة العقارية محددة بالقانون فـ 5%.', false, 'ما كاينش قانون كيحدد العمولة. العرف ~2,5% من كل طرف، وكتكتب فالوكالة قبل الخدمة.'],
    [2, 'الضريبة على الربح العقاري: القاعدة 20% من الربح، مع حد أدنى 3% من ثمن البيع.', true, 'هادي القاعدة العامة (مع إعفاءات بشروط، بحال السكن الرئيسي) — للتأكد مع الموثق.'],
    [2, 'الضريبة على الربح العقاري كيخلصها المشتري.', false, 'كيخلصها البائع، والتصريح كيكون خلال 30 يوم من البيع.'],
    [2, 'التصريح بالربح العقاري كيكون خلال 30 يوم من البيع.', true, 'البائع كيصرح خلال 30 يوم (والموثق غالباً كيتكلف بالإجراءات).'],
    [2, 'قبل توقيع البيع، كتطلب شهادة إبراء الذمة (ضريبة السكن والخدمات الجماعية).', true, 'الموثق ولا العدل كيطلبها: الضرائب ديال العقار خاصها تكون مخلصة.'],
    [3, 'فالعمارات المقسمة لشقق، اتحاد الملاك (السانديك) إجباري بالقانون 18-00.', true, 'القانون 18-00 الخاص بالملكية المشتركة كينظم اتحاد الملاك والتكاليف المشتركة.'],
    [3, 'الجمع العام ديال الملاك كيتعقد على الأقل مرة فالعام.', true, 'حسب القانون 18-00، الجمع العام كيتعقد مرة فالعام على الأقل (الميزانية، الحسابات، السانديك).'],
    [3, 'المالك اللي ما ساكنش فالشقة ما ملزمش يخلص واجبات السانديك.', false, 'كل مالك ملزم يساهم فالتكاليف المشتركة حسب حصتو، ساكن ولا لا.'],
    [3, 'الدروج والمصعد والمدخل أجزاء مشتركة بين الملاك.', true, 'الأجزاء المشتركة كيستافدو منها الكل وكيتقسمو التكاليف ديالها.'],
    [3, 'مالك فالطابق الأخير يقدر يبني فوق السطح المشترك بلا موافقة الملاك.', false, 'السطح المشترك ما يتبنى عليه والو بلا قرار الجمع العام ورخصة البناء.'],
    [3, 'الشقة فعمارة محفظة عندها رسم عقاري فرعي خاص بيها.', true, 'كل شقة كتاخذ رسم عقاري فرعي، مع حصة فالأجزاء المشتركة.'],
    [3, 'قبل بيع شقة، مزيان تطلب شهادة السانديك اللي كتبين أن التكاليف مخلصة.', true, 'باش المشتري ما يورثش ديون السانديك — وثيقة مهمة فالملف.'],
    [3, 'تبديل الواجهة الخارجية ديال العمارة كيحتاج قرار الجمع العام.', true, 'الواجهة جزء مشترك: أي تبديل كبير خاصو موافقة الملاك (ورخصة إلا لزم).'],
    [4, 'حسب القانون 41.25 (من 16 يوليوز 2026)، الوعد بالبيع خاصو يكون عقد رسمي عند الموثق ولا العدل.', true, 'البيع، الوعد بالبيع، والوكالة الخاصة بهاد العمليات خاصهم عقد رسمي — وإلا البطلان.'],
    [4, 'باقي نقدرو نوقعو «compromis» عرفي فالوكالة العقارية.', false, 'حسب القانون 41.25، الوعد العرفي باطل. الوكالة كتحرر غير الوكالة، ورقة الزيارة وعرض الشراء.'],
    [4, 'الوكالة (procuration) على عقار خاصها تتسجل فالسجل الوطني الإلكتروني للوكالات.', true, 'القانون 31.18: التسجيل فالسجل الوطني الإلكتروني للوكالات على الحقوق العينية (إجباري من يونيو 2026).'],
    [4, 'الأداء بالكاش فصفقة كبيرة هو أحسن حماية للمشتري.', false, 'الأداء البنكي هو الحماية والحجة، والكاش الكثير علامة خطر فمحاربة غسل الأموال (القانون 43-05).'],
    [4, 'الوكيل العقاري ملزم يعرف الزبون (البطاقة الوطنية) فإطار محاربة غسل الأموال.', true, 'القانون 43-05: اعرف زبونك، احتفظ بالملفات، وصرّح بالشك لـ ANRF بلا ما تخبر الزبون.'],
    [4, 'المعطيات الشخصية ديال الزبناء محمية بالقانون 09-08.', true, 'القانون 09-08 (CNDP): ما تنشرش أرقام وأسماء الزبناء بلا موافقتهم.'],
    [4, 'فالبيع فطور الإنجاز (VEFA)، الدفعات كتكون حسب تقدم الأشغال.', true, 'القانون 44-00 (المعدل بـ 107-12): دفعات مرحلية مرتبطة بتقدم الأشغال، مع ضمانات للمشتري.'],
    [4, 'قبل شراء أرض للبناء، مزيان تطلب مذكرة المعلومات التعميرية.', true, 'كتبين شنو مسموح تبني (العلو، الاستعمال، الارتفاقات) قبل ما تخلص.'],
  ];
  const LAW_IMG = [['key', 'door', 'court', 'stamp'], ['stamp', 'plan', 'court', 'house'], ['calc', 'money', 'bank', 'stamp'], ['building', 'stairs', 'elevator', 'roof'], ['court', 'handshake', 'plan', 'sign']];
  const LAWG = {
    stages: [
      { name: 'الكراء', sub: 'القانون 67-12 · الضمانة · الإفراغ' },
      { name: 'الشراء والوثائق', sub: 'الرسم العقاري · الموثق · الورثة' },
      { name: 'المصاريف والضرائب', sub: 'التسجيل · المحافظة · الربح العقاري' },
      { name: 'الملكية المشتركة', sub: 'السانديك · القانون 18-00' },
      { name: 'القوانين الجديدة', sub: '41.25 · 31.18 · غسل الأموال' },
    ],
    make: si => shuffle(LAW.filter(x => x[0] === si)).map(x => ({ img: pick(LAW_IMG[si]).replace('house', 'cottage'), q: x[1], opts: ['✅ صح', '❌ غلط'], ans: x[2] ? 0 : 1, why: x[3] })),
    lesson: () => 'هادي معلومات عامة للتعلم. قبل أي قرار، تأكد من النص الحالي مع الموثق ولا المحامي.',
  };

  // ============ 4) كاشف النصب ============
  // [المرحلة، الحالة، نصب؟، الشرح]
  const SCAM = [
    [0, 'شقة 120 م² فحمرية بـ 25 مليون. المالك «فإيطاليا» وكيطلب تحويل 5 000 درهم باش يصيفط ليك المفاتيح.', true, 'ثمن خيالي + مالك ما كيبانش + فلوس قبل الزيارة = نصب كلاسيكي. ما تخلص والو قبل ما تشوف العقار والوثائق.'],
    [0, 'إعلان فيه صور حقيقية، رقم الوكالة، وموعد زيارة فالمكان مع المكلف.', false, 'زيارة فالمكان مع شخص معروف هي البداية الصحيحة.'],
    [0, '«خلص 2 000 درهم مصاريف الزيارة قبل ما نعطيك العنوان.»', true, 'الزيارة ما كتخلصش مسبقاً. العمولة كتكون مكتوبة وكتخلص عند نجاح الصفقة.'],
    [0, 'لقيتي نفس صور الشقة فإعلان آخر فمدينة أخرى وبثمن آخر.', true, 'صور مسروقة = إعلان مزور. قلب بالصورة فالأنترنيت قبل ما تتصل.'],
    [0, 'البائع قبل يتلاقى معاك عند الموثق ويوريك شهادة الملكية الحديثة.', false, 'الشفافية والموثق علامات الثقة.'],
    [0, 'ثمن أقل بـ 50% من السوق، و«خاصك تقرر اليوم، كاين 3 ديال الناس بغاوها».', true, 'الضغط والزربة + ثمن غير منطقي = علامة خطر قوية.'],
    [0, 'واحد كيقول «أنا الوكيل ديال المالك» وما عندو حتى وكالة مكتوبة.', true, 'بلا وكالة مكتوبة، ما عندو حتى صفة. طلب الوثيقة.'],
    [0, 'الوكالة عطاتك وكالة مكتوبة (mandat) فيها الخدمة والعمولة قبل ما تبدا.', false, 'الكتابة قبل الخدمة هي الاحترافية — كتحمي الطرفين.'],
    [1, 'المالك كيطلب 6 شهور مسبقة كاش، بلا عقد وبلا وصل.', true, 'بلا عقد ولا وصل، ما عندك حتى حجة. والضمانة فالسكن ما كتفوتش شهرين (67-12).'],
    [1, 'عقد كراء مكتوب، ضمانة شهرين، وبيان الحالة بالصور.', false, 'هادا هو الكراء القانوني والمحمي.'],
    [1, '«المفاتيح عندي، خلص ليا 3 شهور تسبيق، المالك مسافر» — وما عندو حتى ورقة.', true, 'شكون عطاه الحق يكري؟ تأكد من المالك أو الوكالة المكتوبة.'],
    [1, 'نفس الشقة تكرات لـ 3 ديال الناس فنفس النهار، وكل واحد خلص تسبيق.', true, 'نصب معروف: الكراء الوهمي. خلص غير بعد العقد والتأكد من المالك.'],
    [1, 'الوكالة كتطلب شهر عمولة مكتوب فالاتفاق قبل الزيارة.', false, 'شهر عمولة هو العرف، والمهم أنها مكتوبة وواضحة.'],
    [1, 'كاري كيعطي شيك ضمانة باسم شخص آخر وما بغاش يوري البطاقة.', true, 'هوية غير واضحة = خطر. البطاقة الوطنية وإثبات الدخل ضروريين.'],
    [1, 'كراء مفروش: «خلص برا المنصة بتحويل لحساب شخصي باش ينقص الثمن».', true, 'برا المنصة ما عندك حتى حماية. علامة نصب معروفة.'],
    [1, 'المالك كيعطي وصل الأداء كل شهر.', false, 'الوصل حق ديال الكاري وحجة ديالو.'],
    [2, 'البائع رافض يمشي عند الموثق وبغا «عقد عرفي» فالقهوة.', true, 'رفض الموثق علامة خطر كبيرة — والعقد العرفي فالبيع باطل حسب القانون 41.25.'],
    [2, 'شهادة الملكية اللي عطاك البائع تاريخها من 3 سنين.', true, 'خاصها تكون حديثة (أيام): من بعد 3 سنين يقدر يكون رهن ولا حجز ولا بيع.'],
    [2, 'الاسم فالبطاقة ديال البائع ما متطابقش مع الاسم فشهادة الملكية.', true, 'الأسماء خاصها تتطابق. وقف وتحقق عند الموثق.'],
    [2, 'الورثة كاملين حاضرين ومتفقين عند الموثق، مع الإراثة.', false, 'هادا هو البيع الصحيح ديال عقار الورثة.'],
    [2, 'العقار تباع 4 مرات فعام واحد بين شركات ما معروفينش.', true, 'تبديل المالك بزاف المرات علامة خطر (تزوير ولا غسل أموال).'],
    [2, 'البائع عندو وكالة قديمة من خوه اللي فالخارج، وما مسجلاش فالسجل الوطني.', true, 'الوكالة خاصها تكون رسمية ومسجلة (القانون 31.18) — وإلا خطر كبير.'],
    [2, 'شهادة ملكية حديثة بلا رهن ولا حجز، ورخصة السكن موجودة.', false, 'ملف نقي: هادشي اللي كنقلبو عليه.'],
    [2, 'العربون كيتحول لحساب الموثق.', false, 'هادي هي الطريقة المحمية.'],
    [3, '«عطيني 10 000 درهم ونضمن ليك القرض من البنك بلا وثائق.»', true, 'حتى واحد ما يقدر يضمن القرض. البنك كيدرس الملف بالوثائق.'],
    [3, 'البنك عطاك عرض مكتوب فيه النسبة والمدة والتأمين.', false, 'العرض المكتوب هو اللي كتقارن بيه وكتوقع عليه.'],
    [3, 'مشتري بغا يخلص 2 مليون درهم كاش فالشكارة ويسجل العقار باسم شخص آخر.', true, 'علامات غسل الأموال: كاش كثير + مالك ظاهري. الوكيل خاصو يحتاط ويصرّح بالشك (43-05).'],
    [3, 'مكالمة: «أنا من البنك، عطيني الكود اللي وصلك فـ SMS باش نكمل الملف».', true, 'البنك عمرو يطلب الكود. هادا سرقة الحساب.'],
    [3, 'مشروع كيوعدك بـ «ربح مضمون 30% فالعام» فالعقار.', true, 'حتى استثمار عقاري ما مضمون بهاد النسبة. المردودية العادية للكراء 4 حتى 7%.'],
    [3, 'المنعش عطاك عقد بيع فطور الإنجاز رسمي، والدفعات حسب تقدم الأشغال.', false, 'هادا هو الإطار القانوني (VEFA) اللي كيحميك.'],
    [3, 'الأداء بشيك مضمون (chèque certifié) عند الموثق.', false, 'طريقة أداء آمنة وفيها حجة.'],
    [3, 'مستثمر بغا يشري بشركة، وما بغاش يقول شكون مولاها الحقيقي.', true, 'خاصك تعرف المستفيد الحقيقي. الغموض علامة خطر.'],
    [4, 'شقة بثمن السوق، الوكالة عندها وكالة مكتوبة، والمالك حاضر فالزيارة.', false, 'كل العلامات مزيانة — كمّل بالتحقق عند الموثق.'],
    [4, 'إعلان بلا رقم الرسم العقاري، والبائع كيقول «الرسم فالطريق» وكيطلب تسبيق.', true, 'بلا رسم عقاري ولا تسبيق! خلص غير عند الموثق بعد التحقق.'],
    [4, 'بقعة رخيصة بزاف فتجزئة ما عندهاش التسليم (بلا ماء، بلا ضو، بلا طرق).', true, 'بلا تسليم التجزئة، رخصة البناء صعيبة — ممكن تبقى البقعة بلا قيمة سنين.'],
    [4, 'المنعش معلق رخصة البناء فالورش، ورقمها كيبان.', false, 'الشفافية: تقدر تتحقق من الرخصة عند الجماعة.'],
    [4, 'رسالة واتساب: «ربحتي شقة فقرعة، خلص 1 500 درهم مصاريف الملف».', true, 'ما شاركتيش فحتى قرعة؟ نصب. ما تخلص والو.'],
    [4, 'البائع بغا يكتب ثمن ناقص فالعقد «باش نخلصو ضريبة قليلة» والباقي كاش تحت الطاولة.', true, 'تصريح كاذب = مخالفة ضريبية وخطر كبير عليك (ما عندك حجة على الفلوس اللي خلصتي، والضريبة كتطلع ملي تبيع).'],
    [4, 'مهندس طبوغرافي كيحدد الحدود ديال البقعة قبل الشراء.', false, 'خطوة احترافية كتحميك من مشاكل الحدود.'],
    [4, 'شخص كيقول «أرض سلالية ولكن ماشي مشكل، نبيعها ليك بعقد عرفي».', true, 'الأراضي الجماعية (السلالية) عندها قواعد خاصة — العقد العرفي ما كيحميك والو.'],
  ];
  const SCAM_IMG = [['forsale', 'sign', 'building', 'salon'], ['key', 'door', 'bedroom', 'intercom'], ['stamp', 'plan', 'court', 'handshake'], ['money', 'bank', 'calc', 'handshake'], ['plot', 'site', 'crane', 'sign']];
  const SCAMG = {
    stages: [
      { name: 'إعلانات الأنترنيت', sub: 'صور، أثمنة، تسبيقات' },
      { name: 'الكراء', sub: 'تسبيق، مفاتيح، وصولات' },
      { name: 'البيع والوثائق', sub: 'الموثق، الورثة، الوكالات' },
      { name: 'الفلوس والقروض', sub: 'كاش، بنك، استثمار' },
      { name: 'المحقق الخبير', sub: 'حالات صعيبة' },
    ],
    make: si => shuffle(SCAM.filter(x => x[0] === si)).map(x => ({ img: pick(SCAM_IMG[si]), q: x[1], opts: ['🚩 نصب / خطر', '✅ سليم'], ans: x[2] ? 0 : 1, why: x[3] })),
    lesson: () => 'القاعدة الذهبية: ما تخلص والو قبل الزيارة والتحقق من الوثائق، والفلوس كتمشي لحساب الموثق.',
  };

  // ============ 5) مليونير العقار (محاكاة) ============
  const TY = {
    studio: { n: 'ستوديو', img: 'studio', p: [18, 35], y: [6.5, 8], g: [0, 2.5], vac: 0.18 },
    apt: { n: 'شقة', img: 'building', p: [35, 90], y: [5, 6.5], g: [1, 3.5], vac: 0.12 },
    villa: { n: 'فيلا', img: 'villa', p: [150, 320], y: [3, 4.5], g: [1.5, 4.5], vac: 0.15 },
    shop: { n: 'محل تجاري', img: 'shop', p: [30, 120], y: [7, 9.5], g: [-1, 3], vac: 0.25 },
    plot: { n: 'بقعة أرضية', img: 'plot', p: [20, 80], y: [0, 0], g: [2.5, 7], vac: 0 },
  };
  const TIMG = { studio: ['studio', 'bedroom', 'salon'], apt: ['building', 'tower', 'balcony', 'kitchen'], villa: ['villa', 'pool', 'garden', 'gate'], shop: ['shop', 'market', 'mall'], plot: ['plot', 'site', 'olive'] };
  const TLV = [
    { name: 'البداية', sub: '150 ألف ← 300 ألف فـ 8 سنين', cash: 150000, save: 30000, income: 120000, target: 300000, years: 8, mkt: [-2, 3] },
    { name: 'المستثمر الصغير', sub: '200 ألف ← 500 ألف فـ 10 سنين', cash: 200000, save: 30000, income: 140000, target: 500000, years: 10, mkt: [-2, 3] },
    { name: 'الكريدي الذكي', sub: '250 ألف ← 750 ألف فـ 10 سنين', cash: 250000, save: 35000, income: 160000, target: 750000, years: 10, mkt: [-3, 3] },
    { name: 'نحو المليون', sub: '300 ألف ← 1 مليون درهم فـ 12 سنة', cash: 300000, save: 40000, income: 180000, target: 1000000, years: 12, mkt: [-3, 3] },
    { name: 'المليونير', sub: '250 ألف ← 1 مليون، مع أزمة', cash: 250000, save: 40000, income: 180000, target: 1000000, years: 12, mkt: [-3, 3], crisis: 4 },
  ];
  const RATE = 0.05, YRS = 20, FEES = 0.07, COMM = 0.025;
  const annuity = L => L * RATE / (1 - Math.pow(1 + RATE, -YRS));
  function sim(lv) {
    const L = TLV[lv], dist = market().dist.map(d => d.name);
    const st = { lv, year: 1, cash: L.cash, owned: [], log: [], over: false, won: 0, id: 0 };
    const offer = () => {
      const k = pick(lv === 0 ? ['studio', 'apt', 'apt', 'plot', 'shop'] : Object.keys(TY)), t = TY[k], img = pick(TIMG[k]);
      const price = R(t.p[0], t.p[1]) * 10000, y = t.y[0] + Math.random() * (t.y[1] - t.y[0]);
      return { id: ++st.id, k, name: t.n, img, dist: pick(dist), price, value: price, rent: Math.round(price * y / 100), g: t.g[0] + Math.random() * (t.g[1] - t.g[0]), vac: t.vac };
    };
    st.offers = [offer(), offer(), offer()];
    const pays = () => st.owned.reduce((a, o) => a + (o.loan ? o.loan.pay : 0), 0);
    const rents = () => st.owned.reduce((a, o) => a + o.rent, 0);
    const debt = () => st.owned.reduce((a, o) => a + (o.loan ? o.loan.bal : 0), 0);
    st.net = () => Math.round(st.cash + st.owned.reduce((a, o) => a + o.value, 0) - debt());
    st.canLoan = o => { const pay = annuity(o.price * 0.8); return pays() + pay <= 0.4 * (L.income + rents() * 0.7); };
    st.buy = (oid, loan) => {
      const o = st.offers.find(x => x.id === oid); if (!o) return 'ما بقاش';
      const need = loan ? o.price * (0.2 + FEES) : o.price * (1 + FEES);
      if (st.cash < need) return `الكاش ما كافيش: خاصك ${grp(need)} د (${loan ? 'تسبيق 20% + مصاريف 7%' : 'الثمن + مصاريف 7%'})`;
      if (loan && !st.canLoan(o)) return 'البنك رفض: الأقساط غادي تفوت 40% من الدخل ديالك';
      st.cash -= need; st.offers = st.offers.filter(x => x !== o);
      st.owned.push({ ...o, cost: o.price, loan: loan ? { bal: o.price * 0.8, pay: annuity(o.price * 0.8) } : null });
      st.log.unshift(`🏠 شريتي ${o.name} فـ ${o.dist} بـ ${grp(o.price)} د${loan ? ' بالكريدي (80%)' : ' كاش'} + المصاريف ${grp(o.price * FEES)} د.`);
      return '';
    };
    st.sellGain = o => { const tax = Math.max(0.2 * Math.max(0, o.value - o.cost * (1 + FEES)), 0.03 * o.value); return { tax, net: o.value * (1 - COMM) - tax - (o.loan ? o.loan.bal : 0) }; };
    st.sell = oid => {
      const o = st.owned.find(x => x.id === oid); if (!o) return;
      const { tax, net } = st.sellGain(o);
      st.cash += net; st.owned = st.owned.filter(x => x !== o);
      st.log.unshift(`💸 بعتي ${o.name} بـ ${grp(o.value)} د: العمولة ${grp(o.value * COMM)}، الضريبة ${grp(tax)}${o.loan ? `، الكريدي ${grp(o.loan.bal)}` : ''} ← بقا ليك ${grp(net)} د.`);
    };
    st.next = () => {
      const ev = [];
      let m = R(L.mkt[0], L.mkt[1]);
      if (L.crisis && st.year === L.crisis) { m = -10; ev.push('📉 أزمة فالسوق: الأثمنة طاحت 10% هاد العام! (اللي عندو كريدي كبير بلا كاش كيعاني)'); }
      let inc = 0;
      for (const o of st.owned) {
        o.value = Math.round(o.value * (1 + (o.g + m) / 100));
        if (o.rent) {
          let r = o.rent * 0.85; // الصيانة، السانديك، الضريبة (~15%)
          if (Math.random() < o.vac) { r *= 0.5; ev.push(`🚪 ${o.name} فـ ${o.dist} بقا خاوي 6 شهور.`); }
          inc += r; o.rent = Math.round(o.rent * 1.02);
        }
        if (o.loan) { const it = o.loan.bal * RATE; o.loan.bal = Math.max(0, o.loan.bal - (o.loan.pay - it)); st.cash -= o.loan.pay; if (o.loan.bal < 1) o.loan = null; }
      }
      st.cash += inc + L.save;
      if (Math.random() < 0.45 && st.owned.length) {
        const o = pick(st.owned), e = R(0, 3);
        if (e === 0) { o.value = Math.round(o.value * 1.1); ev.push(`🚋 مشروع جديد قرب ${o.dist} (طريق/ترام): ${o.name} زاد 10%!`); }
        else if (e === 1 && o.rent) { const c = Math.round(o.value * 0.02); st.cash -= c; ev.push(`🔧 إصلاحات فـ ${o.name}: ${grp(c)} د.`); }
        else if (e === 2 && o.rent) { o.rent = Math.round(o.rent * 1.08); ev.push(`📈 الطلب كبير فـ ${o.dist}: الكراء طلع 8%.`); }
        else { const c = 8000; st.cash -= c; ev.push(`🧾 مصاريف إدارية وضرائب محلية: ${grp(c)} د.`); }
      }
      ev.unshift(`📅 العام ${st.year}: السوق ${m >= 0 ? '+' : ''}${m}%، الكراء الصافي ${grp(inc)} د، الادخار ${grp(L.save)} د، الأقساط ${grp(pays())} د.`);
      // الكاش سالب ← البيع الإجباري
      while (st.cash < 0 && st.owned.length) { const o = st.owned.slice().sort((a, b) => (b.loan ? b.loan.bal : 0) - (a.loan ? a.loan.bal : 0))[0]; ev.push('⚠️ الكاش ما كفاش للأقساط: البنك فرض البيع بزربة (-10%).'); o.value = Math.round(o.value * 0.9); st.sell(o.id); }
      st.log.unshift(...ev.reverse());
      st.year++;
      st.offers = [...st.offers.slice(0, 1).map(o => ({ ...o, price: Math.round(o.price * (1 + m / 100)), value: Math.round(o.price * (1 + m / 100)) })), offer(), offer()];
      if (st.net() >= L.target) { st.over = true; const used = st.year - 1; st.won = used <= L.years - 4 ? 3 : used <= L.years - 2 ? 2 : 1; }
      else if (st.year > L.years) st.over = true;
    };
    return st;
  }
  const TYC = {
    stages: TLV,
    play(root, g, si) {
      const gen = ++GEN, L = TLV[si], st = sim(si);
      root.innerHTML = `<div class="gm" style="--c:${g.color}">${top(g, `مرحلة ${si + 1}/${STAGES}`, '#/game/' + g.id)}<div class="gm-body"></div></div>`;
      root.querySelector('.gm-top a').onclick = e => { e.preventDefault(); GEN++; stagesView(root, g, TYC); };
      const paint = msg => {
        if (gen !== GEN) return;
        if (st.over) {
          const net = st.net();
          return result(root, g, TYC, si, st.won, Math.round(net / 1000), st.won ? `وصلتي لـ <b>${dh(net)}</b> فـ ${st.year - 1} سنين (الهدف ${dh(L.target)}).` : `سالا الوقت: الثروة ديالك ${dh(net)} والهدف كان ${dh(L.target)}.`, 'الكريدي كيكبر الربح وكيكبر الخطر. والمصاريف (7%) والعمولة والضريبة كيخليو البيع بزربة خاسر.');
        }
        const net = st.net(), p = Math.max(0, Math.min(100, net / L.target * 100));
        root.querySelector('.gm-body').innerHTML = `
          <div class="gm-kpi"><div><small>📅 العام</small><b>${st.year} / ${L.years}</b></div><div><small>💵 الكاش</small><b>${dh(st.cash)}</b></div>
            <div><small>🏦 الكريدي الباقي</small><b>${dh(st.owned.reduce((a, o) => a + (o.loan ? o.loan.bal : 0), 0))}</b></div><div><small>💎 الثروة الصافية</small><b>${dh(net)}</b></div>
            <div class="goal"><small>🎯 الهدف: ${dh(L.target)} — ${Math.round(p)}%</small><div class="gm-meter"><i style="width:${p}%"></i></div></div></div>
          ${msg ? `<div class="gm-why n" style="margin-top:10px">${esc(msg)}</div>` : ''}
          <h3 class="gm-h">🛒 عروض السوق هاد العام</h3>
          <div class="gm-list">${st.offers.map(o => `<div class="gm-it"><img src="${IMG}${o.img}.webp" alt="" loading="lazy"><div class="in"><b>${esc(o.name)} — ${esc(o.dist)}</b><span>💵 ${dh(o.price)} <small>(+ مصاريف ${dh(o.price * FEES)})</small></span><span>${o.rent ? `🔑 كراء ~${dh(o.rent / 12)}/شهر (${pct(o.rent / o.price * 100)})` : '🌱 بلا كراء — كتربح غير من الثمن'}</span><span>📈 تطور متوقع ~${pct(o.g, 0)}/عام</span></div>
            <div class="bt"><button data-b="${o.id}">💵 كاش</button><button class="c" data-l="${o.id}">🏦 كريدي 80%</button></div></div>`).join('')}</div>
          <h3 class="gm-h">🏠 الممتلكات ديالي (${st.owned.length})</h3>
          ${st.owned.length ? `<div class="gm-list">${st.owned.map(o => { const s = st.sellGain(o); return `<div class="gm-it"><div class="in"><b>${esc(o.name)} — ${esc(o.dist)}</b><span>القيمة: ${dh(o.value)} <span class="${o.value >= o.cost ? 'gm-up' : 'gm-dn'}">(${o.value >= o.cost ? '+' : ''}${Math.round((o.value - o.cost) / o.cost * 100)}%)</span></span>${o.rent ? `<span>🔑 ${dh(o.rent / 12)}/شهر</span>` : ''}${o.loan ? `<span>🏦 قسط ${dh(o.loan.pay / 12)}/شهر · باقي ${dh(o.loan.bal)}</span>` : '<span>✅ بلا كريدي</span>'}<span>إلا بعتي دابا: ${dh(s.net)}</span></div><div class="bt"><button data-s="${o.id}">💸 بيع</button></div></div>`; }).join('')}</div>` : '<p class="muted" style="margin:4px 2px">ما عندك والو مازال — شري أول عقار!</p>'}
          <button class="gm-next" data-n="1" style="margin-top:14px">⏭️ دوز للعام الجاي</button>
          <div class="gm-log">${st.log.slice(0, 7).map(x => `<div>${esc(x)}</div>`).join('') || '<div>💡 نصيحة: الكريدي كيخليك تشري أكثر بنفس الكاش، ولكن الأقساط خاصها تبقى تحت 40% من الدخل.</div>'}</div>`;
        const b = root.querySelector('.gm-body');
        b.querySelectorAll('[data-b]').forEach(x => x.onclick = () => paint(st.buy(+x.dataset.b, false)));
        b.querySelectorAll('[data-l]').forEach(x => x.onclick = () => paint(st.buy(+x.dataset.l, true)));
        b.querySelectorAll('[data-s]').forEach(x => x.onclick = () => { if (confirm('تبيع هاد العقار؟ (عمولة 2,5% + الضريبة على الربح)')) { st.sell(+x.dataset.s); paint(); } });
        b.querySelector('[data-n]').onclick = () => { st.next(); paint(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      };
      paint();
    },
  };

  // ============ 6) بني دارك (محاكاة البناء) ============
  const BLV = [
    { name: 'دار صغيرة R+1', sub: 'بقعة 90 م² · 180 م² مبنية', plot: 90, ppm: 3200, area: 180, budget: 1100000, months: 20, ev: 0.35 },
    { name: 'دار عائلية R+2', sub: 'بقعة 100 م² · 270 م² مبنية', plot: 100, ppm: 3500, area: 270, budget: 1450000, months: 22, ev: 0.4 },
    { name: 'فيلا فالمنزه', sub: 'بقعة 300 م² · 320 م² · جودة 95 مطلوبة', plot: 300, ppm: 4000, area: 320, budget: 2600000, months: 22, ev: 0.4, q: 95 },
    { name: 'ميزانية مزيرة', sub: '180 م² بـ 960 ألف درهم فقط', plot: 90, ppm: 3200, area: 180, budget: 960000, months: 18, ev: 0.4 },
    { name: 'الورش الصعيب', sub: '240 م² · وقت قصير · مفاجآت كثيرة', plot: 120, ppm: 3600, area: 240, budget: 1300000, months: 18, ev: 0.6 },
  ];
  // كل خطوة: اختيارات {t, s(ub), c(ost)(lv), m(onths), q(uality), risk:[احتمال، تكلفة، شهور، جودة، نص], fail(نص)، why}
  const STEPS = [
    { t: '1. البقعة', d: 'منين غادي تبدا؟', ch: [
      { t: 'بقعة محفظة فتجزئة مسلمة', s: 'رسم عقاري + مذكرة المعلومات التعميرية', c: L => L.plot * L.ppm, m: 1, q: 10, why: 'الرسم العقاري والتجزئة المسلمة (ماء، ضو، طرق) = رخصة بناء ممكنة وقيمة مضمونة.' },
      { t: 'بقعة «ملك» بلا رسم عقاري', s: 'أرخص بـ 25%', c: L => L.plot * L.ppm * 0.75, m: 1, q: 0, risk: [0.6, 60000, 5, -10, '⚖️ تعرض من الورثة على البقعة: محامي + 5 شهور توقف.'], why: 'بلا رسم عقاري، الحماية ضعيفة والمشاكل ديال الحدود والورثة كثيرة.' },
      { t: 'بقعة فتجزئة ما مسلماش', s: 'أرخص بـ 40% (بلا ماء ولا ضو)', c: L => L.plot * L.ppm * 0.6, m: 1, q: -5, risk: [1, 40000, 9, -10, '🚧 رخصة البناء ما كتعطاش حتى تتسلم التجزئة: 9 شهور ديال الانتظار + ربط مؤقت مكلف.'], why: 'التجزئة خاصها التسليم (التجهيزات) قبل ما تبني — الرخيص كيولي غالي.' },
    ] },
    { t: '2. التصميم', d: 'شكون غادي يدير التصميم؟', ch: [
      { t: 'مهندس معماري مسجل فالهيئة', s: '~200 د/م²', c: L => L.area * 200, m: 1, q: 10, why: 'فالمدن، المهندس المعماري ضروري لملف رخصة البناء (القانون 12-90)، وكيتبع الورش.' },
      { t: 'تصميم من الأنترنيت', s: 'شبه فابور', c: () => 3000, m: 0, q: 0, fix: L => L.area * 200, fixT: '❌ الجماعة رفضات الملف: خاص مهندس معماري مسجل. خلصتي المهندس من بعد + 2 شهور ضايعين.', fixM: 2, why: 'رخصة البناء خاصها ملف موقع من مهندس معماري.' },
      { t: 'رسام (dessinateur) بلا صفة', s: '10 000 د', c: () => 10000, m: 0, q: 0, fix: L => L.area * 200, fixT: '❌ الملف ترفض: الإمضاء خاصو مهندس معماري. خلصتي جوج مرات + 2 شهور.', fixM: 2, why: 'غير المهندس المعماري المسجل فالهيئة اللي يوقع ملف الرخصة.' },
    ] },
    { t: '3. رخصة البناء', d: 'كيفاش غادي تبدا الخدمة؟', ch: [
      { t: 'نطلب الرخصة عبر المنصة الإلكترونية ونتسنى', s: 'رسوم ~30 د/م² · شهرين', c: L => L.area * 30, m: 2, q: 5, why: 'الرخصة كتتطلب إلكترونياً (منصة رخص) وكتحميك من التوقيف والهدم.' },
      { t: 'نبداو بلا رخصة ونسويو من بعد', s: 'ربح شهرين', c: () => 0, m: 0, q: -10, risk: [0.85, 50000, 4, -10, '🚨 لجنة المراقبة وقفات الورش: غرامة + هدم الجزء المخالف + 4 شهور.'], why: 'البناء بلا رخصة مخالفة: توقيف، غرامة، وممكن الهدم — وما تقدرش تاخذ رخصة السكن.' },
      { t: 'نعطيو شي حاجة لشي واحد باش يزربها', s: 'بزربة…', c: () => 20000, m: 0, q: 0, fail: '⛔ الرشوة جريمة كيعاقب عليها القانون (للي عطا وللي خذا). اللعبة سالات هنا — عاود بالطريق القانوني.', why: 'ما كاين حتى طريق مختصر: الملف الكامل والمنصة الإلكترونية هما الطريق.' },
    ] },
    { t: '4. الدراسة التقنية', d: 'الأساس والخرسانة (البيطون)', ch: [
      { t: 'مكتب الدراسات (BET) + مختبر', s: '~140 د/م²', c: L => L.area * 140, m: 1, q: 15, why: 'مكتب الدراسات كيحسب الحديد والأعمدة، والمختبر كيتحقق من البيطون والتربة — ضروري للسلامة (وخصوصاً ضد الزلازل).' },
      { t: 'بلا دراسة، المعلم كيعرف', s: 'فابور', c: () => 0, m: 0, q: -10, risk: [0.6, 70000, 2, -15, '🧱 شقوق فالأعمدة والسقف: إصلاح وتقوية + 2 شهور.'], why: 'الهيكل بلا دراسة خطر على الأرواح، وكيكلف أكثر فالإصلاح.' },
    ] },
    { t: '5. الأشغال الكبرى (الهيكل)', d: 'شكون غادي يبني؟', ch: [
      { t: 'معلم بلا عقد', s: '1 500 د/م² · 8 شهور', c: L => L.area * 1500, m: 8, q: 0, risk: [0.55, 0, 3, -10, '⏳ المعلم غبر شهرين وتأخر، والخدمة ماشي مزيانة: +3 شهور.', 0.1], why: 'بلا عقد مكتوب (الثمن، الآجال، الجودة، الغرامات) ما عندك حتى ضمانة.' },
      { t: 'مقاولة بعقد مكتوب وآجال', s: '1 900 د/م² · 6 شهور', c: L => L.area * 1900, m: 6, q: 10, why: 'العقد المكتوب كيحدد الثمن والآجال وغرامات التأخير — هادي هي الحماية.' },
      { t: 'مقاولة كبيرة (premium)', s: '2 400 د/م² · 5 شهور', c: L => L.area * 2400, m: 5, q: 15, why: 'جودة وسرعة، ولكن الثمن كيأثر على الميزانية ديال التشطيب.' },
    ] },
    { t: '6. الماء والضو والقنوات', d: 'الشبكات داخل الدار', ch: [
      { t: 'مواد مضمونة + كهربائي مؤهل', s: '~250 د/م²', c: L => L.area * 250, m: 1, q: 10, why: 'الكهرباء والماء ماشي بلاصة التوفير: السلامة أولاً.' },
      { t: 'أرخص المواد', s: '~120 د/م²', c: L => L.area * 120, m: 1, q: -5, risk: [0.55, 25000, 1, -10, '💧 تسرب الماء فالحيطان من بعد شهور: تكسير وإصلاح.'], why: 'الرخيص فالقنوات كيخلص جوج مرات.' },
    ] },
    { t: '7. التشطيب', d: 'الزليج، الصباغة، الكوزينة، الحمامات…', ch: [
      { t: 'اقتصادي', s: '900 د/م² · 3 شهور', c: L => L.area * 900, m: 3, q: 0, why: 'كيبقى الدار صالحة للسكن بثمن معقول — ومن بعد تقدر تحسن شوية بشوية.' },
      { t: 'متوسط', s: '1 600 د/م² · 4 شهور', c: L => L.area * 1600, m: 4, q: 15, why: 'أحسن توازن بين الثمن والجودة لأغلب الديور.' },
      { t: 'راقي', s: '3 000 د/م² · 5 شهور', c: L => L.area * 3000, m: 5, q: 25, why: 'جودة عالية ولكن كتاكل الميزانية — حسب مزيان قبل.' },
    ] },
    { t: '8. رخصة السكن', d: 'الخطوة الأخيرة', ch: [
      { t: 'نطلب رخصة السكن (شهادة المطابقة)', s: '~3 000 د · شهر', c: () => 3000, m: 1, q: 10, why: 'رخصة السكن ضرورية للربط الرسمي بالماء والضو، وللبيع والقرض من بعد.' },
      { t: 'نسكنو بلا رخصة السكن', s: 'فابور', c: () => 0, m: 0, q: -20, why: 'بلا رخصة السكن: ما كاينش ربط رسمي بالعدادات، وما تقدرش تبيع ولا تاخذ قرض بالدار.' },
    ] },
  ];
  const EVENTS = [
    [1, 0, '🌧️ الشتا وقفات الورش شهر.'], [0, 15000, '🔩 ثمن الحديد والإسمنت طلع.'], [0, -8000, '🤝 لقيتي مواد بثمن مزيان عند مورد معروف.'], [0, 0, '🏘️ الجار اشتكى من الغبار — حطيتي حماية وتفاهمتو (الاحترام كيسهل الورش).'], [1, 6000, '🚛 تأخر فالتوصيل ديال المواد.'],
  ];
  const BLD = {
    stages: BLV,
    play(root, g, si) {
      const gen = ++GEN, L = BLV[si], st = { k: 0, cost: 0, months: 0, q: 20, log: [] };
      root.innerHTML = `<div class="gm" style="--c:${g.color}">${top(g, `مرحلة ${si + 1}/${STAGES}`, '#/game/' + g.id)}<div class="gm-body"></div></div>`;
      root.querySelector('.gm-top a').onclick = e => { e.preventDefault(); GEN++; stagesView(root, g, BLD); };
      const kpi = () => {
        const b = st.cost / L.budget * 100, mo = st.months / L.months * 100;
        return `<div class="gm-kpi"><div class="goal"><small>💰 الميزانية: ${dh(st.cost)} / ${dh(L.budget)} — باقي ${dh(L.budget - st.cost)}</small><div class="gm-meter ${b > 100 ? 'over' : ''}"><i style="width:${Math.min(100, b)}%"></i></div></div>
          <div><small>⏱️ المدة</small><b>${st.months} / ${L.months} شهر</b></div><div><small>⭐ الجودة</small><b>${Math.max(0, Math.min(100, st.q))}/100</b></div>
          <div class="goal"><div class="gm-meter ${mo > 100 ? 'over' : ''}"><i style="width:${Math.min(100, mo)}%"></i></div></div></div>`;
      };
      const finish = failTxt => {
        const q = Math.max(0, Math.min(100, st.q)), inB = st.cost <= L.budget, inM = st.months <= L.months, qOk = q >= (L.q || 80);
        const stars = failTxt || !inB ? 0 : 1 + (qOk ? 1 : 0) + (inM ? 1 : 0);
        result(root, g, BLD, si, stars, Math.round(q * 10 + Math.max(0, L.budget - st.cost) / 1000),
          failTxt ? esc(failTxt) : `التكلفة ${dh(st.cost)} (${inB ? '✅ فالميزانية' : '❌ فاتت الميزانية'}) · المدة ${st.months} شهر (${inM ? '✅' : '⏳ متأخر'}) · الجودة ${q}/100 (${qOk ? '✅' : `خاص ${L.q || 80}`}).`,
          'الترتيب الصحيح: بقعة محفظة ← مهندس معماري ← رخصة البناء ← دراسة تقنية ← مقاولة بعقد ← شبكات مضمونة ← تشطيب حسب الميزانية ← رخصة السكن.');
      };
      const paint = out => {
        if (gen !== GEN) return;
        if (st.k >= STEPS.length) return finish();
        const S = STEPS[st.k];
        root.querySelector('.gm-body').innerHTML = `${kpi()}
          ${out ? `<div class="gm-why ${out.good ? 'y' : 'n'}">${out.html}</div>` : `<div class="gm-how" style="margin-top:10px">🏗️ <b>${esc(L.name)}</b> — ${esc(L.sub)}. ثمن البقعة فالحي ~${grp(L.ppm)} د/م².</div>`}
          <h3 class="gm-h">${esc(S.t)} — ${esc(S.d)}</h3>
          <div class="gm-ch">${S.ch.map((c, i) => `<button class="gm-c" data-c="${i}"><b>${esc(c.t)}</b><span>${esc(c.s)}</span><i>💰 ${dh(c.c(L))}${c.m ? ` · ⏱️ ${c.m} شهر` : ''}</i></button>`).join('')}</div>`;
        root.querySelectorAll('.gm-c').forEach(b => b.onclick = () => choose(S.ch[+b.dataset.c]));
      };
      const choose = c => {
        if (c.fail) return finish(c.fail + ' — ' + c.why);
        st.cost += c.c(L); st.months += c.m; st.q += c.q;
        const lines = [`<b class="t">${c.risk || c.fix || c.q < 0 ? '🤔' : '✅'} ${esc(c.t)}</b>${esc(c.why)}`];
        let good = !(c.q < 0 || c.fix);
        if (c.fix) { st.cost += c.fix(L); st.months += c.fixM; lines.push(esc(c.fixT)); }
        if (c.risk && Math.random() < c.risk[0]) { const [, cost, mo, q, txt, pctC] = c.risk; st.cost += cost + (pctC ? c.c(L) * pctC : 0); st.months += mo; st.q += q; lines.push(`<b>${esc(txt)}</b>`); good = false; }
        else if (c.risk) lines.push('😅 هاد المرة دازت على خير… ولكن الخطر كان كبير.');
        if (st.k > 0 && st.k < STEPS.length - 1 && Math.random() < L.ev) { const [mo, cost, txt] = pick(EVENTS); st.months += mo; st.cost += cost; lines.push(esc(txt) + (cost ? ` (${cost > 0 ? '+' : ''}${grp(cost)} د)` : '')); }
        st.k++;
        paint({ good, html: lines.join('<br>') });
      };
      paint();
    },
  };

  const DEFS = { price: { ...PRICE, play: (r, g, i) => quiz(r, g, PRICE, i) }, calc: { ...CALC, play: (r, g, i) => quiz(r, g, CALC, i) }, law: { ...LAWG, play: (r, g, i) => quiz(r, g, LAWG, i) }, scam: { ...SCAMG, play: (r, g, i) => quiz(r, g, SCAMG, i) }, tycoon: TYC, build: BLD };
  // باش ترجع للمراحل، الـ play ديال quiz كيستعمل DEFS (نفس الكائن)
  for (const k of ['price', 'calc', 'law', 'scam']) { const d = DEFS[k]; d.play = (r, g, i) => quiz(r, g, d, i); }

  function mount(root, id) {
    css(); GEN++;
    const g = G(id), def = DEFS[id];
    if (!g || !def) return hub(root);
    stagesView(root, g, def);
  }

  window.W777_GAMES = { list: GAMES, hub, mount, _t: { sim, TLV, BLV, STEPS, LAW, SCAM, PRICE, CALC, market } };
})();
