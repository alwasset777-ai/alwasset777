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
    appts: [],
    role: null, agency: null, net: null, netFilters: null,
    custom: {},       // أحياء مضافة يدويا { مدينة: [أحياء] }
    settings: {},
    propFilters: { trx: '', status: 'active', type: '', cat: '', city: '', district: '', pmin: null, pmax: null, amin: null, amax: null, beds: null, sort: 'new', fav: false },
    reqFilters: { status: 'open', trx: '' },
  };
  const urlCache = new Map();

  async function loadAll() {
    const [props, reqs, custom, settings, appts] = await Promise.all([
      DB.all('properties'), DB.all('requests'), DB.getMeta('customDistricts', {}), DB.getMeta('settings', {}), DB.all('appointments'),
    ]);
    S.appts = appts;
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

  // فك الصورة: createImageBitmap، وإلا عبر <img> (Safari كيقرا HEIC)
  async function decodeImage(file) {
    try { return await createImageBitmap(file); } catch (e) { /* نجربو img */ }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.src = url;
      await img.decode();
      return img;
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  async function compressImage(file, max = 1920, q = 0.85) {
    try {
      const bmp = await decodeImage(file);
      const bw = bmp.naturalWidth || bmp.width, bh = bmp.naturalHeight || bmp.height;
      const scale = Math.min(1, max / Math.max(bw, bh));
      const w = Math.round(bw * scale), h = Math.round(bh * scale);
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
      p.owner && p.owner.name, p.owner && p.owner.phone, p.partner && p.partner.name, p.owner && p.owner.phone2, p.owner && p.owner.cin,
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
    else if (a === 'ownership') { nav = 'ownership'; viewOwnership(); }
    else if (a === 'contracts') { nav = 'contracts'; viewContracts(); }
    else if (a === 'learn') { nav = 'learn'; viewLearn(); }
    else if (a === 'estimate') { nav = 'properties'; viewEstimate(query); }
    else if (a === 'appointments') { nav = 'appointments'; viewAppts(query); }
    else if (a === 'appointment') { nav = 'appointments'; await viewApptForm(b || 'new', query); }
    else if (a === 'agencies') { nav = 'agencies'; await viewAgencies(parts, query); }
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
    const todayAppts = S.appts.filter(a => a.status === 'planned' && a.date === today()).sort((x, y) => (x.time || '').localeCompare(y.time || ''));
    const h = new Date().getHours();
    const greet = h < 12 ? 'صباح الخير' : h < 18 ? 'مساء النور' : 'مساء الخير';

    main().innerHTML = `
      <div class="hero">
        <h2>${greet} 👋</h2>
        <p>${esc(S.role === 'agency' ? myAgencyName() : S.settings.officeName)} — قاعدة بيانات المكتب بين يديك، حتى بدون إنترنت.</p>
        <div class="btn-row">
          <a class="btn gold" href="#/property/new">${ic('plus', 18)} إضافة عقار</a>
          <a class="btn" href="#/request/new">${ic('users', 18)} إضافة طلب</a>
          <a class="btn" href="#/matching">${ic('target', 18)} المطابقة</a>
          <a class="btn" href="#/appointments">${ic('calendar', 18)} المواعيد${todayAppts.length ? ` <span class="badge gold">${todayAppts.length}</span>` : ''}</a>
          <a class="btn" href="#/agencies">${ic('building', 18)} الوكالات العقارية</a>
          <a class="btn" href="#/estimate">📊 مقارنة الثمن</a>
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
            <div class="pair-head"><b>${ic('calendar', 18)} مواعيد اليوم</b><a class="btn sm" href="#/appointment/new">${ic('plus', 15)}</a></div>
            ${todayAppts.length ? todayAppts.slice(0, 6).map(a => `
              <a class="list-row" href="#/appointment/${a.id}"><div class="avatar" style="width:46px;height:38px;font-size:13px;border-radius:10px">${esc(a.time || '')}</div>
              <div class="grow"><b>${esc((a.client || {}).name || '')}</b><small class="muted">${esc(APPT_TYPES[a.type] || '')}${a.place ? ' · ' + esc(a.place) : ''}</small></div></a>`).join('')
              : `<div class="empty" style="padding:22px">ما كاين حتى موعد اليوم</div>`}
          </div>
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
        <div class="tl"><span class="badge deal">${esc(trxShort(p.transaction))}</span>${p.status !== 'available' ? `<span class="badge ${st.color}">${esc(st.ar)}</span>` : ''}${p.fav ? `<span class="badge fav">★</span>` : ''}${needsInfo(p) ? `<span class="badge amber">📥 للإكمال</span>` : ''}${p.partner ? `<span class="badge blue">🤝 ${esc(p.partner.name)}</span>` : ''}${mktBadge(p)}</div>
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
    else if (f.status === 'partner') list = list.filter(p => p.partner);
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
    const nPart = S.props.filter(p => p.partner).length;
    const stChips = [{ v: 'active', l: 'المعروضة' }, ...(nTodo ? [{ v: 'todo', l: '📥 للإكمال (' + nTodo + ')' }] : []), ...(nPart ? [{ v: 'partner', l: '🤝 الشركاء (' + nPart + ')' }] : []), { v: '', l: 'كل الحالات' }, ...D.STATUSES.map(s => ({ v: s.id, l: s.ar }))];
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
          ${mktCard(p)}
          ${p.description ? `<div class="card card-pad"><div class="pair-head" style="padding:0 0 10px;border:0"><b>الوصف</b><button class="btn sm" id="copy-desc">${ic('copy', 15)} نسخ</button></div><div class="desc">${esc(p.description)}</div></div>` : ''}
          ${p.legalNotes || p.notes ? `<div class="card card-pad no-print"><b>ملاحظات داخلية</b>${p.legalNotes ? `<p class="desc">⚖️ ${esc(p.legalNotes)}</p>` : ''}${p.notes ? `<p class="desc">${esc(p.notes)}</p>` : ''}</div>` : ''}
          ${docs.length ? `<div class="card card-pad no-print"><b style="display:block;margin-bottom:10px">المستندات (${docs.length})</b><div class="doc-list">${docs.map(d => `<a href="#" data-doc="${d.id}">${ic('file')} <span class="grow">${esc(d.name)}</span><small class="muted">${Math.max(1, Math.round((d.size || 0) / 1024))} KB</small></a>`).join('')}</div></div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          ${p.partner ? `<div class="card card-pad no-print" style="border:2px solid var(--gold, #c8102e)">
            <b style="display:block;margin-bottom:8px">🤝 عقار من وكالة شريكة</b>
            <div style="font-size:17px;font-weight:800">${esc(p.partner.name)}</div>
            ${p.partner.agent ? `<div class="muted" style="font-size:13px">المكلف: ${esc(p.partner.agent)}</div>` : ''}
            <div class="btn-row" style="margin-top:10px">${[p.partner.agentPhone, p.partner.phone].filter((x, i, a) => x && a.indexOf(x) === i).map(ph => `<a class="btn sm" href="${telLink(ph)}">${ic('phone', 16)} ${esc(ph)}</a><a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(ph)}">${ic('wa', 16)}</a>`).join('')}</div>
          </div>` : ''}
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
    const me = $('#mkt-edit'); if (me) me.onclick = () => editMarketRef(p.city, p.district, p.type, () => viewProp(p.id));
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
        <b>${esc(c.name || 'زبون')} ${r.priority === 'high' ? '🔥' : ''}${r.imported && !r.transaction ? ' <span class="badge amber">📥 للإكمال</span>' : ''}</b>
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

        ${EMBED || S.role === 'agency' ? '' : `<div class="card card-pad" id="partners-card">
          <h3 class="section-title">🤝 الوكالات الشريكة</h3>
          <p class="muted" style="margin-top:0">زيد وكالة وعطيها رابط خاص بيها. منو تقدر تزيد العقارات ديالها، وكيوصلو عندك فـ «العقارات» بسمية الوكالة.</p>
          <div id="partners-body" class="muted">…</div>
        </div>`}

        <div class="card card-pad">
          <h3 class="section-title">${ic('users')} استيراد الطلبات من جهات الاتصال (dde)</h3>
          <p class="muted" style="margin-top:0">كل جهة اتصال فاسمها <b>dde</b> (demande) كتولي طلب جديد بالاسم والهاتف.<br>
          <b>فالآيفون:</b> تطبيق «Contacts» ← «Listes» (فوق على اليسار) ← ضغطة طويلة على «Tous les contacts» ← «Exporter» ← «Enregistrer dans Fichiers». من بعد ورك هنا واختار الملف <b>.vcf</b>.</p>
          <div class="btn-row">
            <label class="btn gold">${ic('upload', 18)} اختيار ملف جهات الاتصال (.vcf)<input type="file" id="imp-vcf" hidden></label>
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

    if (!EMBED) { bindCloudCard(); if (S.role !== 'agency') renderPartners(); }
    $('#sform').onsubmit = async e => {
      e.preventDefault();
      Object.assign(S.settings, collect(e.target), { updatedAt: new Date().toISOString() });
      await DB.setMeta('settings', S.settings);
      await DB.markDirty('meta', 'settings');
      toast('تم الحفظ ✓');
    };
    $$('[name=theme]').forEach(el => el.onchange = () => { localStorage.setItem('w777_theme', el.value); applyTheme(); });
    $('#imp-folder').onchange = e => { if (e.target.files.length) importFolder(e.target.files); e.target.value = ''; };
    $('#imp-vcf').onchange = e => { if (e.target.files[0]) importContacts(e.target.files[0]); e.target.value = ''; };
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
      await Promise.all(['properties', 'requests', 'appointments', 'files', 'meta'].map(s => DB.clear(s)));
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
        ${fInput('email', 'البريد الإلكتروني أو رمز الوكالة (agence001)', '', { attrs: 'dir="ltr" autocapitalize="off" autocomplete="username"' })}
        ${fInput('password', 'كلمة السر', '', { type: 'password', attrs: 'dir="ltr"' })}
      </form>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn gold" id="cl-in">${ic('lock', 18)} دخول</button>
        <button class="btn" id="cl-up">إنشاء حساب جديد</button>
      </div>
      <p class="muted" style="font-size:12.5px;margin-bottom:0">أول مرة فقط: أنشئ مشروعا على supabase.com ثم نفّذ ملف <b dir="ltr">supabase.sql</b> في SQL Editor (مرفق مع التطبيق).</p>
    </div>`;
  }
  /* ---------- الوكالات الشريكة ---------- */
  const partnerLink = t => new URL('partner.html?t=' + t, location.href.split('#')[0]).href;
  async function renderPartners() {
    const body = $('#partners-body'); if (!body) return;
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) { body.innerHTML = 'فعّل «المزامنة السحابية» أولا باش تستعمل هاد الخاصية.'; return; }
    let list = [];
    try { list = await (await Sy.request('/rest/v1/w777_partners?select=token,name,phone,active,created_at&order=created_at.desc')).json(); }
    catch (e) { body.innerHTML = 'تعذر التحميل: ' + esc(e.message); return; }
    const count = name => S.props.filter(p => p.partner && p.partner.name === name).length;
    body.innerHTML = `
      <form class="form-grid" id="pt-add" style="margin-bottom:12px">
        <div class="field"><label>اسم الوكالة</label><input name="name" required placeholder="مثال: وكالة النخيل"></div>
        <div class="field"><label>الهاتف</label><input name="phone" type="tel"></div>
        <div class="field full"><button class="btn gold">${ic('plus', 16)} زيد الوكالة وصاوب الرابط</button></div>
      </form>
      ${list.length ? list.map(x => `<div class="list-row" style="flex-wrap:wrap;gap:8px">
        <div class="grow"><b>${esc(x.name)}</b> ${x.active ? '' : '<span class="badge red">موقوف</span>'}
          <small class="muted">${esc(x.phone || '')} · ${count(x.name)} عقار</small></div>
        <div class="btn-row">
          <button class="btn sm" data-pt-copy="${x.token}">${ic('copy', 15)} نسخ الرابط</button>
          <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${x.phone ? waPhone(x.phone) : ''}?text=${encodeURIComponent('السلام عليكم، هذا الرابط باش تزيدو العقارات ديالكم عند مكتب الوسيط 777:\n' + partnerLink(x.token))}">${ic('wa', 15)} صيفط</a>
          <button class="btn sm" data-pt-toggle="${x.token}" data-on="${x.active ? 1 : 0}">${x.active ? 'إيقاف' : 'تفعيل'}</button>
        </div></div>`).join('') : '<p class="muted">مازال ما زدتي حتى وكالة.</p>'}`;
    $('#pt-add').onsubmit = async e => {
      e.preventDefault();
      const v = collect(e.target);
      if (!v.name) return;
      try {
        const r = await (await Sy.request('/rest/v1/w777_partners', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ name: v.name, phone: v.phone || null }) })).json();
        const link = partnerLink(r[0].token);
        try { await navigator.clipboard.writeText(link); toast('تزادت الوكالة ✓ — الرابط تنسخ', 3500); } catch (er) { toast('تزادت الوكالة ✓', 3000); }
        renderPartners();
      } catch (er) { toast('تعذر: ' + er.message, 4000); }
    };
    $$('[data-pt-copy]', body).forEach(b => b.onclick = () => navigator.clipboard.writeText(partnerLink(b.dataset.ptCopy)).then(() => toast('تنسخ الرابط ✓')));
    $$('[data-pt-toggle]', body).forEach(b => b.onclick = async () => {
      await Sy.request('/rest/v1/w777_partners?token=eq.' + b.dataset.ptToggle, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: b.dataset.on !== '1' }) });
      renderPartners();
    });
  }
  // كل مزامنة: العقارات الجديدة ديال الشركاء كتولي عقارات عادية بسمية الوكالة
  async function importPartnerItems() {
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) return 0;
    const items = await (await Sy.request('/rest/v1/w777_partner_items?imported=eq.false&select=id,token,data,photos,created_at,w777_partners(name,phone)&order=created_at.asc&limit=20')).json();
    let n = 0;
    for (const it of items) {
      const id = 'pt-' + it.id;
      const d = it.data || {}, pa = it.w777_partners || {};
      if (!(await DB.get('properties', id))) {
        const media = [];
        for (const path of it.photos || []) {
          try {
            const res = await Sy.request('/storage/v1/object/authenticated/w777-partner/' + path);
            const blob = await res.blob();
            const small = await compressImage(blob, 400, 0.7);
            const fid = uid();
            await DB.put('files', { id: fid, owner: id, kind: 'photo', name: path.split('/').pop(), mime: 'image/jpeg', size: blob.size, blob, thumb: small.blob });
            media.push({ id: fid, kind: 'photo', name: path.split('/').pop(), mime: 'image/jpeg', size: blob.size });
          } catch (e) { /* صورة ناقصة */ }
        }
        const price = num(String(d.price || '').replace(/[^\d.]/g, ''));
        const p = {
          id, createdAt: it.created_at || new Date().toISOString(), updatedAt: new Date().toISOString(),
          transaction: d.transaction || 'sale', type: d.type || 'other', city: d.city || '', district: d.district || '',
          priceMin: price || null, priceMax: price || null, priceUnit: 'درهم', negotiable: true,
          areaTotal: num(d.area) || null, specs: { bedrooms: num(d.bedrooms) || '', floor: d.floor || '' },
          features: [], status: 'available', media, cover: media[0] ? media[0].id : null,
          description: d.description || '',
          owner: { name: d.agent || pa.name || '', phone: d.phone || pa.phone || '', relation: 'وكالة شريكة' },
          partner: { name: pa.name || '', phone: pa.phone || '', agent: d.agent || '', agentPhone: d.phone || '', token: it.token },
          notes: 'عقار من الوكالة الشريكة: ' + (pa.name || ''),
        };
        p.ref = await DB.nextRef('W777', maxRef(S.props));
        p.title = autoTitle(p);
        await DB.saveRec('properties', p);
        n++;
      }
      await Sy.request('/rest/v1/w777_partner_items?id=eq.' + it.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imported: true }) });
      // الصور ولات عندنا (كتطلع مع المزامنة العادية) — نمسحو النسخة ديال الشريك باش ما تاخدش المساحة
      if ((it.photos || []).length) { try { await Sy.request('/storage/v1/object/w777-partner', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: it.photos }) }); } catch (e) { /* */ } }
    }
    if (n) { await loadAll(); toast(`🤝 وصلو ${n} عقار جديد من الوكالات الشريكة`, 4000); }
    return n;
  }

  function bindCloudCard() {
    const Sy = window.W777_SYNC;
    const b = id => $('#' + id);
    if (b('cl-sync')) b('cl-sync').onclick = async () => { await Sy.syncNow(); viewSettings(); };
    if (b('cl-out')) b('cl-out').onclick = async () => {
      if (!(await confirmBox('تسجيل الخروج من المزامنة؟ البيانات تبقى على هذا الجهاز.', 'خروج', false))) return;
      Sy.signOut(); S.role = null; S.agency = null; S.roleFor = null; S.net = null; localStorage.removeItem('w777_role'); viewSettings();
    };
    const go = async up => {
      const v = collect($('#cl-form'));
      if (!v.url || !v.key || !v.email || !v.password) return toast('املأ كل الخانات');
      if (v.password.length < 6) return toast('كلمة السر: 6 أحرف على الأقل');
      // جهاز فيه بيانات حساب آخر: كل شي غادي يتزاد للحساب الجديد
      const last = localStorage.getItem('w777_last_email'), em = Sy.normEmail ? Sy.normEmail(v.email) : v.email;
      if (!up && last && last !== em && (S.props.length || S.reqs.length) &&
        !(await confirmBox(`هاد الجهاز فيه ${S.props.length} عقار و ${S.reqs.length} طلب ديال الحساب ${last}. إلا دخلتي بـ ${em} غادي يتزادو لهاد الحساب. واش متأكد؟ (الأحسن: «مسح كل البيانات» من هاد الجهاز أولا)`, 'دخول على أي حال'))) return;
      try {
        toast(up ? 'جاري إنشاء الحساب…' : 'جاري الدخول…');
        if (up) {
          const r = await Sy.signUp(v.url, v.key, v.email, v.password);
          if (!r.confirmed) { toast('تم إنشاء الحساب ✓ افتح بريدك وأكّد الحساب ثم اضغط «دخول»', 5000); return; }
        } else { await Sy.signIn(v.url, v.key, v.email, v.password); localStorage.setItem('w777_last_email', em); }
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
    if (Sy.onPulled) { Sy.onPulled(importPartnerItems); Sy.onPulled(publishShared); }
    Sy.onChange(async () => {
      await loadAll();
      const h = location.hash;
      if (!/\/(new|edit)/.test(h) && !h.startsWith('#/settings')) route();
    });
    btn.onclick = () => { Sy.syncNow(); toast('جاري المزامنة…'); };
    paint(Sy.status());
  }

  /* ============================================================
     مراحل تملك العقار 🏛️ (المصادر: ANCFCC، المديرية العامة للضرائب، CGI، قانون المالية 2026)
     ============================================================ */
  const OWN_STEPS = [
    { t: 'الميزانية والتمويل', ic: '💰', d: ['حدد الميزانية: الثمن + المصاريف (حوالي 7% إلى 8% من الثمن، شوف الحاسبة لتحت).', 'إلا غادي تاخد قرض: سول البنك على القدرة الاقتراضية (القسط ما يفوتش تقريبا 40% من الدخل) وخد «موافقة مبدئية».', 'الدعم المباشر للسكن (للمغاربة اللي ما عندهمش سكن): 100 000 درهم إلا كان الثمن ≤ 300 000 درهم، و70 000 درهم من 300 000 حتى 700 000 درهم — عبر منصة الدعم الرسمية.'] },
    { t: 'البحث والمعاينة', ic: '🔎', d: ['زور العقار مزيان: الحالة، الرطوبة، الكهرباء والماء، الواجهة، الجيران، السانديك.', 'قارن الثمن مع السوق (زر «📊 مقارنة الثمن» فالتطبيق).', 'تأكد من المساحة الحقيقية مقارنة مع اللي مكتوب فالرسم العقاري.'] },
    { t: 'التحقق القانوني من العقار', ic: '⚖️', d: ['شهادة الملكية (Certificat de propriété) من الوكالة الوطنية للمحافظة العقارية ANCFCC: كتبين المالك الحقيقي والرهون والحجوزات والتقييدات الاحتياطية — 100 درهم، كتطلب أونلاين.', 'واش العقار محفّظ (عندو رسم عقاري) ولا غير محفّظ (ملكية / عقد عدلي)؟ إلا ما كانش محفّظ، شوف «مسطرة التحفيظ» لتحت.', 'المذكرة المعلوماتية التعميرية (Note de renseignements) من الوكالة الحضرية / الجماعة: واش كاين شي تصفيف ولا طريق ولا منع البناء.', 'رخصة السكن / شهادة المطابقة، والتصاميم المصادق عليها (خاصة للفيلات والديور).', 'فالشقق: نظام الملكية المشتركة وواش البائع خالص واجبات السانديك.'] },
    { t: 'الوعد بالبيع + العربون', ic: '🤝', d: ['كيتوقع «الوعد بالبيع» (Compromis) عند الموثق ولا المحامي ولا العدول، فيه الثمن، الآجال، والشروط (بحال الحصول على القرض).', 'العربون عادة بين 10% و20% من الثمن، ويتخلص بطريقة كتبان (شيك ولا تحويل).', 'تقدر تستعمل النموذج فـ «📄 طباعة العقود» ← «عقد الوعد بالبيع».'] },
    { t: 'القرض البنكي (إلا كان)', ic: '🏦', d: ['البنك كيعطي «عرض القرض»، وكيطلب تأمين على الحياة وتأمين على العقار.', 'البنك كيسجل رهن رسمي من الدرجة الأولى على الرسم العقاري (عند ANCFCC).', 'الموثق كيستقبل مبلغ القرض مباشرة من البنك.'] },
    { t: 'وثائق البائع الإلزامية', ic: '📑', d: ['شهادة الإبراء الضريبي (Quitus fiscal) من المديرية العامة للضرائب: كتبين أن البائع خالص ضريبة السكن وضريبة الخدمات الجماعية ولا الضريبة على الأراضي غير المبنية. بلا بيها الموثق ما يقدرش يوقع.', 'شهادة ملكية حديثة، والبطاقة الوطنية، ورفع اليد على الرهن إلا كان العقار مرهون.', 'شهادة السانديك فالشقق.'] },
    { t: 'توقيع العقد النهائي', ic: '✍️', d: ['كيتوقع عقد البيع النهائي عند موثق، ولا عدول، ولا محامي مقبول لدى محكمة النقض (إلزامي للعقار المحفّظ).', 'ابتداءً من 1 يوليوز 2026: إلا تخلص الثمن «بلا ما يبان» (كاش ولا بلا مراجع)، كيتزاد واجب تسجيل إضافي ديال 2% على المشتري. خلص بشيك مسطر غير قابل للتظهير ولا تحويل بنكي.', 'الموثق كيودع الأموال فصندوق الإيداع والتدبير (CDG) حتى يكمل التقييد.'] },
    { t: 'التسجيل عند إدارة الضرائب', ic: '🧾', d: ['العقد خاصو يتسجل عند المديرية العامة للضرائب داخل 30 يوم من التوقيع.', 'كيتخلصو واجبات التسجيل (4% للعقار المبني، و5% أو 6% حسب الحالة، شوف الجدول) + واجبات التنبر.', 'البائع كيصرح بالربح العقاري (TPI) داخل 30 يوم من البيع.'] },
    { t: 'التقييد فالمحافظة العقارية', ic: '🏛️', d: ['الموثق كيقيد البيع فالرسم العقاري عند ANCFCC: 1.5% من الثمن (على الأقل 500 درهم) + 100 درهم واجب ثابت لكل رسم عقاري.', 'ما كتولّيش مالك قانونيا ومحمي قدام الناس حتى يتقيد البيع فالسجل العقاري.', 'من بعد التقييد: طلب شهادة ملكية جديدة باسمك.'] },
    { t: 'من بعد التملك', ic: '🔑', d: ['نقل عدادات الماء والكهرباء لسميتك، وتأمين المنزل.', 'التصريح بالعقار فالضرائب المحلية (ضريبة السكن + ضريبة الخدمات الجماعية).', 'الاحتفاظ بكل الوثائق (العقد، الوصولات، شهادة الملكية) — غادي تحتاجهم ملي تبيع (حساب الربح العقاري).'] },
  ];
  const TITLING = ['إيداع «مطلب التحفيظ» فالمحافظة العقارية (المالك ولا صاحب حق عيني) مع الوثائق (ملكية، رسوم الشراء، تصميم طبوغرافي…) وأداء الواجبات.', 'نشر خلاصة المطلب فالجريدة الرسمية وتعليق إعلان التحديد فالمحكمة الابتدائية والسلطة المحلية والجماعة.', 'عملية التحديد (Bornage) فالبلاصة بحضور المهندس الطبوغرافي والمعني بالأمر والجيران، وتحرير محضر وتصميم عقاري.', 'نشر إعلان انتهاء التحديد فالجريدة الرسمية. أجل التعرضات: شهرين من النشر.', 'إلا ما كانش تعرض (ولا تحل فالمحكمة): المحافظ كيقرر التحفيظ وكيأسس «الرسم العقاري» — نهائي وما يقبلش الطعن.', 'المدة العادية: من 12 حتى 36 شهر. كاين حتى التحفيظ الإجباري / الجماعي فبعض المناطق (مجانا ولا بتكلفة أقل).'];
  const OWN_TAXES = {
    buyer: [
      ['واجبات التسجيل — عقار مبني (سكن)', '4%', 'المديرية العامة للضرائب', 'عند التسجيل (30 يوم)'],
      ['واجبات التسجيل — أرض عارية', '6% (5% فبعض الحالات)', 'المديرية العامة للضرائب', 'عند التسجيل'],
      ['واجبات التسجيل — محلات تجارية / مهنية', '4% إلى 5%', 'المديرية العامة للضرائب', 'عند التسجيل'],
      ['واجب إضافي إلا كان الأداء غير قابل للتتبع (كاش)', '+2%', 'المديرية العامة للضرائب', 'من 1 يوليوز 2026'],
      ['التقييد فالمحافظة العقارية', '1.5% (أدنى 500 د) + 100 د', 'ANCFCC', 'عند التقييد'],
      ['شهادة الملكية', '100 درهم', 'ANCFCC', 'قبل وبعد الشراء'],
      ['أتعاب الموثق', 'حوالي 1% + الضريبة على القيمة المضافة 10%', 'الموثق', 'عند التوقيع'],
      ['التنبر والمصاريف الإدارية (débours)', 'بضع مئات حتى ~2 000 د', 'الموثق', 'عند التوقيع'],
      ['رهن القرض البنكي (إلا كان)', 'واجبات ANCFCC حسب الشطر + أتعاب', 'ANCFCC / البنك', 'عند توقيع القرض'],
      ['الضريبة على القيمة المضافة (عقار جديد من منعش)', 'داخلة فالثمن (10% أو 20% حسب الصنف)', 'المنعش', 'فالثمن'],
    ],
    seller: [
      ['الضريبة على الأرباح العقارية (TPI)', '20% من الربح الصافي، وعلى الأقل 3% من ثمن البيع', 'المديرية العامة للضرائب', 'تصريح داخل 30 يوم'],
      ['إعفاء: السكن الرئيسي', 'معفى إلا سكنتي فيه 6 سنين على الأقل (الثمن ≤ 4 000 000 د)', 'المديرية العامة للضرائب', ''],
      ['إعفاء: ربح صغير', 'معفى إلا كان الربح الصافي أقل من 30 000 د', '', ''],
      ['إعفاء: بين الأصول والفروع والأزواج', 'معفى من TPI (الهبة: 1.5% تسجيل)', '', ''],
      ['شهادة الإبراء الضريبي (Quitus)', 'إلزامية قبل البيع', 'المديرية العامة للضرائب', 'قبل التوقيع'],
    ],
    yearly: [
      ['ضريبة السكن', '10% / 20% / 30% من القيمة الكرائية حسب الشطر — تخفيض 75% للسكن الرئيسي، والشطر الأول معفى', 'الجماعة / الضرائب', 'كل عام'],
      ['ضريبة الخدمات الجماعية', '10.5% من القيمة الكرائية (6.5% فالمناطق المحيطة)', 'الجماعة / الضرائب', 'كل عام'],
      ['الضريبة على الأراضي الحضرية غير المبنية (TNB)', 'مبلغ على كل متر مربع حسب المنطقة', 'الجماعة', 'كل عام حتى تتبنى'],
      ['الضريبة على المداخيل العقارية (الكراء)', '10% حتى 120 000 د فالعام، و15% فوق', 'المديرية العامة للضرائب', 'تصريح سنوي'],
    ],
  };
  const OWN_SOURCES = [
    ['ANCFCC — مسطرة التحفيظ العادية', 'https://www.ancfcc.gov.ma/ProcedureNormale/'],
    ['ANCFCC — شهادة الملكية والخدمات', 'https://www.ancfcc.gov.ma'],
    ['المديرية العامة للضرائب (DGI)', 'https://www.tax.gov.ma'],
    ['قانون المالية 2026 — +2% (المذكرة 737)', 'https://www.aafir.ma/droits-enregistrement-maroc-loi-finances-2026/'],
    ['واجبات المحافظة العقارية', 'https://marocfacile.com/guides/conservation-fonciere-maroc'],
    ['المدونة العامة للضرائب — المادة 133', 'https://www.fiscamaroc.com/autres-taxes-183/article-133-droits-proportionnels-195.htm'],
  ];
  function ownCalc(v) {
    const price = num(v.price) || 0;
    if (!price) return '<p class="muted">دخل الثمن باش نحسبو المصاريف.</p>';
    const rate = v.kind === 'land' ? 0.06 : v.kind === 'pro' ? 0.05 : 0.04;
    const rows = [
      ['واجبات التسجيل (' + rate * 100 + '%)', price * rate],
      v.cash === '1' ? ['واجب إضافي — أداء غير قابل للتتبع (2%)', price * 0.02] : null,
      ['المحافظة العقارية (1.5% + 100 د)', Math.max(price * 0.015, 500) + 100],
      ['أتعاب الموثق (~1% + TVA 10%)', price * 0.01 * 1.1],
      ['التنبر والمصاريف (تقديري)', 1500],
    ].filter(Boolean);
    const tot = rows.reduce((s, r) => s + r[1], 0);
    return `<div class="kv">${rows.map(r => `<div><small>${esc(r[0])}</small><b>${fmt(Math.round(r[1]))} د</b></div>`).join('')}</div>
      <div class="mkt-big eq" style="margin-top:12px"><b>${fmt(Math.round(tot))} د</b><span>المجموع التقريبي (${(tot / price * 100).toFixed(1)}% من الثمن) — المجموع مع الثمن: ${esc(millions(price + tot) || fmt(Math.round(price + tot)))}</span></div>
      <p class="muted" style="font-size:12px;margin:8px 0 0">حساب تقريبي للمشتري. الموثق كيعطيك المبلغ النهائي.</p>`;
  }
  function viewOwnership() {
    const tbl = (rows, head) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const H = ['الضريبة / الرسم', 'النسبة / المبلغ', 'الجهة', 'الوقت'];
    main().innerHTML = `
      <div class="page-head"><h1>🏛️ مراحل تملك العقار</h1><button class="btn no-print" onclick="window.print()">${ic('print', 18)} طباعة</button></div>
      <p class="muted" style="margin-top:-6px">من البداية حتى تولي مالك رسمي، مع كل الضرائب والرسوم — حسب ANCFCC والمديرية العامة للضرائب وقانون المالية 2026.</p>
      <div class="chips no-print" style="margin-bottom:14px">
        <a class="chip" href="#own-steps">🪜 المراحل</a><a class="chip" href="#own-title">📐 التحفيظ</a><a class="chip" href="#own-calc">🧮 الحاسبة</a>
        <a class="chip" href="#own-buy">💸 ضرائب المشتري</a><a class="chip" href="#own-sell">🏷️ ضرائب البائع</a><a class="chip" href="#own-year">📆 الضرائب السنوية</a></div>
      <h2 class="sec-h" id="own-steps">🪜 مراحل الشراء (عقار محفّظ)</h2>
      <ol class="own-steps">${OWN_STEPS.map((s, i) => `<li class="card card-pad"><div class="own-n">${i + 1}</div><div class="grow"><b>${s.ic} ${esc(s.t)}</b><ul>${s.d.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></li>`).join('')}</ol>
      <h2 class="sec-h" id="own-title">📐 مسطرة التحفيظ العقاري (عقار غير محفّظ)</h2>
      <div class="card card-pad"><ol class="own-list">${TITLING.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
        <p class="muted" style="font-size:13px;margin-bottom:0">⚠️ العقار غير المحفّظ (عقد عدلي / ملكية) فيه مخاطر أكثر: الأحسن تحفّظو قبل ولا مباشرة من بعد الشراء.</p></div>
      <h2 class="sec-h" id="own-calc">🧮 حاسبة مصاريف الشراء</h2>
      <div class="card card-pad no-print"><form id="oc" class="form-grid">
        ${fInput('price', 'ثمن الشراء (درهم)', '', { money: true })}
        ${fSelect('kind', 'نوع العقار', [{ v: 'built', l: 'عقار مبني (شقة، دار، فيلا)' }, { v: 'pro', l: 'محل تجاري / مهني' }, { v: 'land', l: 'أرض عارية' }], 'built', { noEmpty: true })}
        ${fSelect('cash', 'طريقة الأداء', [{ v: '0', l: 'شيك / تحويل بنكي (قابل للتتبع)' }, { v: '1', l: 'كاش / بلا مراجع (+2%)' }], '0', { noEmpty: true })}
      </form><div id="ocr" style="margin-top:12px"></div></div>
      <h2 class="sec-h" id="own-buy">💸 الضرائب والرسوم على المشتري</h2>${tbl(OWN_TAXES.buyer, H)}
      <h2 class="sec-h" id="own-sell">🏷️ الضرائب على البائع</h2>${tbl(OWN_TAXES.seller, H)}
      <h2 class="sec-h" id="own-year">📆 الضرائب السنوية على المالك</h2>${tbl(OWN_TAXES.yearly, H)}
      <div class="card card-pad" style="margin-top:16px"><b>📚 المصادر</b><ul class="own-list">${OWN_SOURCES.map(s => `<li><a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a></li>`).join('')}</ul>
        <p class="muted" style="font-size:12.5px;margin-bottom:0">⚠️ معلومات إرشادية محينة لـ 2026. النسب كتبدل مع قوانين المالية — تأكد دائما مع الموثق ولا مصلحة الضرائب قبل التوقيع.</p></div>`;
    const f = $('#oc');
    bindMoney(f);
    const draw = () => { $('#ocr').innerHTML = ownCalc(collect(f)); };
    $$('input, select', f).forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', draw));
    f.onsubmit = e => e.preventDefault();
    $$('.chips a[href^="#own-"]').forEach(a => a.onclick = e => { e.preventDefault(); const t = $(a.getAttribute('href')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    draw();
  }

  /* ============================================================
     طباعة العقود 📄 + تعلم مهنة الوكيل العقاري 🎓 (ملفات PDF)
     ============================================================ */
  const CONTRACTS = [
    { f: '01-bail-habitation', ar: 'عقد كراء عقار سكني', fr: "Contrat de bail à usage d'habitation", law: 'القانون 67.12', ic: '🏠' },
    { f: '02-bail-commercial', ar: 'عقد كراء عقار مهني أو تجاري', fr: 'Bail commercial ou professionnel', law: 'القانون 49.16', ic: '🏪' },
    { f: '03-promesse-vente', ar: 'عقد الوعد بالبيع (اتفاقية مبدئية)', fr: 'Promesse / compromis de vente', law: 'ظ.ل.ع', ic: '🤝' },
    { f: '04-vente-definitive', ar: 'عقد بيع عقار (نهائي)', fr: 'Contrat de vente définitif', law: 'القانون 39.08', ic: '🔑' },
    { f: '05-hypotheque', ar: 'عقد الرهن الرسمي (الرهن العقاري)', fr: "Contrat d'hypothèque", law: 'القانون 39.08', ic: '🏦' },
    { f: '06-mandat-agence', ar: 'عقد وكالة (تفويض) لبيع أو كراء عقار', fr: 'Mandat de vente / location', law: 'ظ.ل.ع', ic: '📝' },
    { f: '07-gestion-locative', ar: 'عقد تسيير وتدبير الأملاك العقارية', fr: 'Contrat de gestion locative', law: 'ظ.ل.ع', ic: '🗂️' },
    { f: '08-recu-acompte', ar: 'وصل استلام مبلغ (تسبيق / عربون)', fr: "Reçu d'acompte / arrhes", law: '', ic: '🧾' },
    { f: '09-bail-meuble', ar: 'عقد كراء شقة مفروشة (قصيرة / موسمية)', fr: 'Location meublée / saisonnière', law: 'ق.ل.ع + 67.12', ic: '🛋️', g: 'rent' },
    { f: '10-etat-des-lieux', ar: 'محضر معاينة حالة العقار (دخول / خروج)', fr: 'État des lieux', law: '67.12', ic: '📋', g: 'rent' },
    { f: '11-quittance-loyer', ar: 'وصل أداء واجب الكراء', fr: 'Quittance de loyer', law: '67.12', ic: '🧾', g: 'rent' },
    { f: '12-mise-en-demeure-loyer', ar: 'إنذار بأداء واجبات الكراء', fr: 'Mise en demeure de payer', law: '67.12', ic: '⚠️', g: 'rent' },
    { f: '13-resiliation-bail', ar: 'اتفاق فسخ عقد الكراء بالتراضي', fr: 'Résiliation amiable du bail', law: 'ق.ل.ع', ic: '🔚', g: 'rent' },
    { f: '20-cession-droit-bail', ar: 'تفويت حق الكراء التجاري (الساروت)', fr: 'Cession de droit au bail', law: '49.16', ic: '🏪', g: 'rent' },
    { f: '14-reservation-vefa', ar: 'عقد حجز عقار في طور الإنجاز', fr: 'Contrat de réservation (VEFA)', law: '44.00 / 107.12', ic: '🏗️', g: 'sale' },
    { f: '23-offre-achat', ar: 'عرض شراء عقار', fr: "Offre d'achat", law: 'ق.ل.ع', ic: '💬', g: 'sale' },
    { f: '15-echange-immeuble', ar: 'عقد مبادلة عقار', fr: "Contrat d'échange", law: 'ق.ل.ع + 39.08', ic: '🔁', g: 'sale' },
    { f: '16-donation-immeuble', ar: 'نموذج عقد هبة عقار', fr: 'Donation immobilière', law: '39.08', ic: '🎁', g: 'sale' },
    { f: '17-procuration-speciale', ar: 'وكالة خاصة لبيع أو شراء عقار', fr: 'Procuration spéciale', law: 'ق.ل.ع', ic: '✒️', g: 'agency' },
    { f: '18-bon-de-visite', ar: 'سند زيارة عقار (حماية حق الوكالة)', fr: 'Bon de visite', law: 'ق.ل.ع', ic: '👣', g: 'agency' },
    { f: '19-mandat-recherche', ar: 'اتفاقية بحث عن عقار وأتعاب الوساطة', fr: 'Mandat de recherche', law: 'ق.ل.ع', ic: '🔎', g: 'agency' },
    { f: '21-contrat-travaux', ar: 'عقد مقاولة أشغال بناء أو إصلاح', fr: "Contrat d'entreprise (travaux)", law: 'ق.ل.ع', ic: '🧱', g: 'other' },
    { f: '22-avenant', ar: 'ملحق تعديل عقد', fr: 'Avenant au contrat', law: 'ق.ل.ع', ic: '📎', g: 'other' },
  ];
  const CT_GROUPS = [['base', '📘 الدليل الأساسي (01–08)'], ['rent', '🏠 الكراء'], ['sale', '🔑 البيع والشراء'], ['agency', '🤝 الوكالة والوساطة'], ['other', '🧱 أخرى']];
  const MODULES = [
    { m: 'M1', ar: 'القانون العقاري وعقود البيع', d: '3 أيام · 21 ساعة', parts: ['الإطار القانوني للعقارات فالمغرب', 'عقد البيع: المراحل والالتزامات', 'حقوق الرهن والضمانات', 'الملكية المشتركة', 'قانون الكراء السكني والتجاري', 'المسؤولية والأخطاء المهنية'] },
    { m: 'M2', ar: 'التعمير والتشخيص التقني للعقارات', d: 'يومان · 14 ساعة', parts: ['أنظمة التعمير والتخطيط العمراني', 'رخص البناء والتجزئة وتغيير الاستعمال', 'الشهادات والمستندات الإدارية للعقار', 'التشخيص التقني الإلزامي', 'قراءة مخططات البناء والتدقيق التقني'] },
    { m: 'M3', ar: 'تقييم وخبرة العقارات', d: '3 أيام · 21 ساعة', parts: ['مبادئ التقييم العقاري وأهميته', 'طريقة المقارنة البيعية', 'طريقة رسملة الإيرادات', 'طريقة التكلفة للعقارات الجديدة', 'العوامل المؤثرة فالقيمة العقارية', 'إعداد تقرير الرأي فالقيمة'] },
    { m: 'M4', ar: 'التجارة والتنقيب العقاري', d: '3 أيام · 21 ساعة', parts: ['تقنيات التنقيب عن العملاء', 'بناء شبكة العلاقات المهنية', 'تقنيات التفاوض العقاري', 'إدارة ملف البيع من A إلى Z', 'خدمة العملاء والاحتفاظ بهم', 'مؤشرات الأداء والتحليل التجاري'] },
    { m: 'M5', ar: 'التسويق العقاري والرقمنة', d: '3 أيام · 21 ساعة', parts: ['أسس التسويق العقاري', 'التسويق الرقمي ووسائل التواصل الاجتماعي', 'إنشاء المحتوى العقاري الاحترافي', 'الإعلانات المدفوعة والاستهداف', 'الموقع الإلكتروني والمنصات العقارية', 'التحليل الرقمي وقياس النتائج'] },
    { m: 'M6', ar: 'التمويل العقاري وتيسير الحصول على القرض', d: '3 أيام · 21 ساعة', parts: ['أنواع التمويل العقاري فالمغرب', 'القروض البنكية ومعايير الأهلية', 'حساب القدرة الاقتراضية', 'الرهن العقاري والضمانات', 'مرافقة العميل فالحصول على التمويل', 'التخطيط المالي للمستثمر العقاري'] },
  ];
  // طباعة PDF مباشرة (iframe)، وإلا كيتحل فصفحة جديدة
  function printPdf(url) {
    if (/iPhone|iPad|Android/i.test(navigator.userAgent)) { window.open(url, '_blank'); toast('من الملف: زر المشاركة ⬆️ ← «طباعة»', 4000); return; }
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    fr.src = url;
    fr.onload = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { window.open(url, '_blank'); } setTimeout(() => fr.remove(), 60000); };
    document.body.appendChild(fr);
  }
  const docBtns = (url, name) => `<div class="btn-row">
      <a class="btn sm" href="${url}" target="_blank" rel="noopener">${ic('eye', 15)} عرض</a>
      <a class="btn sm gold" href="${url}" download="${esc(name)}">${ic('download', 15)} تحميل</a>
      <button class="btn sm" data-print="${url}">${ic('print', 15)} طباعة</button></div>`;
  function bindPrint(root) { $$('[data-print]', root).forEach(b => b.onclick = () => printPdf(b.dataset.print)); }
  function viewContracts() {
    const card = (c) => `
        <div class="card card-pad doc-card">
          <div class="doc-ic">${c.ic}</div>
          <div class="grow"><small class="muted">${c.f.slice(0, 2)}${c.law ? ' · ' + esc(c.law) : ''}</small><b>${esc(c.ar)}</b><small class="muted" dir="ltr" style="text-align:right">${esc(c.fr)}</small>
          ${docBtns(`files/contrats/${c.f}.pdf`, `AlWasset777-${c.f}.pdf`)}</div>
        </div>`;
    main().innerHTML = `
      <div class="page-head"><h1>📄 طباعة العقود</h1><span class="badge gold">${CONTRACTS.length} نموذج</span></div>
      <p class="muted" style="margin-top:-6px">نماذج عقود جاهزة بالعربية (والعنوان بالفرنسية) ديال وكالة الوسيط 777. حمّل، عمّر الفراغات، وطبع.</p>
      <div class="doc-grid" style="margin-bottom:14px">
        <div class="card card-pad doc-card" style="border-color:var(--gold)"><div class="doc-ic">📚</div>
          <div class="grow"><b>دليل العقود — الجزء 1 (17 صفحة)</b><small class="muted">العقود 01 حتى 08</small>${docBtns('files/contrats/00-recueil-complet.pdf', 'AlWasset777-Recueil-1.pdf')}</div></div>
        <div class="card card-pad doc-card" style="border-color:var(--gold)"><div class="doc-ic">📗</div>
          <div class="grow"><b>دليل العقود — الجزء 2 (20 صفحة)</b><small class="muted">العقود 09 حتى 23</small>${docBtns('files/contrats/00b-recueil-complementaire.pdf', 'AlWasset777-Recueil-2.pdf')}</div></div>
      </div>
      ${CT_GROUPS.map(([g, t]) => `<h2 class="sec-h">${t}</h2><div class="doc-grid">${CONTRACTS.filter(c => (c.g || 'base') === g).map(card).join('')}</div>`).join('')}
      <p class="muted" style="font-size:12.5px;margin-top:14px">⚠️ نماذج إرشادية: العقود المهمة (البيع النهائي، الهبة، المبادلة، الرهن) خاصهم يتحرّرو عند موثق أو عدول أو محامي مقبول لدى محكمة النقض.</p>`;
    bindPrint(main());
  }
  function viewLearn() {
    let done = {};
    try { done = JSON.parse(localStorage.getItem('w777_learn') || '{}'); } catch (e) { /* */ }
    const n = MODULES.filter(x => done[x.m]).length;
    main().innerHTML = `
      <div class="page-head"><h1>🎓 تعلم مهنة الوكيل العقاري</h1></div>
      <div class="card card-pad" style="margin-bottom:14px">
        <b>برنامج تكوين الوكيل العقاري المحترف — وكالة الوسيط 777، مكناس</b>
        <p class="muted" style="margin:6px 0 10px">6 وحدات · 17 يوم · 119 ساعة. حل كل وحدة، قراها، ومن بعد علّم عليها ✓.</p>
        <div class="track learn-track"><div class="fill" style="width:${n / MODULES.length * 100}%"></div></div>
        <small class="muted">${n} / ${MODULES.length} وحدات مكملة</small>
      </div>
      <div class="doc-grid">${MODULES.map(x => `
        <div class="card card-pad doc-card ${done[x.m] ? 'done' : ''}">
          <div class="doc-ic mod">${x.m}</div>
          <div class="grow"><b>${esc(x.ar)}</b><small class="muted">⏱️ ${esc(x.d)}</small>
            <ol class="mod-parts">${x.parts.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
            ${docBtns(`files/formation/${x.m}.pdf`, `AlWasset777-Formation-${x.m}.pdf`)}
            <label class="learn-done"><input type="checkbox" data-done-m="${x.m}" ${done[x.m] ? 'checked' : ''}> قريت هاد الوحدة ✓</label>
          </div>
        </div>`).join('')}</div>`;
    bindPrint(main());
    $$('[data-done-m]').forEach(cb => cb.onchange = () => {
      done[cb.dataset.doneM] = cb.checked ? Date.now() : undefined;
      try { localStorage.setItem('w777_learn', JSON.stringify(done)); } catch (e) { /* */ }
      viewLearn();
    });
  }

  /* ============================================================
     مقارنة الثمن مع السوق 📊 (درهم/م² — للبيع فقط)
     ============================================================ */
  const MKT_CLS = { apartment: 0, house: 1 };
  const mktCats = { apartment: 'شقة', house: 'فيلا / منزل', land: 'أرض / بقعة', commercial: 'تجاري', building: 'عمارة', tourism: 'سياحي', industrial: 'صناعي', agri: 'فلاحي', room: 'أخرى' };
  function marketRef(city, district, type) {
    if (!city) return null;
    const cat = catOf(type);
    const cu = S.settings.marketCustom || {};
    const dn = norm(district || '');
    if (district && cu[`${city}|${district}|${cat}`]) return { v: cu[`${city}|${district}|${cat}`], where: district, src: 'custom' };
    const cls = MKT_CLS[cat];
    if (cls !== undefined && dn) {
      for (const [keys, apt, villa] of (D.MARKET.districts[city] || [])) {
        if (!keys.some(k => dn.includes(norm(k)))) continue;
        const v = cls === 0 ? apt : villa;
        if (v) return { v, where: district, src: 'district' };
        break; // الحي معروف ولكن بلا معطيات لهاد النوع ← المدينة
      }
    }
    if (cu[`${city}||${cat}`]) return { v: cu[`${city}||${cat}`], where: city, src: 'custom' };
    const c = D.MARKET.cities[city];
    if (cls !== undefined && c && c[cls]) return { v: c[cls], where: city, src: 'city' };
    return null;
  }
  function mktArea(p) {
    return catOf(p.type) === 'house' ? (num(p.areaBuilt) || num(p.areaUseful) || num(p.areaTotal)) : areaOf(p);
  }
  function marketCmp(p) {
    if (!p || !['sale', 'offplan'].includes(p.transaction)) return null;
    const price = num(p.priceMax) || num(p.priceMin), area = mktArea(p);
    const ref = marketRef(p.city, p.district, p.type);
    if (!price || !area || !ref) return { ref, area, price };
    const ppm = price / area;
    return { ppm, ref, area, price, diff: Math.round((ppm - ref.v) / ref.v * 100), est: ref.v * area };
  }
  const ltr = t => '\u2066' + t + '\u2069';
  // التطور الرسمي (ANCFCC × بنك المغرب) حسب المدينة والنوع
  const TREND_LBL = ['الشقق', 'الديور', 'الفيلات', 'الأراضي', 'المحلات التجارية', 'المكاتب', 'كل العقارات'];
  function trendOf(city, type) {
    const t = D.MARKET.trend, cat = catOf(type);
    const i = cat === 'apartment' ? 0 : cat === 'house' ? (/villa|bungalow|palace|chalet/.test(type) ? 2 : 1) : cat === 'land' ? 3 : cat === 'commercial' ? (/office|plateau|cabinet/.test(type) ? 5 : 4) : 6;
    const row = t.cities[city];
    let v = row ? row[i] : null, where = city, k = i;
    if (row && v == null) { v = row[6]; k = 6; }
    if (v == null) { v = t.national[i === 6 ? 0 : i]; where = 'المغرب'; }
    return { v, where, lbl: TREND_LBL[k], period: t.period, url: t.url };
  }
  function trendLine(city, type) {
    const t = trendOf(city, type);
    const arrow = t.v > 0 ? '📈' : t.v < 0 ? '📉' : '➖';
    return `<p class="muted" style="font-size:13px;margin:10px 0 0">${arrow} <b>التطور الرسمي:</b> أثمنة ${esc(t.lbl)} فـ ${esc(t.where)} ${t.v > 0 ? 'طلعات' : t.v < 0 ? 'نزلات' : 'بقات مستقرة'} <b>${ltr((t.v > 0 ? '+' : '') + t.v + '%')}</b> فـ ${esc(t.period)} — <a href="${t.url}" target="_blank" rel="noopener">ANCFCC × بنك المغرب</a></p>`;
  }
  const mktTone = d => d <= -5 ? 'down' : d >= 5 ? 'up' : 'eq';
  function mktBadge(p) {
    const m = marketCmp(p);
    if (!m || m.diff === undefined) return '';
    const t = mktTone(m.diff);
    return `<span class="mkt ${t}" title="مقارنة مع ثمن السوق فـ ${esc(m.ref.where)}">${t === 'down' ? ltr('▼ ' + Math.abs(m.diff) + '%') : t === 'up' ? ltr('▲ +' + m.diff + '%') : '≈ السوق'}</span>`;
  }
  function mktCard(p) {
    if (!['sale', 'offplan'].includes(p.transaction)) return '';
    const m = marketCmp(p);
    const srcLbl = { custom: 'ثمن مرجعي ديالك', district: 'معدل الحي', city: 'معدل المدينة' };
    let body;
    if (!m || !m.ref) body = `<p class="muted" style="margin:0">ما عندناش ثمن مرجعي لـ «${esc(mktCats[catOf(p.type)] || '')}» فـ ${esc(p.district || p.city || '—')}. تقدر تزيدو أنت ⬇️</p>`;
    else if (m.diff === undefined) body = `<p class="muted" style="margin:0">ثمن السوق فـ ${esc(m.ref.where)}: <b>${fmt(m.ref.v)} درهم/م²</b>. زيد ${!m.price ? 'الثمن' : 'المساحة'} باش نقارنو.</p>`;
    else {
      const t = mktTone(m.diff);
      const msg = t === 'down' ? `الثمن <b>ناقص بـ ${Math.abs(m.diff)}%</b> على السوق — فرصة 👍` : t === 'up' ? `الثمن <b>زايد بـ ${m.diff}%</b> على السوق` : 'الثمن <b>فمستوى السوق</b> ✓';
      body = `<div class="mkt-big ${t}"><b>${ltr(t === 'down' ? '▼ ' + Math.abs(m.diff) + '%' : t === 'up' ? '▲ +' + m.diff + '%' : '≈ ' + m.diff + '%')}</b><span>${msg}</span></div>
        <div class="kv" style="margin-top:12px">
          <div><small>ثمن المتر ديال هاد العقار</small><b>${fmt(Math.round(m.ppm))} د/م²</b></div>
          <div><small>${srcLbl[m.ref.src]} (${esc(m.ref.where)})</small><b>${fmt(m.ref.v)} د/م²</b></div>
          <div><small>القيمة حسب السوق (${fmt(m.area)} م²)</small><b>${esc(millions(m.est) || fmt(Math.round(m.est)))}</b></div>
        </div>`;
    }
    return `<div class="card card-pad no-print" id="mkt-card">
      <div class="pair-head" style="padding:0 0 10px;border:0"><b>📊 مقارنة مع ثمن السوق</b><button class="btn sm" id="mkt-edit">${ic('edit', 14)} الثمن المرجعي</button></div>
      ${body}
      ${p.city ? trendLine(p.city, p.type) : ''}
      <p class="muted" style="font-size:12px;margin:10px 0 0">المصادر: ${D.MARKET.sources.map(s => `<a href="${s.u}" target="_blank" rel="noopener">${esc(s.n.split(' — ')[0])}</a>`).join(' · ')} (${D.MARKET.updated}). أثمنة تقريبية: الحالة، الطابق والتشطيب كيأثرو.</p>
    </div>`;
  }
  // تصحيح / زيادة ثمن مرجعي (كيتزامن مع الإعدادات)
  function editMarketRef(city, district, type, done) {
    const cat = catOf(type), r = marketRef(city, district, type);
    modal(`<h3>📊 الثمن المرجعي — ${esc(mktCats[cat] || '')}</h3>
      <p class="muted" style="margin-top:0">${esc(district ? district + '، ' : '')}${esc(city)} — درهم للمتر المربع</p>
      <form id="mr" class="form-grid">${fInput('v', 'ثمن المتر (درهم/م²)', r ? r.v : '', { type: 'number', req: true })}
        ${district ? fSelect('lvl', 'يطبّق على', [{ v: 'd', l: 'هاد الحي فقط' }, { v: 'c', l: 'المدينة كاملة' }], 'd', { noEmpty: true }) : ''}</form>
      <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="mr-ok">${ic('check', 16)} حفظ</button>${r && r.src === 'custom' ? '<button class="btn danger" id="mr-del">رجوع للمصدر</button>' : ''}</div>`, (box, close) => {
      const key = () => { const v = collect($('#mr', box)); return v.lvl === 'c' || !district ? `${city}||${cat}` : `${city}|${district}|${cat}`; };
      const save = async val => {
        const cu = Object.assign({}, S.settings.marketCustom || {});
        if (val) cu[key()] = val; else { delete cu[`${city}|${district}|${cat}`]; delete cu[`${city}||${cat}`]; }
        S.settings.marketCustom = cu; S.settings.updatedAt = new Date().toISOString();
        await DB.setMeta('settings', S.settings); await DB.markDirty('meta', 'settings');
        close(); toast('تم الحفظ ✓'); done && done();
      };
      $('#mr-ok', box).onclick = () => { const v = num(collect($('#mr', box)).v); if (v > 0) save(Math.round(v)); };
      const d = $('#mr-del', box); if (d) d.onclick = () => save(null);
    });
  }
  // صفحة «مقارنة الثمن»: أي عقار (حتى ماشي ديالنا)
  function viewEstimate(query) {
    const city = query.city || S.settings.officeCity || 'مكناس';
    main().innerHTML = `
      <div class="page-head"><h1>📊 مقارنة الثمن مع السوق</h1></div>
      <div class="card card-pad form">
        <form id="ef" class="form-grid">
          ${fSelect('city', 'المدينة', [], city, { groups: cityGroups(), noEmpty: true })}
          ${fInput('district', 'الحي', query.district || '', { list: 'ef-ds', ph: 'مثال: المنزه، مرجان…' })}
          ${fSelect('type', 'نوع العقار', D.PROPERTY_TYPES.map(t => ({ v: t.id, l: t.ar })), query.type || 'apartment', { noEmpty: true })}
          ${fInput('area', 'المساحة (م²)', query.area || '', { type: 'number' })}
          ${fInput('price', 'الثمن المطلوب (درهم)', query.price || '', { money: true })}
        </form>
        <datalist id="ef-ds"></datalist>
        <div id="eres" style="margin-top:14px"></div>
      </div>
      <div id="etr" style="margin-top:16px"></div>
      <div class="card" id="etab"></div>`;
    bindMoney(main());
    const form = $('#ef');
    const draw = () => {
      const v = collect(form);
      $('#ef-ds').innerHTML = districtsOf(v.city).map(d => `<option value="${esc(d)}">`).join('');
      const p = { transaction: 'sale', city: v.city, district: v.district, type: v.type, priceMin: v.price, areaTotal: v.area, areaBuilt: v.area };
      const m = marketCmp(p);
      let h;
      if (!m || !m.ref) h = `<p class="muted">ما كاينش ثمن مرجعي لهاد النوع فهاد البلاصة. <button class="btn sm" id="e-edit">${ic('plus', 14)} زيد ثمن مرجعي</button></p>`;
      else if (m.diff === undefined) h = `<div class="kv"><div><small>ثمن السوق (${esc(m.ref.where)})</small><b>${fmt(m.ref.v)} د/م²</b></div>${m.area ? `<div><small>القيمة حسب السوق</small><b>${esc(millions(m.ref.v * m.area) || fmt(m.ref.v * m.area))}</b></div>` : ''}</div><p class="muted">دخل المساحة والثمن باش تعرف واش ناقص ولا زايد.</p>`;
      else {
        const t = mktTone(m.diff);
        h = `<div class="mkt-big ${t}"><b>${ltr(t === 'down' ? '▼ ' + Math.abs(m.diff) + '%' : t === 'up' ? '▲ +' + m.diff + '%' : '≈ ' + m.diff + '%')}</b><span>${t === 'down' ? 'ناقص على السوق — فرصة 👍' : t === 'up' ? 'زايد على السوق' : 'فمستوى السوق ✓'}</span></div>
          <div class="kv" style="margin-top:12px"><div><small>ثمن المتر المطلوب</small><b>${fmt(Math.round(m.ppm))} د/م²</b></div>
          <div><small>ثمن السوق (${esc(m.ref.where)})</small><b>${fmt(m.ref.v)} د/م²</b></div>
          <div><small>القيمة حسب السوق</small><b>${esc(millions(m.est) || fmt(Math.round(m.est)))}</b></div></div>`;
      }
      $('#eres').innerHTML = h + trendLine(v.city, v.type) + `<button class="btn sm" id="e-edit2" style="margin-top:10px">${ic('edit', 14)} تصحيح الثمن المرجعي</button>`;
      [$('#e-edit'), $('#e-edit2')].forEach(b => b && (b.onclick = () => editMarketRef(v.city, v.district, v.type, draw)));
      const rows = D.MARKET.districts[v.city] || [];
      const c = D.MARKET.cities[v.city];
      const tr = D.MARKET.trend.cities[v.city];
      const trHtml = tr ? `<div class="card card-pad" style="margin-bottom:16px"><b>📊 التطور الرسمي فـ ${esc(v.city)} — ${esc(D.MARKET.trend.period)}</b>
        <div class="kv" style="margin-top:10px">${tr.map((x, i) => x == null ? '' : `<div><small>${TREND_LBL[i]}</small><b style="color:${x > 0 ? 'var(--green)' : x < 0 ? 'var(--red)' : 'inherit'}">${ltr((x > 0 ? '+' : '') + x + '%')}</b></div>`).join('')}</div>
        <p class="muted" style="font-size:12px;margin:8px 0 0">المصدر الرسمي: <a href="${D.MARKET.trend.url}" target="_blank" rel="noopener">مؤشر أثمنة الأصول العقارية — بنك المغرب × ANCFCC</a></p></div>` : '';
      $('#etr').innerHTML = trHtml;
      $('#etab').innerHTML = `<div class="pair-head"><b>أثمنة المتر فـ ${esc(v.city)} (للبيع)</b>${c ? `<span class="muted" style="font-size:13px">المعدل: شقة ${fmt(c[0])} · فيلا ${fmt(c[1])}</span>` : ''}</div>
        ${rows.filter(r => r[1] || r[2]).map(r => `<div class="list-row"><div class="grow"><b>${esc(r[0][0])}</b></div><small>شقة: <b>${r[1] ? fmt(r[1]) : '—'}</b></small><small>فيلا: <b>${r[2] ? fmt(r[2]) : '—'}</b></small></div>`).join('') || (c ? '' : '<div class="empty" style="padding:20px">ما كاينش معطيات لهاد المدينة</div>')}`;
    };
    $$('input, select', form).forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', draw));
    form.onsubmit = e => e.preventDefault();
    draw();
  }

  /* ============================================================
     المواعيد + التنبيهات ⏰
     ============================================================ */
  const APPT_TYPES = { visit: '🏠 زيارة عقار', meeting: '🤝 لقاء فالمكتب', call: '📞 مكالمة', signing: '✍️ توقيع / موثق', other: '📌 أخرى' };
  const APPT_STATUS = { planned: { ar: 'مبرمج', c: 'blue' }, done: { ar: 'تم', c: 'green' }, cancelled: { ar: 'ملغى', c: 'red' } };
  const REMIND = [{ v: '0', l: 'فالوقت' }, { v: '15', l: '15 دقيقة قبل' }, { v: '30', l: '30 دقيقة قبل' }, { v: '60', l: 'ساعة قبل' }, { v: '120', l: 'ساعتين قبل' }, { v: '1440', l: 'نهار قبل' }];
  const apptStart = a => new Date(`${a.date}T${a.time || '09:00'}:00`);
  const apptWhen = a => {
    const d = apptStart(a);
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const tm = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const lbl = a.date === today() ? 'اليوم' : a.date === tm ? 'غدا' : days[d.getDay()] + ' ' + a.date;
    return `${lbl} · ${a.time || ''}`;
  };
  function apptCard(a) {
    const st = APPT_STATUS[a.status] || APPT_STATUS.planned;
    const late = a.status === 'planned' && apptStart(a) < new Date();
    const c = a.client || {};
    const p = a.propId && S.props.find(x => x.id === a.propId);
    return `<div class="card card-pad appt ${late ? 'late' : ''}" data-appt="${a.id}">
      <div class="appt-when"><b>${esc(a.time || '—')}</b><small>${esc(apptWhen(a).split(' · ')[0])}</small></div>
      <div class="grow">
        <b>${esc(c.name || 'زبون')}</b> <span class="badge ${st.c}">${esc(st.ar)}</span>${late ? ' <span class="badge amber">فات الوقت</span>' : ''}
        <div class="muted" style="font-size:13px">${esc(APPT_TYPES[a.type] || '')}${a.place ? ' · 📍 ' + esc(a.place) : ''}${p ? ' · ' + esc(p.ref) : ''}${a.remind !== undefined && a.remind !== '' ? ' · ⏰ ' + esc((REMIND.find(r => r.v === String(a.remind)) || {}).l || '') : ''}</div>
        ${a.notes ? `<div class="muted" style="font-size:13px">📝 ${esc(a.notes)}</div>` : ''}
        <div class="btn-row" style="margin-top:8px">
          ${c.phone ? `<a class="btn sm" href="${telLink(c.phone)}">${ic('phone', 15)}</a><a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(c.phone)}?text=${encodeURIComponent(apptMsg(a))}">${ic('wa', 15)} تذكير الزبون</a>` : ''}
          <button class="btn sm" data-ics="${a.id}">${ic('calendar', 15)} للتقويم</button>
          ${a.status === 'planned' ? `<button class="btn sm" data-done="${a.id}">${ic('check', 15)} تم</button>` : ''}
          <a class="btn sm" href="#/appointment/${a.id}">${ic('edit', 15)}</a>
          ${a.reqId ? `<a class="btn sm" href="#/request/${a.reqId}">الطلب</a>` : ''}${p ? `<a class="btn sm" href="#/property/${p.id}">العقار</a>` : ''}
        </div>
      </div></div>`;
  }
  function apptMsg(a) {
    const p = a.propId && S.props.find(x => x.id === a.propId);
    return `السلام عليكم ${(a.client && a.client.name) || ''}،\nكنذكّروك بالموعد ديالنا ${apptWhen(a)}${a.place ? ' فـ ' + a.place : ''}${p ? ' (' + (p.title || typeAr(p.type)) + ')' : ''}.\n${S.settings.officeName} — ${S.settings.officePhone}`;
  }
  function apptIcs(a) {
    const d = apptStart(a), e = new Date(d.getTime() + 3600000);
    const z = x => x.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const t = s => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const c = a.client || {};
    const rem = num(a.remind);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AlWasset777//Bureau//AR', 'BEGIN:VEVENT', 'UID:' + a.id + '@alwasset777', 'DTSTAMP:' + z(new Date()),
      'DTSTART:' + z(d), 'DTEND:' + z(e), 'SUMMARY:' + t(`موعد: ${c.name || ''} — ${(APPT_TYPES[a.type] || '').replace(/^\S+\s/, '', { noEmpty: true })}`),
      'LOCATION:' + t(a.place), 'DESCRIPTION:' + t([c.phone && 'الهاتف: ' + c.phone, a.notes].filter(Boolean).join('\n')),
      ...(rem !== null ? ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + t('موعد ' + (c.name || '')), 'TRIGGER:-PT' + rem + 'M', 'END:VALARM'] : []),
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function bindApptButtons(root, rerender) {
    $$('[data-ics]', root).forEach(b => b.onclick = () => {
      const a = S.appts.find(x => x.id === b.dataset.ics);
      download(new Blob([apptIcs(a)], { type: 'text/calendar' }), `rdv-${a.date}-${(a.time || '').replace(':', 'h')}.ics`);
      toast('حل الملف باش يتزاد فـ Calendar ديال الهاتف ⏰', 3500);
    });
    $$('[data-done]', root).forEach(b => b.onclick = async () => {
      const a = S.appts.find(x => x.id === b.dataset.done);
      a.status = 'done'; await DB.saveRec('appointments', a); toast('✓ تم الموعد'); rerender();
    });
  }
  function viewAppts(query) {
    const f = query.f || 'upcoming';
    let list = S.appts.slice();
    if (f === 'upcoming') list = list.filter(a => a.status === 'planned').sort((a, b) => apptStart(a) - apptStart(b));
    else if (f === 'today') list = list.filter(a => a.date === today()).sort((a, b) => apptStart(a) - apptStart(b));
    else list = list.sort((a, b) => apptStart(b) - apptStart(a));
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const tab = (k, l) => `<a class="chip ${f === k ? 'on' : ''}" href="#/appointments?f=${k}">${l}</a>`;
    main().innerHTML = `
      <div class="page-head"><h1>${ic('calendar', 24)} المواعيد</h1><a class="btn gold" href="#/appointment/new">${ic('plus', 18)} موعد جديد</a></div>
      ${perm === 'default' ? `<div class="card card-pad" style="margin-bottom:14px;border-color:var(--gold)"><b>⏰ فعّل التنبيهات</b>
        <p class="muted" style="margin:6px 0 10px">باش يبان ليك تنبيه فالوقت ديال كل موعد (والتطبيق محلول).</p><button class="btn gold sm" id="notif-on">تفعيل التنبيهات</button></div>` : ''}
      <div class="chips" style="margin-bottom:14px">${tab('upcoming', 'الجاية')}${tab('today', 'اليوم')}${tab('all', 'الكل')}</div>
      ${list.length ? `<div class="appt-list">${list.map(apptCard).join('')}</div>` : `<div class="card empty"><div class="big">📅</div><h3>ما كاين حتى موعد</h3><p>زيد موعد جديد وغادي نفكّرك فالوقت ⏰</p></div>`}
      <p class="muted" style="font-size:12.5px;margin-top:14px">💡 التنبيه داخل التطبيق كيخدم ملي يكون محلول. باش يرن الهاتف حتى والتطبيق مسدود، ضغط «للتقويم» وزيد الموعد لـ Calendar.</p>`;
    const n = $('#notif-on'); if (n) n.onclick = async () => { await Notification.requestPermission(); viewAppts(query); };
    bindApptButtons(main(), () => viewAppts(query));
  }
  async function viewApptForm(id, query = {}) {
    const ex = id && id !== 'new' ? S.appts.find(x => x.id === id) : null;
    if (id && id !== 'new' && !ex) { main().innerHTML = notFound(); return; }
    const r = query.req ? S.reqs.find(x => x.id === query.req) : null;
    const p0 = query.prop ? S.props.find(x => x.id === query.prop) : null;
    const a = ex || { date: today(), time: '10:00', type: p0 ? 'visit' : 'meeting', remind: '30', status: 'planned',
      client: r ? { name: (r.client || {}).name, phone: (r.client || {}).phone } : {}, reqId: r ? r.id : '', propId: p0 ? p0.id : '',
      place: p0 ? [p0.district, p0.city].filter(Boolean).join('، ') : '' };
    const c = a.client || {};
    const reqOpts = [{ v: '', l: '—' }, ...S.reqs.filter(openReq).map(x => ({ v: x.id, l: `${(x.client || {}).name || ''} · ${x.ref || ''}` }))];
    const propOpts = [{ v: '', l: '—' }, ...S.props.filter(x => x.status === 'available').map(x => ({ v: x.id, l: `${x.ref || ''} · ${x.title || typeAr(x.type)}` }))];
    main().innerHTML = `
      <div class="page-head"><a class="btn" href="#/appointments">${ic('back', 18)} المواعيد</a><h1 style="margin:0">${ex ? 'تعديل الموعد' : 'موعد جديد'}</h1></div>
      <form class="card card-pad form" id="af">
        <div class="form-grid">
          ${fInput('name', 'اسم الزبون', c.name, { req: true })}
          ${fInput('phone', 'هاتف الزبون', c.phone, { type: 'tel' })}
          ${fInput('date', 'التاريخ', a.date, { type: 'date', req: true })}
          ${fInput('time', 'الساعة', a.time, { type: 'time', req: true })}
          ${fSelect('type', 'نوع الموعد', Object.entries(APPT_TYPES).map(([v, l]) => ({ v, l })), a.type, { noEmpty: true })}
          ${fSelect('remind', 'التنبيه ⏰', REMIND, String(a.remind ?? '30'), { noEmpty: true })}
          ${fInput('place', 'المكان', a.place, { ph: 'مثال: المكتب، مرجان 2…' })}
          ${fSelect('status', 'الحالة', Object.entries(APPT_STATUS).map(([v, s]) => ({ v, l: s.ar })), a.status, { noEmpty: true })}
          ${fSelect('reqId', 'مرتبط بطلب (اختياري)', reqOpts, a.reqId, { noEmpty: true })}
          ${fSelect('propId', 'مرتبط بعقار (اختياري)', propOpts, a.propId, { noEmpty: true })}
          ${fText('notes', 'ملاحظات', a.notes)}
        </div>
        <div class="btn-row" style="margin-top:14px">
          <button class="btn gold" type="submit">${ic('check', 18)} حفظ</button>
          ${ex ? `<button class="btn danger" type="button" id="adel">${ic('trash', 18)} حذف</button>` : ''}
        </div>
      </form>`;
    const form = $('#af');
    $('[name=reqId]', form).onchange = e => {
      const rr = S.reqs.find(x => x.id === e.target.value); if (!rr) return;
      const nm = $('[name=name]', form), ph = $('[name=phone]', form);
      if (!nm.value) nm.value = (rr.client || {}).name || ''; if (!ph.value) ph.value = (rr.client || {}).phone || '';
    };
    form.onsubmit = async e => {
      e.preventDefault();
      const v = collect(form);
      if (!v.name || !v.date || !v.time) return toast('عمّر الاسم والتاريخ والساعة');
      const o = Object.assign(ex || { id: uid(), createdAt: new Date().toISOString() }, {
        client: { name: v.name, phone: v.phone || '' }, date: v.date, time: v.time, type: v.type, remind: v.remind,
        place: v.place || '', status: v.status || 'planned', reqId: v.reqId || '', propId: v.propId || '', notes: v.notes || '',
      });
      await DB.saveRec('appointments', o);
      await loadAll();
      toast('تم حفظ الموعد ✓');
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
      location.hash = '#/appointments';
    };
    const del = $('#adel');
    if (del) del.onclick = async () => {
      if (!(await confirmBox('حذف هاد الموعد؟', 'حذف'))) return;
      await DB.delRec('appointments', ex.id); await loadAll(); location.hash = '#/appointments';
    };
  }
  // كل 30 ثانية: واش كاين موعد وصل وقت التنبيه ديالو؟
  async function checkAlarms() {
    const done = await DB.getMeta('appt_notified', {});
    const now = Date.now();
    let changed = false;
    for (const a of S.appts) {
      if (a.status !== 'planned' || a.remind === undefined || a.remind === '') continue;
      const t = apptStart(a).getTime();
      const key = a.id + '@' + a.date + 'T' + a.time + '-' + a.remind;
      if (done[key] || now < t - num(a.remind) * 60000 || now > t + 3 * 3600000) continue;
      done[key] = now; changed = true;
      const body = `${(a.client || {}).name || ''} — ${apptWhen(a)}${a.place ? ' · ' + a.place : ''}`;
      toast('⏰ موعد: ' + body, 8000);
      try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) { /* */ }
      if ('Notification' in window && Notification.permission === 'granted') {
        const opt = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: key, data: { url: '#/appointments' }, requireInteraction: true };
        try {
          const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
          if (reg) await reg.showNotification('⏰ موعد ' + (APPT_TYPES[a.type] || ''), opt); else new Notification('⏰ موعد', opt);
        } catch (e) { /* */ }
      }
    }
    if (changed) {
      // ننقّيو المفاتيح القديمة
      Object.keys(done).forEach(k => { if (now - done[k] > 30 * 86400000) delete done[k]; });
      await DB.setMeta('appt_notified', done);
    }
  }

  /* ============================================================
     شبكة الوكالات العقارية (777 حساب)
     كل وكالة كتدخل بحسابها، كتزيد وتعدّل غير العقارات ديالها،
     وكتشوف عقارات الشبكة كاملة بلا اسم ولا هاتف المالك.
     ============================================================ */
  const AG_DOMAIN = '@alwasset777.ma';
  function loadRoleCache() {
    try {
      const c = JSON.parse(localStorage.getItem('w777_role') || 'null');
      const Sy = window.W777_SYNC;
      if (c && Sy && Sy.isOn() && c.u === Sy.uid()) { S.role = c.role; S.agency = c.agency; S.roleFor = c.u; }
    } catch (e) { /* */ }
  }
  async function refreshRole(force) {
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) { S.role = null; S.agency = null; S.roleFor = null; return 0; }
    const u = Sy.uid();
    if (!force && S.roleFor === u && S.roleAt && Date.now() - S.roleAt < 3600000) return 0;
    const before = S.role;
    try {
      const admin = await (await Sy.request('/rest/v1/rpc/w777_is_admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
      let ag = null;
      if (!admin) ag = (await (await Sy.request(`/rest/v1/w777_agencies?uid=eq.${u}&select=code,name,phone,active`)).json())[0] || null;
      S.role = admin === true ? 'admin' : ag ? 'agency' : 'solo';
      S.agency = ag; S.roleFor = u; S.roleAt = Date.now();
      localStorage.setItem('w777_role', JSON.stringify({ u, role: S.role, agency: ag }));
    } catch (e) { /* بدون إنترنت: نبقاو على اللي محفوظ */ }
    return before !== S.role ? 1 : 0;
  }
  const inNetwork = () => S.role === 'admin' || S.role === 'agency';
  const myAgencyName = () => S.role === 'agency' ? (S.agency && S.agency.name) || 'وكالة' : S.settings.officeName;
  const myAgencyPhone = () => S.role === 'agency' ? (S.agency && S.agency.phone) || '' : S.settings.officePhone;
  const hideDigits = s => String(s || '').replace(/(\+?\d[\d\s.\-/]{6,}\d)/g, '•••');
  function h32(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

  // كل مزامنة: نسخة «نقية» من العقارات المتاحة ديالي كتمشي للشبكة (بلا المالك، بلا ملاحظات، بلا GPS)
  async function publishShared() {
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) return 0;
    await refreshRole();
    if (!inNetwork()) return 0;
    const me = Sy.uid();
    const props = await DB.all('properties');
    const up = await DB.getMeta('sync_uploaded', {});
    const prev = await DB.getMeta('shared_hash', {});
    const prevOwner = await DB.getMeta('shared_owner', null);
    const known = prevOwner === me ? prev : {};
    const agency = myAgencyName(), phone = myAgencyPhone();
    const rows = [], next = {};
    for (const p of props) {
      if (p.status !== 'available' || p.partner || String(p.id).startsWith('pt-')) continue;
      const photos = (p.media || []).filter(m => m.kind === 'photo' && up[m.id]);
      const cv = p.cover && photos.find(m => m.id === p.cover);
      const ordered = cv ? [cv, ...photos.filter(m => m !== cv)] : photos;
      const data = {
        ref: p.ref, title: p.title, transaction: p.transaction, type: p.type, city: p.city, district: p.district,
        priceMin: p.priceMin, priceMax: p.priceMax, priceUnit: p.priceUnit, negotiable: p.negotiable,
        areaTotal: p.areaTotal, areaBuilt: p.areaBuilt, areaUseful: p.areaUseful, specs: p.specs || {}, features: p.features || [],
        description: hideDigits(p.description), createdAt: p.createdAt,
      };
      const row = { owner: me, id: p.id, agency, phone, city: p.city || null, type: p.type || null, trx: p.transaction || null,
        price: num(p.priceMax) || num(p.priceMin) || null, photo_ids: ordered.slice(0, 15).map(m => m.id), data, deleted: false };
      const h = h32(JSON.stringify(row));
      next[p.id] = h;
      if (known[p.id] !== h) rows.push(Object.assign(row, { updated_at: new Date().toISOString() }));
    }
    const gone = Object.keys(known).filter(id => !next[id]);
    for (let i = 0; i < rows.length; i += 100) {
      await Sy.request('/rest/v1/w777_shared_props?on_conflict=owner,id', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows.slice(i, i + 100)),
      });
    }
    for (let i = 0; i < gone.length; i += 100) {
      const ids = gone.slice(i, i + 100).map(x => '"' + String(x).replace(/"/g, '') + '"').join(',');
      await Sy.request(`/rest/v1/w777_shared_props?owner=eq.${me}&id=in.(${encodeURIComponent(ids)})`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ deleted: true, updated_at: new Date().toISOString() }),
      });
    }
    if (rows.length || gone.length || prevOwner !== me) { await DB.setMeta('shared_hash', next); await DB.setMeta('shared_owner', me); }
    if (rows.length || gone.length) S.net = null;
    return 0;
  }

  /* ---------- عرض الشبكة ---------- */
  const netUrl = new Map();
  async function loadNetwork(force) {
    const Sy = window.W777_SYNC;
    if (!force && S.net && Date.now() - S.netAt < 120000) return S.net;
    const me = Sy.uid();
    const out = [];
    for (let off = 0; ; off += 1000) {
      const res = await Sy.request(`/rest/v1/w777_shared_props?select=owner,id,agency,phone,city,type,trx,price,photo_ids,data,updated_at&deleted=eq.false&owner=neq.${me}&order=updated_at.desc`, { headers: { Range: `${off}-${off + 999}` } });
      const rows = await res.json();
      out.push(...rows);
      if (rows.length < 1000) break;
    }
    S.net = out; S.netAt = Date.now();
    return out;
  }
  async function netImg(owner, id, thumb) {
    const k = owner + '/' + id + (thumb ? '.t' : '');
    if (netUrl.has(k)) return netUrl.get(k);
    const pr = window.W777_SYNC.fetchPath(owner, id, thumb).then(b => b ? URL.createObjectURL(b) : null);
    netUrl.set(k, pr);
    return pr;
  }
  function hydrateNet(root) {
    const imgs = $$('img[data-net]', root);
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; io.unobserve(e.target); load(e.target);
    }), { rootMargin: '300px' }) : null;
    function load(img) {
      const [o, i] = img.dataset.net.split('/');
      netImg(o, i, true).then(u => { if (u) img.src = u; });
    }
    imgs.forEach(img => io ? io.observe(img) : load(img));
  }
  const netAsProp = x => Object.assign({}, x.data || {}, { transaction: x.trx || (x.data || {}).transaction, type: x.type || (x.data || {}).type, city: x.city || (x.data || {}).city });
  function netCard(x) {
    const p = netAsProp(x);
    const a = areaOf(p), sp = p.specs || {};
    const ph = (x.photo_ids || [])[0];
    return `<a class="card prop-card" href="#/agencies/p/${x.owner}/${encodeURIComponent(x.id)}">
      <div class="prop-cover">
        ${ph ? `<img data-net="${x.owner}/${esc(ph)}" alt="" loading="lazy">` : `<div class="ph">${ic('image', 40)}</div>`}
        <div class="tl"><span class="badge deal">${esc(trxShort(p.transaction))}</span><span class="badge blue">🏢 ${esc(x.agency || '')}</span>${mktBadge(p)}</div>
        ${p.ref ? `<span class="ref">${esc(p.ref)}</span>` : ''}
        ${(x.photo_ids || []).length ? `<span class="cnt">${ic('camera', 14)}${x.photo_ids.length}</span>` : ''}
      </div>
      <div class="prop-body">
        <div class="prop-price">${esc(priceText(p))}</div>
        <div class="prop-title">${esc(p.title || typeAr(p.type))}</div>
        <div class="prop-loc">${ic('pin', 15)} ${esc([p.district, p.city].filter(Boolean).join('، ') || '—')}</div>
        <div class="prop-specs"><span>${esc(typeAr(p.type))}</span>${a ? `<span>${ic('area', 15)} ${fmt(a)} م²</span>` : ''}${sp.bedrooms ? `<span>${ic('bed', 15)} ${sp.bedrooms}</span>` : ''}</div>
      </div></a>`;
  }
  async function viewAgencies(parts, query) {
    const Sy = window.W777_SYNC;
    if (EMBED || !Sy || !Sy.isOn()) {
      main().innerHTML = `<div class="page-head"><h1>${ic('building', 24)} الوكالات العقارية</h1></div>
        <div class="card empty"><div class="big">🏢</div><h3>دخل بالحساب ديالك أولا</h3>
        <p>الوكالات كيدخلو من «الإعدادات» ← «المزامنة السحابية» بالرمز (مثلا <b dir="ltr">agence001</b>) وكلمة السر.</p>
        <a class="btn gold" href="#/settings">${ic('lock', 18)} الدخول</a></div>`;
      return;
    }
    main().innerHTML = `<div class="card empty">جاري التحميل…</div>`;
    await refreshRole(true);
    if (!inNetwork()) { main().innerHTML = `<div class="card empty"><div class="big">🔒</div><h3>هاد الحساب ماشي مفعل فشبكة الوكالات</h3><p>تواصل مع مكتب الوسيط 777.</p></div>`; return; }
    if (parts[1] === 'p') return viewNetProp(parts[2], decodeURIComponent(parts[3] || ''));
    const tab = parts[1] === 'manage' && S.role === 'admin' ? 'manage' : parts[1] === 'me' ? 'me' : 'net';
    const tabs = `<div class="chips" style="margin-bottom:14px">
      <a class="chip ${tab === 'net' ? 'on' : ''}" href="#/agencies">🏘️ عقارات الشبكة</a>
      ${S.role === 'admin' ? `<a class="chip ${tab === 'manage' ? 'on' : ''}" href="#/agencies/manage">🔑 إدارة الوكالات (777)</a>` : `<a class="chip ${tab === 'me' ? 'on' : ''}" href="#/agencies/me">🏢 وكالتي</a>`}
    </div>`;
    const head = `<div class="page-head"><h1>${ic('building', 24)} الوكالات العقارية</h1>
      <span class="badge ${S.role === 'admin' ? 'gold' : 'blue'}">${S.role === 'admin' ? '👑 المدير' : '🏢 ' + esc(myAgencyName())}</span></div>${tabs}`;
    if (tab === 'manage') return viewAgManage(head, query);
    if (tab === 'me') return viewAgMe(head);
    let list;
    try { list = await loadNetwork(query.r === '1'); } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    const f = Object.assign({ q: '', trx: '', cat: '', city: '', ag: '' }, S.netFilters || {});
    const agencies = [...new Set(list.map(x => x.agency).filter(Boolean))].sort();
    const cities = [...new Set(list.map(x => x.city).filter(Boolean))].sort();
    main().innerHTML = head + `
      <div class="card card-pad" style="margin-bottom:14px">
        <form id="nf" class="form-grid">
          ${fInput('q', 'بحث', f.q, { ph: 'حي، نوع، ثمن، وكالة…' })}
          ${fSelect('trx', 'العملية', [{ v: '', l: 'الكل' }, ...D.TRANSACTIONS.map(t => ({ v: t.id, l: t.ar }))], f.trx, { noEmpty: true })}
          ${fSelect('cat', 'الصنف', [{ v: '', l: 'الكل' }, ...Object.entries(D.CATEGORIES).map(([v, c]) => ({ v, l: c.ar }))], f.cat, { noEmpty: true })}
          ${fSelect('city', 'المدينة', [{ v: '', l: 'الكل' }, ...cities.map(c => ({ v: c, l: c }))], f.city, { noEmpty: true })}
          ${fSelect('ag', 'الوكالة', [{ v: '', l: 'الكل' }, ...agencies.map(c => ({ v: c, l: c }))], f.ag, { noEmpty: true })}
        </form>
        <div class="btn-row" style="margin-top:10px"><span class="muted" id="ncount"></span><a class="btn sm" href="#/agencies?r=1">${ic('share', 15)} تحديث</a></div>
      </div>
      <div class="prop-grid" id="ngrid"></div>`;
    const draw = () => {
      const v = collect($('#nf'));
      S.netFilters = v;
      const t = tokens(v.q || '');
      const res = list.filter(x => {
        const p = netAsProp(x);
        if (v.trx && p.transaction !== v.trx) return false;
        if (v.cat && catOf(p.type) !== v.cat) return false;
        if (v.city && x.city !== v.city) return false;
        if (v.ag && x.agency !== v.ag) return false;
        return !t.length || hit(norm([x.agency, p.ref, p.title, typeAr(p.type), trxAr(p.transaction), p.city, p.district, p.description, x.price].join(' ')), t);
      });
      $('#ncount').textContent = `${res.length} عقار من ${agencies.length} وكالة`;
      $('#ngrid').innerHTML = res.slice(0, 120).map(netCard).join('') || '<div class="card empty" style="grid-column:1/-1">ما كاين حتى عقار</div>';
      hydrateNet($('#ngrid'));
    };
    $$('#nf input, #nf select').forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', draw));
    $('#nf').onsubmit = e => e.preventDefault();
    draw();
  }
  async function viewNetProp(owner, id) {
    const list = await loadNetwork();
    const x = list.find(r => r.owner === owner && r.id === id);
    if (!x) { main().innerHTML = notFound(); return; }
    const p = netAsProp(x);
    const s = p.specs || {}, cat = catOf(p.type), a = areaOf(p);
    const specRows = (D.FIELDS[cat] || []).filter(f => s[f.k] !== undefined && s[f.k] !== null && s[f.k] !== '').map(f => `<div><small>${esc(f.l)}</small><b>${esc(f.t === 'number' ? fmt(s[f.k]) : s[f.k])}</b></div>`);
    const msg = `السلام عليكم ${x.agency || ''}، بغيت نسول على العقار ${p.ref || ''} (${p.title || typeAr(p.type)} — ${priceText(p)}) اللي فشبكة الوسيط 777.`;
    main().innerHTML = `
      <div class="page-head"><a class="btn" href="#/agencies">${ic('back', 18)} عقارات الشبكة</a></div>
      <div class="detail-grid">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="net-gallery">${(x.photo_ids || []).map((ph, i) => `<img data-net="${x.owner}/${esc(ph)}" data-i="${i}" alt="">`).join('') || `<div class="card empty">${ic('image', 40)}<p>بلا صور</p></div>`}</div>
          ${mktCard(p)}
          ${p.description ? `<div class="card card-pad"><b>الوصف</b><p style="white-space:pre-wrap;margin-bottom:0">${esc(p.description)}</p></div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card card-pad">
            <div class="btn-row" style="margin-bottom:8px"><span class="badge deal">${esc(trxShort(p.transaction))}</span>${p.ref ? `<span class="badge">${esc(p.ref)}</span>` : ''}</div>
            <div class="prop-price" style="font-size:24px">${esc(priceText(p))}</div>
            <h2 style="margin:6px 0">${esc(p.title || typeAr(p.type))}</h2>
            <div class="muted">${ic('pin', 15)} ${esc([p.district, p.city].filter(Boolean).join('، ') || '—')}</div>
            <div class="kv" style="margin-top:12px">
              <div><small>النوع</small><b>${esc(typeAr(p.type))}</b></div>
              ${a ? `<div><small>المساحة</small><b>${fmt(a)} م²</b></div>` : ''}
              ${specRows.join('')}
            </div>
            ${(p.features || []).length ? `<div class="chips" style="margin-top:10px">${p.features.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
          </div>
          <div class="card card-pad" style="border-color:var(--gold)">
            <b>🏢 ${esc(x.agency || '')}</b>
            <div class="btn-row" style="margin-top:10px">
              ${x.phone ? `<a class="btn sm" href="${telLink(x.phone)}">${ic('phone', 16)} ${esc(x.phone)}</a>
              <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(x.phone)}?text=${encodeURIComponent(msg)}">${ic('wa', 16)} واتساب</a>` : '<span class="muted">بلا هاتف</span>'}
            </div>
            ${S.role === 'admin' ? `<button class="btn sm" id="own" style="margin-top:10px">${ic('key', 15)} معلومات المالك (المدير فقط)</button><div id="own-box" class="muted" style="margin-top:8px"></div>` : ''}
            <p class="muted" style="font-size:12.5px;margin-bottom:0">معلومات المالك كتبقى خاصة بالوكالة. تواصل معاها باش تتعاونو 🤝</p>
          </div>
        </div>
      </div>`;
    hydrateNet(main());
    const me = $('#mkt-edit'); if (me) me.onclick = () => editMarketRef(p.city, p.district, p.type, () => viewNetProp(owner, id));
    $$('.net-gallery img').forEach(img => img.onclick = async () => {
      const urls = await Promise.all((x.photo_ids || []).map(ph => netImg(x.owner, ph, false)));
      modal(`<img src="${urls[+img.dataset.i] || img.src}" style="width:100%;border-radius:12px">`);
    });
    const ob = $('#own');
    if (ob) ob.onclick = async () => {
      try {
        const d = await (await window.W777_SYNC.request('/rest/v1/rpc/w777_admin_record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ o: x.owner, i: x.id }) })).json();
        const o = (d && d.owner) || {};
        $('#own-box').innerHTML = d ? `👤 <b>${esc(o.name || '—')}</b> ${o.phone ? `· <a href="${telLink(o.phone)}">${esc(o.phone)}</a>` : ''}${d.notes ? '<br>📝 ' + esc(d.notes) : ''}${d.address ? '<br>📍 ' + esc(d.address) : ''}` : 'ما لقيناش المعلومات';
      } catch (e) { $('#own-box').textContent = 'تعذر: ' + e.message; }
    };
  }
  async function viewAgMe(head) {
    const ag = S.agency || {};
    main().innerHTML = head + `
      <div class="card card-pad form">
        <h3 class="section-title">🏢 معلومات الوكالة (كتبان مع العقارات ديالك فالشبكة)</h3>
        <form id="agme" class="form-grid">
          ${fInput('name', 'اسم الوكالة', ag.name, { req: true })}
          ${fInput('phone', 'هاتف الوكالة', ag.phone, { type: 'tel' })}
          <div class="field"><label>الرمز</label><input value="${esc(ag.code || '')}" disabled dir="ltr"></div>
          <div class="field" style="justify-content:flex-end"><button class="btn gold">${ic('check', 18)} حفظ</button></div>
        </form>
        <p class="muted" style="font-size:13px">✔️ العقارات اللي كتزيد فـ «العقارات» (المتاحة) كتبان أوتوماتيكيا للوكالات الأخرى، بلا اسم ولا هاتف المالك.<br>✔️ الزبناء والطلبات ديالك كيبقاو خاصين بيك.</p>
      </div>`;
    $('#agme').onsubmit = async e => {
      e.preventDefault();
      const v = collect(e.target);
      try {
        await window.W777_SYNC.request(`/rest/v1/w777_agencies?uid=eq.${window.W777_SYNC.uid()}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: v.name, phone: v.phone || null }) });
        await refreshRole(true);
        await DB.setMeta('shared_hash', {});
        window.W777_SYNC.syncNow();
        toast('تم الحفظ ✓');
      } catch (er) { toast('تعذر: ' + er.message, 4000); }
    };
  }
  async function viewAgManage(head, query) {
    const Sy = window.W777_SYNC;
    let ags, secrets, counts = {};
    try {
      [ags, secrets] = await Promise.all([
        Sy.request('/rest/v1/w777_agencies?select=uid,code,name,phone,email,active&order=code.asc', { headers: { Range: '0-999' } }).then(r => r.json()),
        Sy.request('/rest/v1/w777_agency_secrets?select=uid,password', { headers: { Range: '0-999' } }).then(r => r.json()),
      ]);
      (await loadNetwork()).forEach(x => { counts[x.owner] = (counts[x.owner] || 0) + 1; });
    } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    const pw = Object.fromEntries(secrets.map(s => [s.uid, s.password]));
    const appUrl = location.href.split('#')[0];
    const credMsg = a => `السلام عليكم ${a.name}،\nمرحبا بكم فشبكة الوكالات ديال الوسيط 777 🏢\nالتطبيق: ${appUrl}\nالإعدادات ← المزامنة السحابية:\nالرمز: ${a.code}\nكلمة السر: ${pw[a.uid] || ''}\nمن بعد زيدو العقارات ديالكم وغادي يبانو لجميع الوكالات (بلا معلومات المالك).`;
    main().innerHTML = head + `
      <div class="card card-pad" style="margin-bottom:14px">
        <div class="kv"><div><small>الوكالات</small><b>${ags.length}</b></div><div><small>مفعلة</small><b>${ags.filter(a => a.active).length}</b></div>
          <div><small>اللي زادو عقارات</small><b>${ags.filter(a => counts[a.uid]).length}</b></div></div>
        <div class="form-grid" style="margin-top:12px">${fInput('agq', 'بحث', query.q || '', { ph: 'رقم، اسم، هاتف…' })}
          ${fSelect('agf', 'عرض', [{ v: '', l: 'الكل' }, { v: 'named', l: 'اللي عندهم اسم' }, { v: 'active', l: 'عندهم عقارات' }, { v: 'off', l: 'موقوفة' }], '', { noEmpty: true })}</div>
      </div>
      <div class="card" id="aglist"></div>`;
    let shown = 60;
    const draw = () => {
      const q = norm($('[name=agq]').value || ''), f = $('[name=agf]').value;
      const res = ags.filter(a => (!q || norm([a.code, a.name, a.phone].join(' ')).includes(q)) &&
        (f !== 'named' || !/^Agence \d+$/.test(a.name)) && (f !== 'active' || counts[a.uid]) && (f !== 'off' || !a.active));
      $('#aglist').innerHTML = res.slice(0, shown).map(a => `<div class="list-row" style="flex-wrap:wrap;gap:8px">
        <div class="grow"><span class="badge" dir="ltr">${esc(a.code)}</span> <b>${esc(a.name)}</b> ${a.active ? '' : '<span class="badge red">موقوفة</span>'} ${counts[a.uid] ? `<span class="badge green">${counts[a.uid]} عقار</span>` : ''}
          <small class="muted">${esc(a.phone || 'بلا هاتف')} · <span dir="ltr">${esc(a.code)}</span> / <span dir="ltr" class="pw" data-pw="${a.uid}">••••••</span></small></div>
        <div class="btn-row">
          <button class="btn sm" data-show="${a.uid}">${ic('eye', 15)}</button>
          <button class="btn sm" data-edit="${a.uid}">${ic('edit', 15)}</button>
          <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${a.phone ? waPhone(a.phone) : ''}?text=${encodeURIComponent(credMsg(a))}">${ic('wa', 15)} صيفط الدخول</a>
          <button class="btn sm" data-tog="${a.uid}">${a.active ? 'إيقاف' : 'تفعيل'}</button>
        </div></div>`).join('') + (res.length > shown ? `<div style="padding:12px;text-align:center"><button class="btn" id="agmore">عرض المزيد (${res.length - shown})</button></div>` : '') || '<div class="empty">ما كاين والو</div>';
      const more = $('#agmore'); if (more) more.onclick = () => { shown += 100; draw(); };
      $$('[data-show]').forEach(b => b.onclick = () => { const s = $(`[data-pw="${b.dataset.show}"]`); s.textContent = s.textContent.startsWith('•') ? pw[b.dataset.show] || '?' : '••••••'; });
      $$('[data-tog]').forEach(b => b.onclick = async () => {
        const a = ags.find(x => x.uid === b.dataset.tog);
        await Sy.request(`/rest/v1/w777_agencies?uid=eq.${a.uid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !a.active }) });
        a.active = !a.active; toast(a.active ? 'تفعلات ✓' : 'توقفات'); draw();
      });
      $$('[data-edit]').forEach(b => b.onclick = () => {
        const a = ags.find(x => x.uid === b.dataset.edit);
        modal(`<h3>${esc(a.code)}</h3><form id="age" class="form-grid">${fInput('name', 'اسم الوكالة', a.name, { req: true })}${fInput('phone', 'الهاتف', a.phone, { type: 'tel' })}</form>
          <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="age-ok">${ic('check', 16)} حفظ</button></div>`, (box, close) => {
          $('#age-ok', box).onclick = async () => {
            const v = collect($('#age', box));
            try {
              await Sy.request(`/rest/v1/w777_agencies?uid=eq.${a.uid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: v.name || a.name, phone: v.phone || null }) });
              a.name = v.name || a.name; a.phone = v.phone || null; close(); draw(); toast('تم ✓');
            } catch (e) { toast('تعذر: ' + e.message); }
          };
        });
      });
    };
    $('[name=agq]').addEventListener('input', () => { shown = 60; draw(); });
    $('[name=agf]').addEventListener('change', () => { shown = 60; draw(); });
    draw();
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

  /* ---------- استيراد الطلبات من جهات الاتصال (vCard) ----------
     كل جهة اتصال فيها «dde» (demande) = طلب جديد */
  const DDE_RE = /(^|[^a-z])(dde|demande)([^a-z]|$)/i;
  function parseVcf(text) {
    const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').replace(/=\n/g, '').split('\n');
    const cards = []; let c = null;
    const unesc = v => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
    const qp = v => { try { return decodeURIComponent(v.replace(/=([0-9A-F]{2})/gi, '%$1')); } catch (e) { return v; } };
    lines.forEach(line => {
      if (/^BEGIN:VCARD/i.test(line)) { c = { tels: [], emails: [] }; return; }
      if (/^END:VCARD/i.test(line)) { if (c) cards.push(c); c = null; return; }
      if (!c) return;
      const i = line.indexOf(':'); if (i < 0) return;
      const head = line.slice(0, i), key = head.split(';')[0].replace(/^item\d+\./i, '').toUpperCase();
      let val = line.slice(i + 1);
      if (/QUOTED-PRINTABLE/i.test(head)) val = qp(val);
      val = unesc(val);
      if (key === 'FN') c.fn = val;
      else if (key === 'N') c.n = val.split(';').slice(0, 3).reverse().filter(Boolean).join(' ').trim();
      else if (key === 'TEL') c.tels.push(val.replace(/[^0-9+]/g, ''));
      else if (key === 'EMAIL') c.emails.push(val);
      else if (key === 'NOTE') c.note = val;
      else if (key === 'ORG') c.org = val.replace(/;+$/, '');
    });
    return cards.map(k => ({ name: (k.fn || k.n || k.org || '').trim(), tels: k.tels.filter(Boolean), email: k.emails[0] || '', note: k.note || '' }));
  }
  const phoneKey = t => { const d = (t || '').replace(/\D/g, ''); return d.startsWith('212') ? '0' + d.slice(3) : d.startsWith('00212') ? '0' + d.slice(5) : d; };
  // كلمات عربية كاملة فقط (باش ما نخلطوش مع الأسماء بحال «دارين»)
  const AR_TYPE_WORDS = new Set(['شقه', 'شقق', 'فيلا', 'دار', 'رياض', 'محل', 'حانوت', 'بقعه', 'ارض', 'مكتب', 'ضيعه', 'فندق', 'مقهي', 'استوديو', 'عماره', 'دوبلكس', 'مستودع', 'مخزن'].map(plain));
  // اختصارات كيكتبها المكتب فأسماء جهات الاتصال
  const DDE_TYPES = [[/^ap+r?t?s?$|^ap+ar?t(ement)?s?$|^appt$/, 'apartment'], [/^villas?$/, 'villa'], [/^terr?ai?ns?$|^terrin$/, 'land_urban'],
    [/^maisons?$|^dar$/, 'house'], [/^riads?$/, 'riad'], [/^studios?$/, 'studio'], [/^duplex$/, 'duplex'], [/^locals?$|^magasins?$|^mahal$/, 'shop'],
    [/^bureaux?$/, 'office'], [/^lots?$|^lotissement$/, 'plot_house'], [/^fermes?$/, 'farm'], [/^immeubles?$/, 'building'], [/^depot$|^hangar$/, 'warehouse']];
  const DDE_TRX = [[/^(loc|location|louer|kra|kira|kraa)$/, 'rent'], [/^(meuble|meublee)$/, 'rent_furnished'], [/^vide$/, 'rent'],
    [/^(achat|acheter|vente|bay3|chra)$/, 'sale'], [/^rahn$/, 'rahn'], [/^saroute?$|^sarout$/, 'pas_de_porte']];
  const DISTRICT_ALIASES = { wisslan: 'ويسلان', ouislane: 'ويسلان', ouislan: 'ويسلان', plaisance: 'بلاصانص (Plaisance)', nahda: 'حي النهضة', hamria: 'حمرية (المدينة الجديدة)',
    marjane: 'مرجان 2', bassatine: 'البساتين', zitoune: 'الزيتون', zitoun: 'الزيتون', toulal: 'تولال', agdal: 'أكدال', souissi: 'السويسي', borj: 'برج مولاي عمر',
    mansour: 'حي المنصور', menzeh: 'المنزه', sidi_bouzekri: 'سيدي بوزكري', bouzekri: 'سيدي بوزكري', kasba: 'القصبة الإسماعيلية', prestigia: 'بريستيجيا', 'ain slougui': 'عين السلوكي', rouamzine: 'روامزين' };
  const ABROAD = /^(france|belgique|espagne|italie|allemagne|hollande|canada|usa|angleterre|suisse|mre)$/;
  function reqFromContact(k) {
    const before = k.name.slice(0, k.name.search(DDE_RE)).replace(/[\s,.-]+$/, '').trim();
    const rest = k.name.replace(new RegExp(DDE_RE.source, 'gi'), ' ').replace(/\s+/g, ' ').trim();
    const words = plain(k.name.slice(before.length)).split(' ').filter(w => w && w !== 'dde' && w !== 'demande');
    const allWords = plain(k.name).split(' ').filter(Boolean);
    let type = '', city = '', trx = '', district = '', residence = '';
    for (let i = 0; i < words.length; i++) {
      const w = words[i], w2 = w + ' ' + (words[i + 1] || '');
      if (!type) { const t = DDE_TYPES.find(([re]) => re.test(w)); if (t) type = t[1]; else if (/[a-z]/.test(w) || AR_TYPE_WORDS.has(w)) { const g = guessType(w); if (g !== 'other') type = g; } }
      if (!trx || (trx === 'rent' && /^meuble/.test(w))) { const t = DDE_TRX.find(([re]) => re.test(w)); if (t) trx = t[1]; }
      if (!district) district = DISTRICT_ALIASES[w2] || DISTRICT_ALIASES[w] || '';
      if (ABROAD.test(w)) residence = w;
    }
    // المدينة: من أي كلمة فالاسم (حتى قبل dde بحال «Said Salé»)
    for (let i = 0; i < allWords.length && !city; i++) city = guessCity(allWords[i] + ' ' + (allWords[i + 1] || '')) || guessCity(allWords[i]);
    for (let i = 0; i < allWords.length && !district; i++) district = DISTRICT_ALIASES[allWords[i]] || '';
    if (!trx) trx = guessTrx(rest);
    const defCity = (S.settings && S.settings.officeCity) || 'مكناس';
    if (district && !city) city = (CITY[defCity] && districtsOf(defCity).includes(district)) ? defCity : (Object.values(CITY).find(c => (c.d || []).includes(district)) || {}).n || '';
    if (district && city && !districtsOf(city).includes(district)) district = '';
    const tels = [...new Set(k.tels.map(phoneKey))];
    const isBroker = /intermediaire|samsar|سمسار|وسيط/.test(plain(before));
    const c = { name: before || k.name, phone: tels[0] || '', phone2: tels[1] || '', email: k.email, notes: k.note, source: isBroker ? 'وسيط آخر' : '' };
    if (residence) { c.nationality = 'مغربي مقيم بالخارج (MRE)'; c.residence = residence[0].toUpperCase() + residence.slice(1); }
    return {
      id: uid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), proposals: {},
      client: c, transaction: trx || '', types: type ? [type] : [], city, districts: district ? [district] : [], features: [], media: [],
      status: 'new', priority: 'normal', imported: true, importKey: 'vcf:' + (tels[0] || plain(k.name)),
      notes: 'مستورد من جهات الاتصال: ' + k.name,
    };
  }
  async function importContacts(file) {
    let cards;
    try { cards = parseVcf(await file.text()); } catch (e) { return toast('ما قدرتش نقرا هاد الملف', 3500); }
    if (!cards.length) return toast('هاد الملف ما فيه حتى جهة اتصال (خاصو يكون .vcf)', 4000);
    const dde = cards.filter(k => k.name && DDE_RE.test(k.name));
    if (!dde.length) return toast(`لقيت ${cards.length} جهة اتصال ولكن حتى وحدة ما فيها dde`, 4500);
    const known = new Set(S.reqs.map(r => r.importKey).filter(Boolean));
    const knownPhones = new Set(S.reqs.map(r => r.client && phoneKey(r.client.phone)).filter(Boolean));
    const list = dde.map(reqFromContact);
    const fresh = list.filter(r => !known.has(r.importKey) && !(r.client.phone && knownPhones.has(r.client.phone)));
    const seen = new Set(); const todo = fresh.filter(r => !seen.has(r.importKey) && seen.add(r.importKey));
    const dup = list.length - todo.length;
    modal(`<h3>${ic('users')} استيراد الطلبات من جهات الاتصال</h3>
      <p>لقيت <b>${cards.length}</b> جهة اتصال، منهم <b>${dde.length}</b> فيهم <b>dde</b>.
      ${dup ? `<br><span class="muted">${dup} كانو مسجلين من قبل وغادي يتخطاو.</span>` : ''}</p>
      <div class="card" style="max-height:45vh;overflow:auto;margin:10px 0">${todo.map(r => `<div class="list-row"><div class="grow"><b>${esc(r.client.name)}</b>
        <small class="muted" dir="ltr">${esc(r.client.phone || '— بلا هاتف')}</small>
        <small class="muted">${esc([r.transaction && trxAr(r.transaction), r.types.map(typeAr).join(''), r.city].filter(Boolean).join(' · '))}</small></div></div>`).join('') || '<p class="muted" style="padding:12px">ما كاين حتى طلب جديد</p>'}</div>
      <div class="btn-row" style="justify-content:flex-end"><button class="btn" data-close>إلغاء</button>
        ${todo.length ? `<button class="btn gold" id="vcf-go">${ic('plus', 16)} زيد ${todo.length} طلب</button>` : ''}</div>`,
    (m, close) => {
      const go = $('#vcf-go', m); if (!go) return;
      go.onclick = async () => {
        go.disabled = true;
        for (const r of todo) { r.ref = await DB.nextRef('DM', maxRef(S.reqs)); await DB.saveRec('requests', r); }
        close();
        await loadAll();
        toast(`تمت إضافة ${todo.length} طلب ✓ — كمّل المعلومات ديالهم من «الطلبات»`, 5000);
        location.hash = '#/requests';
      };
    });
  }

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
    if (meta) meta.content = '#000000';
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
  /* احتياط: إلا عجلة الفأرة ما حركاتش الصفحة (مشكل فبعض نسخ Chrome/Safari على الماك)، كنحركوها بيدينا */
  function wheelFallback() {
    const canScroll = (el, dy) => {
      for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
        const cs = getComputedStyle(el);
        if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) {
          if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
        }
      }
      return false;
    };
    window.addEventListener('wheel', e => {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (canScroll(e.target, e.deltaY)) return;
      const t = performance.now();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      const atEdge = dy > 0 ? window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1 : window.scrollY <= 0;
      if (atEdge) return;
      // المتصفح كيحرك الصفحة قبل أو مباشرة من بعد هاد الحدث؛ إلا ما وقع حتى «scroll» كنحركوها حنا
      setTimeout(() => { if (lastScroll < t - 150) window.scrollBy(0, dy); }, 120);
    }, { passive: true });
    let lastScroll = 0;
    window.addEventListener('scroll', () => { lastScroll = performance.now(); }, { passive: true });
  }
  wheelFallback();

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
    loadRoleCache();
    if (window.W777_SYNC.isOn()) localStorage.setItem('w777_last_email', window.W777_SYNC.account().email || '');
    cleanOrphans();
    setupSearch();
    setupFab();
    setupSyncUi();
    window.addEventListener('hashchange', route);
    await route();
    DB.persist();
    if (window.W777_SYNC.isOn()) window.W777_SYNC.syncNow();
    checkAlarms(); setInterval(checkAlarms, 30000);
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
