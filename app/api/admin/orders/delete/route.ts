import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, verifyAdminRole } from '@/lib/supabase-server';
import { handleAdminOrderDelete, parseOrderIds, type OrderDeleteStore } from '@/lib/adminOrderDelete';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Authorize first so unauthenticated/non-admin callers never reach the DB.
  const admin = await verifyAdminRole();

  if (!admin.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!admin.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = parseOrderIds(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Order service unavailable' }, { status: 503 });
  }

  const store: OrderDeleteStore = {
    async deleteByIds(ids) {
      const { data, error } = await serviceClient
        .from('orders')
        .delete()
        .in('id', ids)
        .select('id');
      if (error) throw error;
      return (data ?? []).map((row) => row.id as number);
    },
  };

  const result = await handleAdminOrderDelete(
    payload,
    { isAdmin: admin.isAdmin, userId: admin.userId },
    store,
  );

  return NextResponse.json(result.body, { status: result.status });
}
