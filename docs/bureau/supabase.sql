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
