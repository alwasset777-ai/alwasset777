// 👥 w777-staff — مول المكتب كيصاوب ويدبر حسابات الموظفين (بالمفتاح الخدمي، من الخادم فقط)
const URL_ = Deno.env.get('SUPABASE_URL') || '', SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const H = { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json' };
const db = (p: string, o: RequestInit = {}) => fetch(`${URL_}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } });
const admin = (p: string, o: RequestInit = {}) => fetch(`${URL_}/auth/v1/admin/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (b: unknown, s = 200) => Response.json(b, { status: s, headers: CORS });
const MAX_STAFF = 15;
const genPass = () => { const a = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from(crypto.getRandomValues(new Uint8Array(10)), b => a[b % a.length]).join(''); };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return out({ error: 'method' }, 405);
  // المستعمل اللي نادى (توكن ديالو)
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const u = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: SR, Authorization: 'Bearer ' + tok } });
  if (!u.ok) return out({ error: 'دخل من جديد' }, 401);
  const me = (await u.json()).id as string;
  // غير المدير ولا مكتب مفعّل (ماشي موظف)
  const [ag, ad, st] = await Promise.all([
    db(`w777_agencies?uid=eq.${me}&active=is.true&select=uid`).then(r => r.json()),
    db(`w777_admins?uid=eq.${me}&select=uid`).then(r => r.json()),
    db(`w777_staff?uid=eq.${me}&select=uid`).then(r => r.json())]);
  if (st.length || (!ag.length && !ad.length)) return out({ error: 'هاد الخدمة غير لمول المكتب' }, 403);
  const b = await req.json().catch(() => ({}));
  const role = ['view', 'edit', 'full'].includes(b.role) ? b.role : 'edit';
  const pass = typeof b.password === 'string' && b.password.length >= 8 ? b.password.slice(0, 72) : genPass();
  const mine = async (id: string) => /^[0-9a-f-]{36}$/.test(id || '') && ((await (await db(`w777_staff?uid=eq.${id}&owner=eq.${me}&select=uid`)).json()) || []).length > 0;

  if (b.action === 'create') {
    const name = String(b.name || '').trim().slice(0, 80);
    if (!name) return out({ error: 'دخل اسم الموظف' }, 400);
    const n = ((await (await db(`w777_staff?owner=eq.${me}&select=uid`)).json()) || []).length;
    if (n >= MAX_STAFF) return out({ error: `الحد الأقصى ${MAX_STAFF} موظف` }, 400);
    // رقم الدخول: staff001، staff002…
    const last = ((await (await db('w777_staff?select=login&order=login.desc&limit=1')).json()) || [])[0];
    let num = last ? (parseInt(String(last.login).replace(/\D/g, ''), 10) || 0) + 1 : 1;
    for (let i = 0; i < 5; i++, num++) {
      const login = 'staff' + String(num).padStart(3, '0'), email = login + '@alwasset777.ma';
      const c = await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pass, email_confirm: true, user_metadata: { staff_of: me, name } }) });
      if (!c.ok) { if (c.status === 422) continue; return out({ error: 'تعذر إنشاء الحساب' }, 500); }
      const uid = (await c.json()).id;
      const ins = await db('w777_staff', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ uid, owner: me, name, login, role }) });
      if (!ins.ok) { await admin('users/' + uid, { method: 'DELETE' }); return out({ error: 'تعذر الحفظ' }, 500); }
      return out({ ok: true, uid, login, password: pass });
    }
    return out({ error: 'تعذر إيجاد رقم دخول' }, 500);
  }
  if (b.action === 'password') {
    if (!(await mine(b.uid))) return out({ error: 'موظف ماشي ديالك' }, 403);
    const r = await admin('users/' + b.uid, { method: 'PUT', body: JSON.stringify({ password: pass }) });
    return r.ok ? out({ ok: true, password: pass }) : out({ error: 'تعذر' }, 500);
  }
  if (b.action === 'delete') {
    if (!(await mine(b.uid))) return out({ error: 'موظف ماشي ديالك' }, 403);
    const r = await admin('users/' + b.uid, { method: 'DELETE' });
    return r.ok ? out({ ok: true }) : out({ error: 'تعذر' }, 500);
  }
  return out({ error: 'action' }, 400);
});
