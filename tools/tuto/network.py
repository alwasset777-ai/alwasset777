# دعوات الانضمام لشبكة الوسيط 777: لكل فئة (7) فيديو تسويقي عمودي + PDF دعوة
# الاستعمال: python3 tools/tuto/network.py RAW_DIR OUT_DIR [agency broker …]   (RAW_DIR = تصوير film.cjs)
import json, os, subprocess, sys, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '../finance'))
import compose as C  # noqa: E402
from common import APP, BASE_CSS, LOGO, OFFICE, RED, INK, GREY, e, roof_field, render_pdf  # noqa: E402
import qrcode, qrcode.image.svg  # noqa: E402

VID_URL = 'https://alwasset777-ai.github.io/alwasset777/bureau/tuto/'
WA = '212777777959'
KINDS = ['agency', 'broker', 'contractor', 'finishing', 'investor', 'notary', 'association']
G = {
    'agency': dict(ar='الوكالات العقارية', one='وكالة عقارية', to='إلى كل وكالة عقارية', ic='🏢', img='building', seats='700 مقعد داخل المغرب · 77 خارجه', code='agence001',
        hook='وكالتك تستحق شبكة بحجم المغرب', pitch='اربط وكالتك بمئات الوكالات والوسطاء والمستثمرين: عقاراتك تصل لزبناء جدد، وعقاراتهم تصبح عروضا لزبنائك.',
        ben=[('🌍', 'عقاراتك أمام كل الشبكة', 'شارك عقاراتك بضغطة لتصل لوكالات المدن الأخرى ولمغاربة العالم.'), ('🏘️', 'آلاف العروض لزبنائك', 'عقارات الشبكة بين يديك: بِع أكثر بشراكة واضحة.'),
             ('🗂️', 'مكتب رقمي كامل', 'عقارات، زبناء، مواعيد، عقود، محفظة مالية وتقرير شهري.'), ('✨', 'المطابقة الذكية', 'التطبيق يربط كل زبون بالعقار المناسب تلقائيا.'),
             ('🏦', 'التمويل العقاري', 'وجّه زبونك لجهة التمويل المناسبة بمراحل ملفها.'), ('⭐', 'بطاقتك في الدليل', 'كن مرئيا في دليل الوكالات داخل المغرب وخارجه مع التقييمات.')],
        scenes=[(12, 1, 'عقارات الشبكة: آلاف العروض بين يديك'), (4, 1, 'اعرض عقاراتك كالمحترفين'), (5, 2, 'المطابقة الذكية لكل زبون'), (9, 1, 'التمويل العقاري لزبنائك')]),
    'broker': dict(ar='الوسطاء العقاريون', one='وسيط عقاري', to='إلى كل وسيط عقاري', ic='🤝', img='handshake', seats='777 مقعدا', code='W001',
        hook='من وسيط إلى محترف معترف به', pitch='اشتغل بأدوات الوكالات الكبرى من هاتفك: ملف احترافي لكل عقار، حماية عمولتك، وعروض الشبكة كلها لزبنائك.',
        ben=[('📱', 'مكتبك في هاتفك', 'كل عقاراتك وزبنائك ومواعيدك منظمة ومحفوظة.'), ('🛡️', 'احمِ عمولتك', 'سجّل الزيارات والتفويض بتوقيع الزبون.'),
             ('🌍', 'عروض الشبكة', 'عقارات الوكالات والوسطاء في مدينتك وخارجها.'), ('🖼️', 'ملصق إعلاني + QR', 'إعلان جاهز للشبكات الاجتماعية بضغطة.'),
             ('🤖', 'منير يكتب لك', 'إعلانات بالدارجة والعربية والفرنسية في ثوان.'), ('🤝', 'شراكات مع الوكالات', 'تواصل مباشر ورسائل داخل التطبيق.')],
        scenes=[(4, 2, 'ملصق إعلاني وعرض احترافي'), (6, 0, 'المواعيد والزيارات: احمِ عمولتك'), (12, 1, 'عروض الشبكة لزبنائك'), (15, 0, 'الستوري: عروضك كل يوم')]),
    'contractor': dict(ar='شركات المقاولات', one='شركة مقاولات', to='إلى كل شركة مقاولات', ic='🏗️', img='crane', seats='777 مقعدا', code='B001',
        hook='مشاريعك تبحث عن أراضٍ ومستثمرين… وهم هنا', pitch='الجمعيات السكنية، المستثمرون والوكالات يبحثون عن مقاول موثوق: كن في المكان الذي تُصنع فيه المشاريع.',
        ben=[('🏘️', 'الجمعيات السكنية', 'مشاريع بناء جماعي وتجزئات تبحث عن مقاول.'), ('💼', 'المستثمرون', 'اعرض مشروعك للتمويل أو الشراكة.'),
             ('📇', 'بطاقتك في الدليل', 'خدماتك ومدينتك ومشاريعك أمام كل الشبكة.'), ('🎨', 'شراكة مع التشطيب', 'فريق كامل من الأساس إلى آخر لمسة.'),
             ('🎪', 'المعارض والملتقيات', 'لا تفوّت أي صالون أو ملتقى عقاري.'), ('⭐', 'التقييمات', 'سمعتك الجيدة تجلب لك زبناء جددا.')],
        scenes=[(14, 0, 'مشاريع تبحث عن مقاول وشريك'), (13, 1, 'دليل شركات المقاولات'), (16, 1, 'المعارض والملتقيات'), (12, 2, 'شبكة داخل المغرب وخارجه')]),
    'finishing': dict(ar='شركات التشطيب', one='شركة تشطيب', to='إلى كل شركة تشطيب وديكور', ic='🎨', img='paint', seats='777 مقعدا', code='F001',
        hook='كل عقار يُباع أو يُكرى يحتاج لمستك', pitch='بعد كل صفقة يأتي الترميم والتجهيز: الوكالات والملاك والمقاولون في الشبكة يبحثون عن تشطيب يثقون فيه.',
        ben=[('🔑', 'طلبات بعد كل صفقة', 'الوكالات توجه لك الملاك الجدد مباشرة.'), ('📇', 'بطاقة بخدماتك', 'زليج، صباغة، جبس، نجارة، ألومنيوم، مطابخ…'),
             ('🏗️', 'شراكة مع المقاولين', 'كن الشريك الدائم لمشاريع البناء.'), ('📸', 'الستوري', 'اعرض أعمالك قبل/بعد كل يوم.'),
             ('⭐', 'التقييمات', 'كل عمل متقن يتحول لزبون جديد.'), ('💬', 'رسائل مباشرة', 'تواصل مع الأعضاء داخل التطبيق.')],
        scenes=[(13, 2, 'دليل شركات التشطيب والديكور'), (15, 0, 'الستوري: أعمالك أمام الجميع'), (4, 1, 'عقارات تحتاج لمستك'), (12, 2, 'شبكة في كل المدن')]),
    'investor': dict(ar='المستثمرون', one='مستثمر', to='إلى كل مستثمر عقاري', ic='💼', img='money', seats='777 مقعدا', code='I001',
        hook='فرص عقارية مختارة… قبل أن تصل للسوق', pitch='مشاريع يراجعها المكتب قبل النشر، وعقارات الشبكة كلها، وأدوات تقدير الأثمان والتمويل — داخل المغرب ومن الخارج.',
        ben=[('🚀', 'مشاريع مراجعة', 'مشاريع تبحث عن تمويل أو شريك بعد موافقة المكتب.'), ('🏘️', 'عقارات الشبكة', 'عروض من كل المدن في مكان واحد.'),
             ('🤝', 'تمويل، شراكة، شراء', 'حدد طريقتك وقطاعاتك المفضلة.'), ('📊', 'تقدير الأثمان', 'قارن بالأثمان المرجعية قبل أي قرار.'),
             ('🏦', 'التمويل العقاري', 'جهات التمويل ومراحل الملف.'), ('✈️', 'مغاربة العالم', 'استثمر في بلدك وأنت في الخارج بثقة.')],
        scenes=[(14, 0, 'مشاريع مراجعة تبحث عن مستثمر'), (12, 1, 'عقارات الشبكة من كل المدن'), (7, 1, 'تقدير الأثمان قبل القرار'), (9, 1, 'جهات التمويل العقاري')]),
    'notary': dict(ar='الموثقون', one='موثق', to='إلى كل موثق', ic='🖋️', img='stamp', seats='777 مقعدا', code='N001',
        hook='الصفقات تُبرم كل يوم… كن موثقها', pitch='الوكالات والوسطاء في الشبكة يبرمون صفقات كل يوم: كن الموثق المقترح لعقاراتهم واستشاراتهم.',
        ben=[('📍', 'مقترح مع أقرب عقار', 'الشبكة تقترحك حسب مدينتك وموقع العقار.'), ('📝', 'طلبات التوثيق', 'استقبل طلبات العقود والاستشارات مباشرة.'),
             ('⚖️', 'النزاعات المحولة', 'ملفات تحتاج رأي المختص تصلك منظمة.'), ('📚', 'مكتبة العقود', 'نماذج جاهزة ومراحل التملك للزبناء.'),
             ('📇', 'بطاقتك في الدليل', 'خدماتك واختصاصاتك أمام كل الأعضاء.'), ('⭐', 'الثقة', 'تقييمات الأعضاء تبني سمعتك.')],
        scenes=[(8, 0, 'مكتبة العقود ومراحل التملك'), (17, 0, 'النزاعات: الملفات تصل للمختص'), (12, 2, 'دليل الشبكة'), (9, 2, 'مراحل ملف التمويل حتى التوقيع')]),
    'association': dict(ar='الجمعيات السكنية', one='جمعية سكنية', to='إلى كل جمعية وودادية وتعاونية سكنية', ic='🏘️', img='courtyard', seats='777 مقعدا', code=None,
        hook='سكن أعضائكم يبدأ من شبكة واحدة', pitch='الأراضي، المقاولون، الموثقون، وجهات التمويل في مكان واحد: وفّروا على أعضائكم الوقت والمال.',
        ben=[('🗺️', 'الأراضي والتجزئات', 'عروض الأراضي من الوكالات في كل المدن.'), ('🏗️', 'مقاولون موثوقون', 'شركات بناء وتشطيب مع التقييمات.'),
             ('🖋️', 'موثقون', 'عقود الشراء الجماعي بأمان.'), ('🏦', 'التمويل والدعم', 'جهات التمويل ومراحل الملف لأعضائكم.'),
             ('🚀', 'عرض مشروعكم', 'ابحثوا عن ممول أو شريك لمشروعكم.'), ('🤲', 'الهبة', 'سقف لكل عائلة: التضامن داخل الشبكة.')],
        scenes=[(12, 1, 'عروض الأراضي والعقارات'), (13, 1, 'مقاولون وتشطيب موثوقون'), (9, 1, 'التمويل العقاري لأعضائكم'), (16, 2, '«الهبة»: سقف لكل عائلة')]),
}


