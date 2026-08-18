-- 1. Show all profiles and their pairing state
select id, name, pairing_code, partner_id, partner_code
from public.profiles;

-- 2. Show all policies on profiles
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'profiles'
order by policyname;

-- 3. Test the RPC directly (replace LOVE-XXXXX with the actual code)
-- Uncomment and run:
-- select public.connect_with_partner('LOVE-XXXXX');
