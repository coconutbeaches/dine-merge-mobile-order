-- QR Deep-Link Test Results Verification Script
-- Run these queries in Supabase to verify test behavior

-- 1. Check guest_users table for new entries during testing
SELECT 
  user_id,
  first_name,
  stay_id,
  created_at,
  CASE 
    WHEN user_id LIKE 'existing_guest_%' THEN 'Test 2 - Existing Guest'
    WHEN user_id LIKE 'test_guest_order_flow' THEN 'Test 4 - Order Flow'
    ELSE 'Test 1 - New Guest'
  END as test_scenario
FROM guest_users 
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 2. Check orders table for correct table_number behavior
SELECT 
  id,
  guest_user_id,
  guest_first_name,
  table_number,
  total_amount,
  order_status,
  created_at,
  CASE 
    WHEN guest_user_id = 'test_guest_order_flow' THEN 'Test 4 - Order Flow Verification'
    WHEN guest_user_id LIKE 'guest_%' THEN 'Test 1 - First Order (should have table_number)'
    WHEN guest_user_id = 'guest_with_prev_order' THEN 'Test 3 - Second Order (should be null)'
    ELSE 'Other Test'
  END as test_scenario
FROM orders 
WHERE guest_user_id IS NOT NULL 
  AND created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 3. Verify table_number behavior specifically
-- First orders should have table_number, subsequent orders should be null
SELECT 
  guest_user_id,
  COUNT(*) as order_count,
  ARRAY_AGG(table_number ORDER BY created_at) as table_numbers_sequence,
  ARRAY_AGG(id ORDER BY created_at) as order_ids_sequence
FROM orders 
WHERE guest_user_id IS NOT NULL 
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY guest_user_id
ORDER BY MIN(created_at) DESC;

-- 4. Check for any orders that should have table_number = null but don't
-- (This validates requirement 3: Place second order without rescan – table_number should be null)
SELECT 
  id,
  guest_user_id,
  table_number,
  created_at,
  ROW_NUMBER() OVER (PARTITION BY guest_user_id ORDER BY created_at) as order_sequence
FROM orders 
WHERE guest_user_id IS NOT NULL 
  AND created_at >= NOW() - INTERVAL '1 hour'
HAVING ROW_NUMBER() OVER (PARTITION BY guest_user_id ORDER BY created_at) > 1
  AND table_number IS NOT NULL; -- These should be null but aren't

-- 5. Summary report
SELECT 
  'Total guest users created in last hour' as metric,
  COUNT(*)::text as value
FROM guest_users 
WHERE created_at >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Total orders with guest_user_id in last hour' as metric,
  COUNT(*)::text as value
FROM orders 
WHERE guest_user_id IS NOT NULL 
  AND created_at >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Orders with table_number (first orders)' as metric,
  COUNT(*)::text as value
FROM orders 
WHERE guest_user_id IS NOT NULL 
  AND table_number IS NOT NULL
  AND created_at >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Orders with table_number = null (subsequent orders)' as metric,
  COUNT(*)::text as value
FROM orders 
WHERE guest_user_id IS NOT NULL 
  AND table_number IS NULL
  AND created_at >= NOW() - INTERVAL '1 hour';

-- 6. Test-specific validations

-- Test 1: Should have created a guest_user with table scanned
-- Test 2: Should NOT have created duplicate guest_user
-- Test 3: Second order should have table_number = null
-- Test 4: Manual verification scenario

-- Expected results:
-- - guest_users should have entries for new scans but NOT for existing sessions
-- - First orders should have table_number matching the scanned table
-- - Subsequent orders without rescan should have table_number = null
-- - No crashes or errors in Safari Private Mode (verified by test execution)