def qr(url, color=INK):
    s = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=1).to_string().decode()
    return s.replace('<svg ', f'<svg style="width:100%;height:100%;display:block" fill="{color}" ', 1)


def wa(k):
    return f'https://wa.me/{WA}?text=' + urllib.parse.quote(f'السلام عليكم، بغيت ننضم لشبكة الوسيط 777 كـ{G[k]["one"]}.')


# ---------- الفيديو ----------
def card_hook(g):
    return f"""<html><head><style>{C.CSS}body{{background:{INK};color:#fff;position:relative}}
.ic{{position:absolute;top:300px;right:80px;font-size:200px;line-height:1}}
.b{{position:absolute;right:80px;left:80px;top:600px}}.k{{font-size:36px;color:{RED}}}
h1{{font-size:96px;font-weight:900;line-height:1.12;margin-top:30px}}
.f{{position:absolute;bottom:120px;right:80px;display:flex;align-items:center;gap:24px;font-size:34px;font-weight:700}}.f img{{width:100px;height:100px;border-radius:50%}}
</style></head><body>{C.roofs(C.W, C.H, .14, '#ffffff', 60)}<div class="ic">{g['ic']}</div>
<div class="b"><div class="k">{e(g['to'])}…</div><h1>{e(g['hook'])}</h1></div>
<div class="f"><img src="file://{APP}/icons/logo.png">شبكة الوسيط 777</div></body></html>"""


