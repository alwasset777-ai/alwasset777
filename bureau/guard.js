/* 🛡️ v210: حماية من «clickjacking» — إلا شي موقع آخر حط التطبيق داخل إطار (iframe) باش يخدع المستعمل،
   الصفحة كتخبّى وكتخرج للنافذة الكبيرة. الإطارات ديال التطبيق نفسو (نفس الموقع) مسموحة. */
(function () {
  try {
    if (window.top === window.self) return;
    if (window.top.location.origin === window.location.origin) return; // نفس الموقع: مسموح
    throw new Error('x');
  } catch (e) {
    document.documentElement.style.display = 'none';
    try { window.top.location.replace(window.location.href); } catch (er) { /* المتصفح منع الخروج: الصفحة كتبقى مخبية */ }
  }
})();
