-- Add UUID default generation to orders.id column
ALTER TABLE public.orders ALTER COLUMN id SET DEFAULT gen_random_uuid();
