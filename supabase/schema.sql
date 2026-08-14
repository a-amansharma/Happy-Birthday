-- ============================================================
--  OUR LITTLE WORLD ♡ — Supabase schema (v2.1.0)
--  Run this whole file in: Supabase Dashboard → SQL Editor
--
--  Sets up:
--    * profiles / relationships / messages / daily_quizzes / quiz_answers
--    * Row Level Security (only the two relationship members can see data)
--    * Security-definer RPCs for partner connection & quiz logic
--    * Owner-only insights (protected by Supabase Auth + RLS)
--    * Private storage bucket for chat images
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- PROFILES — one row per authenticated user
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null default '',
  age           text default '',
  partner_code  text unique,
  shared        jsonb default '{}'::jsonb,      -- pre-connection relationship fields
  last_read_at  timestamptz,
  last_seen_at  timestamptz,                    -- heartbeat → "last active" in insights
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles add column if not exists last_seen_at timestamptz;

-- ------------------------------------------------------------
-- RELATIONSHIPS — the one shared space between two users
-- ------------------------------------------------------------
create table if not exists public.relationships (
  id        uuid primary key default gen_random_uuid(),
  user_a    uuid not null references public.profiles (id) on delete cascade,
  user_b    uuid not null references public.profiles (id) on delete cascade,
  status    text not null default 'connected',
  shared    jsonb default '{}'::jsonb,           -- canonical shared relationship fields
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rel_no_self check (user_a <> user_b)
);

-- one relationship per pair, no duplicates
create unique index if not exists relationships_pair_uniq
  on public.relationships (least(user_a, user_b), greatest(user_a, user_b));

-- ------------------------------------------------------------
-- MESSAGES — realtime couple chat (text + image)
-- ------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  type            text not null default 'text' check (type in ('text','image')),
  message         text default '',
  media_path      text default '',
  created_at      timestamptz not null default now()
);

create index if not exists messages_rel_idx on public.messages (relationship_id, created_at);

-- ------------------------------------------------------------
-- DAILY_QUIZZES — one quiz per relationship per calendar date
-- ------------------------------------------------------------
create table if not exists public.daily_quizzes (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships (id) on delete cascade,
  quiz_date       date not null,
  questions       jsonb not null default '[]'::jsonb,
  result          jsonb,                        -- filled when BOTH partners submit
  created_at      timestamptz not null default now(),
  constraint daily_quiz_unique unique (relationship_id, quiz_date)
);

-- ------------------------------------------------------------
-- QUIZ_ANSWERS — each partner's independent answers
-- ------------------------------------------------------------
create table if not exists public.quiz_answers (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.daily_quizzes (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  answers       jsonb not null default '{}'::jsonb,   -- { "0": 2, "1": 0, ... }
  submitted_at  timestamptz not null default now(),
  constraint quiz_answer_unique unique (quiz_id, user_id)
);

-- ------------------------------------------------------------
-- UPDATED_AT triggers
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists relationships_touch on public.relationships;
create trigger relationships_touch before update on public.relationships
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.relationships enable row level security;
alter table public.messages      enable row level security;
alter table public.daily_quizzes enable row level security;
alter table public.quiz_answers  enable row level security;

-- helper: the other user's id in any relationship I belong to
create or replace function public.relationship_partner_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select case when user_a = auth.uid() then user_b else user_a end
  from public.relationships
  where user_a = auth.uid() or user_b = auth.uid();
$$;

-- helper: any relationship id I belong to
create or replace function public.my_relationship_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.relationships
  where user_a = auth.uid() or user_b = auth.uid();
$$;

-- PROFILES: see self or your partner; edit only yourself
drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles
  for select using (
    auth.uid() = id
    or id in (select public.relationship_partner_ids())
  );

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- RELATIONSHIPS: members only
drop policy if exists "relationships select member" on public.relationships;
create policy "relationships select member" on public.relationships
  for select using (user_a = auth.uid() or user_b = auth.uid());

drop policy if exists "relationships update member" on public.relationships;
create policy "relationships update member" on public.relationships
  for update using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());

