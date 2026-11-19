export const RESTAURANT_ORDER_REF_PATTERN = /^(?:[1-9][0-9]*|v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43})$/;

export const appendRestaurantOrderRef = (
  readableMessage: string,
  orderNumber: string,
): string => {
  const base = readableMessage.trimEnd();
  const ref = orderNumber.trim();
  if (!base || !RESTAURANT_ORDER_REF_PATTERN.test(ref)) {
    throw new Error("A valid restaurant order number is required");
  }

  // The readable message already contains `*Order: #<id>*`, which is the only
  // order identifier staff need to see. Do not append an opaque Ref line.
  return ref.startsWith("v1.") ? `${base}\n\nRef: ${ref}` : base;
};

export const restaurantOrderRefFromHash = (hash: string): string | null => {
  const fragment = String(hash || "").replace(/^#/, "");
  const ref = new URLSearchParams(fragment).get("ref")?.trim() ?? "";
  return RESTAURANT_ORDER_REF_PATTERN.test(ref) ? ref : null;
};

// Presentation check only. Cryptographic verification occurs exclusively server-side.
export const restaurantOrderRefMatchesId = (ref: string, orderId: number | string): boolean => {
  if (!RESTAURANT_ORDER_REF_PATTERN.test(ref)) return false;
  if (!ref.startsWith('v1.')) return ref === String(orderId);
  try {
    const body = ref.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return atob(body) === String(orderId);
  } catch { return false; }
};
