-- Add table_number column to guest_users table
ALTER TABLE guest_users ADD COLUMN table_number text;

-- Add index for faster queries by table_number
CREATE INDEX idx_guest_users_table_number ON guest_users(table_number);

-- Update RLS policies to allow guests to insert with table_number
-- (The existing policies should already cover this, but let's ensure it's clear)
