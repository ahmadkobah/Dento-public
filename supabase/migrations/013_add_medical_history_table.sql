-- Migration: Add comprehensive medical_history table
-- Created: 2025-01-10
-- This table stores all patient medical information in one place

-- 1. Create medical_history table with all necessary fields
CREATE TABLE IF NOT EXISTS medical_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Chronic Conditions
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
    allergies JSONB DEFAULT '[]',  -- Array of allergy strings
    allergic_to_anesthesia BOOLEAN DEFAULT false,
    allergic_to_penicillin BOOLEAN DEFAULT false,
    allergic_to_latex BOOLEAN DEFAULT false,
    allergy_notes TEXT,
    
    -- Medications
    current_medications JSONB DEFAULT '[]',  -- Array of medication strings
    taking_blood_thinners BOOLEAN DEFAULT false,
    
    -- Dental History
    previous_dental_surgeries TEXT,
    last_dental_visit DATE,
    has_dental_anxiety BOOLEAN DEFAULT false,
    dental_anxiety_level INTEGER CHECK (dental_anxiety_level BETWEEN 1 AND 10),
    
    -- Lifestyle
    is_smoker BOOLEAN DEFAULT false,
    smoking_frequency TEXT,
    
    -- Notes
    additional_notes TEXT,
    
    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per patient
    UNIQUE(patient_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_medical_history_patient ON medical_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_allergies ON medical_history USING GIN(allergies);

-- 3. Create update trigger
CREATE OR REPLACE FUNCTION update_medical_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_medical_history_timestamp ON medical_history;
CREATE TRIGGER update_medical_history_timestamp
    BEFORE UPDATE ON medical_history
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_history_updated_at();

-- 4. Enable RLS
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Clinical staff can view medical history" ON medical_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer', 'doctor', 'receptionist')
        )
    );

CREATE POLICY "Clinical staff can manage medical history" ON medical_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer', 'doctor')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer', 'doctor')
        )
    );

-- Service role full access
CREATE POLICY "Service role full access to medical_history" ON medical_history
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE medical_history IS 'Comprehensive patient medical history form data';
