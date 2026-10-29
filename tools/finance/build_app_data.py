#!/usr/bin/env python3
"""يبني docs/bureau/finance-data.js (زر «التمويل العقاري») من tools/finance/institutions.json
غير المعلومات الأساسية: الاسم، الصنف، الموقع، الهاتف، الحالة، الشعار — بلا نسب ولا شروط (كيتزادو من بعد ما يأكدهم المكتب).
الاستعمال: python3 tools/finance/build_app_data.py"""
import json, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
D = json.load(open(os.path.join(ROOT, 'tools/finance/institutions.json')))
FIN = os.path.join(ROOT, 'docs/bureau/icons/fin')
HAS = {os.path.splitext(f)[0] for f in os.listdir(FIN) if f.endswith('.webp')}
GROUP = {'assafa': 'awb', 'wafaimmo': 'awb', 'wafabail': 'awb', 'awb_eu': 'awb', 'yousr': 'bcp', 'marocleasing': 'bcp', 'attawfiq': 'bcp', 'chaabi_fr': 'bcp',
         'bti': 'boa', 'maghrebail': 'boa', 'bmce_eu': 'boa', 'cih': 'g_cdg', 'daamsakane': 'g_cdg', 'cdm': 'g_holmarcom', 'arreda': 'cdm', 'najmah': 'bmci',
         'daralamane': 'saham', 'akhdar': 'cam', 'icd': 'g_isdb'}
out = []
for i in D['inst']:
    g = GROUP.get(i['id'])
    out.append({
        'id': i['id'], 'cat': i['cat'], 'name': i['name'], 'ar': i['ar'], 'group': '' if 'confirmer' in (i['group'] or '').lower() else i['group'],
        'web': i['web'], 'city': i.get('city', ''), 'mre': i['mre'], 'types': i['types'], 'status': i['status'],
        'phones': [[l, n, s] for l, n, s in i['phones']][:4],
        'logo': i['id'] if i['id'] in HAS else '', 'glogo': g if g and g in HAS else '',
        'products': [p for p, _, s in i['products'] if s == 'v'][:4],
    })
js = '/* مولّد بـ tools/finance/build_app_data.py — ما تبدلوش باليد. معلومات تعريفية؛ الشروط كتتزاد غير بعد تأكيدها. */\nwindow.W777_FIN = ' + json.dumps({'date': D['date'], 'cats': D['cats'], 'inst': out}, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(ROOT, 'docs/bureau/finance-data.js'), 'w').write(js)
print(len(out), 'institutions,', sum(1 for x in out if x['logo']), 'logos')
