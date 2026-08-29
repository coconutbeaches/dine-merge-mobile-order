// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  issueRestaurantOrderLink,
  verifyRestaurantOrderLink,
} from "./restaurantOrderLink";

const ORDER_ID = 21244;

describe("restaurant order number reference", () => {
  it("uses only the order number", () => {
    const ref = issueRestaurantOrderLink(ORDER_ID);

    expect(ref).toBe(String(ORDER_ID));
    expect(verifyRestaurantOrderLink(ref)).toEqual({
      version: "order-number",
      orderId: ORDER_ID,
    });
  });

  it("is issued only after the database insert", () => {
    const apiSource = readFileSync(
      resolve(process.cwd(), "app/api/orders/route.ts"),
      "utf8",
    );

    expect(apiSource).toContain("issueRestaurantOrderLink(data.id)");
    expect(apiSource).toContain("persistIdempotentOrder(serviceClient");
    expect(apiSource.indexOf("issueRestaurantOrderLink(data.id)")).toBeGreaterThan(
      apiSource.indexOf("persistIdempotentOrder(serviceClient"),
    );
    expect(apiSource).toContain("{ order: data, restaurantOrderRef }");
    expect(apiSource).not.toContain("RESTAURANT_ORDER_LINK_SIGNING_SECRET");
  });

  it("verifies only for the expected order ID", () => {
    const ref = issueRestaurantOrderLink(ORDER_ID);

    expect(verifyRestaurantOrderLink(ref, undefined, ORDER_ID)?.orderId).toBe(
      ORDER_ID,
    );
    expect(
      verifyRestaurantOrderLink(ref, undefined, ORDER_ID + 1),
    ).toBeNull();
  });

  it("rejects malformed order numbers", () => {
    expect(verifyRestaurantOrderLink("not-an-order")).toBeNull();
    expect(verifyRestaurantOrderLink("0")).toBeNull();
    expect(verifyRestaurantOrderLink("-1")).toBeNull();
    expect(() => issueRestaurantOrderLink("01")).toThrow(TypeError);
  });

  it("does not depend on a signing secret", () => {
    expect(issueRestaurantOrderLink(ORDER_ID, "")).toBe(String(ORDER_ID));
    expect(verifyRestaurantOrderLink(String(ORDER_ID), "too-short")?.orderId).toBe(
      ORDER_ID,
    );
  });

  it("keeps order-number plumbing out of public configuration", () => {
    const clientFiles = [
      "app/checkout/page.tsx",
      "app/order/[id]/confirmation/page.tsx",
      "app/order-confirmation/page.tsx",
      "src/hooks/usePlaceOrder.ts",
      "src/services/orderService.ts",
      "next.config.js",
    ];

    for (const file of clientFiles) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).not.toContain("RESTAURANT_ORDER_LINK_SIGNING_SECRET");
      expect(source).not.toContain("node:crypto");
    }

    const serverSource = readFileSync(
      resolve(process.cwd(), "src/server/restaurantOrderLink.ts"),
      "utf8",
    );
    expect(serverSource).toMatch(/import ["']server-only["']/);
  });
});
