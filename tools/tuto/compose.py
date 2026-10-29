# تركيب فيديوهات الدليل: الهاتف (التصوير) داخل إطار بهوية الوسيط 777 + عنوان + شرح كل خطوة + بطاقة البداية والنهاية
# الاستعمال: python3 tools/tuto/compose.py RAW_DIR OUT_DIR [n1 n2 …]
import html, json, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
APP = f'{ROOT}/docs/bureau'
W, H = 1080, 1920
SX, SY, SW, SH = 150, 206, 780, 1440          # مكان الشاشة
RED, INK = '#c8102e', '#111111'
APP_URL = 'alwasset777-ai.github.io/alwasset777/bureau'
e = lambda s: html.escape(str(s or ''))


def stages():
    js = "const S=require(process.argv[1]);console.log(JSON.stringify(S.map(s=>({n:s.n,t:s.t,tag:s.tag,intro:s.intro,go:s.go,lessons:s.lessons}))))"
    return json.loads(subprocess.check_output(['node', '-e', js, f'{ROOT}/tools/tuto/stages.cjs'], text=True))


def fonts():
    out = []
    for w in (400, 500, 700, 800, 900):
        for sub, rng in (('arabic', 'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFC,U+200C-200E'), ('latin', 'U+0000-00FF,U+2000-206F')):
            out.append(f"@font-face{{font-family:T;font-weight:{w};src:url(file://{APP}/fonts/tajawal-{sub}-{w}-normal.woff2)format('woff2');unicode-range:{rng}}}")
    return ''.join(out)


def roofs(w, h, op=.07, col=INK, step=54):
    p = []
    for r in range(int(h / step) + 1):
        for c in range(int(w / step) + 1):
            x, y = c * step + (step / 2 if r % 2 else 0), r * step
            p.append(f'M{x - 11:.0f},{y + 5:.0f}L{x:.0f},{y - 6:.0f}L{x + 11:.0f},{y + 5:.0f}')
    return f'<svg width="{w}" height="{h}" style="position:absolute;inset:0"><path d="{" ".join(p)}" fill="none" stroke="{col}" stroke-width="2" stroke-linecap="round" opacity="{op}"/></svg>'


CSS = f"""{fonts()}*{{box-sizing:border-box;margin:0}}html,body{{width:{W}px;height:{H}px;font-family:T,sans-serif;direction:rtl;overflow:hidden}}
.k{{font-size:25px;font-weight:700;letter-spacing:.06em;color:{RED}}}"""


def page_bg(s, total):
    return f"""<html><head><style>{CSS}
body{{background:linear-gradient(180deg,#fff 0,#f6f3ee 100%);position:relative}}
.hd{{position:absolute;top:0;left:0;right:0;height:188px;display:flex;align-items:center;gap:26px;padding:0 54px;background:#fff;border-bottom:1px solid #eee}}
.hd img{{width:116px;height:116px;border-radius:50%;box-shadow:0 8px 22px -8px rgba(0,0,0,.45)}}
.hd h1{{font-size:50px;font-weight:800;color:{INK};line-height:1.15;margin-top:6px}}
.num{{position:absolute;left:54px;top:46px;direction:ltr;font-size:88px;font-weight:300;color:{RED};line-height:1;font-feature-settings:'tnum'}}
.num small{{font-size:30px;color:#bbb}}
.bz{{position:absolute;left:{SX - 16}px;top:{SY - 16}px;width:{SW + 32}px;height:{SH + 32}px;border-radius:66px;background:{INK};
  box-shadow:0 40px 70px -28px rgba(0,0,0,.55),0 0 0 2px #2a2a2a inset,0 0 0 1px #000}}
.cap{{position:absolute;left:44px;right:44px;top:{SY + SH + 34}px;bottom:30px;border-radius:34px;background:#fff;box-shadow:0 18px 40px -22px rgba(0,0,0,.35);border:1px solid #eee}}
.cap::before{{content:'';position:absolute;right:0;top:26px;bottom:26px;width:7px;border-radius:7px 0 0 7px;background:{RED}}}
</style></head><body>{roofs(W, H, .05)}
<div class="hd"><img src="file://{APP}/icons/logo.png"><div><div class="k">دليل تطبيق الوسيط 777 · المرحلة</div><h1>{e(s['t'])}</h1></div></div>
<div class="num">{s['n']:02d}<small> / {total}</small></div>
<div class="bz"></div><div class="cap"></div></body></html>"""


