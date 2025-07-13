-- Partitioning Script for Orders Table (Use only if > 10M rows)
-- This script creates a new partitioned table and migrates data
-- ⚠️ WARNING: This requires downtime and should be run during maintenance window

-- 1. Create new partitioned table with all current columns
CREATE TABLE public.orders_new (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    special_instructions text,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 2. Create monthly partitions for 2024-2025 (adjust dates as needed)
CREATE TABLE public.orders_2024_01 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE public.orders_2024_02 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE public.orders_2024_03 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE public.orders_2024_04 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE public.orders_2024_05 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE public.orders_2024_06 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE public.orders_2024_07 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE public.orders_2024_08 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE public.orders_2024_09 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE public.orders_2024_10 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE public.orders_2024_11 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE public.orders_2024_12 PARTITION OF public.orders_new
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE public.orders_2025_01 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE public.orders_2025_02 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE public.orders_2025_03 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE public.orders_2025_04 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE public.orders_2025_05 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE public.orders_2025_06 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE public.orders_2025_07 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE public.orders_2025_08 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE public.orders_2025_09 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE public.orders_2025_10 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE public.orders_2025_11 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE public.orders_2025_12 PARTITION OF public.orders_new
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- 3. Create indexes on the partitioned table
CREATE INDEX IF NOT EXISTS idx_orders_new_user_id ON public.orders_new(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_new_created_at_desc ON public.orders_new(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_new_updated_at ON public.orders_new(updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_new_status_created_at ON public.orders_new(order_status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_new_guest_user_id ON public.orders_new(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_new_stay_id ON public.orders_new(stay_id);

-- 4. Copy data from old table to new partitioned table
-- This might take a while for large tables
INSERT INTO public.orders_new 
SELECT * FROM public.orders;

-- 5. Verify data migration
SELECT 
    'Original table count: ' || COUNT(*) as info
FROM public.orders
UNION ALL
SELECT 
    'New partitioned table count: ' || COUNT(*) as info
FROM public.orders_new;

-- 6. Rename tables (requires brief downtime)
-- ⚠️ WARNING: This step requires application downtime
-- You may want to pause the application before running these commands

-- First, rename current table to backup
ALTER TABLE public.orders RENAME TO orders_backup;

-- Then rename new table to replace the original
ALTER TABLE public.orders_new RENAME TO orders;

-- 7. Update any foreign key constraints that reference the orders table
-- (Add specific constraint recreation commands based on your schema)

-- 8. Final vacuum and analyze
VACUUM ANALYZE public.orders;

-- 9. Create a function to automatically create future partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(target_date DATE)
RETURNS void AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := DATE_TRUNC('month', target_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'orders_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.orders
                    FOR VALUES FROM (%L) TO (%L)',
                   partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- 10. Create a cron job or scheduled task to create future partitions
-- This would typically be done outside of SQL, but you can manually create
-- partitions as needed using:
-- SELECT create_monthly_partition('2026-01-01');

SELECT 'Orders table partitioning completed successfully' as status;
