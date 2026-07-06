import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  getStayIdLookupVariants,
  mergeGuestOrderResults,
  stayIdsMatch,
} from '@/lib/guestOrderHistory';

export const runtime = 'nodejs';

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 128
);

export async function POST(request: NextRequest) {
  const serviceClient = createServiceRoleClient();

  if (!serviceClient) {
    return NextResponse.json(
      { error: 'Order service unavailable' },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const body = payload as Record<string, unknown>;
  const guestUserId = isNonEmptyString(body.guestUserId) ? body.guestUserId.trim() : '';
  const requestedStayId = isNonEmptyString(body.stayId) ? body.stayId.trim() : '';

  if (!guestUserId || !requestedStayId) {
    return NextResponse.json(
      { error: 'Guest session is required' },
      { status: 400 }
    );
  }

  const { data: guest, error: guestError } = await serviceClient
    .from('guests')
    .select('id, stay_id')
    .eq('id', guestUserId)
    .maybeSingle();

  if (guestError) {
    console.error('[guest/order-history] Failed to verify guest session:', {
      code: guestError.code,
      message: guestError.message,
      details: guestError.details,
      hint: guestError.hint,
    });

    return NextResponse.json(
      { error: 'Failed to verify guest session' },
      { status: 500 }
    );
  }

  if (!guest || !stayIdsMatch(guest.stay_id, requestedStayId)) {
    return NextResponse.json(
      { error: 'Guest session is not authorized for this account' },
      { status: 403 }
    );
  }

  const stayIdVariants = getStayIdLookupVariants(guest.stay_id);

  const [familyOrdersResult, individualOrdersResult] = await Promise.all([
    serviceClient
      .from('orders')
      .select('*')
      .in('stay_id', stayIdVariants)
      .order('created_at', { ascending: false }),
    serviceClient
      .from('orders')
      .select('*')
      .eq('guest_user_id', guestUserId)
      .order('created_at', { ascending: false }),
  ]);

  if (familyOrdersResult.error || individualOrdersResult.error) {
    const error = familyOrdersResult.error || individualOrdersResult.error;
    console.error('[guest/order-history] Failed to fetch guest orders:', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });

    return NextResponse.json(
      { error: 'Failed to load your orders' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    orders: mergeGuestOrderResults(
      familyOrdersResult.data,
      individualOrdersResult.data
    ),
  });
}
