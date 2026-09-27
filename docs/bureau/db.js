/* ============================================================
   قاعدة البيانات المحلية (IndexedDB) — تعمل بدون إنترنت
   المخازن: properties | requests | files (صور/فيديو/مستندات) | meta
   ============================================================ */
(function () {
  'use strict';
  const DB_NAME = 'wasset777_bureau';
  const DB_VERSION = 1;
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('properties')) db.createObjectStore('properties', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('requests')) db.createObjectStore('requests', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('files')) {
          const s = db.createObjectStore('files', { keyPath: 'id' });
          s.createIndex('owner', 'owner', { unique: false });
        }
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  function tx(store, mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      Promise.resolve(fn(s)).then(r => { result = r; });
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('abort'));
    }));
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

  window.W777_DB = DB;
})();
