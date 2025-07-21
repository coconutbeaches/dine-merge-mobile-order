-- Step 4: Move the orders to Double_Nathan and normalize first name
UPDATE orders
SET stay_id = 'Double_Nathan',
    guest_first_name = 'Nathan'
WHERE stay_id = 'walkin-9959fb24-d610-47e9-adca-fbacee6a4790';
