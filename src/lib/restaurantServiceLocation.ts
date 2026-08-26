const NUMERIC_TABLE_PATTERN = /^[1-9]\d*$/;

export function normalizeRestaurantServiceLocation(value: unknown): string | null {
  const raw = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (NUMERIC_TABLE_PATTERN.test(raw)) {
    return String(Number(raw));
  }

  const collapsed = raw.replace(/[\s_-]+/g, '').toLowerCase();
  if (collapsed === 'takeaway') {
    return 'Take Away';
  }

  return null;
}

export function isRestaurantServiceLocation(value: unknown): boolean {
  return normalizeRestaurantServiceLocation(value) !== null;
}
