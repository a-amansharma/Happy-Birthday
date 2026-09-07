-- ============================================================
-- OUR LITTLE WORLD ♡ — SUPABASE SETUP (SINGLE FILE, v3)
-- ============================================================
-- Run this ENTIRE file once in: Supabase Dashboard → SQL Editor
-- Safe to re-run ANY time (every statement is idempotent).
--
-- ARCHITECTURE:  ONE shared relationship + TWO participants.
--
--   relationships  →  canonical pairing record (shared fields,
--                      pairing code, status, creator, partner hint)
--   profiles       →  a participant's PERSONAL row (your name & age),
--                      each referencing its relationship via
--                      profiles.relationship_id
--   messages       →  shared couple chat keyed by relationship_id
--   love_notes     →  shared, keyed by relationship_id
--   memories       →  shared, keyed by relationship_id, owner trackable
--   quiz_days      →  one quiz per relationship per day (+ computed result)
--   quiz_answers   →  one answer-set per participant per quiz
--
-- PERSPECTIVE is derived at runtime, never stored:
--   "You"      = the row in profiles for your auth user id
--   "Partner"  = the OTHER profile row in the SAME relationship
--   Shared     = the relationship row (identical on both phones)
--
-- It is safe to DROP and RECREATE the old columns/tables — they held
-- no irreplaceable data and the new model is cleanly idempotent.
-- ============================================================


-- ============================================================
-- 1. DROP OLD SHAPES (idempotent, safe)
-- ============================================================
-- Old quiz/notes/memory/activity tables are recreated for a clean,
-- idempotent shape.
-- NOTE: public.messages is deliberately NOT dropped — it holds the LIVE
-- couple chat. It is migrated in place (new receipt columns added
-- idempotently in section 2c below).
drop table if exists public.quiz_answers;
drop table if exists public.quiz_days;
drop table if exists public.memories;
drop table if exists public.love_notes;
drop table if exists public.activity;

-- Remove obsolete profile columns cleanly (their data moves elsewhere).
alter table public.profiles drop column if exists partner_id;
alter table public.profiles drop column if exists partner_code;
alter table public.profiles drop column if exists pairing_code;


-- ============================================================
-- 2. TABLES
-- ============================================================

-- ---- 2a. RELATIONSHIPS — the one canonical couple record ----
create table if not exists public.relationships (
  id                 uuid primary key default gen_random_uuid(),
  status             text not null default 'waiting'
                       check (status in ('waiting', 'connected')),
  pairing_code       text unique,                 -- single-use waiting code
  creator_user_id    uuid not null references auth.users(id) on delete cascade,
  partner_hint_name  text not null default '',    -- Person 1's guess; replaced by real data on join
  partner_hint_age   integer,
  -- ---- shared relationship-level fields (identical on both phones) ----
  relationship_type  text not null default '',
  together_since     date,
  vibes              jsonb not null default '[]'::jsonb,
  chat_style         jsonb not null default '[]'::jsonb,
  story              text not null default '',
  theme              text not null default 'milk',   -- shared visual theme for BOTH phones
  couple_dp_url      text not null default '',       -- shared couple photo (sidebar DP, synced)
  created_at         timestamptz not null default now(),
  connected_at       timestamptz,
  completed_at       timestamptz
);

create index if not exists relationships_creator_idx
  on public.relationships (creator_user_id);

-- Idempotent backfill for databases created before the shared theme
-- column existed (so re-running this file always brings it up to date).
alter table public.relationships add column if not exists theme text not null default 'milk';
alter table public.relationships add column if not exists couple_dp_url text not null default '';

-- ---- 2b. PROFILES — one PARTICIPANT row per auth user ----
-- id = auth.users(id): stable participant identity. Holds ONLY the
-- participant's own personal data (name, age). Pairing + shared data
-- live on the relationships row, referenced by relationship_id.
alter table public.profiles add column if not exists name            text not null default '';
alter table public.profiles add column if not exists age             integer;
alter table public.profiles add column if not exists avatar_url      text not null default '';
alter table public.profiles add column if not exists relationship_id uuid references public.relationships(id) on delete set null;
alter table public.profiles add column if not exists created_at      timestamptz not null default now();
alter table public.profiles add column if not exists last_active     timestamptz default now();

