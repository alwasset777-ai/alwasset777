#!/usr/bin/env python3
"""لائحة الصور اللي كيحمّلها زر «📥 حفظ للاستعمال بلا إنترنت» (offline-files.json).
الاستعمال: python3 tools/offline_files.py [docs/bureau]  — كتعاود تتولد مع كل نشر (deploy-pages.sh)."""
import json, os, sys
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'docs', 'bureau')
DIRS = ['game/img', 'guide', 'icons', 'vendor/leaflet/images']
EXT = ('.webp', '.png', '.jpg', '.jpeg', '.svg')
out = []
for d in DIRS:
    for base, _, files in os.walk(os.path.join(root, d)):
        for f in files:
            if f.lower().endswith(EXT):
                out.append(os.path.relpath(os.path.join(base, f), root).replace(os.sep, '/'))
out.sort()
with open(os.path.join(root, 'offline-files.json'), 'w') as fh:
    json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))
print(len(out), 'files')
