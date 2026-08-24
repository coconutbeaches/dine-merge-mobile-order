export const RESTAURANT_ORDER_REF_PATTERN = /^[1-9][0-9]*$/;

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
  return base;
};

export const restaurantOrderRefFromHash = (hash: string): string | null => {
  const fragment = String(hash || "").replace(/^#/, "");
  const ref = new URLSearchParams(fragment).get("ref")?.trim() ?? "";
  return RESTAURANT_ORDER_REF_PATTERN.test(ref) ? ref : null;
};