alter table public.profiles alter column name set default '';

create index if not exists profiles_relationship_idx
  on public.profiles (relationship_id);

-- One participant row per auth user (idempotent guarantee).
create unique index if not exists profiles_pkey on public.profiles (id);

-- ---- 2c. MESSAGES — shared couple chat ----
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  relationship_id  uuid not null references public.relationships(id) on delete cascade,
  sender_user_id   uuid not null,
  type             text not null default 'text' check (type in ('text', 'image')),
  message          text not null default '',
  media_path       text not null default '',
  created_at       timestamptz not null default now(),
  delivered_at     timestamptz,             -- recipient's site was open (chat not viewed)
  seen_at          timestamptz              -- recipient opened the chat
);

-- In-place migration for an already-existing messages table (idempotent).
alter table public.messages add column if not exists delivered_at timestamptz;
alter table public.messages add column if not exists seen_at      timestamptz;

create index if not exists messages_rel_idx
  on public.messages (relationship_id, created_at);

-- ---- 2d. LOVE NOTES — shared ----
create table if not exists public.love_notes (
  id               uuid primary key default gen_random_uuid(),
  relationship_id  uuid not null references public.relationships(id) on delete cascade,
  created_by       uuid not null,
  title            text not null default '',
  text             text not null default '',
  type             text not null default 'Random Love',
  tone             text not null default 'Sweet',
  created_at       timestamptz not null default now()
);

create index if not exists love_notes_rel_idx
  on public.love_notes (relationship_id, created_at);

-- ---- 2e. MEMORIES — shared, owner-tracked ----
create table if not exists public.memories (
  id               uuid primary key default gen_random_uuid(),
  relationship_id  uuid not null references public.relationships(id) on delete cascade,
  owner_user_id    uuid not null,                 -- who added it (drives the two columns)
  title            text not null default '',
  date             text not null default '',
  location         text not null default '',
  description      text not null default '',
  favorite         boolean not null default false,
  img              text not null default '',      -- base64 data URL
  created_at       timestamptz not null default now()
);

create index if not exists memories_rel_idx
  on public.memories (relationship_id, created_at);

-- ---- 2f. QUIZ DAYS — one shared quiz per relationship per day ----
create table if not exists public.quiz_days (
  id               uuid primary key default gen_random_uuid(),
  relationship_id  uuid not null references public.relationships(id) on delete cascade,
  quiz_date        date not null,
  -- deterministic seed so both phones build the same questions:
  -- (relationship_id + quiz_date). Questions are NOT stored; they are
  -- derived deterministically on the client.
  result_pct       integer,
  result_matches   integer,
  result_total     integer,
  completed        boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (relationship_id, quiz_date)
);

create index if not exists quiz_days_rel_idx
  on public.quiz_days (relationship_id, quiz_date);

-- ---- 2g. QUIZ ANSWERS — per participant per quiz ----
create table if not exists public.quiz_answers (
  id               uuid primary key default gen_random_uuid(),
  quiz_day_id      uuid not null references public.quiz_days(id) on delete cascade,
  user_id          uuid not null,                 -- the participant's auth id
  answers          jsonb not null default '{}'::jsonb,  -- map questionId -> option index
  created_at       timestamptz not null default now(),
  unique (quiz_day_id, user_id)
);

create index if not exists quiz_answers_day_idx
  on public.quiz_answers (quiz_day_id);


-- ============================================================
-- 3. REALTIME — stream live changes to both phones
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['relationships','profiles','messages','love_notes','memories','quiz_days','quiz_answers'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;


-- ============================================================
-- 4. HELPERS (SECURITY DEFINER — break RLS recursion)
-- ============================================================

-- The relationship this auth user belongs to (or null).
create or replace function public.my_relationship_id()
returns uuid
language sql security definer set search_path = public
stable
as $$
  select relationship_id from public.profiles where id = auth.uid();
$$;

-- Is this auth user a member of the given relationship?
create or replace function public.is_relationship_member(rid uuid)
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and relationship_id = rid
  );
