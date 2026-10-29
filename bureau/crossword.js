/* ============================================================
   الكلمات المتقاطعة العقارية — الوسيط 777
   محرك اللعبة + الواجهة. كيتخدم فالتطبيق (#/game) وفالصفحة العمومية game.html.
   W777_CW.mount(root, host) — host: { logo, onFinish({points, words, lang, level}), loadBoard(), shareUrl, member }
   ============================================================ */
(function () {
  'use strict';
  const LS = 'w777_cw';
  const LEVELS = { easy: { n: 6, mult: 1 }, medium: { n: 9, mult: 1.5 }, hard: { n: 12, mult: 2 } };
  const MAX = 15; // أكبر عرض/طول للشبكة

  const T = {
    ar: {
      title: 'الكلمات المتقاطعة العقارية', across: 'أفقي', down: 'عمودي', check: 'تحقق', hint: 'حرف', word: 'الكلمة', fresh: 'شبكة جديدة',
      settings: 'الإعدادات', lang: 'اللغة', level: 'المستوى', easy: 'سهل', medium: 'متوسط', hard: 'صعب', close: 'إغلاق',
      score: 'نقطك', played: 'شبكات محلولة', board: 'ترتيب المشتركين', noBoard: 'الترتيب كيبان غير للمشتركين فتطبيق الوسيط 777.',
      empty: 'حتى واحد ما لعب مازال — كون الأول!', won: 'برافو! حليتي الشبكة', pts: 'نقطة', share: 'شارك اللعبة', time: 'الوقت',
      sure: 'غادي تبدا شبكة جديدة وتضيع هادي. متأكد؟', saved: 'تسجلات النقط فالترتيب ✓', wrong: 'كاين حروف غالطين (بالأحمر)', allok: 'كلشي صحيح حتى لدابا ✓',
      shareTxt: 'جرب لعبة الكلمات المتقاطعة العقارية ديال مكتب الوسيط 777 🧩🏠', me: 'أنت', rank: 'الرتبة', hintCost: 'كل حرف كيتعطى كينقص من النقط',
    },
    en: {
      title: 'Real-Estate Crossword', across: 'Across', down: 'Down', check: 'Check', hint: 'Letter', word: 'Word', fresh: 'New grid',
      settings: 'Settings', lang: 'Language', level: 'Level', easy: 'Easy', medium: 'Medium', hard: 'Hard', close: 'Close',
      score: 'Your points', played: 'Grids solved', board: 'Members ranking', noBoard: 'The ranking is for Al Wasset 777 members.',
      empty: 'Nobody has played yet — be the first!', won: 'Well done! Grid solved', pts: 'points', share: 'Share the game', time: 'Time',
      sure: 'Start a new grid and lose this one?', saved: 'Points saved to the ranking ✓', wrong: 'Some letters are wrong (in red)', allok: 'All correct so far ✓',
      shareTxt: 'Try the real-estate crossword by Al Wasset 777 🧩🏠', me: 'You', rank: 'Rank', hintCost: 'Each revealed letter costs points',
    },
    fr: {
      title: 'Mots croisés immobiliers', across: 'Horizontal', down: 'Vertical', check: 'Vérifier', hint: 'Lettre', word: 'Mot', fresh: 'Nouvelle grille',
      settings: 'Réglages', lang: 'Langue', level: 'Niveau', easy: 'Facile', medium: 'Moyen', hard: 'Difficile', close: 'Fermer',
      score: 'Vos points', played: 'Grilles résolues', board: 'Classement des membres', noBoard: 'Le classement est réservé aux membres d’Al Wasset 777.',
      empty: 'Personne n’a encore joué — soyez le premier !', won: 'Bravo ! Grille résolue', pts: 'points', share: 'Partager le jeu', time: 'Temps',
      sure: 'Commencer une nouvelle grille et perdre celle-ci ?', saved: 'Points enregistrés au classement ✓', wrong: 'Des lettres sont fausses (en rouge)', allok: 'Tout est juste pour l’instant ✓',
      shareTxt: 'Essayez les mots croisés immobiliers d’Al Wasset 777 🧩🏠', me: 'Vous', rank: 'Rang', hintCost: 'Chaque lettre révélée coûte des points',
    },
  };
  const LANG_NAMES = { ar: 'العربية', en: 'English', fr: 'Français' };

  // توحيد الحروف: أ/إ/آ = ا، ة = ه، ى = ي… وبلا تشكيل/نبرات فاللاتينية
  function norm(s, lang) {
    let t = String(s || '');
    if (lang === 'ar') t = t.replace(/[ً-ْـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
    else t = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
    return t;
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- توليد الشبكة ---------- */
  function generate(lang, level) {
    const bank = (window.W777_CW_WORDS || {})[lang] || [];
    const want = LEVELS[level].n;
    const items = bank.map(([w, c]) => ({ w, c, L: Array.from(norm(w, lang)) })).filter(x => x.L.length >= 2 && x.L.length <= MAX);
    let best = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      const pool = shuffle(items).slice(0, want * 4).sort((a, b) => b.L.length - a.L.length + (Math.random() - 0.5) * 3);
      const cells = new Map(); // "r,c" -> { ch, dirs:Set }
      const placed = [];
      let minR = 0, maxR = 0, minC = 0, maxC = 0;
      const get = (r, c) => cells.get(r + ',' + c);
      const fits = (it, r, c, d) => {
        const [dr, dc] = d === 'a' ? [0, 1] : [1, 0], n = it.L.length;
        if (get(r - dr, c - dc) || get(r + dr * n, c + dc * n)) return -1;
        const nr0 = Math.min(minR, r), nr1 = Math.max(maxR, r + dr * (n - 1)), nc0 = Math.min(minC, c), nc1 = Math.max(maxC, c + dc * (n - 1));
        if (nr1 - nr0 + 1 > MAX || nc1 - nc0 + 1 > MAX) return -1;
        let cross = 0;
        for (let i = 0; i < n; i++) {
          const rr = r + dr * i, cc = c + dc * i, x = get(rr, cc);
          if (x) { if (x.ch !== it.L[i] || x.dirs.has(d)) return -1; cross++; }
          else if (d === 'a' ? (get(rr - 1, cc) || get(rr + 1, cc)) : (get(rr, cc - 1) || get(rr, cc + 1))) return -1;
        }
        return cross;
      };
      const put = (it, r, c, d) => {
        const [dr, dc] = d === 'a' ? [0, 1] : [1, 0];
        it.L.forEach((ch, i) => { const k = (r + dr * i) + ',' + (c + dc * i); const x = cells.get(k) || { ch, dirs: new Set() }; x.dirs.add(d); cells.set(k, x); });
        minR = Math.min(minR, r); maxR = Math.max(maxR, r + dr * (it.L.length - 1)); minC = Math.min(minC, c); maxC = Math.max(maxC, c + dc * (it.L.length - 1));
        placed.push({ w: it.w, c: it.c, L: it.L, r, col: c, d });
      };
      put(pool[0], 0, 0, Math.random() < 0.5 ? 'a' : 'd');
      for (const it of pool.slice(1)) {
        if (placed.length >= want) break;
        if (placed.some(p => p.w === it.w)) continue;
        let cand = [];
        for (const [k, x] of cells) {
          const [r, c] = k.split(',').map(Number);
          it.L.forEach((ch, i) => {
            if (ch !== x.ch) return;
            for (const d of ['a', 'd']) {
              if (x.dirs.has(d)) continue;
              const sr = d === 'a' ? r : r - i, sc = d === 'a' ? c - i : c;
              const s = fits(it, sr, sc, d);
              if (s > 0) cand.push({ r: sr, c: sc, d, s: s + Math.random() });
            }
          });
        }
        if (!cand.length) continue;
        cand.sort((a, b) => b.s - a.s);
        put(it, cand[0].r, cand[0].c, cand[0].d);
      }
      const area = (maxR - minR + 1) * (maxC - minC + 1);
      if (!best || placed.length > best.placed.length || (placed.length === best.placed.length && area < best.area)) best = { placed, minR, minC, H: maxR - minR + 1, W: maxC - minC + 1, area };
      if (placed.length >= want && attempt > 8) break;
    }
    // ترقيم الكلمات بترتيب القراءة
    const words = best.placed.map(p => ({ ...p, r: p.r - best.minR, col: p.col - best.minC }));
    const starts = [...new Set(words.map(w => w.r * 100 + w.col))].sort((a, b) => a - b);
    words.forEach(w => { w.num = starts.indexOf(w.r * 100 + w.col) + 1; });
    words.sort((a, b) => a.num - b.num || (a.d === 'a' ? -1 : 1));
    return { lang, level, H: best.H, W: best.W, words: words.map(w => ({ w: w.w, c: w.c, L: w.L, r: w.r, col: w.col, d: w.d, num: w.num })), entries: {}, revealed: {}, started: Date.now(), done: false };
  }

  /* ---------- الحالة المحفوظة ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { return {}; } };
  const store = s => { try { localStorage.setItem(LS, JSON.stringify(s)); } catch (e) { /* */ } };

  /* ---------- الستايل ---------- */
  function css() {
    if (document.getElementById('cw-css')) return;
    const st = document.createElement('style'); st.id = 'cw-css';
    st.textContent = `
.cw{--red:#c8102e;--blk:#111;--wht:#fff;color:var(--blk);max-width:980px;margin:0 auto;font-family:inherit}
.cw-head{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#111,#2a0a10 60%,var(--red));color:#fff;border-radius:18px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.cw-head img{width:58px;height:58px;border-radius:50%;background:#fff;object-fit:contain;padding:3px;box-shadow:0 0 0 3px var(--red)}
.cw-head h2{margin:0;font-size:19px;line-height:1.25;flex:1}.cw-head small{display:block;opacity:.8;font-weight:400;font-size:12px}
.cw-ib{background:#fff;color:var(--blk);border:0;border-radius:12px;padding:8px 10px;font-weight:800;cursor:pointer;font-size:14px}
.cw-stats{display:flex;gap:8px;margin:10px 0;flex-wrap:wrap}.cw-stats div{flex:1;min-width:90px;background:#fff;border:2px solid var(--blk);border-radius:12px;padding:6px 10px;text-align:center}
.cw-stats b{display:block;font-size:20px;color:var(--red)}.cw-stats small{font-size:11px;color:#444}
.cw-bar{background:var(--blk);color:#fff;border-radius:12px;padding:10px 12px;margin-bottom:10px;min-height:44px;font-weight:700;display:flex;gap:8px;align-items:center}
.cw-bar .n{background:var(--red);border-radius:8px;padding:2px 8px;white-space:nowrap}
.cw-main{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start}
@media (max-width:760px){.cw-main{grid-template-columns:1fr}}
.cw-gridw{background:var(--blk);padding:6px;border-radius:14px;overflow:auto;display:flex;justify-content:center}
.cw-grid{display:grid;gap:2px;width:min(100%,calc(var(--w) * 40px))}
.cw-c{position:relative;aspect-ratio:1;background:transparent}
.cw-c.on{background:#fff;border-radius:3px}
.cw-c input{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;text-align:center;font-weight:900;font-size:clamp(13px,4.2vw,22px);color:var(--blk);padding:0;outline:none;caret-color:transparent;text-transform:uppercase;font-family:inherit}
.cw-c sup{position:absolute;top:1px;inset-inline-start:2px;font-size:9px;font-weight:800;color:var(--red);pointer-events:none;line-height:1}
.cw-c.hl{background:#ffd9df}.cw-c.cur{background:var(--red)}.cw-c.cur input,.cw-c.cur sup{color:#fff}
.cw-c.ok{background:#111}.cw-c.ok input{color:#fff}.cw-c.ok sup{color:#ff8a9b}
.cw-c.bad input{color:var(--red);text-decoration:underline}.cw-c.rev input{color:#888}
.cw-btns{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.cw-btns button{flex:1;min-width:84px;border:2px solid var(--blk);background:#fff;color:var(--blk);border-radius:12px;padding:9px 8px;font-weight:800;cursor:pointer;font-family:inherit}
.cw-btns button.r{background:var(--red);border-color:var(--red);color:#fff}.cw-btns button.k{background:var(--blk);color:#fff}
.cw-clues{background:#fff;border:2px solid var(--blk);border-radius:14px;padding:10px;max-height:520px;overflow:auto}
.cw-clues h4{margin:6px 0;color:var(--red);font-size:15px;border-bottom:2px solid var(--blk);padding-bottom:4px}
.cw-clues li{list-style:none;padding:6px 8px;border-radius:8px;cursor:pointer;font-size:13.5px;line-height:1.4}
.cw-clues ul{margin:0;padding:0}.cw-clues li b{color:var(--red);margin-inline-end:6px}.cw-clues li.act{background:#111;color:#fff}.cw-clues li.act b{color:#ff8a9b}
.cw-clues li.ok{text-decoration:line-through;opacity:.55}
.cw-board{background:#fff;border:2px solid var(--blk);border-radius:14px;padding:10px;margin-top:14px}
.cw-board h4{margin:0 0 8px;color:var(--red)}.cw-board ol{margin:0;padding:0;list-style:none}
.cw-board li{display:flex;gap:8px;align-items:center;padding:6px 8px;border-radius:8px}.cw-board li:nth-child(odd){background:#f4f4f4}
.cw-board li .p{margin-inline-start:auto;font-weight:900;color:var(--red)}.cw-board li.me{background:#111;color:#fff}.cw-board li .k{width:26px;text-align:center;font-weight:900}
.cw-set{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
.cw-set>div{background:#fff;border-radius:18px;padding:16px;width:min(420px,100%);border-top:6px solid var(--red)}
.cw-set h3{margin:0 0 10px}.cw-opt{display:flex;gap:6px;margin:6px 0 14px;flex-wrap:wrap}
.cw-opt button{flex:1;border:2px solid var(--blk);background:#fff;border-radius:10px;padding:9px;font-weight:800;cursor:pointer;font-family:inherit}.cw-opt button.on{background:var(--red);border-color:var(--red);color:#fff}
.cw-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 16px;border-radius:12px;z-index:10000;font-weight:700;border-bottom:3px solid var(--red)}
.cw-win{background:linear-gradient(135deg,var(--red),#111);color:#fff;border-radius:14px;padding:14px;text-align:center;margin-bottom:10px;font-weight:800;font-size:17px}
`;
    document.head.appendChild(st);
  }

  /* ---------- الواجهة ---------- */
  function mount(root, host) {
    css();
    host = host || {};
    const S = Object.assign({ lang: 'ar', level: 'medium', total: 0, played: 0 }, load());
    if (!T[S.lang]) S.lang = 'ar';
    if (!LEVELS[S.level]) S.level = 'medium';
    let P = S.cur && S.cur.lang === S.lang && S.cur.words && S.cur.words.length ? S.cur : null;
    let act = { w: 0, i: 0 };
    let tick = null, boardRows = null;
    const t = () => T[S.lang];
    const save = () => { S.cur = P; store(S); };
    const toast = m => { const d = document.createElement('div'); d.className = 'cw-toast'; d.textContent = m; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); };

    function cellMap() {
      const m = new Map();
      P.words.forEach((w, wi) => w.L.forEach((ch, i) => {
        const r = w.d === 'a' ? w.r : w.r + i, c = w.d === 'a' ? w.col + i : w.col, k = r + ',' + c;
        const x = m.get(k) || { ch, r, c, words: [] }; x.words.push([wi, i]); m.set(k, x);
      }));
      return m;
    }
    const keyOf = (w, i) => w.d === 'a' ? w.r + ',' + (w.col + i) : (w.r + i) + ',' + w.col;
    const wordOk = w => w.L.every((ch, i) => norm(P.entries[keyOf(w, i)], P.lang) === ch);
    const wordHinted = w => w.L.some((ch, i) => P.revealed[keyOf(w, i)]);
    const allOk = () => P.words.every(wordOk);

    function newGame(confirmIt) {
      if (confirmIt && P && !P.done && Object.keys(P.entries).length && !confirm(t().sure)) return;
      P = generate(S.lang, S.level); act = { w: 0, i: 0 }; save(); render();
    }

    function render() {
      if (!P) { P = generate(S.lang, S.level); save(); }
      const L = t(), dir = S.lang === 'ar' ? 'rtl' : 'ltr', cm = cellMap();
      const nums = {}; P.words.forEach(w => { nums[w.r + ',' + w.col] = w.num; });
      let g = '';
      for (let r = 0; r < P.H; r++) for (let c = 0; c < P.W; c++) {
        const k = r + ',' + c, x = cm.get(k);
        g += x ? `<div class="cw-c on" data-k="${k}">${nums[k] ? `<sup>${nums[k]}</sup>` : ''}<input data-k="${k}" maxlength="2" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" lang="${S.lang}" value="${esc(P.entries[k] || '')}"></div>` : '<div class="cw-c"></div>';
      }
      const list = d => P.words.map((w, wi) => w.d === d ? `<li data-w="${wi}" class="${wordOk(w) ? 'ok' : ''}"><b>${w.num}</b>${esc(w.c)} <small>(${w.L.length})</small></li>` : '').join('');
      root.innerHTML = `<div class="cw" dir="${dir}" lang="${S.lang}">
        <div class="cw-head"><img src="${esc(host.logo || 'icons/logo.png?v=10')}" alt=""><h2>${esc(L.title)}<small>${esc(L[S.level])} · ${LANG_NAMES[S.lang]}</small></h2>
          <button class="cw-ib" data-a="set" title="${esc(L.settings)}">⚙️</button></div>
        <div class="cw-stats"><div><b>${S.total}</b><small>${esc(L.score)}</small></div><div><b>${S.played}</b><small>${esc(L.played)}</small></div><div><b id="cw-time">0:00</b><small>${esc(L.time)}</small></div></div>
        ${P.done ? `<div class="cw-win">🏆 ${esc(L.won)} — +${P.points || 0} ${esc(L.pts)}</div>` : ''}
        <div class="cw-bar" id="cw-bar"></div>
        <div class="cw-main"><div>
          <div class="cw-gridw"><div class="cw-grid" dir="${dir}" style="--w:${P.W};grid-template-columns:repeat(${P.W},1fr)">${g}</div></div>
          <div class="cw-btns"><button class="k" data-a="check">✔ ${esc(L.check)}</button><button data-a="hint" title="${esc(L.hintCost)}">💡 ${esc(L.hint)}</button><button data-a="word">🔤 ${esc(L.word)}</button><button class="r" data-a="new">🧩 ${esc(L.fresh)}</button></div>
          ${host.shareUrl ? `<div class="cw-btns"><button data-a="share">📲 ${esc(L.share)}</button></div>` : ''}
        </div>
        <div><div class="cw-clues"><h4>${dir === 'rtl' ? '⬅' : '➡'} ${esc(L.across)}</h4><ul>${list('a')}</ul><h4>⬇ ${esc(L.down)}</h4><ul>${list('d')}</ul></div>
          <div class="cw-board"><h4>🏆 ${esc(L.board)}</h4><div id="cw-board">…</div></div></div></div></div>`;
      bind(); focusAct(false); drawBoard(); startClock();
    }

    function startClock() {
      clearInterval(tick);
      const el = () => root.querySelector('#cw-time');
      const upd = () => { const e = el(); if (!e) return clearInterval(tick); const s = Math.floor(((P.done ? P.ended : Date.now()) - P.started) / 1000); e.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
      upd(); if (!P.done) tick = setInterval(upd, 1000);
    }

    function highlight() {
      const w = P.words[act.w]; if (!w) return;
      root.querySelectorAll('.cw-c.on').forEach(el => { el.classList.remove('hl', 'cur'); });
      w.L.forEach((_, i) => { const el = root.querySelector(`.cw-c[data-k="${keyOf(w, i)}"]`); if (el) el.classList.add(i === act.i ? 'cur' : 'hl'); });
      P.words.forEach(x => { if (wordOk(x)) x.L.forEach((_, i) => { const el = root.querySelector(`.cw-c[data-k="${keyOf(x, i)}"]`); if (el && !el.classList.contains('cur')) el.classList.add('ok'); }); });
      root.querySelectorAll('.cw-clues li').forEach(li => li.classList.toggle('act', +li.dataset.w === act.w));
      const bar = root.querySelector('#cw-bar'); if (bar) bar.innerHTML = `<span class="n">${w.num} ${esc(w.d === 'a' ? t().across : t().down)}</span><span>${esc(w.c)} (${w.L.length})</span>`;
      const li = root.querySelector(`.cw-clues li[data-w="${act.w}"]`); if (li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
    }
    function focusAct(scroll = true) {
      highlight();
      const w = P.words[act.w]; if (!w || P.done) return;
      const inp = root.querySelector(`input[data-k="${keyOf(w, act.i)}"]`);
      if (inp && scroll) inp.focus({ preventScroll: false });
    }
    function wordsAt(k) { const out = []; P.words.forEach((w, wi) => w.L.forEach((_, i) => { if (keyOf(w, i) === k) out.push([wi, i]); })); return out; }

    function bind() {
      root.querySelectorAll('.cw-grid input').forEach(inp => {
        inp.addEventListener('focus', () => {
          const ws = wordsAt(inp.dataset.k); if (!ws.length) return;
          const same = ws.find(([wi]) => wi === act.w);
          if (same) act = { w: same[0], i: same[1] }; else act = { w: ws[0][0], i: ws[0][1] };
          highlight();
        });
        inp.addEventListener('click', () => {
          const ws = wordsAt(inp.dataset.k);
          if (ws.length > 1 && P.words[act.w] && keyOf(P.words[act.w], act.i) === inp.dataset.k) { const o = ws.find(([wi]) => wi !== act.w); if (o) { act = { w: o[0], i: o[1] }; highlight(); } }
        });
        inp.addEventListener('input', () => {
          if (P.done) { inp.value = P.entries[inp.dataset.k] || ''; return; }
          const v = Array.from(inp.value.trim()).pop() || '';
          const ch = S.lang === 'ar' ? v : v.toUpperCase();
          inp.value = ch; inp.parentElement.classList.remove('bad');
          if (ch) P.entries[inp.dataset.k] = ch; else delete P.entries[inp.dataset.k];
          save();
          const w = P.words[act.w];
          if (ch && w && act.i < w.L.length - 1) { act.i++; focusAct(); } else highlight();
          refreshClues();
          if (allOk()) finish();
        });
        inp.addEventListener('keydown', e => {
          const w = P.words[act.w]; if (!w) return;
          if (e.key === 'Backspace' && !inp.value && act.i > 0) { e.preventDefault(); act.i--; const k = keyOf(w, act.i); delete P.entries[k]; save(); const p = root.querySelector(`input[data-k="${k}"]`); if (p) p.value = ''; focusAct(); }
          else if (e.key === 'Enter') { e.preventDefault(); act = { w: (act.w + 1) % P.words.length, i: 0 }; focusAct(); }
        });
      });
      root.querySelectorAll('.cw-clues li').forEach(li => li.addEventListener('click', () => { act = { w: +li.dataset.w, i: 0 }; const w = P.words[act.w]; const fi = w.L.findIndex((_, i) => !P.entries[keyOf(w, i)]); act.i = fi < 0 ? 0 : fi; focusAct(); }));
      root.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => action(b.dataset.a)));
    }
    function refreshClues() { root.querySelectorAll('.cw-clues li').forEach(li => li.classList.toggle('ok', wordOk(P.words[+li.dataset.w]))); }

    function action(a) {
      const L = t(), w = P.words[act.w];
      if (a === 'set') return settings();
      if (a === 'new') return newGame(true);
      if (a === 'share') {
        const u = host.shareUrl; const txt = L.shareTxt + '\n' + u;
        if (navigator.share) navigator.share({ title: L.title, text: L.shareTxt, url: u }).catch(() => {});
        else window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
        return;
      }
      if (P.done) return;
      if (a === 'check') {
        let bad = 0;
        root.querySelectorAll('.cw-grid input').forEach(inp => { const k = inp.dataset.k, v = P.entries[k]; const ch = cellMap().get(k).ch; const wrong = v && norm(v, P.lang) !== ch; inp.parentElement.classList.toggle('bad', !!wrong); if (wrong) bad++; });
        return toast(bad ? L.wrong : L.allok);
      }
      if (a === 'hint' || a === 'word') {
        if (!w) return;
        const idx = a === 'word' ? w.L.map((_, i) => i) : [w.L.findIndex((ch, i) => norm(P.entries[keyOf(w, i)], P.lang) !== ch)].filter(i => i >= 0);
        idx.forEach(i => { const k = keyOf(w, i); P.entries[k] = w.L[i]; P.revealed[k] = 1; const inp = root.querySelector(`input[data-k="${k}"]`); if (inp) { inp.value = w.L[i]; inp.parentElement.classList.add('rev'); inp.parentElement.classList.remove('bad'); } });
        save(); refreshClues(); highlight();
        if (allOk()) finish();
      }
    }

    async function finish() {
      if (P.done) return;
      P.done = true; P.ended = Date.now();
      const lv = LEVELS[P.level] || LEVELS.medium;
      let pts = 0;
      P.words.forEach(w => { if (!wordHinted(w)) pts += 5 + w.L.length; });
      const mins = (P.ended - P.started) / 60000;
      pts += Math.max(0, 20 - Math.floor(mins) * 2);
      pts = Math.round(pts * lv.mult) - Object.keys(P.revealed).length;
      pts = Math.max(0, Math.min(300, pts));
      P.points = pts; S.total += pts; S.played += 1; save(); render();
      if (host.onFinish) {
        try { await host.onFinish({ points: pts, words: P.words.length, lang: P.lang, level: P.level }); toast(t().saved); boardRows = null; drawBoard(); } catch (e) { /* النقط كيبقاو محليين */ }
      }
    }

    async function drawBoard() {
      const box = root.querySelector('#cw-board'); if (!box) return;
      const L = t();
      if (!host.loadBoard) { box.innerHTML = `<small>${esc(L.noBoard)}</small>`; return; }
      try {
        if (!boardRows) boardRows = await host.loadBoard();
        const rows = boardRows || [];
        box.innerHTML = rows.length ? `<ol>${rows.map((r, i) => `<li class="${r.me ? 'me' : ''}"><span class="k">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span>${esc(r.name)}${r.me ? ' (' + esc(L.me) + ')' : ''}</span><span class="p">${r.points}</span></li>`).join('')}</ol>` : `<small>${esc(L.empty)}</small>`;
      } catch (e) { box.innerHTML = `<small>${esc(L.noBoard)}</small>`; }
    }

    function settings() {
      const L = t();
      const d = document.createElement('div'); d.className = 'cw-set';
      d.innerHTML = `<div dir="${S.lang === 'ar' ? 'rtl' : 'ltr'}"><h3>⚙️ ${esc(L.settings)}</h3>
        <b>${esc(L.lang)}</b><div class="cw-opt">${Object.keys(T).map(k => `<button data-l="${k}" class="${k === S.lang ? 'on' : ''}">${LANG_NAMES[k]}</button>`).join('')}</div>
        <b>${esc(L.level)}</b><div class="cw-opt">${Object.keys(LEVELS).map(k => `<button data-v="${k}" class="${k === S.level ? 'on' : ''}">${esc(L[k])}</button>`).join('')}</div>
        <div class="cw-btns"><button class="r" data-x>${esc(L.close)}</button></div></div>`;
      document.body.appendChild(d);
      const close = () => d.remove();
      d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-x]')) close(); });
      d.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => { if (b.dataset.l === S.lang) return close(); S.lang = b.dataset.l; P = null; S.cur = null; store(S); close(); newGame(false); }));
      d.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => { if (b.dataset.v === S.level) return close(); S.level = b.dataset.v; store(S); close(); newGame(false); }));
    }

    render();
    return { refresh: () => { boardRows = null; drawBoard(); } };
  }

  window.W777_CW = { mount, generate, norm };
})();
