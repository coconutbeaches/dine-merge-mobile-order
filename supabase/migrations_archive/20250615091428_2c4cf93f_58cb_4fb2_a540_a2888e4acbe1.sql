
-- First, drop the faulty recursive policy from the last migration.
DROP POLICY IF EXISTS "Allow update access for own profile or for admins" ON public.profiles;

-- Now, recreate the policy correctly using the existing `get_user_role` helper function.
-- This avoids the recursion issue that was causing the permission error.
CREATE POLICY "Allow update access for own profile or for admins"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id OR
  (get_user_role(auth.uid()) = 'admin')
)
WITH CHECK (
  auth.uid() = id OR
  (get_user_role(auth.uid()) = 'admin')
);
