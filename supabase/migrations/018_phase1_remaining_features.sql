-- Migration: 018_phase1_remaining_features.sql
-- Purpose: Add remaining Phase 1 features: chairs/rooms, doctor license/certificates, family linking, buffer time

-- ============================================
-- 1. CHAIRS/ROOMS TABLE (for branch management)
-- ============================================
CREATE TABLE IF NOT EXISTS chairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100),
  chair_number INTEGER NOT NULL,
  chair_type VARCHAR(50) DEFAULT 'standard', -- standard, pediatric, surgery, hygiene
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, chair_number)
);

-- Enable RLS
ALTER TABLE chairs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chairs
CREATE POLICY "chairs_select_policy" ON chairs
  FOR SELECT USING (TRUE);

CREATE POLICY "chairs_insert_policy" ON chairs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

CREATE POLICY "chairs_update_policy" ON chairs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

CREATE POLICY "chairs_delete_policy" ON chairs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

-- ============================================
-- 2. DOCTOR LICENSE & CERTIFICATES
-- ============================================
-- Add license_expiry_date to doctors
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_expiry_date DATE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_authority VARCHAR(200);

-- Doctor certificates table
CREATE TABLE IF NOT EXISTS doctor_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  certificate_name VARCHAR(200) NOT NULL,
  certificate_name_ar VARCHAR(200),
  issuing_authority VARCHAR(200),
  issue_date DATE,
  expiry_date DATE,
  file_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE doctor_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doctor_certificates
CREATE POLICY "doctor_certificates_select_policy" ON doctor_certificates
  FOR SELECT USING (TRUE);

CREATE POLICY "doctor_certificates_insert_policy" ON doctor_certificates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer', 'doctor'))
  );

CREATE POLICY "doctor_certificates_update_policy" ON doctor_certificates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

CREATE POLICY "doctor_certificates_delete_policy" ON doctor_certificates
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

-- ============================================
-- 3. FAMILY MEMBER LINKING
-- ============================================
CREATE TABLE IF NOT EXISTS patient_family_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  related_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL, -- parent, child, spouse, sibling, guardian, other
  is_primary_contact BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(patient_id, related_patient_id),
  CHECK (patient_id != related_patient_id)
);

-- Enable RLS
ALTER TABLE patient_family_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "family_links_select_policy" ON patient_family_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer', 'doctor', 'receptionist'))
    OR patient_id = auth.uid()
    OR related_patient_id = auth.uid()
  );

CREATE POLICY "family_links_insert_policy" ON patient_family_links
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer', 'receptionist'))
  );

CREATE POLICY "family_links_update_policy" ON patient_family_links
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer', 'receptionist'))
  );

CREATE POLICY "family_links_delete_policy" ON patient_family_links
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );

-- ============================================
-- 4. BUFFER TIME SETTINGS
-- ============================================
-- Add buffer_time_minutes to branches and doctors
ALTER TABLE branches ADD COLUMN IF NOT EXISTS default_buffer_minutes INTEGER DEFAULT 10;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER DEFAULT 10;

-- ============================================
-- 5. PATIENT PHOTO URL (already exists but ensure column is there)
-- ============================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ============================================
-- 6. APPOINTMENT STATUS CHANGE TRIGGER (for notifications)
-- ============================================
CREATE OR REPLACE FUNCTION notify_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_patient RECORD;
  v_notification_type TEXT;
  v_title_en TEXT;
  v_title_ar TEXT;
  v_message_en TEXT;
  v_message_ar TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get patient info
    SELECT name, phone, email INTO v_patient
    FROM patients WHERE id = NEW.patient_id;
    
    -- Determine notification based on new status
    CASE NEW.status
      WHEN 'confirmed' THEN
        v_notification_type := 'appointment_confirmed';
        v_title_en := 'Appointment Confirmed';
        v_title_ar := 'تم تأكيد الموعد';
        v_message_en := format('Your appointment on %s has been confirmed.', to_char(NEW.datetime_start, 'DD Mon YYYY at HH24:MI'));
        v_message_ar := format('تم تأكيد موعدك في %s', to_char(NEW.datetime_start, 'DD Mon YYYY في HH24:MI'));
      WHEN 'cancelled' THEN
        v_notification_type := 'appointment_cancelled';
        v_title_en := 'Appointment Cancelled';
        v_title_ar := 'تم إلغاء الموعد';
        v_message_en := format('Your appointment on %s has been cancelled.', to_char(NEW.datetime_start, 'DD Mon YYYY'));
        v_message_ar := format('تم إلغاء موعدك في %s', to_char(NEW.datetime_start, 'DD Mon YYYY'));
      WHEN 'completed' THEN
        v_notification_type := 'appointment_completed';
        v_title_en := 'Thank You For Your Visit';
        v_title_ar := 'شكراً لزيارتك';
        v_message_en := 'Thank you for visiting Dento Clinic. We hope to see you again!';
        v_message_ar := 'شكراً لزيارتك لعيادة دينتو. نتمنى رؤيتك مجدداً!';
      WHEN 'no_show' THEN
        v_notification_type := 'appointment_no_show';
        v_title_en := 'Missed Appointment';
        v_title_ar := 'موعد فائت';
        v_message_en := 'You missed your appointment. Please contact us to reschedule.';
        v_message_ar := 'لقد فاتك موعدك. يرجى الاتصال بنا لإعادة الجدولة.';
      ELSE
        -- No notification for other statuses
        RETURN NEW;
    END CASE;
    
    -- Insert notification
    INSERT INTO notifications (
      user_id,
      type,
      title_en,
      title_ar,
      message_en,
      message_ar,
      data,
      created_at
    ) VALUES (
      NEW.patient_id,
      v_notification_type,
      v_title_en,
      v_title_ar,
      v_message_en,
      v_message_ar,
      jsonb_build_object(
        'appointment_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'datetime_start', NEW.datetime_start,
        'patient_name', v_patient.name,
        'patient_phone', v_patient.phone,
        'patient_email', v_patient.email
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if not exists
DROP TRIGGER IF EXISTS appointment_status_change_trigger ON appointments;
CREATE TRIGGER appointment_status_change_trigger
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_status_change();

-- ============================================
-- 7. DENTAL CHART HISTORY FOR COMPARISON
-- ============================================
CREATE TABLE IF NOT EXISTS dental_chart_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  chart_data JSONB NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE dental_chart_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "dental_history_select_policy" ON dental_chart_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer', 'doctor'))
    OR patient_id = auth.uid()
  );

CREATE POLICY "dental_history_insert_policy" ON dental_chart_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer', 'doctor'))
  );

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chairs_branch ON chairs(branch_id);
CREATE INDEX IF NOT EXISTS idx_doctor_certificates_doctor ON doctor_certificates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_family_links_patient ON patient_family_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_links_related ON patient_family_links(related_patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_history_patient ON dental_chart_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_history_date ON dental_chart_history(recorded_at DESC);

-- ============================================
-- 9. UPDATE TIMESTAMPS TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chairs_updated_at ON chairs;
CREATE TRIGGER chairs_updated_at
  BEFORE UPDATE ON chairs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS doctor_certificates_updated_at ON doctor_certificates;
CREATE TRIGGER doctor_certificates_updated_at
  BEFORE UPDATE ON doctor_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Done!
COMMENT ON TABLE chairs IS 'Dental chairs/rooms within branches';
COMMENT ON TABLE doctor_certificates IS 'Doctor certificates and credentials';
COMMENT ON TABLE patient_family_links IS 'Links between family member patients';
COMMENT ON TABLE dental_chart_history IS 'Historical snapshots of dental charts for comparison';
