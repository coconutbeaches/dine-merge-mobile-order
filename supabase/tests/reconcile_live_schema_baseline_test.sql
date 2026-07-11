-- Catalog assertions proving the PRE-C1 / PRE-C2 baseline exists.
-- Run against a database that has 20260707000000_reconcile_live_schema_baseline
-- applied (fresh preview branch), or against production read-only (production
-- already contains this baseline, so every assertion passes there too).
--
--   psql "$DATABASE_URL" -f supabase/tests/reconcile_live_schema_baseline_test.sql
--
-- All statements are read-only (catalog SELECTs + one STABLE function call).

do $$
declare
  n int;
  txt text;
begin
  -- 1) orders RLS enabled -----------------------------------------------------
  select relrowsecurity::int into n from pg_class
    where oid = 'public.orders'::regclass;
  assert n = 1, 'orders RLS is not enabled';

  -- 2) orders baseline policies exist, correct cmd + roles + expressions ------
  -- 2a. Allow users to create their own orders (INSERT, public)
  select count(*) into n from pg_policies
    where schemaname='public' and tablename='orders'
      and policyname='Allow users to create their own orders'
      and cmd='INSERT' and roles = '{public}'
      and with_check = '((auth.uid() = user_id) OR ((user_id IS NULL) AND (guest_user_id IS NOT NULL)))';
  assert n = 1, 'orders INSERT baseline policy missing or altered';

  -- 2b. orders_select_guest_recent_readback (SELECT, anon, 15-min window)
  select count(*) into n from pg_policies
    where schemaname='public' and tablename='orders'
      and policyname='orders_select_guest_recent_readback'
      and cmd='SELECT' and roles = '{anon}'
      and qual = '((user_id IS NULL) AND (guest_user_id IS NOT NULL) AND (created_at >= (now() - ''00:15:00''::interval)))';
  assert n = 1, 'orders anon read-back baseline policy missing or altered';

  -- 2c. orders_select_own_or_admin (SELECT, authenticated)
  select count(*) into n from pg_policies
    where schemaname='public' and tablename='orders'
      and policyname='orders_select_own_or_admin'
      and cmd='SELECT' and roles = '{authenticated}'
      and qual = '((user_id = auth.uid()) OR (get_user_role(auth.uid()) = ''admin''::text))';
  assert n = 1, 'orders_select_own_or_admin baseline policy missing or altered';

  -- 2d. orders_update_own_or_admin (UPDATE, authenticated, USING + WITH CHECK)
  select count(*) into n from pg_policies
    where schemaname='public' and tablename='orders'
      and policyname='orders_update_own_or_admin'
      and cmd='UPDATE' and roles = '{authenticated}'
      and qual = '((user_id = auth.uid()) OR (get_user_role(auth.uid()) = ''admin''::text))'
      and with_check = '((user_id = auth.uid()) OR (get_user_role(auth.uid()) = ''admin''::text))';
  assert n = 1, 'orders_update_own_or_admin baseline policy missing or altered';

  -- 3) get_user_role(uuid): properties ---------------------------------------
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
    where ns.nspname='public' and p.proname='get_user_role'
      and pg_get_function_identity_arguments(p.oid)='user_id uuid'
      and p.provolatile='s'          -- STABLE
      and p.prosecdef                 -- SECURITY DEFINER
      and array_to_string(p.proconfig,'|') = 'search_path=public, pg_temp';
  assert n = 1, 'get_user_role missing or not STABLE/SECURITY DEFINER/fixed search_path';

  -- 3a. no PUBLIC execute
  assert not has_function_privilege('public', 'public.get_user_role(uuid)', 'EXECUTE'),
    'get_user_role must not be executable by PUBLIC';
  assert has_function_privilege('authenticated', 'public.get_user_role(uuid)', 'EXECUTE'),
    'get_user_role should be executable by authenticated';
  assert has_function_privilege('service_role', 'public.get_user_role(uuid)', 'EXECUTE'),
    'get_user_role should be executable by service_role';

  -- 3b. missing profile returns NULL
  select public.get_user_role('00000000-0000-0000-0000-000000000000'::uuid) into txt;
  assert txt is null, 'get_user_role should return NULL for an unknown user';

  -- 4) profiles.deleted: boolean, default false, nullable --------------------
  select count(*) into n from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='deleted'
      and data_type='boolean' and is_nullable='YES' and column_default='false';
  assert n = 1, 'profiles.deleted missing or wrong type/default/nullability';

  raise notice 'OK: all baseline reconciliation assertions passed';
end $$;
