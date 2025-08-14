-- Fix analytics function to match the orders page classification logic
-- Remove the extra condition that was causing discrepancies

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
    -- Hotel guests: authenticated users OR stay_id that doesn't start with 'walkin'
    COUNT(CASE 
      WHEN (o.user_id IS NOT NULL) 
        OR (o.stay_id IS NOT NULL AND NOT LOWER(o.stay_id) LIKE 'walkin%') 
      THEN 1 
      ELSE NULL 
    END)::INTEGER AS hotel_guest_orders,
    SUM(CASE 
      WHEN (o.user_id IS NOT NULL) 
        OR (o.stay_id IS NOT NULL AND NOT LOWER(o.stay_id) LIKE 'walkin%') 
      THEN o.total_amount 
      ELSE 0 
    END)::NUMERIC AS hotel_guest_revenue,
    -- Outside/walkin guests: stay_id starts with 'walkin' OR table_number based orders
    -- Match the logic in DailySalesSummary.tsx exactly
    COUNT(CASE 
      WHEN (LOWER(o.stay_id) LIKE 'walkin%') 
        OR (o.table_number = 'Take Away') 
        OR (o.table_number IS NOT NULL AND o.table_number ~ '^[0-9]+$')
      THEN 1 
      ELSE NULL 
    END)::INTEGER AS outside_guest_orders,
    SUM(CASE 
      WHEN (LOWER(o.stay_id) LIKE 'walkin%') 
        OR (o.table_number = 'Take Away') 
        OR (o.table_number IS NOT NULL AND o.table_number ~ '^[0-9]+$')
      THEN o.total_amount 
      ELSE 0 
    END)::NUMERIC AS outside_guest_revenue
  FROM public.orders o
  WHERE 
    o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    AND o.order_status::text != 'cancelled' -- Exclude cancelled orders
  GROUP BY DATE(o.created_at)
  ORDER BY order_date ASC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_orders_analytics_by_date_range(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.get_orders_analytics_by_date_range(TIMESTAMPTZ, TIMESTAMPTZ) 
IS 'Fixed analytics function that matches the orders page classification logic for consistent walkin/hotel guest categorization.';
