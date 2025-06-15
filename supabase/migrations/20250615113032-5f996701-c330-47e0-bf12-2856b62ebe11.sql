
-- Drop the existing foreign key constraint which incorrectly links orders only to authenticated users.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Add a new, correct foreign key constraint that links orders to customer profiles.
-- If a profile is deleted, the user_id on their orders will be set to NULL, preserving order history.
ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
