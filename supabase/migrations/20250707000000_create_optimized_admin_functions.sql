-- Create optimized function for customers with pagination and indexing
CREATE OR REPLACE FUNCTION public.get_all_customers_with_total_spent_grouped(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_include_archived BOOLEAN DEFAULT false
)
RETURNS TABLE (
  customer_id text,
  name text,
  customer_type text,
  total_spent numeric,
  last_order_date timestamptz,
  joined_at timestamptz,
  archived boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Get authenticated users from profiles with optimized query
  SELECT 
    p.id::text as customer_id,
    COALESCE(p.name, p.email) as name,
    'auth_user' as customer_type,
    COALESCE(order_totals.total_spent, 0)::numeric(10,2) as total_spent,
    order_totals.last_order_date,
    p.created_at as joined_at,
    COALESCE(p.archived, false) as archived
  FROM 
    public.profiles p
    LEFT JOIN (
      SELECT 
        o.user_id,
        SUM(o.total_amount) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM public.orders o
      WHERE o.user_id IS NOT NULL
      GROUP BY o.user_id
    ) order_totals ON p.id = order_totals.user_id
  WHERE 
    CASE 
      WHEN p_include_archived THEN true 
      ELSE COALESCE(p.archived, false) = false 
    END
    
  UNION ALL
  
  -- Get guest families grouped by stay_id with optimized query
  SELECT 
    guest_totals.stay_id as customer_id,
    guest_totals.stay_id as name,
    'guest_family' as customer_type,
    guest_totals.total_spent::numeric(10,2) as total_spent,
    guest_totals.last_order_date,
    guest_totals.joined_at,
    false as archived
  FROM (
    SELECT 
      o.stay_id,
      SUM(o.total_amount) as total_spent,
      MAX(o.created_at) as last_order_date,
      MIN(o.created_at) as joined_at
    FROM public.orders o
    WHERE 
      o.guest_user_id IS NOT NULL 
      AND o.stay_id IS NOT NULL
    GROUP BY o.stay_id
  ) guest_totals
    
  ORDER BY last_order_date DESC NULLS LAST, name
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Create optimized function for orders with joins
CREATE OR REPLACE FUNCTION public.get_orders_with_customer_info(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_status_filter text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  guest_user_id uuid,
  guest_first_name text,
  stay_id text,
  total_amount numeric,
  created_at timestamptz,
  customer_name text,
  customer_email text,
  customer_type text
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
    o.total_amount,
    o.created_at,
    CASE 
      WHEN o.user_id IS NOT NULL THEN COALESCE(p.name, p.email)
      WHEN o.guest_user_id IS NOT NULL THEN o.guest_first_name
      ELSE 'Unknown'
    END as customer_name,
    CASE 
      WHEN o.user_id IS NOT NULL THEN p.email
      ELSE NULL
    END as customer_email,
    CASE 
      WHEN o.user_id IS NOT NULL THEN COALESCE(p.customer_type, 'registered')
      WHEN o.guest_user_id IS NOT NULL THEN 'guest'
      ELSE 'unknown'
    END as customer_type
  FROM 
    public.orders o
    LEFT JOIN public.profiles p ON o.user_id = p.id
  WHERE 
    (p_start_date IS NULL OR o.created_at >= p_start_date)
    AND (p_end_date IS NULL OR o.created_at <= p_end_date)
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_customers_with_total_spent_grouped(INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_orders_with_customer_info(INTEGER, INTEGER, text, timestamptz, timestamptz) TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_guest_stay_created_at ON public.orders(guest_user_id, stay_id, created_at DESC) WHERE guest_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_archived ON public.profiles(archived, created_at DESC);
