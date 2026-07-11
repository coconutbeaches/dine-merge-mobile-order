-- C3: Remove world-readable / world-insertable access to public.guests.
--
-- Live audit (2026-07-11) confirmed the anon role could SELECT every guest row
-- (4,519 rows: first_name, stay_id, table_number) and INSERT arbitrary rows.
-- The exposed (id, stay_id) tuples are exactly what /api/guest/order-history and
-- the guest order-placement path treat as an authorization credential, so the
-- open SELECT enabled unauthenticated enumeration of every family's order
-- history, and the open INSERT enabled forging guests under any enumerated stay.
--
-- Guest registration now runs server-side via POST /api/guest/register using the
-- service-role client. The browser no longer touches this table directly, so we
-- drop the always-true anon/public policies and revoke the direct grants.
-- RLS stays enabled (deny-by-default); service_role bypasses RLS and keeps all
-- registration / ordering / order-history / admin workflows working unchanged.
--
-- NOTE: this is a security-only DDL change. It does not modify any guest data.

-- 1. Drop the always-true SELECT / INSERT policies (current live names).
DROP POLICY IF EXISTS "Guests can view records." ON public.guests;
DROP POLICY IF EXISTS "Guests can create records." ON public.guests;

-- Also drop legacy-named / drifted policies from earlier migrations if present,
-- so the table is left with no anon-facing policy regardless of history.
DROP POLICY IF EXISTS "Guests can view their own records." ON public.guests;
DROP POLICY IF EXISTS "Guests can create their own records." ON public.guests;
DROP POLICY IF EXISTS "Guests can update records." ON public.guests;
DROP POLICY IF EXISTS "Guests can update their own records." ON public.guests;

-- 2. Revoke direct table privileges from the browser-facing roles.
--    anon currently holds SELECT + INSERT; authenticated holds the same and is
--    unused (admin reads go through RPCs / profiles, order routes use service
--    role), so both are safe to revoke.
REVOKE SELECT, INSERT ON public.guests FROM anon;
REVOKE SELECT, INSERT ON public.guests FROM authenticated;

-- 3. Keep RLS enabled: with no anon-facing policy, all non service-role access
--    is denied by default.
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- ROLLBACK (run manually to restore the previous, insecure posture):
--
--   GRANT SELECT, INSERT ON public.guests TO anon, authenticated;
--
--   CREATE POLICY "Guests can view records." ON public.guests
--     FOR SELECT USING (true);
--
--   CREATE POLICY "Guests can create records." ON public.guests
--     FOR INSERT WITH CHECK (true);
--
-- (Reverting also requires redeploying the client build that wrote to
--  public.guests directly, or pointing createGuestUser back at the table.)
-- ---------------------------------------------------------------------------
