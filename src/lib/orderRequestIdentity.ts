import type { CartItem } from "@/types";

const STORAGE_KEY = "restaurant_order_request_v1";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StoredRequestIdentity = {
  clientRequestId: string;
  fingerprint: string;
};

export type OrderRequestFingerprintInput = {
  cartItems: CartItem[];
  tableNumber?: string | null;
  userId?: string | null;
  guestUserId?: string | null;
  adminCustomerId?: string | null;
};

let memoryIdentity: StoredRequestIdentity | null = null;

const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeValue(entry)]),
    );
  }
  return value;
};

export const buildOrderRequestFingerprint = ({
  cartItems,
  tableNumber,
  userId,
  guestUserId,
  adminCustomerId,
}: OrderRequestFingerprintInput): string =>
  JSON.stringify(
    normalizeValue({
      actor: {
        adminCustomerId: adminCustomerId ?? null,
        guestUserId: guestUserId ?? null,
        userId: userId ?? null,
      },
      cartItems: cartItems.map((item) => ({
        id: item.id,
        productId: item.menuItem.id,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions ?? {},
        specialInstructions: item.specialInstructions?.trim() || null,
      })),
      tableNumber: tableNumber?.trim() || null,
    }),
  );

const readIdentity = (): StoredRequestIdentity | null => {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      return memoryIdentity;
    }
    const parsed = JSON.parse(raw) as Partial<StoredRequestIdentity>;
    if (
      typeof parsed.clientRequestId === "string" &&
      UUID_PATTERN.test(parsed.clientRequestId) &&
      typeof parsed.fingerprint === "string"
    ) {
      memoryIdentity = {
        clientRequestId: parsed.clientRequestId.toLowerCase(),
        fingerprint: parsed.fingerprint,
      };
      return memoryIdentity;
    }
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    return memoryIdentity;
  }
  memoryIdentity = null;
  return null;
};

const writeIdentity = (identity: StoredRequestIdentity) => {
  memoryIdentity = identity;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    // The in-memory identity still protects rapid retries in this page lifetime.
  }
};

const createUuid = (): string => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID().toLowerCase();
  }
  if (!cryptoApi?.getRandomValues) {
    throw new Error("Secure UUID generation is unavailable");
  }
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join(""),
  ].join("-");
};

/** Return one persistent UUID for the current logical cart submission. */
export const getOrCreateOrderRequestId = (
  input: OrderRequestFingerprintInput,
): string => {
  const fingerprint = buildOrderRequestFingerprint(input);
  const current = readIdentity();
  if (current?.fingerprint === fingerprint) {
    return current.clientRequestId;
  }

  const identity = { clientRequestId: createUuid(), fingerprint };
  writeIdentity(identity);
  return identity.clientRequestId;
};

/**
 * Clear only the attempt that definitely succeeded. A stale completion from an
 * older request cannot erase a newer cart attempt's identity.
 */
export const completeOrderRequest = (clientRequestId: string): void => {
  const current = readIdentity();
  if (!current || current.clientRequestId !== clientRequestId.toLowerCase())
    return;
  memoryIdentity = null;
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // A subsequent request still receives a fresh in-memory identity.
  }
};

export const clearOrderRequestIdentity = (): void => {
  memoryIdentity = null;
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort cleanup for unavailable browser storage.
  }
};
