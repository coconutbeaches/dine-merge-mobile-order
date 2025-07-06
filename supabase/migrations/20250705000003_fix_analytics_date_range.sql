-- Fix the date range issue in orders_by_day_and_guest_type function
-- The problem was that end_date was not inclusive of the full day
CREATE OR REPLACE FUNCTION public.orders_by_day_and_guest_type(start_date DATE, end_date DATE)
RETURNS TABLE(
  order_date date,
  hotel_guest_orders integer,
  hotel_guest_revenue numeric,
  outside_guest_orders integer,
  outside_guest_revenue numeric
)
LANGUAGE sql
AS $$
  SELECT
    date(o.created_at) AS order_date,
    COUNT(CASE WHEN p.customer_type = 'hotel_guest' THEN 1 ELSE NULL END)::integer AS hotel_guest_orders,
    SUM(CASE WHEN p.customer_type = 'hotel_guest' THEN o.total_amount ELSE 0 END) AS hotel_guest_revenue,
    COUNT(CASE WHEN p.customer_type IS NULL OR p.customer_type != 'hotel_guest' THEN 1 ELSE NULL END)::integer AS outside_guest_orders,
    SUM(CASE WHEN p.customer_type IS NULL OR p.customer_type != 'hotel_guest' THEN o.total_amount ELSE 0 END) AS outside_guest_revenue
  FROM public.orders o
  LEFT JOIN public.profiles p ON o.user_id = p.id
  WHERE o.created_at >= start_date
    AND o.created_at < (end_date + INTERVAL '1 day')
  GROUP BY order_date
  ORDER BY order_date DESC
$$;

-- Ensure the function owner is postgres and grant execute to authenticated users
ALTER FUNCTION public.orders_by_day_and_guest_type(DATE, DATE) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.orders_by_day_and_guest_type(DATE, DATE) TO authenticated;
