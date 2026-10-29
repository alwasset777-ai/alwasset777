# أيقونات 3D جديدة (SVG ← webp 256×256 شفاف) بنفس أسلوب icons/hub: لامعة، ظل ناعم، ألوان الوسيط 777
# الاستعمال: python3 tools/icons/make_icons.py
import os, subprocess
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../docs/bureau/icons/hub')
DEF = '''<defs>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".35" stop-color="#f6c443"/><stop offset=".75" stop-color="#c98a12"/><stop offset="1" stop-color="#8a5a06"/></linearGradient>
<linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b7d"/><stop offset=".45" stop-color="#e01b3c"/><stop offset="1" stop-color="#8f0a20"/></linearGradient>
<linearGradient id="blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc8ff"/><stop offset=".45" stop-color="#3b82f6"/><stop offset="1" stop-color="#1d4fb8"/></linearGradient>
<linearGradient id="green" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ef0bf"/><stop offset=".45" stop-color="#1fb877"/><stop offset="1" stop-color="#0d7a4c"/></linearGradient>
<linearGradient id="white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#eef1f6"/><stop offset="1" stop-color="#c9d0db"/></linearGradient>
<linearGradient id="ink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b5b66"/><stop offset=".5" stop-color="#26262c"/><stop offset="1" stop-color="#0c0c10"/></linearGradient>
<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="shadow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<filter id="ds" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".28"/></filter>
</defs>'''
SH = '<ellipse cx="128" cy="232" rx="78" ry="12" fill="url(#shadow)"/>'
I = {
 # ✨ أفضل الفرص: نجمة ذهبية + بريق
 'opp': '''<g filter="url(#ds)"><path d="M128 30 L152 92 L218 96 L166 138 L184 202 L128 166 L72 202 L90 138 L38 96 L104 92 Z" fill="url(#gold)" stroke="#9a6a0a" stroke-width="3" stroke-linejoin="round"/>
 <path d="M128 48 L146 98 L196 101 L128 112 L60 101 L110 98 Z" fill="url(#gloss)" opacity=".7"/>
 <text x="128" y="152" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="40" fill="#8f0a20">777</text></g>
 <path d="M206 28 l6 16 16 6 -16 6 -6 16 -6 -16 -16 -6 16 -6z" fill="#ffd54a"/><path d="M42 164 l4 11 11 4 -11 4 -4 11 -4 -11 -11 -4 11 -4z" fill="#ff6b7d"/>''',
 # 🔔 المتابعات: جرس ذهبي
 'bell': '''<g filter="url(#ds)"><circle cx="128" cy="40" r="14" fill="url(#gold)" stroke="#9a6a0a" stroke-width="3"/>
 <path d="M128 50 C82 50 66 92 66 128 L66 160 L44 190 L212 190 L190 160 L190 128 C190 92 174 50 128 50 Z" fill="url(#gold)" stroke="#9a6a0a" stroke-width="3" stroke-linejoin="round"/>
 <path d="M96 76 C84 92 80 112 80 132" stroke="#fff" stroke-opacity=".75" stroke-width="10" stroke-linecap="round" fill="none"/>
 <rect x="40" y="184" width="176" height="16" rx="8" fill="url(#gold)" stroke="#9a6a0a" stroke-width="3"/>
 <circle cx="128" cy="214" r="18" fill="url(#red)" stroke="#7a0a1b" stroke-width="3"/></g>
 <circle cx="196" cy="60" r="24" fill="url(#red)" stroke="#fff" stroke-width="5"/><text x="196" y="70" text-anchor="middle" font-family="Arial" font-weight="900" font-size="28" fill="#fff">!</text>''',
 # 📊 التوزيع: أعمدة 3D
 'chart': '''<rect x="34" y="196" width="188" height="16" rx="8" fill="url(#ink)"/>
 <g filter="url(#ds)"><rect x="48" y="120" width="44" height="78" rx="9" fill="url(#blue)"/><rect x="106" y="70" width="44" height="128" rx="9" fill="url(#red)"/><rect x="164" y="100" width="44" height="98" rx="9" fill="url(#green)"/>
 <rect x="54" y="126" width="12" height="62" rx="6" fill="url(#gloss)"/><rect x="112" y="76" width="12" height="110" rx="6" fill="url(#gloss)"/><rect x="170" y="106" width="12" height="80" rx="6" fill="url(#gloss)"/></g>
 <path d="M52 92 L120 44 L156 62 L214 30" stroke="url(#gold)" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#ds)"/><circle cx="214" cy="30" r="10" fill="url(#gold)"/>''',
 # 💬 الرسائل: فقاعتين
 'chat': '''<g filter="url(#ds)"><path d="M30 60 Q30 34 56 34 L150 34 Q176 34 176 60 L176 118 Q176 144 150 144 L86 144 L52 176 L58 144 L56 144 Q30 144 30 118 Z" fill="url(#red)" stroke="#7a0a1b" stroke-width="3" stroke-linejoin="round"/>
 <path d="M44 62 Q44 46 60 46 L144 46" stroke="#fff" stroke-opacity=".6" stroke-width="8" stroke-linecap="round" fill="none"/>
 <circle cx="70" cy="90" r="11" fill="#fff"/><circle cx="103" cy="90" r="11" fill="#fff"/><circle cx="136" cy="90" r="11" fill="#fff"/>
 <path d="M226 128 Q226 104 202 104 L192 104 L192 128 Q192 160 160 160 L118 160 L118 176 Q118 200 142 200 L186 200 L214 224 L210 200 L202 200 Q226 200 226 176 Z" fill="url(#white)" stroke="#9aa3b2" stroke-width="3" stroke-linejoin="round"/></g>''',
 # 👥 مجموعات المشتركين: 3 أشخاص
 'groups': '''<g filter="url(#ds)"><circle cx="66" cy="92" r="26" fill="url(#blue)"/><path d="M22 196 Q22 132 66 132 Q110 132 110 196 Z" fill="url(#blue)"/>
 <circle cx="190" cy="92" r="26" fill="url(#green)"/><path d="M146 196 Q146 132 190 132 Q234 132 234 196 Z" fill="url(#green)"/>
 <circle cx="128" cy="78" r="34" fill="url(#red)" stroke="#fff" stroke-width="4"/><path d="M70 212 Q70 128 128 128 Q186 128 186 212 Z" fill="url(#red)" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
 <ellipse cx="118" cy="64" rx="14" ry="9" fill="#fff" opacity=".55"/><path d="M96 150 Q110 138 128 136" stroke="#fff" stroke-opacity=".5" stroke-width="7" stroke-linecap="round" fill="none"/></g>''',
 # 🎓 أكاديمية الوكيل: كتاب + قبعة التخرج
 'academy': '''<g filter="url(#ds)"><path d="M28 150 L128 182 L228 150 L228 196 L128 228 L28 196 Z" fill="url(#red)" stroke="#7a0a1b" stroke-width="3" stroke-linejoin="round"/>
 <path d="M40 152 L128 180 L216 152 L216 186 L128 214 L40 186 Z" fill="url(#white)"/>
 <path d="M128 182 L128 228" stroke="#7a0a1b" stroke-width="3"/>
 <path d="M128 36 L234 80 L128 124 L22 80 Z" fill="url(#ink)" stroke="#000" stroke-width="3" stroke-linejoin="round"/>
 <path d="M70 100 L70 136 Q128 164 186 136 L186 100 L128 124 Z" fill="url(#ink)"/>
 <path d="M128 52 L196 80" stroke="#fff" stroke-opacity=".35" stroke-width="7" stroke-linecap="round"/>
 <path d="M128 80 L206 96 L206 142" stroke="url(#gold)" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="206" cy="148" r="11" fill="url(#gold)"/></g>''',
 # 🧰 خدمات المجموعة: صندوق أدوات أحمر
 'toolbox': '''<g filter="url(#ds)"><path d="M92 74 L92 54 Q92 42 104 42 L152 42 Q164 42 164 54 L164 74" stroke="url(#ink)" stroke-width="14" fill="none" stroke-linecap="round"/>
 <rect x="26" y="74" width="204" height="130" rx="18" fill="url(#red)" stroke="#7a0a1b" stroke-width="3"/>
 <rect x="26" y="74" width="204" height="40" rx="18" fill="#fff" opacity=".18"/><rect x="26" y="126" width="204" height="10" fill="#7a0a1b" opacity=".55"/>
 <rect x="108" y="116" width="40" height="30" rx="6" fill="url(#gold)" stroke="#9a6a0a" stroke-width="3"/>
 <path d="M42 90 Q42 82 52 82 L150 82" stroke="#fff" stroke-opacity=".55" stroke-width="7" stroke-linecap="round" fill="none"/></g>''',
 # 🌍 دول المشتركين: كرة أرضية
 'globe': '''<g filter="url(#ds)"><circle cx="128" cy="124" r="96" fill="url(#blue)" stroke="#1d4fb8" stroke-width="3"/>
 <path d="M70 70 Q92 60 104 76 Q118 92 100 104 Q84 114 92 132 Q98 150 80 160 Q62 150 52 126 Q46 96 70 70 Z" fill="url(#green)"/>
 <path d="M146 48 Q176 52 196 76 Q210 96 196 108 Q178 116 168 100 Q156 86 140 92 Q128 80 146 48 Z" fill="url(#green)"/>
 <path d="M150 140 Q176 128 196 146 Q190 182 160 196 Q146 176 150 140 Z" fill="url(#green)"/>
 <ellipse cx="96" cy="72" rx="40" ry="22" fill="#fff" opacity=".35"/></g>
 <g filter="url(#ds)"><path d="M176 150 C176 130 214 130 214 150 C214 172 195 192 195 192 C195 192 176 172 176 150 Z" fill="url(#red)" stroke="#fff" stroke-width="4"/><circle cx="195" cy="150" r="7" fill="#fff"/></g>''',
}
os.makedirs(OUT, exist_ok=True)
for k, body in I.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">{DEF}{SH}{body}</svg>'
    p = f'/tmp/claude-0/-home-user/a8f7599f-b70e-5901-ac8f-688f4329abc5/scratchpad/ico_{k}.svg'
    open(p, 'w').write(svg)
    js = f"const {{chromium}}=require('playwright');(async()=>{{const b=await chromium.launch();const p=await b.newPage({{viewport:{{width:256,height:256}}}});await p.goto('file://{p}');await p.screenshot({{path:'{p}.png',omitBackground:true}});await b.close();}})()"
    subprocess.run(['node', '-e', js], check=True, env=dict(os.environ, NODE_PATH=subprocess.check_output(['npm', 'root', '-g'], text=True).strip()))
    subprocess.run(['convert', p + '.png', '-quality', '90', '-define', 'webp:lossless=false', os.path.join(OUT, k + '.webp')], check=True)
    print(k)
