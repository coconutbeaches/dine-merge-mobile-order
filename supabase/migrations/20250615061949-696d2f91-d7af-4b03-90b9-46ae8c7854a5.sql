
-- List all policies for 'profiles' and 'orders', showing how row access is limited
SELECT policyname, tablename, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' OR tablename = 'orders';

-- Show any policy clauses mentioning 'users'
SELECT policyname, tablename, qual, with_check
FROM pg_policies
WHERE qual ILIKE '%users%' OR with_check ILIKE '%users%';
