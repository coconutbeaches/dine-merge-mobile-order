import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

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
  version: typeof RESTAURANT_ORDER_LINK_TOKEN_VERSION | "v1";
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
  secretValue?: string,
): string => {
  const normalized = normalizeOrderId(orderId);
  if (secretValue === undefined) return normalized; // Legacy display-only reference.
  const secret = secretValue.trim();
  if (Buffer.byteLength(secret, "utf8") < RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES) {
    throw new RestaurantOrderLinkConfigError("Restaurant order signing unavailable");
  }
  const claim = Buffer.from(normalized).toString("base64url");
  const message = `v1.${claim}`;
  return `${message}.${createHmac("sha256", secret).update(message).digest("base64url")}`;
};

export const verifyRestaurantOrderLink = (
  token: string,
  secretValue?: string,
  expectedOrderId?: number | string,
): RestaurantOrderLinkClaims | null => {
  // Numeric refs are legacy display identifiers, never authorization claims.
  if (token.startsWith('v1.')) {
    const secret = secretValue?.trim() ?? '';
    if (Buffer.byteLength(secret) < RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES) return null;
    const parts = token.split('.');
    if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[1]) || !/^[A-Za-z0-9_-]+$/.test(parts[2])) return null;
    try {
      const claim = Buffer.from(parts[1], 'base64url');
      const signature = Buffer.from(parts[2], 'base64url');
      if (claim.toString('base64url') !== parts[1] || signature.toString('base64url') !== parts[2]) return null;
      const order = normalizeOrderId(claim.toString('utf8'));
      const expected = createHmac('sha256', secret).update(`v1.${parts[1]}`).digest();
      if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
      if (expectedOrderId !== undefined && order !== normalizeOrderId(expectedOrderId)) return null;
      return {version:'v1',orderId:Number(order)};
    } catch { return null; }
  }
  let normalized: string;
  try {
    normalized = normalizeOrderId(token);
  } catch {
    return null;
  }

  if (
    expectedOrderId !== undefined &&
    normalized !== String(expectedOrderId)
  ) {
    return null;
  }

  return {
    version: RESTAURANT_ORDER_LINK_TOKEN_VERSION,
    orderId: Number(normalized),
  };
};
