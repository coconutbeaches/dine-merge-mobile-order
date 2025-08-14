-- Update user name from "Guest User" to "Phon" for the specified email
-- Email: anonymous_c46d1760-408d-4754-a35a-a74c925f6301@example.com

-- First, let's check if the user exists and their current name
SELECT 
  id, 
  name, 
  email, 
  role,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'anonymous_c46d1760-408d-4754-a35a-a74c925f6301@example.com';

-- Update the user's name to "Phon"
UPDATE profiles 
SET 
  name = 'Phon',
  updated_at = NOW()
WHERE email = 'anonymous_c46d1760-408d-4754-a35a-a74c925f6301@example.com';

-- Verify the update was successful
SELECT 
  id, 
  name, 
  email, 
  role,
  created_at,
  updated_at
FROM profiles 
WHERE email = 'anonymous_c46d1760-408d-4754-a35a-a74c925f6301@example.com';

-- Show affected rows count
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN 'User found and updated successfully'
    ELSE 'User not found with that email address'
  END as result
FROM profiles 
WHERE email = 'anonymous_c46d1760-408d-4754-a35a-a74c925f6301@example.com' 
AND name = 'Phon';
