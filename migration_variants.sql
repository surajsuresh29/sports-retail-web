-- Migration to support Product Variants
ALTER TABLE products
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS group_id TEXT;

-- Create an index to easily find variants of the same product
CREATE INDEX IF NOT EXISTS idx_products_group_id ON products(group_id);
