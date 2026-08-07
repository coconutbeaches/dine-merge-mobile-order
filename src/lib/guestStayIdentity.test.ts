import { describe, expect, it } from 'vitest';
import {
  normalizeGuestFirstName,
  resolveActiveStayForFirstName,
  resolveRestaurantIdentity,
  resolveUniqueActiveStay,
  type IncomingGuestIdentityCandidate,
  type StayIdentityCandidate,
} from './guestStayIdentity';

const today = '2026-08-07';
const activeStay = (stay_id: string) => ({
  stay_id,
  check_in_date: '2026-08-01',
  check_out_date: '2026-08-14',
});

const booking = (
  stay_id: string,
  first_name: string,
  overrides: Partial<IncomingGuestIdentityCandidate> = {},
): IncomingGuestIdentityCandidate => ({
  id: `${stay_id}-${first_name}`,
  stay_id,
  first_name,
  phone_e164: null,
  nationality_alpha3: null,
  ...activeStay(stay_id),
  ...overrides,
});

const provisionalIdentity = (
  stay_id: string,
  identity_id = 'identity-1',
): StayIdentityCandidate => ({
  identity_id,
  stay_id,
  phone_e164: '+32485085210',
  whapi_lid: null,
  observed_first_name: null,
  observed_display_name: null,
  linked_incoming_guest_id: null,
  verified: false,
  evidence: { group_action: 'rescan' },
});

