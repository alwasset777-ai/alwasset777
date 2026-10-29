# PDF 1 — الدليل الشامل لجهات التمويل العقاري (وثيقة عمل داخلية، ما كتدخلش للتطبيق)
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

D = json.load(open(os.path.join(HERE, 'institutions.json')))
INST = D['inst']; CATS = D['cats']; DATE = D['date']
HAS = {os.path.splitext(f)[0] for f in os.listdir(f'{APP}/icons/fin')}
GROUP = {'assafa': 'awb', 'wafaimmo': 'awb', 'wafabail': 'awb', 'awb_eu': 'awb', 'yousr': 'bcp', 'marocleasing': 'bcp', 'attawfiq': 'bcp', 'chaabi_fr': 'bcp',
         'bti': 'boa', 'maghrebail': 'boa', 'bmce_eu': 'boa', 'cih': 'g_cdg', 'daamsakane': 'g_cdg', 'cdm': 'g_holmarcom', 'arreda': 'cdm', 'najmah': 'bmci',
         'daralamane': 'saham', 'akhdar': 'cam', 'icd': 'g_isdb'}
logo = lambda i: f'{FIN}/{i}.webp' if i in HAS else None
glogo = lambda i: logo(GROUP[i]) if i in GROUP else None
SRC = {'v': ('●', 'src-v', 'موقع رسمي — تم التحقق'), 's': ('◐', 'src-s', 'مصدر ثانوي — يُؤكَّد هاتفياً')}
MRE = {'oui': 'نعم', 'non': 'لا', 'à confirmer': 'يُؤكَّد'}


def src(k):
    if not k: return ''
    s, c, t = SRC[k]
    return f'<span class="{c}" title="{t}">{s}</span>'


def main_phone(i):
    return i['phones'][0][1] if i['phones'] else '—'


cnt = {k: sum(1 for i in INST if i['status'] == k) for k in STATUS}
by = {c[0]: [i for i in INST if i['cat'] == c[0]] for c in CATS}
num = {}
n = 0
for c in CATS:
    for i in by[c[0]]:
        n += 1; num[i['id']] = n

