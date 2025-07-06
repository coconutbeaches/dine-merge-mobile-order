-- Add stay_id column to orders table for linking guest orders to families
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stay_id text;

-- Add index for faster queries on guest family orders
CREATE INDEX IF NOT EXISTS idx_orders_stay_id ON public.orders(stay_id);

-- Add comment explaining the field
COMMENT ON COLUMN public.orders.stay_id IS 'Hotel room identifier for guest families (e.g., A5-CROWLEY). Groups guest orders by family.';
