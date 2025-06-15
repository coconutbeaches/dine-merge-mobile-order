
import { supabase } from '@/integrations/supabase/client';

// Fetch single user profile
export async function fetchUserProfile(userId: string): Promise<User | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[userProfileService] Error fetching user profile:', error);
      return null;
    }
    if (data) {
      console.log('[userProfileService] User profile found:', data);
      return {
        id: data.id,
        email: data.email,
        name: data.name || data.email.split('@')[0],
        phone: data.phone || "",
        role: data.role || 'customer',
        addresses: [],
        orderHistory: [],
      };
    }
    return null;
  } catch (e) {
    console.error('[userProfileService] Unexpected fetch error:', e);
    return null;
  }
}

// Update user profile (names, phone only)
export async function updateUserProfile(
  update: { id: string; name: string; phone: string }
) {
  if (!update.id) return;
  // Only send name and phone in the payload
  const { error, data } = await supabase
    .from('profiles')
    .update({
      name: update.name,
      phone: update.phone,
    })
    .eq('id', update.id);
  if (error) {
    // Improved error logging for debugging
    console.error('[userProfileService] Error updating user:', error, 'Payload:', update, 'Returned data:', data);
    throw error;
  }
}