CSS = BASE_CSS + LP_CSS + f"""
.cover {{ height: 263mm; position: relative; display: flex; flex-direction: column; break-after: page; }}
.cover .top {{ display: flex; justify-content: space-between; align-items: flex-start; }}
.cover .brand {{ display: flex; align-items: center; gap: 10px; }}
.cover .brand img {{ width: 64px; height: 64px; }}
.cover .brand b {{ display: block; font-size: 11pt; letter-spacing: .12em; }}
.cover .brand small {{ font-size: 9pt; color: {GREY}; }}
.cover .field {{ margin: 18mm 0 10mm; text-align: center; }}
.cover h1 {{ font-size: 40pt; font-weight: 900; letter-spacing: -.01em; }}
.cover h1 em {{ font-style: normal; color: {RED}; }}
.cover .fr {{ font-size: 13pt; font-weight: 300; letter-spacing: .18em; text-transform: uppercase; direction: ltr; margin-top: 6px; }}
.cover .meta {{ display: flex; gap: 22px; margin-top: 12px; font-size: 9.5pt; color: #333; }}
.cover .meta b {{ color: {RED}; }}
.cover .strip {{ margin-top: auto; display: grid; grid-template-columns: repeat(9, 1fr); gap: 10px 14px; align-items: center; padding-top: 10px; border-top: 1px solid {INK}; }}
.cover .strip img {{ max-width: 100%; max-height: 26px; margin: auto; display: block; object-fit: contain; filter: grayscale(1) contrast(1.1); opacity: .8; }}
.cover .foot {{ display: flex; justify-content: space-between; font-size: 8pt; color: {GREY}; margin-top: 8px; }}
.big3 {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0 16px; }}
.big3 div {{ border-top: 2px solid {INK}; padding-top: 6px; }}
.big3 b {{ font-size: 26pt; font-weight: 300; display: block; line-height: 1.1; }}
.big3 div:first-child b {{ color: {RED}; }}
.big3 small {{ font-size: 8.5pt; color: #444; }}
.key {{ display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; font-size: 9pt; margin: 6px 0 12px; }}
.toc {{ columns: 2; column-gap: 26px; font-size: 8.4pt; line-height: 1.45; }}
.toc .c {{ break-inside: avoid; margin-bottom: 7px; }}
.toc .c b {{ display: block; border-bottom: 1px solid {INK}; margin-bottom: 3px; }}
.toc .c span {{ display: flex; gap: 6px; }} .toc .c span i {{ font-style: normal; color: {RED}; width: 22px; }}
.sum td {{ padding: 4px 6px; line-height: 1.35; }} .sum td:first-child {{ color: {RED}; font-weight: 700; }}
.sum img {{ max-height: 18px; max-width: 54px; object-fit: contain; }}
.card {{ border: 1px solid #e3e3e3; border-top: 3px solid {INK}; border-radius: 4px; padding: 11px 13px 12px; margin: 0 0 12px; break-inside: avoid; }}
.card.ok {{ border-top-color: #1f9d68; }} .card.partial {{ border-top-color: #e0a100; }} .card.missing {{ border-top-color: {RED}; }}
.card .hd {{ display: flex; align-items: center; justify-content: space-between; gap: 12px; }}
.card .hd .t {{ flex: 1; }}
.card .hd .t b {{ font-size: 12.5pt; display: block; line-height: 1.25; }}
.card .hd .t small {{ color: {GREY}; font-size: 8.6pt; }}
.card .hd .n {{ font-size: 18pt; font-weight: 300; color: {RED}; min-width: 30px; }}
.card .grid {{ display: grid; grid-template-columns: 1.05fr 1fr; gap: 6px 18px; margin-top: 8px; }}
.card h4 {{ margin: 6px 0 2px; font-size: 8.4pt; letter-spacing: .06em; color: {RED}; font-weight: 800; }}
.card ul {{ margin: 0; padding-inline-start: 16px; }} .card li {{ margin: 1px 0; font-size: 8.8pt; }}
.card .ph {{ display: flex; justify-content: space-between; gap: 8px; font-size: 8.8pt; border-bottom: .5px dotted #ddd; padding: 1px 0; }}
.card .ph span:last-child {{ direction: ltr; white-space: nowrap; font-weight: 700; }}
.card .fr {{ direction: ltr; text-align: left; unicode-bidi: isolate; }}
.card .after {{ margin-top: 8px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 10px; font-size: 7.8pt; color: #555; }}
.card .after div {{ border-bottom: .6px dashed #bdbdbd; padding-bottom: 12px; }}
.cat-head {{ display: flex; align-items: flex-end; justify-content: space-between; margin: 0 0 10px; }}
.track th, .track td {{ font-size: 7pt; padding: 3px 4px; line-height: 1.25; }}
.track td {{ height: 19px; padding: 2px 4px; }}
.qs {{ columns: 2; column-gap: 24px; font-size: 9pt; }}
.qs div {{ break-inside: avoid; margin-bottom: 8px; }} .qs b {{ color: {RED}; }}
.note {{ background: #f6f6f6; border-inline-start: 3px solid {RED}; padding: 8px 12px; font-size: 8.8pt; margin: 8px 0; }}
.src-list li {{ direction: ltr; text-align: left; font-size: 8pt; word-break: break-all; }}
"""


