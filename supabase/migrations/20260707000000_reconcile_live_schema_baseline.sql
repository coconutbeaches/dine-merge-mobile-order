-- Reconcile live schema drift: reproduce the PRE-C1 / PRE-C2 production security
-- baseline in the active migration history.
--
-- WHY: several security-relevant objects exist in production but were created
-- out-of-band (dashboard/manual) and are NOT reproduced by any active migration.
-- Without them, a fresh database (preview branch / DR rebuild) does not match
-- production, and the hardening PRs cannot be faithfully validated:
--   * public.orders has RLS DISABLED and no policies on a fresh build
--     (production has RLS enabled + 4 policies).
--   * public.get_user_role(uuid) does not exist on a fresh build
--     (referenced by the orders own/admin policies).
--   * public.profiles.deleted column does not exist on a fresh build
--     (PR #177 / C2 references it and would fail to apply without it).
--
-- SCOPE: this migration reproduces the *baseline* (pre-hardening) state ONLY.
-- It intentionally recreates the permissive orders policies that PR #176 (C1)
-- later tightens, so C1 retains meaningful, reviewable migration coverage.
-- It does NOT include the C1 (orders lock-down) or C2 (profiles privilege guard)
-- hardening changes.
--
-- ORDERING: timestamp 20260707000000 sorts BEFORE C1 (20260708000000),
-- C2 (20260711000000) and C3 (20260712000000) so a fresh rebuild applies the
-- baseline first, then the hardening.
--
-- SAFETY: idempotent and non-destructive. Safe on a fresh database and on the
-- existing production database (every statement is a no-op where the object
-- already matches live). No data is modified.
--
-- Values below were captured verbatim from production (project wcplwmvbhreevxvsdmog):
--   * orders policy USING/WITH CHECK expressions
--   * get_user_role: STABLE, SECURITY DEFINER, search_path=public,pg_temp,
--     EXECUTE to authenticated+service_role only (no PUBLIC), missing row -> NULL
--   * profiles.deleted: boolean, default false, nullable

begin;

-- ---------------------------------------------------------------------------
-- 1) public.get_user_role(uuid)
--    Required by the baseline orders own/admin policies below. Canonical,
--    faithful definition (production's live copy additionally emits debug
--    RAISE NOTICE lines, which are behaviourally irrelevant and omitted here).
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
  -- Missing profile row leaves user_role NULL (SELECT ... INTO finds no row),
  -- so the function returns NULL for unknown users.
  select lower(coalesce(role, 'customer')) into user_role
  from public.profiles
  where id = user_id;
  return user_role;
end;
$$;

-- Lock execute down to match live ACL: no PUBLIC execute.
revoke all on function public.get_user_role(uuid) from public;
grant execute on function public.get_user_role(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) public.profiles.deleted
--    Present in production (boolean, default false, nullable) but not created
--    by any active migration. C2 (PR #177) depends on it.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists deleted boolean default false;

-- ---------------------------------------------------------------------------
-- 3) public.orders baseline security state (PRE-C1)
--    Enable RLS, ensure the standard table grants exist, and (re)create the
--    four permissive baseline policies exactly as they exist live.
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;

-- Standard Supabase table grants (idempotent; matches live). C1 later revokes
-- the write privileges from anon/authenticated.
grant select, insert, update, delete, truncate, references, trigger
  on public.orders to anon, authenticated, service_role;

-- INSERT: guests (user_id null + guest_user_id present) or a user inserting
-- their own row. Applies to PUBLIC (all roles), matching live.
drop policy if exists "Allow users to create their own orders" on public.orders;
create policy "Allow users to create their own orders" on public.orders
  for insert
  to public
  with check (
    (auth.uid() = user_id) or ((user_id is null) and (guest_user_id is not null))
  );

-- SELECT (anon): 15-minute guest order read-back window.
drop policy if exists orders_select_guest_recent_readback on public.orders;
create policy orders_select_guest_recent_readback on public.orders
  for select
  to anon
  using (
    (user_id is null) and (guest_user_id is not null)
    and (created_at >= (now() - '00:15:00'::interval))
  );

-- SELECT (authenticated): own orders or admin.
drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin on public.orders
  for select
  to authenticated
  using (
    (user_id = auth.uid()) or (get_user_role(auth.uid()) = 'admin'::text)
  );

-- UPDATE (authenticated): own orders or admin.
drop policy if exists orders_update_own_or_admin on public.orders;
create policy orders_update_own_or_admin on public.orders
  for update
  to authenticated
  using (
    (user_id = auth.uid()) or (get_user_role(auth.uid()) = 'admin'::text)
  )
  with check (
    (user_id = auth.uid()) or (get_user_role(auth.uid()) = 'admin'::text)
  );

commit;

-- ---------------------------------------------------------------------------
-- ROLLBACK NOTES (not executed)
-- This migration is additive/reconciliatory. To reverse on a database where it
-- introduced (rather than matched) objects:
--   drop policy if exists orders_update_own_or_admin on public.orders;
--   drop policy if exists orders_select_own_or_admin on public.orders;
--   drop policy if exists orders_select_guest_recent_readback on public.orders;
--   drop policy if exists "Allow users to create their own orders" on public.orders;
--   -- (leave RLS enabled; disabling it would re-open orders)
--   alter table public.profiles drop column if exists deleted;   -- data-bearing: verify unused first
--   drop function if exists public.get_user_role(uuid);          -- only if no policy references it
-- Do NOT run these on production: production already contains this baseline and
-- these objects are in active use.
-- ---------------------------------------------------------------------------
