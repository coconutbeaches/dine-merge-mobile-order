-- Debug script to check why get_all_customers_with_total_spent_grouped returns no rows
-- Run these queries one by one in Supabase SQL Editor to diagnose the issue

-- 1. Check if there are any profiles (authenticated users)
SELECT 'Profiles check' as debug_step;
SELECT 
  id, 
  name, 
  email, 
  created_at, 
  COALESCE(archived, false) as archived
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check if there are any orders with user_id
SELECT 'Orders with user_id check' as debug_step;
SELECT 
  id, 
  user_id, 
  total_amount, 
  created_at
FROM public.orders 
WHERE user_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Check if there are any guest orders
SELECT 'Guest orders check' as debug_step;
SELECT 
  id, 
  guest_user_id, 
  stay_id, 
  total_amount, 
  created_at
FROM public.orders 
WHERE guest_user_id IS NOT NULL AND stay_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check if guest_family_archives table exists and has data
SELECT 'Guest family archives check' as debug_step;
SELECT COUNT(*) as archive_count FROM public.guest_family_archives;

-- 5. Test the auth_user part of the function directly
SELECT 'Testing auth_user part' as debug_step;
SELECT 
  p.id::text as customer_id,
  COALESCE(p.name, p.email) as name,
  'auth_user' as customer_type,
  COALESCE(order_totals.total_spent, 0)::numeric(10,2) as total_spent,
  order_totals.last_order_date,
  p.created_at as joined_at,
  COALESCE(p.archived, false) as archived
FROM 
  public.profiles p
  LEFT JOIN (
    SELECT 
      o.user_id,
      SUM(o.total_amount) as total_spent,
      MAX(o.created_at) as last_order_date
    FROM public.orders o
    WHERE o.user_id IS NOT NULL
    GROUP BY o.user_id
  ) order_totals ON p.id = order_totals.user_id
WHERE 
  COALESCE(p.archived, false) = false
LIMIT 3;

-- 6. Test the guest_family part of the function directly
SELECT 'Testing guest_family part' as debug_step;
SELECT 
  guest_totals.stay_id as customer_id,
  guest_totals.stay_id as name,
  'guest_family' as customer_type,
  guest_totals.total_spent::numeric(10,2) as total_spent,
  guest_totals.last_order_date,
  guest_totals.joined_at,
  COALESCE(gfa.stay_id IS NOT NULL, false) AS archived
FROM (
  SELECT 
    o.stay_id,
    SUM(o.total_amount) as total_spent,
    MAX(o.created_at) as last_order_date,
    MIN(o.created_at) as joined_at
  FROM public.orders o
  WHERE 
    o.guest_user_id IS NOT NULL 
    AND o.stay_id IS NOT NULL
  GROUP BY o.stay_id
) guest_totals
LEFT JOIN public.guest_family_archives gfa ON gfa.stay_id = guest_totals.stay_id
WHERE gfa.stay_id IS NULL
LIMIT 3;

-- 7. Test the complete function with debug parameters
SELECT 'Testing complete function' as debug_step;
SELECT * FROM public.get_all_customers_with_total_spent_grouped(
  true, -- include_archived = true to get all customers
  10,   -- limit
  0     -- offset
);
