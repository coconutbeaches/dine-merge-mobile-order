-- Fix analytics function to match the orders page DailySalesSummary logic EXACTLY
-- This includes the same if/else if/else fallback logic

CREATE OR REPLACE FUNCTION public.get_orders_analytics_by_date_range(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  order_date DATE,
  hotel_guest_orders INTEGER,
  hotel_guest_revenue NUMERIC,
  outside_guest_orders INTEGER,
  outside_guest_revenue NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    DATE(o.created_at) AS order_date,
    -- Hotel guests: using the EXACT same logic as DailySalesSummary.tsx lines 77-84
    COUNT(CASE 
      WHEN (o.user_id IS NOT NULL) 
      THEN 1
      WHEN (o.stay_id IS NOT NULL AND NOT LOWER(o.stay_id) LIKE 'walkin%')
      THEN 1
      ELSE NULL 
    END)::INTEGER AS hotel_guest_orders,
    SUM(CASE 
      WHEN (o.user_id IS NOT NULL) 
      THEN o.total_amount
      WHEN (o.stay_id IS NOT NULL AND NOT LOWER(o.stay_id) LIKE 'walkin%')
      THEN o.total_amount
      ELSE 0 
    END)::NUMERIC AS hotel_guest_revenue,
    -- Walkin guests: using the EXACT same logic as DailySalesSummary.tsx lines 86-88 + fallback logic lines 99-104
    COUNT(CASE 
      -- Skip if already classified as hotel guest
      WHEN (o.user_id IS NOT NULL) THEN NULL
      WHEN (o.stay_id IS NOT NULL AND NOT LOWER(o.stay_id) LIKE 'walkin%') THEN NULL
      -- Rule 3: Check if it's a walk-in (line 86-88)
      WHEN (LOWER(o.stay_id) LIKE 'walkin%') 
        OR (o.table_number = 'Take Away') 
        OR (o.table_number IS NOT NULL AND o.table_number ~ '^[0-9]+$')
      THEN 1
      -- Fallback: uncategorized orders go to walkin (lines 99-104)
      ELSE 1
    END)::INTEGER AS outside_guest_orders,
    SUM(CASE 
      -- Skip if already classified as hotel guest
      WHEN (o.user_id IS NOT NULL) THEN 0
      WHEN (o.stay_id IS NOT NULL AND NOT LOWER(o.stay_id) LIKE 'walkin%') THEN 0
      -- Rule 3: Check if it's a walk-in (line 86-88)
      WHEN (LOWER(o.stay_id) LIKE 'walkin%') 
        OR (o.table_number = 'Take Away') 
        OR (o.table_number IS NOT NULL AND o.table_number ~ '^[0-9]+$')
      THEN o.total_amount
      -- Fallback: uncategorized orders go to walkin (lines 99-104)
      ELSE o.total_amount
    END)::NUMERIC AS outside_guest_revenue
  FROM public.orders o
  WHERE 
    o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    AND o.order_status::text != 'cancelled'
  GROUP BY DATE(o.created_at)
  ORDER BY order_date ASC;
$$;

-- Test it immediately for Aug 14
SELECT 
  *,
  (hotel_guest_revenue + outside_guest_revenue) as total_revenue
FROM public.get_orders_analytics_by_date_range(
  '2025-08-14T00:00:00Z'::TIMESTAMPTZ,
  '2025-08-14T23:59:59Z'::TIMESTAMPTZ
);
