import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_GUESTS_PER_STAY,
  parseGuestRegistrationRequest,
  registerGuest,
  type GuestRecord,
  type GuestRegistrationStore,
} from './guestRegistration';

/** In-memory store that mimics the (stay_id, first_name) behaviour of public.guests. */
class FakeGuestStore implements GuestRegistrationStore {
  rows: GuestRecord[] = [];
  insertCalls = 0;
  // When true, the first insert throws a Postgres duplicate-key error.
  raceDuplicate: GuestRecord | null = null;

  async findByStayAndName(stayId: string, firstName: string): Promise<GuestRecord | null> {
    return this.rows.find((r) => r.stay_id === stayId && r.first_name === firstName) ?? null;
  }

  async countByStay(stayId: string): Promise<number> {
    return this.rows.filter((r) => r.stay_id === stayId).length;
  }

  async insert(row: { id: string; stay_id: string; first_name: string; table_number: string | null }): Promise<GuestRecord> {
    this.insertCalls += 1;
    if (this.raceDuplicate) {
      const existing = this.raceDuplicate;
      this.rows.push(existing); // another request won the race
      this.raceDuplicate = null;
      throw Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
    }
    const created: GuestRecord = { id: row.id, stay_id: row.stay_id, first_name: row.first_name };
    this.rows.push(created);
    return created;
  }
}

const seqIds = () => {
  let n = 0;
  return () => `id-${++n}`;
};

describe('parseGuestRegistrationRequest', () => {
  it('rejects a missing or empty first name', () => {
    expect(parseGuestRegistrationRequest({}).ok).toBe(false);
    expect(parseGuestRegistrationRequest({ first_name: '   ' }).ok).toBe(false);
  });

  it('rejects non-object payloads', () => {
    expect(parseGuestRegistrationRequest(null).ok).toBe(false);
    expect(parseGuestRegistrationRequest('x').ok).toBe(false);
  });

  it('trims fields and treats a real stay_id as a hotel guest', () => {
    const result = parseGuestRegistrationRequest({ first_name: '  Bouke ', stay_id: ' A9_SZEMES ', table_number: ' 12 ' });
    expect(result).toEqual({ ok: true, value: { firstName: 'Bouke', stayId: 'A9_SZEMES', tableNumber: '12' } });
  });

  it('treats a missing stay_id as a walk-in (stayId null)', () => {
    const result = parseGuestRegistrationRequest({ first_name: 'Nora', table_number: '7' });
    expect(result.ok && result.value.stayId).toBeNull();
  });

  it('treats placeholder stay ids (unknown / walkin) as walk-ins', () => {
    const unknown = parseGuestRegistrationRequest({ first_name: 'Nora', stay_id: 'unknown' });
    const walkin = parseGuestRegistrationRequest({ first_name: 'Nora', stay_id: 'walkin-abc' });
    expect(unknown.ok && unknown.value.stayId).toBeNull();
    expect(walkin.ok && walkin.value.stayId).toBeNull();
  });

  it('enforces field length limits', () => {
    expect(parseGuestRegistrationRequest({ first_name: 'a'.repeat(101) }).ok).toBe(false);
    expect(parseGuestRegistrationRequest({ first_name: 'ok', stay_id: 'a'.repeat(129) }).ok).toBe(false);
    expect(parseGuestRegistrationRequest({ first_name: 'ok', table_number: 'a'.repeat(129) }).ok).toBe(false);
  });
});

describe('registerGuest', () => {
  let store: FakeGuestStore;

  beforeEach(() => {
    store = new FakeGuestStore();
  });

  it('registers a new hotel QR guest and returns a session with the stay_id', async () => {
    const result = await registerGuest(
      { first_name: 'Bouke', stay_id: 'Beach_House_Rypma', table_number: 'Beach_House_Rypma' },
      store,
      { generateId: seqIds() },
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.session).toEqual({
      guest_user_id: 'id-1',
      first_name: 'Bouke',
      stay_id: 'Beach_House_Rypma',
    });
    expect(store.rows).toHaveLength(1);
  });

  it('registers a second family member (same stay, different name)', async () => {
    store.rows.push({ id: 'existing', stay_id: 'Beach_House_Rypma', first_name: 'Bouke' });
    const result = await registerGuest(
      { first_name: 'Katja', stay_id: 'Beach_House_Rypma', table_number: 'Beach_House_Rypma' },
      store,
      { generateId: seqIds() },
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.session.first_name).toBe('Katja');
    expect(store.rows).toHaveLength(2);
  });

  it('registers a walk-in with a generated walkin-<uuid> stay_id and no pre-check', async () => {
    const findSpy = vi.spyOn(store, 'findByStayAndName');
    const result = await registerGuest(
      { first_name: 'Agustina', table_number: '25' },
      store,
      { generateId: () => 'fixed-uuid' },
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.session.stay_id).toBe('walkin-fixed-uuid');
    // Walk-ins skip the existence pre-check entirely.
    expect(findSpy).not.toHaveBeenCalled();
  });

  it('tolerates multiple historical rows for the same (stay, name): returns the first deterministic row, no insert', async () => {
    // No unique constraint on (stay_id, first_name) — historical duplicates exist.
    store.rows.push({ id: 'row-oldest', stay_id: 'A9_SZEMES', first_name: 'Bouke' });
    store.rows.push({ id: 'row-newer', stay_id: 'A9_SZEMES', first_name: 'Bouke' });

    const result = await registerGuest(
      { first_name: 'Bouke', stay_id: 'A9_SZEMES', table_number: '12' },
      store,
      { generateId: seqIds() },
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.session.guest_user_id).toBe('row-oldest');
    expect(store.insertCalls).toBe(0);
  });

  it('is idempotent for a duplicate registration (same stay + name) and does not insert', async () => {
    store.rows.push({ id: 'existing-id', stay_id: 'A9_SZEMES', first_name: 'Bouke' });
    const result = await registerGuest(
      { first_name: 'Bouke', stay_id: 'A9_SZEMES', table_number: '12' },
      store,
      { generateId: seqIds() },
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.session.guest_user_id).toBe('existing-id');
    expect(store.insertCalls).toBe(0);
  });

  it('enforces the per-stay guest cap', async () => {
    for (let i = 0; i < MAX_GUESTS_PER_STAY; i += 1) {
      store.rows.push({ id: `g-${i}`, stay_id: 'FULL_STAY', first_name: `guest-${i}` });
    }
    const result = await registerGuest(
      { first_name: 'OneTooMany', stay_id: 'FULL_STAY', table_number: '1' },
      store,
      { generateId: seqIds() },
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.status).toBe(429);
    expect(store.insertCalls).toBe(0);
  });

  it('recovers from an insert race (23505) by returning the winning row', async () => {
    store.raceDuplicate = { id: 'winner-id', stay_id: 'A9_SZEMES', first_name: 'Bouke' };
    const result = await registerGuest(
      { first_name: 'Bouke', stay_id: 'A9_SZEMES', table_number: '12' },
      store,
      { generateId: seqIds() },
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.session.guest_user_id).toBe('winner-id');
  });

  it('rejects invalid input before touching the store', async () => {
    const result = await registerGuest({ first_name: '' }, store, { generateId: seqIds() });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.status).toBe(400);
    expect(store.insertCalls).toBe(0);
  });
});
