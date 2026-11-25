/* ============================================================
   قاعدة البيانات المحلية (IndexedDB) — تعمل بدون إنترنت
   المخازن: properties | requests | appointments | files (صور/فيديو/مستندات) | meta
   ============================================================ */
(function () {
  'use strict';
  // 🔗 v224: رابط التجربة (?demo=1، و&tour=1 ← العرض الأوتوماتيكي) كيحل وضع العرض مباشرة — قبل ما تتحل القاعدة
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('demo') === '1') { localStorage.setItem('w777_demo', '1'); sessionStorage.setItem('w777_demo_link', q.get('ref') || '1'); if (q.get('tour') === '1') sessionStorage.setItem('w777_tour', '1'); }
  } catch (e) { /* */ }
  // 🎬 v223: «وضع العرض» كيخدم على قاعدة منفصلة بمعلومات خيالية (المعلومات الحقيقية ما كتمسّش)
  const DEMO = (() => { try { return localStorage.getItem('w777_demo') === '1'; } catch (e) { return false; } })();
  const DB_NAME = DEMO ? 'wasset777_demo' : 'wasset777_bureau';
  const DB_VERSION = 2;
  let dbp = null;

  // 🛡️ v223: فالآيفون، أول فتح ديال القاعدة من بعد إعادة التحميل كيبقى أحياناً بلا جواب (مشكل معروف فـ Safari)
  // ← كنستناو 3–4 ثواني، كنفيقو القاعدة (indexedDB.databases) ونعاودو (حتى 4 مرات) بلا ما يتبلوكا التطبيق
  // ⚡ v225: Safari (الآيفون) كيبقى أحياناً بلا جواب فأول فتح ← كنعيطو indexedDB.databases() كل 100ms حتى يجاوب (أقصى 3 ث)
  let ready = null;
  function idbReady() {
    if (ready) return ready;
    const ua = navigator.userAgent || '';
    if (!indexedDB.databases || !/Safari\//.test(ua) || /Chrom(e|ium)|Android/.test(ua)) return (ready = Promise.resolve());
    let iv;
    ready = Promise.race([
      new Promise(res => { const go = () => { indexedDB.databases().then(res, res); }; iv = setInterval(go, 100); go(); }),
      new Promise(res => setTimeout(res, 3000)),
    ]).then(() => clearInterval(iv));
    return ready;
  }
  function open() {
    if (dbp) return dbp;
    dbp = (async () => {
      await idbReady();
      for (let i = 0; i < 4; i++) {
        try {
          if (i && indexedDB.databases) await Promise.race([indexedDB.databases().catch(() => {}), new Promise(r => setTimeout(r, 800))]);
          return await openOnce(i ? 4000 : 3000);
        } catch (e) { if (!(e && e.message === 'idb-timeout') || i === 3) throw e; }
      }
    })();
    dbp.catch(() => { dbp = null; });
    return dbp;
  }
  function openOnce(ms) {
    return new Promise((resolve, reject) => {
      let done = false;
      const tm = setTimeout(() => { if (!done) { done = true; reject(new Error('idb-timeout')); } }, ms);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('properties')) db.createObjectStore('properties', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('requests')) db.createObjectStore('requests', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('files')) {
          const s = db.createObjectStore('files', { keyPath: 'id' });
          s.createIndex('owner', 'owner', { unique: false });
        }
        if (!db.objectStoreNames.contains('appointments')) db.createObjectStore('appointments', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => {
        const db = req.result;
        if (done) { try { db.close(); } catch (e) { /* */ } return; }
        done = true; clearTimeout(tm);
        // نسخة جديدة ولا الآيفون سدّ القاعدة (التطبيق فالخلفية) ← الفتحة الجاية كتعاود تتحل
        db.onversionchange = () => { try { db.close(); } catch (e) { /* */ } dbp = null; };
        db.onclose = () => { dbp = null; };
        resolve(db);
      };
      req.onerror = () => { if (done) return; done = true; clearTimeout(tm); reject(req.error); };
    });
  }

  function tx(store, mode, fn, again) {
    return open().then(db => {
      let t;
      // الآيفون سدّ الاتصال (التطبيق بقى فالخلفية) ← كنعاودو نحلو القاعدة مرة وحدة
      try { t = db.transaction(store, mode); } catch (e) { if (!again && e && e.name === 'InvalidStateError') { dbp = null; return tx(store, mode, fn, true); } throw e; }
      return new Promise((resolve, reject) => {
      const s = t.objectStore(store);
      let result;
      Promise.resolve(fn(s)).then(r => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('abort'));
      });
    });
  }
  const wrap = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  const DB = {
    all: store => tx(store, 'readonly', s => wrap(s.getAll())),
    get: (store, id) => tx(store, 'readonly', s => wrap(s.get(id))),
    put: (store, obj) => tx(store, 'readwrite', s => wrap(s.put(obj))),
    del: (store, id) => tx(store, 'readwrite', s => wrap(s.delete(id))),
    clear: store => tx(store, 'readwrite', s => wrap(s.clear())),

    filesOf: ownerId => tx('files', 'readonly', s => wrap(s.index('owner').getAll(ownerId))),
    async delFilesOf(ownerId) {
      const files = await DB.filesOf(ownerId);
      await tx('files', 'readwrite', s => { files.forEach(f => s.delete(f.id)); });
    },

    fileIndex: () => open().then(db => new Promise((resolve, reject) => {
      const out = [];
      const req = db.transaction('files', 'readonly').objectStore('files').index('owner').openKeyCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) { out.push({ owner: c.key, id: c.primaryKey }); c.continue(); } else resolve(out);
      };
      req.onerror = () => reject(req.error);
    })),

    async getMeta(key, def) {
      const r = await DB.get('meta', key);
      return r ? r.value : def;
    },
    setMeta: (key, value) => DB.put('meta', { key, value }),

    /* ---------- تتبع التغييرات للمزامنة السحابية ----------
       dirty = { 'properties:id': 1, 'requests:id': 1, 'meta:settings': 1, 'file:id': 1 } */
    async markDirty(kind, id) {
      const d = await DB.getMeta('sync_dirty', {});
      d[kind + ':' + id] = Date.now();
      await DB.setMeta('sync_dirty', d);
      if (window.W777_SYNC) window.W777_SYNC.schedule();
    },
    async saveRec(store, obj) {
      obj.updatedAt = new Date().toISOString();
      await DB.put(store, obj);
      await DB.markDirty(store, obj.id);
    },
    async delRec(store, id) {
      await DB.del(store, id);
      await DB.markDirty(store, id);
    },

    async nextRef(prefix, min) {
      const k = 'counter_' + prefix;
      const n = Math.max(await DB.getMeta(k, 0), min || 0) + 1;
      await DB.setMeta(k, n);
      return prefix + '-' + String(n).padStart(4, '0');
    },

    async estimate() {
      if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate();
      return null;
    },
    async persist() {
      try {
        if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
      } catch (e) { /* ignore */ }
      return false;
    },
  };

  DB.isDemo = DEMO;
  window.W777_DB = DB;
})();
