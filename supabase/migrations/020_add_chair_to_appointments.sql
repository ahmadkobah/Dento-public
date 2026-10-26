-- Migration: 020_add_chair_to_appointments.sql
-- Purpose: Connect chairs to appointments and walk-in queue for proper chair management
-- This adds the missing chair_id foreign key to enable:
--   1. Chair selection during appointment booking
--   2. Chair assignment in walk-in queue
--   3. Chair availability checking
--   4. Double-booking prevention

-- ============================================
-- 1. ADD CHAIR_ID TO APPOINTMENTS TABLE
-- ============================================
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS chair_id UUID REFERENCES chairs(id) ON DELETE SET NULL;

-- Create index for chair lookups
CREATE INDEX IF NOT EXISTS idx_appointments_chair ON appointments(chair_id);

-- Create composite index for chair availability checks
CREATE INDEX IF NOT EXISTS idx_appointments_chair_datetime ON appointments(chair_id, appointment_date, start_time, end_time);

-- ============================================
-- 2. ADD CHAIR_ID TO WALK_IN_QUEUE TABLE
-- ============================================
ALTER TABLE walk_in_queue 
ADD COLUMN IF NOT EXISTS chair_id UUID REFERENCES chairs(id) ON DELETE SET NULL;

-- Create index for chair lookups in queue
CREATE INDEX IF NOT EXISTS idx_walkin_queue_chair ON walk_in_queue(chair_id);

