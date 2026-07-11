import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { registerGuest } from '@/lib/guestRegistration';
import { createSupabaseGuestStore } from '@/lib/guestRegistrationStore';

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
    result = await registerGuest(payload, createSupabaseGuestStore(serviceClient));
  } catch (error) {
    console.error('[api/guest/register] Unexpected failure:', error);
    return NextResponse.json({ error: 'Failed to register guest' }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.session, { status: result.status });
}
