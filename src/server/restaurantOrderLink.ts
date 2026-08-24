import "server-only";

export const RESTAURANT_ORDER_LINK_SIGNING_SECRET_ENV =
  "RESTAURANT_ORDER_LINK_SIGNING_SECRET";
export const RESTAURANT_ORDER_LINK_TOKEN_VERSION = "order-number";
export const RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES = 32;

// Kept for compatibility with existing imports while restaurant orders move
// from signed visible refs to their natural identifier: the order number.
export class RestaurantOrderLinkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RestaurantOrderLinkConfigError";
  }
}

export type RestaurantOrderLinkClaims = {
  version: typeof RESTAURANT_ORDER_LINK_TOKEN_VERSION;
  orderId: number;
};

const normalizeOrderId = (value: number | string): string => {
  const raw = String(value).trim();
  if (!/^[1-9][0-9]*$/.test(raw)) {
    throw new TypeError("order ID must be a positive base-10 integer");
  }
  if (BigInt(raw) > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new TypeError("order ID exceeds the supported safe-integer range");
  }
  return raw;
};

export const issueRestaurantOrderLink = (
  orderId: number | string,
  _secretValue?: string,
): string => normalizeOrderId(orderId);

export const verifyRestaurantOrderLink = (
  token: string,
  _secretValue?: string,
  expectedOrderId?: number | string,
): RestaurantOrderLinkClaims | null => {
  let normalized: string;
  try {
    normalized = normalizeOrderId(token);
  } catch {
    return null;
  }

  if (
    expectedOrderId !== undefined &&
    normalized !== normalizeOrderId(expectedOrderId)
  ) {
    return null;
  }

  return {
    version: RESTAURANT_ORDER_LINK_TOKEN_VERSION,
    orderId: Number(normalized),
  };
};
