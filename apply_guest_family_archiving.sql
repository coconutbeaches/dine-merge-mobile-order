-- ===== GUEST FAMILY ARCHIVING MIGRATION =====
-- This script sets up the guest family archiving functionality
-- Run this in your Supabase SQL editor

-- Create guest family archives table
CREATE TABLE IF NOT EXISTS public.guest_family_archives (
  stay_id text PRIMARY KEY,
  archived_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.guest_family_archives ENABLE ROW LEVEL SECURITY;

-- Create placeholder RLS policy
CREATE POLICY "guest_family_archives_policy" ON public.guest_family_archives
  FOR ALL USING (true);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, DELETE ON public.guest_family_archives TO authenticated;

-- Drop existing customer functions to recreate them with archiving support
DROP FUNCTION IF EXISTS public.get_customers_with_total_spent();
DROP FUNCTION IF EXISTS public.get_grouped_customers_with_total_spent();

-- Create enhanced grouped customers function with archiving support
CREATE FUNCTION public.get_grouped_customers_with_total_spent(
  include_archived BOOLEAN DEFAULT FALSE
)
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
    p.archived
  FROM 
    public.profiles p
    LEFT JOIN public.orders o ON p.id = o.user_id
  WHERE
    (NOT include_archived AND (p.archived = FALSE OR p.archived IS NULL)) OR include_archived
  GROUP BY 
    p.id, p.name, p.created_at, p.archived
    
  UNION ALL
  
  -- Get guest families grouped by stay_id with archive status
  SELECT 
    o.stay_id as customer_id,
    o.stay_id as name,  -- Use stay_id as the family name (e.g., "A5-CROWLEY")
    'guest_family' as customer_type,
    COALESCE(SUM(o.total_amount), 0)::numeric(10,2) as total_spent,
    MAX(o.created_at)::timestamptz as last_order_date,
    MIN(o.created_at)::timestamptz as joined_at,  -- First order date as "joined"
    CASE WHEN gfa.stay_id IS NOT NULL THEN true ELSE false END as archived
  FROM 
    public.orders o
    LEFT JOIN public.guest_family_archives gfa ON o.stay_id = gfa.stay_id
  WHERE 
    o.guest_user_id IS NOT NULL 
    AND o.stay_id IS NOT NULL
    AND (
      (NOT include_archived AND gfa.stay_id IS NULL) OR 
      include_archived
    )
  GROUP BY 
    o.stay_id, gfa.stay_id
    
  ORDER BY name;
$$;

-- Create backward-compatible function alias
CREATE FUNCTION public.get_customers_with_total_spent(
  include_archived BOOLEAN DEFAULT FALSE
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
  SELECT * FROM public.get_grouped_customers_with_total_spent(include_archived);
$$;

-- Grant execute permissions on both functions
GRANT EXECUTE ON FUNCTION public.get_grouped_customers_with_total_spent(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customers_with_total_spent(BOOLEAN) TO authenticated;

-- Create helper functions for archiving operations
CREATE FUNCTION public.archive_guest_family(family_stay_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.guest_family_archives (stay_id)
  VALUES (family_stay_id)
  ON CONFLICT (stay_id) DO NOTHING
  RETURNING true;
$$;

CREATE FUNCTION public.unarchive_guest_family(family_stay_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.guest_family_archives 
  WHERE stay_id = family_stay_id
  RETURNING true;
$$;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.archive_guest_family(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unarchive_guest_family(text) TO authenticated;

-- Add helpful comment
COMMENT ON TABLE public.guest_family_archives IS 'Tracks archived guest families by stay_id. Deleting a row unarchives the family.';

-- Test the new functions
SELECT 'Migration completed successfully. Testing functions...' as status;

-- Show current guest families (should include archived status)
SELECT 
  customer_id,
  name,
  customer_type,
  total_spent,
  archived
FROM public.get_grouped_customers_with_total_spent(true)
WHERE customer_type = 'guest_family'
ORDER BY name;
