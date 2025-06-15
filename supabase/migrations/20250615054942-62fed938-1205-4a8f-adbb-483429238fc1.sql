
-- Drop existing policies and function to update them safely
DROP POLICY IF EXISTS "Allow update access for own profile or for admins" ON public.profiles;
DROP POLICY IF EXISTS "Allow admins to delete profiles" ON public.profiles;
-- The SELECT policy is fine, we don't need to drop it.
-- The function will be replaced by CREATE OR REPLACE.

-- Recreate the helper function to get a user's role, ensuring it's lowercase.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Select the role from the profiles table for the given user_id and convert to lowercase.
  SELECT lower(role) INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Re-grant permission for authenticated users to use this function.
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- Recreate the policy that allows users to update their own profile,
-- and allows admins to update any user's profile. It now implicitly uses the lowercase role.
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

-- Recreate the policy that allows admins to delete user profiles.
CREATE POLICY "Allow admins to delete profiles"
ON public.profiles
FOR DELETE
USING ((get_user_role(auth.uid()) = 'admin'));