def page_cap(i, n, text):
    fs = 44 if len(text) < 34 else 40 if len(text) < 48 else 36
    return f"""<html><head><style>{CSS}html,body{{background:transparent}}
.c{{position:absolute;left:44px;right:44px;top:{SY + SH + 34}px;bottom:30px;display:flex;align-items:center;gap:26px;padding:0 50px 0 40px}}
.i{{flex:none;width:86px;height:86px;border-radius:50%;background:{RED};color:#fff;display:grid;place-items:center;font-size:44px;font-weight:800;box-shadow:0 10px 20px -8px rgba(200,16,46,.7)}}
.i small{{font-size:20px;opacity:.75;direction:ltr;unicode-bidi:isolate}}
p{{font-size:{fs}px;font-weight:800;line-height:1.35;color:{INK}}}</style></head><body>
<div class="c"><div class="i"><div style="text-align:center;line-height:1">{i}<br><small>/{n}</small></div></div><p>{e(text)}</p></div></body></html>"""


def page_intro(s, total):
    return f"""<html><head><style>{CSS}body{{background:{INK};color:#fff;position:relative}}
.n{{position:absolute;right:80px;top:330px;font-size:330px;font-weight:900;line-height:1;color:transparent;-webkit-text-stroke:3px {RED}}}
.b{{position:absolute;right:80px;left:80px;top:760px}}
h1{{font-size:84px;font-weight:900;line-height:1.15}}
.t{{font-size:42px;color:#bdbdbd;margin-top:26px;font-weight:500}}
.r{{width:120px;height:8px;background:{RED};border-radius:8px;margin:44px 0}}
.f{{position:absolute;bottom:120px;right:80px;left:80px;display:flex;align-items:center;gap:26px;font-size:34px;font-weight:700}}
.f img{{width:110px;height:110px;border-radius:50%}}
.k{{font-size:30px}}</style></head><body>{roofs(W, H, .16, '#ffffff', 60)}
<div class="n">{s['n']:02d}</div>
<div class="b"><div class="k">المرحلة {s['n']} من {total}</div><div class="r"></div><h1>{e(s['t'])}</h1><div class="t">{e(s['tag'])}</div></div>
<div class="f"><img src="file://{APP}/icons/logo.png"><div>مجموعة الوسيط 777<div style="font-size:28px;color:#999;font-weight:500">مع الوسيط… حلك بسيط</div></div></div></body></html>"""


def page_outro(s, nxt):
    nx = f'<div class="x">المرحلة التالية ← {e(nxt["t"])}</div>' if nxt else '<div class="x">🏆 كمّلتي الدليل كامل — مبروك!</div>'
    return f"""<html><head><style>{CSS}body{{background:#fff;position:relative;text-align:center}}
.c{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;padding:80px}}
img{{width:230px;height:230px;border-radius:50%;box-shadow:0 30px 60px -24px rgba(0,0,0,.5)}}
h1{{font-size:76px;font-weight:900;color:{INK}}}
.u{{font-size:34px;direction:ltr;color:{RED};font-weight:700;padding:18px 34px;border:3px solid {RED};border-radius:60px}}
.x{{font-size:38px;color:#555;font-weight:700;margin-top:30px}}
.s{{position:absolute;bottom:110px;left:0;right:0;font-size:34px;color:#999;font-weight:500}}</style></head><body>{roofs(W, H, .06)}
<div class="c"><img src="file://{APP}/icons/logo.png"><h1>جرّبها دابا فالتطبيق</h1><div class="u">{APP_URL}</div>{nx}</div>
<div class="s">مع الوسيط… حلك بسيط<div style="font-size:20px;margin-top:14px;color:#bbb;direction:ltr">Demo data · Photos: Wikimedia Commons (CC0 / CC BY / CC BY-SA)</div></div></body></html>"""


def render(jobs, tmp):
    """jobs: [(html, png, transparent)] → صور عبر Chromium"""
    os.makedirs(tmp, exist_ok=True)
    spec = []
    for i, (h, png, tr) in enumerate(jobs):
        f = os.path.join(tmp, f'{i}.html'); open(f, 'w').write(h); spec.append({'f': f, 'png': png, 'tr': tr})
    js = """const {chromium}=require('playwright');const S=JSON.parse(require('fs').readFileSync(process.argv[2]));
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
for(const s of S){await p.goto('file://'+s.f);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(60);await p.screenshot({path:s.png,omitBackground:s.tr});}
await b.close();})();"""
    jf = os.path.join(tmp, 'r.cjs'); open(jf, 'w').write(js)
    sf = os.path.join(tmp, 's.json'); json.dump(spec, open(sf, 'w'))
    env = dict(os.environ, NODE_PATH=subprocess.check_output(['npm', 'root', '-g'], text=True).strip())
    subprocess.run(['node', jf, sf], check=True, env=env)


