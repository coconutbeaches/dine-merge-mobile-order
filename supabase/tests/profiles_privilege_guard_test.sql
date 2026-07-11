-- Regression tests for security fix C2 (protect_profile_privilege_fields).
--
-- Proves:
--   1. A normal (non-admin) authenticated user CAN update allowed fields
--      (name, phone, avatar_url, avatar_path) and updated_at ACTUALLY changes.
--   2. A normal user CANNOT change role.
--   3. A normal user CANNOT change customer_type.
--   4. A normal user CANNOT archive or soft-delete themselves.
--   5. An admin authenticated user CAN change protected fields (e.g. archived).
--   6. The service_role / backend context CAN change protected fields.
--   7. get_user_role() still returns the genuine admin role (verifyAdminRole path).
--   8. The replacement UPDATE RLS policy exists with USING + WITH CHECK and
--      allows an intended own-row update end-to-end (RLS + grant + trigger).
--   9. Privileged INSERTs by a profileless normal user are rejected:
--      role='admin', customer_type=<privileged>, archived=true, deleted=true.
--  10. A normal signup-shaped INSERT (omits role) succeeds with safe defaults
--      (role='customer', archived/deleted false) -- exercises the column default.
--  11. Admin / service_role CAN insert privileged rows -- but ONLY under an
--      explicitly trusted context (a non-admin attempt at the same insert fails).
--
-- SAFETY: runs entirely inside a single transaction that is ROLLED BACK at the
-- end. Run against a Supabase preview/staging branch -- do NOT run against
-- production. Requires the migration 20260711000000 to be applied first.
--
-- Usage (staging/branch):
--   psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/profiles_privilege_guard_test.sql

begin;

set local role postgres;

-- --- Impersonation helpers ---------------------------------------------------
-- Authenticated user: set BOTH the aggregated claims JSON and the legacy
-- per-claim GUCs, then SET ROLE so RLS + column grants + trigger all apply.
create or replace function pg_temp.act_as(p_uid uuid, p_role text default 'authenticated')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', p_role)::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  perform set_config('request.jwt.claim.role', p_role, true);
  execute format('set local role %I', p_role);
end;
$$;

-- Trusted backend: signed service_role JWT claim (no end-user sub).
create or replace function pg_temp.act_as_service()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  set local role service_role;
end;
$$;

create or replace function pg_temp.reset_to_db_owner()
returns void language plpgsql as $$
begin
  set local role postgres;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end;
$$;

-- --- Fixtures: created under a TRUSTED (service_role) context, because the
--     INSERT trigger no longer treats a null uid as trusted. updated_at is
--     seeded in the past so TEST 1 can prove it changes. ------------------------
select pg_temp.act_as_service();
insert into public.profiles (id, email, name, role, customer_type, archived, deleted, updated_at)
values
  ('00000000-0000-0000-0000-0000000000aa', 'c2_normal@test.local', 'Normal', 'customer', 'auth_user', false, false, timestamptz '2000-01-01 00:00:00+00'),
  ('00000000-0000-0000-0000-0000000000bb', 'c2_admin@test.local',  'Admin',  'admin',    'admin',      false, false, timestamptz '2000-01-01 00:00:00+00');
select pg_temp.reset_to_db_owner();

do $$
declare
  v_txt text;
  v_ok boolean;
  v_prev_updated timestamptz;
  v_new_updated timestamptz;
  v_policy_count int;