describe('guest stay identity resolution', () => {
  it('normalizes diacritics and punctuation', () => {
    expect(normalizeGuestFirstName(' Élodie ')).toBe('elodie');
  });

  it('resolves one exact first-name match among active stays', () => {
    expect(
      resolveUniqueActiveStay(
        'Lode',
        [{ stay_id: 'BH_VANSTEEN', observed_first_name: 'Lode' }],
        [{ stay_id: 'BH_VANSTEEN', check_in_date: '2026-08-01', check_out_date: '2026-08-10' }],
        '2026-08-07',
      ),
    ).toBe('BH_VANSTEEN');
  });

  it('does not resolve a name shared by two active stays', () => {
    expect(
      resolveUniqueActiveStay(
        'Alex',
        [
          { stay_id: 'STAY_A', observed_first_name: 'Alex' },
          { stay_id: 'STAY_B', observed_first_name: 'Alex' },
        ],
        [
          { stay_id: 'STAY_A', check_in_date: '2026-08-01', check_out_date: '2026-08-10' },
          { stay_id: 'STAY_B', check_in_date: '2026-08-05', check_out_date: '2026-08-12' },
        ],
        '2026-08-07',
      ),
    ).toBeNull();
  });

  it('does not resolve an inactive or fuzzy-only candidate', () => {
    expect(
      resolveUniqueActiveStay(
        'Jon',
        [{ stay_id: 'OLD_STAY', observed_first_name: 'John' }],
        [{ stay_id: 'OLD_STAY', check_in_date: '2026-07-01', check_out_date: '2026-07-05' }],
        '2026-08-07',
      ),
    ).toBeNull();
  });

  it('resolves a unique booking first name to one provisional identity', () => {
    const result = resolveRestaurantIdentity(
      'Laurence',
      [provisionalIdentity('BH_VANSTEEN')],
      [activeStay('BH_VANSTEEN')],
      [booking('BH_VANSTEEN', 'Laurence', { nationality_alpha3: 'BEL' })],
      today,
    );

    expect(result).toMatchObject({
      stayId: 'BH_VANSTEEN',
      identity: { identity_id: 'identity-1' },
      reason: 'unique_booking_name',
    });
  });

  it('does not choose a phone identity when two active stays share the first name', () => {
    const result = resolveRestaurantIdentity(
      'Laurence',
      [provisionalIdentity('STAY_A', 'identity-a'), provisionalIdentity('STAY_B', 'identity-b')],
      [activeStay('STAY_A'), activeStay('STAY_B')],
      [booking('STAY_A', 'Laurence'), booking('STAY_B', 'Laurence')],
      today,
    );

    expect(result).toEqual({ stayId: null, identity: null, reason: 'ambiguous' });
  });

  it('keeps stay billing possible but refuses phone attribution for two provisional identities', () => {
    const result = resolveRestaurantIdentity(
      'Laurence',
      [provisionalIdentity('BH_VANSTEEN', 'identity-a'), provisionalIdentity('BH_VANSTEEN', 'identity-b')],
      [activeStay('BH_VANSTEEN')],
      [booking('BH_VANSTEEN', 'Laurence')],
      today,
    );

    expect(result).toEqual({ stayId: 'BH_VANSTEEN', identity: null, reason: 'unique_booking_name' });
  });

  it('refuses phone attribution when the booking has duplicate first names', () => {
    const result = resolveRestaurantIdentity(
      'Laurence',
      [provisionalIdentity('BH_VANSTEEN')],
      [activeStay('BH_VANSTEEN')],
      [booking('BH_VANSTEEN', 'Laurence'), booking('BH_VANSTEEN', 'Laurence', { id: 'duplicate' })],
      today,
    );

    expect(result).toEqual({ stayId: 'BH_VANSTEEN', identity: null, reason: 'unique_booking_name' });
  });

  it('persists restaurant evidence and reconciles the provisional phone to Laurence', async () => {
    const identity = provisionalIdentity('BH_VANSTEEN');
    const bookings = [booking('BH_VANSTEEN', 'Laurence', { id: 'laurence-id', nationality_alpha3: 'BEL' })];
    const updates: Record<string, unknown>[] = [];
    const client = {
      from(table: string) {
        const data = table === 'incoming_guests' ? bookings : [identity];
        return {
          select() { return this; },
          eq() { return this; },
          in() { return this; },
          limit: async () => ({ data, error: null }),
          update(values: Record<string, unknown>) {
            updates.push(values);
            return { eq: async () => ({ error: null }) };
          },
        };
      },
    };

    await expect(resolveActiveStayForFirstName(client as never, 'Laurence', today)).resolves.toBe('BH_VANSTEEN');
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      observed_first_name: 'Laurence',
      observed_display_name: 'Laurence',
      linked_incoming_guest_id: 'laurence-id',
      match_method: 'exact_first_name_and_phone_country',
      match_confidence: 0.96,
      verified: true,
    });
    expect(updates[0].evidence).toMatchObject({ group_action: 'rescan' });
    expect(updates[0].evidence).toHaveProperty('first_name_observations');
  });

  it('does not mutate or attribute an unmatched first name', async () => {
    const updates: Record<string, unknown>[] = [];
    const client = {
      from(table: string) {
        const data = table === 'incoming_guests' ? [booking('BH_VANSTEEN', 'Lode')] : [provisionalIdentity('BH_VANSTEEN')];
        return {
          select() { return this; },
          eq() { return this; },
          in() { return this; },
          limit: async () => ({ data, error: null }),
          update(values: Record<string, unknown>) {
            updates.push(values);
            return { eq: async () => ({ error: null }) };
          },
        };
      },
    };

    await expect(resolveActiveStayForFirstName(client as never, 'Unknown', today)).resolves.toBeNull();
    expect(updates).toEqual([]);
  });

  it('does not overwrite a verified identity when a conflicting name is entered', async () => {
    const verifiedIdentity: StayIdentityCandidate = {
      ...provisionalIdentity('BH_VANSTEEN'),
      observed_first_name: 'Lode',
      observed_display_name: 'Lode',
      linked_incoming_guest_id: 'lode-id',
      verified: true,
    };
    const updates: Record<string, unknown>[] = [];
    const client = {
      from(table: string) {
        const data = table === 'incoming_guests'
          ? [booking('BH_VANSTEEN', 'Laurence', { nationality_alpha3: 'BEL' })]
          : [verifiedIdentity];
        return {
          select() { return this; },
          eq() { return this; },
          in() { return this; },
          limit: async () => ({ data, error: null }),
          update(values: Record<string, unknown>) {
            updates.push(values);
            return { eq: async () => ({ error: null }) };
          },
        };
      },
    };

    await expect(resolveActiveStayForFirstName(client as never, 'Laurence', today)).resolves.toBe('BH_VANSTEEN');
    expect(updates).toEqual([]);
  });
});
