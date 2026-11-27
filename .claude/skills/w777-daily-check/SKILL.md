---
name: w777-daily-check
description: Daily health check of the Al Wasset app (alwasset777) — app errors from the last 24h/7d, which app versions members run (who is stale), new sign-ups and invites, live site version, then a short Darija report with what to fix. Use when the owner asks «فحص التطبيق», «شنو وقع اليوم فالتطبيق», «واش كلشي مزيان», or when a scheduled morning check fires.
---

# w777-daily-check — فحص التطبيق اليومي

الهدف: تقرير قصير بالدارجة (8–12 سطر) كيقول للمدير واش التطبيق مزيان، شنو المشاكل، وشنو تصلّح — **بلا معلومات شخصية**.

## 1) القواعد (إلزامية)
- قاعدة البيانات **غير بالقراءة** (`read_only: true`) وغير **أرقام ومجاميع**: ما تطبعش أسماء، إيميلات، هواتف، uid ولا رسائل المشتركين. الاستثناء: لائحة «المتأخرين» كتبان غير للمدير فالتطبيق (`w777_app_stale`) — فالتقرير قول **شحال** ماشي شكون.
- ما تطبعش أبداً مفاتيح ولا كلمات السر. ما تبدّل والو فالقاعدة فهاد الفحص.
- المشروع: Supabase `dctbfhnglogauksdtjdi` عبر Composio `SUPABASE_BETA_RUN_SQL_QUERY`.

## 2) الأسئلة (SQL للقراءة فقط)
```sql
-- (أ) الأخطاء: آخر 24 ساعة و7 أيام، حسب النوع والبلاصة والنسخة (بلا رسائل كاملة)
select kind, coalesce(place,'—') place, coalesce(ver,'—') ver, count(*) n, max(at) last_at
from public.w777_app_errors where at > now() - interval '7 days' and kind <> 'update'
group by 1,2,3 order by n desc limit 15;
select count(*) filter (where at > now() - interval '24 hours') d1, count(*) d7 from public.w777_app_errors where at > now() - interval '7 days' and kind <> 'update';
-- (ب) النسخ عند المشتركين (آخر 60 يوم)
select app_ver, count(*) n from public.w777_agencies where app_seen > now() - interval '60 days' group by 1 order by 2 desc;
-- (ج) المتأخرين أكثر من 3 أيام (عدد فقط)
select count(*) from public.w777_agencies where app_ver ~ '^v[0-9]+$' and app_seen < now() - interval '3 days';
-- (د) التسجيلات الجديدة: 24 ساعة / 7 أيام، حسب الفئة
select kind, count(*) filter (where terms_at > now() - interval '24 hours') d1, count(*) filter (where terms_at > now() - interval '7 days') d7
from public.w777_agencies where terms_at is not null group by 1 order by d7 desc;
```
- إلا شي جدول/عمود ما كاينش: قولها فالتقرير وكمّل (ما تخترعش).
- رسالة خطأ متكررة بزاف: تقدر تقرا `msg` ديال **نوع واحد** (`limit 3`) باش تفهم السبب — `msg` ما فيهاش معلومات شخصية (كتتنقّى فـ`w777_log_error`)، ولكن ما تنقلهاش كاملة للتقرير: لخصها.

## 3) النسخة المنشورة
- `docs/bureau/sw.js` فالفرع `gh-pages`: `gh api "repos/alwasset777-ai/alwasset777/contents/bureau/sw.js?ref=gh-pages" --jq .content | base64 -d | grep -o "w777-bureau-v[0-9]*"`.
- قارنها مع `APP_BUILD` فـ`docs/bureau/app.js` (فـ`main`) ومع أكبر نسخة عند المشتركين.

## 4) التقرير (بالدارجة، بهاد الترتيب)
1. 🟢/🟡/🔴 الحالة العامة فجملة وحدة.
2. 🩺 الأخطاء: العدد (24س / 7 أيام) + أهم 3 (البلاصة + الجهاز + شحال) + السبب المرجّح.
3. 📲 النسخ: شحال فآخر نسخة من المجموع، وشحال متأخرين (+ «ذكّرهم من 🔑 الإدارة ← 🩺 صحة التطبيق»).
4. 👥 التسجيلات الجديدة حسب الفئة.
5. 🛠️ شنو نصلّح: 1–3 أعمال محددة (الملف/الدالة)، والأولوية.
- ما تصلّحش بوحدك من داخل الفحص: اقترح، والمدير كيقرر (إلا طلب «صلّح» ← طبّق `w777-brief`).
