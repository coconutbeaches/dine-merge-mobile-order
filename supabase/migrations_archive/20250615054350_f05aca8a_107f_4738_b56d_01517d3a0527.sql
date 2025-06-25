
-- Create a helper function to get a user's role.
-- This function will be used in our security policies to check if a user is an admin.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Select the role from the profiles table for the given user_id.
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for authenticated users to use this function.
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- Enable Row Level Security (RLS) on the profiles table.
-- This is a crucial security step.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow any authenticated user to view profiles.
-- This is appropriate for an admin-facing dashboard.
CREATE POLICY "Allow authenticated users to view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Create a policy that allows users to update their own profile,
-- and allows admins to update any user's profile.
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

-- Create a policy that allows admins to delete user profiles.
CREATE POLICY "Allow admins to delete profiles"
ON public.profiles
FOR DELETE
USING ((get_user_role(auth.uid()) = 'admin'));
