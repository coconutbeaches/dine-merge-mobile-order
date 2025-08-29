-- Add or update a guest_users membership for a family/group stay
-- Usage: Paste into Supabase SQL editor (dine-merge-mobile-order project) and run

DO $$
DECLARE
  v_guest_user_id text := '7aff3048-66b3-47ac-b3f7-ca80569fa475'; -- Moritz
  v_first_name    text := 'Moritz';
  v_stay_id       text := 'New_House_Jansen';
BEGIN
  -- Try update first
  UPDATE guest_users
     SET first_name = v_first_name,
         stay_id    = v_stay_id
   WHERE user_id    = v_guest_user_id;

  IF NOT FOUND THEN
    INSERT INTO guest_users (user_id, first_name, stay_id, created_at)
    VALUES (v_guest_user_id, v_first_name, v_stay_id, NOW());
    RAISE NOTICE 'Inserted guest_users for % → %', v_guest_user_id, v_stay_id;
  ELSE
    RAISE NOTICE 'Updated guest_users for % → %', v_guest_user_id, v_stay_id;
  END IF;

  -- Optional: align any existing orders for this guest (already handled separately in your case)
  -- UPDATE public.orders
  --    SET stay_id = v_stay_id,
  --        updated_at = NOW()
  --  WHERE guest_user_id = v_guest_user_id
  --    AND (stay_id IS NULL OR stay_id LIKE 'walkin-%');
END $$;

