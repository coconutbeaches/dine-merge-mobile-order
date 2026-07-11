-- Security fix C2: prevent authenticated/anon clients from escalating privileges
-- via writes to protected columns on public.profiles.
--
-- Vulnerability chain (verified against production schema):
--   1. `authenticated` (and `anon`) held table-level UPDATE on public.profiles,
--      which implies UPDATE on every column (role, customer_type, archived,
--      deleted, id, email, created_at, ...).
--   2. The self-update RLS policy allows a user to update their own row and does
--      not (and cannot, at the column level) restrict which columns change.
--   3. No trigger guarded the privilege columns.
--   4. get_user_role() / verifyAdminRole() trust profiles.role as the admin signal.
--   => An authenticated non-admin could run
--        update profiles set role = 'admin' where id = auth.uid();
--      and self-promote to admin (and likewise flip customer_type / archived /
--      deleted on their own row).
--   5. INSERT vector (confirmed exploitable in live state): the signup trigger
--      handle_new_user only writes id/email/name, and 110 auth.users currently
--      have NO profiles row. RLS `profiles_insert_own_or_admin` permits
--      (id = auth.uid()), authenticated holds INSERT on all columns, and no
--      trigger guarded INSERT -- so a profileless user could
--        insert into profiles (id, role) values (auth.uid(), 'admin');
--      and self-promote. This is guarded on INSERT below.
--
-- Defense in depth applied here:
--   A. Revoke blanket UPDATE from anon + authenticated; re-grant column-level
--      UPDATE only on the legitimately user-editable columns.
--   B. Add a BEFORE INSERT OR UPDATE trigger that blocks setting/changing
--      role / customer_type / archived / deleted unless the caller is
--      conclusively authorized (signed service_role JWT, or an admin user).
--   C. (Re)create the UPDATE and INSERT RLS policies with USING/WITH CHECK, and
--      set safe column defaults, so the migration is self-contained across
--      freshly repo-provisioned databases (the repo base schema declares
--      `role text` with no default, so a signup-shaped insert would otherwise
--      yield NULL and be rejected by the new INSERT guard).
--
-- Preserved workflows:
--   * Any user editing their own name / phone (SECURITY DEFINER RPC
--     update_profile_details) and avatar (avatar_url / avatar_path / updated_at).
--   * Signup (handle_new_user) which inserts only id/email/name -> safe defaults.
--   * Admins archiving/unarchiving auth-user customers and creating guests via
--     the authenticated client (archived / role='guest').
--   * service_role / server workflows managing any column.
--   * verifyAdminRole(), which reads profiles.role via the service_role client.

begin;

