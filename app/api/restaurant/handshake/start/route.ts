import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  buildRestaurantHandshakeWhatsAppUrl,
  hashRestaurantGuestHandshakeRef,
  issueRestaurantGuestHandshakeRef,
  normalizeHandshakeFirstName,
  RESTAURANT_GUEST_HANDSHAKE_CANARY_TABLE,
  RESTAURANT_GUEST_HANDSHAKE_TTL_MINUTES,
} from '@/server/restaurantGuestHandshake';
import { RestaurantOrderLinkConfigError } from '@/server/restaurantOrderLink';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Handshake service unavailable' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const tableNumber = String(body.table_number ?? '').trim();
  if (tableNumber !== RESTAURANT_GUEST_HANDSHAKE_CANARY_TABLE) {
    return NextResponse.json({ error: 'WhatsApp handshake is not enabled for this table' }, { status: 404 });
  }

  const firstName = normalizeHandshakeFirstName(body.first_name);
  if (!firstName || firstName.length > 100 || /[\r\n]/.test(firstName)) {
    return NextResponse.json({ error: 'Please enter a valid first name' }, { status: 400 });
  }

  let ref: string;
  try {
    ref = issueRestaurantGuestHandshakeRef();
  } catch (error) {
    if (error instanceof RestaurantOrderLinkConfigError) {
      console.error('[restaurant-handshake] signing secret is not configured');
      return NextResponse.json({ error: 'Handshake service unavailable' }, { status: 503 });
    }
    throw error;
  }

  const expiresAt = new Date(Date.now() + RESTAURANT_GUEST_HANDSHAKE_TTL_MINUTES * 60_000).toISOString();
  const { error } = await serviceClient.from('restaurant_guest_handshakes').insert({
    ref_hash: hashRestaurantGuestHandshakeRef(ref),
    table_number: tableNumber,
    first_name: firstName,
    status: 'pending',
    expires_at: expiresAt,
  });

  if (error) {
    console.error('[restaurant-handshake] failed to persist pending handshake', error.message);
    return NextResponse.json({ error: 'Could not start WhatsApp handshake' }, { status: 500 });
  }

  return NextResponse.json({
    ref,
    whatsapp_url: buildRestaurantHandshakeWhatsAppUrl(firstName, ref),
    expires_at: expiresAt,
  });
}
