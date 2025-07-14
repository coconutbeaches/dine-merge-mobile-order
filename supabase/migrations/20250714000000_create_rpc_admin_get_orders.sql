-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_created_desc ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stay_id ON orders (stay_id);

-- Create optimized RPC function for admin orders dashboard
CREATE OR REPLACE FUNCTION public.rpc_admin_get_orders(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id integer,
  user_id uuid,
  guest_user_id text,
  guest_first_name text,
  stay_id text,
  table_number text,
  total_amount numeric,
  created_at timestamptz,
  updated_at timestamptz,
  order_status text,
  order_items jsonb,
  special_instructions text,
  customer_name text,
  customer_email text,
  customer_type text,
  formatted_stay_id text,
  customer_name_from_profile text,
  customer_email_from_profile text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    o.id,
    o.user_id,
    o.guest_user_id,
    o.guest_first_name,
    o.stay_id,
    o.table_number,
    o.total_amount,
    o.created_at,
    o.updated_at,
    COALESCE(o.order_status::text, 'new') as order_status,
    COALESCE(o.order_items, '[]'::jsonb) as order_items,
    o.special_instructions,
    -- Prioritize customer name from order record, then profile, then guest name
    COALESCE(o.customer_name, p.name, o.guest_first_name) as customer_name,
    p.email as customer_email,
    CASE 
      WHEN o.user_id IS NOT NULL THEN COALESCE(p.customer_type, 'registered')
      WHEN o.guest_user_id IS NOT NULL THEN 'guest'
      ELSE 'unknown'
    END as customer_type,
    -- Compute formatted_stay_id in SQL
    COALESCE(o.stay_id, '') || '-' || COALESCE(o.table_number, '') as formatted_stay_id,
    -- Add profile data for UI display
    p.name as customer_name_from_profile,
    p.email as customer_email_from_profile
  FROM 
    public.orders o
    LEFT JOIN public.profiles p ON o.user_id = p.id AND COALESCE(p.archived, false) = false AND COALESCE(p.deleted, false) = false
  WHERE 
    -- Search filter (server-side)
    (p_search IS NULL OR (
      LOWER(COALESCE(o.customer_name, p.name, o.guest_first_name, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(p.email, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(o.stay_id, '')) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(COALESCE(o.table_number, '')) LIKE '%' || LOWER(p_search) || '%'
      OR o.id::text LIKE '%' || p_search || '%'
      OR LOWER(COALESCE(o.stay_id, '') || '-' || COALESCE(o.table_number, '')) LIKE '%' || LOWER(p_search) || '%'
    ))
    -- Status filter
    AND (p_status IS NULL OR o.order_status::text = p_status)
    -- Date filters
    AND (p_start IS NULL OR o.created_at >= p_start)
    AND (p_end IS NULL OR o.created_at <= p_end)
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.rpc_admin_get_orders(INTEGER, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
