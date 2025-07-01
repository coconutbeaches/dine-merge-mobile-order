-- Fix last_order_date to preserve full timestamp with timezone
-- The issue was that dates were being truncated to midnight

DROP FUNCTION IF EXISTS public.get_customers_with_total_spent();

CREATE FUNCTION public.get_customers_with_total_spent()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  role text,
  customer_type text,
  created_at timestamptz,
  updated_at timestamptz,
  total_spent numeric,
  avatar_path text,
  last_order_date timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.name,
    p.email,
    p.phone,
    p.role,
    p.customer_type,
    p.created_at,
    p.updated_at,
    COALESCE(SUM(o.total_amount), 0)::numeric(10,2) as total_spent,
    p.avatar_path,
    -- Ensure we preserve the full timestamp with timezone
    MAX(o.created_at) as last_order_date
  FROM
    public.profiles p
    LEFT JOIN public.orders o ON p.id = o.user_id 
      AND o.order_status != 'cancelled' -- Exclude cancelled orders
  GROUP BY
    p.id, p.name, p.email, p.phone, p.role, p.customer_type, 
    p.created_at, p.updated_at, p.avatar_path
  ORDER BY
    p.name;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_customers_with_total_spent() TO authenticated;