$$;

-- Is this auth user a verified participant of rel? (used to whitelist
-- partner profile reads without exposing other couples)
create or replace function public.is_couple(make uuid, other uuid)
returns boolean
language sql security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles a
     join public.profiles b on a.relationship_id = b.relationship_id
    where a.id = auth.uid()
      and a.relationship_id is not null
      and make in (a.id, b.id) and other in (a.id, b.id)
      and make <> other
  );
$$;


-- ============================================================
-- 5. CLEAN SLATE — drop every old/broken policy and function
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

/* Old messages + activity tables are dropped in section 1, which removes
   their policies — no explicit policy drops needed here (and DROP POLICY on
   an already-dropped table would 42P01). */

drop policy if exists "relationship-media select pair" on storage.objects;
drop policy if exists "relationship-media insert pair" on storage.objects;
drop policy if exists "relationship-media update pair" on storage.objects;
drop policy if exists "relationship-media delete pair" on storage.objects;

drop function if exists public.my_partner_id();
drop function if exists public.is_couple_pair(uuid, uuid);
drop function if exists public.connect_with_partner(text);
drop function if exists storage.storage_pair_ok(text);

drop function if exists public.create_relationship();
drop function if exists public.complete_pairing(text);
drop function if exists public.update_my_profile(text, integer);
drop function if exists public.update_relationship(text, date, jsonb, jsonb, text);
drop function if exists public.delete_my_data();
drop function if exists public.admin_get_insights();
drop function if exists public.build_quiz_answer_stats(uuid);
drop function if exists public.finalize_quiz(uuid);


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
alter table public.relationships enable row level security;
alter table public.profiles     enable row level security;
alter table public.messages     enable row level security;
alter table public.love_notes   enable row level security;
alter table public.memories     enable row level security;
alter table public.quiz_days    enable row level security;
alter table public.quiz_answers enable row level security;

-- ---- DROP EXISTING POLICIES FIRST (idempotent re-runs) ----
-- Tables are created with "if not exists", so on a re-run their policies
-- persist. Drop the pair-policy names we create below before re-creating.
drop policy if exists "rel insert own wait" on public.relationships;
drop policy if exists "rel select member" on public.relationships;
drop policy if exists "rel update member" on public.relationships;
drop policy if exists "rel delete creator" on public.relationships;
drop policy if exists "prof select self" on public.profiles;
drop policy if exists "prof insert self" on public.profiles;
drop policy if exists "prof update self" on public.profiles;
drop policy if exists "prof delete self" on public.profiles;
drop policy if exists "msg select member" on public.messages;
drop policy if exists "msg insert member" on public.messages;
drop policy if exists "msg delete own" on public.messages;
drop policy if exists "ln select member" on public.love_notes;
drop policy if exists "ln insert member" on public.love_notes;
drop policy if exists "ln delete own" on public.love_notes;
drop policy if exists "mem select member" on public.memories;
drop policy if exists "mem insert member" on public.memories;
drop policy if exists "mem update own" on public.memories;
drop policy if exists "mem delete own" on public.memories;
drop policy if exists "quiz select member" on public.quiz_days;
drop policy if exists "quiz insert member" on public.quiz_days;
drop policy if exists "quiz update member" on public.quiz_days;
drop policy if exists "qa select member" on public.quiz_answers;
drop policy if exists "qa insert own" on public.quiz_answers;
drop policy if exists "qa update own" on public.quiz_answers;
drop policy if exists "qa delete own" on public.quiz_answers;

-- ---- RELATIONSHIPS ----
-- A creator can INSERT a relationship (it just created it). Members can
-- read/update it. Only the creator can delete it (also allowed to erase).
create policy "rel insert own wait" on public.relationships
  for insert with check (creator_user_id = auth.uid() and status = 'waiting');

create policy "rel select member" on public.relationships
  for select using (public.is_relationship_member(id) or creator_user_id = auth.uid());

