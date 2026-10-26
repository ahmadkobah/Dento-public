-- =============================================
-- DENTO CMS - Schedule Exceptions Table
-- For vacations, special hours, and time-off
-- =============================================

-- Schedule exceptions (vacations, special working hours, etc.)
CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN (
    'vacation',      -- Doctor is on vacation
    'sick_leave',    -- Sick leave
    'special_hours', -- Working different hours that day
    'day_off',       -- Taking a day off
    'conference',    -- Attending conference/training
    'other'          -- Other reason
  )),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  -- For special_hours type - override the normal schedule
  special_start_time TIME,
  special_end_time TIME,
  reason TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure end_date is not before start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_doctor ON schedule_exceptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_dates ON schedule_exceptions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_type ON schedule_exceptions(exception_type);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_approved ON schedule_exceptions(is_approved);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_schedule_exceptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_schedule_exceptions_updated_at ON schedule_exceptions;
CREATE TRIGGER set_schedule_exceptions_updated_at
  BEFORE UPDATE ON schedule_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_exceptions_updated_at();

-- RLS Policies
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- Developers and admins can see all exceptions
CREATE POLICY "Admins can view all schedule exceptions"
  ON schedule_exceptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('developer', 'admin')
    )
  );

-- Doctors can see their own exceptions
CREATE POLICY "Doctors can view own schedule exceptions"
  ON schedule_exceptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctors 
      WHERE doctors.id = schedule_exceptions.doctor_id 
      AND doctors.user_id = auth.uid()
    )
  );

-- Admins can insert exceptions for any doctor
CREATE POLICY "Admins can insert schedule exceptions"
  ON schedule_exceptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('developer', 'admin')
    )
  );

-- Doctors can insert their own exceptions (pending approval)
CREATE POLICY "Doctors can insert own schedule exceptions"
  ON schedule_exceptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM doctors 
      WHERE doctors.id = doctor_id 
      AND doctors.user_id = auth.uid()
    )
  );

-- Admins can update any exception
CREATE POLICY "Admins can update schedule exceptions"
  ON schedule_exceptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('developer', 'admin')
    )
  );

-- Doctors can update their own pending exceptions
CREATE POLICY "Doctors can update own pending exceptions"
  ON schedule_exceptions FOR UPDATE
  TO authenticated
  USING (
    is_approved = false AND
    EXISTS (
      SELECT 1 FROM doctors 
      WHERE doctors.id = schedule_exceptions.doctor_id 
      AND doctors.user_id = auth.uid()
    )
  );

-- Admins can delete exceptions
CREATE POLICY "Admins can delete schedule exceptions"
  ON schedule_exceptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('developer', 'admin')
    )
  );

-- Doctors can delete their own pending exceptions
CREATE POLICY "Doctors can delete own pending exceptions"
  ON schedule_exceptions FOR DELETE
  TO authenticated
  USING (
    is_approved = false AND
    EXISTS (
      SELECT 1 FROM doctors 
      WHERE doctors.id = schedule_exceptions.doctor_id 
      AND doctors.user_id = auth.uid()
    )
  );
