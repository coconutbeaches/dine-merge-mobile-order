import type { SupabaseClient } from '@supabase/supabase-js';

export interface StayIdentityCandidate {
  identity_id?: string;
  stay_id: string;
  phone_e164?: string | null;
  whapi_lid?: string | null;
  observed_first_name: string | null;
  observed_display_name?: string | null;
  linked_incoming_guest_id?: string | null;
  verified?: boolean;
  evidence?: Record<string, unknown> | null;
}

export interface ActiveStayRow {
  stay_id: string;
  check_in_date: string | null;
  check_out_date: string | null;
}

export interface IncomingGuestIdentityCandidate extends ActiveStayRow {
  id: string;
  first_name: string;
  phone_e164: string | null;
  nationality_alpha3: string | null;
  /** 'booking' is the reservation; 'guest' rows are passport identities. */
  row_type?: string;
}

export interface RestaurantIdentityResolution {
  stayId: string | null;
  identity: StayIdentityCandidate | null;
  reason: 'named_identity' | 'unique_guest_name' | 'ambiguous' | 'no_match';
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

const PHONE_COUNTRY_PREFIXES = [
  '+353', '+351', '+972', '+971', '+66', '+32', '+49', '+33', '+31', '+39',
  '+44', '+41', '+43', '+34', '+1', '+7', '+20', '+27', '+30', '+45', '+46',
  '+47', '+48', '+52', '+55', '+61', '+64', '+65', '+81', '+82', '+86', '+91',
];

const NATIONALITY_PHONE_COUNTRY: Record<string, string> = {
  BEL: '+32',
  CHE: '+41',
  DEU: '+49',
  ESP: '+34',
  FRA: '+33',
  GBR: '+44',
  IRL: '+353',
  ITA: '+39',
  NLD: '+31',
  THA: '+66',
  USA: '+1',
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

function normalizePhone(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.startsWith('00') ? digits.slice(2) : digits;
}

function phoneCountryCallingCode(value: unknown): string | null {
  const normalized = String(value ?? '').trim().replace(/^00/, '+');
  if (!normalized.startsWith('+')) return null;
  return PHONE_COUNTRY_PREFIXES
    .sort((left, right) => right.length - left.length)
    .find((prefix) => normalized.startsWith(prefix)) ?? null;
}

function candidateCountry(candidate: IncomingGuestIdentityCandidate): string | null {
  return (
    phoneCountryCallingCode(candidate.phone_e164) ??
    NATIONALITY_PHONE_COUNTRY[String(candidate.nationality_alpha3 ?? '').toUpperCase()] ??
    null
  );
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

function matchIdentityToIncomingGuest(
  identity: StayIdentityCandidate,
  candidates: IncomingGuestIdentityCandidate[],
): { guestId: string; method: string; confidence: number } | null {
  const observedName = canonicalGuestFirstName(identity.observed_first_name);
  const observedPhone = normalizePhone(identity.phone_e164);
  const observedCountry = phoneCountryCallingCode(identity.phone_e164);
  const scored = candidates.flatMap((candidate) => {
    const exactPhone = Boolean(
      observedPhone && normalizePhone(candidate.phone_e164) === observedPhone,
    );
    const exactName = Boolean(
      observedName && observedName === canonicalGuestFirstName(candidate.first_name),
    );
    const countryMatch = Boolean(
      observedCountry && candidateCountry(candidate) === observedCountry,
    );
    if (!exactPhone && !exactName) return [];
    if (exactPhone) {
      return [{ guestId: candidate.id, method: exactName ? 'exact_first_name_and_phone' : 'exact_phone', confidence: 1 }];
    }
    return [{
      guestId: candidate.id,
      method: countryMatch ? 'exact_first_name_and_phone_country' : 'exact_first_name_only',
      confidence: countryMatch ? 0.96 : 0.82,
    }];
  });

  if (!scored.length) return null;
  const bestConfidence = Math.max(...scored.map((match) => match.confidence));
  const best = scored.filter((match) => match.confidence === bestConfidence);
  return best.length === 1 && bestConfidence >= 0.96 ? best[0] : null;
}

/** Resolve the stay and, only when safe, the single identity row to enrich. */
export function resolveRestaurantIdentity(
  firstName: string,
  identities: StayIdentityCandidate[],
  activeStays: ActiveStayRow[],
  bookings: IncomingGuestIdentityCandidate[],
  today: string,
  roster: IncomingGuestIdentityCandidate[] = [],
): RestaurantIdentityResolution {
  const namedStayId = resolveUniqueActiveStay(firstName, identities, activeStays, today);
  if (namedStayId) {
    const matchingNamedIdentities = identities.filter(
      (identity) =>
        identity.stay_id === namedStayId &&
        canonicalGuestFirstName(identity.observed_first_name) === canonicalGuestFirstName(firstName),
    );
    return {
      stayId: namedStayId,
      identity: matchingNamedIdentities.length === 1 ? matchingNamedIdentities[0] : null,
      reason: 'named_identity',
    };
  }

  // A stay's passport rows name every guest, not just the booker. Without
  // them only the person who made the booking can be recognised: NH_HOSCH is
  // booked under Andrea, so Christian and the children would fall through to
  // walk-in despite being confirmed guests of an active stay. Booking and
  // roster names are pooled so cross-source ambiguity still fails closed.
  const nameMatchStayIds = new Set(
    [...bookings, ...roster]
      .filter((row) => isActiveStay(row, today))
      .filter((row) => canonicalGuestFirstName(row.first_name) === canonicalGuestFirstName(firstName))
      .map((row) => row.stay_id),
  );
  if (nameMatchStayIds.size !== 1) {
    return { stayId: null, identity: null, reason: nameMatchStayIds.size ? 'ambiguous' : 'no_match' };
  }

  const stayId = [...nameMatchStayIds][0];
  const provisionalIdentities = identities.filter(
    (identity) =>
      identity.stay_id === stayId &&
      !identity.observed_first_name &&
      Boolean(identity.phone_e164 || identity.whapi_lid),
  );
  // Enrichment attaches a name to a provisional identity, so it needs exactly
  // one candidate on each side. Roster rows count here too, otherwise a stay
  // resolved by roster name could never enrich.
  const matchingNamed = [...bookings, ...roster].filter(
    (row) =>
      row.stay_id === stayId &&
      isActiveStay(row, today) &&
      canonicalGuestFirstName(row.first_name) === canonicalGuestFirstName(firstName),
  );

  return {
    stayId,
    identity: provisionalIdentities.length === 1 && matchingNamed.length === 1
      ? provisionalIdentities[0]
      : null,
    reason: 'unique_guest_name',
  };
}

function mergeRestaurantEvidence(
  identity: StayIdentityCandidate,
  firstName: string,
): Record<string, unknown> {
  const existing = identity.evidence && typeof identity.evidence === 'object'
    ? identity.evidence
    : {};
  const observations = Array.isArray(existing.first_name_observations)
    ? existing.first_name_observations.filter((entry) => entry && typeof entry === 'object')
    : [];
  const normalized = normalizeGuestFirstName(firstName);
  const alreadyRecorded = observations.some(
    (entry) => normalizeGuestFirstName((entry as Record<string, unknown>).first_name) === normalized &&
      (entry as Record<string, unknown>).source === 'restaurant_qr_registration',
  );
  return {
    ...existing,
    first_name_observations: alreadyRecorded
      ? observations
      : [
          ...observations,
          { source: 'restaurant_qr_registration', first_name: firstName, observed_at: new Date().toISOString() },
        ],
  };
}

async function persistRestaurantFirstNameEvidence(
  client: SupabaseClient,
  identity: StayIdentityCandidate,
  firstName: string,
  bookings: IncomingGuestIdentityCandidate[],
): Promise<void> {
  if (!identity.identity_id) return;

  const updates: Record<string, unknown> = {
    evidence: mergeRestaurantEvidence(identity, firstName),
    updated_at: new Date().toISOString(),
  };
  const observedFirstName = identity.observed_first_name || firstName;
  if (!identity.observed_first_name && !identity.verified) {
    updates.observed_first_name = firstName;
    updates.observed_display_name = firstName;
  }

  const match = matchIdentityToIncomingGuest(
    { ...identity, observed_first_name: observedFirstName },
    bookings.filter((booking) => booking.stay_id === identity.stay_id),
  );
  if (match && (!identity.verified || !identity.linked_incoming_guest_id || identity.linked_incoming_guest_id === match.guestId)) {
    updates.linked_incoming_guest_id = match.guestId;
    updates.match_method = match.method;
    updates.match_confidence = match.confidence;
    updates.verified = true;
  }

  const result = await client
    .from('stay_guest_identities')
    .update(updates)
    .eq('identity_id', identity.identity_id);
  if (result.error) throw result.error;
}

/** Resolve a stay from a first-name registration and safely enrich one identity. */
export async function resolveActiveStayForFirstName(
  client: SupabaseClient,
  firstName: string,
  today = new Date().toISOString().slice(0, 10),
): Promise<string | null> {
  const activeResult = await client
    .from('incoming_guests')
    .select('id, stay_id, row_type, first_name, phone_e164, nationality_alpha3, check_in_date, check_out_date')
    .in('row_type', ['booking', 'guest'])
    .limit(2000);
  if (activeResult.error) throw activeResult.error;

  const allRows = (activeResult.data ?? []) as IncomingGuestIdentityCandidate[];
  // Anything not explicitly a passport row is treated as a booking, so a row
  // missing row_type keeps its previous meaning rather than vanishing.
  const roster = allRows.filter((row) => row.row_type === 'guest');
  const bookings = allRows.filter((row) => row.row_type !== 'guest');
  const activeStayIds = [...new Set(
    bookings.filter((booking) => isActiveStay(booking, today)).map((booking) => booking.stay_id),
  )];
  if (!activeStayIds.length) return null;

  const identityResult = await client
    .from('stay_guest_identities')
    .select('identity_id, stay_id, phone_e164, whapi_lid, observed_first_name, observed_display_name, linked_incoming_guest_id, verified, evidence')
    .in('stay_id', activeStayIds)
    .limit(1000);
  if (identityResult.error) throw identityResult.error;

  const identities = (identityResult.data ?? []) as StayIdentityCandidate[];
  const resolution = resolveRestaurantIdentity(
    firstName,
    identities,
    activeStayIds.map((stay_id) => ({ stay_id, check_in_date: today, check_out_date: today })),
    bookings,
    today,
    roster,
  );
  if (resolution.identity) {
    await persistRestaurantFirstNameEvidence(client, resolution.identity, firstName, bookings);
  }

  return resolution.stayId;
}