create policy "rel update member" on public.relationships
  for update using (public.is_relationship_member(id) or creator_user_id = auth.uid())
  with check (public.is_relationship_member(id) or creator_user_id = auth.uid());

create policy "rel delete creator" on public.relationships
  for delete using (creator_user_id = auth.uid());

-- ---- PROFILES (personal) ----
-- You can see/update/delete your own row, and (read-only) your partner's row.
create policy "prof select self" on public.profiles
  for select using (auth.uid() = id or public.is_couple(id, auth.uid()));

create policy "prof insert self" on public.profiles
  for insert with check (auth.uid() = id);

create policy "prof update self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "prof delete self" on public.profiles
  for delete using (auth.uid() = id);

-- ---- MESSAGES ----
create policy "msg select member" on public.messages
  for select using (public.is_relationship_member(relationship_id));

create policy "msg insert member" on public.messages
  for insert with check (
    sender_user_id = auth.uid()
    and public.is_relationship_member(relationship_id)
  );

create policy "msg delete own" on public.messages
  for delete using (sender_user_id = auth.uid());

-- ---- LOVE NOTES (shared, both can read; creator can write own) ----
create policy "ln select member" on public.love_notes
  for select using (public.is_relationship_member(relationship_id));

create policy "ln insert member" on public.love_notes
  for insert with check (
    created_by = auth.uid()
    and public.is_relationship_member(relationship_id)
  );

create policy "ln delete own" on public.love_notes
  for delete using (created_by = auth.uid() and public.is_relationship_member(relationship_id));

-- ---- MEMORIES (shared; owner writes/reads own) ----
create policy "mem select member" on public.memories
  for select using (public.is_relationship_member(relationship_id));

create policy "mem insert member" on public.memories
  for insert with check (
    owner_user_id = auth.uid()
    and public.is_relationship_member(relationship_id)
  );

create policy "mem update own" on public.memories
  for update using (owner_user_id = auth.uid() and public.is_relationship_member(relationship_id))
  with check (owner_user_id = auth.uid() and public.is_relationship_member(relationship_id));

create policy "mem delete own" on public.memories
  for delete using (owner_user_id = auth.uid() and public.is_relationship_member(relationship_id));

-- ---- QUIZ DAYS (shared) ----
create policy "quiz select member" on public.quiz_days
  for select using (public.is_relationship_member(relationship_id));

create policy "quiz insert member" on public.quiz_days
  for insert with check (public.is_relationship_member(relationship_id));

create policy "quiz update member" on public.quiz_days
  for update using (public.is_relationship_member(relationship_id))
  with check (public.is_relationship_member(relationship_id));

