# الدليل التعليمي PDF: غلاف + لماذا التطبيق + خريطة المراحل + صفحة لكل مرحلة (نص + صور + فيديو برمز QR) + صفحة الختام
# الاستعمال: python3 tools/tuto/guide_pdf.py RAW_DIR VID_DIR OUT.pdf   (يحتاج: pip install qrcode)
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../finance'))
from common import APP, BASE_CSS, LOGO, OFFICE, RED, INK, GREY, e, roof_field, render_pdf  # noqa: E402
import qrcode, qrcode.image.svg  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '../..'))
VID_URL = 'https://alwasset777-ai.github.io/alwasset777/bureau/tuto/'
PARTS = [('🚀', 'البداية', [1, 2]), ('🏢', 'مكتبك العقاري الرقمي', [3, 4, 5, 6, 7, 8, 9, 10, 11]), ('🌍', 'شبكة الوسيط 777', [12, 13, 14, 15, 16, 17]), ('📣', 'التسويق والإدارة', [18, 19])]
# خطوات إضافية للميزات الجديدة (ماشي فدروس guide-data.js)
EXTRA = {
    9: ('التمويل العقاري: كل الجهات في مكان واحد', [
        'من «شبكة الوسيط 777» افتح «التمويل العقاري»: شعارات البنوك وشركات التمويل والتمويل التشاركي وجهات مغاربة العالم.',
        'صفِّ حسب النوع: سكني أو تجاري، بنوك، تمويل تشاركي، دولة، دولي — أو فعّل «مغاربة العالم».',
        'كل بطاقة: الشعار، الموقع الرسمي، وحالة المعلومات (كافية / جزئية / ناقصة).',
        'مراحل الملف الست: من دراسة القدرة على الأداء حتى التوقيع عند الموثق.'], 'النسب والشروط النهائية تؤكدها الجهة نفسها — التطبيق يوجهك ويختصر عليك الطريق.'),
    11: ('لعبة «وصلة العقار»', [
        'صورة وسؤال عن مصطلح عقاري ← رتّب الحروف لتجد الجواب.',
        'مراحل ومجموعات متدرجة: أجزاء المنزل، البناء، العقود، التمويل…',
        'تحيرت؟ اضغط على منير يشرح لك الكلمة بالدارجة.'], 'شارك رابط اللعبة مع زبنائك: طريقة ذكية ليعرفوا مكتبك وهم يستمتعون.'),
    15: ('الستوري: إعجابات وتعليقات', [
        'من الصفحة الرئيسية: «+ ستوري» ← نص ملون أو صورة لعرضك.',
        'الأعضاء يضغطون ❤️ (أو ضغطتين على الستوري) ويكتبون تعليقاتهم 💬.',
        'الستوري تبقى 24 ساعة ثم تختفي تلقائيا.'], 'انشر ستوري كل صباح: عقار اليوم، صفقة ناجحة، أو نصيحة — الحضور اليومي يصنع الثقة.'),
    18: ('كراء العطلة والحجز الفوري', [
        'من «خدمات المجموعة» ← «الحجز الفوري (مفروش وعطل)»: أضف الشقة، الثمن لليلة والصور.',
        'الزبون يحجز من الصفحة العمومية، والطلب يصلك مباشرة مع التواريخ.',
        'المبلغ يبقى عند المكتب حتى يصل الزبون ويكون راضيا.'], 'التواريخ المحجوزة تُغلق تلقائيا: لا حجز مزدوج.'),
}



def still(T, c):
    """أوضح صورة فخطوة: آخر لقطة ثابتة (أطول مدة) — ماشي وسط حركة"""
    t, best = 0, None
    for x in T['frames']:
        if c['a'] - .01 <= t < c['b'] and (best is None or x['d'] >= best['d'] - .02): best = x
        t += x['d']
    return (best or T['frames'][-1])['f']

def data():
    js = ("global.window={};require(process.argv[1]);const S=require(process.argv[2]);"
          "console.log(JSON.stringify({L:window.W777_GUIDE.lessons,S:S.map(s=>({n:s.n,t:s.t,tag:s.tag,intro:s.intro,lessons:s.lessons}))}))")
    return json.loads(subprocess.check_output(['node', '-e', js, f'{APP}/guide-data.js', f'{HERE}/stages.cjs'], text=True))