def card_seats(g):
    return f"""<html><head><style>{C.CSS}body{{background:#fff;position:relative;text-align:center}}
.c{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;padding:90px}}
.n{{font-size:150px;font-weight:900;color:{RED};line-height:1}}h1{{font-size:64px;font-weight:900;color:{INK};line-height:1.25}}
.s{{font-size:40px;color:#444;font-weight:700;border:3px solid {INK};border-radius:80px;padding:18px 40px}}
.g{{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;max-width:880px}}.g b{{font-size:30px;background:#f3f0ea;border-radius:60px;padding:10px 24px}}.g b.on{{background:{RED};color:#fff}}
</style></head><body>{C.roofs(C.W, C.H, .05)}<div class="c"><div class="n">7</div><h1>فئات مهنية… شبكة واحدة</h1>
<div class="g">{''.join(f'<b class="{"on" if G[k] is g else ""}">{G[k]["ic"]} {e(G[k]["ar"])}</b>' for k in KINDS)}</div>
<div class="s">{e(g['ar'])}: {e(g['seats'])} — المقاعد محدودة</div></div></body></html>"""


def card_cta(g):
    return f"""<html><head><style>{C.CSS}body{{background:{RED};color:#fff;position:relative;text-align:center}}
.c{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;padding:80px}}
img{{width:220px;height:220px;border-radius:50%;box-shadow:0 30px 60px -20px rgba(0,0,0,.5)}}h1{{font-size:96px;font-weight:900}}
.t{{font-size:42px;font-weight:700;direction:ltr}}.u{{font-size:32px;direction:ltr;background:#fff;color:{RED};padding:16px 34px;border-radius:60px;font-weight:700}}
.s{{position:absolute;bottom:100px;left:0;right:0;font-size:36px;font-weight:700}}
</style></head><body>{C.roofs(C.W, C.H, .14, '#ffffff', 60)}<div class="c"><img src="file://{APP}/icons/logo.png"><h1>انضم الآن</h1>
<div class="t">📞 {OFFICE['tel1']}<br>📞 {OFFICE['tel2']}</div><div class="u">{C.APP_URL}</div></div>
<div class="s">مع الوسيط… حلك بسيط<div style="font-size:20px;font-weight:400;margin-top:12px;opacity:.8">Demo data · Photos: Wikimedia Commons (CC0 / CC BY / CC BY-SA)</div></div></body></html>"""


