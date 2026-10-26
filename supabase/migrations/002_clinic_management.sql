-- =============================================
-- DENTO CMS - Clinic Management Tables
-- Additional tables for full clinic management
-- =============================================

-- =============================================
-- 1. BRANCHES TABLE (Multi-location support)
-- =============================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  address_en TEXT,
  address_ar TEXT,
  phone TEXT,
  email TEXT,
  google_maps_url TEXT,
  working_hours JSONB DEFAULT '{}'::jsonb,
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. DOCTORS TABLE (Doctor profiles)
-- =============================================
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  title_en TEXT, -- e.g., "Orthodontist"
  title_ar TEXT,
  bio_en TEXT,
  bio_ar TEXT,
  photo_url TEXT,
  specializations TEXT[], -- Array of specializations
  qualifications TEXT[],  -- Array of degrees/certifications
  experience_years INTEGER,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  consultation_fee DECIMAL(10,2),
  working_hours JSONB DEFAULT '{}'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_branch ON doctors(branch_id);
CREATE INDEX IF NOT EXISTS idx_doctors_featured ON doctors(is_featured) WHERE is_featured = true;

-- =============================================
-- 3. PATIENTS TABLE (Patient records)
-- =============================================
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  patient_code TEXT UNIQUE, -- Auto-generated patient code like "DEN-001234"
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'UAE',
  nationality TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'ar')),
  how_did_you_hear TEXT, -- Referral source
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);

-- Auto-generate patient code
CREATE OR REPLACE FUNCTION generate_patient_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(patient_code FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM patients
  WHERE patient_code LIKE 'DEN-%';
  
  NEW.patient_code := 'DEN-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_patient_code
  BEFORE INSERT ON patients
  FOR EACH ROW
  WHEN (NEW.patient_code IS NULL)
  EXECUTE FUNCTION generate_patient_code();

-- =============================================
-- 4. MEDICAL HISTORY TABLE (Patient medical records)
-- =============================================
CREATE TABLE IF NOT EXISTS medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  -- Medical Conditions
  has_diabetes BOOLEAN DEFAULT false,
  has_hypertension BOOLEAN DEFAULT false,
  has_heart_disease BOOLEAN DEFAULT false,
  has_bleeding_disorder BOOLEAN DEFAULT false,
  has_hepatitis BOOLEAN DEFAULT false,
  has_hiv BOOLEAN DEFAULT false,
  has_asthma BOOLEAN DEFAULT false,
  has_epilepsy BOOLEAN DEFAULT false,
  has_pregnancy BOOLEAN DEFAULT false,
  other_conditions TEXT,
  -- Allergies
  allergies TEXT[], -- Array of allergies
  allergic_to_anesthesia BOOLEAN DEFAULT false,
  allergic_to_penicillin BOOLEAN DEFAULT false,
  allergic_to_latex BOOLEAN DEFAULT false,
  allergy_notes TEXT,
  -- Medications
  current_medications TEXT[],
  taking_blood_thinners BOOLEAN DEFAULT false,
  -- Dental History
  previous_dental_surgeries TEXT,
  last_dental_visit DATE,
  has_dental_anxiety BOOLEAN DEFAULT false,
  dental_anxiety_level INTEGER CHECK (dental_anxiety_level >= 1 AND dental_anxiety_level <= 10),
  -- Lifestyle
  is_smoker BOOLEAN DEFAULT false,
  smoking_frequency TEXT,
  -- Notes
  additional_notes TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_history_patient ON medical_history(patient_id);

-- =============================================
-- 5. APPOINTMENTS TABLE (Scheduling)
-- =============================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  -- Scheduling
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  duration_minutes INTEGER DEFAULT 30,
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'arrived', 'in_progress', 
    'completed', 'cancelled', 'no_show', 'rescheduled'
  )),
  -- Details
  type TEXT DEFAULT 'consultation' CHECK (type IN (
    'consultation', 'followup', 'treatment', 'emergency', 'checkup'
  )),
  reason TEXT,
  notes TEXT,
  internal_notes TEXT, -- Staff-only notes
  -- Source tracking
  source TEXT DEFAULT 'walk-in' CHECK (source IN (
    'website', 'phone', 'walk-in', 'referral', 'whatsapp', 'google'
  )),
  -- Reminders
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  -- Financial
  consultation_fee DECIMAL(10,2),
  is_paid BOOLEAN DEFAULT false,
  -- Metadata
  created_by UUID REFERENCES users(id),
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(appointment_date, start_time);

