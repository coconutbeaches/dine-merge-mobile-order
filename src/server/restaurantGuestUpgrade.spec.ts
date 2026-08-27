// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import type { Database } from '@/types/supabaseTypes';

vi.mock('server-only', () => ({}));
const { clientMock } = vi.hoisted(() => ({ clientMock: vi.fn() }));
vi.mock('@/lib/supabase-server', () => ({ createServiceRoleClient: clientMock }));
import { startGuestUpgrade, completeGuestUpgrade } from './restaurantGuestUpgrade';
import { hashRestaurantGuestHandshakeRef } from './restaurantGuestHandshake';
import { POST } from '../../app/api/restaurant/handshake/upgrade/route';
import { POST as legacyBind } from '../../app/api/restaurant/handshake/bind/route';
import { POST as register } from '../../app/api/guest/register/route';
import { GET as status } from '../../app/api/restaurant/handshake/status/route';

const ID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const STAY = `walkin-${ID}`;
const REF = 'ABCDE-FGHJK';
const CHAT = '66999999999@s.whatsapp.net';
const CHANNEL = 'test-restaurant';
type Row = Record<string, unknown>;

function fixture() {
  const tables: Record<string, Row[]> = {
    guests: [{ id: ID, stay_id: STAY, first_name: 'KUNG STAFF' }],
    orders: [{ id: 1, guest_user_id: ID, stay_id: STAY, source_channel: 'whatsapp',
      kitchen_whapi_message_id: 'original-message', kitchen_whapi_chat_id: CHAT,
      kitchen_whapi_channel_id: CHANNEL, order_status: 'paid', total_amount: 190 }],
    restaurant_guest_handshakes: [{ id: 'challenge', ref_hash: hashRestaurantGuestHandshakeRef(REF),
      first_name: 'KUNG STAFF', table_number: 'Take Away', status: 'completed', match_kind: 'walkin',
      matched_stay_id: null, phone_e164: '+66999999999', whatsapp_chat_id: CHAT,
      provider_channel_id: CHANNEL, created_at: new Date(Date.now() - 60_000).toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(), completed_at: new Date(Date.now() - 10_000).toISOString(),
      upgrade_guest_user_id: ID, upgrade_guest_stay_id: STAY, bound_guest_user_id: null, bound_guest_stay_id: null }],
  };
  const writes: { table: string; method: string; body: Row }[] = [];
  let failTable: string | null = null;
  let race: 'same' | 'other' | null = null;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const table = url.pathname.split('/').at(-1)!;
    const method = init?.method ?? 'GET';
    if (failTable === table) return new Response(JSON.stringify({ message: 'unavailable', code: '42501' }), { status: 400 });
    if (!tables[table]) throw new Error(`Unexpected table ${table}`);
    const matches = (row: Row) => [...url.searchParams].every(([key, value]) => {
      if (['select', 'order', 'limit'].includes(key)) return true;
      if (value === 'is.null') return row[key] == null;
      if (value === 'not.is.null') return row[key] != null;
      if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
      throw new Error(`Unexpected filter ${key}=${value}`);
    });
    let rows = tables[table].filter(matches);
    if (url.searchParams.has('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')));
    if (method === 'POST' || method === 'PATCH') {
      const body = JSON.parse(String(init?.body));
      writes.push({ table, method, body });
      if (method === 'POST') {
        tables[table].push(body);
        rows = [body];
      } else if (race) {
        tables[table][0].bound_guest_user_id = race === 'same' ? ID : OTHER;
        tables[table][0].bound_guest_stay_id = race === 'same' ? STAY : `walkin-${OTHER}`;
        rows = [];
      } else rows.forEach((row) => Object.assign(row, body));
    }
    const headers = new Headers(init?.headers);
    const singular = headers.get('accept')?.includes('vnd.pgrst.object');
    return new Response(JSON.stringify(singular ? rows[0] ?? null : rows), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  });
  const client = createClient<Database>('http://supabase.test', 'test-key', {
    global: { fetch: fetchMock }, auth: { persistSession: false, autoRefreshToken: false },
  });
  return { client, tables, writes, fetchMock, handshake: tables.restaurant_guest_handshakes[0],
    fail: (table: string) => { failTable = table; }, race: (value: 'same' | 'other') => { race = value; } };
}

