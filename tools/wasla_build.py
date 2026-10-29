#!/usr/bin/env python3
"""يبني مراحل لعبة «وصلة العقار» من بنوك الأسئلة (tools/wasla-data/wasla-*.js) → docs/bureau/wasla-levels.js
الاستعمال: python3 tools/wasla_build.py"""
import json, random, re, subprocess, os, unicodedata
ROOT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'bureau')
ORDER = ['house', 'types', 'sale', 'rent', 'build', 'deco', 'city', 'meknes', 'money', 'law', 'jobs']
MAX = 12          # أكبر عرض/طول للشبكة
TARGET = 10       # عدد الأسئلة فكل مرحلة
MIN_STAGE = 6

def norm(s, lang):
    if lang == 'ar':
        s = re.sub('[ً-ْـ]', '', s)
        s = re.sub('[أإآٱ]', 'ا', s).replace('ؤ', 'و').replace('ئ', 'ي').replace('ى', 'ي')
        return s
    s = unicodedata.normalize('NFD', s)
    return re.sub('[^A-Z]', '', ''.join(c for c in s if not unicodedata.combining(c)).upper())

def load(lang):
    js = open(os.path.join(os.path.dirname(__file__), 'wasla-data', f'wasla-{lang}.js'), encoding='utf-8').read()
    out = subprocess.run(['node', '-e', 'const window={};' + js + f';process.stdout.write(JSON.stringify(window.W777_WQ.{lang}))'], capture_output=True, text=True, check=True).stdout
    return json.loads(out)

def build_stage(pool, rnd, target=TARGET):
    """يحاول يركب شبكة من pool (لائحة عناصر). كيرجع (placed, H, W)"""
    best = None
    for attempt in range(40):
        items = pool[:]
        rnd.shuffle(items)
        items.sort(key=lambda x: -len(x['L']) + rnd.random() * 3)
        cells = {}
        placed = []
        b = [0, 0, 0, 0]  # minR maxR minC maxC

        def get(r, c):
            return cells.get((r, c))

        def fits(it, r, c, d):
            dr, dc = (0, 1) if d == 'a' else (1, 0)
            n = len(it['L'])
            if get(r - dr, c - dc) or get(r + dr * n, c + dc * n):
                return -1
            if max(b[1], r + dr * (n - 1)) - min(b[0], r) + 1 > MAX or max(b[3], c + dc * (n - 1)) - min(b[2], c) + 1 > MAX:
                return -1
            cross = 0
            for i in range(n):
                rr, cc = r + dr * i, c + dc * i
                x = get(rr, cc)
                if x:
                    if x['ch'] != it['L'][i] or d in x['dirs']:
                        return -1
                    cross += 1
                elif (get(rr - 1, cc) or get(rr + 1, cc)) if d == 'a' else (get(rr, cc - 1) or get(rr, cc + 1)):
                    return -1
            return cross

        def put(it, r, c, d):
            dr, dc = (0, 1) if d == 'a' else (1, 0)
            for i, ch in enumerate(it['L']):
                k = (r + dr * i, c + dc * i)
                x = cells.setdefault(k, {'ch': ch, 'dirs': set()})
                x['dirs'].add(d)
            n = len(it['L'])
            b[0] = min(b[0], r); b[1] = max(b[1], r + dr * (n - 1)); b[2] = min(b[2], c); b[3] = max(b[3], c + dc * (n - 1))
            placed.append((it, r, c, d))

        put(items[0], 0, 0, rnd.choice('ad'))
        for it in items[1:]:
            if len(placed) >= target:
                break
            cand = []
            for (r, c), x in list(cells.items()):
                for i, ch in enumerate(it['L']):
                    if ch != x['ch']:
                        continue
                    for d in 'ad':
                        if d in x['dirs']:
                            continue
                        sr, sc = (r, c - i) if d == 'a' else (r - i, c)
                        s = fits(it, sr, sc, d)
                        if s > 0:
                            cand.append((s + rnd.random(), sr, sc, d))
            if cand:
                cand.sort(reverse=True)
                _, r, c, d = cand[0]
                put(it, r, c, d)
        H, W = b[1] - b[0] + 1, b[3] - b[2] + 1
        score = len(placed) * 1000 - H * W
        if not best or score > best[0]:
            best = (score, [(it, r - b[0], c - b[2], d) for it, r, c, d in placed], H, W)
        if len(placed) >= target and attempt > 10:
            break
    return best[1], best[2], best[3]

