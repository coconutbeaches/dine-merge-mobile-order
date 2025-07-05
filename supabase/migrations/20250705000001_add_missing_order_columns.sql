-- Add missing columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS order_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS table_number TEXT;

-- Create index on order_status for better performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status);

-- Create index on created_at for date filtering
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Update existing orders to have default status
UPDATE public.orders 
SET order_status = 'new' 
WHERE order_status IS NULL;
