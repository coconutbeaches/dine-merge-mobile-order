import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

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

// Update user profile by calling the secure RPC function
export async function updateUserProfile(
  update: { id: string; name: string; phone: string }
) {
  if (!update.id) return;

  console.log('[userProfileService] Calling RPC update_profile_details with:', update);
  
  const { error } = await supabase.rpc('update_profile_details', {
    user_id: update.id,
    new_name: update.name,
    new_phone: update.phone
  });

  console.log('[userProfileService] Supabase RPC response:', { error });

  if (error) {
    console.error('[userProfileService] Error calling update_profile_details RPC:', error, 'Payload:', update);
    throw error;
  }
}
