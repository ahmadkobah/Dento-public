-- =============================================
-- PART 1: CREATE CORE TABLES
-- Run this first
-- =============================================

-- 1. BRANCHES TABLE
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

-- 2. DOCTORS TABLE - Add missing columns if table exists
DO $$
BEGIN
  -- Create doctors table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'doctors') THEN
    CREATE TABLE doctors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      name_en TEXT NOT NULL,
      name_ar TEXT,
      title_en TEXT,
      title_ar TEXT,
      bio_en TEXT,
      bio_ar TEXT,
      photo_url TEXT,
      specializations TEXT[],
      qualifications TEXT[],
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
  ELSE
    -- Add missing columns to existing doctors table
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS name_ar TEXT;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS title_en TEXT;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS title_ar TEXT;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio_en TEXT;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio_ar TEXT;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS specializations TEXT[];
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications TEXT[];
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years INTEGER;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS branch_id UUID;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2);
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_doctors_branch ON doctors(branch_id);
CREATE INDEX IF NOT EXISTS idx_doctors_featured ON doctors(is_featured) WHERE is_featured = true;

-- 3. PATIENTS TABLE - Add missing columns if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
    -- Add new columns to existing table
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_code TEXT;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS city TEXT;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'UAE';
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS nationality TEXT;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
    ALTER TABLE patients ADD COLUMN IF NOT EXISTS how_did_you_hear TEXT;
    
    -- Migrate name to first_name/last_name if name column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'name') THEN
      UPDATE patients SET 
        first_name = SPLIT_PART(COALESCE(name, ''), ' ', 1),
        last_name = SUBSTRING(COALESCE(name, '') FROM POSITION(' ' IN COALESCE(name, '')) + 1)
      WHERE first_name IS NULL AND name IS NOT NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
