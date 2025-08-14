-- Create optimized analytics function that aggregates data server-side
-- This replaces the client-side aggregation that was causing performance issues

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
    COUNT(CASE 
      WHEN (LOWER(o.stay_id) LIKE 'walkin%') 
        OR (o.table_number = 'Take Away') 
        OR (o.table_number IS NOT NULL AND o.table_number ~ '^[0-9]+$')
        OR (o.user_id IS NULL AND (o.stay_id IS NULL OR LOWER(o.stay_id) LIKE 'walkin%'))
      THEN 1 
      ELSE NULL 
    END)::INTEGER AS outside_guest_orders,
    SUM(CASE 
      WHEN (LOWER(o.stay_id) LIKE 'walkin%') 
        OR (o.table_number = 'Take Away') 
        OR (o.table_number IS NOT NULL AND o.table_number ~ '^[0-9]+$')
        OR (o.user_id IS NULL AND (o.stay_id IS NULL OR LOWER(o.stay_id) LIKE 'walkin%'))
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

-- Add indexes to optimize the new analytics query
-- Note: Can't use DATE() function in index, so create separate indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at_analytics 
ON public.orders (created_at) 
WHERE order_status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_orders_status_created 
ON public.orders (order_status, created_at) 
WHERE order_status != 'cancelled';

-- Comment for documentation
COMMENT ON FUNCTION public.get_orders_analytics_by_date_range(TIMESTAMPTZ, TIMESTAMPTZ) 
IS 'Optimized analytics function that aggregates order data server-side by date range, replacing client-side processing for better performance.';
