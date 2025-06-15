
-- Drop all known policies on the profiles table for a clean slate.
DROP POLICY IF EXISTS "Authenticated can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update access for own profile or for admins" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to delete profiles" ON public.profiles;

-- RLS Policy for SELECT: Authenticated users can see all profiles.
-- This is required for the admin dashboard customer list.
CREATE POLICY "Allow authenticated users to view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy for INSERT: Authenticated users can create new profiles.
-- This is used for both new user sign-ups and admin creating guest customers.
CREATE POLICY "Allow authenticated users to insert profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policy for DELETE: Only users with the 'admin' role can delete profiles.
CREATE POLICY "Allow admins to delete profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- NOTE: There is no UPDATE policy. Profile updates are securely handled by
-- the `update_profile_details` RPC function, which performs its own authorization checks.
-- This is a deliberate and secure design choice.
