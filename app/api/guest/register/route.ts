import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { registerGuest } from '@/lib/guestRegistration';
import { createSupabaseGuestStore } from '@/lib/guestRegistrationStore';
import { resolveActiveStayForFirstName } from '@/lib/guestStayIdentity';

export const runtime = 'nodejs';

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
  try {
    let registrationPayload = payload;
    if (payload && typeof payload === 'object') {
      const body = payload as Record<string, unknown>;
      const suppliedStayId = typeof body.stay_id === 'string' ? body.stay_id.trim().toLowerCase() : '';
      const isWalkInRequest = !suppliedStayId || suppliedStayId === 'unknown' || suppliedStayId.includes('walkin');
      if (isWalkInRequest && typeof body.first_name === 'string') {
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

  return NextResponse.json(result.session, { status: result.status });
}
