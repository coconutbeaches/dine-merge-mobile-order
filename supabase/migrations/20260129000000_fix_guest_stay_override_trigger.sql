-- Fix the guest_stay_overrides trigger that has a uuid/text type mismatch
-- The trigger was comparing orders.guest_user_id (TEXT) with guest_stay_overrides.guest_user_id (UUID)
-- without proper type casting, causing "operator does not exist: uuid = text" error

-- Fix the trigger function with proper type casting
-- (The function already exists, so CREATE OR REPLACE will update it)
CREATE OR REPLACE FUNCTION override_order_stay_id()
RETURNS TRIGGER AS $$
DECLARE
  override_stay_id TEXT;
BEGIN
  -- Only check if guest_user_id is a valid UUID format
  IF NEW.guest_user_id IS NOT NULL
     AND NEW.guest_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    -- Check if this guest has a stay override
    -- Cast TEXT to UUID for comparison
    SELECT target_stay_id INTO override_stay_id
    FROM guest_stay_overrides
    WHERE guest_user_id = NEW.guest_user_id::uuid;

    -- If found, override the stay_id
    IF override_stay_id IS NOT NULL THEN
      NEW.stay_id := override_stay_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION override_order_stay_id() IS 'Overrides stay_id on order insert based on guest_stay_overrides table. Fixed to cast TEXT to UUID for comparison.';