def card(i):
    phones = ''.join(f'<div class="ph"><span>{e(l)} {src(s)}</span><span>{e(n)}</span></div>' for l, n, s in i['phones']) or '<div class="muted">غير منشور رسمياً — يُؤكَّد هاتفياً</div>'
    mails = ''.join(f'<div class="ph"><span>{e(l)} {src(s)}</span><span>{e(m)}</span></div>' for l, m, s in i['emails'])
    prods = ''.join(f'<li><b class="fr">{e(p)}</b> {src(s)}<div class="fr">{e(t)}</div></li>' for p, t, s in i['products']) or '<li>لم يتم العثور على منتج عقاري منشور — يُؤكَّد</li>'
    miss = ''.join(f'<li class="fr">{e(m)}</li>' for m in i['missing'])
    srcs = ''.join(f'<li><a class="ltr" href="{e(u)}">{e(u)}</a></li>' for u in i['src']) or '<li>—</li>'
    return f'''<div class="card {i['status']}">
  <div class="hd"><span class="n">{num[i['id']]:02d}</span><div class="t"><b>{e(i['ar'])}</b><small class="ltr">{e(i['name'])}</small><br><small>{e(i['group'])}</small></div>
   {logo_pair(logo(i['id']), 40, glogo(i['id']))}</div>
  <div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">{badge(i['status'])}<span class="badge" style="background:#f1f1f1">مغاربة العالم: {MRE.get(i['mre'], 'يُؤكَّد')}</span>
   {''.join(f'<span class="badge" style="background:#fff;border:1px solid #ddd">{e(t)}</span>' for t in i['types'])}</div>
  <div class="grid">
   <div><h4>الاتصال</h4>{phones}{mails}
     <div class="ph"><span>الموقع الرسمي</span><span><a href="{e(i['web'])}">{e(i['web'].replace('https://', ''))}</a></span></div>
     {f'<div class="ph"><span>العنوان {src(i["addr_ok"])}</span><span class="fr" style="white-space:normal;font-weight:500">{e(i["addr"])}</span></div>' if i['addr'] else '<div class="ph"><span>العنوان</span><span>يُستكمل</span></div>'}
     <h4>معلومات يجب استكمالها</h4><ul>{miss}</ul></div>
   <div><h4>المنتجات العقارية المنشورة</h4><ul>{prods}</ul>
     {f'<h4>ملاحظات</h4><div class="fr" style="font-size:8.6pt">{e(i["notes"])}</div>' if i['notes'] else ''}</div>
  </div>
  <h4>بعد الاتصال (للتعبئة)</h4>
  <div class="after"><div>نسبة الفائدة / هامش الربح</div><div>نسبة التمويل</div><div>المدة القصوى</div><div>المساهمة الذاتية</div><div>الرسوم والتأمين</div><div>مدة الدراسة</div><div>شراكة الوسطاء / العمولة</div><div>المخاطَب (الاسم والهاتف)</div></div>
  <h4>المصادر</h4><ul class="src-list">{srcs}</ul>
</div>'''


strip = ''.join(f'<img src="{FIN}/{k}.webp" alt="">' for k in ['awb', 'bcp', 'boa', 'cih', 'bmci', 'cdm', 'saham', 'cam', 'abb', 'cfg', 'assafa', 'yousr', 'bti', 'wafaimmo', 'sofac', 'tamwilcom', 'daamsakane', 'ifc'] if k in HAS)
cover = f'''<section class="cover">
 <div class="top"><div class="brand"><img src="{LOGO}" alt=""><div><b class="ltr">{OFFICE['fr']}</b><small>{OFFICE['ar']} · {OFFICE['city_ar']}</small></div></div>
  <div class="kicker ltr">Document de travail interne · {DATE}</div></div>
 <div class="field">{roof_field(620, 330, seed=777, reds={(3, 2), (7, 7), (11, 4), (14, 9), (17, 3), (5, 11), (19, 12)})}</div>
 <div class="rule red"></div>
 <h1>الدليل الشامل لجهات <em>التمويل العقاري</em></h1>
 <div class="fr">Guide des organismes de financement immobilier</div>
 <div class="meta"><span>سكني · تجاري · مهني · مشاريع</span><span>المغرب وخارجه</span><span><b>{len(INST)}</b> جهة</span><span>آخر تحقق: <b class="ltr">{DATE}</b></span></div>
 <div class="strip">{strip}</div>
 <div class="foot"><span>وثيقة مرجعية للتواصل — لا تُدمج في التطبيق</span><span class="ltr">{OFFICE['tel1']} · {OFFICE['mail']}</span></div>
</section>'''

