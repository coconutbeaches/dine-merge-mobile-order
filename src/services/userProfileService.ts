
import { supabase } from '@/integrations/supabase/client';
import { User } from '../types';

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
export async function updateUserProfile(updatedUser: User) {
  if (!updatedUser.id) return;
  const { error } = await supabase
    .from('profiles')
    .update({
      name: updatedUser.name,
      phone: updatedUser.phone
    })
    .eq('id', updatedUser.id);
  if (error) {
    console.error('[userProfileService] Error updating user:', error);
    throw error;
  }
}
