
-- Create the register_guest_user function
CREATE OR REPLACE FUNCTION public.register_guest_user(
    _first_name text,
    _stay_id text
)
RETURNS uuid AS $$
DECLARE
    new_auth_user_id uuid;
    generated_user_id text;
BEGIN
    -- Generate the custom user_id
    generated_user_id := _stay_id || '_' || lower(_first_name);

    -- Create a shadow user in auth.users
    -- Use a dummy email and random password for anonymous sign-in
    INSERT INTO auth.users (email, encrypted_password, confirmation_token, email_confirmed_at, instance_id)
    VALUES (
        generated_user_id || '@guest.com',
        crypt(gen_random_uuid()::text, gen_salt('bf')),
        gen_random_uuid(),
        now(),
        (SELECT id FROM auth.instances LIMIT 1) -- Assuming a single instance
    )
    RETURNING id INTO new_auth_user_id;

    -- Insert into guest_users table, linking to auth.users.id
    INSERT INTO public.guest_users (user_id, first_name, stay_id, auth_user_id)
    VALUES (generated_user_id, _first_name, _stay_id, new_auth_user_id);

    RETURN new_auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.register_guest_user(text, text) TO authenticated;
