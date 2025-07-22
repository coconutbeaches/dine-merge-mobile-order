-- Reset admin password in Supabase Auth
-- Run this in your Supabase SQL Editor

-- Option 1: Send password reset email to admin
SELECT extensions.auth.send_password_reset_email('steepdecline@gmail.com');

-- Option 2: If you need to update the password directly (requires service role)
-- First, you'll need to use the service role key for this
-- This is more complex and typically done via the Supabase dashboard

-- Check if user exists and get details
SELECT id, email, email_confirmed_at, created_at
FROM auth.users 
WHERE email = 'steepdecline@gmail.com';
