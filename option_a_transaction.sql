-- Option A: Transaction-based approach
-- This wraps all DML statements in a single transaction
-- You can rollback if something looks wrong

BEGIN;

-- Your DML statements will go here
-- For example:
-- UPDATE orders SET status = 'cancelled' 
-- WHERE stay_id IN ('walkin-9959fb24-d610-47e9-adca-fbacee6a4790', '<DOUBLE_NATHAN_STAY_ID>');

-- After reviewing the changes, either:
-- COMMIT;   -- to make changes permanent
-- or
-- ROLLBACK; -- to undo all changes in this transaction
