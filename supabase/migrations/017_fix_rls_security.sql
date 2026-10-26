-- =============================================
-- FIX OVERLY PERMISSIVE RLS POLICIES
-- This migration tightens security while maintaining functionality
-- =============================================

-- Fix get_user_role function - NEVER return 'admin' as default
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  -- SECURITY: Return 'patient' (most restrictive) if user not found
  RETURN COALESCE(user_role, 'patient');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin or developer
CREATE OR REPLACE FUNCTION is_admin_or_developer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'developer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is staff (any role except patient)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'developer', 'doctor', 'receptionist', 'cbct_tech', 'assistant');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PATIENTS TABLE - Tighten policies
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON patients;
DROP POLICY IF EXISTS "Staff can insert patients" ON patients;

-- Only staff can create patients (not any authenticated user)
CREATE POLICY "Staff can insert patients" ON patients 
FOR INSERT 
WITH CHECK (is_staff());

-- Staff can view all patients, patients can view own record
DROP POLICY IF EXISTS "Staff can view patients" ON patients;
CREATE POLICY "Staff can view patients" ON patients 
FOR SELECT 
USING (
  is_staff() OR 
  id = auth.uid() -- Patient can view own record if linked
);

-- Only staff can update patients
DROP POLICY IF EXISTS "Staff can update patients" ON patients;
CREATE POLICY "Staff can update patients" ON patients 
FOR UPDATE 
USING (is_staff());

-- Only admin/developer can delete patients
DROP POLICY IF EXISTS "Admin can delete patients" ON patients;
CREATE POLICY "Admin can delete patients" ON patients 
FOR DELETE 
USING (is_admin_or_developer());

-- =============================================
-- APPOINTMENTS TABLE - Tighten policies
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON appointments;

-- Staff can create appointments
CREATE POLICY "Staff can insert appointments" ON appointments 
FOR INSERT 
WITH CHECK (is_staff());

-- Staff can view all, doctors only their own, patients only their own
DROP POLICY IF EXISTS "View appointments" ON appointments;
CREATE POLICY "View appointments" ON appointments 
FOR SELECT 
USING (
  is_admin_or_developer() OR
  (get_user_role() = 'receptionist') OR
  (get_user_role() = 'doctor' AND doctor_id = (SELECT doctor_id FROM users WHERE id = auth.uid())) OR
  (patient_id = auth.uid())
);

-- Staff can update appointments
CREATE POLICY "Staff can update appointments" ON appointments 
FOR UPDATE 
USING (is_staff());

-- Only admin/receptionist can delete appointments
CREATE POLICY "Admin can delete appointments" ON appointments 
FOR DELETE 
USING (get_user_role() IN ('admin', 'developer', 'receptionist'));

-- =============================================
-- USERS TABLE - Tighten policies
-- =============================================
DROP POLICY IF EXISTS "Users can view own record" ON users;

-- Users can view own record, admin/developer can view all
CREATE POLICY "View users" ON users 
FOR SELECT 
USING (
  auth.uid() = id OR 
  is_admin_or_developer()
);

-- Only admin can modify users
DROP POLICY IF EXISTS "Admin can manage users" ON users;
CREATE POLICY "Admin can manage users" ON users 
FOR ALL 
USING (is_admin_or_developer());

-- =============================================
-- DOCTORS TABLE - Tighten policies
-- =============================================
DROP POLICY IF EXISTS "Anyone can view doctors" ON doctors;

-- Public can view active doctors only
CREATE POLICY "Public can view active doctors" ON doctors 
FOR SELECT 
USING (is_active = true OR is_staff());

-- Only admin can manage doctors
DROP POLICY IF EXISTS "Admin can manage doctors" ON doctors;
CREATE POLICY "Admin can manage doctors" ON doctors 
FOR ALL 
USING (is_admin_or_developer());

-- =============================================
-- BRANCHES TABLE - Allow public read for active branches
-- =============================================
DROP POLICY IF EXISTS "Anyone can view branches" ON branches;
CREATE POLICY "Public can view active branches" ON branches 
FOR SELECT 
USING (is_active = true OR is_staff());

DROP POLICY IF EXISTS "Admin can manage branches" ON branches;
CREATE POLICY "Admin can manage branches" ON branches 
FOR ALL 
USING (is_admin_or_developer());

-- =============================================
-- Add audit logging function
-- =============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admin/developer can view audit logs
CREATE POLICY "Admin can view audit logs" ON audit_logs 
FOR SELECT 
USING (is_admin_or_developer());

-- Create audit trigger function
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data, user_id, user_role)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid(), get_user_role());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id, user_role)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid(), get_user_role());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, user_id, user_role)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid(), get_user_role());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to important tables
DROP TRIGGER IF EXISTS audit_patients ON patients;
CREATE TRIGGER audit_patients
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_appointments ON appointments;
CREATE TRIGGER audit_appointments
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_users ON users;
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- =============================================
-- Add commission calculation function
-- =============================================
CREATE OR REPLACE FUNCTION calculate_commission(
  p_doctor_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  doctor_id UUID,
  doctor_name TEXT,
  total_appointments INT,
  completed_appointments INT,
  total_revenue DECIMAL(10,2),
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as doctor_id,
    COALESCE(d.name_en, d.name_ar) as doctor_name,
    COUNT(a.id)::INT as total_appointments,
    COUNT(a.id) FILTER (WHERE a.status = 'completed')::INT as completed_appointments,
    COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.total_amount ELSE 0 END), 0) as total_revenue,
    d.commission_rate,
    COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.total_amount * (d.commission_rate / 100) ELSE 0 END), 0) as commission_amount
  FROM doctors d
  LEFT JOIN appointments a ON a.doctor_id = d.id
    AND (p_start_date IS NULL OR a.datetime_start::DATE >= p_start_date)
    AND (p_end_date IS NULL OR a.datetime_start::DATE <= p_end_date)
  WHERE d.id = p_doctor_id OR p_doctor_id IS NULL
  GROUP BY d.id, d.name_en, d.name_ar, d.commission_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
