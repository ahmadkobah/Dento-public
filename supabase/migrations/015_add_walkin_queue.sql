-- Migration: Add walk-in queue management
-- Created: Phase 1 Foundation - Walk-in Queue Management

-- Walk-in Queue Table
CREATE TABLE IF NOT EXISTS walk_in_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  
  -- Queue Info
  queue_number INTEGER NOT NULL,
  patient_name TEXT NOT NULL,  -- For walk-ins without patient record
  phone TEXT,
  reason TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'emergency')),
  
  -- Status tracking
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_progress', 'completed', 'cancelled', 'no_show')),
  
  -- Assignment
  assigned_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  
  -- Timestamps
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  called_time TIMESTAMP WITH TIME ZONE,
  started_time TIMESTAMP WITH TIME ZONE,
  completed_time TIMESTAMP WITH TIME ZONE,
  
  -- Estimated wait
  estimated_wait_minutes INTEGER,
  actual_wait_minutes INTEGER,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Queue Counter Table (for tracking daily queue numbers per branch)
CREATE TABLE IF NOT EXISTS queue_counters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  last_number INTEGER DEFAULT 0,
  UNIQUE(branch_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_walkin_queue_branch ON walk_in_queue(branch_id);
CREATE INDEX IF NOT EXISTS idx_walkin_queue_status ON walk_in_queue(status);
CREATE INDEX IF NOT EXISTS idx_walkin_queue_date ON walk_in_queue(check_in_time);
CREATE INDEX IF NOT EXISTS idx_walkin_queue_patient ON walk_in_queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_counters_branch_date ON queue_counters(branch_id, date);

-- Enable RLS
ALTER TABLE walk_in_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_counters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view walk-in queue" ON walk_in_queue
  FOR SELECT USING (
    get_user_role() IN ('admin', 'developer', 'receptionist', 'doctor', 'assistant')
  );

CREATE POLICY "Staff can manage walk-in queue" ON walk_in_queue
  FOR ALL USING (
    get_user_role() IN ('admin', 'developer', 'receptionist')
  );

CREATE POLICY "Staff can view queue counters" ON queue_counters
  FOR SELECT USING (
    get_user_role() IN ('admin', 'developer', 'receptionist', 'doctor', 'assistant')
  );

CREATE POLICY "Staff can manage queue counters" ON queue_counters
  FOR ALL USING (
    get_user_role() IN ('admin', 'developer', 'receptionist')
  );

-- Function to get next queue number for a branch
CREATE OR REPLACE FUNCTION get_next_queue_number(p_branch_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_next_number INTEGER;
BEGIN
  -- Insert or update the counter for today
  INSERT INTO queue_counters (branch_id, date, last_number)
  VALUES (p_branch_id, CURRENT_DATE, 1)
  ON CONFLICT (branch_id, date)
  DO UPDATE SET last_number = queue_counters.last_number + 1
  RETURNING last_number INTO v_next_number;
  
  RETURN v_next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate estimated wait time
CREATE OR REPLACE FUNCTION calculate_estimated_wait(p_branch_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_waiting_count INTEGER;
  v_avg_service_time INTEGER;
BEGIN
  -- Count waiting patients
  SELECT COUNT(*) INTO v_waiting_count
  FROM walk_in_queue
  WHERE branch_id = p_branch_id
  AND status IN ('waiting', 'called')
  AND DATE(check_in_time) = CURRENT_DATE;
  
  -- Get average service time from completed appointments today (default 15 min)
  SELECT COALESCE(AVG(actual_wait_minutes), 15)::INTEGER INTO v_avg_service_time
  FROM walk_in_queue
  WHERE branch_id = p_branch_id
  AND status = 'completed'
  AND DATE(completed_time) = CURRENT_DATE
  AND actual_wait_minutes IS NOT NULL;
  
  RETURN v_waiting_count * v_avg_service_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for today's queue with patient info
CREATE OR REPLACE VIEW today_queue_view AS
SELECT 
  wq.*,
  p.first_name as patient_first_name,
  p.last_name as patient_last_name,
  p.phone as patient_phone,
  d.name_en as doctor_name,
  d.name_ar as doctor_name_ar,
  b.name_en as branch_name,
  EXTRACT(EPOCH FROM (COALESCE(wq.called_time, CURRENT_TIMESTAMP) - wq.check_in_time)) / 60 as minutes_waiting
FROM walk_in_queue wq
LEFT JOIN patients p ON wq.patient_id = p.id
LEFT JOIN doctors d ON wq.assigned_doctor_id = d.id
LEFT JOIN branches b ON wq.branch_id = b.id
WHERE DATE(wq.check_in_time) = CURRENT_DATE
ORDER BY 
  CASE wq.priority 
    WHEN 'emergency' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'normal' THEN 3 
    WHEN 'low' THEN 4 
  END,
  wq.queue_number;

COMMENT ON TABLE walk_in_queue IS 'Manages walk-in patients queue for same-day visits';
COMMENT ON TABLE queue_counters IS 'Tracks daily queue numbers per branch';
