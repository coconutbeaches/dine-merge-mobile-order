// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  buildTrustedOrder: vi.fn(),
  createServerClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  issueRestaurantOrderLink: vi.fn(),
  persistIdempotentOrder: vi.fn(),
  verifyAdminRole: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase-server", () => ({
  createServerClient: mocks.createServerClient,
  createServiceRoleClient: mocks.createServiceRoleClient,
  verifyAdminRole: mocks.verifyAdminRole,
}));
vi.mock("@/lib/orderPricing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/orderPricing")>();
  return { ...actual, buildTrustedOrderFromRequest: mocks.buildTrustedOrder };
});
vi.mock("@/server/orderIdempotency", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/orderIdempotency")>();
  return { ...actual, persistIdempotentOrder: mocks.persistIdempotentOrder };
});
vi.mock("@/server/restaurantOrderLink", () => ({
  issueRestaurantOrderLink: mocks.issueRestaurantOrderLink,
}));

import { POST } from "../../app/api/orders/route";
import { OrderIdempotencyMismatchError } from "./orderIdempotency";

const CLIENT_REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const TRUSTED_ITEMS = [
  {
    id: "cart-line-1",
    menuItem: { id: "fruit-shake", name: "Fruit Shake", price: 165 },
    quantity: 1,
    selectedOptions: { fruit: ["Coconut", "Banana"] },
  },
];
const ORDER = {
  client_request_id: CLIENT_REQUEST_ID,
  id: 21705,
  user_id: null,
  guest_user_id: "guest-1",
  guest_first_name: "Miran",
  stay_id: "walkin-guest-1",
  customer_name: "Miran",
  order_items: TRUSTED_ITEMS,
  total_amount: 165,
  table_number: "29",
  order_status: "new",
  created_at: "2026-08-29T04:53:13.000Z",
  updated_at: "2026-08-29T04:53:13.000Z",
  kitchen_whapi_channel_id: null,
  kitchen_whapi_chat_id: null,
  kitchen_whapi_message_id: null,
};

const request = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const guestBody = (overrides: Record<string, unknown> = {}) => ({
  clientRequestId: CLIENT_REQUEST_ID,
  guestUserId: "guest-1",
  tableNumber: "29",
  cartItems: [
    {
      id: "cart-line-1",
      menuItem: { id: "fruit-shake", name: "FORGED", price: 1 },
      quantity: 1,
      selectedOptions: { fruit: ["Coconut", "Banana"] },
    },
  ],
  total: 1,
  ...overrides,
});

const queryReturning = (data: unknown) => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
};

describe("/api/orders idempotent creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const guestQuery = queryReturning({
      id: "guest-1",
      stay_id: "walkin-guest-1",
      first_name: "Miran",
    });
    const profileQuery = queryReturning({ name: "Authenticated Guest" });
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "guests") return guestQuery;
        if (table === "profiles") return profileQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    });
    mocks.buildTrustedOrder.mockResolvedValue({
      orderItems: TRUSTED_ITEMS,
      total: 165,
    });
    mocks.persistIdempotentOrder.mockResolvedValue({
      order: ORDER,
      replayed: false,
    });
    mocks.issueRestaurantOrderLink.mockImplementation((id: number) =>
      String(id),
    );
    mocks.verifyAdminRole.mockResolvedValue({
      isAdmin: true,
      userId: "admin-1",
      error: null,
    });
    mocks.createServerClient.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "auth-user-1" } } }),
      },
    });
  });

  it("creates one trusted guest order and returns its canonical restaurant reference", async () => {
    const response = await POST(request(guestBody()));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      order: ORDER,
      restaurantOrderRef: "21705",
    });
    expect(mocks.buildTrustedOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([expect.objectContaining({ id: "cart-line-1" })]),
    );
    expect(mocks.persistIdempotentOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        client_request_id: CLIENT_REQUEST_ID,
        user_id: null,
        guest_user_id: "guest-1",
        stay_id: "walkin-guest-1",
        table_number: "29",
        order_items: TRUSTED_ITEMS,
        total_amount: 165,
      }),
    );
  });

  it("returns the original order and reference for an idempotent replay", async () => {
    mocks.persistIdempotentOrder.mockResolvedValue({
      order: ORDER,
      replayed: true,
    });

    const response = await POST(request(guestBody()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      order: ORDER,
      restaurantOrderRef: "21705",
      idempotentReplay: true,
    });
    expect(mocks.issueRestaurantOrderLink).toHaveBeenCalledWith(21705);
  });

  it("rejects a missing or malformed request ID before pricing or insertion", async () => {
    const response = await POST(
      request(guestBody({ clientRequestId: "not-a-uuid" })),
    );

    expect(response.status).toBe(400);
    expect(mocks.buildTrustedOrder).not.toHaveBeenCalled();
    expect(mocks.persistIdempotentOrder).not.toHaveBeenCalled();
  });

  it("returns 409 when a request ID is reused for different trusted contents", async () => {
    mocks.persistIdempotentOrder.mockRejectedValue(
      new OrderIdempotencyMismatchError(),
    );

    const response = await POST(request(guestBody()));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Client request ID was already used for a different order",
    });
  });

  it("keeps authenticated-user attribution server-authoritative", async () => {
    await POST(
      request(guestBody({ guestUserId: null, userId: "forged-user" })),
    );

    expect(mocks.persistIdempotentOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user_id: "auth-user-1",
        guest_user_id: null,
        stay_id: null,
      }),
    );
  });

  it("keeps hotel guest-session attribution tied to the authoritative guest stay", async () => {
    const hotelGuestQuery = queryReturning({
      id: "guest-1",
      stay_id: "A3_SMITH",
      first_name: "Hotel Guest",
    });
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "guests") return hotelGuestQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    await POST(request(guestBody()));

    expect(mocks.persistIdempotentOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user_id: null,
        guest_user_id: "guest-1",
        stay_id: "A3_SMITH",
      }),
    );
  });

  it("keeps admin hotel-guest attribution unchanged", async () => {
    await POST(
      request(
        guestBody({
          guestUserId: null,
          adminCustomerId: "A3_SMITH",
          customerName: "Smith",
        }),
      ),
    );

    expect(mocks.persistIdempotentOrder).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user_id: null,
        guest_user_id: null,
        stay_id: "A3_SMITH",
      }),
    );
  });
});
