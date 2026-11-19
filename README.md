# تطبيق مجموعة الوسيط — مكتب الوسيط 777 (مكناس)

- التطبيق (PWA): `docs/bureau/` — منشور على https://alwasset777-ai.github.io/alwasset777/bureau/
- قاعدة البيانات (Supabase): `docs/bureau/supabase.sql` — كل الجداول محروسة بـ RLS.
- الخوادم الصغيرة (Edge Functions): `supabase/functions/` — المفاتيح (Gemini/Claude) كتبقى فالخادم، عمرها ما كتوصل للمتصفح.
- التعليمات الكاملة والاختبارات: `CLAUDE.md`.

> 🛡️ الأمان: ما تحطش أبداً مفتاح سري (service_role، Gemini، Claude) فالكود ولا فملف `.env` داخل المستودع.
