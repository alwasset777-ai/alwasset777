-- ============================================================
-- مكتب الوسيط 777 — تهيئة المزامنة السحابية (Supabase)
-- نفّذ هذا الملف مرة واحدة: Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) جدول السجلات (عقارات، طلبات، إعدادات)
create table if not exists public.w777_records (
  owner      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text        not null,              -- properties | requests | meta
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  deleted    boolean     not null default false,
  synced_at  timestamptz not null default clock_timestamp(),
  primary key (owner, kind, id)
);
create index if not exists w777_records_owner_synced on public.w777_records (owner, synced_at);

-- كل تعديل يأخذ توقيت الخادم (يستعمل لسحب التغييرات الجديدة فقط)
create or replace function public.w777_touch() returns trigger
language plpgsql as $$
begin
  new.synced_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists w777_touch on public.w777_records;
create trigger w777_touch before insert or update on public.w777_records
  for each row execute function public.w777_touch();

-- 2) الحماية: كل حساب يرى بياناته فقط
alter table public.w777_records enable row level security;
drop policy if exists "w777 own select" on public.w777_records;
drop policy if exists "w777 own insert" on public.w777_records;
drop policy if exists "w777 own update" on public.w777_records;
drop policy if exists "w777 own delete" on public.w777_records;
create policy "w777 own select" on public.w777_records for select to authenticated using (owner = auth.uid());
create policy "w777 own insert" on public.w777_records for insert to authenticated with check (owner = auth.uid());
create policy "w777 own update" on public.w777_records for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "w777 own delete" on public.w777_records for delete to authenticated using (owner = auth.uid());

-- 3) تخزين الصور والفيديو والمستندات (خاص — غير عمومي)
insert into storage.buckets (id, name, public)
values ('w777-media', 'w777-media', false)
on conflict (id) do nothing;

