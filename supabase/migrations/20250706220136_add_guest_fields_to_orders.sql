-- Add guest user fields to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_user_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_first_name TEXT,
  ALTER COLUMN user_id DROP NOT NULL;  -- allow NULL for guests

-- Create index for guest_user_id for performance
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON public.orders(guest_user_id);
