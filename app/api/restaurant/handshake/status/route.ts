import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  hashRestaurantGuestHandshakeRef,
  RESTAURANT_GUEST_HANDSHAKE_COMPLETION_TTL_MINUTES,
  verifyRestaurantGuestHandshakeRef,
} from '@/server/restaurantGuestHandshake';
import { RestaurantOrderLinkConfigError } from '@/server/restaurantOrderLink';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref')?.trim() ?? '';
  if (!ref) {
    return NextResponse.json({ error: 'Missing handshake ref' }, { status: 400 });
  }

  try {
    if (!verifyRestaurantGuestHandshakeRef(ref)) {
      return NextResponse.json({ error: 'Invalid handshake ref' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof RestaurantOrderLinkConfigError) {
      return NextResponse.json({ error: 'Handshake service unavailable' }, { status: 503 });
    }
    throw error;
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Handshake service unavailable' }, { status: 503 });
  }

  const { data, error } = await serviceClient
    .from('restaurant_guest_handshakes')
    .select('status,table_number,first_name,match_kind,matched_stay_id,expires_at,completed_at,upgrade_guest_user_id')
    .eq('ref_hash', hashRestaurantGuestHandshakeRef(ref))
    .maybeSingle();

  if (error) {
    console.error('[restaurant-handshake] status lookup failed', error.message);
    return NextResponse.json({ error: 'Could not check handshake' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Handshake not found' }, { status: 404 });
  }

  const now = Date.now();
  if (data.status === 'pending' && new Date(data.expires_at).getTime() <= now) {
    return NextResponse.json({ status: 'expired' });
  }

  if (data.status !== 'completed') {
    return NextResponse.json({ status: data.status });
  }

  const completedAt = data.completed_at ? new Date(data.completed_at).getTime() : 0;
  const completionAge = completedAt ? now - completedAt : Number.POSITIVE_INFINITY;
  if (completionAge > RESTAURANT_GUEST_HANDSHAKE_COMPLETION_TTL_MINUTES * 60_000) {
    return NextResponse.json({ status: 'expired' });
  }

  return NextResponse.json({
    status: 'completed',
    table_number: data.table_number,
    first_name: data.first_name,
    match_kind: data.match_kind,
    matched_stay_id: data.match_kind === 'hotel' ? data.matched_stay_id : null,
    upgrade_required: Boolean(data.upgrade_guest_user_id),
  });
}
