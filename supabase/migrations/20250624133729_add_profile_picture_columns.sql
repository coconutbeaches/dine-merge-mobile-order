-- Add avatar columns to profiles table if they don't exist
DO $$
BEGIN
  -- Add avatar_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN avatar_url TEXT;
  END IF;
  
  -- Add avatar_path if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_path'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN avatar_path TEXT;
  END IF;
  
  -- Enable RLS on profiles if not already enabled
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  
  -- Create or replace profile policies
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
  
  CREATE POLICY "Users can update own profile" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);
  
  CREATE POLICY "Enable read access for all users"
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);
  
  RAISE NOTICE '✅ Profile picture columns and policies set up successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error setting up profile picture columns: %', SQLERRM;
END $$;
