-- Add missing columns to orders table that are referenced in the application but don't exist in database
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS guest_user_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_first_name TEXT,
  ADD COLUMN IF NOT EXISTS stay_id TEXT,
  ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON public.orders(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stay_id ON public.orders(stay_id);

-- Add archived and deleted columns to profiles if they don't exist (for filtering)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Create indexes for profiles filtering
CREATE INDEX IF NOT EXISTS idx_profiles_archived ON public.profiles(archived);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted ON public.profiles(deleted);
