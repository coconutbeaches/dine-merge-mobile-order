import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, createServiceRoleClient, verifyAdminRole } from '@/lib/supabase-server';
import { stayIdsMatch } from '@/lib/guestOrderHistory';

export const runtime = 'nodejs';

/**
 * Authorized single-order readback. Replaces the anonymous 15-minute SELECT
 * policy that used to leak every recent guest order. A caller may read an order
 * only if they own it:
 *   - an authenticated user whose id matches order.user_id, or an admin, or
 *   - a guest whose guest_user_id matches the order, or whose stay_id matches
 *     the order's stay_id (family members share a stay).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Order service unavailable' }, { status: 503 });
  }

  const { id } = await params;
  const orderId = Number.parseInt(id, 10);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  }

  const guestUserId = request.nextUrl.searchParams.get('guestUserId')?.trim() || '';

  const { data: order, error } = await serviceClient
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    console.error('[api/orders/:id] Fetch failed:', error.message);
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  let authorized = false;

  // Authenticated user / admin path.
  const supabase = await createServerClient();
  const authedUser = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (authedUser) {
    if (order.user_id && order.user_id === authedUser.id) {
      authorized = true;
    } else {
      const admin = await verifyAdminRole();
      if (admin.isAdmin) authorized = true;
    }
  }

  // Guest path: prove ownership via the guest session id.
  if (!authorized && guestUserId) {
    if (order.guest_user_id && order.guest_user_id === guestUserId) {
      authorized = true;
    } else {
      const { data: guest } = await serviceClient
        .from('guests')
        .select('id, stay_id')
        .eq('id', guestUserId)
        .maybeSingle();
      if (guest && order.stay_id && stayIdsMatch(guest.stay_id, order.stay_id)) {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    // Don't distinguish "not yours" from "doesn't exist".
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ order });
}
