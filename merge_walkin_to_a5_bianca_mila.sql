-- Merge walk-in order from walkin-ed42c28a-fa64-4a6a-bfba-b781303168bd to A5_Bianca / Mila
-- Following same process as Nathan merge

BEGIN;

-- Step 1: Create backup of impacted orders
CREATE TABLE tmp_orders_backup_mila AS
SELECT * FROM orders
WHERE stay_id IN ('walkin-ed42c28a-fa64-4a6a-bfba-b781303168bd', 'A5_Bianca');

-- Verify backup created successfully
SELECT COUNT(*) as backup_row_count FROM tmp_orders_backup_mila;

-- Step 2: Check orders that will be moved
SELECT id, stay_id, guest_first_name, total_amount, created_at
FROM orders
WHERE stay_id = 'walkin-ed42c28a-fa64-4a6a-bfba-b781303168bd';

-- Step 3: Check current orders on target stay
SELECT id, stay_id, guest_first_name, total_amount, created_at
FROM orders
WHERE stay_id = 'A5_Bianca';

-- Step 4: Update the order(s) to move to A5_Bianca with guest_first_name = 'Mila'
UPDATE orders
SET stay_id = 'A5_Bianca',
    guest_first_name = 'Mila'
WHERE stay_id = 'walkin-ed42c28a-fa64-4a6a-bfba-b781303168bd';

-- Step 5: Verify the changes
-- Expect zero rows
SELECT * FROM orders WHERE stay_id = 'walkin-ed42c28a-fa64-4a6a-bfba-b781303168bd';

-- Expect orders on A5_Bianca stay including the new Mila order
SELECT count(*) as total_bianca_orders
FROM orders
WHERE stay_id = 'A5_Bianca';

-- Confirm guest_first_names on A5_Bianca stay
SELECT guest_first_name, count(*) as order_count
FROM orders
WHERE stay_id = 'A5_Bianca'
GROUP BY guest_first_name;

-- Step 6: Check if walk-in stay has guest_users record to clean up
SELECT * FROM guest_users WHERE stay_id = 'walkin-ed42c28a-fa64-4a6a-bfba-b781303168bd';

-- If needed, update guest_users record to point to A5_Bianca
-- UPDATE guest_users
-- SET stay_id = 'A5_Bianca',
--     first_name = 'Mila'
-- WHERE stay_id = 'walkin-ed42c28a-fa64-4a6a-bfba-b781303168bd';

-- If everything looks correct, commit; otherwise rollback
-- COMMIT; -- Uncomment to commit
-- ROLLBACK; -- Uncomment to rollback
