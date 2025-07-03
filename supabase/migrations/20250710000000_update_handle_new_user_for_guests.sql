-- Drop the existing trigger that depends on the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the existing handle_new_user function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the handle_new_user function to prioritize guest_users.first_name
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  guest_first_name text;
BEGIN
  -- Try to find a matching guest_user record
  SELECT gu.first_name INTO guest_first_name
  FROM public.guest_users gu
  WHERE gu.auth_user_id = NEW.id;

  -- Insert into profiles using best available name
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, 'anonymous_' || NEW.id || '@example.com'),
    COALESCE(guest_first_name, NEW.raw_user_meta_data->>'name', 'Guest User')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();