intro = f'''<section>
 <div class="sec-title"><span class="num">01</span><div><h2>المقدمة والمنهجية</h2><small class="ltr">Introduction & méthodologie</small></div></div><div class="rule"></div>
 <p>يهدف هذا الدليل إلى تمكين <b>مكتب الوسيط 777</b> من التواصل المنظم مع جهات التمويل العقاري (السكني والتجاري والمهني وتمويل المشاريع)، تمهيداً لعقد اتفاقيات شراكة، ثم إدماج الشروط المؤكَّدة لاحقاً في زر «التمويل العقاري» داخل التطبيق.</p>
 <div class="big3"><div><b>{len(INST)}</b><small>جهة تمويل وضمان ودعم</small></div><div><b>{cnt['ok']}</b><small>✅ معلومات كافية</small></div><div><b>{cnt['partial']}</b><small>🟡 جزئية — تحتاج تأكيداً</small></div><div><b>{cnt['missing']}</b><small>🔴 ناقصة — تواصل مباشر</small></div></div>
 <h3 style="font-size:11pt">طريقة البحث</h3>
 <ul>
  <li>اعتماد <b>المواقع الرسمية</b> للجهات أولاً (صفحات الاتصال، القروض العقارية، مغاربة العالم)، ثم المصادر المهنية الموثوقة عند تعذر الوصول إلى الموقع الرسمي.</li>
  <li>لم يُخترَع أي رقم هاتف أو بريد أو نسبة فائدة. كل معلومة غير منشورة رسمياً مكتوبة: «يُستكمل — يُؤكَّد هاتفياً».</li>
  <li>النصوص الوصفية للمنتجات منقولة كما نشرتها الجهات (بالفرنسية غالباً) حفاظاً على الدقة.</li>
  <li>تاريخ آخر تحقق: <b class="ltr">{DATE}</b>. نسب الفائدة والشروط والدعم العمومي متغيرة بطبيعتها.</li>
 </ul>
 <h3 style="font-size:11pt">مفتاح الرموز</h3>
 <div class="key"><div>{badge('ok')} معظم المعلومات المهمة منشورة ويمكن التحقق منها.</div><div>{badge('partial')} الخدمات معروفة، لكن بعض الشروط أو بيانات الاتصال غير مؤكدة.</div>
  <div>{badge('missing')} معلومات قليلة: التواصل المباشر ضروري.</div><div><span class="src-v">●</span> مأخوذ من الموقع الرسمي &nbsp; <span class="src-s">◐</span> مصدر ثانوي — يُؤكَّد هاتفياً</div></div>
 <div class="note"><b>حدود البحث:</b> القائمة لا تدّعي الشمول المطلق. صناديق السكن الخليجية والأوروبية (مثل صناديق الإسكان الوطنية) تموّل مواطنيها داخل بلدانها ولا تموّل عقاراً بالمغرب، لذلك لم تُدرج. أُدرجت الجهات الأجنبية التي لها نشاط موثّق مع المغاربة أو المشاريع المغربية فقط. المؤسسات الدولية (IFC، BERD، BAD، BEI، ICD) تموّل المشاريع والشركات وليس الأفراد.</div>
 <div class="note"><b>الشعارات:</b> الشعارات مستعملة هنا لأغراض تعريفية فقط، ولا تعني وجود شراكة أو اعتماد. يُطلب الإذن الكتابي باستعمال الشعار ضمن طلب الاتفاقية.</div>
</section>'''

toc = '<section class="pb"><div class="sec-title"><span class="num">02</span><div><h2>الفهرس</h2><small class="ltr">Sommaire</small></div></div><div class="rule"></div><div class="toc">' + ''.join(
    f'<div class="c"><b>{e(ar)} <small class="ltr" style="color:#8a8a8a;font-weight:500">· {e(fr)}</small></b>' + ''.join(f'<span><i>{num[i["id"]]:02d}</i>{e(i["ar"])} <small class="ltr" style="color:#8a8a8a">{e(i["name"])}</small></span>' for i in by[k]) + '</div>'
    for k, fr, ar in CATS) + '''<div class="c"><b>ملاحق</b><span><i>A</i>أسئلة الاتصال</span><span><i>B</i>جدول متابعة الاتصالات</span><span><i>C</i>جدول متابعة الاتفاقيات</span><span><i>D</i>الشعارات المتوفرة والناقصة</span><span><i>E</i>جهات مساعدة</span><span><i>F</i>المصادر</span></div></div></section>'''

summary = '<section class="pb"><div class="sec-title"><span class="num">03</span><div><h2>الجدول الملخص</h2><small class="ltr">Tableau de synthèse</small></div></div><div class="rule"></div><table class="sum"><tr><th>#</th><th></th><th>الجهة</th><th>الصنف</th><th>الهاتف الرئيسي</th><th>الموقع</th><th>الحالة</th></tr>' + ''.join(
    f'<tr><td>{num[i["id"]]:02d}</td><td>{f"<img src={chr(34)}{logo(i[chr(105)+chr(100)])}{chr(34)}>" if logo(i["id"]) else ""}</td><td><b>{e(i["ar"])}</b><br><small class="ltr">{e(i["name"].split(" – ")[0].split(" (")[0])}</small></td><td>{e(next(c[2] for c in CATS if c[0] == i["cat"]))}</td><td class="ltr" style="white-space:nowrap">{e(main_phone(i))}</td><td><a class="ltr" href="{e(i["web"])}">{e(i["web"].replace("https://", "").replace("www.", "").split("/")[0])}</a></td><td>{badge(i["status"])}</td></tr>'
    for c in CATS for i in by[c[0]]) + '</table></section>'