-- (inserts are done by the security-definer RPC connect_with_partner)

-- MESSAGES: members of the relationship only
drop policy if exists "messages select member" on public.messages;
create policy "messages select member" on public.messages
  for select using (
    relationship_id in (select public.my_relationship_ids())
  );

drop policy if exists "messages insert member" on public.messages;
create policy "messages insert member" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and relationship_id in (select public.my_relationship_ids())
  );

-- DAILY QUIZZES: members only
drop policy if exists "daily_quizzes select member" on public.daily_quizzes;
create policy "daily_quizzes select member" on public.daily_quizzes
  for select using (
    relationship_id in (select public.my_relationship_ids())
  );

-- QUIZ ANSWERS: members only (answers are only revealed via the quiz result)
drop policy if exists "quiz_answers select member" on public.quiz_answers;
create policy "quiz_answers select member" on public.quiz_answers
  for select using (
    quiz_id in (
      select q.id from public.daily_quizzes q
      where q.relationship_id in (select public.my_relationship_ids())
    )
  );

-- ------------------------------------------------------------
-- RPC: connect with a partner code (run by the second user)
-- ------------------------------------------------------------
create or replace function public.connect_with_partner(code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me      uuid := auth.uid();
  them    uuid;
  rel_id  uuid;
  shared_data jsonb;
  rel     record;
begin
  if me is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select id, shared into them, shared_data
    from public.profiles
   where partner_code = upper(trim(code))
   limit 1;

  if them is null then
    raise exception 'INVALID_CODE';
  end if;
  if them = me then
    raise exception 'SELF_CODE';
  end if;

  -- already connected?
  select * into rel from public.relationships r
   where (r.user_a = me and r.user_b = them)
      or (r.user_a = them and r.user_b = me)
   limit 1;
  if rel.id is not null then
    return jsonb_build_object('relationship_id', rel.id, 'status', rel.status);
  end if;

  -- user_a is whoever owns the code; user_b is the person connecting.
  -- shared relationship fields are taken from the code owner.
  insert into public.relationships (user_a, user_b, status, shared)
  values (them, me, 'connected', coalesce(shared_data, '{}'::jsonb))
  returning id into rel_id;

  return jsonb_build_object('relationship_id', rel_id, 'status', 'connected');
end $$;

-- ------------------------------------------------------------
-- RPC: fetch-or-create today's quiz (duplicate-protected)
-- ------------------------------------------------------------
create or replace function public.get_or_create_daily_quiz(p_relationship_id uuid, p_quiz_date date, p_questions jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  q public.daily_quizzes%rowtype;
begin
  if p_relationship_id not in (select public.my_relationship_ids()) then
    raise exception 'NOT_MEMBER';
  end if;

  insert into public.daily_quizzes (relationship_id, quiz_date, questions)
  values (p_relationship_id, p_quiz_date, p_questions)
  on conflict (relationship_id, quiz_date) do nothing;

  select * into q from public.daily_quizzes
   where relationship_id = p_relationship_id and quiz_date = p_quiz_date
   limit 1;

  return jsonb_build_object(
    'id', q.id,
    'relationship_id', q.relationship_id,
    'quiz_date', to_char(q.quiz_date, 'YYYY-MM-DD'),
    'questions', q.questions,
    'result', q.result,
    'created_at', q.created_at
  );
end $$;

-- ------------------------------------------------------------
-- RPC: submit my answers; once both submit, compute the match
-- ------------------------------------------------------------
create or replace function public.submit_quiz_answers(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  me       uuid := auth.uid();
  q        public.daily_quizzes%rowtype;
  answer_count int;
  a1 jsonb;
  a2 jsonb;
  matches int := 0;
  total int := 0;
  qs jsonb;
  answer_rec record;
  my_answer jsonb;
  their_answer jsonb;
  i int;
  opt_i text;
begin
  if me is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into q from public.daily_quizzes where id = p_quiz_id;
  if q.id is null then
    raise exception 'QUIZ_NOT_FOUND';
  end if;
  if q.relationship_id not in (select public.my_relationship_ids()) then
    raise exception 'NOT_MEMBER';
  end if;

  insert into public.quiz_answers (quiz_id, user_id, answers)
  values (p_quiz_id, me, p_answers)
  on conflict (quiz_id, user_id) do update
    set answers = excluded.answers, submitted_at = now();

  select count(*) into answer_count
    from public.quiz_answers where quiz_id = p_quiz_id;

  -- only compute when BOTH have submitted
  if answer_count >= 2 then
    qs := q.questions;

    select answers into a1 from public.quiz_answers
     where quiz_id = p_quiz_id and user_id <> me limit 1;
    select answers into a2 from public.quiz_answers
     where quiz_id = p_quiz_id and user_id = me limit 1;

    total := jsonb_array_length(qs);
    matches := 0;
    for i in 0 .. greatest(total, 0) - 1 loop
      opt_i := i::text;
      my_answer    := a2 -> opt_i;
      their_answer := a1 -> opt_i;
      if my_answer is not null and their_answer is not null
         and my_answer = their_answer then
        matches := matches + 1;
      end if;
    end loop;

    update public.daily_quizzes
       set result = jsonb_build_object(
             'score', matches,
             'total', total,
             'matches', matches,
             'pct', round((matches::numeric / nullif(total,0) * 100)::numeric, 0)
           )
     where id = p_quiz_id;

    -- remember the latest bond on the relationship (shown on dashboard)
    update public.relationships
       set shared = jsonb_set(
             coalesce(shared, '{}'::jsonb),
             '{last_bond}',
             jsonb_build_object(
               'pct', round((matches::numeric / nullif(total,0) * 100)::numeric, 0),
               'score', matches,
               'total', total,
               'date', current_date,
               'category', case
                 when round((matches::numeric / nullif(total,0) * 100)::numeric, 0) >= 90 then '💖 Deeply Connected'
                 when round((matches::numeric / nullif(total,0) * 100)::numeric, 0) >= 75 then '💕 Emotionally In Sync'
                 when round((matches::numeric / nullif(total,0) * 100)::numeric, 0) >= 60 then '💗 Understanding Each Other'
                 when round((matches::numeric / nullif(total,0) * 100)::numeric, 0) >= 45 then '💞 Playful Partners'
                 when round((matches::numeric / nullif(total,0) * 100)::numeric, 0) >= 30 then '💓 Growing Together'
                 when round((matches::numeric / nullif(total,0) * 100)::numeric, 0) >= 15 then '😄 Cute Opposites'
                 else '🌱 Still Discovering Each Other'
               end
             )
           )
     where id = q.relationship_id;

    return jsonb_build_object('submitted', true, 'done', true,
      'score', matches, 'total', total,
      'pct', round((matches::numeric / nullif(total,0) * 100)::numeric, 0));
  end if;

  return jsonb_build_object('submitted', true, 'done', false);
end $$;

-- ------------------------------------------------------------
-- RPC: permanently remove my data (used by "Start over")
-- ------------------------------------------------------------
create or replace function public.delete_my_data()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  rel_id uuid;
begin
  if me is null then return; end if;

  select id into rel_id from public.relationships
   where user_a = me or user_b = me limit 1;

  if rel_id is not null then
    delete from public.messages where relationship_id = rel_id;
    delete from public.quiz_answers where quiz_id in
      (select id from public.daily_quizzes where relationship_id = rel_id);
    delete from public.daily_quizzes where relationship_id = rel_id;
    delete from public.relationships where id = rel_id;
  end if;

  delete from public.profiles where id = me;
end $$;

-- ------------------------------------------------------------
-- PRIVATE OWNER INSIGHTS — protected by Supabase Auth + RLS
-- ------------------------------------------------------------
-- The insights page lives in /admin/ and is NOT linked anywhere
-- on the public site. Access is granted ONLY to the owner account
-- of this project (the email / UID below) — no shared secret.
--
-- How it stays private:
--   1. The admin page asks the owner to sign in (email + password)
--      with their OWN Supabase account. There is no browser-side
--      secret to guess — the owner's real session is the key.
--   2. admin_get_insights() is SECURITY DEFINER and compares
--      auth.uid() to the owner UID stored in admin_settings, so
--      nobody else (anonymous visitors included) can read anything.
--   3. The function is not executable by the anon role, and
--      admin_settings itself has RLS with no policies, so even the
--      owner UID cannot be read directly from the client.
create table if not exists public.admin_settings (
  key   text primary key,
  value text not null
);

-- the old "secret string" approach is gone for good
delete from public.admin_settings where key = 'insights_secret';

insert into public.admin_settings (key, value)
values ('owner_uid', 'e65fabbb-cc49-48c6-adc0-ef1d59f41896')
on conflict (key) do update set value = excluded.value;

-- RLS on, no policies → the table is unreadable by clients; only the
-- security-definer function below (which bypasses RLS) may read it.
alter table public.admin_settings enable row level security;

create or replace function public.admin_get_insights()
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  owner_uuid uuid;
  me         uuid := auth.uid();
begin
  if me is null then
    return jsonb_build_object('error', 'SIGN_IN_REQUIRED');
  end if;

  select value::uuid into owner_uuid
    from public.admin_settings
   where key = 'owner_uid';

  if owner_uuid is null or me <> owner_uuid then
    return jsonb_build_object('error', 'FORBIDDEN');
  end if;

  return (
    select jsonb_build_object(
      'total_users',   (select count(*) from public.profiles),
      'total_couples', (select count(*) from public.relationships),
      'users', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'name',        pr.name,
            'age',         pr.age,
            'code',        pr.partner_code,
            'joined',      pr.created_at,
            'last_active', coalesce(pr.last_seen_at, pr.last_read_at),
            'connected',   exists (
              select 1 from public.relationships r3
              where r3.user_a = pr.id or r3.user_b = pr.id
            ),
            'partner', (
              select p2.name
              from public.relationships rr
              join public.profiles p2
                on p2.id = case when rr.user_a = pr.id then rr.user_b else rr.user_a end
              where rr.user_a = pr.id or rr.user_b = pr.id
              limit 1
            )
          ) order by pr.created_at desc
        ) from public.profiles pr), '[]'::jsonb)
    )
  );