def scene_bg(g, title):
    s = {'n': 0, 't': title}
    h = C.page_bg(s, 0)
    return h.replace('دليل تطبيق الوسيط 777 · المرحلة', f'شبكة الوسيط 777 · {e(g["ar"])}').replace('<div class="num">00<small> / 0</small></div>', f'<div class="num" style="font-size:96px;top:40px">{g["ic"]}</div>')


def video(raw, out, k):
    g = G[k]; w = os.path.join(out, 'build', k); os.makedirs(w, exist_ok=True)
    jobs = [(card_hook(g), f'{w}/hook.png', False), (card_seats(g), f'{w}/seats.png', False), (card_cta(g), f'{w}/cta.png', False)]
    for i, (st, ci, title) in enumerate(g['scenes']):
        b = g['ben'][i]
        jobs += [(scene_bg(g, title), f'{w}/bg{i}.png', False), (C.page_cap(i + 1, len(g['scenes']), b[2]), f'{w}/cap{i}.png', True)]
    C.render(jobs, os.path.join(w, 'html'))
    parts = []
    subprocess.run(['convert', '-size', f'{C.W}x{C.H}', 'xc:white', '-fill', 'black', '-draw', f'roundrectangle {C.SX},{C.SY} {C.SX + C.SW - 1},{C.SY + C.SH - 1} 50,50', f'{w}/mask.png'], check=True)
    for nm, t in (('hook', 2.8),):
        C.ff('-loop', '1', '-i', f'{w}/{nm}.png', '-t', str(t), '-vf', f'fade=t=in:st=0:d=0.3,fade=t=out:st={t - .3:.2f}:d=0.3,scale=720:1280:flags=lanczos', *C.ENC, f'{w}/{nm}.mp4'); parts.append(f'{w}/{nm}.mp4')
    for i, (st, ci, title) in enumerate(g['scenes']):
        d = os.path.join(raw, f'{st:02d}'); T = json.load(open(os.path.join(d, 'timeline.json')))
        cap = T['caps'][min(ci, len(T['caps']) - 1)]
        t, fr = 0, []
        for x in T['frames']:
            if cap['a'] - .01 <= t < cap['b']: fr.append(x)
            t += x['d']
        lst = f'{w}/f{i}.txt'
        with open(lst, 'w') as f:
            for x in fr: f.write(f"file '{os.path.join(d, x['f'])}'\nduration {max(x['d'], 0.034):.3f}\n")
            f.write(f"file '{os.path.join(d, fr[-1]['f'])}'\nduration 1.2\nfile '{os.path.join(d, fr[-1]['f'])}'\n")
        dur = sum(max(x['d'], .034) for x in fr) + 1.2
        subprocess.run(['convert', f'{w}/bg{i}.png', f'{w}/mask.png', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', f'{w}/fg{i}.png'], check=True)
        C.ff('-f', 'concat', '-safe', '0', '-i', lst, '-vf', f'fps=30,scale={C.SW}:{C.SH}', *C.ENC, f'{w}/scr{i}.mp4')
        C.ff('-loop', '1', '-i', f'{w}/fg{i}.png', '-i', f'{w}/scr{i}.mp4', '-f', 'lavfi', '-i', f'color=c=0x111111:s={C.W}x{C.H}:d={dur:.3f}', '-loop', '1', '-i', f'{w}/cap{i}.png',
             '-filter_complex', f'[2][1]overlay={C.SX}:{C.SY}:shortest=1[a];[a][0]overlay=0:0[b];[b][3]overlay=0:0,fade=t=in:st=0:d=0.3,fade=t=out:st={dur - .3:.2f}:d=0.3,scale=720:1280:flags=lanczos[o]',
             '-map', '[o]', '-t', f'{dur:.3f}', *C.ENC, f'{w}/sc{i}.mp4')
        parts.append(f'{w}/sc{i}.mp4')
    for nm, t in (('seats', 3.2), ('cta', 3.6)):
        C.ff('-loop', '1', '-i', f'{w}/{nm}.png', '-t', str(t), '-vf', f'fade=t=in:st=0:d=0.3,fade=t=out:st={t - .3:.2f}:d=0.3,scale=720:1280:flags=lanczos', *C.ENC, f'{w}/{nm}.mp4'); parts.append(f'{w}/{nm}.mp4')
    with open(f'{w}/all.txt', 'w') as f:
        for p in parts: f.write(f"file '{p}'\n")
    mp4 = os.path.join(out, f'net-{k}.mp4')
    C.ff('-f', 'concat', '-safe', '0', '-i', f'{w}/all.txt', '-c', 'copy', '-movflags', '+faststart', mp4)
    C.ff('-ss', '1.2', '-i', mp4, '-frames:v', '1', '-q:v', '3', os.path.join(out, f'net-{k}.jpg'))
    return mp4


# ---------- الـ PDF ----------
CSS = BASE_CSS + f"""
@page cover {{ margin: 0; }}
.cover {{ page: cover; position: relative; width: 210mm; height: 297mm; overflow: hidden; background: {INK}; color: #fff; }}
.cover .ph {{ position: absolute; inset: 0 0 auto 0; height: 150mm; background-size: cover; background-position: center; }}
.cover .ph::after {{ content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(17,17,17,.15) 0%, rgba(17,17,17,.55) 60%, {INK} 100%); }}
.cover .field {{ position: absolute; inset: 140mm 0 0 0; opacity: .35; }}
.cover .top {{ position: absolute; top: 14mm; right: 16mm; left: 16mm; display: flex; justify-content: space-between; align-items: center; z-index: 2; }}
.cover .top .lg {{ display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 11pt; }}
.cover .top img {{ width: 54px; height: 54px; border-radius: 50%; }}
.cover .top .inv {{ border: 1px solid rgba(255,255,255,.6); border-radius: 99px; padding: 4px 14px; font-size: 9pt; letter-spacing: .2em; }}
.cover .in {{ position: absolute; right: 16mm; left: 16mm; top: 118mm; z-index: 2; }}
.cover .ic {{ font-size: 40pt; }}
.cover .to {{ font-size: 13pt; color: {RED}; font-weight: 800; margin-top: 4mm; }}
.cover h1 {{ font-size: 36pt; font-weight: 900; line-height: 1.12; margin-top: 3mm; }}
.cover .p {{ font-size: 12pt; color: #cfcfcf; line-height: 1.7; margin-top: 6mm; max-width: 150mm; }}
.cover .bt {{ position: absolute; bottom: 16mm; right: 16mm; left: 16mm; display: flex; justify-content: space-between; align-items: flex-end; z-index: 2; }}
.cover .seat {{ font-size: 11pt; font-weight: 700; border: 1px solid #555; border-radius: 3mm; padding: 3mm 5mm; }}
.cover .seat b {{ color: {RED}; display: block; font-size: 8pt; letter-spacing: .2em; }}
.cover .qr {{ width: 28mm; height: 28mm; background: #fff; padding: 1.8mm; border-radius: 2.5mm; }}
h2.big {{ font-size: 23pt; font-weight: 900; margin: 1mm 0; }}
.lead {{ font-size: 11.5pt; color: #333; line-height: 1.8; }}
.ben {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm; margin: 7mm 0; }}
.ben div {{ display: flex; gap: 4mm; border: .6px solid #e2e2e2; border-radius: 4mm; padding: 5mm; }}
.ben span {{ font-size: 20pt; line-height: 1; }}
.ben b {{ display: block; font-size: 12pt; margin-bottom: 1mm; }}
.ben p {{ margin: 0; font-size: 9.5pt; color: #555; line-height: 1.6; }}
.net {{ display: flex; align-items: center; gap: 8mm; background: #faf7f2; border-radius: 5mm; padding: 6mm; }}
.net svg {{ flex: none; }}
.net p {{ font-size: 10.5pt; line-height: 1.8; margin: 0; }}
.tour {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-top: 6mm; }}
.tour figure {{ margin: 0; }}
.phone {{ border-radius: 5mm; background: #000; padding: 1.3mm; box-shadow: 0 12px 22px -12px rgba(0,0,0,.5); }}
.phone img {{ display: block; width: 100%; border-radius: 4mm; }}
.tour figcaption {{ font-size: 8.6pt; font-weight: 700; text-align: center; margin-top: 2.5mm; line-height: 1.4; }}
.vid {{ display: flex; gap: 7mm; align-items: center; background: {INK}; color: #fff; border-radius: 5mm; padding: 6mm; margin-top: 8mm; text-decoration: none; }}
.vid .th {{ position: relative; width: 40mm; flex: none; border-radius: 3mm; overflow: hidden; }}
.vid .th img {{ width: 100%; display: block; }}
.vid .th i {{ position: absolute; inset: 0; margin: auto; width: 13mm; height: 13mm; border-radius: 50%; background: {RED}; display: grid; place-items: center; font-style: normal; font-size: 14pt; box-shadow: 0 0 0 2mm rgba(200,16,46,.35); }}
.vid h3 {{ font-size: 15pt; font-weight: 900; }}
.vid p {{ font-size: 9.5pt; color: #bbb; line-height: 1.7; margin: 2mm 0 4mm; }}
.vid .qr {{ width: 24mm; height: 24mm; background: #fff; padding: 1.5mm; border-radius: 2mm; }}
.steps {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; margin-top: 6mm; }}
.steps div {{ border-top: 3px solid {RED}; padding-top: 4mm; }}
.steps b {{ font-size: 26pt; font-weight: 300; color: {RED}; line-height: 1; }}
.steps h3 {{ font-size: 12pt; font-weight: 800; margin: 2mm 0 1mm; }}
.steps p {{ font-size: 9.5pt; color: #444; line-height: 1.6; margin: 0; }}
.cta {{ margin-top: 10mm; display: flex; gap: 8mm; align-items: center; border: 1.4px solid {INK}; border-radius: 5mm; padding: 7mm; }}
.cta .qr {{ width: 34mm; height: 34mm; flex: none; }}
.cta h3 {{ font-size: 17pt; font-weight: 900; }}
.cta .ct {{ display: grid; grid-template-columns: auto auto; gap: 1.5mm 6mm; font-size: 10.5pt; margin-top: 3mm; }}
.btnw {{ display: inline-block; margin-top: 4mm; background: #25d366; color: #fff; border-radius: 99px; padding: 2.5mm 7mm; font-weight: 800; font-size: 11pt; }}
.cred {{ font-size: 7pt; color: {GREY}; margin-top: 8mm; line-height: 1.5; direction: ltr; text-align: left; }}
"""


def ring(k):
    """دائرة الفئات السبع، والفئة المعنية بالأحمر"""
    import math
    out = ['<svg width="170" height="170" viewBox="0 0 170 170">', f'<circle cx="85" cy="85" r="62" fill="none" stroke="#ddd" stroke-width="1.2" stroke-dasharray="3 4"/>',
           f'<image href="{LOGO}" x="60" y="60" width="50" height="50"/>']
    for i, kk in enumerate(KINDS):
        a = -math.pi / 2 + i * 2 * math.pi / 7; x, y = 85 + 62 * math.cos(a), 85 + 62 * math.sin(a)
        on = kk == k
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{17 if on else 14}" fill="{RED if on else "#fff"}" stroke="{RED if on else "#ccc"}" stroke-width="1.2"/>'
                   f'<text x="{x:.1f}" y="{y + 5:.1f}" text-anchor="middle" font-size="{15 if on else 12}">{G[kk]["ic"]}</text>')
    out.append('</svg>')
    return ''.join(out)


def pdf(raw, out, k, tmp):
    g = G[k]; app = OFFICE['app']
    cred = json.load(open(f'{APP}/game/img/credits.json'))
    used = {g['img']}
    shots = []
    for i, (st, ci, title) in enumerate(g['scenes']):
        d = os.path.join(raw, f'{st:02d}'); T = json.load(open(os.path.join(d, 'timeline.json')))
        cap = T['caps'][min(ci, len(T['caps']) - 1)]; t, pick = 0, T['frames'][0]['f']
        for x in T['frames']:
            t += x['d']
            if t >= cap['b'] - .05: pick = x['f']; break
        o = os.path.join(tmp, f'{k}_{i}.jpg'); subprocess.run(['convert', os.path.join(d, pick), '-resize', '420x', '-quality', '82', o], check=True)
        shots.append((o, title))
    used |= {'building', 'salon', 'kitchen', 'bedroom', 'villa', 'pool', 'garden', 'riad', 'courtyard', 'fountain', 'zellige', 'sea', 'balcony', 'bathroom', 'shop', 'street', 'chalet', 'plot', 'site', 'farm', 'olive', 'well'}
    vurl = f'{VID_URL}net-{k}.mp4'
    code = f'رمز الدخول ديالك (مثلا <b class="ltr">{g["code"]}</b>) وكلمة السر' if g['code'] else 'رمز الدخول ديالك وكلمة السر'
    H = [f'<html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>{CSS}</style></head><body>']
    H.append(f"""<section class="cover"><div class="ph" style="background-image:url(file://{APP}/game/img/{g['img']}.webp)"></div>
      <div class="field">{roof_field(794, 600, seed=7 + KINDS.index(k), cols=19, rows=14, stroke='#ffffff', op=.45)}</div>
      <div class="top"><div class="lg"><img src="{LOGO}">مجموعة الوسيط 777</div><div class="inv">INVITATION · دعوة خاصة</div></div>
      <div class="in"><div class="ic">{g['ic']}</div><div class="to">{e(g['to'])}…</div><h1>{e(g['hook'])}</h1><div class="p">{e(g['pitch'])}</div></div>
      <div class="bt"><div class="seat"><b>المقاعد محدودة</b>{e(g['ar'])}: {e(g['seats'])}</div><div class="qr">{qr(app)}</div></div></section>""")
    H.append(f"""<section class="pb"><div class="kicker">لماذا تنضم؟</div><h2 class="big">ماذا تربح كـ{e(g['one'])}؟</h2><div class="rule red"></div>
      <div class="ben">{''.join(f'<div><span>{a}</span><div><b>{e(b)}</b><p>{e(c)}</p></div></div>' for a, b, c in g['ben'])}</div>
      <div class="net">{ring(k)}<p><b>شبكة الوسيط 777</b> تجمع 7 فئات مهنية في تطبيق واحد: الوكالات، الوسطاء، المقاولات، التشطيب، المستثمرون، الموثقون والجمعيات السكنية — داخل المغرب وخارجه.
      كل فئة تكمل الأخرى: الصفقة التي تبدأ عند وكالة قد تحتاج مستثمرا، مقاولا، شركة تشطيب وموثقا… وكلهم هنا.</p></div></section>""")
    H.append(f"""<section class="pb"><div class="kicker">جولة سريعة</div><h2 class="big">التطبيق كما ستستعمله</h2><div class="rule red"></div>
      <p class="lead">معطيات تجريبية خيالية، ونفس الشاشات التي ستجدها في حسابك.</p>
      <div class="tour">{''.join(f'<figure><div class="phone"><img src="file://{o}"></div><figcaption>{e(t)}</figcaption></figure>' for o, t in shots)}</div>
      <a class="vid" href="{vurl}"><div class="th"><img src="file://{out}/net-{k}.jpg"><i>▶</i></div><div><h3>شاهد الفيديو</h3>
        <p>دقيقة واحدة لتكتشف ما تقدمه الشبكة لـ{e(g['ar'])}. امسح الرمز بكاميرا الهاتف أو اضغط هنا.</p><div class="qr">{qr(vurl)}</div></div></a></section>""")
    H.append(f"""<section class="pb"><div class="kicker">الانضمام</div><h2 class="big">انضم في 3 خطوات</h2><div class="rule red"></div>
      <div class="steps"><div><b>01</b><h3>افتح التطبيق</h3><p>امسح رمز QR أو افتح الرابط، ثم «إضافة إلى الشاشة الرئيسية». لا متجر تطبيقات.</p></div>
      <div><b>02</b><h3>احصل على حسابك</h3><p>راسل المكتب على واتساب: نعطيك {code} — حساب خاص ومحمي.</p></div>
      <div><b>03</b><h3>أكمل بطاقتك</h3><p>الاسم، المدينة، الخدمات والشعار — وتظهر مباشرة في دليل الشبكة.</p></div></div>
      <div class="cta"><div class="qr">{qr(app)}</div><div><h3>مكانك في الشبكة ينتظرك</h3>
        <div class="ct"><b>📞</b><span class="ltr">{OFFICE['tel1']} · {OFFICE['tel2']}</span><b>✉️</b><span class="ltr">{OFFICE['mail']}</span><b>📍</b><span>{OFFICE['city_ar']}</span><b>🌐</b><span class="ltr">{app}</span></div>
        <a class="btnw" href="{wa(k)}">💬 انضم عبر واتساب</a></div></div>
      <p class="lead" style="margin-top:10mm;font-weight:800;color:{RED};font-size:15pt;text-align:center">{OFFICE['slogan']}</p>
      <div class="cred">Photos: {'; '.join(f"{n}: {cred[n]['by']} ({cred[n]['lic']})" for n in sorted(used) if n in cred)} — Wikimedia Commons. Demo data is fictional.</div></section></body></html>""")
    hp = os.path.join(tmp, f'{k}.html'); open(hp, 'w').write(''.join(H))
    pp = os.path.join(out, f'Invitation_{k}_AlWasset777.pdf')
    render_pdf(hp, pp, f'AL WASSET 777 — Invitation · {g["ar"]}')
    return pp


if __name__ == '__main__':
    raw, out, *only = sys.argv[1:]
    out = os.path.abspath(out); os.makedirs(out, exist_ok=True)
    tmp = os.path.join(out, 'build'); os.makedirs(tmp, exist_ok=True)
    for k in KINDS:
        if only and k not in only: continue
        v = video(raw, out, k); p = pdf(raw, out, k, tmp)
        print(k, os.path.getsize(v) // 1024, 'KB', p)
