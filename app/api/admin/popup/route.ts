import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient, verifyAdminRole } from '@/lib/supabase-server';

const MAX_MESSAGE_LENGTH = 500;

async function getAdminServiceClient() {
  const admin = await verifyAdminRole();
  if (!admin.isAdmin) {
    return {
      response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
      client: null,
    };
  }

  const client = createServiceRoleClient();
  if (!client) {
    return {
      response: NextResponse.json({ error: 'Popup service unavailable' }, { status: 503 }),
      client: null,
    };
  }

  return { response: null, client };
}

export async function GET() {
  const { response, client } = await getAdminServiceClient();
  if (response || !client) return response;

  const { data, error } = await (client as any)
    .from('restaurant_popup_notice')
    .select('message, expires_at, created_at, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('[admin/popup] Failed to load notice:', error);
    return NextResponse.json({ error: 'Failed to load popup' }, { status: 500 });
  }

  return NextResponse.json(
    { notice: data ?? null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  const { response, client } = await getAdminServiceClient();
  if (response || !client) return response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const message =
    typeof body.message === 'string'
      ? body.message.replace(/\r\n?/g, '\n').trim()
      : '';
  const expiresAtRaw = typeof body.expiresAt === 'string' ? body.expiresAt.trim() : '';

  if (!message) {
    return NextResponse.json({ error: 'Popup message is required' }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Popup message must be ${MAX_MESSAGE_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  const expiresAt = new Date(expiresAtRaw);
  if (!expiresAtRaw || Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: 'Valid expiration time is required' }, { status: 400 });
  }

  if (expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Expiration time must be in the future' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const notice = {
    id: 1,
    message,
    expires_at: expiresAt.toISOString(),
    updated_at: now,
  };

  const { data, error } = await (client as any)
    .from('restaurant_popup_notice')
    .upsert(notice, { onConflict: 'id' })
    .select('message, expires_at, created_at, updated_at')
    .single();

  if (error) {
    console.error('[admin/popup] Failed to save notice:', error);
    return NextResponse.json({ error: 'Failed to save popup' }, { status: 500 });
  }

  return NextResponse.json({ notice: data });
}

export async function DELETE() {
  const { response, client } = await getAdminServiceClient();
  if (response || !client) return response;

  const { error } = await (client as any)
    .from('restaurant_popup_notice')
    .delete()
    .eq('id', 1);

  if (error) {
    console.error('[admin/popup] Failed to clear notice:', error);
    return NextResponse.json({ error: 'Failed to clear popup' }, { status: 500 });
  }

  return NextResponse.json({ notice: null });
}
