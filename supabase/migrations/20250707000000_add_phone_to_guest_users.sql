
-- Add phone column to guest_users table
ALTER TABLE public.guest_users
ADD COLUMN phone text NOT NULL DEFAULT '';

-- Optional: If you want to allow NULLs for phone, change NOT NULL and remove DEFAULT '';
-- ALTER TABLE public.guest_users
-- ADD COLUMN phone text;
