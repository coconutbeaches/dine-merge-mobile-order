import { describe, expect, it } from "vitest";

import {
  appendRestaurantOrderRef,
  restaurantOrderRefFromHash,
} from "./restaurantWhatsAppMessage";

const SIGNED_REF = "v1.MjEyNDQ.dpKNzQdWHQjk8k8TWuK7c1FcRa9IjHmXy0xkuedV3mA";

describe("restaurant WhatsApp message", () => {
  it("keeps the human-readable order line and appends the signed Ref", () => {
    const message = appendRestaurantOrderRef(
      "*Order: #21244*\n\n*Items:*\n- 1x Rice\n\n*Total:* ฿30",
      SIGNED_REF,
    );

    expect(message).toContain("*Order: #21244*");
    expect(message).toContain(`\n\nRef: ${SIGNED_REF}`);
  });

  it("refuses to build an unsigned or malformed WhatsApp message", () => {
    expect(() => appendRestaurantOrderRef("*Order: #21244*", "")).toThrow();
    expect(() =>
      appendRestaurantOrderRef("*Order: #21244*", "v1.bad"),
    ).toThrow();
  });

  it("transports only a versioned signed reference from the URL fragment", () => {
    expect(
      restaurantOrderRefFromHash(`#ref=${encodeURIComponent(SIGNED_REF)}`),
    ).toBe(SIGNED_REF);
    expect(restaurantOrderRefFromHash("#ref=unsigned-21244")).toBeNull();
  });
});
