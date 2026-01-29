-- Fix the guest_stay_overrides trigger that has a uuid/text type mismatch
-- The trigger was comparing orders.stay_id (TEXT) with guest_user_id (UUID)
-- It should compare guest_user_id with orders.guest_user_id (both UUID)

-- First, drop the existing buggy trigger if it exists
DROP TRIGGER IF EXISTS apply_guest_stay_override ON orders;
DROP FUNCTION IF EXISTS apply_guest_stay_override();

-- Recreate the function with correct type comparisons
CREATE OR REPLACE FUNCTION apply_guest_stay_override()
RETURNS TRIGGER AS $$
DECLARE
  override_stay_id TEXT;
BEGIN
  -- Only apply override if we have a guest_user_id that looks like a valid UUID
  IF NEW.guest_user_id IS NOT NULL AND NEW.guest_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    -- Look up if this guest has a stay override
    -- Cast orders.guest_user_id (TEXT) to UUID for comparison with guest_stay_overrides.guest_user_id (UUID)
    SELECT target_stay_id INTO override_stay_id
    FROM guest_stay_overrides
    WHERE guest_user_id = NEW.guest_user_id::uuid;

    -- If an override exists, apply it
    IF override_stay_id IS NOT NULL THEN
      NEW.stay_id := override_stay_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER apply_guest_stay_override
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION apply_guest_stay_override();

-- Add comment for documentation
COMMENT ON FUNCTION apply_guest_stay_override() IS 'Applies guest stay overrides on order insert. Fixed to compare UUID with UUID instead of UUID with TEXT.';
