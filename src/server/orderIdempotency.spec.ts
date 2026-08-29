// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabaseTypes";

vi.mock("server-only", () => ({}));

import {
  OrderIdempotencyMismatchError,
  type IdempotentOrderInsert,
  persistIdempotentOrder,
} from "./orderIdempotency";

const REQUEST_A = "11111111-1111-4111-8111-111111111111";
const REQUEST_B = "22222222-2222-4222-8222-222222222222";

const intendedOrder = (
  clientRequestId = REQUEST_A,
  overrides: Partial<IdempotentOrderInsert> = {},
): IdempotentOrderInsert => ({
  client_request_id: clientRequestId,
  user_id: null,
  guest_user_id: "guest-1",
  guest_first_name: "Miran",
  stay_id: "walkin-guest-1",
  customer_name: "Miran",
  order_items: [
    {
      id: "cart-line-1",
      menuItem: { id: "fruit-shake", name: "Fruit Shake", price: 165 },
      quantity: 1,
      selectedOptions: { fruit: ["Coconut", "Banana"] },
    },
  ],
  total_amount: 165,
  table_number: "29",
  order_status: "new",
  ...overrides,
});

class InMemoryOrdersClient {
  readonly rows = new Map<
    string,
    Database["public"]["Tables"]["orders"]["Row"]
  >();
  successfulInsertCount = 0;
  private nextId = 21705;

  from(table: string) {
    if (table !== "orders") throw new Error(`Unexpected table: ${table}`);
    return {
      insert: (input: IdempotentOrderInsert) => ({
        select: () => ({
          single: async () => {
            // Let concurrent callers both reach the database boundary before
            // the atomic unique-key decision below.
            await Promise.resolve();
            if (this.rows.has(input.client_request_id)) {
              return {
                data: null,
                error: { code: "23505", message: "duplicate key value" },
              };
            }
            const now = new Date().toISOString();
            const row = {
              ...input,
              id: this.nextId++,
              created_at: now,
              updated_at: now,
              kitchen_whapi_channel_id: null,
              kitchen_whapi_chat_id: null,
              kitchen_whapi_message_id: null,
            } as Database["public"]["Tables"]["orders"]["Row"];
            this.rows.set(input.client_request_id, row);
            this.successfulInsertCount += 1;
            return { data: row, error: null };
          },
        }),
      }),
      select: () => ({
        eq: (column: string, value: string) => {
          if (column !== "client_request_id") {
            throw new Error(`Unexpected lookup column: ${column}`);
          }
          return {
            maybeSingle: async () => ({
              data: this.rows.get(value) ?? null,
              error: null,
            }),
          };
        },
      }),
    };
  }

  asSupabaseClient() {
    return this as unknown as SupabaseClient<Database>;
  }
}

describe("persistIdempotentOrder", () => {
  let database: InMemoryOrdersClient;

  beforeEach(() => {
    database = new InMemoryOrdersClient();
  });

  it("creates exactly one new order for a new client request ID", async () => {
    const result = await persistIdempotentOrder(
      database.asSupabaseClient(),
      intendedOrder(),
    );

    expect(result.replayed).toBe(false);
    expect(result.order.id).toBe(21705);
    expect(result.order.client_request_id).toBe(REQUEST_A);
    expect(database.successfulInsertCount).toBe(1);
    expect(database.rows.size).toBe(1);
  });

  it("returns the original order for an immediate duplicate or lost response retry", async () => {
    const first = await persistIdempotentOrder(
      database.asSupabaseClient(),
      intendedOrder(),
    );
    // Conceptually discard the first response, then replay the exact request.
    const replay = await persistIdempotentOrder(
      database.asSupabaseClient(),
      intendedOrder(),
    );

    expect(replay).toEqual({ order: first.order, replayed: true });
    expect(database.successfulInsertCount).toBe(1);
    expect(database.rows.size).toBe(1);
  });

  it("lets concurrent identical submissions converge on one row and one order ID", async () => {
    const [left, right] = await Promise.all([
      persistIdempotentOrder(database.asSupabaseClient(), intendedOrder()),
      persistIdempotentOrder(database.asSupabaseClient(), intendedOrder()),
    ]);

    expect(left.order.id).toBe(right.order.id);
    expect([left.replayed, right.replayed].sort()).toEqual([false, true]);
    expect(database.successfulInsertCount).toBe(1);
    expect(database.rows.size).toBe(1);
  });

  it("fails closed when the same request ID carries materially different trusted data", async () => {
    await persistIdempotentOrder(database.asSupabaseClient(), intendedOrder());

    await expect(
      persistIdempotentOrder(
        database.asSupabaseClient(),
        intendedOrder(REQUEST_A, { table_number: "30" }),
      ),
    ).rejects.toBeInstanceOf(OrderIdempotencyMismatchError);
    await expect(
      persistIdempotentOrder(
        database.asSupabaseClient(),
        intendedOrder(REQUEST_A, {
          order_items: [
            {
              id: "cart-line-1",
              menuItem: { id: "fruit-shake", name: "Fruit Shake", price: 165 },
              quantity: 2,
              selectedOptions: { fruit: ["Coconut", "Banana"] },
            },
          ],
          total_amount: 330,
        }),
      ),
    ).rejects.toBeInstanceOf(OrderIdempotencyMismatchError);
    expect(database.successfulInsertCount).toBe(1);
  });

  it("creates two genuine orders when they use different request IDs", async () => {
    const first = await persistIdempotentOrder(
      database.asSupabaseClient(),
      intendedOrder(REQUEST_A),
    );
    const second = await persistIdempotentOrder(
      database.asSupabaseClient(),
      intendedOrder(REQUEST_B),
    );

    expect(first.order.id).not.toBe(second.order.id);
    expect(database.successfulInsertCount).toBe(2);
    expect(database.rows.size).toBe(2);
  });
});
