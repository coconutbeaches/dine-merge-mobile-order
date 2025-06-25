-- Add max_selections column to product_options table
ALTER TABLE public.product_options
ADD COLUMN max_selections integer;
