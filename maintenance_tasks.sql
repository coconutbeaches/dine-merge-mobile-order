-- Database House-Keeping & Maintenance Script for 'orders' table
-- Run these SQL queries in your Supabase SQL editor.

-- 1. VACUUM ANALYZE the orders table
VACUUM ANALYZE public.orders;

-- 2. Check current autovacuum settings and table statistics
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE tablename = 'orders';

-- Check current autovacuum settings for the orders table
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'orders';

-- Adjust autovacuum settings for orders table to handle growth
-- These settings are more aggressive for a growing table
ALTER TABLE public.orders SET (
    autovacuum_vacuum_threshold = 1000,
    autovacuum_analyze_threshold = 1000,
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

-- 3. Check row count to determine if partitioning is needed
SELECT 
    COUNT(*) as total_orders,
    MIN(created_at) as earliest_order,
    MAX(created_at) as latest_order,
    CASE 
        WHEN COUNT(*) > 10000000 THEN 'CONSIDER PARTITIONING'
        ELSE 'PARTITIONING NOT NEEDED YET'
    END as partitioning_recommendation
FROM public.orders;

-- Monthly distribution analysis (helpful for partitioning decisions)
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as orders_count
FROM public.orders
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- If row count > 10M, consider this partitioning approach:
-- Step 1: Create new partitioned table
/*
CREATE TABLE public.orders_new (
    id uuid DEFAULT gen_random_uuid(),
    user_id uuid,
    total_amount numeric(10,2) NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    order_status text NOT NULL DEFAULT 'new',
    order_items jsonb NOT NULL DEFAULT '[]'::jsonb,
    table_number text,
    guest_user_id text,
    guest_first_name text,
    stay_id text,
    special_instructions text
) PARTITION BY RANGE (created_at);

-- Step 2: Create monthly partitions (example for 2024-2025)
CREATE TABLE public.orders_2024_01 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE public.orders_2024_02 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Continue for all months...

-- Step 3: Copy data from old table to new partitioned table
INSERT INTO public.orders_new SELECT * FROM public.orders;

-- Step 4: Rename tables (requires downtime)
ALTER TABLE public.orders RENAME TO orders_old;
ALTER TABLE public.orders_new RENAME TO orders;
*/

-- 4. Add NOT NULL constraints and default values where beneficial for query planner
-- Note: user_id can be NULL for guest orders, so we don't set it to NOT NULL

-- First, let's check for any NULL values in key columns
SELECT 
    'id' as column_name,
    COUNT(*) as null_count
FROM public.orders WHERE id IS NULL
UNION ALL
SELECT 
    'total_amount' as column_name,
    COUNT(*) as null_count
FROM public.orders WHERE total_amount IS NULL
UNION ALL
SELECT 
    'created_at' as column_name,
    COUNT(*) as null_count
FROM public.orders WHERE created_at IS NULL
UNION ALL
SELECT 
    'updated_at' as column_name,
    COUNT(*) as null_count
FROM public.orders WHERE updated_at IS NULL
UNION ALL
SELECT 
    'order_status' as column_name,
    COUNT(*) as null_count
FROM public.orders WHERE order_status IS NULL
UNION ALL
SELECT 
    'order_items' as column_name,
    COUNT(*) as null_count
FROM public.orders WHERE order_items IS NULL;

-- Update NULL values before adding constraints
UPDATE public.orders SET 
    total_amount = 0 WHERE total_amount IS NULL;

UPDATE public.orders SET 
    updated_at = created_at WHERE updated_at IS NULL;

UPDATE public.orders SET 
    order_status = 'new' WHERE order_status IS NULL;

UPDATE public.orders SET 
    order_items = '[]'::jsonb WHERE order_items IS NULL;

-- Add NOT NULL constraints and defaults (must be done in separate statements)
-- First set the defaults
ALTER TABLE public.orders
    ALTER COLUMN total_amount SET DEFAULT 0,
    ALTER COLUMN created_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET DEFAULT now(),
    ALTER COLUMN order_status SET DEFAULT 'new',
    ALTER COLUMN order_items SET DEFAULT '[]'::jsonb;

-- Then set NOT NULL constraints
ALTER TABLE public.orders
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN total_amount SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL,
    ALTER COLUMN order_status SET NOT NULL,
    ALTER COLUMN order_items SET NOT NULL;

-- 5. Verify that all indexes are in place for optimal performance
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' AND tablename = 'orders'
ORDER BY indexname;

-- Add missing indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON public.orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON public.orders(order_status, created_at);

-- 6. Final VACUUM ANALYZE after all changes
VACUUM ANALYZE public.orders;

-- 7. Check table size and bloat
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'orders';

SELECT 'Database maintenance tasks completed successfully' as status;