drop policy if exists "w777 media select" on storage.objects;
drop policy if exists "w777 media insert" on storage.objects;
drop policy if exists "w777 media update" on storage.objects;
drop policy if exists "w777 media delete" on storage.objects;
create policy "w777 media select" on storage.objects for select to authenticated
  using (bucket_id = 'w777-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "w777 media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'w777-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "w777 media update" on storage.objects for update to authenticated
  using (bucket_id = 'w777-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "w777 media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'w777-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- الوكالات الشريكة: رابط خاص لكل وكالة باش تزيد العقارات ديالها
-- ============================================================
create extension if not exists pgcrypto;
create table if not exists public.w777_partners (
  token text primary key default encode(gen_random_bytes(12),'hex'),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, phone text, active boolean not null default true,
  created_at timestamptz not null default now());
alter table public.w777_partners enable row level security;
drop policy if exists w777_partners_own on public.w777_partners;
create policy w777_partners_own on public.w777_partners for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

create table if not exists public.w777_partner_items (
  id uuid primary key default gen_random_uuid(),
  token text not null references public.w777_partners(token) on delete cascade,
  data jsonb not null, photos text[] not null default '{}',
  imported boolean not null default false,
  created_at timestamptz not null default now());
alter table public.w777_partner_items enable row level security;
drop policy if exists w777_partner_items_own on public.w777_partner_items;
create policy w777_partner_items_own on public.w777_partner_items for all to authenticated
  using (exists (select 1 from public.w777_partners p where p.token = w777_partner_items.token and p.owner = auth.uid()))
  with check (exists (select 1 from public.w777_partners p where p.token = w777_partner_items.token and p.owner = auth.uid()));

create or replace function public.w777_partner_ok(t text) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from w777_partners where token = t and active) $$;
create or replace function public.w777_partner_info(t text) returns json language sql stable security definer set search_path = public as
$$ select json_build_object('name', name) from w777_partners where token = t and active $$;
create or replace function public.w777_partner_submit(t text, d jsonb, ph text[]) returns uuid language plpgsql security definer set search_path = public as
$$ declare nid uuid; begin
  if not w777_partner_ok(t) then raise exception 'invalid link'; end if;
  if (select count(*) from w777_partner_items where token = t and created_at > now() - interval '1 day') >= 100 then raise exception 'daily limit'; end if;
  if octet_length(d::text) > 20000 then raise exception 'too large'; end if;
  insert into w777_partner_items(token, data, photos) values (t, d, coalesce(ph, '{}')) returning id into nid;
  return nid; end $$;
create or replace function public.w777_partner_list(t text) returns setof json language sql stable security definer set search_path = public as
$$ select json_build_object('id', id, 'data', data, 'created_at', created_at, 'photos', coalesce(array_length(photos, 1), 0), 'imported', imported)
   from w777_partner_items where token = t and w777_partner_ok(t) order by created_at desc limit 200 $$;
revoke all on function public.w777_partner_submit(text, jsonb, text[]) from public;
grant execute on function public.w777_partner_ok(text), public.w777_partner_info(text), public.w777_partner_submit(text, jsonb, text[]), public.w777_partner_list(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('w777-partner', 'w777-partner', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists w777_partner_upload on storage.objects;
create policy w777_partner_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'w777-partner' and public.w777_partner_ok((storage.foldername(objects.name))[1]));
drop policy if exists w777_partner_read on storage.objects;
create policy w777_partner_read on storage.objects for select to authenticated
  using (bucket_id = 'w777-partner' and exists (select 1 from public.w777_partners p where p.token = (storage.foldername(objects.name))[1] and p.owner = auth.uid()));
drop policy if exists w777_partner_del on storage.objects;
create policy w777_partner_del on storage.objects for delete to authenticated
  using (bucket_id = 'w777-partner' and exists (select 1 from public.w777_partners p where p.token = (storage.foldername(objects.name))[1] and p.owner = auth.uid()));


-- ============================================================
-- شبكة «الوكالات العقارية» (777 حساب): كل وكالة كتزيد عقاراتها،
-- والكل كيشوف عقارات الشبكة بلا معلومات المالك. المدير كيشوف كلشي.
-- ============================================================
create table if not exists public.w777_admins (uid uuid primary key references auth.users(id) on delete cascade);
-- insert into public.w777_admins(uid) values ('<uid ديال حساب المكتب>');
alter table public.w777_admins enable row level security;
create or replace function public.w777_is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from w777_admins where uid = auth.uid()) $$;

create table if not exists public.w777_agencies (
  uid uuid primary key references auth.users(id) on delete cascade,
  code text unique not null, name text not null, phone text, email text,
  active boolean not null default true, created_at timestamptz not null default now());
alter table public.w777_agencies enable row level security;
create or replace function public.w777_can_use() returns boolean language sql stable security definer set search_path=public as
$$ select w777_is_admin() or exists(select 1 from w777_agencies where uid = auth.uid() and active) $$;
drop policy if exists w777_ag_sel on public.w777_agencies;
create policy w777_ag_sel on public.w777_agencies for select to authenticated using (w777_can_use());
drop policy if exists w777_ag_upd on public.w777_agencies;
create policy w777_ag_upd on public.w777_agencies for update to authenticated using (w777_is_admin() or uid = auth.uid()) with check (w777_is_admin() or uid = auth.uid());
drop policy if exists w777_ag_admin on public.w777_agencies;
create policy w777_ag_admin on public.w777_agencies for all to authenticated using (w777_is_admin()) with check (w777_is_admin());
create or replace function public.w777_ag_guard() returns trigger language plpgsql security definer set search_path=public as
$$ begin if not w777_is_admin() then new.active := old.active; new.code := old.code; new.email := old.email; new.uid := old.uid; end if; return new; end $$;
drop trigger if exists w777_ag_guard on public.w777_agencies;
create trigger w777_ag_guard before update on public.w777_agencies for each row execute function public.w777_ag_guard();

create table if not exists public.w777_agency_secrets (uid uuid primary key references public.w777_agencies(uid) on delete cascade, password text not null);
alter table public.w777_agency_secrets enable row level security;
drop policy if exists w777_sec_admin on public.w777_agency_secrets;
create policy w777_sec_admin on public.w777_agency_secrets for all to authenticated using (w777_is_admin()) with check (w777_is_admin());

create table if not exists public.w777_shared_props (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null, agency text, phone text, city text, type text, trx text, price numeric,
  photo_ids text[] not null default '{}', data jsonb not null, deleted boolean not null default false,
  updated_at timestamptz not null default now(), primary key (owner, id));
create index if not exists w777_shared_upd on public.w777_shared_props(updated_at desc);
alter table public.w777_shared_props enable row level security;
drop policy if exists w777_sh_sel on public.w777_shared_props;
create policy w777_sh_sel on public.w777_shared_props for select to authenticated using (w777_can_use());
drop policy if exists w777_sh_ins on public.w777_shared_props;
create policy w777_sh_ins on public.w777_shared_props for insert to authenticated with check (owner = auth.uid() and w777_can_use());
drop policy if exists w777_sh_upd on public.w777_shared_props;
create policy w777_sh_upd on public.w777_shared_props for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid() and w777_can_use());
drop policy if exists w777_sh_del on public.w777_shared_props;
create policy w777_sh_del on public.w777_shared_props for delete to authenticated using (owner = auth.uid() or w777_is_admin());

