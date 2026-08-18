-- ============================================================
-- STEP 1: ACTIVITY TABLE RLS
-- Users can only see and insert their own activity
-- ============================================================

alter table public.activity enable row level security;

drop policy if exists "activity select own" on public.activity;
create policy "activity select own" on public.activity
  for select using (auth.uid() = user_id);

drop policy if exists "activity insert own" on public.activity;
create policy "activity insert own" on public.activity
  for insert with check (auth.uid() = user_id);

select 'STEP 1 DONE — Activity RLS enabled' as status;
