
-- Creates a function to get all customers along with their total spending.
-- It joins profiles with an aggregate of orders to calculate the total spent.
CREATE OR REPLACE FUNCTION public.get_customers_with_total_spent()
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  name text,
  phone text,
  role text,
  email text,
  total_spent numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.created_at,
    p.updated_at,
    p.name,
    p.phone,
    p.role,
    p.email,
    COALESCE(SUM(o.total_amount), 0) as total_spent
  FROM
    public.profiles p
  LEFT JOIN
    public.orders o ON p.id = o.user_id
  GROUP BY
    p.id
  ORDER BY
    p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permission for authenticated users to call this new function.
GRANT EXECUTE ON FUNCTION public.get_customers_with_total_spent() TO authenticated;
