-- Fix guests table schema to support family member registration
-- Add table_number column to guests table (if not exists)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS table_number text;

-- Add index for faster queries by table_number
CREATE INDEX IF NOT EXISTS idx_guests_table_number ON guests(table_number);

-- Update RLS policies to ensure multiple family members can register for same stay_id
-- The existing policies should already allow this, but let's verify they're correct

-- Drop and recreate policies to ensure they allow family member registration
DROP POLICY IF EXISTS "Guests can create their own records." ON guests;
DROP POLICY IF EXISTS "Guests can view their own records." ON guests;
DROP POLICY IF EXISTS "Guests can update their own records." ON guests;

-- Create more permissive policies for guest registration
CREATE POLICY "Guests can create records." ON guests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Guests can view records." ON guests
  FOR SELECT USING (true);

CREATE POLICY "Guests can update records." ON guests
  FOR UPDATE USING (true) WITH CHECK (true);

-- Ensure the table allows multiple guests with the same stay_id but different names
-- This is handled by the primary key being on id, not on (stay_id, first_name)
