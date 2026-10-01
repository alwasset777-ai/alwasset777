/* ============================================================
   مكتب الوسيط 777 — تطبيق إدارة العقارات والطلبات
   يعمل بدون إنترنت — البيانات محفوظة على الجهاز (IndexedDB)
   ============================================================ */
(function () {
  'use strict';
  const D = window.W777_DATA;
  // نسخة مدمجة (صفحة claude.ai): لا طباعة ولا تنزيل ملفات ولا اتصال خارجي
  const EMBED = !!window.W777_EMBED;
  const LOGO = window.W777_LOGO || 'icons/logo.png';
  const DB = window.W777_DB;

  /* ============================================================
     أدوات عامة
     ============================================================ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const today = () => new Date().toISOString().slice(0, 10);
  const num = v => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? null : Number(v);
  const fmtRaw = n => num(n) === null ? '' : new Intl.NumberFormat('fr-FR').format(Number(n)).replace(/[\u202f\u00a0]/g, ' ');
  // عزل الأرقام حتى لا تنقلب مجموعات الأرقام داخل النص العربي
  const fmt = n => num(n) === null ? '' : '\u2066' + fmtRaw(n) + '\u2069';
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  const set = (o, path, v) => {
    const ks = path.split('.'); let cur = o;
    ks.slice(0, -1).forEach(k => { if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; });
    cur[ks[ks.length - 1]] = v;
  };

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD')
      .replace(/[ً-ٰٟ̀-ͯ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ـ/g, '');
  }
  function millions(n) {
    n = num(n); if (!n) return '';
    const m = n / 10000; // 1 مليون سنتيم = 10 000 درهم
    if (m < 1) return '';
    return (m % 1 === 0 ? m : m.toFixed(1)) + ' مليون سنتيم';
  }
  function money(n, unit) {
    if (num(n) === null) return '';
    return fmt(n) + ' ' + (unit || 'درهم');
  }
  function priceText(p) {
    const u = p.priceUnit || 'درهم';
    if (p.priceMin && p.priceMax && p.priceMin !== p.priceMax) return fmt(p.priceMin) + ' — ' + fmt(p.priceMax) + ' ' + u;
    const v = p.priceMax || p.priceMin;
    return v ? money(v, u) : 'السعر عند الطلب';
  }
  function waPhone(p) {
    let d = String(p || '').replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = '212' + d.slice(1);
    return d;
  }
  const telLink = p => 'tel:' + String(p || '').replace(/[^\d+]/g, '');

  /* ---------- فهارس البيانات المرجعية ---------- */
  const TYPE = Object.fromEntries(D.PROPERTY_TYPES.map(t => [t.id, t]));
  const TRX = Object.fromEntries(D.TRANSACTIONS.map(t => [t.id, t]));
  const PSTATUS = Object.fromEntries(D.STATUSES.map(s => [s.id, s]));
  const RSTATUS = Object.fromEntries(D.REQUEST_STATUSES.map(s => [s.id, s]));
  const CITY = {};
  D.REGIONS.forEach(r => r.cities.forEach(c => { CITY[c.n] = Object.assign({ region: r.r }, c); }));
  const typeAr = id => (TYPE[id] ? TYPE[id].ar : '');
  const catOf = id => (TYPE[id] ? TYPE[id].cat : 'room');
  const trxAr = id => (TRX[id] ? TRX[id].ar : '');
  const trxShort = id => ({ sale: 'للبيع', offplan: 'للبيع على التصميم', rent: 'للكراء', rent_furnished: 'للكراء مفروش', seasonal: 'للكراء الموسمي', rahn: 'للرهن', pas_de_porte: 'للتفويت (ساروت)', exchange: 'للمبادلة', partnership: 'للشراكة' }[id] || '');
  const isRent = t => ['rent', 'rent_furnished', 'seasonal'].includes(t);

  /* ============================================================
     الأيقونات (SVG)
     ============================================================ */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10.5 21v-3h3v3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    phone: '<path d="M5 3h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 5.1 5.1l1.4-2.3L19 13.5V17a2 2 0 0 1-2 2A15 15 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8.4 19z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .9c-1.2-.5-2.3-1.6-2.8-2.8l.9-1-1-2z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    bed: '<path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10.5" r="1.5"/>',
    bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V5a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
    ruler: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
    print: '<path d="M7 8V3h10v5M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
    upload: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
    gps: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/>',
    area: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h3M4 14h3M9 4v3M14 4v3"/>',
    handshake: '<path d="m11 17 2 2a1.5 1.5 0 0 0 2-2M13 15l2.5 2.5a1.5 1.5 0 0 0 2-2L14 12M3 11l4-4 3 1 3-2 4 4 4-1M3 11l6 6"/>',
  };
  const ic = (n, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  /* ============================================================
     الحالة العامة
     ============================================================ */
  const S = {
    props: [],
    reqs: [],
    custom: {},       // أحياء مضافة يدويا { مدينة: [أحياء] }
    settings: {},
    propFilters: { trx: '', status: 'active', type: '', cat: '', city: '', district: '', pmin: null, pmax: null, amin: null, amax: null, beds: null, sort: 'new', fav: false },
    reqFilters: { status: 'open', trx: '' },
  };
  const urlCache = new Map();

  async function loadAll() {
    const [props, reqs, custom, settings] = await Promise.all([
      DB.all('properties'), DB.all('requests'), DB.getMeta('customDistricts', {}), DB.getMeta('settings', {}),
    ]);
    S.props = props.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    S.reqs = reqs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    S.custom = custom || {};
    S.settings = Object.assign({ officeName: 'مكتب الوسيط 777 للخدمات العقارية', officePhone: '0777777959', officeCity: 'مكناس' }, settings || {});
  }

  function districtsOf(city) {
    const base = (CITY[city] && CITY[city].d) || [];
    const extra = S.custom[city] || [];
    return Array.from(new Set([...base, ...extra]));
  }
  async function rememberDistricts(city, list) {
    if (!city) return;
    const known = new Set(districtsOf(city));
    const add = (list || []).filter(d => d && !known.has(d));
    if (!add.length) return;
    S.custom[city] = [...(S.custom[city] || []), ...add];
    await DB.setMeta('customDistricts', S.custom);
    await DB.markDirty('meta', 'customDistricts');
  }

  /* ---------- ملفات الوسائط ---------- */
  async function fileUrl(id, thumb) {
    const key = id + (thumb ? ':t' : '');
    if (urlCache.has(key)) return urlCache.get(key);
    const blob = await getBlob(id, thumb);
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    urlCache.set(key, url);
    return url;
  }
  // الملف من الجهاز، أو من السحابة إن لم يكن محفوظا هنا (ثم يُحفظ محليا)
  async function getBlob(id, thumb) {
    let rec = await DB.get('files', id);
    if (rec && ((thumb && rec.thumb) || rec.blob)) return (thumb && rec.thumb) || rec.blob;
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) return null;
    const blob = await Sy.fetchFile(id, thumb);
    if (!blob) return null;
    const owner = [...S.props, ...S.reqs].find(p => (p.media || []).some(m => m.id === id));
    const meta = owner && owner.media.find(m => m.id === id);
    rec = rec || { id, owner: owner ? owner.id : '', kind: meta ? meta.kind : 'photo', name: meta ? meta.name : id, mime: blob.type, size: blob.size, blob: null, thumb: null };
    if (thumb && blob.size < 400 * 1024) rec.thumb = blob; else rec.blob = blob;
    if (owner) await DB.put('files', rec);
    return blob;
  }
  function hydrateThumbs(root = document) {
    $$('[data-thumb]', root).forEach(async el => {
      const id = el.dataset.thumb;
      el.removeAttribute('data-thumb');
      const url = await fileUrl(id, true);
      if (url) { el.src = url; el.classList.remove('hidden'); }
    });
    $$('[data-full]', root).forEach(async el => {
      const id = el.dataset.full;
      el.removeAttribute('data-full');
      const url = await fileUrl(id, false);
      if (url) el.src = url + (el.tagName === 'VIDEO' ? '#t=0.5' : '');
    });
  }
  const coverOf = p => {
    const photos = (p.media || []).filter(m => m.kind === 'photo');
    if (!photos.length) return null;
    return photos.find(m => m.id === p.cover) || photos[0];
  };

  async function compressImage(file, max = 1920, q = 0.85) {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(bmp, 0, 0, w, h);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
      if (bmp.close) bmp.close();
      return { blob: blob || file, w, h };
    } catch (e) {
      return { blob: file, w: 0, h: 0 };
    }
  }

  /* ============================================================
     واجهة: رسائل، نوافذ، تأكيد
     ============================================================ */
  function toast(msg, ms = 2400) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }
  function modal(html, onMount) {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog">${html}</div>`;
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    document.body.appendChild(bg);
    if (onMount) onMount(bg.firstElementChild, close);
    return close;
  }
  function confirmBox(msg, okText = 'تأكيد', danger = true) {
    return new Promise(res => {
      modal(`<h3>${esc(msg)}</h3><div class="btn-row" style="justify-content:flex-end">
        <button class="btn" data-close>إلغاء</button>
        <button class="btn ${danger ? 'primary' : 'gold'}" id="cf-ok" style="${danger ? 'background:var(--red);border-color:var(--red)' : ''}">${esc(okText)}</button></div>`,
      (m, close) => {
        $('#cf-ok', m).onclick = () => { close(); res(true); };
        m.parentElement.addEventListener('click', e => { if (e.target === m.parentElement || e.target.closest('[data-close]')) res(false); });
      });
    });
  }

  /* ---------- عارض الصور والفيديو ---------- */
  async function lightbox(items, start = 0) {
    let i = start;
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    document.body.appendChild(lb);
    const draw = async () => {
      const m = items[i];
      const url = await fileUrl(m.id);
      lb.innerHTML = `
        ${m.kind === 'video' ? `<video src="${url}" controls autoplay playsinline></video>` : `<img src="${url}" alt="">`}
        <button class="lb-btn lb-close">${ic('x', 24)}</button>
        ${items.length > 1 ? `<button class="lb-btn lb-prev">${ic('chevR', 26)}</button><button class="lb-btn lb-next">${ic('chevL', 26)}</button>` : ''}
        <div class="lb-count">${i + 1} / ${items.length}</div>`;
    };
    const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
    const go = d => { i = (i + d + items.length) % items.length; draw(); };
    const onKey = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') go(1); if (e.key === 'ArrowRight') go(-1); };
    document.addEventListener('keydown', onKey);
    lb.addEventListener('click', e => {
      if (e.target.closest('.lb-close') || e.target === lb) close();
      else if (e.target.closest('.lb-prev')) go(-1);
      else if (e.target.closest('.lb-next')) go(1);
    });
    let sx = null;
    lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) go(dx > 0 ? 1 : -1);
      sx = null;
    });
    draw();
  }

  /* ============================================================
     مكونات النماذج
     ============================================================ */
  function fInput(name, label, value, o = {}) {
    const type = o.type || 'text';
    const attrs = o.attrs || '';
    const isMoney = o.money;
    const v = isMoney ? fmtRaw(value) : (value == null ? '' : value);
    return `<div class="field ${o.cls || ''}">
      <label>${esc(label)}${o.req ? ' <span class="req">*</span>' : ''}</label>
      <input name="${name}" type="${isMoney ? 'text' : type}" value="${esc(v)}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''}
        ${isMoney ? 'inputmode="numeric" data-money data-num' : ''} ${type === 'number' ? 'inputmode="decimal" step="any"' : ''}
        ${o.req ? 'required' : ''} ${o.list ? `list="${o.list}"` : ''} ${attrs}>
      ${isMoney ? `<span class="hint" data-mil>${esc(millions(value))}</span>` : (o.hint ? `<span class="hint">${esc(o.hint)}</span>` : '')}
    </div>`;
  }
  function fSelect(name, label, options, value, o = {}) {
    const opt = x => {
      const v = typeof x === 'object' ? x.v : x;
      const l = typeof x === 'object' ? x.l : x;
      return `<option value="${esc(v)}" ${String(v) === String(value == null ? '' : value) ? 'selected' : ''}>${esc(l)}</option>`;
    };
    let body = '';
    if (o.groups) body = o.groups.map(g => `<optgroup label="${esc(g.label)}">${g.items.map(opt).join('')}</optgroup>`).join('');
    else body = options.map(opt).join('');
    return `<div class="field ${o.cls || ''}">
      <label>${esc(label)}${o.req ? ' <span class="req">*</span>' : ''}</label>
      <select name="${name}" ${o.req ? 'required' : ''} ${o.attrs || ''}>
        ${o.noEmpty ? '' : `<option value="">${esc(o.empty || '— اختر —')}</option>`}${body}
      </select></div>`;
  }
  function fText(name, label, value, o = {}) {
    return `<div class="field ${o.cls || 'full'}"><label>${esc(label)}</label>
      <textarea name="${name}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.attrs || ''}>${esc(value || '')}</textarea></div>`;
  }
  function fRange(n1, n2, label, v1, v2, o = {}) {
    const mk = (n, v, ph) => `<input name="${n}" type="text" inputmode="numeric" data-num ${o.money ? 'data-money' : ''} value="${esc(o.money ? fmtRaw(v) : (v == null ? '' : v))}" placeholder="${ph}">`;
    return `<div class="field ${o.cls || ''}"><label>${esc(label)}</label>
      <div class="range">${mk(n1, v1, 'من')}<span>←→</span>${mk(n2, v2, 'إلى')}</div>
      ${o.money ? `<span class="hint" data-mil-range>${esc([millions(v1), millions(v2)].filter(Boolean).join(' — '))}</span>` : (o.hint ? `<span class="hint">${esc(o.hint)}</span>` : '')}
    </div>`;
  }
  function fSeg(name, options, value) {
    return `<div class="seg">${options.map(o => `<label><input type="radio" name="${name}" value="${esc(o.v)}" ${o.v === value ? 'checked' : ''}><span>${esc(o.l)}</span></label>`).join('')}</div>`;
  }
  function fChecks(name, options, values) {
    const set = new Set(values || []);
    return `<div class="feat-grid">${options.map(o => `<label><input type="checkbox" data-multi name="${name}" value="${esc(o)}" ${set.has(o) ? 'checked' : ''}>${esc(o)}</label>`).join('')}</div>`;
  }
  const cityGroups = () => D.REGIONS.map(r => ({ label: r.r, items: r.cities.map(c => ({ v: c.n, l: c.n + ' — ' + c.f })) }));
  const typeGroups = () => Object.entries(D.CATEGORIES).map(([k, c]) => ({ label: c.ar, items: D.PROPERTY_TYPES.filter(t => t.cat === k).map(t => ({ v: t.id, l: t.ar })) }));

  function collect(form) {
    const o = {};
    $$('[name]', form).forEach(el => {
      const n = el.name;
      if (el.type === 'checkbox') {
        if (el.dataset.multi !== undefined) {
          const arr = get(o, n) || [];
          if (el.checked) arr.push(el.value);
          set(o, n, arr);
        } else set(o, n, el.checked);
      } else if (el.type === 'radio') {
        if (el.checked) set(o, n, el.value);
        else if (get(o, n) === undefined) set(o, n, '');
      } else if (el.type === 'file') {
        /* تجاهل */
      } else if (el.type === 'number' || el.dataset.num !== undefined) {
        const v = el.value.replace(/[\s\u202f\u00a0\u2066\u2069]/g, '').replace(',', '.');
        set(o, n, v === '' || isNaN(Number(v)) ? null : Number(v));
      } else set(o, n, el.value.trim());
    });
    return o;
  }
  function bindMoney(root) {
    $$('input[data-money]', root).forEach(el => {
      el.addEventListener('input', () => {
        const digits = el.value.replace(/[^\d]/g, '');
        const pos = el.value.length - el.selectionStart;
        el.value = digits ? fmtRaw(Number(digits)) : '';
        try { el.setSelectionRange(el.value.length - pos, el.value.length - pos); } catch (e) { /* */ }
        const field = el.closest('.field');
        const h = field && $('[data-mil]', field);
        if (h) h.textContent = millions(digits);
        const hr = field && $('[data-mil-range]', field);
        if (hr) hr.textContent = $$('input[data-money]', field).map(i => millions(i.value.replace(/[^\d]/g, ''))).filter(Boolean).join(' — ');
      });
    });
  }

  /* ============================================================
     المطابقة الذكية بين الطلب والعقار
     ============================================================ */
  const areaOf = p => num(p.areaTotal) || num(p.areaBuilt) || num(p.areaUseful) || (p.specs && num(p.specs.hectares) ? p.specs.hectares * 10000 : null);
  function matchScore(p, r) {
    if (!p || !r) return null;
    if (['sold', 'rented', 'withdrawn'].includes(p.status)) return null;
    const reasons = [];
    let score = 0;
    // نوع المعاملة (شرط أساسي)
    if (r.transaction && p.transaction !== r.transaction) {
      const compatible = (isRent(r.transaction) && isRent(p.transaction)) || (r.transaction === 'sale' && p.transaction === 'offplan') || (r.transaction === 'offplan' && p.transaction === 'sale');
      if (!compatible) return null;
      reasons.push({ t: trxAr(p.transaction), s: 'mid' });
    }
    // المدينة (شرط أساسي)
    if (r.city && p.city !== r.city) return null;
    score += 20;
    if (r.city) reasons.push({ t: r.city, s: 'ok' });
    // نوع العقار (25)
    const types = r.types || [];
    if (!types.length) score += 25;
    else if (types.includes(p.type)) { score += 25; reasons.push({ t: typeAr(p.type), s: 'ok' }); }
    else if (types.some(t => catOf(t) === catOf(p.type))) { score += 12; reasons.push({ t: typeAr(p.type) + ' (نوع قريب)', s: 'mid' }); }
    else reasons.push({ t: typeAr(p.type) + ' (نوع مختلف)', s: 'no' });
    // الحي (15)
    const ds = r.districts || [];
    if (!ds.length) score += 15;
    else if (ds.includes(p.district)) { score += 15; reasons.push({ t: 'حي ' + p.district, s: 'ok' }); }
    else { score += 4; reasons.push({ t: 'حي آخر: ' + (p.district || '—'), s: 'mid' }); }
    // الميزانية (20)
    const ask = num(p.priceMax) || num(p.priceMin);
    const low = num(p.priceMin) || ask;
    const bmin = num(r.budgetMin), bmax = num(r.budgetMax);
    if (!ask || (!bmin && !bmax)) { score += 14; if (!ask) reasons.push({ t: 'السعر غير محدد', s: 'mid' }); }
    else {
      const max = bmax || Infinity, min = bmin || 0;
      if (ask <= max && ask >= min) { score += 20; reasons.push({ t: 'السعر ضمن الميزانية', s: 'ok' }); }
      else if (low <= max && low >= min) { score += 16; reasons.push({ t: 'ضمن الميزانية بعد التفاوض', s: 'ok' }); }
      else if (ask < min) { score += 13; reasons.push({ t: 'أقل من الميزانية', s: 'mid' }); }
      else if (low <= max * 1.1) { score += 9; reasons.push({ t: 'أعلى بقليل من الميزانية (+' + Math.round((low / max - 1) * 100) + '%)', s: 'mid' }); }
      else if (low <= max * 1.25) { score += 3; reasons.push({ t: 'أعلى من الميزانية (+' + Math.round((low / max - 1) * 100) + '%)', s: 'no' }); }
      else { reasons.push({ t: 'خارج الميزانية', s: 'no' }); }
    }
    // المساحة (10)
    const a = areaOf(p), amin = num(r.areaMin), amax = num(r.areaMax);
    if (!amin && !amax) score += 10;
    else if (!a) { score += 5; reasons.push({ t: 'المساحة غير محددة', s: 'mid' }); }
    else {
      const lo = amin || 0, hi = amax || Infinity;
      if (a >= lo && a <= hi) { score += 10; reasons.push({ t: 'المساحة ' + fmt(a) + ' م²', s: 'ok' }); }
      else if (a >= lo * 0.9 && a <= hi * 1.1) { score += 6; reasons.push({ t: 'المساحة قريبة (' + fmt(a) + ' م²)', s: 'mid' }); }
      else reasons.push({ t: 'المساحة ' + fmt(a) + ' م²', s: 'no' });
    }
    // غرف النوم (5)
    const bmn = num(r.bedroomsMin);
    const pb = p.specs ? num(p.specs.bedrooms) : null;
    if (!bmn) score += 5;
    else if (pb === null) { score += 3; }
    else if (pb >= bmn) { score += 5; reasons.push({ t: pb + ' غرف نوم', s: 'ok' }); }
    else reasons.push({ t: 'غرف النوم ' + pb + ' فقط', s: 'no' });
    // المميزات المطلوبة (5)
    const need = r.features || [];
    if (!need.length) score += 5;
    else {
      const have = new Set(p.features || []);
      const ok = need.filter(f => have.has(f));
      score += Math.round(5 * ok.length / need.length);
      need.forEach(f => reasons.push({ t: f, s: have.has(f) ? 'ok' : 'no' }));
    }
    if (p.status === 'reserved' || p.status === 'negotiation') { score -= 10; reasons.push({ t: PSTATUS[p.status].ar, s: 'mid' }); }
    return { score: Math.max(0, Math.min(100, score)), reasons };
  }
  const MIN_SCORE = 50;
  const openReq = r => !['done', 'cancelled'].includes(r.status);
  function matchesForReq(r) {
    return S.props.map(p => ({ p, m: matchScore(p, r) })).filter(x => x.m && x.m.score >= MIN_SCORE).sort((a, b) => b.m.score - a.m.score);
  }
  function matchesForProp(p) {
    return S.reqs.filter(openReq).map(r => ({ r, m: matchScore(p, r) })).filter(x => x.m && x.m.score >= MIN_SCORE).sort((a, b) => b.m.score - a.m.score);
  }
  const scoreColor = s => (s >= 80 ? 'var(--green)' : s >= 65 ? 'var(--gold)' : 'var(--amber)');
  const scoreRing = s => `<div class="score" style="--p:${s};--c:${scoreColor(s)}"><b>${s}%</b></div>`;

  /* ============================================================
     البحث
     ============================================================ */
  function propHay(p) {
    if (p._hay) return p._hay;
    const t = TYPE[p.type] || {};
    const c = CITY[p.city] || {};
    const parts = [p.ref, p.title, t.ar, t.fr, trxAr(p.transaction), trxShort(p.transaction), p.city, c.f, p.district, p.address, p.landmark,
      p.owner && p.owner.name, p.owner && p.owner.phone, p.owner && p.owner.phone2, p.owner && p.owner.cin,
      p.broker && p.broker.name, p.broker && p.broker.phone, p.broker && p.broker.agency,
      p.priceMin, p.priceMax, p.areaTotal, p.description, p.notes, (p.features || []).join(' '),
      p.specs && p.specs.residenceName, p.specs && p.specs.subdivision, p.titleNumber, PSTATUS[p.status] && PSTATUS[p.status].ar];
    Object.defineProperty(p, '_hay', { value: norm(parts.filter(Boolean).join(' ')).replace(/(\d)\s+(?=\d)/g, '$1'), enumerable: false, configurable: true });
    return p._hay;
  }
  function reqHay(r) {
    if (r._hay) return r._hay;
    const c = r.client || {};
    const parts = [r.ref, c.name, c.phone, c.phone2, c.email, c.cin, c.profession, r.city, (CITY[r.city] || {}).f, (r.districts || []).join(' '),
      (r.types || []).map(typeAr).join(' '), trxAr(r.transaction), r.description, r.notes, RSTATUS[r.status] && RSTATUS[r.status].ar];
    Object.defineProperty(r, '_hay', { value: norm(parts.filter(Boolean).join(' ')).replace(/(\d)\s+(?=\d)/g, '$1'), enumerable: false, configurable: true });
    return r._hay;
  }
  function tokens(q) { return norm(q).replace(/(\d)\s+(?=\d)/g, '$1').split(/\s+/).filter(Boolean); }
  const hit = (hay, toks) => toks.every(t => hay.includes(t));
  function searchProps(q) { const t = tokens(q); return t.length ? S.props.filter(p => hit(propHay(p), t)) : S.props.slice(); }
  function searchReqs(q) { const t = tokens(q); return t.length ? S.reqs.filter(r => hit(reqHay(r), t)) : S.reqs.slice(); }

  function setupSearch() {
    const input = $('#q');
    const box = $('#search-results');
    let active = -1;
    const render = () => {
      const q = input.value.trim();
      if (!q) { box.classList.add('hidden'); return; }
      const ps = searchProps(q).slice(0, 7);
      const rs = searchReqs(q).slice(0, 5);
      active = -1;
      if (!ps.length && !rs.length) {
        box.innerHTML = `<div class="sr-empty">لا توجد نتائج لـ «${esc(q)}»</div>`;
      } else {
        box.innerHTML = (ps.length ? `<div class="sr-group">العقارات</div>` + ps.map(p => {
          const cv = coverOf(p);
          return `<a class="sr-item" href="#/property/${p.id}">
            <div class="sr-thumb">${cv ? `<img class="hidden" data-thumb="${cv.id}" alt="">` : ic('home', 20)}</div>
            <div class="sr-main"><b>${esc(p.title || typeAr(p.type))}</b><small>${esc(p.ref)} · ${esc([p.district, p.city].filter(Boolean).join('، '))}</small></div>
            <div class="sr-price">${esc(priceText(p))}</div></a>`;
        }).join('') : '') +
        (rs.length ? `<div class="sr-group">الطلبات والزبناء</div>` + rs.map(r => `<a class="sr-item" href="#/request/${r.id}">
            <div class="sr-thumb">${ic('users', 20)}</div>
            <div class="sr-main"><b>${esc((r.client && r.client.name) || 'زبون')}</b><small>${esc(r.ref)} · ${esc(trxAr(r.transaction))} · ${esc(r.city || '')}</small></div>
            <div class="sr-price">${r.budgetMax ? esc(fmt(r.budgetMax)) : ''}</div></a>`).join('') : '') +
        `<a class="sr-all" href="#/properties?q=${encodeURIComponent(q)}">عرض كل النتائج (${searchProps(q).length} عقار)</a>`;
        hydrateThumbs(box);
      }
      box.classList.remove('hidden');
    };
    input.addEventListener('input', debounce(render, 120));
    input.addEventListener('focus', render);
    input.addEventListener('keydown', e => {
      const items = $$('.sr-item, .sr-all', box);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === active));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (active >= 0 && items[active]) location.hash = items[active].getAttribute('href');
        else location.hash = '#/properties?q=' + encodeURIComponent(input.value.trim());
        box.classList.add('hidden'); input.blur();
      } else if (e.key === 'Escape') { box.classList.add('hidden'); input.blur(); }
    });
    document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) box.classList.add('hidden'); });
    box.addEventListener('click', e => { if (e.target.closest('a')) { box.classList.add('hidden'); } });
    document.addEventListener('keydown', e => {
      if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        e.preventDefault(); input.focus(); input.select();
      }
    });
    $('#btn-filter').onclick = () => openPropFilters();
  }

  /* ============================================================
     الموجّه (Router)
     ============================================================ */
  const main = () => $('#main');
  function parseHash() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean);
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    return { parts, query };
  }
  let leaveGuard = null;
  async function route() {
    if (leaveGuard) { const g = leaveGuard; leaveGuard = null; await g(); }
    const { parts, query } = parseHash();
    const [a, b, c] = parts;
    let nav = 'home';
    window.scrollTo(0, 0);
    if (!a) { await viewHome(); }
    else if (a === 'properties') { nav = 'properties'; viewProps(query); }
    else if (a === 'property' && b === 'new') { nav = 'properties'; await viewPropForm(null, query); }
    else if (a === 'property' && c === 'edit') { nav = 'properties'; await viewPropForm(b); }
    else if (a === 'property') { nav = 'properties'; await viewProp(b); }
    else if (a === 'requests') { nav = 'requests'; viewReqs(query); }
    else if (a === 'request' && b === 'new') { nav = 'requests'; await viewReqForm(null, query); }
    else if (a === 'request' && c === 'edit') { nav = 'requests'; await viewReqForm(b); }
    else if (a === 'request') { nav = 'requests'; await viewReq(b); }
    else if (a === 'matching') { nav = 'matching'; viewMatching(query); }
    else if (a === 'settings') { nav = 'settings'; await viewSettings(); }
    else { await viewHome(); }
    $$('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === nav));
    if (a !== 'properties') $('#q').value = '';
  }

  /* ============================================================
     الصفحة الرئيسية (لوحة القيادة)
     ============================================================ */
  async function viewHome() {
    const avail = S.props.filter(p => p.status === 'available');
    const open = S.reqs.filter(openReq);
    let strong = 0;
    const opps = [];
    open.forEach(r => matchesForReq(r).forEach(x => { if (x.m.score >= 75) { strong++; opps.push({ r, p: x.p, s: x.m.score }); } }));
    opps.sort((a, b) => b.s - a.s);
    const follow = open.filter(r => r.followUp && r.followUp <= today()).sort((a, b) => a.followUp.localeCompare(b.followUp));
    const byType = {};
    avail.forEach(p => { const k = D.CATEGORIES[catOf(p.type)].ar; byType[k] = (byType[k] || 0) + 1; });
    const maxT = Math.max(1, ...Object.values(byType));
    const saleValue = avail.filter(p => p.transaction === 'sale').reduce((s, p) => s + (num(p.priceMax) || num(p.priceMin) || 0), 0);
    const h = new Date().getHours();
    const greet = h < 12 ? 'صباح الخير' : h < 18 ? 'مساء النور' : 'مساء الخير';

    main().innerHTML = `
      <div class="hero">
        <h2>${greet} 👋</h2>
        <p>${esc(S.settings.officeName)} — قاعدة بيانات المكتب بين يديك، حتى بدون إنترنت.</p>
        <div class="btn-row">
          <a class="btn gold" href="#/property/new">${ic('plus', 18)} إضافة عقار</a>
          <a class="btn" href="#/request/new">${ic('users', 18)} إضافة طلب</a>
          <a class="btn" href="#/matching">${ic('target', 18)} المطابقة</a>
        </div>
      </div>
      <div class="stats">
        <div class="card stat"><div class="ic">${ic('building')}</div><div class="v">${avail.length}</div><div class="l">عقار متاح (من ${S.props.length})</div></div>
        <div class="card stat"><div class="ic">${ic('users')}</div><div class="v">${open.length}</div><div class="l">طلب مفتوح</div></div>
        <div class="card stat"><div class="ic">${ic('target')}</div><div class="v">${strong}</div><div class="l">مطابقة قوية (+75%)</div></div>
        <div class="card stat"><div class="ic">${ic('handshake')}</div><div class="v" style="font-size:20px">${saleValue ? esc(millions(saleValue) || fmt(saleValue)) : '—'}</div><div class="l">قيمة العقارات المعروضة للبيع</div></div>
      </div>
      ${!S.props.length && !S.reqs.length ? `
        <div class="card empty">
          <div class="big">🏡</div><h3>مرحبا بك في تطبيق مكتب الوسيط 777</h3>
          <p>ابدأ بإضافة أول عقار أو أول طلب، أو جرّب التطبيق ببيانات تجريبية.</p>
          <div class="btn-row" style="justify-content:center;margin-top:12px">
            <a class="btn primary" href="#/property/new">${ic('plus', 18)} أول عقار</a>
            <button class="btn" id="seed">${ic('sparkle', 18)} بيانات تجريبية</button>
          </div>
        </div>` : `
      <div class="grid-2">
        <div class="card">
          <div class="pair-head"><b>${ic('sparkle', 18)} أفضل الفرص (طلب ↔ عقار)</b><a class="btn sm" href="#/matching">الكل</a></div>
          ${opps.length ? opps.slice(0, 6).map(o => `
            <a class="list-row" href="#/request/${o.r.id}">
              ${scoreRing(o.s)}
              <div class="grow"><b>${esc(o.r.client && o.r.client.name)} ← ${esc(o.p.title || typeAr(o.p.type))}</b>
              <small class="muted">${esc(o.p.ref)} · ${esc(priceText(o.p))} · ${esc(o.p.district || o.p.city || '')}</small></div>
            </a>`).join('') : `<div class="empty" style="padding:26px">لا توجد مطابقات قوية حاليا</div>`}
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="pair-head"><b>${ic('calendar', 18)} متابعات اليوم</b><span class="badge ${follow.length ? 'amber' : ''}">${follow.length}</span></div>
            ${follow.length ? follow.slice(0, 6).map(r => `
              <a class="list-row" href="#/request/${r.id}"><div class="avatar" style="width:38px;height:38px;font-size:14px">${esc(((r.client && r.client.name) || '؟').trim()[0])}</div>
              <div class="grow"><b>${esc(r.client && r.client.name)}</b><small class="muted">${esc(r.followUp)} · ${esc(trxAr(r.transaction))} · ${esc(r.city || '')}</small></div></a>`).join('')
              : `<div class="empty" style="padding:22px">لا توجد متابعات مستحقة ✓</div>`}
          </div>
          <div class="card card-pad">
            <b style="display:block;margin-bottom:12px">توزيع العقارات المتاحة</b>
            <div class="bars">${Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
              <div class="bar"><span>${esc(k)}</span><div class="track"><div class="fill" style="width:${v / maxT * 100}%"></div></div><b>${v}</b></div>`).join('') || '<span class="muted">—</span>'}</div>
          </div>
        </div>
      </div>
      <h3 style="margin:22px 0 12px">آخر العقارات المضافة</h3>
      <div class="prop-grid">${S.props.slice(0, 6).map(propCard).join('')}</div>`}
    `;
    hydrateThumbs(main());
    const seed = $('#seed');
    if (seed) seed.onclick = seedDemo;
  }

  /* ============================================================
     قائمة العقارات
     ============================================================ */
  function propCard(p) {
    const cv = coverOf(p);
    const nPh = (p.media || []).filter(m => m.kind === 'photo').length;
    const nV = (p.media || []).filter(m => m.kind === 'video').length;
    const st = PSTATUS[p.status] || PSTATUS.available;
    const sp = p.specs || {};
    const a = areaOf(p);
    return `<a class="card prop-card" href="#/property/${p.id}">
      <div class="prop-cover">
        ${cv ? `<img class="hidden" data-thumb="${cv.id}" alt="" loading="lazy">` : `<div class="ph">${ic('image', 40)}</div>`}
        <div class="tl"><span class="badge deal">${esc(trxShort(p.transaction))}</span>${p.status !== 'available' ? `<span class="badge ${st.color}">${esc(st.ar)}</span>` : ''}${p.fav ? `<span class="badge fav">★</span>` : ''}${needsInfo(p) ? `<span class="badge amber">📥 للإكمال</span>` : ''}</div>
        <span class="ref">${esc(p.ref)}</span>
        ${nPh || nV ? `<span class="cnt">${nPh ? ic('camera', 14) + nPh : ''} ${nV ? ic('video', 14) + nV : ''}</span>` : ''}
      </div>
      <div class="prop-body">
        <div class="prop-price">${esc(priceText(p))}</div>
        <div class="prop-title">${esc(p.title || typeAr(p.type))}</div>
        <div class="prop-loc">${ic('pin', 15)} ${esc([p.district, p.city].filter(Boolean).join('، ') || '—')}</div>
        <div class="prop-specs">
          <span>${esc(typeAr(p.type))}</span>
          ${a ? `<span>${ic('area', 15)} ${fmt(a)} م²</span>` : ''}
          ${sp.bedrooms ? `<span>${ic('bed', 15)} ${sp.bedrooms}</span>` : ''}
          ${sp.bathrooms ? `<span>${ic('bath', 15)} ${sp.bathrooms}</span>` : ''}
          ${sp.floor ? `<span>ط ${esc(sp.floor)}</span>` : ''}
        </div>
      </div></a>`;
  }

  function filterProps(q) {
    const f = S.propFilters;
    let list = searchProps(q || '');
    if (f.trx) list = list.filter(p => p.transaction === f.trx);
    if (f.status === 'active') list = list.filter(p => ['available', 'reserved', 'negotiation'].includes(p.status));
    else if (f.status === 'todo') list = list.filter(needsInfo);
    else if (f.status) list = list.filter(p => p.status === f.status);
    if (f.cat) list = list.filter(p => catOf(p.type) === f.cat);
    if (f.type) list = list.filter(p => p.type === f.type);
    if (f.city) list = list.filter(p => p.city === f.city);
    if (f.district) list = list.filter(p => p.district === f.district);
    const pr = p => num(p.priceMax) || num(p.priceMin);
    if (f.pmin) list = list.filter(p => pr(p) !== null && pr(p) >= f.pmin);
    if (f.pmax) list = list.filter(p => pr(p) !== null && (num(p.priceMin) || pr(p)) <= f.pmax);
    if (f.amin) list = list.filter(p => areaOf(p) !== null && areaOf(p) >= f.amin);
    if (f.amax) list = list.filter(p => areaOf(p) !== null && areaOf(p) <= f.amax);
    if (f.beds) list = list.filter(p => p.specs && num(p.specs.bedrooms) >= f.beds);
    if (f.fav) list = list.filter(p => p.fav);
    const sorters = {
      new: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
      old: (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''),
      pasc: (a, b) => (pr(a) || Infinity) - (pr(b) || Infinity),
      pdesc: (a, b) => (pr(b) || 0) - (pr(a) || 0),
      aasc: (a, b) => (areaOf(a) || Infinity) - (areaOf(b) || Infinity),
      adesc: (a, b) => (areaOf(b) || 0) - (areaOf(a) || 0),
    };
    return list.sort(sorters[f.sort] || sorters.new);
  }
  function activeFilterCount() {
    const f = S.propFilters;
    return ['type', 'cat', 'city', 'district', 'pmin', 'pmax', 'amin', 'amax', 'beds'].filter(k => f[k]).length + (f.fav ? 1 : 0);
  }

  function viewProps(query) {
    const q = query.q || '';
    if (q) $('#q').value = q;
    const f = S.propFilters;
    const list = filterProps(q);
    const nf = activeFilterCount();
    const trxChips = [{ v: '', l: 'الكل' }, ...D.TRANSACTIONS.filter(t => S.props.some(p => p.transaction === t.id)).map(t => ({ v: t.id, l: t.ar }))];
    const nTodo = S.props.filter(needsInfo).length;
    const stChips = [{ v: 'active', l: 'المعروضة' }, ...(nTodo ? [{ v: 'todo', l: '📥 للإكمال (' + nTodo + ')' }] : []), { v: '', l: 'كل الحالات' }, ...D.STATUSES.map(s => ({ v: s.id, l: s.ar }))];
    main().innerHTML = `
      <div class="page-head">
        <div><h1>العقارات</h1><div class="sub">${list.length} نتيجة${q ? ` لـ «${esc(q)}»` : ''}</div></div>
        <div class="btn-row">
          <button class="btn" id="pf-open">${ic('filter', 18)} فلترة${nf ? ` <span class="badge gold">${nf}</span>` : ''}</button>
          <a class="btn primary" href="#/property/new">${ic('plus', 18)} عقار جديد</a>
        </div>
      </div>
      <div class="toolbar" style="flex-direction:column;align-items:stretch">
        <div class="chips">${trxChips.map(c => `<span class="chip ${f.trx === c.v ? 'on' : ''}" data-trx="${c.v}">${esc(c.l)}</span>`).join('')}</div>
        <div class="chips">${stChips.map(c => `<span class="chip ${f.status === c.v ? 'on' : ''}" data-st="${c.v}">${esc(c.l)}</span>`).join('')}
          <span class="chip ${f.fav ? 'on' : ''}" data-fav>★ المفضلة</span></div>
        <div class="chips">${[['new', 'الأحدث'], ['pasc', 'السعر ↑'], ['pdesc', 'السعر ↓'], ['adesc', 'المساحة ↓'], ['aasc', 'المساحة ↑'], ['old', 'الأقدم']].map(([k, l]) => `<span class="chip ${f.sort === k ? 'on' : ''}" data-sort="${k}">${l}</span>`).join('')}
          ${nf ? `<span class="chip" data-clear style="color:var(--red)">✕ مسح الفلاتر</span>` : ''}</div>
      </div>
      ${list.length ? `<div class="prop-grid">${list.map(propCard).join('')}</div>` :
        `<div class="card empty"><div class="big">🔎</div><h3>لا توجد عقارات مطابقة</h3><p>غيّر كلمات البحث أو الفلاتر، أو أضف عقارا جديدا.</p>
        <a class="btn primary" href="#/property/new">${ic('plus', 18)} إضافة عقار</a></div>`}
    `;
    hydrateThumbs(main());
    const rerender = () => viewProps(parseHash().query);
    $$('[data-trx]').forEach(el => el.onclick = () => { f.trx = el.dataset.trx; rerender(); });
    $$('[data-st]').forEach(el => el.onclick = () => { f.status = el.dataset.st; rerender(); });
    $$('[data-sort]').forEach(el => el.onclick = () => { f.sort = el.dataset.sort; rerender(); });
    const fav = $('[data-fav]'); if (fav) fav.onclick = () => { f.fav = !f.fav; rerender(); };
    const clr = $('[data-clear]'); if (clr) clr.onclick = () => { Object.assign(f, { type: '', cat: '', city: '', district: '', pmin: null, pmax: null, amin: null, amax: null, beds: null, fav: false }); rerender(); };
    $('#pf-open').onclick = openPropFilters;
  }

  function openPropFilters() {
    const f = S.propFilters;
    modal(`<h3>${ic('filter')} فلترة العقارات</h3>
      <form id="pf" class="form-grid">
        ${fSelect('cat', 'فئة العقار', Object.entries(D.CATEGORIES).map(([k, c]) => ({ v: k, l: c.ar })), f.cat, { empty: 'كل الفئات' })}
        ${fSelect('type', 'نوع العقار', [], f.type, { groups: typeGroups(), empty: 'كل الأنواع' })}
        ${fSelect('city', 'المدينة', [], f.city, { groups: cityGroups(), empty: 'كل المدن' })}
        ${fSelect('district', 'الحي', districtsOf(f.city), f.district, { empty: 'كل الأحياء' })}
        ${fRange('pmin', 'pmax', 'السعر (درهم)', f.pmin, f.pmax, { money: true, cls: 'full' })}
        ${fRange('amin', 'amax', 'المساحة (م²)', f.amin, f.amax, { cls: 'full' })}
        ${fSelect('beds', 'غرف النوم (على الأقل)', ['1', '2', '3', '4', '5'], f.beds, { empty: 'لا يهم' })}
      </form>
      <div class="btn-row" style="justify-content:space-between;margin-top:16px">
        <button class="btn" id="pf-reset">مسح</button>
        <button class="btn primary" id="pf-apply">${ic('check', 18)} تطبيق</button>
      </div>`, (m, close) => {
      bindMoney(m);
      $('[name=city]', m).onchange = e => {
        const dsel = $('[name=district]', m);
        dsel.innerHTML = `<option value="">كل الأحياء</option>` + districtsOf(e.target.value).map(d => `<option>${esc(d)}</option>`).join('');
      };
      $('#pf-apply', m).onclick = () => {
        const v = collect($('#pf', m));
        Object.assign(f, { cat: v.cat, type: v.type, city: v.city, district: v.district, pmin: v.pmin, pmax: v.pmax, amin: v.amin, amax: v.amax, beds: num(v.beds) });
        close();
        if (location.hash.startsWith('#/properties')) viewProps(parseHash().query);
        else location.hash = '#/properties';
      };
      $('#pf-reset', m).onclick = () => {
        Object.assign(f, { type: '', cat: '', city: '', district: '', pmin: null, pmax: null, amin: null, amax: null, beds: null });
        close();
        if (location.hash.startsWith('#/properties')) viewProps(parseHash().query);
      };
    });
  }

  /* ============================================================
     نموذج إضافة / تعديل عقار
     ============================================================ */
  async function viewPropForm(id) {
    const existing = id ? S.props.find(p => p.id === id) : null;
    if (id && !existing) { main().innerHTML = notFound(); return; }
    const p = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: uid(), transaction: 'sale', type: 'apartment', status: 'available', city: S.settings.officeCity || 'مكناس',
      specs: {}, features: [], owner: {}, broker: {}, media: [], priceUnit: 'درهم', negotiable: true,
    };
    const isNew = !existing;
    const media = p.media || [];
    let saved = false;
    const sessionFiles = []; // ملفات أضيفت في هذه الجلسة (تحذف إن ألغي الإدخال)

    main().innerHTML = `
      <div class="page-head">
        <div><h1>${isNew ? 'إضافة عقار جديد' : 'تعديل العقار ' + esc(p.ref)}</h1><div class="sub">املأ ما تعرفه — الخانات تتغير حسب نوع العقار</div></div>
        <a class="btn" href="${isNew ? '#/properties' : '#/property/' + p.id}">${ic('back', 18)} رجوع</a>
      </div>
      <form class="form" id="pform" autocomplete="off" novalidate>
        <div class="card card-pad">
          <h3 class="section-title"><span class="num">1</span> نوع العملية والعقار</h3>
          <div class="field full" style="margin-bottom:12px"><label>نوع العملية</label>${fSeg('transaction', D.TRANSACTIONS.map(t => ({ v: t.id, l: t.ar })), p.transaction)}</div>
          <div class="form-grid">
            ${fSelect('type', 'نوع العقار', [], p.type, { groups: typeGroups(), req: true, noEmpty: true })}
            ${fSelect('status', 'الحالة', D.STATUSES.map(s => ({ v: s.id, l: s.ar })), p.status, { noEmpty: true })}
            ${fInput('title', 'عنوان الإعلان', p.title, { ph: 'يُنشأ تلقائيا إن تُرك فارغا', cls: 'full' })}
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">2</span> الموقع</h3>
          <div class="form-grid">
            ${fSelect('city', 'المدينة', [], p.city, { groups: cityGroups(), req: true })}
            ${fInput('district', 'الحي', p.district, { list: 'dl-districts', ph: 'اختر أو اكتب حيا جديدا' })}
            ${fInput('address', 'العنوان / الزنقة / الرقم', p.address)}
            ${fInput('landmark', 'بالقرب من (معلم)', p.landmark, { ph: 'مثال: قرب مسجد...، مرجان...' })}
            <div class="field full"><label>الموقع على الخريطة (رابط Google Maps أو إحداثيات)</label>
              <div class="range"><input name="gps" value="${esc(p.gps || '')}" placeholder="https://maps.google.com/... أو 33.89,-5.55">
              <button type="button" class="btn sm" id="btn-gps">${ic('gps', 16)} موقعي الآن</button></div></div>
          </div>
          <datalist id="dl-districts"></datalist>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">3</span> السعر والمساحة</h3>
          <div class="form-grid">
            ${fInput('priceMin', 'السعر من (أدنى ثمن مقبول)', p.priceMin, { money: true })}
            ${fInput('priceMax', 'السعر إلى (الثمن المطلوب)', p.priceMax, { money: true })}
            ${fSelect('priceUnit', 'الوحدة', D.PRICE_UNITS[p.transaction] || ['درهم'], p.priceUnit, { noEmpty: true })}
            ${fInput('commission', 'عمولة المكتب', p.commission, { ph: 'مثال: 2.5% أو 10 000 درهم' })}
            ${fInput('areaTotal', 'المساحة الإجمالية (م²)', p.areaTotal, { type: 'number' })}
            ${fInput('areaBuilt', 'المساحة المبنية (م²)', p.areaBuilt, { type: 'number' })}
            ${fInput('areaUseful', 'المساحة الصافية / المسكونة (م²)', p.areaUseful, { type: 'number' })}
            <div class="field"><label>ثمن المتر المربع</label><input id="ppm" disabled value=""></div>
            <label class="toggle-line full"><input type="checkbox" name="negotiable" ${p.negotiable ? 'checked' : ''}> الثمن قابل للتفاوض</label>
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">4</span> مواصفات العقار <span class="badge gold" id="cat-badge"></span></h3>
          <div class="form-grid" id="spec-fields"></div>
          <div class="field full" style="margin-top:14px"><label>المميزات والمرافق</label><div id="feat-fields"></div></div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">5</span> الوضعية القانونية</h3>
          <div class="form-grid">
            ${fSelect('titleStatus', 'وضعية الملك', D.TITLE_STATUS, p.titleStatus)}
            ${fInput('titleNumber', 'رقم الرسم العقاري', p.titleNumber)}
            ${fInput('legalNotes', 'ملاحظات قانونية', p.legalNotes, { cls: 'full', ph: 'رهن بنكي، إرث، نزاع، وكالة...' })}
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">6</span> صاحب العقار</h3>
          <div class="form-grid">
            ${fInput('owner.name', 'الاسم الكامل', p.owner.name, { req: true })}
            ${fInput('owner.phone', 'الهاتف', p.owner.phone, { type: 'tel', req: true })}
            ${fInput('owner.phone2', 'هاتف آخر', p.owner.phone2, { type: 'tel' })}
            ${fInput('owner.whatsapp', 'واتساب (إن كان مختلفا)', p.owner.whatsapp, { type: 'tel' })}
            ${fSelect('owner.relation', 'الصفة', D.OWNER_RELATIONS, p.owner.relation || 'المالك', { noEmpty: true })}
            ${fInput('owner.cin', 'رقم البطاقة الوطنية', p.owner.cin)}
            ${fInput('owner.email', 'البريد الإلكتروني', p.owner.email, { type: 'email' })}
            ${fInput('owner.address', 'عنوان السكن', p.owner.address)}
            ${fInput('owner.visits', 'أوقات الزيارة المناسبة', p.owner.visits, { ph: 'مثال: كل يوم بعد 17h' })}
            ${fInput('owner.notes', 'ملاحظات عن المالك', p.owner.notes, { cls: 'full' })}
            <label class="toggle-line"><input type="checkbox" name="keysAtOffice" ${p.keysAtOffice ? 'checked' : ''}> ${ic('key', 18)} المفاتيح عند المكتب</label>
            <label class="toggle-line"><input type="checkbox" name="exclusive" ${p.exclusive ? 'checked' : ''}> ${ic('star', 18)} تفويض حصري للمكتب</label>
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">7</span> الوسيط (إن وجد)</h3>
          <label class="toggle-line" style="margin-bottom:12px"><input type="checkbox" name="broker.has" id="has-broker" ${p.broker && p.broker.has ? 'checked' : ''}> العقار جاء عن طريق وسيط / سمسار</label>
          <div class="form-grid ${p.broker && p.broker.has ? '' : 'hidden'}" id="broker-fields">
            ${fInput('broker.name', 'اسم الوسيط', p.broker.name)}
            ${fInput('broker.phone', 'هاتف الوسيط', p.broker.phone, { type: 'tel' })}
            ${fInput('broker.agency', 'المكتب / الوكالة', p.broker.agency)}
            ${fInput('broker.share', 'نصيبه من العمولة', p.broker.share, { ph: 'مثال: 50%' })}
            ${fInput('broker.notes', 'ملاحظات', p.broker.notes, { cls: 'full' })}
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">8</span> الصور، الفيديو والمستندات</h3>
          <div class="form-grid">
            <div class="full">
              <label class="dropzone" data-kind="photo">${ic('camera', 30)}<b>إضافة صور</b><small>من الكاميرا أو المعرض — تُضغط تلقائيا</small>
                <input type="file" accept="image/*" multiple hidden></label>
            </div>
            <div><label class="dropzone" data-kind="video">${ic('video', 28)}<b>إضافة فيديو</b><small>جولة داخل العقار</small>
                <input type="file" accept="video/*" multiple hidden></label></div>
            <div><label class="dropzone" data-kind="doc">${ic('file', 28)}<b>إضافة مستندات</b><small>رسم عقاري، تصميم، عقد، PDF...</small>
                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,.txt" multiple hidden></label></div>
          </div>
          <div class="progress hidden" id="up-prog"><div style="width:0"></div></div>
          <div class="media-grid" id="media-grid"></div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">9</span> الوصف والملاحظات</h3>
          <div class="form-grid">
            <div class="field full"><label style="display:flex;justify-content:space-between;align-items:center">وصف الإعلان
              <button type="button" class="btn sm gold" id="gen-desc">${ic('sparkle', 16)} كتابة الوصف تلقائيا</button></label>
              <textarea name="description" rows="6">${esc(p.description || '')}</textarea></div>
            ${fText('notes', 'ملاحظات داخلية (لا تظهر للزبون)', p.notes)}
          </div>
        </div>

        <div class="form-actions">
          <a class="btn" href="${isNew ? '#/properties' : '#/property/' + p.id}">إلغاء</a>
          <button class="btn primary" type="submit">${ic('check', 18)} حفظ العقار</button>
        </div>
      </form>`;

    const form = $('#pform');
    bindMoney(form);

    // خانات حسب النوع
    const renderSpecs = () => {
      const cur = collect(form);
      const specs = Object.assign({}, p.specs, cur.specs || {});
      const feats = new Set($('#feat-fields').children.length ? (cur.features || []) : (p.features || []));
      const type = $('[name=type]', form).value;
      const cat = catOf(type);
      $('#cat-badge').textContent = D.CATEGORIES[cat].ar;
      $('#spec-fields').innerHTML = (D.FIELDS[cat] || []).map(fd => {
        const name = 'specs.' + fd.k;
        if (fd.t === 'select') return fSelect(name, fd.l, fd.o, specs[fd.k]);
        if (fd.t === 'number') return fInput(name, fd.l, specs[fd.k], { type: 'number' });
        return fInput(name, fd.l, specs[fd.k]);
      }).join('');
      const list = Array.from(new Set([...(D.FEATURES[cat] || []), ...D.FEATURES.common]));
      const extra = [...feats].filter(x => !list.includes(x));
      $('#feat-fields').innerHTML = fChecks('features', [...list, ...extra], [...feats]);
      p.specs = specs;
      p.features = [...feats];
    };
    const renderDistricts = () => {
      const city = $('[name=city]', form).value;
      $('#dl-districts').innerHTML = districtsOf(city).map(d => `<option value="${esc(d)}">`).join('');
    };
    const renderUnits = () => {
      const trx = $('[name=transaction]:checked', form).value;
      const sel = $('[name=priceUnit]', form);
      const cur = sel.value;
      const units = D.PRICE_UNITS[trx] || ['درهم'];
      sel.innerHTML = units.map(u => `<option ${u === cur ? 'selected' : ''}>${esc(u)}</option>`).join('');
    };
    const renderPpm = () => {
      const v = collect(form);
      const pr = v.priceMax || v.priceMin;
      const a = v.areaTotal || v.areaBuilt || v.areaUseful;
      $('#ppm').value = pr && a && !isRent(v.transaction) ? fmt(Math.round(pr / a)) + ' درهم/م²' : '—';
    };
    renderSpecs(); renderDistricts(); renderPpm();
    $('[name=type]', form).onchange = renderSpecs;
    $('[name=city]', form).onchange = () => { $('[name=district]', form).value = ''; renderDistricts(); };
    $$('[name=transaction]', form).forEach(r => r.onchange = () => { renderUnits(); renderPpm(); });
    ['priceMin', 'priceMax', 'areaTotal', 'areaBuilt', 'areaUseful'].forEach(n => $(`[name="${n}"]`, form).addEventListener('input', renderPpm));
    $('#has-broker').onchange = e => $('#broker-fields').classList.toggle('hidden', !e.target.checked);
    $('#btn-gps').onclick = () => {
      if (!navigator.geolocation) return toast('تحديد الموقع غير مدعوم');
      toast('جاري تحديد الموقع...');
      navigator.geolocation.getCurrentPosition(
        pos => { $('[name=gps]', form).value = pos.coords.latitude.toFixed(6) + ',' + pos.coords.longitude.toFixed(6); toast('تم تحديد الموقع ✓'); },
        () => toast('تعذر تحديد الموقع — تحقق من الإذن'), { enableHighAccuracy: true, timeout: 15000 });
    };
    $('#gen-desc').onclick = () => {
      const v = collect(form);
      $('[name=description]', form).value = buildDescription(Object.assign({}, p, v));
      toast('تمت كتابة الوصف ✓ يمكنك تعديله');
    };

    // الوسائط
    const renderMedia = () => {
      const grid = $('#media-grid');
      grid.innerHTML = media.map((m, i) => `
        <div class="media-item" data-i="${i}">
          ${m.kind === 'photo' ? `<img class="hidden" data-thumb="${m.id}" alt="">` : m.kind === 'video' ? `<video data-full="${m.id}" muted playsinline preload="metadata"></video><div class="play">${ic('play', 30)}</div>` :
            `<div class="doc">${ic('file', 30)}<span>${esc(m.name)}</span></div>`}
          ${m.kind === 'photo' ? `<button type="button" class="star ${coverOf(p) && coverOf(p).id === m.id ? 'on' : ''}" data-cover="${m.id}" title="صورة الغلاف">${ic('star', 15)}</button>` : ''}
          <button type="button" class="x" data-rm="${m.id}" title="حذف">${ic('trash', 15)}</button>
        </div>`).join('');
      hydrateThumbs(grid);
    };
    renderMedia();
    $('#media-grid').addEventListener('click', async e => {
      const rm = e.target.closest('[data-rm]');
      const cv = e.target.closest('[data-cover]');
      if (rm) {
        if (!(await confirmBox('حذف هذا الملف؟', 'حذف'))) return;
        const idx = media.findIndex(m => m.id === rm.dataset.rm);
        if (idx >= 0) { p._removed = (p._removed || []).concat(media[idx].id); media.splice(idx, 1); }
        renderMedia();
      } else if (cv) { p.cover = cv.dataset.cover; renderMedia(); }
    });
    const handleFiles = async (files, kind) => {
      const prog = $('#up-prog'); prog.classList.remove('hidden');
      const bar = prog.firstElementChild;
      let done = 0;
      for (const f of files) {
        const fid = uid();
        const rec = { id: fid, owner: p.id, kind, name: f.name, mime: f.type, size: f.size };
        if (kind === 'photo' || (kind === 'doc' && f.type.startsWith('image/'))) {
          const big = await compressImage(f, 1920, 0.85);
          const small = await compressImage(f, 480, 0.75);
          rec.blob = big.blob; rec.thumb = small.blob; rec.mime = big.blob.type || f.type; rec.size = big.blob.size;
        } else rec.blob = f;
        if (kind === 'video' && f.size > 300 * 1024 * 1024) toast('تنبيه: فيديو كبير (' + Math.round(f.size / 1048576) + ' MB) — قد يملأ ذاكرة الجهاز');
        await DB.put('files', rec);
        sessionFiles.push(fid);
        media.push({ id: fid, kind, name: f.name, mime: rec.mime, size: rec.size });
        done++; bar.style.width = (done / files.length * 100) + '%';
      }
      setTimeout(() => prog.classList.add('hidden'), 500);
      renderMedia();
    };
    $$('.dropzone', form).forEach(dz => {
      const inp = $('input[type=file]', dz);
      inp.onchange = () => { if (inp.files.length) handleFiles(Array.from(inp.files), dz.dataset.kind); inp.value = ''; };
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('over'));
      dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); handleFiles(Array.from(e.dataTransfer.files), dz.dataset.kind); });
    });

    // الحفظ
    leaveGuard = async () => {
      if (saved) return;
      // حذف الملفات التي أضيفت ثم أُلغي الحفظ
      for (const fid of sessionFiles) await DB.del('files', fid);
    };
    form.onsubmit = async e => {
      e.preventDefault();
      const v = collect(form);
      if (!v.owner.name || !v.owner.phone) { toast('المرجو إدخال اسم وهاتف صاحب العقار'); $('[name="owner.name"]', form).focus(); return; }
      if (!v.city) { toast('المرجو اختيار المدينة'); return; }
      if (v.priceMin && v.priceMax && v.priceMin > v.priceMax) { const t = v.priceMin; v.priceMin = v.priceMax; v.priceMax = t; }
      const obj = Object.assign({}, existing || {}, v, {
        id: p.id, media, cover: p.cover && media.some(m => m.id === p.cover) ? p.cover : null,
        broker: Object.assign({}, v.broker, { has: !!(v.broker && v.broker.has) }),
        updatedAt: new Date().toISOString(),
      });
      delete obj._removed;
      if (isNew) { obj.createdAt = new Date().toISOString(); obj.ref = await DB.nextRef('W777', maxRef(S.props)); }
      if (!obj.title) obj.title = autoTitle(obj);
      await DB.saveRec('properties', obj);
      for (const fid of (p._removed || [])) { await DB.del('files', fid); await DB.markDirty('file', fid); urlCache.delete(fid); urlCache.delete(fid + ':t'); }
      await rememberDistricts(obj.city, [obj.district]);
      saved = true;
      await loadAll();
      toast(isNew ? 'تمت إضافة العقار ' + obj.ref + ' ✓' : 'تم حفظ التعديلات ✓');
      const n = matchesForProp(obj).length;
      if (n) setTimeout(() => toast('🎯 ' + n + ' طلب مطابق لهذا العقار!', 3200), 900);
      location.hash = '#/property/' + obj.id;
    };
  }

  // أكبر رقم مرجع موجود (لتفادي تكرار المراجع بين الأجهزة)
  function maxRef(list) {
    return list.reduce((m, x) => Math.max(m, Number(String(x.ref || '').split('-').pop()) || 0), 0);
  }
  const needsInfo = p => !!p.imported && !(p.owner && p.owner.name && p.owner.phone);
  function autoTitle(p) {
    const loc = p.district ? p.district + ' - ' + p.city : p.city;
    const a = areaOf(p);
    return `${typeAr(p.type)} ${trxShort(p.transaction)}${a ? ' ' + fmt(a) + ' م²' : ''} ب${loc || ''}`.trim();
  }
  function buildDescription(p) {
    const s = p.specs || {};
    const cat = catOf(p.type);
    const L = [];
    const a = areaOf(p);
    L.push(`🏡 ${typeAr(p.type)} ${trxShort(p.transaction)}${p.district ? ' بحي ' + p.district : ''}${p.city ? ' - ' + p.city : ''}`);
    if (p.landmark) L.push(`📍 بالقرب من ${p.landmark}`);
    const specs = [];
    if (a) specs.push(`المساحة ${fmt(a)} م²`);
    if (p.areaBuilt && p.areaBuilt !== a) specs.push(`المبنية ${fmt(p.areaBuilt)} م²`);
    if (s.landArea) specs.push(`مساحة الأرض ${fmt(s.landArea)} م²`);
    if (s.hectares) specs.push(`${s.hectares} هكتار`);
    if (s.floor) specs.push(`الطابق ${s.floor}`);
    if (s.levels) specs.push(s.levels);
    if (s.bedrooms) specs.push(`${s.bedrooms} غرف نوم`);
    if (s.salons) specs.push(`${s.salons} صالون`);
    if (s.bathrooms) specs.push(`${s.bathrooms} حمام`);
    if (s.kitchen) specs.push(s.kitchen);
    if (s.facades && Number(s.facades) > 1) specs.push(`${s.facades} واجهات`);
    if (s.zoning) specs.push(`التنطيق: ${s.zoning}`);
    if (s.heightAllowed) specs.push(`العلو المسموح ${s.heightAllowed}`);
    if (s.water) specs.push(`الماء: ${s.water}`);
    if (s.trees) specs.push(s.trees);
    if (s.frontage) specs.push(`واجهة ${s.frontage} م`);
    if (s.rooms && cat !== 'apartment' && cat !== 'house') specs.push(`${s.rooms} غرف/قاعات`);
    if (s.apartmentsCount) specs.push(`${s.apartmentsCount} شقق`);
    if (s.shopsCount) specs.push(`${s.shopsCount} محلات`);
    if (s.condition) specs.push(`الحالة: ${s.condition}`);
    if (s.furnished && s.furnished !== 'غير مفروش') specs.push(s.furnished);
    if (specs.length) L.push('✅ ' + specs.join(' • '));
    if ((p.features || []).length) L.push('✨ المميزات: ' + p.features.join('، '));
    if (p.titleStatus) L.push('📄 ' + p.titleStatus);
    const pr = p.priceMax || p.priceMin;
    if (pr) L.push(`💰 الثمن: ${fmt(pr)} ${p.priceUnit || 'درهم'}${!isRent(p.transaction) && millions(pr) ? ' (' + millions(pr) + ')' : ''}${p.negotiable ? ' — قابل للتفاوض' : ''}`);
    L.push(`📞 للتواصل: ${S.settings.officeName}${S.settings.officePhone ? ' — ' + S.settings.officePhone : ''}`);
    if (p.ref) L.push(`🔖 المرجع: ${p.ref}`);
    return L.join('\n');
  }

  /* ============================================================
     صفحة العقار
     ============================================================ */
  async function viewProp(id) {
    const p = S.props.find(x => x.id === id);
    if (!p) { main().innerHTML = notFound(); return; }
    const photos = (p.media || []).filter(m => m.kind === 'photo');
    const videos = (p.media || []).filter(m => m.kind === 'video');
    const docs = (p.media || []).filter(m => m.kind === 'doc');
    const visual = [...photos, ...videos];
    const cv = coverOf(p);
    if (cv) { visual.splice(visual.indexOf(cv), 1); visual.unshift(cv); }
    const st = PSTATUS[p.status] || PSTATUS.available;
    const cat = catOf(p.type);
    const s = p.specs || {};
    const specRows = (D.FIELDS[cat] || []).filter(f => s[f.k] !== undefined && s[f.k] !== null && s[f.k] !== '').map(f => `<div><small>${esc(f.l)}</small><b>${esc(f.t === 'number' ? fmt(s[f.k]) : s[f.k])}</b></div>`);
    const a = areaOf(p);
    const pr = num(p.priceMax) || num(p.priceMin);
    const matches = matchesForProp(p);
    const gal = visual.slice(0, 3);
    const galCls = gal.length === 1 ? 'one' : gal.length === 2 ? 'two' : '';

    main().innerHTML = `
      <div class="page-head no-print">
        <a class="btn" href="#/properties">${ic('back', 18)} العقارات</a>
        <div class="btn-row">
          <button class="btn" id="p-fav">${ic('star', 18)} ${p.fav ? 'في المفضلة' : 'مفضلة'}</button>
          <button class="btn" id="p-share">${ic('share', 18)} مشاركة</button>
          ${EMBED ? '' : `<button class="btn" onclick="window.print()">${ic('print', 18)} طباعة / PDF</button>`}
          <a class="btn primary" href="#/property/${p.id}/edit">${ic('edit', 18)} تعديل</a>
        </div>
      </div>
      ${gal.length ? `<div class="gallery ${galCls}">${gal.map((m, i) => `<div data-lb="${i}">
          ${m.kind === 'video' ? `<video data-full="${m.id}" muted playsinline preload="metadata"></video><div class="play" style="position:absolute;inset:0;display:grid;place-items:center;color:#fff">${ic('play', 44)}</div>` : `<img data-full="${m.id}" alt="">`}
          ${i === gal.length - 1 && visual.length > 3 ? `<div class="more">+${visual.length - 3}</div>` : ''}</div>`).join('')}</div>` : ''}
      <div class="detail-grid">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card card-pad">
            <div class="btn-row" style="margin-bottom:8px">
              <span class="badge blue">${esc(trxAr(p.transaction))}</span><span class="badge ${st.color}">${esc(st.ar)}</span>
              <span class="badge">${esc(p.ref)}</span>${p.exclusive ? '<span class="badge gold">★ حصري</span>' : ''}${p.keysAtOffice ? '<span class="badge gold">🔑 المفاتيح بالمكتب</span>' : ''}
            </div>
            <h1 style="margin:4px 0 6px;font-size:22px">${esc(p.title || typeAr(p.type))}</h1>
            <div class="prop-loc" style="font-size:14px">${ic('pin', 16)} ${esc([p.address, p.district, p.city].filter(Boolean).join('، '))}${p.landmark ? ' — قرب ' + esc(p.landmark) : ''}</div>
            <div style="margin-top:14px" class="detail-price">${esc(priceText(p))}</div>
            <div class="muted">${[pr && !isRent(p.transaction) ? millions(pr) : '', p.negotiable ? 'قابل للتفاوض' : 'ثمن نهائي', pr && a && !isRent(p.transaction) ? fmt(Math.round(pr / a)) + ' درهم/م²' : '', p.commission ? 'العمولة: ' + p.commission : ''].filter(Boolean).map(esc).join(' · ')}</div>
            <div class="kv" style="margin-top:16px">
              <div><small>نوع العقار</small><b>${esc(typeAr(p.type))}</b></div>
              ${p.areaTotal ? `<div><small>المساحة الإجمالية</small><b>${fmt(p.areaTotal)} م²</b></div>` : ''}
              ${p.areaBuilt ? `<div><small>المساحة المبنية</small><b>${fmt(p.areaBuilt)} م²</b></div>` : ''}
              ${p.areaUseful ? `<div><small>المساحة الصافية</small><b>${fmt(p.areaUseful)} م²</b></div>` : ''}
              ${specRows.join('')}
              ${p.titleStatus ? `<div><small>وضعية الملك</small><b>${esc(p.titleStatus)}</b></div>` : ''}
              ${p.titleNumber ? `<div><small>الرسم العقاري</small><b>${esc(p.titleNumber)}</b></div>` : ''}
            </div>
            ${(p.features || []).length ? `<div style="margin-top:14px" class="reasons">${p.features.map(f => `<span class="ok">✓ ${esc(f)}</span>`).join('')}</div>` : ''}
          </div>
          ${p.description ? `<div class="card card-pad"><div class="pair-head" style="padding:0 0 10px;border:0"><b>الوصف</b><button class="btn sm" id="copy-desc">${ic('copy', 15)} نسخ</button></div><div class="desc">${esc(p.description)}</div></div>` : ''}
          ${p.legalNotes || p.notes ? `<div class="card card-pad no-print"><b>ملاحظات داخلية</b>${p.legalNotes ? `<p class="desc">⚖️ ${esc(p.legalNotes)}</p>` : ''}${p.notes ? `<p class="desc">${esc(p.notes)}</p>` : ''}</div>` : ''}
          ${docs.length ? `<div class="card card-pad no-print"><b style="display:block;margin-bottom:10px">المستندات (${docs.length})</b><div class="doc-list">${docs.map(d => `<a href="#" data-doc="${d.id}">${ic('file')} <span class="grow">${esc(d.name)}</span><small class="muted">${Math.max(1, Math.round((d.size || 0) / 1024))} KB</small></a>`).join('')}</div></div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card card-pad no-print">
            <b style="display:block;margin-bottom:12px">صاحب العقار</b>
            <div class="contact-card"><div class="avatar">${esc((p.owner && p.owner.name || '؟').trim()[0])}</div>
              <div class="grow"><b>${esc(p.owner && p.owner.name)}</b><div class="muted" style="font-size:13px">${esc(p.owner && p.owner.relation || '')}${p.owner && p.owner.cin ? ' · ' + esc(p.owner.cin) : ''}</div></div></div>
            <div class="btn-row" style="margin-top:12px">
              ${p.owner && p.owner.phone ? `<a class="btn sm" href="${telLink(p.owner.phone)}">${ic('phone', 16)} ${esc(p.owner.phone)}</a>` : ''}
              ${p.owner && p.owner.phone2 ? `<a class="btn sm" href="${telLink(p.owner.phone2)}">${ic('phone', 16)} ${esc(p.owner.phone2)}</a>` : ''}
              ${p.owner && (p.owner.whatsapp || p.owner.phone) ? `<a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(p.owner.whatsapp || p.owner.phone)}">${ic('wa', 16)} واتساب</a>` : ''}
            </div>
            ${p.owner && (p.owner.visits || p.owner.email || p.owner.address || p.owner.notes) ? `<div class="muted" style="font-size:13px;margin-top:10px">${[p.owner.visits && '🕒 ' + p.owner.visits, p.owner.email && '✉️ ' + p.owner.email, p.owner.address && '🏠 ' + p.owner.address, p.owner.notes && '📝 ' + p.owner.notes].filter(Boolean).map(esc).join('<br>')}</div>` : ''}
            ${p.broker && p.broker.has ? `<hr style="border:0;border-top:1px dashed var(--line);margin:14px 0">
              <b style="display:block;margin-bottom:8px">الوسيط</b>
              <div>${esc(p.broker.name || '')}${p.broker.agency ? ' — ' + esc(p.broker.agency) : ''}${p.broker.share ? ` <span class="badge gold">${esc(p.broker.share)}</span>` : ''}</div>
              <div class="btn-row" style="margin-top:8px">${p.broker.phone ? `<a class="btn sm" href="${telLink(p.broker.phone)}">${ic('phone', 16)} ${esc(p.broker.phone)}</a><a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(p.broker.phone)}">${ic('wa', 16)}</a>` : ''}</div>
              ${p.broker.notes ? `<div class="muted" style="font-size:13px;margin-top:6px">${esc(p.broker.notes)}</div>` : ''}` : ''}
          </div>
          ${p.gps ? `<a class="card card-pad no-print" style="text-decoration:none;display:flex;gap:10px;align-items:center" target="_blank" rel="noopener" href="${esc(mapUrl(p.gps))}">${ic('map', 22)}<b>فتح الموقع على الخريطة</b></a>` : ''}
          <div class="card no-print">
            <div class="pair-head"><b>${ic('target', 18)} طلبات مطابقة</b><span class="badge ${matches.length ? 'green' : ''}">${matches.length}</span></div>
            ${matches.length ? matches.slice(0, 8).map(x => `
              <div class="list-row">
                ${scoreRing(x.m.score)}
                <a class="grow" href="#/request/${x.r.id}" style="text-decoration:none"><b>${esc(x.r.client && x.r.client.name)}</b>
                  <small class="muted">${esc(x.r.ref)} · ميزانية ${x.r.budgetMax ? esc(fmt(x.r.budgetMax)) : '—'}</small></a>
                ${x.r.client && x.r.client.phone ? `<a class="btn sm wa" target="_blank" rel="noopener" data-send="${x.r.id}" href="${esc(waShareUrl(p, x.r))}">${ic('wa', 16)}</a>` : ''}
              </div>`).join('') : `<div class="empty" style="padding:22px">لا يوجد طلب مطابق حاليا</div>`}
          </div>
          <div class="card card-pad no-print muted" style="font-size:12.5px">
            أضيف: ${esc((p.createdAt || '').slice(0, 10))} · آخر تعديل: ${esc((p.updatedAt || '').slice(0, 10))}
            <div class="btn-row" style="margin-top:10px">
              <button class="btn sm" id="p-dup">${ic('copy', 15)} نسخ كعقار جديد</button>
              <button class="btn sm danger" id="p-del">${ic('trash', 15)} حذف العقار</button>
            </div>
          </div>
        </div>
      </div>`;
    hydrateThumbs(main());
    $$('[data-lb]').forEach(el => el.onclick = () => lightbox(visual, Number(el.dataset.lb)));
    $$('[data-doc]').forEach(el => el.onclick = async e => {
      e.preventDefault();
      const d = docs.find(x => x.id === el.dataset.doc);
      const url = await fileUrl(d.id);
      if (d.mime && (d.mime.startsWith('image/') || d.mime === 'application/pdf')) window.open(url, '_blank');
      else { const a2 = document.createElement('a'); a2.href = url; a2.download = d.name; a2.click(); }
    });
    $$('[data-send]').forEach(el => el.addEventListener('click', () => markProposal(el.dataset.send, p.id, 'sent')));
    const cd = $('#copy-desc');
    if (cd) cd.onclick = () => navigator.clipboard.writeText(p.description).then(() => toast('تم نسخ الوصف ✓'));
    $('#p-fav').onclick = async () => { p.fav = !p.fav; await DB.saveRec('properties', p); toast(p.fav ? 'أضيف للمفضلة ★' : 'أزيل من المفضلة'); viewProp(id); };
    $('#p-share').onclick = () => shareProperty(p);
    $('#p-del').onclick = async () => {
      if (!(await confirmBox('حذف العقار ' + p.ref + ' وكل صوره وملفاته نهائيا؟', 'حذف نهائي'))) return;
      await DB.delRec('properties', p.id);
      await DB.delFilesOf(p.id);
      for (const m of (p.media || [])) await DB.markDirty('file', m.id);
      await loadAll();
      toast('تم حذف العقار');
      location.hash = '#/properties';
    };
    $('#p-dup').onclick = async () => {
      const copy = JSON.parse(JSON.stringify(p));
      copy.id = uid(); copy.ref = await DB.nextRef('W777', maxRef(S.props)); copy.media = []; copy.cover = null; copy.fav = false;
      copy.createdAt = copy.updatedAt = new Date().toISOString(); copy.title = (p.title || '') + ' (نسخة)';
      await DB.saveRec('properties', copy);
      await loadAll();
      toast('تم إنشاء نسخة ' + copy.ref);
      location.hash = '#/property/' + copy.id + '/edit';
    };
  }
  function mapUrl(gps) {
    if (/^https?:\/\//.test(gps)) return gps;
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(gps);
  }
  function waShareUrl(p, r) {
    const name = r && r.client && r.client.name ? 'السلام عليكم ' + r.client.name.split(' ')[0] + '،\n' : 'السلام عليكم،\n';
    const text = name + 'عندنا عرض قد يناسب طلبك:\n\n' + (p.description || buildDescription(p));
    const phone = r && r.client ? waPhone(r.client.whatsapp || r.client.phone) : '';
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(text);
  }
  async function shareProperty(p) {
    const text = p.description || buildDescription(p);
    const photos = (p.media || []).filter(m => m.kind === 'photo').slice(0, 6);
    try {
      if (navigator.canShare && photos.length) {
        const files = [];
        for (const m of photos) {
          const blob = await getBlob(m.id, false);
          if (blob) files.push(new File([blob], (p.ref || 'photo') + '-' + (files.length + 1) + '.jpg', { type: blob.type || 'image/jpeg' }));
        }
        if (navigator.canShare({ files })) { await navigator.share({ files, text, title: p.title }); return; }
      }
      if (navigator.share) { await navigator.share({ text, title: p.title }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    await navigator.clipboard.writeText(text);
    toast('تم نسخ الإعلان — الصقه في واتساب أو فيسبوك ✓');
  }

  /* ============================================================
     الطلبات
     ============================================================ */
  function reqCard(r) {
    const st = RSTATUS[r.status] || RSTATUS.new;
    const n = openReq(r) ? matchesForReq(r).length : 0;
    const c = r.client || {};
    return `<a class="list-row" href="#/request/${r.id}">
      <div class="avatar">${esc((c.name || '؟').trim()[0])}</div>
      <div class="grow">
        <b>${esc(c.name || 'زبون')} ${r.priority === 'high' ? '🔥' : ''}</b>
        <small class="muted">${esc(r.ref)} · ${esc(trxAr(r.transaction))} · ${esc((r.types || []).map(typeAr).slice(0, 2).join('، ') || 'أي نوع')} · ${esc([((r.districts || [])[0]), r.city].filter(Boolean).join('، '))}</small>
        <div class="btn-row" style="margin-top:6px"><span class="badge ${st.color}">${esc(st.ar)}</span>
          ${r.budgetMax || r.budgetMin ? `<span class="badge gold">${esc([r.budgetMin && fmt(r.budgetMin), r.budgetMax && fmt(r.budgetMax)].filter(Boolean).join(' — '))} د</span>` : ''}
          ${n ? `<span class="badge green">🎯 ${n} مطابق</span>` : ''}
          ${r.followUp ? `<span class="badge ${r.followUp <= today() && openReq(r) ? 'amber' : ''}">${ic('calendar', 12)} ${esc(r.followUp)}</span>` : ''}</div>
      </div>
      ${ic('chevL', 18)}</a>`;
  }
  function viewReqs(query) {
    const f = S.reqFilters;
    let list = searchReqs(query.q || '');
    if (f.status === 'open') list = list.filter(openReq);
    else if (f.status) list = list.filter(r => r.status === f.status);
    if (f.trx) list = list.filter(r => r.transaction === f.trx);
    const chips = [{ v: 'open', l: 'المفتوحة' }, { v: '', l: 'الكل' }, ...D.REQUEST_STATUSES.map(s => ({ v: s.id, l: s.ar }))];
    main().innerHTML = `
      <div class="page-head">
        <div><h1>الطلبات والزبناء</h1><div class="sub">${list.length} طلب</div></div>
        <a class="btn primary" href="#/request/new">${ic('plus', 18)} طلب جديد</a>
      </div>
      <div class="toolbar" style="flex-direction:column;align-items:stretch">
        <div class="chips">${chips.map(c => `<span class="chip ${f.status === c.v ? 'on' : ''}" data-st="${c.v}">${esc(c.l)}</span>`).join('')}</div>
        <div class="chips">${[{ v: '', l: 'كل العمليات' }, ...D.TRANSACTIONS.map(t => ({ v: t.id, l: t.ar }))].map(c => `<span class="chip ${f.trx === c.v ? 'on' : ''}" data-trx="${c.v}">${esc(c.l)}</span>`).join('')}</div>
      </div>
      ${list.length ? `<div class="card" style="overflow:hidden">${list.map(reqCard).join('')}</div>` :
        `<div class="card empty"><div class="big">🧾</div><h3>لا توجد طلبات</h3><p>سجّل طلب زبون ليقترح عليك التطبيق العقارات المناسبة تلقائيا.</p>
        <a class="btn primary" href="#/request/new">${ic('plus', 18)} إضافة طلب</a></div>`}`;
    $$('[data-st]').forEach(el => el.onclick = () => { f.status = el.dataset.st; viewReqs(query); });
    $$('[data-trx]').forEach(el => el.onclick = () => { f.trx = el.dataset.trx; viewReqs(query); });
  }

  async function viewReqForm(id) {
    const existing = id ? S.reqs.find(r => r.id === id) : null;
    if (id && !existing) { main().innerHTML = notFound(); return; }
    const r = existing ? JSON.parse(JSON.stringify(existing)) : {
      id: uid(), transaction: 'sale', types: [], city: S.settings.officeCity || 'مكناس', districts: [], features: [],
      client: {}, status: 'new', priority: 'normal', followUp: '',
    };
    const isNew = !existing;
    const allFeatures = Array.from(new Set([...D.FEATURES.apartment, ...D.FEATURES.house, ...D.FEATURES.land, ...D.FEATURES.commercial, ...D.FEATURES.common]));

    main().innerHTML = `
      <div class="page-head">
        <div><h1>${isNew ? 'إضافة طلب زبون' : 'تعديل الطلب ' + esc(r.ref)}</h1><div class="sub">كلما كانت المعلومات أدق، كانت المطابقة أذكى</div></div>
        <a class="btn" href="${isNew ? '#/requests' : '#/request/' + r.id}">${ic('back', 18)} رجوع</a>
      </div>
      <form class="form" id="rform" autocomplete="off" novalidate>
        <div class="card card-pad">
          <h3 class="section-title"><span class="num">1</span> معلومات الزبون</h3>
          <div class="form-grid">
            ${fInput('client.name', 'الاسم الكامل', r.client.name, { req: true })}
            ${fInput('client.phone', 'الهاتف', r.client.phone, { type: 'tel', req: true })}
            ${fInput('client.phone2', 'هاتف آخر', r.client.phone2, { type: 'tel' })}
            ${fInput('client.whatsapp', 'واتساب (إن كان مختلفا)', r.client.whatsapp, { type: 'tel' })}
            ${fInput('client.email', 'البريد الإلكتروني', r.client.email, { type: 'email' })}
            ${fInput('client.cin', 'رقم البطاقة الوطنية', r.client.cin)}
            ${fInput('client.profession', 'المهنة', r.client.profession)}
            ${fSelect('client.nationality', 'الإقامة', D.NATIONALITIES, r.client.nationality)}
            ${fInput('client.residence', 'مدينة / بلد الإقامة', r.client.residence)}
            ${fSelect('client.source', 'كيف تعرّف على المكتب', D.CLIENT_SOURCES, r.client.source)}
            ${fInput('client.family', 'عدد أفراد الأسرة', r.client.family, { type: 'number' })}
            ${fInput('client.notes', 'ملاحظات عن الزبون', r.client.notes, { cls: 'full' })}
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">2</span> ماذا يبحث الزبون؟</h3>
          <div class="field full" style="margin-bottom:12px"><label>نوع العملية</label>${fSeg('transaction', D.TRANSACTIONS.map(t => ({ v: t.id, l: t.ar })), r.transaction)}</div>
          <div class="field full"><label>أنواع العقار المطلوبة <span class="muted">(اترك فارغا = أي نوع)</span></label>
            <div class="type-picker">${Object.entries(D.CATEGORIES).map(([k, c]) => {
              const ts = D.PROPERTY_TYPES.filter(t => t.cat === k);
              const anyOn = ts.some(t => (r.types || []).includes(t.id));
              return `<details ${anyOn || k === 'apartment' || k === 'house' ? 'open' : ''} class="type-cat"><summary style="cursor:pointer;font-weight:700;margin-bottom:6px">${esc(c.ar)}</summary>
                <div class="feat-grid">${ts.map(t => `<label><input type="checkbox" data-multi name="types" value="${t.id}" ${(r.types || []).includes(t.id) ? 'checked' : ''}>${esc(t.ar)}</label>`).join('')}</div></details>`;
            }).join('')}</div></div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">3</span> المكان المطلوب</h3>
          <div class="form-grid">
            ${fSelect('city', 'المدينة', [], r.city, { groups: cityGroups(), empty: 'أي مدينة' })}
            <div class="field full"><label>الأحياء المفضلة <span class="muted">(اترك فارغا = أي حي)</span></label>
              <div id="req-districts"></div>
              <div class="range" style="margin-top:8px"><input id="new-district" placeholder="حي غير موجود في القائمة؟ اكتبه هنا"><button type="button" class="btn sm" id="add-district">${ic('plus', 16)} إضافة</button></div>
            </div>
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">4</span> الميزانية والمواصفات</h3>
          <div class="form-grid">
            ${fRange('budgetMin', 'budgetMax', 'الميزانية (درهم)', r.budgetMin, r.budgetMax, { money: true, cls: 'full' })}
            ${fRange('areaMin', 'areaMax', 'المساحة (م²)', r.areaMin, r.areaMax, {})}
            ${fSelect('bedroomsMin', 'غرف النوم (على الأقل)', ['1', '2', '3', '4', '5', '6'], r.bedroomsMin, { empty: 'لا يهم' })}
            ${fSelect('floorPref', 'الطابق', D.FLOOR_PREFS, r.floorPref, { empty: 'لا يهم' })}
            ${fSelect('financing', 'طريقة الأداء', D.FINANCING, r.financing)}
            <label class="toggle-line"><input type="checkbox" name="bankApproved" ${r.bankApproved ? 'checked' : ''}> موافقة البنك جاهزة</label>
            <div class="field full"><label>مميزات ضرورية</label>${fChecks('features', allFeatures, r.features)}</div>
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">5</span> ملفات ومستندات الزبون</h3>
          <label class="dropzone" id="req-drop">${ic('upload', 28)}<b>تحميل ملفات</b><small>بطاقة التعريف، شهادة الأجرة، موافقة البنك، عقد، صور، PDF...</small>
            <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" multiple hidden></label>
          <div class="progress hidden" id="req-prog"><div style="width:0"></div></div>
          <div class="media-grid" id="req-files"></div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title"><span class="num">6</span> المتابعة</h3>
          <div class="form-grid">
            ${fSelect('status', 'حالة الطلب', D.REQUEST_STATUSES.map(s => ({ v: s.id, l: s.ar })), r.status, { noEmpty: true })}
            ${fSelect('priority', 'الأولوية', D.PRIORITIES.map(s => ({ v: s.id, l: s.ar })), r.priority, { noEmpty: true })}
            ${fInput('followUp', 'تاريخ المتابعة القادمة', r.followUp, { type: 'date' })}
            ${fInput('deadline', 'آخر أجل للزبون', r.deadline, { ph: 'مثال: قبل الصيف، خلال شهر...' })}
            ${fText('description', 'تفاصيل الطلب', r.description, { ph: 'كل ما قاله الزبون عن العقار الذي يبحث عنه...' })}
            ${fText('notes', 'ملاحظات داخلية', r.notes)}
          </div>
        </div>

        <div class="form-actions">
          <a class="btn" href="${isNew ? '#/requests' : '#/request/' + r.id}">إلغاء</a>
          <button class="btn primary" type="submit">${ic('check', 18)} حفظ الطلب</button>
        </div>
      </form>`;

    const form = $('#rform');
    bindMoney(form);

    // ملفات الزبون
    const rmedia = r.media || [];
    const rSession = [];
    let rRemoved = [];
    let rSaved = false;
    const renderRFiles = () => {
      const grid = $('#req-files');
      grid.innerHTML = rmedia.map(m => `
        <div class="media-item">
          ${m.isImage ? `<img class="hidden" data-thumb="${m.id}" alt="">` : `<div class="doc">${ic('file', 30)}<span>${esc(m.name)}</span></div>`}
          <button type="button" class="x" data-rm="${m.id}" title="حذف">${ic('trash', 15)}</button>
        </div>`).join('');
      hydrateThumbs(grid);
    };
    renderRFiles();
    $('#req-files').addEventListener('click', async e => {
      const rm = e.target.closest('[data-rm]');
      if (!rm || !(await confirmBox('حذف هذا الملف؟', 'حذف'))) return;
      const i = rmedia.findIndex(m => m.id === rm.dataset.rm);
      if (i >= 0) { rRemoved.push(rmedia[i].id); rmedia.splice(i, 1); }
      renderRFiles();
    });
    const addRFiles = async files => {
      const prog = $('#req-prog'); prog.classList.remove('hidden');
      let done = 0;
      for (const f of files) {
        const fid = uid();
        const isImage = f.type.startsWith('image/');
        const rec = { id: fid, owner: r.id, kind: 'doc', name: f.name, mime: f.type, size: f.size };
        if (isImage) {
          const big = await compressImage(f, 1920, 0.85), small = await compressImage(f, 480, 0.75);
          rec.blob = big.blob; rec.thumb = small.blob; rec.mime = big.blob.type || f.type; rec.size = big.blob.size;
        } else rec.blob = f;
        await DB.put('files', rec);
        rSession.push(fid);
        rmedia.push({ id: fid, kind: 'doc', name: f.name, mime: rec.mime, size: rec.size, isImage });
        done++; prog.firstElementChild.style.width = (done / files.length * 100) + '%';
      }
      setTimeout(() => prog.classList.add('hidden'), 500);
      renderRFiles();
    };
    const rdz = $('#req-drop'), rinp = $('input[type=file]', rdz);
    rinp.onchange = () => { if (rinp.files.length) addRFiles(Array.from(rinp.files)); rinp.value = ''; };
    rdz.addEventListener('dragover', e => { e.preventDefault(); rdz.classList.add('over'); });
    rdz.addEventListener('dragleave', () => rdz.classList.remove('over'));
    rdz.addEventListener('drop', e => { e.preventDefault(); rdz.classList.remove('over'); addRFiles(Array.from(e.dataTransfer.files)); });
    leaveGuard = async () => { if (rSaved) return; for (const fid of rSession) await DB.del('files', fid); };

    let selected = new Set(r.districts || []);
    const renderDs = () => {
      const city = $('[name=city]', form).value;
      $$('[name=districts]', form).forEach(el => { if (el.checked) selected.add(el.value); else selected.delete(el.value); });
      const list = city ? Array.from(new Set([...districtsOf(city), ...selected])) : [...selected];
      $('#req-districts').innerHTML = list.length ? fChecks('districts', list, [...selected]) : '<span class="muted">اختر مدينة لعرض أحيائها</span>';
    };
    renderDs();
    $('[name=city]', form).onchange = () => { selected = new Set(); $('#req-districts').innerHTML = ''; renderDs(); };
    $('#add-district').onclick = () => {
      const v = $('#new-district').value.trim();
      if (!v) return;
      selected.add(v);
      renderDs();
      $$('[name=districts]', form).forEach(el => { if (el.value === v) el.checked = true; });
      $('#new-district').value = '';
    };
    form.onsubmit = async e => {
      e.preventDefault();
      const v = collect(form);
      if (!v.client.name || !v.client.phone) { toast('المرجو إدخال اسم وهاتف الزبون'); $('[name="client.name"]', form).focus(); return; }
      if (v.budgetMin && v.budgetMax && v.budgetMin > v.budgetMax) { const t = v.budgetMin; v.budgetMin = v.budgetMax; v.budgetMax = t; }
      if (v.areaMin && v.areaMax && v.areaMin > v.areaMax) { const t = v.areaMin; v.areaMin = v.areaMax; v.areaMax = t; }
      v.districts = v.districts || [];
      v.types = v.types || [];
      v.features = v.features || [];
      const obj = Object.assign({}, existing || {}, v, { id: r.id, media: rmedia, updatedAt: new Date().toISOString() });
      if (isNew) { obj.createdAt = new Date().toISOString(); obj.ref = await DB.nextRef('DM', maxRef(S.reqs)); obj.proposals = {}; }
      await DB.saveRec('requests', obj);
      for (const fid of rRemoved) { await DB.del('files', fid); await DB.markDirty('file', fid); urlCache.delete(fid); urlCache.delete(fid + ':t'); }
      rSaved = true;
      await rememberDistricts(obj.city, obj.districts);
      await loadAll();
      const n = matchesForReq(obj).length;
      toast(isNew ? 'تم تسجيل الطلب ' + obj.ref + ' ✓' : 'تم حفظ التعديلات ✓');
      if (n) setTimeout(() => toast('🎯 وجدنا ' + n + ' عقار مطابق!', 3200), 900);
      location.hash = '#/request/' + obj.id;
    };
  }

  const PROP_STATES = { sent: { ar: 'أُرسل', c: 'blue' }, visit: { ar: 'زيارة', c: 'amber' }, liked: { ar: 'أعجبه', c: 'green' }, rejected: { ar: 'رفضه', c: 'red' } };
  async function markProposal(reqId, propId, state) {
    const r = S.reqs.find(x => x.id === reqId);
    if (!r) return;
    r.proposals = r.proposals || {};
    if (r.proposals[propId] && r.proposals[propId].s === state) delete r.proposals[propId];
    else r.proposals[propId] = { s: state, d: today() };
    if (state === 'visit' && r.status === 'new') r.status = 'visit';
    if (state === 'sent' && r.status === 'new') r.status = 'active';
    await DB.saveRec('requests', r);
  }

  function matchCard(p, m, r) {
    const cv = coverOf(p);
    const pr = (r.proposals || {})[p.id];
    return `<div class="card match-card">
      ${scoreRing(m.score)}
      <a class="match-thumb" href="#/property/${p.id}">${cv ? `<img class="hidden" data-thumb="${cv.id}" alt="">` : ic('home', 28)}</a>
      <div class="grow" style="min-width:0">
        <a href="#/property/${p.id}" style="text-decoration:none"><b>${esc(p.title || typeAr(p.type))}</b></a>
        <div class="muted" style="font-size:13px">${esc(p.ref)} · <b style="color:var(--gold-ink)">${esc(priceText(p))}</b> · ${esc(p.district || p.city || '')}</div>
        <div class="reasons">${m.reasons.map(x => `<span class="${x.s}">${x.s === 'ok' ? '✓' : x.s === 'no' ? '✗' : '~'} ${esc(x.t)}</span>`).join('')}</div>
        <div class="btn-row" style="margin-top:10px">
          ${r.client && r.client.phone ? `<a class="btn sm wa" target="_blank" rel="noopener" data-prop-state="sent" data-p="${p.id}" data-r="${r.id}" href="${esc(waShareUrl(p, r))}">${ic('wa', 15)} أرسل للزبون</a>` : ''}
          ${Object.entries(PROP_STATES).filter(([k]) => k !== 'sent').map(([k, v]) => `<button class="btn sm" data-prop-state="${k}" data-p="${p.id}" data-r="${r.id}">${esc(v.ar)}</button>`).join('')}
          ${pr ? `<span class="badge ${PROP_STATES[pr.s].c}">${esc(PROP_STATES[pr.s].ar)} · ${esc(pr.d)}</span>` : ''}
        </div>
      </div></div>`;
  }
  function bindProposalButtons(root, rerender) {
    $$('[data-prop-state]', root).forEach(el => el.addEventListener('click', async () => {
      await markProposal(el.dataset.r, el.dataset.p, el.dataset.propState);
      if (el.tagName === 'A') setTimeout(rerender, 400); else rerender();
    }));
  }

  async function viewReq(id) {
    const r = S.reqs.find(x => x.id === id);
    if (!r) { main().innerHTML = notFound(); return; }
    const st = RSTATUS[r.status] || RSTATUS.new;
    const c = r.client || {};
    const matches = matchesForReq(r);
    main().innerHTML = `
      <div class="page-head">
        <a class="btn" href="#/requests">${ic('back', 18)} الطلبات</a>
        <div class="btn-row"><a class="btn primary" href="#/request/${r.id}/edit">${ic('edit', 18)} تعديل</a></div>
      </div>
      <div class="detail-grid">
        <div style="display:flex;flex-direction:column;gap:16px;order:2">
          <div class="page-head" style="margin:0"><h2 style="margin:0;font-size:19px">${ic('target', 20)} العقارات المطابقة (${matches.length})</h2>
            <span class="muted" style="font-size:13px">مرتبة حسب نسبة التطابق</span></div>
          ${matches.length ? `<div class="match-list">${matches.map(x => matchCard(x.p, x.m, r)).join('')}</div>` :
            `<div class="card empty"><div class="big">🔍</div><h3>لا يوجد عقار مطابق حاليا</h3><p>سيظهر هنا كل عقار جديد يطابق هذا الطلب تلقائيا.</p></div>`}
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card card-pad">
            <div class="contact-card"><div class="avatar">${esc((c.name || '؟').trim()[0])}</div>
              <div class="grow"><b style="font-size:17px">${esc(c.name)} ${r.priority === 'high' ? '🔥' : ''}</b>
              <div class="muted" style="font-size:13px">${esc(r.ref)}${c.profession ? ' · ' + esc(c.profession) : ''}${c.nationality ? ' · ' + esc(c.nationality) : ''}</div></div></div>
            <div class="btn-row" style="margin-top:12px">
              ${c.phone ? `<a class="btn sm" href="${telLink(c.phone)}">${ic('phone', 16)} ${esc(c.phone)}</a>` : ''}
              ${c.phone2 ? `<a class="btn sm" href="${telLink(c.phone2)}">${ic('phone', 16)} ${esc(c.phone2)}</a>` : ''}
              ${c.whatsapp || c.phone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(c.whatsapp || c.phone)}">${ic('wa', 16)} واتساب</a>` : ''}
            </div>
            <div class="muted" style="font-size:13px;margin-top:10px">${[c.email && '✉️ ' + c.email, c.cin && '🪪 ' + c.cin, c.residence && '🏠 ' + c.residence, c.source && '📣 ' + c.source, c.family && '👨‍👩‍👧 ' + c.family + ' أفراد', c.notes && '📝 ' + c.notes].filter(Boolean).map(esc).join('<br>')}</div>
          </div>
          <div class="card card-pad">
            <div class="btn-row" style="margin-bottom:12px"><span class="badge ${st.color}">${esc(st.ar)}</span><span class="badge blue">${esc(trxAr(r.transaction))}</span>
              ${r.followUp ? `<span class="badge ${r.followUp <= today() ? 'amber' : ''}">${ic('calendar', 12)} متابعة ${esc(r.followUp)}</span>` : ''}</div>
            <div class="kv">
              <div><small>النوع</small><b>${esc((r.types || []).map(typeAr).join('، ') || 'أي نوع')}</b></div>
              <div><small>المدينة</small><b>${esc(r.city || 'أي مدينة')}</b></div>
              <div><small>الأحياء</small><b>${esc((r.districts || []).join('، ') || 'أي حي')}</b></div>
              <div><small>الميزانية</small><b>${r.budgetMin || r.budgetMax ? esc([r.budgetMin && fmt(r.budgetMin), r.budgetMax && fmt(r.budgetMax)].filter(Boolean).join(' — ')) + ' د' : '—'}</b>
                ${r.budgetMax ? `<small>${esc(millions(r.budgetMax))}</small>` : ''}</div>
              ${r.areaMin || r.areaMax ? `<div><small>المساحة</small><b>${esc([r.areaMin, r.areaMax].filter(Boolean).join(' — '))} م²</b></div>` : ''}
              ${r.bedroomsMin ? `<div><small>غرف النوم</small><b>${esc(r.bedroomsMin)}+</b></div>` : ''}
              ${r.floorPref ? `<div><small>الطابق</small><b>${esc(r.floorPref)}</b></div>` : ''}
              ${r.financing ? `<div><small>الأداء</small><b>${esc(r.financing)}${r.bankApproved ? ' ✓' : ''}</b></div>` : ''}
              ${r.deadline ? `<div><small>الأجل</small><b>${esc(r.deadline)}</b></div>` : ''}
            </div>
            ${(r.features || []).length ? `<div class="reasons" style="margin-top:12px">${r.features.map(f => `<span class="mid">${esc(f)}</span>`).join('')}</div>` : ''}
            ${r.description ? `<p class="desc" style="margin-bottom:0">${esc(r.description)}</p>` : ''}
            ${r.notes ? `<p class="desc muted" style="margin-bottom:0">📝 ${esc(r.notes)}</p>` : ''}
            ${(r.media || []).length ? `<b style="display:block;margin:14px 0 8px">الملفات (${r.media.length})</b><div class="doc-list">${r.media.map(d => `<a href="#" data-rdoc="${d.id}">${ic(d.isImage ? 'image' : 'file')} <span class="grow">${esc(d.name)}</span><small class="muted">${Math.max(1, Math.round((d.size || 0) / 1024))} KB</small></a>`).join('')}</div>` : ''}
          </div>
          <div class="card card-pad">
            <b style="display:block;margin-bottom:8px">تغيير الحالة بسرعة</b>
            <div class="chips" style="flex-wrap:wrap">${D.REQUEST_STATUSES.map(s => `<span class="chip ${r.status === s.id ? 'on' : ''}" data-rs="${s.id}">${esc(s.ar)}</span>`).join('')}</div>
            <div class="btn-row" style="margin-top:14px">
              <button class="btn sm danger" id="r-del">${ic('trash', 15)} حذف الطلب</button>
            </div>
          </div>
        </div>
      </div>`;
    hydrateThumbs(main());
    bindProposalButtons(main(), () => viewReq(id));
    $$('[data-rdoc]').forEach(el => el.onclick = async e => {
      e.preventDefault();
      const d = (r.media || []).find(x => x.id === el.dataset.rdoc);
      const url = await fileUrl(d.id);
      if (!url) return toast('الملف غير متوفر على هذا الجهاز');
      if (d.mime && (d.mime.startsWith('image/') || d.mime === 'application/pdf')) window.open(url, '_blank');
      else { const a2 = document.createElement('a'); a2.href = url; a2.download = d.name; a2.click(); }
    });
    $$('[data-rs]').forEach(el => el.onclick = async () => { r.status = el.dataset.rs; await DB.saveRec('requests', r); toast('تم تحديث الحالة'); viewReq(id); });
    $('#r-del').onclick = async () => {
      if (!(await confirmBox('حذف طلب ' + (c.name || '') + ' نهائيا؟', 'حذف'))) return;
      await DB.delRec('requests', r.id);
      await DB.delFilesOf(r.id);
      for (const m of (r.media || [])) await DB.markDirty('file', m.id);
      await loadAll();
      toast('تم حذف الطلب');
      location.hash = '#/requests';
    };
  }

  /* ============================================================
     صفحة المطابقة الشاملة
     ============================================================ */
  function viewMatching(query) {
    const min = Number(query.min || 60);
    const open = S.reqs.filter(openReq);
    const rows = open.map(r => ({ r, ms: matchesForReq(r).filter(x => x.m.score >= min) })).sort((a, b) => ((b.ms[0] && b.ms[0].m.score) || 0) - ((a.ms[0] && a.ms[0].m.score) || 0));
    const total = rows.reduce((s, x) => s + x.ms.length, 0);
    main().innerHTML = `
      <div class="page-head">
        <div><h1>المطابقة الذكية</h1><div class="sub">${open.length} طلب مفتوح · ${total} اقتراح بنسبة ${min}% فما فوق</div></div>
      </div>
      <div class="card card-pad" style="margin-bottom:16px">
        <div class="muted" style="font-size:13.5px;margin-bottom:8px">كيف تُحسب النسبة؟ نوع العملية والمدينة شرطان أساسيان، ثم: نوع العقار 25٪ · المدينة 20٪ · الميزانية 20٪ · الحي 15٪ · المساحة 10٪ · غرف النوم 5٪ · المميزات 5٪</div>
        <div class="chips">${[50, 60, 70, 80, 90].map(v => `<a class="chip ${v === min ? 'on' : ''}" href="#/matching?min=${v}" style="text-decoration:none">+${v}%</a>`).join('')}</div>
      </div>
      ${rows.length ? rows.map(({ r, ms }) => `
        <div class="card" style="margin-bottom:16px;overflow:hidden">
          <div class="pair-head">
            <a href="#/request/${r.id}" style="text-decoration:none;display:flex;gap:10px;align-items:center">
              <div class="avatar" style="width:40px;height:40px;font-size:15px">${esc(((r.client && r.client.name) || '؟').trim()[0])}</div>
              <div><b>${esc(r.client && r.client.name)} ${r.priority === 'high' ? '🔥' : ''}</b><div class="muted" style="font-size:12.5px">${esc(r.ref)} · ${esc(trxAr(r.transaction))} · ${esc((r.types || []).map(typeAr).slice(0, 3).join('، ') || 'أي نوع')} · ${esc(r.city || '')} · ${r.budgetMax ? esc(fmt(r.budgetMax)) + ' د' : ''}</div></div>
            </a>
            <span class="badge ${ms.length ? 'green' : ''}">${ms.length} عقار</span>
          </div>
          <div style="padding:12px" class="match-list">${ms.length ? ms.slice(0, 4).map(x => matchCard(x.p, x.m, r)).join('') + (ms.length > 4 ? `<a class="btn block" href="#/request/${r.id}">عرض الكل (${ms.length})</a>` : '') : '<div class="muted" style="padding:6px">لا يوجد عقار بهذه النسبة</div>'}</div>
        </div>`).join('') : `<div class="card empty"><div class="big">🎯</div><h3>لا توجد طلبات مفتوحة</h3><p>أضف طلبات الزبناء ليقترح عليك التطبيق العقارات المناسبة.</p><a class="btn primary" href="#/request/new">${ic('plus', 18)} إضافة طلب</a></div>`}`;
    hydrateThumbs(main());
    bindProposalButtons(main(), () => viewMatching(query));
  }

  /* ============================================================
     الإعدادات، النسخ الاحتياطي، القفل
     ============================================================ */
  async function viewSettings() {
    const est = await DB.estimate();
    const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
    const theme = localStorage.getItem('w777_theme') || 'auto';
    const hasPin = !!localStorage.getItem('w777_pin');
    const lastBackup = await DB.getMeta('lastBackup', null);
    const customCount = Object.values(S.custom).reduce((s, a) => s + a.length, 0);
    const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    main().innerHTML = `
      <div class="page-head"><h1>الإعدادات</h1></div>
      <div class="form">
        <div class="card card-pad">
          <h3 class="section-title">${ic('building')} معلومات المكتب</h3>
          <form id="sform" class="form-grid">
            ${fInput('officeName', 'اسم المكتب', S.settings.officeName)}
            ${fInput('officePhone', 'هاتف المكتب (يظهر في الإعلانات)', S.settings.officePhone, { type: 'tel' })}
            ${fSelect('officeCity', 'المدينة الافتراضية', [], S.settings.officeCity, { groups: cityGroups() })}
            <div class="field" style="justify-content:flex-end"><button class="btn primary" type="submit">${ic('check', 18)} حفظ</button></div>
          </form>
        </div>

        ${EMBED ? `<div class="card card-pad" style="border-color:var(--amber)">
          <h3 class="section-title">${ic('lock')} نسخة التجربة</h3>
          <p class="muted" style="margin:0">هذه النسخة تعمل داخل claude.ai: البيانات محفوظة في هذا المتصفح فقط، بدون مزامنة سحابية. احفظ نسخة احتياطية بانتظام (الزر أسفله) واستوردها في جهازك الآخر. للمزامنة التلقائية والتثبيت على الهاتف استعمل الرابط الدائم على GitHub Pages.</p>
        </div>` : await cloudCard()}

        <div class="card card-pad">
          <h3 class="section-title">${ic('database')} النسخ الاحتياطي ونقل البيانات بين الأجهزة</h3>
          <p class="muted" style="margin-top:0">البيانات محفوظة داخل هذا الجهاز فقط. لنقلها من الهاتف إلى الماك بوك (أو العكس): صدّر نسخة احتياطية هنا، ثم استوردها في الجهاز الآخر. ${lastBackup ? `<br>آخر نسخة: <b>${esc(lastBackup.slice(0, 16).replace('T', ' '))}</b>` : '<br><b style="color:var(--amber)">⚠️ لم تقم بأي نسخة احتياطية بعد.</b>'}</p>
          <div class="btn-row">
            <button class="btn gold" id="bk-full">${ic('download', 18)} نسخة كاملة (مع الصور والفيديو)</button>
            <button class="btn" id="bk-light">${ic('download', 18)} نسخة خفيفة (بدون فيديو)</button>
            <label class="btn">${ic('upload', 18)} استيراد نسخة<input type="file" id="bk-import" accept=".json,application/json" hidden></label>
          </div>
          <div class="btn-row" style="margin-top:10px">
            <button class="btn sm" id="csv-props">${ic('file', 16)} تصدير العقارات Excel (CSV)</button>
            <button class="btn sm" id="csv-reqs">${ic('file', 16)} تصدير الطلبات Excel (CSV)</button>
          </div>
          <div class="progress hidden" id="bk-prog"><div style="width:0"></div></div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title">${ic('upload')} استيراد العقارات من دوسي الصور</h3>
          <p class="muted" style="margin-top:0"><b>من الماك / الكمبيوتر:</b> اختر الدوسي الكبير (مثلا «777»): كل دوسي داخله = نوع عقار، وكل دوسي فرعي أو صورة = عقار بصوره.<br>
          <b>من الآيفون / الهاتف:</b> الهاتف لا يسمح باختيار دوسي كامل، لذلك اختر الصور (من المعرض أو «الملفات») ثم حدد نوع العقار.</p>
          <div class="btn-row">
            <label class="btn gold">${ic('upload', 18)} اختيار دوسي (ماك)<input type="file" id="imp-folder" webkitdirectory directory multiple hidden></label>
            <label class="btn">${ic('camera', 18)} اختيار صور (هاتف)<input type="file" id="imp-photos" accept="image/*,video/*" multiple hidden></label>
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title">${ic('lock')} الأمان والمظهر</h3>
          <div class="form-grid">
            <div class="field"><label>المظهر</label>${fSeg('theme', [{ v: 'auto', l: 'تلقائي' }, { v: 'light', l: 'فاتح' }, { v: 'dark', l: 'داكن' }], theme)}</div>
            <div class="field"><label>قفل التطبيق برمز سري</label>
              <div class="btn-row">${hasPin ? `<button class="btn" id="pin-change">${ic('lock', 16)} تغيير الرمز</button><button class="btn danger" id="pin-off">إلغاء القفل</button>` : `<button class="btn" id="pin-on">${ic('lock', 16)} تفعيل القفل</button>`}</div></div>
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="section-title">${ic('image')} التخزين</h3>
          <div class="kv">
            <div><small>العقارات</small><b>${S.props.length}</b></div>
            <div><small>الطلبات</small><b>${S.reqs.length}</b></div>
            <div><small>الأحياء المضافة يدويا</small><b>${customCount}</b></div>
            ${est ? `<div><small>المساحة المستعملة</small><b>${(est.usage / 1048576).toFixed(1)} MB</b></div><div><small>المساحة المتاحة</small><b>${(est.quota / 1073741824).toFixed(1)} GB</b></div>` : ''}
            <div><small>حماية البيانات من الحذف التلقائي</small><b>${persisted ? '✓ مفعلة' : '✗ غير مفعلة'}</b></div>
          </div>
          <div class="btn-row" style="margin-top:12px">
            ${persisted ? '' : `<button class="btn sm" id="persist">${ic('lock', 15)} تفعيل حماية البيانات</button>`}
            ${customCount ? `<button class="btn sm" id="custom-ds">${ic('pin', 15)} إدارة الأحياء المضافة</button>` : ''}
            <button class="btn sm danger" id="wipe">${ic('trash', 15)} مسح كل البيانات</button>
          </div>
        </div>

        <div class="card card-pad ${EMBED ? 'hidden' : ''}">
          <h3 class="section-title">${ic('download')} تثبيت التطبيق ${isStandalone ? '<span class="badge green">✓ مثبت</span>' : ''}</h3>
          <div class="kv">
            <div><small>آيفون / آيباد (Safari)</small><b>زر المشاركة ⬆️ ← «إضافة إلى الشاشة الرئيسية»</b></div>
            <div><small>أندرويد (Chrome)</small><b>القائمة ⋮ ← «تثبيت التطبيق»</b></div>
            <div><small>ماك بوك (Safari)</small><b>ملف (File) ← «إضافة إلى Dock»</b></div>
            <div><small>ماك / ويندوز (Chrome أو Edge)</small><b>أيقونة التثبيت ⊕ في شريط العنوان</b></div>
          </div>
          ${deferredInstall ? `<button class="btn gold" id="install" style="margin-top:12px">${ic('download', 18)} تثبيت الآن</button>` : ''}
        </div>
        <p class="muted" style="text-align:center;font-size:12.5px">مكتب الوسيط 777 — الإصدار 1.0 · يعمل بدون إنترنت</p>
      </div>`;

    if (!EMBED) bindCloudCard();
    $('#sform').onsubmit = async e => {
      e.preventDefault();
      Object.assign(S.settings, collect(e.target), { updatedAt: new Date().toISOString() });
      await DB.setMeta('settings', S.settings);
      await DB.markDirty('meta', 'settings');
      toast('تم الحفظ ✓');
    };
    $$('[name=theme]').forEach(el => el.onchange = () => { localStorage.setItem('w777_theme', el.value); applyTheme(); });
    $('#imp-folder').onchange = e => { if (e.target.files.length) importFolder(e.target.files); e.target.value = ''; };
    $('#imp-photos').onchange = e => { if (e.target.files.length) importFolder(e.target.files, true); e.target.value = ''; };
    if (!EMBED) $('#bk-full').onclick = () => exportBackup(true);
    $('#bk-light').onclick = () => exportBackup(false);
    $('#bk-import').onchange = e => { if (e.target.files[0]) importBackup(e.target.files[0]); };
    $('#csv-props').onclick = exportPropsCsv;
    $('#csv-reqs').onclick = exportReqsCsv;
    const po = $('#pin-on'); if (po) po.onclick = () => setupPin();
    const pc = $('#pin-change'); if (pc) pc.onclick = () => setupPin();
    const pf = $('#pin-off'); if (pf) pf.onclick = async () => { if (await confirmBox('إلغاء القفل بالرمز السري؟', 'إلغاء القفل')) { localStorage.removeItem('w777_pin'); toast('تم إلغاء القفل'); viewSettings(); } };
    const ps = $('#persist'); if (ps) ps.onclick = async () => { const ok = await DB.persist(); toast(ok ? 'تم تفعيل الحماية ✓' : 'المتصفح رفض الطلب — ثبّت التطبيق على الشاشة الرئيسية ثم أعد المحاولة'); viewSettings(); };
    const ins = $('#install'); if (ins) ins.onclick = async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; viewSettings(); };
    const cds = $('#custom-ds'); if (cds) cds.onclick = manageCustomDistricts;
    $('#wipe').onclick = async () => {
      if (!(await confirmBox(window.W777_SYNC && W777_SYNC.isOn() ? 'مسح البيانات من هذا الجهاز فقط؟ (ستبقى في السحابة وتعود عند المزامنة)' : 'مسح كل العقارات والطلبات والصور من هذا الجهاز؟ لا يمكن التراجع!', 'نعم، امسح كل شيء'))) return;
      if (!(await confirmBox('تأكيد أخير: هل قمت بنسخة احتياطية؟', 'امسح الآن'))) return;
      await Promise.all(['properties', 'requests', 'files', 'meta'].map(s => DB.clear(s)));
      urlCache.clear();
      await loadAll();
      toast('تم مسح البيانات');
      location.hash = '#/';
    };
  }

  /* ---------- بطاقة المزامنة السحابية ---------- */
  const SYNC_LABEL = { off: 'غير مفعلة', idle: 'متصل', syncing: 'جاري المزامنة…', ok: 'متزامن ✓', warn: 'متزامن مع تنبيه', error: 'خطأ', offline: 'بدون إنترنت' };
  const SYNC_COLOR = { off: 'gray', idle: 'blue', syncing: 'blue', ok: 'green', warn: 'amber', error: 'red', offline: 'amber' };
  async function cloudCard() {
    const Sy = window.W777_SYNC;
    if (Sy.isOn()) {
      const acc = Sy.account();
      const st = Sy.status();
      const last = await Sy.lastSync();
      const pending = await Sy.pending();
      return `<div class="card card-pad" id="cloud-card">
        <h3 class="section-title">${ic('share')} المزامنة السحابية (الهاتف ↔ الماك) <span class="badge ${SYNC_COLOR[st.state]}">${esc(SYNC_LABEL[st.state])}</span></h3>
        <div class="kv">
          <div><small>الحساب</small><b>${esc(acc.email)}</b></div>
          <div><small>آخر مزامنة</small><b>${last ? esc(last.slice(0, 16).replace('T', ' ')) : '—'}</b></div>
          <div><small>تغييرات في الانتظار</small><b>${pending}</b></div>
        </div>
        ${st.msg ? `<p class="muted" style="margin-bottom:0">${esc(st.msg)}</p>` : ''}
        <div class="btn-row" style="margin-top:12px">
          <button class="btn gold" id="cl-sync">${ic('share', 18)} مزامنة الآن</button>
          <button class="btn danger" id="cl-out">تسجيل الخروج</button>
        </div>
        <p class="muted" style="font-size:12.5px;margin-bottom:0">سجّل الدخول بنفس الحساب على كل أجهزتك (الهاتف، الماك، هاتف الموظف…) لتظهر نفس البيانات في كل مكان. الصور تُنزّل عند فتحها.</p>
      </div>`;
    }
    const d = Sy.defaults();
    return `<div class="card card-pad" id="cloud-card">
      <h3 class="section-title">${ic('share')} المزامنة السحابية (الهاتف ↔ الماك) <span class="badge gray">غير مفعلة</span></h3>
      <p class="muted" style="margin-top:0">اربط التطبيق بحساب Supabase (مجاني) لتظهر نفس العقارات والطلبات والصور على كل أجهزتك تلقائيا. التطبيق يبقى يعمل بدون إنترنت.</p>
      <form id="cl-form" class="form-grid">
        ${fInput('url', 'Supabase Project URL', d.url, { ph: 'https://xxxx.supabase.co', attrs: 'dir="ltr" autocapitalize="off"' })}
        ${fInput('key', 'anon public key', d.key, { ph: 'eyJhbGciOi…', attrs: 'dir="ltr" autocapitalize="off"' })}
        ${fInput('email', 'البريد الإلكتروني للمكتب', '', { type: 'email', attrs: 'dir="ltr" autocapitalize="off"' })}
        ${fInput('password', 'كلمة السر', '', { type: 'password', attrs: 'dir="ltr"' })}
      </form>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn gold" id="cl-in">${ic('lock', 18)} دخول</button>
        <button class="btn" id="cl-up">إنشاء حساب جديد</button>
      </div>
      <p class="muted" style="font-size:12.5px;margin-bottom:0">أول مرة فقط: أنشئ مشروعا على supabase.com ثم نفّذ ملف <b dir="ltr">supabase.sql</b> في SQL Editor (مرفق مع التطبيق).</p>
    </div>`;
  }
  function bindCloudCard() {
    const Sy = window.W777_SYNC;
    const b = id => $('#' + id);
    if (b('cl-sync')) b('cl-sync').onclick = async () => { await Sy.syncNow(); viewSettings(); };
    if (b('cl-out')) b('cl-out').onclick = async () => {
      if (!(await confirmBox('تسجيل الخروج من المزامنة؟ البيانات تبقى على هذا الجهاز.', 'خروج', false))) return;
      Sy.signOut(); viewSettings();
    };
    const go = async up => {
      const v = collect($('#cl-form'));
      if (!v.url || !v.key || !v.email || !v.password) return toast('املأ كل الخانات');
      if (v.password.length < 6) return toast('كلمة السر: 6 أحرف على الأقل');
      try {
        toast(up ? 'جاري إنشاء الحساب…' : 'جاري الدخول…');
        if (up) {
          const r = await Sy.signUp(v.url, v.key, v.email, v.password);
          if (!r.confirmed) { toast('تم إنشاء الحساب ✓ افتح بريدك وأكّد الحساب ثم اضغط «دخول»', 5000); return; }
        } else await Sy.signIn(v.url, v.key, v.email, v.password);
        toast('تم الربط ✓ جاري المزامنة…');
        viewSettings();
      } catch (e) {
        const m = String(e.message || e);
        toast(/Invalid login/i.test(m) ? 'البريد أو كلمة السر غير صحيحة' : /not confirmed/i.test(m) ? 'أكّد حسابك من البريد الإلكتروني أولا' : 'خطأ: ' + m, 5000);
      }
    };
    if (b('cl-in')) b('cl-in').onclick = () => go(false);
    if (b('cl-up')) b('cl-up').onclick = () => go(true);
  }
  function setupSyncUi() {
    const Sy = window.W777_SYNC;
    const btn = $('#btn-sync');
    const paint = st => {
      btn.classList.toggle('hidden', !Sy.isOn());
      btn.dataset.state = st.state;
      btn.title = SYNC_LABEL[st.state] + (st.msg ? ' — ' + st.msg : '');
    };
    Sy.onStatus(st => {
      paint(st);
      if (st.state === 'error') toast('المزامنة: ' + st.msg, 4000);
      if (location.hash.startsWith('#/settings') && st.state !== 'syncing' && !$('#cl-form')) {
        cloudCard().then(html => { const c = $('#cloud-card'); if (c) { c.outerHTML = html; bindCloudCard(); } });
      }
    });
    Sy.onChange(async () => {
      await loadAll();
      const h = location.hash;
      if (!/\/(new|edit)/.test(h) && !h.startsWith('#/settings')) route();
    });
    btn.onclick = () => { Sy.syncNow(); toast('جاري المزامنة…'); };
    paint(Sy.status());
  }

  /* ---------- استيراد العقارات من دوسي الصور ----------
     كل دوسي فيه صور = عقار. النوع والمدينة والعملية تُستنتج من أسماء الدوسيات الأعلى
     (مثال: 777/MEKNES/APPARTEMENTS/شقة مرجان/صور) */
  const TYPE_RULES = [
    [/دوبلكس|duplex/, 'duplex'], [/استوديو|studio/, 'studio'], [/شقه|شقق|appart/, 'apartment'],
    [/فيلا|فيلات|villa/, 'villa'], [/رياض|riad|riyad/, 'riad'], [/بقعه|بقع|\blots?\b/, 'plot_house'],
    [/ضيعه|فلاحي|ferme|agricol/, 'farm'], [/ارض|اراضي|terrain|terrin/, 'land_urban'],
    [/فندق|hotel/, 'hotel'], [/auberge|hoberge|ضيافه|maison d.?hote/, 'maison_hote'],
    [/مدرسه|مدارس|ecole|school|creche/, 'school'], [/مقهي|cafe/, 'cafe'], [/مطعم|restaurant|snack/, 'restaurant'],
    [/حمام|spa|salon|hammam/, 'hammam'], [/salle de sport|sport|gym/, 'shop'],
    [/محل|محلات|حانوت|magasin|local|commerce|ساروت/, 'shop'], [/مكتب|مكاتب|bureau|office/, 'office'],
    [/عماره|عمارات|immeuble/, 'building'], [/مستودع|مخزن|depot|entrepot|hangar/, 'warehouse'],
    [/غرفه|chambre/, 'room'], [/دار|ديور|منزل|منازل|maison|house/, 'house'],
  ];
  const plain = s => norm(s).replace(/[^a-zء-ي0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  function guessType(name) {
    const n = plain(name);
    if (!n) return 'other';
    const exact = D.PROPERTY_TYPES.find(t => plain(t.ar) === n || plain(t.fr) === n);
    if (exact) return exact.id;
    if (/terrin|terrain|ارض/.test(n) && /agricol|فلاحي/.test(n)) return 'land_agri';
    const r = TYPE_RULES.find(([re]) => re.test(n));
    return r ? r[1] : 'other';
  }
  function guessTrx(name) {
    const n = plain(name);
    if (/رهن|rahn/.test(n)) return 'rahn';
    if (/ساروت|pas de porte/.test(n)) return 'pas_de_porte';
    if (/كراء|location|louer|a louer/.test(n)) return 'rent';
    return '';
  }
  // أسماء المدن كما يكتبها الناس (فرنسية بأخطاء شائعة) → الاسم في القائمة
  const CITY_ALIASES = { madiaq: 'المضيق', mdiq: 'المضيق', 'cabo negro': 'المضيق', berkene: 'بركان', berkane: 'بركان', mohamadia: 'المحمدية', mohammedia: 'المحمدية', tetouane: 'تطوان', tetouan: 'تطوان', hossima: 'الحسيمة', hoceima: 'الحسيمة', 'al hoceima': 'الحسيمة', fes: 'فاس', fez: 'فاس', sale: 'سلا', laayoune: 'العيون', agourai: 'أكوراي', 'oued laou': 'واد لاو', meknes: 'مكناس', tanger: 'طنجة', tangier: 'طنجة', casablanca: 'الدار البيضاء', casa: 'الدار البيضاء', marrakech: 'مراكش', errachidia: 'الرشيدية', 'sidi bennour': 'سيدي بنور' };
  const CITY_INDEX = (() => {
    const m = new Map();
    Object.values(CITY).forEach(c => { m.set(plain(c.n), c.n); m.set(plain(c.f), c.n); });
    Object.entries(CITY_ALIASES).forEach(([k, v]) => m.set(plain(k), v));
    return m;
  })();
  const guessCity = name => CITY_INDEX.get(plain(name)) || '';
  // اسم دوسي «عام» (APPARTEMENTS، TERRINS AGRICOLE، SALON & SPA...) وليس اسم عقار معين
  const CAT_STOP = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'et', 'a', 'salle', 'autre', 'autres', 'divers', 'للبيع', 'للكراء', 'vente', 'location']);
  const isCategoryName = name => {
    const words = plain(name).split(' ').filter(Boolean);
    return words.length > 0 && words.every(w => CAT_STOP.has(w) || guessType(w) !== 'other' || guessTrx(w));
  };
  const isMediaFile = f => !f.name.startsWith('.') && (/^(image|video)\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif|gif|mp4|mov|m4v)$/i.test(f.name));
  const isVideoFile = f => f.type.startsWith('video/') || /\.(mp4|mov|m4v)$/i.test(f.name);

  function importFolder(fileList, picked) {
    const all = Array.from(fileList).filter(isMediaFile);
    const files = all.filter(f => f.size > 0);
    if (all.length > files.length) toast(`تنبيه: ${all.length - files.length} ملف فارغ تم تجاهله`, 3500);
    if (!files.length) return toast('ما لقيت حتى صورة فهاد الدوسي', 3500);
    const root = picked ? 'صور-' + Date.now() : ((files[0].webkitRelativePath || '').split('/')[0] || 'دوسي');

    // 1) كل دوسي فيه ملفات مباشرة = عقار
    const leaves = new Map();
    files.forEach(f => {
      const dirs = picked || !f.webkitRelativePath ? [root, 'الصور المختارة'] : f.webkitRelativePath.split('/').slice(0, -1);
      const key = dirs.join('/');
      if (!leaves.has(key)) leaves.set(key, { dirs, files: [] });
      leaves.get(key).files.push(f);
    });
    // 2) استنتاج النوع / المدينة / العملية من الدوسيات الأعلى
    const props = Array.from(leaves.values()).map(l => {
      const anc = l.dirs.slice(1); // بدون الدوسي الرئيسي
      let typeFrom = '', type = 'other', city = '', trx = '';
      for (let i = anc.length - 1; i >= 0; i--) {
        if (type === 'other') { const t = guessType(anc[i]); if (t !== 'other') { type = t; typeFrom = anc[i]; } }
        if (!city) city = guessCity(anc[i]);
        if (!trx) trx = guessTrx(anc[i]);
      }
      const leaf = anc[anc.length - 1] || root;
      // الصور موضوعة مباشرة في دوسي نوع أو مدينة (وليس في دوسي خاص بعقار)
      const ancestorHasType = anc.slice(0, -1).some(a => guessType(a) !== 'other');
      const leafIsCategory = !anc.length || !!guessCity(leaf) || (isCategoryName(leaf) && !ancestorHasType);
      return { key: l.dirs.join('/'), label: leaf, typeFrom: typeFrom || '—', type, city, trx: trx || 'sale', files: l.files, leafIsCategory };
    });
    // 3) ملخص حسب «دوسي النوع» (يمكن تصحيح النوع لكل مجموعة)
    const known = new Set(S.props.map(p => p.importKey).filter(Boolean));
    const cats = new Map();
    props.forEach(p => {
      if (!cats.has(p.typeFrom)) cats.set(p.typeFrom, { name: p.typeFrom, type: p.type, n: 0, photos: 0, videos: 0, loose: 0 });
      const c = cats.get(p.typeFrom);
      c.n++; p.files.forEach(f => (isVideoFile(f) ? c.videos++ : c.photos++));
      if (p.leafIsCategory) c.loose++;
    });
    const list = Array.from(cats.values()).sort((a, b) => b.n - a.n);
    const nVideos = files.filter(isVideoFile).length;
    const hasLoose = props.some(p => p.leafIsCategory && p.files.length > 1);
    const cityCount = new Set(props.map(p => p.city).filter(Boolean)).size;
    modal(`<h3>${ic('upload')} ${picked ? 'استيراد الصور المختارة' : 'استيراد «' + esc(root) + '»'}</h3>
      <p class="muted" style="margin-top:0">${props.length} عقار · ${files.length - nVideos} صورة · ${nVideos} فيديو${cityCount ? ' · ' + cityCount + ' مدينة' : ''}. تأكد من النوع:</p>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:45vh;overflow:auto">${list.map((c, i) => `
        <div class="card" style="padding:8px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:140px"><b>📁 ${esc(c.name)}</b><div class="muted" style="font-size:12px">${c.n} عقار · ${c.photos} صورة${c.videos ? ' · ' + c.videos + ' فيديو' : ''}</div></div>
          <div style="flex:1;min-width:160px">${fSelect('t' + i, 'النوع', [], c.type, { groups: typeGroups(), noEmpty: true })}</div>
        </div>`).join('')}</div>
      ${picked ? fInput('pname', 'اسم العقار (اختياري)', '', { ph: 'مثال: شقة مرجان 2' }) : ''}
      ${hasLoose ? `<div class="field" style="margin-top:12px"><label>صور موضوعة مباشرة داخل دوسي نوع أو مدينة (بدون دوسي لكل عقار)</label>
        ${fSeg('loose', [{ v: 'one', l: 'كل الصور = عقار واحد' }, { v: 'each', l: 'كل صورة = عقار' }], picked ? 'one' : 'one')}</div>` : ''}
      <label class="toggle-line" style="margin-top:12px"><input type="checkbox" id="imp-videos" ${nVideos > 50 ? '' : 'checked'}> استيراد الفيديوهات أيضا (${nVideos})</label>
      ${nVideos > 50 ? '<div class="muted" style="font-size:12px">الفيديوهات كثيرة وكبيرة: من الأفضل تركها في الدوسي، أو استيرادها لاحقا لكل عقار.</div>' : ''}
      <div class="progress hidden" id="imp-prog" style="margin-top:14px"><div style="width:0"></div></div>
      <div class="muted" id="imp-status" style="font-size:13px;margin-top:6px"></div>
      <div class="btn-row" style="justify-content:flex-end;margin-top:14px">
        <button class="btn" data-close id="imp-cancel">إلغاء</button>
        <button class="btn gold" id="imp-go">${ic('check', 18)} استيراد</button>
      </div>`, (m, close) => {
      $('#imp-go', m).onclick = async () => {
        $('#imp-go', m).disabled = true; $('#imp-cancel', m).disabled = true;
        const looseMode = ($('[name=loose]:checked', m) || {}).value || 'one';
        const withVideos = $('#imp-videos', m).checked;
        const pname = picked && $('[name=pname]', m) ? $('[name=pname]', m).value.trim() : '';
        const typeOf = new Map(list.map((c, i) => [c.name, $('[name=t' + i + ']', m).value]));
        const jobs = [];
        props.forEach(p => {
          let type = typeOf.get(p.typeFrom) || p.type;
          if (picked && pname && type === 'other') type = guessType(pname);
          const fs = withVideos ? p.files : p.files.filter(f => !isVideoFile(f));
          if (!fs.length) return;
          if (p.leafIsCategory && looseMode === 'each') fs.forEach(f => jobs.push({ ...p, type, label: f.name.replace(/\.[^.]+$/, ''), files: [f], key: p.key + '/' + f.name }));
          else jobs.push({ ...p, type, label: pname || p.label, files: fs });
        });
        const todo = jobs.filter(j => !known.has(j.key));
        const skipped = jobs.length - todo.length;
        const total = todo.reduce((s, j) => s + j.files.length, 0) || 1;
        const prog = $('#imp-prog', m), st = $('#imp-status', m);
        prog.classList.remove('hidden');
        let done = 0, made = 0;
        for (const j of todo) {
          const id = uid(), media = [];
          for (const f of j.files) {
            const fid = uid(), video = isVideoFile(f);
            const rec = { id: fid, owner: id, kind: video ? 'video' : 'photo', name: f.name, mime: f.type, size: f.size };
            if (video) rec.blob = f;
            else {
              const big = await compressImage(f, 1280, 0.78), small = await compressImage(f, 400, 0.7);
              rec.blob = big.blob; rec.thumb = small.blob; rec.mime = big.blob.type || f.type; rec.size = big.blob.size;
            }
            await DB.put('files', rec);
            media.push({ id: fid, kind: rec.kind, name: f.name, mime: rec.mime, size: rec.size });
            done++; prog.firstElementChild.style.width = (done / total * 100) + '%';
            st.textContent = `${done} / ${total} — ${j.label}`;
          }
          const obj = {
            id, createdAt: new Date().toISOString(), transaction: j.trx, type: j.type, status: 'available',
            city: j.city || S.settings.officeCity || 'مكناس', specs: {}, features: [], owner: {}, broker: {}, media,
            priceUnit: (D.PRICE_UNITS[j.trx] || ['درهم'])[0], negotiable: true,
            imported: true, importKey: j.key, title: typeAr(j.type) + ' — ' + j.label, notes: 'مستورد من الدوسي: ' + j.key,
          };
          obj.ref = await DB.nextRef('W777', maxRef(S.props));
          await DB.saveRec('properties', obj);
          S.props.push(obj);
          made++;
        }
        await loadAll();
        close();
        toast(`تم استيراد ${made} عقار ✓${skipped ? ` (${skipped} كانوا مستوردين من قبل)` : ''} — كمّل المعلومات من «للإكمال»`, 5000);
        S.propFilters.status = 'todo';
        location.hash = '#/properties';
      };
    });
  }

  function manageCustomDistricts() {
    const rows = Object.entries(S.custom).flatMap(([c, ds]) => ds.map(d => ({ c, d })));
    modal(`<h3>الأحياء المضافة يدويا</h3>
      <div class="doc-list">${rows.map((x, i) => `<div class="list-row" style="border:1px solid var(--line);border-radius:12px"><div class="grow"><b>${esc(x.d)}</b><small class="muted">${esc(x.c)}</small></div><button class="btn sm danger" data-i="${i}">${ic('trash', 14)}</button></div>`).join('')}</div>
      <div class="btn-row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-close>إغلاق</button></div>`, (m, close) => {
      $$('[data-i]', m).forEach(b => b.onclick = async () => {
        const x = rows[Number(b.dataset.i)];
        S.custom[x.c] = (S.custom[x.c] || []).filter(d => d !== x.d);
        if (!S.custom[x.c].length) delete S.custom[x.c];
        await DB.setMeta('customDistricts', S.custom);
        await DB.markDirty('meta', 'customDistricts');
        close(); manageCustomDistricts();
      });
    });
  }

  const blobToB64 = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });
  async function download(blob, name) {
    if (EMBED) {
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (!dl) { toast('حفظ الملفات غير متاح في هذه النسخة'); return false; }
      try { await dl.save({ filename: name, data: blob }); toast('تم حفظ الملف ✓'); return true; }
      catch (e) { if (e && e.code !== 'declined') toast('تعذر الحفظ: ' + (e.message || e.code)); return false; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  async function exportBackup(withVideos) {
    const prog = $('#bk-prog'); prog.classList.remove('hidden');
    const bar = prog.firstElementChild;
    const meta = (await DB.all('meta')).filter(m => !m.key.startsWith('sync_'));
    const parts = ['{"app":"wasset777-bureau","version":1,"exportedAt":', JSON.stringify(new Date().toISOString()),
      ',"properties":', JSON.stringify(S.props), ',"requests":', JSON.stringify(S.reqs), ',"meta":', JSON.stringify(meta), ',"files":['];
    const ids = [];
    [...S.props, ...S.reqs].forEach(p => (p.media || []).forEach(m => { if (withVideos || m.kind !== 'video') ids.push(m.id); }));
    let first = true;
    for (let i = 0; i < ids.length; i++) {
      let rec = await DB.get('files', ids[i]);
      if (!rec || !rec.blob) { await getBlob(ids[i], false); rec = await DB.get('files', ids[i]); }
      if (!rec || !rec.blob) continue;
      const o = { id: rec.id, owner: rec.owner, kind: rec.kind, name: rec.name, mime: rec.mime, size: rec.size, data: await blobToB64(rec.blob), thumb: rec.thumb ? await blobToB64(rec.thumb) : null };
      parts.push((first ? '' : ',') + JSON.stringify(o));
      first = false;
      bar.style.width = ((i + 1) / ids.length * 100) + '%';
    }
    parts.push(']}');
    const blob = new Blob(parts, { type: 'application/json' });
    const name = `wasset777-backup-${today()}${withVideos ? '' : '-light'}.json`;
    const file = new File([blob], name, { type: 'application/json' });
    await DB.setMeta('lastBackup', new Date().toISOString());
    prog.classList.add('hidden');
    try {
      if (!EMBED && navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
        await navigator.share({ files: [file], title: 'نسخة احتياطية — الوسيط 777' });
        toast('تم ✓ احفظ الملف في «الملفات» أو أرسله لجهازك الآخر');
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    if (EMBED) { await download(blob, name); return; }
    download(blob, name);
    toast('تم تنزيل النسخة الاحتياطية (' + (blob.size / 1048576).toFixed(1) + ' MB) ✓');
  }
  async function importBackup(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { toast('ملف غير صالح'); return; }
    if (!data || data.app !== 'wasset777-bureau') { toast('هذا الملف ليس نسخة احتياطية لتطبيق الوسيط 777'); return; }
    const choice = await new Promise(res => modal(`<h3>استيراد ${data.properties.length} عقار و ${data.requests.length} طلب</h3>
      <p class="muted">تاريخ النسخة: ${esc((data.exportedAt || '').slice(0, 16).replace('T', ' '))}</p>
      <div class="btn-row" style="flex-direction:column;align-items:stretch">
        <button class="btn gold" data-c="merge">دمج مع البيانات الحالية (الأحدث يبقى)</button>
        <button class="btn danger" data-c="replace">استبدال كل البيانات الحالية</button>
        <button class="btn" data-close data-c="">إلغاء</button></div>`, (m, close) => {
      $$('[data-c]', m).forEach(b => b.addEventListener('click', () => { close(); res(b.dataset.c); }));
    }));
    if (!choice) return;
    const prog = $('#bk-prog'); if (prog) prog.classList.remove('hidden');
    const bar = prog && prog.firstElementChild;
    if (choice === 'replace') { await Promise.all(['properties', 'requests', 'files', 'meta'].map(s => DB.clear(s))); urlCache.clear(); }
    const newer = (a, b) => !b || (a.updatedAt || '') >= (b.updatedAt || '');
    for (const p of data.properties) { const cur = await DB.get('properties', p.id); if (choice === 'replace' || newer(p, cur)) { await DB.put('properties', p); await DB.markDirty('properties', p.id); } }
    for (const r of data.requests) { const cur = await DB.get('requests', r.id); if (choice === 'replace' || newer(r, cur)) { await DB.put('requests', r); await DB.markDirty('requests', r.id); } }
    for (const m of data.meta || []) {
      if (choice === 'replace') { if (!m.key.startsWith('sync_')) await DB.put('meta', m); continue; }
      const cur = await DB.get('meta', m.key);
      if (m.key.startsWith('counter_')) await DB.put('meta', { key: m.key, value: Math.max(m.value || 0, (cur && cur.value) || 0) });
      else if (m.key === 'customDistricts') {
        const merged = Object.assign({}, (cur && cur.value) || {});
        Object.entries(m.value || {}).forEach(([c, ds]) => { merged[c] = Array.from(new Set([...(merged[c] || []), ...ds])); });
        await DB.put('meta', { key: m.key, value: merged });
      } else if (!cur && !m.key.startsWith('sync_')) await DB.put('meta', m);
    }
    const files = data.files || [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const blob = await (await fetch(f.data)).blob();
      const thumb = f.thumb ? await (await fetch(f.thumb)).blob() : null;
      await DB.put('files', { id: f.id, owner: f.owner, kind: f.kind, name: f.name, mime: f.mime, size: f.size, blob, thumb });
      if (bar) bar.style.width = ((i + 1) / files.length * 100) + '%';
    }
    await loadAll();
    toast('تم الاستيراد بنجاح ✓');
    location.hash = '#/';
  }
  function csv(rows) {
    const cell = v => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');
  }
  function exportPropsCsv() {
    const rows = [['المرجع', 'العملية', 'النوع', 'الحالة', 'العنوان', 'المدينة', 'الحي', 'السعر من', 'السعر إلى', 'المساحة', 'غرف النوم', 'المالك', 'هاتف المالك', 'الوسيط', 'هاتف الوسيط', 'تاريخ الإضافة']];
    S.props.forEach(p => rows.push([p.ref, trxAr(p.transaction), typeAr(p.type), (PSTATUS[p.status] || {}).ar, p.title, p.city, p.district, p.priceMin, p.priceMax, areaOf(p), p.specs && p.specs.bedrooms,
      p.owner && p.owner.name, p.owner && p.owner.phone, p.broker && p.broker.has ? p.broker.name : '', p.broker && p.broker.has ? p.broker.phone : '', (p.createdAt || '').slice(0, 10)]));
    download(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' }), 'wasset777-properties-' + today() + '.csv');
  }
  function exportReqsCsv() {
    const rows = [['المرجع', 'الزبون', 'الهاتف', 'العملية', 'الأنواع', 'المدينة', 'الأحياء', 'الميزانية من', 'الميزانية إلى', 'المساحة من', 'المساحة إلى', 'الحالة', 'المتابعة', 'تاريخ الإضافة']];
    S.reqs.forEach(r => rows.push([r.ref, r.client && r.client.name, r.client && r.client.phone, trxAr(r.transaction), (r.types || []).map(typeAr).join(' / '), r.city, (r.districts || []).join(' / '),
      r.budgetMin, r.budgetMax, r.areaMin, r.areaMax, (RSTATUS[r.status] || {}).ar, r.followUp, (r.createdAt || '').slice(0, 10)]));
    download(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' }), 'wasset777-requests-' + today() + '.csv');
  }

  /* ---------- القفل بالرمز السري ---------- */
  async function hash(s) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('w777:' + s));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function pinPad(title, onDone) {
    const el = document.createElement('div');
    el.className = 'lock';
    let code = '';
    el.innerHTML = `<div class="logo-pill" style="height:64px;padding:10px 16px"><img src="${LOGO}" alt="الوسيط 777"></div><h2 style="margin:0">${esc(title)}</h2>
      <div class="dots">${'<span></span>'.repeat(4)}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-k="${k}">${k}</button>`).join('')}</div>`;
    const dots = () => $$('.dots span', el).forEach((d, i) => d.classList.toggle('on', i < code.length));
    const press = async k => {
      if (k === '⌫') code = code.slice(0, -1);
      else if (code.length < 4) code += k;
      dots();
      if (code.length === 4) {
        const ok = await onDone(code);
        if (ok) el.remove();
        else { $('.dots', el).classList.add('shake'); setTimeout(() => { $('.dots', el).classList.remove('shake'); code = ''; dots(); }, 400); }
      }
    };
    el.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
    const onKey = e => { if (!document.body.contains(el)) return document.removeEventListener('keydown', onKey); if (/^\d$/.test(e.key)) press(e.key); if (e.key === 'Backspace') press('⌫'); };
    document.addEventListener('keydown', onKey);
    document.body.appendChild(el);
  }
  function lockScreen() {
    const stored = localStorage.getItem('w777_pin');
    if (!stored) return Promise.resolve();
    return new Promise(res => pinPad('أدخل الرمز السري', async code => { const ok = (await hash(code)) === stored; if (ok) res(); return ok; }));
  }
  function setupPin() {
    let first = null;
    pinPad('اختر رمزا من 4 أرقام', async code => {
      first = code;
      setTimeout(() => pinPad('أعد كتابة الرمز للتأكيد', async c2 => {
        if (c2 !== first) { toast('الرمزان غير متطابقين'); return false; }
        localStorage.setItem('w777_pin', await hash(c2));
        toast('تم تفعيل القفل ✓');
        viewSettings();
        return true;
      }), 50);
      return true;
    });
  }

  /* ---------- المظهر ---------- */
  function applyTheme() {
    const t = localStorage.getItem('w777_theme') || 'auto';
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const meta = $('meta[name=theme-color]');
    if (meta) meta.content = '#0f2a4a';
  }

  function notFound() {
    return `<div class="card empty"><div class="big">🤷</div><h3>العنصر غير موجود</h3><p>ربما تم حذفه.</p><a class="btn primary" href="#/">الرئيسية</a></div>`;
  }

  /* ---------- بيانات تجريبية ---------- */
  async function seedDemo() {
    const now = Date.now();
    const mk = (i, o) => Object.assign({ id: uid(), createdAt: new Date(now - i * 86400000).toISOString(), updatedAt: new Date(now - i * 86400000).toISOString(), status: 'available', media: [], features: [], specs: {}, broker: {}, negotiable: true, priceUnit: 'درهم' }, o);
    const props = [
      mk(1, { transaction: 'sale', type: 'apartment', city: 'مكناس', district: 'مرجان 2', priceMin: 620000, priceMax: 680000, areaTotal: 92, specs: { floor: '2', bedrooms: 3, salons: 1, bathrooms: 2, kitchen: 'مطبخ مجهز', condition: 'ممتاز', facades: '2' }, features: ['مصعد', 'مرآب / باركينغ', 'بالكون', 'إقامة مغلقة'], titleStatus: 'محفظ (رسم عقاري)', owner: { name: 'محمد العلوي', phone: '0661000001', relation: 'المالك' } }),
      mk(2, { transaction: 'sale', type: 'villa', city: 'مكناس', district: 'الرياض', priceMin: 2600000, priceMax: 2900000, areaTotal: 300, areaBuilt: 420, specs: { landArea: 300, levels: 'R+1', bedrooms: 5, salons: 2, bathrooms: 4, condition: 'جيد', facades: '2' }, features: ['حديقة', 'مسبح', 'مرآب', 'سطح'], titleStatus: 'محفظ (رسم عقاري)', owner: { name: 'فاطمة الزهراء بناني', phone: '0662000002', relation: 'المالك' }, broker: { has: true, name: 'رشيد', phone: '0670000009', share: '50%' } }),
      mk(3, { transaction: 'rent', type: 'apartment', city: 'مكناس', district: 'حمرية (المدينة الجديدة)', priceMax: 3500, priceUnit: 'درهم / الشهر', areaTotal: 85, specs: { floor: '3', bedrooms: 2, salons: 1, bathrooms: 1, furnished: 'غير مفروش' }, features: ['مصعد', 'بالكون'], owner: { name: 'عبد الله التازي', phone: '0663000003' } }),
      mk(4, { transaction: 'sale', type: 'plot_house', city: 'مكناس', district: 'ويسلان', priceMin: 380000, priceMax: 420000, areaTotal: 120, specs: { zoning: 'سكن فردي', heightAllowed: 'R+2', facades: '1', streetWidth: 12 }, features: ['محفظة', 'مجهزة (ماء، كهرباء، تطهير)'], titleStatus: 'محفظ (رسم عقاري)', owner: { name: 'الحسين أمزيان', phone: '0664000004' } }),
      mk(5, { transaction: 'sale', type: 'shop', city: 'مكناس', district: 'البساتين', priceMin: 750000, priceMax: 800000, areaTotal: 45, specs: { floor: 'سفلي (RDC)', frontage: 5, streetType: 'شارع رئيسي', mezzanine: 15 }, features: ['واجهة زجاجية', 'مرحاض'], owner: { name: 'سعيد الإدريسي', phone: '0665000005' } }),
      mk(6, { transaction: 'sale', type: 'farm', city: 'الحاجب', district: 'وسط المدينة', priceMin: 1800000, priceMax: 2000000, areaTotal: 50000, specs: { hectares: 5, water: 'ثقب مائي (سونداج)', irrigation: 'تنقيط (قطرة قطرة)', trees: 'زيتون وتفاح', treesCount: 900 }, features: ['ثقب مائي', 'كهرباء', 'منزل', 'زيتون', 'على الطريق'], titleStatus: 'محفظ (رسم عقاري)', owner: { name: 'إدريس الحاجبي', phone: '0666000006' } }),
    ];
    for (const p of props) { p.ref = await DB.nextRef('W777'); p.title = autoTitle(p); p.description = buildDescription(p); await DB.saveRec('properties', p); }
    const reqs = [
      { client: { name: 'يوسف المرابط', phone: '0677000011', source: 'فيسبوك', profession: 'أستاذ' }, transaction: 'sale', types: ['apartment', 'middle_standing'], city: 'مكناس', districts: ['مرجان 2', 'مرجان 1', 'الزيتون'], budgetMin: 500000, budgetMax: 650000, areaMin: 80, areaMax: 110, bedroomsMin: '2', features: ['مصعد'], financing: 'قرض بنكي', status: 'new', priority: 'high', followUp: today() },
      { client: { name: 'نادية الشرقاوي', phone: '0678000012', source: 'واتساب', nationality: 'مغربي مقيم بالخارج (MRE)' }, transaction: 'sale', types: ['villa', 'villa_luxury'], city: 'مكناس', districts: [], budgetMin: 2000000, budgetMax: 3000000, features: ['حديقة', 'مسبح'], financing: 'نقدا (كاش)', status: 'active', priority: 'normal' },
      { client: { name: 'كريم بنعلي', phone: '0679000013', source: 'زيارة المكتب' }, transaction: 'rent', types: ['apartment'], city: 'مكناس', districts: ['حمرية (المدينة الجديدة)'], budgetMax: 4000, bedroomsMin: '2', status: 'new', priority: 'normal' },
    ];
    for (let i = 0; i < reqs.length; i++) {
      const r = Object.assign({ id: uid(), createdAt: new Date(now - i * 3600000).toISOString(), updatedAt: new Date().toISOString(), proposals: {} }, reqs[i]);
      r.ref = await DB.nextRef('DM');
      await DB.saveRec('requests', r);
    }
    await loadAll();
    toast('تمت إضافة بيانات تجريبية ✓');
    route();
  }

  /* ============================================================
     التشغيل
     ============================================================ */
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });

  function setupFab() {
    const fab = $('#fab');
    const menu = $('#fab-menu');
    fab.onclick = e => { e.stopPropagation(); menu.classList.toggle('hidden'); };
    document.addEventListener('click', () => menu.classList.add('hidden'));
  }

  async function cleanOrphans() {
    try {
      const all = [...S.props, ...S.reqs];
      const ids = new Set(all.map(p => p.id));
      const keep = new Set(all.flatMap(p => (p.media || []).map(m => m.id)));
      const idx = await DB.fileIndex();
      for (const f of idx) if (!ids.has(f.owner) || !keep.has(f.id)) await DB.del('files', f.id);
    } catch (e) { /* */ }
  }

  async function start() {
    applyTheme();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    await lockScreen();
    await loadAll();
    cleanOrphans();
    setupSearch();
    setupFab();
    setupSyncUi();
    window.addEventListener('hashchange', route);
    await route();
    DB.persist();
    if (window.W777_SYNC.isOn()) window.W777_SYNC.syncNow();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => { /* */ });
      // عند تثبيت نسخة جديدة: إعادة تحميل الصفحة مرة واحدة
      let reloaded = !navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded || /\/(new|edit)/.test(location.hash)) return;
        reloaded = true; location.reload();
      });
    }
  }
  document.addEventListener('DOMContentLoaded', start);
})();
