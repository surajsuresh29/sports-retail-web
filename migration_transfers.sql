-- Add status column to track transfer lifecycle
ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'COMPLETED';

-- Check constraint to ensure valid statuses if desired, or skip for simplicity
-- ALTER TABLE transactions ADD CONSTRAINT valid_status CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED'));

-- Enable Update Policy for transactions (needed to mark transfers as COMPLETED)
CREATE POLICY "Public update" ON transactions FOR UPDATE USING (auth.role() = 'authenticated');
