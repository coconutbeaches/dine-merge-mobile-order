
-- Add sort_order column to products table
ALTER TABLE public.products 
ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Update existing products to have incremental sort orders within their categories
WITH ranked_products AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) * 10 as new_sort_order
  FROM public.products
)
UPDATE public.products 
SET sort_order = ranked_products.new_sort_order
FROM ranked_products
WHERE products.id = ranked_products.id;
