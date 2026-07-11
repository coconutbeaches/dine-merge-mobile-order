import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deleteAdminOrders } from './orderService';

describe('deleteAdminOrders (client)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('POSTs order ids to the admin route and returns confirmed deletedIds on success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ deletedIds: [1, 2], count: 2 }) });
    vi.stubGlobal('fetch', fetchMock);

    const ids = await deleteAdminOrders([1, 2]);

    expect(ids).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/orders/delete',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ orderIds: [1, 2] });
  });

  it('throws the server-provided error on failure (so the caller keeps rows visible)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Admin access required' }) }),
    );
    await expect(deleteAdminOrders([1])).rejects.toThrow('Admin access required');
  });

  it('keeps service-role credentials out of H5 client code', () => {
    const root = process.cwd();
    const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

    const clientFiles = [
      'src/services/orderService.ts',
      'src/hooks/useOrderActions.ts',
      'app/admin/orders/page.tsx',
    ];
    for (const file of clientFiles) {
      const src = read(file);
      expect(src, `${file} must not import the service-role client`).not.toMatch(/createServiceRoleClient/);
      expect(src, `${file} must not reference service-role secrets`).not.toMatch(
        /SUPABASE_SERVICE_ROLE|SUPABASE_SECRET/,
      );
    }

    const route = read('app/api/admin/orders/delete/route.ts');
    expect(route).toMatch(/createServiceRoleClient/);
    expect(route).toMatch(/verifyAdminRole/);
  });
});
