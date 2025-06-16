-- Add sort_order column to products table
ALTER TABLE products
ADD COLUMN sort_order INTEGER;

-- Populate sort_order for existing products
WITH RankedProducts AS (
    SELECT
        id,
        name,
        category_id,
        ROW_NUMBER() OVER (PARTITION BY COALESCE(category_id, uuid_nil()) ORDER BY name ASC) - 1 AS rn
    FROM
        products
)
UPDATE products
SET sort_order = rp.rn
FROM RankedProducts rp
WHERE products.id = rp.id;
