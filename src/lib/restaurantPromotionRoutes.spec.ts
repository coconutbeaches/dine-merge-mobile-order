import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createOrder } from '../../app/api/orders/route';
import { POST as deliverOrder } from '../../app/api/restaurant/order-delivery/route';
import { POST as orderHistory } from '../../app/api/guest/order-history/route';

const mocks = vi.hoisted(() => ({ client: vi.fn(), persist: vi.fn() }));
vi.mock('@/lib/supabase-server', () => ({
  createServiceRoleClient: mocks.client, createServerClient: vi.fn(), verifyAdminRole: vi.fn(),
}));
vi.mock('@/lib/orderPricing', () => ({
  buildTrustedOrderFromRequest: vi.fn(async () => ({ orderItems: [{ name: 'Rice' }], total: 100 })),
  OrderRejectedError: class extends Error {},
}));
vi.mock('@/server/orderIdempotency', () => ({
  persistIdempotentOrder: mocks.persist,
  OrderIdempotencyMismatchError: class extends Error {}, OrderPersistenceError: class extends Error {},
}));
vi.mock('@/server/restaurantOrderLink', () => ({ issueRestaurantOrderLink: () => 'signed-order' }));
vi.mock('@/server/restaurantGuestHandshake', () => ({
  hashRestaurantGuestHandshakeRef: () => 'hash', verifyRestaurantGuestHandshakeRef: () => true,
}));

const GUEST = '11111111-1111-4111-8111-111111111111';
const WALKIN = 'walkin-22222222-2222-4222-8222-222222222222';
const HOTEL = 'BH_TEST';
const request = (body: unknown) => new NextRequest('http://localhost/api', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
function query(data: unknown) {
  const q = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn(), maybeSingle: vi.fn() };
  q.select.mockReturnValue(q); q.eq.mockReturnValue(q); q.in.mockReturnValue(q);
  q.order.mockResolvedValue({ data, error: null });
  q.maybeSingle.mockResolvedValue({ data, error: null });
  return q;
}

describe('restaurant session after database stay promotion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates the next order for the canonical hotel despite a stale browser stay', async () => {
    const guest = query({ id: GUEST, stay_id: HOTEL, first_name: 'Guest' });
    mocks.client.mockReturnValue({ from: vi.fn(() => guest) });
    mocks.persist.mockImplementation(async (_client, row) => ({ order: { id: 22, ...row }, replayed: false }));
    const response = await createOrder(request({
      clientRequestId: '33333333-3333-4333-8333-333333333333', guestUserId: GUEST,
      stayId: WALKIN, guest_stay_id: WALKIN, tableNumber: '6', cartItems: [{ id: 'rice', quantity: 1 }],
    }));
    expect(response.status).toBe(201);
    expect(guest.eq).toHaveBeenCalledWith('id', GUEST);
    expect(mocks.persist.mock.calls[0][1]).toMatchObject({ guest_user_id: GUEST, stay_id: HOTEL });
    expect((await response.json()).order.stay_id).toBe(HOTEL);
  });

  it('accepts the promoted delivery binding while preserving the original walk-in decision', async () => {
    const invoke = vi.fn(async () => ({ data: { status: 'sent' }, error: null }));
    mocks.client.mockReturnValue({ functions: { invoke }, from: (table: string) => query(table === 'orders'
      ? { id: 22, table_number: '6', guest_user_id: GUEST, stay_id: HOTEL }
      : { status: 'completed', table_number: '6', match_kind: 'walkin', matched_stay_id: null,
        bound_guest_user_id: GUEST, bound_guest_stay_id: HOTEL }) });
    const response = await deliverOrder(request({ order_id: 22, handshake_ref: 'signed-handshake' }));
    expect((await response.json()).status).toBe('sent');
    expect(invoke).toHaveBeenCalledOnce();
  });

  it('still rejects a conflicting delivery binding', async () => {
    const invoke = vi.fn();
    mocks.client.mockReturnValue({ functions: { invoke }, from: (table: string) => query(table === 'orders'
      ? { id: 22, table_number: '6', guest_user_id: GUEST, stay_id: HOTEL }
      : { status: 'completed', table_number: '6', bound_guest_user_id: GUEST, bound_guest_stay_id: 'A1_OTHER' }) });
    const response = await deliverOrder(request({ order_id: 22, handshake_ref: 'signed-handshake' }));
    expect((await response.json()).code).toBe('guest_whatsapp_binding_mismatch');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('loads hotel family history and retains the guest’s historical walk-in orders', async () => {
    const currentOrder = { id: 22, stay_id: HOTEL, created_at: '2026-09-11T00:00:00Z' };
    const oldOrder = { id: 21, stay_id: WALKIN, created_at: '2026-09-10T00:00:00Z' };
    const family = query([currentOrder]);
    const personal = query([currentOrder, oldOrder]);
    let reads = 0;
    mocks.client.mockReturnValue({ from: (table: string) => {
      if (table === 'guests') return query({ id: GUEST, stay_id: HOTEL });
      if (table === 'guest_stay_overrides') return query(null);
      return reads++ === 0 ? family : personal;
    } });
    const response = await orderHistory(request({ guestUserId: GUEST }));
    expect(response.status).toBe(200);
    expect(family.in).toHaveBeenCalledWith('stay_id', expect.arrayContaining([HOTEL]));
    expect((await response.json()).orders).toEqual([currentOrder, oldOrder]);
  });
});
