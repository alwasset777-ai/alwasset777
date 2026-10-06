// الأخبار العقارية ديال الوسيط 777 — Supabase Edge Function
// كتجمع آخر الأخبار (المغرب + العالم) من Google News RSS وكتحطها فـ w777_news.
// كيتنادى عليها: pg_cron كل نهار (x-cron-key) ولا أي مشترك مفعل من التطبيق («تحديث دابا»).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const gn = (q: string, hl: string, gl: string, ceid: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
const FEEDS = [
  { scope: "ma", lang: "fr", url: gn("immobilier Maroc when:7d", "fr", "MA", "MA:fr") },
  { scope: "ma", lang: "fr", url: gn("logement OR foncier Maroc when:7d", "fr", "MA", "MA:fr") },
  { scope: "ma", lang: "ar", url: gn("العقار المغرب when:7d", "ar", "MA", "MA:ar") },
  { scope: "ma", lang: "ar", url: gn("السكن المغرب when:7d", "ar", "MA", "MA:ar") },
  { scope: "ma", lang: "fr", url: gn("promotion immobilière OR prix immobilier Maroc when:14d", "fr", "MA", "MA:fr") },
  { scope: "ma", lang: "fr", url: gn("Al Omrane OR \"aide au logement\" OR MRE immobilier when:14d", "fr", "MA", "MA:fr") },
  { scope: "ma", lang: "ar", url: gn("عقارات المغرب OR الكراء المغرب OR المنعشين العقاريين when:14d", "ar", "MA", "MA:ar") },
  { scope: "world", lang: "en", url: gn("global real estate investment when:3d", "en-GB", "GB", "GB:en") },
  { scope: "world", lang: "en", url: gn("Dubai OR Saudi OR Europe property market when:3d", "en-GB", "GB", "GB:en") },
  { scope: "world", lang: "en", url: gn("real estate market when:2d", "en-US", "US", "US:en") },
  { scope: "world", lang: "en", url: gn("housing market global prices when:3d", "en-GB", "GB", "GB:en") },
  { scope: "world", lang: "fr", url: gn("marché immobilier international when:3d", "fr", "FR", "FR:fr") },
];
// أخبار «المغرب» خاصها تكون فعلا على المغرب (الخلاصة العربية كتجيب أخبار دول أخرى)
const MA = /المغرب|مغربي|المغاربة|الرباط|البيضاء|مراكش|طنجة|فاس|مكناس|أكادير|وجدة|تطوان|القنيطرة|العمران|maroc|marocain|casablanca|rabat|marrakech|tanger|f[eè]s|mekn[eè]s|agadir|oujda|t[eé]touan|kenitra|al omrane|morocco|moroccan|hespress|le360|m[eé]dias ?24|le matin|l'[eé]conomiste|leseco|h24|yabiladi|telquel|la vie [eé]co|challenge|barlamane|alyaoum24|hibapress|snrt|2m\.ma|febrayer|goud|lesiteinfo|bank al-maghrib/i;
const RE = /real estate|property|properties|housing|home prices|homebuyer|mortgage|rent|immobili|logement|foncier|loyer|promoteur|cr[eé]dit|construction|habitat|عقار|سكن|الشقق|شقق|البناء|العمران|كراء|قروض|المنعش|التعمير/i;

const unx = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const tag = (x: string, t: string) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? unx(m[1]) : ""; };

const errs: string[] = [];
async function readFeed(f: typeof FEEDS[number]) {
  const res = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; W777NewsBot/1.0)", "Accept": "application/rss+xml, application/xml" } });
  if (!res.ok) { errs.push(String(res.status)); return []; }
  const xml = await res.text();
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    const source = tag(it, "source");
    let title = tag(it, "title");
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3)).trim();
    const url = tag(it, "link");
    const d = new Date(tag(it, "pubDate"));
    if (!title || !url) continue;
    if (f.scope === "ma" && !MA.test(title + " " + source)) continue;
    if (!RE.test(title)) continue;
    out.push({ title, url, source: source || null, scope: f.scope, lang: f.lang, published: isNaN(+d) ? null : d.toISOString().slice(0, 10) });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
  const url = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // الصلاحية: مفتاح الجدولة، ولا مشترك مفعل
  const cron = req.headers.get("x-cron-key");
  let byCron = false;
  if (cron) {
    const { data } = await db.from("w777_secrets").select("value").eq("name", "news_cron_key").maybeSingle();
    byCron = !!data && data.value === cron;
    if (!byCron) return json({ error: "forbidden" }, 403);
  } else {
    const auth = req.headers.get("Authorization") || "";
    const user = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: ok } = await user.rpc("w777_can_use");
    if (ok !== true) return json({ error: "forbidden" }, 403);
    // ما نعاودوش الجمع بزاف: مرة كل 30 دقيقة
    const { data: last } = await db.from("w777_news").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < 30 * 60 * 1000) return json({ skipped: true });
  }

  const lists = await Promise.all(FEEDS.map((f) => readFeed(f).catch((e) => { errs.push(String(e).slice(0, 80)); return []; })));
  const seen = new Set<string>(), rows = [];
  for (const it of lists.flat()) {
    const k = it.title.toLowerCase().replace(/\W+/g, " ").slice(0, 80);
    if (seen.has(k) || seen.has(it.url)) continue;
    seen.add(k); seen.add(it.url);
    rows.push(it);
  }
  const { data: had } = await db.from("w777_news").select("title").gte("created_at", new Date(Date.now() - 60 * 864e5).toISOString()).limit(5000);
  const old = new Set((had || []).map((r) => r.title));
  const fresh = rows.filter((r) => !old.has(r.title));
  let added = 0;
  for (let i = 0; i < fresh.length; i += 100) {
    const { data, error } = await db.from("w777_news").upsert(fresh.slice(i, i + 100), { onConflict: "url", ignoreDuplicates: true }).select("id");
    if (!error) added += (data || []).length;
  }
  // الأخبار القديمة (أكثر من 60 يوم) كتمسح
  await db.from("w777_news").delete().lt("created_at", new Date(Date.now() - 60 * 864e5).toISOString());
  return json({ added, fetched: rows.length, by: byCron ? "cron" : "user", errors: errs.splice(0) });
});
