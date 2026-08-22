export const RESTAURANT_ORDER_REF_PATTERN =
  /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export const appendRestaurantOrderRef = (
  readableMessage: string,
  signedReference: string,
): string => {
  const base = readableMessage.trimEnd();
  const ref = signedReference.trim();
  if (!base || !RESTAURANT_ORDER_REF_PATTERN.test(ref)) {
    throw new Error("A valid signed restaurant order reference is required");
  }
  return `${base}\n\nRef: ${ref}`;
};

export const restaurantOrderRefFromHash = (hash: string): string | null => {
  const fragment = String(hash || "").replace(/^#/, "");
  const ref = new URLSearchParams(fragment).get("ref")?.trim() ?? "";
  return RESTAURANT_ORDER_REF_PATTERN.test(ref) ? ref : null;
};
