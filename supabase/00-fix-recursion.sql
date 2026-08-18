-- ============================================================
-- STEP 0: FIX INFINITE RECURSION ON profiles
-- Run this FIRST — fixes the "infinite recursion detected" error
-- ============================================================

-- 1. Drop ALL existing policies on profiles
drop policy if exists "profiles select self" on public.profiles;
drop policy if exists "profiles select member" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;

-- 2. Drop ALL existing policies on messages (depend on is_couple_pair)
drop policy if exists "messages select own pair" on public.messages;
drop policy if exists "messages insert own pair" on public.messages;
drop policy if exists "messages delete own" on public.messages;

-- 3. Drop old functions (safe now, no dependents)
drop function if exists public.my_partner_id();
drop function if exists public.is_couple_pair(uuid, uuid);

-- 4. Create SECURITY DEFINER helper — bypasses RLS, breaks the recursion loop
create function public.my_partner_id()
returns uuid
language sql security definer set search_path = public
stable
as $$
  select partner_id from public.profiles where id = auth.uid();
$$;

-- 5. Recreate profiles RLS
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

-- 6. Create couple pair check (SECURITY DEFINER)
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

-- 7. Recreate messages RLS
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

select 'STEP 0 DONE — Recursion fixed' as status;
