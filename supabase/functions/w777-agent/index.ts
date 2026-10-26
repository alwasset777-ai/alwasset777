// الوكيل الذكي ديال الوسيط 777 — Supabase Edge Function
// كيحفظ المفتاح (Claude مدفوع ولا Gemini فابور) فالسيرفر، كيتحقق من الحساب والحصة اليومية، وكيعطي الأدوات.
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
  darija: `Moroccan Darija (الدارجة المغربية) written in Arabic script — fluent, natural and warm, exactly like a Moroccan real-estate agent from Meknès talks to a colleague.
Darija rules:
- Use everyday Darija, NOT Modern Standard Arabic: شنو، علاش، كيفاش، فين، شحال، واش، دابا، غدا، البارح، بزاف، شوية، مزيان، واخا، صافي، ماشي، ماكاينش، كاين، عندك، بغيتي، خاصك، نقدر، غادي، راه، ديال، هادا/هادي/هادو، ليا/ليك، معايا، والو، حتى حاجة.
- Verbs in Darija form: كنقلب، كيقلب، غادي نصيفط، قلبت ليك، لقيت ليك، عيط ليه، دوز عندو. Never use MSA forms like "سوف"، "لقد"، "هل"، "ماذا"، "الذي".
- Real-estate words Moroccans use: شقة، دار، فيلا، بقعة، محل/حانوت، كراء، بيع، الشومبرات/البيوت، الصالون، الكوزينة، الطابق، الأسانسور، الباركينغ، السانديك، الرسم العقاري (تيتري)، الملكية، العربون، الموثق، العدول، السمسرة/الكوميسيون.
- Money: say prices the Moroccan way too — "70 مليون" (سنتيم) next to the DH amount when useful (1 مليون = 10 000 DH); rents in درهم.
- Understand users who write Darija in Latin letters / Arabizi (3=ع، 7=ح، 9=ق، 8=ه، 2=ء; e.g. "bghit chi chqa f hamria ta7t 50 mlyon"), mixed with French words (appartement, terrain, rdv, location, vente) — but always answer in Arabic script.
- Short sentences, friendly tone (مرحبا، الله يعاونك، بالتوفيق)، no long formal paragraphs. Your text is read aloud by a Moroccan voice, so avoid tables, symbols and **bold** markers.
- Say times and dates the Moroccan way: "فالعشرة ديال الصباح"، "فالجوج ونص ديال العشية"، "غدا"، "نهار الخميس" (not "مع 10:00").
- Examples of the tone you must use:
  • "عندك اليوم جوج مواعيد: الأول فالعشرة ديال الصباح مع يوسف فمرجان، والثاني فالتلاتة ونص مع نادية فالمكتب. واش نحل ليك صفحة المواعيد؟"
  • "باش تزيد عقار: ورك على «إضافة» فالرئيسية، من بعد «إضافة عقار»، عمّر النوع والمدينة والثمن وزيد التصاور، وفالأخير «حفظ العقار». بغيتي نحلها ليك دابا؟"
  • "لقيت ليك تلاتة ديال الشقق فحمرية تحت 80 مليون. الأرخص فيهم 68 مليون، فيها جوج بيوت وصالون."`,
  ar: "Modern Standard Arabic (العربية الفصحى) — simple, clear and warm, like a friendly professional advisor; short natural sentences that sound good when read aloud",
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
- The app also has the Wasset 777 network sections: directories of brokers, contractors (مقاولات) and finishing companies (تشطيب), projects seeking funding, real-estate events, daily real-estate news (Morocco + world), الهبة (housing donations that go through the Wasset 777 office), النزاعات (real-estate disputes), investors (المستثمرون: budgets for financing, partnership, buying or long-term renting), notaries (الموثقون: suggested by proximity to a property; members send them consultations or contract-notarization requests), housing associations (الجمعيات السكنية: 777 cooperatives/وداديات looking for land, contractors, notaries and financing for their members' housing projects), furnished/holiday bookings (stays) and the app rules page (terms: report every deal to the office, the office may contact the owner if the assigned member is absent while keeping that member's commission, 199 DH per year after 3 free months, no office liability for contracts made without it). Open them with open_page.
- For legal questions give general guidance under Moroccan law (e.g. law 67.12 residential/professional rent, 49.16 commercial lease, 18.00/106.12 co-ownership, 39.08 real rights code, 44.00/107.12 off-plan sales, Dahir of 12 August 1913 / 14.07 land registration), say it is general guidance and not formal legal advice, and for complex cases suggest escalating from the disputes page to a specialist (lawyer, notary, adoul, accountant, legal or real-estate advisor) via the Wasset 777 office.
- If something is outside what the tools can do, say so plainly and suggest where in the app to do it.

