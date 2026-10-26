-- =============================================
-- FIX RLS POLICIES FOR USERS TABLE
-- Allow admins to view and manage all users
-- =============================================

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Authenticated can view users" ON users;
DROP POLICY IF EXISTS "Authenticated can manage users" ON users;

-- Allow all authenticated users to view all users (needed for dropdowns, etc)
CREATE POLICY "Authenticated users can view all users" ON users
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert new users
CREATE POLICY "Authenticated users can insert users" ON users
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update users
CREATE POLICY "Authenticated users can update users" ON users
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete users
CREATE POLICY "Authenticated users can delete users" ON users
FOR DELETE
USING (auth.uid() IS NOT NULL);
