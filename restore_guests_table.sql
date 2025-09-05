-- ========================================================================
-- RESTORE GUESTS TABLE (Missing from Production Database)
-- ========================================================================
-- This script recreates the `guests` table that was missing from production,
-- causing new account registrations to fail with "relation does not exist".
-- 
-- Based on migrations:
-- - 20250705171555_create_guests_table.sql
-- - 20250713000000_fix_guests_table_schema.sql
-- ========================================================================

-- 1️⃣ CREATE TABLE: guests
-- Primary table for guest user registrations (both hotel guests and walk-ins)
CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_id text NOT NULL,
  first_name text NOT NULL,
  table_number text,  -- Added in schema fix migration
  created_at timestamptz DEFAULT now()
);

-- 2️⃣ CREATE INDEXES
-- Index for faster queries by table_number (added in schema fix)
CREATE INDEX IF NOT EXISTS idx_guests_table_number ON guests(table_number);

-- Index for stay_id lookups (commonly used for family member checks)
CREATE INDEX IF NOT EXISTS idx_guests_stay_id ON guests(stay_id);

-- 3️⃣ ENABLE ROW LEVEL SECURITY
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- 4️⃣ CREATE RLS POLICIES
-- Drop any existing policies first (to ensure clean recreation)
DROP POLICY IF EXISTS "Guests can create their own records." ON guests;
DROP POLICY IF EXISTS "Guests can view their own records." ON guests;
DROP POLICY IF EXISTS "Guests can update their own records." ON guests;
DROP POLICY IF EXISTS "Guests can create records." ON guests;
DROP POLICY IF EXISTS "Guests can view records." ON guests;
DROP POLICY IF EXISTS "Guests can update records." ON guests;

-- Create permissive policies for guest registration (final version from schema fix)
CREATE POLICY "Guests can create records." ON guests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Guests can view records." ON guests
  FOR SELECT USING (true);

CREATE POLICY "Guests can update records." ON guests
  FOR UPDATE USING (true) WITH CHECK (true);

-- ========================================================================
-- VERIFICATION QUERIES (uncomment to test)
-- ========================================================================

-- Test table exists and has correct structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'guests' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Test indexes were created
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'guests' AND schemaname = 'public';

-- Test RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'guests' AND schemaname = 'public';
