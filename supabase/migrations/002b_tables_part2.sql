-- =============================================
-- PART 2: CREATE APPOINTMENTS & TREATMENTS
-- Run this second
-- =============================================

-- 4. MEDICAL HISTORY TABLE
CREATE TABLE IF NOT EXISTS medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
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
  allergies TEXT[],
  allergic_to_anesthesia BOOLEAN DEFAULT false,
  allergic_to_penicillin BOOLEAN DEFAULT false,
  allergic_to_latex BOOLEAN DEFAULT false,
  allergy_notes TEXT,
  current_medications TEXT[],
  taking_blood_thinners BOOLEAN DEFAULT false,
  previous_dental_surgeries TEXT,
  last_dental_visit DATE,
  has_dental_anxiety BOOLEAN DEFAULT false,
  dental_anxiety_level INTEGER CHECK (dental_anxiety_level >= 1 AND dental_anxiety_level <= 10),
  is_smoker BOOLEAN DEFAULT false,
  smoking_frequency TEXT,
  additional_notes TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_history_patient ON medical_history(patient_id);

-- 5. APPOINTMENTS TABLE - Add missing columns if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    -- Add missing columns to existing appointments table
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date DATE;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS start_time TIME;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS end_time TIME;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 30;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS branch_id UUID;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id UUID;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'consultation';
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_type TEXT;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reason TEXT;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS internal_notes TEXT;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'walk-in';
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2);
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS created_by UUID;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_by UUID;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
    
    -- Migrate date to appointment_date if date column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'date') THEN
      UPDATE appointments SET appointment_date = date WHERE appointment_date IS NULL AND date IS NOT NULL;
    END IF;
    
    -- Migrate time to start_time if time column exists  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'time') THEN
      UPDATE appointments SET start_time = time WHERE start_time IS NULL AND time IS NOT NULL;
    END IF;
  ELSE
    CREATE TABLE appointments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
      branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
      service_id UUID REFERENCES services(id) ON DELETE SET NULL,
      appointment_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME,
      duration_minutes INTEGER DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'pending',
      type TEXT DEFAULT 'consultation',
      service_type TEXT,
      reason TEXT,
      notes TEXT,
      internal_notes TEXT,
      source TEXT DEFAULT 'walk-in',
      reminder_sent BOOLEAN DEFAULT false,
      reminder_sent_at TIMESTAMPTZ,
      consultation_fee DECIMAL(10,2),
      is_paid BOOLEAN DEFAULT false,
      created_by UUID,
      cancelled_by UUID,
      cancellation_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- 6. TREATMENTS TABLE
CREATE TABLE IF NOT EXISTS treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  treatment_name TEXT NOT NULL,
  tooth_number TEXT,
  quadrant TEXT,
  diagnosis TEXT,
  treatment_notes TEXT,
  status TEXT DEFAULT 'planned',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cost DECIMAL(10,2),
  discount DECIMAL(10,2) DEFAULT 0,
  final_cost DECIMAL(10,2),
  xray_urls TEXT[],
  photo_urls TEXT[],
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatments_doctor ON treatments(doctor_id);
