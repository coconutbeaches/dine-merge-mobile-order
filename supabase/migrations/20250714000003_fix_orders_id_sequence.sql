-- Fix the orders table ID sequence issue
-- First, create a sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS orders_id_seq;

-- Set the sequence to start from the next available ID
SELECT setval('orders_id_seq', COALESCE((SELECT MAX(id) FROM orders), 0) + 1, false);

-- Alter the orders table to use the sequence for the ID column
ALTER TABLE orders ALTER COLUMN id SET DEFAULT nextval('orders_id_seq');

-- Set the sequence ownership to the column
ALTER SEQUENCE orders_id_seq OWNED BY orders.id;
