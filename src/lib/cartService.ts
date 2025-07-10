import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/types';

// Helper function to check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

export async function backupCartToSupabase(
  guestUserId: string | null | undefined,
  cart: CartItem[]
) {
  if (!guestUserId) return;
  try {
    console.log('[CartBackup] upsert', guestUserId, cart.length);
    await supabase
      .from('cart_backups')
      .upsert({
        guest_user_id: guestUserId,
        cart,
        updated_at: new Date().toISOString()
      });
  } catch (err) {
    console.error('[CartBackup] Failed to backup', err);
  }
}

export async function loadCartFromBackup(guestUserId: string | null | undefined) {
  if (!guestUserId) return [];
  try {
    const { data, error } = await supabase
      .from('cart_backups')
      .select('cart')
      .eq('guest_user_id', guestUserId)
      .single();
    if (error) throw error;
    console.log('[CartBackup] loaded', data?.cart?.length ?? 0);
    return (data?.cart as CartItem[]) || [];
  } catch (err) {
    console.error('[CartBackup] Failed to load', err);
    return [];
  }
}

export async function clearCartBackup(guestUserId: string | null | undefined) {
  if (!guestUserId) return;
  try {
    console.log('[CartBackup] delete', guestUserId);
    await supabase.from('cart_backups').delete().eq('guest_user_id', guestUserId);
  } catch (err) {
    console.error('[CartBackup] Failed to clear', err);
  }
}
