/* ============================================================
   أكاديمية الوسيط — واجهة التكوين (#/learn)
   W777_ACADEMY.mount(root, parts, host)  ← الصفحات: الرئيسية، الوحدة، الدرس، الاختبار، الشهادة
   W777_ACADEMY.printModule(root, m)       ← نسخة الطباعة (PDF) ديال وحدة
   host: { ask(prompt), mood(name), name, office }
   التقدم محفوظ فالمتصفح: localStorage «w777_acad»
   ============================================================ */
(function () {
  'use strict';
  const LS = 'w777_acad', IMG = 'game/img/';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const A = () => window.W777_ACAD;
  const load = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) { /* */ } };
  const st = m => { const s = load(); return s[m] || { les: {}, best: 0, pass: 0, tries: 0 }; };
  // ☁️ التزامن مع السحابة (host.sync): كل تبديل كيترفع من بعد 1.5 ثانية، وأول فتح كيجيب التقدم من الأجهزة الأخرى
  let HOST = null, PULLED = false, PUSH_T = null;
  const summary = () => {
    const s = load(), M = (A() && A().modules) || [], ok = M.filter(x => s[x.m] && s[x.m].pass);
    return { progress: s, passed: ok.length, avg: M.length ? Math.round(M.reduce((a, x) => a + ((s[x.m] && s[x.m].best) || 0), 0) / M.length * 1000) / 1000 : 0, cert_no: (s.cert && s.cert.no) || null, cert_name: (s.cert && s.cert.name) || null };
  };
  const schedPush = () => { if (!HOST || !HOST.sync) return; clearTimeout(PUSH_T); PUSH_T = setTimeout(() => { HOST.sync.push(summary()).catch(() => { }); }, 1500); };
  // الدمج: الدروس = الاتحاد، أحسن نتيجة = الأكبر، النجاح = أول تاريخ، المحاولات = الأكثر
  function merge(r) {
    const s = load(); let more = false;
    Object.keys(r || {}).forEach(k => {
      if (!/^M\d$/.test(k)) return;
      const a = s[k] || { les: {}, best: 0, pass: 0, tries: 0 }, b = r[k] || {};
      const les = Object.assign({}, b.les || {}, a.les || {});
      const n = { les, best: Math.max(a.best || 0, b.best || 0), pass: (a.pass && b.pass) ? Math.min(a.pass, b.pass) : (a.pass || b.pass || 0), tries: Math.max(a.tries || 0, b.tries || 0) };
      if (JSON.stringify(n) !== JSON.stringify(s[k] || null)) { s[k] = n; more = true; }
    });
    if (!s.cert && r && r.cert) { s.cert = r.cert; more = true; }
    if (more) save(s);
    return more;
  }
  const setAll = fn => { const s = load(); fn(s); save(s); schedPush(); };
  const setSt = (m, fn) => { const s = load(); s[m] = s[m] || { les: {}, best: 0, pass: 0, tries: 0 }; fn(s[m], s); save(s); schedPush(); };
  const mods = () => A().modules;
  const idx = m => mods().findIndex(x => x.m === m);
  const isOpen = i => i === 0 || !!st(mods()[i - 1].m).pass;
  const allPassed = () => mods().every(x => st(x.m).pass);
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const pct = x => Math.round(x * 100) + '%';
  let CRED = null; const credits = () => CRED || (CRED = fetch(IMG + 'credits.json').then(r => r.json()).catch(() => ({})));
  let GEN = 0;

  function css() {
    if (document.getElementById('ac-css')) return;
    const s = document.createElement('style'); s.id = 'ac-css';
    s.textContent = `
.ac{max-width:980px;margin:0 auto;--c:#c8102e}
.ac *{box-sizing:border-box}
.ac-hero{position:relative;overflow:hidden;border-radius:22px;padding:20px 18px;color:#fff;background:radial-gradient(120% 140% at 100% 0,#5b0a17 0,#1b0b10 45%,#0d0d10 100%);box-shadow:0 18px 40px -18px rgba(200,16,46,.55)}
.ac-hero .kick{color:#ffcf6b;font-weight:800;font-size:13px;letter-spacing:.3px}
.ac-hero h1{margin:6px 0 6px;font-size:25px;line-height:1.3}
.ac-hero p{margin:0;opacity:.85;line-height:1.7;font-size:14.5px}
.ac-road{display:flex;gap:2px;margin-top:16px;align-items:center;flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px}
.ac-road a{flex:0 0 36px;text-decoration:none;color:#fff;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;font-weight:800;min-width:36px}
.ac-road a i{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:19px;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.25)}
.ac-road a.ok i{background:#0a7a2f;border-color:#3ddc84}.ac-road a.cur i{background:#c8102e;border-color:#ff8a9a;box-shadow:0 0 0 5px rgba(200,16,46,.3);animation:acPulse 1.8s infinite}
.ac-road a.lk{opacity:.45}.ac-road b{display:block;height:2px;flex:1 1 4px;background:rgba(255,255,255,.2);min-width:3px;margin-top:-16px}
@keyframes acPulse{0%,100%{box-shadow:0 0 0 4px rgba(200,16,46,.35)}50%{box-shadow:0 0 0 9px rgba(200,16,46,.08)}}
.ac-prog{height:8px;background:rgba(255,255,255,.15);border-radius:9px;overflow:hidden;margin-top:14px}.ac-prog i{display:block;height:100%;background:linear-gradient(90deg,#c8102e,#ffcf6b)}
.ac-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.ac-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:8px 18px;line-height:1.35;text-align:center;border-radius:14px;border:0;font:inherit;font-weight:900;font-size:15px;cursor:pointer;text-decoration:none;background:var(--c);color:#fff;box-shadow:0 4px 0 rgba(0,0,0,.25)}
.ac-btn.w{background:#fff;color:#111;box-shadow:0 0 0 1px #ddd,0 3px 0 rgba(0,0,0,.12)}.ac-btn.k{background:#111;color:#fff}.ac-btn[disabled]{opacity:.45;cursor:not-allowed}
.ac-btn:active{transform:translateY(2px);box-shadow:none}
.ac-grid{display:grid;grid-template-columns:1fr;gap:12px;margin-top:16px}
@media(min-width:760px){.ac-grid{grid-template-columns:1fr 1fr}}
.ac-mod{position:relative;display:flex;flex-direction:column;background:var(--surface,#fff);border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px var(--line,#e7e7e7),0 10px 24px -16px rgba(0,0,0,.35);text-decoration:none;color:inherit}
.ac-mod .top{display:flex;gap:12px;align-items:center;padding:14px;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 55%,#000));color:#fff}
.ac-mod .top img{width:62px;height:62px;border-radius:14px;object-fit:cover;border:2px solid rgba(255,255,255,.6);flex:none}
.ac-mod .top .mm{font-weight:900;font-size:12px;background:rgba(255,255,255,.2);border-radius:999px;padding:2px 9px;display:inline-block}
.ac-mod .top b{display:block;font-size:17px;line-height:1.35;margin-top:3px}
.ac-mod .bd{padding:12px 14px;display:flex;flex-direction:column;gap:8px;flex:1}
.ac-mod .bd small{color:var(--muted,#666);line-height:1.6}
.ac-mini{height:7px;background:var(--surface-2,#eee);border-radius:9px;overflow:hidden}.ac-mini i{display:block;height:100%;background:var(--c)}
.ac-tag{display:inline-flex;align-items:center;gap:5px;font-weight:800;font-size:12.5px;border-radius:999px;padding:3px 10px;background:var(--surface-2,#f1f1f1)}
.ac-tag.ok{background:#e6f6ea;color:#0a7a2f}.ac-tag.lk{background:#f3f3f3;color:#777}.ac-tag.go{background:#fdecee;color:#c8102e}
.ac-mod.lk{filter:grayscale(.85);opacity:.75}
.ac-card{background:var(--surface,#fff);border-radius:18px;padding:14px 16px;margin-top:14px;box-shadow:0 0 0 1px var(--line,#e7e7e7)}
.ac-card h3{margin:0 0 8px;font-size:17px}
.ac-lessons{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.ac-l{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:14px;background:var(--surface,#fff);box-shadow:0 0 0 1px var(--line,#e7e7e7);text-decoration:none;color:inherit}
.ac-l .n{width:38px;height:38px;flex:none;border-radius:50%;display:grid;place-items:center;font-weight:900;background:var(--surface-2,#f1f1f1)}
.ac-l.done .n{background:#0a7a2f;color:#fff}
.ac-l img{width:54px;height:54px;border-radius:12px;object-fit:cover;flex:none}
.ac-l b{display:block;line-height:1.4}.ac-l small{color:var(--muted,#666)}
.ac-les h1{font-size:23px;margin:8px 0 4px;line-height:1.35}
.ac-crumb{font-size:13px;font-weight:800;color:var(--c);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ac-crumb a{color:inherit}
.ac-ph{width:100%;max-height:260px;object-fit:cover;border-radius:18px;display:block;margin-top:10px;background:#eee}
.ac-cred{font-size:10px;color:#888;direction:ltr;text-align:left;margin:3px 4px 0}
.ac-sec{margin-top:14px;border-radius:16px;padding:12px 14px;line-height:1.85;font-size:15.5px}
.ac-sec h4{margin:0 0 4px;font-size:15px}
.ac-idea{background:var(--surface,#fff);box-shadow:0 0 0 1px var(--line,#e7e7e7);border-inline-start:5px solid var(--c)}
.ac-pts{background:var(--surface,#fff);box-shadow:0 0 0 1px var(--line,#e7e7e7)}
.ac-pts ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.ac-pts li{display:flex;gap:8px}.ac-pts li::before{content:'✔';color:var(--c);font-weight:900;flex:none}
.ac-ex{background:#eef6ff;color:#0b2a4a}.ac-err{background:#fff4e5;color:#4a2a00}
:root[data-theme="dark"] .ac-ex{background:#132235;color:#d8e8ff}:root[data-theme="dark"] .ac-err{background:#2c2010;color:#ffe2b5}
.ac-info{margin-top:14px;border-radius:18px;padding:14px;background:linear-gradient(160deg,#151518,#2a0c12);color:#fff}
.ac-info .t{font-weight:900;color:#ffcf6b;margin-bottom:10px;font-size:14.5px}
.ac-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(74px,1fr));gap:8px;align-items:stretch}
.ac-steps .s{flex:1 1 92px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:10px 6px;text-align:center;position:relative}
.ac-steps .s .e{font-size:24px;display:block}.ac-steps .s b{display:block;font-size:13.5px;margin-top:4px}.ac-steps .s small{display:block;opacity:.7;font-size:11.5px;margin-top:2px}
.ac-steps .s .k{position:absolute;top:-8px;inset-inline-start:-6px;width:22px;height:22px;border-radius:50%;background:#c8102e;color:#fff;font-size:12px;font-weight:900;display:grid;place-items:center}
.ac-vs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ac-vs>div{border-radius:14px;padding:10px;background:rgba(255,255,255,.06)}.ac-vs>div:first-child{box-shadow:inset 0 0 0 2px rgba(61,220,132,.5)}.ac-vs>div:last-child{box-shadow:inset 0 0 0 2px rgba(255,92,112,.5)}
.ac-vs b{display:block;margin-bottom:6px}.ac-vs ul{margin:0;padding:0 16px 0 0;font-size:13.5px;line-height:1.7}
.ac-calc .f{font-size:17px;font-weight:900;background:rgba(255,255,255,.08);border-radius:12px;padding:10px 12px;line-height:1.6}
.ac-calc .x{margin-top:8px;font-size:15px;color:#ffcf6b;font-weight:800;line-height:1.6}.ac-calc .nt{margin-top:6px;font-size:12.5px;opacity:.75}
.ac-chk{display:grid;grid-template-columns:1fr;gap:6px}@media(min-width:560px){.ac-chk{grid-template-columns:1fr 1fr}}
.ac-chk div{display:flex;gap:8px;align-items:flex-start;background:rgba(255,255,255,.07);border-radius:12px;padding:8px 10px;font-size:13.5px;line-height:1.6}.ac-chk div::before{content:'☑';color:#3ddc84;font-weight:900}
.ac-q{margin-top:10px;background:var(--surface,#fff);border-radius:16px;padding:12px;box-shadow:0 0 0 1px var(--line,#e7e7e7)}
.ac-q p{margin:0 0 8px;font-weight:800;line-height:1.6}
.ac-opts{display:flex;flex-direction:column;gap:6px}
.ac-o{text-align:start;min-height:46px;border-radius:12px;border:2px solid var(--line,#ddd);background:var(--surface,#fff);color:inherit;font:inherit;font-weight:700;font-size:14.5px;padding:8px 12px;cursor:pointer}
.ac-o.ok{border-color:#0a7a2f;background:#e6f6ea;color:#0a5a22}.ac-o.bad{border-color:#c8102e;background:#fdecee;color:#8a0b1f}.ac-o.sel{border-color:var(--c);box-shadow:0 0 0 3px color-mix(in srgb,var(--c) 25%,transparent)}
.ac-o[disabled]{cursor:default}
.ac-why{margin-top:8px;font-size:13.5px;line-height:1.7;border-radius:10px;padding:8px 10px;background:var(--surface-2,#f5f5f5)}
.ac-nav{display:flex;gap:8px;justify-content:space-between;margin-top:18px;flex-wrap:wrap}
.ac-exam .bar{height:9px;background:var(--surface-2,#eee);border-radius:9px;overflow:hidden;margin:10px 0}.ac-exam .bar i{display:block;height:100%;background:var(--c);transition:width .3s}
.ac-score{text-align:center;padding:18px 10px}
.ac-score .big{font-size:52px;font-weight:900;line-height:1}
.ac-score.ok .big{color:#0a7a2f}.ac-score.no .big{color:#c8102e}
.ac-rev{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.ac-rev div{border-radius:12px;padding:10px 12px;font-size:14px;line-height:1.7;background:var(--surface,#fff);box-shadow:0 0 0 1px var(--line,#e7e7e7)}
.ac-rev div.no{box-shadow:inset 4px 0 0 #c8102e,0 0 0 1px var(--line,#e7e7e7)}
.ac-note{font-size:12.5px;color:var(--muted,#777);margin-top:14px;line-height:1.7}
.ac-cert{position:relative;width:100%;max-width:900px;margin:14px auto 0;aspect-ratio:1.414;background:#fff;color:#111;border-radius:6px;overflow:hidden;box-shadow:0 20px 50px -20px rgba(0,0,0,.45);container-type:inline-size}
.ac-cert .fr{position:absolute;inset:2.2cqw;border:.5cqw solid #111;outline:.25cqw solid #c8102e;outline-offset:.8cqw}
.ac-cert .in{position:absolute;inset:4.6cqw 5.2cqw 4cqw;display:flex;flex-direction:column;align-items:center;text-align:center}
.ac-cert .lg{width:11cqw;height:11cqw;border-radius:50%;object-fit:cover;border:.5cqw solid #c8102e}
.ac-cert .k{margin-top:1.4cqw;font-size:2cqw;font-weight:800;color:#c8102e;letter-spacing:.2cqw}
.ac-cert h2{margin:.6cqw 0 0;font-size:3.9cqw;line-height:1.25}
.ac-cert .to{margin-top:1.4cqw;font-size:2.1cqw;color:#555}
.ac-cert .nm{margin-top:.6cqw;font-size:5cqw;font-weight:900;color:#111;border-bottom:.3cqw solid #c8102e;padding:0 3cqw .4cqw}
.ac-cert .tx{margin-top:1.2cqw;font-size:1.75cqw;line-height:1.7;max-width:80%;color:#333}
.ac-cert .mods{display:flex;gap:.6cqw;flex-wrap:wrap;justify-content:center;margin-top:1.2cqw;max-width:92%}
.ac-cert .mods span{font-size:1.2cqw;font-weight:800;border:.15cqw solid #111;border-radius:99cqw;padding:.3cqw 1.2cqw}
.ac-cert .ft{margin-top:auto;width:100%;display:flex;justify-content:space-between;align-items:flex-end;font-size:1.6cqw;line-height:1.6;color:#333}
.ac-cert .ft b{display:block;font-size:1.9cqw;color:#111}
.ac-cert .seal{flex:none;width:13cqw;height:13cqw;transform:rotate(-12deg);opacity:.93;filter:drop-shadow(0 .3cqw .6cqw rgba(200,16,46,.25))}.ac-cert .seal svg{width:100%;height:100%;display:block}
@media print{body.ac-printing *{visibility:hidden!important}body.ac-printing .ac-cert,body.ac-printing .ac-cert *{visibility:visible!important}
 body.ac-printing .ac-cert{position:fixed;inset:0;margin:0;max-width:none;width:100%;border-radius:0;box-shadow:none}}
`;
    document.head.appendChild(s);
  }

  // ---------- الرسم التعليمي ----------
  function info(x) {
    if (!x) return '';
    let b = '';
    if (x.k === 'steps') b = `<div class="ac-steps">${x.items.map((s, i) => `<div class="s"><span class="k">${i + 1}</span><span class="e">${s[0]}</span><b>${esc(s[1])}</b><small>${esc(s[2])}</small></div>`).join('')}</div>`;
    else if (x.k === 'vs') b = `<div class="ac-vs">${[x.a, x.b].map(c => `<div><b>${esc(c[0])}</b><ul>${c[1].map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div>`;
    else if (x.k === 'calc') b = `<div class="ac-calc"><div class="f">🧮 ${esc(x.f)}</div><div class="x">مثال: ${esc(x.ex)}</div>${x.note ? `<div class="nt">💡 ${esc(x.note)}</div>` : ''}</div>`;
    else if (x.k === 'check') b = `<div class="ac-chk">${x.items.map(i => `<div>${esc(i)}</div>`).join('')}</div>`;
    return `<div class="ac-info"><div class="t">📊 ${esc(x.title)}</div>${b}</div>`;
  }
  const photo = img => `<img class="ac-ph" src="${IMG}${img}.webp" alt="" loading="lazy" decoding="async"><div class="ac-cred" data-cr="${img}"></div>`;
  function fillCred(root) { credits().then(c => root.querySelectorAll('[data-cr]').forEach(el => { const x = c[el.dataset.cr]; if (x) el.textContent = `📷 ${x.by} · ${x.lic}`; })); }

  // ---------- الرئيسية ----------
  function home(root, host) {
    const M = mods(), passed = M.filter(x => st(x.m).pass).length;
    const cur = M.findIndex((x, i) => isOpen(i) && !st(x.m).pass);
    root.innerHTML = `<div class="ac">
      <div class="ac-hero"><div class="kick">🎓 ${esc(A().title)}</div>
        <h1>من مندوب عقاري إلى صاحب وكالة</h1><p>${esc(A().tagline)}. دروس قصيرة وسهلة بالصور والأمثلة من مكناس، وفي آخر كل وحدة اختبار — النجاح بـ ${pct(A().pass)} يفتح الوحدة الموالية، وفي النهاية شهادة باسمك.</p>
        <div class="ac-road">${M.map((x, i) => `${i ? '<b></b>' : ''}<a href="#/learn/${x.m}" class="${st(x.m).pass ? 'ok' : i === cur ? 'cur' : isOpen(i) ? '' : 'lk'}"><i>${st(x.m).pass ? '✓' : isOpen(i) ? x.icon : '🔒'}</i>${x.m}</a>`).join('')}</div>
        <div class="ac-prog"><i style="width:${passed / M.length * 100}%"></i></div>
        <div class="ac-row" style="margin-top:12px">${cur >= 0 ? `<a class="ac-btn" href="#/learn/${M[cur].m}">▶ ${passed ? 'كمّل' : 'ابدأ'}: ${esc(M[cur].m)} — ${esc(M[cur].t)}</a>` : `<a class="ac-btn" href="#/learn/cert">🏆 الشهادة ديالك</a>`}
          <button class="ac-btn w" data-ask="1">🤖 تعلم مع منير</button>${host.team ? '<a class="ac-btn w" href="#/learn/team">📊 تقدم الفريق</a>' : ''}</div>
        <small style="display:block;margin-top:8px;opacity:.75">${passed} / ${M.length} وحدات ناجحة</small></div>
      <div class="ac-grid">${M.map((x, i) => card(x, i)).join('')}</div>
      <a class="ac-card" href="#/learn/cert" style="display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit">
        <span style="font-size:40px">🏆</span><span><b style="font-size:17px">شهادة الوكيل العقاري المحترف</b><br><small class="muted">${allPassed() ? 'مبروك! صاوب الشهادة باسمك واطبعها PDF.' : `كتتفتح ملي تنجح فالوحدات السبعة (${passed}/7).`}</small></span></a>
      <p class="ac-note">ℹ️ ${esc(A().note)}</p></div>`;
    root.querySelector('[data-ask]').onclick = () => host.ask('سلام أستاذ منير! أنا كنتكون فأكاديمية الوسيط (7 وحدات: المهنة والأخلاقيات، القانون، التعمير، الأرقام، التجارة، التسويق، إنشاء الوكالة). شرح ليا من فين نبدا، وعطيني سؤال صغير باش تعرف المستوى ديالي.');
  }
  function card(x, i) {
    const s = st(x.m), n = Object.keys(s.les || {}).length, open = isOpen(i);
    const tag = s.pass ? `<span class="ac-tag ok">✅ ناجح · ${pct(s.best)}</span>` : open ? `<span class="ac-tag go">🔓 مفتوحة${s.tries ? ` · أحسن نتيجة ${pct(s.best)}` : ''}</span>` : `<span class="ac-tag lk">🔒 نجح فـ ${mods()[i - 1].m} أولاً</span>`;
    return `<a class="ac-mod ${open ? '' : 'lk'}" href="#/learn/${x.m}" style="--c:${x.color}">
      <div class="top"><img src="${IMG}${x.img}.webp" alt="" loading="lazy"><div><span class="mm">${x.icon} ${x.m}</span><b>${esc(x.t)}</b></div></div>
      <div class="bd"><small>${esc(x.sub)}</small><div class="ac-mini"><i style="width:${n / x.lessons.length * 100}%"></i></div>
        <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><small>📚 ${n}/${x.lessons.length} دروس · ⏱️ ${esc(x.h)}</small>${tag}</div></div></a>`;
  }

  // ---------- صفحة الوحدة ----------
  function module(root, host, m) {
    const i = idx(m), x = mods()[i];
    if (!x) return home(root, host);
    if (!isOpen(i)) return locked(root, x, i);
    const s = st(m);
    root.innerHTML = `<div class="ac" style="--c:${x.color}">
      <div class="ac-crumb"><a href="#/learn">🎓 الأكاديمية</a> ‹ <span>${x.m}</span></div>
      <div class="ac-hero" style="margin-top:8px;background:linear-gradient(135deg,${x.color},#111)"><div class="kick">${x.icon} ${x.m} · ⏱️ ${esc(x.h)}</div><h1>${esc(x.t)}</h1><p>🎯 ${esc(x.goal)}</p>
        <div class="ac-row"><a class="ac-btn w" href="#/learn/${x.m}/${firstTodo(x)}">▶ ${Object.keys(s.les || {}).length ? 'كمّل الدروس' : 'ابدأ الدرس 1'}</a><a class="ac-btn k" href="#/learn/${x.m}/exam">📝 الاختبار</a><a class="ac-btn w" href="files/formation/${x.m}.pdf" target="_blank" rel="noopener">📄 PDF</a></div></div>
      <div class="ac-lessons">${x.lessons.map((l, j) => `<a class="ac-l ${s.les && s.les[j] ? 'done' : ''}" href="#/learn/${x.m}/${j}"><span class="n">${s.les && s.les[j] ? '✓' : j + 1}</span><img src="${IMG}${l.img}.webp" alt="" loading="lazy"><span style="flex:1;min-width:0"><b>${esc(l.t)}</b><small>${esc(l.info ? l.info.title : '')}</small></span></a>`).join('')}</div>
      <div class="ac-card"><h3>📝 اختبار الوحدة</h3><p style="margin:0;line-height:1.7">${A().examN} أسئلة عشوائية من ${x.exam.length}. النجاح بـ ${pct(A().pass)} (${Math.ceil(A().examN * A().pass)}/${A().examN}) ${i + 1 < mods().length ? `يفتح ${mods()[i + 1].m}` : 'يفتح الشهادة'}. تقدر تعاود بلا حدود.</p>
        ${s.tries ? `<p style="margin:8px 0 0"><b>أحسن نتيجة: ${pct(s.best)}</b> ${s.pass ? '✅ ناجح' : '— مازال'} · ${s.tries} محاولة</p>` : ''}
        <div class="ac-row"><a class="ac-btn" href="#/learn/${x.m}/exam">${s.pass ? '🔁 عاود الاختبار' : '📝 دوز الاختبار'}</a></div></div></div>`;
  }
  const firstTodo = x => { const s = st(x.m); const j = x.lessons.findIndex((_, k) => !(s.les || {})[k]); return j < 0 ? 0 : j; };
  function locked(root, x, i) {
    const p = mods()[i - 1];
    root.innerHTML = `<div class="ac" style="--c:${x.color}"><div class="ac-crumb"><a href="#/learn">🎓 الأكاديمية</a> ‹ ${x.m}</div>
      <div class="ac-card" style="text-align:center;padding:26px 16px"><div style="font-size:52px">🔒</div><h3>${esc(x.m)} — ${esc(x.t)}</h3>
      <p style="line-height:1.8">هاد الوحدة كتتفتح ملي تنجح فاختبار <b>${p.m} — ${esc(p.t)}</b> بـ ${pct(A().pass)} على الأقل.</p>
      <a class="ac-btn" style="--c:${p.color}" href="#/learn/${p.m}">↩ رجع لـ ${p.m}</a></div></div>`;
  }

  // ---------- الدرس ----------
  function lesson(root, host, m, j) {
    const i = idx(m), x = mods()[i], l = x && x.lessons[j];
    if (!l) return module(root, host, m);
    if (!isOpen(i)) return locked(root, x, i);
    const done = !!(st(m).les || {})[j], last = j === x.lessons.length - 1;
    root.innerHTML = `<div class="ac ac-les" style="--c:${x.color}">
      <div class="ac-crumb"><a href="#/learn">🎓 الأكاديمية</a> ‹ <a href="#/learn/${m}">${x.icon} ${m}</a> ‹ <span>الدرس ${j + 1}/${x.lessons.length}</span></div>
      <h1>${esc(l.t)}</h1>
      ${photo(l.img)}
      <div class="ac-sec ac-idea"><h4>🎯 الفكرة ببساطة</h4>${esc(l.intro)}</div>
      ${info(l.info)}
      <div class="ac-sec ac-pts"><h4>📌 النقاط المهمة</h4><ul>${l.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
      <div class="ac-sec ac-ex"><h4>🏙️ مثال من الواقع (مكناس)</h4>${esc(l.ex)}</div>
      <div class="ac-sec ac-err"><h4>⚠️ خطأ شائع</h4>${esc(l.err)}</div>
      <div class="ac-card"><h3>✅ تحقق من فهمك</h3><div id="ac-qs"></div></div>
      <div class="ac-row"><button class="ac-btn w" data-ask="1">🤖 شرح ليا هاد الدرس بالدارجة</button></div>
      <div class="ac-nav">${j > 0 ? `<a class="ac-btn w" href="#/learn/${m}/${j - 1}">→ السابق</a>` : `<a class="ac-btn w" href="#/learn/${m}">→ الوحدة</a>`}
        ${last ? `<a class="ac-btn" href="#/learn/${m}/exam">📝 الاختبار ديال ${m}</a>` : `<a class="ac-btn" href="#/learn/${m}/${j + 1}">الدرس الموالي ←</a>`}</div></div>`;
    fillCred(root);
    const box = root.querySelector('#ac-qs'); let answered = 0;
    l.q.forEach((q, k) => {
      const opts = shuffle(q[1].map((t, n) => ({ t, ok: n === 0 })));
      const d = document.createElement('div'); d.className = 'ac-q';
      d.innerHTML = `<p>${k + 1}. ${esc(q[0])}</p><div class="ac-opts">${opts.map((o, n) => `<button class="ac-o" data-n="${n}">${esc(o.t)}</button>`).join('')}</div><div class="ac-w"></div>`;
      d.querySelectorAll('.ac-o').forEach(b => b.onclick = () => {
        const o = opts[+b.dataset.n];
        d.querySelectorAll('.ac-o').forEach((c, n) => { c.disabled = true; if (opts[n].ok) c.classList.add('ok'); else if (c === b) c.classList.add('bad'); });
        d.querySelector('.ac-w').innerHTML = `<div class="ac-why">${o.ok ? '✅ صحيح! ' : '❌ الجواب الصحيح بالأخضر. '}${esc(q[2])}</div>`;
        if (++answered === l.q.length) { setSt(m, s => { s.les[j] = Date.now(); }); if (!done && host.mood) host.mood('happy'); }
      });
      box.appendChild(d);
    });
    root.querySelector('[data-ask]').onclick = () => host.ask(`أستاذ منير، شرح ليا بالدارجة وبكلام ساهل درس «${l.t}» من وحدة ${m} «${x.t}» فأكاديمية الوسيط، بمثال من مكناس، ومن بعد سولني سؤال واحد باش نتأكد فهمت.`);
  }

  // ---------- الاختبار ----------
  function exam(root, host, m) {
    const i = idx(m), x = mods()[i];
    if (!x) return home(root, host);
    if (!isOpen(i)) return locked(root, x, i);
    const gen = ++GEN, N = Math.min(A().examN, x.exam.length), need = Math.ceil(N * A().pass);
    const qs = shuffle(x.exam).slice(0, N).map(q => ({ q, opts: shuffle(q[1].map((t, n) => ({ t, ok: n === 0 }))), pick: -1 }));
    let k = 0;
    const paint = () => {
      if (gen !== GEN) return;
      const Q = qs[k];
      root.innerHTML = `<div class="ac ac-exam" style="--c:${x.color}">
        <div class="ac-crumb"><a href="#/learn">🎓 الأكاديمية</a> ‹ <a href="#/learn/${m}">${x.icon} ${m}</a> ‹ <span>📝 الاختبار</span></div>
        <div class="bar"><i style="width:${k / N * 100}%"></i></div>
        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:13.5px"><span>سؤال ${k + 1} / ${N}</span><span>النجاح: ${need}/${N}</span></div>
        <div class="ac-q" style="margin-top:10px"><p style="font-size:17px">${esc(Q.q[0])}</p><div class="ac-opts">${Q.opts.map((o, n) => `<button class="ac-o ${Q.pick === n ? 'sel' : ''}" data-n="${n}">${esc(o.t)}</button>`).join('')}</div></div>
        <div class="ac-nav">${k ? '<button class="ac-btn w" data-b="1">→ السابق</button>' : '<span></span>'}<button class="ac-btn" data-x="1" ${Q.pick < 0 ? 'disabled' : ''}>${k + 1 < N ? 'التالي ←' : '✅ سالي الاختبار'}</button></div></div>`;
      root.querySelectorAll('.ac-o').forEach(b => b.onclick = () => { Q.pick = +b.dataset.n; paint(); });
      const bb = root.querySelector('[data-b]'); if (bb) bb.onclick = () => { k--; paint(); };
      root.querySelector('[data-x]').onclick = () => { if (Q.pick < 0) return; if (k + 1 < N) { k++; paint(); } else finish(); };
    };
    const finish = () => {
      const ok = qs.filter(Q => Q.opts[Q.pick] && Q.opts[Q.pick].ok).length, r = ok / N, pass = ok >= need;
      const wasPass = !!st(m).pass;
      setSt(m, s => { s.tries = (s.tries || 0) + 1; s.best = Math.max(s.best || 0, r); if (pass && !s.pass) s.pass = Date.now(); });
      if (host.mood) host.mood(pass ? 'prize' : 'sad');
      const nx = mods()[i + 1];
      root.innerHTML = `<div class="ac" style="--c:${x.color}">
        <div class="ac-crumb"><a href="#/learn">🎓 الأكاديمية</a> ‹ <a href="#/learn/${m}">${x.icon} ${m}</a> ‹ <span>النتيجة</span></div>
        <div class="ac-card ac-score ${pass ? 'ok' : 'no'}"><div class="big">${ok}/${N}</div><h3 style="margin:8px 0">${pass ? (wasPass ? '✅ ناجح مرة أخرى، برافو!' : `🎉 مبروك! نجحتي فـ ${m}`) : '😅 ما وصلتيش للنسبة هاد المرة'}</h3>
          <p style="margin:0;line-height:1.8">${pass ? (nx ? `تفتحات الوحدة <b>${nx.m} — ${esc(nx.t)}</b>.` : 'كملتي الوحدات السبعة! 🏆 صاوب الشهادة ديالك.') : `خاصك ${need}/${N} على الأقل. راجع الأسئلة لتحت والدروس، وعاود — بلا حدود.`}</p>
          <div class="ac-row" style="justify-content:center">${pass ? (nx ? `<a class="ac-btn" style="--c:${nx.color}" href="#/learn/${nx.m}">▶ ${nx.m}</a>` : '<a class="ac-btn" href="#/learn/cert">🏆 الشهادة</a>') : `<a class="ac-btn" href="#/learn/${m}/exam" data-again="1">🔁 عاود</a>`}<a class="ac-btn w" href="#/learn/${m}">📚 الدروس</a></div></div>
        <h3 style="margin:16px 2px 6px">🔍 المراجعة</h3>
        <div class="ac-rev">${qs.map((Q, n) => { const p = Q.opts[Q.pick], c = Q.opts.find(o => o.ok); return `<div class="${p && p.ok ? '' : 'no'}"><b>${n + 1}. ${esc(Q.q[0])}</b><br>${p && p.ok ? '✅' : '❌'} جوابك: ${esc(p ? p.t : '—')}${p && p.ok ? '' : `<br>✔️ الصحيح: <b>${esc(c.t)}</b>`}<br><small>💡 ${esc(Q.q[2])}</small></div>`; }).join('')}</div></div>`;
      const ag = root.querySelector('[data-again]'); if (ag) ag.onclick = e => { e.preventDefault(); exam(root, host, m); };
      window.scrollTo(0, 0);
    };
    paint();
  }

  // ---------- الشهادة ----------
  const certNo = (name, d) => { let h = 2166136261; for (const ch of name + '|' + d) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return 'W777-AC-' + new Date(d).getFullYear() + '-' + (h >>> 0).toString(36).toUpperCase().slice(0, 6); };
  function cert(root, host) {
    css();
    const M = mods(), passed = M.filter(x => st(x.m).pass).length;
    if (!allPassed()) {
      root.innerHTML = `<div class="ac"><div class="ac-crumb"><a href="#/learn">🎓 الأكاديمية</a> ‹ 🏆 الشهادة</div>
        <div class="ac-card" style="text-align:center;padding:26px 16px"><div style="font-size:52px">🏆</div><h3>شهادة الوكيل العقاري المحترف</h3>
        <p style="line-height:1.8">كتتفتح ملي تنجح فاختبارات الوحدات السبعة. نجحتي فـ <b>${passed}/7</b>.</p>
        <div class="ac-road" style="justify-content:center">${M.map(x => `<span class="ac-tag ${st(x.m).pass ? 'ok' : 'lk'}">${st(x.m).pass ? '✓' : '•'} ${x.m}</span>`).join(' ')}</div>
        <a class="ac-btn" href="#/learn" style="margin-top:14px">↩ الأكاديمية</a></div></div>`;
      return;
    }
    const all = load(), c = all.cert || {};
    const avg = M.reduce((a, x) => a + (st(x.m).best || 0), 0) / M.length;
    const draw = () => {
      const s = load(), cc = s.cert || {};
      const name = cc.name || '', d = cc.date || Date.now(), no = cc.no || '';
      const dt = new Date(d).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' });
      root.innerHTML = `<div class="ac"><div class="ac-crumb"><a href="#/learn">🎓 الأكاديمية</a> ‹ 🏆 الشهادة</div>
        <div class="ac-card"><h3>🎉 مبروك! كملتي الأكاديمية بمعدل ${pct(avg)}</h3>
          <label style="display:block;font-weight:800;margin-top:6px">الاسم الكامل كيف غادي يبان فالشهادة</label>
          <div class="ac-row" style="margin-top:6px"><input id="ac-nm" class="input" style="flex:1 1 220px;min-height:46px;border-radius:12px;padding:0 12px;font:inherit;font-size:16px" maxlength="60" value="${esc(name || host.name || '')}" placeholder="مثلا: يوسف العلوي">
          <button class="ac-btn" id="ac-mk">✍️ صاوب الشهادة</button></div></div>
        ${name ? `<div class="ac-cert" id="ac-cert"><div class="fr"></div><div class="in">
          <img class="lg" src="icons/logo.png" alt="">
          <div class="k">${esc(A().title)} · مجموعة الوسيط</div>
          <h2>شهادة إتمام تكوين الوكيل العقاري المحترف</h2>
          <div class="to">تشهد أكاديمية الوسيط بأن</div>
          <div class="nm">${esc(name)}</div>
          <div class="tx">أتم بنجاح برنامج «من مندوب عقاري إلى صاحب وكالة» (7 وحدات · 42 درساً)، واجتاز اختبارات جميع الوحدات بمعدل <b>${pct(avg)}</b>.</div>
          <div class="mods">${M.map(x => `<span>${x.icon} ${x.m} · ${esc(x.t.split(':')[0])}</span>`).join('')}</div>
          <div class="ft"><div style="text-align:start">التاريخ: <b>${esc(dt)}</b>رقم الشهادة: <b dir="ltr">${esc(no)}</b></div><div class="seal" aria-label="ختم مجموعة الوسيط"><svg viewBox="0 0 200 200" direction="ltr"><defs><path id="act1" d="M23,100 a77,77 0 1,1 154,0"/><path id="act2" d="M16,100 a84,84 0 0,0 168,0"/><clipPath id="acclip"><circle cx="100" cy="100" r="58"/></clipPath></defs><circle cx="100" cy="100" r="96" fill="#fff" stroke="#c8102e" stroke-width="6"/><text font-size="17" font-weight="900" fill="#c8102e" direction="ltr" text-anchor="middle"><textPath href="#act1" startOffset="50%">مجموعة الوسيط</textPath></text><text font-size="13" font-weight="800" fill="#c8102e" direction="ltr" text-anchor="middle"><textPath href="#act2" startOffset="50%">★ أكاديمية التكوين ★</textPath></text><circle cx="100" cy="100" r="62" fill="#fff" stroke="#c8102e" stroke-width="2.5"/><image href="icons/logo.png" x="40" y="40" width="120" height="120" clip-path="url(#acclip)"/></svg></div><div style="text-align:end">المكوّن<b>${esc(A().trainer.split(' — ')[0])}</b>${esc(A().trainer.split(' — ')[1] || '')}</div></div>
        </div></div>
        <div class="ac-row" style="justify-content:center"><button class="ac-btn" id="ac-pr">🖨️ طباعة / حفظ PDF</button><button class="ac-btn w" id="ac-sh">📤 شارك الخبر</button></div>
        <p class="ac-note" style="text-align:center">فالتيليفون: «طباعة» ← «حفظ كـ PDF» (ولا مشاركة ← طباعة). الشهادة شهادة تكوين داخلية ديال مجموعة الوسيط.</p>` : ''}</div>`;
      root.querySelector('#ac-mk').onclick = () => {
        const v = root.querySelector('#ac-nm').value.trim().replace(/\s+/g, ' ');
        if (v.length < 3) return root.querySelector('#ac-nm').focus();
        setAll(s2 => { const dd = (s2.cert && s2.cert.date) || Date.now(); s2.cert = { name: v, date: dd, no: certNo(v, dd) }; });
        if (host.mood) host.mood('prize'); draw();
      };
      const pr = root.querySelector('#ac-pr'); if (pr) pr.onclick = () => {
        // الصفحة بالعرض غير للشهادة (ما كتأثرش على طباعة الصفحات الأخرى)
        const pg = document.createElement('style'); pg.textContent = '@page{size:A4 landscape;margin:0}'; document.head.appendChild(pg);
        document.body.classList.add('ac-printing');
        setTimeout(() => { window.print(); setTimeout(() => { document.body.classList.remove('ac-printing'); pg.remove(); }, 800); }, 60);
      };
      const sh = root.querySelector('#ac-sh'); if (sh) sh.onclick = () => {
        const t = `🎓 الحمد لله! حصلت على «شهادة الوكيل العقاري المحترف» من أكاديمية الوسيط (7 وحدات) — ${name} · ${no}`;
        if (navigator.share) navigator.share({ text: t }).catch(() => { }); else window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
      };
    };
    if (c.name && !c.no) setAll(s2 => { s2.cert.no = certNo(c.name, c.date); });
    draw();
  }

  // ---------- نسخة الطباعة (PDF) ----------
  const rot = (a, k) => { const r = k % a.length; return a.slice(r).concat(a.slice(0, r)); };
  function printModule(root, m) {
    css();
    const x = mods()[idx(m)];
    const lessons = x.lessons.map((l, j) => `<section class="pp-l"><div class="ac-crumb">${x.icon} ${x.m} · الدرس ${j + 1}/${x.lessons.length}</div><h2 style="margin:6px 0 4px">${esc(l.t)}</h2>${photo(l.img)}
      <div class="ac-sec ac-idea"><h4>🎯 الفكرة ببساطة</h4>${esc(l.intro)}</div>${info(l.info)}
      <div class="ac-sec ac-pts"><h4>📌 النقاط المهمة</h4><ul>${l.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>
      <div class="ac-sec ac-ex"><h4>🏙️ مثال من الواقع (مكناس)</h4>${esc(l.ex)}</div><div class="ac-sec ac-err"><h4>⚠️ خطأ شائع</h4>${esc(l.err)}</div>
      <div class="ac-sec ac-pts"><h4>✅ تحقق من فهمك</h4>${l.q.map((q, k) => `<p style="margin:4px 0"><b>${k + 1}. ${esc(q[0])}</b><br>${rot(q[1], j + k).map((o, n) => `${'ABCD'[n]}) ${esc(o)}`).join(' · ')}</p>`).join('')}<p style="margin:6px 0 0;font-size:12px;color:#666">الأجوبة: ${l.q.map((q, k) => `${k + 1}=${'ABCD'[rot(q[1], j + k).indexOf(q[1][0])]}`).join(' · ')}</p></div></section>`).join('');
    root.innerHTML = `<div class="ac" style="--c:${x.color}">
      <section class="pp-cover"><div class="ac-hero" style="background:linear-gradient(135deg,${x.color},#111);min-height:230mm;display:flex;flex-direction:column;justify-content:center;border-radius:0">
        <img src="icons/logo.png" alt="" style="width:90px;height:90px;border-radius:50%;border:3px solid #fff;object-fit:cover">
        <div class="kick" style="margin-top:18px">🎓 ${esc(A().title)} — ${esc(A().tagline)}</div>
        <h1 style="font-size:40px;margin-top:10px">${x.icon} ${x.m}<br>${esc(x.t)}</h1><p style="font-size:17px">${esc(x.sub)}</p>
        <p style="margin-top:16px;font-size:15px">🎯 ${esc(x.goal)}</p>
        <p style="margin-top:22px;font-size:14px">📚 ${x.lessons.length} دروس · ⏱️ ${esc(x.h)} · 📝 اختبار ${A().examN} أسئلة (النجاح ${pct(A().pass)})</p>
        <ol style="margin-top:16px;line-height:2;font-size:15px">${x.lessons.map(l => `<li>${esc(l.t)}</li>`).join('')}</ol>
        <p style="margin-top:auto;font-size:12px;opacity:.8">${esc(A().trainer)} · ${esc(A().note)}</p></div></section>
      ${lessons}
      <section class="pp-l"><h2>📝 أسئلة المراجعة (${x.exam.length})</h2>${x.exam.map((q, k) => `<p style="margin:6px 0;line-height:1.7"><b>${k + 1}. ${esc(q[0])}</b><br>✔️ ${esc(q[1][0])} — <small>${esc(q[2])}</small></p>`).join('')}
        <p class="ac-note">${esc(A().note)}</p></section></div>`;
    fillCred(root);
  }

  // 📊 تقدم الفريق (المدير: الكل · صاحب الوكالة: الفريق ديالو)
  async function team(root, host) {
    if (!host.team) return home(root, host);
    root.innerHTML = '<div class="ac"><div class="ac-card muted">⏳ كيتحمل تقدم الفريق…</div></div>';
    let rows = [];
    try { rows = await host.team(); } catch (e) { root.innerHTML = `<div class="ac"><div class="ac-card">تعذر التحميل: ${esc(e.message || e)}</div></div>`; return; }
    const M = mods();
    root.innerHTML = `<div class="ac"><div class="ac-crumb"><a href="#/learn">🎓 الأكاديمية</a> ‹ 📊 تقدم الفريق</div>
      <div class="ac-card"><h3>📊 تقدم المتكونين (${rows.length})</h3><p class="muted" style="margin:0;line-height:1.7">${rows.filter(r => r.passed >= M.length).length} كملو الأكاديمية · ${rows.filter(r => r.passed && r.passed < M.length).length} فالطريق · التقدم كيتزامن من التطبيق ديال كل واحد.</p></div>
      ${rows.length ? `<div class="ac-lessons">${rows.map(r => { const p = r.progress || {}; return `<div class="ac-l" style="align-items:flex-start"><span class="n" style="${r.passed >= M.length ? 'background:#0a7a2f;color:#fff' : ''}">${r.passed >= M.length ? '🏆' : r.passed}</span>
        <span style="flex:1;min-width:0"><b>${esc(r.name || 'متكون')}</b><small>${esc(r.sub || '')}${r.updated_at ? ' · آخر نشاط ' + new Date(r.updated_at).toLocaleDateString('ar-MA') : ''}</small>
          <span style="display:flex;gap:3px;flex-wrap:wrap;margin-top:6px">${M.map(x => { const s = p[x.m] || {}; return `<span class="ac-tag ${s.pass ? 'ok' : Object.keys(s.les || {}).length ? 'go' : 'lk'}" title="${esc(x.t)}">${s.pass ? '✓' : Object.keys(s.les || {}).length + '/' + x.lessons.length} ${x.m}</span>`; }).join('')}</span>
          <small>المعدل: ${pct(+r.avg || 0)}${r.cert_no ? ` · 🏆 شهادة <span dir="ltr">${esc(r.cert_no)}</span>` : ''}</small></span></div>`; }).join('')}</div>` : '<div class="ac-card muted">مازال حتى واحد ما بدا الأكاديمية.</div>'}</div>`;
  }

  function mount(root, parts, host) {
    css(); GEN++;
    host = host || {}; host.ask = host.ask || (() => { }); host.mood = host.mood || null;
    HOST = host;
    if (host.sync && !PULLED) {
      PULLED = true;
      const h0 = location.hash;
      host.sync.pull().then(r => {
        const changed = r && r.progress ? merge(r.progress) : false;
        // هاد الجهاز عندو تقدم ماشي فالسحابة ← نرفعوه
        const s = load(), local = Object.keys(s).some(k => /^M\d$/.test(k));
        if (local && (!r || JSON.stringify(r.progress || {}) !== JSON.stringify(s))) schedPush();
        if (changed && location.hash === h0 && root.isConnected) mount(root, parts, host);
      }).catch(() => { PULLED = false; });
    }
    const m = parts[1], sub = parts[2];
    if (!m) return home(root, host);
    if (m === 'cert') return cert(root, host);
    if (m === 'team') return team(root, host);
    if (sub === 'exam') return exam(root, host, m);
    if (sub != null && sub !== '' && !isNaN(+sub)) return lesson(root, host, m, +sub);
    return module(root, host, m);
  }

  window.W777_ACADEMY = { mount, printModule, _st: load };
})();
