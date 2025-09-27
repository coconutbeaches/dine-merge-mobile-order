-- Fix Orders Performance Issues with Proper Indexes
-- This addresses the slow loading of customer orders pages

-- CRITICAL: Index for guest family orders (stay_id lookups)
-- This is what's causing the 20+ second load times!
CREATE INDEX IF NOT EXISTS idx_orders_stay_id_created_at 
ON public.orders(stay_id, created_at DESC) 
WHERE stay_id IS NOT NULL;

-- Index for authenticated user orders (user_id lookups)
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at 
ON public.orders(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Index for order status filtering (commonly used in admin dashboards)
CREATE INDEX IF NOT EXISTS idx_orders_order_status 
ON public.orders(order_status);

-- Composite index for the main orders dashboard query
CREATE INDEX IF NOT EXISTS idx_orders_created_at_status 
ON public.orders(created_at DESC, order_status);

-- Index for guest_user_id lookups (for guest order history)
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id 
ON public.orders(guest_user_id) 
WHERE guest_user_id IS NOT NULL;

-- Analyze the table to update statistics after creating indexes
ANALYZE public.orders;

-- Add comments for documentation
COMMENT ON INDEX idx_orders_stay_id_created_at IS 'Optimizes guest family order lookups - critical for performance';
COMMENT ON INDEX idx_orders_user_id_created_at IS 'Optimizes authenticated user order lookups';
COMMENT ON INDEX idx_orders_order_status IS 'Optimizes order filtering by status in admin dashboards';
COMMENT ON INDEX idx_orders_created_at_status IS 'Optimizes main orders dashboard queries';
COMMENT ON INDEX idx_orders_guest_user_id IS 'Optimizes individual guest user order history';

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'orders' 
ORDER BY indexname;