def qr(url, color=INK):
    s = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=1).to_string().decode()
    return s.replace('<svg ', f'<svg style="width:100%;height:100%;display:block" fill="{color}" ', 1).replace('fill:#000000', f'fill:{color}')


def shots(raw, vid, n, tmp):
    """صورتين من التصوير (آخر لقطة من أول وآخر خطوة) + صورة الفيديو، مصغرة"""
    d = os.path.join(raw, f'{n:02d}'); T = json.load(open(os.path.join(d, 'timeline.json')))
    at = [still(T, c) for c in (T['caps'][0], T['caps'][-1])]
    out = []
    for i, f in enumerate(at):
        o = os.path.join(tmp, f's{n:02d}_{i}.jpg')
        subprocess.run(['convert', os.path.join(d, f), '-resize', '440x', '-quality', '82', o], check=True); out.append(o)
    th = os.path.join(tmp, f'v{n:02d}.jpg')
    subprocess.run(['convert', os.path.join(vid, f'{n:02d}.jpg'), '-resize', '360x', '-quality', '80', th], check=True)
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', os.path.join(vid, f'{n:02d}.mp4')], text=True))
    return out, th, round(dur)


CSS = BASE_CSS + f"""
@page cover {{ margin: 0; }}
.cover {{ page: cover; position: relative; width: 210mm; height: 297mm; background: {INK}; color: #fff; overflow: hidden; }}
.cover .field {{ position: absolute; inset: 0; opacity: .5; }}
.cover .in {{ position: absolute; inset: 22mm 18mm; display: flex; flex-direction: column; }}
.cover .lg {{ display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 12pt; }}
.cover .lg img {{ width: 60px; height: 60px; border-radius: 50%; }}
.cover h1 {{ font-size: 44pt; font-weight: 900; line-height: 1.08; margin-top: 30mm; }}
.cover h1 span {{ color: {RED}; }}
.cover .sub {{ font-size: 14pt; color: #cfcfcf; margin-top: 8mm; max-width: 105mm; line-height: 1.6; }}
.cover .chips {{ display: flex; gap: 8px; margin-top: 9mm; flex-wrap: wrap; }}
.cover .chips b {{ border: 1px solid #555; border-radius: 99px; padding: 4px 14px; font-size: 10pt; font-weight: 700; }}
.cover .chips b i {{ font-style: normal; color: {RED}; }}
.cover .ph {{ position: absolute; left: 16mm; bottom: 34mm; width: 64mm; transform: rotate(-6deg); }}
.phone {{ border-radius: 9mm; background: #000; padding: 2.2mm; box-shadow: 0 30px 50px -20px rgba(0,0,0,.6), 0 0 0 .4mm #333; }}
.phone img {{ display: block; width: 100%; border-radius: 7mm; }}
.cover .q {{ position: absolute; right: 18mm; bottom: 22mm; display: flex; align-items: center; gap: 12px; font-size: 10pt; color: #cfcfcf; }}
.cover .q .qr {{ width: 30mm; height: 30mm; background: #fff; padding: 2mm; border-radius: 3mm; }}
.cover .slog {{ position: absolute; right: 18mm; bottom: 58mm; font-size: 18pt; font-weight: 800; color: #fff; }}
.cover .slog small {{ display: block; font-size: 9pt; font-weight: 500; color: #999; letter-spacing: .3em; }}

h2.big {{ font-size: 24pt; font-weight: 900; margin: 2mm 0 1mm; }}
.lead {{ font-size: 11.5pt; color: #333; line-height: 1.8; }}
.why {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; margin: 8mm 0; }}
.why div {{ border: .6px solid #e2e2e2; border-radius: 4mm; padding: 5mm; background: #fff; }}
.why b {{ display: block; font-size: 12pt; margin: 2mm 0 1mm; }}
.why span {{ font-size: 22pt; }}
.why p {{ margin: 0; font-size: 9pt; color: #555; line-height: 1.6; }}
.how {{ display: flex; gap: 6mm; align-items: center; background: #faf7f2; border-radius: 5mm; padding: 6mm; margin-top: 4mm; }}
.how .qr {{ width: 28mm; height: 28mm; flex: none; }}
.how ol {{ margin: 0; padding-inline-start: 5mm; font-size: 10pt; line-height: 1.9; }}

.map {{ columns: 2; column-gap: 10mm; margin-top: 6mm; }}
.part {{ break-inside: avoid; margin-bottom: 6mm; }}
.part h3 {{ font-size: 12pt; font-weight: 800; color: {RED}; margin-bottom: 2mm; }}
.st-row {{ display: flex; align-items: center; gap: 10px; padding: 2.4mm 0; border-bottom: .6px solid #e5e5e5; }}
.st-row .n {{ width: 9mm; height: 9mm; border-radius: 50%; background: {INK}; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 9pt; flex: none; }}
.st-row b {{ font-size: 10pt; display: block; line-height: 1.3; }}
.st-row small {{ color: {GREY}; font-size: 8pt; }}
.st-row .v {{ margin-inline-start: auto; font-size: 8pt; color: {RED}; white-space: nowrap; font-weight: 700; }}

.stg {{ break-before: page; }}
.sh {{ display: flex; align-items: flex-end; gap: 6mm; border-bottom: 1.4px solid {INK}; padding-bottom: 3mm; margin-bottom: 4mm; }}
.sh .sn {{ font-size: 50pt; font-weight: 300; color: {RED}; line-height: .85; direction: ltr; }}
.sh h2 {{ font-size: 20pt; font-weight: 900; }}
.sh .tag {{ font-size: 10.5pt; color: {GREY}; font-weight: 500; }}
aside {{ float: left; width: 60mm; margin: 0 0 4mm 7mm; }}
.shots {{ display: flex; gap: 3mm; }}
.shots .phone {{ flex: 1; border-radius: 5mm; padding: 1.3mm; box-shadow: 0 12px 20px -12px rgba(0,0,0,.5); }}
.shots .phone img {{ border-radius: 4mm; }}
.vc {{ display: block; margin-top: 5mm; border-radius: 4mm; overflow: hidden; background: {INK}; color: #fff; text-decoration: none; }}
.vc .th {{ position: relative; height: 38mm; overflow: hidden; }}
.vc .th img {{ width: 100%; position: absolute; top: -12mm; opacity: .9; }}
.vc .pl {{ position: absolute; inset: 0; display: grid; place-items: center; background: linear-gradient(180deg, rgba(0,0,0,.1), rgba(0,0,0,.55)); }}
.vc .pl i {{ width: 15mm; height: 15mm; border-radius: 50%; background: {RED}; display: grid; place-items: center; font-style: normal; font-size: 16pt; box-shadow: 0 0 0 2.5mm rgba(200,16,46,.3); padding-left: 1mm; }}
.vc .bt {{ display: flex; align-items: center; gap: 3mm; padding: 3mm; }}
.vc .bt .qr {{ width: 17mm; height: 17mm; background: #fff; padding: 1mm; border-radius: 1.5mm; flex: none; }}
.vc .bt b {{ display: block; font-size: 10pt; }}
.vc .bt small {{ font-size: 7.5pt; color: #bbb; line-height: 1.4; display: block; }}
.ls {{ margin-bottom: 4mm; break-inside: avoid; overflow: hidden; }}
.ls h3 {{ font-size: 11.5pt; font-weight: 800; display: flex; align-items: center; gap: 6px; margin-bottom: 1mm; }}
.ls h3::before {{ content: ''; width: 3px; height: 13px; background: {RED}; border-radius: 2px; }}
.ls ol {{ margin: 0; padding-inline-start: 5.5mm; font-size: 9.6pt; line-height: 1.7; }}
.ls li {{ margin-bottom: .6mm; }}
.ls li::marker {{ color: {RED}; font-weight: 800; }}
.tip {{ background: #fff6e0; border-radius: 3mm; padding: 2.2mm 3.5mm; font-size: 9pt; margin-top: 1.5mm; color: #5a4300; }}
.new {{ display: inline-block; background: {RED}; color: #fff; font-size: 7pt; padding: 0 6px; border-radius: 99px; font-weight: 700; }}

.end {{ break-before: page; text-align: center; padding-top: 22mm; }}
.end img.l {{ width: 40mm; height: 40mm; border-radius: 50%; box-shadow: 0 20px 40px -20px rgba(0,0,0,.5); }}
.end h2 {{ font-size: 30pt; font-weight: 900; margin: 8mm 0 3mm; }}
.end .qr {{ width: 45mm; height: 45mm; margin: 8mm auto; }}
.end .ct {{ display: inline-grid; grid-template-columns: auto auto; gap: 2mm 8mm; text-align: start; font-size: 11pt; margin-top: 4mm; }}
.end .sl {{ font-size: 16pt; font-weight: 800; color: {RED}; margin-top: 12mm; }}
"""


