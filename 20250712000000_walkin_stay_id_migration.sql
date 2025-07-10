-- 20250712000000_walkin_stay_id_migration.sql
-- 1. Update existing guest_users with plain 'walkin'
UPDATE guest_users
SET stay_id = 'walkin-' || user_id
WHERE stay_id = 'walkin';

-- 2. (Optional safety) Update any orders that still reference stay_id = 'walkin'
UPDATE orders
SET stay_id = 'walkin-' || guest_user_id
WHERE stay_id = 'walkin';
