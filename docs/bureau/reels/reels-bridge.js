/* جسر VIDOMIDO ← تطبيق مجموعة الوسيط
   - «المخرج الذكي» كيخدم بالوكيل ديالنا (Gemini فابور) عبر التطبيق الأم، بلاصة خدمات Claude
   - التسجيل: مشاركة الفيديو (iPhone ← «حفظ الفيديو») ولا تحميل مباشر
   - التطبيق الأم كيعمر العقار (الصور + البطاقة) ومعلومات الوكالة واللغة
   كيتحمّل قبل السكريبت الرئيسي ديال VIDOMIDO؛ الدوال ديالو (S، addPhotos، setMode…) كتتنادى غير من بعد ما يتحل. */
(function () {
  'use strict';
  var embedded = window.parent && window.parent !== window;
  var ORIGIN = location.origin;
  var pending = {};
  var seq = 0;

  function ask(type, payload) {
    return new Promise(function (resolve, reject) {
      var id = 'r' + (++seq) + '-' + Date.now();
      pending[id] = { resolve: resolve, reject: reject };
      window.parent.postMessage(Object.assign({ type: type, id: id }, payload), ORIGIN);
    });
  }
  function blobToDataUrl(b) {
    return new Promise(function (res) { var f = new FileReader(); f.onload = function () { res(String(f.result)); }; f.onerror = function () { res(''); }; f.readAsDataURL(b); });
  }

  // التسجيل: كنفضلو المشاركة (فـ iPhone كتعطي «حفظ الفيديو» فالصور)، وإلا تحميل عادي
  var downloads = {
    save: function (o) {
      if (embedded) try { window.parent.postMessage({ type: 'w777-made', kind: 'reels' }, ORIGIN); } catch (e) { /* */ }
      var file;
      try { file = new File([o.data], o.filename, { type: (o.data && o.data.type) || 'video/mp4' }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: o.filename }).then(function () { return { status: 'saved' }; }, function (e) {
          if (e && e.name === 'AbortError') throw { code: 'declined' };
          return dl(o);
        });
      }
      return Promise.resolve(dl(o));
    },
  };
  function dl(o) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(o.data); a.download = o.filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    return { status: 'saved' };
  }

  // «المخرج الذكي»: نفس الواجهة اللي كيتسنى VIDOMIDO (limits / json) ولكن عبر الوكيل ديالنا
  var sample = embedded ? {
    limits: function () { return Promise.resolve({ images: { maxCount: 4 } }); },
    json: function (prompt, opts) {
      opts = opts || {};
      var sig = opts.signal;
      return Promise.all((opts.images || []).slice(0, 4).map(blobToDataUrl)).then(function (imgs) {
        if (sig && sig.aborted) throw { code: 'cancelled' };
        if (opts.onText) try { opts.onText(''); } catch (e) { /* */ }
        var p = ask('w777-sample', { prompt: String(prompt).slice(0, 12000), images: imgs.filter(Boolean) });
        if (!sig) return p;
        return new Promise(function (res, rej) {
          sig.addEventListener('abort', function () { rej({ code: 'cancelled' }); }, { once: true });
          p.then(res, rej);
        });
      });
    },
  } : null;

  window.claude = {
    use: function (name) {
      if (name === 'downloads') return Promise.resolve(downloads);
      if (name === 'sample') return sample ? Promise.resolve(sample) : Promise.reject({ code: 'not_declared' });
      return Promise.reject({ code: 'not_declared' });
    },
  };

  if (!embedded) return;

  // جاهز: من بعد ما يتحل VIDOMIDO (البطاقة عامرة بالأنواع)
  function ready() {
    try { return typeof S !== 'undefined' && S.imageScenes && document.querySelector('#adType option'); } catch (e) { return false; }
  }
  var tries = 0;
  (function waitReady() {
    if (ready()) { window.parent.postMessage({ type: 'w777-reels-ready' }, ORIGIN); return; }
    if (++tries < 200) setTimeout(waitReady, 50);
  })();

  function setLogo(dataUrl) {
    if (!/^data:image\//.test(dataUrl || '')) return;
    var im = new Image();
    im.onload = function () { try { S.logo = im; S.logoData = dataUrl; store.set('logo', dataUrl); renderLogoPrev(); redraw(); } catch (e) { /* */ } };
    im.src = dataUrl;
  }

  function prefill(m) {
    try {
      if (m.lang && ['ar', 'fr', 'en'].indexOf(m.lang) >= 0 && typeof LANG !== 'undefined' && LANG !== m.lang) setLang(m.lang);
      store.set('onboarded', true);
      var onb = document.getElementById('onb'); if (onb) onb.hidden = true;
      if (m.agency) {
        Object.keys(m.agency).forEach(function (k) { if (m.agency[k]) S.agency[k] = String(m.agency[k]).slice(0, 120); });
        store.set('agency', S.agency);
        if (m.agency.logo) setLogo(m.agency.logo);
      }
      if (m.listing) {
        setMode('annonce');
        // عقار جديد: كنحيدو صور العقار اللي قبل
        S.imageScenes = [newScene(SAMPLE, { title: '', sub: '' })];
        Object.keys(m.listing).forEach(function (k) { if (m.listing[k] != null) S.listing[k] = String(m.listing[k]); });
        store.set('listing', S.listing);
        syncAdForm();
        var files = (m.photos || []).map(function (b, i) {
          try { return new File([b], 'photo-' + (i + 1) + '.jpg', { type: b.type || 'image/jpeg' }); } catch (e) { return b; }
        });
        if (files.length) addPhotos(files);
        else { buildAd(null); }
        showView('create');
      } else syncAdForm();
      redraw();
    } catch (e) { /* VIDOMIDO مازال ما تحلش */ }
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN || e.source !== window.parent) return;
    var m = e.data || {};
    if (m.type === 'w777-sample-res' && pending[m.id]) {
      var p = pending[m.id]; delete pending[m.id];
      if (m.ok) p.resolve(m.json); else p.reject({ code: m.code || 'error' });
    } else if (m.type === 'w777-reels-prefill') prefill(m);
  });
})();
