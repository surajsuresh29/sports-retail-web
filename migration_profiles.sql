-- Add identifying details to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update RLS to allow Admins to update other profiles
DROP POLICY IF EXISTS "Admin update all profiles" ON profiles;
CREATE POLICY "Admin update all profiles" ON profiles 
FOR UPDATE USING (
  exists (
    select 1 from profiles
    where id = auth.uid() and role = 'ADMIN'
  )
);
