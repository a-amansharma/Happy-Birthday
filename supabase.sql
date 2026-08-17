
-- ============================================================
-- HAPPY BIRTHDAY / LITTLE WORLD
-- FRESH SUPABASE DATABASE SETUP
-- ============================================================
--
-- IMPORTANT:
-- This resets:
--   public.profiles
--   public.activity
--
-- Supabase Auth users are NOT deleted.
--
-- This schema matches the JavaScript RPC calls:
--
--   connect_with_partner(code)
--   delete_my_data()
--
-- ============================================================


-- ============================================================
-- 1. CLEAN OLD FUNCTIONS
-- ============================================================

drop function if exists public.admin_get_insights();

drop function if exists public.pair_with_code(text);

drop function if exists public.connect_with_partner(text);

drop function if exists public.delete_my_data();


-- ============================================================
-- 2. CLEAN OLD TABLES
-- ============================================================

drop table if exists public.activity cascade;
drop table if exists public.profiles cascade;


-- ============================================================
-- 3. PROFILES TABLE
-- ============================================================

create table public.profiles (

  id uuid primary key
    references auth.users(id)
    on delete cascade,

  name text not null,

  age integer,

  pairing_code text unique,

  partner_id uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  last_active timestamptz not null
    default now()
);


-- ============================================================
-- 4. ACTIVITY TABLE
-- ============================================================

create table public.activity (

  id bigint generated always as identity primary key,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  event text not null,

  created_at timestamptz not null
    default now()
);


-- ============================================================
-- 5. INDEXES
-- ============================================================

create index profiles_pairing_code_idx
on public.profiles(pairing_code);

create index profiles_partner_id_idx
on public.profiles(partner_id);

create index activity_user_id_idx
on public.activity(user_id);

create index activity_created_at_idx
on public.activity(created_at);


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.activity enable row level security;


-- ============================================================
-- 7. PROFILE POLICIES
-- ============================================================

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
);


create policy "Users can create own profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
);


create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);


create policy "Paired partners can read each other's profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.partner_id = public.profiles.id
  )
);


-- ============================================================
-- 8. ACTIVITY POLICIES
-- ============================================================

create policy "Users can create own activity"
on public.activity
for insert
to authenticated
with check (
  auth.uid() = user_id
);


create policy "Users can view own activity"
on public.activity
for select
to authenticated
using (
  auth.uid() = user_id
);


-- ============================================================
-- 9. CONNECT WITH PARTNER
-- ============================================================
--
-- JavaScript calls:
--
-- HB.db.client().rpc('connect_with_partner', {
--   code: code
-- })
--
-- This function:
--
-- 1. Checks authentication
-- 2. Finds the profile using the pairing code
-- 3. Prevents self-pairing
-- 4. Checks that the current user has a profile
-- 5. Pairs both users
-- 6. Returns partner information
--
-- ============================================================

create or replace function public.connect_with_partner(
  code text
)
returns json
language plpgsql
security definer
set search_path = public
as $$

declare

  current_user_id uuid;
  target_user_id uuid;
  result json;

begin

  -- ----------------------------------------------------------
  -- CHECK AUTHENTICATION
  -- ----------------------------------------------------------

  current_user_id := auth.uid();

  if current_user_id is null then

    raise exception 'Not authenticated';

  end if;


  -- ----------------------------------------------------------
  -- FIND PARTNER USING PAIRING CODE
  -- ----------------------------------------------------------

  select id
  into target_user_id

  from public.profiles

  where pairing_code = upper(trim(code))
    and id <> current_user_id

  limit 1;


  if target_user_id is null then

    raise exception 'Invalid pairing code';

  end if;


  -- ----------------------------------------------------------
  -- CHECK CURRENT USER PROFILE
  -- ----------------------------------------------------------

  if not exists (
    select 1

    from public.profiles

    where id = current_user_id
  ) then

    raise exception 'Current user profile not found';

  end if;


  -- ----------------------------------------------------------
  -- CHECK IF PARTNER IS ALREADY PAIRED
  -- ----------------------------------------------------------

  if exists (
    select 1

    from public.profiles

    where id = target_user_id
      and partner_id is not null
      and partner_id <> current_user_id
  ) then

    raise exception 'This pairing code is already connected to another user';

  end if;


  -- ----------------------------------------------------------
  -- PAIR CURRENT USER
  -- ----------------------------------------------------------

  update public.profiles

  set
    partner_id = target_user_id,
    last_active = now()

  where id = current_user_id;


  -- ----------------------------------------------------------
  -- PAIR TARGET USER
  -- ----------------------------------------------------------

  update public.profiles

  set
    partner_id = current_user_id,
    last_active = now()

  where id = target_user_id;


  -- ----------------------------------------------------------
  -- RETURN PARTNER INFORMATION (full profile for sync)
  -- ----------------------------------------------------------

  select json_build_object(

    'success', true,

    'partner_id', p.id,

    'partner_name', p.name,

    'partner_age', p.age,

    'partner_created_at', p.created_at,

    'partner_code', p.pairing_code

  )

  into result

  from public.profiles p

  where p.id = target_user_id;


  return result;

