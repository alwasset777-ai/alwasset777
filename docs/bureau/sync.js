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
  const STORES = ['properties', 'requests'];

  let st = null;
  try { st = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { st = null; }
  const save = () => { if (st) localStorage.setItem(LS, JSON.stringify(st)); else localStorage.removeItem(LS); };

  let status = { state: 'off', msg: '', at: null };
  const statusCbs = [];
  const changeCbs = [];
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
    st = {
      url, key, email: d.user && d.user.email, uid: d.user && d.user.id,
      access: d.access_token, refresh: d.refresh_token,
      exp: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
    };
    save();
  }
  async function signIn(url, key, email, password) {
    url = cleanUrl(url); key = String(key || '').trim();
    const d = await authCall(url, key, '/auth/v1/token?grant_type=password', { email, password });
    takeSession(url, key, d);
    await firstSyncPrep();
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
  function signOut() { st = null; save(); setStatus('off'); }
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
      const res = await ok(await api(`/rest/v1/${TABLE}?select=kind,id,data,deleted,synced_at&synced_at=gt.${encodeURIComponent(since)}&order=synced_at.asc&limit=1000`));
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
      rows.push({ owner: st.uid, kind, id, data: data || { updatedAt: new Date().toISOString() }, deleted: !data });
    }
    for (let i = 0; i < rows.length; i += 200) {
      await ok(await api(`/rest/v1/${TABLE}?on_conflict=owner,kind,id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows.slice(i, i + 200)),
      }));
    }
    if (fileDeletes.length) {
      const prefixes = fileDeletes.flatMap(id => [st.uid + '/' + id, st.uid + '/' + id + '.t']);
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

  async function uploadFiles() {
    const up = await DB.getMeta('sync_uploaded', {});
    const owners = [...(await DB.all('properties')), ...(await DB.all('requests'))];
    const todo = [];
    owners.forEach(p => (p.media || []).forEach(m => { if (!up[m.id]) todo.push(m.id); }));
    let failed = 0;
    for (let i = 0; i < todo.length; i++) {
      const rec = await DB.get('files', todo[i]);
      if (!rec || !rec.blob) continue;
      setStatus('syncing', `رفع الملفات ${i + 1}/${todo.length}`);
      try {
        const put = (path, blob) => api(`/storage/v1/object/${BUCKET}/${path}`, {
          method: 'POST', headers: { 'Content-Type': blob.type || rec.mime || 'application/octet-stream', 'x-upsert': 'true', 'cache-control': '31536000' }, body: blob,
        }).then(ok);
        await put(st.uid + '/' + rec.id, rec.blob);
        if (rec.thumb) await put(st.uid + '/' + rec.id + '.t', rec.thumb);
        up[rec.id] = 1;
        await DB.setMeta('sync_uploaded', up);
      } catch (e) { failed++; }
    }
    return failed;
  }

  /* تنزيل ملف غير موجود على هذا الجهاز */
  async function fetchFile(id, thumb) {
    if (!st || !navigator.onLine) return null;
    const get = async path => {
      const res = await api(`/storage/v1/object/authenticated/${BUCKET}/${path}`);
      return res.ok ? res.blob() : null;
    };
    try {
      if (thumb) { const t = await get(st.uid + '/' + id + '.t'); if (t) return t; }
      return await get(st.uid + '/' + id);
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
        const changed = await pull();
        await push();
        const failed = await uploadFiles();
        await DB.setMeta('sync_last', new Date().toISOString());
        setStatus(failed ? 'warn' : 'ok', failed ? `تعذر رفع ${failed} ملف (ربما حجمه كبير جدا)` : 'تمت المزامنة');
        if (changed) changeCbs.forEach(f => f(changed));
      } catch (e) {
        const m = String(e && e.message || e);
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
    signIn, signUp, signOut, syncNow, schedule, fetchFile,
    status: () => status,
    lastSync: () => DB.getMeta('sync_last', null),
    pending: async () => Object.keys(await DB.getMeta('sync_dirty', {})).length,
    onStatus: f => statusCbs.push(f),
    onChange: f => changeCbs.push(f),
  };
})();
