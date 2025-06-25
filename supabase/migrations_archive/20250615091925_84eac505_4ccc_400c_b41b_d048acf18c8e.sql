
-- Drop the existing update policy on profiles as it's causing permission issues.
DROP POLICY IF EXISTS "Allow update access for own profile or for admins" ON public.profiles;

-- Create a secure function to handle profile updates.
-- This function runs with the definer's privileges, avoiding RLS conflicts,
-- but still performs the necessary authorization checks internally.
CREATE OR REPLACE FUNCTION public.update_profile_details(
  user_id uuid,
  new_name text,
  new_phone text
)
RETURNS void AS $$
BEGIN
  -- First, check if the calling user is an admin or is the user they are trying to edit.
  IF (get_user_role(auth.uid()) = 'admin' OR auth.uid() = user_id) THEN
    -- If authorized, update the profile.
    UPDATE public.profiles
    SET
      name = new_name,
      phone = new_phone,
      updated_at = now()
    WHERE id = user_id;
  ELSE
    -- If not authorized, raise an error.
    RAISE EXCEPTION 'User is not authorized to perform this action.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for any authenticated user to call this new function.
-- The authorization logic is handled inside the function itself.
GRANT EXECUTE ON FUNCTION public.update_profile_details(uuid, text, text) TO authenticated;
