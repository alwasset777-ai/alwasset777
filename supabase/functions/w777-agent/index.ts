// الوكيل الذكي ديال الوسيط 777 — Supabase Edge Function
// كيحفظ مفتاح Claude فالسيرفر، كيتحقق من الحساب والحصة اليومية، وكيعطي الأدوات.
// الأدوات كتنفذ فالتطبيق (على بيانات كل وكالة ديالها) — هنا غير التعريف ديالها.
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const DAILY_LIMIT = Number(Deno.env.get("W777_AGENT_DAILY_LIMIT") ?? "150");
const MODEL = "claude-opus-5-5";

const LANGS: Record<string, string> = {
  darija: "Moroccan Darija written in Arabic script (الدارجة المغربية), friendly and simple",
  ar: "Modern Standard Arabic",
  fr: "French",
  en: "English",
  es: "Spanish",
  it: "Italian",
};

const SYSTEM = `You are the AI assistant inside "Al Wasset 777" (الوسيط 777), a real-estate office app used by a real-estate agency in Meknès, Morocco and its network of partner agencies.
You help the logged-in agency manage its own data: properties (عقارات), client requests (طلبات), appointments (مواعيد), matching between requests and properties, market price comparison, and navigation inside the app.

How to work:
- Use the tools to read real data before answering; never invent properties, prices, clients or phone numbers.
- Tools that change data (create_request, create_appointment, update_property_status) show a confirmation dialog to the user in the app. Call them directly when the user asks; if the result says "cancelled", tell the user nothing was changed.
- Prices are in Moroccan dirhams (DH). People often speak in "مليون سنتيم": 1 مليون سنتيم = 10 000 DH.
- Property refs look like W777-0012; request refs look like DM-0012. Dates are YYYY-MM-DD, times HH:MM.
- Owner names and phone numbers are private to the agency that owns the property: never reveal them for network properties of other agencies.
- Keep answers short and practical: lists with ref, type, district, price. Offer the next useful action (open the page, match, book a visit).
- When the user wants to see something, use open_page so the app shows it.
- If something is outside what the tools can do, say so plainly and suggest where in the app to do it.`;

const S = (props: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties: props, required });
const str = (d: string) => ({ type: "string", description: d });
const num = (d: string) => ({ type: "number", description: d });

