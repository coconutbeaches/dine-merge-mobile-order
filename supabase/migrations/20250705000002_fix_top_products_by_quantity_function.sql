-- Fix the top_products_by_quantity function to work with the correct order_items structure
CREATE OR REPLACE FUNCTION public.top_products_by_quantity(
  start_date DATE,
  end_date   DATE
)
RETURNS TABLE(
  product_id           TEXT,
  product_name         TEXT,
  hotel_guest_quantity INTEGER,
  non_guest_quantity   INTEGER,
  total_quantity       INTEGER
)
LANGUAGE sql
AS $$
  WITH items AS (
    SELECT
      (item->'menuItem'->>'id') AS product_id,
      (item->'menuItem'->>'name') AS product_name,
      COALESCE((item->>'quantity')::INT, 1) AS qty,
      COALESCE(p.customer_type, 'unknown') AS customer_type
    FROM public.orders o
    LEFT JOIN public.profiles p ON o.user_id = p.id,
         LATERAL jsonb_array_elements(o.order_items) AS item
    WHERE o.created_at >= start_date
      AND o.created_at <= end_date
      AND (item->'menuItem'->>'id') IS NOT NULL
  )
  SELECT
    product_id,
    product_name,
    SUM(CASE WHEN customer_type = 'hotel_guest' THEN qty ELSE 0 END)::INTEGER AS hotel_guest_quantity,
    SUM(CASE WHEN customer_type != 'hotel_guest' THEN qty ELSE 0 END)::INTEGER AS non_guest_quantity,
    SUM(qty)::INTEGER AS total_quantity
  FROM items
  WHERE product_id IS NOT NULL AND product_name IS NOT NULL
  GROUP BY product_id, product_name
  ORDER BY total_quantity DESC;
$$;

ALTER FUNCTION public.top_products_by_quantity(DATE, DATE) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.top_products_by_quantity(DATE, DATE) TO authenticated;
