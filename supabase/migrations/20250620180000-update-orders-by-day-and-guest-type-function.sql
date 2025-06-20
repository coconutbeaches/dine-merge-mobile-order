-- Add date range parameters to orders_by_day_and_guest_type function
CREATE OR REPLACE FUNCTION public.orders_by_day_and_guest_type(start_date DATE, end_date DATE)
RETURNS TABLE(
  order_date date,
  guest_amount numeric,
  non_guest_amount numeric
)
LANGUAGE sql
AS $$
  SELECT
    date(o.created_at) AS order_date,
    SUM(CASE WHEN p.customer_type = 'hotel_guest' THEN o.total_amount ELSE 0 END) AS guest_amount,
    SUM(CASE WHEN p.customer_type = 'hotel_guest' THEN 0 ELSE o.total_amount END) AS non_guest_amount
  FROM public.orders o
  LEFT JOIN public.profiles p ON o.user_id = p.id
  WHERE o.order_status IN ('paid', 'completed')
    AND o.created_at >= start_date
    AND o.created_at <= end_date
  GROUP BY order_date
  ORDER BY order_date DESC
$$;

-- Ensure the function owner is postgres and grant execute to authenticated users.
ALTER FUNCTION public.orders_by_day_and_guest_type(DATE, DATE) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.orders_by_day_and_guest_type(DATE, DATE) TO authenticated;
