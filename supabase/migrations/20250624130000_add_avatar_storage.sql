-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  name text,
  email text,
  phone text,
  role text,
  customer_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  avatar_url text,
  avatar_path text
);

-- Add comments
COMMENT ON TABLE public.profiles IS 'User profile information';
COMMENT ON COLUMN public.profiles.avatar_path IS 'Path to the user''s profile picture in storage';

-- Create profile pictures bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.get_customers_with_total_spent()
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
  avatar_path text
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
    p.avatar_path
  FROM 
    public.profiles p
    LEFT JOIN public.orders o ON p.id = o.user_id
  GROUP BY 
    p.id
  ORDER BY 
    p.name;
$$;
