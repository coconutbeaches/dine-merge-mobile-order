import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getRemainingSelectedOrderIds,
  handleAdminOrderDelete,
  parseOrderIds,
  removeDeletedOrders,
} from './adminOrderDelete';
import { deleteAdminOrders } from '@/services/orderService';

describe('admin order deletion guard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('allows an authenticated admin to delete orders', async () => {
    const deleteByIds = vi.fn(async (ids: number[]) => ids);

    const result = await handleAdminOrderDelete(
      { orderIds: [101, '102', 101] },
      { isAdmin: true, userId: 'admin-user' },
      { deleteByIds },
    );

    expect(result).toEqual({
      ok: true,
      status: 200,
      body: { deletedIds: [101, 102], count: 2 },
    });
    expect(deleteByIds).toHaveBeenCalledWith([101, 102]);
  });

  it('denies non-admin callers before deletion', async () => {
    const deleteByIds = vi.fn(async (ids: number[]) => ids);

    const result = await handleAdminOrderDelete(
      { orderIds: [101] },
      { isAdmin: false, userId: 'normal-user' },
      { deleteByIds },
    );

    expect(result).toEqual({
      ok: false,
      status: 403,
      body: { error: 'Admin access required' },
    });
    expect(deleteByIds).not.toHaveBeenCalled();
  });

  it('denies unauthenticated callers before deletion', async () => {
    const deleteByIds = vi.fn(async (ids: number[]) => ids);

    const result = await handleAdminOrderDelete(
      { orderIds: [101] },
      { isAdmin: false, userId: null },
      { deleteByIds },
    );

    expect(result).toEqual({
      ok: false,
      status: 401,
      body: { error: 'Authentication required' },
    });
    expect(deleteByIds).not.toHaveBeenCalled();
  });

  it('rejects invalid or missing order ids', () => {
    expect(parseOrderIds({})).toMatchObject({
      ok: false,
      status: 400,
      error: 'orderIds must be a non-empty array',
    });
    expect(parseOrderIds({ orderIds: [] })).toMatchObject({
      ok: false,
      status: 400,
      error: 'At least one order id is required',
    });
    expect(parseOrderIds({ orderIds: [0] })).toMatchObject({
      ok: false,
      status: 400,
      error: 'Order ids must be positive integers',
    });
    expect(parseOrderIds({ orderIds: ['1.5'] })).toMatchObject({
      ok: false,
      status: 400,
      error: 'Order ids must be positive integers',
    });
  });

  it('does not expose internal deletion errors', async () => {
    const result = await handleAdminOrderDelete(
      { orderIds: [101] },
      { isAdmin: true, userId: 'admin-user' },
      {
        deleteByIds: async () => {
          throw new Error('permission denied for table orders');
        },
      },
    );

    expect(result).toEqual({
      ok: false,
      status: 500,
      body: { error: 'Failed to delete orders' },
    });
  });

  it('keeps UI rows and selections when deletion fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const rows = [{ id: 101 }, { id: 102 }];
    const selectedIds = [101, 102];

    await expect(deleteAdminOrders(selectedIds)).rejects.toThrow('Admin access required');
    expect(rows).toEqual([{ id: 101 }, { id: 102 }]);
    expect(selectedIds).toEqual([101, 102]);
  });

  it('removes only server-confirmed deleted rows from UI state', () => {
    const rows = [{ id: 101 }, { id: 102 }, { id: 103 }];

    expect(removeDeletedOrders(rows, [101, '103'])).toEqual([{ id: 102 }]);
    expect(getRemainingSelectedOrderIds([101, 102, 103], [101])).toEqual([102, 103]);
  });

  it('uses the admin API route from client code instead of service-role credentials', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ deletedIds: [101], count: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteAdminOrders([101])).resolves.toEqual([101]);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/orders/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds: [101] }),
    });

    const orderServiceSource = readFileSync(
      resolve(process.cwd(), 'src/services/orderService.ts'),
      'utf8',
    );
    expect(orderServiceSource).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(orderServiceSource).not.toContain('SUPABASE_SECRET_KEY');
    expect(orderServiceSource).not.toContain('createServiceRoleClient');
  });
});
