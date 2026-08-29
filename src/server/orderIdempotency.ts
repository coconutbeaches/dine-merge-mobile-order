import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabaseTypes";

type OrdersTable = Database["public"]["Tables"]["orders"];

export type IdempotentOrderInsert = OrdersTable["Insert"] & {
  client_request_id: string;
};

export type PersistedOrder = OrdersTable["Row"];

type DatabaseError = {
  code?: string | null;
  message?: string | null;
};

export class OrderIdempotencyMismatchError extends Error {
  constructor() {
    super("Client request ID was already used for a different order");
    this.name = "OrderIdempotencyMismatchError";
  }
}

export class OrderPersistenceError extends Error {
  readonly databaseCode: string | null;

  constructor(message: string, error?: DatabaseError | null) {
    super(message);
    this.name = "OrderPersistenceError";
    this.databaseCode = error?.code ?? null;
  }
}

const normalizeNullable = (value: unknown) => value ?? null;

const canonicalizeJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeJson(entry)]),
    );
  }
  return value;
};

const sameJson = (left: Json | null, right: Json | null) =>
  JSON.stringify(canonicalizeJson(left)) ===
  JSON.stringify(canonicalizeJson(right));

/**
 * A replay may return an existing row only when it represents the same trusted
 * logical order. Mutable lifecycle fields (status/timestamps/WhatsApp links)
 * are deliberately excluded because a retry can arrive after fulfilment starts.
 */
export const isSameLogicalOrder = (
  existing: PersistedOrder,
  intended: IdempotentOrderInsert,
): boolean =>
  normalizeNullable(existing.user_id) === normalizeNullable(intended.user_id) &&
  normalizeNullable(existing.guest_user_id) ===
    normalizeNullable(intended.guest_user_id) &&
  normalizeNullable(existing.stay_id) === normalizeNullable(intended.stay_id) &&
  normalizeNullable(existing.table_number) ===
    normalizeNullable(intended.table_number) &&
  Number(existing.total_amount) === Number(intended.total_amount) &&
  sameJson(existing.order_items, (intended.order_items ?? null) as Json | null);

/**
 * Insert first and let PostgreSQL's unique client_request_id index arbitrate
 * concurrent submissions. A unique loser then reads the committed winner and
 * returns it only after canonical payload verification.
 */
export async function persistIdempotentOrder(
  serviceClient: SupabaseClient<Database>,
  intended: IdempotentOrderInsert,
): Promise<{ order: PersistedOrder; replayed: boolean }> {
  const { data, error } = await serviceClient
    .from("orders")
    .insert(intended)
    .select()
    .single();

  if (!error && data) {
    return { order: data, replayed: false };
  }

  if (error?.code !== "23505") {
    throw new OrderPersistenceError("Order insert failed", error);
  }

  const { data: existing, error: lookupError } = await serviceClient
    .from("orders")
    .select("*")
    .eq("client_request_id", intended.client_request_id)
    .maybeSingle();

  if (lookupError || !existing) {
    throw new OrderPersistenceError(
      "Unique order insert could not be reconciled",
      lookupError ?? error,
    );
  }

  if (!isSameLogicalOrder(existing, intended)) {
    throw new OrderIdempotencyMismatchError();
  }

  return { order: existing, replayed: true };
}
