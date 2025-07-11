-- Add deleted column to profiles table
ALTER TABLE profiles
ADD COLUMN deleted BOOLEAN DEFAULT FALSE;