body = ''
for k, fr, ar in CATS:
    body += f'<section class="pb"><div class="cat-head"><div class="sec-title"><span class="num">{CATS.index([k, fr, ar]) + 4:02d}</span><div><h2>{e(ar)}</h2><small class="ltr">{e(fr)}</small></div></div><span class="kicker">{len(by[k])} جهة</span></div><div class="rule"></div>'
    body += ''.join(card(i) for i in by[k]) + '</section>'

QS = [('القبول والأهلية', ['أنواع العقارات المقبولة (شقة، فيلا، أرض، محل، مكتب، مشروع)', 'شروط الأهلية حسب الفئة: أجير، موظف، مهنة حرة، تاجر، مقاول ذاتي، مغربي مقيم بالخارج، أجنبي']),
      ('الشروط المالية', ['نسبة الفائدة أو هامش الربح (ثابتة/متغيرة) والمرجع', 'نسبة التمويل القصوى والمساهمة الذاتية', 'المدة القصوى والتأجيل الممكن', 'نسبة المديونية القصوى من الدخل', 'رسوم الملف والخبرة والتأمين والضمانات']),
      ('الوثائق والمسطرة', ['لائحة الوثائق لكل فئة', 'مراحل الدراسة والمدة اللازمة', 'إمكانية الموافقة المبدئية السريعة لعملاء المكتب']),
      ('الشراكة مع الوسيط', ['هل تقبل المؤسسة شراكات مع مكاتب الوساطة العقارية؟', 'هل يوجد برنامج «Apporteur d’affaires» أو إحالة عملاء؟', 'هل توجد عمولة؟ نسبتها، شروطها، وطريقة أدائها (فاتورة، بعد الصرف…)', 'تعيين مخاطَب دائم (مكناس + الإدارة المركزية)', 'الإذن الكتابي باستعمال الشعار في التطبيق', 'الإجراءات القانونية لتوقيع الاتفاقية'])]
annex_q = '<section class="pb"><div class="sec-title"><span class="num">A</span><div><h2>أسئلة الاتصال</h2><small class="ltr">Questions à poser à chaque organisme</small></div></div><div class="rule"></div><div class="qs">' + ''.join(f'<div><b>{t}</b><ul>' + ''.join(f'<li>☐ {q}</li>' for q in qs) + '</ul></div>' for t, qs in QS) + '</div></section>'

STAGES = ['لم يتم الاتصال', 'تم الاتصال', 'في انتظار الرد', 'طلبوا وثائق', 'اجتماع مبرمج', 'تفاوض', 'قبول المبدأ', 'الاتفاقية قيد الإعداد', 'الاتفاقية موقعة', 'غير مناسب حالياً']
order = [i for c in CATS for i in by[c[0]]]
track1 = '<section class="pb"><div class="sec-title"><span class="num">B</span><div><h2>جدول متابعة الاتصالات</h2><small class="ltr">Suivi des contacts</small></div></div><div class="rule"></div><table class="track"><tr><th>#</th><th>الجهة</th><th>الهاتف</th><th>تاريخ أول اتصال</th><th>المخاطَب وصفته</th><th>هاتف/بريد مباشر</th><th>إرسال الطلب</th><th>الرد</th><th>الخطوة المقبلة</th></tr>' + ''.join(
    f'<tr><td>{num[i["id"]]:02d}</td><td>{e(i["ar"])}</td><td class="ltr" style="white-space:nowrap">{e(main_phone(i))}</td><td></td><td></td><td></td><td>☐</td><td>☐</td><td></td></tr>' for i in order) + '</table></section>'
track2 = f'<section class="pb"><div class="sec-title"><span class="num">C</span><div><h2>جدول متابعة الشروط والاتفاقيات</h2><small class="ltr">Suivi des conditions & conventions</small></div></div><div class="rule"></div><p style="font-size:8.5pt">حالات المتابعة: {" · ".join(STAGES)}. <b>قبول المبدأ ليس توقيعاً للاتفاقية.</b></p><table class="track"><tr><th>#</th><th>الجهة</th><th>الفائدة/الهامش</th><th>المدة</th><th>نسبة التمويل</th><th>الرسوم</th><th>الوثائق</th><th>العمولة</th><th>حالة التفاوض</th><th>آخر متابعة</th></tr>' + ''.join(
    f'<tr><td>{num[i["id"]]:02d}</td><td>{e(i["ar"])}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>' for i in order) + '</table></section>'