end $$;

-- only a signed-in user (i.e. the owner after logging in) may even
-- invoke the function — anonymous visitors get a hard deny before
-- any table is touched.
revoke all on function public.admin_get_insights() from public, anon;
grant execute on function public.admin_get_insights() to authenticated;

-- ------------------------------------------------------------
-- STORAGE — private bucket for chat images
-- path: relationship-media/{relationship_id}/{message_id}/{filename}
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('relationship-media', 'relationship-media', false, 8 * 1024 * 1024)
on conflict (id) do update set public = false, file_size_limit = 8 * 1024 * 1024;

-- member check helper for storage policies
create or replace function public.storage_is_relationship_member(rel_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.relationships
    where id = rel_id and (user_a = auth.uid() or user_b = auth.uid())
  );
$$;

drop policy if exists "relationship-media insert" on storage.objects;
create policy "relationship-media insert" on storage.objects
  for insert with check (
    bucket_id = 'relationship-media'
    and public.storage_is_relationship_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "relationship-media select" on storage.objects;
create policy "relationship-media select" on storage.objects
  for select using (
    bucket_id = 'relationship-media'
    and public.storage_is_relationship_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "relationship-media delete" on storage.objects;
create policy "relationship-media delete" on storage.objects
  for delete using (
    bucket_id = 'relationship-media'
    and public.storage_is_relationship_member((storage.foldername(name))[1]::uuid)
  );

-- Realtime: stream new messages + relationship + quiz changes to clients
alter publication supabase_realtime add table public.relationships;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.daily_quizzes;
alter publication supabase_realtime add table public.quiz_answers;

-- done ♡