-- صور العقارات المشاركة: أي مستعمل مفعل يقدر يقرا غير الصور اللي فالعقارات المشاركة
drop policy if exists w777_media_shared on storage.objects;
create policy w777_media_shared on storage.objects for select to authenticated using (
  bucket_id = 'w777-media' and public.w777_can_use() and exists (
    select 1 from public.w777_shared_props s
    where s.owner::text = (storage.foldername(objects.name))[1] and not s.deleted
      and split_part(storage.filename(objects.name), '.', 1) = any(s.photo_ids)));

-- المدير يقرا معلومات المالك ديال أي عقار مشارك
create or replace function public.w777_admin_record(o uuid, i text) returns jsonb language sql stable security definer set search_path=public as
$$ select data from w777_records where w777_is_admin() and owner = o and kind = 'properties' and id = i $$;
grant execute on function public.w777_is_admin(), public.w777_can_use(), public.w777_admin_record(uuid, text) to authenticated;
-- ============================================================
-- الوكيل الذكي: الإعدادات (الصورة يبدلها غير المدير) + الحصة اليومية
-- ============================================================
create table if not exists public.w777_agent_config (
  id int primary key default 1 check (id = 1),
  name text not null default 'مساعد الوسيط 777',
  photo text,
  updated_at timestamptz not null default now());
insert into public.w777_agent_config(id) values (1) on conflict do nothing;
alter table public.w777_agent_config enable row level security;
drop policy if exists w777_agc_sel on public.w777_agent_config;
create policy w777_agc_sel on public.w777_agent_config for select to authenticated using (public.w777_can_use());
drop policy if exists w777_agc_upd on public.w777_agent_config;
create policy w777_agc_upd on public.w777_agent_config for update to authenticated using (public.w777_is_admin()) with check (public.w777_is_admin());

create table if not exists public.w777_agent_usage (
  uid uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  n int not null default 0,
  primary key (uid, day));
alter table public.w777_agent_usage enable row level security;
drop policy if exists w777_agu_sel on public.w777_agent_usage;
create policy w777_agu_sel on public.w777_agent_usage for select to authenticated using (uid = auth.uid() or public.w777_is_admin());
create or replace function public.w777_agent_hit(u uuid, lim int) returns int language plpgsql security definer set search_path = public as $$
declare c int;
begin
  insert into w777_agent_usage(uid, day, n) values (u, current_date, 1)
  on conflict (uid, day) do update set n = w777_agent_usage.n + 1 returning n into c;
  if c > lim then return -1; end if;
  return c;
