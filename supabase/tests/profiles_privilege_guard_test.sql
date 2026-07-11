-- Regression tests for security fix C2 (protect_profile_privilege_fields).
--
-- Proves:
--   1. A normal (non-admin) authenticated user CAN update allowed fields
--      (name, phone, avatar_url, avatar_path).
--   2. A normal user CANNOT change role.
--   3. A normal user CANNOT change customer_type.
--   4. A normal user CANNOT archive or soft-delete themselves.
--   5. An admin authenticated user CAN change protected fields (e.g. archived).
--   6. The service_role / backend context CAN change protected fields.
--   7. get_user_role() still returns the genuine admin role (verifyAdminRole path).
--
-- SAFETY: runs entirely inside a single transaction that is ROLLED BACK at the
-- end. Run against a Supabase preview/staging branch -- do NOT run against
-- production. Requires the migration 20260711000000 to be applied first.
--
-- Usage (staging/branch):
--   psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/profiles_privilege_guard_test.sql

begin;

-- Simulate the Supabase auth helper roles used by RLS/triggers.
-- These roles already exist in a Supabase database.
set local role postgres;

-- --- Fixtures: one normal user, one admin -----------------------------------
insert into public.profiles (id, email, name, role, customer_type, archived, deleted)
values
  ('00000000-0000-0000-0000-0000000000aa', 'c2_normal@test.local', 'Normal', 'customer', 'auth_user', false, false),
  ('00000000-0000-0000-0000-0000000000bb', 'c2_admin@test.local',  'Admin',  'admin',    'admin',      false, false);

-- Helper to impersonate an authenticated user: set the jwt claims + role.
create or replace function pg_temp.act_as(p_uid uuid, p_role text default 'authenticated')
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', p_role)::text, true);
  execute format('set local role %I', p_role);
end;
$$;

create or replace function pg_temp.reset_to_admin_db()
returns void language plpgsql as $$
begin
  set local role postgres;
  perform set_config('request.jwt.claims', '', true);
end;
$$;

do $$
declare
  v_role text;
  v_ok boolean;
begin
  -- ================= TEST 1: normal user updates allowed fields ==============
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  update public.profiles
    set name = 'Normal Updated', phone = '+66123456789',
        avatar_url = 'https://x/y.png', avatar_path = 'aa/y.png'
    where id = '00000000-0000-0000-0000-0000000000aa';
  perform pg_temp.reset_to_admin_db();
  select name into v_role from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_role <> 'Normal Updated' then
    raise exception 'TEST 1 FAILED: allowed field update did not persist (name=%)', v_role;
  end if;
  raise notice 'TEST 1 PASSED: normal user updated allowed fields';

  -- ================= TEST 2: normal user cannot change role =================
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000aa');
  v_ok := false;
  begin
    update public.profiles set role = 'admin'
      where id = '00000000-0000-0000-0000-0000000000aa';
  exception when others then
    v_ok := true;  -- expected: blocked (grant or trigger)
  end;
  perform pg_temp.reset_to_admin_db();
  if not v_ok then
    raise exception 'TEST 2 FAILED: normal user was able to change role';
  end if;
  select role into v_role from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_role <> 'customer' then
    raise exception 'TEST 2 FAILED: role changed to %', v_role;
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
  perform pg_temp.reset_to_admin_db();
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
  perform pg_temp.reset_to_admin_db();
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
  perform pg_temp.reset_to_admin_db();
  if not v_ok then
    raise exception 'TEST 4b FAILED: normal user soft-deleted self';
  end if;
  raise notice 'TEST 4 PASSED: normal user blocked from archiving/deleting self';

  -- ================= TEST 5: admin can change protected fields ==============
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000bb');
  update public.profiles set archived = true
    where id = '00000000-0000-0000-0000-0000000000aa';   -- admin archives the normal user
  perform pg_temp.reset_to_admin_db();
  select archived::text into v_role from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_role <> 'true' then
    raise exception 'TEST 5 FAILED: admin could not archive customer (archived=%)', v_role;
  end if;
  raise notice 'TEST 5 PASSED: admin can archive customers';

  -- ================= TEST 6: service_role / backend can change protected ====
  perform set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  set local role service_role;
  update public.profiles set role = 'admin'
    where id = '00000000-0000-0000-0000-0000000000aa';
  perform pg_temp.reset_to_admin_db();
  select role into v_role from public.profiles where id = '00000000-0000-0000-0000-0000000000aa';
  if v_role <> 'admin' then
    raise exception 'TEST 6 FAILED: service_role could not set role (role=%)', v_role;
  end if;
  raise notice 'TEST 6 PASSED: service_role can manage protected fields';

  -- ================= TEST 7: get_user_role still works for admins ===========
  if public.get_user_role('00000000-0000-0000-0000-0000000000bb') <> 'admin' then
    raise exception 'TEST 7 FAILED: get_user_role no longer returns admin';
  end if;
  raise notice 'TEST 7 PASSED: get_user_role/verifyAdminRole path intact';

  raise notice 'ALL C2 REGRESSION TESTS PASSED';
end $$;

rollback;
