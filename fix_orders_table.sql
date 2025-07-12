-- Add missing columns specifically to orders table
-- Run this if the orders table columns weren't added in the previous script

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS guest_user_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_first_name TEXT,
  ADD COLUMN IF NOT EXISTS stay_id TEXT,
  ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON public.orders(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stay_id ON public.orders(stay_id);

-- Verify the orders table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY column_name;
