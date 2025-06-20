-- Add orders_by_day_and_guest_type function
CREATE OR REPLACE FUNCTION public.orders_by_day_and_guest_type(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  order_date DATE,
  guest_amount NUMERIC,
  non_guest_amount NUMERIC,
  guest_count INTEGER,
  non_guest_count INTEGER
)
LANGUAGE sql
AS $$
  SELECT
    DATE_TRUNC('day', o.created_at) AS order_date,
    SUM(CASE WHEN p.customer_type = 'hotel_guest' THEN o.total ELSE 0 END) AS guest_amount,
    SUM(CASE WHEN p.customer_type IS NULL THEN o.total ELSE 0 END) AS non_guest_amount,
    COUNT(CASE WHEN p.customer_type = 'hotel_guest' THEN 1 ELSE NULL END) AS guest_count,
    COUNT(CASE WHEN p.customer_type IS NULL THEN 1 ELSE NULL END) AS non_guest_count
  FROM orders o
  LEFT JOIN profiles p ON o.customer_id = p.id
  WHERE o.created_at BETWEEN start_date AND end_date
  GROUP BY DATE_TRUNC('day', o.created_at)
  ORDER BY order_date ASC
$$;

-- Grant permission for authenticated users to call this new function.
GRANT EXECUTE ON FUNCTION public.orders_by_day_and_guest_type() TO authenticated;

