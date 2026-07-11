/**
 * Server-side guest registration logic (C3).
 *
 * Guest rows in `public.guests` are no longer created directly by the browser.
 * The anon/authenticated roles have no SELECT/INSERT access to the table; all
 * registration goes through POST /api/guest/register, which runs with the
 * service-role client and delegates the decision logic to `registerGuest`
 * below.
 *
 * This module is deliberately free of any Supabase import so the branching
 * behaviour (hotel guest, second family member, walk-in, duplicate
 * registration, and the per-stay cap) can be unit-tested against an in-memory
 * store.
 */

/** Maximum number of guests that may register under a single hotel stay_id. */
export const MAX_GUESTS_PER_STAY = 25;

/** Upper bounds on the free-text fields accepted from the client. */
export const MAX_FIRST_NAME_LENGTH = 100;
export const MAX_STAY_ID_LENGTH = 128;
export const MAX_TABLE_NUMBER_LENGTH = 128;

/** Session fields returned to the browser (mirrors GuestSession in guestSession.ts). */
export interface GuestSessionResponse {
  guest_user_id: string;
  first_name: string;
  stay_id: string;
}

/** Minimal guest record shape used internally. */
export interface GuestRecord {
  id: string;
  stay_id: string;
  first_name: string;
}

/**
 * Data-access port for `registerGuest`. The route implements this over the
 * service-role Supabase client; tests implement it in memory.
 */
export interface GuestRegistrationStore {
  /** Exact match on (stay_id, first_name); null when no such guest exists. */
  findByStayAndName(stayId: string, firstName: string): Promise<GuestRecord | null>;
  /** Number of guest rows already registered under a stay_id. */
  countByStay(stayId: string): Promise<number>;
  /** Insert a new guest row. May throw a Postgres duplicate-key error (code 23505). */
  insert(row: {
    id: string;
    stay_id: string;
    first_name: string;
    table_number: string | null;
  }): Promise<GuestRecord>;
}

export interface ParsedRegistration {
  firstName: string;
  /** null => walk-in guest (server generates a walkin-<uuid> stay_id). */
  stayId: string | null;
  tableNumber: string | null;
}

export type RegistrationFailure = { ok: false; status: number; error: string };
export type ParseResult = { ok: true; value: ParsedRegistration } | RegistrationFailure;
export type RegisterResult =
  | { ok: true; status: number; session: GuestSessionResponse }
  | RegistrationFailure;

interface RegisterOptions {
  generateId?: () => string;
}

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

/** True for placeholder stay ids the client uses to mean "no real hotel stay". */
const isWalkInPlaceholder = (stayId: string): boolean => {
  const lowered = stayId.toLowerCase();
  return lowered === 'unknown' || lowered.includes('walkin');
};

/**
 * Validate and normalise a raw request body into a ParsedRegistration.
 * A missing / empty / placeholder stay_id resolves to a walk-in (stayId: null).
 */
export function parseGuestRegistrationRequest(body: unknown): ParseResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, status: 400, error: 'Invalid registration payload' };
  }

  const record = body as Record<string, unknown>;

  const firstName = asTrimmedString(record.first_name);
  if (!firstName) {
    return { ok: false, status: 400, error: 'First name is required' };
  }
  if (firstName.length > MAX_FIRST_NAME_LENGTH) {
    return { ok: false, status: 400, error: 'First name is too long' };
  }

  const rawStayId = asTrimmedString(record.stay_id);
  let stayId: string | null = rawStayId;
  if (rawStayId) {
    if (rawStayId.length > MAX_STAY_ID_LENGTH) {
      return { ok: false, status: 400, error: 'Stay id is too long' };
    }
    // Placeholder stay ids are treated as walk-ins, never as a hotel family.
    if (isWalkInPlaceholder(rawStayId)) {
      stayId = null;
    }
  }

  const tableNumber = asTrimmedString(record.table_number);
  if (tableNumber && tableNumber.length > MAX_TABLE_NUMBER_LENGTH) {
    return { ok: false, status: 400, error: 'Table number is too long' };
  }

  return { ok: true, value: { firstName, stayId, tableNumber } };
}

const sessionFrom = (guest: GuestRecord): GuestSessionResponse => ({
  guest_user_id: guest.id,
  first_name: guest.first_name,
  stay_id: guest.stay_id,
});

const hasPostgresCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === code;

/**
 * Register a guest, preserving the behaviour of the old client-side
 * createGuestUser:
 *  - hotel guest: reuse an existing (stay_id, first_name) row if present,
 *    otherwise insert (subject to the per-stay cap);
 *  - second family member: a different first_name on the same stay_id inserts
 *    a new row;
 *  - walk-in: no stay_id supplied -> server generates a unique walkin-<uuid>
 *    stay_id and inserts, with no existence pre-check;
 *  - duplicate registration: same (stay_id, first_name), including an insert
 *    that races into a 23505, returns the existing row idempotently.
 */
export async function registerGuest(
  body: unknown,
  store: GuestRegistrationStore,
  options: RegisterOptions = {},
): Promise<RegisterResult> {
  const parsed = parseGuestRegistrationRequest(body);
  if (!parsed.ok) return parsed;

  const generateId = options.generateId ?? (() => crypto.randomUUID());
  const { firstName, stayId, tableNumber } = parsed.value;
  const isHotelGuest = stayId !== null;
  const finalStayId = stayId ?? `walkin-${generateId()}`;

  if (isHotelGuest) {
    const existing = await store.findByStayAndName(finalStayId, firstName);
    if (existing) {
      return { ok: true, status: 200, session: sessionFrom(existing) };
    }

    const existingCount = await store.countByStay(finalStayId);
    if (existingCount >= MAX_GUESTS_PER_STAY) {
      return {
        ok: false,
        status: 429,
        error: 'This stay already has the maximum number of registered guests. Please ask our staff for help.',
      };
    }
  }

  try {
    const created = await store.insert({
      id: generateId(),
      stay_id: finalStayId,
      first_name: firstName,
      table_number: tableNumber,
    });
    return { ok: true, status: 201, session: sessionFrom(created) };
  } catch (error) {
    if (isHotelGuest && hasPostgresCode(error, '23505')) {
      const existing = await store.findByStayAndName(finalStayId, firstName);
      if (existing) {
        return { ok: true, status: 200, session: sessionFrom(existing) };
      }
    }
    return { ok: false, status: 500, error: 'Failed to register guest' };
  }
}
