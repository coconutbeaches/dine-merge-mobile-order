import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { normalizeRestaurantServiceLocation } from '@/lib/restaurantServiceLocation';
import {
  hashRestaurantGuestHandshakeRef,
  verifyRestaurantGuestHandshakeRef,
} from '@/server/restaurantGuestHandshake';

export const runtime = 'nodejs';

const normalizeName = (value: unknown): string =>
  String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const ref = String(body.handshake_ref ?? '').trim();
  const guestUserId = String(body.guest_user_id ?? '').trim();
  const guestStayId = String(body.guest_stay_id ?? '').trim();
  if (!ref || !guestUserId || !guestStayId || !verifyRestaurantGuestHandshakeRef(ref)) {
    return NextResponse.json({ error: 'Invalid handshake binding' }, { status: 400 });
  }

  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Handshake service unavailable' }, { status: 503 });
  }

  const { data: handshake, error: handshakeError } = await serviceClient
    .from('restaurant_guest_handshakes')
    .select('id,status,table_number,first_name,match_kind,matched_stay_id,bound_guest_user_id,bound_guest_stay_id')
    .eq('ref_hash', hashRestaurantGuestHandshakeRef(ref))
    .maybeSingle();

  if (handshakeError || !handshake) {
    return NextResponse.json({ error: 'Handshake not found' }, { status: 404 });
  }
  if (
    handshake.status !== 'completed' ||
    !normalizeRestaurantServiceLocation(handshake.table_number)
  ) {
    return NextResponse.json({ error: 'Handshake is not complete' }, { status: 409 });
  }

  const { data: guest, error: guestError } = await serviceClient
    .from('guests')
    .select('id,stay_id,first_name,table_number')
    .eq('id', guestUserId)
    .maybeSingle();

  if (guestError || !guest) {
    return NextResponse.json({ error: 'Guest session not found' }, { status: 404 });
  }

  const guestTable = normalizeRestaurantServiceLocation(guest.table_number);
  const guestStay = String(guest.stay_id ?? '').trim();
  const sameName = normalizeName(guest.first_name) === normalizeName(handshake.first_name);
  const hotelStayMatches =
    handshake.match_kind !== 'hotel' ||
    guestStay.toUpperCase() === String(handshake.matched_stay_id ?? '').trim().toUpperCase();

  if (
    !guestTable ||
    guestStay !== guestStayId ||
    !sameName ||
    !hotelStayMatches
  ) {
    return NextResponse.json({ error: 'Guest session does not match handshake' }, { status: 409 });
  }

  const existingGuestId = String(handshake.bound_guest_user_id ?? '').trim();
  const existingStayId = String(handshake.bound_guest_stay_id ?? '').trim();
  if (existingGuestId || existingStayId) {
    if (existingGuestId === guestUserId && existingStayId === guestStayId) {
      return NextResponse.json({ status: 'bound', guest_user_id: guestUserId });
    }
    return NextResponse.json({ error: 'Handshake is already bound to another guest session' }, { status: 409 });
  }

  const { data: updated, error: updateError } = await serviceClient
    .from('restaurant_guest_handshakes')
    .update({
      bound_guest_user_id: guestUserId,
      bound_guest_stay_id: guestStayId,
      bound_at: new Date().toISOString(),
    })
    .eq('id', handshake.id)
    .is('bound_guest_user_id', null)
    .select('bound_guest_user_id,bound_guest_stay_id')
    .maybeSingle();

  if (updateError) {
    console.error('[restaurant-handshake] session bind failed', updateError.message);
    return NextResponse.json({ error: 'Could not bind guest session' }, { status: 500 });
  }

  if (
    !updated ||
    String(updated.bound_guest_user_id ?? '') !== guestUserId ||
    String(updated.bound_guest_stay_id ?? '') !== guestStayId
  ) {
    return NextResponse.json({ error: 'Handshake binding conflict' }, { status: 409 });
  }

  return NextResponse.json({ status: 'bound', guest_user_id: guestUserId });
}
