-- Fix analytics function with correct classification logic:
-- Hotel Guest: any orders with user_id OR stay_id (family stay ID)
-- Walkin: everything else

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
    -- Hotel guests: any orders with user_id (authenticated) OR stay_id (family stay ID)
    COUNT(CASE 
      WHEN o.user_id IS NOT NULL OR o.stay_id IS NOT NULL
      THEN 1 
      ELSE NULL 
    END)::INTEGER AS hotel_guest_orders,
    SUM(CASE 
      WHEN o.user_id IS NOT NULL OR o.stay_id IS NOT NULL
      THEN o.total_amount 
      ELSE 0 
    END)::NUMERIC AS hotel_guest_revenue,
    -- Walkin guests: everything else (no user_id AND no stay_id)
    COUNT(CASE 
      WHEN o.user_id IS NULL AND o.stay_id IS NULL
      THEN 1 
      ELSE NULL 
    END)::INTEGER AS outside_guest_orders,
    SUM(CASE 
      WHEN o.user_id IS NULL AND o.stay_id IS NULL
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

-- Test the function to verify it works
SELECT * FROM public.get_orders_analytics_by_date_range(
  '2025-08-14T00:00:00Z'::TIMESTAMPTZ,
  '2025-08-14T23:59:59Z'::TIMESTAMPTZ
);
