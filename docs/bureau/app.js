/* ============================================================
   مكتب الوسيط 777 — تطبيق إدارة العقارات والطلبات
   يعمل بدون إنترنت — البيانات محفوظة على الجهاز (IndexedDB)
   ============================================================ */
(function () {
  'use strict';
  const D = window.W777_DATA;
  // نسخة مدمجة (صفحة claude.ai): لا طباعة ولا تنزيل ملفات ولا اتصال خارجي
  const EMBED = !!window.W777_EMBED;
  const LOGO = window.W777_LOGO || 'icons/logo.png?v=10';
  const DB = window.W777_DB;

  /* ============================================================
     أدوات عامة
     ============================================================ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // روابط جاية من قاعدة البيانات (أخبار، مناسبات، مجموعات): غير http/https — ماشي javascript: ولا data:
  // القوائم الطويلة: أول دفعة كتبان فورا، والباقي كيتزاد ملي كتنزل (بدل مئات البطاقات دفعة وحدة)
  function lazyFill(box, items, render, after, first = 24, step = 24) {
    if (!box) return;
    let i = 0, io = null;
    const sentinel = document.createElement('div');
    sentinel.className = 'lazy-more';
    box.appendChild(sentinel);
    const add = n => {
      const tmp = document.createElement('div');
      tmp.innerHTML = items.slice(i, i + n).map(render).join('');
      i = Math.min(items.length, i + n);
      const added = [...tmp.children], later = i > n;
      while (tmp.firstChild) box.insertBefore(tmp.firstChild, sentinel);
      if (later) lvWatch(added);
      if (after) after();
      if (i >= items.length) { if (io) io.disconnect(); sentinel.remove(); }
    };
    add(first);
    if (i >= items.length) return;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && box.isConnected) add(step); }, { rootMargin: '900px 0px' });
      io.observe(sentinel);
    } else add(items.length);
  }
  const safeUrl = u => /^https?:\/\//i.test(String(u || '').trim()) ? esc(String(u).trim()) : '#';
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const today = () => new Date().toISOString().slice(0, 10);
  // الصور: 5 صور لكل عقار لجميع المشتركين — المدير بلا حد
  const PHOTO_MAX = 5;
  const photoLimit = () => S.role === 'admin' ? Infinity : PHOTO_MAX;
  const num = v => (v === null || v === undefined || v === '' || isNaN(Number(v))) ? null : Number(v);
  // مُنسّق واحد للأرقام (إنشاء Intl.NumberFormat فكل مرة كان كيبطّء التطبيق بزاف)
  const NF = new Intl.NumberFormat('fr-FR');
  const fmtRaw = n => num(n) === null ? '' : NF.format(Number(n)).replace(/[\u202f\u00a0]/g, ' ');
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
  // قيمة كبيرة ← رقم قصير + الوحدة (مليون / مليار سنتيم)
  function saleCompact(n) {
    const m = (num(n) || 0) / 10000;
    if (m >= 1000) { const v = m / 1000; return { n: v >= 100 ? Math.round(v) : +v.toFixed(1), u: 'مليار سنتيم' }; }
    return { n: m >= 100 ? Math.round(m) : +m.toFixed(1), u: 'مليون سنتيم' };
  }
  // رقم كبير وواضح كيعدّ من 0 حتى يوصل للقيمة
  function odo(v) { return `<span class="hnum" data-to="${esc(String(v))}">${esc(String(v))}</span>`; }
  function odoRoll(root) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    $$('.hnum[data-to]', root).forEach(el => {
      const t = el.dataset.to, to = parseFloat(t), dec = (t.split('.')[1] || '').length;
      if (!isFinite(to) || to <= 0) return;
      const t0 = performance.now(), dur = 1200;
      const step = now => { const k = Math.min(1, (now - t0) / dur), v = to * (1 - Math.pow(1 - k, 3)); el.textContent = k < 1 ? v.toFixed(dec) : t; if (k < 1 && el.isConnected) requestAnimationFrame(step); };
      el.textContent = (0).toFixed(dec); requestAnimationFrame(step);
    });
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
    ledger: [], leases: [],
    role: null, agency: null, net: null, netFilters: null,
    custom: {},       // أحياء مضافة يدويا { مدينة: [أحياء] }
    settings: {},
    propFilters: { trx: '', status: 'active', type: '', cat: '', city: '', district: '', pmin: null, pmax: null, amin: null, amax: null, beds: null, sort: 'new', fav: false },
    reqFilters: { status: 'open', trx: '' },
  };
  const urlCache = new Map();

  async function loadAll() {
    const [props, reqs, custom, settings, appts, ledger, leases] = await Promise.all([
      DB.all('properties'), DB.all('requests'), DB.getMeta('customDistricts', {}), DB.getMeta('settings', {}), DB.all('appointments'),
      DB.getMeta('ledger', []), DB.getMeta('leases', []),
    ]);
    S.ledger = Array.isArray(ledger) ? ledger : []; S.leases = Array.isArray(leases) ? leases : [];
    S.appts = appts;
    S.props = props.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    dropMatches();
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
  const MISSING = new Map();
  async function getBlob(id, thumb) {
    let rec = await DB.get('files', id);
    if (rec && ((thumb && rec.thumb) || rec.blob)) return (thumb && rec.thumb) || rec.blob;
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) return null;
    // ملف ماشي فالسحابة: ما نعاودوش نطلبوه فكل صفحة (كنعاودو المحاولة من بعد 10 دقايق)
    const miss = MISSING.get(id);
    if (miss && Date.now() - miss < 600000) return null;
    const blob = await Sy.fetchFile(id, thumb);
    if (!blob) { MISSING.set(id, Date.now()); return null; }
    const owner = [...S.props, ...S.reqs].find(p => (p.media || []).some(m => m.id === id));
    const meta = owner && owner.media.find(m => m.id === id);
    rec = rec || { id, owner: owner ? owner.id : '', kind: meta ? meta.kind : 'photo', name: meta ? meta.name : id, mime: blob.type, size: blob.size, blob: null, thumb: null };
    if (thumb && blob.size < 400 * 1024) rec.thumb = blob; else rec.blob = blob;
    if (owner) {
      await DB.put('files', rec);
      // جا من السحابة = راه مرفوع: ما نعاودوش نرفعوه، ويتنشر مع العقار فالشبكة
      const up = await DB.getMeta('sync_uploaded', {});
      if (!up[id]) { up[id] = 1; await DB.setMeta('sync_uploaded', up); }
    }
    return blob;
  }
  function hydrateThumbs(root = document) {
    $$('[data-thumb]', root).forEach(async el => {
      const id = el.dataset.thumb;
      el.removeAttribute('data-thumb');
      const url = await fileUrl(id, true);
      if (url) { el.src = url; el.classList.remove('hidden'); }
      else if (window.W777_SYNC && window.W777_SYNC.isOn() && navigator.onLine && el.parentElement && el.parentElement.classList.contains('prop-cover')) el.parentElement.classList.add('no-cloud');
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
  // نتيجة المطابقة محفوظة حسب (العقار، الطلب، آخر تعديل) — كتتحسب مرة وحدة بدل فكل صفحة
  const MATCH_CACHE = new Map();
  function matchScore(p, r) {
    if (!p || !r) return null;
    const key = p.id + '|' + (p.updatedAt || '') + '|' + p.status + '|' + r.id + '|' + (r.updatedAt || '');
    if (MATCH_CACHE.has(key)) return MATCH_CACHE.get(key);
    if (MATCH_CACHE.size > 400000) MATCH_CACHE.clear();
    const res = matchScoreRaw(p, r);
    MATCH_CACHE.set(key, res);
    return res;
  }
  function matchScoreRaw(p, r) {
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
  // قائمة الاقتراحات ديال كل طلب محفوظة حتى يتبدل شي عقار ولا الطلب نفسه
  const MATCH_LIST = new Map();
  let PROPS_BY_CITY = null;
  const dropMatches = () => { MATCH_LIST.clear(); PROPS_BY_CITY = null; };
  // العقارات مجموعة حسب المدينة: الطلب كيتقارن غير مع عقارات مدينتو (المدينة شرط أساسي)
  function propsForCity(city) {
    if (!city) return S.props;
    if (!PROPS_BY_CITY) { PROPS_BY_CITY = new Map(); S.props.forEach(p => { const k = p.city || ''; if (!PROPS_BY_CITY.has(k)) PROPS_BY_CITY.set(k, []); PROPS_BY_CITY.get(k).push(p); }); }
    return PROPS_BY_CITY.get(city) || [];
  }
  const reqKey = r => r.id + '|' + (r.updatedAt || '');
  const matchesCold = () => S.reqs.some(r => openReq(r) && !MATCH_LIST.has(reqKey(r)));
  // حساب الاقتراحات فالخلفية بدفعات صغيرة باش الواجهة ما تتجمدش
  let warming = null;
  function warmMatches() {
    if (warming) return warming;
    const todo = S.reqs.filter(r => openReq(r) && !MATCH_LIST.has(reqKey(r)));
    warming = new Promise(res => {
      let i = 0;
      const step = () => {
        const t0 = performance.now();
        while (i < todo.length && performance.now() - t0 < 25) matchesForReq(todo[i++]);
        if (i < todo.length) setTimeout(step, 0); else { warming = null; res(); }
      };
      setTimeout(step, 0);
    });
    return warming;
  }
  // أي حفظ ولا حذف ديال عقار كيمسح الاقتراحات المحفوظة
  const _saveRec = DB.saveRec.bind(DB), _delRec = DB.delRec.bind(DB);
  DB.saveRec = (st, o) => { if (st === 'properties') dropMatches(); return _saveRec(st, o); };
  DB.delRec = (st, id) => { if (st === 'properties') dropMatches(); return _delRec(st, id); };
  function matchesForReq(r) {
    const k = reqKey(r);
    let v = MATCH_LIST.get(k);
    if (!v) {
      v = propsForCity(r.city).map(p => ({ p, m: matchScore(p, r) })).filter(x => x.m && x.m.score >= MIN_SCORE).sort((a, b) => b.m.score - a.m.score);
      MATCH_LIST.set(k, v);
    }
    return v;
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
    $('#btn-filter').onclick = () => { location.hash = '#/search'; };
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
  // زر «رجوع» للصفحة السابقة فكل الصفحات (كيخدم حتى فالتطبيق المثبت بلا زر المتصفح)
  const NAV = { stack: [], back: false };
  function navTrack() {
    const h = location.hash && location.hash !== '#' ? location.hash : '#/';
    if (NAV.back) NAV.back = false;
    else if (NAV.stack[NAV.stack.length - 1] !== h) NAV.stack.push(h);
    if (NAV.stack.length > 60) NAV.stack.shift();
    const b = $('#btn-back'); if (b) b.classList.toggle('hidden', h === '#/');
  }
  function goBack() {
    if (AG.open) { agClose(); return; }
    if (NAV.stack.length > 1) { NAV.stack.pop(); NAV.back = true; location.hash = NAV.stack[NAV.stack.length - 1]; }
    else location.hash = '#/';
  }
  async function route() {
    if (leaveGuard) { const g = leaveGuard; leaveGuard = null; await g(); }
    navTrack();
    const { parts, query } = parseHash();
    document.body.classList.toggle('in-studio', parts[0] === 'ad-maker');
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
    else if (a === 'guide') { nav = 'guide'; viewGuide(b); }
    else if (a === 'search') { nav = 'search'; await viewSearch(query); }
    else if (a === 'stays') { nav = 'stays'; await viewStays(parts, query); }
    else if (a === 'estimate') { nav = 'properties'; viewEstimate(query); }
    else if (a === 'loan') { nav = 'loan'; viewLoan(query); }
    else if (a === 'ad-maker') { nav = 'ad-maker'; viewAdMaker(query); }
    else if (a === 'map') { nav = 'map'; await viewMap(query); }
    else if (a === 'rentals') { nav = 'rentals'; viewRentals(); }
    else if (a === 'rental') { nav = 'rentals'; viewRental(b); }
    else if (a === 'finance') { nav = 'finance'; viewFinance(query); }
    else if (a === 'report') { nav = 'finance'; viewReport(query); }
    else if (a === 'inbox') { nav = 'inbox'; await viewInbox(); }
    else if (a === 'chat') { nav = 'inbox'; await viewChat(b); }
    else if (a === 'appointments') { nav = 'appointments'; viewAppts(query); }
    else if (a === 'appointment') { nav = 'appointments'; await viewApptForm(b || 'new', query); }
    else if (a === 'agencies') { nav = 'agencies'; await viewNetKind('agency', parts, query); }
    else if (a === 'brokers') { nav = a; await viewNetKind('broker', parts, query); }
    else if (a === 'contractors') { nav = a; await viewNetKind('contractor', parts, query); }
    else if (a === 'finishing') { nav = a; await viewNetKind('finishing', parts, query); }
    else if (a === 'investors') { nav = a; await viewNetKind('investor', parts, query); }
    else if (a === 'notaries') { nav = a; await viewNetKind('notary', parts, query); }
    else if (a === 'associations') { nav = a; await viewNetKind('association', parts, query); }
    else if (a === 'terms') { nav = b === 'groups' ? 'groups' : 'terms'; await viewTerms(b); }
    else if (a === 'projects') { nav = a; await viewProjects(parts, query); }
    else if (a === 'events') { nav = a; await viewEvents(parts); }
    else if (a === 'news') { nav = a; await viewNews(parts); }
    else if (a === 'donations') { nav = a; await viewDonations(parts); }
    else if (a === 'disputes') { nav = a; await viewDisputes(parts); }
    else if (a === 'settings') { nav = 'settings'; await viewSettings(); }
    else { await viewHome(); }
    $$('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === nav));
    if (a !== 'properties') $('#q').value = '';
    lvPage();
  }

  /* ============================================================
     الصفحة الرئيسية (لوحة القيادة)
     ============================================================ */
  const HUB = [
    ['agencies', '🏢', 'الوكالات العقارية', '700 داخل · 77 خارج'], ['brokers', '🤝', 'الوسطاء', '777 وسيط'],
    ['contractors', '🏗️', 'شركات المقاولات', '777 شركة'], ['finishing', '🎨', 'شركات التشطيب', '777 شركة'],
    ['projects', '🚀', 'مشاريع', 'البحث عن تمويل'], ['events', '🎪', 'المناسبات', 'معارض وصالونات'],
    ['stays', '🏖️', 'الحجز', 'مفروش وعطل'], ['news', '📰', 'الأخبار', 'المغرب والعالم'], ['donations', '🤲', 'الهبة', 'سقف لكل عائلة'],
    ['disputes', '⚖️', 'النزاعات', 'الحل القانوني'], ['investors', '💼', 'المستثمرون', 'تمويل وشراكة'], ['notaries', '🖋️', 'الموثقون', 'استشارة وتوثيق'],
    ['associations', '🏘️', 'الجمعيات السكنية', '777 جمعية'],
    ['terms', '📜', 'قانون التطبيق', 'شروط الاشتراك'],
  ];
  // لون الهالة ديال كل أيقونة 3D
  const HUB_C = { agencies: '#4aa3ff', brokers: '#ffb02e', contractors: '#ffcc4d', finishing: '#ff7aa8', projects: '#ff5a5f', events: '#e84393', stays: '#20c997',
    news: '#a0aec0', donations: '#ffc83d', disputes: '#b39ddb', investors: '#f4a62a', notaries: '#3d8bfd', associations: '#34d399', terms: '#e6c77e' };
  // الرئيسية: 3 أزرار كبار ← نافذة فيها الخانات الدائرية
  const HUB_NET = ['agencies', 'brokers', 'associations', 'investors', 'contractors', 'finishing', 'notaries'];
  const hubTile = (href, c, icon, l, s) => `<a class="hub-tile" href="${href}" style="--c:${c}"><span class="hi">${icon}</span><b>${l}</b>${s ? `<small>${s}</small>` : ''}</a>`;
  const hubImg = r => { const h = HUB.find(x => x[0] === r); return hubTile('#/' + r, HUB_C[r] || '#e6c77e', `<img src="icons/hub/${r}.webp?v=6" alt="" decoding="async" onerror="this.replaceWith(document.createTextNode('${h[1]}'))">`, h[2], h[3]); };
  const hubEmo = (href, e, l, s, c) => hubTile(href, c || '#e6c77e', `<i class="emo">${e}</i>`, l, s);
  function homeMenu(kind, nAppts) {
    const M = {
      add: ['➕ إضافة', [hubEmo('#/property/new', '🏠', 'إضافة عقار', 'بيع، كراء…', '#ff5a5f'), hubEmo('#/request/new', '🧾', 'إضافة طلب', 'زبون كيقلب', '#4aa3ff'), hubEmo('#/appointment/new', '📅', 'إضافة موعد', 'زيارة، لقاء…', '#20c997')]],
      svc: ['🧰 خدمات المجموعة', [
        hubEmo('#/matching', '🎯', 'المطابقة', 'طلب ↔ عقار'), hubEmo('#/appointments', '📅', 'المواعيد', nAppts ? nAppts + ' اليوم' : ''), hubEmo('#/estimate', '📊', 'مقارنة الثمن', 'درهم/م²'),
        hubEmo('#/loan', '🏦', 'حاسبة القرض', 'القسط الشهري'), hubEmo('#/map', '🗺️', 'الخريطة', 'العقارات'), hubEmo('#/rentals', '🔑', 'الكراء', 'الكاريين والتوصيلات'),
        hubEmo('#/finance', '💹', 'المالية', 'المداخيل والمصاريف'), hubEmo('#/ad-maker', '✨', 'إصنع إعلانا', 'منشورات إعلانية'),
        ...HUB.map(h => h[0]).filter(r => !HUB_NET.includes(r)).map(hubImg),
        hubEmo('#/guide', '🎓', 'تعلم استعمال التطبيق', 'دروس بالصور')]],
      net: ['✦ شبكة الوسيط 777', HUB_NET.map(hubImg)],
    }[kind];
    if (!M) return;
    modal(`<h3>${M[0]}</h3><div class="hub hub-menu">${M[1].join('')}</div>`, (box, close) => {
      $$('.hub-tile', box).forEach(a => a.addEventListener('click', () => close()));
    });
  }
  function gdBanner() {
    const L = gdLessons(), d = gdDone();
    if (!L.length || d.size >= Math.min(5, L.length)) return '';
    try { if (localStorage.getItem('w777_guide_hide') === '1') return ''; } catch (e) { /* */ }
    return `<div class="gd-banner"><span class="big">🎓</span><div class="grow"><b>جديد فالتطبيق؟</b><small>تعلّم استعمالو فـ ${L.length} درس قصير بالصور، خطوة بخطوة.</small></div>
      <a class="btn gold sm" href="#/guide">ابدأ الدليل</a><button class="btn sm" onclick="try{localStorage.setItem('w777_guide_hide','1')}catch(e){};this.parentElement.remove()">✕</button></div>`;
  }
  async function viewHome() {
    const avail = S.props.filter(p => p.status === 'available');
    const open = S.reqs.filter(openReq);
    // أول فتح: الصفحة كتبان فورا، والفرص كتتحسب فالخلفية ومن بعد كتتعرض
    const cold = matchesCold();
    if (cold) warmMatches().then(async () => {
      if ((location.hash || '#/') !== '#/' || document.querySelector('.modal-bg')) return;
      const y = window.scrollY; await viewHome(); window.scrollTo(0, y);
    });
    let strong = 0;
    if (!cold) open.forEach(r => matchesForReq(r).forEach(x => { if (x.m.score >= 75) strong++; }));
    const follow = open.filter(r => r.followUp && r.followUp <= today()).sort((a, b) => a.followUp.localeCompare(b.followUp));
    const byType = {};
    avail.forEach(p => { const k = D.CATEGORIES[catOf(p.type)].ar; byType[k] = (byType[k] || 0) + 1; });
    const maxT = Math.max(1, ...Object.values(byType));
    const saleValue = avail.filter(p => p.transaction === 'sale').reduce((s, p) => s + (num(p.priceMax) || num(p.priceMin) || 0), 0);
    const todayAppts = S.appts.filter(a => a.status === 'planned' && a.date === today()).sort((x, y) => (x.time || '').localeCompare(y.time || ''));

    main().innerHTML = `<div class="home-wrap"><aside id="home-rail" class="p-rail hidden" aria-label="الشركاء"></aside><div class="home-main"><div id="home-flags" class="flag-band hidden"></div>` + gdBanner() + homeSearch() + `
      <div class="hero">
        <div class="hero-marq"><span>${esc(S.role === 'agency' ? myAgencyName() : String(S.settings.officeName || '').replace(/^مكتب الوسيط/, 'مجموعة الوسيط')).replace(/777/g, '<b class="r777">777</b>')} — قاعدة بيانات المكتب بين يديك، حتى بدون إنترنت.</span></div>
        <div class="hero-big3">
          <button class="btn gold" data-hm="add">${ic('plus', 20)} إضافة</button>
          <button class="btn" data-hm="svc">🧰 خدمات المجموعة${todayAppts.length ? ` <span class="badge gold">${todayAppts.length}</span>` : ''}</button>
          <button class="btn" data-hm="net">✦ شبكة الوسيط 777</button>
        </div>
        ${inNetwork() ? groupsCard(false) : ''}
      </div>
      <div class="hstats">
        <div class="hst" style="--c:#c8102e"><span class="hst-ic">🏠</span>${odo(avail.length)}<b>عقار متاح</b></div>
        <div class="hst" style="--c:#2f6fd6"><span class="hst-ic">👥</span>${odo(open.length)}<b>طلب مفتوح</b></div>
        <div class="hst" style="--c:#1f9d68"><span class="hst-ic">🎯</span>${cold ? '<span class="hnum">…</span>' : odo(strong)}<b>مطابقة قوية</b></div>
        <div class="hst" style="--c:#b8860b"><span class="hst-ic">💰</span>${saleValue ? odo(saleCompact(saleValue).n) : '<span class="hnum">—</span>'}<b>${saleValue ? saleCompact(saleValue).u : 'سنتيم'}</b></div>
      </div>
      ${officeAlerts()}
      ${!S.props.length && !S.reqs.length ? `
        <div class="card empty">
          <div class="big">🏡</div><h3>مرحبا بك في تطبيق مكتب الوسيط 777</h3>
          <p>ابدأ بإضافة أول عقار أو أول طلب، أو جرّب التطبيق ببيانات تجريبية.</p>
          <div class="btn-row" style="justify-content:center;margin-top:12px">
            <a class="btn primary" href="#/property/new">${ic('plus', 18)} أول عقار</a>
            <button class="btn" id="seed">${ic('sparkle', 18)} بيانات تجريبية</button>
          </div>
        </div>` : `
      <div class="hboxes">
        <a class="card opp-cta" href="#/matching" style="--c:#1f9d68">
          <span class="opp-ic">✨</span>
          <span class="grow"><b>أفضل الفرص (طلب ↔ عقار)</b><small>${cold ? '⏳ جاري الحساب…' : strong ? 'ضغط باش تشوف المطابقات كاملين' : 'لا توجد مطابقات قوية حاليا'}</small></span>
          <span class="opp-n">${cold ? '…' : strong}</span>
        </a>
        <button class="card opp-cta" data-hbox="appts" style="--c:#2f6fd6">
          <span class="opp-ic">📅</span>
          <span class="grow"><b>مواعيد اليوم</b><small>${todayAppts.length ? 'ضغط باش تشوف المواعيد' : 'ما كاين حتى موعد اليوم'}</small></span>
          <span class="opp-n">${todayAppts.length}</span>
        </button>
        <button class="card opp-cta" data-hbox="follow" style="--c:#d98a14">
          <span class="opp-ic">🔔</span>
          <span class="grow"><b>متابعات اليوم</b><small>${follow.length ? 'زبناء خاصك تتاصل بيهم' : 'لا توجد متابعات مستحقة ✓'}</small></span>
          <span class="opp-n">${follow.length}</span>
        </button>
        <button class="card opp-cta" data-hbox="dist" style="--c:#c8102e">
          <span class="opp-ic">📊</span>
          <span class="grow"><b>توزيع العقارات المتاحة</b><small>${esc(Object.entries(byType).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => k.split(' ')[0] + ' ' + v).join(' · ') || '—')}</small></span>
          <span class="opp-n">${avail.length}</span>
        </button>
      </div>
      <h3 style="margin:22px 0 12px">آخر العقارات المضافة</h3>
      <div class="prop-grid">${S.props.slice(0, 6).map(propCard).join('')}</div>`}
    </div></div>`;
    hydrateThumbs(main());
    bindHomeSearch();
    odoRoll(main());
    $$('[data-hbox]').forEach(bt => bt.onclick = () => {
      const k = bt.dataset.hbox;
      if (k === 'appts') modal(`<div class="pair-head"><b>${ic('calendar', 18)} مواعيد اليوم</b><a class="btn sm gold" href="#/appointment/new" data-close>${ic('plus', 15)} موعد</a></div>
        ${todayAppts.length ? todayAppts.map(a => `
          <a class="list-row" href="#/appointment/${a.id}" data-close><div class="avatar" style="width:46px;height:38px;font-size:13px;border-radius:10px">${esc(a.time || '')}</div>
          <div class="grow"><b>${esc((a.client || {}).name || '')}</b><small class="muted">${esc(APPT_TYPES[a.type] || '')}${a.place ? ' · ' + esc(a.place) : ''}</small></div></a>`).join('')
          : `<div class="empty" style="padding:22px">ما كاين حتى موعد اليوم</div>`}
        <div class="btn-row" style="margin-top:12px"><a class="btn" href="#/appointments" data-close>${ic('calendar', 16)} جميع المواعيد</a></div>`);
      else if (k === 'follow') modal(`<div class="pair-head"><b>🔔 متابعات اليوم</b><span class="badge ${follow.length ? 'amber' : ''}">${follow.length}</span></div>
        ${follow.length ? follow.map(r => `
          <a class="list-row" href="#/request/${r.id}" data-close><div class="avatar" style="width:38px;height:38px;font-size:14px">${esc(((r.client && r.client.name) || '؟').trim()[0])}</div>
          <div class="grow"><b>${esc(r.client && r.client.name)}</b><small class="muted">${esc(r.followUp)} · ${esc(trxAr(r.transaction))} · ${esc(r.city || '')}</small></div></a>`).join('')
          : `<div class="empty" style="padding:22px">لا توجد متابعات مستحقة ✓</div>`}`);
      else modal(`<b style="display:block;margin-bottom:12px">📊 توزيع العقارات المتاحة (${avail.length})</b>
        <div class="bars">${Object.entries(byType).sort((x, y) => y[1] - x[1]).map(([kk, v]) => `
          <div class="bar"><span>${esc(kk)}</span><div class="track"><div class="fill" style="width:${v / maxT * 100}%"></div></div><b>${v}</b></div>`).join('') || '<span class="muted">—</span>'}</div>
        <div class="btn-row" style="margin-top:14px"><a class="btn" href="#/properties" data-close>${ic('building', 16)} جميع العقارات</a></div>`);
    });
    $$('[data-hm]').forEach(bt => bt.onclick = () => homeMenu(bt.dataset.hm, todayAppts.length));
    if (!EMBED && window.W777_SYNC && window.W777_SYNC.isOn()) homeNetwork();
    if (inNetwork() && !$('.grp-strip')) agLoadCfg().then(() => { const h = $('.hero'), g = groupsCard(false); if (h && g && !$('.grp-strip', h)) h.insertAdjacentHTML('beforeend', g); }).catch(() => {});
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
      ${list.length ? `<div class="prop-grid" id="plist"></div>` :
        `<div class="card empty"><div class="big">🔎</div><h3>لا توجد عقارات مطابقة</h3><p>غيّر كلمات البحث أو الفلاتر، أو أضف عقارا جديدا.</p>
        <a class="btn primary" href="#/property/new">${ic('plus', 18)} إضافة عقار</a></div>`}
    `;
    lazyFill($('#plist'), list, propCard, () => hydrateThumbs($('#plist')));
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
              <label class="dropzone" data-kind="photo">${ic('camera', 30)}<b>إضافة صور</b><small>من الكاميرا أو المعرض — تُضغط تلقائيا${S.role === 'admin' ? '' : ` · الحد الأقصى ${PHOTO_MAX} صور`}</small>
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
      if (kind === 'photo') {
        const room = photoLimit() - media.filter(m => m.kind === 'photo').length;
        if (room <= 0) { toast(`الحد الأقصى ${PHOTO_MAX} صور لكل عقار`, 3500); return; }
        if (files.length > room) { toast(`تزادو غير ${room} صور — الحد الأقصى ${PHOTO_MAX} صور لكل عقار`, 3500); files = files.slice(0, room); }
      }
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
          <button class="btn gold" id="p-pres">📺 عرض للزبون</button>
          <button class="btn" id="p-poster">🖼️ ملصق إعلاني</button>
          <a class="btn" href="#/ad-maker?p=${encodeURIComponent(p.id)}">✨ إصنع إعلانا</a>
          ${p.status === 'available' && !p.partner ? `<button class="btn${p.catalog ? ' gold' : ''}" id="p-cat">🌐 ${p.catalog ? 'فالكتالوج ✓' : 'نشر فالكتالوج'}</button>` : ''}
          ${!isRent(p.transaction) && pr ? `<a class="btn" href="#/loan?price=${pr}">🏦 القرض</a>` : ''}
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
          ${propOfficeCards(p)}
          <div class="no-print" id="nt-near"></div>
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
            أضيف: ${esc((p.createdAt || '').slice(0, 10))} · آخر تعديل: ${esc((p.updatedAt || '').slice(0, 10))}${byName(p._by) ? ' — ' + esc(byName(p._by)) : ''}
            <div class="btn-row" style="margin-top:10px">
              <button class="btn sm" id="p-dup">${ic('copy', 15)} نسخ كعقار جديد</button>
              <button class="btn sm danger" id="p-del">${ic('trash', 15)} حذف العقار</button>
            </div>
          </div>
        </div>
      </div>`;
    hydrateThumbs(main());
    notaryBox($('#nt-near'), { ref: p.ref, title: p.title || typeAr(p.type), city: p.city, district: p.district, gps: p.gps });
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
    $('#p-pres').onclick = () => presentProp(p);
    bindPropOffice(p, () => { const y = window.scrollY; viewProp(p.id).then(() => window.scrollTo(0, y)); });
    $('#p-poster').onclick = () => posterModal(p);
    const pc = $('#p-cat'); if (pc) pc.onclick = () => toggleCatalog(p, () => viewProp(p.id));
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
          if (blob) { const wm = await watermark(blob); files.push(new File([wm], (p.ref || 'photo') + '-' + (files.length + 1) + '.jpg', { type: wm.type || 'image/jpeg' })); }
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
      ${list.length ? `<div class="card" style="overflow:hidden" id="rlist"></div>` :
        `<div class="card empty"><div class="big">🧾</div><h3>لا توجد طلبات</h3><p>سجّل طلب زبون ليقترح عليك التطبيق العقارات المناسبة تلقائيا.</p>
        <a class="btn primary" href="#/request/new">${ic('plus', 18)} إضافة طلب</a></div>`}`;
    lazyFill($('#rlist'), list, reqCard, null, 40, 40);
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
    $$('[data-prop-state]', root).forEach(el => el.dataset.bound || (el.dataset.bound = 1, el.addEventListener('click', async () => {
      await markProposal(el.dataset.r, el.dataset.p, el.dataset.propState);
      if (el.tagName === 'A') setTimeout(rerender, 400); else rerender();
    })));
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
      ${rows.length ? '<div id="mlist"></div>' : `<div class="card empty"><div class="big">🎯</div><h3>لا توجد طلبات مفتوحة</h3><p>أضف طلبات الزبناء ليقترح عليك التطبيق العقارات المناسبة.</p><a class="btn primary" href="#/request/new">${ic('plus', 18)} إضافة طلب</a></div>`}`;
    const pairCard = ({ r, ms }) => `
        <div class="card" style="margin-bottom:16px;overflow:hidden">
          <div class="pair-head">
            <a href="#/request/${r.id}" style="text-decoration:none;display:flex;gap:10px;align-items:center">
              <div class="avatar" style="width:40px;height:40px;font-size:15px">${esc(((r.client && r.client.name) || '؟').trim()[0])}</div>
              <div><b>${esc(r.client && r.client.name)} ${r.priority === 'high' ? '🔥' : ''}</b><div class="muted" style="font-size:12.5px">${esc(r.ref)} · ${esc(trxAr(r.transaction))} · ${esc((r.types || []).map(typeAr).slice(0, 3).join('، ') || 'أي نوع')} · ${esc(r.city || '')} · ${r.budgetMax ? esc(fmt(r.budgetMax)) + ' د' : ''}</div></div>
            </a>
            <span class="badge ${ms.length ? 'green' : ''}">${ms.length} عقار</span>
          </div>
          <div style="padding:12px" class="match-list">${ms.length ? ms.slice(0, 4).map(x => matchCard(x.p, x.m, r)).join('') + (ms.length > 4 ? `<a class="btn block" href="#/request/${r.id}">عرض الكل (${ms.length})</a>` : '') : '<div class="muted" style="padding:6px">لا يوجد عقار بهذه النسبة</div>'}</div>
        </div>`;
    lazyFill($('#mlist'), rows, pairCard, () => { hydrateThumbs($('#mlist')); bindProposalButtons($('#mlist'), () => viewMatching(query)); }, 8, 8);
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
            <div class="field full"><label class="chk"><input type="checkbox" name="watermark" ${S.settings.watermark !== false ? 'checked' : ''}> 💧 علامة مائية (الشعار + الهاتف) على الصور اللي كتشاركها</label></div>
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

        ${agentSettingsCard()}

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
            <div class="field"><label>⚡ الحركات والتأثيرات</label>${fSeg('motion', [{ v: 'auto', l: 'تلقائي' }, { v: 'full', l: 'كاملة' }, { v: 'lite', l: 'خفيفة' }], motionMode())}
              <small class="muted">إلا كانت الشاشة كتكحّل ولا كتبيّض ولا التطبيق تقيل فالحاسوب، ختار «خفيفة».</small></div>
            <div class="field"><label>قفل التطبيق برمز سري</label>
              <div class="btn-row">${hasPin ? `<button class="btn" id="pin-change">${ic('lock', 16)} تغيير الرمز</button><button class="btn danger" id="pin-off">إلغاء القفل</button>` : `<button class="btn" id="pin-on">${ic('lock', 16)} تفعيل القفل</button>`}</div></div>
          </div>
        </div>
        ${await securityBioCard()}
        ${EMBED ? '' : staffCard()}
        ${await pushCard()}
        ${EMBED ? '' : catalogCard()}

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

    if (!EMBED) { bindCloudCard(); bindAgentCard(); if (S.role !== 'agency') renderPartners(); }
    $('#sform').onsubmit = async e => {
      e.preventDefault();
      Object.assign(S.settings, collect(e.target), { updatedAt: new Date().toISOString() });
      await DB.setMeta('settings', S.settings);
      await DB.markDirty('meta', 'settings');
      toast('تم الحفظ ✓');
    };
    $$('[name=theme]').forEach(el => el.onchange = () => { localStorage.setItem('w777_theme', el.value); applyTheme(); });
    $$('[name=motion]').forEach(el => el.onchange = () => { try { localStorage.setItem('w777_motion', el.value); } catch (e) { /* */ } applyMotion(); toast('تم ✓'); });
    $('#imp-folder').onchange = e => { if (e.target.files.length) importFolder(e.target.files); e.target.value = ''; };
    $('#imp-vcf').onchange = e => { if (e.target.files[0]) importContacts(e.target.files[0]); e.target.value = ''; };
    $('#imp-photos').onchange = e => { if (e.target.files.length) importFolder(e.target.files, true); e.target.value = ''; };
    if (!EMBED) $('#bk-full').onclick = () => exportBackup(true);
    $('#bk-light').onclick = () => exportBackup(false);
    $('#bk-import').onchange = e => { if (e.target.files[0]) importBackup(e.target.files[0]); };
    $('#csv-props').onclick = exportPropsCsv;
    $('#csv-reqs').onclick = exportReqsCsv;
    const po = $('#pin-on'); if (po) po.onclick = () => setupPin();
    bindBioCard(); bindCatalogCard(); bindStaffCard(); bindPushCard();
    const pc = $('#pin-change'); if (pc) pc.onclick = () => setupPin();
    const pf = $('#pin-off'); if (pf) pf.onclick = async () => { if (await confirmBox('إلغاء القفل بالرمز السري؟', 'إلغاء القفل')) { localStorage.removeItem('w777_pin'); toast('تم إلغاء القفل'); viewSettings(); } };
    const ps = $('#persist'); if (ps) ps.onclick = async () => { const ok = await DB.persist(); toast(ok ? 'تم تفعيل الحماية ✓' : 'المتصفح رفض الطلب — ثبّت التطبيق على الشاشة الرئيسية ثم أعد المحاولة'); viewSettings(); };
    const ins = $('#install'); if (ins) ins.onclick = async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; viewSettings(); };
    const cds = $('#custom-ds'); if (cds) cds.onclick = manageCustomDistricts;
    $('#wipe').onclick = async () => {
      if (!(await confirmBox(window.W777_SYNC && window.W777_SYNC.isOn() ? 'مسح البيانات من هذا الجهاز فقط؟ (ستبقى في السحابة وتعود عند المزامنة)' : 'مسح كل العقارات والطلبات والصور من هذا الجهاز؟ لا يمكن التراجع!', 'نعم، امسح كل شيء'))) return;
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
        ${fInput('email', 'البريد أو الرمز (agence001 · W001 · B001 · F001)', '', { attrs: 'dir="ltr" autocapitalize="off" autocomplete="username"' })}
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
    if (staffMe()) return 0;
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) return 0;
    const items = await (await Sy.request('/rest/v1/w777_partner_items?imported=eq.false&select=id,token,data,photos,created_at,w777_partners(name,phone)&order=created_at.asc&limit=20')).json();
    let n = 0;
    for (const it of items) {
      const id = 'pt-' + it.id;
      const d = it.data || {}, pa = it.w777_partners || {};
      if (!(await DB.get('properties', id))) {
        const media = [];
        for (const path of (it.photos || []).slice(0, photoLimit())) {
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
      Sy.signOut(); S.role = null; S.kind = null; S.dir = null; S.agency = null; S.roleFor = null; S.net = null; localStorage.removeItem('w777_role'); viewSettings();
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
    if (Sy.onPulled) { Sy.onPulled(importPartnerItems); Sy.onPulled(publishShared); Sy.onPulled(publishCatalog); }
    Sy.onChange(async () => {
      await loadAll();
      const h = location.hash;
      if (!/\/(new|edit)/.test(h) && !h.startsWith('#/settings')) route();
    });
    btn.onclick = () => { Sy.syncNow(); toast('جاري المزامنة…'); };
    paint(Sy.status());
  }

  /* ============================================================
     الوكيل الذكي 🤖 (أفاتار بصورة المدير) — Claude عبر Supabase Edge Function
     الأدوات كتخدم هنا فالجهاز، على بيانات الحساب اللي داخل.
     ============================================================ */
  const AG_LANGS = [
    { id: 'darija', l: 'الدارجة', dir: 'rtl' }, { id: 'ar', l: 'العربية', dir: 'rtl' }, { id: 'fr', l: 'Français', dir: 'ltr' },
    { id: 'en', l: 'English', dir: 'ltr' }, { id: 'es', l: 'Español', dir: 'ltr' }, { id: 'it', l: 'Italiano', dir: 'ltr' },
  ];
  const AG_T = {
    darija: { hi: 'مرحبا! أنا المساعد ديال الوسيط 777. شنو نقدر نعاونك؟', ph: 'كتب سؤالك…', send: 'صيفط', fresh: 'محادثة جديدة', think: 'كنخدم…', login: 'دخل بالحساب ديالك أولا (الإعدادات ← المزامنة).', nokey: 'الوكيل مازال ما تفعّلش: خاص المدير يزيد المفتاح فالإعدادات.', quota: 'وصلتي للحد اليومي ديال الرسائل. رجع غدا.', err: 'وقع مشكل، عاود من بعد.', s: ['شنو المواعيد ديال اليوم؟', 'قلب ليا على شقة للبيع فمرجان تحت 700 ألف', 'شكون الزبناء اللي كيناسبهم آخر عقار؟'] },
    ar: { hi: 'مرحبا! أنا مساعد الوسيط 777. كيف يمكنني مساعدتك؟', ph: 'اكتب سؤالك…', send: 'إرسال', fresh: 'محادثة جديدة', think: 'جارٍ العمل…', login: 'سجّل الدخول أولا (الإعدادات ← المزامنة).', nokey: 'المساعد غير مفعّل بعد: يجب على المدير إضافة المفتاح في الإعدادات.', quota: 'بلغت الحد اليومي من الرسائل.', err: 'حدث خطأ، أعد المحاولة لاحقا.', s: ['ما هي مواعيد اليوم؟', 'ابحث عن شقة للبيع في مرجان بأقل من 700 ألف درهم', 'ما هي إحصائيات المكتب؟'] },
    fr: { hi: 'Bonjour ! Je suis l’assistant Al Wasset 777. Comment puis-je vous aider ?', ph: 'Écrivez votre question…', send: 'Envoyer', fresh: 'Nouvelle conversation', think: 'Je travaille…', login: 'Connectez-vous d’abord (Paramètres → Synchronisation).', nokey: 'L’assistant n’est pas encore activé : l’administrateur doit ajouter la clé dans les Paramètres.', quota: 'Limite quotidienne atteinte.', err: 'Une erreur est survenue, réessayez.', s: ['Quels sont les rendez-vous du jour ?', 'Cherche un appartement à vendre à Marjane sous 700 000 DH', 'Statistiques de l’agence'] },
    en: { hi: 'Hello! I’m the Al Wasset 777 assistant. How can I help?', ph: 'Type your question…', send: 'Send', fresh: 'New chat', think: 'Working…', login: 'Please sign in first (Settings → Sync).', nokey: 'The assistant isn’t activated yet: the admin must add the key in Settings.', quota: 'Daily message limit reached.', err: 'Something went wrong, try again.', s: ['What are today’s appointments?', 'Find an apartment for sale in Marjane under 700,000 DH', 'Office statistics'] },
    es: { hi: '¡Hola! Soy el asistente de Al Wasset 777. ¿En qué puedo ayudarte?', ph: 'Escribe tu pregunta…', send: 'Enviar', fresh: 'Nueva conversación', think: 'Trabajando…', login: 'Inicia sesión primero (Ajustes → Sincronización).', nokey: 'El asistente aún no está activado: el administrador debe añadir la clave en Ajustes.', quota: 'Límite diario alcanzado.', err: 'Ha ocurrido un error, inténtalo de nuevo.', s: ['¿Qué citas hay hoy?', 'Busca un piso en venta en Marjane por menos de 700.000 DH', 'Estadísticas de la agencia'] },
    it: { hi: 'Ciao! Sono l’assistente di Al Wasset 777. Come posso aiutarti?', ph: 'Scrivi la tua domanda…', send: 'Invia', fresh: 'Nuova chat', think: 'Sto lavorando…', login: 'Accedi prima (Impostazioni → Sincronizzazione).', nokey: 'L’assistente non è ancora attivo: l’amministratore deve aggiungere la chiave nelle Impostazioni.', quota: 'Limite giornaliero raggiunto.', err: 'Si è verificato un errore, riprova.', s: ['Quali appuntamenti ci sono oggi?', 'Cerca un appartamento in vendita a Marjane sotto 700.000 DH', 'Statistiche dell’agenzia'] },
  };
  const AG = { open: false, busy: false, history: [], view: [], cfg: null };
  const agAI = () => !!(AG.cfg && AG.cfg.ai_enabled);
  // الدارجة هي اللغة الافتراضية (مرة وحدة كنرجعو ليها حتى اللي كانو مختارين العربية من قبل)
  try { if (!localStorage.getItem('w777_agent_lang_v2')) { localStorage.setItem('w777_agent_lang_v2', '1'); localStorage.removeItem('w777_agent_lang'); } } catch (e) { /* */ }
  const agLang = () => { try { return localStorage.getItem('w777_agent_lang') || 'darija'; } catch (e) { return 'darija'; } };
  const agT = () => AG_T[agLang()] || AG_T.darija;
  function agCfgCached() { try { return JSON.parse(localStorage.getItem('w777_agent_cfg') || 'null'); } catch (e) { return null; } }
  async function agLoadCfg() {
    const Sy = window.W777_SYNC;
    AG.cfg = AG.cfg || agCfgCached() || { name: 'مساعد الوسيط 777', photo: null };
    if (!Sy || !Sy.isOn()) return AG.cfg;
    try {
      const r = (await (await Sy.request('/rest/v1/w777_agent_config?id=eq.1&select=name,photo,face,ai_enabled,wa_group,tg_group,fb_group,updated_at')).json())[0];
      if (r) { AG.cfg = r; try { localStorage.setItem('w777_agent_cfg', JSON.stringify(r)); } catch (e) { /* */ } }
    } catch (e) { /* بدون إنترنت */ }
    agPaintButton();
    return AG.cfg;
  }
  const agPhoto = () => (AG.cfg && AG.cfg.photo) || 'icons/icon-192.png?v=9';
  function agPaintButton() {
    const b = $('#agent-fab'); if (!b) return;
    b.innerHTML = `<img src="${agPhoto()}" alt=""><i></i>`;
    const h = $('#agent-head-img'); if (h) h.src = agPhoto();
    // الصورة الجديدة كتبان حتى فالأفاتار 3D والخلفية ديال المحادثة
    const p = $('#agent-panel');
    if (p) {
      p.style.setProperty('--ag-photo', `url("${agPhoto().replace(/"/g, '%22')}")`);
      $$('#ag-3d img, .ag-msg.bot img', p).forEach(i => { i.src = agPhoto(); });
      agFaceVars();
    }
  }
  function setupAgent() {
    if (EMBED) return;
    const b = document.createElement('button');
    b.id = 'agent-fab'; b.className = 'agent-fab'; b.setAttribute('aria-label', 'AI');
    document.body.appendChild(b);
    AG.cfg = agCfgCached();
    agPaintButton();
    b.onclick = () => (AG.open ? agClose() : agOpen());
    agLoadCfg();
  }
  // ---------- الصوت ----------
  // 1) صوت طبيعي من Gemini (عبر السيرفر ديالنا) كيتقرا بـ Web Audio، والفم كيتبع قوة الصوت.
  // 2) إلا ما خدمش (بلا إنترنت، الحصة…): صوت المتصفح (Speech Synthesis) والفم كيتحرك بالتقريب.
  // الجواب كيتقسم لجمل: أول جملة كتبدا تتقرا قبل ما يكمل الكتابة.
  const agTTS = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const agVoiceOn = () => { try { return localStorage.getItem('w777_agent_voice') !== '0'; } catch (e) { return true; } };
  const AGV = { ctx: null, an: null, buf: null, src: null, q: [], playing: false, gen: 0, cloudOff: 0, synth: false, said: 0, pend: '', pulse: 0 };
  function agAudio() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!AGV.ctx) {
      try { AGV.ctx = new C(); AGV.an = AGV.ctx.createAnalyser(); AGV.an.fftSize = 512; AGV.an.smoothingTimeConstant = 0.35; AGV.an.connect(AGV.ctx.destination); AGV.buf = new Uint8Array(AGV.an.fftSize); }
      catch (e) { AGV.ctx = null; return null; }
    }
    if (AGV.ctx.state === 'suspended') AGV.ctx.resume().catch(() => {});
    return AGV.ctx;
  }
  let agTTSReady = false;
  function agUnlockTTS() { // iPhone: خاص أول صوت يكون من ضغطة
    const c = agAudio();
    if (c && !AGV.unlocked) { try { const b = c.createBuffer(1, 1, 22050), s0 = c.createBufferSource(); s0.buffer = b; s0.connect(c.destination); s0.start(0); AGV.unlocked = true; } catch (e) { /* */ } }
    if (agTTSReady || !agTTS()) return; agTTSReady = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* */ }
  }
  function agVoice(tag) {
    const vs = speechSynthesis.getVoices(), base = tag.split('-')[0];
    const male = v => /male|homme|maged|tarik|hamed|naayf|majed|rachid|thomas|daniel/i.test(v.name) && !/female/i.test(v.name);
    const fit = vs.filter(v => v.lang === tag || v.lang.replace('_', '-').startsWith(base));
    return fit.find(male) || fit.find(v => v.lang === tag) || fit[0] || null;
  }
  const agStage = on => { const st = $('#ag-stage'); if (st) st.classList.toggle('talk', on); };
  // نص صالح للقراية: بلا رموز ولا روابط ولا إيموجي
  function agSpeechText(src, isHtml) {
    let txt = src;
    if (isHtml) { const d = document.createElement('div'); d.innerHTML = src; $$('.ag-card small, .ag-stats small', d).forEach(x => x.remove()); $$('*', d).forEach(x => x.append(' ')); txt = d.textContent; }
    return String(txt).replace(/\*\*/g, '').replace(/[\p{Extended_Pictographic}️‍]/gu, ' ').replace(/[#*_`>|•]/g, ' ').replace(/https?:\/\/\S+/g, '').replace(/W777-0*(\d+)/g, '$1').replace(/DM-0*(\d+)/g, 'طلب $1').replace(/\s+/g, ' ').trim();
  }
  function agHush() {
    AGV.gen++; AGV.q = []; AGV.playing = false; AGV.pend = ''; AGV.said = 0;
    if (AGV.src) { try { AGV.src.onended = null; AGV.src.stop(); } catch (e) { /* */ } AGV.src = null; }
    if (agTTS()) { try { speechSynthesis.cancel(); } catch (e) { /* */ } }
    AGV.synth = false; agStage(false);
  }
  // جواب جديد: كنوقفو الصوت القديم ونبداو صف جديد
  function agSayStart() { agHush(); }
  // كيوصل النص شوية بشوية: كنقطعوه لجمل ونصيفطو كل جملة كاملة للصوت
  function agSayFeed(delta) {
    if (!agVoiceOn() || !AG.open) return;
    AGV.pend += delta;
    for (;;) {
      const min = AGV.q.length || AGV.playing ? 140 : 20; // الجملة الأولى قصيرة باش يبدا بسرعة
      const re = /[.!?؟؛:](?=\s)|\n/g; let m, cut = -1;
      while ((m = re.exec(AGV.pend))) { if (m.index + 1 >= min) { cut = m.index + 1; break; } }
      if (cut < 0) { if (AGV.pend.length <= 400) break; const sp = AGV.pend.lastIndexOf(' ', 380); cut = sp > 50 ? sp : 380; }
      agSayChunk(AGV.pend.slice(0, cut)); AGV.pend = AGV.pend.slice(cut);
    }
  }
  function agSayFlush() { if (AGV.pend.trim()) agSayChunk(AGV.pend); AGV.pend = ''; }
  function agSayChunk(raw) {
    const txt = agSpeechText(raw);
    if (!txt || /^[\d\s.,:-]*$/.test(txt) || AGV.said > 1400) return;
    AGV.said += txt.length;
    const gen = AGV.gen, item = { txt, gen };
    item.audio = agCloudOK() ? agFetchVoice(txt).catch(() => null) : Promise.resolve(null);
    AGV.q.push(item);
    if (!AGV.playing) agPlayNext();
  }
  const agCloudOK = () => !!(agAudio() && AG.cfg && AG.cfg.ai_enabled && window.W777_SYNC && window.W777_SYNC.isOn() && Date.now() > AGV.cloudOff);
  async function agFetchVoice(txt) {
    const res = await window.W777_SYNC.request('/functions/v1/w777-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tts: txt, lang: agLang() }) });
    if (!/audio/.test(res.headers.get('content-type') || '')) throw new Error('tts');
    const ab = await res.arrayBuffer();
    return await new Promise((ok, ko) => { const p = AGV.ctx.decodeAudioData(ab, ok, ko); if (p && p.then) p.then(ok, ko); });
  }
  async function agPlayNext() {
    const it = AGV.q.shift();
    if (!it || it.gen !== AGV.gen || !AG.open) { AGV.playing = false; if (!AGV.q.length) agStage(false); return; }
    AGV.playing = true; agStage(true);
    const buf = await it.audio;
    if (it.gen !== AGV.gen) return;
    if (buf && AGV.ctx) {
      const src = AGV.ctx.createBufferSource(); src.buffer = buf; src.connect(AGV.an);
      AGV.src = src; src.onended = () => { if (AGV.src === src) AGV.src = null; agPlayNext(); };
      try { src.start(0); return; } catch (e) { /* نكملو بصوت المتصفح */ }
    }
    if (agCloudOK() && !buf) AGV.cloudOff = Date.now() + 10 * 60000; // الصوت الطبيعي ما خدمش: 10 دقايق بصوت المتصفح
    if (!agTTS()) { agPlayNext(); return; }
    const tag = AG_SR_LANG[agLang()] || 'ar-SA', u = new SpeechSynthesisUtterance(it.txt);
    u.lang = tag; const v = agVoice(tag); if (v) u.voice = v;
    u.rate = 1.02; u.pitch = 0.95;
    u.onstart = () => { AGV.synth = true; };
    u.onboundary = () => { AGV.pulse = performance.now(); };
    u.onend = u.onerror = () => { AGV.synth = false; if (it.gen === AGV.gen) agPlayNext(); };
    speechSynthesis.speak(u);
  }
  // الطريقة القديمة (جواب كامل دفعة وحدة) — للمساعد البسيط
  function agSpeak(src, isHtml) {
    if (!agVoiceOn() || !AG.open) return;
    const txt = agSpeechText(src, isHtml).slice(0, 700);
    if (!txt) return;
    agSayStart(); agSayFeed(txt + ' '); agSayFlush();
  }
  if (agTTS()) { try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch (e) { /* */ } }

  // ---------- الوجه الحي: الفم كيتحل مع الصوت، العينين كيرمشو، والراس كيتحرك ----------
  // مكان الفم والعينين (نسبة من الصورة) كيحددو المدير مرة وحدة من الإعدادات.
  const AG_FACE_DEF = { mx: 0.5, my: 0.64, ex1: 0.4, ex2: 0.6, ey: 0.43 };
  function agFace() {
    const f = Object.assign({}, AG_FACE_DEF, (AG.cfg && AG.cfg.face) || {});
    const d = Math.max(0.08, (f.ex2 - f.ex1));
    f.mw = f.mw || d * 0.85; f.ew = f.ew || d * 0.32;
    return f;
  }
  function agFaceVars() {
    const el = $('#ag-face'); if (!el) return;
    const f = agFace(), pc = v => (v * 100).toFixed(2) + '%';
    el.style.setProperty('--mx', pc(f.mx)); el.style.setProperty('--my', pc(f.my)); el.style.setProperty('--mw', pc(f.mw));
    el.style.setProperty('--ex1', pc(f.ex1)); el.style.setProperty('--ex2', pc(f.ex2)); el.style.setProperty('--ey', pc(f.ey)); el.style.setProperty('--ew', pc(f.ew));
    // لون الجلد فوق العين (للرمشة)
    const img = $('img.ag-base', el);
    const skin = () => { try {
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, 64, 64);
      const px = (u, v) => x.getImageData(Math.round(u * 63), Math.round(v * 63), 1, 1).data;
      const a = px(f.ex1, f.ey - f.ew * 0.55), b = px(f.ex2, f.ey - f.ew * 0.55);
      el.style.setProperty('--skin', `rgb(${(a[0] + b[0]) >> 1},${(a[1] + b[1]) >> 1},${(a[2] + b[2]) >> 1})`);
    } catch (e) { /* */ } };
    if (img) { if (img.complete && img.naturalWidth) skin(); else img.onload = skin; }
  }
  let agRaf = 0;
  function agAnimate() {
    cancelAnimationFrame(agRaf);
    const face = $('#ag-face'), stage = $('#ag-stage');
    if (!face || !AG.open) return;
    let open = 0, nextBlink = performance.now() + 1800, blinkT = 0;
    const tick = now => {
      if (!AG.open || !face.isConnected) return;
      let target = 0;
      if (AGV.src && AGV.an) {
        AGV.an.getByteTimeDomainData(AGV.buf);
        let sum = 0; for (let i = 0; i < AGV.buf.length; i++) { const v = (AGV.buf[i] - 128) / 128; sum += v * v; }
        target = Math.min(1, Math.sqrt(sum / AGV.buf.length) * 4.5);
      } else if (AGV.synth) {
        // صوت المتصفح ما كيعطيش الموجة: حركة طبيعية تقريبية + نبضة مع كل كلمة
        const w = 0.45 + 0.35 * Math.sin(now / 70) * Math.sin(now / 190 + 1.3);
        target = Math.max(0, w) + (now - AGV.pulse < 120 ? 0.3 : 0);
      }
      open += (target - open) * (target > open ? 0.55 : 0.3);
      if (open < 0.02) open = 0;
      face.style.setProperty('--open', open.toFixed(3));
      if (stage) stage.style.setProperty('--nod', (open * 2.2).toFixed(2) + 'deg');
      // رمشة كل 2–6 ثواني
      if (now > nextBlink) { blinkT = now; nextBlink = now + 2000 + Math.random() * 4000; }
      const bt = now - blinkT, blink = bt < 160 ? Math.sin((bt / 160) * Math.PI) : 0;
      face.style.setProperty('--blink', blink.toFixed(3));
      agRaf = requestAnimationFrame(tick);
    };
    agRaf = requestAnimationFrame(tick);
  }
  // ---------- الصورة 3D: كتميل مع الصبع/الفأرة ----------
  function agTilt(stage, card) {
    if (!stage || !card) return;
    const move = (x, y) => {
      const r = stage.getBoundingClientRect();
      const rx = ((y - r.top) / r.height - 0.5) * -16, ry = ((x - r.left) / r.width - 0.5) * 22;
      card.style.setProperty('--rx', rx.toFixed(1) + 'deg'); card.style.setProperty('--ry', ry.toFixed(1) + 'deg');
    };
    const reset = () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); };
    stage.addEventListener('pointermove', e => move(e.clientX, e.clientY));
    stage.addEventListener('pointerleave', reset);
    stage.addEventListener('click', () => stage.classList.toggle('mini'));
  }
  // ---------- الميكروفون (التعرف على الصوت ديال المتصفح — فابور) ----------
  const agSR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
  const AG_SR_LANG = { darija: 'ar-MA', ar: 'ar-MA', fr: 'fr-FR', en: 'en-US', es: 'es-ES', it: 'it-IT' };
  const agMicSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  let agRec = null;
  function agListen() {
    const SR = agSR(), mic = $('#ag-mic'), ta = $('#ag-text');
    if (!SR || !mic) return;
    if (agRec) { agRec.stop(); return; }
    const rec = new SR();
    rec.lang = AG_SR_LANG[agLang()] || 'ar-MA';
    rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      ta.value = (finalText + interim).trim();
    };
    rec.onerror = e => {
      const m = { 'not-allowed': '🎤 عطي الإذن للميكروفون من إعدادات المتصفح', 'no-speech': '🎤 ما سمعت والو، عاود', network: '🎤 خاص الإنترنت باش يخدم الصوت' }[e.error];
      if (m) toast(m, 3500);
    };
    rec.onend = () => {
      agRec = null; mic.classList.remove('on'); ta.placeholder = agT().ph;
      const v = (finalText || ta.value).trim();
      if (v && !AG.busy) { ta.value = ''; agSend(v); }
    };
    try { rec.start(); agRec = rec; mic.classList.add('on'); ta.value = ''; ta.placeholder = '🎤 …'; }
    catch (e) { toast('🎤 ' + e.message); }
  }
  // الإغلاق من الزر: كنرجعو خطوة فالتاريخ (باش زر الرجوع ديال الهاتف حتى هو يسد المساعد)
  function agClose() { if (history.state && history.state.ag) history.back(); else agHide(); }
  function agHide() {
    agHush();
    if (agRec) { try { agRec.abort(); } catch (e) { /* */ } agRec = null; } AG.open = false; const p = $('#agent-panel'); if (p) p.remove(); }
  function agOpen() {
    AG.open = true;
    if (!(history.state && history.state.ag)) { try { history.pushState({ ag: 1 }, ''); } catch (e) { /* */ } }
    const t = agT(), L = AG_LANGS.find(x => x.id === agLang()) || AG_LANGS[0];
    const p = document.createElement('div');
    p.id = 'agent-panel'; p.className = 'agent-panel'; p.dir = L.dir;
    p.style.setProperty('--ag-photo', `url("${agPhoto().replace(/"/g, '%22')}")`);
    p.innerHTML = `
       <div class="ag-head"><button class="ag-x ag-back" id="ag-back" title="رجوع للصفحة السابقة" aria-label="رجوع">${L.dir === 'rtl' ? '→' : '←'}</button><img id="agent-head-img" src="${agPhoto()}" alt="">
        <div class="grow"><b>${esc((AG.cfg && AG.cfg.name) || 'مساعد الوسيط 777')}</b><small>${agAI() ? 'AI' : '🆓 ' + esc(lx().limited.split(':')[0].split('：')[0])}</small></div>
        <select id="ag-lang" title="Langue">${AG_LANGS.map(x => `<option value="${x.id}" ${x.id === L.id ? 'selected' : ''}>${x.l}</option>`).join('')}</select>
        ${agTTS() ? `<button class="ag-x" id="ag-voice" title="🔊">${agVoiceOn() ? '🔊' : '🔇'}</button>` : ''}<button class="ag-x" id="ag-new" title="${esc(t.fresh)}">↺</button><button class="ag-x" id="ag-close">✕</button></div>
      <div class="ag-stage" id="ag-stage">
        <div class="ag-3d" id="ag-3d"><div class="ag-face" id="ag-face"><img class="ag-base" src="${agPhoto()}" alt=""><i class="ag-mouth"></i><img class="ag-jaw" src="${agPhoto()}" alt=""><i class="ag-lid l"></i><i class="ag-lid r"></i></div><i class="ag-gloss"></i></div>
        <div class="ag-wave"><span></span><span></span><span></span><span></span><span></span></div></div>
      <div class="ag-body" id="ag-body"></div>
      <div class="ag-acts" id="ag-acts"></div>
      <form class="ag-input" id="ag-form">${agSR() ? `<button type="button" class="ag-mic" id="ag-mic" title="🎤">${agMicSvg}</button>` : ''}<textarea id="ag-text" rows="1" placeholder="${esc(t.ph)}"></textarea><button class="btn gold sm" type="submit">${esc(t.send)}</button></form>`;
    document.body.appendChild(p);
    $('#ag-close').onclick = agClose;
    $('#ag-back').onclick = agClose;
    $('#ag-new').onclick = () => { AG.history = []; AG.view = []; agRender(); };
    $('#ag-lang').onchange = e => { try { localStorage.setItem('w777_agent_lang', e.target.value); } catch (er) { /* */ } agHide(); agOpen(); };
    const ta = $('#ag-text');
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#ag-form').requestSubmit(); } };
    $('#ag-form').onsubmit = e => { e.preventDefault(); agUnlockTTS(); const v = ta.value.trim(); if (v && !AG.busy) { ta.value = ''; agSend(v); } };
    const mic = $('#ag-mic'); if (mic) mic.onclick = () => { agUnlockTTS(); agHush(); agListen(); };
    const vb = $('#ag-voice');
    if (vb) vb.onclick = () => { const on = !agVoiceOn(); try { localStorage.setItem('w777_agent_voice', on ? '1' : '0'); } catch (e) { /* */ } vb.textContent = on ? '🔊' : '🔇'; if (!on) agHush(); };
    agTilt($('#ag-stage'), $('#ag-3d'));
    agFaceVars(); agAnimate();
    agLoadCfg(); // ديما آخر صورة واسم حطهم المدير
    agRender();
    setTimeout(() => ta.focus(), 50);
  }
  // نص بسيط: **عريض** + سطور
  const agFmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
  function agRender() {
    const body = $('#ag-body'); if (!body) return;
    const t = agT();
    const items = AG.view.length ? AG.view : [{ who: 'bot', text: agAI() ? t.hi : lx().hi }];
    body.innerHTML = items.map(m => m.who === 'tool'
      ? `<div class="ag-tool">⚙️ ${esc(m.text)}</div>`
      : `<div class="ag-msg ${m.who}">${m.who === 'bot' ? `<img src="${agPhoto()}" alt="">` : ''}<div${m === AG.live ? ' id="ag-live"' : ''}>${m.html || agFmt(m.text)}</div></div>`).join('')
      + (!AG.view.length && agAI() ? `<div class="ag-sugg">${t.s.map(x => `<button type="button">${esc(x)}</button>`).join('')}</div>` : '')
      + (AG.busy && !AG.live ? `<div class="ag-msg bot"><img src="${agPhoto()}" alt=""><div class="ag-dots">${esc(t.think)}<span>.</span><span>.</span><span>.</span></div></div>` : '');
    $$('.ag-sugg button', body).forEach(b => b.onclick = () => agSend(b.textContent));
    $$('a.ag-card, a.ag-more', body).forEach(a => a.addEventListener('click', () => { if (window.innerWidth < 960) agHide(); }));
    const acts = $('#ag-acts');
    if (acts) {
      acts.classList.toggle('hidden', agAI());
      acts.innerHTML = LX_ACTIONS.map(k => `<button type="button" data-k="${k}">${esc(lx()[k])}</button>`).join('');
      $$('button', acts).forEach(b => b.onclick = () => { agUnlockTTS(); AG.view.push({ who: 'me', text: b.textContent }); agLocal(b.textContent, b.dataset.k); });
    }
    body.scrollTop = body.scrollHeight;
  }
  // صورة حية على المكتب كتتصيفط مع كل سؤال: الأرقام والمواعيد ديال اليوم بلا ما يحتاج المساعد يسول الأدوات
  function agSnap() {
    const t = today(), open = S.reqs.filter(openReq), wk = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const ap = S.appts.filter(x => x.status === 'planned' && x.date >= t).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
    let late = 0; try { late = lateLeases().length; } catch (e) { /* */ }
    return {
      properties_total: S.props.length, available: S.props.filter(p => p.status === 'available').length,
      sold_or_rented: S.props.filter(p => ['sold', 'rented'].includes(p.status)).length, open_requests: open.length,
      appointments_today: ap.filter(x => x.date === t).slice(0, 8).map(x => ({ time: x.time, client: (x.client || {}).name, type: APPT_TYPES[x.type] || x.type, place: x.place })),
      appointments_next_7_days: ap.filter(x => x.date <= wk).length,
      followups_due: open.filter(r => r.followUp && r.followUp <= t).slice(0, 6).map(r => ({ ref: r.ref, client: (r.client || {}).name })),
      late_rentals: late, office: S.settings.officeName || '', city: S.settings.officeCity || '',
    };
  }
  // البحث فدليل الاستعمال (W777_GUIDE): الدروس الأقرب لسؤال المستعمل
  function agGuide(q, n = 3) {
    const G = window.W777_GUIDE; if (!G || !G.lessons) return [];
    const stop = /^(كيف|كيفاش|فين|أين|وين|شنو|ما|ماذا|هل|واش|في|فـ|على|من|الى|إلى|و|ديال|the|how|do|i|to|a|in|comment|je|le|la|les|de|un|une|où)$/;
    const tk = tokens(q).filter(w => w.length > 1 && !stop.test(w)).map(w => w.replace(/^(ال|وال|بال|فال|لل)/, ''));
    if (!tk.length) return [];
    return G.lessons.map(l => {
      const hay = norm([l.t, l.tag, (l.steps || []).join(' '), l.tip].join(' '));
      return { l, sc: tk.reduce((a, w) => a + (hay.includes(w) ? (norm(l.t + ' ' + l.tag).includes(w) ? 3 : 1) : 0), 0) };
    }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, n)
      .map(({ l }) => ({ lesson: l.t, about: l.tag, steps: l.steps, tip: l.tip }));
  }
  const AG_HOWTO = /كيف|كيفاش|فين|أين|وين|طريق|نستعمل|استعمل|أستعمل|نزيد|أضيف|اضيف|نضيف|نبدل|أغير|نغير|شرح|اشرح|علمني|دليل|زر|صفحة|الإعدادات|الاعدادات|ميزة|خاصية|comment|how|o[uù] |where|utiliser|ajouter|tutorial/i;
  // كنصيفطو غير آخر جزء من المحادثة (أسرع وأرخص)، وكنبداو ديما من سؤال ديال المستعمل
  function agTrim(h) {
    let i = Math.max(0, h.length - 24);
    while (i > 0 && !(h[i].role === 'user' && typeof h[i].content === 'string')) i--;
    return h.slice(i);
  }
  async function agCall(onText) {
    const Sy = window.W777_SYNC;
    const lastQ = [...AG.history].reverse().find(m => m.role === 'user' && typeof m.content === 'string');
    const ctx = { today: today(), agency: S.role === 'agency' ? myAgencyName() : S.settings.officeName, role: S.role || 'office', page: location.hash || '#/', snap: agSnap() };
    if (lastQ && AG_HOWTO.test(lastQ.content)) { const h = agGuide(lastQ.content, 2); if (h.length) ctx.help = h; }
    const res = await Sy.request('/functions/v1/w777-agent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: agTrim(AG.history), lang: agLang(), ctx, stream: true }),
    });
    if (!/event-stream/.test(res.headers.get('content-type') || '') || !res.body) return res.json();
    // البث المباشر: الكلمات كيبانو وهوما كيتكتبو
    const rd = res.body.getReader(), dec = new TextDecoder();
    let buf = '', fin = null;
    for (;;) {
      const { value, done } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const line = buf.slice(0, i).split('\n').find(l => l.startsWith('data:')); buf = buf.slice(i + 2);
        if (!line) continue;
        let j; try { j = JSON.parse(line.slice(5)); } catch (e) { continue; }
        if (j.t) onText(j.t);
        else if (j.done) fin = j;
        else if (j.error) throw new Error(j.error);
      }
    }
    return fin;
  }
  async function agSend(text) {
    const Sy = window.W777_SYNC, t = agT();
    AG.view.push({ who: 'me', text });
    if (!agAI()) { agLocal(text); return; }
    if (!Sy || !Sy.isOn()) { AG.view.push({ who: 'bot', text: t.login }); agRender(); return; }
    const base = AG.history.length; // إلا وقع مشكل كنرجعو المحادثة كيف كانت (باش ما تخسرش)
    AG.history.push({ role: 'user', content: text });
    AG.busy = true; AG.live = null; agRender();
    agSayStart();
    let paint = 0;
    const onText = d => {
      if (!AG.live) { AG.live = { who: 'bot', text: '' }; AG.view.push(AG.live); agRender(); }
      AG.live.text += d;
      agSayFeed(d);
      if (!paint) paint = requestAnimationFrame(() => {
        paint = 0; const el = $('#ag-live'), body = $('#ag-body');
        if (el && AG.live) el.innerHTML = agFmt(AG.live.text); else agRender();
        if (body) body.scrollTop = body.scrollHeight;
      });
    };
    try {
      for (let step = 0; step < 8; step++) {
        let r;
        AG.live = null;
        try { r = await agCall(onText); } catch (e) {
          const m = String(e.message || e);
          // ما كاينش مفتاح: نجاوبو بالمساعد المجاني بلا ما نوقفو الخدمة
          if (/no_key/.test(m)) { AG.history.splice(base); AG.busy = false; agLocal(text); return; }
          if (!AG.live || !AG.live.text) AG.view.push({ who: 'bot', text: /quota/.test(m) ? t.quota : t.err });
          AG.history.splice(base);
          break;
        }
        if (!r || !r.content) { if (!AG.live) AG.view.push({ who: 'bot', text: t.err }); AG.history.splice(base); break; }
        AG.history.push({ role: 'assistant', content: r.content });
        const txt = r.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
        if (txt) {
          if (AG.live) AG.live.text = txt;
          else { AG.view.push({ who: 'bot', text: txt }); agSayFeed(txt + ' '); } // جواب بلا بث (Claude)
        } else if (AG.live) { AG.view.splice(AG.view.indexOf(AG.live), 1); }
        agSayFlush();
        if (r.stop_reason === 'refusal' && !txt) AG.view.push({ who: 'bot', text: t.err });
        if (r.stop_reason !== 'tool_use') break;
        const results = [];
        for (const b of r.content.filter(x => x.type === 'tool_use')) {
          AG.view.push({ who: 'tool', text: b.name.replace(/_/g, ' ') });
          AG.live = null; agRender();
          let out, isErr = false;
          try { out = await agRunTool(b.name, b.input || {}); } catch (e) { out = { error: String(e.message || e) }; isErr = true; }
          results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(out).replace(/[⁦-⁩]/g, '').slice(0, 6000), ...(isErr ? { is_error: true } : {}) });
        }
        AG.history.push({ role: 'user', content: results });
      }
    } finally { AG.busy = false; AG.live = null; agRender(); }
  }
  /* ---------- المساعد المحلي (فابور، بلا AI): أزرار + كلمات مفتاحية فـ 6 لغات ---------- */
  const LX = {
    darija: { hi: 'السلام! أنا المساعد ديال الوسيط 777. هضر معايا بالدارجة ولا ورك على شي زر: مثلا «بغيت شي شقة للكرا فحمرية تحت 3000 درهم» ولا «شنو عندي اليوم؟»', today: 'المواعيد ديال اليوم', avail: 'العقارات اللي كاينين', reqs: 'الطلبات اللي مازال محلولين', stats: 'الحصيلة', follow: 'شكون نعيطو ليه اليوم', strong: 'أحسن المطابقات', newReq: 'زيد طلب جديد', newAppt: 'زيد موعد جديد', newProp: 'زيد عقار جديد', price: 'قارن الثمن مع السوق', none: 'سمح ليا، ما لقيت والو. جرب تبدل شي كلمة: الحي، النوع، الثمن ولا سمية الزبون.', found: 'لقيت ليك', props: 'عقار', reqsW: 'طلب', apptsW: 'موعد', open: 'حل', more: 'شوف كولشي', matches: 'اللي كيناسبوه', avl: 'عقار كاين', openR: 'طلب محلول', strongW: 'مطابقة قوية', apptT: 'المواعيد ديال اليوم', fu: 'خاصهم تعييطة', noAppt: 'ما عندك حتى موعد اليوم ✓ نهار مزيان!', noFu: 'ما كاين حتى واحد خاصك تعيط ليه اليوم ✓', limited: 'الوضع المجاني: كنفهم الدارجة والكلمات المهمة', hello: 'وعليكم السلام، مرحبا بيك! لاباس عليك؟ قول ليا شنو بغيتي: نقلب ليك على عقار، نوريك المواعيد ديال اليوم، ولا الزبناء اللي خاصك تعيط ليهم.', thanks: 'العفو، هادا واجب! إلا احتاجيتي شي حاجة أخرى أنا هنا.', help: 'نقدر نعاونك فـ: التقليب على العقارات (مثلا «فيلا للبيع فويسلان بين 150 و 250 مليون»)، المواعيد ديال اليوم، الزبناء والطلبات، المطابقات، والحصيلة. هضر معايا بحال إلا كتهضر مع صاحبك، بالعربية ولا بالحروف اللاتينية.' },
    ar: { hello: 'وعليكم السلام، أهلاً بك! كيف يمكنني مساعدتك؟', thanks: 'العفو! أنا في الخدمة.', help: 'أستطيع البحث عن العقارات، عرض مواعيد اليوم، الطلبات، المطابقات والإحصائيات.', hi: 'مرحبا! أنا مساعد الوسيط 777. اضغط على زر أو اكتب كلمة (حي، نوع، مرجع W777-…، اسم زبون…)', today: 'مواعيد اليوم', avail: 'العقارات المتاحة', reqs: 'الطلبات المفتوحة', stats: 'الإحصائيات', follow: 'متابعات اليوم', strong: 'أفضل المطابقات', newReq: 'طلب جديد', newAppt: 'موعد جديد', newProp: 'عقار جديد', price: 'مقارنة الثمن', none: 'لا توجد نتائج. جرّب كلمة أخرى.', found: 'وجدت', props: 'عقار', reqsW: 'طلب', apptsW: 'موعد', open: 'فتح', more: 'عرض الكل', matches: 'المطابقات', avl: 'متاح', openR: 'طلب مفتوح', strongW: 'مطابقة قوية', apptT: 'مواعيد اليوم', fu: 'متابعات', noAppt: 'لا توجد مواعيد اليوم ✓', noFu: 'لا توجد متابعات ✓', limited: 'الوضع المجاني: أفهم الأزرار والكلمات المفتاحية فقط.' },
    fr: { hello: 'Bonjour ! Comment puis-je vous aider ?', thanks: 'Avec plaisir !', help: 'Je peux chercher des biens, afficher les RDV du jour, les demandes, les correspondances et les statistiques.', hi: 'Bonjour ! Je suis l’assistant Al Wasset 777. Touchez un bouton ou tapez un mot (quartier, type, réf. W777-…, nom de client…)', today: 'RDV du jour', avail: 'Biens disponibles', reqs: 'Demandes ouvertes', stats: 'Statistiques', follow: 'Relances du jour', strong: 'Meilleurs matchs', newReq: 'Nouvelle demande', newAppt: 'Nouveau RDV', newProp: 'Nouveau bien', price: 'Comparer un prix', none: 'Aucun résultat. Essayez un autre mot.', found: 'Trouvé', props: 'bien(s)', reqsW: 'demande(s)', apptsW: 'RDV', open: 'Ouvrir', more: 'Tout voir', matches: 'Correspondances', avl: 'disponibles', openR: 'demandes ouvertes', strongW: 'matchs forts', apptT: 'RDV du jour', fu: 'relances', noAppt: 'Aucun RDV aujourd’hui ✓', noFu: 'Aucune relance ✓', limited: 'Mode gratuit : je comprends les boutons et les mots-clés.' },
    en: { hello: 'Hello! How can I help?', thanks: 'You’re welcome!', help: 'I can search properties and show today’s appointments, requests, matches and stats.', hi: 'Hello! I’m the Al Wasset 777 assistant. Tap a button or type a word (district, type, ref W777-…, client name…)', today: 'Today’s appointments', avail: 'Available properties', reqs: 'Open requests', stats: 'Statistics', follow: 'Today’s follow-ups', strong: 'Best matches', newReq: 'New request', newAppt: 'New appointment', newProp: 'New property', price: 'Compare a price', none: 'No results. Try another word.', found: 'Found', props: 'property(ies)', reqsW: 'request(s)', apptsW: 'appointment(s)', open: 'Open', more: 'See all', matches: 'Matches', avl: 'available', openR: 'open requests', strongW: 'strong matches', apptT: 'Today’s appointments', fu: 'follow-ups', noAppt: 'No appointments today ✓', noFu: 'No follow-ups ✓', limited: 'Free mode: I understand buttons and keywords.' },
    es: { hello: '¡Hola! ¿En qué puedo ayudarte?', thanks: '¡De nada!', help: 'Puedo buscar inmuebles y mostrar citas, solicitudes, coincidencias y estadísticas.', hi: '¡Hola! Soy el asistente de Al Wasset 777. Pulsa un botón o escribe una palabra (barrio, tipo, ref. W777-…, cliente…)', today: 'Citas de hoy', avail: 'Inmuebles disponibles', reqs: 'Solicitudes abiertas', stats: 'Estadísticas', follow: 'Seguimientos de hoy', strong: 'Mejores coincidencias', newReq: 'Nueva solicitud', newAppt: 'Nueva cita', newProp: 'Nuevo inmueble', price: 'Comparar precio', none: 'Sin resultados. Prueba otra palabra.', found: 'Encontrado', props: 'inmueble(s)', reqsW: 'solicitud(es)', apptsW: 'cita(s)', open: 'Abrir', more: 'Ver todo', matches: 'Coincidencias', avl: 'disponibles', openR: 'solicitudes abiertas', strongW: 'coincidencias fuertes', apptT: 'Citas de hoy', fu: 'seguimientos', noAppt: 'No hay citas hoy ✓', noFu: 'Sin seguimientos ✓', limited: 'Modo gratuito: entiendo botones y palabras clave.' },
    it: { hello: 'Ciao! Come posso aiutarti?', thanks: 'Prego!', help: 'Posso cercare immobili e mostrare appuntamenti, richieste, abbinamenti e statistiche.', hi: 'Ciao! Sono l’assistente di Al Wasset 777. Tocca un pulsante o scrivi una parola (quartiere, tipo, rif. W777-…, cliente…)', today: 'Appuntamenti di oggi', avail: 'Immobili disponibili', reqs: 'Richieste aperte', stats: 'Statistiche', follow: 'Richiami di oggi', strong: 'Migliori abbinamenti', newReq: 'Nuova richiesta', newAppt: 'Nuovo appuntamento', newProp: 'Nuovo immobile', price: 'Confronta prezzo', none: 'Nessun risultato. Prova un’altra parola.', found: 'Trovato', props: 'immobile/i', reqsW: 'richiesta/e', apptsW: 'appuntamento/i', open: 'Apri', more: 'Vedi tutto', matches: 'Abbinamenti', avl: 'disponibili', openR: 'richieste aperte', strongW: 'abbinamenti forti', apptT: 'Appuntamenti di oggi', fu: 'richiami', noAppt: 'Nessun appuntamento oggi ✓', noFu: 'Nessun richiamo ✓', limited: 'Modalità gratuita: capisco pulsanti e parole chiave.' },
  };
  const lx = () => LX[agLang()] || LX.darija;
  const LX_ACTIONS = ['today', 'avail', 'reqs', 'stats', 'follow', 'strong', 'newReq', 'newAppt', 'newProp', 'price'];
  // كلمات مفتاحية (كل اللغات) ← نية
  /* ---------- الدارجة: كنفهمو الهضرة المغربية (بالحروف العربية واللاتينية) ---------- */
  // كلمات الدارجة باللاتينية (عربيزي) ← بالعربية
  const DZ_LATIN = {
    bghit: 'بغيت', abghit: 'بغيت', nbghi: 'بغيت', bghiti: 'بغيتي', f: 'ف', fi: 'ف', b: 'ب', bghina: 'بغينا', baghi: 'باغي', bgha: 'بغا', chi: 'شي', wach: 'واش', wesh: 'واش', kayn: 'كاين', kayna: 'كاينة', kaynin: 'كاينين', makaynch: 'ماكاينش', makayn: 'ماكاين',
    dar: 'دار', diar: 'ديور', dyal: 'ديال', dial: 'ديال', dyali: 'ديالي', dyalna: 'ديالنا', chqa: 'شقة', chka: 'شقة', chaqa: 'شقة', apart: 'شقة', appart: 'شقة', appartement: 'شقة',
    villa: 'فيلا', ard: 'أرض', terrain: 'أرض', b9a3: 'بقعة', bo9a3: 'بقعة', bo9a: 'بقعة', hanout: 'محل', mahal: 'محل', magasin: 'محل', garage: 'كراج', riad: 'رياض', studio: 'استوديو', duplex: 'دوبلكس',
    kra: 'كراء', lkra: 'كراء', kira: 'كراء', nkri: 'كراء', nkra: 'كراء', mkri: 'كراء', chra: 'بيع', nchri: 'بيع', bi3: 'بيع', lbi3: 'بيع', nbi3: 'بيع', bay3: 'بيع', vente: 'بيع', location: 'كراء',
    lyoum: 'اليوم', lyoma: 'اليوم', lyom: 'اليوم', ghda: 'غدا', ghedda: 'غدا', '3afak': 'عافاك', afak: 'عافاك', chhal: 'شحال', ch7al: 'شحال', bch7al: 'بشحال', bchhal: 'بشحال',
    salam: 'سلام', slm: 'سلام', labas: 'لاباس', cv: 'لاباس', choukran: 'شكرا', chokran: 'شكرا', chkran: 'شكرا', merci: 'شكرا', tbarkellah: 'تبارك الله', '3awni': 'عاوني', '3awenni': 'عاوني',
    taht: 'تحت', ta7t: 'تحت', mlyon: 'مليون', mlyoun: 'مليون', melyon: 'مليون', melyoun: 'مليون', million: 'مليون', millions: 'مليون', alf: 'ألف', fin: 'فين', m3a: 'مع', bit: 'بيت', byout: 'بيوت', biout: 'بيوت',
    rdv: 'موعد', maw3id: 'موعد', mow3id: 'موعد', mawa3id: 'مواعيد', klyan: 'الزبناء', clients: 'الزبناء', client: 'زبون', zboun: 'زبون', zbnaa: 'الزبناء', jdid: 'جديد', jdida: 'جديدة', zid: 'زيد',
    wahed: 'واحد', wa7ed: 'واحد', jouj: 'جوج', jooj: 'جوج', zouj: 'جوج', tlata: 'تلاتة', rb3a: 'ربعة', khamsa: 'خمسة', sta: 'ستة', sb3a: 'سبعة', tmnya: 'تمنية', tes3od: 'تسعة', '3achra': 'عشرة',
    '3chrin': 'عشرين', tlatin: 'تلاتين', rb3in: 'ربعين', khamsin: 'خمسين', stin: 'ستين', sb3in: 'سبعين', tmanin: 'تمانين', tes3in: 'تسعين', mya: 'مية', myat: 'مية', mitin: 'ميتين', nos: 'نص', ns: 'نص',
  };
  // أرقام الدارجة
  const DZ_NUM = {
    واحد: 1, وحدة: 1, جوج: 2, زوج: 2, اثنين: 2, تلاتة: 3, تلاته: 3, ثلاثة: 3, تلت: 3, ربعة: 4, اربعة: 4, ربع: 4, خمسة: 5, خمس: 5, ستة: 6, ست: 6, سبعة: 7, سبع: 7, تمنية: 8, ثمانية: 8, تمن: 8,
    تسعة: 9, تسعود: 9, تسع: 9, عشرة: 10, حداش: 11, طناش: 12, تلطاش: 13, ربعطاش: 14, خمسطاش: 15, سطاش: 16, سبعطاش: 17, تمنطاش: 18, تسعطاش: 19,
    عشرين: 20, تلاتين: 30, ثلاثين: 30, ربعين: 40, اربعين: 40, خمسين: 50, ستين: 60, سبعين: 70, تمانين: 80, ثمانين: 80, تسعين: 90,
    مية: 100, مائة: 100, ميا: 100, ميتين: 200, تلتمية: 300, ربعمية: 400, خمسمية: 500, ستمية: 600, سبعمية: 700, تمنمية: 800, تسعمية: 900, ألف: 1000, الف: 1000, ألفين: 2000, الفين: 2000,
  };
  function dzNumbers(t) {
    const w = t.split(/\s+/), out = [];
    const val = x => x in DZ_NUM ? DZ_NUM[x] : (/^و\S+$/.test(x) && x.slice(1) in DZ_NUM ? DZ_NUM[x.slice(1)] : null);
    for (let i = 0; i < w.length; i++) {
      if (!(w[i] in DZ_NUM)) { out.push(w[i]); continue; }
      let total = 0, cur = 0, last = Infinity, j = i;
      while (j < w.length) {
        let v = j === i ? DZ_NUM[w[j]] : val(w[j]), step = 1;
        if (w[j] === 'و' && val(w[j + 1]) !== null && !/^و/.test(w[j + 1])) { v = val(w[j + 1]); step = 2; }
        if (v === null) break;
        const joined = j !== i && (step === 2 || /^و/.test(w[j]));
        // «ميتين و خمسين» = 250، ولكن «مية و ميتين» = جوج أرقام
        if (joined && v >= last && v !== 1000) break;
        if (!joined && j !== i && !(v === 100 && cur > 0 && cur < 10) && v !== 1000) break;
        if (v === 100 && cur > 0 && cur < 10) { cur *= 100; last = 100; }
        else if (v === 1000) { total += (cur || 1) * 1000; cur = 0; last = 1000; }
        else { cur += v; last = v; }
        j += step;
      }
      total += cur;
      if (w[j] === 'ونص' || (w[j] === 'و' && w[j + 1] === 'نص')) { total += 0.5; j += w[j] === 'و' ? 2 : 1; }
      out.push(String(total)); i = j - 1;
    }
    return out.join(' ');
  }
  // كنردو الجملة لصيغة وحدة باش الفهم يكون ساهل
  function dzNorm(text) {
    let t = ' ' + String(text || '').toLowerCase().replace(/[؟?!.,،:;«»"()]/g, ' ') + ' ';
    t = t.split(/\s+/).map(x => DZ_LATIN[x] || x).join(' ');
    t = t.replace(/(^|\s)نص\s+مليون/g, '$1 0.5 مليون');
    t = dzNumbers(t.trim()).replace(/(\d+) مليون ونص/g, '$1.5 مليون').replace(/(^|\s)مليون ونص/g, '$1 1.5 مليون');
    t = ' ' + t + ' ';
    const R = [
      [/\s(بيتين|غرفتين|شومبرتين|شمبرتين)\s/g, ' 2 غرف '],
      [/\s(\d+)\s*(بيوت|بيت|غرفة|غرف|شومبرات|شمبرات|شومبرة|شمبرة|chambres?)\s/g, ' $1 غرف '],
      [/\s(للكرا|الكرا|كرا|كراية|نكري|نكتري|مكتري|نكريو|يتكرا|كاري)\s/g, ' كراء '],
      [/\s(نشري|نشريو|شري|شاري|نبيع|نبيعو|بايع|للبيع|يتباع|تباع)\s/g, ' بيع '],
      [/\s(ما يفوتش|مايفوتش|ماشي فوق|ما يكونش فوق|مايكونش فوق|ماكثرش من|ما كثرش من|فحدود|فالحدود|ماشي كثر من|الماكسيموم|maximum)\s/g, ' تحت '],
      [/\s(رونديفو|روندفو|روندي فو|المواعد|الرونديفوات)\s/g, ' مواعيد '],
      [/\s(الكليان|الكليانات|الزبائن|الكلاينط|الكليونات)\s/g, ' الزبناء '],
      [/\s(ابارتمو|أبارتمو|اپارتمو|ابارطمة|أبارطمة|ابارتمان|أبارتمان|شقق)\s/g, ' شقة '],
      [/\s(دويرة|ديور|منزل)\s/g, ' دار '],
      [/\s(بقع|طيران|التيران|تيران)\s/g, ' بقعة '],
      [/\s(حانوت|حوانت|ماگازا|ماكازا|ماغازا|محلات)\s/g, ' محل '],
    ];
    R.forEach(([re, to]) => { t = t.replace(re, to).replace(re, to); });
    return t.replace(/\s+/g, ' ').trim();
  }
  // النوع من الجملة ← فلتر
  const DZ_TYPES = [
    [/فيلا|villa/i, p => /^villa/.test(p.type)],
    [/شقة|استوديو|دوبلكس|appart|studio|duplex|apartment|piso|appartamento/i, p => (TYPE[p.type] || {}).cat === 'apartment'],
    [/(^|\s)دار(\s|$)|رياض|maison|house|casa/i, p => (TYPE[p.type] || {}).cat === 'house' && !/^villa/.test(p.type)],
    [/بقعة|أرض|ارض|terrain|land|terreno/i, p => (TYPE[p.type] || {}).cat === 'land'],
    [/محل|مكتب|كراج|local|commerce|shop|office|bureau/i, p => (TYPE[p.type] || {}).cat === 'commercial'],
  ];
  const LX_INTENTS = [
    ['hello', /^(سلام|السلام|مرحبا|اهلا|أهلا|صباح الخير|مساء الخير|لاباس|كيداير|كيدايرة|كيف داير|bonjour|salut|hello|hi|hola|ciao|buongiorno)(\s|$)(?!.*(شقة|دار|فيلا|بقعة|محل|كراء|بيع|موعد|مواعيد|طلب))/i],
    ['thanks', /^(شكرا|تبارك الله|بارك الله فيك|الله يخليك|يعطيك الصحة|merci|thanks|thank you|gracias|grazie)/i],
    ['help', /(شنو كتعرف|شنو تقدر|اش تقدر|آش تقدر|عاوني|كيفاش نخدم|كيفاش نستعمل|aide|help|ayuda|aiuto)/i],
    ['today', /موعد|مواعيد|عندي اليوم|شكون جاي|rdv|rendez|appoint|cita|appuntament|agenda/i],
    ['stats', /احصا|إحصا|شحال عندي|كيف دايرة الخدمة|الحصيلة|stat|bilan|resum|riepilog|ملخص/i],
    ['follow', /متابع|شكون نعيط|نعيط ل|نتاصل|relance|follow|seguim|richiam/i],
    ['reqs', /(الزبناء|الطلبات|شكون باغي)(?!.*(شقة|دار|فيلا|بقعة|محل))/i],
    ['avail', /^(شنو كاين|اش كاين|آش كاين|شنو عندك|شنو عندنا|العقارات)$/i],
    ['strong', /مطابق|match|correspond|coincid|abbinam/i],
    ['newReq', /(زيد|اضف|أضف|جديد|nouvelle|new|nueva|nuova).{0,12}(طلب|demande|request|solicitud|richiesta)/i],
    ['newAppt', /(زيد|اضف|أضف|جديد|nouveau|new|nueva|nuovo).{0,12}(موعد|rdv|appoint|cita|appuntament)/i],
    ['newProp', /(زيد|اضف|أضف|جديد|nouveau|new|nuevo|nuovo).{0,12}(عقار|bien|property|inmueble|immobile)/i],
    ['price', /ثمن السوق|مقارن|compar|prix du march|market price|precio de mercado|prezzo di mercato/i],
  ];
  function lxParse(text) {
    const n = norm(text);
    const f = {};
    if (/كراء|كرا|location|louer|rent|alquil|affitt/i.test(text)) f.trx = 'rent';
    else if (/بيع|شراء|vente|achat|sale|buy|venta|compra|vendit|acquist/i.test(text)) f.trx = 'sale';
    // ثمن أقصى: «تحت 70 مليون» / «moins de 700000» / «under 700k»
    const m = text.match(/(تحت|اقل من|أقل من|حتى|moins de|max|under|below|menos de|hasta|sotto|meno di)\s*([\d\s.,]+)\s*(مليون|million|k|ألف|الف|mil)?/i);
    if (m) {
      let v = parseFloat(m[2].replace(/[\s,]/g, '').replace(/\.(?=\d{3}\b)/g, ''));
      const u = (m[3] || '').toLowerCase();
      if (/مليون/.test(u)) v *= 10000; else if (/million/.test(u)) v *= 1e6; else if (/k|ألف|الف|mil/.test(u)) v *= 1000;
      if (v > 0) f.max = v;
    }
    const b = text.match(/(\d)\s*(غرف|بيوت|chambres?|bedrooms?|habitaciones|camere)/i);
    if (b) f.beds = +b[1];
    // «بين 50 و 80 مليون»
    const bw = !m && text.match(/(بين|entre|between|tra)\s*([\d.]+)\s*(?:و|et|and|y|e)\s*([\d.]+)\s*(مليون|million|ألف|الف|k)?/i);
    if (bw) { const k = /مليون/.test(bw[4] || '') ? 10000 : /million/.test(bw[4] || '') ? 1e6 : /k|ألف|الف/.test(bw[4] || '') ? 1000 : 1; f.min = +bw[2] * k; f.max = +bw[3] * k; }
    // «بـ 350000» / «ميزانية 80 مليون» ← ثمن تقريبي (+10%)
    const bp = !m && !bw && text.match(/(?:^|\s)(?:ب|بـ|بثمن|ثمن|الثمن|ميزانية|budget|prix|price|precio|prezzo)\s*([\d.]+)\s*(مليون|million|ألف|الف|k)?(?=\s|$)/i);
    if (bp) { const k = /مليون/.test(bp[2] || '') ? 10000 : /million/.test(bp[2] || '') ? 1e6 : /k|ألف|الف/.test(bp[2] || '') ? 1000 : 1; const v = +bp[1] * k; if (v >= 1000) f.max = Math.round(v * 1.1); }
    const ty = DZ_TYPES.find(([re]) => re.test(text)); if (ty) f.type = ty[1];
    // الكلمات اللي كتبقى للبحث (نحيدو الأرقام وكلمات الثمن والعملية)
    f.q = text.replace(m ? m[0] : '', ' ').replace(bw ? bw[0] : '', ' ').replace(bp ? bp[0] : '', ' ').replace(b ? b[0] : '', ' ')
      .replace(/(^|\s)(شي|واش|كاين|كاينة|كاينين|عندك|عندكم|عندنا|بغيت|بغينا|باغي|نقلب|قلب ليا|جيب ليا|وريني|ورينا|عطيني|ديال|اللي|لي|فيه|فيها|مزيانة|مزيان|شقة|دار|فيلا|بقعة|أرض|ارض|محل|مكتب|استوديو|دوبلكس|appartement|villa|maison|terrain|local|درهم|دراهم|ريال|سنتيم|dh|dhs|mad|بزاف|عافاك|الله يخليك|من فضلك)(?=\s|$)/gi, ' ').replace(/(^|\s)(كراء|للكراء|بيع|للبيع|vente|location|à vendre|à louer|for sale|for rent|en venta|en alquiler|in vendita|in affitto|قلب|لقا|ليا|عافاك|بغيت|cherche|find|busca|cerca|على|sur|une|un|a|an|the|el|la|il|de|fi|ف)(?=\s|$)/gi, ' ').replace(/(^|\s)(كراء|للكراء|بيع|للبيع|vente|location|for|sale|rent|en|venta|alquiler|in|vendita|affitto)(?=\s|$)/gi, ' ').replace(/\s+/g, ' ').trim();
    f.n = n;
    return f;
  }
  // بحث مرن: كل كلمة كتحسب نقطة، نحيدو «ف/ب/ل/و/ال» من البداية، والأسماء اللاتينية ديال الأحياء
  function lxFind(list, hayFn, q) {
    const toks = tokens(q).map(w => {
      const al = DISTRICT_ALIASES[w.toLowerCase()];
      if (al) return [norm(al).split(/[\s(]/)[0]];
      const v = [w]; const st = w.replace(/^(وال|فال|بال|لل|ال|ف|ب|ل|و)(?=\S{3,})/, ''); if (st !== w) v.push(st);
      return v;
    }).filter(v => v[0].length > 1);
    if (!toks.length) return list.slice();
    let best = 0;
    const sc = list.map(x => { const h = hayFn(x); const n = toks.filter(v => v.some(w => h.includes(w))).length; if (n > best) best = n; return [x, n]; });
    return best ? sc.filter(([, n]) => n === best).map(([x]) => x) : [];
  }
  const lxCard = p => `<a class="ag-card" href="#/property/${p.id}"><b>${esc(p.ref || '')}</b> · ${esc(p.title || typeAr(p.type))}<small>${esc([p.district, p.city].filter(Boolean).join('، '))} · ${esc(priceText(p))} ${mktBadge(p)}</small></a>`;
  const lxReq = r => `<a class="ag-card" href="#/request/${r.id}"><b>${esc((r.client || {}).name || '')}</b> · ${esc(r.ref || '')}<small>${esc(trxAr(r.transaction))} · ${esc([((r.districts || [])[0]), r.city].filter(Boolean).join('، '))}${r.budgetMax ? ' · ' + esc(fmt(r.budgetMax)) + ' د' : ''}</small></a>`;
  const lxMore = (href, n) => n > 5 ? `<a class="ag-more" href="${href}">${esc(lx().more)} (${n}) ←</a>` : '';
  function lxAnswer(kind, text) {
    const t = lx();
    const go = h => { location.hash = h; return `<a class="ag-more" href="${h}">${esc(t.open)} ←</a>`; };
    switch (kind) {
      case 'today': {
        const list = S.appts.filter(a => a.date === today() && a.status === 'planned').sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        return `<b>📅 ${esc(t.apptT)} (${list.length})</b>` + (list.length ? list.map(a => `<a class="ag-card" href="#/appointment/${a.id}"><b>${esc(a.time || '')}</b> · ${esc((a.client || {}).name || '')}<small>${esc(APPT_TYPES[a.type] || '')}${a.place ? ' · ' + esc(a.place) : ''}</small></a>`).join('') : `<div>${esc(t.noAppt)}</div>`);
      }
      case 'avail': { const l = S.props.filter(p => p.status === 'available'); return `<b>🏠 ${esc(t.avail)} (${l.length})</b>` + l.slice(0, 5).map(lxCard).join('') + lxMore('#/properties', l.length); }
      case 'reqs': { const l = S.reqs.filter(openReq); return `<b>👥 ${esc(t.reqs)} (${l.length})</b>` + l.slice(0, 5).map(lxReq).join('') + lxMore('#/requests', l.length); }
      case 'follow': { const l = S.reqs.filter(r => openReq(r) && r.followUp && r.followUp <= today()); return `<b>📞 ${esc(t.follow)} (${l.length})</b>` + (l.length ? l.slice(0, 5).map(lxReq).join('') : `<div>${esc(t.noFu)}</div>`) + lxMore('#/requests', l.length); }
      case 'strong': {
        const o = []; S.reqs.filter(openReq).forEach(r => matchesForReq(r).forEach(x => { if (x.m.score >= 75) o.push({ r, p: x.p, s: x.m.score }); }));
        o.sort((a, b) => b.s - a.s);
        return `<b>🎯 ${esc(t.strong)} (${o.length})</b>` + o.slice(0, 5).map(x => `<a class="ag-card" href="#/request/${x.r.id}"><b>${x.s}%</b> · ${esc((x.r.client || {}).name || '')} ← ${esc(x.p.ref || '')}<small>${esc(x.p.title || typeAr(x.p.type))} · ${esc(priceText(x.p))}</small></a>`).join('') + lxMore('#/matching', o.length);
      }
      case 'stats': {
        const avail = S.props.filter(p => p.status === 'available').length, open = S.reqs.filter(openReq).length;
        let strong = 0; S.reqs.filter(openReq).forEach(r => matchesForReq(r).forEach(x => { if (x.m.score >= 75) strong++; }));
        const ap = S.appts.filter(a => a.date === today() && a.status === 'planned').length, fu = S.reqs.filter(r => openReq(r) && r.followUp && r.followUp <= today()).length;
        return `<b>📊 ${esc(t.stats)}</b><div class="ag-stats"><span><b>${avail}</b> ${esc(t.avl)}</span><span><b>${open}</b> ${esc(t.openR)}</span><span><b>${strong}</b> ${esc(t.strongW)}</span><span><b>${ap}</b> ${esc(t.apptsW)}</span><span><b>${fu}</b> ${esc(t.fu)}</span></div>`;
      }
      case 'hello': return esc(t.hello);
      case 'thanks': return esc(t.thanks);
      case 'help': return esc(t.help);
      case 'newReq': return `✍️ ${esc(t.newReq)}` + go('#/request/new');
      case 'newAppt': return `📅 ${esc(t.newAppt)}` + go('#/appointment/new');
      case 'newProp': return `🏠 ${esc(t.newProp)}` + go('#/property/new');
      case 'price': return `📊 ${esc(t.price)}` + go('#/estimate');
    }
    // مرجع مباشر
    const ref = (text.match(/W777-\d+|DM-\d+/i) || [])[0];
    if (ref) {
      const p = S.props.find(x => (x.ref || '').toLowerCase() === ref.toLowerCase());
      if (p) { const ms = matchesForProp(p); return lxCard(p) + (ms.length ? `<b>🎯 ${esc(t.matches)} (${ms.length})</b>` + ms.slice(0, 4).map(x => `<a class="ag-card" href="#/request/${x.r.id}"><b>${x.m.score}%</b> · ${esc((x.r.client || {}).name || '')}<small>${esc(x.r.ref || '')}</small></a>`).join('') : ''); }
      const r = S.reqs.find(x => (x.ref || '').toLowerCase() === ref.toLowerCase());
      if (r) { const ms = matchesForReq(r); return lxReq(r) + (ms.length ? `<b>🎯 ${esc(t.matches)} (${ms.length})</b>` + ms.slice(0, 4).map(x => lxCard(x.p).replace('<b>', `<b>${x.m.score}% · `)).join('') : ''); }
    }
    // بحث حر
    const f = lxParse(text);
    let props = lxFind(S.props, propHay, f.q || '');
    props = props.filter(p => p.status === 'available');
    if (f.trx) props = props.filter(p => f.trx === 'rent' ? isRent(p.transaction) : !isRent(p.transaction));
    if (f.max) props = props.filter(p => { const v = num(p.priceMax) || num(p.priceMin); return v && v <= f.max; });
    if (f.beds) props = props.filter(p => num((p.specs || {}).bedrooms) >= f.beds);
    if (f.min) props = props.filter(p => { const v = num(p.priceMax) || num(p.priceMin); return v && v >= f.min; });
    if (f.type) props = props.filter(f.type);
    const reqs = f.q && !f.max ? lxFind(S.reqs.filter(openReq), reqHay, f.q) : [];
    if (!props.length && !reqs.length) return esc(t.none);
    let h = '';
    if (props.length) h += `<b>🏠 ${esc(t.found)} ${props.length} ${esc(t.props)}</b>` + props.slice(0, 5).map(lxCard).join('') + lxMore('#/properties?q=' + encodeURIComponent(f.q || ''), props.length);
    if (reqs.length) h += `<b>👥 ${reqs.length} ${esc(t.reqsW)}</b>` + reqs.slice(0, 4).map(lxReq).join('');
    return h;
  }
  function agLocal(text, kind) {
    const dz = /W777-\d+|DM-\d+/i.test(text) ? text : dzNorm(text);
    if (!kind) { const hitI = LX_INTENTS.find(([, re]) => re.test(dz)); kind = hitI ? hitI[0] : null; }
    const html = lxAnswer(kind, dz);
    AG.view.push({ who: 'bot', html });
    agSpeak(html, true);
    agRender();
  }

  // ---------- الأدوات (كتخدم على بيانات الجهاز) ----------
  const agProp = p => ({ ref: p.ref, title: p.title || typeAr(p.type), type: typeAr(p.type), transaction: trxAr(p.transaction), city: p.city, district: p.district, price: priceText(p), area_m2: areaOf(p), bedrooms: (p.specs || {}).bedrooms || null, status: (PSTATUS[p.status] || {}).ar || p.status });
  const agReq = r => ({ ref: r.ref, client: (r.client || {}).name, phone: (r.client || {}).phone, transaction: trxAr(r.transaction), types: (r.types || []).map(typeAr), city: r.city, districts: r.districts || [], budget_max: r.budgetMax || null, status: (RSTATUS[r.status] || {}).ar || r.status, follow_up: r.followUp || null });
  const byRef = (list, ref) => list.find(x => String(x.ref || '').toLowerCase() === String(ref || '').trim().toLowerCase());
  const agAsk = async msg => confirmBox(msg, '✓', false);
  async function agRunTool(name, a) {
    const lim = Math.min(num(a.limit) || 10, 25);
    switch (name) {
      case 'search_properties': {
        let list = a.query ? searchProps(a.query) : S.props.slice();
        const st = a.status || 'available';
        if (st !== 'all') list = list.filter(p => p.status === st);
        if (a.transaction) list = list.filter(p => p.transaction === a.transaction);
        if (a.category) list = list.filter(p => catOf(p.type) === a.category);
        if (a.city) list = list.filter(p => norm(p.city || '').includes(norm(a.city)));
        const pr = p => num(p.priceMax) || num(p.priceMin) || 0;
        if (num(a.price_max)) list = list.filter(p => pr(p) && pr(p) <= num(a.price_max));
        if (num(a.price_min)) list = list.filter(p => pr(p) >= num(a.price_min));
        if (num(a.bedrooms_min)) list = list.filter(p => num((p.specs || {}).bedrooms) >= num(a.bedrooms_min));
        return { total: list.length, results: list.slice(0, lim).map(agProp) };
      }
      case 'get_property': {
        const p = byRef(S.props, a.ref); if (!p) return { error: 'not found' };
        return Object.assign(agProp(p), { description: p.description, features: p.features, owner: p.owner, notes: p.notes, photos: (p.media || []).filter(m => m.kind === 'photo').length, market: (marketCmp(p) || {}).diff ?? null });
      }
      case 'search_requests': {
        let list = a.query ? searchReqs(a.query) : S.reqs.slice();
        const st = a.status || 'open';
        if (st === 'open') list = list.filter(openReq); else if (st !== 'all') list = list.filter(r => r.status === st);
        return { total: list.length, results: list.slice(0, lim).map(agReq) };
      }
      case 'get_request': { const r = byRef(S.reqs, a.ref); return r ? Object.assign(agReq(r), { notes: r.notes, description: r.description, bedrooms_min: r.bedroomsMin, financing: r.financing }) : { error: 'not found' }; }
      case 'matches_for_request': { const r = byRef(S.reqs, a.ref); if (!r) return { error: 'not found' }; return { results: matchesForReq(r).slice(0, 10).map(x => Object.assign(agProp(x.p), { score: x.m.score })) }; }
      case 'matches_for_property': { const p = byRef(S.props, a.ref); if (!p) return { error: 'not found' }; return { results: matchesForProp(p).slice(0, 10).map(x => Object.assign(agReq(x.r), { score: x.m.score })) }; }
      case 'create_request': {
        const ok = await agAsk(`🤖 زيد طلب جديد: ${a.client_name} — ${trxAr(a.transaction) || a.transaction}${a.city ? ' — ' + a.city : ''}${a.budget_max ? ' — ' + fmt(a.budget_max) + ' د' : ''}؟`);
        if (!ok) return { cancelled: true };
        const r = { id: uid(), createdAt: new Date().toISOString(), proposals: {}, status: 'new', priority: 'normal',
          client: { name: a.client_name, phone: a.phone || '', source: 'المساعد الذكي' }, transaction: a.transaction || 'sale',
          types: a.property_type ? [a.property_type] : [], city: a.city || S.settings.officeCity || '', districts: a.districts ? String(a.districts).split(/[،,]/).map(x => x.trim()).filter(Boolean) : [],
          budgetMax: num(a.budget_max) || null, bedroomsMin: a.bedrooms_min ? String(a.bedrooms_min) : '', notes: a.notes || '' };
        r.ref = await DB.nextRef('DM', maxRef(S.reqs));
        await DB.saveRec('requests', r); await loadAll();
        return { created: r.ref, matches: matchesForReq(r).length };
      }
      case 'list_appointments': {
        const from = a.date_from || today(), to = a.date_to || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        return { results: S.appts.filter(x => x.date >= from && x.date <= to).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time))
          .map(x => ({ date: x.date, time: x.time, client: (x.client || {}).name, phone: (x.client || {}).phone, type: APPT_TYPES[x.type] || x.type, place: x.place, status: (APPT_STATUS[x.status] || {}).ar })) };
      }
      case 'create_appointment': {
        const ok = await agAsk(`🤖 زيد موعد: ${a.client_name} — ${a.date} ${a.time}${a.place ? ' — ' + a.place : ''}؟`);
        if (!ok) return { cancelled: true };
        const p = a.property_ref && byRef(S.props, a.property_ref), r = a.request_ref && byRef(S.reqs, a.request_ref);
        const o = { id: uid(), createdAt: new Date().toISOString(), client: { name: a.client_name, phone: a.phone || '' }, date: a.date, time: a.time,
          type: APPT_TYPES[a.type] ? a.type : 'meeting', remind: String(num(a.remind_minutes) ?? 30), place: a.place || '', status: 'planned', reqId: r ? r.id : '', propId: p ? p.id : '', notes: a.notes || '' };
        await DB.saveRec('appointments', o); await loadAll();
        return { created: true, date: o.date, time: o.time };
      }
      case 'update_property_status': {
        const p = byRef(S.props, a.ref); if (!p) return { error: 'not found' };
        if (!PSTATUS[a.status]) return { error: 'unknown status', allowed: Object.keys(PSTATUS) };
        const ok = await agAsk(`🤖 بدّل الحالة ديال ${p.ref} إلى «${PSTATUS[a.status].ar}»؟`);
        if (!ok) return { cancelled: true };
        p.status = a.status; await DB.saveRec('properties', p); await loadAll();
        return { updated: p.ref, status: PSTATUS[a.status].ar };
      }
      case 'market_price': {
        const p = { transaction: 'sale', city: a.city, district: a.district || '', type: a.property_type || 'apartment', priceMin: a.price, areaTotal: a.area, areaBuilt: a.area };
        const m = marketCmp(p) || {};
        return { reference_dh_m2: m.ref ? m.ref.v : null, where: m.ref ? m.ref.where : null, price_dh_m2: m.ppm ? Math.round(m.ppm) : null, diff_percent: m.diff ?? null, market_value: m.est ? Math.round(m.est) : null, official_trend: trendOf(a.city, p.type) };
      }
      case 'office_stats': {
        const avail = S.props.filter(p => p.status === 'available'), open = S.reqs.filter(openReq);
        let strong = 0; open.forEach(r => matchesForReq(r).forEach(x => { if (x.m.score >= 75) strong++; }));
        return { properties_total: S.props.length, available: avail.length, open_requests: open.length, strong_matches: strong,
          appointments_today: S.appts.filter(x => x.date === today() && x.status === 'planned').length,
          followups_due: open.filter(r => r.followUp && r.followUp <= today()).length };
      }
      case 'network_search': {
        if (!inNetwork()) return { error: 'not a network member' };
        let list = await loadNetwork();
        const tk = tokens(a.query || '');
        list = list.filter(x => (!a.city || norm(x.city || '').includes(norm(a.city))) && (!a.transaction || x.trx === a.transaction)
          && (!tk.length || hit(norm([x.agency, (x.data || {}).title, typeAr(x.type), (x.data || {}).district, x.city].join(' ')), tk)));
        return { total: list.length, results: list.slice(0, lim).map(x => ({ agency: x.agency, agency_phone: x.phone, ref: (x.data || {}).ref, type: typeAr(x.type), city: x.city, district: (x.data || {}).district, price: priceText(netAsProp(x)) })) };
      }
      case 'app_help': return { lessons: agGuide(a.query || '', 3) };
      case 'finance_summary': {
        const k = /^\d{4}-\d{2}$/.test(a.month || '') ? a.month : ym(), all = live('ledger'), m = monthSums(all, k);
        const yr = all.filter(x => String(x.date || '').slice(0, 4) === k.slice(0, 4)), sum = t2 => yr.filter(x => x.type === t2).reduce((q, x) => q + (num(x.amount) || 0), 0);
        const cats = {}; m.e.filter(x => x.type === 'out').forEach(x => { cats[x.cat || 'أخرى'] = (cats[x.cat || 'أخرى'] || 0) + (num(x.amount) || 0); });
        return { month: k, income_dh: m.inn, expenses_dh: m.out, net_profit_dh: m.net, expenses_by_category: cats, year_income_dh: sum('in'), year_profit_dh: sum('in') - sum('out') };
      }
      case 'rentals_summary': {
        const act = live('leases').filter(l => !l.ended);
        return { active_leases: act.length, monthly_rent_total_dh: act.reduce((q, l) => q + (num(l.rent) || 0), 0),
          collected_this_month_dh: act.reduce((q, l) => q + ((l.payments || {})[ym()] ? l.payments[ym()].paid || 0 : 0), 0),
          late: act.map(l => ({ tenant: (l.tenant || {}).name, property: l.propLabel, rent_dh: num(l.rent) || 0, months_late: leaseArrears(l).length })).filter(x => x.months_late) };
      }
      case 'open_page': {
        const pg = a.page, ref = a.ref;
        const map = { home: '#/', properties: '#/properties', requests: '#/requests', appointments: '#/appointments', matching: '#/matching', agencies: '#/agencies', brokers: '#/brokers', contractors: '#/contractors', finishing: '#/finishing', projects: '#/projects', events: '#/events', news: '#/news', donations: '#/donations', disputes: '#/disputes', contracts: '#/contracts', learn: '#/learn', guide: '#/guide', search: '#/search', stays: '#/stays', investors: '#/investors', notaries: '#/notaries', associations: '#/associations', terms: '#/terms', ownership: '#/ownership', estimate: '#/estimate', settings: '#/settings', new_property: '#/property/new', new_request: '#/request/new', new_appointment: '#/appointment/new', rentals: '#/rentals', finance: '#/finance', report: '#/report', loan: '#/loan', map: '#/map', ad_maker: '#/ad-maker', messages: '#/inbox' };
        if (pg === 'property') { const p = byRef(S.props, ref); if (!p) return { error: 'not found' }; location.hash = '#/property/' + p.id; }
        else if (pg === 'request') { const r = byRef(S.reqs, ref); if (!r) return { error: 'not found' }; location.hash = '#/request/' + r.id; }
        else if (map[pg]) location.hash = map[pg];
        else return { error: 'unknown page' };
        return { opened: pg };
      }
      default: return { error: 'unknown tool' };
    }
  }
  // المدير كيحدد فين الفم والعينين فالصورة (3 ضغطات) — باش الفم يتحل والعينين يرمشو فالبلاصة الصحيحة
  function agFaceCalib(save) {
    const tips = ['1️⃣ اضغط على <b>وسط الفم</b> (الخط اللي بين الشفتين)', '2️⃣ اضغط على <b>العين الأولى</b>', '3️⃣ اضغط على <b>العين الثانية</b>', '✓ جرّب الحركة ثم احفظ'];
    let pts = [], timer = 0;
    modal(`<h3>🎯 مكان الفم والعينين</h3><p class="muted" id="fc-step" style="min-height:24px"></p>
      <div id="fc-box" style="position:relative;width:min(300px,78vw);aspect-ratio:1;margin:8px auto;border-radius:50%;overflow:hidden;cursor:crosshair;background:#fff;box-shadow:0 0 0 3px var(--gold)">
        <div class="ag-face" id="fc-face"><img class="ag-base" src="${agPhoto()}" alt=""><i class="ag-mouth"></i><img class="ag-jaw" src="${agPhoto()}" alt=""><i class="ag-lid l"></i><i class="ag-lid r"></i></div></div>
      <div class="btn-row" style="justify-content:center"><button class="btn sm" id="fc-redo">↺ عاود</button><button class="btn sm" id="fc-try" disabled>👄 جرّب الحركة</button><button class="btn gold sm" id="fc-ok" disabled>${ic('check', 15)} حفظ</button></div>`, (box, close) => {
      const area = $('#fc-box', box), face = $('#fc-face', box), step = $('#fc-step', box);
      face.style.transform = 'none';
      const calc = () => { const [m, e1, e2] = pts; const a = e1.x < e2.x ? e1 : e2, b = e1.x < e2.x ? e2 : e1;
        return { mx: +m.x.toFixed(3), my: +m.y.toFixed(3), ex1: +a.x.toFixed(3), ex2: +b.x.toFixed(3), ey: +((a.y + b.y) / 2).toFixed(3) }; };
      const paint = () => {
        step.innerHTML = tips[Math.min(pts.length, 3)];
        $$('.fc-dot', area).forEach(d => d.remove());
        pts.forEach(p0 => { const d = document.createElement('i'); d.className = 'fc-dot'; d.style.cssText = `position:absolute;left:${p0.x * 100}%;top:${p0.y * 100}%;width:12px;height:12px;margin:-6px;border-radius:50%;background:var(--gold);border:2px solid #fff;z-index:3;pointer-events:none`; area.appendChild(d); });
        $('#fc-try', box).disabled = $('#fc-ok', box).disabled = pts.length < 3;
      };
      area.onclick = e => { if (pts.length >= 3) return; const r = area.getBoundingClientRect(); pts.push({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); paint(); };
      $('#fc-redo', box).onclick = () => { pts = []; clearInterval(timer); paint(); };
      $('#fc-try', box).onclick = () => {
        const f = calc(), d = f.ex2 - f.ex1, pc = v => (v * 100).toFixed(2) + '%';
        Object.entries({ mx: f.mx, my: f.my, mw: d * 0.85, ex1: f.ex1, ex2: f.ex2, ey: f.ey, ew: d * 0.32 }).forEach(([k, v]) => face.style.setProperty('--' + k, pc(v)));
        $$('.fc-dot', area).forEach(x => x.remove());
        const t0 = performance.now(); clearInterval(timer);
        timer = setInterval(() => { const t = performance.now() - t0; if (t > 4000) { clearInterval(timer); face.style.setProperty('--open', 0); return; }
          face.style.setProperty('--open', Math.max(0, 0.5 + 0.45 * Math.sin(t / 75) * Math.sin(t / 230))); face.style.setProperty('--blink', t % 2000 < 160 ? Math.sin(t % 2000 / 160 * Math.PI) : 0); }, 30);
      };
      $('#fc-ok', box).onclick = async () => { clearInterval(timer); close(); await save({ face: calc() }); };
      paint();
    });
  }
  // بطاقة الإعدادات: الصورة كيبدلها غير المدير
  function agentSettingsCard() {
    if (EMBED) return '';
    const isAdmin = S.role === 'admin';
    return `<div class="card card-pad" id="agent-card">
      <h3 class="section-title">🤖 الوكيل الذكي (AI)</h3>
      <div style="display:flex;gap:14px;align-items:center">
        <img src="${agPhoto()}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--gold)">
        <div class="grow"><b>${esc((AG.cfg && AG.cfg.name) || 'مساعد الوسيط 777')}</b>
          <div class="muted" style="font-size:13px">الزر ديالو لتحت على اليسار، كيبان لجميع الوكالات.</div></div></div>
      <label style="display:flex;gap:10px;align-items:center;margin-top:12px"><b>🌐 لغة المساعد</b>
        <select id="ag-lang-set" style="flex:1;max-width:220px">${AG_LANGS.map(x => `<option value="${x.id}" ${x.id === agLang() ? 'selected' : ''}>${x.l}</option>`).join('')}</select></label>
      ${isAdmin ? `<div class="btn-row" style="margin-top:12px">
        <label class="btn gold sm">${ic('camera', 15)} بدّل الصورة<input type="file" id="ag-photo" accept="image/*" hidden></label>
        <button class="btn sm" id="ag-rename">${ic('edit', 15)} بدّل الاسم</button>
        <button class="btn sm" id="ag-face-set">🎯 مكان الفم والعينين${AG.cfg && AG.cfg.face ? ' ✓' : ''}</button>
        <button class="btn sm" id="ag-ai">${agAI() ? '🟢 الوكيل الذكي (AI) مشعول — طفيه' : '⚪ الوضع البسيط — شعل الوكيل الذكي (AI)'}</button></div>
        <p class="muted" style="font-size:12.5px">الصورة والاسم كيبانو لجميع الوكالات. غير نتا (المدير) اللي يقدر يبدلهم.</p>
        ${agKeyRow('gemini', '🔑 مفتاح Gemini (فابور)', 'AIza…', 'https://aistudio.google.com/app/apikey', 'aistudio.google.com', 'Get API key → Create API key')}
        ${agKeyRow('anthropic', '🔑 مفتاح Claude (مدفوع — اختياري)', 'sk-ant-…', 'https://console.anthropic.com/settings/keys', 'console.anthropic.com', 'API Keys → Create Key')}
        <p class="muted" style="font-size:12.5px;margin-bottom:0">إلا كانو بجوج، كيخدم Claude. المفاتيح كيتسجلو مخبيين فـ Supabase، حتى واحد ما يقدر يقراهم من التطبيق.</p></div>` : ''}
    </div>`;
  }
  const agKeyRow = (id, label, ph, url, host, how) => `<div style="border-top:1px solid var(--line);padding-top:12px;margin-top:12px">
          <b>${label}</b> <span id="ag-key-st-${id}" class="muted" style="font-size:13px">…</span>
          <div class="btn-row" style="margin-top:8px">
            <input type="password" id="ag-key-${id}" placeholder="${ph}" autocomplete="off" dir="ltr" style="flex:1;min-width:180px">
            <button class="btn gold sm" data-key-save="${id}">حفظ</button>
            <button class="btn sm" data-key-del="${id}">مسح</button></div>
          ${id === 'gemini' ? `<div class="btn-row" style="margin-top:8px">
            <a class="btn sm" href="${url}" target="_blank" rel="noopener">1️⃣ صاوب المفتاح فـ Google</a>
            <button class="btn gold sm" data-key-paste="${id}">2️⃣ 📋 لصق وحفظ</button></div>` : ''}
          <div class="muted" style="font-size:12.5px;margin-top:6px">من <a href="${url}" target="_blank" rel="noopener">${host}</a> (${how})</div></div>`;
  // كنقبلو المفتاح حتى إلا تنسخ معاه فراغات ولا كلام زايد، وكنجربوه مع Google قبل الحفظ
  const AG_KEYS = {
    gemini: { n: 'gemini_api_key', find: /AIza[\w-]{30,}/, bad: 'هادشي ماشي مفتاح Gemini — خاصو يبدا بـ AIza (حرف i كبير، ماشي l)', test: testGemini },
    anthropic: { n: 'anthropic_api_key', find: /sk-ant-[\w-]{20,}/, bad: 'هادشي ماشي مفتاح Claude — خاصو يبدا بـ sk-ant-' } };
  function pickKey(k, raw) {
    const v = String(raw || '').replace(/[\s"'«»]+/g, '');
    const m = v.match(k.find);
    if (m) return m[0];
    // صيغة جديدة ممكن تبدل: مقبولة إلا كانت طويلة وبلا رموز غريبة (والتجربة كتأكد)
    return k.test && /^[\w.-]{30,200}$/.test(v) ? v : '';
  }
  async function testGemini(key) {
    let r;
    try { r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': key } }); }
    catch (e) { return 'skip'; } // بلا إنترنت: كنسجلوه وصافي
    if (r.ok) return 'ok';
    const j = await r.json().catch(() => ({}));
    const m = JSON.stringify(j);
    if (/API_KEY_INVALID|API key not valid|invalid api key/i.test(m)) throw new Error('Google قال: المفتاح ماشي صحيح — عاود نسخو كامل من aistudio.google.com');
    return 'skip'; // مثلا البلاد ولا الحصة: السيرفر ديالنا كيخدم من بلاصة أخرى، كنسجلوه
  }
  function bindAgentCard() {
    const Sy = window.W777_SYNC;
    const save = async patch => {
      await Sy.request('/rest/v1/w777_agent_config?id=eq.1', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign(patch, { updated_at: new Date().toISOString() })) });
      await agLoadCfg(); toast('تم ✓'); viewSettings();
    };
    const f = $('#ag-photo');
    if (f) f.onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const out = await compressImage(file, 720, 0.85);
        const blob = out.blob || out;
        const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
        await save({ photo: dataUrl, face: null });
        agFaceCalib(save); // صورة جديدة: نحددو فين الفم والعينين باش يتحركو مزيان
      } catch (er) { toast('تعذر: ' + er.message, 4000); }
    };
    const fs = $('#ag-face-set'); if (fs) fs.onclick = () => agFaceCalib(save);
    const ai = $('#ag-ai');
    if (ai) ai.onclick = async () => {
      if (!agAI() && !(await confirmBox('الوكيل الذكي كيحتاج مفتاح محفوظ: Gemini (فابور) ولا Claude (مدفوع). نشعلو؟', 'شعل', false))) return;
      await save({ ai_enabled: !agAI() });
    };
    const ls = $('#ag-lang-set');
    if (ls) ls.onchange = e => { try { localStorage.setItem('w777_agent_lang', e.target.value); } catch (er) { /* */ } if (AG.open) { agHide(); agOpen(); } toast('تم ✓'); };
    const rpc = (fn, body) => Sy.request('/rest/v1/rpc/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const setKey = async (n, v) => { const r = await rpc('w777_set_secret', { n, v }); if (!r.ok) throw new Error((await r.text()).slice(0, 120)); return r.json(); };
    Object.entries(AG_KEYS).forEach(([id, k]) => {
      const st = $('#ag-key-st-' + id); if (!st) return;
      rpc('w777_has_secret', { n: k.n }).then(r => r.ok ? r.json() : null)
        .then(ok => { st.textContent = ok === true ? '— 🟢 محفوظ' : ok === false ? '— ⚪ ما كاينش' : ''; }).catch(() => { st.textContent = ''; });
      $(`[data-key-save="${id}"]`).onclick = async () => {
        const inp = $('#ag-key-' + id), v = pickKey(k, inp.value);
        if (!v) return toast(k.bad, 4500);
        const btn = $(`[data-key-save="${id}"]`);
        try {
          btn.disabled = true; st.textContent = '— ⏳ كنجربو المفتاح…';
          if (k.test) await k.test(v);
          await setKey(k.n, v); inp.value = ''; st.textContent = '— 🟢 محفوظ';
          if (!agAI() && await confirmBox('المفتاح تسجل ✓ نشعلو الوكيل الذكي دابا؟', 'شعل', false)) await save({ ai_enabled: true }); else toast('المفتاح تسجل ✓');
        } catch (er) { st.textContent = '— ⚪ ما كاينش'; toast('تعذر: ' + er.message, 6000); }
        finally { btn.disabled = false; }
      };
      // لصق من الحافظة مباشرة (الآيفون كيبين زر «Coller» صغير)
      const pb = $(`[data-key-paste="${id}"]`);
      if (pb) pb.onclick = async () => {
        let t = '';
        try { t = await navigator.clipboard.readText(); } catch (er) { /* */ }
        if (!t) return toast('ما قدرتش نقرا المنسوخ — ضغط مطول فالخانة وختار «Coller» من بعد «حفظ»', 5000);
        $('#ag-key-' + id).value = t; $(`[data-key-save="${id}"]`).click();
      };
      $(`[data-key-del="${id}"]`).onclick = async () => {
        if (!(await confirmBox('نمسحو هاد المفتاح؟', 'مسح', true))) return;
        try { await setKey(k.n, ''); st.textContent = '— ⚪ ما كاينش'; toast('تمسح ✓'); } catch (er) { toast('تعذر: ' + er.message, 4000); }
      };
    });
    const rn = $('#ag-rename');
    if (rn) rn.onclick = () => modal(`<h3>اسم الوكيل</h3><form id="agn" class="form-grid">${fInput('name', 'الاسم', (AG.cfg && AG.cfg.name) || '')}</form><div class="btn-row" style="margin-top:12px"><button class="btn gold" id="agn-ok">حفظ</button></div>`, (box, close) => {
      $('#agn-ok', box).onclick = async () => { const v = collect($('#agn', box)).name; if (v) { close(); await save({ name: v }); } };
    });
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
    { f: '24-acte-vente-definitif', ar: 'عقد بيع عقار محفظ — نموذج المحرر الرسمي', fr: 'Acte de vente immobilière', law: 'ق.ل.ع + 39.08', ic: '🔑', g: 'deed', docx: 1 },
    { f: '25-acte-donation', ar: 'عقد هبة عقار — نموذج المحرر الرسمي', fr: 'Acte de donation', law: '39.08', ic: '🎁', g: 'deed', docx: 1 },
    { f: '26-acte-echange', ar: 'عقد مبادلة عقارين — نموذج المحرر الرسمي', fr: "Acte d'échange", law: 'ق.ل.ع + 39.08', ic: '🔁', g: 'deed', docx: 1 },
    { f: '27-acte-hypotheque', ar: 'عقد رهن رسمي على عقار محفظ', fr: "Acte d'hypothèque", law: '39.08', ic: '🏦', g: 'deed', docx: 1 },
    { f: '28-bail-habitation-pro', ar: 'عقد كراء محل للسكنى أو للاستعمال المهني (نموذج قابل للتعبئة)', fr: 'Bail habitation / usage professionnel', law: 'القانون 67.12', ic: '🏠', g: 'rent' },
    { f: '29-bail-commercial-artisanal', ar: 'عقد كراء محل تجاري أو صناعي أو حرفي (نموذج قابل للتعبئة)', fr: 'Bail commercial, industriel ou artisanal', law: 'القانون 49.16', ic: '🏪', g: 'rent' },
    { f: '30-contrat-partenariat', ar: 'عقد شراكة لإنجاز مشروع مشترك واستغلاله', fr: 'Contrat de partenariat', law: 'ق.ل.ع', ic: '🤝', g: 'other' },
    { f: '31-demande-compteur-electricite', ar: 'طلب تركيب عداد الكهرباء لعقار', fr: 'Demande de compteur électrique', law: '', ic: '⚡', g: 'admin' },
    { f: '32-engagement-hebergement', ar: 'التزام بالإيواء والسكن دون مقابل', fr: "Engagement d'hébergement gratuit", law: '', ic: '🏡', g: 'admin' },
    { f: '33-engagement', ar: 'التزام (نموذج عام مصادق عليه)', fr: 'Engagement sur l’honneur', law: '', ic: '✍️', g: 'admin' },
    { f: '34-demande-administrative', ar: 'طلب / رسالة إلى إدارة (نموذج عام)', fr: 'Lettre de demande', law: '', ic: '✉️', g: 'admin' },
    { f: '35-declaration-sans-emploi', ar: 'تصريح بالشرف بعدم مزاولة أي عمل', fr: 'Déclaration sur l’honneur de non-emploi', law: '', ic: '📄', g: 'admin' },
    { f: '36-conge-paternite', ar: 'طلب الاستفادة من رخصة الأبوة', fr: 'Demande de congé de paternité', law: '', ic: '👶', g: 'admin' },
  ];
  const CT_GROUPS = [['deed', '⚖️ نماذج المحررات الرسمية — قابلة للتعديل (Word)'], ['base', '📘 الدليل الأساسي (01–08)'], ['rent', '🏠 الكراء'], ['sale', '🔑 البيع والشراء'], ['agency', '🤝 الوكالة والوساطة'], ['admin', '🗂️ طلبات والتزامات إدارية'], ['other', '🧱 أخرى']];
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
          ${docBtns(`files/contrats/${c.f}.pdf`, `AlWasset777-${c.f}.pdf`)}
          ${c.docx ? `<a class="btn sm" style="margin-top:6px;align-self:flex-start;border-color:#2b579a;color:#2b579a" href="files/contrats/${c.f}.docx" download="AlWasset777-${c.f}.docx">📝 تحميل Word للتعديل</a>` : ''}</div>
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
      ${CT_GROUPS.map(([g, t]) => `<h2 class="sec-h">${t}</h2>${g === 'deed' ? '<p class="muted" style="margin:-4px 0 10px;font-size:13px">نماذج كاملة كيخدمو بيها الموثقين والعدول والمحامين: حمّل نسخة Word، بدّل حسب الحالة، وعطيها للمحرر.</p>' : ''}<div class="doc-grid">${CONTRACTS.filter(c => (c.g || 'base') === g).map(card).join('')}</div>`).join('')}
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
        const opt = { body, icon: 'icons/icon-192.png?v=9', badge: 'icons/icon-192.png?v=9', tag: key, data: { url: '#/appointments' }, requireInteraction: true };
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
      if (c && Sy && Sy.isOn() && c.u === Sy.uid()) { S.role = c.role; S.agency = c.agency; S.kind = c.kind || (c.role === 'agency' ? 'agency' : c.role); S.roleFor = c.u; }
    } catch (e) { /* */ }
  }
  async function refreshRole(force) {
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) { S.role = null; S.kind = null; S.agency = null; S.roleFor = null; return 0; }
    const u = Sy.uid();
    if (!force && S.roleFor === u && S.roleAt && Date.now() - S.roleAt < 3600000) return 0;
    const before = S.role;
    try {
      const [admin, rows] = await Promise.all([
        Sy.request('/rest/v1/rpc/w777_is_admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.json()),
        Sy.request(`/rest/v1/w777_agencies?uid=eq.${u}&select=code,name,phone,active,kind,country,city,district,gps,budget,invest_modes,services,about,terms_at,sub_until,photo,logo,id_doc,id_doc_at,id_ok`).then(r => r.json())]);
      const ag = admin === true ? null : (rows && rows[0]) || null;
      // «agency» = عضو فالشبكة (وكالة، وسيط، مقاولة ولا تشطيب) — النوع فـ S.kind
      S.role = admin === true ? 'admin' : ag ? 'agency' : 'solo';
      S.kind = admin === true ? 'admin' : ag ? ag.kind || 'agency' : null;
      S.agency = ag; S.roleFor = u; S.roleAt = Date.now();
      localStorage.setItem('w777_role', JSON.stringify({ u, role: S.role, kind: S.kind, agency: ag }));
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
    if (staffMe()) return 0; // الموظف ما كينشرش باسمو
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) return 0;
    await refreshRole();
    if (!inNetwork()) return 0;
    const me = Sy.uid();
    const props = await DB.all('properties');
    const up = await DB.getMeta('sync_uploaded', {});
    // صورة ماشي فهاد الجهاز = جات من السحابة (رفعها جهاز آخر) ← كتتنشر حتى هي.
    // بلا هادشي، كل جهاز كان كيمسح صور الأجهزة الأخرى من الشبكة.
    const local = new Set((await DB.fileIndex()).map(f => f.id));
    const prev = await DB.getMeta('shared_hash', {});
    const prevOwner = await DB.getMeta('shared_owner', null);
    const known = prevOwner === me ? prev : {};
    const agency = myAgencyName(), phone = myAgencyPhone();
    const rows = [], next = {};
    for (const p of props) {
      if (p.status !== 'available' || p.partner || String(p.id).startsWith('pt-')) continue;
      const photos = (p.media || []).filter(m => m.kind === 'photo' && (up[m.id] || !local.has(m.id)));
      const cv = p.cover && photos.find(m => m.id === p.cover);
      const ordered = cv ? [cv, ...photos.filter(m => m !== cv)] : photos;
      const data = {
        ref: p.ref, title: p.title, transaction: p.transaction, type: p.type, city: p.city, district: p.district,
        priceMin: p.priceMin, priceMax: p.priceMax, priceUnit: p.priceUnit, negotiable: p.negotiable,
        areaTotal: p.areaTotal, areaBuilt: p.areaBuilt, areaUseful: p.areaUseful, specs: p.specs || {}, features: p.features || [],
        description: hideDigits(p.description), createdAt: p.createdAt,
      };
      const row = { owner: me, id: p.id, agency, phone, city: p.city || null, type: p.type || null, trx: p.transaction || null,
        price: num(p.priceMax) || num(p.priceMin) || null, photo_ids: ordered.slice(0, S.role === 'admin' ? 30 : PHOTO_MAX).map(m => m.id), data, deleted: false };
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
    const Sy = window.W777_SYNC;
    const pr = (Sy.netPhotoUrl ? Sy.netPhotoUrl(owner, id, thumb) : Sy.fetchPath(owner, id, thumb).then(b => b ? URL.createObjectURL(b) : null))
      .then(u => { if (!u) netUrl.delete(k); return u; });
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
          <div id="nt-near"></div>
        </div>
      </div>`;
    hydrateNet(main());
    notaryBox($('#nt-near'), { ref: p.ref, title: p.title || typeAr(p.type), city: p.city, district: p.district });
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



  /* ============================================================
     الحجز: شقق مفروشة وعقارات العطل (بحال Airbnb)
     الزبون كيطلب ← مكتب الوسيط 777 كيستلم المبلغ ← كيأكد مع صاحب العقار
     ← الزبون كيوصل ويكون راضي ← المكتب كيسلّم المبلغ لصاحب العقار
     ============================================================ */
  const STAY_KINDS = { apartment: '🏢 شقة مفروشة', studio: '🛏️ استوديو', villa: '🏡 فيلا', riad: '🕌 رياض', house: '🏠 دار', chalet: '🏔️ شاليه', room: '🚪 غرفة', other: '✨ أخرى' };
  const STAY_AMEN = ['واي فاي', 'مكيف', 'تدفئة', 'مطبخ مجهز', 'غسالة', 'تلفاز', 'موقف سيارات', 'مسبح', 'حديقة', 'شرفة / تيراس', 'إطلالة على البحر', 'قرب الشاطئ', 'مصعد', 'أفرشة وفوط', 'مناسب للعائلات', 'شواء (باربكيو)'];
  const BK_ST = { requested: ['🆕 طلب جديد', 'blue'], confirmed: ['✅ مؤكد — المبلغ عند المكتب', 'green'], checked_in: ['🧳 الزبون وصل', 'gold'],
    completed: ['💚 مكتمل — تسلّم صاحب العقار', 'green'], cancelled: ['✖ ملغى', 'red'], refunded: ['↩ تم الإرجاع', 'gray'] };
  const bkBadge = s => { const x = BK_ST[s] || [s, 'gray']; return `<span class="badge ${x[1]}">${x[0]}</span>`; };
  const stayImg = path => path ? `${(window.W777_SYNC.account() || window.W777_SYNC.defaults()).url}/storage/v1/object/public/w777-stays/${path}` : '';
  const nightsOf = (a, b) => a && b ? Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5) : 0;
  const addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const STAY_STEPS = ['اختار العقار والتواريخ وصيفط طلب الحجز.', 'كتأدي مبلغ الحجز لمكتب الوسيط 777 (ماشي لصاحب العقار).', 'المكتب كيتواصل مع صاحب العقار وكيأكد الحجز.', 'كتوصل وكتشوف العقار — إلا كنتي راضي…', '…المكتب كيسلّم المبلغ لصاحب العقار. وإلا ماشي راضي، المكتب كيتدخل.'];
  const stepsBox = () => `<div class="card card-pad st-how"><b>🛡️ كيفاش كيخدم الحجز؟ (الأمان عبر مكتب الوسيط 777)</b>
    <ol>${STAY_STEPS.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>`;
  function stayCalendar(busy) {
    const isBusy = d => busy.some(b => b.check_in <= d && d < b.check_out);
    const t = today(); let html = '';
    for (let m = 0; m < 2; m++) {
      const first = new Date(t.slice(0, 7) + '-01T12:00:00'); first.setMonth(first.getMonth() + m);
      const y = first.getFullYear(), mo = first.getMonth(), days = new Date(y, mo + 1, 0).getDate(), pad = (first.getDay() + 6) % 7;
      let cells = '';
      for (let i = 0; i < pad; i++) cells += '<i></i>';
      for (let d = 1; d <= days; d++) {
        const ds = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells += `<span class="${ds < t ? 'past' : isBusy(ds) ? 'busy' : 'free'}">${d}</span>`;
      }
      html += `<div class="st-month"><b>${esc(first.toLocaleDateString('ar-MA', { month: 'long', year: 'numeric' }))}</b>
        <div class="st-days">${['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'].map(x => `<em>${x}</em>`).join('')}${cells}</div></div>`;
    }
    return `<div class="st-cal">${html}</div><small class="muted">🟩 متوفر · 🟥 محجوز</small>`;
  }
  function stayCard(s, href) {
    const ph = (s.photos || [])[0];
    return `<a class="card st-card" href="${href || '#/stays/v/' + s.id}">
      <div class="st-cover">${ph ? `<img src="${esc(stayImg(ph))}" alt="" loading="lazy">` : `<div class="ph">${ic('image', 40)}</div>`}
        <span class="badge">${esc(STAY_KINDS[s.kind] || STAY_KINDS.other)}</span>${s.status && s.status !== 'approved' ? `<span class="st-st">${stBadge(s.status)}</span>` : ''}</div>
      <div class="st-body"><b>${esc(s.title)}</b><small class="muted">📍 ${esc([s.district, s.city].filter(Boolean).join('، ') || '—')}</small>
        <small class="muted">👥 ${s.max_guests} ضيوف · 🛏️ ${s.beds || 1} سرير · 🚿 ${s.baths || 1}</small>
        <div class="st-price">${nm(s.price_night)} درهم <small>/ الليلة</small></div></div></a>`;
  }
  async function viewStays(parts, query) {
    if (!await netGate('الحجز', '🏖️')) return;
    const admin = S.role === 'admin';
    const tabs = [['', '🏖️ تصفح واحجز'], ['mine', '🏠 عقاراتي وحجوزاتي'], ['new', '➕ زيد عقار للحجز']];
    if (admin) tabs.push(['bookings', '📒 إدارة الحجوزات'], ['review', '🛡️ المراجعة']);
    if (parts[1] === 'v') return viewStay(parts[2]);
    const tab = pickTab(tabs, parts[1] || '', '');
    const pub = location.href.split('#')[0].replace(/index\.html$/, '') + 'stays.html';
    const head = secHead('🏖️', 'الحجز — شقق مفروشة وعقارات العطل', 'حجز بحال Airbnb، والأمان عبر مكتب الوسيط 777: المبلغ كيبقى عند المكتب حتى يوصل الزبون ويكون راضي.', tabs, tab, 'stays')
      + `<div class="btn-row" style="margin:-4px 0 12px"><button class="btn sm" id="st-link">🔗 رابط الحجز للزبناء</button>
         <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('🏖️ احجز شقة مفروشة ولا عقار للعطلة مع مكتب الوسيط 777 — الأداء آمن عبر المكتب:\n' + pub)}">${ic('wa', 15)} شارك الرابط</a></div>`;
    const bindLink = () => { const b = $('#st-link'); if (b) b.onclick = async () => { try { await navigator.clipboard.writeText(pub); toast('تنسخ الرابط ✓'); } catch (e) { modal(`<h3>رابط الحجز</h3><input value="${esc(pub)}" style="width:100%" dir="ltr" readonly>`); } }; };
    if (tab === 'new') { await stayForm(head, query.id); bindLink(); return; }
    if (tab === 'bookings') { await viewBookingsAdmin(head); bindLink(); return; }
    if (tab === 'mine') { await viewStaysMine(head); bindLink(); return; }
    let rows;
    try { rows = await rq(`/rest/v1/w777_stays?select=*&status=${tab === 'review' ? 'eq.pending' : 'eq.approved'}&order=created_at.desc&limit=300`); }
    catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    if (tab === 'review') {
      main().innerHTML = head + `<div class="dir-grid">${rows.map(s => `<div class="st-rev">${stayCard(s)}
        <div class="btn-row" style="margin-top:8px"><button class="btn sm gold" data-ok="${s.id}">✅ نشر</button><button class="btn sm" data-no="${s.id}">✖ رفض</button>
        ${s.owner_phone ? `<a class="btn sm" href="${telLink(s.owner_phone)}">${ic('phone', 15)}</a>` : ''}</div></div>`).join('') || emptyCard('🛡️', 'ما كاين حتى عقار فانتظار المراجعة', '')}</div>`;
      const patch = async (id, body, ok) => { try { await rq(`/rest/v1/w777_stays?id=eq.${id}`, 'PATCH', body); toast(ok); route(); } catch (e) { toast('تعذر: ' + e.message, 4000); } };
      $$('[data-ok]').forEach(b => b.onclick = () => patch(b.dataset.ok, { status: 'approved' }, 'تنشر ✓'));
      $$('[data-no]').forEach(b => b.onclick = () => noteModal('سبب الرفض', '', n => patch(b.dataset.no, { status: 'rejected', admin_note: n }, 'ترفض')));
      bindLink(); return;
    }
    const f = Object.assign({ city: '', kind: '', guests: '', d1: '', d2: '', pmax: null }, S.stf || {});
    const cities = [...new Set(rows.map(s => s.city).filter(Boolean))].sort();
    main().innerHTML = head + `
      <div class="card card-pad st-search">
        <form id="stf" class="form-grid" onsubmit="return false">
          ${fSelect('city', 'المدينة', cities, f.city, { empty: 'كل المدن' })}
          ${fInput('d1', 'الوصول', f.d1, { type: 'date', attrs: `min="${today()}"` })}
          ${fInput('d2', 'المغادرة', f.d2, { type: 'date', attrs: `min="${today()}"` })}
          ${fSelect('guests', 'الضيوف', ['1', '2', '3', '4', '5', '6', '8', '10'], f.guests, { empty: 'أي عدد' })}
          ${fSelect('kind', 'النوع', Object.entries(STAY_KINDS).map(([v, l]) => ({ v, l })), f.kind, { empty: 'الكل' })}
          ${fInput('pmax', 'الثمن الأقصى / الليلة', f.pmax, { money: true })}
        </form><div class="muted" id="st-count" style="margin-top:8px"></div></div>
      <div class="st-grid" id="st-grid"></div>
      ${stepsBox()}`;
    bindMoney(main()); bindLink();
    const busyCache = {};
    const draw = async () => {
      const v = collect($('#stf')); Object.assign(f, { city: v.city, kind: v.kind, guests: v.guests, d1: v.d1, d2: v.d2, pmax: num(v.pmax) }); S.stf = f;
      let res = rows.filter(s => (!f.city || s.city === f.city) && (!f.kind || s.kind === f.kind) && (!f.guests || s.max_guests >= +f.guests) && (!f.pmax || num(s.price_night) <= f.pmax));
      if (f.d1 && f.d2 && f.d2 > f.d1) {
        await Promise.all(res.map(async s => { if (!busyCache[s.id]) busyCache[s.id] = await rq('/rest/v1/rpc/w777_stay_busy', 'POST', { s: s.id }).catch(() => []); }));
        res = res.filter(s => !busyCache[s.id].some(b => b.check_in < f.d2 && b.check_out > f.d1) && nightsOf(f.d1, f.d2) >= (s.min_nights || 1));
      }
      $('#st-count').textContent = `${res.length} عقار متوفر`;
      $('#st-grid').innerHTML = res.map(s => stayCard(s, `#/stays/v/${s.id}${f.d1 && f.d2 ? `?d1=${f.d1}&d2=${f.d2}` : ''}`)).join('')
        || emptyCard('🏖️', 'ما كاين حتى عقار بهاد الشروط', 'بدّل التواريخ ولا المدينة — ولا زيد العقار ديالك من «➕ زيد عقار للحجز».');
    };
    $$('#stf input, #stf select').forEach(el => el.addEventListener('change', draw));
    draw();
  }
  async function viewStay(id) {
    let s, busy = [];
    try { s = (await rq(`/rest/v1/w777_stays?id=eq.${id}&select=*`))[0]; busy = await rq('/rest/v1/rpc/w777_stay_busy', 'POST', { s: id }).catch(() => []); } catch (e) { /* */ }
    if (!s) { main().innerHTML = notFound(); return; }
    const me = window.W777_SYNC.uid(), canEdit = S.role === 'admin' || s.owner === me;
    const q = parseHash().query;
    main().innerHTML = `
      <div class="page-head"><a class="btn" href="#/stays">${ic('back', 18)} الحجز</a>${canEdit ? `<a class="btn" href="#/stays/new?id=${s.id}">${ic('edit', 16)} تعديل</a>` : ''}</div>
      <div class="st-gallery n${Math.min((s.photos || []).length, 5)}">${(s.photos || []).map((p, i) => `<img src="${esc(stayImg(p))}" data-i="${i}" alt="">`).join('') || `<div class="card empty">${ic('image', 40)}<p>بلا صور</p></div>`}</div>
      <div class="detail-grid" style="margin-top:16px">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card card-pad">
            <div class="btn-row" style="gap:6px"><span class="badge gold">${esc(STAY_KINDS[s.kind] || STAY_KINDS.other)}</span>${s.status !== 'approved' ? stBadge(s.status) : ''}<span class="badge" dir="ltr">${refOf('ST', s.id)}</span></div>
            <h1 style="margin:8px 0 4px;font-size:24px">${esc(s.title)}</h1>
            <div class="muted">📍 ${esc([s.district, s.city].filter(Boolean).join('، ') || '—')} · 🏢 ${esc(s.owner_name || '')}</div>
            <div class="kv" style="margin-top:12px"><div><small>الضيوف</small><b>👥 ${s.max_guests}</b></div><div><small>غرف النوم</small><b>${s.bedrooms || 1}</b></div><div><small>الأسرّة</small><b>${s.beds || 1}</b></div><div><small>الحمامات</small><b>${s.baths || 1}</b></div><div><small>أقل مدة</small><b>${s.min_nights || 1} ليلة</b></div></div>
            ${(s.amenities || []).length ? `<h3 class="section-title" style="margin-top:14px">✨ المرافق</h3><div class="chips wrap">${s.amenities.map(a => `<span class="chip">${esc(a)}</span>`).join('')}</div>` : ''}
            ${s.description ? `<h3 class="section-title" style="margin-top:14px">📝 الوصف</h3><p style="white-space:pre-wrap;margin:0">${esc(s.description)}</p>` : ''}
            ${s.rules ? `<h3 class="section-title" style="margin-top:14px">📌 قواعد العقار</h3><p style="white-space:pre-wrap;margin:0">${esc(s.rules)}</p>` : ''}
            ${canEdit && (s.address || s.owner_phone) ? `<div class="mod-note" style="margin-top:12px">🔒 خاص: ${esc(s.address || '')} ${s.owner_phone ? '· ' + esc(s.owner_phone) : ''}</div>` : ''}
          </div>
          <div class="card card-pad"><h3 class="section-title">📅 التوفر</h3>${stayCalendar(busy)}</div>
        </div>
        <div class="card card-pad st-book">
          <div class="st-price" style="font-size:24px">${nm(s.price_night)} درهم <small>/ الليلة</small></div>
          ${num(s.cleaning_fee) ? `<small class="muted">+ ${nm(s.cleaning_fee)} درهم تنظيف</small>` : ''}
          <form id="bkf" class="form-grid" style="margin-top:12px" onsubmit="return false">
            ${fInput('d1', 'الوصول', q.d1 || '', { type: 'date', req: true, attrs: `min="${today()}"` })}
            ${fInput('d2', 'المغادرة', q.d2 || '', { type: 'date', req: true, attrs: `min="${addDays(today(), 1)}"` })}
            ${fSelect('guests', 'الضيوف', Array.from({ length: s.max_guests || 1 }, (_, i) => String(i + 1)), (s.max_guests || 1) >= 2 ? '2' : '1', { noEmpty: true })}
            ${fInput('name', 'سمية الزبون', '', { req: true })}
            ${fInput('phone', 'هاتف الزبون (واتساب)', '', { type: 'tel', req: true })}
            ${fText('note', 'ملاحظة (اختياري)', '', { ph: 'ساعة الوصول، طلبات خاصة…' })}
          </form>
          <div class="st-total" id="bk-total"></div>
          <button class="btn gold" id="bk-go" style="width:100%;margin-top:10px">📩 طلب الحجز</button>
          <p class="muted" style="font-size:12.5px;margin:10px 0 0">💡 ما كتخلص حتى حاجة دابا. المكتب غادي يتواصل معاك باش تأدي المبلغ عند مكتب الوسيط 777 ويأكد الحجز.</p>
        </div>
      </div>
      ${stepsBox()}`;
    const calc = () => {
      const v = collect($('#bkf')); const n = nightsOf(v.d1, v.d2);
      const box = $('#bk-total');
      if (n <= 0) { box.innerHTML = ''; return null; }
      const clash = busy.some(b => b.check_in < v.d2 && b.check_out > v.d1);
      const tot = n * num(s.price_night) + (num(s.cleaning_fee) || 0);
      box.innerHTML = `<div>${nm(s.price_night)} × ${n} ليلة <b>${nm(n * num(s.price_night))}</b></div>${num(s.cleaning_fee) ? `<div>التنظيف <b>${nm(s.cleaning_fee)}</b></div>` : ''}
        <div class="st-sum">المجموع <b>${nm(tot)} درهم</b></div>${n < (s.min_nights || 1) ? `<div class="st-warn">⚠️ أقل مدة ${s.min_nights} ليالي</div>` : ''}${clash ? '<div class="st-warn">⚠️ هاد التواريخ فيها حجز آخر</div>' : ''}`;
      return { v, n, tot };
    };
    $$('#bkf input, #bkf select').forEach(el => el.addEventListener('input', calc));
    calc();
    $$('.st-gallery img').forEach(img => img.onclick = () => modal(`<img src="${img.src}" style="width:100%;border-radius:12px">`));
    $('#bk-go').onclick = async () => {
      const f = $('#bkf'); if (!f.reportValidity()) return;
      const c = calc(); if (!c) { toast('اختار التواريخ'); return; }
      try {
        const r = await rq('/rest/v1/rpc/w777_book', 'POST', { s: s.id, name: c.v.name, phone: c.v.phone, guests: +c.v.guests, d1: c.v.d1, d2: c.v.d2, note: c.v.note || null, src: 'app' });
        const msg = `السلام عليكم مكتب الوسيط 777، طلب حجز ${r.ref}:\n🏖️ ${s.title} (${refOf('ST', s.id)})\n📅 ${c.v.d1} ← ${c.v.d2} (${r.nights} ليلة)\n👥 ${c.v.guests} ضيوف\n💰 ${fmtRaw(r.total)} درهم\n👤 ${c.v.name} — ${c.v.phone}`;
        modal(`<div style="text-align:center"><div style="font-size:46px">✅</div><h3>تصيفط طلب الحجز ${esc(r.ref)}</h3>
          <p>المجموع: <b>${nm(r.total)} درهم</b> (${r.nights} ليلة)</p><p class="muted">صيفط الطلب لمكتب الوسيط 777 فواتساب باش يأكد معاك ويعطيك طريقة الأداء.</p>
          <a class="btn gold wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(W777_OFFICE)}?text=${encodeURIComponent(msg)}">${ic('wa', 16)} صيفط للمكتب</a></div>`);
        busy.push({ check_in: c.v.d1, check_out: c.v.d2 });
      } catch (e) { toast('تعذر: ' + e.message, 5000); }
    };
  }
  async function stayForm(head, id) {
    let s = { kind: 'apartment', city: S.settings.officeCity, min_nights: 1, max_guests: 4, bedrooms: 1, beds: 2, baths: 1, cleaning_fee: 0, amenities: [], photos: [], owner_phone: myAgencyPhone() };
    if (id) { try { s = (await rq(`/rest/v1/w777_stays?id=eq.${id}&select=*`))[0] || s; } catch (e) { /* */ } }
    const sid = s.id || (crypto.randomUUID ? crypto.randomUUID() : uid());
    let photos = (s.photos || []).slice();
    const lim = photoLimit();
    main().innerHTML = head + `
      <div class="card card-pad form">
        <h3 class="section-title">${id ? '✏️ تعديل العقار' : '➕ عقار جديد للحجز'}</h3>
        <form id="stf2" class="form-grid" onsubmit="return false">
          ${fInput('title', 'العنوان', s.title, { req: true, cls: 'full', ph: 'مثلا: شقة مفروشة قرب البحر — 2 غرف' })}
          ${fSelect('kind', 'النوع', Object.entries(STAY_KINDS).map(([v, l]) => ({ v, l })), s.kind, { noEmpty: true })}
          ${fInput('city', 'المدينة', s.city, { req: true, list: 'dl-cities' })}
          ${fInput('district', 'الحي / المنطقة', s.district)}
          ${fInput('price_night', 'الثمن ديال الليلة (درهم)', s.price_night, { money: true, req: true })}
          ${fInput('cleaning_fee', 'مصاريف التنظيف (درهم)', s.cleaning_fee, { money: true })}
          ${fInput('min_nights', 'أقل عدد ديال الليالي', s.min_nights, { type: 'number' })}
          ${fInput('max_guests', 'أقصى عدد ديال الضيوف', s.max_guests, { type: 'number', req: true })}
          ${fInput('bedrooms', 'غرف النوم', s.bedrooms, { type: 'number' })}
          ${fInput('beds', 'الأسرّة', s.beds, { type: 'number' })}
          ${fInput('baths', 'الحمامات', s.baths, { type: 'number' })}
          <div class="field full"><label>المرافق</label><div class="chips wrap">${STAY_AMEN.map(a => `<span class="chip ${(s.amenities || []).includes(a) ? 'on' : ''}" data-am="${esc(a)}">${esc(a)}</span>`).join('')}</div></div>
          ${fText('description', 'الوصف', s.description, { ph: 'المساحة، الإطلالة، القرب من البحر والمرافق…' })}
          ${fText('rules', 'قواعد العقار', s.rules, { ph: 'ساعة الدخول والخروج، ممنوع التدخين، الحيوانات…' })}
          ${fInput('address', '🔒 العنوان الدقيق (كيشوفو غير المكتب)', s.address, { cls: 'full' })}
          ${fInput('owner_phone', '🔒 هاتف صاحب العقار (كيشوفو غير المكتب)', s.owner_phone, { type: 'tel' })}
          <div class="field full"><label>الصور ${lim === Infinity ? '' : `(حتى ${lim})`}</label>
            <label class="dropzone">${ic('camera', 28)}<b>إضافة صور</b><small>أول صورة هي الغلاف</small><input type="file" id="st-ph" accept="image/*" multiple hidden></label>
            <div class="st-thumbs" id="st-thumbs"></div></div>
        </form>
        <datalist id="dl-cities">${Object.values(CITY).map(c => `<option value="${esc(c.n)}">`).join('')}</datalist>
        <p class="muted" style="font-size:13px">🛡️ العقار كيبان فالحجز من بعد موافقة مكتب الوسيط 777. أي تعديل كيرجعو للمراجعة.</p>
        <div class="btn-row"><button class="btn gold" id="st-save">${ic('check', 18)} ${id ? 'حفظ' : 'إرسال للمراجعة'}</button></div>
      </div>`;
    bindMoney(main());
    const amen = new Set(s.amenities || []);
    $$('[data-am]').forEach(c => c.onclick = () => { const a = c.dataset.am; amen.has(a) ? amen.delete(a) : amen.add(a); c.classList.toggle('on'); });
    const drawThumbs = () => {
      $('#st-thumbs').innerHTML = photos.map((p, i) => `<div><img src="${esc(stayImg(p))}" alt=""><button type="button" data-rm="${i}">✕</button></div>`).join('');
      $$('#st-thumbs [data-rm]').forEach(b => b.onclick = () => { photos.splice(+b.dataset.rm, 1); drawThumbs(); });
    };
    drawThumbs();
    $('#st-ph').onchange = async e => {
      let files = Array.from(e.target.files); e.target.value = '';
      const room = lim - photos.length;
      if (room <= 0) { toast(`الحد الأقصى ${PHOTO_MAX} صور`, 3000); return; }
      if (files.length > room) { toast(`تزادو غير ${room} صور — الحد الأقصى ${PHOTO_MAX}`, 3000); files = files.slice(0, room); }
      for (const f of files) {
        try {
          const big = await compressImage(f, 1600, 0.8);
          const path = `${window.W777_SYNC.uid()}/${sid}/${uid()}.jpg`;
          await window.W777_SYNC.request('/storage/v1/object/w777-stays/' + path, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: big.blob });
          photos.push(path); drawThumbs();
        } catch (er) { toast('تعذر رفع صورة: ' + er.message, 4000); }
      }
    };
    $('#st-save').onclick = async () => {
      const f = $('#stf2'); if (!f.reportValidity()) return;
      const v = collect(f);
      const body = { title: v.title, kind: v.kind, city: v.city || null, district: v.district || null, price_night: num(v.price_night), cleaning_fee: num(v.cleaning_fee) || 0,
        min_nights: Math.max(1, num(v.min_nights) || 1), max_guests: Math.max(1, num(v.max_guests) || 1), bedrooms: num(v.bedrooms) || 0, beds: num(v.beds) || 1, baths: num(v.baths) || 1,
        amenities: [...amen], description: v.description || null, rules: v.rules || null, address: v.address || null, owner_phone: v.owner_phone || null, photos };
      try {
        if (id) await rq(`/rest/v1/w777_stays?id=eq.${id}`, 'PATCH', body);
        else await rq('/rest/v1/w777_stays', 'POST', Object.assign({ id: sid, owner_name: myAgencyName() }, body), 'return=minimal');
        toast(S.role === 'admin' ? 'تم الحفظ ✓' : 'تصيفط للمراجعة ✓', 3000);
        location.hash = '#/stays/mine';
      } catch (e) { toast('تعذر: ' + e.message, 4000); }
    };
  }
  async function viewStaysMine(head) {
    const me = window.W777_SYNC.uid();
    let mine = [], ob = [], made = [];
    try {
      [mine, ob, made] = await Promise.all([
        rq(`/rest/v1/w777_stays?select=*&owner=eq.${me}&order=created_at.desc`),
        rq('/rest/v1/rpc/w777_owner_bookings', 'POST', {}).catch(() => []),
        rq(`/rest/v1/w777_bookings?select=id,stay_id,guest_name,guests,check_in,check_out,nights,total,status,w777_stays(title)&created_by=eq.${me}&order=created_at.desc&limit=100`).catch(() => []),
      ]);
    } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    main().innerHTML = head + `
      <h2 class="gd-part">🏠 العقارات ديالي للحجز (${mine.length})</h2>
      <div class="st-grid">${mine.map(s => `<div>${stayCard(s)}${s.admin_note ? `<div class="mod-note">📝 ${esc(s.admin_note)}</div>` : ''}
        <div class="btn-row" style="margin-top:6px"><a class="btn sm" href="#/stays/new?id=${s.id}">${ic('edit', 15)} تعديل</a>
        ${s.status !== 'closed' ? `<button class="btn sm" data-close-st="${s.id}">⏸️ توقيف</button>` : ''}<button class="btn sm" data-del="${s.id}">${ic('trash', 15)}</button></div></div>`).join('')
        || emptyCard('🏖️', 'مازال ما زدتي حتى عقار للحجز', '<a class="btn gold" href="#/stays/new">➕ زيد عقار</a>')}</div>
      <h2 class="gd-part">📅 الحجوزات على العقارات ديالي</h2>
      <div class="card">${ob.map(b => `<div class="list-row"><div class="grow"><b>${esc(b.title)}</b> ${bkBadge(b.status)}
        <small class="muted">📅 ${esc(b.check_in)} ← ${esc(b.check_out)} · ${b.nights} ليلة · 👥 ${b.guests} · ${esc(b.guest_name || '')}</small>
        <small class="muted">💰 المجموع ${nm(b.total)} درهم${b.payout_amount ? ` · نصيبك ${nm(b.payout_amount)} درهم${b.paid_out_at ? ' ✓ تسلّمتيه' : ''}` : ''}</small></div></div>`).join('')
        || '<div class="empty">ما كاين حتى حجز دابا</div>'}</div>
      <h2 class="gd-part">🧾 الحجوزات اللي درت للزبناء ديالي</h2>
      <div class="card">${made.map(b => `<div class="list-row"><div class="grow"><b>${esc((b.w777_stays || {}).title || '')}</b> ${bkBadge(b.status)}
        <small class="muted"><span dir="ltr">${refOf('BK', b.id)}</span> · 👤 ${esc(b.guest_name)} · 📅 ${esc(b.check_in)} ← ${esc(b.check_out)} · 💰 ${nm(b.total)} درهم</small></div></div>`).join('')
        || '<div class="empty">ما درتي حتى حجز</div>'}</div>`;
    $$('[data-close-st]').forEach(b => b.onclick = async () => { if (!await confirmBox('توقيف هاد العقار من الحجز؟', 'توقيف', false)) return; try { await rq(`/rest/v1/w777_stays?id=eq.${b.dataset.closeSt}`, 'PATCH', { status: 'closed' }); route(); } catch (e) { toast('تعذر: ' + e.message); } });
    $$('[data-del]').forEach(b => b.onclick = async () => { if (!await confirmBox('حذف العقار نهائيا؟', 'حذف')) return; try { await rq(`/rest/v1/w777_stays?id=eq.${b.dataset.del}`, 'DELETE'); route(); } catch (e) { toast('تعذر: ' + e.message); } });
  }
  async function viewBookingsAdmin(head) {
    let rows, stays;
    try {
      [rows, stays] = await Promise.all([
        rq('/rest/v1/w777_bookings?select=*,w777_stays(title,owner,owner_name,owner_phone,city)&order=check_in.desc&limit=500'),
        rq('/rest/v1/w777_stays?select=id,title,price_night,cleaning_fee,max_guests,status&order=title.asc'),
      ]);
    } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    let dir = []; try { dir = await loadDir(); } catch (e) { /* */ }
    const phoneOf = b => (b.w777_stays || {}).owner_phone || (dir.find(a => a.uid === (b.w777_stays || {}).owner) || {}).phone || '';
    const held = rows.filter(b => ['confirmed', 'checked_in'].includes(b.status)).reduce((x, b) => x + (num(b.paid_amount) || 0), 0);
    const comm = rows.filter(b => b.status === 'completed').reduce((x, b) => x + (num(b.commission) || 0), 0);
    let fs = 'active';
    main().innerHTML = head + `
      <div class="card card-pad" style="margin-bottom:14px"><div class="kv">
        <div><small>طلبات جديدة</small><b>${rows.filter(b => b.status === 'requested').length}</b></div>
        <div><small>مؤكدة / الزبون وصل</small><b>${rows.filter(b => ['confirmed', 'checked_in'].includes(b.status)).length}</b></div>
        <div><small>💰 المبالغ عند المكتب</small><b>${nm(held)} درهم</b></div>
        <div><small>عمولة المكتب (مكتملة)</small><b>${nm(comm)} درهم</b></div></div>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="bk-add">➕ حجز يدوي</button></div></div>
      <div class="chips" style="margin-bottom:12px">${[['active', 'الجارية'], ['requested', '🆕 جديدة'], ['confirmed', '✅ مؤكدة'], ['checked_in', '🧳 وصلو'], ['completed', '💚 مكتملة'], ['cancelled', '✖ ملغاة'], ['', 'الكل']].map(([k, l]) => `<span class="chip ${k === fs ? 'on' : ''}" data-fs="${k}">${l}</span>`).join('')}</div>
      <div id="bk-list"></div>`;
    const patch = async (id, body, ok) => { try { await rq(`/rest/v1/w777_bookings?id=eq.${id}`, 'PATCH', Object.assign({ updated_at: new Date().toISOString() }, body)); toast(ok); route(); } catch (e) { toast('تعذر: ' + e.message, 4000); } };
    const draw = () => {
      const list = rows.filter(b => fs === 'active' ? ['requested', 'confirmed', 'checked_in'].includes(b.status) : !fs || b.status === fs);
      $('#bk-list').innerHTML = list.map(b => {
        const st = b.w777_stays || {}, op = phoneOf(b), ref = refOf('BK', b.id);
        const ownerMsg = `السلام عليكم ${st.owner_name || ''}، مكتب الوسيط 777: حجز ${ref} على «${st.title || ''}»\n📅 ${b.check_in} ← ${b.check_out} (${b.nights} ليلة)\n👥 ${b.guests} ضيوف\nالمبلغ عند المكتب، كيتسلم ليك من بعد وصول الزبون ورضاه.`;
        return `<div class="card card-pad bk-row">
          <div class="btn-row" style="justify-content:space-between">${bkBadge(b.status)}<span class="badge" dir="ltr">${ref}</span></div>
          <b>🏖️ ${esc(st.title || '—')}</b> <small class="muted">${esc(st.city || '')} · 🏢 ${esc(st.owner_name || '')}</small>
          <div class="muted">📅 <b>${esc(b.check_in)}</b> ← <b>${esc(b.check_out)}</b> · ${b.nights} ليلة · 👥 ${b.guests} · ${b.source === 'public' ? '🌐 صفحة الحجز' : '📱 التطبيق'}</div>
          <div>👤 <b>${esc(b.guest_name)}</b> · <a href="${telLink(b.guest_phone)}" dir="ltr">${esc(b.guest_phone)}</a></div>
          <div>💰 المجموع <b>${nm(b.total)}</b> درهم${b.paid_amount ? ` · توصل المكتب بـ <b>${nm(b.paid_amount)}</b>` : ''}${b.commission ? ` · العمولة ${nm(b.commission)}` : ''}${b.payout_amount ? ` · لصاحب العقار ${nm(b.payout_amount)}` : ''}</div>
          ${b.note ? `<div class="muted">📝 ${esc(b.note)}</div>` : ''}${b.admin_note ? `<div class="mod-note">🛡️ ${esc(b.admin_note)}</div>` : ''}
          <div class="btn-row" style="margin-top:8px">
            <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(b.guest_phone)}?text=${encodeURIComponent('السلام عليكم ' + b.guest_name + '، مكتب الوسيط 777 بخصوص الحجز ' + ref)}">${ic('wa', 15)} الزبون</a>
            ${op ? `<a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(op)}?text=${encodeURIComponent(ownerMsg)}">${ic('wa', 15)} صاحب العقار</a>` : ''}
            ${b.status === 'requested' ? `<button class="btn sm gold" data-pay="${b.id}">💰 توصلت بالمبلغ</button>` : ''}
            ${b.status === 'confirmed' ? `<button class="btn sm gold" data-in="${b.id}">🧳 الزبون وصل</button>` : ''}
            ${b.status === 'checked_in' ? `<button class="btn sm gold" data-done="${b.id}">💚 راضي — سلّم المبلغ</button><button class="btn sm" data-refund="${b.id}">↩ ماشي راضي — إرجاع</button>` : ''}
            ${['requested', 'confirmed'].includes(b.status) ? `<button class="btn sm" data-cancel="${b.id}">✖ إلغاء</button>` : ''}
          </div></div>`;
      }).join('') || emptyCard('📒', 'ما كاين حتى حجز', '');
      const byId = id => rows.find(x => x.id === id);
      $$('[data-pay]').forEach(x => x.onclick = () => {
        const b = byId(x.dataset.pay);
        modal(`<h3>💰 ${refOf('BK', b.id)} — توصل المكتب بالمبلغ</h3><form id="pm" class="form-grid">
          ${fInput('paid', 'المبلغ اللي توصل بيه المكتب (درهم)', b.total, { money: true })}${fInput('comm', 'عمولة المكتب (درهم)', Math.round((num(b.total) || 0) * 0.1), { money: true, hint: 'افتراضيا 10% — بدّلها إلا بغيتي' })}
          ${fText('note', 'ملاحظة', b.admin_note)}</form><div class="btn-row" style="margin-top:12px"><button class="btn gold" id="pm-ok">✅ تأكيد الحجز</button></div>`, (box, close) => {
          bindMoney(box);
          $('#pm-ok', box).onclick = () => { const v = collect($('#pm', box)); close(); patch(b.id, { status: 'confirmed', paid_amount: num(v.paid), commission: num(v.comm) || 0, paid_at: new Date().toISOString(), admin_note: v.note || null }, 'الحجز مؤكد ✓ — تواصل مع صاحب العقار'); };
        });
      });
      $$('[data-in]').forEach(x => x.onclick = () => patch(x.dataset.in, { status: 'checked_in' }, 'تسجل الوصول ✓'));
      $$('[data-done]').forEach(x => x.onclick = () => {
        const b = byId(x.dataset.done), def = (num(b.paid_amount) || num(b.total) || 0) - (num(b.commission) || 0);
        modal(`<h3>💚 تسليم المبلغ لصاحب العقار</h3><form id="po" class="form-grid">${fInput('payout', 'المبلغ اللي تسلّم لصاحب العقار (درهم)', def, { money: true })}</form>
          <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="po-ok">✅ تم التسليم</button></div>`, (box, close) => {
          bindMoney(box);
          $('#po-ok', box).onclick = () => { const v = collect($('#po', box)); close(); patch(b.id, { status: 'completed', payout_amount: num(v.payout), paid_out_at: new Date().toISOString() }, 'تم ✓'); };
        });
      });
      $$('[data-refund]').forEach(x => x.onclick = () => noteModal('سبب الإرجاع', '', n => patch(x.dataset.refund, { status: 'refunded', admin_note: n }, 'تسجل الإرجاع')));
      $$('[data-cancel]').forEach(x => x.onclick = () => noteModal('سبب الإلغاء', '', n => patch(x.dataset.cancel, { status: 'cancelled', admin_note: n }, 'تلغى')));
    };
    $$('[data-fs]').forEach(c => c.onclick = () => { fs = c.dataset.fs; $$('[data-fs]').forEach(x => x.classList.toggle('on', x === c)); draw(); });
    $('#bk-add').onclick = () => {
      modal(`<h3>➕ حجز يدوي</h3><form id="ma" class="form-grid">
        ${fSelect('stay', 'العقار', stays.map(s => ({ v: s.id, l: s.title + (s.status !== 'approved' ? ' (' + s.status + ')' : '') })), '', { req: true })}
        ${fInput('d1', 'الوصول', '', { type: 'date', req: true })}${fInput('d2', 'المغادرة', '', { type: 'date', req: true })}
        ${fInput('guests', 'الضيوف', 2, { type: 'number' })}${fInput('name', 'سمية الزبون', '', { req: true })}${fInput('phone', 'الهاتف', '', { type: 'tel', req: true })}
        ${fInput('paid', 'المبلغ اللي توصل بيه المكتب (اختياري)', '', { money: true })}${fInput('comm', 'العمولة (اختياري)', '', { money: true })}</form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="ma-ok">${ic('check', 16)} حفظ</button></div>`, (box, close) => {
        bindMoney(box);
        $('#ma-ok', box).onclick = async () => {
          const fm = $('#ma', box); if (!fm.reportValidity()) return;
          const v = collect(fm), s = stays.find(x => x.id === v.stay), n = nightsOf(v.d1, v.d2);
          if (n <= 0) { toast('التواريخ غير صحيحة'); return; }
          const paid = num(v.paid);
          try {
            await rq('/rest/v1/w777_bookings', 'POST', { stay_id: v.stay, guest_name: v.name, guest_phone: v.phone, guests: num(v.guests) || 1, check_in: v.d1, check_out: v.d2, nights: n,
              total: n * num(s.price_night) + (num(s.cleaning_fee) || 0), status: paid ? 'confirmed' : 'requested', paid_amount: paid || null, paid_at: paid ? new Date().toISOString() : null, commission: num(v.comm) || null, source: 'office' }, 'return=minimal');
            close(); toast('تزاد الحجز ✓'); route();
          } catch (e) { toast('تعذر: ' + e.message, 4000); }
        };
      });
    };
    draw();
  }

  /* ============================================================
     البحث: محرك بحث كامل بفلتر شامل
     (عقاراتي · عقارات الشبكة · الزبناء والطلبات · دليل الأعضاء)
     ============================================================ */
  const SF0 = () => ({ scope: 'mine', q: '', trx: '', cat: '', type: '', city: '', district: '', pmin: null, pmax: null, amin: null, amax: null,
    beds: '', baths: '', status: 'active', feats: [], photos: false, below: false, nego: false, fav: false, zone: '', ag: '', kind: '', sv: '',
    rstatus: 'open', follow: '', sort: 'new' });
  const sfBlank = () => Object.assign(SF0(), { scope: (S.sf && S.sf.scope) || 'mine' });
  const sfCount = f => ['q', 'trx', 'cat', 'type', 'city', 'district', 'pmin', 'pmax', 'amin', 'amax', 'beds', 'baths', 'zone', 'ag', 'kind', 'sv', 'follow']
    .filter(k => f[k]).length + f.feats.length + ['photos', 'below', 'nego', 'fav'].filter(k => f[k]).length;
  const prOf = p => num(p.priceMax) || num(p.priceMin);
  const SORTS = { new: 'الأحدث', pasc: 'الثمن ↑', pdesc: 'الثمن ↓', aasc: 'المساحة ↑', adesc: 'المساحة ↓', old: 'الأقدم' };
  function sfProps(list, f, net) {
    const t = tokens(f.q || '');
    const P = x => net ? netAsProp(x) : x;
    list = list.filter(x => {
      const p = P(x);
      if (t.length && !hit(net ? norm([x.agency, p.ref, p.title, typeAr(p.type), trxAr(p.transaction), p.city, p.district, p.description, x.price].join(' ')) : propHay(p), t)) return false;
      if (f.trx && p.transaction !== f.trx) return false;
      if (f.cat && catOf(p.type) !== f.cat) return false;
      if (f.type && p.type !== f.type) return false;
      if (f.city && p.city !== f.city) return false;
      if (f.district && p.district !== f.district) return false;
      const pr = prOf(p);
      if (f.pmin && !(pr && pr >= f.pmin)) return false;
      if (f.pmax && !(pr && (num(p.priceMin) || pr) <= f.pmax)) return false;
      const a = areaOf(p);
      if (f.amin && !(a && a >= f.amin)) return false;
      if (f.amax && !(a && a <= f.amax)) return false;
      const sp = p.specs || {};
      if (f.beds && !(num(sp.bedrooms) >= +f.beds)) return false;
      if (f.baths && !(num(sp.bathrooms) >= +f.baths)) return false;
      if (f.feats.length && !f.feats.every(ft => (p.features || []).includes(ft))) return false;
      if (f.nego && !p.negotiable) return false;
      if (f.below) { const m = marketCmp(p); if (!m || m.diff === undefined || m.diff > -5) return false; }
      if (net) {
        if (f.photos && !(x.photo_ids || []).length) return false;
        if (f.ag && x.agency !== f.ag) return false;
        if (f.zone && ((S.sfCountry || {})[x.owner] || 'المغرب') !== 'المغرب' !== (f.zone === 'out')) return false;
      } else {
        if (f.photos && !(p.media || []).some(m => m.kind === 'photo')) return false;
        if (f.fav && !p.fav) return false;
        if (f.status === 'active' && !['available', 'reserved', 'negotiation'].includes(p.status)) return false;
        if (f.status && f.status !== 'active' && p.status !== f.status) return false;
      }
      return true;
    });
    const so = {
      new: (a, b) => ((net ? b.updated_at : b.createdAt) || '').localeCompare((net ? a.updated_at : a.createdAt) || ''),
      old: (a, b) => ((net ? a.updated_at : a.createdAt) || '').localeCompare((net ? b.updated_at : b.createdAt) || ''),
      pasc: (a, b) => (prOf(P(a)) || Infinity) - (prOf(P(b)) || Infinity),
      pdesc: (a, b) => (prOf(P(b)) || 0) - (prOf(P(a)) || 0),
      aasc: (a, b) => (areaOf(P(a)) || Infinity) - (areaOf(P(b)) || Infinity),
      adesc: (a, b) => (areaOf(P(b)) || 0) - (areaOf(P(a)) || 0),
    };
    return list.sort(so[f.sort] || so.new);
  }
  function sfReqs(f) {
    let list = searchReqs(f.q || '');
    if (f.trx) list = list.filter(r => r.transaction === f.trx);
    if (f.city) list = list.filter(r => r.city === f.city);
    if (f.district) list = list.filter(r => (r.districts || []).includes(f.district));
    if (f.cat) list = list.filter(r => (r.types || []).some(t => catOf(t) === f.cat));
    if (f.type) list = list.filter(r => (r.types || []).includes(f.type));
    if (f.pmin) list = list.filter(r => num(r.budgetMax) >= f.pmin);
    if (f.pmax) list = list.filter(r => (num(r.budgetMin) || num(r.budgetMax) || 0) <= f.pmax);
    if (f.beds) list = list.filter(r => num(r.bedroomsMin) >= +f.beds);
    if (f.rstatus === 'open') list = list.filter(openReq);
    else if (f.rstatus) list = list.filter(r => r.status === f.rstatus);
    if (f.follow === 'due') list = list.filter(r => r.followUp && r.followUp <= today());
    if (f.follow === 'hot') list = list.filter(r => r.priority === 'high');
    if (f.follow === 'match') list = list.filter(r => openReq(r) && matchesForReq(r).length);
    const so = { new: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''), old: (a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''),
      pasc: (a, b) => (num(a.budgetMax) || Infinity) - (num(b.budgetMax) || Infinity), pdesc: (a, b) => (num(b.budgetMax) || 0) - (num(a.budgetMax) || 0) };
    return list.sort(so[f.sort] || so.new);
  }
  async function viewSearch(query) {
    S.sf = Object.assign(SF0(), S.sf || {});
    const f = S.sf;
    // روابط من الرئيسية: #/search?q=…&trx=…&city=…&pmax=…
    if (query && Object.keys(query).length) {
      Object.assign(f, sfBlank());
      ['scope', 'q', 'trx', 'city', 'cat', 'type'].forEach(k => { if (query[k]) f[k] = query[k]; });
      if (query.pmax) f.pmax = num(query.pmax);
      history.replaceState(null, '', '#/search');
      if (window.innerWidth < 720) S.sfHide = true;   // فالهاتف: النتائج أولا، والفلتر بزر
    }
    const net = inNetwork();
    if (!net && (f.scope === 'net' || f.scope === 'dir')) f.scope = 'mine';
    const scopes = [['mine', '🏠 عقاراتي'], ...(net ? [['net', '🌍 عقارات الشبكة']] : []), ['reqs', '👥 الزبناء والطلبات'], ...(net ? [['dir', '📇 دليل الأعضاء']] : [])];
    let netList = [], dir = [];
    if (net && (f.scope === 'net' || f.scope === 'dir')) {
      main().innerHTML = `<div class="card empty">جاري التحميل…</div>`;
      try {
        dir = await loadDir();
        S.sfCountry = Object.fromEntries(dir.map(a => [a.uid, a.country || 'المغرب']));
        if (f.scope === 'net') netList = await loadNetwork();
      } catch (e) { toast('تعذر تحميل الشبكة: ' + e.message, 4000); }
    }
    const isP = f.scope === 'mine' || f.scope === 'net', isR = f.scope === 'reqs', isD = f.scope === 'dir';
    const featPool = [...new Set([...(D.FEATURES.common || []), ...(f.cat ? D.FEATURES[f.cat] || [] : ['مصعد', 'مرآب / باركينغ', 'حديقة', 'مسبح', 'شرفة (تيراس)', 'سطح', 'مكيف', 'إقامة مغلقة', 'محفظة'])])];
    const agencies = [...new Set(netList.map(x => x.agency).filter(Boolean))].sort();
    const rangeF = (a, b, lbl, money) => fRange(a, b, lbl, f[a], f[b], { money, cls: 'full' });
    const sel = (n, l, opts, empty) => fSelect(n, l, opts, f[n], { empty });
    const filters = isD ? `
        ${fInput('q', 'كلمة البحث', f.q, { ph: 'اسم، رمز، خدمة، هاتف…', cls: 'full' })}
        ${sel('kind', 'النوع', Object.entries(KINDS).map(([v, k]) => ({ v, l: k.ic + ' ' + k.ar })), 'الكل')}
        ${sel('zone', 'المنطقة', [{ v: 'ma', l: '🇲🇦 داخل المغرب' }, { v: 'out', l: '🌍 خارج المغرب' }], 'الكل')}
        ${fSelect('city', 'المدينة', [...new Set(dir.map(a => a.city).filter(Boolean))].sort(), f.city, { empty: 'كل المدن' })}
        ${fInput('sv', 'الخدمة', f.sv, { ph: 'بيع، زليج، بناء، ترميم…' })}` : `
        ${fInput('q', 'كلمة البحث', f.q, { ph: isR ? 'اسم الزبون، الهاتف، المرجع، الحي…' : 'المرجع، الحي، النوع، المالك، الهاتف، الوصف…', cls: 'full' })}
        ${sel('trx', 'نوع العملية', D.TRANSACTIONS.map(t => ({ v: t.id, l: t.ar })), 'الكل')}
        ${sel('cat', 'فئة العقار', Object.entries(D.CATEGORIES).map(([k, c]) => ({ v: k, l: c.ar })), 'كل الفئات')}
        ${fSelect('type', 'نوع العقار', [], f.type, { groups: typeGroups(), empty: 'كل الأنواع' })}
        ${fSelect('city', 'المدينة', [], f.city, { groups: cityGroups(), empty: 'كل المدن' })}
        ${fSelect('district', 'الحي', districtsOf(f.city), f.district, { empty: 'كل الأحياء' })}
        ${rangeF('pmin', 'pmax', isR ? 'الميزانية (درهم)' : 'الثمن (درهم)', true)}
        ${isP ? rangeF('amin', 'amax', 'المساحة (م²)') : ''}
        ${sel('beds', 'غرف النوم (على الأقل)', ['1', '2', '3', '4', '5', '6'], 'لا يهم')}
        ${isP ? sel('baths', 'الحمامات (على الأقل)', ['1', '2', '3', '4'], 'لا يهم') : ''}
        ${f.scope === 'mine' ? fSelect('status', 'الحالة', [{ v: 'active', l: 'المعروضة (متاح، محجوز، تفاوض)' }, ...D.STATUSES.map(s => ({ v: s.id, l: s.ar }))], f.status, { empty: 'كل الحالات' }) : ''}
        ${f.scope === 'net' ? sel('zone', 'المنطقة', [{ v: 'ma', l: '🇲🇦 داخل المغرب' }, { v: 'out', l: '🌍 خارج المغرب' }], 'الكل') : ''}
        ${f.scope === 'net' ? fSelect('ag', 'الوكالة / العضو', agencies, f.ag, { empty: 'الكل' }) : ''}
        ${isR ? fSelect('rstatus', 'حالة الطلب', [{ v: 'open', l: 'المفتوحة' }, ...D.REQUEST_STATUSES.map(s => ({ v: s.id, l: s.ar }))], f.rstatus, { empty: 'الكل' }) : ''}
        ${isR ? sel('follow', 'تصفية خاصة', [{ v: 'due', l: '⏰ المتابعة اليوم / متأخرة' }, { v: 'hot', l: '🔥 الزبناء المستعجلين' }, { v: 'match', l: '🎯 عندهم عقارات مطابقة' }], 'بدون') : ''}
        ${isP ? `<div class="field full"><label>المميزات</label><div class="chips wrap sf-feats">${featPool.map(ft => `<span class="chip ${f.feats.includes(ft) ? 'on' : ''}" data-ft="${esc(ft)}">${esc(ft)}</span>`).join('')}</div></div>
        <div class="field full"><label>خيارات</label><div class="chips wrap">
          <span class="chip ${f.photos ? 'on' : ''}" data-opt="photos">📷 بالصور فقط</span>
          <span class="chip ${f.below ? 'on' : ''}" data-opt="below">▼ تحت ثمن السوق</span>
          <span class="chip ${f.nego ? 'on' : ''}" data-opt="nego">🤝 قابل للتفاوض</span>
          ${f.scope === 'mine' ? `<span class="chip ${f.fav ? 'on' : ''}" data-opt="fav">★ المفضلة</span>` : ''}</div></div>` : ''}
        ${isD ? '' : fSelect('sort', 'الترتيب', Object.entries(SORTS).filter(([k]) => isP || !k.startsWith('a')).map(([v, l]) => ({ v, l })), f.sort, { noEmpty: true })}`;
    main().innerHTML = `
      <div class="page-head"><div><h1>🔎 البحث</h1><div class="sub">بحث شامل بفلتر كامل — النتائج كتبان فالحين</div></div>
        <button class="btn" id="sf-toggle">${ic('filter', 18)} الفلتر <span class="badge gold" id="sf-n">${sfCount(f) || ''}</span></button></div>
      <div class="chips" style="margin-bottom:12px">${scopes.map(([k, l]) => `<span class="chip ${f.scope === k ? 'on' : ''}" data-scope="${k}">${l}</span>`).join('')}</div>
      <div class="card card-pad sf-card ${S.sfHide ? 'hidden' : ''}" id="sf-card">
        <form id="sf" class="form-grid" onsubmit="return false">${filters}</form>
        <div class="btn-row" style="justify-content:space-between;margin-top:12px">
          <button class="btn" id="sf-reset">✕ مسح الفلتر</button>
          <span class="muted" id="sf-count"></span>
        </div>
      </div>
      <div class="sf-sum" id="sf-sum"></div>
      <div id="sf-res"></div>`;
    bindMoney(main());
    const form = $('#sf');
    const read = () => {
      const v = collect(form);
      ['q', 'trx', 'cat', 'type', 'city', 'district', 'beds', 'baths', 'status', 'zone', 'ag', 'kind', 'sv', 'rstatus', 'follow', 'sort'].forEach(k => { if (k in v) f[k] = v[k] || ''; });
      ['pmin', 'pmax', 'amin', 'amax'].forEach(k => { if (k in v) f[k] = num(v[k]); });
    };
    const draw = () => {
      const out = $('#sf-res');
      let n = 0, html = '';
      if (f.scope === 'mine') {
        const r = sfProps(S.props.slice(), f, false); n = r.length;
        html = r.length ? `<div class="prop-grid">${r.slice(0, 200).map(propCard).join('')}</div>` : '';
      } else if (f.scope === 'net') {
        const r = sfProps(netList.slice(), f, true); n = r.length;
        html = r.length ? `<div class="prop-grid">${r.slice(0, 200).map(netCard).join('')}</div>` : '';
      } else if (isR) {
        const r = sfReqs(f); n = r.length;
        html = r.length ? `<div class="card">${r.slice(0, 200).map(reqCard).join('')}</div>` : '';
      } else {
        const t = tokens(f.q || '');
        const r = dir.filter(a => a.active && (isNamed(a) || a.phone) && (!f.kind || kindOf(a) === f.kind) && (!f.zone || isAbroad(a) === (f.zone === 'out'))
          && (!f.city || a.city === f.city) && (!f.sv || norm(a.services || '').includes(norm(f.sv)))
          && (!t.length || hit(norm([a.code, a.name, a.city, a.country, a.services, a.about, a.phone].join(' ')), t)));
        n = r.length;
        html = r.length ? `<div class="dir-grid">${r.slice(0, 200).map(a => `<div class="card dir-card"><div class="dir-top"><div class="dir-av">${esc((a.name || '?').trim().charAt(0))}</div>
          <div class="grow"><b>${esc(a.name)}</b><small class="muted">${KINDS[kindOf(a)].ic} ${esc(KINDS[kindOf(a)].one)} · <span dir="ltr">${esc(a.code)}</span> · ${isAbroad(a) ? '🌍' : '📍'} ${esc(placeOf(a))}</small></div></div>
          ${splitList(a.services).length ? `<div class="chips wrap">${splitList(a.services).map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>` : ''}
          <div class="btn-row">${a.phone ? `<a class="btn sm" href="${telLink(a.phone)}">${ic('phone', 15)} ${esc(a.phone)}</a><a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(a.phone)}">${ic('wa', 15)} واتساب</a>` : ''}</div></div>`).join('')}</div>` : '';
      }
      out.innerHTML = html || `<div class="card empty"><div class="big">🔎</div><h3>ما كاين حتى نتيجة</h3><p>بدّل الفلتر ولا مسح شي خانات.</p></div>`;
      $('#sf-count').textContent = `${n} نتيجة`;
      $('#sf-sum').innerHTML = `<b>${n}</b> نتيجة${sfCount(f) ? ` · ${sfCount(f)} فلتر` : ''}`;
      $('#sf-n').textContent = sfCount(f) || '';
      hydrateThumbs(out); if (f.scope === 'net') hydrateNet(out);
    };
    const redraw = debounce(() => { read(); draw(); }, 150);
    $$('input', form).forEach(el => el.addEventListener('input', redraw));
    $$('select', form).forEach(el => el.addEventListener('change', () => {
      read();
      if (el.name === 'city') { f.district = ''; const d = $('[name=district]', form); if (d) d.innerHTML = `<option value="">كل الأحياء</option>` + districtsOf(f.city).map(x => `<option>${esc(x)}</option>`).join(''); }
      if (el.name === 'cat') { viewSearch(); return; }   // المميزات كتبدل حسب الفئة
      draw();
    }));
    $$('[data-ft]').forEach(c => c.onclick = () => { const v = c.dataset.ft; f.feats = f.feats.includes(v) ? f.feats.filter(x => x !== v) : [...f.feats, v]; c.classList.toggle('on'); draw(); });
    $$('[data-opt]').forEach(c => c.onclick = () => { f[c.dataset.opt] = !f[c.dataset.opt]; c.classList.toggle('on'); draw(); });
    $$('[data-scope]').forEach(c => c.onclick = () => { read(); f.scope = c.dataset.scope; viewSearch(); });
    $('#sf-reset').onclick = () => { S.sf = sfBlank(); viewSearch(); };
    $('#sf-toggle').onclick = () => { S.sfHide = !S.sfHide; $('#sf-card').classList.toggle('hidden', S.sfHide); };
    draw();
  }
  // الرئيسية (لفوق): غير جوج أزرار — «إصنع إعلانا» (على اليمين) و«بحث» ← صفحة البحث بالفلتر الكامل
  function homeSearch() {
    return `<div class="card hs-card hs-two">
      <a class="btn ad-cta" href="#/ad-maker">✨ إصنع إعلانا</a>
      <a class="btn gold" href="#/search?scope=mine">${ic('search', 18)} بحث</a>
    </div>`;
  }
  function bindHomeSearch() { /* الأزرار روابط عادية */ }

  /* ============================================================
     دليل استعمال التطبيق: دروس خطوة بخطوة بالصور + «جرّب دابا»
     ============================================================ */
  const GD_KEY = 'w777_guide_done';
  const gdDone = () => { try { return new Set(JSON.parse(localStorage.getItem(GD_KEY) || '[]')); } catch (e) { return new Set(); } };
  const gdSave = set => { try { localStorage.setItem(GD_KEY, JSON.stringify([...set])); } catch (e) { /* */ } };
  function gdLessons() {
    const G = window.W777_GUIDE || { parts: [], lessons: [] };
    // جزء «لوحة المدير» كيبان غير للمدير
    return G.lessons.map((l, i) => Object.assign({ n: i + 1 }, l)).filter(l => l.p !== 3 || S.role === 'admin');
  }
  function viewGuide(n) {
    const G = window.W777_GUIDE;
    if (!G) { main().innerHTML = `<div class="card empty">الدليل غير متوفر</div>`; return; }
    const L = gdLessons(), done = gdDone();
    const cur = n ? L.find(l => l.n === +n) : null;
    if (cur) return viewGuideLesson(cur, L, done);
    const pct = Math.round(L.filter(l => done.has(l.n)).length * 100 / (L.length || 1));
    const next = L.find(l => !done.has(l.n));
    main().innerHTML = `
      <div class="gd-hero">
        <div class="grow">
          <div class="gd-k">🎓 دليل الاستعمال</div>
          <h1>تعلّم استعمال تطبيق الوسيط 777</h1>
          <p>${L.length} درسا قصيرا بالصور، خطوة بخطوة — من أول دخول حتى شبكة الوسيط 777. كل درس فيه زر «جرّب دابا» يفتح لك الصفحة مباشرة.</p>
          <div class="gd-bar"><span style="width:${pct}%"></span></div>
          <small>${pct}% · ${L.filter(l => done.has(l.n)).length} / ${L.length} درس</small>
          <div class="btn-row" style="margin-top:12px">${next ? `<a class="btn gold" href="#/guide/${next.n}">▶ ${done.size ? 'كمّل' : 'ابدأ'}: ${esc(next.t)}</a>` : '<span class="badge green">🏆 كمّلتي كل الدروس — مبروك!</span>'}
            ${done.size ? '<button class="btn" id="gd-reset">↺ إعادة من الأول</button>' : ''}</div>
        </div>
        <img class="gd-phone" src="guide/b01b-hub.webp" alt="" loading="lazy">
      </div>
      ${G.parts.map((P, pi) => {
        const ls = L.filter(l => l.p === pi);
        if (!ls.length) return '';
        return `<h2 class="gd-part">${P.ic} ${esc(P.a)}: ${esc(P.t)}</h2>
          <div class="gd-grid">${ls.map(l => `<a class="card gd-card ${done.has(l.n) ? 'done' : ''}" href="#/guide/${l.n}">
            <img src="guide/${l.img[0]}.webp" alt="" loading="lazy">
            <div class="gd-body"><span class="gd-n">${done.has(l.n) ? '✓' : String(l.n).padStart(2, '0')}</span><b>${esc(l.t)}</b><small>${esc(l.tag)}</small></div></a>`).join('')}</div>`;
      }).join('')}`;
    const r = $('#gd-reset'); if (r) r.onclick = async () => { if (await confirmBox('إعادة الدليل من الأول؟', 'إعادة', false)) { gdSave(new Set()); viewGuide(); } };
  }
  function viewGuideLesson(l, L, done) {
    const i = L.indexOf(l), prev = L[i - 1], next = L[i + 1];
    const P = window.W777_GUIDE.parts[l.p];
    main().innerHTML = `
      <div class="page-head"><a class="btn" href="#/guide">${ic('back', 18)} الدليل</a><span class="badge gold">${i + 1} / ${L.length}</span></div>
      <div class="gd-bar" style="margin:-4px 0 14px"><span style="width:${Math.round((i + 1) * 100 / L.length)}%"></span></div>
      <div class="gd-lesson">
        <div class="gd-shots n${l.img.length}">${l.img.map(x => `<img src="guide/${x}.webp" alt="" data-zoom="${x}">`).join('')}</div>
        <div class="card card-pad gd-text">
          <div class="gd-k">${P.ic} ${esc(P.t)} · الدرس ${l.n}</div>
          <h1>${esc(l.t)}</h1>
          <div class="gd-tag">✦ ${esc(l.tag)}</div>
          <ol class="gd-steps">${l.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
          ${l.tip ? `<div class="gd-tip"><b>💡 نصيحة</b><p>${esc(l.tip)}</p></div>` : ''}
          <div class="btn-row" style="margin-top:14px">
            <button class="btn gold" id="gd-try">${ic('target', 18)} جرّب دابا</button>
            <button class="btn ${done.has(l.n) ? '' : 'primary'}" id="gd-ok">${done.has(l.n) ? '✓ مفهوم' : '✓ فهمت'}</button>
          </div>
        </div>
      </div>
      <div class="btn-row gd-nav">
        ${prev ? `<a class="btn" href="#/guide/${prev.n}">→ ${esc(prev.t)}</a>` : '<span></span>'}
        ${next ? `<a class="btn primary" href="#/guide/${next.n}" id="gd-next">${esc(next.t)} ←</a>` : `<a class="btn primary" href="#/guide">🏆 النهاية</a>`}
      </div>`;
    const mark = () => { done.add(l.n); gdSave(done); };
    $('#gd-ok').onclick = () => { mark(); location.hash = next ? '#/guide/' + next.n : '#/guide'; };
    const nx = $('#gd-next'); if (nx) nx.addEventListener('click', mark);
    $('#gd-try').onclick = () => { mark(); if (l.go === 'agent') { location.hash = '#/'; setTimeout(() => { if (!AG.open) agOpen(); }, 300); } else location.hash = l.go; };
    $$('[data-zoom]').forEach(im => im.onclick = () => modal(`<img src="guide/${im.dataset.zoom}.webp" style="width:100%;max-width:420px;display:block;margin:auto;border-radius:16px">`));
  }

  /* ============================================================
     شبكة 777: الوكالات (700 داخل المغرب + 77 خارج المغرب)، الوسطاء،
     شركات المقاولات، شركات التشطيب — 777 حساب لكل خانة، بنفس الطريقة
     ============================================================ */
  const W777_OFFICE = '0777777959';
  const KINDS = {
    agency: { ar: 'الوكالات العقارية', one: 'وكالة', ic: '🏢', route: 'agencies', def: /^Agence \d+$/,
      sv: ['بيع', 'كراء', 'تسيير الأملاك', 'كراء موسمي', 'عقارات فاخرة', 'استثمار', 'أراضي', 'محلات تجارية'] },
    broker: { ar: 'الوسطاء العقاريون', one: 'وسيط', ic: '🤝', route: 'brokers', def: /^وسيط \d+$/,
      sv: ['بيع', 'كراء', 'أراضي', 'فيلات', 'شقق', 'محلات تجارية', 'عقارات فلاحية', 'مرافقة الزبون'] },
    contractor: { ar: 'شركات المقاولات', one: 'شركة مقاولات', ic: '🏗️', route: 'contractors', def: /^مقاولة \d+$/,
      sv: ['بناء فيلات وعمارات', 'أشغال كبرى', 'تجزئة وتهيئة', 'ترميم', 'هندسة مدنية', 'طرق وقنوات', 'بناء مفتاح فاليد'] },
    finishing: { ar: 'شركات التشطيب', one: 'شركة تشطيب', ic: '🎨', route: 'finishing', def: /^تشطيب \d+$/,
      sv: ['صباغة', 'زليج ورخام', 'جبس وPlaco', 'نجارة', 'ألومنيوم', 'كهرباء', 'ترصيص', 'تكييف', 'ديكور داخلي', 'مطابخ'] },
    investor: { ar: 'المستثمرون', one: 'مستثمر', ic: '💼', route: 'investors', def: /^مستثمر \d+$/,
      sv: ['سكني', 'تجاري', 'سياحي / فندقي', 'أراضي وتجزئات', 'فلاحي', 'صناعي / مستودعات', 'مكاتب', 'ترميم وإعادة البيع'] },
    notary: { ar: 'الموثقون', one: 'موثق', ic: '🖋️', route: 'notaries', def: /^موثق \d+$/,
      sv: ['عقود البيع', 'الوعد بالبيع', 'عقود الكراء', 'البيع فـ طور الإنجاز', 'الشركات والشراكات', 'الهبة والإراثة', 'التحفيظ العقاري', 'الرهون', 'الاستشارة العقارية'] },
    association: { ar: 'الجمعيات السكنية', one: 'جمعية سكنية', ic: '🏘️', route: 'associations', def: /^جمعية \d+$/,
      sv: ['السكن الاقتصادي', 'ودادية سكنية', 'تعاونية سكنية', 'تجزئات سكنية', 'شراء أراضي جماعية', 'بناء جماعي', 'تسوية الوضعية العقارية', 'مرافقة الأعضاء'] },
  };
  const kindOf = a => (a && a.kind) || 'agency';
  const isNamed = a => !!a.name && !KINDS[kindOf(a)].def.test(a.name);
  const isAbroad = a => (a.country || 'المغرب') !== 'المغرب';
  const COUNTRIES = ['المغرب', 'فرنسا', 'إسبانيا', 'بلجيكا', 'هولندا', 'إيطاليا', 'ألمانيا', 'البرتغال', 'سويسرا', 'المملكة المتحدة', 'السويد', 'النرويج', 'الدنمارك',
    'كندا', 'الولايات المتحدة', 'الإمارات', 'السعودية', 'قطر', 'الكويت', 'البحرين', 'عمان', 'تركيا', 'مصر', 'تونس', 'الجزائر', 'موريتانيا', 'السنغال', 'كوت ديفوار'];
  const placeOf = a => [a.city, a.country || 'المغرب'].filter(Boolean).join('، ');
  const placeLists = () => `<datalist id="dl-cities">${Object.values(CITY).map(c => `<option value="${esc(c.n)}">`).join('')}</datalist><datalist id="dl-countries">${COUNTRIES.map(c => `<option value="${esc(c)}">`).join('')}</datalist>`;
  const loginOf = a => kindOf(a) === 'agency' && /^\d+$/.test(a.code) ? 'agence' + a.code : a.code;
  const roleBadge = () => S.role === 'admin' ? '<span class="badge gold">👑 المدير</span>'
    : `<span class="badge blue">${(KINDS[S.kind] || KINDS.agency).ic} ${esc(myAgencyName())}</span>`;
  const dAr = d => { if (!d) return ''; const x = new Date(String(d).length === 10 ? d + 'T12:00:00' : d); return isNaN(x) ? '' : x.toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const nm = n => `<span dir="ltr" style="unicode-bidi:isolate">${esc(fmtRaw(n || 0))}</span>`;
  const refOf = (p, id) => p + '-' + String(id || '').replace(/-/g, '').slice(0, 6).toUpperCase();
  const splitList = s => String(s || '').split(/[،,;\n]+/).map(x => x.trim()).filter(Boolean);
  async function rq(path, method, body, prefer) {
    const res = await window.W777_SYNC.request(path, { method: method || 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, prefer ? { Prefer: prefer } : {}), body: body ? JSON.stringify(body) : undefined });
    const t = await res.text();
    return t ? JSON.parse(t) : null;
  }
  // كل الصفوف: الصفحة الأولى كتعطي العدد الكلي، والباقي كيتجاب فنفس الوقت (بدل وحدة من بعد وحدة)
  async function fetchAll(path) {
    const Sy = window.W777_SYNC;
    const first = await Sy.request(path, { headers: { Range: '0-999', Prefer: 'count=exact' } });
    const out = await first.json();
    const total = parseInt(((first.headers.get('Content-Range') || '').split('/')[1]) || '0', 10);
    if (out.length < 1000) return out;
    if (!(total > 1000)) {
      // العدد ما وصلش: نكملو صفحة بصفحة
      for (let off = 1000; ; off += 1000) {
        const rows = await (await Sy.request(path, { headers: { Range: `${off}-${off + 999}` } })).json();
        out.push(...rows);
        if (rows.length < 1000) return out;
      }
    }
    const pages = [];
    for (let off = 1000; off < total; off += 1000) pages.push(Sy.request(path, { headers: { Range: `${off}-${off + 999}` } }).then(r => r.json()));
    (await Promise.all(pages)).forEach(rows => out.push(...rows));
    return out;
  }
  async function loadDir(force) {
    if (!force && S.dir && Date.now() - S.dirAt < 300000) return S.dir;
    S.dir = await fetchAll(`/rest/v1/w777_agencies?select=uid,code,name,phone,email,active,kind,country,city,district,gps,budget,invest_modes,services,about,terms_at,photo,logo,id_ok${S.role === 'admin' ? ',sub_until,id_doc,id_doc_at' : ''}&order=code.asc`);
    S.dirAt = Date.now();
    return S.dir;
  }
  // باب الدخول لكل خانات الشبكة
  async function netGate(title, icon, force) {
    const Sy = window.W777_SYNC;
    if (EMBED || !Sy || !Sy.isOn()) {
      main().innerHTML = `<div class="page-head"><h1>${icon} ${esc(title)}</h1></div>
        <div class="card empty"><div class="big">${icon}</div><h3>دخل بالحساب ديالك أولا</h3>
        <p>كل مشترك كيدخل من «الإعدادات» ← «المزامنة السحابية» بالرمز ديالو<br>(وكالة <b dir="ltr">agence001</b> · وسيط <b dir="ltr">W001</b> · مقاولة <b dir="ltr">B001</b> · تشطيب <b dir="ltr">F001</b> · مستثمر <b dir="ltr">I001</b> · موثق <b dir="ltr">N001</b>) وكلمة السر.</p>
        <a class="btn gold" href="#/settings">${ic('lock', 18)} الدخول</a></div>`;
      return false;
    }
    main().innerHTML = `<div class="card empty">جاري التحميل…</div>`;
    await refreshRole(force || !S.role || S.role === 'solo');
    if (!inNetwork()) {
      main().innerHTML = `<div class="card empty"><div class="big">🔒</div><h3>هاد الحساب ماشي مفعل فشبكة الوسيط 777</h3>
        <p>تواصل مع مكتب الوسيط 777: <a href="${telLink(W777_OFFICE)}" dir="ltr">${W777_OFFICE}</a></p></div>`;
      return false;
    }
    if (S.role === 'agency' && S.agency && !S.agency.terms_at) { termsGate(); return false; }
    if (S.role === 'agency' && idRequired(S.agency)) { idGate(); return false; }
    return true;
  }
  function secHead(icon, title, sub, tabs, cur, base) {
    return `<div class="page-head"><h1>${icon} ${esc(title)}</h1>${roleBadge()}</div>
      ${sub ? `<p class="muted sec-sub">${sub}</p>` : ''}
      <div class="chips" style="margin-bottom:14px">${tabs.map(([k, l]) => `<a class="chip ${cur === k ? 'on' : ''}" href="#/${base}${k ? '/' + k : ''}">${l}</a>`).join('')}</div>`;
  }
  const pickTab = (tabs, want, def) => tabs.some(t => t[0] === want) ? want : def;

  async function viewNetKind(kind, parts, query) {
    const K = KINDS[kind];
    if (!await netGate(K.ar, K.ic, kind === 'agency')) return;
    if (kind === 'agency' && parts[1] === 'p') return viewNetProp(parts[2], decodeURIComponent(parts[3] || ''));
    const tabs = [];
    if (kind === 'agency') tabs.push(['', '🏘️ عقارات الشبكة']);
    if (kind === 'investor') tabs.push(['', '💼 فرص الاستثمار']);
    if (kind === 'notary') tabs.push(S.role === 'admin' ? ['all', '📋 كل الطلبات'] : S.kind === 'notary' ? ['inbox', '📥 الطلبات الواردة'] : ['sent', '📤 طلباتي']);
    tabs.push(['dir', '📇 الدليل']);
    if (S.role === 'admin') tabs.push(['manage', '🔑 الإدارة (777)']);
    else if (S.kind === kind) tabs.push(['me', K.ic + ' حسابي']);
    const tab = pickTab(tabs, parts[1] || '', kind === 'agency' || kind === 'investor' ? '' : kind === 'notary' && S.kind === 'notary' ? 'inbox' : 'dir');
    const sub = kind === 'investor' ? 'المستثمرون كيحطّو الميزانية ديالهم (تمويل، شراكة، شراء ولا كراء طويل) وكيزيدو العقارات ديالهم فـ «العقارات».'
      : kind === 'notary' ? 'كل موثق كيتقترح أوتوماتيكيا مع العقارات القريبة ليه، وكيوصلو الاستشارات وطلبات توثيق العقود مباشرة.'
        : kind === 'association' ? 'الجمعيات والوداديات والتعاونيات السكنية: كتلقاو هنا الأراضي، المقاولين، الموثقين والتمويل لمشاريع السكن ديال أعضائكم.' : '';
    const head = secHead(K.ic, K.ar, sub, tabs, tab, K.route);
    if (tab === 'manage') return viewAgManage(kind, head, query);
    if (tab === 'me') return viewAgMe(kind, head);
    if (tab === 'dir') return viewDir(kind, head, query);
    if (tab === 'all' || tab === 'inbox' || tab === 'sent') return viewNotaryReqs(head, tab);
    if (kind === 'investor') return viewInvest(head, query);
    return viewNetProps(head, query);
  }

  async function viewNetProps(head, query) {
    let list, dir = [];
    try { list = await loadNetwork(query.r === '1'); } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    try { dir = await loadDir(); } catch (e) { /* الفلتر ديال الدولة اختياري */ }
    const country = Object.fromEntries(dir.map(a => [a.uid, a.country || 'المغرب']));
    const f = Object.assign({ q: '', trx: '', cat: '', city: '', ag: '', zone: '' }, S.netFilters || {});
    const agencies = [...new Set(list.map(x => x.agency).filter(Boolean))].sort();
    const cities = [...new Set(list.map(x => x.city).filter(Boolean))].sort();
    main().innerHTML = head + `
      <div class="card card-pad" style="margin-bottom:14px">
        <form id="nf" class="form-grid">
          ${fInput('q', 'بحث', f.q, { ph: 'حي، نوع، ثمن، وكالة…' })}
          ${fSelect('zone', 'المنطقة', [{ v: '', l: 'الكل' }, { v: 'ma', l: '🇲🇦 داخل المغرب' }, { v: 'out', l: '🌍 خارج المغرب' }], f.zone, { noEmpty: true })}
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
        if (v.zone && ((country[x.owner] || 'المغرب') !== 'المغرب') !== (v.zone === 'out')) return false;
        if (v.trx && p.transaction !== v.trx) return false;
        if (v.cat && catOf(p.type) !== v.cat) return false;
        if (v.city && x.city !== v.city) return false;
        if (v.ag && x.agency !== v.ag) return false;
        return !t.length || hit(norm([x.agency, p.ref, p.title, typeAr(p.type), trxAr(p.transaction), p.city, p.district, p.description, x.price].join(' ')), t);
      });
      $('#ncount').textContent = `${res.length} عقار من ${agencies.length} عضو`;
      $('#ngrid').innerHTML = res.slice(0, 120).map(netCard).join('') || '<div class="card empty" style="grid-column:1/-1">ما كاين حتى عقار</div>';
      hydrateNet($('#ngrid'));
    };
    $$('#nf input, #nf select').forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', draw));
    $('#nf').onsubmit = e => e.preventDefault();
    draw();
  }

  // الدليل: كل عضو كمّل المعلومات ديالو كيبان هنا مع الخدمات والهاتف
  async function viewDir(kind, head, query) {
    const K = KINDS[kind];
    let all;
    try { all = (await loadDir(query.r === '1')).filter(a => kindOf(a) === kind); } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    const listed = all.filter(a => a.active && (isNamed(a) || a.phone));
    const cities = [...new Set(listed.map(a => a.city).filter(Boolean))].sort();
    const seats = kind === 'agency'
      ? `<div><small>🇲🇦 داخل المغرب</small><b>${listed.filter(a => !isAbroad(a)).length} / ${all.filter(a => !isAbroad(a)).length}</b></div>
         <div><small>🌍 خارج المغرب</small><b>${listed.filter(isAbroad).length} / ${all.filter(isAbroad).length}</b></div>`
      : `<div><small>المقاعد</small><b>${all.length}</b></div><div><small>المسجلين</small><b>${listed.length}</b></div>`;
    main().innerHTML = head + `
      <div class="card card-pad" style="margin-bottom:14px">
        <div class="kv">${seats}<div><small>المقاعد الحرة</small><b>${all.length - listed.length}</b></div></div>
        <div class="seat-bar"><span style="width:${all.length ? Math.max(2, Math.round(listed.length * 100 / all.length)) : 0}%"></span></div>
        <form id="df" class="form-grid" style="margin-top:12px">
          ${fInput('q', 'بحث', '', { ph: 'اسم، مدينة، خدمة، هاتف…' })}
          ${kind === 'agency' ? fSelect('zone', 'المنطقة', [{ v: '', l: 'الكل' }, { v: 'ma', l: '🇲🇦 داخل المغرب (700)' }, { v: 'out', l: '🌍 خارج المغرب (77)' }], query.zone || '', { noEmpty: true }) : ''}
          ${fSelect('city', 'المدينة', [{ v: '', l: 'الكل' }, ...cities.map(c => ({ v: c, l: c }))], cities.includes(query.city) ? query.city : '', { noEmpty: true })}
          ${fSelect('sv', kind === 'investor' ? 'القطاع' : kind === 'notary' ? 'الاختصاص' : 'الخدمة', [{ v: '', l: 'الكل' }, ...K.sv.map(c => ({ v: c, l: c }))], '', { noEmpty: true })}
          ${kind === 'investor' ? fSelect('mode', 'نوع الاستثمار', [{ v: '', l: 'الكل' }, ...Object.values(INV_MODES).map(m => ({ v: m[0], l: m[0] }))], '', { noEmpty: true }) : ''}
        </form>
        ${kind === 'notary' ? `<div class="btn-row" style="margin-top:10px"><button class="btn sm" id="d-near">${ic('gps', 15)} الأقرب ليا</button><span class="muted" id="d-pos" style="font-size:12.5px"></span></div>` : ''}
      </div>
      <div class="dir-grid" id="dgrid"></div>`;
    let myPos = null;
    const draw = () => {
      const v = collect($('#df'));
      const t = tokens(v.q || '');
      let res = listed.filter(a => (!v.zone || isAbroad(a) === (v.zone === 'out')) && (!v.city || a.city === v.city)
        && (!v.sv || norm(a.services || '').includes(norm(v.sv))) && (!v.mode || norm(a.invest_modes || '').includes(norm(v.mode)))
        && (!t.length || hit(norm([a.code, a.name, a.city, a.district, a.country, a.services, a.invest_modes, a.about, a.phone].join(' ')), t)));
      const kmOf = a => { const g = myPos && parseGps(a.gps); return g ? kmBetween(myPos, g) : null; };
      if (myPos) res = res.map(a => [a, kmOf(a)]).sort((x, y) => (x[1] == null ? 1e9 : x[1]) - (y[1] == null ? 1e9 : y[1])).map(x => x[0]);
      $('#dgrid').innerHTML = res.map(a => {
        const msg = `السلام عليكم ${a.name}، شفت الحساب ديالكم فدليل ${K.ar} ديال الوسيط 777.`;
        return `<div class="card dir-card">
          <div class="dir-top">${a.photo || a.logo ? `<img class="dir-av dir-img" src="${esc(brandUrl(a.photo || a.logo))}" alt="" loading="lazy">` : `<div class="dir-av">${esc((a.name || '?').trim().charAt(0))}</div>`}
            <div class="grow"><b>${esc(a.name)}</b>${a.id_ok ? ' <span class="badge green" title="هوية مؤكدة من مكتب الوسيط 777">🪪✔</span>' : ''}<small class="muted"><span dir="ltr">${esc(a.code)}</span> · ${isAbroad(a) ? '🌍' : '📍'} ${esc(placeOf(a))}</small></div></div>
          ${splitList(a.services).length ? `<div class="chips wrap">${splitList(a.services).map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>` : ''}
          ${kind === 'investor' && (a.budget || a.invest_modes) ? `<div class="iv-mini">${a.budget ? `💰 حتى ${nm(a.budget)} درهم` : ''}${a.invest_modes ? `<span>${esc(a.invest_modes)}</span>` : ''}</div>` : ''}
          ${kind === 'notary' && (a.district || kmOf(a) != null) ? `<div class="iv-mini">📍 ${esc([a.district, a.city].filter(Boolean).join('، '))}${kmOf(a) != null ? ` · <b>${kmTxt(kmOf(a))}</b>` : ''}</div>` : ''}
          ${a.about ? `<p class="dir-about">${esc(a.about)}</p>` : ''}
          ${kind === 'notary' && S.kind !== 'notary' ? `<div class="btn-row"><button class="btn sm" data-ask="${a.uid}" data-k="consult">💬 استشارة</button><button class="btn sm gold" data-ask="${a.uid}" data-k="contract">📝 توثيق عقد</button></div>` : ''}
          <div class="btn-row">${a.phone ? `<a class="btn sm" href="${telLink(a.phone)}">${ic('phone', 15)} ${esc(a.phone)}</a>
            <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(a.phone)}?text=${encodeURIComponent(msg)}">${ic('wa', 15)} واتساب</a>` : '<span class="muted">التواصل عبر مكتب الوسيط 777</span>'}</div>
          ${memberActions(a)}
        </div>`;
      }).join('') || `<div class="card empty" style="grid-column:1/-1"><div class="big">${K.ic}</div><h3>مازال حتى ${esc(K.one)} ما كمّل المعلومات ديالو</h3><p>كل عضو كيبان هنا ملي كيكمّل «حسابي» (الاسم، الهاتف، المدينة، الخدمات).</p></div>`;
      bindNtAsk($('#dgrid'), null);
      bindMemberActions($('#dgrid'), draw);
    };
    const nb = $('#d-near');
    if (nb) nb.onclick = () => {
      if (!navigator.geolocation) return toast('تحديد الموقع غير مدعوم');
      $('#d-pos').textContent = 'جاري تحديد الموقع…';
      navigator.geolocation.getCurrentPosition(pos => { myPos = [pos.coords.latitude, pos.coords.longitude]; $('#d-pos').textContent = '📍 مرتبين من الأقرب'; draw(); },
        () => { $('#d-pos').textContent = 'تعذر تحديد الموقع'; }, { enableHighAccuracy: true, timeout: 15000 });
    };
    $$('#df input, #df select').forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', draw));
    $('#df').onsubmit = e => e.preventDefault();
    draw();
    if (syOn()) loadRatings().then(() => { if ($('#dgrid')) draw(); });
  }

  async function viewAgMe(kind, head) {
    const K = KINDS[kind], ag = S.agency || {};
    const abroad = isAbroad(ag);
    main().innerHTML = head + `
      <div class="card card-pad form">
        <h3 class="section-title">${K.ic} معلومات ${esc(K.one)} (كتبان فالدليل${kind === 'agency' || kind === 'broker' ? ' ومع العقارات ديالك فالشبكة' : ''})</h3>
        <form id="agme" class="form-grid">
          ${fInput('name', 'الاسم', ag.name, { req: true })}
          ${fInput('phone', 'الهاتف / واتساب', ag.phone, { type: 'tel' })}
          ${fInput('city', 'المدينة', ag.city, { list: 'dl-cities', ph: 'مكناس، فاس، باريس…' })}
          ${fInput('country', 'الدولة', ag.country === 'خارج المغرب' ? '' : (ag.country || 'المغرب'), { list: 'dl-countries', ph: 'المغرب، فرنسا، إسبانيا…' })}
          ${kind === 'notary' ? fInput('district', 'الحي / العنوان ديال المكتب', ag.district, { ph: 'مثال: حمرية، شارع…' }) : ''}
          ${kind === 'notary' ? `<div class="field"><label>الموقع (GPS) — باش تتقترح مع أقرب عقار</label><div class="range"><input name="gps" value="${esc(ag.gps || '')}" placeholder="33.89,-5.55" dir="ltr">
            <button type="button" class="btn sm" id="me-gps">${ic('gps', 16)} موقعي الآن</button></div></div>` : ''}
          ${kind === 'investor' ? fInput('budget', 'الميزانية القصوى (درهم)', ag.budget, { money: true }) : ''}
          ${kind === 'investor' ? `<div class="field full"><label>نوع الاستثمار</label><div class="chips wrap" id="mode-pick">${Object.values(INV_MODES).map(m => `<label class="chip"><input type="checkbox" data-mode value="${esc(m[0])}" ${splitList(ag.invest_modes).includes(m[0]) ? 'checked' : ''}> ${esc(m[0])}</label>`).join('')}</div></div>` : ''}
          <div class="field"><label>الرمز</label><input value="${esc(ag.code || '')}" disabled dir="ltr"></div>
          ${fInput('services', kind === 'investor' ? 'القطاعات اللي كتهمك (فرّق بالفاصلة)' : kind === 'notary' ? 'الاختصاصات (فرّق بالفاصلة)' : 'الخدمات (فرّق بالفاصلة)', ag.services, { cls: 'full', ph: K.sv.slice(0, 4).join('، ') })}
          <div class="field full"><div class="chips wrap" id="sv-pick">${K.sv.map(s => `<button type="button" class="chip" data-sv="${esc(s)}">+ ${esc(s)}</button>`).join('')}</div></div>
          ${fText('about', 'تعريف قصير', ag.about, { ph: 'شكون نتوما، شحال من عام فالميدان، المناطق اللي خدامين فيها…' })}
          <div class="field" style="justify-content:flex-end"><button class="btn gold">${ic('check', 18)} حفظ</button></div>
        </form>
        ${placeLists()}
        <p class="muted" style="font-size:13px">✔️ ملي تكمّل الاسم والهاتف كتبان فـ «الدليل» لجميع أعضاء الشبكة.<br>✔️ العقارات اللي كتزيد فـ «العقارات» (المتاحة) كتبان أوتوماتيكيا لباقي الأعضاء، بلا اسم ولا هاتف المالك.<br>✔️ الزبناء والطلبات ديالك كيبقاو خاصين بيك.${kind === 'notary' ? '<br>✔️ الموقع (GPS) والحي كيخليوك تتقترح أوتوماتيكيا مع العقارات القريبة ليك.' : ''}${kind === 'investor' ? '<br>✔️ زيد عروض الاستثمار ديالك فـ «💼 فرص الاستثمار» باش يتواصلو معاك أصحاب المشاريع.' : ''}</p>
      </div>
      ${memberMediaCard()}
      <div class="card card-pad" style="margin-top:14px"><div class="kv"><div><small>📜 القانون</small><b>${ag.terms_at ? '✅ موافق ' + dAr(ag.terms_at) : '⏳ مازال'}</b></div><div><small>💳 الاشتراك</small><b style="font-size:13.5px">${esc((subInfo(ag) || {}).txt || '')}</b></div></div>
        <div class="btn-row" style="margin-top:10px"><a class="btn sm" href="#/terms">⚖️ قانون التطبيق</a><a class="btn sm" href="#/terms/groups">👥 مجموعات المشتركين</a></div></div>`;
    bindMoney(main());
    bindMemberMedia(main(), () => viewAgMe(kind, head));
    const gb = $('#me-gps');
    if (gb) gb.onclick = () => {
      if (!navigator.geolocation) return toast('تحديد الموقع غير مدعوم');
      toast('جاري تحديد الموقع…');
      navigator.geolocation.getCurrentPosition(pos => { $('#agme [name=gps]').value = pos.coords.latitude.toFixed(6) + ',' + pos.coords.longitude.toFixed(6); toast('تم تحديد الموقع ✓'); },
        () => toast('تعذر تحديد الموقع'), { enableHighAccuracy: true, timeout: 15000 });
    };
    $$('#sv-pick [data-sv]').forEach(b => b.onclick = () => {
      const inp = $('#agme [name=services]'), cur = splitList(inp.value);
      if (!cur.includes(b.dataset.sv)) inp.value = [...cur, b.dataset.sv].join('، ');
    });
    $('#agme').onsubmit = async e => {
      e.preventDefault();
      const v = collect(e.target);
      const body = { name: v.name, phone: v.phone || null, city: v.city || null, services: splitList(v.services).join('، ') || null, about: v.about || null };
      if (kind === 'notary') {
        if (v.gps && !parseGps(v.gps)) return toast('الموقع خاصو يكون بحال 33.89,-5.55 ولا رابط Google Maps', 4000);
        body.district = v.district || null; body.gps = parseGps(v.gps) ? parseGps(v.gps).join(',') : null;
      }
      if (kind === 'investor') { body.budget = v.budget || null; body.invest_modes = $$('#mode-pick [data-mode]:checked').map(c => c.value).join('، ') || null; }
      body.country = (v.country || '').trim() || (abroad ? 'خارج المغرب' : 'المغرب');
      try {
        await rq(`/rest/v1/w777_agencies?uid=eq.${window.W777_SYNC.uid()}`, 'PATCH', body);
        await refreshRole(true);
        S.dir = null;
        await DB.setMeta('shared_hash', {});
        window.W777_SYNC.syncNow();
        toast('تم الحفظ ✓');
      } catch (er) { toast('تعذر: ' + er.message, 4000); }
    };
  }

  async function viewAgManage(kind, head, query) {
    const K = KINDS[kind];
    let ags, secrets, counts = {};
    try {
      [ags, secrets] = await Promise.all([
        loadDir(true).then(l => l.filter(a => kindOf(a) === kind)),
        fetchAll(`/rest/v1/w777_agency_secrets?select=uid,password,w777_agencies!inner(kind)&w777_agencies.kind=eq.${kind}`),
      ]);
      (await loadNetwork()).forEach(x => { counts[x.owner] = (counts[x.owner] || 0) + 1; });
    } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    const pw = Object.fromEntries(secrets.map(s => [s.uid, s.password]));
    const appUrl = location.href.split('#')[0];
    const shares = kind === 'agency' || kind === 'broker';
    const credMsg = a => `السلام عليكم ${a.name}،\nمرحبا بكم فشبكة ${K.ar} ديال الوسيط 777 ${K.ic}\nالتطبيق: ${appUrl}\nالإعدادات ← المزامنة السحابية:\nالرمز: ${loginOf(a)}\nكلمة السر: ${pw[a.uid] || ''}\n` +
      (shares ? 'من بعد كمّلو «حسابي» وزيدو العقارات ديالكم، غادي يبانو لجميع الأعضاء (بلا معلومات المالك).'
        : kind === 'investor' ? 'من بعد كمّلو «حسابي» (الميزانية ونوع الاستثمار) وزيدو عروضكم فـ «فرص الاستثمار».'
          : kind === 'notary' ? 'من بعد كمّلو «حسابي» (المدينة، الحي والموقع GPS) باش تتقترحو مع العقارات القريبة وتوصلكم الاستشارات وطلبات التوثيق.'
            : 'من بعد كمّلو «حسابي» (الهاتف، المدينة، الخدمات) باش تبانو فالدليل لجميع الوكالات والوسطاء.') +
      `\n📜 قانون التطبيق (199 درهم فالعام من بعد 3 أشهر مجانية): ${appUrl}#/terms` +
      (groupLinks().wa ? `\n👥 مجموعة واتساب: ${groupLinks().wa}` : '') + (groupLinks().tg ? `\n✈️ مجموعة تيليغرام: ${groupLinks().tg}` : '') + (groupLinks().fb ? `\n📘 مجموعة فيسبوك: ${groupLinks().fb}` : '');
    main().innerHTML = head + `
      <div class="card card-pad" style="margin-bottom:14px">
        <div class="kv"><div><small>الحسابات</small><b>${ags.length}</b></div><div><small>مفعلة</small><b>${ags.filter(a => a.active).length}</b></div>
          <div><small>كمّلو المعلومات</small><b>${ags.filter(isNamed).length}</b></div>
          ${kind === 'agency' ? `<div><small>🇲🇦 / 🌍</small><b>${ags.filter(a => !isAbroad(a)).length} / ${ags.filter(isAbroad).length}</b></div>` : ''}
          <div><small>اللي زادو عقارات</small><b>${ags.filter(a => counts[a.uid]).length}</b></div>
          <div><small>📜 وافقو على القانون</small><b>${ags.filter(a => a.terms_at).length}</b></div></div>
        <div class="form-grid" style="margin-top:12px">${fInput('agq', 'بحث', query.q || '', { ph: 'رقم، اسم، هاتف، مدينة…' })}
          ${fSelect('agf', 'عرض', [{ v: '', l: 'الكل' }, { v: 'named', l: 'اللي عندهم اسم' }, { v: 'active', l: 'عندهم عقارات' }, { v: 'off', l: 'موقوفة' },
            ...(kind === 'agency' ? [{ v: 'ma', l: '🇲🇦 داخل المغرب' }, { v: 'out', l: '🌍 خارج المغرب' }] : [])], '', { noEmpty: true })}</div>
      </div>
      <div class="card" id="aglist"></div>`;
    let shown = 60;
    const draw = () => {
      const q = norm($('[name=agq]').value || ''), f = $('[name=agf]').value;
      const res = ags.filter(a => (!q || norm([a.code, a.name, a.phone, a.city, a.country].join(' ')).includes(q)) &&
        (f !== 'named' || isNamed(a)) && (f !== 'active' || counts[a.uid]) && (f !== 'off' || !a.active) && (f !== 'ma' || !isAbroad(a)) && (f !== 'out' || isAbroad(a)));
      $('#aglist').innerHTML = res.slice(0, shown).map(a => `<div class="list-row" style="flex-wrap:wrap;gap:8px">
        ${a.photo || a.logo ? `<img class="dir-av dir-img" src="${esc(brandUrl(a.photo || a.logo))}" alt="" loading="lazy" style="width:40px;height:40px">` : ''}
        <div class="grow"><span class="badge" dir="ltr">${esc(a.code)}</span> <b>${esc(a.name)}</b> ${isAbroad(a) ? `<span class="badge blue">🌍 ${esc(a.country)}</span>` : ''} ${a.active ? '' : '<span class="badge red">موقوفة</span>'} ${counts[a.uid] ? `<span class="badge green">${counts[a.uid]} عقار</span>` : ''}
          ${a.terms_at ? `<span class="badge ${subInfo(a).ok ? (subInfo(a).trial ? 'blue' : 'green') : 'red'}" title="${esc(subInfo(a).txt)}">${subInfo(a).ok ? (subInfo(a).trial ? '🎁 مجاني' : '💳 خالص') : '⏳ 199 مستحق'}</span>` : ''}
          ${isNamed(a) || a.id_doc ? (a.id_doc ? `<span class="badge ${a.id_ok ? 'green' : 'amber'}">🪪 ${a.id_ok ? 'مؤكدة' : 'كتسنى التأكيد'}</span>` : `<span class="badge ${idRequired(a) ? 'red' : ''}">🪪 ما كايناش</span>`) : ''}
          <small class="muted">${esc(a.phone || 'بلا هاتف')}${a.city ? ' · ' + esc(a.city) : ''} · <span dir="ltr">${esc(loginOf(a))}</span> / <span dir="ltr" class="pw" data-pw="${a.uid}">••••••</span></small></div>
        <div class="btn-row">
          ${a.id_doc ? `<button class="btn sm" data-idv="${a.uid}">🪪 عرض</button>${a.id_ok ? '' : `<button class="btn sm gold" data-idok="${a.uid}">✔ تأكيد</button>`}` : ''}
          <button class="btn sm" data-show="${a.uid}">${ic('eye', 15)}</button>
          <button class="btn sm" data-edit="${a.uid}">${ic('edit', 15)}</button>
          <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${a.phone ? waPhone(a.phone) : ''}?text=${encodeURIComponent(credMsg(a))}">${ic('wa', 15)} صيفط الدخول</a>
          <button class="btn sm" data-tog="${a.uid}">${a.active ? 'إيقاف' : 'تفعيل'}</button>
        </div></div>`).join('') + (res.length > shown ? `<div style="padding:12px;text-align:center"><button class="btn" id="agmore">عرض المزيد (${res.length - shown})</button></div>` : '') || '<div class="empty">ما كاين والو</div>';
      const more = $('#agmore'); if (more) more.onclick = () => { shown += 100; draw(); };
      $$('[data-idv]').forEach(b => b.onclick = () => { const a = ags.find(x => x.uid === b.dataset.idv); if (a) openIdDoc(a.id_doc); });
      $$('[data-idok]').forEach(b => b.onclick = async () => {
        const a = ags.find(x => x.uid === b.dataset.idok); if (!a) return;
        try { await rq(`/rest/v1/w777_agencies?uid=eq.${a.uid}`, 'PATCH', { id_ok: true }); a.id_ok = true; S.dir = null; toast('تأكدات الهوية ✓'); draw(); }
        catch (er) { toast('تعذر: ' + er.message, 4000); }
      });
      $$('[data-show]').forEach(b => b.onclick = () => { const s = $(`[data-pw="${b.dataset.show}"]`); s.textContent = s.textContent.startsWith('•') ? pw[b.dataset.show] || '?' : '••••••'; });
      $$('[data-tog]').forEach(b => b.onclick = async () => {
        const a = ags.find(x => x.uid === b.dataset.tog);
        try { await rq(`/rest/v1/w777_agencies?uid=eq.${a.uid}`, 'PATCH', { active: !a.active }); } catch (e) { toast('تعذر: ' + e.message); return; }
        a.active = !a.active; toast(a.active ? 'تفعلات ✓' : 'توقفات'); draw();
      });
      $$('[data-edit]').forEach(b => b.onclick = () => {
        const a = ags.find(x => x.uid === b.dataset.edit);
        modal(`<h3>${K.ic} <span dir="ltr">${esc(a.code)}</span></h3><form id="age" class="form-grid">${fInput('name', 'الاسم', a.name, { req: true })}${fInput('phone', 'الهاتف', a.phone, { type: 'tel' })}
          ${placeLists()}${fInput('city', 'المدينة', a.city, { list: 'dl-cities' })}${fInput('country', 'الدولة', a.country || 'المغرب', { list: 'dl-countries', hint: kind === 'agency' ? '«المغرب» ولا اسم الدولة (77 وكالة خارج المغرب)' : '' })}
          ${fInput('services', 'الخدمات', a.services, { cls: 'full' })}
          ${fInput('sub_until', 'الاشتراك (199 درهم) خالص حتى', a.sub_until, { type: 'date', hint: a.terms_at ? 'وافق على القانون: ' + dAr(a.terms_at) : 'مازال ما وافقش على القانون' })}
          <div class="field" style="justify-content:flex-end"><button type="button" class="btn sm" id="age-year">💳 +1 عام</button></div></form>
          <h4 style="margin:16px 0 8px">🖼️ الصورة والشعار</h4><div class="mm-grid" id="age-mm">${admMediaHtml(a)}</div>
          <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="age-ok">${ic('check', 16)} حفظ</button></div>`, (box, close) => {
          bindAdmMedia(box, a, draw);
          $('#age-year', box).onclick = () => {
            const i = $('[name=sub_until]', box), cur = i.value && new Date(i.value) > new Date() ? new Date(i.value) : new Date();
            cur.setFullYear(cur.getFullYear() + 1); i.value = cur.toISOString().slice(0, 10);
          };
          $('#age-ok', box).onclick = async () => {
            const v = collect($('#age', box));
            const body = { name: v.name || a.name, phone: v.phone || null, city: v.city || null, country: (v.country || '').trim() || 'المغرب', services: splitList(v.services).join('، ') || null, sub_until: v.sub_until || null };
            try {
              await rq(`/rest/v1/w777_agencies?uid=eq.${a.uid}`, 'PATCH', body);
              Object.assign(a, body); S.dir = null; close(); draw(); toast('تم ✓');
            } catch (e) { toast('تعذر: ' + e.message); }
          };
        });
      });
    };
    $('[name=agq]').addEventListener('input', () => { shown = 60; draw(); });
    $('[name=agf]').addEventListener('change', () => { shown = 60; draw(); });
    draw();
  }

  /* ============================================================
     المستثمرون (I001–I777): الميزانية + عروض التمويل والشراكة
     الموثقون (N001–N777): كيتقترحو مع أقرب عقار + الاستشارات وتوثيق العقود
     ============================================================ */
  const INV_MODES = { finance: ['💰 تمويل', 'كيموّل مشروع ولا عقار مقابل عائد'], partner: ['🤝 شراكة', 'كيدخل شريك بنسبة فالمشروع'],
    buy: ['🏷️ شراء', 'كيشري عقارات للاستثمار'], rent: ['🔑 كراء طويل', 'كيكري عقارات ولا محلات للاستثمار'] };
  const INV_SECTORS = ['سكني', 'تجاري', 'سياحي / فندقي', 'أراضي وتجزئات', 'فلاحي', 'صناعي / مستودعات', 'مكاتب', 'ترميم وإعادة البيع'];
  const NT_ST = { new: ['🆕 جديد', 'blue'], accepted: ['✅ مقبول', 'green'], done: ['🏁 تمّ', 'green'], declined: ['✖ معتذر', 'red'], cancelled: ['🔒 ملغى', 'gray'] };
  const ntBadge = s => { const x = NT_ST[s] || [s, 'gray']; return `<span class="badge ${x[1]}">${x[0]}</span>`; };
  const NT_CONTRACTS = ['عقد بيع', 'وعد بالبيع', 'عقد كراء', 'عقد شراكة', 'بيع فـ طور الإنجاز (VEFA)', 'هبة', 'قسمة / إراثة', 'توكيل', 'رهن / رفع اليد', 'أخرى'];
  const parseGps = g => { const m = String(g || '').match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/); return m ? [+m[1], +m[2]] : null; };
  function kmBetween(a, b) {
    const r = x => x * Math.PI / 180, dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  const kmTxt = km => km == null ? '' : km < 1 ? Math.round(km * 1000) + ' م' : (km < 10 ? km.toFixed(1) : Math.round(km)) + ' كلم';
  // أقرب الموثقين: بالـ GPS إلا كان، وإلا نفس الحي ثم نفس المدينة
  function nearNotaries(dir, at) {
    const pos = parseGps(at.gps), city = norm(at.city || ''), dist = norm(at.district || '');
    return dir.filter(a => kindOf(a) === 'notary' && a.active && (isNamed(a) || a.phone)).map(a => {
      const g = parseGps(a.gps), km = pos && g ? kmBetween(pos, g) : null;
      const sameCity = !!city && norm(a.city || '') === city, sameDist = sameCity && !!dist && norm(a.district || '') === dist;
      return { a, km, sameCity, score: km != null ? km : sameDist ? 500 : sameCity ? 1000 : 1e9 };
    }).filter(x => (x.km != null && x.km <= 80) || x.sameCity).sort((x, y) => x.score - y.score);
  }
  const ntRow = x => `<div class="list-row nt-row"><div class="dir-av">🖋️</div>
      <div class="grow"><b>${esc(x.a.name)}</b><small class="muted">📍 ${esc([x.a.district, x.a.city].filter(Boolean).join('، ') || '—')}${x.km != null ? ' · <b>' + kmTxt(x.km) + '</b>' : ''}</small></div>
      <div class="btn-row"><button class="btn sm" data-ask="${x.a.uid}" data-k="consult">💬 استشارة</button><button class="btn sm gold" data-ask="${x.a.uid}" data-k="contract">📝 توثيق عقد</button></div></div>`;
  const bindNtAsk = (root, at) => $$('[data-ask]', root).forEach(b => b.onclick = () => notaryAsk(b.dataset.ask, b.dataset.k, at));
  // كارطة «موثقين قراب» فصفحة العقار
  async function notaryBox(el, at) {
    const Sy = window.W777_SYNC;
    if (!el || EMBED || !Sy || !Sy.isOn()) return;
    try {
      await refreshRole();
      if (!inNetwork() || S.kind === 'notary') return;
      const near = nearNotaries(await loadDir(), at).slice(0, 3);
      el.innerHTML = `<div class="card card-pad nt-box">
        <div class="pair-head"><b>🖋️ موثقين قراب من العقار</b><a class="btn sm" href="#/notaries/dir${at.city ? '?city=' + encodeURIComponent(at.city) : ''}">الكل</a></div>
        ${near.length ? near.map(ntRow).join('') : `<p class="muted" style="margin:6px 0 0;font-size:13px">مازال ما كاين موثق مسجل ${at.city ? 'فـ ' + esc(at.city) : 'قريب'} — تقدر تختار من <a href="#/notaries/dir">دليل الموثقين</a> ولا تتواصل مع مكتب الوسيط 777.</p>`}
      </div>`;
      bindNtAsk(el, at);
    } catch (e) { /* اختياري */ }
  }
  function notaryAsk(uid, kind, at) {
    const n = (S.dir || []).find(a => a.uid === uid) || {};
    const prop = at && (at.ref || at.title) ? [at.ref, at.title, at.city].filter(Boolean).join(' · ') : '';
    modal(`<h3>🖋️ طلب للموثق — ${esc(n.name || '')}</h3>
      <form id="nq" class="form-grid">
        ${fSelect('kind', 'نوع الطلب', [{ v: 'consult', l: '💬 استشارة عقارية' }, { v: 'contract', l: '📝 توثيق عقد' }], kind || 'consult', { noEmpty: true })}
        ${fSelect('contract', 'نوع العقد', NT_CONTRACTS, '', { empty: '— اختياري —' })}
        ${fInput('sender_name', 'الاسم', myAgencyName(), { req: true })}
        ${fInput('sender_phone', 'الهاتف / واتساب', myAgencyPhone(), { type: 'tel', req: true })}
        ${prop ? `<div class="field full"><label>العقار</label><input value="${esc(prop)}" disabled></div>` : ''}
        ${fText('message', 'الطلب بالتفصيل', '', { ph: 'مثال: بغيت نوثق عقد بيع شقة فـ … الأطراف، الثمن التقريبي، الوثائق اللي عندي (رسم عقاري، شهادة الملكية…)' })}
      </form>
      <p class="muted" style="font-size:12.5px">🔒 الطلب كيوصل للموثق، ومكتب الوسيط 777 كيبقى على علم بيه (قانون التطبيق). الجواب كيبان ليك فـ «الموثقون ← طلباتي».</p>
      <div class="btn-row" style="margin-top:10px"><button class="btn gold" id="nq-ok">${ic('check', 16)} إرسال الطلب</button></div>`, (box, close) => {
      const sync = () => { $('[name=contract]', box).closest('.field').style.display = $('[name=kind]', box).value === 'contract' ? '' : 'none'; };
      $('[name=kind]', box).onchange = sync; sync();
      $('#nq-ok', box).onclick = async () => {
        const v = collect($('#nq', box));
        if (!v.sender_name || !v.sender_phone || !v.message) return toast('كمّل الاسم، الهاتف والطلب');
        const btn = $('#nq-ok', box); btn.disabled = true;
        try {
          await rq('/rest/v1/w777_notary_req', 'POST', { notary: uid, kind: v.kind, contract: v.kind === 'contract' ? v.contract || null : null,
            sender_name: v.sender_name, sender_phone: v.sender_phone, message: v.message,
            prop_ref: (at && at.ref) || null, prop_title: (at && at.title) || null, prop_city: (at && at.city) || null }, 'return=minimal');
          close(); toast('تصيفط الطلب للموثق ✓', 3000);
        } catch (e) { btn.disabled = false; toast('تعذر: ' + e.message, 4000); }
      };
    });
  }
  // صندوق الطلبات: الموثق (الواردة) · المرسل (طلباتي) · المدير (الكل)
  async function viewNotaryReqs(head, mode) {
    const me = window.W777_SYNC.uid();
    let rows, dir = [];
    const f = mode === 'inbox' ? `&notary=eq.${me}` : mode === 'sent' ? `&sender=eq.${me}` : '';
    try { rows = await rq(`/rest/v1/w777_notary_req?select=*&order=created_at.desc&limit=500${f}`); } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    try { dir = await loadDir(); } catch (e) { /* */ }
    const ag = u => dir.find(a => a.uid === u) || {};
    const cnt = s => rows.filter(r => r.status === s).length;
    const card = r => {
      const n = ag(r.notary);
      const who = mode === 'sent' ? `🖋️ الموثق: <b>${esc(n.name || '—')}</b>`
        : mode === 'all' ? `👤 <b>${esc(r.sender_name || ag(r.sender).name || '—')}</b> ← 🖋️ <b>${esc(n.name || '—')}</b>`
          : `👤 من: <b>${esc(r.sender_name || ag(r.sender).name || '—')}</b> <span class="muted" dir="ltr">${esc(ag(r.sender).code || '')}</span>`;
      return `<div class="card card-pad nt-req ${r.status === 'new' ? 'is-new' : ''}">
        <div class="btn-row" style="gap:6px"><span class="badge ${r.kind === 'contract' ? 'gold' : 'blue'}">${r.kind === 'contract' ? '📝 توثيق عقد' : '💬 استشارة'}</span>
          ${r.contract ? `<span class="badge">${esc(r.contract)}</span>` : ''}${ntBadge(r.status)}<span class="badge" dir="ltr">${refOf('NT', r.id)}</span>
          <small class="muted grow" style="text-align:left">${dAr(r.created_at)}</small></div>
        <div class="muted" style="font-size:13px;margin:8px 0">${who}${r.prop_ref || r.prop_title ? `<br>🏠 ${esc([r.prop_ref, r.prop_title, r.prop_city].filter(Boolean).join(' · '))}` : ''}</div>
        <p style="white-space:pre-wrap;margin:0">${esc(r.message)}</p>
        ${r.reply ? `<div class="nt-reply"><b>🖋️ جواب الموثق</b><p>${esc(r.reply)}</p></div>` : ''}
        <div class="btn-row" style="margin-top:10px">
          ${mode !== 'sent' && r.sender_phone ? `<a class="btn sm" href="${telLink(r.sender_phone)}">${ic('phone', 15)} ${esc(r.sender_phone)}</a>
            <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(r.sender_phone)}?text=${encodeURIComponent(`السلام عليكم ${r.sender_name || ''}، بخصوص الطلب ${refOf('NT', r.id)} (الوسيط 777)…`)}">${ic('wa', 15)}</a>` : ''}
          ${mode === 'sent' && n.phone && ['accepted', 'done'].includes(r.status) ? `<a class="btn sm" href="${telLink(n.phone)}">${ic('phone', 15)} ${esc(n.phone)}</a>` : ''}
          ${mode !== 'sent' && r.status !== 'cancelled' ? `<button class="btn sm gold" data-reply="${r.id}">✍️ جاوب / بدّل الحالة</button>` : ''}
          ${mode === 'sent' && r.status === 'new' ? `<button class="btn sm danger" data-cancel="${r.id}">إلغاء الطلب</button>` : ''}
        </div></div>`;
    };
    main().innerHTML = head + (rows.length ? `
      <div class="card card-pad" style="margin-bottom:14px"><div class="kv"><div><small>المجموع</small><b>${rows.length}</b></div><div><small>🆕 جديد</small><b>${cnt('new')}</b></div>
        <div><small>✅ مقبول</small><b>${cnt('accepted')}</b></div><div><small>🏁 تمّ</small><b>${cnt('done')}</b></div></div></div>
      <div class="nt-list">${rows.map(card).join('')}</div>`
      : emptyCard('🖋️', mode === 'inbox' ? 'مازال ما وصلك حتى طلب' : mode === 'sent' ? 'مازال ما صيفطتي حتى طلب' : 'ما كاين حتى طلب',
        mode === 'inbox' ? 'كمّل «حسابي» (المدينة، الحي والموقع GPS) باش تتقترح أوتوماتيكيا مع العقارات القريبة ليك.'
          : 'من «📇 الدليل» ولا من صفحة أي عقار، اختار موثق وصيفط ليه استشارة ولا طلب توثيق عقد.'));
    $$('[data-cancel]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('إلغاء هاد الطلب؟', 'إلغاء'))) return;
      try { await rq(`/rest/v1/w777_notary_req?id=eq.${b.dataset.cancel}`, 'PATCH', { status: 'cancelled' }, 'return=minimal'); toast('تلغى ✓'); viewNotaryReqs(head, mode); } catch (e) { toast('تعذر: ' + e.message); }
    });
    $$('[data-reply]').forEach(b => b.onclick = () => {
      const r = rows.find(x => x.id === b.dataset.reply);
      modal(`<h3>✍️ الجواب على ${refOf('NT', r.id)}</h3><form id="nr" class="form-grid">
          ${fSelect('status', 'الحالة', ['new', 'accepted', 'done', 'declined'].map(v => ({ v, l: NT_ST[v][0] })), r.status === 'new' ? 'accepted' : r.status, { noEmpty: true })}
          ${fText('reply', 'الجواب (كيشوفو صاحب الطلب)', r.reply, { ph: 'مثال: مرحبا، الوثائق المطلوبة هي… الموعد ممكن نهار… الأتعاب التقريبية…' })}</form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="nr-ok">${ic('check', 16)} حفظ</button></div>`, (box, close) => {
        $('#nr-ok', box).onclick = async () => {
          const v = collect($('#nr', box));
          try { await rq(`/rest/v1/w777_notary_req?id=eq.${r.id}`, 'PATCH', { status: v.status, reply: v.reply || null }, 'return=minimal'); close(); toast('تم ✓'); viewNotaryReqs(head, mode); } catch (e) { toast('تعذر: ' + e.message); }
        };
      });
    });
  }

  // فرص الاستثمار: المستثمر كيحط الميزانية (تمويل، شراكة، شراء، كراء طويل) — كتبان لجميع أعضاء الشبكة
  async function viewInvest(head, query) {
    let rows;
    try { rows = await rq('/rest/v1/w777_invest?select=*&order=created_at.desc&limit=1000'); } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    const me = window.W777_SYNC.uid(), admin = S.role === 'admin';
    const canPost = admin || S.kind === 'investor';
    const open = rows.filter(r => r.status === 'open');
    const total = open.reduce((s, r) => s + (num(r.budget_max) || num(r.budget_min) || 0), 0);
    main().innerHTML = head + `
      <div class="card card-pad iv-intro" style="margin-bottom:14px">
        <div class="kv"><div><small>عروض مفتوحة</small><b>${open.length}</b></div><div><small>مجموع الميزانيات</small><b>${total ? esc(millions(total) || fmt(total)) : '—'}</b></div>
          ${Object.entries(INV_MODES).map(([k, m]) => `<div><small>${m[0]}</small><b>${open.filter(r => r.mode === k).length}</b></div>`).join('')}</div>
        <p class="muted" style="font-size:13px;margin:10px 0">💼 المستثمرون كيحطّو هنا الميزانية ديالهم. عندك مشروع ولا عقار مناسب؟ تواصل معاهم مباشرة ولا عبر مكتب الوسيط 777.</p>
        <form id="ivf" class="form-grid">
          ${fInput('q', 'بحث', '', { ph: 'مدينة، قطاع، اسم…' })}
          ${fSelect('mode', 'نوع الاستثمار', [{ v: '', l: 'الكل' }, ...Object.entries(INV_MODES).map(([v, m]) => ({ v, l: m[0] }))], query.mode || '', { noEmpty: true })}
          ${fInput('amt', 'قيمة المشروع / العقار ديالي (درهم)', '', { money: true })}
          ${fSelect('st', 'الحالة', [{ v: 'open', l: 'المفتوحة' }, { v: '', l: 'الكل' }], 'open', { noEmpty: true })}
        </form>
        <div class="btn-row" style="margin-top:10px"><span class="muted grow" id="ivc"></span>
          <a class="btn" href="#/projects">🚀 المشاريع اللي كتقلب على تمويل</a>
          ${canPost ? `<button class="btn gold" id="iv-new">${ic('plus', 16)} عرض استثمار</button>` : ''}</div>
      </div>
      <div class="iv-grid" id="ivg"></div>`;
    bindMoney(main());
    const card = r => {
      const mine = r.owner === me || admin, m = INV_MODES[r.mode] || INV_MODES.partner;
      const msg = `السلام عليكم ${r.owner_name || ''}، شفت عرض الاستثمار «${r.title}» (${refOf('INV', r.id)}) فتطبيق الوسيط 777، وعندي مشروع/عقار مناسب.`;
      const bud = r.budget_min && r.budget_max ? `<small>من</small> ${nm(r.budget_min)} <small>إلى</small> ${nm(r.budget_max)} <small>درهم</small>`
        : r.budget_min || r.budget_max ? `<small>${r.budget_min ? 'ابتداء من' : 'حتى'}</small> ${nm(r.budget_min || r.budget_max)} <small>درهم</small>` : '<small class="muted">الميزانية حسب المشروع</small>';
      return `<div class="card iv-card ${r.status === 'closed' ? 'is-closed' : ''}">
        <div class="btn-row" style="gap:6px"><span class="badge gold">${m[0]}</span>${r.status === 'closed' ? '<span class="badge gray">🔒 مغلق</span>' : ''}<span class="badge" dir="ltr">${refOf('INV', r.id)}</span></div>
        <h3>${esc(r.title)}</h3>
        <div class="iv-budget">${bud}</div>
        <div class="iv-meta">${[r.sectors && '🏷️ ' + esc(r.sectors), r.cities && '📍 ' + esc(r.cities), r.share && '📊 ' + esc(r.share), r.duration && '⏱️ ' + esc(r.duration)].filter(Boolean).join('<br>')}</div>
        ${r.description ? `<p class="dir-about">${esc(r.description)}</p>` : ''}
        <div class="btn-row"><small class="muted grow">💼 ${esc(r.owner_name || 'مستثمر')} · ${dAr(r.created_at)}</small>
          <a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(r.phone || W777_OFFICE)}?text=${encodeURIComponent(msg)}">${ic('wa', 15)} ${r.phone ? 'تواصل' : 'عبر المكتب'}</a>
          ${mine ? `<button class="btn sm" data-ive="${r.id}">${ic('edit', 15)}</button><button class="btn sm" data-ivc="${r.id}">${r.status === 'open' ? '🔒' : '🔓'}</button><button class="btn sm danger" data-ivd="${r.id}">${ic('trash', 15)}</button>` : ''}</div>
      </div>`;
    };
    const draw = () => {
      const v = collect($('#ivf')), t = tokens(v.q || '');
      const res = rows.filter(r => (!v.st || r.status === v.st) && (!v.mode || r.mode === v.mode)
        && (!v.amt || ((!r.budget_min || num(r.budget_min) <= v.amt) && (!r.budget_max || num(r.budget_max) >= v.amt * 0.5)))
        && (!t.length || hit(norm([r.title, r.sectors, r.cities, r.owner_name, r.description, r.share].join(' ')), t)));
      $('#ivc').textContent = `${res.length} عرض`;
      $('#ivg').innerHTML = res.map(card).join('') || emptyCard('💼', 'ما كاين حتى عرض استثمار مطابق', canPost ? 'زيد أول عرض ديالك: الميزانية، نوع الاستثمار والقطاعات اللي كتهمك.' : 'المستثمرون (I001–I777) كيزيدو العروض ديالهم هنا.');
      $$('[data-ive]').forEach(b => b.onclick = () => ivForm(rows.find(r => r.id === b.dataset.ive)));
      $$('[data-ivc]').forEach(b => b.onclick = async () => {
        const r = rows.find(x => x.id === b.dataset.ivc), st = r.status === 'open' ? 'closed' : 'open';
        try { await rq(`/rest/v1/w777_invest?id=eq.${r.id}`, 'PATCH', { status: st }, 'return=minimal'); r.status = st; draw(); } catch (e) { toast('تعذر: ' + e.message); }
      });
      $$('[data-ivd]').forEach(b => b.onclick = async () => {
        if (!(await confirmBox('حذف هاد العرض نهائيا؟', 'حذف'))) return;
        try { await rq(`/rest/v1/w777_invest?id=eq.${b.dataset.ivd}`, 'DELETE', null, 'return=minimal'); rows = rows.filter(r => r.id !== b.dataset.ivd); draw(); } catch (e) { toast('تعذر: ' + e.message); }
      });
    };
    const ivForm = r => {
      const x = r || { mode: 'partner', phone: myAgencyPhone(), cities: (S.agency && S.agency.city) || '' };
      modal(`<h3>💼 ${r ? 'تعديل' : 'عرض'} استثمار</h3><form id="ivx" class="form-grid">
          ${fInput('title', 'العنوان', x.title, { req: true, cls: 'full', ph: 'مثال: كنقلب على مشروع سكني فمكناس للشراكة' })}
          ${fSelect('mode', 'نوع الاستثمار', Object.entries(INV_MODES).map(([v, m]) => ({ v, l: m[0] + ' — ' + m[1] })), x.mode, { noEmpty: true })}
          ${fInput('budget_min', 'الميزانية من (درهم)', x.budget_min, { money: true })}${fInput('budget_max', 'إلى (درهم)', x.budget_max, { money: true })}
          ${fInput('sectors', 'القطاعات', x.sectors, { ph: INV_SECTORS.slice(0, 3).join('، ') })}${fInput('cities', 'المدن', x.cities, { ph: 'مكناس، فاس، الرباط…' })}
          <div class="field full"><div class="chips wrap" id="iv-sec">${INV_SECTORS.map(s => `<button type="button" class="chip" data-s="${esc(s)}">+ ${esc(s)}</button>`).join('')}</div></div>
          ${fInput('share', 'النسبة / العائد المنتظر', x.share, { ph: 'مثال: 30% من الأرباح، 8% فالعام…' })}${fInput('duration', 'المدة', x.duration, { ph: 'مثال: 24 شهر' })}
          ${fInput('phone', 'الهاتف / واتساب (فارغ = عبر المكتب)', x.phone, { type: 'tel' })}
          ${fText('description', 'التفاصيل', x.description, { ph: 'الشروط، نوع المشاريع اللي كتهمك، الضمانات…' })}</form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="ivx-ok">${ic('check', 16)} ${r ? 'حفظ' : 'نشر العرض'}</button></div>`, (box, close) => {
        bindMoney(box);
        $$('#iv-sec [data-s]', box).forEach(b => b.onclick = () => { const i = $('[name=sectors]', box), cur = splitList(i.value); if (!cur.includes(b.dataset.s)) i.value = [...cur, b.dataset.s].join('، '); });
        $('#ivx-ok', box).onclick = async () => {
          const v = collect($('#ivx', box));
          if (!v.title) return toast('العنوان ضروري');
          const body = { title: v.title, mode: v.mode, budget_min: v.budget_min, budget_max: v.budget_max, sectors: splitList(v.sectors).join('، ') || null, cities: splitList(v.cities).join('، ') || null,
            share: v.share || null, duration: v.duration || null, phone: v.phone || null, description: v.description || null, owner_name: r ? r.owner_name : myAgencyName() };
          try {
            if (r) { await rq(`/rest/v1/w777_invest?id=eq.${r.id}`, 'PATCH', body, 'return=minimal'); Object.assign(r, body); }
            else rows.unshift((await rq('/rest/v1/w777_invest', 'POST', body, 'return=representation'))[0]);
            close(); draw(); toast('تم ✓');
          } catch (e) { toast('تعذر: ' + e.message, 4000); }
        };
      });
    };
    const nb = $('#iv-new'); if (nb) nb.onclick = () => ivForm(null);
    $$('#ivf input, #ivf select').forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', draw));
    $('#ivf').onsubmit = e => e.preventDefault();
    draw();
  }

  /* ============================================================
     قانون التطبيق وشروط الاشتراك + مجموعات المشتركين (واتساب وتيليغرام)
     ============================================================ */
  const TERMS_V = '2026-10';
  const TERMS_MAIN = [
    ['📣', 'الإبلاغ عن العمليات', 'كل عملية (بيع، كراء، شراكة، تمويل، توثيق…) تمّت بين طرفين عن طريق التطبيق، ولا بسبب معلومة منشورة فيه، خاص المشترك يبلّغ بيها مكتب الوسيط 777 فور إتمامها.'],
    ['🔑', 'غياب المشترك المكلّف بالعقار', 'فحالة عدم ظهور المشترك المكلّف بالعقار (ما كيجاوبش ولا غايب)، يجوز لمكتب الوسيط 777 الولوج لمعلومات صاحب العقار والتواصل معه لإتمام العملية، مع حفظ عمولة المشترك المكلّف كاملة.'],
    ['💳', 'الاشتراك', 'كيوفّر مكتب الوسيط 777 هاد الخدمة مقابل 199 درهم فالعام، كتخلص من بعد 3 أشهر مجانية كتبدا من نهار الموافقة على هاد القانون.'],
    ['🪪', 'التعريف بالهوية', 'الإدلاء بصورة البطاقة الوطنية، أو جواز السفر بالنسبة للمشتركين من دول أخرى، وذلك لضمان المصداقية والشفافية والنزاهة. كتولي إجبارية من بعد انتهاء الأشهر الثلاثة المجانية، والصورة كيشوفها غير مكتب الوسيط 777 (ما كتبانش للمشتركين).'],
    ['⚠️', 'حدود المسؤولية', 'لا يتحمل مكتب الوسيط 777 أي مسؤولية فحالة تمّ التعاقد بدون علمه ولا بدون الرجوع إليه.'],
  ];
  const TERMS_MORE = [
    ['صحة المعلومات', 'المشترك مسؤول على صحة المعلومات والصور اللي كينشر (5 صور لكل عقار)، وعلى حصوله على موافقة صاحب العقار.'],
    ['السرية', 'معلومات المالك والزبناء كتبقى خاصة بالمشترك اللي زادها، وما كتبانش لباقي الأعضاء. يُمنع استعمال معلومات الشبكة خارج إطار التعاون المهني.'],
    ['التعاون والعمولة', 'العمولة كتتقسم بين الأطراف حسب الاتفاق المسبق بيناتهم، ومكتب الوسيط 777 كيبقى مرجع فحالة الخلاف (خانة «النزاعات»).'],
    ['حسن السلوك', 'يُمنع نشر عقارات وهمية، أثمنة مضللة، ولا أي محتوى مخالف للقانون. يحق لمكتب الوسيط 777 إيقاف أي حساب مخالف.'],
    ['الحساب', 'الرمز وكلمة السر شخصيين. المشترك مسؤول على كل استعمال للحساب ديالو.'],
    ['القبول', 'استعمال التطبيق والدخول للشبكة كيعني الموافقة الكاملة على هاد القانون وعلى أي تعديل كيتنشر فهاد الصفحة.'],
  ];
  function subInfo(a) {
    if (!a) return null;
    const paid = a.sub_until ? new Date(a.sub_until + 'T23:59:59') : null, now = new Date();
    if (paid && paid >= now) return { ok: true, txt: `✅ الاشتراك خالص حتى ${dAr(a.sub_until)}` };
    if (!a.terms_at) return { ok: true, trial: true, txt: '🎁 3 أشهر مجانية كتبدا من نهار الموافقة على القانون' };
    const end = new Date(a.terms_at); end.setMonth(end.getMonth() + 3);
    if (end >= now) return { ok: true, trial: true, txt: `🎁 الفترة المجانية حتى ${dAr(end.toISOString())} — من بعد 199 درهم فالعام` };
    return { ok: false, txt: `⏳ الاشتراك السنوي (199 درهم) مستحق — تواصل مع مكتب الوسيط 777` };
  }
  /* ---------- صورة المشترك، الشعار، والبطاقة الوطنية / جواز السفر ---------- */
  const brandUrl = p => {
    if (!p) return '';
    const a = window.W777_SYNC && window.W777_SYNC.account();
    return a && a.url ? `${a.url}/storage/v1/object/public/w777-brand/${String(p).split('/').map(encodeURIComponent).join('/')}` : '';
  };
  const freeEnd = a => { if (!a || !a.terms_at) return null; const d = new Date(a.terms_at); d.setMonth(d.getMonth() + 3); return d; };
  // البطاقة كتولي إجبارية من بعد الفترة المجانية (3 أشهر من الموافقة على القانون)
  const idRequired = a => !!a && !a.id_doc && !!freeEnd(a) && freeEnd(a) < new Date();
  const idLabel = a => isAbroad(a) ? 'جواز السفر (ولا البطاقة الوطنية)' : 'البطاقة الوطنية';
  async function brandBlob(file, max, keepAlpha) {
    if (keepAlpha && /png|webp/i.test(file.type || '')) {
      try {
        const bmp = await decodeImage(file);
        const bw = bmp.naturalWidth || bmp.width, bh = bmp.naturalHeight || bmp.height, k = Math.min(1, max / Math.max(bw, bh));
        const c = document.createElement('canvas'); c.width = Math.round(bw * k); c.height = Math.round(bh * k);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        if (bmp.close) bmp.close();
        const b = await new Promise(r => c.toBlob(r, 'image/png'));
        if (b) return b;
      } catch (e) { /* كنكملو بـ JPEG */ }
    }
    return (await compressImage(file, max, 0.85)).blob;
  }
  // رفع ملف للدوسي ديال المشترك ← المسار (uid/…)
  async function uploadMine(bucket, name, blob, owner) {
    const Sy = window.W777_SYNC, uid = owner || Sy.uid();
    const ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : 'jpg';
    const path = `${uid}/${name}-${Date.now().toString(36)}.${ext}`;
    await Sy.request(`/storage/v1/object/${bucket}/${path}`, { method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'true' }, body: blob });
    return path;
  }
  function dropFile(bucket, path) {
    if (!path) return;
    window.W777_SYNC.request(`/storage/v1/object/${bucket}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }) }).catch(() => {});
  }
  async function openIdDoc(path) {
    try {
      const r = await (await window.W777_SYNC.request(`/storage/v1/object/sign/w777-ids/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 600 }) })).json();
      if (!r.signedURL) throw new Error('—');
      window.open(window.W777_SYNC.account().url + '/storage/v1' + r.signedURL, '_blank', 'noopener');
    } catch (e) { toast('تعذر فتح الملف: ' + e.message, 4000); }
  }
  // حفظ ملف فالحساب: الصورة / الشعار / البطاقة
  // target: مشترك آخر (المدير كيحمّل الصورة ولا الشعار ديالو)
  async function saveMemberFile(field, file, target) {
    const ag = target || S.agency || {}, uid = target ? target.uid : window.W777_SYNC.uid();
    const isId = field === 'id_doc';
    if (isId && file.type !== 'application/pdf' && !/^image\//.test(file.type || 'image/')) throw new Error('غير صورة ولا PDF');
    const blob = isId ? (file.type === 'application/pdf' ? file : (await compressImage(file, 1800, 0.85)).blob)
      : await brandBlob(file, field === 'logo' ? 600 : 900, field === 'logo');
    if (blob.size > (isId ? 8 : 3) * 1048576) throw new Error('الملف كبير بزاف');
    const bucket = isId ? 'w777-ids' : 'w777-brand';
    const path = await uploadMine(bucket, field === 'id_doc' ? 'id' : field, blob, uid);
    await rq(`/rest/v1/w777_agencies?uid=eq.${uid}`, 'PATCH', { [field]: path });
    if (ag[field] && ag[field] !== path) dropFile(bucket, ag[field]);
    if (target) target[field] = path; else await refreshRole(true);
    S.dir = null;
  }
  // خانات الصورة + الشعار فـ نافذة تعديل المشترك (المدير)
  const admMediaHtml = a => ['photo', 'logo'].map(f => { const u = brandUrl(a[f]); return `<div class="mm-tile">
      <div class="mm-img">${u ? `<img src="${esc(u)}" alt="">` : `<span>${f === 'logo' ? '🏷️' : '🧑‍💼'}</span>`}</div>
      <b>${f === 'logo' ? 'الشعار (Logo)' : 'الصورة / صورة المكتب'}</b>
      <div class="btn-row"><label class="btn sm gold">${ic('camera', 15)} ${u ? 'بدّل' : 'تحميل'}<input type="file" accept="image/*" data-am="${f}" hidden></label>
        ${u ? `<button type="button" class="btn sm" data-am-del="${f}">مسح</button>` : ''}</div></div>`; }).join('');
  function bindAdmMedia(box, a, after) {
    const redraw = () => { $('#age-mm', box).innerHTML = admMediaHtml(a); bindAdmMedia(box, a, after); after(); };
    $$('[data-am]', box).forEach(inp => inp.onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      const lbl = inp.closest('label'); if (lbl) lbl.classList.add('loading');
      try { toast('جاري التحميل…'); await saveMemberFile(inp.dataset.am, f, a); toast('تم ✓'); redraw(); }
      catch (er) { toast('تعذر: ' + er.message, 4500); if (lbl) lbl.classList.remove('loading'); }
    });
    $$('[data-am-del]', box).forEach(b => b.onclick = async () => {
      const field = b.dataset.amDel, old = a[field];
      try { await rq(`/rest/v1/w777_agencies?uid=eq.${a.uid}`, 'PATCH', { [field]: null }); dropFile('w777-brand', old); a[field] = null; S.dir = null; toast('تمسحات ✓'); redraw(); }
      catch (er) { toast('تعذر: ' + er.message, 4000); }
    });
  }
  function memberMediaCard() {
    const ag = S.agency || {};
    const end = freeEnd(ag), req = idRequired(ag);
    const idSt = ag.id_doc ? (ag.id_ok ? '<span class="badge green">✅ مؤكدة من المكتب</span>' : '<span class="badge amber">🕓 كتسنى التأكيد</span>') : '<span class="badge red">❌ ما كايناش</span>';
    const tile = (field, title, hint, img, ph) => `<div class="mm-tile">
        <div class="mm-img">${img ? `<img src="${esc(img)}" alt="">` : `<span>${ph}</span>`}</div>
        <b>${title}</b><small class="muted">${hint}</small>
        <div class="btn-row"><label class="btn sm gold">${ic('camera', 15)} ${img ? 'بدّل' : 'تحميل'}<input type="file" accept="image/*" data-mm="${field}" hidden></label>
          ${img ? `<button class="btn sm" data-mm-del="${field}">مسح</button>` : ''}</div></div>`;
    return `<div class="card card-pad" style="margin-top:14px" id="mm-card">
      <h3 class="section-title">🖼️ الصورة، الشعار والهوية</h3>
      <div class="mm-grid">
        ${tile('photo', 'صورتك ولا صورة المكتب', 'كتبان فالدليل لجميع المشتركين', brandUrl(ag.photo), '🧑‍💼')}
        ${tile('logo', 'الشعار (Logo)', 'كيبان فشريط الشركاء فالصفحة الرئيسية', brandUrl(ag.logo), '🏷️')}
        <div class="mm-tile${req ? ' mm-req' : ''}">
          <div class="mm-img"><span>🪪</span></div>
          <b>${esc(idLabel(ag))}</b>${idSt}
          <small class="muted">${req ? '⚠️ إجبارية دابا: انتهات الفترة المجانية' : end ? `إجبارية من بعد ${dAr(end.toISOString())} (نهاية الفترة المجانية)` : 'إجبارية من بعد الأشهر الثلاثة المجانية'}</small>
          <div class="btn-row"><label class="btn sm gold">${ic('upload', 15)} ${ag.id_doc ? 'بدّل' : 'تحميل'}<input type="file" accept="image/*,application/pdf" data-mm="id_doc" hidden></label>
            ${ag.id_doc ? `<button class="btn sm" data-mm-view>${ic('eye', 15)} عرض</button>` : ''}</div></div>
      </div>
      <p class="muted" style="font-size:12.5px;margin:10px 0 0">🔒 ${esc(idLabel(ag))} كتشوفها غير إدارة مكتب الوسيط 777، ما كتبانش للمشتركين — لضمان المصداقية والشفافية والنزاهة.</p></div>`;
  }
  function bindMemberMedia(root, after) {
    $$('[data-mm]', root).forEach(inp => inp.onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      const lbl = inp.closest('label'); if (lbl) lbl.classList.add('loading');
      try { toast('جاري التحميل…'); await saveMemberFile(inp.dataset.mm, f); toast('تم ✓'); after(); }
      catch (er) { toast('تعذر: ' + er.message, 4500); if (lbl) lbl.classList.remove('loading'); }
    });
    $$('[data-mm-del]', root).forEach(b => b.onclick = async () => {
      const field = b.dataset.mmDel, old = (S.agency || {})[field];
      if (!(await confirmBox('نمسحو هاد الصورة؟', 'مسح', true))) return;
      try { await rq(`/rest/v1/w777_agencies?uid=eq.${window.W777_SYNC.uid()}`, 'PATCH', { [field]: null }); dropFile('w777-brand', old); await refreshRole(true); S.dir = null; toast('تمسحات ✓'); after(); }
      catch (er) { toast('تعذر: ' + er.message, 4000); }
    });
    const v = $('[data-mm-view]', root); if (v) v.onclick = () => openIdDoc((S.agency || {}).id_doc);
  }
  // من بعد الفترة المجانية: الدخول للشبكة كيتطلب صورة البطاقة / جواز السفر
  function idGate() {
    const ag = S.agency || {};
    main().innerHTML = `<div class="card card-pad tr-gate">
      <div class="tr-hero" style="box-shadow:none;border:0;padding:0;margin-bottom:12px"><img src="${LOGO}" alt="" class="tr-logo"><div><b>🪪 ${esc(idLabel(ag))} — خطوة وحدة باقية</b><small>انتهات الفترة المجانية (3 أشهر)</small></div></div>
      <p>حسب قانون التطبيق، خاص كل مشترك يدلي بصورة ${esc(idLabel(ag))} باش يكمّل يستافد من شبكة الوسيط 777، وذلك لضمان <b>المصداقية والشفافية والنزاهة</b>.</p>
      <p class="muted" style="font-size:13px">🔒 الصورة كيشوفها غير مكتب الوسيط 777. صورة واضحة للوجهين (ولا PDF).</p>
      <div class="btn-row"><label class="btn gold">${ic('upload', 18)} تحميل ${esc(idLabel(ag))}<input type="file" accept="image/*,application/pdf" id="idg-f" hidden></label><a class="btn" href="#/terms">⚖️ قانون التطبيق</a></div></div>`;
    $('#idg-f').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { toast('جاري التحميل…'); await saveMemberFile('id_doc', f); toast('شكرا ✓ البطاقة توصلات'); route(); }
      catch (er) { toast('تعذر: ' + er.message, 4500); }
    };
  }
  /* ---------- الصفحة الرئيسية: أعلام دول المشتركين + شريط شعارات الشركاء ---------- */
  const COUNTRY_ISO = { 'المغرب': 'MA', 'فرنسا': 'FR', 'بلجيكا': 'BE', 'إسبانيا': 'ES', 'اسبانيا': 'ES', 'إيطاليا': 'IT', 'ايطاليا': 'IT', 'هولندا': 'NL', 'ألمانيا': 'DE', 'المانيا': 'DE',
    'سويسرا': 'CH', 'كندا': 'CA', 'الولايات المتحدة': 'US', 'أمريكا': 'US', 'امريكا': 'US', 'بريطانيا': 'GB', 'المملكة المتحدة': 'GB', 'انجلترا': 'GB', 'إنجلترا': 'GB',
    'الإمارات': 'AE', 'الامارات': 'AE', 'السعودية': 'SA', 'قطر': 'QA', 'الكويت': 'KW', 'البحرين': 'BH', 'عمان': 'OM', 'سلطنة عمان': 'OM', 'مصر': 'EG', 'تونس': 'TN', 'الجزائر': 'DZ',
    'موريتانيا': 'MR', 'ليبيا': 'LY', 'تركيا': 'TR', 'السويد': 'SE', 'النرويج': 'NO', 'الدنمارك': 'DK', 'البرتغال': 'PT', 'لوكسمبورغ': 'LU', 'النمسا': 'AT', 'إيرلندا': 'IE', 'ايرلندا': 'IE',
    'روسيا': 'RU', 'الصين': 'CN', 'اليابان': 'JP', 'كوريا': 'KR', 'الهند': 'IN', 'باكستان': 'PK', 'السنغال': 'SN', 'كوت ديفوار': 'CI', 'مالي': 'ML', 'الأردن': 'JO', 'لبنان': 'LB', 'أستراليا': 'AU',
    'france': 'FR', 'belgique': 'BE', 'espagne': 'ES', 'italie': 'IT', 'pays-bas': 'NL', 'allemagne': 'DE', 'suisse': 'CH', 'canada': 'CA', 'usa': 'US', 'maroc': 'MA', 'uk': 'GB' };
  const flagOf = name => {
    const iso = COUNTRY_ISO[String(name || '').trim()] || COUNTRY_ISO[String(name || '').trim().toLowerCase()];
    return iso ? String.fromCodePoint(...[...iso].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '🏳️';
  };
  async function homeNetwork() {
    let dir;
    try { await refreshRole(); if (!inNetwork()) return; dir = await loadDir(); } catch (e) { return; }
    if ((location.hash || '#/') !== '#/' && location.hash !== '#') return;
    const live = dir.filter(a => a.active);
    // الأعلام: كل دولة فيها مشترك
    const cnt = {};
    live.forEach(a => { const c = (a.country || 'المغرب').trim(); if (c && c !== 'خارج المغرب') cnt[c] = (cnt[c] || 0) + 1; });
    const fl = $('#home-flags');
    const items = Object.entries(cnt).sort((x, y) => y[1] - x[1]);
    if (fl && items.length) {
      const one = items.map(([c, n]) => `<span class="fl-item" title="${esc(c)} — ${n}"><span class="fl-emoji">${flagOf(c)}</span>${esc(c)}<small>${n}</small></span>`).join('');
      fl.innerHTML = `<b class="fl-title">🌍 دول المشتركين</b><div class="fl-view"><div class="fl-track${items.length > 3 ? ' moving' : ''}">${one}${items.length > 3 ? one : ''}</div></div>`;
      fl.classList.remove('hidden');
    }
    // شريط الشركاء: الشعارات (ولا الصور) ديال المشتركين
    const rail = $('#home-rail');
    if (!rail) return;
    // الستوري: اللي عندو ستوري كيبان أول بإطار ملون (رمادي إلا شافو)
    const sts = await loadStories(true), groups = stGroups(sts, dir), seen = stSeen();
    const ring = uid => { const g = groups.find(x => x.uid === uid); return g ? ` has-st${g.items.every(i => seen[i.id]) ? ' st-seen' : ''}" data-st="${g.uid}` : ''; };
    const officeUid = (groups.find(g => g.office) || {}).uid || '';
    const withLogo = live.filter(a => a.logo || a.photo || groups.some(g => g.uid === a.uid))
      .sort((x, y) => (groups.some(g => g.uid === y.uid) ? 2 : 0) + (y.logo ? 1 : 0) - (groups.some(g => g.uid === x.uid) ? 2 : 0) - (x.logo ? 1 : 0));
    const tiles = [`<a class="pr-item pr-office${officeUid ? ring(officeUid) : ''}" href="#/terms" title="مجموعة الوسيط 777"><img src="${LOGO}" alt=""></a>`,
      ...withLogo.map(a => `<a class="pr-item${ring(a.uid)}" href="#/${(KINDS[kindOf(a)] || KINDS.agency).route}/dir" title="${esc(a.name)}">${a.logo || a.photo ? `<img src="${esc(brandUrl(a.logo || a.photo))}" alt="" loading="lazy">` : `<b class="pr-letter">${esc((a.name || '؟').trim()[0])}</b>`}</a>`)];
    const myKind = S.kind && KINDS[S.kind];
    const plus = myKind && !(S.agency || {}).logo ? `<a class="pr-item pr-add" href="#/${myKind.route}/me" title="زيد الشعار ديالك">＋<small>شعارك</small></a>` : '';
    const moving = tiles.length > 6;
    rail.innerHTML = `<div class="pr-title">الشركاء</div><button class="pr-item pr-story-add" type="button" title="ستوري جديد" aria-label="ستوري جديد">＋<small>ستوري</small></button><div class="pr-view"><div class="pr-track${moving ? ' moving' : ''}" style="--n:${tiles.length}">${tiles.join('')}${moving ? tiles.join('') : ''}</div></div>${plus}`;
    rail.classList.remove('hidden');
    rail.onclick = e => {
      if (e.target.closest('.pr-story-add')) { e.preventDefault(); storyComposer(); return; }
      const a = e.target.closest('[data-st]'); if (a) { e.preventDefault(); storyView(a.dataset.st); }
    };
  }

  /* ============================================================
     الستوري ديال المشتركين: نص ولا صورة، كيبقى 24 ساعة، كيبان فشريط الشركاء
     ============================================================ */
  const ST = { list: [], at: 0, img: new Map() };
  const ST_BG = ['linear-gradient(135deg,#c8102e,#5a0b18)', 'linear-gradient(135deg,#111,#3a3a3a)', 'linear-gradient(135deg,#d9a73b,#8a5a00)', 'linear-gradient(135deg,#1f9d68,#0b4d33)', 'linear-gradient(135deg,#2f6fd6,#16336b)', 'linear-gradient(135deg,#7b2ff7,#f107a3)'];
  async function loadStories(force) {
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) return [];
    if (!force && Date.now() - ST.at < 60000) return ST.list;
    try { ST.list = await (await Sy.request('/rest/v1/w777_stories?select=id,owner,kind,body,bg,created_at&order=created_at.asc')).json(); ST.at = Date.now(); }
    catch (e) { /* بلا إنترنت */ }
    return ST.list;
  }
  const stSeen = () => { try { return JSON.parse(localStorage.getItem('w777_st_seen') || '{}'); } catch (e) { return {}; } };
  function stMarkSeen(id) {
    const m = stSeen(); m[id] = Date.now();
    Object.keys(m).forEach(k => { if (Date.now() - m[k] > 2 * 86400000) delete m[k]; });
    try { localStorage.setItem('w777_st_seen', JSON.stringify(m)); } catch (e) { /* */ }
  }
  // كنجمعو الستوري حسب المشترك (اللي ماشي فالدليل = مكتب الوسيط 777)
  function stGroups(list, dir) {
    const by = new Map();
    list.forEach(x => { if (!by.has(x.owner)) by.set(x.owner, []); by.get(x.owner).push(x); });
    return [...by].map(([uid, items]) => {
      const a = (dir || S.dir || []).find(d => d.uid === uid);
      return { uid, items, office: !a, name: a ? a.name : 'مجموعة الوسيط 777', logo: a ? (a.logo || a.photo ? brandUrl(a.logo || a.photo) : '') : LOGO };
    }).sort((x, y) => (y.office ? 1 : 0) - (x.office ? 1 : 0) || String(y.items[y.items.length - 1].created_at).localeCompare(String(x.items[x.items.length - 1].created_at)));
  }
  const stAgo = t => { const m = Math.max(1, Math.round((Date.now() - new Date(t)) / 60000)); return m < 60 ? `قبل ${m} دقيقة` : `قبل ${Math.round(m / 60)} ساعة`; };
  async function storyView(startUid) {
    const groups = stGroups(await loadStories(), S.dir);
    let gi = Math.max(0, groups.findIndex(g => g.uid === startUid)), ii = 0, timer = 0, t0 = 0, left = 0, paused = false;
    if (!groups.length) return;
    // كنبداو من أول ستوري ما تشافش
    const seen0 = stSeen(); ii = Math.max(0, groups[gi].items.findIndex(x => !seen0[x.id]));
    const ov = document.createElement('div'); ov.className = 'st-view'; ov.setAttribute('role', 'dialog');
    document.body.appendChild(ov); document.body.classList.add('st-open');
    const DUR = 6000;
    const close = () => { clearTimeout(timer); ov.remove(); document.body.classList.remove('st-open'); document.removeEventListener('keydown', key); if ((location.hash || '#/') === '#/') homeNetwork(); };
    const key = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') go(1); else if (e.key === 'ArrowRight') go(-1); };
    document.addEventListener('keydown', key);
    const go = d => {
      clearTimeout(timer);
      ii += d;
      if (ii >= groups[gi].items.length) { gi++; ii = 0; }
      if (ii < 0) { gi--; ii = gi >= 0 ? groups[gi].items.length - 1 : 0; }
      if (gi < 0) { gi = 0; ii = 0; }
      if (gi >= groups.length) return close();
      show();
    };
    const run = ms => { left = ms; t0 = Date.now(); const bar = $('.st-bars i.on b', ov); if (bar) { bar.style.transition = 'none'; bar.style.width = (100 - ms / DUR * 100) + '%'; void bar.offsetWidth; bar.style.transition = `width ${ms}ms linear`; bar.style.width = '100%'; } timer = setTimeout(() => go(1), ms); };
    async function show() {
      const g = groups[gi], x = g.items[ii];
      stMarkSeen(x.id);
      const mine = x.owner === window.W777_SYNC.uid() || S.role === 'admin';
      ov.innerHTML = `<div class="st-card">
        <div class="st-bars">${g.items.map((_, k) => `<i class="${k < ii ? 'done' : k === ii ? 'on' : ''}"><b></b></i>`).join('')}</div>
        <div class="st-head">${g.logo ? `<img src="${esc(g.logo)}" alt="">` : `<span class="st-av">${esc((g.name || '؟').trim()[0])}</span>`}
          <div class="grow"><b>${esc(g.name)}</b><small>${stAgo(x.created_at)}</small></div>
          ${mine ? `<button class="st-btn" data-del title="حذف">🗑</button>` : ''}<button class="st-btn" data-x title="إغلاق">✕</button></div>
        <div class="st-body">${x.kind === 'text' ? `<div class="st-text" style="background:${ST_BG.includes(x.bg) ? x.bg : ST_BG[0]}"><p>${esc(x.body || '').replace(/\n/g, '<br>')}</p></div>`
          : `<div class="st-img"><div class="st-spin"></div><img alt="">${x.body ? `<p class="st-cap">${esc(x.body)}</p>` : ''}</div>`}</div>
        <button class="st-nav st-prev" aria-label="السابق"></button><button class="st-nav st-next" aria-label="التالي"></button></div>`;
      $('[data-x]', ov).onclick = close;
      const del = $('[data-del]', ov);
      if (del) del.onclick = async () => {
        clearTimeout(timer);
        if (!(await confirmBox('نحيدو هاد الستوري؟', 'حذف', true))) return run(left || DUR);
        try { await window.W777_SYNC.request('/rest/v1/w777_stories?id=eq.' + x.id, { method: 'DELETE' }); ST.list = ST.list.filter(s0 => s0.id !== x.id); g.items.splice(ii, 1); toast('تم الحذف ✓'); }
        catch (e) { toast('تعذر: ' + e.message, 4000); }
        if (!g.items.length) { groups.splice(gi, 1); ii = 0; if (gi >= groups.length) return close(); } else if (ii >= g.items.length) ii = g.items.length - 1;
        show();
      };
      // الضغط على اليمين/اليسار، والضغط المطول كيوقف
      $('.st-prev', ov).onclick = () => go(-1);
      $('.st-next', ov).onclick = () => go(1);
      const body = $('.st-card', ov);
      body.onpointerdown = e => { if (e.target.closest('.st-btn')) return; paused = true; clearTimeout(timer); left = Math.max(300, left - (Date.now() - t0)); const b = $('.st-bars i.on b', ov); if (b) { b.style.width = getComputedStyle(b).width; b.style.transition = 'none'; } };
      body.onpointerup = body.onpointercancel = () => { if (paused) { paused = false; run(left); } };
      if (x.kind === 'image') {
        const img = $('.st-img img', ov);
        try {
          if (!ST.img.has(x.id)) ST.img.set(x.id, (await (await window.W777_SYNC.request(`/rest/v1/w777_stories?id=eq.${x.id}&select=img`)).json())[0].img);
          if (groups[gi] !== g || g.items[ii] !== x) return;
          img.src = ST.img.get(x.id); img.onload = () => { const sp = $('.st-spin', ov); if (sp) sp.remove(); };
        } catch (e) { toast('تعذر تحميل الصورة'); }
      }
      run(DUR);
    }
    show();
  }
  function storyComposer() {
    const Sy = window.W777_SYNC;
    if (!Sy || !Sy.isOn()) return toast('دخل بالحساب ديالك أولا (الإعدادات ← المزامنة السحابية)', 4000);
    let kind = 'text', bg = ST_BG[0], img = '';
    modal(`<h3>📸 ستوري جديد</h3><p class="muted" style="margin-top:0">كيبان لجميع المشتركين فشريط «الشركاء» لمدة 24 ساعة.</p>
      <div class="st-seg" id="stk"><button type="button" class="on" data-k="text">📝 نص</button><button type="button" data-k="image">🖼️ صورة</button></div>
      <div class="st-prev-box" id="stp"></div>
      <div id="st-text-f"><textarea id="st-body" maxlength="300" rows="3" placeholder="كتب الستوري ديالك… (مثلا: فيلا جديدة للبيع فحمرية 🔥)"></textarea>
        <div class="st-colors">${ST_BG.map((b, i) => `<button type="button" data-bg="${i}" style="background:${b}" class="${i ? '' : 'on'}"></button>`).join('')}</div></div>
      <div id="st-img-f" class="hidden"><label class="btn sm">${ic('camera', 15)} اختار صورة<input type="file" id="st-file" accept="image/*" hidden></label>
        <input id="st-cap" maxlength="200" placeholder="تعليق (اختياري)" style="margin-top:8px;width:100%"></div>
      <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="st-pub">${ic('check', 16)} نشر الستوري</button></div>`, (box, close) => {
      const prev = $('#stp', box), ta = $('#st-body', box), cap = $('#st-cap', box);
      const paint = () => {
        prev.innerHTML = kind === 'text' ? `<div class="st-text" style="background:${bg}"><p>${esc(ta.value || 'النص ديالك هنا…').replace(/\n/g, '<br>')}</p></div>`
          : img ? `<div class="st-img"><img src="${img}" alt="">${cap.value ? `<p class="st-cap">${esc(cap.value)}</p>` : ''}</div>` : '<div class="st-text" style="background:#222"><p>🖼️ اختار صورة</p></div>';
      };
      $$('#stk button', box).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('#stk button', box).forEach(x => x.classList.toggle('on', x === b)); $('#st-text-f', box).classList.toggle('hidden', kind !== 'text'); $('#st-img-f', box).classList.toggle('hidden', kind !== 'image'); paint(); });
      $$('.st-colors button', box).forEach(b => b.onclick = () => { bg = ST_BG[+b.dataset.bg]; $$('.st-colors button', box).forEach(x => x.classList.toggle('on', x === b)); paint(); });
      ta.oninput = cap.oninput = paint;
      $('#st-file', box).onchange = async e => {
        const f = e.target.files[0]; if (!f) return;
        const toData = blob => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
        let out = await compressImage(f, 1080, 0.82); img = await toData(out.blob);
        if (img.length > 440000) { out = await compressImage(f, 800, 0.7); img = await toData(out.blob); }
        if (img.length > 440000) { img = ''; toast('الصورة كبيرة بزاف، جرب صورة أخرى', 4000); }
        paint();
      };
      $('#st-pub', box).onclick = async () => {
        const body = kind === 'text' ? ta.value.trim() : cap.value.trim();
        if (kind === 'text' && !body) return toast('كتب شي حاجة أولا');
        if (kind === 'image' && !img) return toast('اختار صورة أولا');
        const btn = $('#st-pub', box); btn.disabled = true;
        try {
          await Sy.request('/rest/v1/w777_stories', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ kind, body: body || null, bg: kind === 'text' ? bg : null, img: kind === 'image' ? img : null }) });
          ST.at = 0; close(); toast('تنشر الستوري ✓ — كيبان 24 ساعة');
          if ((location.hash || '#/') === '#/') homeNetwork(); else location.hash = '#/';
        } catch (e) { btn.disabled = false; toast('تعذر النشر: ' + e.message, 4500); }
      };
      paint();
    });
  }
  const groupLinks = () => { const c = AG.cfg || {}; return { wa: c.wa_group || '', tg: c.tg_group || '', fb: c.fb_group || '' }; };
  // شعارات المنصات (ملونين)
  const GRP_LOGO = {
    wa: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#25D366"/><path fill="#fff" d="M16 6.5a9.4 9.4 0 0 0-8.1 14.2L6.6 25.5l4.9-1.3A9.4 9.4 0 1 0 16 6.5zm0 17.1c-1.5 0-2.9-.4-4.2-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A7.8 7.8 0 1 1 16 23.6zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.4 6.4 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.6-.4z"/></svg>',
    tg: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#29A9EB"/><path fill="#fff" d="M7.2 15.6l15.4-5.9c.7-.3 1.3.2 1.1 1.3l-2.6 12.3c-.2.9-.7 1.1-1.5.7l-4-3-1.9 1.9c-.2.2-.4.4-.8.4l.3-4.1 7.4-6.7c.3-.3-.1-.4-.5-.2l-9.2 5.8-3.9-1.2c-.9-.3-.9-.9.2-1.3z"/></svg>',
    fb: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#1877F2"/><path fill="#fff" d="M17.6 26v-8h2.7l.4-3.2h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V8.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.3h-2.7V18h2.7v8h3.2z"/></svg>',
  };
  const GRP_NAME = { wa: 'مجموعة واتساب', tg: 'مجموعة تيليغرام', fb: 'مجموعة فيسبوك' };
  function groupsCard(full) {
    const g = groupLinks(), keys = ['wa', 'tg', 'fb'].filter(k => g[k]);
    // فالرئيسية: غير الشعارات (بلا مربعات)
    if (!full) return keys.length ? `<div class="grp-strip"><b>👥 مجموعات المشتركين</b><div class="grp-logos">${keys.map(k => `<a class="grp-logo" target="_blank" rel="noopener" href="${safeUrl(g[k])}" title="${GRP_NAME[k]}" aria-label="${GRP_NAME[k]}">${GRP_LOGO[k]}</a>`).join('')}</div></div>` : '';
    const btns = keys.map(k => `<a class="btn grp-btn" target="_blank" rel="noopener" href="${safeUrl(g[k])}"><i class="grp-ic">${GRP_LOGO[k]}</i> ${GRP_NAME[k]}</a>`).join('');
    return `<div class="card card-pad grp-card" id="grp">
      <h3 class="section-title">👥 مجموعات المشتركين</h3>
      <p class="muted" style="margin-top:0">مجموعة لكل مشتركي التطبيق: الوكالات، الوسطاء، المقاولات، التشطيب، المستثمرون والموثقون — للأخبار، الفرص والتعاون المباشر.</p>
      <div class="btn-row">${btns || '<span class="muted">⏳ الروابط غادي يحطّهم مكتب الوسيط 777 قريبا.</span>'}</div>
      ${S.role === 'admin' ? `<form id="grpf" class="form-grid" style="margin-top:14px">
          ${fInput('wa_group', 'رابط مجموعة / مجتمع واتساب', g.wa, { ph: 'https://chat.whatsapp.com/…', cls: 'full' })}
          ${fInput('tg_group', 'رابط مجموعة تيليغرام', g.tg, { ph: 'https://t.me/+…', cls: 'full' })}
          ${fInput('fb_group', 'رابط مجموعة فيسبوك', g.fb, { ph: 'https://www.facebook.com/groups/…', cls: 'full' })}
          <div class="field"><button class="btn gold">${ic('check', 16)} حفظ الروابط</button></div></form>
        <p class="muted" style="font-size:12.5px;margin-bottom:0">💡 مجموعة واتساب فيها حد 1024 عضو — مع 4662 حساب استعمل «مجتمع واتساب» (Community) ولا قناة. تيليغرام كيقبل حتى 200 000 عضو.<br>الروابط كتزاد أوتوماتيكيا فرسالة «صيفط الدخول» لكل مشترك جديد.</p>` : ''}
    </div>`;
  }
  async function viewTerms(sub) {
    const Sy = window.W777_SYNC, on = !EMBED && Sy && Sy.isOn();
    if (on) { await refreshRole(); await agLoadCfg(); }
    const ag = S.role === 'agency' ? S.agency : null, si = subInfo(ag);
    main().innerHTML = `
      <div class="page-head"><h1>⚖️ قانون التطبيق وشروط الاشتراك</h1>${on ? roleBadge() : ''}</div>
      <div class="card tr-hero">
        <img src="${LOGO}" alt="" class="tr-logo">
        <div><b>مجموعة الوسيط 777 — AL WASSET 777 GROUPE</b><small>القانون الداخلي لمشتركي التطبيق · النسخة ${TERMS_V}</small></div>
      </div>
      <div class="tr-grid">${TERMS_MAIN.map(([i, t, d], k) => `<div class="card card-pad tr-art"><span class="tr-n">${k + 1}</span><div class="tr-ic">${i}</div><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div>
      <div class="card card-pad" style="margin-top:14px">
        <h3 class="section-title">📋 بنود تكميلية</h3>
        <ol class="tr-more">${TERMS_MORE.map(([t, d]) => `<li><b>${esc(t)}:</b> ${esc(d)}</li>`).join('')}</ol>
      </div>
      <div class="card card-pad tr-me" style="margin-top:14px">
        ${ag ? `<h3 class="section-title">🪪 الحساب ديالي</h3>
          <div class="kv"><div><small>الرمز</small><b dir="ltr">${esc(ag.code || '')}</b></div><div><small>القانون</small><b>${ag.terms_at ? '✅ موافق ' + dAr(ag.terms_at) : '⏳ مازال'}</b></div><div><small>الاشتراك</small><b style="font-size:13.5px">${esc(si.txt)}</b></div></div>
          ${ag.terms_at ? '' : `<button class="btn gold" id="tr-ok" style="margin-top:12px">✅ قريت القانون ووافقت عليه</button>`}`
          : S.role === 'admin' ? '<p class="muted" style="margin:0">👑 المدير: الموافقة ديال كل مشترك والاشتراك كيبانو فـ «الإدارة» ديال كل خانة.</p>'
            : '<p class="muted" style="margin:0">دخل بالحساب ديالك (الإعدادات ← المزامنة السحابية) باش توافق على القانون وتشوف حالة الاشتراك.</p>'}
        <div class="btn-row" style="margin-top:12px">
          <button class="btn" id="tr-report">📣 بلّغ عن عملية</button>
          <a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/212777777959">${ic('wa', 16)} مكتب الوسيط 777</a>
          <a class="btn" href="${telLink(W777_OFFICE)}" dir="ltr">${ic('phone', 16)} ${W777_OFFICE}</a>
        </div>
      </div>
      ${groupsCard(true)}`;
    const ok = $('#tr-ok'); if (ok) ok.onclick = () => acceptTerms(() => viewTerms(sub));
    $('#tr-report').onclick = reportDeal;
    const gf = $('#grpf');
    if (gf) gf.onsubmit = async e => {
      e.preventDefault();
      const v = collect(gf), okUrl = u => !u || /^https:\/\/(chat\.whatsapp\.com|whatsapp\.com|wa\.me|t\.me|telegram\.me|(www\.|m\.|web\.)?facebook\.com|fb\.com)\//i.test(u);
      if (!okUrl(v.wa_group) || !okUrl(v.tg_group) || !okUrl(v.fb_group)) return toast('الرابط خاصو يبدا بـ https://chat.whatsapp.com/ ولا https://t.me/ ولا https://www.facebook.com/', 4000);
      try {
        await rq('/rest/v1/w777_agent_config?id=eq.1', 'PATCH', { wa_group: v.wa_group || null, tg_group: v.tg_group || null, fb_group: v.fb_group || null, updated_at: new Date().toISOString() }, 'return=minimal');
        AG.cfg = Object.assign({}, AG.cfg, { wa_group: v.wa_group || null, tg_group: v.tg_group || null, fb_group: v.fb_group || null });
        try { localStorage.setItem('w777_agent_cfg', JSON.stringify(AG.cfg)); } catch (er) { /* */ }
        toast('تحفظو الروابط ✓'); viewTerms(sub);
      } catch (er) { toast('تعذر: ' + er.message); }
    };
    if (sub === 'groups') setTimeout(() => { const g = $('#grp'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  }
  async function acceptTerms(after) {
    try {
      await rq(`/rest/v1/w777_agencies?uid=eq.${window.W777_SYNC.uid()}`, 'PATCH', { terms_at: new Date().toISOString() }, 'return=minimal');
      await refreshRole(true);
      toast('مرحبا بك فشبكة الوسيط 777 ✓ — 3 أشهر مجانية بدات اليوم', 3500);
      if (after) after();
    } catch (e) { toast('تعذر: ' + e.message, 4000); }
  }
  // قبل الدخول للشبكة: الموافقة على القانون (مرة وحدة)
  function termsGate() {
    main().innerHTML = `<div class="card card-pad tr-gate">
      <div class="tr-hero" style="box-shadow:none;border:0;padding:0;margin-bottom:12px"><img src="${LOGO}" alt="" class="tr-logo"><div><b>قبل ما تدخل لشبكة الوسيط 777</b><small>قرا البنود الأساسية ووافق عليها مرة وحدة</small></div></div>
      <ol class="tr-more">${TERMS_MAIN.map(([i, t, d]) => `<li><b>${i} ${esc(t)}:</b> ${esc(d)}</li>`).join('')}</ol>
      <label class="toggle-line" style="margin:12px 0"><input type="checkbox" id="tg-chk"> قريت <a href="#/terms">قانون التطبيق كامل</a> ووافقت عليه</label>
      <div class="btn-row"><button class="btn gold" id="tg-ok" disabled>✅ موافق — دخول للشبكة</button></div></div>`;
    $('#tg-chk').onchange = e => { $('#tg-ok').disabled = !e.target.checked; };
    $('#tg-ok').onclick = () => acceptTerms(() => route());
  }
  function reportDeal() {
    const me = S.agency || {};
    modal(`<h3>📣 التبليغ عن عملية</h3><form id="rd" class="form-grid">
        ${fSelect('type', 'نوع العملية', ['بيع', 'كراء', 'كراء موسمي', 'شراكة / تمويل', 'توثيق عقد', 'أشغال (مقاولة / تشطيب)', 'أخرى'], 'بيع', { noEmpty: true })}
        ${fInput('ref', 'مرجع العقار', '', { ph: 'W777-0012' })}
        ${fInput('parties', 'الأطراف', '', { cls: 'full', ph: 'مثال: الوكالة 012 (البائع) ↔ الوسيط W045 (المشتري)' })}
        ${fInput('amount', 'المبلغ (درهم)', '', { money: true })}${fInput('commission', 'العمولة (درهم)', '', { money: true })}
        ${fInput('date', 'التاريخ', today(), { type: 'date' })}
        ${fText('note', 'ملاحظات', '')}</form>
      <div class="btn-row" style="margin-top:12px"><button class="btn wa" id="rd-ok">${ic('wa', 16)} صيفط للمكتب</button></div>`, (box, close) => {
      bindMoney(box);
      $('#rd-ok', box).onclick = () => {
        const v = collect($('#rd', box));
        const t = ['📣 تبليغ عن عملية — الوسيط 777', `المشترك: ${myAgencyName()}${me.code ? ' (' + me.code + ')' : ''}`, `العملية: ${v.type}`, v.ref && `العقار: ${v.ref}`, v.parties && `الأطراف: ${v.parties}`,
          v.amount && `المبلغ: ${fmt(v.amount)} درهم`, v.commission && `العمولة: ${fmt(v.commission)} درهم`, `التاريخ: ${v.date}`, v.note && `ملاحظات: ${v.note}`].filter(Boolean).join('\n');
        window.open('https://wa.me/212777777959?text=' + encodeURIComponent(t), '_blank', 'noopener');
        close();
      };
    });
  }

  /* ---------- حالات المراجعة المشتركة ---------- */
  const MOD_ST = { pending: ['⏳ فانتظار المراجعة', 'gray'], approved: ['✅ منشور', 'green'], rejected: ['✖ مرفوض', 'red'], closed: ['🔒 مغلق', 'gray'],
    funded: ['💚 تمّ التمويل', 'green'], new: ['🆕 جديد', 'blue'], escalated: ['📨 محوّل للمكتب', 'gold'], in_progress: ['⚙️ فالمعالجة', 'blue'] };
  const stBadge = s => { const x = MOD_ST[s] || [s, 'gray']; return `<span class="badge ${x[1]}">${x[0]}</span>`; };
  function noteModal(title, cur, onOk) {
    modal(`<h3>${esc(title)}</h3><form id="nm" class="form-grid">${fText('note', 'ملاحظة (كيشوفها صاحب الطلب)', cur)}</form>
      <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="nm-ok">${ic('check', 16)} تأكيد</button></div>`, (box, close) => {
      $('#nm-ok', box).onclick = async () => { const v = collect($('#nm', box)); close(); await onOk(v.note || null); };
    });
  }
  const emptyCard = (big, title, txt) => `<div class="card empty" style="grid-column:1/-1"><div class="big">${big}</div><h3>${esc(title)}</h3>${txt ? `<p>${txt}</p>` : ''}</div>`;

  /* ============================================================
     المشاريع: كل مشترك ينشر مشروع باش يلقى التمويل (بعد موافقة المدير)
     ============================================================ */
  const PJ_CATS = ['مشروع سكني', 'مشروع تجاري', 'مشروع سياحي / فندقي', 'تجزئة وأراضي', 'مشروع فلاحي', 'مشروع صناعي / مستودعات', 'ترميم وإعادة تأهيل', 'أخرى'];
  const PJ_FUND = ['شراكة (حصة فالأرباح)', 'مساهمة فرأس المال', 'قرض / تمويل', 'بيع على التصميم (VEFA)', 'مستثمر واحد', 'أخرى'];
  /* ---------- ملفات المشاريع: صور (5)، PDF (5)، فيديو (2) — تخزين خاص، كيشوفوها غير أعضاء الشبكة ---------- */
  const PJ_LIM = { photo: 5, pdf: 5, video: 2 };
  const PJ_T = { photo: ['📷', 'صور'], pdf: ['📄', 'PDF'], video: ['🎬', 'فيديو'] };
  const pjLim = t => S.role === 'admin' ? Infinity : PJ_LIM[t];
  const fsz = n => !n ? '' : n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const uuid4 = () => crypto.randomUUID ? crypto.randomUUID() : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  const pjUrls = new Map();
  // روابط مؤقتة (ساعة) للملفات — كتطلب دفعة وحدة
  async function pjSign(paths) {
    const now = Date.now(), need = [...new Set(paths)].filter(p => { const c = pjUrls.get(p); return !c || now - c.at > 45 * 60000; });
    if (need.length) {
      const res = await rq('/storage/v1/object/sign/w777-projects', 'POST', { expiresIn: 3600, paths: need });
      const base = (window.W777_SYNC.account() || window.W777_SYNC.defaults()).url + '/storage/v1';
      (res || []).forEach(x => { if (x && x.signedURL) pjUrls.set(x.path, { u: base + x.signedURL, at: now }); });
    }
    return Object.fromEntries(paths.map(p => [p, (pjUrls.get(p) || {}).u || '']));
  }
  async function pjUpload(sid, file, t) {
    let body = file, type = file.type || '', ext = (String(file.name).split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
    if (t === 'photo') { body = (await compressImage(file, 1920, 0.82)).blob; type = 'image/jpeg'; ext = 'jpg'; }
    else if (t === 'pdf') { type = 'application/pdf'; ext = 'pdf'; }
    else if (!/^video\//.test(type)) type = ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4';
    if (body.size > 50 * 1048576) throw new Error(`«${file.name}» كبير بزاف (${fsz(body.size)}) — الحد الأقصى 50 MB`);
    const path = `${window.W777_SYNC.uid()}/${sid}/${uid()}.${ext || 'bin'}`;
    await window.W777_SYNC.request('/storage/v1/object/w777-projects/' + path, { method: 'POST', headers: { 'Content-Type': type }, body });
    return { p: path, n: String(file.name || '').slice(0, 120), t, s: body.size };
  }
  async function pjFilesModal(r) {
    const files = r.files || [];
    let urls;
    try { urls = await pjSign(files.map(f => f.p)); } catch (e) { toast('تعذر فتح الملفات: ' + e.message, 4000); return; }
    const of = t => files.filter(f => f.t === t);
    modal(`<div class="pair-head"><h3 style="margin:0">📎 ${esc(r.title)}</h3><button class="btn sm" data-close>✕</button></div>
      ${of('photo').length ? `<div class="pj-gal">${of('photo').map(f => `<a href="${esc(urls[f.p])}" target="_blank" rel="noopener"><img src="${esc(urls[f.p])}" alt="${esc(f.n)}" loading="lazy"></a>`).join('')}</div>` : ''}
      ${of('video').map(f => `<video class="pj-vid" src="${esc(urls[f.p])}" controls playsinline preload="metadata"></video>`).join('')}
      ${of('pdf').length ? `<div class="pj-docs">${of('pdf').map(f => `<a class="pj-doc" target="_blank" rel="noopener" href="${esc(urls[f.p])}"><span class="pj-doc-ic">PDF</span><b>${esc(f.n || 'ملف PDF')}</b><small>${fsz(f.s)}</small></a>`).join('')}</div>` : ''}
      ${files.length ? '' : '<p class="muted">ما كاين حتى ملف</p>'}`);
  }
  const pjCount = r => { const f = r.files || []; return ['photo', 'pdf', 'video'].map(t => [t, f.filter(x => x.t === t).length]).filter(x => x[1]); };
  async function viewProjects(parts, query) {
    if (!await netGate('المشاريع', '🚀')) return;
    const admin = S.role === 'admin', me = window.W777_SYNC.uid();
    const tabs = [['', '🚀 المشاريع المنشورة'], ['mine', '📁 مشاريعي'], ['new', '➕ نشر مشروع']];
    if (admin) tabs.push(['review', '🛡️ المراجعة']);
    const tab = pickTab(tabs, parts[1] || '', '');
    const head = secHead('🚀', 'المشاريع والتمويل', 'نشر المشروع العقاري ديالك باش تلقى المموّل ولا الشريك. كل مشروع كيبان للجميع غير من بعد موافقة مكتب الوسيط 777.', tabs, tab, 'projects');
    if (tab === 'new') return pjForm(head, query.id);
    let rows;
    try {
      const filter = tab === 'mine' ? `owner=eq.${me}` : tab === 'review' ? 'status=in.(pending,rejected)' : 'status=eq.approved';
      rows = await rq(`/rest/v1/w777_projects?select=*&${filter}&order=created_at.desc&limit=300`);
    } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    const total = rows.reduce((s, r) => s + (num(r.amount) || 0), 0);
    main().innerHTML = head + (tab === '' && rows.length ? `<div class="card card-pad" style="margin-bottom:14px"><div class="kv"><div><small>مشاريع منشورة</small><b>${rows.length}</b></div><div><small>مجموع التمويل المطلوب</small><b>${esc(millions(total) || fmt(total))} درهم</b></div></div></div>` : '') + `
      <div class="dir-grid">${rows.map(r => {
        const owner = r.owner === me;
        const msg = `السلام عليكم، شفت المشروع «${r.title}» (${refOf('PJ', r.id)}) فتطبيق الوسيط 777 وبغيت نعرف أكثر.`;
        const contact = r.phone || W777_OFFICE;
        const cover = (r.files || []).find(f => f.t === 'photo'), cnt = pjCount(r);
        return `<div class="card card-pad pj-card">
          ${cover ? `<button type="button" class="pj-cover" data-files="${r.id}"><img data-pjimg="${esc(cover.p)}" alt="">${cnt.length ? `<span>${cnt.map(([t, n]) => PJ_T[t][0] + ' ' + n).join(' · ')}</span>` : ''}</button>` : ''}
          <div class="btn-row" style="justify-content:space-between"><span class="badge gold">${esc(r.category || 'مشروع')}</span><span class="badge" dir="ltr">${refOf('PJ', r.id)}</span></div>
          <h3>${esc(r.title)}</h3>
          <div class="muted">📍 ${esc([r.city, r.country].filter(Boolean).join('، ') || '—')} · 👤 ${esc(r.owner_name || '—')}</div>
          ${num(r.amount) ? `<div class="pj-amt">💰 ${nm(r.amount)} درهم ${millions(r.amount) ? `<small>(${esc(millions(r.amount))})</small>` : ''}</div>` : ''}
          ${r.contribution ? `<div><span class="chip">🤝 ${esc(r.contribution)}</span></div>` : ''}
          ${r.description ? `<p class="dir-about">${esc(r.description)}</p>` : ''}
          ${cnt.length ? `<button type="button" class="pj-files-btn" data-files="${r.id}">📎 الملفات: ${cnt.map(([t, n]) => `${PJ_T[t][0]} ${n} ${PJ_T[t][1]}`).join(' · ')}</button>` : ''}
          ${tab !== '' ? `<div>${stBadge(r.status)}</div>` : ''}
          ${r.admin_note && (owner || admin) ? `<div class="mod-note">📝 ${esc(r.admin_note)}</div>` : ''}
          <div class="btn-row">
            ${tab === '' ? `<a class="btn sm" href="${telLink(contact)}">${ic('phone', 15)} اتصل</a><a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(contact)}?text=${encodeURIComponent(msg)}">${ic('wa', 15)} واتساب</a>` : ''}
            ${owner && r.status !== 'closed' ? `<a class="btn sm" href="#/projects/new?id=${r.id}">${ic('edit', 15)} تعديل</a><button class="btn sm" data-close-pj="${r.id}">🔒 إغلاق</button>` : ''}
            ${admin && r.status !== 'approved' ? `<button class="btn sm gold" data-ok="${r.id}">✅ نشر</button>` : ''}
            ${admin && r.status !== 'rejected' ? `<button class="btn sm" data-no="${r.id}">✖ رفض</button>` : ''}
            ${owner || admin ? `<button class="btn sm" data-del="${r.id}">${ic('trash', 15)}</button>` : ''}
          </div></div>`;
      }).join('') || (tab === 'mine' ? emptyCard('📁', 'مازال ما نشرتي حتى مشروع', '<a class="btn gold" href="#/projects/new">➕ نشر مشروع</a>')
        : tab === 'review' ? emptyCard('🛡️', 'ما كاين حتى مشروع فانتظار المراجعة', '') : emptyCard('🚀', 'مازال ما كاين حتى مشروع منشور', 'كن الأول! <a class="btn gold" href="#/projects/new">➕ نشر مشروع</a>'))}</div>`;
    $$('[data-files]').forEach(b => b.onclick = () => pjFilesModal(rows.find(r => r.id === b.dataset.files)));
    const covers = $$('[data-pjimg]');
    if (covers.length) pjSign(covers.map(i => i.dataset.pjimg)).then(u => covers.forEach(i => { i.src = u[i.dataset.pjimg]; })).catch(() => {});
    const patch = async (id, body, ok) => { try { await rq(`/rest/v1/w777_projects?id=eq.${id}`, 'PATCH', body); toast(ok); route(); } catch (e) { toast('تعذر: ' + e.message, 4000); } };
    $$('[data-ok]').forEach(b => b.onclick = () => patch(b.dataset.ok, { status: 'approved' }, 'تنشر ✓'));
    $$('[data-no]').forEach(b => b.onclick = () => noteModal('سبب الرفض', '', n => patch(b.dataset.no, { status: 'rejected', admin_note: n }, 'ترفض')));
    $$('[data-close-pj]').forEach(b => b.onclick = async () => { if (await confirmBox('إغلاق هاد المشروع؟', 'إغلاق', false)) patch(b.dataset.closePj, { status: 'closed' }, 'تسد ✓'); });
    $$('[data-del]').forEach(b => b.onclick = async () => {
      if (!await confirmBox('حذف المشروع نهائيا؟', 'حذف')) return;
      const r = rows.find(x => x.id === b.dataset.del), paths = ((r && r.files) || []).map(f => f.p);
      try { await rq(`/rest/v1/w777_projects?id=eq.${b.dataset.del}`, 'DELETE'); toast('تحذف'); route(); } catch (e) { toast('تعذر: ' + e.message); return; }
      if (paths.length) rq('/storage/v1/object/w777-projects', 'DELETE', { prefixes: paths }).catch(() => {});
    });
  }
  async function pjForm(head, id) {
    let r = {};
    if (id) { try { r = (await rq(`/rest/v1/w777_projects?id=eq.${id}&select=*`))[0] || {}; } catch (e) { /* */ } }
    main().innerHTML = head + `
      <div class="card card-pad form">
        <h3 class="section-title">${id ? '✏️ تعديل المشروع' : '➕ مشروع جديد'}</h3>
        <form id="pjf" class="form-grid">
          ${fInput('title', 'عنوان المشروع', r.title, { req: true, cls: 'full', ph: 'مثلا: إقامة سكنية 24 شقة فمكناس' })}
          ${fSelect('category', 'نوع المشروع', PJ_CATS, r.category || PJ_CATS[0], { noEmpty: true })}
          ${fInput('city', 'المدينة', r.city || S.settings.officeCity, { list: 'dl-cities' })}
          ${fInput('country', 'الدولة', r.country || 'المغرب')}
          ${fInput('amount', 'التمويل المطلوب (درهم)', r.amount, { money: true })}
          ${fSelect('contribution', 'نوع الشراكة', PJ_FUND, r.contribution || PJ_FUND[0], { noEmpty: true })}
          ${fInput('phone', 'هاتف التواصل', r.phone || myAgencyPhone(), { type: 'tel', hint: 'خليه خاوي إلا بغيتي التواصل يكون عبر المكتب' })}
          ${fText('description', 'وصف المشروع', r.description, { ph: 'الأرض، المساحة، الرخص، مدة الإنجاز، المردودية المتوقعة، الضمانات…' })}
        </form>
        <datalist id="dl-cities">${Object.values(CITY).map(c => `<option value="${esc(c.n)}">`).join('')}</datalist>
        <div class="pj-up">
          <b>📎 صور، ملفات PDF وفيديو</b>
          <small class="muted">${S.role === 'admin' ? 'المدير: بلا حد' : 'حتى 5 صور، 5 ملفات PDF و 2 فيديو'} · كل ملف حتى 50 MB · التصاميم، الرخص، دراسة الجدوى، صور الأرض، فيديو الورش…</small>
          <div class="btn-row">
            <label class="btn">📷 صور<input type="file" accept="image/*" multiple hidden data-up="photo"></label>
            <label class="btn">📄 PDF<input type="file" accept="application/pdf,.pdf" multiple hidden data-up="pdf"></label>
            <label class="btn">🎬 فيديو<input type="file" accept="video/*" multiple hidden data-up="video"></label>
          </div>
          <div class="pj-files" id="pj-files"></div>
        </div>
        <p class="muted" style="font-size:13px">🛡️ المشروع كيمشي لمكتب الوسيط 777 للمراجعة، ومن بعد الموافقة كيبان لجميع المشتركين. أي تعديل كيرجعو للمراجعة.</p>
        <div class="btn-row"><button class="btn gold" id="pj-save">${ic('check', 18)} ${id ? 'حفظ وإعادة الإرسال' : 'إرسال للمراجعة'}</button></div>
      </div>`;
    const sid = id || uuid4(), files = (r.files || []).slice(), removed = [];
    let busy = 0;
    const drawFiles = async () => {
      const el = $('#pj-files'); if (!el) return;
      el.innerHTML = files.map((f, i) => `<div class="pj-file ${f.up ? 'up' : ''}">
          ${f.t === 'photo' && !f.up ? `<img data-pjimg="${esc(f.p)}" alt="">` : `<span class="pj-file-ic">${f.up ? '⏳' : f.t === 'pdf' ? 'PDF' : '🎬'}</span>`}
          <div class="grow"><b>${esc(f.n || '')}</b><small class="muted">${f.up ? 'جاري الرفع…' : PJ_T[f.t][1] + ' · ' + fsz(f.s)}</small></div>
          ${f.up ? '' : `<button type="button" class="btn sm" data-rmf="${i}">✕</button>`}</div>`).join('')
        || '<p class="muted" style="margin:6px 0 0;font-size:13px">مازال ما زدتي حتى ملف — المشاريع اللي فيها صور وتصاميم كتجذب المموّلين أكثر.</p>';
      $$('[data-rmf]', el).forEach(b => b.onclick = () => { const [x] = files.splice(+b.dataset.rmf, 1); if (x && x.p) removed.push(x.p); drawFiles(); });
      const imgs = $$('[data-pjimg]', el);
      if (imgs.length) { try { const u = await pjSign(imgs.map(i => i.dataset.pjimg)); imgs.forEach(i => { i.src = u[i.dataset.pjimg]; }); } catch (e) { /* */ } }
    };
    drawFiles();
    $$('[data-up]').forEach(inp => inp.onchange = async e => {
      const t = inp.dataset.up;
      let list = Array.from(e.target.files); e.target.value = '';
      if (t === 'pdf') list = list.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
      const room = pjLim(t) - files.filter(f => f.t === t).length;
      if (room <= 0) return toast(`الحد الأقصى: ${PJ_LIM[t]} ${PJ_T[t][1]}`, 3000);
      if (list.length > room) { toast(`تزادو غير ${room} — الحد الأقصى ${PJ_LIM[t]} ${PJ_T[t][1]}`, 3000); list = list.slice(0, room); }
      for (const file of list) {
        const ph = { t, n: file.name, up: true };
        files.push(ph); busy++; drawFiles();
        try { Object.assign(ph, await pjUpload(sid, file, t)); delete ph.up; }
        catch (er) { files.splice(files.indexOf(ph), 1); toast('تعذر رفع الملف: ' + er.message, 4500); }
        busy--; drawFiles();
      }
    });
    $('#pj-save').onclick = async () => {
      const f = $('#pjf');
      if (!f.reportValidity()) return;
      if (busy) return toast('تسنّى حتى يكمل رفع الملفات ⏳', 3000);
      const v = collect(f);
      const body = { title: v.title, category: v.category, city: v.city || null, country: v.country || 'المغرب', amount: num(v.amount), contribution: v.contribution, phone: v.phone || null, description: v.description || null, owner_name: myAgencyName(),
        files: files.filter(x => x.p).map(({ p, n, t, s: sz }) => ({ p, n, t, s: sz })) };
      try {
        if (id) await rq(`/rest/v1/w777_projects?id=eq.${id}`, 'PATCH', body);
        else await rq('/rest/v1/w777_projects', 'POST', Object.assign({ id: sid }, body), 'return=minimal');
        if (removed.length) rq('/storage/v1/object/w777-projects', 'DELETE', { prefixes: removed }).catch(() => {});
        toast('تصيفط للمراجعة ✓', 3000);
        location.hash = '#/projects/mine';
      } catch (e) { toast('تعذر: ' + e.message, 4000); }
    };
  }

  /* ============================================================
     المناسبات العقارية (اللي فاتت والقادمة)
     ============================================================ */
  const EV_KINDS = ['معرض', 'صالون', 'مؤتمر', 'ملتقى', 'تكوين', 'أخرى'];
  async function viewEvents(parts) {
    if (!await netGate('المناسبات', '🎪')) return;
    const admin = S.role === 'admin';
    const tabs = [['', '📅 القادمة'], ['past', '🕘 اللي فاتت']];
    const tab = pickTab(tabs, parts[1] || '', '');
    const head = secHead('🎪', 'المناسبات العقارية', 'المعارض والصالونات والملتقيات العقارية فالمغرب والعالم — مكتب الوسيط 777 كيزيدها ويحدّثها، والجديد ديالها كيبان حتى فـ «الأخبار» كل نهار.', tabs, tab, 'events');
    const t = today();
    let rows;
    try {
      rows = await rq(tab === 'past'
        ? `/rest/v1/w777_events?select=*&or=(ends.lt.${t},and(ends.is.null,starts.lt.${t}))&order=starts.desc&limit=200`
        : `/rest/v1/w777_events?select=*&or=(ends.gte.${t},and(ends.is.null,starts.gte.${t}))&order=starts.asc&limit=200`);
    } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    const days = d => Math.round((new Date(d + 'T12:00:00') - new Date(t + 'T12:00:00')) / 864e5);
    main().innerHTML = head + (admin ? `<div class="btn-row" style="margin-bottom:12px"><button class="btn gold" id="ev-add">➕ زيد مناسبة</button></div>` : '') + `
      <div class="ev-list">${rows.map(e => {
        const d = e.starts ? new Date(e.starts + 'T12:00:00') : null, n = e.starts ? days(e.starts) : null;
        const live = e.starts && e.starts <= t && (e.ends || e.starts) >= t;
        return `<div class="card ev-card">
          <div class="ev-date">${d ? `<b>${d.getDate()}</b><small>${esc(d.toLocaleDateString('ar-MA', { month: 'short' }))}</small><small>${d.getFullYear()}</small>` : '<b>?</b>'}</div>
          <div class="grow">
            <div class="btn-row" style="gap:6px">${e.kind ? `<span class="badge gold">${esc(e.kind)}</span>` : ''}${live ? '<span class="badge green">🔴 دابا</span>' : n !== null && n > 0 ? `<span class="badge blue">باقي ${n} يوم</span>` : ''}${(e.country || 'المغرب') !== 'المغرب' ? `<span class="badge">🌍 ${esc(e.country)}</span>` : '<span class="badge">🇲🇦</span>'}</div>
            <h3>${esc(e.title)}</h3>
            <div class="muted">📍 ${esc([e.venue, e.city].filter(Boolean).join('، ') || '—')}${e.ends && e.ends !== e.starts ? ` · 🗓️ ${esc(dAr(e.starts))} ← ${esc(dAr(e.ends))}` : ''}</div>
            ${e.description ? `<p class="dir-about">${esc(e.description)}</p>` : ''}
            <div class="btn-row">${e.url ? `<a class="btn sm" target="_blank" rel="noopener" href="${safeUrl(e.url)}">🔗 التفاصيل</a>` : ''}
              ${admin ? `<button class="btn sm" data-ev="${e.id}">${ic('edit', 15)}</button><button class="btn sm" data-evdel="${e.id}">${ic('trash', 15)}</button>` : ''}</div>
          </div></div>`;
      }).join('') || emptyCard('🎪', tab === 'past' ? 'ما كاين حتى مناسبة فاتت' : 'ما كاين حتى مناسبة قادمة دابا', '')}</div>`;
    const edit = e => {
      e = e || {};
      modal(`<h3>${e.id ? '✏️ تعديل' : '➕ مناسبة جديدة'}</h3><form id="evf" class="form-grid">
        ${fInput('title', 'العنوان', e.title, { req: true, cls: 'full' })}${fSelect('kind', 'النوع', EV_KINDS, e.kind || 'معرض', { noEmpty: true })}
        ${fInput('starts', 'البداية', e.starts, { type: 'date' })}${fInput('ends', 'النهاية', e.ends, { type: 'date' })}
        ${fInput('city', 'المدينة', e.city)}${fInput('country', 'الدولة', e.country || 'المغرب')}${fInput('venue', 'المكان', e.venue)}
        ${fInput('url', 'الرابط', e.url, { attrs: 'dir="ltr"' })}${fText('description', 'الوصف', e.description)}</form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="evf-ok">${ic('check', 16)} حفظ</button></div>`, (box, close) => {
        $('#evf-ok', box).onclick = async () => {
          const f = $('#evf', box); if (!f.reportValidity()) return;
          const v = collect(f);
          const body = { title: v.title, kind: v.kind, starts: v.starts || null, ends: v.ends || null, city: v.city || null, country: v.country || 'المغرب', venue: v.venue || null, url: v.url || null, description: v.description || null, source: 'admin' };
          try {
            if (e.id) await rq(`/rest/v1/w777_events?id=eq.${e.id}`, 'PATCH', body); else await rq('/rest/v1/w777_events', 'POST', body, 'return=minimal');
            close(); toast('تم ✓'); route();
          } catch (er) { toast('تعذر: ' + er.message, 4000); }
        };
      });
    };
    const add = $('#ev-add'); if (add) add.onclick = () => edit();
    $$('[data-ev]').forEach(b => b.onclick = () => edit(rows.find(x => x.id === b.dataset.ev)));
    $$('[data-evdel]').forEach(b => b.onclick = async () => {
      if (!await confirmBox('حذف هاد المناسبة؟', 'حذف')) return;
      try { await rq(`/rest/v1/w777_events?id=eq.${b.dataset.evdel}`, 'DELETE'); route(); } catch (e) { toast('تعذر: ' + e.message); }
    });
  }

  /* ============================================================
     الأخبار العقارية: المغرب + العالم (كتتجدد أوتوماتيكيا كل نهار)
     ============================================================ */
  async function viewNews(parts) {
    if (!await netGate('الأخبار', '📰')) return;
    const tabs = [['', '🇲🇦 أخبار المغرب'], ['world', '🌍 أخبار العالم']];
    const tab = pickTab(tabs, parts[1] || '', '');
    const head = secHead('📰', 'الأخبار العقارية', 'آخر وأهم أخبار العقار فالمغرب وفالعالم — كتتجدد أوتوماتيكيا كل نهار من المصادر الإخبارية.', tabs, tab, 'news');
    let rows;
    try { rows = await rq(`/rest/v1/w777_news?select=*&scope=eq.${tab === 'world' ? 'world' : 'ma'}&order=published.desc.nullslast,created_at.desc&limit=150`); }
    catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    const last = rows.reduce((m, r) => r.created_at > m ? r.created_at : m, '');
    main().innerHTML = head + `
      <div class="card card-pad" style="margin-bottom:14px">
        <div class="form-grid">${fInput('nq', 'بحث فالأخبار', '', { ph: 'كراء، سكن، أسعار، قروض، مكناس…' })}</div>
        <div class="btn-row" style="margin-top:10px"><span class="muted" id="ncnt"></span>${last ? `<span class="muted">· آخر تحديث: ${esc(dAr(last))}</span>` : ''}
          <button class="btn sm" id="nw-up">🔄 تحديث دابا</button></div>
      </div>
      <div class="card" id="nlist"></div>`;
    const draw = () => {
      const t = tokens($('[name=nq]').value || '');
      const res = rows.filter(r => !t.length || hit(norm([r.title, r.summary, r.source].join(' ')), t));
      $('#ncnt').textContent = `${res.length} خبر`;
      $('#nlist').innerHTML = res.map(r => `<a class="list-row news-row" target="_blank" rel="noopener" href="${safeUrl(r.url)}" dir="auto">
        <div class="grow"><b>${esc(r.title)}</b>${r.summary ? `<p class="muted" style="margin:4px 0 0">${esc(r.summary)}</p>` : ''}
        <small class="muted">📰 ${esc(r.source || '')}${r.published ? ' · ' + esc(dAr(r.published)) : ''}</small></div><span class="muted">↗</span></a>`).join('')
        || '<div class="empty">الأخبار كتجمع… رجع من بعد شوية ولا ورك «تحديث دابا».</div>';
    };
    $('[name=nq]').addEventListener('input', draw);
    $('#nw-up').onclick = async e => {
      e.target.disabled = true; e.target.textContent = '⏳ …';
      try {
        const r = await (await window.W777_SYNC.request('/functions/v1/w777-news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
        toast(r && r.skipped ? 'الأخبار محدثة من قبل ✓' : `تزادو ${(r && r.added) || 0} خبر ✓`, 3000); route();
      } catch (er) { toast('تعذر: ' + er.message, 4000); e.target.disabled = false; e.target.textContent = '🔄 تحديث دابا'; }
    };
    draw();
  }

  /* ============================================================
     الهبة: حالات ديال ناس محتاجين للسكن (كراء/شراء/إصلاح)
     التبرع كيمر عبر مكتب الوسيط 777 اللي كيتأكد من كل حالة
     ============================================================ */
  const DN_NEED = { rent: '🔑 كراء سكن', buy: '🏠 شراء سكن', repair: '🛠️ إصلاح سكن', other: '🤲 حاجة أخرى' };
  async function viewDonations(parts) {
    if (!await netGate('الهبة', '🤲')) return;
    const admin = S.role === 'admin', me = window.W777_SYNC.uid();
    const tabs = [['', '🤲 الحالات'], ['new', '➕ اقترح حالة'], ['mine', '📁 اقتراحاتي']];
    if (admin) tabs.push(['review', '🛡️ المراجعة']);
    const tab = pickTab(tabs, parts[1] || '', '');
    const head = secHead('🤲', 'الهبة — سقف لكل عائلة', 'حالات ديال ناس محتاجين يكريو ولا يشريو ولا يصلحو السكن. التبرع كيدوز عبر مكتب الوسيط 777 اللي كيتأكد من كل حالة، والحالات كتبان بلا سمية ولا تصاور حفاظا على كرامة الناس.', tabs, tab, 'donations');
    if (tab === 'new') return dnForm(head);
    let rows;
    try {
      const filter = tab === 'mine' ? `owner=eq.${me}` : tab === 'review' ? 'status=in.(pending,rejected)' : 'status=in.(approved,funded)';
      rows = await rq(`/rest/v1/w777_donations?select=*&${filter}&order=created_at.desc&limit=300`);
    } catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    const raised = rows.reduce((s, r) => s + (num(r.raised) || 0), 0);
    main().innerHTML = head + (tab === '' ? `<div class="card card-pad dn-hero" style="margin-bottom:14px">
        <div class="kv"><div><small>حالات منشورة</small><b>${rows.length}</b></div><div><small>تمّ تمويلها</small><b>${rows.filter(r => r.status === 'funded').length}</b></div><div><small>مجموع المساهمات</small><b>${nm(raised)} درهم</b></div></div>
        <p class="muted" style="margin:10px 0 0;font-size:13px">💚 «ما نقص مال من صدقة». كل مساهمة كتوصل للمحتاج عن طريق المكتب، مع وصل.</p></div>` : '') + `
      <div class="dir-grid">${rows.map(r => {
        const pct = num(r.amount) ? Math.min(100, Math.round((num(r.raised) || 0) * 100 / num(r.amount))) : 0;
        const owner = r.owner === me, ref = refOf('HB', r.id);
        const msg = `السلام عليكم مكتب الوسيط 777، بغيت نساهم فالحالة ${ref} («${r.title}»).`;
        return `<div class="card card-pad pj-card">
          <div class="btn-row" style="justify-content:space-between"><span class="badge gold">${esc(DN_NEED[r.need] || DN_NEED.other)}</span><span class="badge" dir="ltr">${ref}</span></div>
          <h3>${esc(r.title)}</h3>
          ${r.city ? `<div class="muted">📍 ${esc(r.city)}</div>` : ''}
          ${r.story ? `<p class="dir-about">${esc(r.story)}</p>` : ''}
          ${num(r.amount) ? `<div class="dn-bar"><span style="width:${pct}%"></span></div><small class="muted">${nm(r.raised || 0)} / ${nm(r.amount)} درهم (${pct}%)</small>` : ''}
          ${tab !== '' || r.status === 'funded' ? `<div>${stBadge(r.status)}</div>` : ''}
          ${r.admin_note && (owner || admin) ? `<div class="mod-note">📝 ${esc(r.admin_note)}</div>` : ''}
          <div class="btn-row">
            ${tab === '' && r.status === 'approved' ? `<a class="btn sm gold" target="_blank" rel="noopener" href="https://wa.me/${waPhone(W777_OFFICE)}?text=${encodeURIComponent(msg)}">💚 ساهم عبر المكتب</a><a class="btn sm" href="${telLink(W777_OFFICE)}">${ic('phone', 15)}</a>` : ''}
            ${admin && r.status !== 'approved' && r.status !== 'funded' ? `<button class="btn sm gold" data-ok="${r.id}">✅ نشر</button>` : ''}
            ${admin && r.status === 'pending' ? `<button class="btn sm" data-no="${r.id}">✖ رفض</button>` : ''}
            ${admin && tab === '' ? `<button class="btn sm" data-raise="${r.id}">💰 المساهمات</button>` : ''}
            ${owner && r.status === 'pending' ? `<button class="btn sm" data-del="${r.id}">${ic('trash', 15)}</button>` : ''}
            ${admin ? `<button class="btn sm" data-del="${r.id}">${ic('trash', 15)}</button>` : ''}
          </div></div>`;
      }).join('') || (tab === 'mine' ? emptyCard('📁', 'مازال ما اقترحتي حتى حالة', '<a class="btn gold" href="#/donations/new">➕ اقترح حالة</a>')
        : tab === 'review' ? emptyCard('🛡️', 'ما كاين حتى حالة فانتظار المراجعة', '') : emptyCard('🤲', 'ما كاين حتى حالة منشورة دابا', 'تعرف شي عائلة محتاجة؟ <a class="btn gold" href="#/donations/new">➕ اقترح حالة</a>'))}</div>`;
    const patch = async (id, body, ok) => { try { await rq(`/rest/v1/w777_donations?id=eq.${id}`, 'PATCH', body); toast(ok); route(); } catch (e) { toast('تعذر: ' + e.message, 4000); } };
    $$('[data-ok]').forEach(b => b.onclick = () => patch(b.dataset.ok, { status: 'approved' }, 'تنشرات ✓'));
    $$('[data-no]').forEach(b => b.onclick = () => noteModal('سبب الرفض', '', n => patch(b.dataset.no, { status: 'rejected', admin_note: n }, 'ترفضات')));
    $$('[data-raise]').forEach(b => b.onclick = () => {
      const r = rows.find(x => x.id === b.dataset.raise);
      modal(`<h3>💰 ${esc(refOf('HB', r.id))}</h3><form id="rz" class="form-grid">${fInput('raised', 'المبلغ اللي توصل بيه المكتب (درهم)', r.raised, { money: true })}
        <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="funded" ${r.status === 'funded' ? 'checked' : ''}> 💚 تمّ التمويل</label></form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="rz-ok">${ic('check', 16)} حفظ</button></div>`, (box, close) => {
        $('#rz-ok', box).onclick = () => { const v = collect($('#rz', box)); close(); patch(r.id, { raised: num(v.raised) || 0, status: v.funded ? 'funded' : 'approved' }, 'تم ✓'); };
      });
    });
    $$('[data-del]').forEach(b => b.onclick = async () => {
      if (!await confirmBox('حذف هاد الحالة؟', 'حذف')) return;
      try { await rq(`/rest/v1/w777_donations?id=eq.${b.dataset.del}`, 'DELETE'); route(); } catch (e) { toast('تعذر: ' + e.message); }
    });
  }
  function dnForm(head) {
    main().innerHTML = head + `
      <div class="card card-pad form">
        <h3 class="section-title">➕ اقتراح حالة</h3>
        <form id="dnf" class="form-grid">
          ${fInput('title', 'عنوان قصير', '', { req: true, cls: 'full', ph: 'مثلا: أرملة مع 3 دراري محتاجة كراء 6 شهور' })}
          ${fSelect('need', 'نوع الحاجة', Object.entries(DN_NEED).map(([v, l]) => ({ v, l })), 'rent', { noEmpty: true })}
          ${fInput('city', 'المدينة', S.settings.officeCity, { list: 'dl-cities' })}
          ${fInput('amount', 'المبلغ المطلوب تقريبا (درهم)', '', { money: true })}
          ${fText('story', 'الحالة', '', { ph: 'شرح الحالة بلا سمية كاملة، بلا رقم الهاتف، وبلا تصاور.' })}
        </form>
        <datalist id="dl-cities">${Object.values(CITY).map(c => `<option value="${esc(c.n)}">`).join('')}</datalist>
        <p class="muted" style="font-size:13px">🔒 ماتكتبش السمية الكاملة ولا الهاتف ديال الشخص المحتاج — المكتب غادي يتواصل معاك نتا باش يتأكد من الحالة قبل النشر.</p>
        <div class="btn-row"><button class="btn gold" id="dn-save">${ic('check', 18)} إرسال للمكتب</button></div>
      </div>`;
    $('#dn-save').onclick = async () => {
      const f = $('#dnf'); if (!f.reportValidity()) return;
      const v = collect(f);
      try {
        await rq('/rest/v1/w777_donations', 'POST', { title: hideDigits(v.title), need: v.need, city: v.city || null, amount: num(v.amount), story: hideDigits(v.story || '') || null, owner_name: myAgencyName() }, 'return=minimal');
        toast('شكرا 💚 الحالة تصيفطات للمراجعة', 3000);
        location.hash = '#/donations/mine';
      } catch (e) { toast('تعذر: ' + e.message, 4000); }
    };
  }

  /* ============================================================
     النزاعات العقارية: توجيه قانوني أولي + تحويل للمختص عبر المكتب
     (معلومات عامة على القانون المغربي، ماشي استشارة قانونية رسمية)
     ============================================================ */
  const SPECIALISTS = ['محامي', 'موثق', 'عدول', 'محاسب', 'مستشار قانوني', 'مستشار عقاري'];
  const LAW = [
    { id: 'rent', ic: '🔑', t: 'الكراء السكني والمهني (كاري ما خلصش، الإفراغ، الزيادة فالسومة)',
      laws: ['القانون 67.12 المتعلق بعقود كراء المحلات المعدة للسكنى أو للاستعمال المهني', 'القانون 07.03 المتعلق بمراجعة أثمان الكراء', 'ظهير الالتزامات والعقود (ق.ل.ع)'],
      steps: ['جمع الوثائق: عقد الكراء (مكتوب وثابت التاريخ)، التواصيل، المراسلات.', 'محاولة الحل الودي برسالة مكتوبة.', 'إلا ما خلصش: توجيه إنذار بالأداء عن طريق مفوض قضائي.', 'إلا بقا المشكل: دعوى الأداء و/أو الإفراغ أمام المحكمة الابتدائية المختصة.', 'الزيادة فالسومة ماشي بالخاطر: خاصها تحترم المدة والنسبة اللي كيحددها القانون.'],
      sp: ['محامي', 'مستشار قانوني'] },
    { id: 'commercial', ic: '🏪', t: 'الكراء التجاري (الأصل التجاري، الإفراغ، التعويض)',
      laws: ['القانون 49.16 المتعلق بكراء العقارات أو المحلات المخصصة للاستعمال التجاري أو الصناعي أو الحرفي', 'مدونة التجارة (الأصل التجاري)'],
      steps: ['تأكد من مدة الاستغلال وواش العقد مكتوب.', 'الإفراغ كيكون بإنذار مكتوب ومعلّل، والمكتري غالبا كيستحق تعويض إلا فحالات محددة فالقانون.', 'ما توقّعش على تنازل ولا تخلي المحل قبل ما تستشير.', 'النزاع كيتشاف أمام المحكمة التجارية ولا الابتدائية حسب الحالة.'],
      sp: ['محامي', 'محاسب'] },
    { id: 'copro', ic: '🏢', t: 'الملكية المشتركة والسانديك (واجبات، أشغال، الأجزاء المشتركة)',
      laws: ['القانون 18.00 المتعلق بنظام الملكية المشتركة للعقارات المبنية، كما تم تغييره وتتميمه بالقانون 106.12'],
      steps: ['راجع نظام الملكية المشتركة ومحاضر الجمع العام.', 'القرارات كتّخذ فالجمع العام حسب الأغلبية اللي كيحددها القانون.', 'السانديك يقدر يطالب بالواجبات غير المؤداة قضائيا، والمالك يقدر يطعن فقرار غير قانوني.', 'وثّق كل شي (صور، رسائل، محاضر).'],
      sp: ['مستشار قانوني', 'محامي', 'محاسب'] },
    { id: 'inherit', ic: '👨‍👩‍👧', t: 'الإرث والشياع والقسمة (ملك مشترك بين الورثة)',
      laws: ['مدونة الأسرة (الميراث)', 'القانون 39.08 المتعلق بمدونة الحقوق العينية (الشياع، القسمة، الشفعة)'],
      steps: ['استخراج الإراثة (رسم الإرث) عند العدول.', 'إحصاء الأملاك وتحديد الوضعية القانونية (محفظ / غير محفظ).', 'القسمة كتكون رضائية بين الورثة، ولا قضائية إلا ما تفاهموش.', 'إلا شريك باع حصتو لأجنبي: الشركاء عندهم حق الشفعة فآجال قصيرة — تحرك بسرعة.'],
      sp: ['عدول', 'موثق', 'محامي'] },
    { id: 'sale', ic: '🤝', t: 'البيع والوعد بالبيع والعربون (التراجع، عدم إتمام البيع)',
      laws: ['ظهير الالتزامات والعقود (ق.ل.ع)', 'المادة 4 من مدونة الحقوق العينية 39.08: التصرفات الناقلة للملكية خاصها محرر رسمي (موثق/عدول) أو محرر ثابت التاريخ من محامي مقبول أمام محكمة النقض، تحت طائلة البطلان'],
      steps: ['راجع واش الاتفاق مكتوب، ومن حرّرو، وشروطو (الثمن، الأجل، العربون، الشرط الجزائي).', 'وجّه إنذار مكتوب للطرف الآخر باش ينفذ التزاماتو.', 'عقد البيع النهائي ديما عند موثق ولا عدول ولا محامي مؤهل.', 'إلا بقا النزاع: دعوى إتمام البيع ولا الفسخ مع التعويض.'],
      sp: ['موثق', 'محامي', 'عدول'] },
    { id: 'vefa', ic: '🏗️', t: 'الشراء من المنعش (التأخير فالتسليم، العيوب، البيع فطور الإنجاز)',
      laws: ['القانون 44.00 المتعلق ببيع العقار في طور الإنجاز، كما تم تغييره بالقانون 107.12', 'القانون 31.08 القاضي بتحديد تدابير لحماية المستهلك'],
      steps: ['جمع العقد الابتدائي، التواصيل، ودفتر التحملات.', 'تأكد من أجل التسليم المتفق عليه ومن الضمانات (استرجاع الأقساط).', 'وجّه إنذار للمنعش بالتسليم أو بإصلاح العيوب.', 'القانون كيعطي الحق فالتعويض عن التأخير وفي بعض الحالات فسخ العقد واسترجاع المبالغ.'],
      sp: ['محامي', 'موثق'] },
    { id: 'title', ic: '📜', t: 'التحفيظ العقاري والتعرضات والرسوم العقارية',
      laws: ['ظهير 12 غشت 1913 المتعلق بالتحفيظ العقاري، كما تم تغييره وتتميمه بالقانون 14.07'],
      steps: ['جيب شهادة الملكية من المحافظة العقارية وتأكد من التقييدات والرهون.', 'التعرض على مطلب تحفيظ كيكون داخل آجال محددة — ما تعطلش.', 'التقييد الاحتياطي كيحمي الحق ديالك مؤقتا.', 'النزاعات على مطلب التحفيظ كتحال على المحكمة.'],
      sp: ['مستشار عقاري', 'محامي', 'موثق'] },
    { id: 'build', ic: '🧱', t: 'البناء والجيران والحدود والرخص',
      laws: ['القانون 12.90 المتعلق بالتعمير', 'القانون 25.90 المتعلق بالتجزئات العقارية', 'القانون 66.12 المتعلق بمراقبة وزجر المخالفات في مجال التعمير والبناء'],
      steps: ['تأكد من رخصة البناء والتصميم المصادق عليه.', 'مشكل الحدود: خبرة طبوغرافية (مهندس مساح) قبل أي نزاع.', 'المخالفات كيتبلّغ عليها للسلطات المحلية / الجماعة.', 'الأضرار بين الجيران: محاولة صلح، ومن بعد دعوى مع خبرة.'],
      sp: ['مستشار عقاري', 'محامي'] },
    { id: 'tax', ic: '🧾', t: 'الضرائب والرسوم العقارية (الأرباح العقارية، التسجيل، الأراضي غير المبنية)',
      laws: ['المدونة العامة للضرائب (الضريبة على الأرباح العقارية، واجبات التسجيل)', 'القانون 47.06 المتعلق بجبايات الجماعات المحلية (الرسم على الأراضي الحضرية غير المبنية، رسم السكن والخدمات الجماعية)'],
      steps: ['جمع عقود الشراء والبيع وفواتير الأشغال (كتنقص من الربح الخاضع للضريبة).', 'احترم آجال التصريح والأداء باش تتجنب الغرامات.', 'كاين إعفاءات فحالات محددة (مثلا السكن الرئيسي بشروط).', 'لأي خلاف مع الإدارة الضريبية: طلب مراجعة / تظلم داخل الآجال.'],
      sp: ['محاسب', 'مستشار قانوني'] },
    { id: 'commission', ic: '💼', t: 'عمولة الوسيط / السمسرة (العمولة ما تخلصاتش)',
      laws: ['ظهير الالتزامات والعقود (ق.ل.ع) — أحكام السمسرة'],
      steps: ['الأحسن ديما: تفويض مكتوب (عقد وكالة/سمسرة) فيه نسبة العمولة.', 'العمولة كتستحق ملي البيع ولا الكراء كيتم بسبب الوساطة ديالك — جمع الأدلة (رسائل، زيارات، شهود).', 'وجّه إنذار مكتوب بالأداء.', 'إلا بقا: أمر بالأداء ولا دعوى أمام المحكمة.'],
      sp: ['محامي', 'مستشار قانوني'] },
    { id: 'expro', ic: '🏛️', t: 'نزع الملكية للمنفعة العامة',
      laws: ['القانون 7.81 المتعلق بنزع الملكية لأجل المنفعة العامة وبالاحتلال المؤقت'],
      steps: ['تابع مقرر التخلي المنشور وتأكد من الأجزاء المعنية.', 'قدّم ملاحظاتك داخل الأجل فالبحث الإداري.', 'إلا ما قبلتيش التعويض المقترح: المحكمة الإدارية كتحدد التعويض.', 'جمع الأدلة على قيمة العقار (عقود مماثلة، خبرة).'],
      sp: ['محامي', 'مستشار عقاري'] },
    { id: 'other', ic: '❓', t: 'مشكل آخر',
      laws: ['حسب طبيعة المشكل'],
      steps: ['اكتب المشكل بالتفصيل (التواريخ، الأطراف، الوثائق اللي عندك).', 'استعمل «🤖 سول المساعد» لتوجيه أولي.', 'حوّل الملف للمكتب باش يوجهك للمختص المناسب.'],
      sp: ['مستشار قانوني', 'مستشار عقاري'] },
  ];
  const lawOf = id => LAW.find(x => x.id === id) || LAW[LAW.length - 1];
  const lawCard = L => `<div class="card card-pad law-card">
      <h3 style="margin-top:0">${L.ic} ${esc(L.t)}</h3>
      <b>📚 الإطار القانوني</b><ul>${L.laws.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <b>🧭 الخطوات المقترحة</b><ol>${L.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <div><b>👨‍⚖️ المختص المناسب:</b> ${L.sp.map(x => `<span class="chip">${esc(x)}</span>`).join(' ')}</div>
      <p class="muted law-disc">⚠️ هادشي توجيه عام على القانون المغربي، ماشي استشارة قانونية رسمية. الآجال والتفاصيل كتختلف حسب كل حالة — للحالات المعقدة حوّل الملف لمكتب الوسيط 777.</p>
    </div>`;
  function escalateModal(d, done) {
    const L = lawOf(d.category);
    modal(`<h3>📨 تحويل الملف للمختص عبر مكتب الوسيط 777</h3><form id="esc" class="form-grid">
      ${fSelect('specialist', 'شكون المختص اللي بغيتي؟', SPECIALISTS, d.specialist || L.sp[0], { noEmpty: true })}
      ${fInput('phone', 'الهاتف ديالك باش يتصل بيك المكتب', d.phone || myAgencyPhone(), { type: 'tel', req: true })}</form>
      <p class="muted" style="font-size:13px">المكتب غادي يراجع الملف ويتصل بيك باش يوجهك للمختص (محامي، موثق، عدول، محاسب، مستشار قانوني ولا عقاري).</p>
      <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="esc-ok">📨 حوّل الملف</button></div>`, (box, close) => {
      $('#esc-ok', box).onclick = async () => {
        const f = $('#esc', box); if (!f.reportValidity()) return;
        const v = collect(f);
        try {
          await rq(`/rest/v1/w777_disputes?id=eq.${d.id}`, 'PATCH', { status: 'escalated', specialist: v.specialist, phone: v.phone });
          close();
          const msg = `السلام عليكم مكتب الوسيط 777، حوّلت ليكم الملف ${refOf('NZ', d.id)} («${d.title}») وبغيت ${v.specialist}.`;
          modal(`<h3>✅ تحوّل الملف ${esc(refOf('NZ', d.id))}</h3><p>المكتب غادي يتصل بيك. تقدر تسرّع بواتساب:</p>
            <div class="btn-row"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(W777_OFFICE)}?text=${encodeURIComponent(msg)}">${ic('wa', 16)} واتساب المكتب</a></div>`);
          if (done) done();
        } catch (e) { toast('تعذر: ' + e.message, 4000); }
      };
    });
  }
  const askAgent = d => {
    const text = `عندي مشكل عقاري (${lawOf(d.category).t}) فـ ${d.city || 'المغرب'}: ${d.title}. ${d.description || ''}\nعطيني توجيه قانوني أولي حسب القانون المغربي: شنو الحقوق ديالي، شنو الخطوات، وشكون المختص اللي خاصني.`;
    if (!AG.open) agOpen();
    agSend(text);
  };
  async function viewDisputes(parts) {
    if (!await netGate('النزاعات', '⚖️')) return;
    const admin = S.role === 'admin', me = window.W777_SYNC.uid();
    const tabs = [['', '⚖️ مشكل جديد'], ['mine', '📁 ملفاتي'], ['guide', '📚 الدليل القانوني']];
    if (admin) tabs.push(['all', '🛡️ كل الملفات']);
    const tab = pickTab(tabs, parts[1] || '', '');
    const head = secHead('⚖️', 'النزاعات العقارية', 'كتب المشكل العقاري ديالك وخود توجيه قانوني أولي فالحين. والنزاعات المستعصية كيحوّلها مكتب الوسيط 777 للمختص: محامي، موثق، عدول، محاسب، مستشار قانوني ولا عقاري.', tabs, tab, 'disputes');
    if (tab === 'guide') {
      main().innerHTML = head + `<div class="law-grid">${LAW.filter(L => L.id !== 'other').map(lawCard).join('')}</div>`;
      return;
    }
    if (tab === '') {
      main().innerHTML = head + `
        <div class="grid-2">
          <div class="card card-pad form">
            <h3 class="section-title">📝 وصف المشكل</h3>
            <form id="dsf" class="form-grid">
              ${fSelect('category', 'نوع المشكل', LAW.map(L => ({ v: L.id, l: L.ic + ' ' + L.t })), 'rent', { noEmpty: true, cls: 'full' })}
              ${fInput('title', 'عنوان قصير', '', { req: true, cls: 'full', ph: 'مثلا: المكتري ما خلصش 5 شهور' })}
              ${fInput('city', 'المدينة', S.settings.officeCity, { list: 'dl-cities' })}
              ${fInput('phone', 'الهاتف (اختياري)', myAgencyPhone(), { type: 'tel' })}
              ${fText('description', 'شرح المشكل', '', { ph: 'شنو وقع؟ إمتى؟ شنو الوثائق اللي عندك (عقد، تواصيل، شهادة الملكية…)؟' })}
            </form>
            <datalist id="dl-cities">${Object.values(CITY).map(c => `<option value="${esc(c.n)}">`).join('')}</datalist>
            <p class="muted" style="font-size:12.5px">🔒 الملف ديالك سري: كيشوفو غير نتا ومكتب الوسيط 777.</p>
            <div class="btn-row"><button class="btn gold" id="ds-save">⚖️ عطيني الحل القانوني</button></div>
          </div>
          <div id="ds-guide">${lawCard(LAW[0])}</div>
        </div>`;
      $('#dsf [name=category]').onchange = e => { $('#ds-guide').innerHTML = lawCard(lawOf(e.target.value)); };
      $('#ds-save').onclick = async () => {
        const f = $('#dsf'); if (!f.reportValidity()) return;
        const v = collect(f);
        try {
          const d = (await rq('/rest/v1/w777_disputes', 'POST', { category: v.category, title: v.title, description: v.description || null, city: v.city || null, phone: v.phone || null, owner_name: myAgencyName() }, 'return=representation'))[0];
          main().innerHTML = head + `
            <div class="card card-pad" style="margin-bottom:14px;border-color:var(--gold)"><b>✅ تسجل الملف ${esc(refOf('NZ', d.id))}</b>
              <p class="muted" style="margin:6px 0">هاهو التوجيه القانوني الأولي. إلا كان المشكل معقد، حوّلو للمختص عبر المكتب.</p>
              <div class="btn-row"><button class="btn gold" id="ds-esc">📨 حوّل للمختص</button><button class="btn" id="ds-ai">🤖 سول المساعد الذكي</button><a class="btn" href="#/disputes/mine">📁 ملفاتي</a></div></div>
            ${lawCard(lawOf(d.category))}`;
          $('#ds-esc').onclick = () => escalateModal(d, () => { location.hash = '#/disputes/mine'; });
          $('#ds-ai').onclick = () => askAgent(d);
        } catch (e) { toast('تعذر: ' + e.message, 4000); }
      };
      return;
    }
    let rows;
    try { rows = await rq(`/rest/v1/w777_disputes?select=*${tab === 'mine' ? `&owner=eq.${me}` : ''}&order=updated_at.desc&limit=300`); }
    catch (e) { main().innerHTML = head + `<div class="card card-pad">تعذر التحميل: ${esc(e.message)}</div>`; return; }
    const cnt = s => rows.filter(r => r.status === s).length;
    main().innerHTML = head + (tab === 'all' ? `<div class="card card-pad" style="margin-bottom:14px"><div class="kv">
        <div><small>جديدة</small><b>${cnt('new')}</b></div><div><small>محوّلة للمكتب</small><b>${cnt('escalated')}</b></div><div><small>فالمعالجة</small><b>${cnt('in_progress')}</b></div><div><small>مغلقة</small><b>${cnt('closed')}</b></div></div></div>` : '') + `
      <div class="dir-grid">${rows.map(d => {
        const L = lawOf(d.category);
        return `<div class="card card-pad pj-card">
          <div class="btn-row" style="justify-content:space-between">${stBadge(d.status)}<span class="badge" dir="ltr">${refOf('NZ', d.id)}</span></div>
          <h3>${L.ic} ${esc(d.title)}</h3>
          <div class="muted">${esc(L.t)}${d.city ? ' · 📍 ' + esc(d.city) : ''}${tab === 'all' ? ` · 👤 ${esc(d.owner_name || '—')}` : ''}</div>
          ${d.description ? `<p class="dir-about">${esc(d.description)}</p>` : ''}
          ${d.specialist ? `<div>👨‍⚖️ <b>${esc(d.specialist)}</b></div>` : ''}
          ${tab === 'all' && d.phone ? `<div><a href="${telLink(d.phone)}" dir="ltr">${esc(d.phone)}</a></div>` : ''}
          ${d.admin_note ? `<div class="mod-note">💬 رد المكتب: ${esc(d.admin_note)}</div>` : ''}
          <small class="muted">🗓️ ${esc(dAr(d.created_at))}</small>
          <div class="btn-row">
            <button class="btn sm" data-guide="${d.id}">📚 التوجيه</button>
            ${tab === 'mine' && d.status === 'new' ? `<button class="btn sm gold" data-esc="${d.id}">📨 حوّل للمختص</button>` : ''}
            ${tab === 'mine' ? `<button class="btn sm" data-ai="${d.id}">🤖</button>` : ''}
            ${tab === 'mine' && d.status !== 'closed' ? `<button class="btn sm" data-cl="${d.id}">🔒 إغلاق</button>` : ''}
            ${tab === 'all' ? `<button class="btn sm gold" data-adm="${d.id}">⚙️ معالجة</button>${d.phone ? `<a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(d.phone)}?text=${encodeURIComponent('السلام عليكم، مكتب الوسيط 777 بخصوص الملف ' + refOf('NZ', d.id))}">${ic('wa', 15)}</a>` : ''}` : ''}
            ${tab === 'mine' || admin ? `<button class="btn sm" data-del="${d.id}">${ic('trash', 15)}</button>` : ''}
          </div></div>`;
      }).join('') || (tab === 'mine' ? emptyCard('📁', 'ما عندك حتى ملف', '<a class="btn gold" href="#/disputes">⚖️ مشكل جديد</a>') : emptyCard('🛡️', 'ما كاين حتى ملف', ''))}</div>`;
    const byId = id => rows.find(x => x.id === id);
    const patch = async (id, body, ok) => { try { await rq(`/rest/v1/w777_disputes?id=eq.${id}`, 'PATCH', body); toast(ok); route(); } catch (e) { toast('تعذر: ' + e.message, 4000); } };
    $$('[data-guide]').forEach(b => b.onclick = () => modal(lawCard(lawOf(byId(b.dataset.guide).category))));
    $$('[data-esc]').forEach(b => b.onclick = () => escalateModal(byId(b.dataset.esc), route));
    $$('[data-ai]').forEach(b => b.onclick = () => askAgent(byId(b.dataset.ai)));
    $$('[data-cl]').forEach(b => b.onclick = async () => { if (await confirmBox('إغلاق الملف؟ (تحل المشكل)', 'إغلاق', false)) patch(b.dataset.cl, { status: 'closed' }, 'تسد ✓'); });
    $$('[data-del]').forEach(b => b.onclick = async () => {
      if (!await confirmBox('حذف الملف نهائيا؟', 'حذف')) return;
      try { await rq(`/rest/v1/w777_disputes?id=eq.${b.dataset.del}`, 'DELETE'); route(); } catch (e) { toast('تعذر: ' + e.message); }
    });
    $$('[data-adm]').forEach(b => b.onclick = () => {
      const d = byId(b.dataset.adm);
      modal(`<h3>⚙️ ${esc(refOf('NZ', d.id))}</h3><form id="dsa" class="form-grid">
        ${fSelect('status', 'الحالة', ['new', 'escalated', 'in_progress', 'closed'].map(s => ({ v: s, l: MOD_ST[s][0] })), d.status, { noEmpty: true })}
        ${fSelect('specialist', 'المختص', SPECIALISTS, d.specialist || '', {})}
        ${fText('admin_note', 'رد المكتب (كيشوفو صاحب الملف)', d.admin_note)}</form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="dsa-ok">${ic('check', 16)} حفظ</button></div>`, (box, close) => {
        $('#dsa-ok', box).onclick = () => { const v = collect($('#dsa', box)); close(); patch(d.id, { status: v.status, specialist: v.specialist || null, admin_note: v.admin_note || null }, 'تم ✓'); };
      });
    });
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
          let fs = withVideos ? p.files : p.files.filter(f => !isVideoFile(f));
          let nPh = 0; fs = fs.filter(f => isVideoFile(f) || ++nPh <= photoLimit());
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
          S.props.push(obj); dropMatches();
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
      ',"properties":', JSON.stringify(S.props), ',"requests":', JSON.stringify(S.reqs), ',"appointments":', JSON.stringify(S.appts), ',"meta":', JSON.stringify(meta), ',"files":['];
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
    const choice = await new Promise(res => modal(`<h3>استيراد ${data.properties.length} عقار و ${data.requests.length} طلب${(data.appointments || []).length ? ' و ' + data.appointments.length + ' موعد' : ''}</h3>
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
    if (choice === 'replace') { await Promise.all(['properties', 'requests', 'appointments', 'files', 'meta'].map(s => DB.clear(s))); urlCache.clear(); }
    const newer = (a, b) => !b || (a.updatedAt || '') >= (b.updatedAt || '');
    for (const p of data.properties) { const cur = await DB.get('properties', p.id); if (choice === 'replace' || newer(p, cur)) { await DB.put('properties', p); await DB.markDirty('properties', p.id); } }
    for (const r of data.requests) { const cur = await DB.get('requests', r.id); if (choice === 'replace' || newer(r, cur)) { await DB.put('requests', r); await DB.markDirty('requests', r.id); } }
    for (const a of data.appointments || []) { const cur = await DB.get('appointments', a.id); if (choice === 'replace' || newer(a, cur)) { await DB.put('appointments', a); await DB.markDirty('appointments', a.id); } }
    for (const m of data.meta || []) {
      if (choice === 'replace') { if (!m.key.startsWith('sync_')) { await DB.put('meta', m); if (['settings', 'customDistricts', 'ledger', 'leases'].includes(m.key)) await DB.markDirty('meta', m.key); } continue; }
      const cur = await DB.get('meta', m.key);
      // المالية وعقود الكراء: دمج عنصر بعنصر (الأحدث كيبقى)
      if (['ledger', 'leases'].includes(m.key) && Array.isArray(m.value)) {
        const map = new Map(((cur && cur.value) || []).map(x => [x.id, x]));
        m.value.forEach(x => { const c = map.get(x.id); if (!c || (x.updatedAt || '') > (c.updatedAt || '')) map.set(x.id, x); });
        await DB.put('meta', { key: m.key, value: Array.from(map.values()) }); await DB.markDirty('meta', m.key);
        continue;
      }
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
    el.innerHTML = `<div class="logo-pill" style="height:84px"><img src="${LOGO}" alt="الوسيط 777"></div><h2 style="margin:0">${esc(title)}</h2>
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
    return new Promise(res => {
      pinPad('أدخل الرمز السري', async code => { const ok = (await hash(code)) === stored; if (ok) res(); return ok; });
      if (!bioOn()) return;
      // البصمة / Face ID: زر فوق لوحة الأرقام (ومحاولة أوتوماتيكية)
      const el = $$('.lock').pop(); if (!el) return;
      const b = document.createElement('button'); b.className = 'btn gold bio-btn'; b.textContent = '🔐 الدخول بالبصمة / Face ID';
      const go = async () => { if (await bioCheck()) { el.remove(); res(); } };
      b.onclick = go; $('.dots', el).after(b); setTimeout(go, 300);
    });
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
    applyMotion();
  }
  // ⚡ الوضع الخفيف: Safari ديال الماك كيطيح فالرسم مع الضباب والحركات الدايمة (الشاشة كتكحل/تبيض)
  function isMacSafari() {
    const ua = navigator.userAgent || '';
    return /Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua) && !(navigator.maxTouchPoints > 1);
  }
  function motionMode() { try { return localStorage.getItem('w777_motion') || 'auto'; } catch (e) { return 'auto'; } }
  function applyMotion() {
    const m = motionMode();
    document.documentElement.classList.toggle('lv-lite', m === 'lite' || (m === 'auto' && isMacSafari()));
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

  // شريط المدن المغربية المشاركة فالشريط العلوي (كيتحرك من اليسار لليمين)
  function setupCityTicker() {
    const tr = $('#ct-track'); if (!tr) return;
    // المدن الكبرى أولا (بالترتيب اللي طلب المدير)، من بعد باقي المدن بلا تكرار
    const top = ['الدار البيضاء', 'الرباط', 'مراكش', 'فاس', 'طنجة', 'أكادير', 'مكناس', 'وجدة', 'تطوان', 'القنيطرة', 'صفي', 'تمارة', 'إنزكان', 'آيت ملول', 'سلا', 'المحمدية', 'خريبكة', 'بني ملال', 'الجديدة', 'تازة', 'الناظور', 'سطات', 'القصر الكبير', 'العرائش', 'الخميسات', 'تيزنيت', 'برشيد', 'كلميم', 'بركان', 'الراشيدية', 'تارودانت', 'سيدي قاسم', 'خنيفرة', 'وزان', 'الحسيمة', 'شفشاون', 'الصويرة', 'إفران', 'ورزازات'];
    const same = { 'آسفي': 'صفي', 'الرشيدية': 'الراشيدية' };
    const names = [...new Set([...top, ...D.REGIONS.flatMap(r => r.cities.map(c => same[c.n] || c.n))])];
    // الشريط كيمشي من اليسار لليمين: كنقلبو الترتيب باش المدن كيدخلو بالترتيب ديال اللائحة،
    // وكنبداو الحركة من النقطة اللي كتبين «الدار البيضاء» حدا الشعار (على اليمين) من أول لحظة
    const one = names.slice().reverse().map(n => `<span>📍 ${esc(n)}</span>`).join('');
    tr.innerHTML = `<div class="ct-set">${one}</div><div class="ct-set">${one}</div>`;
    const dur = Math.max(60, names.length * 3);
    tr.style.animationDuration = dur + 's';
    requestAnimationFrame(() => { const setW = tr.firstChild.offsetWidth, vw = tr.parentElement.offsetWidth; if (setW && vw) tr.style.animationDelay = -(Math.min(1, vw * 0.9 / setW) * dur).toFixed(2) + 's'; });
  }
  function setupFab() {
    const fab = $('#fab');
    const menu = $('#fab-menu');
    fab.onclick = e => { e.stopPropagation(); menu.classList.toggle('hidden'); };
    const st = $('[data-act="story"]', menu);
    if (st) st.onclick = e => { e.preventDefault(); menu.classList.add('hidden'); storyComposer(); };
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

  /* ============================================================
     اللغات — ترجمة تلقائية للواجهة عبر Google Translate
     ============================================================ */
  const LANGS = [
    ['ar', 'العربية', '🇲🇦'], ['fr', 'Français', '🇫🇷'], ['en', 'English', '🇬🇧'],
    ['es', 'Español', '🇪🇸'], ['it', 'Italiano', '🇮🇹'], ['de', 'Deutsch', '🇩🇪'],
    ['nl', 'Nederlands', '🇳🇱'], ['pt-PT', 'Português', '🇵🇹'], ['da', 'Dansk', '🇩🇰'],
    ['ru', 'Русский', '🇷🇺'], ['zh-CN', '中文', '🇨🇳'], ['ko', '한국어', '🇰🇷'],
    ['hi', 'हिन्दी', '🇮🇳'], ['ur', 'اردو', '🇵🇰'], ['pa-Arab', 'پنجابی · Pakistan', '🇵🇰'],
    ['fa', 'فارسی', '🇮🇷'], ['iw', 'עברית', '🇮🇱'],
    ['ber-Latn', 'Tacelḥit · Soussi', 'ⵣ'], ['ber', 'ⵜⴰⵛⵍⵃⵉⵜ · Tifinagh', 'ⵣ']
  ];
  const RTL_LANGS = ['ar', 'ur', 'pa-Arab', 'fa', 'iw'];
  const LANG_SHORT = { 'pt-PT': 'PT', 'zh-CN': 'ZH', 'pa-Arab': 'PA', iw: 'HE', 'ber-Latn': 'ⵣ', ber: 'ⵣ' };
  function curLang() {
    const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/;]*\/([^;]+)/);
    const c = m ? decodeURIComponent(m[1]) : 'ar';
    return LANGS.some(l => l[0] === c) ? c : 'ar';
  }
  function setLangCookie(code) {
    const host = location.hostname, exp = code === 'ar' ? '; expires=Thu, 01 Jan 1970 00:00:00 GMT' : '; max-age=31536000';
    const v = code === 'ar' ? '' : `/ar/${code}`;
    document.cookie = `googtrans=${v}; path=/${exp}`;
    if (host.includes('.')) document.cookie = `googtrans=${v}; path=/; domain=.${host}${exp}`;
  }
  function paintLang(code) {
    const el = $('#lang-code');
    if (el) el.textContent = LANG_SHORT[code] || code.slice(0, 2).toUpperCase();
    document.documentElement.dir = RTL_LANGS.includes(code) ? 'rtl' : 'ltr';
    document.documentElement.classList.toggle('tr-on', code !== 'ar');
  }
  let gtLoading = null;
  function loadGT() {
    if (gtLoading) return gtLoading;
    gtLoading = new Promise((res, rej) => {
      window.w777InitTranslate = () => {
        try {
          new window.google.translate.TranslateElement({ pageLanguage: 'ar', autoDisplay: false }, 'gt-el');
          res();
        } catch (e) { rej(e); }
      };
      const sc = document.createElement('script');
      sc.src = 'https://translate.google.com/translate_a/element.js?cb=w777InitTranslate';
      sc.async = true;
      sc.onerror = () => { gtLoading = null; rej(new Error('gt')); };
      document.head.appendChild(sc);
    });
    return gtLoading;
  }
  // تغيير اللغة عبر قائمة Google المخفية (بدون إعادة تحميل الصفحة)
  function gtCombo(code, tries = 40) {
    const sel = document.querySelector('#gt-el select.goog-te-combo');
    if (sel && sel.options.length > 1) {
      sel.value = code;
      sel.dispatchEvent(new Event('change'));
      return;
    }
    if (tries > 0) setTimeout(() => gtCombo(code, tries - 1), 250);
  }
  function setLang(code) {
    const prev = curLang();
    if (code === prev) return;
    setLangCookie(code);
    try { localStorage.setItem('w777_lang', code); } catch (e) { /* */ }
    if (code === 'ar') { location.reload(); return; }
    paintLang(code);
    if (!navigator.onLine) { toast('🌐 الترجمة تحتاج الاتصال بالإنترنت'); return; }
    loadGT().then(() => gtCombo(code)).catch(() => toast('⚠️ تعذر تحميل خدمة الترجمة، حاول لاحقا'));
  }
  function langPicker() {
    const cur = curLang();
    modal(`<div class="notranslate" translate="no">
      <h3 class="lang-h">🌐 اللغة · Langue · Language</h3>
      <div class="lang-grid">${LANGS.map(([c, n, f]) => `<button class="lang-opt${c === cur ? ' on' : ''}" data-lang="${c}"><span class="lf">${f}</span><span class="ln" dir="auto">${esc(n)}</span></button>`).join('')}</div>
      <p class="lang-note">الترجمة تلقائية عبر Google · Traduction automatique par Google</p>
      <div class="btn-row" style="justify-content:flex-end"><button class="btn" data-close>✕</button></div></div>`,
    (m, close) => {
      m.classList.add('lang-modal');
      m.addEventListener('click', e => {
        const b = e.target.closest('[data-lang]');
        if (!b) return;
        close(); setLang(b.dataset.lang);
      });
    });
  }
  function setupLang() {
    const b = $('#btn-lang');
    if (b) b.onclick = langPicker;
    const code = curLang();
    paintLang(code);
    if (code !== 'ar') loadGT().catch(() => { /* بدون إنترنت: تبقى الواجهة بالعربية */ });
  }

  /* ============================================================
     تأثير 3D فكل ضغطة: العنصر كيتميّل نحو بلاصة الصبع وكيغطس شوية، ومن بعد كيرجع بنابض
     ============================================================ */
  /* ============================================================
     أدوات الوكيل: حاسبة القرض، العرض للزبون، العلامة المائية، الملصق الإعلاني
     ============================================================ */
  const SCRIPTS = {};
  const loadScript = src => SCRIPTS[src] || (SCRIPTS[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res;
    s.onerror = () => { delete SCRIPTS[src]; rej(new Error('تعذر تحميل الأداة — تأكد من الإنترنت')); };
    document.head.appendChild(s);
  }));
  const loadCss = href => { if (!$(`link[href="${href}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); } };
  const offName = () => myAgencyName() || S.settings.officeName;
  const offPhone = () => myAgencyPhone() || S.settings.officePhone || '';
  // أهم المواصفات (المساحة + الغرف…) لنص قصير
  function propSpecs(p, max = 4) {
    const s = p.specs || {}, out = [];
    const a = areaOf(p); if (a) out.push(['📐', fmtRaw(a) + ' م²']);
    [['bedrooms', '🛏️', 'غرف'], ['rooms', '🚪', 'غرف'], ['salons', '🛋️', 'صالون'], ['bathrooms', '🛁', 'حمام'], ['floor', '🏢', 'الطابق'], ['levels', '🏠', '']].forEach(([k, e, l]) => {
      if (out.length >= max || s[k] == null || s[k] === '') return;
      if (k === 'rooms' && s.bedrooms) return;
      out.push([e, k === 'floor' ? 'الطابق ' + s[k] : s[k] + (l ? ' ' + l : '')]);
    });
    return out.slice(0, max);
  }

  /* ---------- 🏦 حاسبة القرض البنكي ---------- */
  function loanCalc(v) {
    const price = num(v.price) || 0, downPct = num(v.down) == null ? 20 : num(v.down), years = num(v.years) || 20;
    const rate = num(v.rate) == null ? 4.5 : num(v.rate), ins = num(v.ins) == null ? 0.3 : num(v.ins);
    const principal = Math.max(0, price * (1 - downPct / 100));
    const n = years * 12, r = rate / 100 / 12;
    const pay = !principal ? 0 : r ? principal * r / (1 - Math.pow(1 + r, -n)) : principal / n;
    const insM = principal * ins / 100 / 12;
    const yearly = [];
    let bal = principal;
    for (let y = 1; y <= years; y++) {
      let ip = 0, pp = 0;
      for (let m = 0; m < 12; m++) { const i = bal * r; ip += i; pp += pay - i; bal = Math.max(0, bal - (pay - i)); }
      yearly.push({ y, ip, pp, bal });
    }
    return { price, downPct, down: price - principal, principal, n, years, rate, pay, insM, monthly: pay + insM, interest: pay * n - principal, insTot: insM * n, income: (pay + insM) / 0.4, yearly };
  }
  function donut(parts) {
    const tot = parts.reduce((s, x) => s + x[1], 0) || 1;
    let a0 = -Math.PI / 2;
    const arcs = parts.map(([, v, c]) => {
      const a1 = a0 + v / tot * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a, rr) => [60 + rr * Math.cos(a), 60 + rr * Math.sin(a)].map(x => x.toFixed(2)).join(' ');
      const d = v >= tot ? `M60 6 A54 54 0 1 1 59.99 6 L59.99 26 A34 34 0 1 0 60 26 Z` : `M${p(a0, 54)} A54 54 0 ${big} 1 ${p(a1, 54)} L${p(a1, 34)} A34 34 0 ${big} 0 ${p(a0, 34)} Z`;
      a0 = a1; return v ? `<path d="${d}" fill="${c}"><animate attributeName="opacity" from="0" to="1" dur=".6s"/></path>` : '';
    });
    return `<svg viewBox="0 0 120 120" width="150" height="150" class="ln-donut">${arcs.join('')}</svg>`;
  }
  /* ---------- ✨ إصنع إعلانا: تطبيق «صانع الإعلانات» داخل التطبيق، مربوط بالعقارات ----------
     العقار كيتصيفط للاستوديو (postMessage) ملي كيقول «w777-studio-ready»: المعلومات + حتى 5 صور */
  const STUDIO_URL = 'https://al-wasset-777.vercel.app/studio';
  const STUDIO_ORIGIN = new URL(STUDIO_URL).origin;
  let studioProp = null, studioSent = false;
  window.addEventListener('message', e => {
    if (e.origin !== STUDIO_ORIGIN || !e.data || e.data.type !== 'w777-studio-ready') return;
    const fr = $('#studio-frame');
    if (!fr || e.source !== fr.contentWindow || !studioProp || studioSent) return;
    studioSent = true;
    studioPayload(studioProp).then(m => fr.contentWindow.postMessage(m, STUDIO_ORIGIN)).catch(() => { studioSent = false; });
  });
  function studioType(t) {
    const c = (TYPE[t] || {}).cat;
    if (/villa|bungalow|palace|chalet/.test(t)) return 'Villa';
    if (t === 'riad' || t === 'traditional_house') return 'Riad';
    if (/office|plateau/.test(t)) return 'Bureau';
    if (t === 'farm' || t === 'haouz_house') return 'Ferme';
    return { apartment: 'Appartement', room: 'Appartement', house: 'Maison', land: 'Terrain', agri: 'Terrain', commercial: 'Local Commercial', industrial: 'Local Commercial', building: 'Immeuble', tourism: 'Immeuble' }[c] || '';
  }
  // المميزات ديالنا ← الأسماء اللي كيعرف الاستوديو (والباقي كيدوز كيف ما هو)
  const STUDIO_FEAT = [[/مصعد/, 'مصعد'], [/مرآب|باركينغ|موقف/, 'موقف سيارات'], [/شرفة|بالكون|تيراس/, 'شرفة'], [/مسبح/, 'مسبح'], [/حديقة|مساحات خضراء/, 'حديقة'], [/مفروش/, 'مفروشة'], [/محفظة|رسوم عقارية/, 'وثائق قانونية جاهزة'], [/مطبخ/, 'مطبخ مجهز'], [/مدفأة|شوميني|تدفئة/, 'تدفئة مركزية']];
  async function studioPayload(p) {
    const s = p.specs || {}, trx = p.transaction;
    const feats = [];
    (p.features || []).forEach(f => { const m = STUDIO_FEAT.find(([re]) => re.test(f)); const v = m ? m[1] : f; if (!feats.includes(v)) feats.push(v); });
    const v = p.priceMax || p.priceMin;
    const data = {
      deal: trx === 'rent' ? 'location' : (trx === 'rent_furnished' || trx === 'seasonal') ? 'meuble' : 'vente',
      type: studioType(p.type), headline: '',
      city: p.city || '', district: p.district || '',
      surface: Math.round(areaOf(p) || 0), surfaceMax: 0,
      bedrooms: num(s.bedrooms) || num(s.rooms) || 0, bathrooms: num(s.bathrooms) || 0,
      price: v ? fmtRaw(v) + ' ' + (p.priceUnit || 'درهم') : '',
      features: feats.slice(0, 8), extras: [],
    };
    const ph = (p.media || []).filter(m => m.kind === 'photo'), cv = coverOf(p);
    if (cv) { ph.splice(ph.indexOf(cv), 1); ph.unshift(cv); }
    const photos = (await Promise.all(ph.slice(0, 5).map(m => getBlob(m.id, false).then(b => b || getBlob(m.id, true)).catch(() => null)))).filter(Boolean);
    return { type: 'w777-prefill', v: 1, ref: p.ref || '', data, photos };
  }
  function viewAdMaker(query) {
    const p = query.p ? S.props.find(x => x.id === query.p) : null;
    studioProp = p; studioSent = false;
    main().innerHTML = `
      <div class="page-head studio-head"><div><h1>✨ إصنع إعلانا</h1><div class="sub">${p ? `🏠 ${esc(p.ref || '')} — ${esc(p.title || typeAr(p.type))} <span class="muted">(المعلومات والصور كيتعمرو بوحدهم)</span>` : 'ختار عقار باش تتعمر المعلومات والصور بوحدهم، ولا عمّرهم بيدك'}</div></div>
        <div class="btn-row"><button class="btn sm" id="st-pick">🏠 ${p ? 'بدّل العقار' : 'ختار عقار'}</button><a class="btn sm" href="${STUDIO_URL}" target="_blank" rel="noopener">↗ فتح فصفحة جديدة</a></div></div>
      <iframe id="studio-frame" class="studio-frame" src="${STUDIO_URL}?embed=w777" title="صانع الإعلانات" allow="clipboard-read; clipboard-write; web-share; fullscreen"></iframe>`;
    $('#st-pick').onclick = () => studioPick();
  }
  function studioPick() {
    const list = S.props.filter(x => !x.deleted).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    if (!list.length) return toast('مازال ما كاين حتى عقار — زيد عقار أولا');
    modal(`<h3>🏠 ختار العقار</h3><input id="stp-q" type="search" placeholder="مرجع، حي، نوع…" style="width:100%;margin-bottom:10px"><div id="stp-l" style="max-height:60vh;overflow:auto"></div>`, (box, close) => {
      const paint = () => {
        const q = $('#stp-q', box).value.trim().toLowerCase();
        $('#stp-l', box).innerHTML = list.filter(x => !q || [x.ref, x.title, typeAr(x.type), x.district, x.city].join(' ').toLowerCase().includes(q)).slice(0, 60)
          .map(x => `<a class="list-row" href="#/ad-maker?p=${encodeURIComponent(x.id)}" data-close><div class="grow"><b>${esc(x.title || typeAr(x.type))}</b><div class="muted" style="font-size:12.5px">${esc(x.ref || '')} · ${esc([x.district, x.city].filter(Boolean).join('، '))} · ${esc(priceText(x).replace(/[⁦⁩]/g, ''))}</div></div></a>`).join('') || '<p class="muted">ما كاين والو</p>';
        $$('#stp-l a', box).forEach(a => a.addEventListener('click', () => close()));
      };
      $('#stp-q', box).oninput = paint; paint();
    });
  }
  function viewLoan(query) {
    const pre = { price: num(query.price) || '', down: 20, years: 20, rate: 4.5, ins: 0.3 };
    main().innerHTML = `
      <div class="page-head"><div><h1>🏦 حاسبة القرض البنكي</h1><div class="sub">القسط الشهري، الفوائد، والدخل اللازم باش البنك يوافق</div></div></div>
      <div class="detail-grid">
        <div class="card card-pad form"><form id="lf" class="form-grid" onsubmit="return false">
          ${fInput('price', 'ثمن العقار (درهم)', pre.price, { money: true, cls: 'full' })}
          ${fInput('down', 'التسبيق (%)', pre.down, { type: 'number', hint: 'عادة 10% حتى 30%' })}
          ${fSelect('years', 'مدة القرض', [5, 7, 10, 12, 15, 20, 25, 30].map(y => ({ v: y, l: y + ' عام' })), pre.years, { noEmpty: true })}
          ${fInput('rate', 'نسبة الفائدة السنوية (%)', pre.rate, { type: 'number', hint: 'الأبناك فالمغرب: تقريبا 4% حتى 6%' })}
          ${fInput('ins', 'التأمين على الحياة (% فالعام)', pre.ins, { type: 'number' })}
        </form>
        <p class="muted" style="font-size:12px;margin:12px 0 0">⚠️ حساب تقريبي للتوجيه فقط — العرض النهائي كيعطيه البنك.</p></div>
        <div id="lres"></div>
      </div>
      <div class="card" id="ltab" style="margin-top:16px"></div>`;
    bindMoney(main());
    const form = $('#lf');
    const draw = () => {
      const L = loanCalc(collect(form));
      if (!L.price) { $('#lres').innerHTML = `<div class="card empty"><div class="big">🏦</div><h3>دخل ثمن العقار</h3><p>غادي نحسبو القسط الشهري مباشرة.</p></div>`; $('#ltab').innerHTML = ''; return; }
      const M = n => fmt(Math.round(n));
      $('#lres').innerHTML = `<div class="card card-pad ln-card">
        <div class="ln-top"><div><small>القسط الشهري</small><b class="ln-big">${M(L.monthly)} <span>درهم</span></b><small class="muted">منها ${M(L.insM)} د تأمين · لمدة ${L.years} عام</small></div>
          ${donut([['المبلغ', L.principal, 'var(--gold)'], ['الفوائد', L.interest, '#e9c46a'], ['التأمين', L.insTot, '#8a8a8a']])}</div>
        <div class="ln-leg"><span><i style="background:var(--gold)"></i> المبلغ المقترض</span><span><i style="background:#e9c46a"></i> الفوائد</span><span><i style="background:#8a8a8a"></i> التأمين</span></div>
        <div class="kv" style="margin-top:14px">
          <div><small>التسبيق (${L.downPct}%)</small><b>${M(L.down)} د</b></div>
          <div><small>مبلغ القرض</small><b>${M(L.principal)} د</b></div>
          <div><small>مجموع الفوائد</small><b>${M(L.interest)} د</b></div>
          <div><small>التكلفة الإجمالية للقرض</small><b>${M(L.principal + L.interest + L.insTot)} د</b></div>
          <div><small>الدخل الشهري اللازم (القسط ≤ 40%)</small><b style="color:var(--green)">${M(L.income)} د</b></div>
          <div><small>مصاريف التسجيل والموثق (تقريبا)</small><b>${M(L.price * 0.075)} د</b></div>
        </div>
        <div class="btn-row" style="margin-top:14px"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`🏦 محاكاة قرض — ${offName()}\nثمن العقار: ${fmtRaw(L.price)} د\nالتسبيق: ${fmtRaw(Math.round(L.down))} د (${L.downPct}%)\nمبلغ القرض: ${fmtRaw(Math.round(L.principal))} د\nالمدة: ${L.years} عام · الفائدة ${L.rate}%\n➡️ القسط الشهري: ${fmtRaw(Math.round(L.monthly))} د\nالدخل اللازم: ${fmtRaw(Math.round(L.income))} د/شهر\n📞 ${offPhone()}`)}">${ic('wa', 16)} صيفط للزبون</a></div></div>`;
      $('#ltab').innerHTML = `<div class="pair-head"><b>📅 جدول السداد عام بعام</b></div><div class="ln-rows">${L.yearly.map(x => `<div class="list-row"><b style="width:64px">العام ${x.y}</b>
        <div class="grow"><div class="ln-bar"><i style="width:${(x.pp / (x.pp + x.ip) * 100).toFixed(1)}%"></i></div><small class="muted">رأس المال ${M(x.pp)} · الفوائد ${M(x.ip)}</small></div><small>الباقي <b>${M(x.bal)}</b></small></div>`).join('')}</div>`;
    };
    $$('input, select', form).forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', debounce(draw, 120)));
    draw();
  }

  /* ---------- 💧 العلامة المائية ---------- */
  let LOGO_IMG = null;
  const logoImg = () => LOGO_IMG || (LOGO_IMG = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = LOGO; }));
  async function watermark(blob, force) {
    if (!force && S.settings.watermark === false) return blob;
    try {
      await fontsReady();
      const bmp = await decodeImage(blob);
      const w = bmp.naturalWidth || bmp.width, h = bmp.naturalHeight || bmp.height;
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.drawImage(bmp, 0, 0, w, h); if (bmp.close) bmp.close();
      const u = Math.min(w, h);
      // كتابة شفافة فالوسط
      x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 9); x.globalAlpha = .16; x.fillStyle = '#fff';
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = Math.max(1, u * .003);
      x.font = `900 ${Math.round(u * .11)}px Tajawal, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl';
      x.strokeText('الوسيط 777', 0, 0); x.fillText('الوسيط 777', 0, 0); x.restore();
      // الشعار + الهاتف فالركن
      const lg = await logoImg(), m = Math.round(u * .03);
      if (lg) { const lw = Math.round(u * .2), lh = Math.round(lw * lg.height / lg.width); x.globalAlpha = .92; x.drawImage(lg, m, h - lh - m, lw, lh); x.globalAlpha = 1;
        const ph = offPhone(); if (ph) { x.font = `800 ${Math.round(u * .035)}px Tajawal, sans-serif`; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = u * .01; x.textBaseline = 'bottom'; x.direction = 'ltr'; x.fillText('☎ ' + ph, m + lw + m * .6, h - m * 1.2); } }
      return await new Promise(r => c.toBlob(b => r(b || blob), 'image/jpeg', .9));
    } catch (e) { return blob; }
  }
  const fontsReady = () => (document.fonts && document.fonts.load ? Promise.all(['400 20px Tajawal', '700 20px Tajawal', '800 20px Tajawal', '900 20px Tajawal'].map(f => document.fonts.load(f, 'الوسيط 777'))).catch(() => {}) : Promise.resolve());

  /* ---------- 📺 العرض للزبون (شاشة كاملة) ---------- */
  async function presentProp(p) {
    const photos = (p.media || []).filter(m => m.kind === 'photo');
    const cv = coverOf(p); if (cv) { photos.splice(photos.indexOf(cv), 1); photos.unshift(cv); }
    const specs = propSpecs(p, 5);
    const el = document.createElement('div');
    el.className = 'pres';
    el.innerHTML = `<div class="pres-slides">${photos.length ? photos.map((m, i) => `<div class="pres-slide${i ? '' : ' on'}"><img data-pid="${m.id}" alt=""></div>`).join('') : `<div class="pres-slide on pres-empty"><img src="${LOGO}" alt=""></div>`}</div>
      <div class="pres-shade"></div>
      <div class="pres-top"><img src="${LOGO}" alt="" class="pres-logo"><span class="pres-trx">${esc(trxShort(p.transaction) || trxAr(p.transaction))}</span>
        <span class="grow"></span><span class="pres-count"></span><button class="pres-x" aria-label="إغلاق">✕</button></div>
      <div class="pres-info">
        <div class="pres-price">${esc(priceText(p))}</div>
        <h2>${esc(p.title || typeAr(p.type))}</h2>
        <div class="pres-loc">📍 ${esc([p.district, p.city].filter(Boolean).join('، '))}</div>
        <div class="pres-specs">${specs.map(([e, t]) => `<span>${e} ${esc(t)}</span>`).join('')}</div>
        ${(p.features || []).length ? `<div class="pres-feat">${p.features.slice(0, 8).map(f => `<span>✓ ${esc(f)}</span>`).join('')}</div>` : ''}
        <div class="pres-office">${esc(offName())} · <span dir="ltr">${esc(offPhone())}</span></div>
      </div>
      <button class="pres-nav prev" aria-label="السابق">‹</button><button class="pres-nav next" aria-label="التالي">›</button>
      <div class="pres-dots">${photos.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>`;
    document.body.appendChild(el);
    try { if (el.requestFullscreen) await el.requestFullscreen(); } catch (e) { /* */ }
    $$('[data-pid]', el).forEach(async (img, i) => { const u = await fileUrl(img.dataset.pid, false) || await fileUrl(img.dataset.pid, true); if (u) img.src = u; });
    const slides = $$('.pres-slide', el), dots = $$('.pres-dots i', el);
    let cur = 0, timer = null;
    const show = i => {
      cur = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('on', k === cur)); dots.forEach((d, k) => d.classList.toggle('on', k === cur));
      $('.pres-count', el).textContent = slides.length > 1 ? `${cur + 1} / ${slides.length}` : '';
    };
    const play = () => { clearInterval(timer); if (slides.length > 1) timer = setInterval(() => show(cur + 1), 6000); };
    const close = () => { clearInterval(timer); document.removeEventListener('keydown', key); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); el.remove(); };
    const key = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') { show(cur + 1); play(); } else if (e.key === 'ArrowRight') { show(cur - 1); play(); } };
    document.addEventListener('keydown', key);
    document.addEventListener('fullscreenchange', function fc() { if (!document.fullscreenElement && el.isConnected && el.dataset.fs) close(); if (document.fullscreenElement === el) el.dataset.fs = 1; if (!el.isConnected) document.removeEventListener('fullscreenchange', fc); });
    $('.pres-x', el).onclick = close;
    $('.pres-nav.next', el).onclick = () => { show(cur + 1); play(); };
    $('.pres-nav.prev', el).onclick = () => { show(cur - 1); play(); };
    let sx = null;
    el.addEventListener('pointerdown', e => { sx = e.clientX; });
    el.addEventListener('pointerup', e => { if (sx == null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) { show(cur + (d < 0 ? 1 : -1)); play(); } });
    el.addEventListener('click', e => { if (e.target.closest('.pres-info')) el.classList.toggle('pres-min'); });
    show(0); play();
  }

  /* ---------- 🖼️ الملصق الإعلاني + QR ---------- */
  const POSTER_FMT = { post: [1080, 1350, '📱 منشور 4:5'], square: [1080, 1080, '⬛ مربع'], story: [1080, 1920, '📲 ستوري'] };
  function wrapText(x, text, maxW, maxLines) {
    const words = String(text || '').split(/\s+/), lines = [];
    let line = '';
    words.forEach(w => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] += '…'; }
    return lines;
  }
  function rrect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  async function imgOf(id) { const b = await getBlob(id, false) || await getBlob(id, true); if (!b) return null; try { return await decodeImage(b); } catch (e) { return null; } }
  function drawCover(x, im, a, b, w, h) {
    const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height, k = Math.max(w / iw, h / ih);
    const sw = w / k, sh = h / k; x.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, a, b, w, h);
  }
  async function posterCanvas(p, kind) {
    const [W, H] = POSTER_FMT[kind] || POSTER_FMT.post;
    await fontsReady();
    await loadScript('vendor/qrcode.js');
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#0b0b0b'; x.fillRect(0, 0, W, H);
    const photos = (p.media || []).filter(m => m.kind === 'photo'); const cv = coverOf(p);
    if (cv) { photos.splice(photos.indexOf(cv), 1); photos.unshift(cv); }
    const ims = (await Promise.all(photos.slice(0, 3).map(m => imgOf(m.id)))).filter(Boolean);
    const foot = 210, PH = Math.round(H * (kind === 'story' ? .52 : kind === 'square' ? .5 : .55));
    if (ims[0]) drawCover(x, ims[0], 0, 0, W, PH);
    else { const g = x.createLinearGradient(0, 0, W, PH); g.addColorStop(0, '#2a0a10'); g.addColorStop(1, '#111'); x.fillStyle = g; x.fillRect(0, 0, W, PH); const lg = await logoImg(); if (lg) x.drawImage(lg, W / 2 - 220, PH / 2 - 220 * lg.height / lg.width, 440, 440 * lg.height / lg.width); }
    // صور صغيرة
    if (ims.length > 1 && kind !== 'square') ims.slice(1).forEach((im, i) => {
      const tw = 250, th = 170, tx = 40, ty = PH - (th + 24) * (ims.length - 1 - i) - 10 - th / 2;
      x.save(); rrect(x, tx - 6, ty - 6, tw + 12, th + 12, 22); x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 24; x.fill(); x.restore();
      x.save(); rrect(x, tx, ty, tw, th, 16); x.clip(); drawCover(x, im, tx, ty, tw, th); x.restore();
    });
    const g = x.createLinearGradient(0, PH * .55, 0, PH); g.addColorStop(0, 'rgba(11,11,11,0)'); g.addColorStop(1, 'rgba(11,11,11,1)'); x.fillStyle = g; x.fillRect(0, PH * .55, W, PH * .45 + 2);
    // الشعار + نوع العملية
    const lg = await logoImg();
    if (lg) { const lw = 230, lh = lw * lg.height / lg.width; x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 20; x.drawImage(lg, 40, 40, lw, lh); x.restore(); }
    x.direction = 'rtl'; x.textAlign = 'right'; x.textBaseline = 'alphabetic';
    const trx = trxShort(p.transaction) || trxAr(p.transaction);
    x.font = '900 46px Tajawal, sans-serif'; const tw = x.measureText(trx).width + 64;
    const rg = x.createLinearGradient(W - 40 - tw, 0, W - 40, 0); rg.addColorStop(0, '#c8102e'); rg.addColorStop(1, '#e63946');
    x.save(); x.shadowColor = 'rgba(200,16,46,.6)'; x.shadowBlur = 30; rrect(x, W - 40 - tw, 44, tw, 84, 42); x.fillStyle = rg; x.fill(); x.restore();
    x.fillStyle = '#fff'; x.fillText(trx, W - 72, 102);
    // الثمن والعنوان
    let y = PH + (kind === 'square' ? 30 : 60);
    x.font = '900 82px Tajawal, sans-serif'; x.fillStyle = '#f3d27a';
    x.fillText(priceText(p), W - 60, y); y += 30; // الأرقام معزولة (\u2066…\u2069) باش ما تتقلبش
    if (p.negotiable) { x.font = '700 30px Tajawal, sans-serif'; x.fillStyle = '#bbb'; x.fillText('قابل للتفاوض', W - 60, y + 14); y += 20; }
    x.font = '800 52px Tajawal, sans-serif'; x.fillStyle = '#fff';
    wrapText(x, p.title || typeAr(p.type), W - 120, kind === 'square' ? 1 : 2).forEach(l => { y += 66; x.fillText(l, W - 60, y); });
    x.font = '500 36px Tajawal, sans-serif'; x.fillStyle = '#c9c9c9'; y += 58;
    x.fillText('📍 ' + [p.district, p.city].filter(Boolean).join('، '), W - 60, y);
    // المواصفات
    const sp = propSpecs(p, 4); y += 40;
    if (sp.length && y + 80 < H - foot) {
      x.font = '700 32px Tajawal, sans-serif'; let cx = W - 60;
      sp.forEach(([e, t]) => { const s = e + ' ' + t, w = x.measureText(s).width + 44; if (cx - w < 40) return;
        rrect(x, cx - w, y, w, 64, 32); x.fillStyle = 'rgba(255,255,255,.1)'; x.fill(); x.strokeStyle = 'rgba(243,210,122,.45)'; x.lineWidth = 2; x.stroke();
        x.fillStyle = '#fff'; x.fillText(s, cx - 22, y + 43); cx -= w + 16; });
    }
    // الأسفل: المكتب + الهاتف + QR
    const fy = H - foot, fg = x.createLinearGradient(0, fy, W, H); fg.addColorStop(0, '#8f0b21'); fg.addColorStop(1, '#c8102e');
    x.fillStyle = fg; x.fillRect(0, fy, W, foot);
    x.fillStyle = 'rgba(243,210,122,.9)'; x.fillRect(0, fy, W, 5);
    const qrUrl = p.catalog && syOn() ? catalogUrl(p.id) : `https://wa.me/${waPhone(offPhone())}?text=${encodeURIComponent('مهتم بالعقار ' + (p.ref || ''))}`;
    const q = window.qrcode(0, 'M'); q.addData(qrUrl); q.make();
    const qn = q.getModuleCount(), qs = 160, cell = qs / qn, qx = 40, qy = fy + (foot - qs) / 2;
    x.fillStyle = '#fff'; rrect(x, qx - 10, qy - 10, qs + 20, qs + 20, 14); x.fill(); x.fillStyle = '#111';
    for (let r = 0; r < qn; r++) for (let k = 0; k < qn; k++) if (q.isDark(r, k)) x.fillRect(qx + k * cell, qy + r * cell, Math.ceil(cell), Math.ceil(cell));
    x.fillStyle = '#fff'; x.font = '800 40px Tajawal, sans-serif';
    x.fillText(wrapText(x, offName(), W - 330, 1)[0], W - 50, fy + 70);
    x.font = '900 58px Tajawal, sans-serif'; x.direction = 'ltr'; x.textAlign = 'right';
    x.fillText('☎ ' + offPhone(), W - 50, fy + 140);
    x.direction = 'rtl'; x.font = '500 26px Tajawal, sans-serif'; x.fillStyle = 'rgba(255,255,255,.85)';
    x.fillText((p.catalog && syOn() ? 'امسح الرمز لمشاهدة الصور والتفاصيل' : 'امسح الرمز للتواصل عبر واتساب') + ' · المرجع ' + (p.ref || ''), W - 50, fy + 185);
    return c;
  }
  async function posterModal(p) {
    let kind = 'post', blob = null;
    modal(`<h3>🖼️ ملصق إعلاني جاهز</h3>
      <div class="seg" id="pf">${Object.entries(POSTER_FMT).map(([k, v]) => `<label><input type="radio" name="pf" value="${k}" ${k === kind ? 'checked' : ''}><span>${v[2]}</span></label>`).join('')}</div>
      <div class="poster-prev"><div class="poster-load">⏳ جاري التصميم…</div><img alt=""></div>
      <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="pp-share">${ic('share', 16)} مشاركة</button><a class="btn" id="pp-dl" download="${esc((p.ref || 'w777') + '.jpg')}">${ic('download', 16)} تحميل</a><button class="btn" data-close>إغلاق</button></div>
      <p class="muted" style="font-size:12px;margin:10px 0 0">جاهز لفيسبوك، إنستغرام، تيكتوك وستاتو واتساب. الرمز QR كيحل محادثة واتساب مع المكتب.</p>`, async box => {
      const img = $('.poster-prev img', box), ld = $('.poster-load', box);
      const render = async () => {
        ld.classList.remove('hidden'); img.style.opacity = .3;
        try {
          const c = await posterCanvas(p, kind);
          blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .92));
          const u = URL.createObjectURL(blob); img.src = u; $('#pp-dl', box).href = u;
        } catch (e) { toast('تعذر: ' + e.message, 4000); }
        ld.classList.add('hidden'); img.style.opacity = 1;
      };
      $$('[name=pf]', box).forEach(r => r.onchange = () => { kind = r.value; render(); });
      $('#pp-share', box).onclick = async () => {
        if (!blob) return;
        const f = new File([blob], (p.ref || 'w777') + '.jpg', { type: 'image/jpeg' });
        try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: (p.title || '') + '\n' + priceText(p).replace(/[⁦⁩]/g, '') }); return; } } catch (e) { if (e.name === 'AbortError') return; }
        $('#pp-dl', box).click();
      };
      render();
    });
  }
  /* ============================================================
     تدبير المكتب: الخريطة، الزيارات والتفويض، الكراء، المالية، التقرير الشهري
     ============================================================ */
  const ym = d => String(d || today()).slice(0, 7);
  const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'];
  const ymAr = k => { const [y, m] = k.split('-'); return MONTHS_AR[+m - 1] + ' ' + y; };
  const addMonths = (k, n) => { const [y, m] = k.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const M0 = n => fmt(Math.round(n || 0));
  // لائحة متزامنة (ledger / leases)
  const live = k => (S[k] || []).filter(x => !x.deleted);
  async function saveListItem(k, item) {
    item.updatedAt = new Date().toISOString();
    const arr = (S[k] || []).filter(x => x.id !== item.id); arr.push(item); S[k] = arr;
    await DB.setMeta(k, arr); await DB.markDirty('meta', k);
  }
  async function delListItem(k, id) {
    const it = (S[k] || []).find(x => x.id === id); if (!it) return;
    Object.keys(it).forEach(f => { if (!['id', 'updatedAt'].includes(f)) delete it[f]; });
    it.deleted = true; await saveListItem(k, it);
  }
  // طباعة / PDF فإطار مخفي
  function printHtml(title, body) {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px';
    document.body.appendChild(f);
    const base = location.href.split('#')[0].replace(/[^/]*$/, '');
    f.contentDocument.open();
    f.contentDocument.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title><base href="${base}"><link rel="stylesheet" href="fonts.css">
      <style>body{font-family:Tajawal,sans-serif;color:#111;margin:28px;font-size:14px;line-height:1.7}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:22px 0 8px;border-bottom:2px solid #c8102e;padding-bottom:4px}
      .hd{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:12px;margin-bottom:18px}.hd img{height:60px}
      table{width:100%;border-collapse:collapse;margin:6px 0}td,th{border:1px solid #ccc;padding:6px 8px;text-align:right}th{background:#f3f3f3}
      .kv{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.kv div{border:1px solid #ddd;border-radius:8px;padding:8px}.kv small{display:block;color:#666}.kv b{font-size:17px}
      .sig{display:flex;justify-content:space-between;margin-top:50px}.sig div{width:45%;border-top:1px solid #111;padding-top:6px;text-align:center}.muted{color:#666;font-size:12px}
      @page{margin:14mm}</style></head><body>
      <div class="hd"><div><h1>${esc(title)}</h1><div class="muted">${esc(offName())} — ${esc(offPhone())}</div></div><img src="${LOGO}" alt=""></div>${body}</body></html>`);
    f.contentDocument.close();
    const go = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('تعذرت الطباعة'); } setTimeout(() => f.remove(), 60000); };
    const fonts = f.contentDocument.fonts;
    setTimeout(() => (fonts && fonts.ready ? fonts.ready : Promise.resolve()).then(() => setTimeout(go, 250)), 300);
  }
  // عمولة مكتوبة («2.5%» ولا «10 000 درهم») ← مبلغ
  function commissionAmount(p) {
    const c = String(p.commission || '').replace(/[\s  ]/g, '').replace(',', '.');
    const pr = num(p.priceMax) || num(p.priceMin) || 0;
    const pc = c.match(/(\d+(?:\.\d+)?)%/); if (pc) return Math.round(pr * Number(pc[1]) / 100);
    const n = c.match(/\d+(?:\.\d+)?/); return n ? Number(n[0]) : 0;
  }

  /* ---------- 🗺️ الخريطة ---------- */
  async function viewMap(query) {
    const trx = query.t || '';
    main().innerHTML = `<div class="page-head"><div><h1>🗺️ خريطة العقارات</h1><div class="sub" id="map-sub"></div></div>
      <div class="chips">${[['', 'الكل'], ['sale', 'بيع'], ['rent', 'كراء']].map(([v, l]) => `<a class="chip${v === trx ? ' on' : ''}" href="#/map${v ? '?t=' + v : ''}">${l}</a>`).join('')}</div></div>
      <div class="card map-card"><div id="pmap"></div></div><div id="map-miss" style="margin-top:12px"></div>`;
    loadCss('vendor/leaflet/leaflet.css');
    try { await loadScript('vendor/leaflet/leaflet.js'); } catch (e) { $('#pmap').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const L = window.L;
    const list = S.props.filter(p => !['withdrawn'].includes(p.status) && (!trx || (trx === 'rent' ? isRent(p.transaction) : !isRent(p.transaction))));
    const withG = list.map(p => [p, parseGps(p.gps)]).filter(x => x[1]);
    const miss = list.filter(p => !parseGps(p.gps));
    $('#map-sub').textContent = `${withG.length} عقار على الخريطة` + (miss.length ? ` · ${miss.length} بلا موقع GPS` : '');
    const m = L.map('pmap', { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    const pts = [];
    withG.forEach(([p, g]) => {
      const rent = isRent(p.transaction), st = PSTATUS[p.status] || PSTATUS.available;
      const icon = L.divIcon({ className: '', html: `<div class="map-pin ${rent ? 'rent' : 'sale'}${p.status !== 'available' ? ' off' : ''}"><span>${esc(millions(num(p.priceMax) || num(p.priceMin)).replace(' مليون سنتيم', 'م') || (rent ? 'كراء' : 'بيع'))}</span></div>`, iconSize: [10, 10], iconAnchor: [5, 5] });
      L.marker(g, { icon }).addTo(m).bindPopup(`<div class="map-pop"><b>${esc(p.title || typeAr(p.type))}</b><div>${esc(priceText(p))}</div><small>${esc(p.ref)} · ${esc(st.ar)} · ${esc([p.district, p.city].filter(Boolean).join('، '))}</small><a href="#/property/${p.id}">فتح العقار ←</a></div>`);
      pts.push(g);
    });
    if (pts.length) m.fitBounds(pts, { padding: [40, 40], maxZoom: 15 }); else m.setView([33.8935, -5.5547], 12);
    setTimeout(() => m.invalidateSize(), 200);
    if (miss.length) $('#map-miss').innerHTML = `<div class="card"><div class="pair-head"><b>📍 عقارات بلا موقع (${miss.length})</b><small class="muted">زيد «الموقع GPS» فتعديل العقار باش يبان فالخريطة</small></div>
      ${miss.slice(0, 30).map(p => `<a class="list-row" href="#/property/${p.id}/edit"><div class="grow"><b>${esc(p.title || typeAr(p.type))}</b><small class="muted">${esc(p.ref)} · ${esc([p.district, p.city].filter(Boolean).join('، '))}</small></div><span class="btn sm">${ic('pin', 14)} زيد الموقع</span></a>`).join('')}</div>`;
  }

  /* ---------- 👣 الزيارات + 📝 التفويض (فصفحة العقار) ---------- */
  const INTEREST = { 3: ['🔥 مهتم بزاف', 'green'], 2: ['🙂 متردد', 'amber'], 1: ['👎 ما عجبوش', 'red'] };
  const MANDATE = { exclusive: '★ تفويض حصري', simple: 'تفويض عادي', verbal: 'اتفاق شفوي' };
  const daysTo = d => Math.round((new Date(d + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5);
  function propOfficeCards(p) {
    const vs = (p.visits || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const md = p.mandate;
    const left = md && md.end ? daysTo(md.end) : null;
    return `<div class="card no-print">
        <div class="pair-head"><b>👣 الزيارات</b><div class="btn-row"><span class="badge ${vs.length ? 'blue' : ''}">${vs.length}</span><button class="btn sm gold" id="v-add">${ic('plus', 14)} زيارة</button></div></div>
        ${vs.length ? vs.map(v => `<div class="list-row"><div class="grow"><b>${esc(v.name || 'زائر')} ${v.interest ? `<span class="badge ${INTEREST[v.interest][1]}">${INTEREST[v.interest][0]}</span>` : ''}</b>
          <small class="muted">${esc(v.date || '')}${v.phone ? ' · ' + esc(v.phone) : ''}${v.notes ? ' · ' + esc(v.notes) : ''}</small></div>
          <button class="btn sm" data-vbon="${v.id}" title="ورقة الزيارة">🧾</button><button class="btn sm" data-vdel="${v.id}">${ic('trash', 14)}</button></div>`).join('')
          : '<div class="empty" style="padding:18px">ما تسجلات حتى زيارة — سجل كل زيارة باش تحمي العمولة ديالك 🧾</div>'}
      </div>
      <div class="card card-pad no-print${left !== null && left <= 15 ? ' md-warn' : ''}">
        <div class="pair-head" style="padding:0 0 10px;border:0"><b>📝 التفويض (Mandat)</b><button class="btn sm" id="md-edit">${ic('edit', 14)} ${md ? 'تعديل' : 'زيد'}</button></div>
        ${md ? `<div class="kv"><div><small>النوع</small><b>${esc(MANDATE[md.kind] || md.kind || '—')}</b></div><div><small>من</small><b>${esc(md.start || '—')}</b></div><div><small>حتى</small><b>${esc(md.end || '—')}</b></div>${md.fee ? `<div><small>العمولة المتفق عليها</small><b>${esc(md.fee)}</b></div>` : ''}</div>
          ${left !== null ? `<p style="margin:10px 0 0" class="${left < 0 ? 'txt-red' : left <= 15 ? 'txt-amber' : 'muted'}">${left < 0 ? `⛔ التفويض سالا من ${-left} يوم — جدد مع المالك` : left <= 15 ? `⏳ باقي ${left} يوم على نهاية التفويض` : `✓ باقي ${left} يوم`}</p>` : ''}`
          : '<p class="muted" style="margin:0">سجل التفويض ديال المالك (حصري ولا عادي) وتاريخ النهاية، والتطبيق ينبهك قبل ما يسالي.</p>'}
      </div>`;
  }
  function bindPropOffice(p, redraw) {
    const add = $('#v-add');
    if (add) add.onclick = () => modal(`<h3>👣 تسجيل زيارة — ${esc(p.ref)}</h3><form id="vf" class="form-grid" onsubmit="return false">
        ${fInput('date', 'التاريخ', today(), { type: 'date' })}
        ${fSelect('req', 'زبون من الطلبات (اختياري)', S.reqs.filter(openReq).slice(0, 300).map(r => ({ v: r.id, l: ((r.client && r.client.name) || r.ref) + ' — ' + r.ref })), '', { empty: '— زائر جديد —' })}
        ${fInput('name', 'اسم الزائر', '')}${fInput('phone', 'الهاتف', '', { type: 'tel' })}${fInput('cin', 'رقم البطاقة (للورقة)', '')}
        ${fSelect('interest', 'رأيه', Object.entries(INTEREST).reverse().map(([v, x]) => ({ v, l: x[0] })), '3', { noEmpty: true })}
        ${fText('notes', 'ملاحظات', '')}</form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="vf-ok">${ic('check', 16)} حفظ</button><button class="btn" id="vf-bon">🧾 حفظ + طباعة الورقة</button></div>`, (box, close) => {
      const sel = $('[name=req]', box);
      sel.onchange = () => { const r = S.reqs.find(x => x.id === sel.value); if (r && r.client) { $('[name=name]', box).value = r.client.name || ''; $('[name=phone]', box).value = r.client.phone || ''; } };
      const save = async printIt => {
        const v = collect($('#vf', box));
        if (!v.name && !v.req) { toast('دخل اسم الزائر'); return; }
        const vis = { id: uid(), date: v.date || today(), name: v.name, phone: v.phone, cin: v.cin, reqId: v.req || null, interest: Number(v.interest) || null, notes: v.notes };
        p.visits = [...(p.visits || []), vis];
        await DB.saveRec('properties', p);
        if (vis.reqId) markProposal(vis.reqId, p.id, 'visit');
        close(); toast('تسجلات الزيارة ✓'); if (printIt) printVisit(p, vis); redraw();
      };
      $('#vf-ok', box).onclick = () => save(false); $('#vf-bon', box).onclick = () => save(true);
    });
    $$('[data-vbon]').forEach(b => b.onclick = () => { const v = (p.visits || []).find(x => x.id === b.dataset.vbon); if (v) printVisit(p, v); });
    $$('[data-vdel]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('نمسحو هاد الزيارة؟', 'مسح'))) return;
      p.visits = (p.visits || []).filter(x => x.id !== b.dataset.vdel); await DB.saveRec('properties', p); redraw();
    });
    const me = $('#md-edit');
    if (me) me.onclick = () => { const md = p.mandate || {}; modal(`<h3>📝 التفويض — ${esc(p.ref)}</h3><form id="mdf" class="form-grid" onsubmit="return false">
        ${fSelect('kind', 'نوع التفويض', Object.entries(MANDATE).map(([v, l]) => ({ v, l })), md.kind || (p.exclusive ? 'exclusive' : 'simple'), { noEmpty: true })}
        ${fInput('fee', 'العمولة المتفق عليها', md.fee || p.commission || '', { ph: 'مثال: 2.5%' })}
        ${fInput('start', 'من', md.start || today(), { type: 'date' })}${fInput('end', 'حتى', md.end || addMonths(ym(), 3) + '-' + today().slice(8), { type: 'date' })}</form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="mdf-ok">${ic('check', 16)} حفظ</button>${p.mandate ? '<button class="btn danger" id="mdf-del">حذف</button>' : ''}</div>`, (box, close) => {
      $('#mdf-ok', box).onclick = async () => { const v = collect($('#mdf', box)); p.mandate = v; if (v.kind === 'exclusive') p.exclusive = true; await DB.saveRec('properties', p); close(); toast('تم ✓'); redraw(); };
      const d = $('#mdf-del', box); if (d) d.onclick = async () => { delete p.mandate; await DB.saveRec('properties', p); close(); redraw(); };
    }); };
  }
  function printVisit(p, v) {
    printHtml('ورقة زيارة عقار (Bon de visite)', `<p>أنا الموقع أسفله: <b>${esc(v.name || '……………………')}</b>، الحامل للبطاقة الوطنية رقم: <b>${esc(v.cin || '…………………')}</b>، الهاتف: <b>${esc(v.phone || '…………………')}</b></p>
      <p>أشهد أنني زرت بتاريخ <b>${esc(v.date)}</b> العقار التالي، الذي عرضه علي <b>${esc(offName())}</b>:</p>
      <table><tr><th>المرجع</th><td>${esc(p.ref)}</td><th>النوع</th><td>${esc(typeAr(p.type))} — ${esc(trxAr(p.transaction))}</td></tr>
      <tr><th>العنوان</th><td colspan="3">${esc([p.address, p.district, p.city].filter(Boolean).join('، '))}</td></tr>
      <tr><th>الثمن المعروض</th><td colspan="3">${esc(priceText(p))}</td></tr></table>
      <p>وألتزم بعدم التعامل مباشرة مع المالك أو عن طريق وسيط آخر بخصوص هذا العقار دون إشعار المكتب، وفي حالة إتمام البيع أو الكراء أؤدي العمولة المتفق عليها${p.commission ? ' (' + esc(p.commission) + ')' : ''}.</p>
      ${v.notes ? `<p class="muted">ملاحظات: ${esc(v.notes)}</p>` : ''}
      <div class="sig"><div>توقيع الزائر</div><div>توقيع وختم المكتب</div></div>`);
  }

  /* ---------- 🔑 تدبير الكراء ---------- */
  const PAY_GRACE = 5;
  function leaseState(l, k = ym()) {
    const pay = (l.payments || {})[k];
    if (pay && pay.paid >= (num(l.rent) || 0)) return 'paid';
    if (k < ym(l.start)) return 'na';
    if (l.end && k > ym(l.end)) return 'na';
    if (k < ym()) return 'late';
    return Number(today().slice(8)) > (num(l.dueDay) || 1) + PAY_GRACE ? 'late' : 'due';
  }
  const LST = { paid: ['✅ خالص', 'green'], due: ['🕓 مستحق', 'amber'], late: ['⛔ متأخر', 'red'], na: ['—', ''] };
  function leaseArrears(l) {
    if (!l.start) return [];
    const out = []; let k = ym(l.start); const end = ym();
    while (k <= end && out.length < 120) { if (leaseState(l, k) === 'late') out.push(k); k = addMonths(k, 1); }
    return out;
  }
  const lateLeases = () => live('leases').filter(l => !l.ended && leaseArrears(l).length);
  function viewRentals() {
    const ls = live('leases').sort((a, b) => (a.ended ? 1 : 0) - (b.ended ? 1 : 0) || (a.tenant && a.tenant.name || '').localeCompare(b.tenant && b.tenant.name || ''));
    const act = ls.filter(l => !l.ended), late = act.filter(l => leaseArrears(l).length);
    const due = act.reduce((s, l) => s + (num(l.rent) || 0), 0);
    const got = act.reduce((s, l) => s + ((l.payments || {})[ym()] ? l.payments[ym()].paid || 0 : 0), 0);
    main().innerHTML = `<div class="page-head"><div><h1>🔑 تدبير الكراء</h1><div class="sub">عقود الكراء، الأداء الشهري، الوصولات والتذكير</div></div><button class="btn gold" id="ls-add">${ic('plus', 18)} عقد كراء</button></div>
      <div class="stats"><div class="card stat"><div class="ic">🔑</div><div class="v">${act.length}</div><div class="l">عقد جاري</div></div>
        <div class="card stat"><div class="ic">⛔</div><div class="v">${late.length}</div><div class="l">كراء متأخر</div></div>
        <div class="card stat"><div class="ic">💰</div><div class="v" style="font-size:20px">${M0(got)}</div><div class="l">تخلص هاد الشهر (من ${M0(due)})</div></div>
        <div class="card stat"><div class="ic">📈</div><div class="v" style="font-size:20px">${M0(act.reduce((s, l) => s + (num(l.rent) || 0) * (num(l.feePct) || 0) / 100, 0))}</div><div class="l">عمولة التدبير الشهرية</div></div></div>
      <div class="card">${ls.length ? ls.map(l => { const st = l.ended ? ['🔒 منتهي', ''] : LST[leaseState(l)], arr = l.ended ? [] : leaseArrears(l); return `<a class="list-row" href="#/rental/${l.id}">
        <div class="avatar">${esc(((l.tenant && l.tenant.name) || '؟').trim()[0])}</div><div class="grow"><b>${esc((l.tenant && l.tenant.name) || 'مكتري')}</b>
        <small class="muted">${esc(l.propLabel || '')} · ${M0(l.rent)} د/شهر · الأداء يوم ${esc(l.dueDay || 1)}</small>
        <div class="btn-row" style="margin-top:6px"><span class="badge ${st[1]}">${st[0]}</span>${arr.length ? `<span class="badge red">${arr.length} شهر متأخر · ${M0(arr.length * (num(l.rent) || 0))} د</span>` : ''}</div></div></a>`; }).join('')
        : `<div class="empty"><div class="big">🔑</div><h3>ما كاين حتى عقد كراء</h3><p>زيد العقود اللي كتدبرها: التطبيق كيتبع الأداء كل شهر، كيعطيك الوصولات، وكيفكرك فالمتأخرين.</p></div>`}</div>`;
    $('#ls-add').onclick = () => leaseForm(null);
  }
  function leaseForm(l) {
    l = l || { id: uid(), tenant: {}, owner: {}, payments: {}, start: today(), dueDay: 1, feePct: 10 };
    const opts = S.props.filter(p => isRent(p.transaction) || p.id === l.propId).map(p => ({ v: p.id, l: p.ref + ' — ' + (p.title || typeAr(p.type)) }));
    modal(`<h3>🔑 ${l.tenant.name ? 'تعديل' : 'عقد كراء جديد'}</h3><form id="lsf" class="form-grid" onsubmit="return false">
      ${fSelect('propId', 'العقار', opts, l.propId || '', { empty: '— عقار ماشي فاللائحة —' })}${fInput('propLabel', 'وصف العقار / العنوان', l.propLabel || '')}
      ${fInput('tenant.name', 'اسم المكتري', l.tenant.name, { req: true })}${fInput('tenant.phone', 'هاتف المكتري', l.tenant.phone, { type: 'tel' })}${fInput('tenant.cin', 'بطاقة المكتري', l.tenant.cin)}
      ${fInput('owner.name', 'اسم المالك', l.owner.name)}${fInput('owner.phone', 'هاتف المالك', l.owner.phone, { type: 'tel' })}
      ${fInput('rent', 'السومة الكرائية (د/شهر)', l.rent, { money: true, req: true })}${fInput('charges', 'التحملات / السانديك (د/شهر)', l.charges, { money: true })}
      ${fInput('deposit', 'الضمانة (د)', l.deposit, { money: true })}${fInput('dueDay', 'يوم الأداء فالشهر', l.dueDay, { type: 'number' })}
      ${fInput('feePct', 'عمولة التدبير ديال المكتب (%)', l.feePct, { type: 'number' })}
      ${fInput('start', 'بداية العقد', l.start, { type: 'date' })}${fInput('end', 'نهاية العقد (اختياري)', l.end, { type: 'date' })}
      ${fText('notes', 'ملاحظات', l.notes)}</form>
      <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="lsf-ok">${ic('check', 16)} حفظ</button></div>`, (box, close) => {
      bindMoney(box);
      const ps = $('[name=propId]', box);
      ps.onchange = () => { const p = S.props.find(x => x.id === ps.value); if (!p) return; $('[name=propLabel]', box).value = [p.ref, p.title || typeAr(p.type), p.district].filter(Boolean).join(' — ');
        if (p.owner) { if (!$('[name="owner.name"]', box).value) $('[name="owner.name"]', box).value = p.owner.name || ''; if (!$('[name="owner.phone"]', box).value) $('[name="owner.phone"]', box).value = p.owner.phone || ''; }
        const r = $('[name=rent]', box); if (!r.value && (p.priceMax || p.priceMin)) { r.value = fmtRaw(p.priceMax || p.priceMin); } };
      $('#lsf-ok', box).onclick = async () => {
        const v = collect($('#lsf', box));
        if (!v.tenant.name || !v.rent) { toast('دخل اسم المكتري والسومة'); return; }
        Object.assign(l, v); await saveListItem('leases', l); close(); toast('تم ✓'); location.hash = '#/rental/' + l.id; route();
      };
    });
  }
  function viewRental(id) {
    const l = live('leases').find(x => x.id === id);
    if (!l) { main().innerHTML = notFound(); return; }
    const months = []; let k = ym(l.start || today()); const last = l.end && ym(l.end) < ym() ? ym(l.end) : ym();
    while (k <= last && months.length < 240) { months.push(k); k = addMonths(k, 1); }
    months.reverse();
    const arr = leaseArrears(l), t = l.tenant || {};
    const remind = `السلام عليكم ${t.name || ''}،\nكنذكّروك بأداء واجب الكراء${arr.length ? ` (${arr.map(ymAr).join('، ')})` : ` ديال ${ymAr(ym())}`}: ${fmtRaw(Math.round((num(l.rent) || 0) * Math.max(1, arr.length)))} درهم.\nشكرا — ${offName()} ${offPhone()}`;
    main().innerHTML = `<div class="page-head"><a class="btn" href="#/rentals">${ic('back', 18)} الكراء</a><div class="btn-row">
        ${t.phone ? `<a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/${waPhone(t.phone)}?text=${encodeURIComponent(remind)}">${ic('wa', 16)} تذكير المكتري</a>` : ''}
        <button class="btn" id="l-edit">${ic('edit', 16)} تعديل</button><button class="btn" id="l-end">${l.ended ? '♻️ إعادة التفعيل' : '🔒 إنهاء العقد'}</button><button class="btn danger" id="l-del">${ic('trash', 16)}</button></div></div>
      <div class="detail-grid"><div class="card card-pad"><h2 style="margin:0 0 4px">${esc(t.name || 'مكتري')}</h2><div class="muted">${esc(l.propLabel || '')}</div>
        <div class="kv" style="margin-top:12px"><div><small>السومة</small><b>${M0(l.rent)} د</b></div>${l.charges ? `<div><small>التحملات</small><b>${M0(l.charges)} د</b></div>` : ''}<div><small>يوم الأداء</small><b>${esc(l.dueDay || 1)}</b></div>
          <div><small>الضمانة</small><b>${l.deposit ? M0(l.deposit) + ' د' : '—'}</b></div><div><small>من</small><b>${esc(l.start || '—')}</b></div><div><small>حتى</small><b>${esc(l.end || '—')}</b></div>
          <div><small>عمولة التدبير</small><b>${esc(l.feePct || 0)}%</b></div><div><small>المتأخر</small><b class="${arr.length ? 'txt-red' : ''}">${arr.length ? arr.length + ' شهر · ' + M0(arr.length * (num(l.rent) || 0)) + ' د' : 'لا شيء ✓'}</b></div></div>
        <div class="btn-row" style="margin-top:12px">${t.phone ? `<a class="btn sm" href="${telLink(t.phone)}">${ic('phone', 14)} المكتري</a>` : ''}${l.owner && l.owner.phone ? `<a class="btn sm" href="${telLink(l.owner.phone)}">${ic('phone', 14)} المالك</a>` : ''}</div>
        ${l.notes ? `<p class="desc">${esc(l.notes)}</p>` : ''}</div>
      <div class="card"><div class="pair-head"><b>📅 الأداء الشهري</b></div>${months.map(m => { const st = leaseState(l, m), pay = (l.payments || {})[m]; return `<div class="list-row">
        <div class="grow"><b>${ymAr(m)}</b><small class="muted">${pay ? `تخلص ${M0(pay.paid)} د · ${esc(pay.date || '')}${pay.method ? ' · ' + esc(pay.method) : ''}` : ''}</small></div><span class="badge ${LST[st][1]}">${LST[st][0]}</span>
        ${pay ? `<button class="btn sm" data-rcpt="${m}">🧾 وصل</button><button class="btn sm" data-unpay="${m}">✕</button>` : st !== 'na' ? `<button class="btn sm gold" data-pay="${m}">✓ تخلص</button>` : ''}</div>`; }).join('')}</div></div>`;
    $('#l-edit').onclick = () => leaseForm(l);
    $('#l-end').onclick = async () => { l.ended = !l.ended; await saveListItem('leases', l); viewRental(id); };
    $('#l-del').onclick = async () => { if (!(await confirmBox('حذف عقد الكراء نهائيا؟', 'حذف'))) return; await delListItem('leases', id); location.hash = '#/rentals'; };
    $$('[data-pay]').forEach(b => b.onclick = () => modal(`<h3>✓ أداء ${ymAr(b.dataset.pay)}</h3><form id="pf" class="form-grid" onsubmit="return false">
        ${fInput('paid', 'المبلغ (د)', l.rent, { money: true })}${fInput('date', 'تاريخ الأداء', today(), { type: 'date' })}${fSelect('method', 'طريقة الأداء', ['نقدا', 'تحويل بنكي', 'شيك', 'إيداع'], 'نقدا', { noEmpty: true })}</form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="pf-ok">${ic('check', 16)} تسجيل</button><button class="btn" id="pf-rc">🧾 تسجيل + وصل</button></div>`, (box, close) => {
      bindMoney(box);
      const go = async rc => {
        const v = collect($('#pf', box)), m = b.dataset.pay;
        l.payments = Object.assign({}, l.payments, { [m]: { paid: v.paid || 0, date: v.date || today(), method: v.method } });
        await saveListItem('leases', l);
        const fee = Math.round((v.paid || 0) * (num(l.feePct) || 0) / 100);
        if (fee) await saveListItem('ledger', { id: 'lf-' + l.id + '-' + m, type: 'in', cat: 'تدبير الكراء', amount: fee, date: v.date || today(), note: `عمولة تدبير ${ymAr(m)} — ${(l.tenant && l.tenant.name) || ''}` });
        close(); toast('تسجل الأداء ✓'); if (rc) printReceipt(l, m); viewRental(id);
      };
      $('#pf-ok', box).onclick = () => go(false); $('#pf-rc', box).onclick = () => go(true);
    }));
    $$('[data-unpay]').forEach(b => b.onclick = async () => {
      if (!(await confirmBox('نلغيو الأداء ديال ' + ymAr(b.dataset.unpay) + '؟', 'إلغاء'))) return;
      const p2 = Object.assign({}, l.payments); delete p2[b.dataset.unpay]; l.payments = p2; await saveListItem('leases', l);
      await delListItem('ledger', 'lf-' + l.id + '-' + b.dataset.unpay); viewRental(id);
    });
    $$('[data-rcpt]').forEach(b => b.onclick = () => printReceipt(l, b.dataset.rcpt));
  }
  function printReceipt(l, m) {
    const pay = (l.payments || {})[m] || {}, t = l.tenant || {}, o = l.owner || {};
    printHtml('وصل كراء (Quittance de loyer) — ' + ymAr(m), `<p>يشهد <b>${esc(offName())}</b>${o.name ? `، نيابة عن المالك(ة) <b>${esc(o.name)}</b>،` : ''} أنه توصل من السيد(ة) <b>${esc(t.name || '')}</b>${t.cin ? ` (ب.و ${esc(t.cin)})` : ''}</p>
      <table><tr><th>العقار</th><td>${esc(l.propLabel || '')}</td></tr><tr><th>الشهر</th><td>${ymAr(m)}</td></tr>
      <tr><th>واجب الكراء</th><td>${M0(num(l.rent))} درهم</td></tr>${l.charges ? `<tr><th>التحملات</th><td>${M0(num(l.charges))} درهم</td></tr>` : ''}
      <tr><th>المبلغ المؤدى</th><td><b>${M0(pay.paid)} درهم</b></td></tr><tr><th>تاريخ الأداء</th><td>${esc(pay.date || '')} — ${esc(pay.method || '')}</td></tr></table>
      <p class="muted">هذا الوصل يبرئ ذمة المكتري من واجب الكراء عن الشهر المذكور فقط، دون المساس بالواجبات السابقة إن وجدت.</p>
      <div class="sig"><div>توقيع المكتري</div><div>توقيع وختم المكتب</div></div>`);
  }

  /* ---------- 💹 المالية ---------- */
  const CAT_IN = ['عمولة بيع', 'عمولة كراء', 'تدبير الكراء', 'استشارة / خبرة', 'أخرى'];
  const CAT_OUT = ['كراء المكتب', 'أجور', 'إشهار وتسويق', 'تنقل ووقود', 'هاتف وإنترنت', 'ضرائب ورسوم', 'تجهيزات', 'أخرى'];
  const PIE_C = ['#c8102e', '#e9c46a', '#2f6fd6', '#1f9d68', '#7a4fd6', '#d98a14', '#8a8a8a', '#e63946'];
  function monthSums(entries, k) {
    const e = entries.filter(x => ym(x.date) === k);
    const inn = e.filter(x => x.type === 'in').reduce((s, x) => s + (num(x.amount) || 0), 0), out = e.filter(x => x.type === 'out').reduce((s, x) => s + (num(x.amount) || 0), 0);
    return { inn, out, net: inn - out, e };
  }
  function barChart(rows) {
    const W = 640, H = 220, pad = 28, max = Math.max(1, ...rows.flatMap(r => [r.inn, r.out])), bw = (W - pad * 2) / rows.length;
    const y = v => H - pad - v / max * (H - pad * 2);
    const line = rows.map((r, i) => `${(pad + bw * i + bw / 2).toFixed(1)},${y(Math.max(0, r.net)).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" class="fin-chart" preserveAspectRatio="none">
      ${[0, .5, 1].map(f => `<line x1="${pad}" x2="${W - pad}" y1="${y(max * f)}" y2="${y(max * f)}" class="fin-grid"/>`).join('')}
      ${rows.map((r, i) => { const x0 = pad + bw * i; return `<g><rect x="${x0 + bw * .14}" width="${bw * .34}" y="${y(r.inn)}" height="${H - pad - y(r.inn)}" rx="3" class="fin-in"><title>${r.lbl}: دخل ${fmtRaw(Math.round(r.inn))}</title></rect>
        <rect x="${x0 + bw * .52}" width="${bw * .34}" y="${y(r.out)}" height="${H - pad - y(r.out)}" rx="3" class="fin-out"><title>${r.lbl}: مصاريف ${fmtRaw(Math.round(r.out))}</title></rect>
        <text x="${x0 + bw / 2}" y="${H - 8}" class="fin-lbl">${r.short}</text></g>`; }).join('')}
      <polyline points="${line}" class="fin-net"/></svg>`;
  }
  function viewFinance(query) {
    const k = query.m || ym();
    const all = live('ledger');
    const cur = monthSums(all, k);
    const rows = []; for (let i = 11; i >= 0; i--) { const kk = addMonths(k, -i); const s = monthSums(all, kk); rows.push(Object.assign(s, { lbl: ymAr(kk), short: MONTHS_AR[+kk.slice(5) - 1].slice(0, 3) })); }
    const yr = all.filter(x => String(x.date || '').slice(0, 4) === k.slice(0, 4));
    const yIn = yr.filter(x => x.type === 'in').reduce((s, x) => s + (num(x.amount) || 0), 0), yOut = yr.filter(x => x.type === 'out').reduce((s, x) => s + (num(x.amount) || 0), 0);
    const byCat = {}; cur.e.filter(x => x.type === 'out').forEach(x => { byCat[x.cat || 'أخرى'] = (byCat[x.cat || 'أخرى'] || 0) + (num(x.amount) || 0); });
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const logged = new Set(all.map(x => x.propId).filter(Boolean));
    const pend = S.props.filter(p => ['sold', 'rented'].includes(p.status) && p.commission && !logged.has(p.id)).slice(0, 10);
    main().innerHTML = `<div class="page-head"><div><h1>💹 المالية</h1><div class="sub">الدخل، المصاريف والربح ديال المكتب</div></div>
      <div class="btn-row"><a class="btn sm" href="#/finance?m=${addMonths(k, -1)}">→</a><b style="align-self:center">${ymAr(k)}</b><a class="btn sm" href="#/finance?m=${addMonths(k, 1)}">←</a>
      <button class="btn gold" id="fn-in">${ic('plus', 16)} دخل</button><button class="btn" id="fn-out">${ic('plus', 16)} مصروف</button><a class="btn" href="#/report?m=${k}">📄 التقرير الشهري</a></div></div>
      <div class="stats"><div class="card stat"><div class="ic">💰</div><div class="v" style="font-size:20px">${M0(cur.inn)}</div><div class="l">دخل ${ymAr(k)}</div></div>
        <div class="card stat"><div class="ic">💸</div><div class="v" style="font-size:20px">${M0(cur.out)}</div><div class="l">مصاريف ${ymAr(k)}</div></div>
        <div class="card stat"><div class="ic">📈</div><div class="v" style="font-size:20px;${cur.net < 0 ? 'color:var(--red);-webkit-text-fill-color:var(--red)' : ''}">${M0(cur.net)}</div><div class="l">الربح الصافي</div></div>
        <div class="card stat"><div class="ic">🗓️</div><div class="v" style="font-size:20px">${M0(yIn - yOut)}</div><div class="l">ربح ${k.slice(0, 4)} (دخل ${M0(yIn)})</div></div></div>
      ${pend.length ? `<div class="card" style="margin-bottom:16px"><div class="pair-head"><b>⏳ عمولات ما تسجلاتش</b><small class="muted">عقارات تباعت ولا تكرات</small></div>${pend.map(p => `<div class="list-row"><div class="grow"><b>${esc(p.title || typeAr(p.type))}</b><small class="muted">${esc(p.ref)} · العمولة: ${esc(p.commission)}</small></div><button class="btn sm gold" data-pend="${p.id}">✓ سجل ${M0(commissionAmount(p))} د</button></div>`).join('')}</div>` : ''}
      <div class="grid-2"><div class="card card-pad"><b>📊 آخر 12 شهر</b><div class="ln-leg" style="margin:6px 0"><span><i style="background:var(--green)"></i> الدخل</span><span><i style="background:var(--gold)"></i> المصاريف</span><span><i style="background:var(--blue)"></i> الربح</span></div>${barChart(rows)}</div>
        <div class="card card-pad"><b>🥧 المصاريف حسب النوع — ${ymAr(k)}</b>${cats.length ? `<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:10px">${donut(cats.map((c, i) => [c[0], c[1], PIE_C[i % PIE_C.length]]))}<div class="ln-leg" style="flex-direction:column;gap:6px">${cats.map((c, i) => `<span><i style="background:${PIE_C[i % PIE_C.length]}"></i> ${esc(c[0])}: <b>${M0(c[1])}</b></span>`).join('')}</div></div>` : '<p class="muted">ما كاين حتى مصروف هاد الشهر.</p>'}</div></div>
      <div class="card" style="margin-top:16px"><div class="pair-head"><b>🧾 العمليات — ${ymAr(k)}</b><span class="badge">${cur.e.length}</span></div>
        ${cur.e.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(x => `<div class="list-row"><div class="avatar" style="background:${x.type === 'in' ? 'rgba(31,157,104,.15)' : 'rgba(200,16,46,.12)'}">${x.type === 'in' ? '⬇' : '⬆'}</div>
          <div class="grow"><b>${esc(x.cat || '')}</b><small class="muted">${esc(x.date || '')}${x.note ? ' · ' + esc(x.note) : ''}</small></div><b class="${x.type === 'in' ? 'txt-green' : 'txt-red'}">${x.type === 'in' ? '+' : '−'}${M0(x.amount)}</b>
          <button class="btn sm" data-fdel="${x.id}">${ic('trash', 14)}</button></div>`).join('') || '<div class="empty" style="padding:20px">ما كاين حتى عملية</div>'}</div>`;
    const form = (type, pre = {}) => modal(`<h3>${type === 'in' ? '💰 دخل جديد' : '💸 مصروف جديد'}</h3><form id="ff" class="form-grid" onsubmit="return false">
        ${fInput('amount', 'المبلغ (د)', pre.amount || '', { money: true, req: true })}${fSelect('cat', 'النوع', type === 'in' ? CAT_IN : CAT_OUT, pre.cat || '', { noEmpty: true })}
        ${fInput('date', 'التاريخ', pre.date || (k === ym() ? today() : k + '-01'), { type: 'date' })}${fInput('note', 'ملاحظة', pre.note || '')}</form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="ff-ok">${ic('check', 16)} حفظ</button></div>`, (box, close) => {
      bindMoney(box);
      $('#ff-ok', box).onclick = async () => { const v = collect($('#ff', box)); if (!v.amount) { toast('دخل المبلغ'); return; }
        await saveListItem('ledger', Object.assign({ id: uid(), type, propId: pre.propId || null }, v)); close(); toast('تم ✓'); viewFinance({ m: ym(v.date) }); };
    });
    $('#fn-in').onclick = () => form('in'); $('#fn-out').onclick = () => form('out');
    $$('[data-pend]').forEach(b => b.onclick = () => { const p = S.props.find(x => x.id === b.dataset.pend); form('in', { amount: commissionAmount(p), cat: p.status === 'rented' ? 'عمولة كراء' : 'عمولة بيع', note: p.ref + ' — ' + (p.title || ''), propId: p.id }); });
    $$('[data-fdel]').forEach(b => b.onclick = async () => { if (!(await confirmBox('نمسحو هاد العملية؟', 'مسح'))) return; await delListItem('ledger', b.dataset.fdel); viewFinance({ m: k }); });
  }

  /* ---------- 📄 التقرير الشهري ---------- */
  function monthReport(k) {
    const inM = d => ym(d) === k;
    const added = S.props.filter(p => inM(p.createdAt));
    const closed = S.props.filter(p => ['sold', 'rented'].includes(p.status) && inM(p.updatedAt));
    const reqs = S.reqs.filter(r => inM(r.createdAt));
    const appts = S.appts.filter(a => inM(a.date));
    const visits = S.props.flatMap(p => (p.visits || []).filter(v => inM(v.date)).map(v => ({ p, v })));
    const fin = monthSums(live('ledger'), k);
    const ls = live('leases').filter(l => !l.ended);
    const rentGot = ls.reduce((s, l) => s + ((l.payments || {})[k] ? l.payments[k].paid || 0 : 0), 0);
    const rentLate = ls.filter(l => leaseState(l, k) === 'late');
    const byD = {}; added.forEach(p => { const d = p.district || p.city || '—'; byD[d] = (byD[d] || 0) + 1; });
    return { added, closed, reqs, appts, visits, fin, ls, rentGot, rentLate, topD: Object.entries(byD).sort((a, b) => b[1] - a[1]).slice(0, 5) };
  }
  function reportBody(k, R) {
    return `<div class="kv"><div><small>عقارات جديدة</small><b>${R.added.length}</b></div><div><small>تباعو / تكراو</small><b>${R.closed.length}</b></div><div><small>طلبات جديدة</small><b>${R.reqs.length}</b></div>
      <div><small>المواعيد</small><b>${R.appts.length} (${R.appts.filter(a => a.status === 'done').length} تمّت)</b></div><div><small>الزيارات المسجلة</small><b>${R.visits.length}</b></div><div><small>العقارات المعروضة دابا</small><b>${S.props.filter(p => p.status === 'available').length}</b></div></div>
      <h2>💹 المالية</h2><div class="kv"><div><small>الدخل</small><b>${M0(R.fin.inn)} د</b></div><div><small>المصاريف</small><b>${M0(R.fin.out)} د</b></div><div><small>الربح الصافي</small><b>${M0(R.fin.net)} د</b></div></div>
      <h2>🔑 الكراء</h2><div class="kv"><div><small>عقود جارية</small><b>${R.ls.length}</b></div><div><small>تخلص هاد الشهر</small><b>${M0(R.rentGot)} د</b></div><div><small>متأخرين</small><b>${R.rentLate.length}</b></div></div>
      ${R.closed.length ? `<h2>✅ العمليات المنجزة</h2><table><tr><th>المرجع</th><th>العقار</th><th>الحالة</th><th>الثمن</th></tr>${R.closed.map(p => `<tr><td>${esc(p.ref)}</td><td>${esc(p.title || typeAr(p.type))}</td><td>${esc((PSTATUS[p.status] || {}).ar || '')}</td><td>${esc(priceText(p))}</td></tr>`).join('')}</table>` : ''}
      ${R.added.length ? `<h2>🏠 العقارات الجديدة (${R.added.length})</h2><table><tr><th>المرجع</th><th>العقار</th><th>المكان</th><th>الثمن</th></tr>${R.added.slice(0, 40).map(p => `<tr><td>${esc(p.ref)}</td><td>${esc(p.title || typeAr(p.type))}</td><td>${esc([p.district, p.city].filter(Boolean).join('، '))}</td><td>${esc(priceText(p))}</td></tr>`).join('')}</table>` : ''}
      ${R.topD.length ? `<h2>📍 الأحياء الأكثر نشاطا</h2><table>${R.topD.map(d => `<tr><td>${esc(d[0])}</td><td>${d[1]} عقار</td></tr>`).join('')}</table>` : ''}
      ${R.rentLate.length ? `<h2>⛔ كراء متأخر</h2><table><tr><th>المكتري</th><th>العقار</th><th>السومة</th></tr>${R.rentLate.map(l => `<tr><td>${esc((l.tenant && l.tenant.name) || '')}</td><td>${esc(l.propLabel || '')}</td><td>${M0(l.rent)} د</td></tr>`).join('')}</table>` : ''}
      <p class="muted" style="margin-top:20px">تقرير أوتوماتيكي من تطبيق الوسيط 777 — ${esc(today())}</p>`;
  }
  function viewReport(query) {
    const k = query.m || ym(), R = monthReport(k);
    main().innerHTML = `<div class="page-head"><div><h1>📄 التقرير الشهري</h1><div class="sub">${ymAr(k)}</div></div>
      <div class="btn-row"><a class="btn sm" href="#/report?m=${addMonths(k, -1)}">→</a><a class="btn sm" href="#/report?m=${addMonths(k, 1)}">←</a>
      <button class="btn gold" id="rp-pdf">${ic('print', 16)} PDF / طباعة</button><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`📄 تقرير ${ymAr(k)} — ${offName()}\n🏠 عقارات جديدة: ${R.added.length}\n✅ تباعو/تكراو: ${R.closed.length}\n👥 طلبات جديدة: ${R.reqs.length}\n👣 زيارات: ${R.visits.length}\n💰 الدخل: ${fmtRaw(Math.round(R.fin.inn))} د\n💸 المصاريف: ${fmtRaw(Math.round(R.fin.out))} د\n📈 الربح: ${fmtRaw(Math.round(R.fin.net))} د`)}">${ic('wa', 16)} ملخص</a></div></div>
      <div class="card card-pad report-view">${reportBody(k, R)}</div>`;
    $('#rp-pdf').onclick = () => printHtml('التقرير الشهري — ' + ymAr(k), reportBody(k, R));
  }
  // تنبيهات الصفحة الرئيسية: كراء متأخر + تفويض قريب يسالي
  function officeAlerts() {
    const late = lateLeases();
    const md = S.props.filter(p => p.mandate && p.mandate.end && p.status === 'available' && daysTo(p.mandate.end) <= 15).sort((a, b) => a.mandate.end.localeCompare(b.mandate.end));
    if (!late.length && !md.length) return '';
    return `<div class="card alerts-card" style="margin-bottom:18px"><div class="pair-head"><b>🔔 تنبيهات</b></div>
      ${late.length ? `<a class="list-row" href="#/rentals"><div class="avatar" style="background:rgba(200,16,46,.12)">⛔</div><div class="grow"><b>${late.length} كراء متأخر</b><small class="muted">${esc(late.slice(0, 3).map(l => (l.tenant && l.tenant.name) || '').join('، '))}</small></div></a>` : ''}
      ${md.slice(0, 4).map(p => { const d = daysTo(p.mandate.end); return `<a class="list-row" href="#/property/${p.id}"><div class="avatar" style="background:rgba(217,138,20,.15)">📝</div><div class="grow"><b>${d < 0 ? 'تفويض سالا' : `تفويض كيسالي فـ ${d} يوم`}</b><small class="muted">${esc(p.ref)} · ${esc(p.title || typeAr(p.type))}</small></div></a>`; }).join('')}</div>`;
  }
  /* ============================================================
     🌐 الكتالوج العمومي · 💬 المحادثة · ⭐ التقييم · 🔐 البصمة
     ============================================================ */
  const syOn = () => !!(window.W777_SYNC && window.W777_SYNC.isOn());
  const myUid = () => (syOn() ? window.W777_SYNC.uid() : null);
  const appBase = () => location.href.split('#')[0].replace(/[^/]*$/, '');
  const catalogUrl = (pid) => appBase() + 'catalog.html?o=' + myUid() + (pid ? '#p=' + encodeURIComponent(pid) : '');
  const rqJson = async (path, opts) => { const r = await window.W777_SYNC.request(path, opts); if (!r.ok) { const t = await r.text().catch(() => ''); let m = t; try { m = JSON.parse(t).message || t; } catch (e) { /* */ } throw new Error(m || 'HTTP ' + r.status); } return r.status === 204 ? null : r.json().catch(() => null); };

  /* ---------- 🌐 نشر الكتالوج ---------- */
  let catBusy = false;
  async function publishCatalog() {
    if (catBusy || !syOn() || !navigator.onLine || staffMe()) return 0;
    catBusy = true;
    try {
      const Sy = window.W777_SYNC, me = Sy.uid();
      const prevOwner = await DB.getMeta('catalog_uid', null);
      const known = prevOwner === me ? await DB.getMeta('catalog_hash', {}) : {};
      const up = prevOwner === me ? await DB.getMeta('catalog_up', {}) : {};
      const list = S.props.filter(p => p.catalog && p.status === 'available');
      // معلومات المكتب
      const ow = { owner: me, name: offName().slice(0, 120), phone: (offPhone() || '').slice(0, 30) || null, city: S.settings.officeCity || null, logo: S.agency && S.agency.logo ? brandUrl(S.agency.logo) : null };
      const oh = h32(JSON.stringify(ow));
      if (list.length && (await DB.getMeta('catalog_ohash', '')) !== oh) {
        await rqJson('/rest/v1/w777_catalog_owner?on_conflict=owner', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(Object.assign({ updated_at: new Date().toISOString() }, ow)) });
        await DB.setMeta('catalog_ohash', oh);
      }
      const next = {};
      for (const p of list) {
        const photos = (p.media || []).filter(m => m.kind === 'photo'); const cv = coverOf(p);
        if (cv) { photos.splice(photos.indexOf(cv), 1); photos.unshift(cv); }
        const paths = [];
        for (const m of photos.slice(0, 8)) {
          if (up[m.id]) { paths.push(up[m.id]); continue; }
          const blob = await getBlob(m.id, false) || await getBlob(m.id, true); if (!blob) continue;
          const small = (await compressImage(blob, 1280, 0.8)).blob;
          const wm = await watermark(small, true);
          const path = `${me}/${p.id}/${m.id}.jpg`;
          const r = await Sy.request(`/storage/v1/object/w777-catalog/${path}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: wm });
          if (!r.ok) continue;
          up[m.id] = path; paths.push(path);
          await DB.setMeta('catalog_up', up);
        }
        const data = { ref: p.ref, title: p.title, transaction: p.transaction, type: p.type, city: p.city, district: p.district,
          priceMin: p.priceMin, priceMax: p.priceMax, priceUnit: p.priceUnit, negotiable: p.negotiable, areaTotal: p.areaTotal, areaBuilt: p.areaBuilt, areaUseful: p.areaUseful,
          specs: p.specs || {}, features: p.features || [], description: hideDigits(p.description || buildDescription(p)), createdAt: p.createdAt };
        const row = { owner: me, id: p.id, data, photos: paths, deleted: false };
        const h = h32(JSON.stringify(row)); next[p.id] = h;
        if (known[p.id] !== h) await rqJson('/rest/v1/w777_catalog?on_conflict=owner,id', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(Object.assign({ updated_at: new Date().toISOString() }, row)) });
      }
      const gone = Object.keys(known).filter(id => !next[id]);
      for (const id of gone) {
        await rqJson(`/rest/v1/w777_catalog?owner=eq.${me}&id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ deleted: true, photos: [], updated_at: new Date().toISOString() }) }).catch(() => {});
        const p = S.props.find(x => x.id === id);
        const prefixes = Object.entries(up).filter(([, v]) => v.startsWith(`${me}/${id}/`)).map(([k, v]) => { delete up[k]; return v; });
        if (prefixes.length) Sy.request('/storage/v1/object/w777-catalog', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes }) }).catch(() => {});
        if (!p) delete next[id];
      }
      await DB.setMeta('catalog_up', up); await DB.setMeta('catalog_hash', next); await DB.setMeta('catalog_uid', me);
      return list.length;
    } catch (e) { console.warn('catalog', e); return 0; } finally { catBusy = false; }
  }
  async function toggleCatalog(p, after) {
    if (!syOn()) { toast('الكتالوج كيحتاج المزامنة السحابية — دخل من الإعدادات', 4000); return; }
    p.catalog = !p.catalog; await DB.saveRec('properties', p);
    toast(p.catalog ? '🌐 جاري النشر فالكتالوج…' : 'تحيّد من الكتالوج');
    const n = await publishCatalog();
    if (p.catalog) toast(`🌐 منشور ✓ (${n} عقار فالكتالوج)`);
    if (after) after();
  }
  function catalogCard() {
    if (!syOn()) return '';
    const n = S.props.filter(p => p.catalog && p.status === 'available').length, url = catalogUrl();
    return `<div class="card card-pad" id="cat-card"><h3 class="section-title">🌐 الكتالوج العمومي للزبناء</h3>
      <p class="muted" style="margin:0 0 10px">صفحة عمومية فيها العقارات اللي اخترتي (بلا معلومات المالك، والصور بالعلامة المائية). صيفطها للزبناء ولا حطها فإنستغرام وفيسبوك.</p>
      <div class="kv"><div><small>عقارات منشورة</small><b>${n}</b></div><div><small>المتاحة</small><b>${S.props.filter(p => p.status === 'available').length}</b></div></div>
      <div class="cat-link" dir="ltr">${esc(url)}</div>
      <div class="btn-row" style="margin-top:10px"><a class="btn gold" target="_blank" rel="noopener" href="${esc(url)}">👁️ فتح</a><button class="btn" id="cat-copy">${ic('copy', 15)} نسخ الرابط</button>
        <a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('🏠 العقارات ديالنا: ' + url)}">${ic('wa', 15)} صيفط</a><button class="btn" id="cat-all">🌐 نشر كل المتاحة</button><button class="btn" id="cat-none">إخفاء الكل</button></div></div>`;
  }
  function bindCatalogCard() {
    const c = $('#cat-copy'); if (!c) return;
    c.onclick = () => navigator.clipboard.writeText(catalogUrl()).then(() => toast('تنسخ الرابط ✓'));
    const bulk = async on => { for (const p of S.props.filter(x => x.status === 'available' && !!x.catalog !== on)) { p.catalog = on; await DB.saveRec('properties', p); } toast('جاري التحديث…'); const n = await publishCatalog(); toast(`✓ ${n} عقار فالكتالوج`); viewSettings(); };
    $('#cat-all').onclick = () => bulk(true); $('#cat-none').onclick = () => bulk(false);
  }

  /* ---------- 💬 المحادثة ---------- */
  let ADMIN_UID = null;
  const adminUid = async () => ADMIN_UID || (ADMIN_UID = await rqJson('/rest/v1/rpc/w777_admin_uid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null));
  async function whoIs(uid) {
    if (uid === await adminUid()) return { name: 'مكتب الوسيط 777', ic: '👑', admin: true };
    const a = (S.dir || []).find(x => x.uid === uid);
    return a ? { name: a.name || a.code, ic: KINDS[kindOf(a)].ic, a } : { name: 'مشترك', ic: '👤' };
  }
  async function unreadCount() {
    if (!syOn()) return 0;
    const r = await window.W777_SYNC.request(`/rest/v1/w777_msgs?select=id&recipient=eq.${myUid()}&read_at=is.null&limit=1`, { headers: { Prefer: 'count=exact', Range: '0-0' } });
    const cr = r.headers.get('content-range') || ''; return Number(cr.split('/')[1]) || 0;
  }
  async function paintUnread() {
    const b = $('#btn-chat'); if (!b) return;
    b.classList.toggle('hidden', !syOn()); if (!syOn()) return;
    const n = await unreadCount().catch(() => 0);
    const s = $('#chat-n', b); s.textContent = n > 99 ? '99+' : n || ''; s.classList.toggle('hidden', !n);
  }
  function setupChat() {
    const sync = $('#btn-sync'); if (!sync || $('#btn-chat')) return;
    const b = document.createElement('a');
    b.className = 'icon-btn hidden'; b.id = 'btn-chat'; b.href = '#/inbox'; b.title = 'الرسائل'; b.setAttribute('aria-label', 'الرسائل');
    b.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span id="chat-n" class="chat-n hidden"></span>`;
    sync.parentNode.insertBefore(b, sync);
    paintUnread(); setInterval(() => { if (document.visibilityState === 'visible') paintUnread(); }, 60000);
  }
  const chatNeed = () => `<div class="card empty"><div class="big">💬</div><h3>الرسائل كتحتاج حسابك فالشبكة</h3><p>دخل للمزامنة السحابية من الإعدادات باش تراسل المشتركين والمكتب.</p><a class="btn gold" href="#/settings">الإعدادات</a></div>`;
  async function viewInbox() {
    if (!syOn()) { main().innerHTML = chatNeed(); return; }
    main().innerHTML = `<div class="page-head"><div><h1>💬 الرسائل</h1><div class="sub">محادثات مع المشتركين ومكتب الوسيط 777</div></div><div class="btn-row" id="ib-act"></div></div><div class="card" id="ib-list"><div class="empty">⏳</div></div>`;
    const me = myUid();
    await loadDir().catch(() => {});
    const adm = await adminUid();
    if (adm && adm !== me) $('#ib-act').innerHTML = `<a class="btn gold" href="#/chat/${adm}">👑 راسل مكتب الوسيط 777</a>`;
    const rows = await rqJson(`/rest/v1/w777_msgs?select=id,sender,recipient,body,created_at,read_at&or=(sender.eq.${me},recipient.eq.${me})&order=created_at.desc&limit=600`).catch(e => { toast(e.message); return []; });
    const conv = new Map();
    rows.forEach(m => { const o = m.sender === me ? m.recipient : m.sender; const c = conv.get(o) || { o, last: m, unread: 0 }; if (m.recipient === me && !m.read_at) c.unread++; conv.set(o, c); });
    const items = await Promise.all([...conv.values()].map(async c => Object.assign(c, { who: await whoIs(c.o) })));
    $('#ib-list').innerHTML = items.length ? items.map(c => `<a class="list-row" href="#/chat/${c.o}"><div class="avatar">${c.who.a && (c.who.a.photo || c.who.a.logo) ? `<img src="${esc(brandUrl(c.who.a.photo || c.who.a.logo))}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : c.who.ic}</div>
      <div class="grow"><b>${esc(c.who.name)}</b><small class="muted">${c.last.sender === me ? 'نتا: ' : ''}${esc(c.last.body.slice(0, 80))}</small></div>
      <div style="text-align:left"><small class="muted">${esc(c.last.created_at.slice(5, 16).replace('T', ' '))}</small>${c.unread ? `<div><span class="badge red">${c.unread}</span></div>` : ''}</div></a>`).join('')
      : `<div class="empty"><div class="big">💬</div><h3>ما كاين حتى محادثة</h3><p>فالدليل (الوكالات، الوسطاء، الموثقين…) ضغط على «💬 رسالة» باش تبدا.</p></div>`;
    paintUnread();
  }
  let chatTimer = null;
  async function viewChat(other) {
    clearInterval(chatTimer);
    if (!syOn()) { main().innerHTML = chatNeed(); return; }
    const me = myUid();
    await loadDir().catch(() => {});
    const who = await whoIs(other);
    main().innerHTML = `<div class="chat-wrap"><div class="chat-head card"><a class="btn sm" href="#/inbox">${ic('back', 16)}</a><div class="avatar">${who.ic}</div><div class="grow"><b>${esc(who.name)}</b>${who.a ? `<small class="muted"><span dir="ltr">${esc(who.a.code)}</span>${who.a.city ? ' · ' + esc(who.a.city) : ''}</small>` : ''}</div>
      ${who.a && who.a.phone ? `<a class="btn sm" href="${telLink(who.a.phone)}">${ic('phone', 15)}</a>` : ''}</div>
      <div class="chat-box" id="cbox"><div class="empty">⏳</div></div>
      <form class="chat-in" id="cin"><textarea name="t" rows="1" maxlength="2000" placeholder="كتب رسالتك…" required></textarea><button class="btn gold" type="submit">➤</button></form></div>`;
    let lastId = 0, seen = new Set();
    const box = $('#cbox');
    const add = rows => {
      if (!rows.length) { if (!seen.size) box.innerHTML = '<div class="empty muted">ابدا المحادثة 👋</div>'; return; }
      if (!seen.size) box.innerHTML = '';
      rows.forEach(m => { if (seen.has(m.id)) return; seen.add(m.id); lastId = Math.max(lastId, m.id);
        const d = document.createElement('div'); d.className = 'msg ' + (m.sender === me ? 'me' : 'them');
        d.innerHTML = `<div>${esc(m.body).replace(/\n/g, '<br>')}</div><small>${esc(m.created_at.slice(11, 16))}${m.sender === me ? (m.read_at ? ' ✓✓' : ' ✓') : ''}</small>`; box.appendChild(d); });
      box.scrollTop = box.scrollHeight;
    };
    const pair = `or=(and(sender.eq.${me},recipient.eq.${other}),and(sender.eq.${other},recipient.eq.${me}))`;
    const load = async first => {
      const rows = await rqJson(`/rest/v1/w777_msgs?select=id,sender,recipient,body,created_at,read_at&${pair}${first ? '' : '&id=gt.' + lastId}&order=id.${first ? 'desc' : 'asc'}&limit=200`).catch(() => null);
      if (!rows) return;
      add(first ? rows.reverse() : rows);
      if (rows.some(m => m.recipient === me && !m.read_at)) { await rqJson(`/rest/v1/w777_msgs?recipient=eq.${me}&sender=eq.${other}&read_at=is.null`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ read_at: new Date().toISOString() }) }).catch(() => {}); paintUnread(); }
    };
    await load(true);
    const hash = location.hash;
    chatTimer = setInterval(() => { if (location.hash !== hash || !box.isConnected) { clearInterval(chatTimer); return; } if (document.visibilityState === 'visible') load(false); }, 6000);
    const form = $('#cin'), ta = $('[name=t]', form);
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(hover: hover)').matches) { e.preventDefault(); form.requestSubmit(); } });
    form.onsubmit = async e => {
      e.preventDefault(); const t = ta.value.trim(); if (!t) return;
      ta.disabled = true;
      try { await rqJson('/rest/v1/w777_msgs', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ recipient: other, body: t }) }); ta.value = ''; await load(false); }
      catch (er) { toast('تعذر الإرسال: ' + er.message, 4000); }
      ta.disabled = false; ta.focus();
    };
  }

  /* ---------- ⭐ التقييم ---------- */
  let RATINGS = null, RATINGS_AT = 0;
  async function loadRatings(force) {
    if (!syOn()) return new Map();
    if (!force && RATINGS && Date.now() - RATINGS_AT < 300000) return RATINGS;
    const rows = await rqJson('/rest/v1/w777_ratings?select=rater,target,stars,comment,updated_at&order=updated_at.desc&limit=5000').catch(() => []);
    const m = new Map();
    (rows || []).forEach(r => { const x = m.get(r.target) || { sum: 0, n: 0, list: [] }; x.sum += r.stars; x.n++; x.list.push(r); m.set(r.target, x); });
    RATINGS = m; RATINGS_AT = Date.now(); return m;
  }
  const starsTxt = v => '★★★★★'.slice(0, Math.round(v)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(v));
  function rateBadge(uid) {
    const x = RATINGS && RATINGS.get(uid);
    return `<button class="rate-b" data-rshow="${uid}" title="الآراء">${x ? `<span class="stars">${starsTxt(x.sum / x.n)}</span> <b>${(x.sum / x.n).toFixed(1)}</b> <small>(${x.n})</small>` : '<span class="stars off">☆☆☆☆☆</span> <small>بلا تقييم</small>'}</button>`;
  }
  // أزرار الرسالة + التقييم فبطاقات الدليل
  function memberActions(a) {
    if (!syOn() || !a || a.uid === myUid()) return '';
    return `<div class="btn-row mem-act">${rateBadge(a.uid)}<a class="btn sm" href="#/chat/${a.uid}">💬 رسالة</a><button class="btn sm" data-rate="${a.uid}">⭐ قيّم</button></div>`;
  }
  function bindMemberActions(root, redraw) {
    $$('[data-rate]', root).forEach(b => b.onclick = async () => {
      const uid = b.dataset.rate, a = (S.dir || []).find(x => x.uid === uid) || {};
      const mine = ((RATINGS && RATINGS.get(uid)) || { list: [] }).list.find(r => r.rater === myUid());
      let stars = mine ? mine.stars : 5;
      modal(`<h3>⭐ تقييم ${esc(a.name || '')}</h3><div class="star-pick" id="sp">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-s="${i}">★</button>`).join('')}</div>
        <div class="field full"><label>رأيك (اختياري)</label><textarea id="rc" maxlength="500" placeholder="كيفاش كانت التجربة معاه؟">${esc(mine && mine.comment || '')}</textarea></div>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="r-ok">${ic('check', 16)} حفظ التقييم</button>${mine ? '<button class="btn danger" id="r-del">مسح تقييمي</button>' : ''}</div>`, (box, close) => {
        const paint = () => $$('[data-s]', box).forEach(x => x.classList.toggle('on', +x.dataset.s <= stars));
        $$('[data-s]', box).forEach(x => x.onclick = () => { stars = +x.dataset.s; paint(); }); paint();
        $('#r-ok', box).onclick = async () => {
          try { await rqJson('/rest/v1/w777_ratings?on_conflict=rater,target', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ rater: myUid(), target: uid, stars, comment: $('#rc', box).value.trim() || null }) });
            await loadRatings(true); close(); toast('شكرا على التقييم ⭐'); if (redraw) redraw(); } catch (e) { toast('تعذر: ' + e.message, 4000); }
        };
        const d = $('#r-del', box); if (d) d.onclick = async () => { await rqJson(`/rest/v1/w777_ratings?rater=eq.${myUid()}&target=eq.${uid}`, { method: 'DELETE' }).catch(() => {}); await loadRatings(true); close(); if (redraw) redraw(); };
      });
    });
    $$('[data-rshow]', root).forEach(b => b.onclick = () => {
      const uid = b.dataset.rshow, a = (S.dir || []).find(x => x.uid === uid) || {}, x = RATINGS && RATINGS.get(uid);
      modal(`<h3>⭐ آراء المشتركين — ${esc(a.name || '')}</h3>${x ? `<div class="mkt-big eq"><b>${(x.sum / x.n).toFixed(1)} / 5</b><span>${starsTxt(x.sum / x.n)} · ${x.n} تقييم</span></div>
        <div style="margin-top:12px">${x.list.map(r => { const ra = (S.dir || []).find(d => d.uid === r.rater); return `<div class="list-row"><div class="grow"><b><span class="stars">${starsTxt(r.stars)}</span> ${esc(ra ? ra.name : 'مشترك')}</b>${r.comment ? `<small class="muted">${esc(r.comment)}</small>` : ''}</div><small class="muted">${esc(r.updated_at.slice(0, 10))}</small></div>`; }).join('')}</div>`
        : '<p class="muted">مازال حتى واحد ما قيّم هاد المشترك.</p>'}<div class="btn-row" style="margin-top:12px"><button class="btn" data-close>إغلاق</button></div>`);
    });
  }

  /* ---------- 🔐 الدخول بالبصمة / Face ID (WebAuthn) ---------- */
  const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const ub64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
  const bioOn = () => !!localStorage.getItem('w777_bio');
  async function bioAvailable() { try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; } }
  async function bioEnable() {
    if (!localStorage.getItem('w777_pin')) { toast('فعّل الرمز السري أولا (كاحتياط إلا ما خدماتش البصمة)', 4500); return; }
    try {
      const cred = await navigator.credentials.create({ publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'الوسيط 777' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'w777-' + (offPhone() || 'office'), displayName: offName() },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' }, timeout: 60000, attestation: 'none' } });
      localStorage.setItem('w777_bio', b64u(cred.rawId)); toast('🔐 تفعّل الدخول بالبصمة ✓'); viewSettings();
    } catch (e) { if (e.name !== 'NotAllowedError') toast('تعذر: ' + e.message, 4000); }
  }
  async function bioCheck() {
    const id = localStorage.getItem('w777_bio'); if (!id) return false;
    try {
      await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: ub64(id) }], userVerification: 'required', timeout: 60000 } });
      return true;
    } catch (e) { return false; }
  }
  async function securityBioCard() {
    if (!(await bioAvailable())) return '';
    return `<div class="card card-pad" id="bio-card"><h3 class="section-title">🔐 الدخول بالبصمة / Face ID</h3>
      <p class="muted" style="margin:0 0 10px">فتح التطبيق ببصمة الصبع ولا الوجه بلاصة الرمز السري. الرمز كيبقى احتياط.</p>
      ${bioOn() ? `<div class="btn-row"><span class="badge green">✓ مفعّل فهاد الجهاز</span><button class="btn sm" id="bio-test">جرّب</button><button class="btn sm danger" id="bio-off">إلغاء</button></div>`
        : `<button class="btn gold" id="bio-on">🔐 تفعيل البصمة</button>${localStorage.getItem('w777_pin') ? '' : '<p class="muted" style="font-size:12.5px;margin:8px 0 0">⚠️ خاصك تفعّل «القفل بالرمز السري» أولا.</p>'}`}</div>`;
  }
  function bindBioCard() {
    const on = $('#bio-on'); if (on) on.onclick = bioEnable;
    const off = $('#bio-off'); if (off) off.onclick = () => { localStorage.removeItem('w777_bio'); toast('تلغى الدخول بالبصمة'); viewSettings(); };
    const t = $('#bio-test'); if (t) t.onclick = async () => toast((await bioCheck()) ? '✓ البصمة خدامة' : 'ما تقبلاتش البصمة');
  }
  /* ============================================================
     👥 الموظفون · 🔔 الإشعارات الفورية
     ============================================================ */
  const ROLES = { view: ['👁️ مشاهدة فقط', 'كيشوف العقارات والطلبات بلا ما يبدل والو'], edit: ['✏️ مشاهدة وتعديل', 'كيزيد ويعدّل، ولكن ما يقدرش يمسح'], full: ['🔑 كاملة', 'كيزيد، يعدّل ويمسح'] };
  const staffMe = () => (window.W777_SYNC && window.W777_SYNC.staff ? window.W777_SYNC.staff() : null);
  // حماية فالتطبيق (الخادم كيحمي حتى هو)
  const guard = (store, del) => {
    const s = staffMe(); if (!s) return;
    if (s.role === 'view' || (del && s.role !== 'full')) { toast(s.role === 'view' ? '👁️ الحساب ديالك «مشاهدة فقط» — ما تقدرش تبدل' : '🔒 ما عندكش صلاحية الحذف — تواصل مع مول المكتب', 4500); throw new Error('staff-perm'); }
  };
  const _saveRec2 = DB.saveRec, _delRec2 = DB.delRec;
  DB.saveRec = (st, o) => { guard(st, false); return _saveRec2(st, o); };
  DB.delRec = (st, id) => { guard(st, true); return _delRec2(st, id); };
  window.addEventListener('unhandledrejection', e => { if (e.reason && e.reason.message === 'staff-perm') e.preventDefault(); });
  let STAFF = null;
  async function loadStaff(force) {
    if (!syOn() || staffMe()) return [];
    if (STAFF && !force) return STAFF;
    STAFF = await rqJson(`/rest/v1/w777_staff?owner=eq.${myUid()}&select=uid,name,login,role,active,created_at&order=created_at.asc`).catch(() => []) || [];
    return STAFF;
  }
  const byName = uid => { if (!uid) return ''; if (uid === myUid()) return 'نتا'; const s = (STAFF || []).find(x => x.uid === uid); return s ? '👤 ' + s.name : ''; };
  const staffFn = body => rqJson('/functions/v1/w777-staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  function staffCredMsg(login, pass) {
    return `السلام عليكم،\nهادي معلومات الدخول ديالك لتطبيق ${offName()}:\nالرابط: ${appBase()}\nالإعدادات ← المزامنة السحابية\nالرمز: ${login}\nكلمة السر: ${pass}\n(ما تعطيهاش لحتى واحد)`;
  }
  function showCreds(login, pass, title) {
    modal(`<h3>${title}</h3><p>عطي هاد المعلومات للموظف (كتبان مرة وحدة فقط):</p>
      <div class="kv"><div><small>الرمز (Login)</small><b dir="ltr">${esc(login)}</b></div><div><small>كلمة السر</small><b dir="ltr">${esc(pass)}</b></div></div>
      <div class="btn-row" style="margin-top:12px"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(staffCredMsg(login, pass))}">${ic('wa', 16)} صيفط فواتساب</a>
      <button class="btn" id="cr-copy">${ic('copy', 15)} نسخ</button><button class="btn" data-close>تم</button></div>`, box => {
      $('#cr-copy', box).onclick = () => navigator.clipboard.writeText(staffCredMsg(login, pass)).then(() => toast('تنسخ ✓'));
    });
  }
  function staffCard() {
    if (!syOn()) return '';
    const s = staffMe();
    if (s) return `<div class="card card-pad" style="border-color:var(--blue)"><h3 class="section-title">👤 حساب موظف</h3>
      <p style="margin:0">كتخدم على بيانات المكتب. الصلاحية: <b>${esc((ROLES[s.role] || ROLES.view)[0])}</b></p><p class="muted" style="margin:6px 0 0;font-size:13px">${esc((ROLES[s.role] || ROLES.view)[1])}</p></div>`;
    if (!inNetwork()) return '';
    return `<div class="card card-pad" id="staff-card"><h3 class="section-title">👥 الموظفون</h3>
      <p class="muted" style="margin:0 0 10px">كل موظف عندو دخول خاص، كيخدم على العقارات والطلبات ديال المكتب حسب الصلاحية اللي عطيتيه، وكتعرف شكون دار كل تعديل.</p>
      <div id="staff-list"><div class="muted">⏳</div></div>
      <div class="btn-row" style="margin-top:10px"><button class="btn gold" id="st-add">${ic('plus', 16)} موظف جديد</button></div>
      <div id="staff-log" style="margin-top:14px"></div></div>`;
  }
  async function bindStaffCard() {
    const box = $('#staff-list'); if (!box) return;
    const list = await loadStaff(true);
    box.innerHTML = list.length ? list.map(s => `<div class="list-row" style="flex-wrap:wrap;gap:8px"><div class="avatar">${esc(s.name.trim()[0] || '؟')}</div>
      <div class="grow"><b>${esc(s.name)} ${s.active ? '' : '<span class="badge red">موقوف</span>'}</b><small class="muted" dir="ltr">${esc(s.login)}</small></div>
      <select data-srole="${s.uid}" class="btn sm">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${s.role === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
      <button class="btn sm" data-stog="${s.uid}">${s.active ? 'إيقاف' : 'تفعيل'}</button><button class="btn sm" data-spw="${s.uid}" title="كلمة سر جديدة">🔑</button><button class="btn sm danger" data-sdel="${s.uid}">${ic('trash', 14)}</button></div>`).join('')
      : '<div class="empty" style="padding:16px">ما زال ما زدتي حتى موظف</div>';
    const upd = async (uid, body) => { await rqJson(`/rest/v1/w777_staff?uid=eq.${uid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(body) }); toast('تم ✓'); bindStaffCard(); };
    $$('[data-srole]', box).forEach(x => x.onchange = () => upd(x.dataset.srole, { role: x.value }).catch(e => toast(e.message)));
    $$('[data-stog]', box).forEach(x => x.onclick = () => { const s = list.find(y => y.uid === x.dataset.stog); upd(s.uid, { active: !s.active }).catch(e => toast(e.message)); });
    $$('[data-spw]', box).forEach(x => x.onclick = async () => { const s = list.find(y => y.uid === x.dataset.spw);
      if (!(await confirmBox('نعطيو كلمة سر جديدة لـ ' + s.name + '؟', 'كلمة سر جديدة', false))) return;
      try { const r = await staffFn({ action: 'password', uid: s.uid }); showCreds(s.login, r.password, '🔑 كلمة سر جديدة'); } catch (e) { toast('تعذر: ' + e.message, 4000); } });
    $$('[data-sdel]', box).forEach(x => x.onclick = async () => { const s = list.find(y => y.uid === x.dataset.sdel);
      if (!(await confirmBox('حذف الحساب ديال ' + s.name + ' نهائيا؟ (البيانات ديال المكتب كتبقى)', 'حذف'))) return;
      try { await staffFn({ action: 'delete', uid: s.uid }); toast('تمسح ✓'); bindStaffCard(); } catch (e) { toast('تعذر: ' + e.message, 4000); } });
    $('#st-add').onclick = () => modal(`<h3>👥 موظف جديد</h3><form id="stf" class="form-grid" onsubmit="return false">${fInput('name', 'اسم الموظف', '', { req: true })}
        <div class="field full"><label>الصلاحية</label>${Object.entries(ROLES).map(([k, v]) => `<label class="chk" style="margin:6px 0"><input type="radio" name="role" value="${k}" ${k === 'edit' ? 'checked' : ''}> ${v[0]} <small class="muted" style="font-weight:400">— ${v[1]}</small></label>`).join('')}</div></form>
        <div class="btn-row" style="margin-top:12px"><button class="btn gold" id="stf-ok">${ic('check', 16)} إنشاء الحساب</button></div>`, (b2, close) => {
      $('#stf-ok', b2).onclick = async () => {
        const v = collect($('#stf', b2)); if (!v.name) { toast('دخل الاسم'); return; }
        $('#stf-ok', b2).disabled = true;
        try { const r = await staffFn({ action: 'create', name: v.name, role: v.role || 'edit' }); close(); showCreds(r.login, r.password, '✅ تزاد الموظف'); bindStaffCard(); }
        catch (e) { toast('تعذر: ' + e.message, 4500); $('#stf-ok', b2).disabled = false; }
      };
    });
    // آخر التعديلات ديال الموظفين
    const ids = list.map(s => s.uid);
    if (ids.length) {
      const rows = await rqJson(`/rest/v1/w777_records?owner=eq.${myUid()}&edited_by=in.(${ids.join(',')})&select=kind,id,edited_by,synced_at,deleted,ref:data->>ref,title:data->>title,client:data->client->>name&order=synced_at.desc&limit=25`).catch(() => []);
      const KIND = { properties: '🏠', requests: '👥', appointments: '📅', meta: '⚙️' };
      if (rows && rows.length) $('#staff-log').innerHTML = `<b>📋 آخر ما دارو الموظفين</b>${rows.map(r => `<div class="list-row"><div class="grow"><b>${KIND[r.kind] || '•'} ${esc(r.title || r.client || r.ref || r.id)}${r.deleted ? ' <span class="badge red">تمسح</span>' : ''}</b>
        <small class="muted">${esc(byName(r.edited_by))} · ${esc(String(r.synced_at).slice(0, 16).replace('T', ' '))}</small></div>${r.kind === 'properties' && !r.deleted ? `<a class="btn sm" href="#/property/${encodeURIComponent(r.id)}">فتح</a>` : r.kind === 'requests' && !r.deleted ? `<a class="btn sm" href="#/request/${encodeURIComponent(r.id)}">فتح</a>` : ''}</div>`).join('')}`;
    }
  }

  /* ---------- 🔔 الإشعارات الفورية ---------- */
  const VAPID_PUB = 'BJI4T6DFbbGD8BDYipNlskvNsm10YDVLPgybzwd99qC3ak43mxHnDJwjNdeIYxcZ2v_wsGIfYFJ87ZCdkKhiYnw';
  const pushOk = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  async function pushSub() { try { const reg = await navigator.serviceWorker.ready; return await reg.pushManager.getSubscription(); } catch (e) { return null; } }
  async function pushEnable() {
    if (!syOn()) { toast('خاصك تدخل للمزامنة السحابية أولا', 4000); return; }
    if (await Notification.requestPermission() !== 'granted') { toast('ما تعطاتش الموافقة على الإشعارات — فعّلها من إعدادات التيليفون', 5000); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: ub64(VAPID_PUB) });
      const j = sub.toJSON();
      await rqJson('/rest/v1/w777_push_subs?on_conflict=uid,endpoint', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ uid: myUid(), endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }) });
      localStorage.setItem('w777_push', '1');
      reg.showNotification('🔔 الوسيط 777', { body: 'تفعّلو الإشعارات ✓ غادي يوصلوك هنا', icon: 'icons/icon-192.png?v=9', badge: 'icons/icon-192.png?v=9', lang: 'ar', dir: 'rtl' });
      toast('🔔 تفعّلو الإشعارات ✓'); viewSettings();
    } catch (e) { toast('تعذر: ' + e.message, 5000); }
  }
  async function pushDisable() {
    const sub = await pushSub();
    if (sub) { await rqJson(`/rest/v1/w777_push_subs?uid=eq.${myUid()}&endpoint=eq.${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
    localStorage.removeItem('w777_push'); toast('تحبسو الإشعارات'); viewSettings();
  }
  async function pushCard() {
    if (EMBED || !syOn()) return '';
    const on = pushOk() && Notification.permission === 'granted' && !!(await pushSub());
    return `<div class="card card-pad" id="push-card"><h3 class="section-title">🔔 الإشعارات الفورية</h3>
      <p class="muted" style="margin:0 0 10px">توصلك فالتيليفون حتى والتطبيق مسدود: 💬 رسالة جديدة · 🎯 عقار جديد فالشبكة كيناسب طلب عندك · 🖋️ طلب للموثق · ⭐ تقييم · 🏖️ حجز.</p>
      ${!pushOk() ? (isIOS() && !standalone() ? '<p class="txt-amber" style="margin:0">📱 فالآيفون: زيد التطبيق للشاشة الرئيسية أولا (مشاركة ← «إضافة إلى الشاشة الرئيسية»)، من بعد فعّل الإشعارات من هنا.</p>' : '<p class="muted" style="margin:0">هاد المتصفح ما كيدعمش الإشعارات.</p>')
        : on ? `<div class="btn-row"><span class="badge green">✓ مفعّلة فهاد الجهاز</span><button class="btn sm danger" id="push-off">إيقاف</button></div>`
        : `<button class="btn gold" id="push-on">🔔 تفعيل الإشعارات</button>`}</div>`;
  }
  function bindPushCard() {
    const a = $('#push-on'); if (a) a.onclick = pushEnable;
    const b = $('#push-off'); if (b) b.onclick = pushDisable;
  }
  /* ---------- واجهة حية: العناصر كتطلع وحدة بوحدة ملي كتبان، والأرقام كتعدّ ---------- */
  const LV_BOX = '.home-main, .stats, .grid-2, .prop-grid, .dir-grid, .doc-grid, .doc-list, .st-grid, .own-list, .mm-grid, .match-list, .feat-grid, .tr-grid, .nt-list, .law-grid, .iv-grid, .gd-grid, .ev-list, .appt-list, .ag-stats, .detail-grid';
  const LV_OK = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) && 'IntersectionObserver' in window;
  let lvIO = null, lvN = 0, lvTick = 0;
  function lvCount(el) {
    const t = el.textContent.trim();
    if (!/^\d{1,6}$/.test(t) || +t < 2) return;
    const to = +t, t0 = performance.now(), dur = Math.min(1100, 500 + to * 12);
    const step = now => { const k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1 && el.isConnected) requestAnimationFrame(step); else el.textContent = t; };
    el.textContent = '0'; requestAnimationFrame(step);
  }
  function lvWatch(els) {
    if (!LV_OK) return;
    if (!lvIO) lvIO = new IntersectionObserver(es => {
      const now = performance.now(); if (now - lvTick > 160) lvN = 0; lvTick = now;
      es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left).forEach(e => {
        const el = e.target; lvIO.unobserve(el);
        el.style.setProperty('--lv-i', Math.min(lvN++, 10));
        el.classList.remove('lv-wait'); el.classList.add('lv-rv');
        const done = ev => { if (ev.target !== el) return; el.removeEventListener('animationend', done); el.classList.remove('lv-rv'); el.style.removeProperty('--lv-i'); };
        el.addEventListener('animationend', done);
        $$('.stat .v, .ag-stats b', el).concat(el.matches('.stat') ? $$('.v', el) : []).forEach(lvCount);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    els.forEach(el => { if (el.nodeType === 1 && !el.matches(LV_BOX + ', .home-wrap, .lazy-more, script, style')) { el.classList.add('lv-wait'); lvIO.observe(el); } });
  }
  function lvPage() {
    if (!LV_OK) return;
    const m = main(); if (!m) return;
    if (lvIO) { lvIO.disconnect(); lvIO = null; }
    const els = [...m.children];
    $$(LV_BOX, m).forEach(b => els.push(...b.children));
    lvWatch(els);
    $$('.hub-tile', m).forEach((t, i) => { t.style.setProperty('--lv-i', i); t.classList.add('lv-pop'); });
  }
  function setupMotion() {
    const top = $('.topbar');
    if (top) { const on = () => top.classList.toggle('lv-scrolled', window.scrollY > 8); window.addEventListener('scroll', on, { passive: true }); on(); }
    if (!LV_OK) return;
    // الصور كتبان بنعومة ملي كتكمل التحميل
    document.addEventListener('load', e => { const t = e.target; if (t.tagName === 'IMG' && t.closest('#main')) t.classList.add('lv-imgin'); }, true);
  }
  const P3D_SEL = 'button, .btn, a.card, .card.stat, .list-row, .chip, .hub-tile, .sidenav a, .bottomnav a, .icon-btn, .lang-btn, .lang-opt,'
    + ' .prop-card, .dir-card, .gd-card, .st-card, .pr-item, .fl-item, .mm-tile, .ag-card, .doc-grid > *, .gallery > div, .net-gallery img, .match-thumb, .tr-more li, .sr-item, .search-results a';
  function setupPress3D() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cur = null;
    const release = () => {
      const el = cur; cur = null;
      if (!el) return;
      el.classList.remove('p3d'); el.classList.add('p3d-up');
      setTimeout(() => { el.classList.remove('p3d-up'); el.style.removeProperty('--p3b'); }, 420);
    };
    document.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      const el = e.target.closest(P3D_SEL);
      if (!el || el.disabled || el.closest('.no-3d')) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = Math.max(-.5, Math.min(.5, (e.clientX - r.left) / r.width - .5));
      const y = Math.max(-.5, Math.min(.5, (e.clientY - r.top) / r.height - .5));
      // العناصر الكبيرة كتميّل أقل من الأزرار الصغيرة
      const amp = Math.max(3, Math.min(16, 1400 / Math.max(r.width, r.height, 60)));
      const base = getComputedStyle(el).transform;
      if (base && base !== 'none' && !el.classList.contains('p3d-up')) el.style.setProperty('--p3b', base);
      el.style.setProperty('--p3x', (-y * amp).toFixed(2) + 'deg');
      el.style.setProperty('--p3y', (x * amp).toFixed(2) + 'deg');
      el.style.setProperty('--p3gx', Math.round((x + .5) * 100) + '%');
      el.style.setProperty('--p3gy', Math.round((y + .5) * 100) + '%');
      el.classList.remove('p3d-up'); el.classList.add('p3d');
      cur = el;
      if (navigator.vibrate && e.pointerType === 'touch') { try { navigator.vibrate(6); } catch (er) { /* */ } }
    }, { passive: true });
    ['pointerup', 'pointercancel', 'dragstart'].forEach(t => document.addEventListener(t, release, { passive: true }));
    window.addEventListener('blur', release);
    document.addEventListener('scroll', release, { passive: true, capture: true });
  }

  async function start() {
    applyTheme();
    setupPress3D(); setupMotion();
    setupLang();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
    await lockScreen();
    await loadAll();
    loadRoleCache();
    if (window.W777_SYNC.isOn()) localStorage.setItem('w777_last_email', window.W777_SYNC.account().email || '');
    cleanOrphans();
    setupSearch();
    setupFab(); setupCityTicker();
    setupAgent();
    setupSyncUi();
    setupChat();
    if (syOn()) loadStaff().catch(() => {});
    window.addEventListener('hashchange', route);
    if (history.state && history.state.ag) { try { history.replaceState(null, ''); } catch (e) { /* */ } }
    window.addEventListener('popstate', () => { if (AG.open && !(history.state && history.state.ag)) agHide(); });
    const bb = $('#btn-back'); if (bb) bb.onclick = goBack;
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