have = [i for i in order if logo(i['id'])]
nohave = [i for i in order if not logo(i['id'])]
annex_l = f'''<section class="pb"><div class="sec-title"><span class="num">D</span><div><h2>الشعارات المتوفرة والناقصة</h2><small class="ltr">Logos disponibles / manquants</small></div></div><div class="rule"></div>
<p>تم جمع <b>{len(have)}</b> شعاراً رسمياً من مواقع الجهات أو من ويكيميديا. الجهات التالية <b>لا يتوفر لها شعار</b> بجودة كافية، يُرجى طلبه منها أثناء الاتصال (مع الإذن باستعماله):</p>
<ul>{''.join(f'<li>{e(i["ar"])} — <span class="ltr">{e(i["name"])}</span>{" (يُعرض مؤقتاً بشعار المجموعة الأم)" if glogo(i["id"]) else ""}</li>' for i in nohave)}</ul>
<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-top:14px">{''.join(f'<div style="text-align:center;font-size:7.5pt"><img src="{logo(i["id"])}" style="height:34px;max-width:100%;object-fit:contain"><br>{e(i["ar"])}</div>' for i in have)}</div></section>'''

annex_h = '''<section class="pb"><div class="sec-title"><span class="num">E</span><div><h2>جهات مساعدة</h2><small class="ltr">Partenaires utiles au financement</small></div></div><div class="rule"></div>
<ul><li><b>الموثقون والعدول:</b> لتوقيع العقود النهائية والرهن الرسمي — يُقترح التنسيق مع موثقين بمكناس ضمن شبكة الوسيط 777.</li>
<li><b>الخبراء العقاريون:</b> تقييم العقار الذي تطلبه البنوك قبل الموافقة.</li>
<li><b>شركات التأمين:</b> تأمين الوفاة والعجز وتأمين العقار المرتبطان بالقرض.</li>
<li><b>المنعشون العقاريون:</b> عروض مشتركة مع البنوك (مثال: برنامج Ok'Immo لدى بنك الصفاء).</li>
<li><b>الوكالة الحضرية والمحافظة العقارية:</b> الوثائق العمرانية وشهادة الملكية.</li></ul>
<div class="note">هذه الجهات لم تُجمع بياناتها في هذا الإصدار؛ يمكن إعداد دليل خاص بها في المرحلة المقبلة.</div></section>'''

allsrc = sorted({u for i in INST for u in i['src']})
annex_s = '<section class="pb"><div class="sec-title"><span class="num">F</span><div><h2>المصادر</h2><small class="ltr">Sources (vérifiées le ' + DATE + ')</small></div></div><div class="rule"></div><ul class="src-list">' + ''.join(f'<li><a href="{e(u)}">{e(u)}</a></li>' for u in allsrc) + '''</ul>
<div class="note" style="margin-top:16px"><b>تنبيه قانوني:</b> المعلومات الواردة إرشادية وقابلة للتغيير، والمرجع النهائي هو الجهة المموّلة. لا يُقدَّم أي شرط غير مؤكد للعملاء على أنه شرط رسمي. يُراعى القانون 09-08 (حماية المعطيات الشخصية) والقانون 31-08 (حماية المستهلك).</div>
<div class="note"><b>الخطوة التالية:</b> بعد اتصالكم بكل جهة، أرسلوا لنا المعلومات المؤكدة (النسب، الوثائق، المدة، العمولة، المخاطَب) لإدخالها معاً في زر «التمويل العقاري» داخل التطبيق.</div></section>'''

page = f'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Guide financement immobilier — Al Wasset 777</title><style>{CSS}</style></head><body>{cover}{intro}{toc}{summary}{body}{annex_q}{track1}{track2}{annex_l}{annex_h}{annex_s}</body></html>'
out = os.path.join(HERE, 'guide.html')
open(out, 'w').write(page)
pdf = os.path.join(HERE, 'Guide_Financement_Immobilier_AlWasset777.pdf')
render_pdf(out, pdf, footer_text=f'AL WASSET 777 IMMOBILIER — Guide des organismes de financement immobilier — {DATE}')
print(pdf, os.path.getsize(pdf))
