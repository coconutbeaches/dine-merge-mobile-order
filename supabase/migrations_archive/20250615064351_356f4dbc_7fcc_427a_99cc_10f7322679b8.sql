
-- Enable RLS if not already enabled (safe to run!)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove any conflicting update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow update access for own profile or for admins" ON public.profiles;

-- Create a correct policy (users can update themselves OR admins can update anyone)
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
