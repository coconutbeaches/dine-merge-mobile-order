import { describe, expect, it } from "vitest";

import {
  appendRestaurantOrderRef,
  restaurantOrderRefFromHash,
} from "./restaurantWhatsAppMessage";

const ORDER_NUMBER = "21244";

describe("restaurant WhatsApp message", () => {
  it("uses the readable order number without appending a Ref line", () => {
    const message = appendRestaurantOrderRef(
      "*Order: #21244*\n\n*Items:*\n- 1x Rice\n\n*Total:* ฿30",
      ORDER_NUMBER,
    );

    expect(message).toContain("*Order: #21244*");
    expect(message).not.toContain("\nRef:");
  });

  it("rejects a missing or malformed order number", () => {
    expect(() => appendRestaurantOrderRef("*Order: #21244*", "")).toThrow();
    expect(() =>
      appendRestaurantOrderRef("*Order: #21244*", "v1.bad"),
    ).toThrow();
  });

  it("transports only a decimal order number from the URL fragment", () => {
    expect(restaurantOrderRefFromHash("#ref=21244")).toBe(ORDER_NUMBER);
    expect(restaurantOrderRefFromHash("#ref=unsigned-21244")).toBeNull();
  });
});
