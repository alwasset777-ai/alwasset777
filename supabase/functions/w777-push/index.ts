// 🔔 w777-push — إشعارات فورية (Web Push بالتشفير aes128gcm + VAPID) بلا مكتبات خارجية
// كتتنادى من منبهات قاعدة البيانات (pg_net) بمفتاح سري x-w777-hook
const URL_ = Deno.env.get('SUPABASE_URL') || '', SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const HOOK = Deno.env.get('W777_PUSH_HOOK') || '';
const VAPID = JSON.parse(Deno.env.get('W777_VAPID_JWK') || '{}');
const SUBJ = 'mailto:alwasset777@gmail.com';
const H = { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };
const db = (p: string, o: RequestInit = {}) => fetch(`${URL_}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } });
const enc = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ub64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((s, x) => s + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
let vKey: CryptoKey | null = null;
async function vapidJwt(aud: string) {
  vKey ||= await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: VAPID.x, y: VAPID.y, d: VAPID.d, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const h = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const p = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJ })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, vKey, enc.encode(h + '.' + p));
  return h + '.' + p + '.' + b64u(sig);
}
const vapidPub = () => b64u(cat(new Uint8Array([4]), ub64(VAPID.x), ub64(VAPID.y)));
// RFC 8291
async function encrypt(sub: { p256dh: string; auth: string }, payload: string) {
  const ua = ub64(sub.p256dh), authS = ub64(sub.auth);
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, kp.privateKey, 256));
  const ikm = await hkdf(authS, ecdh, cat(enc.encode('WebPush: info\0'), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(enc.encode(payload), new Uint8Array([2]))));
  return cat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([65]), asPub, ct);
}
type Sub = { endpoint: string; p256dh: string; auth: string };
async function sendOne(sub: Sub, msg: unknown) {
  const body = await encrypt(sub, JSON.stringify(msg));
  const r = await fetch(sub.endpoint, { method: 'POST', body, headers: {
    Authorization: `vapid t=${await vapidJwt(new URL(sub.endpoint).origin)}, k=${vapidPub()}`,
    'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'high' } });
  if (r.status === 404 || r.status === 410) await db(`w777_push_subs?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' });
  return r.status;
}
async function pushTo(uids: string[], msg: Record<string, unknown>, throttle?: string) {
  uids = [...new Set(uids.filter(u => /^[0-9a-f-]{36}$/.test(u || '')))];
  if (!uids.length) return [];
  if (throttle) { // إشعار واحد كل 15 دقيقة لنفس النوع
    const since = new Date(Date.now() - 15 * 60000).toISOString();
    const seen = new Set(((await (await db(`w777_push_log?kind=eq.${throttle}&uid=in.(${uids.join(',')})&at=gt.${since}&select=uid`)).json()) || []).map((x: { uid: string }) => x.uid));
    uids = uids.filter(u => !seen.has(u)); if (!uids.length) return [];
    await db('w777_push_log?on_conflict=uid,kind', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(uids.map(uid => ({ uid, kind: throttle, at: new Date().toISOString() }))) });
  }
  const subs: Sub[] = await (await db(`w777_push_subs?uid=in.(${uids.join(',')})&select=endpoint,p256dh,auth`)).json();
  const out = await Promise.allSettled(subs.map(s => sendOne(s, msg)));
  return out.map(x => x.status === 'fulfilled' ? x.value : String((x as PromiseRejectedResult).reason));
}
const nameOf = async (uid: string) => { const a = await (await db(`w777_agencies?uid=eq.${uid}&select=name,code`)).json(); return a[0] ? (a[0].name || a[0].code) : 'مكتب الوسيط 777'; };
const admins = async () => ((await (await db('w777_admins?select=uid')).json()) || []).map((x: { uid: string }) => x.uid);
const TRX: Record<string, string> = { sale: 'للبيع', rent: 'للكراء', rent_furnished: 'للكراء مفروش', seasonal: 'كراء موسمي', offplan: 'على التصميم' };

Deno.serve(async req => {
  if (req.method !== 'POST' || !HOOK || req.headers.get('x-w777-hook') !== HOOK) return new Response('unauthorized', { status: 401 });
  const { type, row } = await req.json().catch(() => ({}));
  if (!row) return new Response('bad', { status: 400 });
  let r: unknown[] = [];
  if (type === 'test') r = await pushTo([row.uid], { title: '🔔 الوسيط 777', body: 'الإشعارات خدامة ✓', url: '#/' });
  else if (type === 'msg') r = await pushTo([row.recipient], { title: '💬 ' + await nameOf(row.sender), body: String(row.body || '').slice(0, 140), url: '#/chat/' + row.sender, tag: 'msg-' + row.sender });
  else if (type === 'rating') r = await pushTo([row.target], { title: '⭐ تقييم جديد', body: `${await nameOf(row.rater)} عطاك ${row.stars}/5`, url: '#/', tag: 'rating' });
  else if (type === 'notary') r = await pushTo([row.notary], { title: '🖋️ طلب جديد', body: [row.sender_name, row.contract || row.kind, row.prop_city].filter(Boolean).join(' · '), url: '#/notaries', tag: 'notary' });
  else if (type === 'booking') r = await pushTo(await admins(), { title: '🏖️ طلب حجز جديد', body: `${row.guest_name || ''} · ${row.check_in} → ${row.check_out}`, url: '#/stays', tag: 'booking' });
  else if (type === 'prop' && row.city && row.trx) {
    // عقار جديد فالشبكة ← المشتركين اللي عندهم طلب مفتوح كيناسبو (نفس المدينة، العملية، النوع والميزانية)
    const q = `w777_records?kind=eq.requests&deleted=eq.false&owner=neq.${row.owner}&data->>city=eq.${encodeURIComponent(row.city)}&data->>transaction=eq.${encodeURIComponent(row.trx)}`
      + '&select=owner,status:data->>status,types:data->types,bmax:data->budgetMax,ref:data->>ref&limit=5000';
    const reqs = (await (await db(q)).json()) || [];
    const price = Number(row.price) || 0;
    const hit = new Map<string, string>();
    for (const x of reqs) {
      if (['done', 'cancelled'].includes(x.status)) continue;
      if (Array.isArray(x.types) && x.types.length && row.type && !x.types.includes(row.type)) continue;
      if (price && Number(x.bmax) && price > Number(x.bmax) * 1.15) continue;
      if (!hit.has(x.owner)) hit.set(x.owner, x.ref || '');
    }
    if (hit.size) r = await pushTo([...hit.keys()], { title: '🎯 عقار جديد كيناسب طلب عندك', body: `${TRX[row.trx] || ''} فـ ${row.city}${price ? ' · ' + price.toLocaleString('fr-FR') + ' د' : ''} — ${row.agency || ''}`, url: '#/agencies', tag: 'prop' }, 'prop');
  }
  return Response.json({ ok: true, sent: r });
});
