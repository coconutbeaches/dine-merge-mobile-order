-- Classify analytics orders by the order's stay_id instead of by user_id.
-- Hotel guests should have a non-walkin stay_id; everything else is outside.

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
  WITH classified_orders AS (
    SELECT
      DATE(o.created_at) AS order_date,
      o.total_amount,
      CASE
        WHEN o.stay_id IS NOT NULL AND NOT LOWER(BTRIM(o.stay_id)) LIKE 'walkin%'
          THEN 'hotel_guest'
        ELSE 'outside'
      END AS customer_channel
    FROM public.orders o
    WHERE
      o.created_at >= p_start_date
      AND o.created_at <= p_end_date
      AND o.order_status::text != 'cancelled'
  )
  SELECT
    order_date,
    COUNT(*) FILTER (WHERE customer_channel = 'hotel_guest')::INTEGER AS hotel_guest_orders,
    COALESCE(SUM(total_amount) FILTER (WHERE customer_channel = 'hotel_guest'), 0)::NUMERIC AS hotel_guest_revenue,
    COUNT(*) FILTER (WHERE customer_channel = 'outside')::INTEGER AS outside_guest_orders,
    COALESCE(SUM(total_amount) FILTER (WHERE customer_channel = 'outside'), 0)::NUMERIC AS outside_guest_revenue
  FROM classified_orders
  GROUP BY order_date
  ORDER BY order_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_orders_analytics_by_date_range(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION public.get_orders_analytics_by_date_range(TIMESTAMPTZ, TIMESTAMPTZ)
IS 'Aggregates orders by date using stay_id-based hotel-vs-outside classification so anonymous outside orders with user_id are not counted as hotel guests.';
