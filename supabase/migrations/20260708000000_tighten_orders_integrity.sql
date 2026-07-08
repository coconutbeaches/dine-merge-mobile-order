-- Tighten RLS on public.orders to close the confirmed order-integrity issues:
--   1. Anonymous clients could INSERT forged guest orders with attacker-chosen
--      total_amount / stay_id / guest_user_id / customer_name.
--   2. Anonymous clients could SELECT every guest order created in a rolling
--      15-minute window (cross-guest information disclosure).
--
-- After this migration, guest order placement and guest order readback go
-- through service-role server routes (app/api/orders, app/api/orders/[id],
-- app/api/guest/order-history). Those routes:
--   * derive stay_id / guest_user_id from the authoritative `guests` row,
--   * recompute total_amount from authoritative product prices,
--   * authorize readback against the requesting session.
--
-- Service-role writes bypass RLS, so WhatsApp `/orders`, automation, and the
-- admin custom-order route are UNAFFECTED. Authenticated admin read/update of
-- orders (orders_select_own_or_admin / orders_update_own_or_admin) is preserved.

BEGIN;

-- 1) INSERT ---------------------------------------------------------------
-- Remove the anonymous guest-insert path. Only an authenticated user may
-- insert a row for themselves directly from the browser; guest and admin
-- inserts flow through the service role (which bypasses RLS).
DROP POLICY IF EXISTS "Allow users to create their own orders" ON public.orders;

CREATE POLICY "orders_insert_authenticated_self" ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) SELECT ---------------------------------------------------------------
-- Remove the 15-minute anonymous readback window. Guest confirmation/readback
-- is served by an authorized service-role route instead.
DROP POLICY IF EXISTS "orders_select_guest_recent_readback" ON public.orders;

-- (orders_select_own_or_admin and orders_update_own_or_admin are intentionally
--  left in place: authenticated customers see/update their own orders, admins
--  see/update all.)

-- 3) Defense in depth -----------------------------------------------------
-- RLS is the primary control, but the table also carries broad table-level
-- grants to anon/authenticated. Revoke the privileges these roles no longer
-- need so that a future accidental `DISABLE ROW LEVEL SECURITY` cannot silently
-- reopen write access. SELECT grants are left intact (RLS returns no rows for
-- anon now that the readback policy is gone).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.orders FROM anon;
REVOKE DELETE, TRUNCATE ON public.orders FROM authenticated;

COMMIT;

-- Rollback reference (not executed):
--   CREATE POLICY "Allow users to create their own orders" ON public.orders
--     FOR INSERT WITH CHECK (
--       (auth.uid() = user_id) OR (user_id IS NULL AND guest_user_id IS NOT NULL)
--     );
--   CREATE POLICY "orders_select_guest_recent_readback" ON public.orders
--     FOR SELECT TO anon USING (
--       user_id IS NULL AND guest_user_id IS NOT NULL
--       AND created_at >= now() - interval '15 minutes'
--     );
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.orders TO anon;
--   GRANT DELETE, TRUNCATE ON public.orders TO authenticated;
