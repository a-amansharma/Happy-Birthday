-- ============================================================
--  OUR LITTLE WORLD ♡ — Supabase schema (profiles-only)
--  Run this whole file in: Supabase Dashboard → SQL Editor
--  Safe to re-run: every statement is idempotent.
--
--  This project uses the profiles-only pairing model:
--    * one `profiles` row per person
--    * pairing via pairing_code / partner_id / partner_code
--    * Row Level Security: a person reads/updates ONLY their own
--      row (plus their paired partner's name/age — the "select
--      member" policy below — so each phone shows the real other
--      person instead of a typed guess)
--
--  Because of that RLS, the actual pairing happens in the
--  security-definer RPC connect_with_partner(code) — a client can't
--  read or edit another person's row, so the code lookup + link
--  must run inside the database.
--
--  New in this version (private couple chat is a hard requirement):
--    * `messages` table — pair-scoped text/image rows, RLS allows
--      ONLY the two people in the pair to read/insert their own rows
--    * `relationship-media` storage bucket — uploads scoped the same
--      way via the storage_pair_ok() helper
--    * partner-select policy on profiles (name/age of your person)
--
--  No existing column is touched, no existing table is dropped.
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
-- ROW LEVEL SECURITY — self-only, plus your partner's details.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles select self" on public.profiles;
create policy "profiles select self" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles select member" on public.profiles;
create policy "profiles select member" on public.profiles
  for select using (id = (select partner_id from public.profiles where id = auth.uid()));

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
--   * creates my profile row too (a person joining by code may not
--     have one yet) — on conflict = no-op
--   * an advisory xact lock serializes simultaneous claims,
--     so a code can never be grabbed by two phones at once
--   * the code owner is rejected if already paired elsewhere
--     (CODE_USED), and the connector if they already are
--     (ALREADY_CONNECTED); pairing with the same person twice
--     is an idempotent success
--   * pairing_code is cleared from BOTH profiles once paired;
--     partner_code remembers the code that was used
--   * returns the partner's real name/age (the app hydrates them)
create or replace function public.connect_with_partner(code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me       uuid := auth.uid();
  them     uuid;
  them_name text;
  them_age  integer;
begin
  if me is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- I might have arrived by code without ever creating a profile row.
  insert into public.profiles (id) values (me) on conflict (id) do nothing;

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
    select name, age into them_name, them_age from public.profiles where id = them;
    return jsonb_build_object(
      'partner_id', them, 'partner_name', them_name,
      'partner_age', them_age, 'status', 'connected'
    );
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

  select name, age into them_name, them_age from public.profiles where id = them;
  return jsonb_build_object(
    'partner_id', them, 'partner_name', them_name,
    'partner_age', them_age, 'status', 'connected'
  );
end $$;

grant execute on function public.connect_with_partner(text) to anon, authenticated;

-- ------------------------------------------------------------
-- RPC: clear my own data ("Start over" / leave).
-- Clears MY profile row (name, age, pairing, links) instead of
-- deleting it — deleting would cascade through partner_id and could
-- take the partner's row with it. Also unlinks my partner so they
-- can re-pair with a fresh code on their next visit.
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
     set partner_id = null
   where partner_id = me;
  update public.profiles
     set name = '', age = null, partner_id = null,
         pairing_code = null, partner_code = null
   where id = me;
end $$;

grant execute on function public.delete_my_data() to anon, authenticated;

-- ------------------------------------------------------------
-- PRIVATE COUPLE CHAT — one `messages` table, strictly two people.
-- user_a < user_b always (sorted pair) so a couple owns exactly one
-- deterministic pair key. RLS only lets the two paired members read
-- or insert their own pair's rows.
-- ------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references public.profiles (id) on delete cascade,
  user_b      uuid not null references public.profiles (id) on delete cascade,
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  type        text not null default 'text' check (type in ('text', 'image')),
  message     text not null default '',
  media_path  text not null default '',
  created_at  timestamptz not null default now(),
  constraint messages_pair_sorted check (user_a < user_b)
);

create index if not exists messages_pair_idx
  on public.messages (user_a, user_b, created_at);

-- security-definer helper: is (a, b) exactly my own sorted couple pair?
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

-- ------------------------------------------------------------
-- PRIVATE MEDIA — relationship-media bucket for chat photos.
-- Path shape: {pairKey}/{messageId}/{filename} where pairKey is
-- sorted-id-a_sorted-id-b. Policies use the same couple-pair check.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- REALTIME — stream profile + message changes live to both phones
-- (so partner_id appears the moment the RPC links them, and each
-- message shows up without a refresh). Idempotent.
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

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- done ♡
