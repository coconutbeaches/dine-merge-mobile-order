-- Regression tests for security fix C2 (protect_profile_privilege_fields).
--
-- Proves:
--   1. A normal (non-admin) authenticated user CAN update allowed fields
--      (name, phone, avatar_url, avatar_path, updated_at).
--   2. A normal user CANNOT change role.
--   3. A normal user CANNOT change customer_type.
--   4. A normal user CANNOT archive or soft-delete themselves.
--   5. An admin authenticated user CAN change protected fields (e.g. archived).
--   6. The service_role / backend context CAN change protected fields.
--   7. get_user_role() still returns the genuine admin role (verifyAdminRole path).
--   8. The replacement UPDATE RLS policy exists with USING + WITH CHECK and
--      allows an intended own-row update end-to-end (RLS + grant + trigger).
--   9. A profileless normal user CANNOT self-insert with role='admin'
--      (or any other protected field) -- the INSERT escalation vector.
--  10. A profileless normal user CAN self-insert a safe-default row (signup shape).
--  11. Admin / service_role CAN insert privileged rows (e.g. role='guest'/'admin').
--
-- SAFETY: runs entirely inside a single transaction that is ROLLED BACK at the
-- end. Run against a Supabase preview/staging branch -- do NOT run against
-- production. Requires the migration 20260711000000 to be applied first.
--
-- Usage (staging/branch):
--   psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/profiles_privilege_guard_test.sql

begin;

set local role postgres;

-- --- Fixtures: one normal user, one admin (both have profile rows) ----------
insert into public.profiles (id, email, name, role, customer_type, archived, deleted)
values
  ('00000000-0000-0000-0000-0000000000aa', 'c2_normal@test.local', 'Normal', 'customer', 'auth_user', false, false),
  ('00000000-0000-0000-0000-0000000000bb', 'c2_admin@test.local',  'Admin',  'admin',    'admin',      false, false);

-- Impersonate an authenticated user: set BOTH the aggregated claims JSON and the
-- legacy per-claim GUCs (request.jwt.claim.sub / .role) that older auth.uid()/
-- auth.role() shims read, then SET ROLE so RLS + column grants + trigger apply.
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

-- service_role context (no end-user sub; signed role claim = service_role).
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

do $$
declare
  v_txt text;
  v_ok boolean;
  v_policy_count int;
