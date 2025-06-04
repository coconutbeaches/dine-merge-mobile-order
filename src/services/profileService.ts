import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProfileUpdateDetails {
  name?: string;
  phone?: string;
  // Potentially other fields an admin might update
}

/**
 * Allows an admin to update a user's profile.
 * @param userId The ID of the user whose profile is to be updated.
 * @param details An object containing the profile fields to update.
 * @returns The updated profile data.
 * @throws If the update fails.
 */
export const adminUpdateProfile = async (userId: string, details: ProfileUpdateDetails) => {
  if (!userId) {
    throw new Error("User ID is required to update profile.");
  }
  if (Object.keys(details).length === 0) {
    toast.info("No details provided to update.");
    // Consider if this should throw an error or return null/undefined
    return null;
  }

  console.log(`Admin updating profile for user ${userId} with details:`, details);

  const { data, error } = await supabase
    .from('profiles')
    .update(details)
    .eq('id', userId)
    .select()
    .maybeSingle(); // MODIFIED HERE

  if (error) {
    console.error('Error updating profile via admin:', error);
    toast.error(`Error updating profile: ${error.message}`);
    throw error;
  }

  if (!data) {
    toast.warn("Profile update: No data returned after update. This might be due to RLS on select or if the ID didn't match.");
    return null;
  }

  toast.success('Profile updated successfully by admin!');
  console.log('Profile updated by admin:', data);
  return data;
};

// Example of another function that might be in this service:
export const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    toast.error(`Error fetching profile: ${error.message}`);
    throw error;
  }
  return data;
};
