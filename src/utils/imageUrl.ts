const SUPABASE_PUBLIC_PREFIX = '/storage/v1/object/public';

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const getSupabaseUrl = () => {
  if (typeof process !== 'undefined') {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  }
  return '';
};

const normalizePath = (value: string) => value.replace(/^\/+/, '');

const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

/**
 * Resolves a stored Supabase image path into a fully qualified public URL.
 * Accepts absolute URLs, Supabase storage paths, or bare object keys.
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

  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    return trimmed;
  }

  // Already a Supabase public object path (with or without leading slash)
  if (trimmed.startsWith(SUPABASE_PUBLIC_PREFIX)) {
    return `${supabaseUrl}${ensureLeadingSlash(trimmed)}`;
  }

  if (trimmed.startsWith(`/${SUPABASE_PUBLIC_PREFIX}`)) {
    return `${supabaseUrl}${trimmed}`;
  }

  if (trimmed.startsWith(SUPABASE_PUBLIC_PREFIX.slice(1))) {
    return `${supabaseUrl}/${trimmed}`;
  }

  const normalized = normalizePath(trimmed);

  // If the key already includes a bucket, respect it. Otherwise default to products bucket.
  const segments = normalized.split('/');
  const bucket = segments[0];

  const knownBuckets = new Set(['products', 'product-images', 'menu-images']);
  const hasKnownBucket = knownBuckets.has(bucket);
  const bucketName = hasKnownBucket ? bucket : 'products';
  const pathSegments = hasKnownBucket ? segments.slice(1) : segments;
  const objectPath = pathSegments.filter(Boolean).join('/');
  const objectSuffix = objectPath ? `/${objectPath}` : '';

  return `${supabaseUrl}${SUPABASE_PUBLIC_PREFIX}/${bucketName}${objectSuffix}`;
};