begin
  -- ================= TEST 8 (pre): replacement RLS policy exists =============
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

  -- ================= TEST 1: normal user updates allowed fields ==============
  -- `updated_at` is included in the SET list on purpose: if authenticated lacked
  -- the column UPDATE grant, this statement would raise "permission denied for
  -- column updated_at", so its success verifies the allowed updated_at grant.
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  update public.profiles
    set name = 'Normal Updated', phone = '+66123456789',
        avatar_url = 'https://x/y.png', avatar_path = 'aa/y.png',
        updated_at = clock_timestamp()
    where id = '00000000-0000-0000-0000-0000000000aa';
  perform pg_temp.reset_to_db_owner();
  select name into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_txt <> 'Normal Updated' then
    raise exception 'TEST 1 FAILED: allowed field update did not persist (name=%)', v_txt;
  end if;
  raise notice 'TEST 1 PASSED: normal user updated allowed fields incl. updated_at';
  raise notice 'TEST 8b PASSED: RLS policy allowed the intended own-row update end-to-end';

  -- ================= TEST 2: normal user cannot change role =================
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  v_ok := false;
  begin
    update public.profiles set role = 'admin'
      where id = '00000000-0000-0000-0000-0000000000aa';
  exception when others then
    v_ok := true;  -- expected: blocked (grant or trigger)
  end;
  perform pg_temp.reset_to_db_owner();
  if not v_ok then
    raise exception 'TEST 2 FAILED: normal user was able to change role';
  end if;
  select role into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_txt <> 'customer' then
    raise exception 'TEST 2 FAILED: role changed to %', v_txt;
  end if;
  raise notice 'TEST 2 PASSED: normal user blocked from changing role';

  -- ================= TEST 3: normal user cannot change customer_type ========
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  v_ok := false;
  begin
    update public.profiles set customer_type = 'admin'
      where id = '00000000-0000-0000-0000-0000000000aa';
  exception when others then
    v_ok := true;
  end;
  perform pg_temp.reset_to_db_owner();
  if not v_ok then
    raise exception 'TEST 3 FAILED: normal user changed customer_type';
  end if;
  raise notice 'TEST 3 PASSED: normal user blocked from changing customer_type';

  -- ================= TEST 4: normal user cannot archive/delete self =========
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  v_ok := false;
  begin
    update public.profiles set archived = true
      where id = '00000000-0000-0000-0000-0000000000aa';
  exception when others then
    v_ok := true;
  end;
  perform pg_temp.reset_to_db_owner();
  if not v_ok then
    raise exception 'TEST 4a FAILED: normal user archived self';
  end if;

  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  v_ok := false;
  begin
    update public.profiles set deleted = true
      where id = '00000000-0000-0000-0000-0000000000aa';
  exception when others then
    v_ok := true;
  end;
  perform pg_temp.reset_to_db_owner();
  if not v_ok then
    raise exception 'TEST 4b FAILED: normal user soft-deleted self';
  end if;
  raise notice 'TEST 4 PASSED: normal user blocked from archiving/deleting self';

  -- ================= TEST 5: admin can change protected fields ==============
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000bb');
  update public.profiles set archived = true
    where id = '00000000-0000-0000-0000-0000000000aa';   -- admin archives the normal user
  perform pg_temp.reset_to_db_owner();
  select archived::text into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_txt <> 'true' then
    raise exception 'TEST 5 FAILED: admin could not archive customer (archived=%)', v_txt;
  end if;
  raise notice 'TEST 5 PASSED: admin can archive customers';

  -- ================= TEST 6: service_role / backend can change protected ====
  perform pg_temp.act_as_service();
  update public.profiles set role = 'admin'
    where id = '00000000-0000-0000-0000-0000000000aa';
  perform pg_temp.reset_to_db_owner();
  select role into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_txt <> 'admin' then
    raise exception 'TEST 6 FAILED: service_role could not set role (role=%)', v_txt;
  end if;
  raise notice 'TEST 6 PASSED: service_role can manage protected fields';

  -- ================= TEST 7: get_user_role still works for admins ===========
  if public.get_user_role('00000000-0000-0000-0000-0000000000bb') <> 'admin' then
    raise exception 'TEST 7 FAILED: get_user_role no longer returns admin';
  end if;
  raise notice 'TEST 7 PASSED: get_user_role/verifyAdminRole path intact';

  -- ================= TEST 9: profileless user cannot self-insert as admin ====
  -- id ...cc has no profile row (simulates the 110 profileless auth users).
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000cc');
  v_ok := false;
  begin
    insert into public.profiles (id, email, name, role)
    values ('00000000-0000-0000-0000-0000000000cc', 'c2_evil@test.local', 'Evil', 'admin');
  exception when others then
    v_ok := true;  -- expected: trigger blocks role='admin' on insert
  end;
  perform pg_temp.reset_to_db_owner();
  if not v_ok then
    raise exception 'TEST 9 FAILED: profileless user self-inserted role=admin';
  end if;
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000cc') then
    raise exception 'TEST 9 FAILED: malicious insert row persisted';
  end if;
  raise notice 'TEST 9 PASSED: profileless user blocked from inserting role=admin';

  -- ================= TEST 10: profileless user CAN self-insert defaults ======
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000cc');
  insert into public.profiles (id, email, name)
  values ('00000000-0000-0000-0000-0000000000cc', 'c2_ok@test.local', 'Okay');  -- role defaults to 'customer'
  perform pg_temp.reset_to_db_owner();
  select role into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000cc';
  if v_txt <> 'customer' then
    raise exception 'TEST 10 FAILED: safe-default self-insert did not land as customer (role=%)', v_txt;
  end if;
  raise notice 'TEST 10 PASSED: profileless user can self-insert a safe-default row';

  -- ================= TEST 11: admin/service can insert privileged rows =======
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000bb');  -- admin creates a guest
  insert into public.profiles (id, email, name, role)
  values ('00000000-0000-0000-0000-0000000000dd', 'c2_guest@test.local', 'Guest', 'guest');
  perform pg_temp.reset_to_db_owner();
  select role into v_txt from public.profiles where id = '00000000-0000-0000-0000-0000000000dd';
  if v_txt <> 'guest' then
    raise exception 'TEST 11 FAILED: admin could not create guest profile (role=%)', v_txt;
  end if;
  raise notice 'TEST 11 PASSED: admin can insert privileged (guest) rows';

  raise notice 'ALL C2 REGRESSION TESTS PASSED';
end $$;

rollback;
