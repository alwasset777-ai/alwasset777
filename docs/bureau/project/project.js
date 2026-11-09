/* PROJECT — عرض تقديمي PDF (16:9) من الصور والمعلومات · تطبيق مجموعة الوسيط
   3 أنواع: ملف عقار، مشروع عقاري، ملف مستثمر · 3 لغات · كلشي كيتصاوب فالجهاز (canvas ← JPEG ← PDF)
   الوكيل (Gemini عبر التطبيق الأم) كيكتب النصوص؛ التطبيق الأم كيعمر العقار ومعلومات الوكالة. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const W = 1600, H = 900;
  const embedded = window.parent && window.parent !== window;
  const ORIGIN = location.origin;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('w777pj.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('w777pj.' + k, JSON.stringify(v)); } catch (e) { /* */ } },
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, ms) => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), ms || 2600); };
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^\d.,-]/g, '').replace(/,/g, '.')); return isFinite(n) ? n : 0; };
  const lines = v => String(v || '').split(/\n/).map(x => x.trim()).filter(Boolean);

  /* ---------- النصوص ديال الـ PDF حسب اللغة ---------- */
  const T = {
    ar: { sale: 'للبيع', rent: 'للكراء', seasonal: 'كراء للعطل', price: 'الثمن', surface: 'المساحة', land: 'مساحة الأرض', rooms: 'الغرف', bedrooms: 'غرف النوم', baths: 'الحمامات', floor: 'الطابق', year: 'سنة البناء', title: 'الوضعية القانونية', ref: 'المرجع', dh: 'درهم', m2: 'م²', perm2: 'ثمن المتر', desc: 'تقديم العقار', highlights: 'نقاط القوة', gallery: 'معرض الصور', location: 'الموقع', financing: 'التمويل التقديري', monthly: 'القسط الشهري', down: 'المساهمة الذاتية', years: 'سنة', rate: 'نسبة الفائدة', loan: 'مبلغ القرض', est: 'أرقام تقديرية وإرشادية — الشروط النهائية عند البنك.', contact: 'للتواصل والزيارة', scan: 'امسح الرمز للتواصل عبر واتساب', overview: 'نظرة عامة', units: 'الوحدات والأثمنة', type: 'النوع', from: 'ابتداء من', count: 'العدد', amenities: 'التجهيزات والمرافق', payment: 'طريقة الأداء', stage: 'حالة الأشغال', delivery: 'التسليم', promoter: 'المنعش', priceFrom: 'الأثمنة ابتداء من', unitsN: 'عدد الوحدات', summary: 'ملخص الاستثمار', total: 'مجموع الاستثمار', gross: 'المردودية الخام', net: 'المردودية الصافية', cash: 'التدفق الشهري', acq: 'ثمن الاقتناء', fees: 'مصاريف الشراء', works: 'الأشغال', rentM: 'الكراء الشهري', rentY: 'الكراء السنوي', charges: 'التكاليف السنوية', netY: 'الدخل الصافي السنوي', finance: 'الأرقام المالية', strengths: 'نقاط القوة', risks: 'المخاطر والاحتياطات', projection: 'إسقاط على 5 سنوات', value5: 'القيمة المقدرة بعد 5 سنوات', invest: 'فرصة استثمارية', page: 'صفحة', property: 'ملف العقار', project: 'مشروع عقاري', investor: 'ملف مستثمر', loanPay: 'قسط القرض', vacancy: 'أشهر الفراغ' },
    fr: { sale: 'À vendre', rent: 'À louer', seasonal: 'Location vacances', price: 'Prix', surface: 'Surface', land: 'Terrain', rooms: 'Pièces', bedrooms: 'Chambres', baths: 'Salles de bain', floor: 'Étage', year: 'Année de construction', title: 'Statut juridique', ref: 'Réf.', dh: 'DH', m2: 'm²', perm2: 'Prix au m²', desc: 'Présentation du bien', highlights: 'Points forts', gallery: 'Galerie photos', location: 'Emplacement', financing: 'Financement estimé', monthly: 'Mensualité', down: 'Apport', years: 'ans', rate: 'Taux', loan: 'Montant du prêt', est: 'Chiffres indicatifs — conditions finales auprès de la banque.', contact: 'Contact et visites', scan: 'Scannez pour nous écrire sur WhatsApp', overview: 'Vue d’ensemble', units: 'Typologies et prix', type: 'Type', from: 'À partir de', count: 'Nombre', amenities: 'Équipements et services', payment: 'Modalités de paiement', stage: 'Avancement des travaux', delivery: 'Livraison', promoter: 'Promoteur', priceFrom: 'Prix à partir de', unitsN: 'Nombre d’unités', summary: 'Synthèse de l’investissement', total: 'Investissement total', gross: 'Rendement brut', net: 'Rendement net', cash: 'Cash-flow mensuel', acq: 'Prix d’acquisition', fees: 'Frais d’acquisition', works: 'Travaux', rentM: 'Loyer mensuel', rentY: 'Loyer annuel', charges: 'Charges annuelles', netY: 'Revenu net annuel', finance: 'Données financières', strengths: 'Atouts', risks: 'Risques et précautions', projection: 'Projection sur 5 ans', value5: 'Valeur estimée à 5 ans', invest: 'Opportunité d’investissement', page: 'Page', property: 'Dossier du bien', project: 'Projet immobilier', investor: 'Dossier investisseur', loanPay: 'Mensualité du prêt', vacancy: 'Mois de vacance' },
    en: { sale: 'For sale', rent: 'For rent', seasonal: 'Holiday rental', price: 'Price', surface: 'Area', land: 'Land area', rooms: 'Rooms', bedrooms: 'Bedrooms', baths: 'Bathrooms', floor: 'Floor', year: 'Year built', title: 'Legal status', ref: 'Ref.', dh: 'MAD', m2: 'm²', perm2: 'Price per m²', desc: 'About the property', highlights: 'Highlights', gallery: 'Photo gallery', location: 'Location', financing: 'Estimated financing', monthly: 'Monthly payment', down: 'Down payment', years: 'years', rate: 'Rate', loan: 'Loan amount', est: 'Indicative figures — final terms with the bank.', contact: 'Contact & viewings', scan: 'Scan to message us on WhatsApp', overview: 'Overview', units: 'Units & prices', type: 'Type', from: 'From', count: 'Units', amenities: 'Amenities', payment: 'Payment plan', stage: 'Construction stage', delivery: 'Delivery', promoter: 'Developer', priceFrom: 'Prices from', unitsN: 'Number of units', summary: 'Investment summary', total: 'Total investment', gross: 'Gross yield', net: 'Net yield', cash: 'Monthly cash flow', acq: 'Purchase price', fees: 'Purchase costs', works: 'Works', rentM: 'Monthly rent', rentY: 'Annual rent', charges: 'Annual costs', netY: 'Net annual income', finance: 'Financials', strengths: 'Strengths', risks: 'Risks & precautions', projection: '5-year projection', value5: 'Estimated value in 5 years', invest: 'Investment opportunity', page: 'Page', property: 'Property file', project: 'Real-estate project', investor: 'Investor file', loanPay: 'Loan payment', vacancy: 'Vacant months' },
  };
  const fmt = (n, lang) => { const v = Math.round(num(n)); if (!v) return ''; return v.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR').replace(/ | /g, ' '); };
  const money = (n, lang) => { const s = fmt(n, lang); return s ? s + ' ' + T[lang].dh : ''; };

  /* ---------- الحالة ---------- */
  const S = {
    kind: store.get('kind', 'property'), lang: store.get('lang', 'ar'),
    photos: [], // {img, url}
    f: store.get('f', {}), t: store.get('t', {}),
    agency: store.get('agency', null), base: null, // base = معلومات المكتب من التطبيق الأم
  };
  const AG_FIELDS = [['name', 'اسم الوكالة'], ['slogan', 'الشعار النصي'], ['phones', 'الهواتف'], ['whatsapp', 'واتساب (للرمز QR)'], ['email', 'البريد الإلكتروني'], ['website', 'الموقع / الرابط'], ['address', 'العنوان', 'full'], ['color', 'لون العرض']];
  const DEF_AG = { name: 'مكتب الوسيط 777', slogan: 'مع الوسيط… حلك بسيط', phones: '0777 777 959 · 0777 777 848', whatsapp: '212777777959', email: '', website: '', address: 'مكناس', color: '#c8102e', logo: '' };
  const ag = () => Object.assign({}, DEF_AG, S.base || {}, S.agency || {});

  /* ---------- الخانات حسب النوع ---------- */
  const FORMS = {
    property: [['title', 'عنوان العرض', 'full', 'شقة فاخرة بإطلالة — حمرية'], ['trx', 'المعاملة', 'sel', ['sale', 'rent', 'seasonal']], ['ptype', 'نوع العقار', '', 'شقة / فيلا / بقعة…'], ['price', 'الثمن (درهم)', '', '1500000'], ['city', 'المدينة'], ['district', 'الحي'], ['surface', 'المساحة (م²)'], ['land', 'مساحة الأرض (م²)'], ['rooms', 'عدد الغرف'], ['bedrooms', 'غرف النوم'], ['baths', 'الحمامات'], ['floor', 'الطابق'], ['year', 'سنة البناء'], ['legal', 'الوضعية القانونية', '', 'رسم عقاري'], ['ref', 'المرجع'], ['features', 'المميزات (وحدة فكل سطر)', 'area']],
    project: [['title', 'اسم المشروع', 'full'], ['promoter', 'المنعش العقاري'], ['city', 'المدينة'], ['district', 'الحي'], ['unitsN', 'عدد الوحدات'], ['priceFrom', 'الأثمنة ابتداء من (درهم)'], ['stage', 'حالة الأشغال', '', 'الأشغال الكبرى 60%'], ['delivery', 'تاريخ التسليم', '', 'الربع 4 — 2027'], ['legal', 'الوضعية القانونية'], ['unitsTable', 'الوحدات: النوع | المساحة | الثمن ابتداء من | العدد (سطر لكل نوع)', 'area', 'شقة 2 غرف | 75 | 650000 | 40'], ['amenities', 'التجهيزات (وحدة فكل سطر)', 'area'], ['paymentPlan', 'طريقة الأداء (وحدة فكل سطر)', 'area', '30% عند الحجز\n40% خلال الأشغال\n30% عند التسليم']],
    investor: [['title', 'عنوان الفرصة', 'full'], ['ptype', 'نوع العقار'], ['city', 'المدينة'], ['district', 'الحي'], ['surface', 'المساحة (م²)'], ['price', 'ثمن الاقتناء (درهم)'], ['feesPct', 'مصاريف الشراء (%)', '', '7'], ['works', 'الأشغال (درهم)'], ['rentM', 'الكراء الشهري المتوقع (درهم)'], ['charges', 'التكاليف السنوية (سانديك، ضرائب، صيانة)'], ['vacancy', 'أشهر الفراغ فالسنة', '', '1'], ['growth', 'ارتفاع القيمة السنوي (%)', '', '3'], ['loanPct', 'نسبة القرض (%)', '', '70'], ['rate', 'نسبة الفائدة (%)', '', '4.5'], ['years', 'مدة القرض (سنوات)', '', '20'], ['ref', 'المرجع']],
  };
  const TEXTS = {
    property: [['tagline', 'جملة قصيرة للغلاف', 'full'], ['description', 'تقديم العقار', 'area'], ['highlights', 'نقاط القوة (وحدة فكل سطر)', 'area'], ['location', 'الموقع والقرب (مدارس، طرامواي…)', 'area']],
    project: [['tagline', 'جملة قصيرة للغلاف', 'full'], ['description', 'تقديم المشروع', 'area'], ['highlights', 'نقاط القوة (وحدة فكل سطر)', 'area'], ['location', 'الموقع والقرب', 'area']],
    investor: [['tagline', 'جملة قصيرة للغلاف', 'full'], ['description', 'تقديم الفرصة', 'area'], ['strengths', 'نقاط القوة (وحدة فكل سطر)', 'area'], ['risks', 'المخاطر والاحتياطات (وحدة فكل سطر)', 'area']],
  };
  const TRX_L = { sale: 'للبيع', rent: 'للكراء', seasonal: 'كراء للعطل' };

  function renderForms() {
    const F = S.f[S.kind] || (S.f[S.kind] = {}), X = S.t[S.kind] || (S.t[S.kind] = {});
    const field = (store0, [k, l, kind, ph]) => {
      const v = store0[k] == null ? '' : store0[k];
      if (kind === 'sel') return `<div class="f"><label>${esc(l)}</label><select data-k="${k}">${ph.map(o => `<option value="${o}" ${v === o ? 'selected' : ''}>${TRX_L[o]}</option>`).join('')}</select></div>`;
      if (kind === 'area') return `<div class="f full"><label>${esc(l)}</label><textarea data-k="${k}" rows="4" placeholder="${esc(ph || '')}">${esc(v)}</textarea></div>`;
      return `<div class="f ${kind === 'full' ? 'full' : ''}"><label>${esc(l)}</label><input data-k="${k}" value="${esc(v)}" placeholder="${esc(ph || '')}" ${/price|surface|land|rooms|bed|baths|unitsN|priceFrom|works|rentM|charges|Pct|rate|years|vacancy|growth/.test(k) ? 'inputmode="decimal"' : ''}></div>`;
    };
    $('#form').innerHTML = FORMS[S.kind].map(d => field(F, d)).join('');
    $('#texts').innerHTML = TEXTS[S.kind].map(d => field(X, d)).join('');
    $$('#form [data-k]').forEach(el => el.addEventListener('input', () => { F[el.dataset.k] = el.value; store.set('f', S.f); schedule(); }));
    $$('#texts [data-k]').forEach(el => el.addEventListener('input', () => { X[el.dataset.k] = el.value; store.set('t', S.t); schedule(); }));
  }
  function setPressed(box, v) { $$('[data-v]', box).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); }

  /* ---------- الصور ---------- */
  function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const im = await loadImg(url), k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      return { img: c, thumb: c.toDataURL('image/jpeg', 0.6) };
    } finally { URL.revokeObjectURL(url); }
  }
  async function addFiles(files) {
    const list = Array.from(files || []).slice(0, 30 - S.photos.length); let bad = 0;
    for (const f of list) { try { S.photos.push(await shrink(f)); } catch (e) { bad++; } }
    if (bad) toast(`${bad} صورة ما تفتحاتش — صدّرها JPG وعاود`);
    renderPhotos(); schedule();
  }
  function renderPhotos() {
    $('#photos').innerHTML = S.photos.map((p, i) => `<div class="ph">${i === 0 ? '<span class="cv">الغلاف</span>' : ''}<img src="${p.thumb}" alt=""><div class="tools"><button data-mv="${i}" data-d="-1">◀</button><button data-del="${i}">✕</button><button data-mv="${i}" data-d="1">▶</button></div></div>`).join('') + (S.photos.length < 30 ? '<button class="add" id="addPh">+ إضافة صور</button>' : '');
    const a = $('#addPh'); if (a) a.onclick = () => $('#file').click();
    $$('[data-del]').forEach(b => b.onclick = () => { S.photos.splice(+b.dataset.del, 1); renderPhotos(); schedule(); });
    $$('[data-mv]').forEach(b => b.onclick = () => { const i = +b.dataset.mv, j = i - (+b.dataset.d); if (j < 0 || j >= S.photos.length) return; [S.photos[i], S.photos[j]] = [S.photos[j], S.photos[i]]; renderPhotos(); schedule(); });
  }

  /* ---------- الرسم (canvas) ---------- */
  let LOGO = null, QR = null;
  function rtl() { return S.lang === 'ar'; }
  function font(sz, w) { return `${w || 400} ${sz}px Tajawal, "Noto Sans Arabic", "Segoe UI", Arial, sans-serif`; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // صندوق: x محسوب من بداية الصفحة حسب اتجاه اللغة (يمين للعربية)
  const bx = (x, w) => (rtl() ? W - x - w : x);
  function cover(ctx, img, x, y, w, h, r) {
    ctx.save(); rr(ctx, x, y, w, h, r || 0); ctx.clip();
    if (!img) { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#2b2b2b'); g.addColorStop(1, '#5a5a5a'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
    else { const iw = img.width, ih = img.height, k = Math.max(w / iw, h / ih), dw = iw * k, dh = ih * k; ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
    ctx.restore();
  }
  // نص ملفوف داخل صندوق؛ كيرجع العلو المستعمل
  function text(ctx, str, x, y, w, o) {
    o = o || {}; const sz = o.size || 28, lh = o.lh || sz * 1.45, max = o.max || 99;
    // الاتجاه حسب النص (نص عربي فعرض فرنسي كيبقى صحيح)، والمحاذاة حسب لغة العرض
    ctx.font = font(sz, o.weight); ctx.fillStyle = o.color || '#111'; ctx.textBaseline = 'top';
    ctx.direction = o.dir || (/[\u0600-\u06FF]/.test(String(str || '')) ? 'rtl' : 'ltr');
    const al = o.align || 'start';
    ctx.textAlign = al === 'center' ? 'center' : (al === 'start') === rtl() ? 'right' : 'left';
    const ax = al === 'center' ? x + w / 2 : ctx.textAlign === 'right' ? x + w : x;
    const out = [];
    String(str == null ? '' : str).split('\n').forEach(par => {
      const words = par.split(/\s+/).filter(Boolean); let cur = '';
      words.forEach(wd => { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w && cur) { out.push(cur); cur = wd; } else cur = t; });
      out.push(cur);
    });
    const shown = out.slice(0, max);
    if (out.length > max && shown.length) { let l = shown[shown.length - 1]; while (l && ctx.measureText(l + '…').width > w) l = l.slice(0, -1); shown[shown.length - 1] = l + '…'; }
    shown.forEach((l, i) => ctx.fillText(l, ax, y + i * lh));
    return shown.length * lh;
  }
  function frame(ctx, title, n, dark) {
    const A = ag(), col = A.color || '#c8102e';
    ctx.fillStyle = dark ? '#111' : '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = col; ctx.fillRect(bx(0, 14), 0, 14, H);
    if (title) {
      text(ctx, title, bx(70, 1100), 54, 1100, { size: 50, weight: 900, color: dark ? '#fff' : '#111', max: 1 });
      ctx.fillStyle = col; ctx.fillRect(bx(70, 90), 122, 90, 6);
    }
    if (LOGO) { const s = 84, x = rtl() ? 50 : W - 50 - s; ctx.save(); ctx.beginPath(); ctx.arc(x + s / 2, 40 + s / 2, s / 2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip(); ctx.drawImage(LOGO, x + 6, 46, s - 12, s - 12); ctx.restore(); }
    ctx.fillStyle = dark ? 'rgba(255,255,255,.18)' : '#ececee'; ctx.fillRect(70, H - 70, W - 140, 2);
    const foot = [A.name, A.phones, A.website].filter(Boolean).join('  ·  ');
    text(ctx, foot, bx(70, 1200), H - 54, 1200, { size: 22, color: dark ? '#bbb' : '#666', max: 1 });
    text(ctx, String(n), bx(W - 170, 100), H - 56, 100, { size: 24, weight: 700, color: col, align: 'end', max: 1 });
    return { x: 70, y: 160, w: W - 140, h: H - 160 - 90 };
  }
  function kpis(ctx, items, x, y, w, cols, o) {
    o = o || {}; const A = ag(), gap = 18, cw = (w - gap * (cols - 1)) / cols, ch = o.h || 150;
    items.forEach((it, i) => {
      const r = Math.floor(i / cols), c = i % cols, X = bx(x + c * (cw + gap), cw), Y = y + r * (ch + gap);
      ctx.fillStyle = o.dark ? 'rgba(255,255,255,.08)' : '#f6f6f7'; rr(ctx, X, Y, cw, ch, 18); ctx.fill();
      ctx.fillStyle = A.color; ctx.fillRect(rtl() ? X + cw - 8 : X, Y + 22, 8, ch - 44);
      text(ctx, it[0], X + 30, Y + 24, cw - 60, { size: 24, color: o.dark ? '#bbb' : '#666', max: 1 });
      text(ctx, it[1], X + 30, Y + 62, cw - 60, { size: o.vs || 44, weight: 900, color: o.dark ? '#fff' : '#111', max: 2, lh: (o.vs || 44) * 1.1 });
    });
    return Math.ceil(items.length / cols) * (ch + gap);
  }
  function bullets(ctx, items, x, y, w, o) {
    o = o || {}; const A = ag(); let yy = y; const sz = o.size || 30;
    items.forEach(it => {
      if (yy > (o.maxY || H - 110)) return;
      ctx.fillStyle = A.color; const dx = rtl() ? x + w - 14 : x; ctx.beginPath(); ctx.arc(dx + 7, yy + sz * 0.62, 7, 0, Math.PI * 2); ctx.fill();
      yy += text(ctx, it, rtl() ? x : x + 34, yy, w - 34, { size: sz, color: o.color || '#222', max: 3 }) + 14;
    });
    return yy - y;
  }
  function table(ctx, head, rows, x, y, w, o) {
    o = o || {}; const A = ag(), n = head.length, cw = w / n, rh = o.rh || 74;
    ctx.fillStyle = '#111'; rr(ctx, x, y, w, rh, 14); ctx.fill();
    const cell = (i) => (rtl() ? x + w - (i + 1) * cw : x + i * cw);
    head.forEach((h, i) => text(ctx, h, cell(i) + 18, y + rh / 2 - 15, cw - 36, { size: 26, weight: 700, color: '#fff', max: 1 }));
    rows.forEach((r, ri) => {
      const Y = y + rh * (ri + 1);
      if (ri % 2 === 0) { ctx.fillStyle = '#f6f6f7'; ctx.fillRect(x, Y, w, rh); }
      r.forEach((c, i) => text(ctx, c, cell(i) + 18, Y + rh / 2 - 16, cw - 36, { size: 28, weight: i === r.length - 1 && o.boldLast ? 900 : 500, color: i === r.length - 1 && o.boldLast ? A.color : '#111', max: 1 }));
    });
    return rh * (rows.length + 1);
  }
  function photosGrid(ctx, imgs, x, y, w, h) {
    const n = imgs.length, gap = 16;
    if (n === 1) return cover(ctx, imgs[0].img, x, y, w, h, 22);
    if (n === 2) { const cw = (w - gap) / 2; imgs.forEach((p, i) => cover(ctx, p.img, x + i * (cw + gap), y, cw, h, 22)); return; }
    const big = (w - gap) * 0.6, sm = w - gap - big, sh = (h - gap) / 2;
    cover(ctx, imgs[0].img, bx(x, big), y, big, h, 22);
    cover(ctx, imgs[1].img, bx(x + big + gap, sm), y, sm, sh, 22);
    cover(ctx, imgs[2].img, bx(x + big + gap, sm), y + sh + gap, sm, sh, 22);
  }
  function qrDraw(ctx, x, y, s) {
    if (!QR) return;
    const n = QR.getModuleCount(), cs = s / (n + 2);
    ctx.fillStyle = '#fff'; rr(ctx, x, y, s, s, 16); ctx.fill(); ctx.fillStyle = '#111';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (QR.isDark(r, c)) ctx.fillRect(x + (c + 1) * cs, y + (r + 1) * cs, Math.ceil(cs), Math.ceil(cs));
  }
  const pmt = (P, ratePct, years) => { const r = ratePct / 100 / 12, n = years * 12; if (!P || !n) return 0; return r ? P * r / (1 - Math.pow(1 + r, -n)) : P / n; };

  /* ---------- الشرائح حسب النوع ---------- */
  function plan() {
    const L = T[S.lang], F = S.f[S.kind] || {}, X = S.t[S.kind] || {}, P = S.photos, A = ag(), col = A.color || '#c8102e';
    const sl = [];
    const loc = [F.district, F.city].filter(Boolean).join(S.lang === 'ar' ? '، ' : ', ');
    const coverSlide = (badge, title, sub, big) => sl.push(ctx => {
      cover(ctx, P[0] && P[0].img, 0, 0, W, H, 0);
      const g = ctx.createLinearGradient(0, H * 0.3, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.85)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = col; ctx.fillRect(bx(0, 14), 0, 14, H);
      if (LOGO) { const s = 120, x = rtl() ? W - 70 - s : 70; ctx.save(); ctx.beginPath(); ctx.arc(x + s / 2, 60 + s / 2, s / 2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip(); ctx.drawImage(LOGO, x + 8, 68, s - 16, s - 16); ctx.restore(); }
      if (badge) { ctx.font = font(30, 900); const bw = ctx.measureText(badge).width + 56; const X0 = bx(80, bw); ctx.fillStyle = col; rr(ctx, X0, 470, bw, 62, 31); ctx.fill(); text(ctx, badge, X0, 484, bw, { size: 30, weight: 900, color: '#fff', align: 'center', max: 1 }); }
      const th = text(ctx, title, bx(80, 1300), 552, 1300, { size: 76, weight: 900, color: '#fff', max: 2, lh: 84 });
      if (sub) text(ctx, sub, bx(80, 1300), 566 + th, 1300, { size: 34, color: '#eee', max: 2 });
      if (big) text(ctx, big, bx(80, 1300), H - 110, 1300, { size: 52, weight: 900, color: '#fff', max: 1 });
      text(ctx, [A.name, A.phones].filter(Boolean).join('  ·  '), bx(80, 1440), H - 50, 1440, { size: 22, color: '#ddd', max: 1, align: 'end' });
    });
    const gallery = (from) => { const rest = P.slice(from); for (let i = 0; i < rest.length && sl.length < 18; i += 3) { const g = rest.slice(i, i + 3); sl.push(ctx => { const b = frame(ctx, L.gallery, sl.indexOf(f0) + 1); photosGrid(ctx, g, b.x, b.y, b.w, b.h - 10); }); const f0 = sl[sl.length - 1]; } };
    const descSlide = (title, body, list, listTitle, photo) => sl.push(function self(ctx) {
      const b = frame(ctx, title, sl.indexOf(self) + 1), tw = photo ? 860 : b.w;
      let y = b.y + 10;
      if (body) y += text(ctx, body, bx(b.x, tw), y, tw, { size: 30, color: '#333', max: list && list.length ? 7 : 14, lh: 46 }) + 24;
      if (list && list.length) { if (listTitle) { text(ctx, listTitle, bx(b.x, tw), y, tw, { size: 32, weight: 900, color: col, max: 1 }); y += 52; } bullets(ctx, list, bx(b.x, tw), y, tw, { size: 29 }); }
      if (photo) cover(ctx, photo.img, bx(b.x + tw + 40, b.w - tw - 40), b.y, b.w - tw - 40, b.h - 10, 22);
    });
    const contactSlide = () => sl.push(function self(ctx) {
      frame(ctx, '', sl.indexOf(self) + 1, true);
      if (P[0]) { cover(ctx, P[0].img, bx(W - 640, 640), 0, 640, H, 0); ctx.fillStyle = 'rgba(17,17,17,.35)'; ctx.fillRect(bx(W - 640, 640), 0, 640, H); }
      if (LOGO) { const s = 150, x = rtl() ? W - 90 - s : 90; ctx.save(); ctx.beginPath(); ctx.arc(x + s / 2, 90 + s / 2, s / 2, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip(); ctx.drawImage(LOGO, x + 10, 100, s - 20, s - 20); ctx.restore(); }
      let y = 280;
      y += text(ctx, L.contact, bx(90, 800), y, 800, { size: 64, weight: 900, color: '#fff', max: 2, lh: 72 }) + 14;
      y += text(ctx, A.name, bx(90, 800), y, 800, { size: 38, weight: 700, color: col, max: 1 }) + 10;
      if (A.slogan) y += text(ctx, A.slogan, bx(90, 800), y, 800, { size: 30, color: '#ccc', max: 1 }) + 18;
      [A.phones, A.email, A.website, A.address].filter(Boolean).forEach(v => { y += text(ctx, v, bx(90, 800), y, 800, { size: 30, color: '#fff', max: 2 }) + 10; });
      if (QR) { qrDraw(ctx, bx(90, 190), H - 300, 190); text(ctx, L.scan, bx(300, 520), H - 220, 520, { size: 24, color: '#bbb', max: 2 }); }
    });

    if (S.kind === 'property') {
      const trx = L[F.trx || 'sale'] || L.sale, price = money(F.price, S.lang);
      coverSlide(trx, X.tagline ? (F.title || F.ptype || '') : (F.title || F.ptype || L.property), X.tagline || loc, price ? price + (F.trx === 'rent' ? (S.lang === 'ar' ? ' / الشهر' : S.lang === 'fr' ? ' / mois' : ' / month') : '') : '');
      const k = [];
      if (F.price) k.push([L.price, money(F.price, S.lang)]);
      if (F.surface) k.push([L.surface, fmt(F.surface, S.lang) + ' ' + L.m2]);
      if (F.land) k.push([L.land, fmt(F.land, S.lang) + ' ' + L.m2]);
      if (F.price && F.surface && (F.trx || 'sale') === 'sale') k.push([L.perm2, money(num(F.price) / num(F.surface), S.lang)]);
      if (F.rooms) k.push([L.rooms, F.rooms]); if (F.bedrooms) k.push([L.bedrooms, F.bedrooms]); if (F.baths) k.push([L.baths, F.baths]);
      if (F.floor) k.push([L.floor, F.floor]); if (F.year) k.push([L.year, F.year]); if (F.legal) k.push([L.title, F.legal]); if (F.ref) k.push([L.ref, F.ref]);
      if (k.length) sl.push(function self(ctx) { const b = frame(ctx, (F.ptype || L.property) + (loc ? ' — ' + loc : ''), sl.indexOf(self) + 1); const tw = P[1] ? 900 : b.w; kpis(ctx, k.slice(0, 9), b.x, b.y + 6, tw, P[1] ? 3 : 4, { h: 150, vs: 40 }); if (P[1]) cover(ctx, P[1].img, bx(b.x + tw + 40, b.w - tw - 40), b.y, b.w - tw - 40, b.h - 10, 22); });
      const hl = lines(X.highlights).length ? lines(X.highlights) : lines(F.features);
      if (X.description || hl.length) descSlide(L.desc, X.description, hl.slice(0, 7), L.highlights, P[2] || P[1] || P[0]);
      gallery(3);
      if (X.location) descSlide(L.location + (loc ? ' — ' + loc : ''), X.location, [], '', P[P.length - 1]);
      if (num(F.price) && (F.trx || 'sale') === 'sale') sl.push(function self(ctx) {
        const b = frame(ctx, L.financing, sl.indexOf(self) + 1), pr = num(F.price), down = pr * 0.2, loan = pr - down;
        kpis(ctx, [[L.price, money(pr, S.lang)], [L.down + ' (20%)', money(down, S.lang)], [L.loan, money(loan, S.lang)]], b.x, b.y + 6, b.w, 3, { h: 150, vs: 42 });
        table(ctx, [L.years, L.rate, L.monthly], [15, 20, 25].map(y => [y + ' ' + L.years, '4.5 %', money(pmt(loan, 4.5, y), S.lang)]), b.x, b.y + 200, b.w, { boldLast: true });
        text(ctx, '* ' + L.est, bx(b.x, b.w), b.y + 200 + 74 * 4 + 20, b.w, { size: 22, color: '#888', max: 1 });
      });
    } else if (S.kind === 'project') {
      coverSlide(L.project, F.title || L.project, X.tagline || [F.promoter, loc].filter(Boolean).join(' · '), F.priceFrom ? L.priceFrom + ' ' + money(F.priceFrom, S.lang) : '');
      const k = [];
      if (F.promoter) k.push([L.promoter, F.promoter]); if (loc) k.push([L.location, loc]); if (F.unitsN) k.push([L.unitsN, F.unitsN]);
      if (F.priceFrom) k.push([L.priceFrom, money(F.priceFrom, S.lang)]); if (F.stage) k.push([L.stage, F.stage]); if (F.delivery) k.push([L.delivery, F.delivery]); if (F.legal) k.push([L.title, F.legal]);
      sl.push(function self(ctx) { const b = frame(ctx, L.overview, sl.indexOf(self) + 1); const tw = 880; let y = b.y + 6; if (X.description) y += text(ctx, X.description, bx(b.x, tw), y, tw, { size: 29, color: '#333', max: k.length > 3 ? 5 : 10, lh: 44 }) + 26; kpis(ctx, k.slice(0, 6), bx(b.x, tw) === b.x ? b.x : b.x, y, tw, 2, { h: 112, vs: 34 }); if (P[1] || P[0]) cover(ctx, (P[1] || P[0]).img, bx(b.x + tw + 40, b.w - tw - 40), b.y, b.w - tw - 40, b.h - 10, 22); });
      const rows = lines(F.unitsTable).map(l => l.split('|').map(x => x.trim())).filter(r => r[0]);
      if (rows.length) sl.push(function self(ctx) { const b = frame(ctx, L.units, sl.indexOf(self) + 1); table(ctx, [L.type, L.surface, L.from, L.count], rows.slice(0, 7).map(r => [r[0], r[1] ? r[1] + ' ' + L.m2 : '', r[2] ? money(r[2], S.lang) : '', r[3] || '']), b.x, b.y + 10, b.w, { rh: 76 }); });
      const am = lines(F.amenities), hl = lines(X.highlights);
      if (am.length || hl.length) sl.push(function self(ctx) { const b = frame(ctx, L.amenities, sl.indexOf(self) + 1), hw = (b.w - 60) / 2; if (am.length) bullets(ctx, am.slice(0, 9), bx(b.x, hw), b.y + 10, hw, { size: 29 }); if (hl.length) { text(ctx, L.highlights, bx(b.x + hw + 60, hw), b.y + 6, hw, { size: 32, weight: 900, color: col, max: 1 }); bullets(ctx, hl.slice(0, 8), bx(b.x + hw + 60, hw), b.y + 60, hw, { size: 29 }); } });
      gallery(2);
      const pp = lines(F.paymentPlan);
      if (pp.length || F.stage || F.delivery) sl.push(function self(ctx) { const b = frame(ctx, L.payment, sl.indexOf(self) + 1); let y = b.y + 10; const k2 = []; if (F.stage) k2.push([L.stage, F.stage]); if (F.delivery) k2.push([L.delivery, F.delivery]); if (k2.length) y += kpis(ctx, k2, b.x, y, b.w, 2, { h: 120, vs: 36 }) + 10; bullets(ctx, pp.slice(0, 8), bx(b.x, b.w), y, b.w, { size: 31 }); });
      if (X.location) descSlide(L.location + (loc ? ' — ' + loc : ''), X.location, [], '', P[P.length - 1]);
    } else {
      const pr = num(F.price), fees = pr * (num(F.feesPct || 7) / 100), works = num(F.works), total = pr + fees + works;
      const rentY = num(F.rentM) * (12 - Math.min(12, num(F.vacancy || 0))), charges = num(F.charges), netY = rentY - charges;
      const gross = total ? num(F.rentM) * 12 / total * 100 : 0, net = total ? netY / total * 100 : 0;
      const loan = total * (num(F.loanPct || 0) / 100), lp = pmt(loan, num(F.rate || 4.5), num(F.years || 20)), cash = netY / 12 - lp;
      const pct = v => (Math.round(v * 10) / 10).toLocaleString(S.lang === 'en' ? 'en-US' : 'fr-FR') + ' %';
      coverSlide(L.invest, F.title || F.ptype || L.investor, X.tagline || loc, gross ? L.gross + ' ' + pct(gross) : '');
      sl.push(function self(ctx) { const b = frame(ctx, L.summary, sl.indexOf(self) + 1); const k = [[L.total, money(total, S.lang)], [L.gross, gross ? pct(gross) : '—'], [L.net, net ? pct(net) : '—'], [L.cash, (cash < 0 ? '− ' : '') + money(Math.abs(cash), S.lang)]]; const h = kpis(ctx, k, b.x, b.y + 6, b.w, 4, { h: 170, vs: 44 }); if (X.description) text(ctx, X.description, bx(b.x, b.w), b.y + h + 30, b.w, { size: 29, color: '#333', max: 6, lh: 44 }); });
      sl.push(function self(ctx) {
        const b = frame(ctx, L.finance, sl.indexOf(self) + 1), hw = (b.w - 50) / 2;
        table(ctx, [L.acq, ''], [[L.acq, money(pr, S.lang)], [L.fees + ' (' + (num(F.feesPct || 7)) + '%)', money(fees, S.lang)], [L.works, money(works, S.lang) || '—'], [L.total, money(total, S.lang)]], bx(b.x, hw), b.y + 6, hw, { rh: 70, boldLast: true });
        table(ctx, [L.rentY, ''], [[L.rentM, money(F.rentM, S.lang) || '—'], [L.rentY, money(rentY, S.lang) || '—'], [L.charges, money(charges, S.lang) || '—'], [L.netY, money(netY, S.lang) || '—']], bx(b.x + hw + 50, hw), b.y + 6, hw, { rh: 70, boldLast: true });
        if (loan) text(ctx, `${L.loan}: ${money(loan, S.lang)} · ${L.rate}: ${num(F.rate || 4.5)} % · ${num(F.years || 20)} ${L.years} → ${L.loanPay}: ${money(lp, S.lang)}`, bx(b.x, b.w), b.y + 6 + 70 * 5 + 30, b.w, { size: 27, weight: 700, color: '#333', max: 2 });
        text(ctx, '* ' + L.est, bx(b.x, b.w), b.y + b.h - 60, b.w, { size: 22, color: '#888', max: 1 });
      });
      // إسقاط 5 سنوات: القيمة + الدخل الصافي المتراكم
      sl.push(function self(ctx) {
        const b = frame(ctx, L.projection, sl.indexOf(self) + 1), gr = num(F.growth || 3) / 100, vals = [1, 2, 3, 4, 5].map(i => pr * Math.pow(1 + gr, i) + netY * i), mx = Math.max(...vals, 1);
        const cw = (b.w - 4 * 40) / 5, base = b.y + b.h - 80, hmax = b.h - 200;
        vals.forEach((v, i) => { const h = v / mx * hmax, X = bx(b.x + i * (cw + 40), cw); ctx.fillStyle = i === 4 ? col : '#d9d9de'; rr(ctx, X, base - h, cw, h, 14); ctx.fill(); text(ctx, money(v, S.lang), X, base - h - 44, cw, { size: 24, weight: 700, color: '#111', align: 'center', max: 1 }); text(ctx, (S.lang === 'ar' ? 'السنة ' : S.lang === 'fr' ? 'Année ' : 'Year ') + (i + 1), X, base + 14, cw, { size: 24, color: '#666', align: 'center', max: 1 }); });
        text(ctx, L.value5 + ': ' + money(pr * Math.pow(1 + gr, 5), S.lang) + ' (+' + (gr * 100) + '% / ' + L.years + ')', bx(b.x, b.w), b.y, b.w, { size: 26, color: '#555', max: 1 });
      });
      const st = lines(X.strengths), rk = lines(X.risks);
      if (st.length || rk.length) sl.push(function self(ctx) { const b = frame(ctx, L.strengths + ' · ' + L.risks, sl.indexOf(self) + 1), hw = (b.w - 60) / 2; text(ctx, L.strengths, bx(b.x, hw), b.y, hw, { size: 32, weight: 900, color: '#0a7a2f', max: 1 }); bullets(ctx, st.slice(0, 7), bx(b.x, hw), b.y + 56, hw, { size: 28 }); text(ctx, L.risks, bx(b.x + hw + 60, hw), b.y, hw, { size: 32, weight: 900, color: col, max: 1 }); bullets(ctx, rk.slice(0, 7), bx(b.x + hw + 60, hw), b.y + 56, hw, { size: 28 }); });
      gallery(1);
    }
    contactSlide();
    return sl;
  }

  /* ---------- المعاينة ---------- */
  let timer = 0, gen = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(preview, 350); }
  function drawSlide(fn, w, h) { const c = document.createElement('canvas'); c.width = w || W; c.height = h || H; const ctx = c.getContext('2d'); if (w && w !== W) ctx.scale(w / W, h / H); fn(ctx); return c; }
  async function preview() {
    const g = ++gen; await fontsReady();
    if (g !== gen) return;
    const sl = plan();
    $('#pcount').textContent = `(${sl.length} صفحات)`;
    const big = drawSlide(sl[0]); $('#big').innerHTML = ''; $('#big').appendChild(big);
    const box = $('#slides'); box.innerHTML = '';
    sl.slice(1).forEach((fn, i) => { const d = document.createElement('div'); d.className = 's'; d.appendChild(drawSlide(fn, 480, 270)); d.insertAdjacentHTML('beforeend', `<span>${i + 2}</span>`); box.appendChild(d); });
  }
  let fontsP = null;
  function fontsReady() {
    if (!fontsP) fontsP = Promise.all(['400', '700', '900'].map(w => document.fonts ? document.fonts.load(`${w} 40px Tajawal`, 'مرحبا Abc 123').catch(() => null) : null)).then(() => null);
    return Promise.race([fontsP, new Promise(r => setTimeout(r, 2500))]);
  }

  /* ---------- PDF (صور JPEG ← ملف PDF، بلا مكتبات) ---------- */
  function utf16hex(s) { let h = 'FEFF'; for (const ch of String(s)) { const c = ch.codePointAt(0); if (c > 0xffff) { const v = c - 0x10000; h += (0xd800 + (v >> 10)).toString(16).padStart(4, '0') + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0'); } else h += c.toString(16).padStart(4, '0'); } return '<' + h.toUpperCase() + '>'; }
  function buildPdf(pages, title) {
    const enc = new TextEncoder(), parts = [], xref = []; let off = 0;
    const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); off += b.length; };
    const PW = 960, PH = 540, n = pages.length, infoN = 3 + n * 3;
    push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
    const obj = (id, f) => { xref[id] = off; push(id + ' 0 obj\n'); f(); push('\nendobj\n'); };
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R /PageLayout /SinglePage >>'));
    obj(2, () => push(`<< /Type /Pages /Kids [${pages.map((_, i) => (3 + i * 3) + ' 0 R').join(' ')}] /Count ${n} >>`));
    pages.forEach((p, i) => {
      const pg = 3 + i * 3, im = pg + 1, ct = pg + 2, cs = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
      obj(pg, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`));
      obj(im, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`); push(p.bytes); push('\nendstream'); });
      obj(ct, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    });
    obj(infoN, () => push(`<< /Title ${utf16hex(title)} /Producer (Al Wasset Group - PROJECT) /Creator (PROJECT) >>`));
    const xo = off;
    let x = `xref\n0 ${infoN + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= infoN; i++) x += String(xref[i]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${infoN + 1} /Root 1 0 R /Info ${infoN} 0 R >>\nstartxref\n${xo}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }
  async function makePdf() {
    const btn = $('#mk'), msg = $('#mkMsg'); btn.disabled = true; msg.textContent = '⏳ كنصاوب الصفحات…';
    try {
      await fontsReady();
      const sl = plan(), pages = [];
      for (let i = 0; i < sl.length; i++) {
        const c = drawSlide(sl[i]);
        const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
        pages.push({ bytes: new Uint8Array(await b.arrayBuffer()), w: c.width, h: c.height });
        msg.textContent = `⏳ الصفحة ${i + 1} / ${sl.length}`;
      }
      const F = S.f[S.kind] || {}, title = F.title || T[S.lang][S.kind];
      const pdf = buildPdf(pages, title + ' — ' + ag().name);
      const name = ('PROJECT-' + (F.ref || S.kind) + '-' + new Date().toISOString().slice(0, 10)).replace(/[^\w.-]+/g, '-') + '.pdf';
      await savePdf(pdf, name);
      msg.textContent = `✓ PDF جاهز: ${sl.length} صفحات · ${(pdf.size / 1048576).toFixed(1)} ميغا`;
    } catch (e) { msg.textContent = '⚠️ ما تصاوبش الـ PDF — عاود (ولا نقص الصور).'; }
    finally { btn.disabled = false; }
  }
  async function savePdf(blob, name) {
    let file = null; try { file = new File([blob], name, { type: 'application/pdf' }); } catch (e) { /* */ }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 6000);
  }

  /* ---------- الوكيل: كيكتب النصوص ---------- */
  const pending = {}; let seq = 0;
  function ask(type, payload) { return new Promise((res, rej) => { const id = 'p' + (++seq); pending[id] = { res, rej }; window.parent.postMessage(Object.assign({ type, id }, payload), ORIGIN); setTimeout(() => { if (pending[id]) { delete pending[id]; rej({ code: 'timeout' }); } }, 90000); }); }
  function aiPrompt() {
    const F = S.f[S.kind] || {}, langName = { ar: 'Modern Standard Arabic (clear, elegant, professional)', fr: 'French (professional, elegant)', en: 'English (professional, elegant)' }[S.lang];
    const want = S.kind === 'investor' ? '"tagline","description","strengths":[...],"risks":[...]' : '"tagline","description","highlights":[...],"location"';
    return `You are a senior real-estate marketing writer for a Moroccan agency (${ag().name}). Write the texts of a professional ${S.kind === 'property' ? 'property presentation' : S.kind === 'project' ? 'real-estate development project presentation' : 'investment file for investors'} (PDF slides).
Data (may be incomplete): ${JSON.stringify(F)}
Photos: ${S.photos.length} (you see the first ones).
Rules:
- Write everything in ${langName}.
- Use ONLY the data and what you see in the photos. Never invent prices, surfaces, distances, names, guarantees or yields. If something is unknown, leave it out.
- Prices are in Moroccan dirhams (DH). "مليون" in Moroccan speech = 10,000 DH.
- tagline: max 70 characters. description: 3–5 short sentences (max 520 characters). Lists: 4–6 short items (max 70 characters each), no emoji.
- location (if relevant): 2–3 sentences about the area, only general facts that are safe for ${F.city || 'the city'}${F.district ? ' / ' + F.district : ''}; no invented distances.
${S.kind === 'investor' ? '- strengths: why it is a good investment based on the data; risks: honest precautions (vacancy, charges, legal checks, financing rate…).' : ''}
Reply ONLY with a JSON object: {${want}}`;
  }
  async function runAI() {
    const st = $('#aiSt'), b = $('#aiGo');
    if (!embedded) { st.textContent = 'الوكيل كيخدم غير من داخل تطبيق مجموعة الوسيط.'; return; }
    b.disabled = true; st.textContent = '✍️ الوكيل كيكتب…';
    try {
      const imgs = S.photos.slice(0, 4).map(p => { const k = Math.min(1, 1024 / Math.max(p.img.width, p.img.height)); const c = document.createElement('canvas'); c.width = p.img.width * k; c.height = p.img.height * k; c.getContext('2d').drawImage(p.img, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.8); });
      const r = await ask('w777-sample', { prompt: aiPrompt(), images: imgs });
      const X = S.t[S.kind] || (S.t[S.kind] = {});
      const L = v => (Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean).join('\n') : String(v || '').trim());
      ['tagline', 'description', 'location'].forEach(k => { if (r[k]) X[k] = L(r[k]).slice(0, 900); });
      ['highlights', 'strengths', 'risks'].forEach(k => { if (r[k]) X[k] = L(r[k]).slice(0, 900); });
      store.set('t', S.t); renderForms(); schedule();
      st.textContent = '✓ تكتبو النصوص — راجعهم وبدّل اللي بغيتي.';
    } catch (e) {
      st.textContent = e && e.code === 'not_granted' ? 'دخل بالحساب ديالك فالتطبيق باش يخدم الوكيل.' : e && e.code === 'rate_limited' ? 'وصلتي للحد اليومي — عاود غدا.' : '⚠️ ما خدمش دابا — عاود من بعد.';
    } finally { b.disabled = false; }
  }

  /* ---------- الإعدادات ---------- */
  function renderAgency() {
    const A = ag();
    $('#agForm').innerHTML = AG_FIELDS.map(([k, l, c]) => k === 'color' ? `<div class="f"><label>${l}</label><input type="color" data-a="color" value="${esc(A.color || '#c8102e')}"></div>` : `<div class="f ${c || ''}"><label>${l}</label><input data-a="${k}" value="${esc(A[k] || '')}"></div>`).join('');
    $('#logoPrev').style.backgroundImage = A.logo ? `url("${A.logo}")` : 'url("../icons/icon-192.png")';
    $('#topLogo').src = A.logo || '../icons/icon-192.png';
  }
  async function refreshAssets() {
    const A = ag();
    LOGO = null;
    try { LOGO = await loadImg(A.logo || '../icons/icon-192.png'); } catch (e) { LOGO = null; }
    QR = null;
    const wa = String(A.whatsapp || String(A.phones || '').split(/[·,/|]/)[0] || '').replace(/\D/g, '').replace(/^00/, '').replace(/^0/, '212');
    if (wa.length >= 9 && window.qrcode) { try { const q = window.qrcode(0, 'M'); q.addData('https://wa.me/' + wa); q.make(); QR = q; } catch (e) { QR = null; } }
  }

  /* ---------- التطبيق الأم ---------- */
  function prefill(m) {
    if (m.agency) { S.base = Object.assign({}, m.agency); }
    if (m.lang && T[m.lang] && !store.get('langSet', false)) { S.lang = m.lang; }
    if (m.fields) {
      S.kind = m.kind || 'property'; const F = S.f[S.kind] = Object.assign({}, m.fields);
      S.t[S.kind] = { description: m.description || '' };
      store.set('f', S.f); store.set('t', S.t); store.set('kind', S.kind);
      S.photos = []; renderPhotos();
      (async () => { for (const b of (m.photos || []).slice(0, 30)) { try { S.photos.push(await shrink(b)); } catch (e) { /* */ } } renderPhotos(); schedule(); })();
      void F;
    }
    setPressed($('#kind'), S.kind); setPressed($('#lang'), S.lang);
    renderForms(); renderAgency(); refreshAssets().then(schedule);
  }
  window.addEventListener('message', e => {
    if (e.origin !== ORIGIN || e.source !== window.parent) return;
    const m = e.data || {};
    if (m.type === 'w777-sample-res' && pending[m.id]) { const p = pending[m.id]; delete pending[m.id]; if (m.ok) p.res(m.json); else p.rej({ code: m.code }); }
    else if (m.type === 'w777-project-prefill') prefill(m);
  });

  /* ---------- التشغيل ---------- */
  function wire() {
    $$('.tabs button').forEach(b => b.onclick = () => { $$('.tabs button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#tab-create').hidden = b.dataset.tab !== 'create'; $('#tab-settings').hidden = b.dataset.tab !== 'settings'; if (b.dataset.tab === 'settings') renderAgency(); });
    $('#kind').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; S.kind = b.dataset.v; store.set('kind', S.kind); setPressed($('#kind'), S.kind); renderForms(); schedule(); };
    $('#lang').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; S.lang = b.dataset.v; store.set('lang', S.lang); store.set('langSet', true); setPressed($('#lang'), S.lang); schedule(); };
    $('#file').onchange = e => { addFiles(e.target.files); e.target.value = ''; };
    $('#mk').onclick = makePdf;
    $('#aiGo').onclick = runAI;
    $('#logoPick').onclick = () => $('#logoFile').click();
    $('#logoFile').onchange = async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; try { const r = await shrink(f); const c = document.createElement('canvas'), k = Math.min(1, 400 / Math.max(r.img.width, r.img.height)); c.width = r.img.width * k; c.height = r.img.height * k; c.getContext('2d').drawImage(r.img, 0, 0, c.width, c.height); S.agency = Object.assign({}, S.agency || {}, { logo: c.toDataURL('image/png') }); store.set('agency', S.agency); renderAgency(); await refreshAssets(); schedule(); toast('تزاد اللوغو ✓'); } catch (er) { toast('اللوغو ما تفتحش — استعمل PNG ولا JPG'); } };
    $('#logoDel').onclick = async () => { S.agency = Object.assign({}, S.agency || {}, { logo: '' }); store.set('agency', S.agency); renderAgency(); await refreshAssets(); schedule(); };
    $('#agSave').onclick = async () => { const a = Object.assign({}, S.agency || {}); $$('[data-a]').forEach(el => { a[el.dataset.a] = el.value.trim(); }); S.agency = a; store.set('agency', a); await refreshAssets(); schedule(); toast('تحفظات معلومات الوكالة ✓'); };
    $('#agReset').onclick = async () => { S.agency = null; store.set('agency', null); renderAgency(); await refreshAssets(); schedule(); toast('رجعات معلومات المكتب'); };
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
  }
  function boot() {
    wire(); setPressed($('#kind'), S.kind); setPressed($('#lang'), S.lang);
    renderForms(); renderPhotos(); renderAgency();
    refreshAssets().then(schedule);
    if (embedded) window.parent.postMessage({ type: 'w777-project-ready' }, ORIGIN);
  }
  window.W777_PROJECT = { state: S, plan, buildPdf, makePdf };
  boot();
})();
