-- ============================================================
-- STEP 0: FIX INFINITE RECURSION ON profiles
-- Run this FIRST — fixes the "infinite recursion detected" error
-- ============================================================

-- 1. Drop ALL policies on profiles (old + new, all names)
drop policy if exists "profiles select self" on public.profiles;
drop policy if exists "profiles select member" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;
drop policy if exists "Paired partners can read each other's profiles" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can create own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- 2. Drop ALL policies on messages
drop policy if exists "messages select own pair" on public.messages;
drop policy if exists "messages insert own pair" on public.messages;
drop policy if exists "messages delete own" on public.messages;

-- 3. Drop ALL policies on activity (old + new)
drop policy if exists "activity select own" on public.activity;
drop policy if exists "activity insert own" on public.activity;
drop policy if exists "Users can view own activity" on public.activity;
drop policy if exists "Users can create own activity" on public.activity;

-- 4. Drop old functions
drop function if exists public.my_partner_id();
drop function if exists public.is_couple_pair(uuid, uuid);

-- 5. Create SECURITY DEFINER helper — bypasses RLS, breaks the recursion loop
create function public.my_partner_id()
returns uuid
language sql security definer set search_path = public
stable
as $$
  select partner_id from public.profiles where id = auth.uid();
$$;

-- 6. Recreate profiles RLS
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

-- 7. Create couple pair check (SECURITY DEFINER)
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

-- 8. Recreate messages RLS
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

-- 9. Recreate activity RLS
alter table public.activity enable row level security;

create policy "activity select own" on public.activity
  for select using (auth.uid() = user_id);

create policy "activity insert own" on public.activity
  for insert with check (auth.uid() = user_id);

-- 10. Drop old storage functions/policies that depend on is_couple_pair
drop policy if exists "relationship-media select pair" on storage.objects;
drop policy if exists "relationship-media insert pair" on storage.objects;
drop policy if exists "relationship-media update pair" on storage.objects;
drop policy if exists "relationship-media delete pair" on storage.objects;
drop function if exists storage.storage_pair_ok(text);

select 'STEP 0 DONE — All old broken policies removed, recursion fixed' as status;
