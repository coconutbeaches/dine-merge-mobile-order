
-- Adding indexes to improve menu loading performance

-- Index for categories table to speed up retrieval by sort order
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);

-- Index for products table to speed up retrieval by category and sort order
CREATE INDEX IF NOT EXISTS idx_products_category_id_sort_order ON public.products(category_id, sort_order);

-- Index for product_options table to speed up retrieval by product and sort order
CREATE INDEX IF NOT EXISTS idx_product_options_product_id_sort_order ON public.product_options(product_id, sort_order);

-- Index for product_option_choices table to speed up retrieval by option and sort order
CREATE INDEX IF NOT EXISTS idx_product_option_choices_option_id_sort_order ON public.product_option_choices(option_id, sort_order);

