-- Update the get_customers_with_total_spent function to properly handle guest families
-- Drop the existing function first since we're changing the return type significantly
DROP FUNCTION IF EXISTS public.get_customers_with_total_spent();

-- Create new function that returns grouped customers (both auth users and guest families)
CREATE FUNCTION public.get_grouped_customers_with_total_spent()
RETURNS TABLE (
  customer_id text,  -- UUID for auth users, stay_id for guest families
  name text,
  customer_type text, -- 'auth_user' or 'guest_family'
  total_spent numeric,
  last_order_date timestamptz,
  joined_at timestamptz,
  archived boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Get authenticated users from profiles
  SELECT 
    p.id::text as customer_id,
    p.name,
    'auth_user' as customer_type,
    COALESCE(SUM(o.total_amount), 0)::numeric(10,2) as total_spent,
    MAX(o.created_at)::timestamptz as last_order_date,
    p.created_at as joined_at,
    COALESCE(p.archived, false) as archived
  FROM 
    public.profiles p
    LEFT JOIN public.orders o ON p.id = o.user_id
  GROUP BY 
    p.id, p.name, p.created_at, p.archived
    
  UNION ALL
  
  -- Get guest families grouped by stay_id
  SELECT 
    o.stay_id as customer_id,
    o.stay_id as name,  -- Use stay_id as the family name (e.g., "A5-CROWLEY")
    'guest_family' as customer_type,
    COALESCE(SUM(o.total_amount), 0)::numeric(10,2) as total_spent,
    MAX(o.created_at)::timestamptz as last_order_date,
    MIN(o.created_at)::timestamptz as joined_at,  -- First order date as "joined"
    false as archived  -- Guest families are never archived
  FROM 
    public.orders o
  WHERE 
    o.guest_user_id IS NOT NULL 
    AND o.stay_id IS NOT NULL
  GROUP BY 
    o.stay_id
    
  ORDER BY name;
$$;

-- Grant permission for authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.get_grouped_customers_with_total_spent() TO authenticated;

-- For backward compatibility, create an alias to the old function name
CREATE FUNCTION public.get_customers_with_total_spent()
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
  SELECT * FROM public.get_grouped_customers_with_total_spent();
$$;

-- Grant permission for the alias function too
GRANT EXECUTE ON FUNCTION public.get_customers_with_total_spent() TO authenticated;
