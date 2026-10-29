#!/usr/bin/env python3
"""كيستخرج النص ديال نماذج العقود (files/contrats/*.pdf) لـ files/contrats/texts.json — منير كيقراه باش يعمّر ويصلح العقود."""
import json, os, re, subprocess
D = os.path.join(os.path.dirname(__file__), '..', 'docs', 'bureau', 'files', 'contrats')
out = {}
for f in sorted(os.listdir(D)):
    if not f.endswith('.pdf') or f.startswith('00'):
        continue
    t = subprocess.run(['pdftotext', os.path.join(D, f), '-'], capture_output=True, text=True).stdout
    t = re.sub('[‎‏‪-‮⁦-⁩\f]', '', t)
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n\s*\n+', '\n', t).strip()
    out[f[:-4]] = t
json.dump(out, open(os.path.join(D, 'texts.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'contracts', sum(len(v) for v in out.values()), 'chars')
