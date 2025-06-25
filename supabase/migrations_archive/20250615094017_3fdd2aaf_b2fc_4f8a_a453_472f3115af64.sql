
-- Creates a function to merge two customer accounts.
-- It reassigns orders from a source customer to a target customer
-- and then deletes the source customer's profile.
CREATE OR REPLACE FUNCTION public.merge_customers(
  source_id uuid,
  target_id uuid
)
RETURNS void AS $$
BEGIN
  -- Ensure the caller is an admin before proceeding.
  -- It leverages the existing get_user_role() function.
  IF (get_user_role(auth.uid()) <> 'admin') THEN
    RAISE EXCEPTION 'Only admins can merge customer accounts.';
  END IF;

  -- Re-assign all orders from the source customer to the target customer.
  UPDATE public.orders
  SET user_id = target_id
  WHERE user_id = source_id;

  -- Delete the source customer's profile.
  DELETE FROM public.profiles
  WHERE id = source_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for authenticated users to call this new function.
-- The authorization logic is handled securely inside the function itself.
GRANT EXECUTE ON FUNCTION public.merge_customers(uuid, uuid) TO authenticated;