-- ============================================
-- 3. CHAIR AVAILABILITY FUNCTION
-- ============================================
-- Check if a chair is available for a given time slot
CREATE OR REPLACE FUNCTION check_chair_availability(
  p_chair_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_appointment_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Return true if no conflicting appointments exist
  RETURN NOT EXISTS (
    SELECT 1 FROM appointments
    WHERE chair_id = p_chair_id
      AND appointment_date = p_date
      AND status NOT IN ('cancelled', 'no_show', 'rescheduled')
      AND (
        (start_time < p_end_time AND end_time > p_start_time)  -- Time overlap check
      )
      AND (p_exclude_appointment_id IS NULL OR id != p_exclude_appointment_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. GET AVAILABLE CHAIRS FUNCTION
-- ============================================
-- Get all available chairs for a branch at a given time
CREATE OR REPLACE FUNCTION get_available_chairs(
  p_branch_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
) RETURNS TABLE (
  chair_id UUID,
  chair_number INTEGER,
  name_en VARCHAR,
  name_ar VARCHAR,
  chair_type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.chair_number,
    c.name_en,
    c.name_ar,
    c.chair_type
  FROM chairs c
  WHERE c.branch_id = p_branch_id
    AND c.is_active = TRUE
    AND check_chair_availability(c.id, p_date, p_start_time, p_end_time)
  ORDER BY c.chair_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. GET CHAIR SCHEDULE FUNCTION
-- ============================================
-- Get all appointments for a specific chair on a date
CREATE OR REPLACE FUNCTION get_chair_schedule(
  p_chair_id UUID,
  p_date DATE
) RETURNS TABLE (
  appointment_id UUID,
  patient_name TEXT,
  doctor_name VARCHAR,
  start_time TIME,
  end_time TIME,
  status TEXT,
  service_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    p.name,
    d.name_en,
    a.start_time,
    a.end_time,
    a.status,
    a.service_type
  FROM appointments a
  LEFT JOIN patients p ON a.patient_id = p.id
  LEFT JOIN doctors d ON a.doctor_id = d.id
  WHERE a.chair_id = p_chair_id
    AND a.appointment_date = p_date
    AND a.status NOT IN ('cancelled', 'no_show')
  ORDER BY a.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. BRANCH CHAIR OVERVIEW FUNCTION
-- ============================================
-- Get overview of all chairs and their current status for a branch
CREATE OR REPLACE FUNCTION get_branch_chair_overview(
  p_branch_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_time TIME DEFAULT CURRENT_TIME
) RETURNS TABLE (
  chair_id UUID,
  chair_number INTEGER,
  chair_name_en VARCHAR,
  chair_type VARCHAR,
  is_occupied BOOLEAN,
  current_patient_name TEXT,
  current_doctor_name VARCHAR,
  current_appointment_end TIME,
  next_appointment_start TIME,
  appointments_today INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.chair_number,
    c.name_en,
    c.chair_type,
    -- Check if currently occupied
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.chair_id = c.id
        AND a.appointment_date = p_date
        AND a.start_time <= p_time
        AND a.end_time > p_time
        AND a.status IN ('in_progress', 'arrived', 'confirmed')
    ) AS is_occupied,
    -- Current patient
    (
      SELECT p.name FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE a.chair_id = c.id
        AND a.appointment_date = p_date
        AND a.start_time <= p_time
        AND a.end_time > p_time
        AND a.status IN ('in_progress', 'arrived', 'confirmed')
      LIMIT 1
    ),
    -- Current doctor
    (
      SELECT d.name_en FROM appointments a
      LEFT JOIN doctors d ON a.doctor_id = d.id
      WHERE a.chair_id = c.id
        AND a.appointment_date = p_date
        AND a.start_time <= p_time
        AND a.end_time > p_time
        AND a.status IN ('in_progress', 'arrived', 'confirmed')
      LIMIT 1
    ),
    -- Current appointment end time
    (
      SELECT a.end_time FROM appointments a
      WHERE a.chair_id = c.id
        AND a.appointment_date = p_date
        AND a.start_time <= p_time
        AND a.end_time > p_time
        AND a.status IN ('in_progress', 'arrived', 'confirmed')
      LIMIT 1
    ),
    -- Next appointment start time
    (
      SELECT MIN(a.start_time) FROM appointments a
      WHERE a.chair_id = c.id
        AND a.appointment_date = p_date
        AND a.start_time > p_time
        AND a.status NOT IN ('cancelled', 'no_show')
    ),
    -- Total appointments today
    (
      SELECT COUNT(*)::INTEGER FROM appointments a
      WHERE a.chair_id = c.id
        AND a.appointment_date = p_date
        AND a.status NOT IN ('cancelled', 'no_show')
    )
  FROM chairs c
  WHERE c.branch_id = p_branch_id
    AND c.is_active = TRUE
  ORDER BY c.chair_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. TRIGGER: VALIDATE CHAIR AVAILABILITY ON INSERT/UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION validate_chair_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if chair_id is provided
  IF NEW.chair_id IS NOT NULL THEN
    -- Check if chair belongs to the same branch as appointment
    IF NOT EXISTS (
      SELECT 1 FROM chairs 
      WHERE id = NEW.chair_id 
        AND branch_id = NEW.branch_id
        AND is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'Chair does not belong to the selected branch or is inactive';
    END IF;
    
    -- Check chair availability (exclude current appointment on update)
    IF NOT check_chair_availability(
      NEW.chair_id, 
      NEW.appointment_date, 
      NEW.start_time, 
      NEW.end_time,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.id ELSE NULL END
    ) THEN
      RAISE EXCEPTION 'Chair is not available for the selected time slot';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_appointment_chair ON appointments;
CREATE TRIGGER validate_appointment_chair
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION validate_chair_availability();

-- ============================================
-- 8. COMMENTS
-- ============================================
COMMENT ON COLUMN appointments.chair_id IS 'Reference to the dental chair/room for this appointment';
COMMENT ON COLUMN walk_in_queue.chair_id IS 'Assigned chair for the walk-in patient';
COMMENT ON FUNCTION check_chair_availability IS 'Returns TRUE if the chair is available for the specified time slot';
COMMENT ON FUNCTION get_available_chairs IS 'Returns list of available chairs for a branch at a given time';
COMMENT ON FUNCTION get_chair_schedule IS 'Returns all appointments for a chair on a specific date';
COMMENT ON FUNCTION get_branch_chair_overview IS 'Returns real-time status of all chairs in a branch';
