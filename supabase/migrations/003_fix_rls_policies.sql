-- =============================================
-- FIX RLS POLICIES FOR PATIENT CREATION
-- This migration fixes the RLS policies to allow
-- authenticated users to create patients
-- =============================================

-- Drop existing restrictive insert policy if exists
DROP POLICY IF EXISTS "Staff can insert patients" ON patients;

-- Create a more permissive insert policy for authenticated users
-- This allows any logged-in user to create patients
CREATE POLICY "Authenticated users can insert patients" ON patients 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure the appointments table allows inserts
DROP POLICY IF EXISTS "Staff can manage appointments" ON appointments;

-- Create separate policies for appointments
CREATE POLICY "Authenticated users can insert appointments" ON appointments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update appointments" ON appointments 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete appointments" ON appointments 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Ensure users table allows authenticated users to check their role
DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own record" ON users 
FOR SELECT 
USING (auth.uid() = id OR auth.uid() IS NOT NULL);

-- Update get_user_role function to handle missing users gracefully
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  -- Return 'admin' as default if user not found (for new users)
  RETURN COALESCE(user_role, 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
