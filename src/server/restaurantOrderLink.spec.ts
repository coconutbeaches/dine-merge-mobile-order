// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  issueRestaurantOrderLink,
  RestaurantOrderLinkConfigError,
  verifyRestaurantOrderLink,
} from "./restaurantOrderLink";

const TEST_SECRET = "test-secret-0123456789abcdef-0123456789abcdef";
const ORDER_ID = 21244;
const EXPECTED_TOKEN = "v1.MjEyNDQ.dpKNzQdWHQjk8k8TWuK7c1FcRa9IjHmXy0xkuedV3mA";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("restaurant order link signing", () => {
  it("issues a stable valid token at the server creation boundary", () => {
    vi.stubEnv("RESTAURANT_ORDER_LINK_SIGNING_SECRET", TEST_SECRET);

    const token = issueRestaurantOrderLink(ORDER_ID);

    expect(token).toBe(EXPECTED_TOKEN);
    expect(verifyRestaurantOrderLink(token, TEST_SECRET)).toEqual({
      version: "v1",
      orderId: ORDER_ID,
    });
  });

  it("is issued only by the authenticated order-creation route after insert", () => {
    const apiSource = readFileSync(
      resolve(process.cwd(), "app/api/orders/route.ts"),
      "utf8",
    );

    expect(apiSource).toContain(
      "issueRestaurantOrderLink(data.id, signingSecret)",
    );
    expect(
      apiSource.indexOf("issueRestaurantOrderLink(data.id, signingSecret)"),
    ).toBeGreaterThan(apiSource.indexOf(".insert("));
    expect(apiSource).toContain("{ order: data, restaurantOrderRef }");
    expect(apiSource).toContain("{ status: 201 }");
  });

  it("verifies only for the expected order ID", () => {
    const token = issueRestaurantOrderLink(ORDER_ID, TEST_SECRET);

    expect(
      verifyRestaurantOrderLink(token, TEST_SECRET, ORDER_ID)?.orderId,
    ).toBe(ORDER_ID);
    expect(
      verifyRestaurantOrderLink(token, TEST_SECRET, ORDER_ID + 1),
    ).toBeNull();
  });

  it("rejects a changed signature", () => {
    const token = issueRestaurantOrderLink(ORDER_ID, TEST_SECRET);
    const changed = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;

    expect(verifyRestaurantOrderLink(changed, TEST_SECRET)).toBeNull();
  });

  it("rejects a changed signed order payload", () => {
    const token = issueRestaurantOrderLink(ORDER_ID, TEST_SECRET);
    const [, , signature] = token.split(".");
    const changedPayload = Buffer.from(String(ORDER_ID + 1), "ascii").toString(
      "base64url",
    );

    expect(
      verifyRestaurantOrderLink(
        `v1.${changedPayload}.${signature}`,
        TEST_SECRET,
      ),
    ).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyRestaurantOrderLink("not-a-token", TEST_SECRET)).toBeNull();
    expect(verifyRestaurantOrderLink("v1.***.***", TEST_SECRET)).toBeNull();
  });

  it("rejects unknown token versions", () => {
    const token = issueRestaurantOrderLink(ORDER_ID, TEST_SECRET);

    expect(
      verifyRestaurantOrderLink(token.replace(/^v1\./, "v2."), TEST_SECRET),
    ).toBeNull();
  });

  it("fails closed when the signing secret is missing or weak", () => {
    vi.stubEnv("RESTAURANT_ORDER_LINK_SIGNING_SECRET", "");

    expect(() => issueRestaurantOrderLink(ORDER_ID)).toThrow(
      RestaurantOrderLinkConfigError,
    );
    expect(() => verifyRestaurantOrderLink(EXPECTED_TOKEN, "")).toThrow(
      RestaurantOrderLinkConfigError,
    );
    expect(() => issueRestaurantOrderLink(ORDER_ID, "too-short")).toThrow(
      RestaurantOrderLinkConfigError,
    );
  });

  it("keeps the signing secret out of client modules and public configuration", () => {
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
    expect(serverSource).not.toContain(
      "NEXT_PUBLIC_RESTAURANT_ORDER_LINK_SIGNING_SECRET",
    );
  });
});
