-- Step 6: Retire or flag the walk-in stay record
-- Mark the walk-in stay as merged to prevent future selection

UPDATE stays
SET status = 'merged',
    merged_into_stay_id = '<DOUBLE_NATHAN_STAY_ID>'
WHERE stay_id = 'walkin-9959fb24-d610-47e9-adca-fbacee6a4790';

-- Verify the update was successful
SELECT stay_id, status, merged_into_stay_id 
FROM stays 
WHERE stay_id = 'walkin-9959fb24-d610-47e9-adca-fbacee6a4790';
