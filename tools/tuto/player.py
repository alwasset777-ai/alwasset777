# صفحة الفيديوهات (docs/bureau/tuto/index.html): كل مراحل الدليل، و #NN كيفتح الفيديو مباشرة
# الاستعمال: python3 tools/tuto/player.py
import html, json, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../docs/bureau/tuto/index.html')
S = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require(process.argv[1]).map(s=>({n:s.n,t:s.t,tag:s.tag}))))", f'{HERE}/stages.cjs'], text=True))
e = html.escape
items = ''.join(f'<a class="it" href="#{s["n"]:02d}" data-n="{s["n"]:02d}"><img src="{s["n"]:02d}.jpg" alt="" loading="lazy"><span class="n">{s["n"]:02d}</span><b>{e(s["t"])}</b><small>{e(s["tag"])}</small></a>' for s in S)
page = f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>دليل تطبيق الوسيط 777 — الفيديوهات</title><link rel="icon" href="../icons/logo.png">
<style>@font-face{{font-family:T;src:url(../fonts/tajawal-arabic-700-normal.woff2)format('woff2');font-weight:700}}@font-face{{font-family:T;src:url(../fonts/tajawal-arabic-400-normal.woff2)format('woff2');font-weight:400}}
*{{box-sizing:border-box}}body{{margin:0;font-family:T,system-ui,sans-serif;background:#111;color:#fff}}
header{{display:flex;align-items:center;gap:12px;padding:14px 16px}}header img{{width:46px;height:46px;border-radius:50%}}header b{{font-size:17px}}header small{{display:block;color:#999;font-weight:400}}
.pl{{max-width:420px;margin:0 auto;padding:0 16px}}video{{width:100%;aspect-ratio:9/16;background:#000;border-radius:18px;display:block}}
h1{{font-size:20px;margin:12px 0 4px}}.nav{{display:flex;gap:8px;margin:10px 0 18px}}.nav a{{flex:1;text-align:center;padding:11px;border-radius:12px;background:#222;color:#fff;text-decoration:none;font-weight:700}}.nav a.go{{background:#c8102e}}
.ls{{max-width:900px;margin:0 auto;padding:6px 16px 40px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}}
.it{{position:relative;display:block;color:#fff;text-decoration:none;background:#1b1b1b;border-radius:14px;overflow:hidden;padding-bottom:10px}}.it.on{{outline:3px solid #c8102e}}
.it img{{width:100%;aspect-ratio:9/12;object-fit:cover;object-position:top;display:block;opacity:.85}}.it .n{{position:absolute;top:8px;right:8px;background:#c8102e;border-radius:99px;padding:1px 9px;font-weight:700}}
.it b{{display:block;font-size:13px;padding:8px 10px 0;line-height:1.35}}.it small{{display:block;font-size:11px;color:#999;padding:2px 10px 0}}</style></head><body>
<header><img src="../icons/logo.png" alt=""><div><b>دليل تطبيق الوسيط 777</b><small>{len(S)} فيديو قصير · مع الوسيط… حلك بسيط</small></div></header>
<div class="pl"><video id="v" controls playsinline preload="metadata"></video><h1 id="t"></h1>
<div class="nav"><a id="pv" href="#">→ السابق</a><a class="go" href="../">افتح التطبيق</a><a id="nx" href="#">التالي ←</a></div></div>
<div class="ls">{items}</div>
<p style="text-align:center;color:#777;font-size:12px;padding:0 16px 30px">معطيات تجريبية خيالية · صور العقارات: <a style="color:#aaa" href="../game/img/credits.json">Wikimedia Commons</a> (CC0 / CC BY / CC BY-SA، أصحابها مذكورون)</p>
<script>
const S={json.dumps([[f'{s["n"]:02d}', s['t']] for s in S], ensure_ascii=False)};
const v=document.getElementById('v');
function show(){{let k=S.findIndex(s=>s[0]===location.hash.slice(1));if(k<0)k=0;const [n,t]=S[k];
 if(!v.src.endsWith(n+'.mp4')){{v.src=n+'.mp4';v.poster=n+'.jpg';if(location.hash)v.play().catch(()=>{{}});}}
 document.getElementById('t').textContent=n+' · '+t;document.title=t+' — دليل الوسيط 777';
 document.getElementById('pv').href='#'+S[Math.max(k-1,0)][0];document.getElementById('nx').href='#'+S[Math.min(k+1,S.length-1)][0];
 document.querySelectorAll('.it').forEach(a=>a.classList.toggle('on',a.dataset.n===n));if(location.hash)scrollTo({{top:0,behavior:'smooth'}});}}
v.addEventListener('ended',()=>{{const k=S.findIndex(s=>v.src.endsWith(s[0]+'.mp4'));if(k<S.length-1)location.hash=S[k+1][0];}});
addEventListener('hashchange',show);show();
</script></body></html>"""
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w').write(page)
print('ok', OUT)
