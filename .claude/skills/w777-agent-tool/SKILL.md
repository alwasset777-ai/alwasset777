---
name: w777-agent-tool
description: Add or change a tool or behaviour of «منير», the AI agent of the Al Wasset app — tool schema in the Edge Function (supabase/functions/w777-agent/index.ts), browser execution in agRunTool (docs/bureau/app.js), confirmation for data changes, free local fallback, face/voice animation rules, tests and deployment of both the function and the app. Use for «زيد لمنير…», «منير ما خدمش…», «خلي منير يسجل/ينبّه/يحسب…», or any change to his face, mouth or voice.
---

# w777-agent-tool — أداة جديدة لمنير بنفس الطريقة ديما

## 1) كيفاش خدام منير
- **الذكاء**: Edge Function `supabase/functions/w777-agent/index.ts` (Gemini فابور أولاً؛ Claude غير بمفتاح المدير). لائحة الأدوات `TOOLS` (~السطر 120+) بـ`{ name, description, input_schema: S({...}, [required]) }`، والتعليمات فـ`MANAGER_SYSTEM`/system prompt (القواعد: «دير ما تسولش»، الأدوات اللي كتبدل البيانات كتطلب التأكيد).
- **التنفيذ فالمتصفح**: `agRunTool(name, a)` فـ`docs/bureau/app.js` (`switch (name) { case 'create_property': … }`) — كيرجع JSON صغير للذكاء.
- **بلا ذكاء / بلا إنترنت**: المساعد المحلي (الوضع المجاني) خاصو يبقى خدام — كل أداة جديدة: شنو كيدير منير بلا ذكاء (حل الاستمارة ولا جواب جاهز).
- **الوجه**: `agAnimate`/`agFaceVars` + CSS `.ag-face/.ag-jaw/.ag-mouth/.ag-lens/.ag-halo/.ag-spark` فآخر `styles.css`.

## 2) قواعد ما كتتبدلش
- **التأكيد قبل أي تبديل فالبيانات** (إضافة، تعديل، مسح، إرسال): نافذة تأكيد فالتطبيق، والنتيجة «cancelled» إلا رفض.
- **الخصوصية**: هاتف/اسم المالك خاص؛ ما يتصيفطش للذكاء أكثر من اللازم؛ ما كاين حتى مفتاح فالكود (`w777_set_secret` فالسحابة).
- **المشترك vs المدير**: الأدوات ديال المدير (`S.role === 'admin'`) ما كتبانش للمشترك؛ RLS فالقاعدة هي الحماية الحقيقية.
- **الفم**: الفك ≤ ~3% (`open × mw × 0.1`)، **بلا ظل غامق فوق السنان** (v249)، الحركة بنابض ناعم (`vel += (t−o)·0.26 − vel·0.56`)، وإعداد «حركة الفم» (`AG_MOUTH`). الحركات غير `transform/opacity/filter` على عناصر بـ`pointer-events: none`، ومطفية مع `prefers-reduced-motion`.
- **الصوت**: ما تستعملش `serviceWorker.ready`؛ كل انتظار بمهلة (`within`).

## 3) الخطوات
1. **الوصف**: اسم الأداة (إنجليزي snake_case)، شنو كتاخد، شنو كترجع، واش كتبدل البيانات (← تأكيد).
2. **Edge Function**: زيد التعريف فـ`TOOLS` + سطر فالتعليمات إلا لازم. تحقق: `npx -y esbuild supabase/functions/w777-agent/index.ts --format=esm >/dev/null` (ولا transpile TypeScript).
3. **app.js**: `case 'tool_name':` فـ`agRunTool` + الحالة المحلية بلا ذكاء + بطاقة النتيجة فالمحادثة إلا مفيدة.
4. **الاختبار**: `tools/tests/vNNN.cjs` بالخادم المزيف `tools/tuto/fake.cjs` (كيرد على `functions/v1/w777-agent` بـSSE كيطلب الأداة) ← تحقق من التأكيد، النتيجة، والإلغاء. ودوّز `voice.cjs`، `mounir.cjs`، `agcalc.cjs`، `agpics207.cjs`، `v247.cjs`، `v248.cjs`، `v250.cjs`، `crawl.cjs`.
5. **النشر**:
   - التطبيق: `sw.js` + `APP_BUILD` + `WHATS_NEW` + `CLAUDE.md` ← PR ← squash ← `tools/deploy-pages.sh`.
   - الـFunction (إلا تبدلات): Composio `SUPABASE_DEPLOY_FUNCTION` بالنص ديال الملف من الـcommit، ومن بعد `SUPABASE_UPDATE_A_FUNCTION` بـ`verify_jwt: false`. الفحص: `POST {}` ← `401 {"error":"auth"}` و`POST {"ping":true}` ← `{"ok":true}`.
6. **التقرير** بالدارجة: شنو ولا منير كيدير، كيفاش يجربها المدير (جملة يقولها لمنير)، شنو تجرب وشنو لا.
