
-- Align database with application code by setting default role to 'customer'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'customer';

-- Update existing profiles that have the old default 'user' role for consistency.
UPDATE public.profiles SET role = 'customer' WHERE lower(role) = 'user';

-- Harden the get_user_role function to prevent errors with NULL roles.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Select the role from the profiles table for the given user_id and convert to lowercase.
  -- Coalesce to 'customer' if role is NULL.
  SELECT lower(coalesce(role, 'customer')) INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
