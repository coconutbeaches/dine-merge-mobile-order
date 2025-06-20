-- Add orders_by_day_and_guest_type function
CREATE OR REPLACE FUNCTION public.orders_by_day_and_guest_type()
RETURNS TABLE(
  order_date date,
  guest_type text,
  total_amount numeric
)
LANGUAGE sql
AS $$
  SELECT
    date(o.created_at) AS order_date,
    CASE
      WHEN p.customer_type = 'hotel_guest' THEN 'hotel_guest'
      ELSE 'outside_guest'
    END AS guest_type,
    SUM(o.total_amount) AS total_amount
  FROM public.orders o
  LEFT JOIN public.profiles p ON o.user_id = p.id
  WHERE o.order_status IN ('paid', 'completed')
  GROUP BY order_date, guest_type
  ORDER BY order_date DESC
$$;

-- Grant permission for authenticated users to call this new function.
GRANT EXECUTE ON FUNCTION public.orders_by_day_and_guest_type() TO authenticated;

