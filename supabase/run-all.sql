-- ============================================================
-- OUR LITTLE WORLD ♡ — SUPABASE SETUP (SINGLE FILE)
-- Run this ENTIRE file once in: Supabase Dashboard → SQL Editor
-- Safe to re-run ANY time (every statement is idempotent).
--
-- This file is the ONLY SQL file you need. It:
--   1. Creates tables (profiles, messages, activity) if missing
--   2. Fixes the live "name NOT NULL without default" bug (error 23502)
--   3. Recreates all RLS policies (recursion-safe, security definer)
--   4. Recreates RPC functions + grants
--   5. Enables Realtime for profiles and messages
-- ============================================================


-- ============================================================
-- 1. TABLES
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

-- CRITICAL FIX: the live database's name column has NO default, so the
-- pairing RPC's auto-insert failed with 23502 "null value in column name".
alter table public.profiles alter column name set default '';

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null,
  user_b      uuid not null,
  sender_id   uuid not null,
  type        text not null default 'text' check (type in ('text', 'image')),
  message     text not null default '',
  media_path  text not null default '',
  created_at  timestamptz not null default now(),
  constraint messages_pair_sorted check (user_a < user_b)
);

create table if not exists public.activity (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null default '',
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);


-- ============================================================
-- 2. INDEXES
-- ============================================================

create unique index if not exists profiles_pairing_code_uniq
  on public.profiles (pairing_code) where pairing_code is not null;

create index if not exists profiles_partner_id_idx
  on public.profiles (partner_id);

create index if not exists messages_pair_idx
  on public.messages (user_a, user_b, created_at);

create index if not exists activity_user_idx
  on public.activity (user_id, created_at);


-- ============================================================
-- 3. REALTIME — stream live changes to both phones
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
-- 4. CLEAN SLATE — drop every old/broken policy and function
-- ============================================================

drop policy if exists "profiles select self" on public.profiles;
drop policy if exists "profiles select member" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;
drop policy if exists "Paired partners can read each other's profiles" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can create own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

drop policy if exists "messages select own pair" on public.messages;
drop policy if exists "messages insert own pair" on public.messages;
drop policy if exists "messages delete own" on public.messages;

drop policy if exists "activity select own" on public.activity;
drop policy if exists "activity insert own" on public.activity;
drop policy if exists "Users can view own activity" on public.activity;
drop policy if exists "Users can create own activity" on public.activity;

drop policy if exists "relationship-media select pair" on storage.objects;
drop policy if exists "relationship-media insert pair" on storage.objects;
drop policy if exists "relationship-media update pair" on storage.objects;
drop policy if exists "relationship-media delete pair" on storage.objects;

drop function if exists public.my_partner_id();
drop function if exists public.is_couple_pair(uuid, uuid);
drop function if exists public.connect_with_partner(text);
drop function if exists public.delete_my_data();
drop function if exists public.admin_get_insights();
drop function if exists storage.storage_pair_ok(text);


-- ============================================================
-- 5. HELPER FUNCTIONS (SECURITY DEFINER — break RLS recursion)
-- ============================================================

create function public.my_partner_id()
returns uuid
language sql security definer set search_path = public
stable
as $$
  select partner_id from public.profiles where id = auth.uid();
$$;

create function public.is_couple_pair(a uuid, b uuid)
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


-- ============================================================
-- 6. ROW LEVEL SECURITY — POLICIES
-- ============================================================

alter table public.profiles enable row level security;
alter table public.messages  enable row level security;
alter table public.activity  enable row level security;

-- PROFILES: you can see/update yourself, and your paired partner
create policy "profiles select self" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles select member" on public.profiles
  for select using (id = public.my_partner_id());

create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles delete own" on public.profiles
  for delete using (auth.uid() = id);

-- MESSAGES: only the two paired users can read/insert
create policy "messages select own pair" on public.messages
  for select using (public.is_couple_pair(user_a, user_b));

create policy "messages insert own pair" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_couple_pair(user_a, user_b)
  );

create policy "messages delete own" on public.messages
  for delete using (sender_id = auth.uid());

-- ACTIVITY: only the owner
create policy "activity select own" on public.activity
  for select using (auth.uid() = user_id);

create policy "activity insert own" on public.activity
  for insert with check (auth.uid() = user_id);


-- ============================================================
-- 7. RPC FUNCTIONS + GRANTS
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

  -- Person 2 may not have a profile row yet — create one (always with name='
  -- so it never depends on the column default being present)
  insert into public.profiles (id, name) values (me, '') on conflict (id) do nothing;

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

grant execute on function public.connect_with_partner(text) to authenticated;

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

grant execute on function public.delete_my_data() to authenticated;

create or replace function public.admin_get_insights()
returns json
language plpgsql security definer set search_path = public
as $$
declare
  result json;
begin
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
-- DONE — verify + success message
-- ============================================================

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'messages', 'activity')
order by tablename, policyname;

select 'ALL DONE ✔  Your database is ready — reload the app ♡' as status;