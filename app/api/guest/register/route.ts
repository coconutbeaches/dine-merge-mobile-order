import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { registerGuest } from '@/lib/guestRegistration';
import { createSupabaseGuestStore } from '@/lib/guestRegistrationStore';
import { resolveActiveStayForFirstName } from '@/lib/guestStayIdentity';
import {
  hashRestaurantGuestHandshakeRef,
  verifyRestaurantGuestHandshakeRef,
} from '@/server/restaurantGuestHandshake';

export const runtime = 'nodejs';

const RESTAURANT_HANDSHAKE_CANARY_TABLE = '6';

const normalizeName = (value: unknown): string =>
  String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

const handshakeRefFromRequest = (request: NextRequest): string => {
  const referer = request.headers.get('referer')?.trim();
  if (!referer) return '';
  try {
    return new URL(referer).searchParams.get('handshake')?.trim() ?? '';
  } catch {
    return '';
  }
};

async function bindTable6HandshakeToSession(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  ref: string,
  session: { guest_user_id: string; first_name: string; stay_id: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!serviceClient || !ref || !verifyRestaurantGuestHandshakeRef(ref)) {
    return { ok: false, error: 'WhatsApp verification is missing or invalid' };
  }

  const { data: handshake, error: handshakeError } = await serviceClient
    .from('restaurant_guest_handshakes')
    .select('id,status,table_number,first_name,match_kind,matched_stay_id,bound_guest_user_id,bound_guest_stay_id')
    .eq('ref_hash', hashRestaurantGuestHandshakeRef(ref))
    .maybeSingle();

  if (handshakeError || !handshake || handshake.status !== 'completed') {
    return { ok: false, error: 'WhatsApp verification is not complete' };
  }
  if (String(handshake.table_number) !== RESTAURANT_HANDSHAKE_CANARY_TABLE) {
    return { ok: false, error: 'WhatsApp verification is for another table' };
  }
  if (normalizeName(handshake.first_name) !== normalizeName(session.first_name)) {
    return { ok: false, error: 'WhatsApp verification does not match this guest' };
  }
  if (
    handshake.match_kind === 'hotel' &&
    String(handshake.matched_stay_id ?? '').trim().toUpperCase() !== session.stay_id.trim().toUpperCase()
  ) {
    return { ok: false, error: 'WhatsApp verification does not match this stay' };
  }

  const existingGuestId = String(handshake.bound_guest_user_id ?? '').trim();
  const existingStayId = String(handshake.bound_guest_stay_id ?? '').trim();
  if (existingGuestId || existingStayId) {
    return existingGuestId === session.guest_user_id && existingStayId === session.stay_id
      ? { ok: true }
      : { ok: false, error: 'WhatsApp verification is already linked to another guest' };
  }

  const { data: updated, error: updateError } = await serviceClient
    .from('restaurant_guest_handshakes')
    .update({
      bound_guest_user_id: session.guest_user_id,
      bound_guest_stay_id: session.stay_id,
      bound_at: new Date().toISOString(),
    })
    .eq('id', handshake.id)
    .is('bound_guest_user_id', null)
    .select('bound_guest_user_id,bound_guest_stay_id')
    .maybeSingle();

  if (updateError) {
    console.error('[api/guest/register] Table 6 handshake bind failed:', updateError.message);
    return { ok: false, error: 'Could not securely link WhatsApp to this guest' };
  }
  if (
    !updated ||
    String(updated.bound_guest_user_id ?? '') !== session.guest_user_id ||
    String(updated.bound_guest_stay_id ?? '') !== session.stay_id
  ) {
    return { ok: false, error: 'Could not securely link WhatsApp to this guest' };
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  const serviceClient = createServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Registration service unavailable' }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  let result;
  let tableNumber = '';
  try {
    let registrationPayload = payload;
    if (payload && typeof payload === 'object') {
      const body = payload as Record<string, unknown>;
      const suppliedStayId = typeof body.stay_id === 'string' ? body.stay_id.trim().toLowerCase() : '';
      const isWalkInRequest = !suppliedStayId || suppliedStayId === 'unknown' || suppliedStayId.includes('walkin');
      tableNumber = typeof body.table_number === 'string' ? body.table_number.trim() : '';
      const handshakeDecisionIsAuthoritative = tableNumber === RESTAURANT_HANDSHAKE_CANARY_TABLE;

      if (
        isWalkInRequest &&
        !handshakeDecisionIsAuthoritative &&
        typeof body.first_name === 'string'
      ) {
        const inferredStayId = await resolveActiveStayForFirstName(serviceClient, body.first_name);
        if (inferredStayId) {
          registrationPayload = { ...body, stay_id: inferredStayId };
        }
      }
    }
    result = await registerGuest(registrationPayload, createSupabaseGuestStore(serviceClient));
  } catch (error) {
    console.error('[api/guest/register] Unexpected failure:', error);
    return NextResponse.json({ error: 'Failed to register guest' }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (tableNumber === RESTAURANT_HANDSHAKE_CANARY_TABLE) {
    const binding = await bindTable6HandshakeToSession(
      serviceClient,
      handshakeRefFromRequest(request),
      result.session,
    );
    if (!binding.ok) {
      return NextResponse.json({ error: binding.error }, { status: 409 });
    }
  }

  return NextResponse.json(result.session, { status: result.status });
}
