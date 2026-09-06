-- ============================================================
-- PAIRING DIAGNOSTIC — run in Supabase SQL Editor, copy output
-- ============================================================

-- 1) Every profile + its pairing state (find your code here)
select name, pairing_code, partner_id, partner_code, created_at
from public.profiles
order by created_at desc;

-- 2) The ACTUAL deployed function (compare with supabase/run-all.sql)
select p.proname,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('connect_with_partner', 'delete_my_data', 'my_partner_id')
order by p.proname;

-- 3) Grants so the app can call the RPC
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'connect_with_partner'
order by grantee;

-- 4) Every RLS policy on profiles (so the RPC / upserts can't be blocked)
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;