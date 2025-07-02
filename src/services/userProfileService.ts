import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

// Fetch single user profile
export async function fetchUserProfile(userId: string): Promise<User | null> {
  if (!userId) return null;
  const startTime = Date.now();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, role')
      .eq('id', userId)
      .maybeSingle();
    const endTime = Date.now();
    console.log(`[userProfileService] fetchUserProfile took ${endTime - startTime} ms`);

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

// Merge two customer profiles
export async function mergeCustomers(sourceId: string, targetId: string) {
  if (!sourceId || !targetId) {
    throw new Error("Source and target IDs are required for merging customers.");
  }
  
  console.log(`[userProfileService] Calling RPC merge_customers with source: ${sourceId}, target: ${targetId}`);

  const { error } = await supabase.rpc('merge_customers', {
    source_id: sourceId,
    target_id: targetId,
  });

  if (error) {
    console.error('[userProfileService] Error calling merge_customers RPC:', error);
    throw error;
  }
}

export const updateProfilePicture = async (
  userId: string,
  file: File
): Promise<{
  success: boolean;
  url?: string | null;
  path?: string | null;
  error?: string;
}> => {
  try {
    // 1. Generate a unique file path with userId as the folder
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;
    
    // 2. First, try to delete any existing files for this user
    try {
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('profile-pictures')
        .list(userId);
      
      if (!listError && existingFiles && existingFiles.length > 0) {
        const filesToRemove = existingFiles.map(f => `${userId}/${f.name}`);
        await supabase.storage
          .from('profile-pictures')
          .remove(filesToRemove);
      }
    } catch (cleanupError) {
      console.warn('Could not clean up old profile pictures:', cleanupError);
      // Continue with upload even if cleanup fails
    }

    // 3. Upload the new file
    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { 
        success: false, 
        error: uploadError.message,
        details: uploadError // Include full error details
      };
    }

    // 4. Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    // 5. Update the user's profile with the new avatar URL and path
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: publicUrl,
        avatar_path: filePath,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      // Try to clean up the uploaded file if profile update fails
      try {
        await supabase.storage
          .from('profile-pictures')
          .remove([filePath]);
      } catch (cleanupError) {
        console.error('Error cleaning up after failed update:', cleanupError);
      }
      
      return { 
        success: false, 
        error: updateError.message,
        details: updateError // Include full error details
      };
    }

    return { 
      success: true, 
      url: publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Error in updateProfilePicture:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error // Include full error details
    };
  }
};

/**
 * Deletes a user's profile picture
 */
export const deleteProfilePicture = async (
  userId: string,
  filePath: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Delete the file from storage
    const { error: deleteError } = await supabase.storage
      .from('profile-pictures')
      .remove([filePath]);

    if (deleteError) {
      console.error('Error deleting file:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // 2. Update the user's profile to remove the avatar URL and path
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: null,
        avatar_path: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteProfilePicture:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};
