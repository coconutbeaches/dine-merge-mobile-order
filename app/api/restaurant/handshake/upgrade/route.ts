import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { completeGuestUpgrade, GuestUpgradeError, startGuestUpgrade } from '@/server/restaurantGuestUpgrade';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const parsed = new URL(origin);
      // Next can normalize a loopback URL to localhost. Compare with the
      // browser-visible Host header, not the normalized NextURL hostname.
      const host = request.headers.get('host') || request.nextUrl.host;
      if (parsed.origin !== origin || parsed.host !== host || parsed.protocol !== request.nextUrl.protocol) {
        return NextResponse.json({ error: 'Cross-origin request denied' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Cross-origin request denied' }, { status: 403 });
    }
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid body');
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (body.action !== 'start' && body.action !== 'complete') {
    return NextResponse.json({ error: 'Invalid upgrade action' }, { status: 400 });
  }
  const client = createServiceRoleClient();
  if (!client) return NextResponse.json({ error: 'Upgrade service unavailable' }, { status: 503 });
  try {
    const result = body.action === 'start'
      ? await startGuestUpgrade(client, body)
      : await completeGuestUpgrade(client, String(body.handshake_ref ?? '').trim());
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof GuestUpgradeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // Do not log handshake refs, phone numbers, or request bodies.
    console.error('[restaurant-upgrade] unexpected service failure');
    return NextResponse.json({ error: 'Upgrade service unavailable. Please try again.' }, { status: 503 });
  }
}
