-- =============================================
-- Migration 011: Add missing tables and sync schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create schedule_exceptions table if not exists
CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('vacation', 'sick_leave', 'personal', 'training', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_full_day BOOLEAN DEFAULT true,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create indexes for schedule_exceptions
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_doctor ON schedule_exceptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_dates ON schedule_exceptions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_status ON schedule_exceptions(status);

-- Enable RLS on schedule_exceptions
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedule_exceptions
DROP POLICY IF EXISTS "Admins can manage all schedule exceptions" ON schedule_exceptions;
DROP POLICY IF EXISTS "Doctors can view their own exceptions" ON schedule_exceptions;
DROP POLICY IF EXISTS "Doctors can create their own exceptions" ON schedule_exceptions;

CREATE POLICY "Admins can manage all schedule exceptions"
  ON schedule_exceptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Doctors can view their own exceptions"
  ON schedule_exceptions FOR SELECT
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can create their own exceptions"
  ON schedule_exceptions FOR INSERT
  TO authenticated
  WITH CHECK (
    doctor_id IN (
      SELECT id FROM doctors WHERE user_id = auth.uid()
    )
  );

-- 2. Add RLS policy for doctor_schedules to allow admins
DROP POLICY IF EXISTS "Admins can manage doctor schedules" ON doctor_schedules;
DROP POLICY IF EXISTS "Users can view active schedules" ON doctor_schedules;

CREATE POLICY "Admins can manage doctor schedules"
  ON doctor_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Users can view active schedules"
  ON doctor_schedules FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 3. Update portfolio_cases RLS policies
ALTER TABLE portfolio_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active portfolio cases" ON portfolio_cases;
DROP POLICY IF EXISTS "Admins can manage portfolio cases" ON portfolio_cases;

CREATE POLICY "Anyone can view active portfolio cases"
  ON portfolio_cases FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage portfolio cases"
  ON portfolio_cases FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'developer')
    )
  );

-- 4. Grant necessary permissions
GRANT ALL ON schedule_exceptions TO authenticated;
GRANT ALL ON doctor_schedules TO authenticated;
GRANT ALL ON portfolio_cases TO authenticated;