-- ---------------------------------------------------------------------------
-- 0. Prerequisite: public.get_user_role(uuid).
--    The trigger (B) and RLS policies (C) below depend on this function. In
--    production it exists, but in this repo it lives only in migrations_archive,
--    so a freshly repo-provisioned database would FAIL to apply this migration
--    without it. Recreated here idempotently, matching live behavior exactly:
--      * SECURITY DEFINER + STABLE, owned by the migration runner (postgres),
--        so its read of profiles bypasses RLS and does not recurse when the
--        function is itself called from a profiles RLS policy.
--      * fixed search_path, no dynamic SQL.
--      * returns lower(coalesce(role,'customer')) for an existing row, and NULL
--        when no profile exists (NULL <> 'admin', so a missing profile is never
--        treated as admin -- the safe outcome).
--      * returns only the role text; exposes no other profile columns.
--    (The live debug RAISE NOTICE lines are intentionally omitted.)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_role(user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  user_role text;
begin
  select lower(coalesce(role, 'customer')) into user_role
  from public.profiles
  where id = user_id;
  return user_role;
end;
$$;

-- Minimal privileges: only roles that invoke it (directly or via RLS) may run it.
revoke all on function public.get_user_role(uuid) from public;
grant execute on function public.get_user_role(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Safe column defaults (self-contained; independent of live/prod state).
--    Guarantees a signup-shaped insert that omits these columns lands as a
--    non-privileged "customer" row that the INSERT guard in (B) accepts.
-- ---------------------------------------------------------------------------

alter table public.profiles alter column role set default 'customer';
alter table public.profiles alter column archived set default false;
alter table public.profiles alter column deleted set default false;

-- ---------------------------------------------------------------------------
-- A. Grants: remove blanket UPDATE, re-grant only user-editable columns.
--    INSERT grants are intentionally left intact -- signup needs id/email/name
--    and admins (who use the `authenticated` DB role) need `role` for guest
--    creation, so INSERT of protected columns is gated by the trigger in (B),
--    not by column grants (the same rationale as `archived` on UPDATE).
-- ---------------------------------------------------------------------------

-- Remove table-level UPDATE (which implicitly covers all columns).
revoke update on public.profiles from anon;
revoke update on public.profiles from authenticated;

-- Defensively clear any explicit column-level UPDATE grants on protected /
-- non-editable columns (no-op if they only existed via the table grant).
revoke update (id, email, created_at, role, customer_type, deleted)
  on public.profiles from anon;
revoke update (id, email, created_at, role, customer_type, deleted)
  on public.profiles from authenticated;

-- anon has no UPDATE RLS policy and never legitimately writes profiles;
-- strip its remaining column write grants entirely.
revoke update (name, phone, avatar_url, avatar_path, updated_at, archived)
  on public.profiles from anon;

-- Grant back only the columns authenticated sessions legitimately update.
-- `archived` is included because admins toggle it through the authenticated
-- client; the trigger below restricts it to admins only.
grant update (name, phone, avatar_url, avatar_path, updated_at, archived)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- B. Trigger guard on privileged columns (INSERT and UPDATE).
-- ---------------------------------------------------------------------------

create or replace function public.enforce_profiles_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_claims text := nullif(current_setting('request.jwt.claims', true), '');
  v_jwt_role text := coalesce(v_claims::jsonb ->> 'role', '');
  is_privileged boolean;
begin
  -- Conclusively-authorized callers only. A null uid is NOT treated as trusted
  -- (that would silently privilege any future SECURITY DEFINER function with no
  -- user context); authorization must be positively proven via:
  --   * a signed service_role JWT (backend using the service key), or
  --   * an authenticated user whose stored role is actually 'admin'.
  is_privileged := (
    v_jwt_role = 'service_role'
    or (v_uid is not null and public.get_user_role(v_uid) = 'admin')
  );

  if is_privileged then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.role           is distinct from old.role
       or new.customer_type is distinct from old.customer_type
       or new.archived      is distinct from old.archived
       or new.deleted       is distinct from old.deleted then
      raise exception 'Not authorized to modify privileged profile fields (role, customer_type, archived, deleted)'
        using errcode = '42501';
    end if;
  else  -- INSERT: only safe defaults are allowed for non-privileged callers.
    if new.role is distinct from 'customer'
       or new.customer_type is not null
       or coalesce(new.archived, false) is true
       or coalesce(new.deleted, false) is true then
      raise exception 'Not authorized to set privileged profile fields on insert (role, customer_type, archived, deleted)'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.enforce_profiles_privileged_columns() is
  'Security C2: blocks non-admin, non-service-role callers from setting/changing role/customer_type/archived/deleted on profiles (INSERT and UPDATE).';

drop trigger if exists trg_profiles_protect_privileged on public.profiles;
create trigger trg_profiles_protect_privileged
  before insert or update on public.profiles
  for each row
  execute function public.enforce_profiles_privileged_columns();

-- ---------------------------------------------------------------------------
-- C. Self-contained RLS policies (idempotent), so the intended INSERT/UPDATE
--    paths exist regardless of prior environment state and no user is left with
--    column grants but no usable RLS path. The legacy "Users can update own
--    profile" policy had no WITH CHECK; it is dropped in favour of the WITH
--    CHECK variant below.
-- ---------------------------------------------------------------------------

-- INSERT: a user may create their own row; an admin may create any row.
-- (Privileged field values on insert are still gated by the trigger in B.)
-- auth.uid()/get_user_role are wrapped in scalar subselects so the planner
-- evaluates them once per statement (InitPlan) rather than once per row.
drop policy if exists profiles_insert_own_or_admin on public.profiles;
create policy profiles_insert_own_or_admin
  on public.profiles
  for insert
  to authenticated
  with check (
    id = (select auth.uid())
    or (select public.get_user_role((select auth.uid())) = 'admin')
  );

-- UPDATE: own row or admin, enforced for both the old and the new row.
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
  on public.profiles
  for update
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.get_user_role((select auth.uid())) = 'admin')
  )
  with check (
    id = (select auth.uid())
    or (select public.get_user_role((select auth.uid())) = 'admin')
  );

commit;
