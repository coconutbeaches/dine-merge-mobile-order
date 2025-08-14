-- Fix function signature conflict for get_all_customers_with_total_spent_grouped
-- Drop all existing versions to avoid conflicts

DROP FUNCTION IF EXISTS public.get_all_customers_with_total_spent_grouped(INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS public.get_all_customers_with_total_spent_grouped(BOOLEAN, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_all_customers_with_total_spent_grouped(BOOLEAN, INTEGER, INTEGER, BOOLEAN);

-- Create the definitive version with consistent parameter order
-- This matches the signature expected by the frontend code
CREATE OR REPLACE FUNCTION public.get_all_customers_with_total_spent_grouped(
  p_include_archived BOOLEAN DEFAULT false,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
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
  SELECT * FROM (
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
      COALESCE(gfa.stay_id IS NOT NULL, false) AS archived
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
    LEFT JOIN public.guest_family_archives gfa ON gfa.stay_id = guest_totals.stay_id
    WHERE (p_include_archived OR gfa.stay_id IS NULL)
  ) combined_customers
  ORDER BY last_order_date DESC NULLS LAST, name
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_all_customers_with_total_spent_grouped(BOOLEAN, INTEGER, INTEGER) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.get_all_customers_with_total_spent_grouped(BOOLEAN, INTEGER, INTEGER) IS 'Returns all customers (auth users and guest families) with total spending. Fixed version to resolve function signature conflicts.';