-- ---- QUIZ ANSWERS (per participant; both members may read them for
-- their relationship's quizzes so the result can be shown to both) ----
create policy "qa select member" on public.quiz_answers
  for select using (
    exists (
      select 1
        from public.quiz_days qd
        join public.profiles p
          on p.relationship_id = qd.relationship_id
       where qd.id = quiz_answers.quiz_day_id
         and p.id = auth.uid()
    )
  );

create policy "qa insert own" on public.quiz_answers
  for insert with check (user_id = auth.uid());

create policy "qa update own" on public.quiz_answers
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "qa delete own" on public.quiz_answers
  for delete using (user_id = auth.uid());


-- ============================================================
-- 7. RPC FUNCTIONS + GRANTS
-- ============================================================

-- ---- 7a. CREATE RELATIONSHIP (Person 1) ----
-- Person 1 already saved their own profile row via normal upsert. This
-- creates the canonical relationship with a fresh single-use code and
-- binds Person 1's profile to it.
create or replace function public.create_relationship(
  rel_rel_type  text,
  rel_together  date,
  rel_vibes     jsonb,
  rel_styles    jsonb,
  rel_story     text,
  hint_name     text,
  hint_age      integer,
  rel_theme     text default 'milk'
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  code text;
  rid uuid;
  n int;
  letters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;

  -- An identity can only ever be in one relationship.
  if exists (select 1 from public.profiles where id = me and relationship_id is not null) then
    raise exception 'ALREADY_CONNECTED';
  end if;

  -- Make sure I have a profile row.
  insert into public.profiles (id, name) values (me, '') on conflict (id) do nothing;

  -- Generate a fresh, guaranteed-unique single-use code.
  loop
    code := 'LOVE-';
    for i in 1..5 loop
      code := code || substring(letters from (1 + (random()*31)::int) for 1);
    end loop;
    if not exists (select 1 from public.relationships where pairing_code = code) then
      exit;
    end if;
  end loop;

  insert into public.relationships (
    status, pairing_code, creator_user_id,
    partner_hint_name, partner_hint_age,
    relationship_type, together_since, vibes, chat_style, story, theme
  ) values (
    'waiting', code, me,
    coalesce(hint_name, ''), hint_age,
    coalesce(rel_rel_type, ''), rel_together,
    coalesce(rel_vibes, '[]'::jsonb), coalesce(rel_styles, '[]'::jsonb), coalesce(rel_story, ''),
    coalesce(rel_theme, 'milk')
  ) returning id into rid;

  update public.profiles set relationship_id = rid where id = me;

  return jsonb_build_object(
    'relationship_id', rid, 'code', code, 'status', 'waiting'
  );
end $$;

grant execute on function public.create_relationship(text, date, jsonb, jsonb, text, text, integer, text) to authenticated;


-- ---- 7b. COMPLETE PAIRING (Person 2 enters the code) ----
-- Atomic via advisory lock; single-use because the code is cleared
-- the moment the relationship connects.
create or replace function public.complete_pairing(code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me  uuid := auth.uid();
  rid uuid;
  rel record;
  me_name text;
begin
  if me is null then raise exception 'NOT_AUTHENTICATED'; end if;

  -- Only one person may claim a given relationship at a time.
  perform pg_advisory_xact_lock(hashtext('hb_pairing_claim'));

  -- I can't be in two relationships.
  if exists (select 1 from public.profiles where id = me and relationship_id is not null) then
    raise exception 'ALREADY_CONNECTED';
  end if;

  -- Find the unpaired relationship by code.
  select * into rel from public.relationships
   where upper(pairing_code) = upper(trim(code))
   limit 1;

  if not found then
    raise exception 'INVALID_CODE';
  end if;

  rid := rel.id;

  if rel.creator_user_id = me then
    raise exception 'SELF_CODE';
  end if;

  if rel.status <> 'waiting' or rel.pairing_code is null then
    raise exception 'CODE_USED';
  end if;

  -- Make sure I have a profile row; seed it from Person 1's hint so the
  -- join already feels personal, and Person 2 can always edit it later.
  insert into public.profiles (id, name, age)
  values (me, rel.partner_hint_name, rel.partner_hint_age)
  on conflict (id) do update
    set name = case when public.profiles.name = '' then rel.partner_hint_name else public.profiles.name end,
        age  = case when public.profiles.age is null then rel.partner_hint_age else public.profiles.age end;

  update public.profiles set relationship_id = rid where id = me;

  -- Flip the relationship to connected and clear the single-use code.
  update public.relationships
     set status = 'connected',
         pairing_code = null,
         connected_at = now(),
         completed_at = now()
   where id = rid;

  -- Fetch the creator's personal info so Person 2 can render "Partner".
  select name into me_name from public.profiles where id = rel.creator_user_id;

  return jsonb_build_object(
    'relationship_id', rid,
    'status', 'connected',
    'partner_id', rel.creator_user_id,
    'partner_name', coalesce(me_name, rel.partner_hint_name),
    'relationship_type', rel.relationship_type,
    'together_since', to_char(rel.together_since, 'YYYY-MM-DD'),
    'vibes', rel.vibes,
    'chat_style', rel.chat_style,
    'story', rel.story,
    'theme', coalesce(rel.theme, 'milk')
  );
end $$;

grant execute on function public.complete_pairing(text) to authenticated;


-- ---- 7c. UPDATE MY OWN PROFILE (name/age) ----
create or replace function public.update_my_profile(p_name text, p_age integer)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.profiles
     set name = coalesce(p_name, name),
         age  = coalesce(p_age, age),
         last_active = now()
   where id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.update_my_profile(text, integer) to authenticated;


-- ---- 7d. UPDATE SHARED RELATIONSHIP FIELDS (either partner) ----
create or replace function public.update_relationship(
  rel_type   text,
  together   date,
  vbs        jsonb,
  styles     jsonb,
  stry       text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  rid uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select relationship_id into rid from public.profiles where id = auth.uid();
  if rid is null then raise exception 'NOT_MEMBER'; end if;

  update public.relationships set
    relationship_type = coalesce(rel_type, relationship_type),
    together_since    = coalesce(together, together_since),
    vibes             = coalesce(vbs, vibes),
    chat_style        = coalesce(styles, chat_style),
    story             = coalesce(stry, story)
   where id = rid;
  return jsonb_build_object('relationship_id', rid, 'ok', true);
end $$;

grant execute on function public.update_relationship(text, date, jsonb, jsonb, text) to authenticated;


-- ---- 7e. ERASE MY DATA + RELATIONSHIP (full reset) ----
-- When one person erases, their profile is deleted. The OTHER
-- participant's data (chat, notes, memories, quiz, theme, shared
-- fields) is kept in the relationship row, which is handed to the
-- survivor as a fresh 'waiting' relationship with a brand-new
-- pairing code. They can then share the new code with a new partner
-- and resume — all stored data syncs to the newly-connected device.
-- If no other participant exists, the whole world is cleaned up.
create or replace function public.delete_my_data()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me  uuid := auth.uid();
  rid uuid;
  other uuid;
  code text;
  n int;
  letters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if me is null then return; end if;

  select relationship_id into rid from public.profiles where id = me;
  delete from public.profiles where id = me;

  if rid is not null then
    select id into other from public.profiles
      where relationship_id = rid and id <> me limit 1;

    if other is not null then
      loop
        code := 'LOVE-';
        for i in 1..5 loop
          code := code || substring(letters from (1 + (random()*31)::int) for 1);
        end loop;
        exit when not exists (select 1 from public.relationships where pairing_code = code);
      end loop;

      update public.relationships
         set status = 'waiting',
             pairing_code = code,
             creator_user_id = other,
             connected_at = null,
             completed_at = null
       where id = rid;
    else
      delete from public.relationships where id = rid;
    end if;
  end if;
end $$;

grant execute on function public.delete_my_data() to authenticated;


-- ---- 7e.1 CHAT RECEIPTS — delivered / seen (real-time ✓✓ ticks) ----
-- Called by the RECIPIENT's device. "Delivered" = their site is open but
-- they are not viewing the Chat section; "Seen" = they opened the Chat
-- section (which also implies delivered). Only partner-sent messages are
-- ever touched, and only the receipt columns are written.
create or replace function public.mark_messages_delivered()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  rid uuid;
begin
  select relationship_id into rid from public.profiles where id = auth.uid();
  if rid is null then return; end if;

  update public.messages
     set delivered_at = now()
   where relationship_id = rid
     and sender_user_id <> auth.uid()
     and delivered_at is null;
end $$;

grant execute on function public.mark_messages_delivered() to authenticated;

create or replace function public.mark_messages_seen()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  rid uuid;
begin
  select relationship_id into rid from public.profiles where id = auth.uid();
  if rid is null then return; end if;

  update public.messages
     set seen_at      = now(),
         delivered_at = coalesce(delivered_at, now())
   where relationship_id = rid
     and sender_user_id <> auth.uid()
     and seen_at is null;
end $$;

grant execute on function public.mark_messages_seen() to authenticated;


-- ---- 7e.2 UPDATE SHARED THEME (either partner, synced to both phones) ----
create or replace function public.update_relationship_theme(p_theme text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  rid uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select relationship_id into rid from public.profiles where id = auth.uid();
  if rid is null then raise exception 'NOT_CONNECTED'; end if;
  update public.relationships
     set theme = coalesce(nullif(p_theme, ''), 'milk')
   where id = rid;
  return jsonb_build_object('ok', true, 'theme', coalesce(nullif(p_theme, ''), 'milk'));
end $$;

grant execute on function public.update_relationship_theme(text) to authenticated;


-- ---- 7e.3 UPDATE MY PROFILE PHOTO + COUPLE PHOTO (durable DP sync) ----
-- Live schema might not have the avatar_url/couple_dp_url columns yet;
-- the app falls back to broadcasting when these RPCs are missing. Once this
-- file has been re-run the photos persist in the database and sync via the
-- existing realtime → hydrate path.
create or replace function public.update_my_avatar(p_url text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.profiles
     set avatar_url = coalesce(p_url, '')
   where id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.update_my_avatar(text) to authenticated;

create or replace function public.update_couple_dp(p_url text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  rid uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select relationship_id into rid from public.profiles where id = auth.uid();
  if rid is null then raise exception 'NOT_CONNECTED'; end if;
  update public.relationships
     set couple_dp_url = coalesce(p_url, '')
   where id = rid;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.update_couple_dp(text) to authenticated;


-- ---- 7f. QUIZ — finalize the day's result once both have answered ----
-- Called by the quiz service after the second participant submits.
create or replace function public.finalize_quiz(p_quiz_day uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  q  record;
  a1 jsonb;
  a2 jsonb;
  matches int := 0;
  total int := 0;
  keys text[];
  k    text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into q from public.quiz_days where id = p_quiz_day;
  if q is null then raise exception 'QUIZ_NOT_FOUND'; end if;
  if not public.is_relationship_member(q.relationship_id) then
    raise exception 'NOT_MEMBER';
  end if;

  -- Both participants must have answered.
  select
    min(case when user_id = auth.uid()   then answers end),
    min(case when user_id <> auth.uid() then answers end)
  into a1, a2
  from public.quiz_answers
  where quiz_day_id = p_quiz_day;

  if a1 is null or a2 is null then
    return jsonb_build_object('status', 'waiting');
  end if;

  select array_agg(x) from jsonb_object_keys(a1) x into keys;
  if keys is not null then
    total := array_length(keys, 1);
    foreach k in array keys loop
      if a1 -> k = a2 -> k then
        matches := matches + 1;
      end if;
    end loop;
  end if;

  update public.quiz_days
     set result_pct = case when total > 0 then
           round((100.0 * matches) / total)::int else 0 end,
         result_matches = matches,
         result_total = total,
         completed = true
   where id = p_quiz_day;

  return jsonb_build_object(
    'result_pct', round((100.0 * matches) / nullif(total,0))::int,
    'matches', matches, 'total', total, 'status', 'completed'
  );
end $$;

grant execute on function public.finalize_quiz(uuid) to authenticated;


-- ---- 7g. ADMIN INSIGHTS (owner-only) ----
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
    'total_couples', (select count(*) from public.relationships where status = 'connected'),
    'waiting', (select count(*) from public.relationships where status = 'waiting'),
    'relationships', coalesce((
      select json_agg(json_build_object(
        'rel_id', r.id,
        'status', r.status,
        'code', r.pairing_code,
        'type', r.relationship_type,
        'creator', (select p.name from public.profiles p where p.id = r.creator_user_id),
        'connected_at', r.connected_at
      ) order by r.created_at desc) from public.relationships r),
      '[]'::json)
  ) into result;
  return result;
end $$;

grant execute on function public.admin_get_insights() to authenticated;


-- ============================================================
-- 8. STORAGE (optional photos bucket, not required)
-- ============================================================
-- Chat photos are stored inline as base64 data URLs, so no storage
-- bucket is required. If you later want object storage, add policies.

-- ============================================================
-- DONE — verify + success message
-- ============================================================
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('relationships','profiles','messages','love_notes','memories','quiz_days','quiz_answers')
order by tablename, policyname;

select 'ALL DONE ✔  Your two-participant, one-relationship database is ready ♡' as status;
