
-- Drop the existing enum if it exists
DROP TYPE IF EXISTS order_status CASCADE;

-- Create the new enum with the correct values
CREATE TYPE order_status AS ENUM (
  'new',
  'preparing', 
  'ready',
  'delivery',
  'completed',
  'cancelled',
  'paid'
);

-- Add the order_status column back to the orders table if it doesn't exist
-- and set its type and default value
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_status order_status DEFAULT 'new'::order_status;

-- If the column already exists but has wrong type, we need to update it
-- First remove the default to avoid conflicts
ALTER TABLE orders ALTER COLUMN order_status DROP DEFAULT;

-- Update the column type (this will handle any existing data)
ALTER TABLE orders 
ALTER COLUMN order_status TYPE order_status 
USING COALESCE(
  CASE 
    WHEN order_status = 'out_for_delivery' THEN 'delivery'
    ELSE order_status
  END::order_status, 
  'new'::order_status
);

-- Set the default value
ALTER TABLE orders 
ALTER COLUMN order_status SET DEFAULT 'new'::order_status;
