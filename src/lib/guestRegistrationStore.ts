import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabaseTypes';
import type { GuestRecord, GuestRegistrationStore } from './guestRegistration';

/**
 * Service-role-backed implementation of GuestRegistrationStore over public.guests.
 *
 * NOTE on findByStayAndName: (stay_id, first_name) has no unique constraint and
 * historical data can contain several matching rows, so we must NOT use
 * .maybeSingle() (which errors on >1 row). Instead we order deterministically
 * (created_at, then id) and take the first row, so idempotent re-registration
 * always resolves to the same canonical guest row instead of 500-ing.
 */
export function createSupabaseGuestStore(
  client: SupabaseClient<Database>,
): GuestRegistrationStore {
  return {
    async findByStayAndName(stayId, firstName) {
      const { data, error } = await client
        .from('guests')
        .select('id, stay_id, first_name')
        .eq('stay_id', stayId)
        .eq('first_name', firstName)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1);

      if (error) throw error;

      const rows = (data as GuestRecord[] | null) ?? [];
      return rows[0] ?? null;
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