begin
  -- ===== TEST 0: prerequisite get_user_role + policies exist on a fresh env ===
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_user_role'
      and pg_get_function_identity_arguments(p.oid) = 'user_id uuid'
  ) then
    raise exception 'TEST 0 FAILED: public.get_user_role(uuid) does not exist after migration';
  end if;
  if public.get_user_role('00000000-0000-0000-0000-0000000000aa') <> 'customer' then
    raise exception 'TEST 0 FAILED: a customer did not resolve to ''customer''';
  end if;
  if public.get_user_role('00000000-0000-0000-0000-0000000000bb') <> 'admin' then
    raise exception 'TEST 0 FAILED: an admin did not resolve to ''admin''';
  end if;
  if public.get_user_role('99999999-9999-9999-9999-999999999999') is not null then
    raise exception 'TEST 0 FAILED: a missing profile did not return NULL (safe non-admin value)';
  end if;
  select count(*) into v_policy_count from pg_policies
  where schemaname = 'public' and tablename = 'profiles'
    and policyname in ('profiles_insert_own_or_admin', 'profiles_update_own_or_admin');
  if v_policy_count <> 2 then
    raise exception 'TEST 0 FAILED: INSERT and UPDATE policies were not both created (count=%)', v_policy_count;
  end if;
  raise notice 'TEST 0 PASSED: get_user_role(uuid) + INSERT/UPDATE policies exist; role resolution correct';

  -- get_user_role exposes ONLY the role; a normal user still cannot read another
  -- user's profile row/columns directly (RLS SELECT remains restrictive).
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  select count(*) into v_policy_count
    from public.profiles where id = '00000000-0000-0000-0000-0000000000bb';
  perform pg_temp.reset_to_db_owner();
  if v_policy_count <> 0 then
    raise exception 'TEST 0b FAILED: a normal user could read another profile row (data exposure)';
  end if;
  raise notice 'TEST 0b PASSED: get_user_role leaks only role; RLS still blocks reading other profiles';

  -- ===== TEST 11a (negative): privileged fixture insert fails when UNtrusted ==
  -- Proves the admin/service fixtures above succeeded *because* of the trusted
  -- context, not by accident: the same shape as a normal user is rejected.
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000ee');
  v_ok := false;
  begin
    insert into public.profiles (id, email, name, role)
    values ('00000000-0000-0000-0000-0000000000ee', 'c2_ee@test.local', 'EE', 'admin');
  exception when sqlstate '42501' then   -- insufficient_privilege (trigger/RLS)
    v_ok := true;
  end;
  perform pg_temp.reset_to_db_owner();
  if not v_ok then
    raise exception 'TEST 11a FAILED: privileged insert succeeded under an untrusted context';
  end if;
  if (select count(*) from public.profiles where id in
        ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000000bb')) <> 2 then
    raise exception 'FIXTURE SETUP FAILED: trusted-context fixtures were not created';
  end if;
  raise notice 'TEST 11a PASSED: privileged fixture creation requires a trusted context';

  -- ===== TEST 8 (pre): replacement UPDATE RLS policy exists ==================
  select count(*) into v_policy_count
  from pg_policies
  where schemaname = 'public' and tablename = 'profiles'
    and policyname = 'profiles_update_own_or_admin'
    and cmd = 'UPDATE'
    and qual is not null and with_check is not null;
  if v_policy_count <> 1 then
    raise exception 'TEST 8 FAILED: profiles_update_own_or_admin UPDATE policy with USING+WITH CHECK not found (count=%)', v_policy_count;
  end if;
  raise notice 'TEST 8a PASSED: replacement UPDATE policy exists with USING + WITH CHECK';

  -- ===== TEST 1: normal user updates allowed fields; updated_at changes ======
  select updated_at into v_prev_updated from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  update public.profiles
    set name = 'Normal Updated', phone = '+66123456789',
        avatar_url = 'https://x/y.png', avatar_path = 'aa/y.png',
        updated_at = clock_timestamp()   -- included on purpose: proves the updated_at grant
    where id = '00000000-0000-0000-0000-0000000000aa';
  perform pg_temp.reset_to_db_owner();
  select name, updated_at into v_txt, v_new_updated
    from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_txt <> 'Normal Updated' then
    raise exception 'TEST 1 FAILED: allowed field update did not persist (name=%)', v_txt;
  end if;
  if v_new_updated is not distinct from v_prev_updated or v_new_updated <= v_prev_updated then
    raise exception 'TEST 1 FAILED: updated_at did not change (prev=%, new=%)', v_prev_updated, v_new_updated;
  end if;
  raise notice 'TEST 1 PASSED: normal user updated allowed fields; updated_at changed';
  raise notice 'TEST 8b PASSED: RLS policy allowed the intended own-row update end-to-end';

  -- ===== TEST 2: normal user cannot change role =============================
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  v_ok := false;
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000aa';
  exception when sqlstate '42501' then v_ok := true; end;   -- insufficient_privilege (grant/RLS/trigger)
  perform pg_temp.reset_to_db_owner();
  if not v_ok then raise exception 'TEST 2 FAILED: normal user changed role'; end if;
  select role into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_txt <> 'customer' then raise exception 'TEST 2 FAILED: role changed to %', v_txt; end if;
  raise notice 'TEST 2 PASSED: normal user blocked from changing role';

  -- ===== TEST 3: normal user cannot change customer_type ====================
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  v_ok := false;
  begin
    update public.profiles set customer_type = 'admin' where id = '00000000-0000-0000-0000-0000000000aa';
  exception when sqlstate '42501' then v_ok := true; end;   -- insufficient_privilege (grant/RLS/trigger)
  perform pg_temp.reset_to_db_owner();
  if not v_ok then raise exception 'TEST 3 FAILED: normal user changed customer_type'; end if;
  raise notice 'TEST 3 PASSED: normal user blocked from changing customer_type';

  -- ===== TEST 4: normal user cannot archive/delete self =====================
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  v_ok := false;
  begin
    update public.profiles set archived = true where id = '00000000-0000-0000-0000-0000000000aa';
  exception when sqlstate '42501' then v_ok := true; end;   -- insufficient_privilege (grant/RLS/trigger)
  perform pg_temp.reset_to_db_owner();
  if not v_ok then raise exception 'TEST 4a FAILED: normal user archived self'; end if;

  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  v_ok := false;
  begin
    update public.profiles set deleted = true where id = '00000000-0000-0000-0000-0000000000aa';
  exception when sqlstate '42501' then v_ok := true; end;   -- insufficient_privilege (grant/RLS/trigger)
  perform pg_temp.reset_to_db_owner();
  if not v_ok then raise exception 'TEST 4b FAILED: normal user soft-deleted self'; end if;
  raise notice 'TEST 4 PASSED: normal user blocked from archiving/deleting self';

  -- ===== TEST 5: admin can change protected fields ==========================
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000bb');
  update public.profiles set archived = true where id = '00000000-0000-0000-0000-0000000000aa';
  perform pg_temp.reset_to_db_owner();
  select archived::text into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_txt <> 'true' then raise exception 'TEST 5 FAILED: admin could not archive (archived=%)', v_txt; end if;
  raise notice 'TEST 5 PASSED: admin can archive customers';

  -- ===== TEST 6: service_role can change protected fields ===================
  perform pg_temp.act_as_service();
  update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000aa';
  perform pg_temp.reset_to_db_owner();
  select role into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_txt <> 'admin' then raise exception 'TEST 6 FAILED: service_role could not set role (role=%)', v_txt; end if;
  raise notice 'TEST 6 PASSED: service_role can manage protected fields';

  -- ===== TEST 7: get_user_role still works for admins =======================
  if public.get_user_role('00000000-0000-0000-0000-0000000000bb') <> 'admin' then
    raise exception 'TEST 7 FAILED: get_user_role no longer returns admin';
  end if;
  raise notice 'TEST 7 PASSED: get_user_role/verifyAdminRole path intact';

  -- ===== TEST 9: profileless user cannot self-insert privileged fields =======
  -- id ...cc has no profile row (simulates the profileless auth users). Each
  -- failed insert is rolled back by its exception block, so ...cc stays
  -- profileless for the safe-default insert in TEST 10.
  -- 9a: role='admin'
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000cc');
  v_ok := false;
  begin
    insert into public.profiles (id, email, name, role)
    values ('00000000-0000-0000-0000-0000000000cc', 'c2_evil@test.local', 'Evil', 'admin');
  exception when sqlstate '42501' then v_ok := true; end;   -- insufficient_privilege (grant/RLS/trigger)
  perform pg_temp.reset_to_db_owner();
  if not v_ok then raise exception 'TEST 9a FAILED: inserted role=admin'; end if;

  -- 9b: privileged customer_type
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000cc');
  v_ok := false;
  begin
    insert into public.profiles (id, email, name, customer_type)
    values ('00000000-0000-0000-0000-0000000000cc', 'c2_evil@test.local', 'Evil', 'admin');
  exception when sqlstate '42501' then v_ok := true; end;   -- insufficient_privilege (grant/RLS/trigger)
  perform pg_temp.reset_to_db_owner();
  if not v_ok then raise exception 'TEST 9b FAILED: inserted privileged customer_type'; end if;

  -- 9c: archived=true
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000cc');
  v_ok := false;
  begin
    insert into public.profiles (id, email, name, archived)
    values ('00000000-0000-0000-0000-0000000000cc', 'c2_evil@test.local', 'Evil', true);
  exception when sqlstate '42501' then v_ok := true; end;   -- insufficient_privilege (grant/RLS/trigger)
  perform pg_temp.reset_to_db_owner();
  if not v_ok then raise exception 'TEST 9c FAILED: inserted archived=true'; end if;

  -- 9d: deleted=true
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000cc');
  v_ok := false;
  begin
    insert into public.profiles (id, email, name, deleted)
    values ('00000000-0000-0000-0000-0000000000cc', 'c2_evil@test.local', 'Evil', true);
  exception when sqlstate '42501' then v_ok := true; end;   -- insufficient_privilege (grant/RLS/trigger)
  perform pg_temp.reset_to_db_owner();
  if not v_ok then raise exception 'TEST 9d FAILED: inserted deleted=true'; end if;

  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000cc') then
    raise exception 'TEST 9 FAILED: a malicious insert row persisted';
  end if;
  raise notice 'TEST 9 PASSED: profileless user blocked from all privileged inserts';

  -- ===== TEST 10: normal signup-shaped INSERT succeeds with safe defaults ====
  -- Omits role/customer_type/archived/deleted -> column defaults apply; the
  -- trigger accepts it. Verifies the migration-provided default role='customer'.
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000cc');
  insert into public.profiles (id, email, name)
  values ('00000000-0000-0000-0000-0000000000cc', 'c2_ok@test.local', 'Okay');
  perform pg_temp.reset_to_db_owner();
  select role into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000cc';
  if v_txt <> 'customer' then
    raise exception 'TEST 10 FAILED: safe-default self-insert role=% (expected customer)', v_txt;
  end if;
  if (select coalesce(archived,false) or coalesce(deleted,false)
        from public.profiles where id = '00000000-0000-0000-0000-0000000000cc') then
    raise exception 'TEST 10 FAILED: safe-default insert had archived/deleted set';
  end if;
  raise notice 'TEST 10 PASSED: signup-shaped insert lands as safe customer defaults';

  -- ===== TEST 11b (positive): admin can insert privileged rows ==============
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000bb');  -- admin creates a guest
  insert into public.profiles (id, email, name, role)
  values ('00000000-0000-0000-0000-0000000000dd', 'c2_guest@test.local', 'Guest', 'guest');
  perform pg_temp.reset_to_db_owner();
  select role into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000dd';
  if v_txt <> 'guest' then raise exception 'TEST 11b FAILED: admin could not create guest (role=%)', v_txt; end if;
  raise notice 'TEST 11b PASSED: admin can insert privileged (guest) rows';

  raise notice 'ALL C2 REGRESSION TESTS PASSED';
end $$;

rollback;
