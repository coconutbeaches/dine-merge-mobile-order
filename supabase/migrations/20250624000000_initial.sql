-- Create orders table if it doesn't exist (needed for the function)
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY,
  user_id uuid,
  total_amount numeric(10,2),
  created_at timestamptz DEFAULT now()
);
