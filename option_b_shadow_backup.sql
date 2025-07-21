-- Option B: Shadow table backup approach
-- This copies impacted rows to a backup table before making changes

CREATE TABLE tmp_orders_backup AS
SELECT * FROM orders
WHERE stay_id IN ('walkin-9959fb24-d610-47e9-adca-fbacee6a4790',
                  '<DOUBLE_NATHAN_STAY_ID>');

-- Verify the backup was created successfully
SELECT COUNT(*) as backup_row_count FROM tmp_orders_backup;

-- Now you can proceed with your DML operations knowing you have a backup
-- If you need to restore, you can use:
-- INSERT INTO orders SELECT * FROM tmp_orders_backup 
-- WHERE stay_id NOT IN (SELECT stay_id FROM orders);
-- or other restoration logic as needed

-- Clean up the backup table when you're confident the changes are correct:
-- DROP TABLE tmp_orders_backup;
