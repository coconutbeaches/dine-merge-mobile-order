-- Update orders_by_day_and_guest_type function to include order counts
DROP FUNCTION IF EXISTS public.orders_by_day_and_guest_type();

CREATE FUNCTION public.orders_by_day_and_guest_type(
  start_date date,
  end_date date
)
RETURNS TABLE(
  order_date date,
  guest_amount numeric,
  non_guest_amount numeric,
  guest_count integer,
  non_guest_count integer
)
LANGUAGE sql
AS $$
  SELECT
    date(o.created_at) AS order_date,
    SUM(CASE WHEN p.customer_type = 'hotel_guest' THEN o.total_amount ELSE 0 END) AS guest_amount,
    SUM(CASE WHEN p.customer_type = 'hotel_guest' THEN 0 ELSE o.total_amount END) AS non_guest_amount,
    COUNT(CASE WHEN p.customer_type = 'hotel_guest' THEN o.id END) AS guest_count,
    COUNT(CASE WHEN p.customer_type = 'hotel_guest' THEN NULL ELSE o.id END) AS non_guest_count
  FROM public.orders o
  LEFT JOIN public.profiles p ON o.user_id = p.id
  WHERE o.order_status IN ('paid', 'completed')
    AND date(o.created_at) BETWEEN start_date AND end_date
  GROUP BY order_date
  ORDER BY order_date DESC
$$;

-- Grant permission for authenticated users
GRANT EXECUTE ON FUNCTION public.orders_by_day_and_guest_type(date, date) TO authenticated;
