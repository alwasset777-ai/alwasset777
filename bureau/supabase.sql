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
