import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const RESTAURANT_ORDER_LINK_SIGNING_SECRET_ENV =
  "RESTAURANT_ORDER_LINK_SIGNING_SECRET";
export const RESTAURANT_ORDER_LINK_TOKEN_VERSION = "v1";
export const RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES = 32;

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

const requireSigningSecret = (value?: string): string => {
  const secret = value?.trim();
  if (!secret) {
    throw new RestaurantOrderLinkConfigError(
      `${RESTAURANT_ORDER_LINK_SIGNING_SECRET_ENV} is required`,
    );
  }
  if (
    Buffer.byteLength(secret, "utf8") < RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES
  ) {
    throw new RestaurantOrderLinkConfigError(
      `${RESTAURANT_ORDER_LINK_SIGNING_SECRET_ENV} must be at least ${RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES} bytes`,
    );
  }
  return secret;
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

const signingInput = (payload: string): string =>
  `${RESTAURANT_ORDER_LINK_TOKEN_VERSION}.${payload}`;

export const issueRestaurantOrderLink = (
  orderId: number | string,
  secretValue = process.env.RESTAURANT_ORDER_LINK_SIGNING_SECRET,
): string => {
  const secret = requireSigningSecret(secretValue);
  const payload = Buffer.from(normalizeOrderId(orderId), "ascii").toString(
    "base64url",
  );
  const input = signingInput(payload);
  const signature = createHmac("sha256", secret)
    .update(input, "ascii")
    .digest("base64url");
  return `${input}.${signature}`;
};

export const verifyRestaurantOrderLink = (
  token: string,
  secretValue = process.env.RESTAURANT_ORDER_LINK_SIGNING_SECRET,
  expectedOrderId?: number | string,
): RestaurantOrderLinkClaims | null => {
  const secret = requireSigningSecret(secretValue);
  const parts = String(token || "")
    .trim()
    .split(".");
  if (parts.length !== 3) return null;

  const [version, payload, signature] = parts;
  if (version !== RESTAURANT_ORDER_LINK_TOKEN_VERSION) return null;
  if (
    !/^[A-Za-z0-9_-]+$/.test(payload) ||
    !/^[A-Za-z0-9_-]+$/.test(signature)
  ) {
    return null;
  }

  let decodedOrderId: string;
  let suppliedSignature: Buffer;
  try {
    decodedOrderId = Buffer.from(payload, "base64url").toString("ascii");
    suppliedSignature = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (!/^[1-9][0-9]*$/.test(decodedOrderId)) return null;
  if (Buffer.from(decodedOrderId, "ascii").toString("base64url") !== payload)
    return null;
  if (suppliedSignature.toString("base64url") !== signature) return null;

  const expectedSignature = createHmac("sha256", secret)
    .update(`${version}.${payload}`, "ascii")
    .digest();
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return null;
  }

  if (
    expectedOrderId !== undefined &&
    decodedOrderId !== normalizeOrderId(expectedOrderId)
  ) {
    return null;
  }
  return { version, orderId: Number(decodedOrderId) };
};
