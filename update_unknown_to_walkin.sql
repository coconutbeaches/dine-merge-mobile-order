-- STEP 1: Find the order that matches the screenshot
-- Run this query first to get the order ID
SELECT 
    id,
    customer_name,
    guest_first_name,
    guest_user_id,
    stay_id,
    table_number,
    total_amount,
    created_at,
    order_status
FROM orders 
WHERE table_number = '1' 
    AND total_amount = 880
    AND DATE(created_at) = '2025-07-13'
    AND EXTRACT(HOUR FROM created_at) = 13
    AND EXTRACT(MINUTE FROM created_at) BETWEEN 0 AND 10
ORDER BY created_at DESC;

-- STEP 2: After you get the order ID from above, copy and paste ONE of the following update commands:
-- Replace 'YOUR_ORDER_ID_HERE' with the actual ID number from the query above

-- Option A: Simple name change to "Walkin 1"
-- UPDATE orders SET customer_name = 'Walkin 1' WHERE id = YOUR_ORDER_ID_HERE;

-- Option B: Full walkin guest setup (recommended)
-- UPDATE orders SET customer_name = 'Walkin 1', stay_id = 'walkin_1', guest_user_id = 'walkin_user_1', guest_first_name = 'Walkin 1' WHERE id = YOUR_ORDER_ID_HERE;

-- STEP 3: Verify the update (replace YOUR_ORDER_ID_HERE with the actual ID)
-- SELECT id, customer_name, guest_first_name, guest_user_id, stay_id, table_number, total_amount, created_at, order_status FROM orders WHERE id = YOUR_ORDER_ID_HERE;