def ff(*a):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *a], check=True)


ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', '30']


def build(raw, out, s, nxt, total):
    d = os.path.join(raw, f'{s["n"]:02d}'); T = json.load(open(os.path.join(d, 'timeline.json')))
    w = os.path.join(d, 'build'); os.makedirs(w, exist_ok=True)
    caps = T['caps']
    jobs = [(page_bg(s, total), f'{w}/bg.png', False), (page_intro(s, total), f'{w}/intro.png', False), (page_outro(s, nxt), f'{w}/outro.png', False)]
    jobs += [(page_cap(i + 1, len(caps), c['text']), f'{w}/cap{i}.png', True) for i, c in enumerate(caps)]
    render(jobs, os.path.join(w, 'html'))
    # الإطار فوق الشاشة: الخلفية مع ثقب بزوايا مدورة
    subprocess.run(['convert', '-size', f'{W}x{H}', 'xc:white', '-fill', 'black', '-draw', f'roundrectangle {SX},{SY} {SX + SW - 1},{SY + SH - 1} 50,50', f'{w}/mask.png'], check=True)
    subprocess.run(['convert', f'{w}/bg.png', f'{w}/mask.png', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', f'{w}/fg.png'], check=True)
    # الشاشة: الصور بالتوقيت ديالها
    lst = os.path.join(w, 'frames.txt')
    with open(lst, 'w') as f:
        for x in T['frames']:
            f.write(f"file '{os.path.join(d, x['f'])}'\nduration {max(x['d'], 0.034):.3f}\n")
        f.write(f"file '{os.path.join(d, T['frames'][-1]['f'])}'\n")
    ff('-f', 'concat', '-safe', '0', '-i', lst, '-vf', f'fps=30,scale={SW}:{SH}', *ENC, f'{w}/screen.mp4')
    dur = T['total']
    ins = ['-loop', '1', '-i', f'{w}/fg.png', '-i', f'{w}/screen.mp4', '-f', 'lavfi', '-i', f'color=c=0x111111:s={W}x{H}:d={dur}',
           '-f', 'lavfi', '-i', f'color=c=0xc8102e:s={W}x10:d={dur}']
    for i in range(len(caps)): ins += ['-loop', '1', '-i', f'{w}/cap{i}.png']
    fl = f'[2][1]overlay={SX}:{SY}:shortest=1[a];[a][0]overlay=0:0[b];[b][3]overlay=x=-{W}+{W}*t/{dur:.3f}:y=0[v0]'
    for i, c in enumerate(caps):
        fl += f";[v{i}][{4 + i}]overlay=0:0:enable='between(t,{c['a']:.3f},{c['b'] + (0.5 if i == len(caps) - 1 else 0):.3f})'[v{i + 1}]"
    fl += f';[v{len(caps)}]fade=t=in:st=0:d=0.35,scale=720:1280:flags=lanczos[o]'
    ff(*ins, '-filter_complex', fl, '-map', '[o]', '-t', f'{dur:.3f}', *ENC, f'{w}/main.mp4')
    for nm, t in (('intro', 1.9), ('outro', 2.4)):
        ff('-loop', '1', '-i', f'{w}/{nm}.png', '-t', str(t), '-vf', f'fade=t=in:st=0:d=0.3,fade=t=out:st={t - .3:.2f}:d=0.3,scale=720:1280:flags=lanczos', *ENC, f'{w}/{nm}.mp4')
    with open(f'{w}/all.txt', 'w') as f:
        for nm in ('intro', 'main', 'outro'): f.write(f"file '{w}/{nm}.mp4'\n")
    os.makedirs(out, exist_ok=True)
    mp4 = os.path.join(out, f'{s["n"]:02d}.mp4')
    ff('-f', 'concat', '-safe', '0', '-i', f'{w}/all.txt', '-c', 'copy', '-movflags', '+faststart', mp4)
    # صورة مصغرة (للـ PDF) من وسط الفيديو
    ff('-ss', f'{1.9 + dur * .45:.2f}', '-i', mp4, '-frames:v', '1', '-q:v', '3', os.path.join(out, f'{s["n"]:02d}.jpg'))
    return mp4, round(dur + 4.3, 1)


if __name__ == '__main__':
    raw, out, *only = sys.argv[1:]
    S = stages()
    for k, s in enumerate(S):
        if only and str(s['n']) not in only: continue
        mp4, d = build(raw, out, s, S[k + 1] if k + 1 < len(S) else None, len(S))
        print(s['n'], mp4, f'{d}s', f'{os.path.getsize(mp4) // 1024} KB')
