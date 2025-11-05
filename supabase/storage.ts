// src/lib/supabase/storage.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Use placeholders when env vars are missing
// The EnvConfigValidator component will show a user-friendly error page if needed
const url = supabaseUrl || 'https://placeholder.supabase.co';
const anonKey = supabaseAnonKey || 'placeholder-key';

// Regular client for most operations
export const supabase = createClient<Database>(url, anonKey)

// Admin client for operations that need elevated privileges
// Note: This requires SUPABASE_SERVICE_ROLE_KEY which may not be set in all environments
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(url, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase // Fallback to regular client if service key is not available

// Storage bucket name
export const PROFILE_PICTURES_BUCKET = 'profile-pictures'

// Upload a profile picture
export const uploadProfilePicture = async (userId: string, file: File) => {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${userId}_${Date.now()}.${fileExt}`
    
    // Use admin client for storage operations
    const { error: uploadError } = await supabaseAdmin.storage
      .from(PROFILE_PICTURES_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Get the public URL using admin client
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(PROFILE_PICTURES_BUCKET)
      .getPublicUrl(fileName)

    // Update the user's profile with the new avatar URL
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        avatar_url: publicUrl,
        avatar_path: fileName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return { 
      success: true, 
      url: publicUrl,
      path: fileName
    }
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Delete a profile picture
export const deleteProfilePicture = async (userId: string, filePath: string) => {
  try {
    // Delete the file from storage using admin client
    const { error: deleteError } = await supabaseAdmin.storage
      .from(PROFILE_PICTURES_BUCKET)
      .remove([filePath])

    if (deleteError) throw deleteError

    // Update the user's profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        avatar_url: null,
        avatar_path: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) throw updateError

    return { success: true }
  } catch (error) {
    console.error('Error deleting profile picture:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}