-- =============================================
-- 6. TREATMENTS TABLE (Treatment records)
-- =============================================
CREATE TABLE IF NOT EXISTS treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  -- Treatment Details
  treatment_name TEXT NOT NULL,
  tooth_number TEXT, -- e.g., "14", "14,15,16"
  quadrant TEXT CHECK (quadrant IN ('upper_right', 'upper_left', 'lower_right', 'lower_left', 'full')),
  diagnosis TEXT,
  treatment_notes TEXT,
  -- Status
  status TEXT DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'completed', 'cancelled'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Financials
  cost DECIMAL(10,2),
  discount DECIMAL(10,2) DEFAULT 0,
  final_cost DECIMAL(10,2),
  -- Files
  xray_urls TEXT[],
  photo_urls TEXT[],
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatments_doctor ON treatments(doctor_id);

-- =============================================
-- 7. INVOICES TABLE (Billing)
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 5, -- UAE VAT
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance_due DECIMAL(10,2) DEFAULT 0,
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'
  )),
  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  -- Details
  notes TEXT,
  terms TEXT,
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  next_num INTEGER;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
  INTO next_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_prefix || '-%';
  
  NEW.invoice_number := 'INV-' || year_prefix || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION generate_invoice_number();

-- =============================================
-- 8. INVOICE ITEMS TABLE (Line items)
-- =============================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  -- Item Details
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- =============================================
-- 9. PAYMENTS TABLE (Payment records)
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'cash', 'card', 'bank_transfer', 'cheque', 'insurance', 'online'
  )),
  payment_reference TEXT, -- Transaction ID, cheque number, etc.
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN (
    'pending', 'completed', 'failed', 'refunded'
  )),
  -- Details
  notes TEXT,
  received_by UUID REFERENCES users(id),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);

-- Trigger to update invoice on payment
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE invoices 
    SET 
      amount_paid = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'completed'),
      balance_due = total - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'completed'),
      status = CASE 
        WHEN total <= (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'completed') THEN 'paid'
        WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'completed') > 0 THEN 'partial'
        ELSE status
      END,
      paid_at = CASE 
        WHEN total <= (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'completed') THEN NOW()
        ELSE paid_at
      END,
      updated_at = NOW()
    WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_on_payment
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_payment();

-- =============================================
-- 10. MEDIA TABLE (File metadata)
-- =============================================
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'image', 'document', 'video'
  mime_type TEXT,
  file_size INTEGER,
  folder TEXT DEFAULT 'uploads',
  alt_text TEXT,
  caption TEXT,
  -- Relations (optional)
  uploaded_by UUID REFERENCES users(id),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(file_type);
CREATE INDEX IF NOT EXISTS idx_media_patient ON media(patient_id);

-- =============================================
-- APPLY UPDATE TRIGGERS TO NEW TABLES
-- =============================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('branches', 'doctors', 'patients', 'medical_history', 
                       'appointments', 'treatments', 'invoices', 'payments', 'media')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - PUBLIC ACCESS
-- =============================================

-- Branches: Public can view active branches
CREATE POLICY "Public can view active branches" ON branches
  FOR SELECT USING (is_active = true);

-- Doctors: Public can view active doctors
CREATE POLICY "Public can view active doctors" ON doctors
  FOR SELECT USING (is_active = true);

-- Media: Public can view public media
CREATE POLICY "Public can view public media" ON media
  FOR SELECT USING (is_public = true);

-- =============================================
-- RLS POLICIES - ADMIN FULL ACCESS
-- =============================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN VALUES ('branches'), ('doctors'), ('patients'), ('medical_history'),
                  ('appointments'), ('treatments'), ('invoices'), ('invoice_items'),
                  ('payments'), ('media')
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "Admins can manage %I" ON %I;
      CREATE POLICY "Admins can manage %I" ON %I
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN (''developer'', ''admin'')
          )
        );
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- =============================================
-- RLS POLICIES - DOCTOR ACCESS
-- =============================================

