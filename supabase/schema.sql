-- ============================================================
--  OUR LITTLE WORLD ♡ — Supabase schema (profiles-only)
--  Run this whole file in: Supabase Dashboard → SQL Editor
--  Safe to re-run: every statement is idempotent.
--
--  This project uses the profiles-only pairing model:
--    * one `profiles` row per person (no relationships/messages
--      tables — the app degrades gracefully without them)
--    * pairing via pairing_code / partner_id / partner_code
--    * Row Level Security lets a person read/update ONLY their
--      own row
--
--  Because of that RLS, the actual pairing happens in the
--  security-definer RPC connect_with_partner(code) — a client can't
--  read or edit another person's row, so the code lookup + link
--  must run inside the database. This file ADDS that one function
--  (plus the realtime switch for profiles) and nothing else.
--  No tables are created, dropped, renamed or restructured, and no
--  existing column is touched.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- PROFILES — one row per authenticated user.
-- Only columns that already exist in the live database. On a fresh
-- database the create-table builds the same shape; on the live one
-- every ALTER is a no-op (IF NOT EXISTS).
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null default '',
  age           integer default null,
  pairing_code  text,
  partner_id    uuid references public.profiles (id) on delete set null,
  partner_code  text,
  created_at    timestamptz not null default now(),
  last_active   timestamptz default now()
);

alter table public.profiles add column if not exists name          text not null default '';
alter table public.profiles add column if not exists age           integer default null;
alter table public.profiles add column if not exists pairing_code  text;
alter table public.profiles add column if not exists partner_id    uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists partner_code  text;
alter table public.profiles add column if not exists created_at    timestamptz not null default now();
alter table public.profiles add column if not exists last_active   timestamptz default now();

-- one live pairing code per person (partial → keeps historical nulls unique-safe)
create unique index if not exists profiles_pairing_code_uniq
  on public.profiles (pairing_code) where pairing_code is not null;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY — self-only, matching the live database.
-- The pairing link is written by the security-definer RPC below,
-- which runs as the table owner and bypasses RLS.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles select self" on public.profiles;
create policy "profiles select self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles delete own" on public.profiles;
create policy "profiles delete own" on public.profiles
  for delete using (auth.uid() = id);

-- ------------------------------------------------------------
-- RPC: connect with a partner code (run by the second person)
-- ------------------------------------------------------------
-- Atomic + single-use:
--   * an advisory xact lock serializes simultaneous claims,
--     so a code can never be grabbed by two phones at once
--   * the code owner is rejected if already paired elsewhere
--     (CODE_USED), and the connector if they already are
--     (ALREADY_CONNECTED); pairing with the same person twice
--     is an idempotent success
--   * pairing_code is cleared from BOTH profiles once paired;
--     partner_code remembers the code that was used
create or replace function public.connect_with_partner(code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me   uuid := auth.uid();
  them uuid;
begin
  if me is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- serialize concurrent pairing claims
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

  -- already paired with each other? treat as success (idempotent-ish)
  if exists (
    select 1 from public.profiles
     where id in (me, them) and partner_id in (them, me)
  ) then
    update public.profiles set pairing_code = null where id in (them, me);
    return jsonb_build_object('partner_id', them, 'status', 'connected');
  end if;

  -- a code is single-use: the owner cannot be claimed twice
  if exists (
    select 1 from public.profiles where id = them and partner_id is not null
  ) then
    raise exception 'CODE_USED';
  end if;

  -- I can only ever be in ONE relationship
  if exists (
    select 1 from public.profiles where id = me and partner_id is not null
  ) then
    raise exception 'ALREADY_CONNECTED';
  end if;

  -- link BOTH sides; the owner's code is now single-use; the connector
  -- keeps a record of which code they used (partner_code).
  update public.profiles set
    partner_id = me, pairing_code = null, partner_code = code
   where id = them;

  update public.profiles set
    partner_id = them, pairing_code = null
   where id = me;

  return jsonb_build_object('partner_id', them, 'status', 'connected');
end $$;

grant execute on function public.connect_with_partner(text) to anon, authenticated;

-- ------------------------------------------------------------
-- RPC: clear my own data ("Start over" / leave).
-- Clears MY profile row (name, age, pairing, links) instead of
-- deleting it — deleting would cascade through partner_id and could
-- take the partner's row with it. The partner's side is untouched.
-- ------------------------------------------------------------
create or replace function public.delete_my_data()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then return; end if;
  update public.profiles
     set name = '', age = null, partner_id = null,
         pairing_code = null, partner_code = null
   where id = me;
end $$;

grant execute on function public.delete_my_data() to anon, authenticated;

-- ------------------------------------------------------------
-- REALTIME — stream MY profile row changes (so partner_id appears
-- live on both phones the moment the RPC links them). Idempotent.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- done ♡
