
-- ============================================================
-- OUR LITTLE WORLD ♡ — Complete Supabase Database Setup
-- ============================================================
--
-- Run this ENTIRE file in: Supabase Dashboard → SQL Editor
-- Safe to re-run: every statement is idempotent.
--
-- This creates:
--   public.profiles     — one row per user (pairing, names)
--   public.messages     — private couple chat
--   storage bucket      — relationship-media for chat photos
--   RPC functions       — connect_with_partner, delete_my_data
--   RLS policies        — strict two-person access
--   Realtime            — live profile + message streaming
--
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;


-- ============================================================
-- 2. CLEAN OLD FUNCTIONS
-- ============================================================

drop function if exists public.admin_get_insights();
drop function if exists public.pair_with_code(text);
drop function if exists public.connect_with_partner(text);
drop function if exists public.delete_my_data();


-- ============================================================
-- 3. PROFILES TABLE
-- ============================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  age           integer default null,
  pairing_code  text,
  partner_id    uuid references public.profiles(id) on delete set null,
  partner_code  text,
  created_at    timestamptz not null default now(),
  last_active   timestamptz default now()
);

-- Idempotent column additions (safe on live databases)
alter table public.profiles add column if not exists name          text not null default '';
alter table public.profiles add column if not exists age           integer default null;
alter table public.profiles add column if not exists pairing_code  text;
alter table public.profiles add column if not exists partner_id    uuid references public.profiles(id) on delete set null;
alter table public.profiles add column if not exists partner_code  text;
alter table public.profiles add column if not exists created_at    timestamptz not null default now();
alter table public.profiles add column if not exists last_active   timestamptz default now();


-- ============================================================
-- 4. PROFILES INDEXES
-- ============================================================

create unique index if not exists profiles_pairing_code_uniq
  on public.profiles (pairing_code) where pairing_code is not null;

create index if not exists profiles_partner_id_idx
  on public.profiles (partner_id);


-- ============================================================
-- 5. ROW LEVEL SECURITY — PROFILES
-- ============================================================

alter table public.profiles enable row level security;

drop policy if exists "profiles select self" on public.profiles;
create policy "profiles select self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles select member" on public.profiles;
create policy "profiles select member" on public.profiles
  for select using (
    id = (select partner_id from public.profiles where id = auth.uid())
  );

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles delete own" on public.profiles;
create policy "profiles delete own" on public.profiles
  for delete using (auth.uid() = id);


-- ============================================================
-- 6. CONNECT WITH PARTNER — RPC
-- ============================================================
-- Called by Person 2 when they enter a pairing code.
-- Creates Person 2's profile if needed, pairs both users,
-- clears pairing codes, returns partner info.
-- Uses advisory lock to prevent race conditions.
-- ============================================================

create or replace function public.connect_with_partner(code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me        uuid := auth.uid();
  them      uuid;
  them_name text;
  them_age  integer;
begin
  if me is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Person 2 may not have a profile row yet — create one
  insert into public.profiles (id) values (me) on conflict (id) do nothing;

  -- Serialize concurrent pairing claims
  perform pg_advisory_xact_lock(hashtext('hb_pairing_claim'));

  select id into them
    from public.profiles
   where upper(pairing_code) = upper(trim(code))
   limit 1;

  if them is null then
    raise exception 'INVALID_CODE';
  end if;

  if them = me then
    raise exception 'SELF_CODE';
  end if;

  -- Already paired with each other — treat as success
  if exists (
    select 1 from public.profiles
     where id in (me, them) and partner_id in (them, me)
  ) then
    update public.profiles set pairing_code = null where id in (them, me);
    select name, age into them_name, them_age from public.profiles where id = them;
    return jsonb_build_object(
      'partner_id', them, 'partner_name', them_name,
      'partner_age', them_age, 'status', 'connected'
    );
  end if;

  -- Code is single-use: owner cannot be claimed twice
  if exists (
    select 1 from public.profiles where id = them and partner_id is not null
  ) then
    raise exception 'CODE_USED';
  end if;

  -- Connector can only be in ONE relationship
  if exists (
    select 1 from public.profiles where id = me and partner_id is not null
  ) then
    raise exception 'ALREADY_CONNECTED';
  end if;

  -- Link both sides; clear pairing codes; store partner_code
  update public.profiles set
    partner_id = me, pairing_code = null, partner_code = code
   where id = them;

  update public.profiles set
    partner_id = them, pairing_code = null
   where id = me;

  select name, age into them_name, them_age from public.profiles where id = them;
  return jsonb_build_object(
    'partner_id', them, 'partner_name', them_name,
    'partner_age', them_age, 'status', 'connected'
  );
end $$;

grant execute on function public.connect_with_partner(text) to anon, authenticated;


-- ============================================================
-- 7. DELETE MY DATA — RPC
-- ============================================================
-- "Erase Everything" from Settings.
-- Clears my profile row instead of deleting (avoids cascade to partner).
-- Unlinks partner so they can re-pair.
-- ============================================================

create or replace function public.delete_my_data()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then return; end if;

  -- Unlink partner from me
  update public.profiles
     set partner_id = null
   where partner_id = me;

  -- Clear my own row
  update public.profiles
     set name = '', age = null, partner_id = null,
         pairing_code = null, partner_code = null
   where id = me;
end $$;

grant execute on function public.delete_my_data() to anon, authenticated;


-- ============================================================
-- 8. MESSAGES TABLE — Private Couple Chat
-- ============================================================

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references public.profiles(id) on delete cascade,
  user_b      uuid not null references public.profiles(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  type        text not null default 'text' check (type in ('text', 'image')),
  message     text not null default '',
  media_path  text not null default '',
  created_at  timestamptz not null default now(),
  constraint messages_pair_sorted check (user_a < user_b)
);

create index if not exists messages_pair_idx
  on public.messages (user_a, user_b, created_at);


-- ============================================================
-- 9. COUPLE PAIR CHECK — Security Helper
-- ============================================================

create or replace function public.is_couple_pair(a uuid, b uuid)
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles me
     where me.id = auth.uid()
       and me.partner_id is not null
       and a = least(me.id, me.partner_id)
       and b = greatest(me.id, me.partner_id)
  );
