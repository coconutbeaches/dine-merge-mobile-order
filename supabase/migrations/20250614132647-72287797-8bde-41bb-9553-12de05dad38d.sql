
-- Find and drop the foreign key constraint from profiles.id to auth.users.id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
