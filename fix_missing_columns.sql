-- Fix missing columns in orders and profiles tables
-- This script can be pasted directly into Supabase SQL Editor

-- Add missing columns to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS guest_user_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_first_name TEXT,
  ADD COLUMN IF NOT EXISTS stay_id TEXT,
  ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Add missing columns to profiles table  
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON public.orders(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stay_id ON public.orders(stay_id);
CREATE INDEX IF NOT EXISTS idx_profiles_archived ON public.profiles(archived);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted ON public.profiles(deleted);

-- Verify the columns were added successfully
SELECT 'Orders table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY column_name;

SELECT 'Profiles table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY column_name;
