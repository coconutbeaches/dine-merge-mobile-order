import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES,
  RESTAURANT_ORDER_LINK_SIGNING_SECRET_ENV,
  RestaurantOrderLinkConfigError,
} from "./restaurantOrderLink";

export const RESTAURANT_GUEST_HANDSHAKE_TOKEN_VERSION = "h1";
export const RESTAURANT_GUEST_HANDSHAKE_DOMAIN = "restaurant-guest-handshake";
export const RESTAURANT_GUEST_HANDSHAKE_CANARY_TABLE = "6";
export const RESTAURANT_GUEST_HANDSHAKE_TTL_MINUTES = 15;
export const RESTAURANT_GUEST_HANDSHAKE_COMPLETION_TTL_MINUTES = 120;
export const RESTAURANT_WHATSAPP_DIGITS = "66631457299";

const requireSigningSecret = (value?: string): string => {
  const secret = value?.trim();
  if (!secret) {
    throw new RestaurantOrderLinkConfigError(
      `${RESTAURANT_ORDER_LINK_SIGNING_SECRET_ENV} is required`,
    );
  }
  if (Buffer.byteLength(secret, "utf8") < RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES) {
    throw new RestaurantOrderLinkConfigError(
      `${RESTAURANT_ORDER_LINK_SIGNING_SECRET_ENV} must be at least ${RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES} bytes`,
    );
  }
  return secret;
};

const signingInput = (nonce: string): string =>
  `${RESTAURANT_GUEST_HANDSHAKE_DOMAIN}:${RESTAURANT_GUEST_HANDSHAKE_TOKEN_VERSION}.${nonce}`;

export const issueRestaurantGuestHandshakeRef = (
  secretValue = process.env.RESTAURANT_ORDER_LINK_SIGNING_SECRET,
): string => {
  const secret = requireSigningSecret(secretValue);
  const nonce = randomBytes(24).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(signingInput(nonce), "ascii")
    .digest("base64url");
  return `${RESTAURANT_GUEST_HANDSHAKE_TOKEN_VERSION}.${nonce}.${signature}`;
};

export const verifyRestaurantGuestHandshakeRef = (
  ref: string,
  secretValue = process.env.RESTAURANT_ORDER_LINK_SIGNING_SECRET,
): boolean => {
  const secret = requireSigningSecret(secretValue);
  const parts = String(ref || "").trim().split(".");
  if (parts.length !== 3) return false;
  const [version, nonce, signature] = parts;
  if (version !== RESTAURANT_GUEST_HANDSHAKE_TOKEN_VERSION) return false;
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(nonce)) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(signature)) return false;

  let supplied: Buffer;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (supplied.toString("base64url") !== signature) return false;

  const expected = createHmac("sha256", secret)
    .update(signingInput(nonce), "ascii")
    .digest();
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
};

export const hashRestaurantGuestHandshakeRef = (ref: string): string =>
  createHash("sha256").update(String(ref || "").trim(), "utf8").digest("hex");

export const normalizeHandshakeFirstName = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
};

export const buildRestaurantHandshakeWhatsAppUrl = (
  firstName: string,
  ref: string,
): string => {
  const body = `Hi my name is ${firstName}. Please send me the menu\n\nRef: ${ref}`;
  return `https://wa.me/${RESTAURANT_WHATSAPP_DIGITS}?text=${encodeURIComponent(body)}`;
};