Speaking style (your answers are also read aloud by a voice and shown next to a talking avatar):
- Answer FAST and SHORT: first sentence = the direct answer. Usually 1–4 short sentences; use a short list only when listing items (max 5 items, then offer to show more / open the page).
- Natural spoken tone, no markdown tables, no headings, no code, no long URLs, minimal emojis. Write numbers the way people say them.
- If the live snapshot already contains the answer (counts, today's appointments, follow-ups), answer directly without calling tools.

Knowing the app (answer any "how do I / where is / what is" question about the app):
- Use the "Relevant lessons" given in the context when present; otherwise call app_help with keywords. Explain in 2–4 numbered steps with the exact button names, then offer to open the page with open_page.
- App map: bottom bar = الرئيسية (home dashboard), العقارات (properties), الطلبات (client requests), المواعيد (appointments), التملك (buying steps + fees calculator), العقود (36 contract templates AR/FR), التكوين (agent academy, 6 modules), الإعدادات (settings).
- Top bar: logo (home), 🌐 language of the whole app, golden «إصنع إعلانا» (ad studio: property photos + info → professional posts per social network, 25 templates), 🔍 global search with filters, 💬 messages between members; under it a moving ticker of member cities.
- Home: «بحث» and «إصنع إعلانا», three big buttons: «إضافة» (add property / request / appointment), «خدمات المجموعة» (matching, appointments, price comparison, loan calculator, map, rentals, finance, ad maker, projects, events, bookings, news, الهبة, disputes), «شبكة الوسيط 777» (7 groups: agencies 700 in Morocco + 77 abroad, brokers, housing associations, investors, contractors, finishing companies, notaries). Then counters (available properties, open requests, strong matches, value of stock in million centimes) and 4 boxes: best opportunities (request ↔ property), today's appointments, today's follow-ups, distribution of available properties. Red floating «+» button = quick add from any page; round avatar button = you (the assistant).
- Property page: share to WhatsApp with watermark, «عرض للزبون» full-screen presentation, «ملصق إعلاني» poster with QR (4:5, square, story), «إصنع إعلانا», publish to public catalog, loan calculator, print/PDF sheet, edit, visits (+ visit slip signed by the client to protect the commission), mandate (exclusive/simple, renewal alert 15 days before end), market price comparison, matching requests, nearby notaries.
- Requests: client file (phone, WhatsApp, status: new, searching, visit planned, offer/negotiation, done), matching properties by %; 🔥 = urgent client. Matching page: thresholds 50–90%.
- Rentals: leases, monthly payments (paid / due / late), receipts, WhatsApp reminder to tenant; management fee goes to finance automatically. Finance: income, expenses, net profit, 12-month chart, unrecorded commissions; monthly report PDF.
- Settings: office info + watermark, cloud sync login (member code + password from the Wasset 777 office), appearance (light/dark), animations (light mode for old devices), app lock + fingerprint/Face ID, staff accounts (view / edit / full), push notifications, public catalog link, backup / import / Excel export, import properties from photo folders.
- Network: «حسابي» = member card (name, phone/WhatsApp, city, country, services, bio, logo); network properties are shared automatically without owner data; commission split 50/50 between the property's agency and the client's agency. Subscription: 3 free months then 199 DH per year. Office contact: 0777777959.`;

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
  { name: "app_help", description: "Search the app's user guide (how to use any feature, where a button is, what a page does). Returns the most relevant lessons with steps.", input_schema: S({ query: str("keywords of the question, e.g. 'add property photos', 'watermark', 'staff account'") }, ["query"]) },
  { name: "finance_summary", description: "The office finances for a month: income, expenses, net profit, year profit, rentals collected.", input_schema: S({ month: str("YYYY-MM, default current month") }) },
  { name: "rentals_summary", description: "Rental management: active leases, late tenants with months due, collected this month.", input_schema: S({}) },
  { name: "open_page", description: "Open a page of the app for the user.", input_schema: S({ page: str("home | properties | property | requests | request | appointments | matching | agencies | brokers | contractors | finishing | investors | notaries | associations | projects | events | news | stays | search | guide | terms | donations | disputes | contracts | learn | ownership | estimate | settings | new_property | new_request | new_appointment | rentals | finance | report | loan | map | ad_maker | messages"), ref: str("ref when page is property or request") }, ["page"]) },
];

// ---------- Gemini (Google AI Studio — فيه مستوى فابور) ----------
// التطبيق كيبقى يخدم بصيغة Claude (text / tool_use / tool_result)؛ هنا كنترجمو للصيغة ديال Gemini ورجوع.
// Google كيبدل النماذج وكيضغطو أحياناً (503 high demand): كنجربو لائحة بالترتيب، الأسرع هو الأول،
// والتفكير فالحد الأدنى باش الجواب يجي فثانية ولا جوج.
type GM = { m: string; th?: Record<string, unknown> | null };
const GEMINI_MODELS: GM[] = [
  ...(Deno.env.get("W777_GEMINI_MODEL") ? [{ m: Deno.env.get("W777_GEMINI_MODEL")!, th: null }] : []),
  { m: "gemini-3.5-flash", th: { thinkingLevel: "minimal" } },
  { m: "gemini-3.1-flash-lite", th: { thinkingLevel: "minimal" } },
  { m: "gemini-3.7-flash", th: { thinkingLevel: "low" } },
  { m: "gemini-3.8-flash", th: { thinkingLevel: "low" } },
  { m: "gemini-3.5-flash-lite", th: { thinkingLevel: "minimal" } },
  { m: "gemini-flash-latest", th: null },
  { m: "gemini-flash-lite-latest", th: null },
];
const TTS_MODELS = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview"];
const TTS_VOICE = Deno.env.get("W777_TTS_VOICE") || "Charon"; // صوت رجل، هادئ وواضح
const GBASE = "https://generativelanguage.googleapis.com/v1beta/models/";
// deno-lint-ignore no-explicit-any
type Blk = any;
const G_TOOLS = [{
  functionDeclarations: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    ...(Object.keys(t.input_schema.properties).length ? { parameters: t.input_schema } : {}),
  })),
}];
// sig = thoughtSignature؛ كتصلح غير مع نفس النموذج اللي عطاها. إلا تبدل النموذج كنحيدوها
// (وللأدوات كنستعملو القيمة الرسمية اللي كتخطى التحقق).
function toGemini(messages: Blk[], model: string) {
  const names = new Map<string, string>();
  const contents: Blk[] = [];
  for (const m of messages) {
    const blocks: Blk[] = typeof m.content === "string" ? [{ type: "text", text: m.content }] : (m.content ?? []);
    const parts: Blk[] = [];
    for (const b of blocks) {
      const same = b.sig && b.mdl === model;
      if (b.type === "text" && b.text) parts.push({ text: b.text, ...(same ? { thoughtSignature: b.sig } : {}) });
      else if (b.type === "tool_use") {
        names.set(b.id, b.name);
        parts.push({ functionCall: { name: b.name, args: b.input ?? {} }, thoughtSignature: same ? b.sig : "skip_thought_signature_validator" });
      } else if (b.type === "tool_result") {
        let r: unknown = b.content;
        try { r = JSON.parse(String(b.content)); } catch { /* نص مقطوع */ }
        const response = r && typeof r === "object" && !Array.isArray(r) ? r : { result: r };
        parts.push({ functionResponse: { name: names.get(b.tool_use_id) ?? "tool", response } });
      }
    }
    if (parts.length) contents.push({ role: m.role === "assistant" ? "model" : "user", parts });
  }
  return contents;
}
// كيرجع أول جواب صالح من لائحة النماذج (مع إعادة المحاولة بلا إعدادات التفكير إلا ما قبلهاش النموذج)
async function geminiOpen(key: string, system: string, messages: Blk[], stream: boolean) {
  let last = { status: 0, message: "" };
  for (const [gi, g] of GEMINI_MODELS.entries()) {
    for (const th of g.th ? [g.th, null] : [null]) {
      const payload = JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: toGemini(messages, g.m),
        tools: G_TOOLS,
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
        generationConfig: { maxOutputTokens: 4096, temperature: 0.6, ...(th ? { thinkingConfig: th } : {}) },
      });
      const ac = new AbortController();
      // Google أحياناً كيتعطل بزاف فالمستوى المجاني: إلا ما بدا الجواب فـ 10 ثواني كنمشيو للنموذج اللي من بعد
      const timer = setTimeout(() => ac.abort(), gi < GEMINI_MODELS.length - 1 ? 10000 : 25000);
      let res: Response;
      try {
        res = await fetch(`${GBASE}${g.m}:${stream ? "streamGenerateContent?alt=sse" : "generateContent"}`, {
          method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: payload, signal: ac.signal,
        });
      } catch (e) { clearTimeout(timer); last = { status: 504, message: String(e) }; break; }
      clearTimeout(timer);
      if (res.ok) return { res, model: g.m };
      const data = await res.json().catch(() => ({}));
      last = { status: res.status, message: String(data?.error?.message ?? `gemini ${res.status}`) };
      // إعدادات التفكير ما مقبولاش: نعاودو نفس النموذج بلاها
      if (res.status === 400 && th && /think/i.test(last.message)) continue;
      // المفتاح غالط: ما كاين لاش نجربو نماذج أخرى
      if (res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(last.message))) throw Object.assign(new Error(last.message), { status: res.status });
      break; // 404 / 429 / 5xx / 400 آخر: النموذج اللي من بعد
    }
  }
  throw Object.assign(new Error(last.message), { status: last.status });
}
// كنحولو الأجزاء ديال Gemini لبلوكات Claude (النصوص المتتابعة كيتجمعو فبلوك واحد)
function pushParts(content: Blk[], parts: Blk[], model: string, onText?: (t: string) => void) {
  for (const p of parts) {
    if (p.thought) continue;
    if (p.functionCall) {
      content.push({ type: "tool_use", id: `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: p.functionCall.name, input: p.functionCall.args ?? {}, mdl: model, ...(p.thoughtSignature ? { sig: p.thoughtSignature } : {}) });
    } else if (typeof p.text === "string") {
      const lastB = content[content.length - 1];
      if (lastB && lastB.type === "text") { lastB.text += p.text; if (p.thoughtSignature) lastB.sig = p.thoughtSignature; }
      else content.push({ type: "text", text: p.text, mdl: model, ...(p.thoughtSignature ? { sig: p.thoughtSignature } : {}) });
      if (p.text && onText) onText(p.text);
    } else if (p.thoughtSignature && content.length) content[content.length - 1].sig = p.thoughtSignature;
  }
}
const finish = (content: Blk[]) => {
  const hasTool = content.some((b) => b.type === "tool_use");
  if (!content.length) content.push({ type: "text", text: "" });
  return { content, stop_reason: hasTool ? "tool_use" : content.some((b) => b.text) ? "end_turn" : "refusal" };
};
async function gemini(key: string, system: string, messages: Blk[]) {
  const { res, model } = await geminiOpen(key, system, messages, false);
  const data = await res.json().catch(() => ({}));
  const content: Blk[] = [];
  pushParts(content, data?.candidates?.[0]?.content?.parts ?? [], model);
  return { ...finish(content), usage: data?.usageMetadata, model };
}
// البث المباشر (SSE): النص كيوصل للتطبيق كلمة بكلمة، والنهاية فيها البلوكات كاملين
function geminiSSE(key: string, system: string, messages: Blk[], extra: Record<string, unknown>, cors: Record<string, string>) {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctl) {
      const send = (o: unknown) => ctl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
      try {
        const { res, model } = await geminiOpen(key, system, messages, true);
        const content: Blk[] = [];
        const rd = res.body!.pipeThrough(new TextDecoderStream()).getReader();
        let buf = "";
        for (;;) {
          const { value, done } = await rd.read();
          if (done) break;
          buf += value;
          let i;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            let j: Blk; try { j = JSON.parse(line.slice(5)); } catch { continue; }
            pushParts(content, j?.candidates?.[0]?.content?.parts ?? [], model, (t) => send({ t }));
          }
        }
        send({ done: true, ...finish(content), model, ...extra });
      } catch (e) {
        const st = (e as { status?: number }).status ?? 0;
        send({ error: st === 429 ? "busy" : st === 401 || st === 403 ? "api" : "server", status: st, message: String((e as Error).message).slice(0, 200) });
      }
      ctl.close();
    },
  });
  return new Response(body, { headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
// ---------- الصوت الطبيعي (Gemini TTS) ← ملف WAV ----------
function wav(pcm: Uint8Array, rate: number) {
  const h = new DataView(new ArrayBuffer(44));
  const w = (o: number, s: string) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); h.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt ");
  h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true); h.setUint32(24, rate, true);
  h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, "data"); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44);
  return out;
}
const TTS_STYLE: Record<string, string> = {
  darija: "Read the following in a natural Moroccan Darija accent, like a friendly real-estate agent from Meknes:\n",
  ar: "Read the following in clear, warm Modern Standard Arabic:\n",
};
async function tts(key: string, text: string, lang = "darija") {
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: (TTS_STYLE[lang] ?? "") + text }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } } },
  });
  let last = 0;
  for (const m of TTS_MODELS) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 20000);
    try {
      const res = await fetch(`${GBASE}${m}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: payload, signal: ac.signal });
      if (!res.ok) { last = res.status; continue; }
      const d = await res.json();
      const inl = (d?.candidates?.[0]?.content?.parts ?? []).find((p: Blk) => p.inlineData)?.inlineData;
      if (!inl?.data) { last = 502; continue; }
      const bytes = Uint8Array.from(atob(inl.data), (c) => c.charCodeAt(0));
      const mime = String(inl.mimeType || "");
      if (/wav/i.test(mime)) return bytes;
      return wav(bytes, Number((mime.match(/rate=(\d+)/) || [])[1]) || 24000);
    } catch { last = 504; } finally { clearTimeout(timer); }
  }
  throw Object.assign(new Error("tts"), { status: last });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: { messages?: unknown[]; lang?: string; ctx?: Record<string, unknown>; stream?: boolean; tts?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const auth = req.headers.get("Authorization") ?? "";
  const userDb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  // الطلبات المستقلة فنفس الوقت (أسرع)
  const [{ data: secs }, { data: { user } }, { data: allowed }] = await Promise.all([
    service.from("w777_secrets").select("name,value"),
    userDb.auth.getUser(),
    userDb.rpc("w777_can_use"),
  ]);
  if (!user) return json({ error: "auth" }, 401);
  if (!allowed) return json({ error: "forbidden" }, 403);
  // Claude إلا كان المفتاح ديالو، وإلا Gemini (فابور)
  const sec = (n: string) => (secs ?? []).find((r: { name: string }) => r.name === n)?.value as string | undefined;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || sec("anthropic_api_key");
  const geminiKey = Deno.env.get("GEMINI_API_KEY") || sec("gemini_api_key");

  // الصوت: ما كيتحسبش فالحصة ديال الرسائل
  if (typeof body.tts === "string") {
    if (!geminiKey) return json({ error: "no_key" }, 503);
    const text = body.tts.trim().slice(0, 1200);
    if (!text) return json({ error: "empty" }, 400);
    try {
      const audio = await tts(geminiKey, text, String(body.lang ?? "darija"));
      return new Response(audio, { headers: { ...CORS, "Content-Type": "audio/wav", "Cache-Control": "no-store" } });
    } catch (e) { return json({ error: "tts", status: (e as { status?: number }).status ?? 0 }, 502); }
  }

  if (!apiKey && !geminiKey) return json({ error: "no_key" }, 503);
  const { data: used } = await service.rpc("w777_agent_hit", { u: user.id, lim: DAILY_LIMIT });
  if (used === -1) return json({ error: "quota", limit: DAILY_LIMIT }, 429);

  const messages = Array.isArray(body.messages) ? body.messages.slice(-60) : [];
  if (!messages.length) return json({ error: "empty" }, 400);
  const lang = LANGS[body.lang ?? "darija"] ?? LANGS.darija;
  const ctx = body.ctx ?? {};
  const turnInfo = [
    `Reply in ${lang}. Today is ${String(ctx.today ?? "")}. Agency: ${String(ctx.agency ?? "")}. Role: ${String(ctx.role ?? "")}. Current page: ${String(ctx.page ?? "")}.`,
    ctx.snap ? `Live snapshot of the office right now (use it directly, no tool call needed for these numbers): ${JSON.stringify(ctx.snap).slice(0, 3000)}` : "",
    ctx.help ? `Relevant lessons from the app's user guide (use them to explain how to use the app): ${JSON.stringify(ctx.help).slice(0, 5000)}` : "",
  ].filter(Boolean).join("\n");

  if (!apiKey) {
    if (body.stream) return geminiSSE(geminiKey!, `${SYSTEM}\n\n${turnInfo}`, messages, { used, provider: "gemini" }, CORS);
    try {
      const r = await gemini(geminiKey!, `${SYSTEM}\n\n${turnInfo}`, messages);
      return json({ ...r, used, provider: "gemini" });
    } catch (e) {
      const st = (e as { status?: number }).status ?? 0;
      if (st === 429) return json({ error: "busy" }, 429);
      if (st === 400 || st === 401 || st === 403) return json({ error: "api", status: st, message: String((e as Error).message) }, 502);
      return json({ error: "server", message: String(e) }, 500);
    }
  }

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
      messages: (messages as any[]).map((m) => Array.isArray(m.content) ? { ...m, content: m.content.map(({ sig: _s, mdl: _m, ...b }: Blk) => b) } : m),
    });
    return json({ content: resp.content, stop_reason: resp.stop_reason, usage: resp.usage, used, provider: "claude" });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "busy" }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: "api", status: e.status, message: e.message }, 502);
    return json({ error: "server", message: String(e) }, 500);
  }
});
