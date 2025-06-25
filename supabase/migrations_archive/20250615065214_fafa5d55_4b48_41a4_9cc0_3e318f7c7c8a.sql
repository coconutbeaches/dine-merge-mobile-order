
-- Enable Row Level Security (RLS) just to be sure.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove any update policies by their known names.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow update access for own profile or for admins" ON public.profiles;

-- Recreate the ONLY correct update policy:
CREATE POLICY "Allow update access for own profile or for admins"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id OR
    (public.get_user_role(auth.uid()) = 'admin')
  )
  WITH CHECK (
    auth.uid() = id OR
    (public.get_user_role(auth.uid()) = 'admin')
  );
