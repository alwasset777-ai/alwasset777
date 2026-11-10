# CLAUDE.md – تطبيق مكتب الوسيط 777 (alwasset777)

## مع صاحب المشروع (السيد منير رادوي)
- جاوب **بالعربية فقط** (عربية بسيطة، والدارجة مقبولة)، **حتى لو كتب بالفرنسية ولا بأي لغة أخرى**، بكلام بسيط بلا مصطلحات تقنية.
- **كل شيء فابور**: ما تقترحش أبداً خدمة ولا اشتراك مخلص. إلا ما كاينش حل فابور، قول ذلك بوضوح واقترح بديل فابور.
- **فكّر معاه**: مع كل طلب عطي 2–3 أفكار جديدة مفيدة للتطبيق ولا للمكتب.
- **قبل أي خدمة** طبّق الـ skill `w777-brief`: حوّل الطلب لملخص مهني دقيق (الهدف، النطاق، الملفات، الفحص) ومن بعد بدا مباشرة. سول غير إلا كان اختيار مهم ما يقدرش يتخمن.
- فالأخير: قول شنو تدار، شنو تجرب، وشنو ما تجربش بصراحة، وذكّرو بالحوايج اللي باقية.

## عن التطبيق
- تطبيق المكتب (PWA، JavaScript بلا framework): `docs/bureau/` — منشور على GitHub Pages: https://alwasset777-ai.github.io/alwasset777/bureau/
  - `app.js` (كل الصفحات + الوكيل «منير»)، `sync.js` (Supabase)، `db.js` (IndexedDB)، `styles.css`، `sw.js` (رقم الـ cache `w777-bureau-vNNN` خاصو يتزاد مع كل نشر).
  - اللعبة «وصلة العقار»: `wasla.js` + `wasla-levels.js` (مولّد بـ `python3 tools/wasla_build.py` من `tools/wasla-data/`)، الصور فـ `docs/bureau/game/img/` (+ `credits.json`)، الصفحة العمومية `game.html`.
  - «الوسيط GAMES» (`#/game`): صفحة 7 شعارات + 6 ألعاب بالمراحل فـ `games.js` (شحال يسوى؟، كاشف النصب، الحاسبة السريعة، صح ولا غلط، مليونير العقار، بني دارك؛ النجوم فـ localStorage `w777_games`)، وصلة العقار ولات فـ `#/game/wasla`. الصفحة العمومية `games.html`. الشعار المشترك `icons/games/wordmark.webp`.
  - «أكاديمية الوسيط 777» (`#/learn`): 7 وحدات «من مندوب إلى صاحب وكالة» (42 درس + 98 سؤال اختبار) فـ `academy-data.js`، الواجهة `academy.js` (الدروس، الاختبار 10 أسئلة، النجاح 70% كيفتح الوحدة الموالية، الشهادة؛ التقدم فـ localStorage `w777_acad`). ملفات PDF `files/formation/M1..M7.pdf` كتتولد بـ `NODE_PATH=$(npm root -g) node tools/academy_pdf.cjs` (من `academy-print.html`) — عاود ولّدها ملي تبدل الدروس.
  - نصوص نماذج العقود: `files/contrats/texts.json` (مولّد بـ `python3 tools/contracts_text.py`).
- «التمويل العقاري» (`#/tamwil`): البيانات فـ `tools/finance/institutions.json` ← `python3 tools/finance/build_app_data.py` كيولد `docs/bureau/finance-data.js` (معلومات تعريفية فقط، بلا نسب حتى يأكدها المكتب). الشعارات فـ `docs/bureau/icons/fin/*.webp`. ملفات PDF (الدليل + طلبات الاتفاقيات) كتتولد بـ `python3 tools/finance/guide.py` و `letters.py` وما كتدخلش للتطبيق.
- الوكيل الذكي: Supabase Edge Function `supabase/functions/w777-agent/index.ts` (Gemini فابور أولاً؛ Claude غير إلا زاد المدير مفتاحو). الأدوات كتتنفذ فالمتصفح (`agRunTool` فـ `app.js`).
- قاعدة البيانات: `docs/bureau/supabase.sql` (كل تبديل كيتزاد هنا وكيتطبق live).

## أوامر
- فحص سريع: `node --check docs/bureau/app.js docs/bureau/wasla.js`
- اختبارات المتصفح (Playwright، chromium فـ `/opt/pw-browsers/chromium`):
  `cd docs && python3 -m http.server 8777 &` ثم `NODE_PATH=$(npm root -g) node tools/tests/crawl.cjs` (كل الصفحات والقوائم والصفحات العمومية)، `tools/tests/mascot.cjs` (اللعبة)، `tools/tests/custag.cjs` (وكيل المشترك فاللعبة)، `tools/tests/mounir.cjs` (منير فاللعبة)، `tools/tests/mfa.cjs` (التحقق بخطوتين بخادم مزيف)، `tools/tests/voice.cjs` (منير كيتكلم فـ 2 ثواني على الأكثر)، `tools/tests/agcalc.cjs` (أدوات الحساب ديال الوكيل)، `tools/tests/psel.cjs` (التحديد والمسح فوق صور العقارات)، `tools/tests/sel4.cjs` (التحديد والمسح فالطلبات والمواعيد والمطابقة)، `tools/tests/update.cjs` (زر «تحديث كامل للتطبيق»)، `tools/tests/games.cjs` (الوسيط GAMES: 7 شعارات + كل لعبة حتى النتيجة + games.html)، `tools/tests/academy.cjs` (الأكاديمية: القفل، الدرس، الرسوب/النجاح، الشهادة)، `tools/tests/pmenu.cjs` (زر «⋯» والضغطة الطويلة).
- النشر: PR → دمج (squash) فـ `main` → `tools/deploy-pages.sh "Deploy: …"` (ينشر `docs/bureau` لـ gh-pages).
- الـ Edge Function: كتنشر عبر Composio (`SUPABASE_DEPLOY_FUNCTION` بالنص ديال الملف من commit، ومن بعد `SUPABASE_UPDATE_A_FUNCTION` بـ `verify_jwt: false`)، والفحص: `POST {}` ← `401 {"error":"auth"}` و `POST {"ping":true}` ← `{"ok":true}`.

## قواعد السلامة
- ما تنشرش أبداً مفاتيح (service_role، Gemini، Claude) ولا كلمات السر فالكود ولا فالمحادثة.
- الاختبارات الحية غير بحسابات تجريبية مؤقتة كتتمسح من بعد، بلا ما تقيس معلومات المشتركين.
