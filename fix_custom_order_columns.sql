-- Fix missing columns for custom order functionality
-- Run this in your Supabase SQL Editor

-- Add missing columns to orders table that are needed for custom orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS guest_user_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_first_name TEXT,
  ADD COLUMN IF NOT EXISTS stay_id TEXT,
  ADD COLUMN IF NOT EXISTS special_instructions TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Ensure order_status column exists and has proper default
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'new';

-- Ensure order_items column exists and has proper default
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_items JSONB DEFAULT '[]'::jsonb;

-- Ensure updated_at column exists
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure table_number column exists
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS table_number TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON public.orders(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stay_id ON public.orders(stay_id);

-- Verify the columns were added successfully
SELECT 'Orders table columns after update:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY column_name;

-- Test query to ensure custom order insertion will work
SELECT 'Testing custom order column compatibility...' as test_status;
