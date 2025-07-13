-- Script to change customer "Kung" from "unknown" to "walkin"

-- STEP 1: Find Kung's orders and user information
-- This will help us identify how Kung is stored in the system
SELECT 
    id,
    user_id,
    customer_name,
    guest_first_name,
    guest_user_id,
    stay_id,
    table_number,
    total_amount,
    created_at,
    order_status
FROM orders 
WHERE customer_name ILIKE '%kung%' 
   OR guest_first_name ILIKE '%kung%'
ORDER BY created_at DESC;

-- STEP 2: Check if Kung exists in profiles table
SELECT 
    id,
    name,
    email,
    role,
    customer_type,
    created_at
FROM profiles 
WHERE name ILIKE '%kung%';

-- STEP 3: Check if Kung exists in guest_users table
SELECT 
    id,
    user_id,
    first_name,
    stay_id,
    created_at
FROM guest_users 
WHERE first_name ILIKE '%kung%';

-- STEP 4A: If Kung is in profiles table, update the customer_type or add stay_id
-- Replace YOUR_PROFILE_ID with Kung's actual profile ID from Step 2
-- UPDATE profiles SET customer_type = 'walkin' WHERE id = 'YOUR_PROFILE_ID';

-- STEP 4B: If Kung is in guest_users table, update the stay_id to start with "walkin"
-- Replace YOUR_GUEST_USER_ID with Kung's actual user_id from Step 3
-- UPDATE guest_users SET stay_id = 'walkin_kung' WHERE user_id = 'YOUR_GUEST_USER_ID';

-- STEP 4C: If Kung only exists in orders table, update the orders directly
-- Replace YOUR_ORDER_IDS with the actual order IDs from Step 1 (use comma-separated list for multiple orders)
-- UPDATE orders SET stay_id = 'walkin_kung', guest_user_id = 'walkin_user_kung' WHERE id IN (YOUR_ORDER_IDS);

-- STEP 5: Verify the changes
-- Check orders again to see if Kung now shows as walkin
SELECT 
    id,
    user_id,
    customer_name,
    guest_first_name,
    guest_user_id,
    stay_id,
    table_number,
    total_amount,
    created_at,
    order_status
FROM orders 
WHERE customer_name ILIKE '%kung%' 
   OR guest_first_name ILIKE '%kung%'
   OR stay_id = 'walkin_kung'
ORDER BY created_at DESC;
