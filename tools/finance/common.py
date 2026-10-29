# أدوات مشتركة لملفات PDF ديال الوسيط 777 (هوية: أبيض / أحمر / أسود — «Signal Architecture»)
import html, json, math, os, random, subprocess

APP = '/home/user/alwasset777/docs/bureau'
HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = f'file://{APP}/icons/logo.png'
FIN = f'file://{APP}/icons/fin'
RED, INK, PAPER, GREY = '#c8102e', '#111111', '#ffffff', '#8a8a8a'
OFFICE = {
    'fr': 'AL WASSET 777 IMMOBILIER', 'ar': 'مكتب الوسيط 777 للعقارات', 'city': 'Meknès — Maroc', 'city_ar': 'مكناس — المملكة المغربية',
    'tel1': '+212 777-777848', 'tel2': '+212 777-777959', 'mail': 'alwasset777@gmail.com',
    'slogan': 'مع الوسيط… حلك بسيط', 'app': 'https://alwasset777-ai.github.io/alwasset777/bureau/', 'rep': 'Mounir RADOUI', 'rep_ar': 'منير رادوي',
}
e = lambda s: html.escape(str(s or ''))


def fonts_css():
    f = f'file://{APP}/fonts'
    out = []
    for w in (300, 400, 500, 700, 800, 900):
        ww = 400 if w == 300 else w
        for sub, rng in (('arabic', 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFC,U+200C-200E'), ('latin', 'U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122,U+2190-21FF,U+2212,U+2215')):
            out.append(f"@font-face{{font-family:'Tajawal';font-weight:{w};src:url({f}/tajawal-{sub}-{ww}-normal.woff2) format('woff2');unicode-range:{rng}}}")
    return '\n'.join(out)


BASE_CSS = fonts_css() + f"""
@page {{ size: A4; margin: 16mm 15mm 18mm; }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; padding: 0; font-family: 'Tajawal', 'Noto Sans Arabic', sans-serif; color: {INK}; font-size: 10.4pt; line-height: 1.65; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
a {{ color: {RED}; text-decoration: none; }}
.ltr {{ direction: ltr; unicode-bidi: isolate; }}
h1, h2, h3 {{ margin: 0; line-height: 1.3; }}
.pb {{ break-before: page; }}
.nob {{ break-inside: avoid; }}
.kicker {{ font-size: 8pt; letter-spacing: .28em; text-transform: uppercase; color: {GREY}; font-weight: 500; }}
.rule {{ height: 1px; background: {INK}; opacity: .85; margin: 10px 0 14px; }}
.rule.red {{ background: {RED}; height: 2px; width: 42px; opacity: 1; }}
.sec-title {{ display: flex; align-items: baseline; gap: 14px; margin: 0 0 4px; }}
.sec-title .num {{ font-size: 30pt; font-weight: 300; color: {RED}; line-height: 1; }}
.sec-title h2 {{ font-size: 17pt; font-weight: 800; }}
.sec-title small {{ display: block; font-size: 9pt; color: {GREY}; font-weight: 500; letter-spacing: .04em; }}
table {{ width: 100%; border-collapse: collapse; }}
th {{ text-align: start; font-size: 8pt; font-weight: 700; color: #fff; background: {INK}; padding: 6px 7px; letter-spacing: .02em; }}
td {{ padding: 5px 7px; border-bottom: .6px solid #d9d9d9; vertical-align: top; font-size: 9pt; }}
tr:nth-child(even) td {{ background: #fafafa; }}
.badge {{ display: inline-block; padding: 1px 8px; border-radius: 99px; font-size: 7.6pt; font-weight: 700; white-space: nowrap; }}
.b-ok {{ background: #e7f6ee; color: #146c43; }} .b-partial {{ background: #fff4d6; color: #8a5a00; }} .b-missing {{ background: #fde7ea; color: {RED}; }}
.src-v {{ color: #146c43; font-weight: 700; }} .src-s {{ color: #8a5a00; font-weight: 700; }}
.lines {{ border-bottom: .6px dashed #bdbdbd; height: 22px; }}
"""

STATUS = {'ok': ('✅', 'معلومات كافية', 'b-ok'), 'partial': ('🟡', 'جزئية — تحتاج تأكيداً', 'b-partial'), 'missing': ('🔴', 'ناقصة — تواصل مباشر', 'b-missing')}


def badge(st):
    ic, t, c = STATUS[st]
    return f'<span class="badge {c}">{ic} {t}</span>'


def roof_field(w, h, seed=7, cols=21, rows=13, reds=None, stroke=INK, red=RED, op=.9):
    """حقل ديال سقوف صغيرة (chevrons) — بعضها أحمر: إشارة خفية للعقار والتمويل"""
    rnd = random.Random(seed)
    cw, ch = w / cols, h / rows
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">']
    reds = reds if reds is not None else {(rnd.randrange(cols), rnd.randrange(rows)) for _ in range(7)}
    for r in range(rows):
        for c in range(cols):
            x, y = c * cw + cw / 2, r * ch + ch / 2
            s = min(cw, ch) * (.26 + .1 * math.sin((c + r) / 3.2))
            col = red if (c, r) in reds else stroke
            sw = 1.6 if (c, r) in reds else .55
            o = 1 if (c, r) in reds else op * (.35 + .65 * (1 - r / rows))
            out.append(f'<path d="M{x - s:.1f},{y + s * .45:.1f} L{x:.1f},{y - s * .55:.1f} L{x + s:.1f},{y + s * .45:.1f}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" opacity="{o:.2f}"/>')
    out.append('</svg>')
    return ''.join(out)


def arcs(w, h, n=14, color=INK, accent=RED, seed=3):
    """أقواس متتالية متمركزة بحال منحنى الأقساط — قوس واحد أحمر"""
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">']
    cx, R = w / 2, min(w / 2, h) - 2
    for i in range(n):
        r = 10 + (R - 10) * (i / (n - 1)) ** 1.1
        col, sw, op = (accent, 2, 1) if i == n - 5 else (color, .6, .15 + .55 * i / n)
        out.append(f'<path d="M{cx - r:.1f},{h} A{r:.1f},{r:.1f} 0 0 1 {cx + r:.1f},{h}" fill="none" stroke="{col}" stroke-width="{sw}" opacity="{op:.2f}"/>')
    out.append(f'<circle cx="{cx}" cy="{h}" r="3" fill="{accent}"/></svg>')
    return ''.join(out)


def logo_pair(inst_logo, size=46, group_logo=None):
    """شعار المجموعة × شعار الجهة (كيبان فالبطاقة)"""
    g = f'<img class="lp-g" src="{group_logo}" alt="">' if group_logo else ''
    il = f'<img src="{inst_logo}" alt="">' if inst_logo else '<span class="lp-ph">شعار<br>الجهة</span>'
    return f'<div class="lp" style="--s:{size}px"><img src="{LOGO}" alt=""><i>×</i><span class="lp-i">{il}{g}</span></div>'


LP_CSS = f"""
.lp {{ display: flex; align-items: center; gap: 8px; }}
.lp > img {{ width: var(--s); height: var(--s); object-fit: contain; border-radius: 50%; }}
.lp i {{ font-style: normal; color: {RED}; font-weight: 300; font-size: calc(var(--s) * .45); }}
.lp-i {{ position: relative; height: var(--s); min-width: calc(var(--s) * 1.4); max-width: calc(var(--s) * 3.2); display: grid; place-items: center; }}
.lp-i > img:first-child {{ max-height: var(--s); max-width: calc(var(--s) * 3.2); object-fit: contain; }}
.lp-g {{ position: absolute; inset-inline-end: -10px; bottom: -8px; width: calc(var(--s) * .42); height: calc(var(--s) * .42); object-fit: contain; background: #fff; border-radius: 6px; box-shadow: 0 0 0 1px #e5e5e5; padding: 2px; }}
.lp-ph {{ width: calc(var(--s) * 1.4); height: var(--s); border: 1px dashed #bbb; border-radius: 8px; display: grid; place-items: center; text-align: center; font-size: 7pt; line-height: 1.2; color: {GREY}; }}
"""


def render_pdf(html_path, pdf_path, footer_text='', landscape=False, cover=True):
    js = f"""
const {{chromium}}=require('playwright');
(async()=>{{const b=await chromium.launch({{executablePath:'/opt/pw-browsers/chromium'}});const p=await b.newPage();
await p.goto('file://{html_path}',{{waitUntil:'load'}});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
await p.pdf({{path:'{pdf_path}',format:'A4',landscape:{str(landscape).lower()},printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,
headerTemplate:'<span></span>',
footerTemplate:`<div style="width:100%;font-family:Tajawal,sans-serif;font-size:7.5px;color:#8a8a8a;padding:0 15mm;display:flex;justify-content:space-between;direction:ltr"><span>{footer_text}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`}});
await b.close();}})();"""
    jsf = pdf_path + '.cjs'
    open(jsf, 'w').write(js)
    env = dict(os.environ, NODE_PATH=subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    subprocess.run(['node', jsf], check=True, env=env)
    os.remove(jsf)
