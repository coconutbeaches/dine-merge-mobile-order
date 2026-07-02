const PRODUCT_IMAGE_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_PRODUCT_IMAGE_BASE_URL?.replace(/\/+$/, '') || '';

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const normalizePath = (value: string) => value.replace(/^\/+/, '');

/**
 * Resolves a stored product image value.
 * Current product rows store absolute R2 URLs; bare object keys are also supported.
 */
export const getProductImageUrl = (rawPath: string | null | undefined): string | null => {
  if (!rawPath) {
    return null;
  }

  const trimmed = rawPath.trim();
  if (!trimmed) {
    return null;
  }

  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }

  if (!PRODUCT_IMAGE_PUBLIC_BASE_URL) {
    return trimmed;
  }

  const normalized = normalizePath(trimmed);
  return normalized ? `${PRODUCT_IMAGE_PUBLIC_BASE_URL}/${normalized}` : null;
};
