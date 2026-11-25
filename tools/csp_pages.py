#!/usr/bin/env python3
# 🛡️ v210: سياسة أمان المحتوى (CSP) للصفحات العمومية — كتسمح غير للسكريبت ديال التطبيق
# (الملفات ديال الموقع + السكريبت الداخلي بالبصمة sha256 ديالو)، وكتمنع أي سكريبت مدسوس (XSS).
# كتعاود تحسب البصمة ملي يتبدل السكريبت الداخلي: python3 tools/csp_pages.py [docs/bureau]
# (كتخدم أوتوماتيكيا فـ tools/deploy-pages.sh قبل النشر)
import base64, hashlib, re, sys, pathlib

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent / 'docs/bureau')
PAGES = ['academy-print', 'brand-print', 'brand', 'catalog', 'decouvrir', 'game', 'games', 'join', 'partner', 'stays', 'verify', 'install']
h = lambda s: "'sha256-" + base64.b64encode(hashlib.sha256(s.encode('utf-8')).digest()).decode() + "'"

def csp(hashes):
    return ("default-src 'self'; "
            f"script-src 'self' 'unsafe-hashes' {' '.join(hashes)}; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; "
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co; "
            "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com https://maps.google.com; "
            "worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://wa.me https://api.whatsapp.com; "
            "upgrade-insecure-requests")

for name in PAGES:
    p = ROOT / f'{name}.html'
    s = p.read_text(encoding='utf-8')
    inline = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)
    handlers = re.findall(r'\son[a-z]+="([^"]*)"', s)
    hashes = sorted({h(x) for x in inline} | {h(x) for x in handlers})
    meta = f'<meta http-equiv="Content-Security-Policy" data-w777-csp content="{csp(hashes)}">'
    s2 = re.sub(r'<meta http-equiv="Content-Security-Policy" data-w777-csp content="[^"]*">', meta, s)
    if s2 == s and 'data-w777-csp' not in s:
        s2 = re.sub(r'(<meta charset="[^"]*"\s*/?>)', r'\1\n  ' + meta.replace('\\', '\\\\') + '\n  <meta name="referrer" content="strict-origin-when-cross-origin">', s, count=1)
        if s2 == s: raise SystemExit(f'no <meta charset> in {name}.html')
    if s2 != s: p.write_text(s2, encoding='utf-8')
    print(f'{name}.html: {len(inline)} inline, {len(handlers)} handlers')
