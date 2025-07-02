-- Include customer_type in get_customers_with_total_spent function
-- Add pagination and avatar_url
CREATE OR REPLACE FUNCTION public.get_customers_with_total_spent(page_size_param integer DEFAULT 20, offset_param integer DEFAULT 0)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  name text,
  phone text,
  role text,
  email text,
  customer_type text,
  avatar_url text, -- Added avatar_url
  total_spent numeric,
  total_count bigint -- Added total_count for pagination metadata
) AS $$
BEGIN
  RETURN QUERY
  WITH customers_cte AS (
    SELECT
      p.id,
      p.created_at,
      p.updated_at,
      p.name,
      p.phone,
      p.role,
      p.email,
      p.customer_type,
      p.avatar_url, -- Select avatar_url from profiles
      COALESCE(SUM(o.total_amount), 0) as total_spent
    FROM
      public.profiles p
    LEFT JOIN
      public.orders o ON p.id = o.user_id
    GROUP BY
      p.id, p.avatar_url -- Ensure avatar_url is in GROUP BY
    ORDER BY
      p.created_at DESC
  )
  SELECT
    cte.*,
    (SELECT COUNT(*) FROM customers_cte) AS total_count
  FROM
    customers_cte cte
  LIMIT page_size_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_customers_with_total_spent(integer, integer) TO authenticated;