$$;

grant execute on function public.is_couple_pair(uuid, uuid) to anon, authenticated;


-- ============================================================
-- 10. ROW LEVEL SECURITY — MESSAGES
-- ============================================================

alter table public.messages enable row level security;

drop policy if exists "messages select own pair" on public.messages;
create policy "messages select own pair" on public.messages
  for select using (public.is_couple_pair(user_a, user_b));

drop policy if exists "messages insert own pair" on public.messages;
create policy "messages insert own pair" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_couple_pair(user_a, user_b)
  );

drop policy if exists "messages delete own" on public.messages;
create policy "messages delete own" on public.messages
  for delete using (sender_id = auth.uid());


-- ============================================================
-- 11. STORAGE — relationship-media bucket
-- ============================================================

insert into storage.buckets (id, name, public)
values ('relationship-media', 'relationship-media', false)
on conflict (id) do nothing;

create or replace function storage.storage_pair_ok(name text)
returns boolean
language sql security definer set search_path = public
stable
as $$
  select public.is_couple_pair(
    split_part((storage.foldername(name))[1], '_', 1)::uuid,
    split_part((storage.foldername(name))[1], '_', 2)::uuid
  );
$$;

grant execute on function storage.storage_pair_ok(text) to anon, authenticated;

drop policy if exists "relationship-media select pair" on storage.objects;
create policy "relationship-media select pair" on storage.objects
  for select using (
    bucket_id = 'relationship-media'
    and storage.storage_pair_ok(name)
  );

drop policy if exists "relationship-media insert pair" on storage.objects;
create policy "relationship-media insert pair" on storage.objects
  for insert with check (
    bucket_id = 'relationship-media'
    and storage.storage_pair_ok(name)
  );

drop policy if exists "relationship-media update pair" on storage.objects;
create policy "relationship-media update pair" on storage.objects
  for update using (
    bucket_id = 'relationship-media'
    and storage.storage_pair_ok(name)
  );

drop policy if exists "relationship-media delete pair" on storage.objects;
create policy "relationship-media delete pair" on storage.objects
  for delete using (
    bucket_id = 'relationship-media'
    and storage.storage_pair_ok(name)
  );


-- ============================================================
-- 12. REALTIME — Stream live changes to both phones
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;


-- ============================================================
-- 13. ADMIN INSIGHTS
-- ============================================================

create or replace function public.admin_get_insights()
returns json
language plpgsql security definer set search_path = public
as $$
declare
  result json;
begin
  -- Owner only
  if auth.uid() <> 'e65fabbb-cc49-48c6-adc0-ef1d59f41896'::uuid then
    raise exception 'Unauthorized';
  end if;

  select json_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_couples', (select count(*) from public.profiles where partner_id is not null) / 2,
    'users', coalesce(
      (select json_agg(
        json_build_object(
          'name', p.name,
          'age', p.age,
          'code', p.pairing_code,
          'partner', (select pp.name from public.profiles pp where pp.id = p.partner_id),
          'connected', p.partner_id is not null,
          'joined', p.created_at,
          'last_active', p.last_active
        ) order by p.created_at desc
      ) from public.profiles p),
      '[]'::json
    )
  ) into result;

  return result;
end $$;

grant execute on function public.admin_get_insights() to authenticated;


-- ============================================================
-- 14. VERIFICATION
-- ============================================================

select
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'connect_with_partner',
    'delete_my_data',
    'admin_get_insights',
    'is_couple_pair'
  )
order by routine_name;

select 'DATABASE SETUP COMPLETED SUCCESSFULLY' as status;
