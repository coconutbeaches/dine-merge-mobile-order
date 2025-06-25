
CREATE OR REPLACE FUNCTION public.is_user_in_auth(user_id_to_check uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_to_check);
END;
$$;
