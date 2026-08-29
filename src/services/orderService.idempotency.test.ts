import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/utils/guestSession", () => ({
  getGuestSession: vi.fn(() => null),
  getTableNumber: vi.fn(() => null),
}));

import { placeOrderInSupabase } from "./orderService";

const CLIENT_REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const ORDER = { id: 21705 };

const place = () =>
  placeOrderInSupabase({
    guestUserId: "guest-1",
    cartItems: [] as never[],
    tableNumber: "29",
    clientRequestId: CLIENT_REQUEST_ID,
  });

describe("placeOrderInSupabase request identity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("passes the persistent client request ID to /api/orders", async () => {
    localStorage.setItem("table_number_pending", "29");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ order: ORDER, restaurantOrderRef: "21705" }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await place();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual(
      expect.objectContaining({
        clientRequestId: CLIENT_REQUEST_ID,
        guestUserId: "guest-1",
        tableNumber: "29",
      }),
    );
    expect(localStorage.getItem("table_number_pending")).toBeNull();
  });

  it("does not clear checkout state when a 201 response is incomplete", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("table_number_pending", "29");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ order: ORDER }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(place()).rejects.toThrow(
      "Order response did not include a signed restaurant reference",
    );
    expect(localStorage.getItem("table_number_pending")).toBe("29");
  });
});
