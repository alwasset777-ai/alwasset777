/* ============================================================
   المزامنة السحابية (Supabase) — نفس البيانات على الهاتف والماك
   - الحساب: بريد + كلمة سر (Supabase Auth)
   - الجدول: w777_records (انظر supabase.sql)
   - الصور والفيديو: Storage bucket «w777-media» (خاص)
   - التطبيق يبقى يعمل بدون إنترنت، والمزامنة تتم عند توفر الاتصال
   ============================================================ */
(function () {
  'use strict';
  const DB = window.W777_DB;
  const LS = 'w777_cloud';
  const BUCKET = 'w777-media';
  const TABLE = 'w777_records';
  const STORES = ['properties', 'requests', 'appointments'];
  const LISTS = ['ledger', 'leases'];

  let st = null;
  try { st = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { st = null; }
  const save = () => { if (st) localStorage.setItem(LS, JSON.stringify(st)); else localStorage.removeItem(LS); };

  let status = { state: 'off', msg: '', at: null };
  const statusCbs = [];
  const changeCbs = [];
  const pullHooks = [];
  const setStatus = (state, msg) => { status = { state, msg: msg || '', at: new Date().toISOString() }; statusCbs.forEach(f => f(status)); };

  function defaults() {
    const c = window.__ALWASSET_SUPABASE__ || {};
    return { url: (st && st.url) || c.url || '', key: (st && st.key) || c.anonKey || '' };
  }
  const cleanUrl = u => String(u || '').trim().replace(/\/+$/, '');

  /* ---------- المصادقة ---------- */
  async function authCall(url, key, path, body) {
    const res = await fetch(url + path, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || data.error || ('HTTP ' + res.status));
    return data;
  }
  function takeSession(url, key, d) {
    const prev = st;
    st = {
      url, key, email: d.user && d.user.email, uid: d.user && d.user.id,
      access: d.access_token, refresh: d.refresh_token,
      exp: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
    };
    // حساب موظف: كنحتافظو بالمكتب والصلاحية عند تجديد الجلسة
    if (prev && prev.uid === st.uid) { st.owner = prev.owner; st.srole = prev.srole; st.staffAt = prev.staffAt; }
    save();
  }
  // حسابات الشبكة بلا @: «agence001»/«1» ← وكالة، «wasit001»/«W001» ← وسيط،
  // «btp001»/«B001» ← مقاولة، «finition001»/«F001» ← تشطيب (…@alwasset777.ma)
  const PREFIX = { staff: 'staff', s: 'staff', agence: 'agence', agency: 'agence', ag: 'agence', a: 'agence', '': 'agence', wasit: 'wasit', w: 'wasit', btp: 'btp', b: 'btp', finition: 'finition', f: 'finition', invest: 'invest', i: 'invest', notaire: 'notaire', n: 'notaire', jamia: 'jamia', j: 'jamia' };
  function normEmail(e) {
    e = String(e || '').trim().toLowerCase();
    if (e.includes('@')) return e;
    const m = e.match(/^([a-z]*)[\s-]*0*(\d{1,3})$/);
    return m && Object.prototype.hasOwnProperty.call(PREFIX, m[1]) ? PREFIX[m[1]] + m[2].padStart(3, '0') + '@alwasset777.ma' : e;
  }
  // 👥 حساب موظف ← كيخدم على بيانات المكتب ديال مولاه (حسب الصلاحية)
  const dOwner = () => (st && (st.owner || st.uid));
  async function resolveStaff(force) {
    if (!st || (!force && st.staffAt && Date.now() - st.staffAt < 3600000)) return;
    try {
      const res = await api(`/rest/v1/w777_staff?uid=eq.${st.uid}&active=is.true&select=owner,role`);
      if (!res.ok) return;
      const r = (await res.json())[0];
      // موظف تحيّد ولا توقف: كنمسحو بيانات المكتب من هاد الجهاز وكنخرجو
      if (st.owner && !r) {
        for (const k of [...STORES, 'files']) await DB.clear(k).catch(() => {});
        for (const k of [...LISTS, 'sync_dirty', 'sync_cursor', 'sync_uploaded']) await DB.setMeta(k, k === 'sync_dirty' || k === 'sync_uploaded' ? {} : (LISTS.includes(k) ? [] : null));
        signOut(); setStatus('error', 'الحساب ديالك ما بقاش مفعّل فالمكتب'); changeCbs.forEach(f => f(1));
        throw new Error('staff revoked');
      }
      st.owner = r ? r.owner : null; st.srole = r ? r.role : null; st.staffAt = Date.now(); save();
    } catch (e) { if (e && e.message === 'staff revoked') throw e; /* كنعاودو من بعد */ }
  }
  async function signIn(url, key, email, password) {
    url = cleanUrl(url); key = String(key || '').trim(); email = normEmail(email);
    const d = await authCall(url, key, '/auth/v1/token?grant_type=password', { email, password });
    takeSession(url, key, d);
    await resolveStaff(true);
    // موظف كيدخل: ما نرفعوش بيانات هاد الجهاز للمكتب (غير كنجيبو بيانات المكتب)
    if (st.owner) { await DB.setMeta('sync_dirty', {}); await DB.setMeta('sync_cursor', null); await DB.setMeta('sync_uploaded', {}); }
    else await firstSyncPrep();
    setStatus('idle');
    syncNow();
    return st;
  }
  async function signUp(url, key, email, password) {
    url = cleanUrl(url); key = String(key || '').trim();
    const d = await authCall(url, key, '/auth/v1/signup', { email, password });
    if (d.access_token) { takeSession(url, key, d); await firstSyncPrep(); setStatus('idle'); syncNow(); return { confirmed: true }; }
    return { confirmed: false };
  }
  function signOut() { st = null; save(); setStatus('off'); signed = {}; try { localStorage.removeItem(SIGN_LS); } catch (e) { /* */ } }
  async function refreshToken() {
    const d = await authCall(st.url, st.key, '/auth/v1/token?grant_type=refresh_token', { refresh_token: st.refresh });
    takeSession(st.url, st.key, d);
  }
  async function api(path, opts = {}, retry = true) {
    if (!st) throw new Error('غير متصل بالحساب');
    if (st.exp * 1000 < Date.now() + 60000) await refreshToken();
    const headers = Object.assign({ apikey: st.key, Authorization: 'Bearer ' + st.access }, opts.headers || {});
    const res = await fetch(st.url + path, Object.assign({}, opts, { headers }));
    if (res.status === 401 && retry) { await refreshToken(); return api(path, opts, false); }
    return res;
  }
  async function ok(res) {
    if (res.ok) return res;
    const t = await res.text().catch(() => '');
    let m = t;
    try { const j = JSON.parse(t); m = j.message || j.error || j.msg || t; } catch (e) { /* */ }
    throw new Error(m || ('HTTP ' + res.status));
  }

  /* عند أول ربط: كل البيانات المحلية تُرفع */
  async function firstSyncPrep() {
    const dirty = await DB.getMeta('sync_dirty', {});
    const now = Date.now();
    for (const s of STORES) (await DB.all(s)).forEach(o => { dirty[s + ':' + o.id] = now; });
    dirty['meta:settings'] = now;
    dirty['meta:customDistricts'] = now;
    LISTS.forEach(k => { dirty['meta:' + k] = now; });
    await DB.setMeta('sync_dirty', dirty);
    await DB.setMeta('sync_cursor', null);
    await DB.setMeta('sync_uploaded', {});
  }

  /* ---------- السحب ---------- */
  async function pull() {
    let cursor = await DB.getMeta('sync_cursor', null);
    // تداخل دقيقتين لتفادي ضياع أي تعديل متزامن
    let since = cursor ? new Date(Date.parse(cursor) - 120000).toISOString() : '1970-01-01T00:00:00Z';
    let changed = 0;
    for (;;) {
      const res = await ok(await api(`/rest/v1/${TABLE}?select=kind,id,data,deleted,synced_at,edited_by&owner=eq.${dOwner()}&synced_at=gt.${encodeURIComponent(since)}&order=synced_at.asc&limit=1000`));
      const rows = await res.json();
      for (const r of rows) changed += await apply(r);
      if (rows.length) {
        since = rows[rows.length - 1].synced_at;
        if (!cursor || since > cursor) cursor = since;
      }
      if (rows.length < 1000) break;
    }
    if (cursor) await DB.setMeta('sync_cursor', cursor);
    return changed;
  }
  async function apply(row) {
    const dirty = await DB.getMeta('sync_dirty', {});
    const dkey = row.kind + ':' + row.id;
    if (STORES.includes(row.kind)) {
      const local = await DB.get(row.kind, row.id);
      const rT = (row.data && row.data.updatedAt) || '';
      const lT = (local && local.updatedAt) || '';
      if (row.deleted) {
        if (local && lT <= rT) {
          await DB.del(row.kind, row.id);
          if (row.kind === 'properties') await DB.delFilesOf(row.id);
          delete dirty[dkey]; await DB.setMeta('sync_dirty', dirty);
          return 1;
        }
        return 0;
      }
      // حذف محلي لم يُرفع بعد: يبقى محذوفا إلا إذا عُدّل على جهاز آخر بعد الحذف
      if (!local && dirty[dkey] && Date.parse(rT || 0) <= dirty[dkey]) return 0;
      if (!local || rT > lT) {
        if (row.edited_by && row.data) row.data._by = row.edited_by; // شكون دار آخر تعديل
        await DB.put(row.kind, row.data);
        delete dirty[dkey]; await DB.setMeta('sync_dirty', dirty);
        return 1;
      }
      return 0;
    }
    if (row.kind === 'meta' && row.id === 'customDistricts') {
      const local = await DB.getMeta('customDistricts', {});
      const remote = (row.data && row.data.value) || {};
      const merged = Object.assign({}, local);
      let grew = false, localExtra = false;
      Object.entries(remote).forEach(([c, ds]) => {
        const cur = new Set(merged[c] || []);
        ds.forEach(d => { if (!cur.has(d)) { cur.add(d); grew = true; } });
        merged[c] = Array.from(cur);
      });
      Object.entries(local).forEach(([c, ds]) => { ds.forEach(d => { if (!(remote[c] || []).includes(d)) localExtra = true; }); });
      if (grew) await DB.setMeta('customDistricts', merged);
      if (localExtra) { dirty[dkey] = Date.now(); await DB.setMeta('sync_dirty', dirty); }
      return grew ? 1 : 0;
    }
    // لوائح (الحسابات، عقود الكراء): كل عنصر بوحدو — الأحدث كيربح، والحذف علامة deleted
    if (row.kind === 'meta' && LISTS.includes(row.id)) {
      const local = await DB.getMeta(row.id, []);
      const remote = (row.data && row.data.value) || [];
      if (!Array.isArray(remote)) return 0;
      const map = new Map(local.map(x => [x.id, x])), rmap = new Map(remote.map(x => [x.id, x]));
      let grew = false, localExtra = false;
      remote.forEach(r => { const l = map.get(r.id); if (!l || (r.updatedAt || '') > (l.updatedAt || '')) { map.set(r.id, r); grew = true; } });
      local.forEach(l => { const r = rmap.get(l.id); if (!r || (l.updatedAt || '') > (r.updatedAt || '')) localExtra = true; });
      if (grew) await DB.setMeta(row.id, Array.from(map.values()));
      if (localExtra) { dirty[dkey] = Date.now(); await DB.setMeta('sync_dirty', dirty); }
      return grew ? 1 : 0;
    }
    if (row.kind === 'meta' && row.id === 'settings') {
      const local = await DB.getMeta('settings', {});
      const remote = (row.data && row.data.value) || {};
      if ((remote.updatedAt || '') > (local.updatedAt || '')) { await DB.setMeta('settings', remote); return 1; }
      return 0;
    }
    return 0;
  }

  /* ---------- الرفع ---------- */
  async function push() {
    // موظف «مشاهدة فقط»: ما كيرفع والو
    if (st.owner && st.srole === 'view') { await DB.setMeta('sync_dirty', {}); return; }
    const snap = await DB.getMeta('sync_dirty', {});
    const keys = Object.keys(snap);
    if (!keys.length) return;
    const rows = [];
    const fileDeletes = [];
    for (const k of keys) {
      const i = k.indexOf(':');
      const kind = k.slice(0, i), id = k.slice(i + 1);
      if (kind === 'file') { fileDeletes.push(id); continue; }
      let data = null;
      if (kind === 'meta') data = { value: await DB.getMeta(id, {}), updatedAt: new Date().toISOString() };
      else data = await DB.get(kind, id);
      rows.push({ owner: dOwner(), kind, id, data: data || { updatedAt: new Date().toISOString() }, deleted: !data });
    }
    for (let i = 0; i < rows.length; i += 200) {
      await ok(await api(`/rest/v1/${TABLE}?on_conflict=owner,kind,id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows.slice(i, i + 200)),
      }));
    }
    if (fileDeletes.length) {
      const prefixes = fileDeletes.flatMap(id => [dOwner() + '/' + id, dOwner() + '/' + id + '.t']);
      await api(`/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes }) });
      const up = await DB.getMeta('sync_uploaded', {});
      fileDeletes.forEach(id => delete up[id]);
      await DB.setMeta('sync_uploaded', up);
    }
    // إزالة ما تم رفعه فقط (إن لم يتغير أثناء الرفع)
    const now = await DB.getMeta('sync_dirty', {});
    keys.forEach(k => { if (now[k] === snap[k]) delete now[k]; });
    await DB.setMeta('sync_dirty', now);
  }

  /* نسخة مصغرة للسحابة (المساحة المجانية 1 جيغا) — الأصل يبقى كما هو على الجهاز */
  const CLOUD_MAX = 1280, CLOUD_Q = 0.72, CLOUD_MIN_BYTES = 220 * 1024;
  async function cloudImage(blob) {
    if (!blob || !/^image\/(jpeg|png|webp|heic|heif)/i.test(blob.type || '') || blob.size <= CLOUD_MIN_BYTES) return blob;
    try {
      let bmp;
      try { bmp = await createImageBitmap(blob); } catch (e) {
        // Safari كيقرا HEIC عبر <img>
        const url = URL.createObjectURL(blob);
        try { bmp = new Image(); bmp.src = url; await bmp.decode(); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
      }
      const bw = bmp.naturalWidth || bmp.width, bh = bmp.naturalHeight || bmp.height;
      const k = Math.min(1, CLOUD_MAX / Math.max(bw, bh));
      const w = Math.round(bw * k), h = Math.round(bh * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      const out = await new Promise(r => c.toBlob(r, 'image/jpeg', CLOUD_Q));
      return out && out.size < blob.size ? out : blob;
    } catch (e) { return blob; }
  }

  // ترتيب الرفع: الصور أولا (العقارات الجديدة قبل القديمة)، من بعد المستندات، والفيديوهات فالأخير.
  // ملف فشل كيتعاود من بعد مدة (ما كيبقاش يوقف الطابور)، وملف أكبر من الحد كيبقى فالجهاز.
  const UP_MAX = 48 * 1048576, UP_PAR = 3, UP_BUDGET = 40000;
  async function uploadFiles() {
    const up = await DB.getMeta('sync_uploaded', {});
    const fail = await DB.getMeta('sync_fail', {});
    const skip = await DB.getMeta('sync_skip', {});
    const owners = [...(await DB.all('properties')), ...(await DB.all('requests'))];
    // غير الملفات اللي كاينة فهاد الجهاز (بلا ما نقلبو على آلاف الصور اللي جات من السحابة)
    const local = new Set((await DB.fileIndex()).map(f => f.id));
    const now = Date.now();
    const todo = [];
    owners.forEach(o => (o.media || []).forEach(m => {
      if (up[m.id] || skip[m.id] || !local.has(m.id)) return;
      const f = fail[m.id];
      if (f && now - f.at < Math.min(6, f.n) * 10 * 60000) return;
      const rank = m.kind === 'photo' ? 0 : m.kind === 'video' ? 2 : 1;
      todo.push({ id: m.id, rank, t: o.createdAt || '', size: m.size || 0 });
    }));
    todo.sort((a, b) => a.rank - b.rank || (a.rank === 2 ? a.size - b.size : b.t.localeCompare(a.t)));
    if (!todo.length) return { failed: 0, more: 0, big: Object.keys(skip).length };
    let failed = 0, done = 0, i = 0;
    const t0 = Date.now();
    const put = (path, blob, type) => api(`/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST', headers: { 'Content-Type': type || blob.type || 'application/octet-stream', 'x-upsert': 'true', 'cache-control': '31536000' }, body: blob,
    }).then(ok);
    async function one(item) {
      const rec = await DB.get('files', item.id);
      if (!rec || !rec.blob) return;
      try {
        const body = await cloudImage(rec.blob);
        if (body.size > UP_MAX) { skip[rec.id] = { size: body.size, at: Date.now() }; return; }
        await put(dOwner() + '/' + rec.id, body, body.type || rec.mime);
        // مصغرة ما تصغراتش (HEIC ما تقراش) = نسخة من الأصل: ما نرفعوهاش، كنقراو الأصل بلاصتها
        if (rec.thumb && rec.thumb !== rec.blob && rec.thumb.size < 300 * 1024) await put(dOwner() + '/' + rec.id + '.t', rec.thumb, 'image/jpeg');
        up[rec.id] = 1; delete fail[rec.id];
      } catch (e) {
        failed++;
        const m = String(e && e.message || e);
        if (/too large|exceeded|413|maximum allowed size/i.test(m)) skip[rec.id] = { size: rec.blob.size, at: Date.now() };
        else fail[rec.id] = { n: ((fail[rec.id] && fail[rec.id].n) || 0) + 1, at: Date.now() };
      }
      done++;
      setStatus('syncing', `رفع الصور والملفات ${done}/${todo.length}`);
    }
    async function worker() {
      while (i < todo.length && Date.now() - t0 < UP_BUDGET) {
        await one(todo[i++]);
        // كنحفظو التقدم بانتظام (إلا تسد التطبيق ما يضيعش اللي ترفع)
        if (done % 5 === 0) await DB.setMeta('sync_uploaded', up);
      }
    }
    await Promise.all(Array.from({ length: UP_PAR }, worker));
    await DB.setMeta('sync_uploaded', up);
    await DB.setMeta('sync_fail', fail);
    await DB.setMeta('sync_skip', skip);
    return { failed, more: todo.length - i, big: Object.keys(skip).length };
  }
  /* تنزيل ملف غير موجود على هذا الجهاز (رابط موقّع: طلب واحد لعدة ملفات، والملف الناقص كيبان بلا ما نطلبوه) */
  async function fetchFile(id, thumb) {
    if (!st || !navigator.onLine) return null;
    try {
      const u = await netPhotoUrl(dOwner(), id, thumb);
      if (!u) return null;
      const res = await fetch(u);
      return res.ok ? res.blob() : null;
    } catch (e) { return null; }
  }
  /* روابط موقّعة (7 أيام) لصور عقارات الشبكة: طلب واحد لعشرات الصور، والمتصفح
     كيحمّلهم مباشرة ويحتفظ بهم فالذاكرة — أسرع بزاف من تحميل كل صورة بوحدها */
  const SIGN_LS = 'w777_signed', SIGN_TTL = 7 * 86400;
  let signed = {};
  try { signed = JSON.parse(localStorage.getItem(SIGN_LS) || '{}') || {}; } catch (e) { signed = {}; }
  let signQ = new Map(), signT = null;
  function saveSigned() {
    const now = Date.now();
    const keys = Object.keys(signed);
    keys.forEach(k => { if (signed[k].e < now) delete signed[k]; });
    if (Object.keys(signed).length > 4000) signed = {};
    try { localStorage.setItem(SIGN_LS, JSON.stringify(signed)); } catch (e) { signed = {}; try { localStorage.removeItem(SIGN_LS); } catch (x) { /* */ } }
  }
  function signedUrl(path) {
    const c = signed[path];
    if (c && c.e > Date.now() + 3600000) return Promise.resolve(c.u);
    if (!st || !navigator.onLine) return Promise.resolve(null);
    if (signQ.has(path)) return signQ.get(path).p;
    let res; const p = new Promise(r => { res = r; });
    signQ.set(path, { p, res });
    if (!signT) signT = setTimeout(flushSign, 25);
    return p;
  }
  async function flushSign() {
    signT = null;
    const batch = signQ; signQ = new Map();
    const paths = [...batch.keys()];
    for (let i = 0; i < paths.length; i += 100) {
      const part = paths.slice(i, i + 100);
      let out = [];
      try {
        const r = await api(`/storage/v1/object/sign/${BUCKET}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: SIGN_TTL, paths: part }) });
        if (r.ok) out = await r.json();
      } catch (e) { out = []; }
      const got = {};
      (Array.isArray(out) ? out : []).forEach(x => { if (x && x.signedURL && !x.error) got[x.path] = st.url + '/storage/v1' + x.signedURL; });
      part.forEach(pth => { const u = got[pth] || null; if (u) signed[pth] = { u, e: Date.now() + SIGN_TTL * 1000 }; batch.get(pth).res(u); });
    }
    saveSigned();
  }
  /* رابط صورة عقار مشترك (المصغرة إن وُجدت) */
  async function netPhotoUrl(owner, id, thumb) {
    const full = signedUrl(owner + '/' + id);
    if (thumb) { const t = await signedUrl(owner + '/' + id + '.t'); if (t) return t; }
    return full;
  }
  /* صورة عقار مشترك من حساب آخر (شبكة الوكالات) */
  async function fetchPath(owner, id, thumb) {
    if (!st || !navigator.onLine) return null;
    const get = async path => {
      const res = await api(`/storage/v1/object/authenticated/${BUCKET}/${path}`);
      return res.ok ? res.blob() : null;
    };
    try {
      if (thumb) { const t = await get(owner + '/' + id + '.t'); if (t) return t; }
      return await get(owner + '/' + id);
    } catch (e) { return null; }
  }

  /* ---------- التشغيل ---------- */
  let running = null;
  let again = false;
  async function syncNow() {
    if (!st) { setStatus('off'); return; }
    if (!navigator.onLine) { setStatus('offline', 'بدون إنترنت — ستتم المزامنة عند عودة الاتصال'); return; }
    if (running) { again = true; return running; }
    running = (async () => {
      setStatus('syncing', 'جاري المزامنة…');
      try {
        await resolveStaff();
        let changed = await pull();
        for (const h of pullHooks) { try { const n = await h(); if (n) changed += n; } catch (e) { console.warn('pull hook', e); } }
        await push();
        const { failed, more, big } = await uploadFiles();
        await DB.setMeta('sync_last', new Date().toISOString());
        if (more) { again = true; setStatus('syncing', `بقي ${more} ملف للرفع…`); }
        else if (failed) setStatus('warn', `تعذر رفع ${failed} ملف — غادي نعاودو المحاولة أوتوماتيكيا`);
        else setStatus('ok', big ? `تمت المزامنة · ${big} فيديو كبير بزاف (أكثر من 48 MB) بقى غير فهاد الجهاز` : 'تمت المزامنة');
        if (changed) changeCbs.forEach(f => f(changed));
      } catch (e) {
        const m = String(e && e.message || e);
        if (m === 'staff revoked') return;
        if (/refresh|invalid.*token|JWT/i.test(m)) setStatus('error', 'انتهت الجلسة — المرجو تسجيل الدخول من جديد');
        else if (/w777_records|relation|schema cache/i.test(m)) setStatus('error', 'قاعدة البيانات غير مهيأة — نفّذ ملف supabase.sql');
        else setStatus('error', m);
      } finally {
        running = null;
        if (again) { again = false; setTimeout(syncNow, 500); }
      }
    })();
    return running;
  }
  let timer = null;
  function schedule() {
    if (!st) return;
    clearTimeout(timer);
    timer = setTimeout(syncNow, 3000);
  }

  window.addEventListener('online', () => syncNow());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
  setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, 3 * 60 * 1000);

  window.W777_SYNC = {
    isOn: () => !!st,
    account: () => st && { email: st.email, url: st.url },
    defaults,
    signIn, signUp, signOut, syncNow, schedule, fetchFile, fetchPath, netPhotoUrl, normEmail,
    status: () => status,
    lastSync: () => DB.getMeta('sync_last', null),
    pending: async () => Object.keys(await DB.getMeta('sync_dirty', {})).length,
    onStatus: f => statusCbs.push(f),
    onChange: f => changeCbs.push(f),
    // يُنفَّذ بعد كل سحب (مثلا: جلب عقارات الوكالات الشريكة)
    onPulled: f => pullHooks.push(f),
    request: (path, opts) => api(path, opts).then(ok),
    uid: () => st && st.uid,
    // مول البيانات (المكتب) — الموظف كيخدم على بيانات مولاه
    dataOwner: dOwner,
    staff: () => (st && st.owner ? { owner: st.owner, role: st.srole } : null),
  };
})();
