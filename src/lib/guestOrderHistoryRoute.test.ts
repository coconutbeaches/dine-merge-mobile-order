import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/guest/order-history/route';

const { createServiceRoleClientMock } = vi.hoisted(() => ({
  createServiceRoleClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  createServiceRoleClient: createServiceRoleClientMock,
}));

type QueryResult = { data: unknown; error: unknown };

function createQuery(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockResolvedValue(result);
  query.maybeSingle.mockResolvedValue(result);

  return query;
}

function createRequest(guestUserId: string, stayId?: string) {
  return new NextRequest('http://localhost/api/guest/order-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      guestUserId,
      ...(stayId ? { stayId } : {}),
    }),
  });
}

function setUpOrderHistory({
  guestUserId = '11111111-1111-4111-8111-111111111111',
  guestStayId,
  guest = undefined,
  overrideStayId = null,
  overrideError = null,
  familyOrders = [],
  individualOrders = [],
}: {
  guestUserId?: string;
  guestStayId: string;
  guest?: { id: string; stay_id: string } | null;
  overrideStayId?: string | null;
  overrideError?: unknown;
  familyOrders?: unknown[];
  individualOrders?: unknown[];
}) {
  const guestQuery = createQuery({
    data: guest === undefined ? { id: guestUserId, stay_id: guestStayId } : guest,
    error: null,
  });
  const overrideQuery = createQuery({
    data: overrideStayId ? { target_stay_id: overrideStayId } : null,
    error: overrideError,
  });
  const familyOrdersQuery = createQuery({ data: familyOrders, error: null });
  const individualOrdersQuery = createQuery({ data: individualOrders, error: null });
  let ordersQueryCount = 0;

  const from = vi.fn((table: string) => {
    if (table === 'guests') return guestQuery;
    if (table === 'guest_stay_overrides') return overrideQuery;
    if (table === 'orders') {
      ordersQueryCount += 1;
      return ordersQueryCount === 1 ? familyOrdersQuery : individualOrdersQuery;
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  createServiceRoleClientMock.mockReturnValue({ from });

  return {
    familyOrdersQuery,
    from,
    individualOrdersQuery,
    overrideQuery,
  };
}

describe('guest order-history route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads all stay orders for a normal hotel guest with no override', async () => {
    const familyOrders = [
      { id: 2, stay_id: 'A4_SMITH', created_at: '2026-07-16T08:00:00.000Z' },
      { id: 1, stay_id: 'A4_SMITH', created_at: '2026-07-16T07:00:00.000Z' },
    ];
    const { familyOrdersQuery } = setUpOrderHistory({
      guestStayId: 'A4_SMITH',
      familyOrders,
    });

    const response = await POST(createRequest(
      '11111111-1111-4111-8111-111111111111'
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ orders: familyOrders });
    expect(familyOrdersQuery.in).toHaveBeenCalledWith(
      'stay_id',
      expect.arrayContaining(['A4_SMITH', 'A4 SMITH'])
    );
  });

  it('loads only valid walk-in history for a genuine walk-in with no override', async () => {
    const walkinOrder = {
      id: 10,
      stay_id: 'walkin_12',
      created_at: '2026-07-16T07:00:00.000Z',
    };
    setUpOrderHistory({
      guestStayId: 'walkin_12',
      familyOrders: [walkinOrder],
      individualOrders: [walkinOrder],
    });

    const response = await POST(createRequest(
      '11111111-1111-4111-8111-111111111111'
    ));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ orders: [walkinOrder] });
  });

  it('uses an override stay for family history, retains individual orders, and deduplicates', async () => {
    const guestUserId = '11111111-1111-4111-8111-111111111111';
    const familyOrder = {
      id: 20,
      stay_id: 'A5_CROWLEY',
      guest_user_id: guestUserId,
      created_at: '2026-07-16T08:00:00.000Z',
    };
    const accidentalWalkinOrder = {
      id: 10,
      stay_id: 'walkin_12',
      guest_user_id: guestUserId,
      created_at: '2026-07-16T09:00:00.000Z',
    };
    const { familyOrdersQuery, individualOrdersQuery, overrideQuery } = setUpOrderHistory({
      guestUserId,
      guestStayId: 'walkin_12',
      overrideStayId: 'A5_CROWLEY',
      familyOrders: [familyOrder],
      individualOrders: [familyOrder, accidentalWalkinOrder],
    });

    const response = await POST(createRequest(guestUserId));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      orders: [accidentalWalkinOrder, familyOrder],
    });
    expect(overrideQuery.eq).toHaveBeenCalledWith('guest_user_id', guestUserId);
    expect(familyOrdersQuery.in).toHaveBeenCalledWith(
      'stay_id',
      expect.arrayContaining(['A5_CROWLEY', 'A5 CROWLEY'])
    );
    expect(individualOrdersQuery.eq).toHaveBeenCalledWith('guest_user_id', guestUserId);
  });

  it('fails closed before querying orders when override resolution fails', async () => {
    const guestUserId = '11111111-1111-4111-8111-111111111111';
    const overrideError = {
      code: '42501',
      message: 'override lookup failed',
      details: null,
      hint: null,
    };
    const { from } = setUpOrderHistory({
      guestUserId,
      guestStayId: 'walkin_12',
      overrideError,
    });

    const response = await POST(createRequest(guestUserId));

    expect(response.status).toBe(500);
    expect(from).not.toHaveBeenCalledWith('orders');
  });

  it('skips override lookup for a non-UUID guest ID and uses the guest stay', async () => {
    const guestUserId = 'walkin-guest-12';
    const walkinOrder = {
      id: 12,
      stay_id: 'walkin_12',
      guest_user_id: guestUserId,
      created_at: '2026-07-16T07:00:00.000Z',
    };
    const { familyOrdersQuery, from, individualOrdersQuery } = setUpOrderHistory({
      guestUserId,
      guestStayId: 'walkin_12',
      familyOrders: [walkinOrder],
      individualOrders: [walkinOrder],
    });

    const response = await POST(createRequest(guestUserId));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ orders: [walkinOrder] });
    expect(from).not.toHaveBeenCalledWith('guest_stay_overrides');
    expect(familyOrdersQuery.in).toHaveBeenCalledWith(
      'stay_id',
      expect.arrayContaining(['walkin_12', 'walkin 12'])
    );
    expect(individualOrdersQuery.eq).toHaveBeenCalledWith('guest_user_id', guestUserId);
  });

  it('rejects an unknown guest before resolving overrides or querying orders', async () => {
    const guestUserId = '11111111-1111-4111-8111-111111111111';
    const { from } = setUpOrderHistory({
      guestUserId,
      guestStayId: 'walkin_12',
      guest: null,
    });

    const response = await POST(createRequest(guestUserId));

    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalledWith('guest_stay_overrides');
    expect(from).not.toHaveBeenCalledWith('orders');
  });

  it('rejects the original pre-override stay account', async () => {
    const guestUserId = '11111111-1111-4111-8111-111111111111';
    const { from } = setUpOrderHistory({
      guestUserId,
      guestStayId: 'walkin_12',
      overrideStayId: 'A5_CROWLEY',
    });

    const response = await POST(createRequest(guestUserId, 'walkin_12'));

    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalledWith('orders');
  });

  it('rejects an unrelated stay account', async () => {
    const guestUserId = '11111111-1111-4111-8111-111111111111';
    const { from } = setUpOrderHistory({
      guestUserId,
      guestStayId: 'walkin_12',
      overrideStayId: 'A5_CROWLEY',
    });

    const response = await POST(createRequest(guestUserId, 'A9_STRANGER'));

    expect(response.status).toBe(403);
    expect(from).not.toHaveBeenCalledWith('orders');
  });

  it('authorizes and queries formatting variants of the effective stay ID', async () => {
    const { familyOrdersQuery } = setUpOrderHistory({
      guestStayId: 'walkin_12',
      overrideStayId: 'A5 CROWLEY',
    });

    const response = await POST(createRequest(
      '11111111-1111-4111-8111-111111111111'
    ));

    expect(response.status).toBe(200);
    expect(familyOrdersQuery.in).toHaveBeenCalledWith(
      'stay_id',
      expect.arrayContaining(['A5 CROWLEY', 'A5_CROWLEY'])
    );
  });
});