-- Doctors can view their own profile
CREATE POLICY "Doctors can view own profile" ON doctors
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('developer', 'admin')
    )
  );

-- Doctors can view patients they have treated
CREATE POLICY "Doctors can view their patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.patient_id = patients.id 
      AND a.doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('developer', 'admin', 'receptionist')
    )
  );

-- Doctors can view medical history of their patients
CREATE POLICY "Doctors can view patient medical history" ON medical_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.patient_id = medical_history.patient_id 
      AND a.doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('developer', 'admin')
    )
  );

-- Doctors can update medical history of their patients
CREATE POLICY "Doctors can update patient medical history" ON medical_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.patient_id = medical_history.patient_id 
      AND a.doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('developer', 'admin')
    )
  );

-- Doctors can view their appointments
CREATE POLICY "Doctors can view their appointments" ON appointments
  FOR SELECT USING (
    doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('developer', 'admin', 'receptionist')
    )
  );

-- Doctors can update their appointments
CREATE POLICY "Doctors can update their appointments" ON appointments
  FOR UPDATE USING (
    doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('developer', 'admin', 'receptionist')
    )
  );

-- Doctors can view treatments they performed
CREATE POLICY "Doctors can view their treatments" ON treatments
  FOR SELECT USING (
    doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('developer', 'admin')
    )
  );

-- Doctors can create and update their treatments
CREATE POLICY "Doctors can manage their treatments" ON treatments
  FOR ALL USING (
    doctor_id IN (SELECT d.id FROM doctors d WHERE d.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('developer', 'admin')
    )
  );

-- =============================================
-- RLS POLICIES - RECEPTIONIST ACCESS
-- =============================================

-- Receptionists can view and manage patients
CREATE POLICY "Receptionists can manage patients" ON patients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('receptionist', 'developer', 'admin')
    )
  );

-- Receptionists can create appointments
CREATE POLICY "Receptionists can manage appointments" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('receptionist', 'developer', 'admin')
    )
  );

-- Receptionists can view invoices
CREATE POLICY "Receptionists can view invoices" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('receptionist', 'developer', 'admin')
    )
  );

-- Receptionists can receive payments
CREATE POLICY "Receptionists can manage payments" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('receptionist', 'developer', 'admin')
    )
  );

-- =============================================
-- SEED DATA - DEFAULT BRANCH
-- =============================================
INSERT INTO branches (name_en, name_ar, address_en, address_ar, phone, email, is_main, is_active, working_hours)
VALUES (
  'Dento Main Clinic',
  'عيادة دينتو الرئيسية',
  'Dubai, UAE',
  'دبي، الإمارات العربية المتحدة',
  '+971 4 123 4567',
  'info@dento.ae',
  true,
  true,
  '{
    "monday": {"open": "09:00", "close": "21:00", "isOpen": true},
    "tuesday": {"open": "09:00", "close": "21:00", "isOpen": true},
    "wednesday": {"open": "09:00", "close": "21:00", "isOpen": true},
    "thursday": {"open": "09:00", "close": "21:00", "isOpen": true},
    "friday": {"open": "14:00", "close": "21:00", "isOpen": true},
    "saturday": {"open": "10:00", "close": "18:00", "isOpen": true},
    "sunday": {"open": "10:00", "close": "18:00", "isOpen": true}
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- =============================================
-- TABLE COMMENTS
-- =============================================
COMMENT ON TABLE branches IS 'Clinic branch locations';
COMMENT ON TABLE doctors IS 'Doctor/specialist profiles';
COMMENT ON TABLE patients IS 'Patient records';
COMMENT ON TABLE medical_history IS 'Patient medical history and allergies';
COMMENT ON TABLE appointments IS 'Patient appointments and scheduling';
COMMENT ON TABLE treatments IS 'Treatment records for patients';
COMMENT ON TABLE invoices IS 'Patient invoices and billing';
COMMENT ON TABLE invoice_items IS 'Line items for invoices';
COMMENT ON TABLE payments IS 'Payment records';
COMMENT ON TABLE media IS 'Uploaded media files metadata';