end $$;
revoke execute on function public.w777_agent_hit(uuid, int) from public, anon, authenticated;
alter table public.w777_agent_config add column if not exists ai_enabled boolean not null default false;

-- ============================================================
-- مفتاح Claude: كيتسجل من التطبيق (المدير فقط) وما كيتقراش من الواجهة
-- ============================================================
create table if not exists public.w777_secrets (name text primary key, value text not null, updated_at timestamptz not null default now());
alter table public.w777_secrets enable row level security;
revoke all on public.w777_secrets from anon, authenticated;
create or replace function public.w777_set_secret(n text, v text) returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not w777_is_admin() then raise exception 'forbidden'; end if;
  if n not in ('anthropic_api_key', 'gemini_api_key') then raise exception 'bad name'; end if;
  if v is null or length(trim(v)) = 0 then delete from w777_secrets where name = n; return false; end if;
  insert into w777_secrets(name, value, updated_at) values (n, trim(v), now()) on conflict (name) do update set value = excluded.value, updated_at = now();
  return true;
end $$;
create or replace function public.w777_has_secret(n text) returns boolean language sql stable security definer set search_path = public as $$
  select w777_is_admin() and exists(select 1 from w777_secrets where name = n) $$;
revoke execute on function public.w777_set_secret(text, text) from public, anon;
grant execute on function public.w777_set_secret(text, text), public.w777_has_secret(text) to authenticated;

-- ============================================================
-- الشبكة الموسعة: الوسطاء، شركات المقاولات، شركات التشطيب (777 لكل وحدة)
-- نفس جدول الحسابات ديال الوكالات + نوع الحساب + الدولة
-- ============================================================
alter table public.w777_agencies add column if not exists kind text not null default 'agency';
alter table public.w777_agencies drop constraint if exists w777_agencies_kind_chk;
alter table public.w777_agencies add constraint w777_agencies_kind_chk check (kind in ('agency', 'broker', 'contractor', 'finishing'));
alter table public.w777_agencies add column if not exists country text not null default 'المغرب';
alter table public.w777_agencies add column if not exists city text;
alter table public.w777_agencies add column if not exists services text;
alter table public.w777_agencies add column if not exists about text;
-- 700 وكالة داخل المغرب (001–700) و 77 خارج المغرب (701–777)
update public.w777_agencies set country = 'خارج المغرب' where kind = 'agency' and code ~ '^\d+$' and code::int between 701 and 777 and country = 'المغرب';
create or replace function public.w777_ag_guard() returns trigger language plpgsql security definer set search_path=public as
$$ begin if not w777_is_admin() then new.active := old.active; new.code := old.code; new.email := old.email; new.uid := old.uid; new.kind := old.kind; end if; return new; end $$;
create or replace function public.w777_my_kind() returns text language sql stable security definer set search_path=public as
$$ select case when w777_is_admin() then 'admin' else (select kind from w777_agencies where uid = auth.uid() and active) end $$;
grant execute on function public.w777_my_kind() to authenticated;
-- الحسابات: W001–W777 (وسيط: wasitNNN@alwasset777.ma)، B001–B777 (مقاولة: btpNNN@…)، F001–F777 (تشطيب: finitionNNN@…)
-- تتخلق بنفس طريقة الوكالات (auth.users + auth.identities + w777_agencies(kind) + w777_agency_secrets)
-- وكلمات السر كيشوفها غير المدير من التطبيق (الإدارة ← كل خانة).

-- ============================================================
-- المشاريع (تمويل) · الهبة · النزاعات · المناسبات · الأخبار
-- ============================================================
-- المشاريع: أي مشترك كينشر، كيبان للجميع غير من بعد موافقة المدير
create table if not exists public.w777_projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_name text, title text not null, category text, city text, country text default 'المغرب',
  amount numeric, contribution text, description text, phone text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'closed')),
  admin_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.w777_projects enable row level security;