end;

$$;


-- ============================================================
-- 10. CONNECT FUNCTION PERMISSIONS
-- ============================================================

revoke all
on function public.connect_with_partner(text)
from public;

revoke all
on function public.connect_with_partner(text)
from anon;

grant execute
on function public.connect_with_partner(text)
to authenticated;


-- ============================================================
-- 11. DELETE MY DATA / FRESH START
-- ============================================================
--
-- JavaScript calls:
--
-- HB.db.client().rpc('delete_my_data')
--
-- This removes:
--
-- - Current user's activity
-- - Current user's profile
-- - Their partner relationship
--
-- Because profiles.id references auth.users with ON DELETE CASCADE,
-- deleting the profile does NOT delete the Supabase Auth account.
--
-- The application can therefore create a completely fresh profile
-- after reset.
--
-- ============================================================

create or replace function public.delete_my_data()
returns json
language plpgsql
security definer
set search_path = public
as $$

declare

  current_user_id uuid;
  partner_user_id uuid;

begin

  -- ----------------------------------------------------------
  -- CHECK AUTHENTICATION
  -- ----------------------------------------------------------

  current_user_id := auth.uid();

  if current_user_id is null then

    raise exception 'Not authenticated';

  end if;


  -- ----------------------------------------------------------
  -- FIND CURRENT PARTNER
  -- ----------------------------------------------------------

  select partner_id
  into partner_user_id

  from public.profiles

  where id = current_user_id;


  -- ----------------------------------------------------------
  -- CLEAR PARTNER CONNECTION
  -- ----------------------------------------------------------

  if partner_user_id is not null then

    update public.profiles

    set
      partner_id = null,
      last_active = now()

    where id = partner_user_id;

  end if;


  -- ----------------------------------------------------------
  -- DELETE CURRENT USER ACTIVITY
  -- ----------------------------------------------------------

  delete from public.activity

  where user_id = current_user_id;


  -- ----------------------------------------------------------
  -- DELETE CURRENT USER PROFILE
  -- ----------------------------------------------------------

  delete from public.profiles

  where id = current_user_id;


  -- ----------------------------------------------------------
  -- RETURN SUCCESS
  -- ----------------------------------------------------------

  return json_build_object(

    'success', true,

    'message', 'User data deleted successfully',

    'user_id', current_user_id

  );

end;

$$;


-- ============================================================
-- 12. DELETE FUNCTION PERMISSIONS
-- ============================================================

revoke all
on function public.delete_my_data()
from public;

revoke all
on function public.delete_my_data()
from anon;

grant execute
on function public.delete_my_data()
to authenticated;


-- ============================================================
-- 13. ADMIN INSIGHTS
-- ============================================================

create or replace function public.admin_get_insights()
returns json
language plpgsql
security definer
set search_path = public
as $$

declare

  result json;

begin

  -- ----------------------------------------------------------
  -- OWNER ONLY
  -- ----------------------------------------------------------

  if auth.uid() <> 'e65fabbb-cc49-48c6-adc0-ef1d59f41896'::uuid then

    raise exception 'Unauthorized';

  end if;


  -- ----------------------------------------------------------
  -- BUILD RESULT
  -- ----------------------------------------------------------

  select json_build_object(

    'total_users',

    (
      select count(*)

      from public.profiles
    ),


    'total_couples',

    (
      select count(*)

      from public.profiles

      where partner_id is not null
    ) / 2,


    'users',

    coalesce(

      (

        select json_agg(

          json_build_object(

            'name',
            p.name,

            'age',
            p.age,

            'code',
            p.pairing_code,

            'partner',

            (
              select pp.name

              from public.profiles pp

              where pp.id = p.partner_id
            ),

            'connected',
            p.partner_id is not null,

            'joined',
            p.created_at,

            'last_active',
            p.last_active

          )

          order by p.created_at desc

        )

        from public.profiles p

      ),

      '[]'::json

    )

  )

  into result;


  return result;

end;

$$;


-- ============================================================
-- 14. ADMIN FUNCTION PERMISSIONS
-- ============================================================

revoke all
on function public.admin_get_insights()
from public;

revoke all
on function public.admin_get_insights()
from anon;

grant execute
on function public.admin_get_insights()
to authenticated;


-- ============================================================
-- 15. FINAL VERIFICATION
-- ============================================================

select
  routine_name,
  routine_type

from information_schema.routines

where routine_schema = 'public'

and routine_name in (
  'connect_with_partner',
  'delete_my_data',
  'admin_get_insights'
)

order by routine_name;


select 'DATABASE SETUP COMPLETED SUCCESSFULLY' as status;
