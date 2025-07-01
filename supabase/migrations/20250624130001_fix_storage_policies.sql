-- This migration sets up storage policies for profile pictures
-- The actual policies will be set up through the Supabase Dashboard or API
-- as direct SQL commands require elevated privileges

-- Create or update the storage bucket configuration
DO $$
BEGIN
  -- Check if the bucket exists
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'profile-pictures') THEN
    -- Create the bucket
    PERFORM storage.create_bucket(
      'profile-pictures', 
      'Profile pictures for user avatars', 
      TRUE, -- public
      5242880, -- 5MB file size limit
      '{"image/png","image/jpeg","image/gif"}', -- allowed MIME types
      TRUE -- avif detection
    );
  ELSE
    -- Update existing bucket settings
    UPDATE storage.buckets 
    SET 
      public = true,
      file_size_limit = 5242880,
      allowed_mime_types = '{"image/png","image/jpeg","image/gif"}'
    WHERE name = 'profile-pictures';
  END IF;

  -- Enable RLS on the profiles table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Create or replace policy for profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
      CREATE POLICY "Users can update own profile" 
      ON public.profiles 
      FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Enable read access for all users') THEN
      CREATE POLICY "Enable read access for all users"
      ON public.profiles 
      FOR SELECT 
      TO authenticated 
      USING (true);
    END IF;
  END IF;

  -- Note: Storage policies for storage.objects are managed through the Supabase Dashboard
  -- as they require elevated privileges to modify directly
  
  RAISE NOTICE 'Storage setup complete. Please configure storage policies through the Supabase Dashboard.';
END $$;
