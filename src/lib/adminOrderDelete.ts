/**
 * H5 — secure admin order deletion.
 *
 * `public.orders` has RLS enabled with NO authenticated DELETE policy, and C1
 * revoked the DELETE grant from anon/authenticated, so a browser-side
 * `supabase.from('orders').delete()` is default-denied. Deletion therefore runs
 * server-side: POST /api/admin/orders/delete verifies the caller is an admin
 * (verifyAdminRole) and deletes with the service-role client.
 *
 * This module holds the request-parsing, authorization, and result-shaping
 * logic as pure functions so they can be unit tested without Next.js or
 * Supabase. The route supplies the real admin check and a service-role-backed
 * store; tests supply in-memory equivalents.
 */

/** Max order ids accepted in one bulk request (guards accidental huge deletes). */
export const MAX_ORDER_IDS = 200;

export interface AdminAuth {
  isAdmin: boolean;
  userId: string | null;
}

/** Data-access port. The route implements this over the service-role client. */
export interface OrderDeleteStore {
  /** Delete the given order ids; returns the ids actually deleted. */
  deleteByIds(ids: number[]): Promise<number[]>;
}

export type AdminDeleteResult =
  | { ok: true; status: 200; body: { deletedIds: number[]; count: number } }
  | { ok: false; status: number; body: { error: string } };

/**
 * Validate the request body into a list of positive-integer order ids.
 * Accepts `{ orderIds: [...] }` or a single `{ orderId: ... }`; numeric strings
 * are coerced. Rejects empty / non-integer / non-positive / oversized inputs.
 */
export function parseOrderIds(
  body: unknown,
): { ok: true; ids: number[] } | { ok: false; status: number; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, status: 400, error: 'Invalid request payload' };
  }
  const record = body as Record<string, unknown>;
  const raw =
    record.orderIds !== undefined
      ? record.orderIds
      : record.orderId !== undefined
        ? [record.orderId]
        : undefined;

  if (!Array.isArray(raw)) {
    return { ok: false, status: 400, error: 'orderIds must be a non-empty array' };
  }
  if (raw.length === 0) {
    return { ok: false, status: 400, error: 'At least one order id is required' };
  }
  if (raw.length > MAX_ORDER_IDS) {
    return { ok: false, status: 400, error: `Too many order ids (max ${MAX_ORDER_IDS})` };
  }

  const ids: number[] = [];
  const seen = new Set<number>();
  for (const value of raw) {
    // Coerce numeric strings, but reject anything that isn't a clean integer.
    const n =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim() !== '' && /^\d+$/.test(value.trim())
          ? Number(value.trim())
          : NaN;
    if (!Number.isInteger(n) || n <= 0) {
      return { ok: false, status: 400, error: 'Order ids must be positive integers' };
    }
    if (!seen.has(n)) {
      seen.add(n);
      ids.push(n);
    }
  }
  return { ok: true, ids };
}

/**
 * Authorize + perform an admin order deletion. Denies unauthenticated (401) and
 * non-admin (403) callers, validates ids (400), and never leaks internal DB
 * errors (500 with a generic message).
 */
export async function handleAdminOrderDelete(
  body: unknown,
  auth: AdminAuth,
  store: OrderDeleteStore,
): Promise<AdminDeleteResult> {
  if (!auth.userId) {
    return { ok: false, status: 401, body: { error: 'Authentication required' } };
  }
  if (!auth.isAdmin) {
    return { ok: false, status: 403, body: { error: 'Admin access required' } };
  }

  const parsed = parseOrderIds(body);
  if (!parsed.ok) {
    return { ok: false, status: parsed.status, body: { error: parsed.error } };
  }

  let deletedIds: number[];
  try {
    deletedIds = await store.deleteByIds(parsed.ids);
  } catch {
    // Do not surface the underlying Postgres/PostgREST error to the client.
    return { ok: false, status: 500, body: { error: 'Failed to delete orders' } };
  }

  return { ok: true, status: 200, body: { deletedIds, count: deletedIds.length } };
}

/**
 * Remove only the rows the server confirmed as deleted. Used by the UI so a
 * failed or partial deletion never optimistically drops rows. Order id
 * comparison is string-based to tolerate number/string id shapes.
 */
export function removeDeletedOrders<T extends { id: number | string }>(
  orders: T[],
  deletedIds: Array<number | string>,
): T[] {
  if (!deletedIds || deletedIds.length === 0) return orders;
  const deleted = new Set(deletedIds.map((id) => String(id)));
  return orders.filter((order) => !deleted.has(String(order.id)));
}

export function getRemainingSelectedOrderIds<T extends number | string>(
  selectedIds: T[],
  deletedIds: Array<number | string>,
): T[] {
  if (!deletedIds || deletedIds.length === 0) return selectedIds;
  const deleted = new Set(deletedIds.map((id) => String(id)));
  return selectedIds.filter((id) => !deleted.has(String(id)));
}
