import type { SupabaseClient } from '@supabase/supabase-js';

export interface StayIdentityCandidate {
  stay_id: string;
  observed_first_name: string | null;
}

export interface ActiveStayRow {
  stay_id: string;
  check_in_date: string | null;
  check_out_date: string | null;
}

const NAME_ALIASES: Record<string, string> = {
  jon: 'jonathan',
  jonny: 'jonathan',
  sue: 'susan',
  suzy: 'susan',
  liz: 'elizabeth',
  lizzy: 'elizabeth',
  bill: 'william',
  bob: 'robert',
  rob: 'robert',
  stephan: 'stefan',
  muhammad: 'mohamed',
};

export function normalizeGuestFirstName(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function canonicalGuestFirstName(value: unknown): string {
  const normalized = normalizeGuestFirstName(value);
  return NAME_ALIASES[normalized] ?? normalized;
}

function isActiveStay(row: ActiveStayRow, today: string): boolean {
  return Boolean(
    row.check_in_date &&
      row.check_out_date &&
      row.check_in_date <= today &&
      row.check_out_date >= today,
  );
}

/**
 * Resolve only a unique active stay. Fuzzy similarity is intentionally not
 * used here: a first-name-only QR registration must fail closed on ambiguity.
 */
export function resolveUniqueActiveStay(
  firstName: string,
  identities: StayIdentityCandidate[],
  activeStays: ActiveStayRow[],
  today: string,
): string | null {
  const target = canonicalGuestFirstName(firstName);
  if (!target) return null;

  const activeStayIds = new Set(
    activeStays
      .filter((row) => isActiveStay(row, today))
      .map((row) => row.stay_id),
  );
  const matchingStayIds = new Set(
    identities
      .filter(
        (row) =>
          activeStayIds.has(row.stay_id) &&
          canonicalGuestFirstName(row.observed_first_name) === target,
      )
      .map((row) => row.stay_id),
  );

  return matchingStayIds.size === 1 ? [...matchingStayIds][0] : null;
}

/** Read-only lookup used by the server-side registration route. */
export async function resolveActiveStayForFirstName(
  client: SupabaseClient<any>,
  firstName: string,
  today = new Date().toISOString().slice(0, 10),
): Promise<string | null> {
  const identityResult = await client
    .from('stay_guest_identities')
    .select('stay_id, observed_first_name')
    .not('observed_first_name', 'is', null)
    .limit(500);
  if (identityResult.error) throw identityResult.error;

  const identities = (identityResult.data ?? []) as StayIdentityCandidate[];
  const stayIds = [...new Set(identities.map((row) => row.stay_id).filter(Boolean))];
  if (!stayIds.length) return null;

  const activeResult = await client
    .from('incoming_guests')
    .select('stay_id, check_in_date, check_out_date')
    .eq('row_type', 'booking')
    .in('stay_id', stayIds)
    .limit(500);
  if (activeResult.error) throw activeResult.error;

  return resolveUniqueActiveStay(
    firstName,
    identities,
    (activeResult.data ?? []) as ActiveStayRow[],
    today,
  );
}
