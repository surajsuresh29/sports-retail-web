ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS invoice_id UUID;