drop policy if exists w777_pj_sel on public.w777_projects;
create policy w777_pj_sel on public.w777_projects for select to authenticated using (w777_is_admin() or owner = auth.uid() or (status = 'approved' and w777_can_use()));
drop policy if exists w777_pj_ins on public.w777_projects;
create policy w777_pj_ins on public.w777_projects for insert to authenticated with check (owner = auth.uid() and w777_can_use());
drop policy if exists w777_pj_upd on public.w777_projects;
create policy w777_pj_upd on public.w777_projects for update to authenticated using (w777_is_admin() or owner = auth.uid()) with check (w777_is_admin() or owner = auth.uid());
drop policy if exists w777_pj_del on public.w777_projects;
create policy w777_pj_del on public.w777_projects for delete to authenticated using (w777_is_admin() or owner = auth.uid());

-- الهبة: المشتركين كيقترحو حالات (بلا سمية ولا تصاور)، المدير كيراجع وينشر، والتبرع كيمر عبر مكتب الوسيط
create table if not exists public.w777_donations (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_name text, title text not null, need text check (need in ('rent', 'buy', 'repair', 'other')), city text,
  amount numeric, story text, status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'funded', 'closed')),
  raised numeric default 0, admin_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.w777_donations enable row level security;
drop policy if exists w777_dn_sel on public.w777_donations;
create policy w777_dn_sel on public.w777_donations for select to authenticated using (w777_is_admin() or owner = auth.uid() or (status in ('approved', 'funded') and w777_can_use()));
drop policy if exists w777_dn_ins on public.w777_donations;
create policy w777_dn_ins on public.w777_donations for insert to authenticated with check (owner = auth.uid() and w777_can_use());
drop policy if exists w777_dn_upd on public.w777_donations;
create policy w777_dn_upd on public.w777_donations for update to authenticated using (w777_is_admin() or owner = auth.uid()) with check (w777_is_admin() or owner = auth.uid());
drop policy if exists w777_dn_del on public.w777_donations;
create policy w777_dn_del on public.w777_donations for delete to authenticated using (w777_is_admin() or owner = auth.uid());

-- النزاعات: خاصة بين المشترك والمدير فقط
create table if not exists public.w777_disputes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_name text, category text, title text not null, description text, city text, phone text,
  specialist text, status text not null default 'new' check (status in ('new', 'escalated', 'in_progress', 'closed')),
  admin_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.w777_disputes enable row level security;
drop policy if exists w777_ds_sel on public.w777_disputes;
create policy w777_ds_sel on public.w777_disputes for select to authenticated using (w777_is_admin() or owner = auth.uid());
drop policy if exists w777_ds_ins on public.w777_disputes;
create policy w777_ds_ins on public.w777_disputes for insert to authenticated with check (owner = auth.uid() and w777_can_use());
drop policy if exists w777_ds_upd on public.w777_disputes;
create policy w777_ds_upd on public.w777_disputes for update to authenticated using (w777_is_admin() or owner = auth.uid()) with check (w777_is_admin() or owner = auth.uid());
drop policy if exists w777_ds_del on public.w777_disputes;
create policy w777_ds_del on public.w777_disputes for delete to authenticated using (w777_is_admin() or owner = auth.uid());

-- حارس: غير المدير ما يقدرش يبدل الحالة ولا ملاحظة المدير (إلا «طلب تحويل» ولا «إغلاق»)
create or replace function public.w777_mod_guard() returns trigger language plpgsql security definer set search_path=public as
$$ begin
  new.updated_at := now();
  if not w777_is_admin() then
    new.owner := old.owner; new.admin_note := old.admin_note;
    if tg_table_name = 'w777_disputes' then
      if new.status not in ('new', 'escalated', 'closed') then new.status := old.status; end if;
    elsif tg_table_name = 'w777_donations' then
      new.raised := old.raised;
      if new.status <> 'closed' then new.status := case when old.status = 'closed' then 'closed' else 'pending' end; end if;
    else
      if new.status <> 'closed' then new.status := case when old.status = 'closed' then 'closed' else 'pending' end; end if;
    end if;
  end if;
  return new; end $$;
