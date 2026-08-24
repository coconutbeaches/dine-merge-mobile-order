import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES } from "./restaurantOrderLink";

export const RESTAURANT_GUEST_HANDSHAKE_TOKEN_VERSION = "h1";
export const RESTAURANT_GUEST_HANDSHAKE_DOMAIN = "restaurant-guest-handshake";
export const RESTAURANT_GUEST_HANDSHAKE_CANARY_TABLE = "6";
export const RESTAURANT_GUEST_HANDSHAKE_TTL_MINUTES = 15;
export const RESTAURANT_GUEST_HANDSHAKE_COMPLETION_TTL_MINUTES = 120;
export const RESTAURANT_WHATSAPP_DIGITS = "66631457299";

const SHORT_REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RESTAURANT_GUEST_HANDSHAKE_SHORT_REF_PATTERN =
  /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/;

const signingInput = (nonce: string): string =>
  `${RESTAURANT_GUEST_HANDSHAKE_DOMAIN}:${RESTAURANT_GUEST_HANDSHAKE_TOKEN_VERSION}.${nonce}`;

const issueShortRef = (): string => {
  const bytes = randomBytes(10);
  const chars = Array.from(bytes, (byte) => SHORT_REF_ALPHABET[byte & 31]);
  return `${chars.slice(0, 5).join("")}-${chars.slice(5).join("")}`;
};

export const issueRestaurantGuestHandshakeRef = (_secretValue?: string): string =>
  issueShortRef();

const verifyLegacySignedRef = (ref: string, secretValue?: string): boolean => {
  const secret = secretValue?.trim();
  if (!secret || Buffer.byteLength(secret, "utf8") < RESTAURANT_ORDER_LINK_MIN_SECRET_BYTES) {
    return false;
  }

  const parts = ref.split(".");
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

export const verifyRestaurantGuestHandshakeRef = (
  ref: string,
  secretValue = process.env.RESTAURANT_ORDER_LINK_SIGNING_SECRET,
): boolean => {
  const normalized = String(ref || "").trim();
  if (RESTAURANT_GUEST_HANDSHAKE_SHORT_REF_PATTERN.test(normalized)) {
    return true;
  }
  // Temporary compatibility for a handshake that was generated immediately
  // before this rollout and is still inside the short completion window.
  return verifyLegacySignedRef(normalized, secretValue);
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
