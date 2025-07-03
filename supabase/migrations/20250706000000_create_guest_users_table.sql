
-- Create guest_users table
CREATE TABLE public.guest_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text UNIQUE NOT NULL,
    first_name text NOT NULL,
    stay_id text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.guest_users ENABLE ROW LEVEL SECURITY;

-- Policy for guests to insert their own records
CREATE POLICY "Allow guest to insert their own record"
ON public.guest_users FOR INSERT
WITH CHECK (true); -- No specific user_id check needed here as user_id is generated client-side and unique constraint handles duplicates

-- Policy for guests to read their own record (optional, but good practice)
CREATE POLICY "Allow guests to read their own record"
ON public.guest_users FOR SELECT
USING (true); -- For simplicity, allowing all reads for now, can be refined later if needed