create or replace function public.w777_mod_new() returns trigger language plpgsql security definer set search_path=public as
$$ begin if not w777_is_admin() then new.status := case when tg_table_name = 'w777_disputes' then 'new' else 'pending' end; new.admin_note := null; end if; return new; end $$;
drop trigger if exists w777_pj_guard on public.w777_projects;
create trigger w777_pj_guard before update on public.w777_projects for each row execute function public.w777_mod_guard();
drop trigger if exists w777_pj_new on public.w777_projects;
create trigger w777_pj_new before insert on public.w777_projects for each row execute function public.w777_mod_new();
drop trigger if exists w777_dn_guard on public.w777_donations;
create trigger w777_dn_guard before update on public.w777_donations for each row execute function public.w777_mod_guard();
drop trigger if exists w777_dn_new on public.w777_donations;
create trigger w777_dn_new before insert on public.w777_donations for each row execute function public.w777_mod_new();
drop trigger if exists w777_ds_guard on public.w777_disputes;
create trigger w777_ds_guard before update on public.w777_disputes for each row execute function public.w777_mod_guard();
drop trigger if exists w777_ds_new on public.w777_disputes;
create trigger w777_ds_new before insert on public.w777_disputes for each row execute function public.w777_mod_new();

-- المناسبات العقارية (المدير كيزيد، والتحديث اليومي)
create table if not exists public.w777_events (
  id uuid primary key default gen_random_uuid(), title text not null, kind text, starts date, ends date,
  city text, country text default 'المغرب', venue text, url text, description text, source text,
  created_at timestamptz not null default now(), unique (title, starts));
alter table public.w777_events enable row level security;
drop policy if exists w777_ev_sel on public.w777_events;
create policy w777_ev_sel on public.w777_events for select to authenticated using (w777_can_use());
drop policy if exists w777_ev_adm on public.w777_events;
create policy w777_ev_adm on public.w777_events for all to authenticated using (w777_is_admin()) with check (w777_is_admin());

-- الأخبار العقارية (المغرب + العالم) — كتتجدد كل نهار
create table if not exists public.w777_news (
  id uuid primary key default gen_random_uuid(), title text not null, summary text, url text unique, source text,
  scope text not null default 'ma' check (scope in ('ma', 'world')), lang text default 'ar', published date,
  created_at timestamptz not null default now());
create index if not exists w777_news_pub on public.w777_news(published desc);
alter table public.w777_news enable row level security;
drop policy if exists w777_nw_sel on public.w777_news;
create policy w777_nw_sel on public.w777_news for select to authenticated using (w777_can_use());
drop policy if exists w777_nw_adm on public.w777_news;
create policy w777_nw_adm on public.w777_news for all to authenticated using (w777_is_admin()) with check (w777_is_admin());

-- التحديث اليومي ديال الأخبار: الدالة w777-news (supabase/functions/w777-news) كتنادى مرتين فالنهار
-- (المفتاح news_cron_key كيتحط فـ w777_secrets — ما كيتكتبش هنا)
-- create extension if not exists pg_cron; create extension if not exists pg_net;
-- select cron.schedule('w777-news-daily', '7 5,17 * * *', $$ select net.http_post(
--   url := 'https://<project>.supabase.co/functions/v1/w777-news',
--   headers := jsonb_build_object('Content-Type','application/json','x-cron-key',(select value from public.w777_secrets where name='news_cron_key')),
--   body := '{}'::jsonb, timeout_milliseconds := 60000) $$);
