-- Security fix C2: prevent authenticated/anon clients from escalating privileges
-- via direct writes to protected columns on public.profiles.
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
--
-- Defense in depth applied here:
--   A. Revoke blanket UPDATE from anon + authenticated; re-grant column-level
--      UPDATE only on the legitimately user-editable columns.
--   B. Add a BEFORE UPDATE trigger that blocks changes to role / customer_type /
--      archived / deleted unless the caller is an admin or a privileged
--      backend context (service_role / migrations / SECURITY DEFINER).
--   C. Consolidate the UPDATE RLS policies onto the one that carries WITH CHECK.
--
-- Preserved workflows:
--   * Any user editing their own name / phone (SECURITY DEFINER RPC
--     update_profile_details) and avatar (avatar_url / avatar_path / updated_at).
--   * Admins archiving/unarchiving auth-user customers via the authenticated
--     client (app/admin/customers/page.tsx) -> `archived` column.
--   * service_role / server workflows managing any column.
--   * verifyAdminRole(), which reads profiles.role via the service_role client.

begin;

-- ---------------------------------------------------------------------------
-- A. Grants: remove blanket UPDATE, re-grant only user-editable columns.
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
-- B. Trigger guard on privileged columns.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_profiles_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  is_privileged boolean;
begin
  -- Privileged when: no end-user JWT (service_role key, migrations, or a
  -- SECURITY DEFINER context), an explicit service_role JWT, or an admin user.
  is_privileged := (
    v_uid is null
    or v_jwt_role = 'service_role'
    or public.get_user_role(v_uid) = 'admin'
  );

  if is_privileged then
    return new;
  end if;

  if new.role           is distinct from old.role
     or new.customer_type is distinct from old.customer_type
     or new.archived      is distinct from old.archived
     or new.deleted       is distinct from old.deleted then
    raise exception 'Not authorized to modify privileged profile fields (role, customer_type, archived, deleted)'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.enforce_profiles_privileged_columns() is
  'Security C2: blocks non-admin, non-service-role callers from changing role/customer_type/archived/deleted on profiles.';

drop trigger if exists trg_profiles_protect_privileged on public.profiles;
create trigger trg_profiles_protect_privileged
  before update on public.profiles
  for each row
  execute function public.enforce_profiles_privileged_columns();

-- ---------------------------------------------------------------------------
-- C. Consolidate UPDATE RLS policies onto the WITH CHECK variant.
--    The legacy "Users can update own profile" policy had no WITH CHECK, so the
--    NEW row was never re-validated. profiles_update_own_or_admin already
--    enforces (id = auth.uid() OR admin) for both USING and WITH CHECK, so the
--    legacy policy is redundant and strictly looser -- drop it.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can update own profile" on public.profiles;

commit;
