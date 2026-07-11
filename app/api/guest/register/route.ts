import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  registerGuest,
  type GuestRegistrationStore,
  type GuestRecord,
} from '@/lib/guestRegistration';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabaseTypes';

export const runtime = 'nodejs';

/**
 * Adapts the service-role Supabase client to the GuestRegistrationStore port.
 * All access to public.guests is service-role only; the browser no longer has
 * SELECT/INSERT rights on this table (see the C3 migration).
 */
function createGuestStore(client: SupabaseClient<Database>): GuestRegistrationStore {
  return {
    async findByStayAndName(stayId, firstName) {
      const { data, error } = await client
        .from('guests')
        .select('id, stay_id, first_name')
        .eq('stay_id', stayId)
        .eq('first_name', firstName)
        .maybeSingle();

      if (error) throw error;
      return (data as GuestRecord) ?? null;
    },

    async countByStay(stayId) {
      const { count, error } = await client
        .from('guests')
        .select('id', { count: 'exact', head: true })
        .eq('stay_id', stayId);

      if (error) throw error;
      return count ?? 0;
    },

    async insert(row) {
      const { data, error } = await client
        .from('guests')
        .insert(row)
        .select('id, stay_id, first_name')
        .single();

      if (error) throw error;
      return data as GuestRecord;
    },
  };
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
  try {
    result = await registerGuest(payload, createGuestStore(serviceClient));
  } catch (error) {
    console.error('[api/guest/register] Unexpected failure:', error);
    return NextResponse.json({ error: 'Failed to register guest' }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.session, { status: result.status });
}
