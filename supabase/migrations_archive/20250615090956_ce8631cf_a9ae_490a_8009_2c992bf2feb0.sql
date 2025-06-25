
-- First, drop the existing update policy on the profiles table to ensure a clean slate.
DROP POLICY IF EXISTS "Allow update access for own profile or for admins" ON public.profiles;

-- Also, drop another old named policy just in case it's still present.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Now, create a new, more direct update policy.
-- This policy allows a user to update their own profile, or allows a user with the 'admin' role to update any profile.
-- It checks the role via a subquery, which is often more reliable within RLS than complex function calls.
CREATE POLICY "Allow update access for own profile or for admins"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id OR
    ((SELECT lower(coalesce(role, 'customer')) FROM public.profiles WHERE id = auth.uid()) = 'admin')
  )
  WITH CHECK (
    auth.uid() = id OR
    ((SELECT lower(coalesce(role, 'customer')) FROM public.profiles WHERE id = auth.uid()) = 'admin')
  );
