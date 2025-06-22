-- Aggregate product quantities by guest type for analytics
CREATE OR REPLACE FUNCTION public.top_products_by_quantity(
  start_date DATE,
  end_date   DATE
)
RETURNS TABLE(
  product_name         TEXT,
  hotel_guest_quantity INTEGER,
  non_guest_quantity   INTEGER,
  total_quantity       INTEGER
)
LANGUAGE sql
AS $$
  WITH items AS (
    SELECT
      (item->>'name') AS product_name,
      COALESCE((item->>'quantity')::INT, 1) AS qty,
      o.customer_name IS NULL AS is_guest
    FROM public.orders o,
         LATERAL jsonb_array_elements(o.order_items) AS item
    WHERE o.created_at >= start_date
      AND o.created_at <= end_date
  )
  SELECT
    product_name,
    SUM(CASE WHEN is_guest THEN qty ELSE 0 END) AS hotel_guest_quantity,
    SUM(CASE WHEN is_guest THEN 0 ELSE qty END) AS non_guest_quantity,
    SUM(qty) AS total_quantity
  FROM items
  GROUP BY product_name
  ORDER BY total_quantity DESC;
$$;

ALTER FUNCTION public.top_products_by_quantity(DATE, DATE) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.top_products_by_quantity(DATE, DATE) TO authenticated;
