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
