-- First, add the deleted column if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Insert test profiles with different states
INSERT INTO profiles (id, name, email, role, archived, deleted, created_at, updated_at)
VALUES 
  -- Normal active customer
  (gen_random_uuid(), 'John Doe', 'john.doe@example.com', 'customer', false, false, now(), now()),
  
  -- Archived customer (should NOT appear in order creation dialog)
  (gen_random_uuid(), 'Jane Smith (Archived)', 'jane.smith@example.com', 'customer', true, false, now(), now()),
  
  -- Deleted customer (should NOT appear in order creation dialog)
  (gen_random_uuid(), 'Bob Johnson (Deleted)', 'bob.johnson@example.com', 'customer', false, true, now(), now()),
  
  -- Both archived and deleted (should NOT appear)
  (gen_random_uuid(), 'Alice Brown (Archived & Deleted)', 'alice.brown@example.com', 'customer', true, true, now(), now()),
  
  -- Another normal active customer
  (gen_random_uuid(), 'Michael Wilson', 'michael.wilson@example.com', 'customer', false, false, now(), now()),
  
  -- Normal guest user
  (gen_random_uuid(), 'Sarah Davis', 'sarah.davis@example.com', 'guest', false, false, now(), now())
  
ON CONFLICT (id) DO NOTHING;

-- Display current profiles for verification
SELECT 
  name, 
  email, 
  role, 
  archived, 
  deleted,
  CASE 
    WHEN archived = true OR deleted = true THEN 'SHOULD NOT APPEAR' 
    ELSE 'SHOULD APPEAR' 
  END as visibility_status
FROM profiles 
ORDER BY name;