def main():
    # الصور المتوفرة فـ docs/bureau/game/img (السؤال اللي صورتو ناقصة كيبقى نصي)
    imgdir = os.path.join(ROOT, 'game', 'img')
    imgs = {f[:-5] for f in os.listdir(imgdir) if f.endswith('.webp')}
    credits = json.load(open(os.path.join(imgdir, 'credits.json'), encoding='utf-8'))
    data = {}
    for lang in ['ar', 'fr', 'en']:
        bank = load(lang)
        rnd = random.Random('w777-' + lang)
        seen = set()
        groups, spare = [], []
        for g in ORDER:
            items = []
            for a, q, *rest in bank.get(g, []):
                L = list(norm(a, lang))
                key = ''.join(L)
                if key in seen or len(L) < 2 or len(L) > MAX:
                    continue
                seen.add(key)
                img = rest[0] if rest else None
                if imgs is not None and img not in imgs:
                    img = None
                items.append({'a': a, 'q': q, 'img': img, 'L': L, 'g': g})
            stages = []
            left = items[:]
            while len(left) >= MIN_STAGE:
                # المراحل الأولى فكل مجموعة فيها أسئلة مصورة أكثر
                placed, H, W = build_stage(left, rnd)
                if len(placed) < MIN_STAGE:
                    break
                ids = {id(p[0]) for p in placed}
                left = [x for x in left if id(x) not in ids]
                stages.append({'H': H, 'W': W, 'w': [[p[0]['a'], p[0]['q'], p[0]['img'] or '', p[1], p[2], p[3], ''.join(p[0]['L'])] for p in placed], 'its': [p[0] for p in placed]})
            groups.append({'g': g, 's': stages, 'drop': []})
            spare.extend(left)
        # الأسئلة اللي ما دخلاتش فمجموعتها كتجمع فمجموعة «منوعات» فالأخير
        mix, left = [], spare
        for _ in range(30):
            if len(left) < MIN_STAGE:
                break
            placed, H, W = build_stage(left, rnd)
            if len(placed) < MIN_STAGE:
                rnd.shuffle(left)
                continue
            ids = {id(p[0]) for p in placed}
            left = [x for x in left if id(x) not in ids]
            mix.append({'H': H, 'W': W, 'w': [[p[0]['a'], p[0]['q'], p[0]['img'] or '', p[1], p[2], p[3], ''.join(p[0]['L'])] for p in placed], 'its': [p[0] for p in placed]})
        # الأسئلة اللي بقات: كنزيدوها لشي مرحلة (المجموعة ديالها أولا، من بعد «منوعات») باش ما يضيع حتى سؤال
        for x in left[:]:
            cands = [st for gr in groups if gr['g'] == x['g'] for st in gr['s']] + mix
            for st in cands:
                its = st['its']
                if len(its) >= 12:
                    continue
                for _ in range(3):
                    placed, H, W = build_stage(its + [x], rnd, len(its) + 1)
                    if len(placed) == len(its) + 1:
                        break
                if len(placed) == len(its) + 1:
                    st.update({'H': H, 'W': W, 'w': [[p[0]['a'], p[0]['q'], p[0]['img'] or '', p[1], p[2], p[3], ''.join(p[0]['L'])] for p in placed], 'its': [p[0] for p in placed]})
                    left.remove(x)
                    break
        if mix:
            groups.append({'g': 'mix', 's': mix, 'drop': [x['a'] for x in left]})
        data[lang] = groups
        n = sum(len(st['w']) for gr in groups for st in gr['s'])
        print(lang, 'stages', sum(len(gr['s']) for gr in groups), 'questions', n, 'dropped', sum(len(gr['drop']) for gr in groups))
        for gr in groups:
            if gr['drop']:
                print('  ', gr['g'], 'dropped:', ' '.join(gr['drop']))
    for gr in data.values():
        print('pictures', sum(1 for g in gr for st in g['s'] for w in st['w'] if w[2]))
        for g in gr:
            g.pop('drop')
            for st in g['s']:
                st.pop('its', None)
    with open(os.path.join(ROOT, 'wasla-levels.js'), 'w', encoding='utf-8') as f:
        f.write('/* مولّد أوتوماتيكيا بـ tools/wasla_build.py — ما تبدلوش باليد. [جواب، سؤال، صورة، صف، عمود، اتجاه، حروف] */\n')
        data['credits'] = {k: v for k, v in credits.items() if k in imgs}
        f.write('window.W777_WL=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')

if __name__ == '__main__':
    main()
