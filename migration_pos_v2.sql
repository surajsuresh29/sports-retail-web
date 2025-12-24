-- Add columns to store customer details and actual sale price (handling discounts)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2); -- Price per unit at time of sale (after discount)

-- Comment: This allows us to calculate exact revenue even if product price changes later.
-- It also allows us to verify the discount applied.
