-- =============================================
-- DENTO CMS - Doctor Schedule Assignments
-- Assign doctors to branches on specific dates/days
-- =============================================

-- Doctor schedule assignments table
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  -- Schedule type: 'recurring' for weekly patterns, 'specific' for specific dates
  schedule_type TEXT NOT NULL DEFAULT 'recurring' CHECK (schedule_type IN ('recurring', 'specific')),
  -- For recurring schedules (weekly pattern)
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  -- For specific date assignments
  specific_date DATE,
  -- Working hours for this assignment
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_schedule_type CHECK (
    (schedule_type = 'recurring' AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (schedule_type = 'specific' AND specific_date IS NOT NULL AND day_of_week IS NULL)
  )
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_branch ON doctor_schedules(branch_id);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_day ON doctor_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_date ON doctor_schedules(specific_date);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_active ON doctor_schedules(is_active);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_doctor_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_doctor_schedules_updated_at ON doctor_schedules;
CREATE TRIGGER set_doctor_schedules_updated_at
  BEFORE UPDATE ON doctor_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_schedules_updated_at();

-- RLS Policies
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;

-- Everyone can view active schedules
CREATE POLICY "Anyone can view active doctor schedules"
  ON doctor_schedules FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can manage all schedules
CREATE POLICY "Admins can manage doctor schedules"
  ON doctor_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('developer', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('developer', 'admin')
    )
  );