const startBody = { guest_user_id: ID, guest_stay_id: STAY, table_number: 'Take Away', first_name: 'Kung', phone: '+66111111111' };
const request = (body: unknown, path = '/api/restaurant/handshake/upgrade', headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('existing account upgrade', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts an unbound challenge using the authoritative name, not cached browser fields', async () => {
    const f = fixture();
    const before = JSON.stringify([f.tables.guests, f.tables.orders]);
    const result = await startGuestUpgrade(f.client, startBody);
    expect(result.first_name).toBe('KUNG STAFF');
    expect(new URL(result.whatsapp_url).searchParams.get('text')).toContain('KUNG STAFF');
    expect(f.writes).toHaveLength(1);
    expect(f.writes[0]).toMatchObject({ table: 'restaurant_guest_handshakes', method: 'POST',
      body: { status: 'pending', upgrade_guest_user_id: ID, upgrade_guest_stay_id: STAY } });
    expect(f.writes[0].body).not.toHaveProperty('bound_guest_user_id');
    expect(f.writes[0].body).not.toHaveProperty('phone_e164');
    expect(JSON.stringify([f.tables.guests, f.tables.orders])).toBe(before);
  });

  it('completes using exact phone/chat/channel evidence without changing any guest or order', async () => {
    const f = fixture();
    const before = JSON.stringify([f.tables.guests, f.tables.orders]);
    const result = await completeGuestUpgrade(f.client, REF);
    expect(result).toEqual({ status: 'bound', session: { guest_user_id: ID, guest_stay_id: STAY, guest_first_name: 'KUNG STAFF' } });
    expect(f.writes).toHaveLength(1);
    expect(Object.keys(f.writes[0].body).sort()).toEqual(['bound_at', 'bound_guest_stay_id', 'bound_guest_user_id']);
    expect(JSON.stringify([f.tables.guests, f.tables.orders])).toBe(before);
    await completeGuestUpgrade(f.client, REF);
    expect(f.writes).toHaveLength(1); // idempotent replay
  });

  it.each([
    ['phone_e164', '+66111111111'], ['whatsapp_chat_id', 'other@lid'],
    ['provider_channel_id', 'wrong-channel'], ['first_name', 'Kung'],
    ['matched_stay_id', 'HOTEL'], ['match_kind', 'hotel'],
    ['upgrade_guest_stay_id', 'walkin-other'], ['upgrade_guest_user_id', OTHER],
    ['completed_at', 'invalid'], ['completed_at', new Date(Date.now() - 121 * 60_000).toISOString()],
    ['completed_at', new Date(Date.now() + 60_000).toISOString()],
    ['bound_guest_user_id', OTHER], ['bound_guest_stay_id', 'wrong-stay'],
    ['upgrade_guest_user_id', null], ['status', 'expired'],
  ])('rejects mismatched %s=%s without a write', async (key, value) => {
    const f = fixture(); f.handshake[key] = value;
    await expect(completeGuestUpgrade(f.client, REF)).rejects.toThrow();
    expect(f.writes).toEqual([]);
  });

  it('does not bind pending or expired challenges', async () => {
    const f = fixture(); f.handshake.status = 'pending';
    expect(await completeGuestUpgrade(f.client, REF)).toEqual({ status: 'pending' });
    f.handshake.expires_at = new Date(Date.now() - 1000).toISOString();
    await expect(completeGuestUpgrade(f.client, REF)).rejects.toThrow('expired');
    expect(f.writes).toEqual([]);
  });

  it.each(['missing', 'ambiguous', 'group', 'lid', 'channel', 'overflow'])('rejects %s historical evidence at both entry points', async (kind) => {
    const f = fixture();
    if (kind === 'missing') f.tables.orders = [];
    if (kind === 'ambiguous') f.tables.orders.push({ ...f.tables.orders[0], id: 2, kitchen_whapi_chat_id: '66111111111@s.whatsapp.net' });
    if (kind === 'group') f.tables.orders[0].kitchen_whapi_chat_id = '123@g.us';
    if (kind === 'lid') f.tables.orders[0].kitchen_whapi_chat_id = '123@lid';
    if (kind === 'channel') f.tables.orders[0].kitchen_whapi_channel_id = null;
    if (kind === 'overflow') f.tables.orders = Array.from({ length: 501 }, (_, id) => ({ ...f.tables.orders[0], id }));
    await expect(startGuestUpgrade(f.client, startBody)).rejects.toThrow();
    await expect(completeGuestUpgrade(f.client, REF)).rejects.toThrow();
    expect(f.writes).toEqual([]);
  });

  it.each(['guests', 'orders', 'restaurant_guest_handshakes'])('fails closed on %s lookup failure', async (table) => {
    const f = fixture(); f.fail(table);
    await expect(completeGuestUpgrade(f.client, REF)).rejects.toThrow();
    expect(f.writes).toEqual([]);
  });

  it('reads back an identical concurrent binding, but rejects a conflicting one', async () => {
    const f = fixture(); f.race('same');
    expect((await completeGuestUpgrade(f.client, REF)).status).toBe('bound');
    const other = fixture(); other.race('other');
    await expect(completeGuestUpgrade(other.client, REF)).rejects.toThrow('conflict');
  });

  it('exposes only an upgrade marker from status, not the target account or phone', async () => {
    const f = fixture(); clientMock.mockReturnValue(f.client);
    const response = await status(new NextRequest(`http://localhost/api/restaurant/handshake/status?ref=${REF}`));
    const payload = await response.json();
    expect(payload.upgrade_required).toBe(true);
    expect(JSON.stringify(payload)).not.toContain(ID);
    expect(payload).not.toHaveProperty('phone_e164');
  });

  it('blocks generic registration before it can insert a duplicate guest', async () => {
    const f = fixture(); clientMock.mockReturnValue(f.client);
    const response = await register(request({ first_name: 'KUNG STAFF', table_number: 'Take Away' },
      '/api/guest/register', { referer: `http://localhost/register/unknown?table=Take%20Away&handshake=${REF}` }));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('existing_account_upgrade_required');
    expect(f.writes).toEqual([]);
  });

  it('blocks name-only binding as a bypass', async () => {
    const f = fixture(); f.handshake.phone_e164 = '+66111111111'; clientMock.mockReturnValue(f.client);
    const response = await legacyBind(request({ handshake_ref: REF, guest_user_id: ID, guest_stay_id: STAY }));
    expect(response.status).toBe(409);
    expect(f.writes).toEqual([]);
  });

  it('validates malformed, cross-origin, missing-service, and normal API requests', async () => {
    const f = fixture(); clientMock.mockReturnValue(f.client);
    expect((await POST(request(null))).status).toBe(400);
    expect((await POST(request({ action: 'delete' }))).status).toBe(400);
    expect((await POST(request({ action: 'start' }, undefined, { origin: 'http://other.test' }))).status).toBe(403);
    expect((await POST(request({ action: 'start' }, undefined, { origin: 'null' }))).status).toBe(403);
    expect((await POST(request({ action: 'complete', handshake_ref: REF }, undefined,
      { origin: 'http://127.0.0.1:3107', host: '127.0.0.1:3107' }))).status).toBe(200);
    expect((await POST(request({ action: 'complete', handshake_ref: 'bad' }))).status).toBe(400);
    expect((await POST(request({ action: 'complete', handshake_ref: REF }))).status).toBe(200);
    clientMock.mockReturnValue(null);
    expect((await POST(request({ action: 'start' }))).status).toBe(503);
  });
});
