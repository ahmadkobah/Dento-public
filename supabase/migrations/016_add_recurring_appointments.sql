-- Migration: Add recurring appointments support
-- Created: Phase 1 Foundation - Recurring Appointments

-- Add recurring fields to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_count INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES appointments(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurrence_days_of_week INTEGER[]; -- 0=Sunday, 1=Monday, etc.

-- Index for recurring appointments
CREATE INDEX IF NOT EXISTS idx_appointments_recurring ON appointments(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;

-- Function to generate recurring appointments
CREATE OR REPLACE FUNCTION generate_recurring_appointments(
  p_parent_id UUID,
  p_pattern TEXT,
  p_end_date DATE,
  p_count INTEGER DEFAULT NULL,
  p_days_of_week INTEGER[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_parent RECORD;
  v_current_date DATE;
  v_next_date DATE;
  v_count INTEGER := 0;
  v_max_count INTEGER;
  v_interval INTERVAL;
  v_day INTEGER;
BEGIN
  -- Get parent appointment
  SELECT * INTO v_parent FROM appointments WHERE id = p_parent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent appointment not found';
  END IF;

  -- Calculate max iterations
  v_max_count := COALESCE(p_count, 52); -- Default max 52 occurrences (1 year weekly)
  
  -- Set interval based on pattern
  CASE p_pattern
    WHEN 'daily' THEN v_interval := INTERVAL '1 day';
    WHEN 'weekly' THEN v_interval := INTERVAL '1 week';
    WHEN 'biweekly' THEN v_interval := INTERVAL '2 weeks';
    WHEN 'monthly' THEN v_interval := INTERVAL '1 month';
    ELSE RAISE EXCEPTION 'Invalid recurrence pattern: %', p_pattern;
  END CASE;

  v_current_date := v_parent.appointment_date;

  -- Generate appointments
  WHILE v_count < v_max_count LOOP
    v_next_date := v_current_date + v_interval;
    
    -- Check if we've passed the end date
    IF p_end_date IS NOT NULL AND v_next_date > p_end_date THEN
      EXIT;
    END IF;
    
    -- For weekly with specific days, check if day matches
    IF p_pattern = 'weekly' AND p_days_of_week IS NOT NULL AND array_length(p_days_of_week, 1) > 0 THEN
      v_day := EXTRACT(DOW FROM v_next_date)::INTEGER;
      IF NOT (v_day = ANY(p_days_of_week)) THEN
        v_current_date := v_next_date;
        CONTINUE;
      END IF;
    END IF;
    
    -- Insert recurring appointment
    INSERT INTO appointments (
      patient_id,
      doctor_id,
      branch_id,
      appointment_date,
      start_time,
      end_time,
      duration_minutes,
      service_type,
      status,
      notes,
      is_recurring,
      recurrence_pattern,
      recurrence_end_date,
      recurrence_parent_id
    ) VALUES (
      v_parent.patient_id,
      v_parent.doctor_id,
      v_parent.branch_id,
      v_next_date,
      v_parent.start_time,
      v_parent.end_time,
      v_parent.duration_minutes,
      v_parent.service_type,
      'pending', -- All recurring appointments start as pending
      v_parent.notes,
      true,
      p_pattern,
      p_end_date,
      p_parent_id
    );
    
    v_count := v_count + 1;
    v_current_date := v_next_date;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel all future recurring appointments
CREATE OR REPLACE FUNCTION cancel_recurring_appointments(
  p_parent_id UUID,
  p_cancel_from DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  UPDATE appointments
  SET 
    status = 'cancelled',
    updated_at = CURRENT_TIMESTAMP
  WHERE 
    (id = p_parent_id OR recurrence_parent_id = p_parent_id)
    AND appointment_date >= p_cancel_from
    AND status NOT IN ('completed', 'cancelled');
  
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for recurring appointment series
CREATE OR REPLACE VIEW recurring_appointment_series AS
SELECT 
  a.id,
  a.patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  a.doctor_id,
  d.name_en as doctor_name,
  d.name_ar as doctor_name_ar,
  a.appointment_date as series_start_date,
  a.recurrence_pattern,
  a.recurrence_end_date,
  (SELECT COUNT(*) FROM appointments WHERE recurrence_parent_id = a.id) as total_occurrences,
  (SELECT COUNT(*) FROM appointments WHERE recurrence_parent_id = a.id AND status = 'completed') as completed_count,
  (SELECT COUNT(*) FROM appointments WHERE recurrence_parent_id = a.id AND status = 'cancelled') as cancelled_count
FROM appointments a
JOIN patients p ON a.patient_id = p.id
LEFT JOIN doctors d ON a.doctor_id = d.id
WHERE a.is_recurring = true 
  AND a.recurrence_parent_id IS NULL -- Only parent appointments
ORDER BY a.appointment_date DESC;

COMMENT ON COLUMN appointments.is_recurring IS 'Flag to indicate this is a recurring appointment';
COMMENT ON COLUMN appointments.recurrence_pattern IS 'Pattern: daily, weekly, biweekly, monthly';
COMMENT ON COLUMN appointments.recurrence_end_date IS 'Date when the recurrence ends';
COMMENT ON COLUMN appointments.recurrence_count IS 'Number of occurrences for the series';
COMMENT ON COLUMN appointments.recurrence_parent_id IS 'Reference to the original parent appointment';
