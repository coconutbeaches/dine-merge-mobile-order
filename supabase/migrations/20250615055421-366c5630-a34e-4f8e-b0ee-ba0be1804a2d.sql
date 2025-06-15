
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  RAISE NOTICE '[get_user_role] Checking role for user_id: %', user_id;

  SELECT lower(coalesce(role, 'customer')) INTO user_role FROM public.profiles WHERE id = user_id;
  
  RAISE NOTICE '[get_user_role] Found role ''%'' for user_id: %', user_role, user_id;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
