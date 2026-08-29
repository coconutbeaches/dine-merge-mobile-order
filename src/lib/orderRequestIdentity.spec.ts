import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "@/types";
import {
  clearOrderRequestIdentity,
  completeOrderRequest,
  getOrCreateOrderRequestId,
} from "./orderRequestIdentity";

const cart = (overrides: Partial<CartItem> = {}): CartItem[] => [
  {
    id: "cart-line-1",
    menuItem: {
      id: "fruit-shake",
      name: "Fruit Shake",
      description: "No description",
      price: 165,
      image: "",
      category: "drinks",
      available: true,
    },
    quantity: 1,
    selectedOptions: { fruit: ["Coconut", "Banana"] },
    ...overrides,
  },
];

const attempt = (overrides = {}) => ({
  cartItems: cart(),
  tableNumber: "29",
  guestUserId: "guest-1",
  ...overrides,
});

describe("order request identity", () => {
  beforeEach(() => {
    clearOrderRequestIdentity();
    localStorage.clear();
  });

  it("reuses the same UUID for retries and a conceptual lost response", () => {
    const first = getOrCreateOrderRequestId(attempt());
    const retry = getOrCreateOrderRequestId(attempt());

    expect(retry).toBe(first);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("survives a module remount by reading the persisted request identity", async () => {
    const first = getOrCreateOrderRequestId(attempt());
    vi.resetModules();
    const reloadedModule = await import("./orderRequestIdentity");

    expect(reloadedModule.getOrCreateOrderRequestId(attempt())).toBe(first);
  });

  it("rotates after definite success so a later identical order is new", () => {
    const first = getOrCreateOrderRequestId(attempt());
    completeOrderRequest(first);
    const nextOrder = getOrCreateOrderRequestId(attempt());

    expect(nextOrder).not.toBe(first);
  });

  it("rotates when the cart, table, or actor identity changes", () => {
    const first = getOrCreateOrderRequestId(attempt());
    const changedCart = getOrCreateOrderRequestId(
      attempt({ cartItems: cart({ quantity: 2 }) }),
    );
    const changedTable = getOrCreateOrderRequestId(
      attempt({ tableNumber: "30" }),
    );
    const changedGuest = getOrCreateOrderRequestId(
      attempt({ guestUserId: "guest-2" }),
    );

    expect(
      new Set([first, changedCart, changedTable, changedGuest]),
    ).toHaveLength(4);
  });

  it("does not let stale completion erase a newer cart attempt", () => {
    const oldRequest = getOrCreateOrderRequestId(attempt());
    const newRequest = getOrCreateOrderRequestId(
      attempt({ cartItems: cart({ quantity: 2 }) }),
    );

    completeOrderRequest(oldRequest);

    expect(
      getOrCreateOrderRequestId(attempt({ cartItems: cart({ quantity: 2 }) })),
    ).toBe(newRequest);
  });
});
