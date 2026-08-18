-- ============================================================
-- OUR LITTLE WORLD — ONE SHOT SETUP
-- Run this entire file in Supabase SQL Editor (not psql)
-- Safe to re-run (all statements are idempotent)
-- ============================================================


-- ============================================================
-- STEP 0: FIX INFINITE RECURSION ON profiles
-- ============================================================

drop policy if exists "profiles select self" on public.profiles;
drop policy if exists "profiles select member" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;

drop policy if exists "messages select own pair" on public.messages;
drop policy if exists "messages insert own pair" on public.messages;
drop policy if exists "messages delete own" on public.messages;

drop function if exists public.my_partner_id();
drop function if exists public.is_couple_pair(uuid, uuid);

create function public.my_partner_id()
returns uuid
language sql security definer set search_path = public
stable
as $$
  select partner_id from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;

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

alter table public.messages enable row level security;

create policy "messages select own pair" on public.messages
  for select using (public.is_couple_pair(user_a, user_b));

create policy "messages insert own pair" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_couple_pair(user_a, user_b)
  );

create policy "messages delete own" on public.messages
  for delete using (sender_id = auth.uid());


-- ============================================================
-- STEP 1: ACTIVITY TABLE RLS
-- ============================================================

alter table public.activity enable row level security;

drop policy if exists "activity select own" on public.activity;
create policy "activity select own" on public.activity
  for select using (auth.uid() = user_id);

drop policy if exists "activity insert own" on public.activity;
create policy "activity insert own" on public.activity
  for insert with check (auth.uid() = user_id);


-- ============================================================
-- STEP 2: RPC FUNCTIONS
-- ============================================================

drop function if exists public.connect_with_partner(text);
drop function if exists public.delete_my_data();

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

  insert into public.profiles (id) values (me) on conflict (id) do nothing;

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

  if exists (
    select 1 from public.profiles where id = them and partner_id is not null
  ) then
    raise exception 'CODE_USED';
  end if;

  if exists (
    select 1 from public.profiles where id = me and partner_id is not null
  ) then
    raise exception 'ALREADY_CONNECTED';
  end if;

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

  update public.profiles
     set partner_id = null
   where partner_id = me;

  update public.profiles
     set name = '', age = null, partner_id = null,
         pairing_code = null, partner_code = null
   where id = me;
end $$;

grant execute on function public.delete_my_data() to authenticated;

select 'ALL DONE — Recursion fixed, RLS enabled, RPC functions created' as status;