def build(raw, vid, out_pdf):
    D = data(); L = D['L']; S = D['S']
    tmp = os.path.join(os.path.dirname(os.path.abspath(out_pdf)), 'guide_build'); os.makedirs(tmp, exist_ok=True)
    info = {s['n']: shots(raw, vid, s['n'], tmp) for s in S}
    total_s = sum(v[2] for v in info.values())
    app = OFFICE['app']
    cover_shot = os.path.join(tmp, 'cover.jpg')
    subprocess.run(['convert', os.path.join(raw, '02', 'f00002.jpg'), '-resize', '520x', '-quality', '85', cover_shot], check=True)
    H = [f'<html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head><body>']
    # الغلاف
    H.append(f"""<section class="cover"><div class="field">{roof_field(794, 1123, seed=77, cols=19, rows=27, stroke='#ffffff', op=.5)}</div><div class="in">
      <div class="lg"><img src="{LOGO}">مجموعة الوسيط 777 · مكناس</div>
      <h1>دليل تطبيق<br><span>الوسيط 777</span></h1>
      <div class="sub">من أول ضغطة إلى أكبر شبكة عقارية مترابطة: تعلّم كل شيء في {len(S)} مرحلة قصيرة — نص، صور، وفيديو لكل مرحلة.</div>
      <div class="chips"><b><i>{len(S)}</i> مرحلة</b><b><i>{len(S)}</i> فيديو</b><b><i>{len(L)}</i> درسا</b><b>⏱ <i>{round(total_s / 60)}</i> دقائق فقط</b></div></div>
      <div class="ph"><div class="phone"><img src="file://{cover_shot}"></div></div>
      <div class="slog"><small>AL WASSET 777</small>مع الوسيط… حلك بسيط</div>
      <div class="q"><div>امسح الرمز<br>وافتح التطبيق</div><div class="qr">{qr(app)}</div></div></section>""")
    # لماذا التطبيق + كيف تستعمل الدليل
    why = [('🏢', 'مكتب كامل في جيبك', 'العقارات، الزبناء، المواعيد، العقود والمالية — في تطبيق واحد على الهاتف والحاسوب.'),
           ('🌍', 'شبكة من 7 فئات', 'وكالات، وسطاء، مقاولات، تشطيب، مستثمرون، موثقون وجمعيات سكنية — داخل المغرب وخارجه.'),
           ('🤖', 'منير يتكلم الدارجة', 'مساعد ذكي يجيب بالصوت والكتابة، يكتب الإعلانات ويشرح لك أي صفحة.'),
           ('🏦', 'التمويل العقاري', 'حساب القسط، وجهات التمويل السكني والتجاري بشعاراتها ومراحل ملفها.'),
           ('🔐', 'آمن ومحمي', 'حساب خاص لكل عضو، رمز سري وبصمة، وتحقق بخطوتين للمدير.'),
           ('📶', 'يعمل بدون إنترنت', 'بياناتك محفوظة على جهازك وتتزامن تلقائيا عند الاتصال.')]
    H.append(f"""<section class="pb"><div class="kicker">مرحبا بك</div><h2 class="big">لماذا تطبيق الوسيط 777؟</h2><div class="rule red"></div>
      <p class="lead">صُمّم هذا التطبيق ليشتغل معك كما تشتغل أنت: بسرعة، بالدارجة، ومن أي مكان. هذا الدليل يأخذك خطوة بخطوة — وفي كل مرحلة فيديو قصير يريك بالضبط أين تضغط.</p>
      <div class="why">{''.join(f'<div><span>{a}</span><b>{e(b)}</b><p>{e(c)}</p></div>' for a, b, c in why)}</div>
      <div class="how"><div class="qr">{qr(VID_URL)}</div><div><b style="font-size:12pt">كيف تستعمل هذا الدليل؟</b><ol>
        <li>اقرأ المرحلة: الهدف والخطوات في دقيقة.</li><li>شاهد الفيديو: امسح رمز QR بكاميرا الهاتف، أو اضغط على الصورة.</li>
        <li>جرّب مباشرة في التطبيق — كل شيء يُحفظ تلقائيا.</li><li>كل الفيديوهات في صفحة واحدة: امسح هذا الرمز.</li></ol></div></div></section>""")
    # خريطة المراحل
    rows = []
    for ic, nm, ns in PARTS:
        rows.append(f'<div class="part"><h3>{ic} {e(nm)}</h3>' + ''.join(
            f'<div class="st-row"><span class="n">{n}</span><div><b>{e(s["t"])}</b><small>{e(s["tag"])}</small></div><span class="v">▶ {info[n][2]} ث</span></div>'
            for n in ns for s in S if s['n'] == n) + '</div>')
    H.append(f'<section class="pb"><div class="kicker">رحلتك</div><h2 class="big">{len(S)} مرحلة من الصفر إلى الاحتراف</h2><div class="rule red"></div><div class="map">{"".join(rows)}</div></section>')
    # المراحل
    for s in S:
        n = s['n']; imgs, th, dur = info[n]
        part = next(nm for _, nm, ns in PARTS if n in ns)
        url = f'{VID_URL}#{n:02d}'
        blocks = []
        for ln in s['lessons']:
            l = L[ln - 1]
            blocks.append(f'<div class="ls"><h3>{e(l["t"])}</h3><ol>{"".join(f"<li>{e(x)}</li>" for x in l["steps"])}</ol>' + (f'<div class="tip">💡 {e(l["tip"])}</div>' if l.get('tip') else '') + '</div>')
        if n in EXTRA:
            t, st, tip = EXTRA[n]
            blocks.append(f'<div class="ls"><h3>{e(t)} <span class="new">جديد</span></h3><ol>{"".join(f"<li>{e(x)}</li>" for x in st)}</ol><div class="tip">💡 {e(tip)}</div></div>')
        H.append(f"""<section class="stg"><div class="sh"><div class="sn">{n:02d}</div><div><div class="kicker">المرحلة {n} من {len(S)} · {e(part)}</div><h2>{e(s['t'])}</h2><div class="tag">{e(s['tag'])}</div></div></div>
          <aside><div class="shots">{''.join(f'<div class="phone"><img src="file://{i}"></div>' for i in imgs)}</div>
            <a class="vc" href="{url}"><div class="th"><img src="file://{th}"><div class="pl"><i>▶</i></div></div>
            <div class="bt"><div class="qr">{qr(url)}</div><div><b>شاهد الفيديو</b><small>{dur} ثانية · امسح الرمز أو اضغط هنا</small></div></div></a></aside>
          <p class="lead" style="margin-top:0">{e(s['intro'])}</p>{''.join(blocks)}</section>""")
    # الختام
    H.append(f"""<section class="end"><img class="l" src="{LOGO}"><h2>مستعد؟ ابدأ الآن</h2>
      <p class="lead" style="max-width:130mm;margin:0 auto">افتح التطبيق، أضف عقارك الأول، وانضم لأكبر شبكة عقارية مترابطة. وإذا احترت في أي شيء: اسأل منير 🤖</p>
      <div class="qr">{qr(app)}</div><div class="ltr" style="color:{RED};font-weight:700">{app}</div>
      <div class="ct"><b>📞 الهاتف</b><span class="ltr">{OFFICE['tel1']} · {OFFICE['tel2']}</span><b>✉️ البريد</b><span class="ltr">{OFFICE['mail']}</span><b>📍 العنوان</b><span>{OFFICE['city_ar']}</span></div>
      <div class="sl">{OFFICE['slogan']}</div></section></body></html>""")
    hp = os.path.join(tmp, 'guide.html'); open(hp, 'w').write(''.join(H))
    render_pdf(hp, os.path.abspath(out_pdf), 'AL WASSET 777 — Guide de l’application')


if __name__ == '__main__':
    build(*sys.argv[1:4])