const TOOLS = [
  { name: "search_properties", description: "Search the agency's own properties. All filters optional. Returns up to `limit` matches (default 10) with ref, title, type, transaction, city, district, price, area, bedrooms, status.",
    input_schema: S({ query: str("free text: district, type, ref, keywords"), transaction: str("sale | rent | rent_furnished | seasonal | ..."), category: str("apartment | house | land | commercial | building | tourism | industrial | agri"), city: str("city name in Arabic, e.g. مكناس"), price_min: num("DH"), price_max: num("DH"), bedrooms_min: num("minimum bedrooms"), status: str("available (default) | all | sold | rented | reserved"), limit: num("max results, default 10") }) },
  { name: "get_property", description: "Full details of one of the agency's properties by ref (owner contact included — the agency's own data).", input_schema: S({ ref: str("e.g. W777-0012") }, ["ref"]) },
  { name: "search_requests", description: "Search the agency's client requests (buyers/tenants). Returns ref, client name, phone, transaction, type, city, budget, status, follow-up date.", input_schema: S({ query: str("name, phone, district, keywords"), status: str("open (default) | all | done | cancelled"), limit: num("default 10") }) },
  { name: "get_request", description: "Full details of one client request by ref.", input_schema: S({ ref: str("e.g. DM-0012") }, ["ref"]) },
  { name: "matches_for_request", description: "Best matching properties for a client request, with match score (%).", input_schema: S({ ref: str("request ref") }, ["ref"]) },
  { name: "matches_for_property", description: "Client requests that match a property, with match score (%).", input_schema: S({ ref: str("property ref") }, ["ref"]) },
  { name: "create_request", description: "Create a new client request (asks the user to confirm in the app).",
    input_schema: S({ client_name: str("client full name"), phone: str("phone"), transaction: str("sale (client wants to buy) | rent | rent_furnished | seasonal"), property_type: str("apartment | villa | house | land_urban | shop | office | studio | riad | ..."), city: str("city in Arabic"), districts: str("wanted districts, comma separated"), budget_max: num("max budget in DH"), bedrooms_min: num("min bedrooms"), notes: str("extra notes") }, ["client_name", "transaction"]) },
  { name: "list_appointments", description: "List appointments between two dates (default: today and the next 7 days).", input_schema: S({ date_from: str("YYYY-MM-DD"), date_to: str("YYYY-MM-DD") }) },
  { name: "create_appointment", description: "Create an appointment with a reminder (asks the user to confirm in the app).",
    input_schema: S({ client_name: str("client name"), phone: str("phone"), date: str("YYYY-MM-DD"), time: str("HH:MM"), type: str("visit | meeting | call | signing | other"), place: str("place"), property_ref: str("optional property ref"), request_ref: str("optional request ref"), remind_minutes: num("reminder before, in minutes (default 30)"), notes: str("notes") }, ["client_name", "date", "time"]) },
  { name: "update_property_status", description: "Change a property's status (asks the user to confirm in the app).", input_schema: S({ ref: str("property ref"), status: str("available | reserved | negotiation | sold | rented | withdrawn") }, ["ref", "status"]) },
  { name: "market_price", description: "Compare a price with the Moroccan market (DH per m², by city/district, Yakeey/Agenz + ANCFCC). Give price and area to get the % above/below market.", input_schema: S({ city: str("city in Arabic"), district: str("district"), property_type: str("apartment | villa | house | ..."), area: num("m²"), price: num("DH") }, ["city", "property_type"]) },
  { name: "office_stats", description: "Dashboard numbers: available properties, open requests, strong matches, today's appointments and follow-ups.", input_schema: S({}) },
  { name: "network_search", description: "Search properties shared by the other partner agencies of the network (no owner data). Only works for network members.", input_schema: S({ query: str("keywords"), city: str("city"), transaction: str("sale | rent | ..."), limit: num("default 10") }) },
  { name: "open_page", description: "Open a page of the app for the user.", input_schema: S({ page: str("home | properties | property | requests | request | appointments | matching | agencies | contracts | learn | ownership | estimate | settings | new_property | new_request"), ref: str("ref when page is property or request") }, ["page"]) },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    const { data: sec } = await service.from("w777_secrets").select("value").eq("name", "anthropic_api_key").maybeSingle();
    apiKey = sec?.value;
  }
  if (!apiKey) return json({ error: "no_key" }, 503);

  const auth = req.headers.get("Authorization") ?? "";
  const userDb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userDb.auth.getUser();
  if (!user) return json({ error: "auth" }, 401);
  const { data: allowed } = await userDb.rpc("w777_can_use");
  if (!allowed) return json({ error: "forbidden" }, 403);

  const { data: used } = await service.rpc("w777_agent_hit", { u: user.id, lim: DAILY_LIMIT });
  if (used === -1) return json({ error: "quota", limit: DAILY_LIMIT }, 429);

  let body: { messages?: unknown[]; lang?: string; ctx?: Record<string, unknown> };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-80) : [];
  if (!messages.length) return json({ error: "empty" }, 400);
  const lang = LANGS[body.lang ?? "darija"] ?? LANGS.darija;
  const ctx = body.ctx ?? {};
  const turnInfo = `Reply in ${lang}. Today is ${String(ctx.today ?? "")}. Agency: ${String(ctx.agency ?? "")}. Role: ${String(ctx.role ?? "")}. Current page: ${String(ctx.page ?? "")}.`;

  const client = new Anthropic({ apiKey });
  try {
    const resp = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // @ts-expect-error — الصيغة "default" جديدة فالـ API
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: turnInfo },
      ],
      tools: TOOLS,
      tool_choice: { type: "auto" },
      // deno-lint-ignore no-explicit-any
      messages: messages as any,
    });
    return json({ content: resp.content, stop_reason: resp.stop_reason, usage: resp.usage, used });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: "api", status: e.status, message: e.message }, 502);
    return json({ error: "server", message: String(e) }, 500);
  }
});
