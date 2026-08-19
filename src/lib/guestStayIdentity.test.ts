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
      reason: 'unique_guest_name',
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

    expect(result).toEqual({ stayId: 'BH_VANSTEEN', identity: null, reason: 'unique_guest_name' });
  });

  it('refuses phone attribution when the booking has duplicate first names', () => {
    const result = resolveRestaurantIdentity(
      'Laurence',
      [provisionalIdentity('BH_VANSTEEN')],
      [activeStay('BH_VANSTEEN')],
      [booking('BH_VANSTEEN', 'Laurence'), booking('BH_VANSTEEN', 'Laurence', { id: 'duplicate' })],
      today,
    );

    expect(result).toEqual({ stayId: 'BH_VANSTEEN', identity: null, reason: 'unique_guest_name' });
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
          lte() { return this; },
          gte() { return this; },
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
          lte() { return this; },
          gte() { return this; },
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
          lte() { return this; },
          gte() { return this; },
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

describe('passport roster resolution', () => {
  const today = '2026-08-19';
  const stayDates = { check_in_date: '2026-08-19', check_out_date: '2026-08-24' };
  // NH_HOSCH is booked under Andrea; Christian and the children are passport rows.
  const bookings = [
    { id: 'b1', stay_id: 'NH_HOSCH', row_type: 'booking', first_name: 'Andrea',
      phone_e164: '+436645346976', nationality_alpha3: null, ...stayDates },
  ];
  const roster = [
    { id: 'g1', stay_id: 'NH_HOSCH', row_type: 'guest', first_name: 'CHRISTIAN',
      phone_e164: null, nationality_alpha3: 'AUT', ...stayDates },
    { id: 'g2', stay_id: 'NH_HOSCH', row_type: 'guest', first_name: 'OSKAR',
      phone_e164: null, nationality_alpha3: 'AUT', ...stayDates },
  ];
  const activeStays = [{ stay_id: 'NH_HOSCH', ...stayDates }];

  it('resolves a non-booker named only on a passport row', () => {
    const result = resolveRestaurantIdentity('Christian', [], activeStays, bookings, today, roster);
    expect(result.stayId).toBe('NH_HOSCH');
  });

  it('still resolves the booker', () => {
    const result = resolveRestaurantIdentity('Andrea', [], activeStays, bookings, today, roster);
    expect(result.stayId).toBe('NH_HOSCH');
  });

  it('resolves a child on the roster', () => {
    const result = resolveRestaurantIdentity('Oskar', [], activeStays, bookings, today, roster);
    expect(result.stayId).toBe('NH_HOSCH');
  });

  it('returns no match for a name on neither booking nor roster', () => {
    const result = resolveRestaurantIdentity('Nobody', [], activeStays, bookings, today, roster);
    expect(result).toEqual({ stayId: null, identity: null, reason: 'no_match' });
  });

  it('fails closed when two active stays share a roster name', () => {
    const otherStay = { stay_id: 'JH_BUSINARO', ...stayDates };
    const otherRoster = [{
      id: 'g9', stay_id: 'JH_BUSINARO', row_type: 'guest', first_name: 'Christian',
      phone_e164: null, nationality_alpha3: 'ITA', ...stayDates,
    }];
    const result = resolveRestaurantIdentity(
      'Christian', [], [...activeStays, otherStay], bookings, today, [...roster, ...otherRoster],
    );
    expect(result).toEqual({ stayId: null, identity: null, reason: 'ambiguous' });
  });

  it('fails closed when a booking name collides with another stay roster name', () => {
    const otherStay = { stay_id: 'JH_BUSINARO', ...stayDates };
    const otherBooking = [{
      id: 'b9', stay_id: 'JH_BUSINARO', row_type: 'booking', first_name: 'Christian',
      phone_e164: '+39000', nationality_alpha3: null, ...stayDates,
    }];
    const result = resolveRestaurantIdentity(
      'Christian', [], [...activeStays, otherStay], [...bookings, ...otherBooking], today, roster,
    );
    expect(result.stayId).toBeNull();
    expect(result.reason).toBe('ambiguous');
  });

  it('ignores roster rows from inactive stays', () => {
    const pastRoster = [{
      id: 'g8', stay_id: 'OLD_STAY', row_type: 'guest', first_name: 'Christian',
      phone_e164: null, nationality_alpha3: 'AUT',
      check_in_date: '2026-08-01', check_out_date: '2026-08-05',
    }];
    const result = resolveRestaurantIdentity(
      'Christian', [], activeStays, bookings, today, [...roster, ...pastRoster],
    );
    expect(result.stayId).toBe('NH_HOSCH');
  });
});

describe('cross-source ambiguity and roster-only enrichment', () => {
  const today = '2026-08-19';
  const dates = { check_in_date: '2026-08-19', check_out_date: '2026-08-24' };
  const stays = [{ stay_id: 'NH_HOSCH', ...dates }, { stay_id: 'BH_OTHER', ...dates }];

  it('fails closed when an observed name on one stay collides with a roster name on another', () => {
    const identities = [{
      identity_id: 'i1', stay_id: 'BH_OTHER', phone_e164: '+32000', whapi_lid: null,
      observed_first_name: 'Christian', observed_display_name: 'Christian',
      linked_incoming_guest_id: null, verified: false, evidence: null,
    }];
    const roster = [{
      id: 'g1', stay_id: 'NH_HOSCH', row_type: 'guest', first_name: 'CHRISTIAN',
      phone_e164: null, nationality_alpha3: 'AUT', ...dates,
    }];
    const result = resolveRestaurantIdentity('Christian', identities, stays, [], today, roster);
    expect(result).toEqual({ stayId: null, identity: null, reason: 'ambiguous' });
  });

  it('fails closed when two stays share an observed name even if one has a roster match', () => {
    const identities = [
      { identity_id: 'i1', stay_id: 'NH_HOSCH', phone_e164: '+43000', whapi_lid: null,
        observed_first_name: 'Chris', observed_display_name: 'Chris',
        linked_incoming_guest_id: null, verified: false, evidence: null },
      { identity_id: 'i2', stay_id: 'BH_OTHER', phone_e164: '+44000', whapi_lid: null,
        observed_first_name: 'Chris', observed_display_name: 'Chris',
        linked_incoming_guest_id: null, verified: false, evidence: null },
    ];
    const result = resolveRestaurantIdentity('Chris', identities, stays, [], today, []);
    expect(result.stayId).toBeNull();
    expect(result.reason).toBe('ambiguous');
  });

  it('never enriches an identity on a roster-only match', () => {
    // The lone provisional phone most likely belongs to the booker, not Christian.
    const identities = [{
      identity_id: 'andrea-phone', stay_id: 'NH_HOSCH', phone_e164: '+436645346976',
      whapi_lid: null, observed_first_name: null, observed_display_name: null,
      linked_incoming_guest_id: null, verified: false, evidence: null,
    }];
    const roster = [{
      id: 'g1', stay_id: 'NH_HOSCH', row_type: 'guest', first_name: 'CHRISTIAN',
      phone_e164: null, nationality_alpha3: 'AUT', ...dates,
    }];
    const result = resolveRestaurantIdentity(
      'Christian', identities, [{ stay_id: 'NH_HOSCH', ...dates }], [], today, roster,
    );
    expect(result.stayId).toBe('NH_HOSCH');
    expect(result.identity).toBeNull();
    expect(result.reason).toBe('unique_guest_name');
  });

  it('still enriches on a booking-name match', () => {
    const identities = [{
      identity_id: 'p1', stay_id: 'BH_VAN', phone_e164: '+32485085210', whapi_lid: null,
      observed_first_name: null, observed_display_name: null,
      linked_incoming_guest_id: null, verified: false, evidence: null,
    }];
    const bookings = [{
      id: 'b1', stay_id: 'BH_VAN', row_type: 'booking', first_name: 'Laurence',
      phone_e164: '+32474573647', nationality_alpha3: 'BEL', ...dates,
    }];
    const result = resolveRestaurantIdentity(
      'Laurence', identities, [{ stay_id: 'BH_VAN', ...dates }], bookings, today, [],
    );
    expect(result.stayId).toBe('BH_VAN');
    expect(result.identity?.identity_id).toBe('p1');
  });
});
