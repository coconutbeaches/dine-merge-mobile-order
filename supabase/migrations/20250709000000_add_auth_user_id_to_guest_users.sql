-- Add auth_user_id column to guest_users
ALTER TABLE public.guest_users
ADD COLUMN auth_user_id uuid UNIQUE NOT NULL;

-- Add foreign key constraint to auth.users with cascade delete
ALTER TABLE public.guest_users
ADD CONSTRAINT fk_guest_auth_user
FOREIGN KEY (auth_user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Allow guest to insert their own record" ON public.guest_users;
DROP POLICY IF EXISTS "Allow guests to read their own record" ON public.guest_users;

-- Insert policy: Only allow inserting if auth_user_id matches auth.uid()
CREATE POLICY "Insert own guest profile"
ON public.guest_users
FOR INSERT
WITH CHECK (auth_user_id = auth.uid());

-- Select policy: Only allow selecting own profile
CREATE POLICY "Read own guest profile"
ON public.guest_users
FOR SELECT
USING (auth_user_id = auth.uid());

-- Optional: Add index for faster lookups by auth_user_id
CREATE INDEX IF NOT EXISTS idx_guest_users_auth_user_id
ON public.guest_users (auth_user_id);