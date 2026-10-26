-- =====================================================
-- Phase 2: Clinical Tables Migration
-- Created: January 29, 2026
-- Description: Treatment Plans, Prescriptions, X-Rays,
--              CBCT, Consent Forms, Procedure Notes, Lab Orders
-- =====================================================

-- =====================================================
-- 1. TREATMENT PLANS
-- =====================================================

-- Treatment Plans table
CREATE TABLE IF NOT EXISTS treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled')),
    total_cost DECIMAL(10,2) DEFAULT 0,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) DEFAULT 0,
    final_cost DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    patient_signature TEXT,
    signed_at TIMESTAMPTZ,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Treatment Plan Items (procedures within a plan)
CREATE TABLE IF NOT EXISTS treatment_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    tooth_number VARCHAR(10),
    surface VARCHAR(50),
    procedure_name VARCHAR(255) NOT NULL,
    description TEXT,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    sequence_order INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. PRESCRIPTIONS
-- =====================================================

-- Medications database
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    generic_name VARCHAR(255),
    category VARCHAR(100),
    dosage_form VARCHAR(100), -- tablet, capsule, syrup, injection, etc.
    strength VARCHAR(100),
    default_dosage VARCHAR(255),
    default_frequency VARCHAR(100),
    default_duration VARCHAR(100),
    instructions_en TEXT,
    instructions_ar TEXT,
    warnings TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_number VARCHAR(50) UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    diagnosis TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'dispensed', 'expired', 'cancelled')),
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescription Items (medications in a prescription)
CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES medications(id) ON DELETE SET NULL,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(255),
    frequency VARCHAR(255),
    duration VARCHAR(255),
    quantity INT,
    instructions_en TEXT,
    instructions_ar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. X-RAY MANAGEMENT
-- =====================================================

-- X-Ray Types reference
CREATE TABLE IF NOT EXISTS xray_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default X-ray types
INSERT INTO xray_types (name_en, name_ar) VALUES
    ('Periapical', 'أشعة ذروية'),
    ('Bitewing', 'أشعة جانبية'),
    ('Panoramic', 'أشعة بانورامية'),
    ('Occlusal', 'أشعة إطباقية'),
    ('Cephalometric', 'أشعة رأسية'),
    ('CBCT', 'أشعة مقطعية ثلاثية الأبعاد')
ON CONFLICT DO NOTHING;

-- X-Ray images
CREATE TABLE IF NOT EXISTS xrays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    xray_type_id UUID REFERENCES xray_types(id) ON DELETE SET NULL,
    tooth_number VARCHAR(10),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title VARCHAR(255),
    notes TEXT,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    captured_by UUID REFERENCES users(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. CBCT MANAGEMENT
-- =====================================================

-- CBCT Scan Regions
CREATE TABLE IF NOT EXISTS cbct_scan_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default scan regions
INSERT INTO cbct_scan_regions (name_en, name_ar) VALUES
    ('Full Arch Upper', 'الفك العلوي الكامل'),
    ('Full Arch Lower', 'الفك السفلي الكامل'),
    ('Full Mouth', 'الفم الكامل'),
    ('Localized Area', 'منطقة محددة'),
    ('TMJ', 'المفصل الصدغي الفكي'),
    ('Sinus', 'الجيوب الأنفية'),
    ('Implant Site', 'موقع الزرع')
ON CONFLICT DO NOTHING;

-- CBCT Orders
CREATE TABLE IF NOT EXISTS cbct_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    requesting_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    scan_region_id UUID REFERENCES cbct_scan_regions(id) ON DELETE SET NULL,
    indication TEXT,
    clinical_notes TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    status VARCHAR(50) DEFAULT 'requested' CHECK (status IN ('requested', 'scheduled', 'completed', 'reported', 'cancelled')),
    scheduled_date DATE,
    scheduled_time TIME,
    completed_at TIMESTAMPTZ,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CBCT Scans (completed scans)
CREATE TABLE IF NOT EXISTS cbct_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES cbct_orders(id) ON DELETE CASCADE,
    scan_reference_id VARCHAR(100),
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scan_location TEXT,
    thumbnail_url TEXT,
    dicom_path TEXT,
    scan_parameters TEXT,
    notes TEXT,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CBCT Reports
CREATE TABLE IF NOT EXISTS cbct_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES cbct_scans(id) ON DELETE CASCADE,
    reporting_doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    findings TEXT,
    measurements TEXT,
    recommendations TEXT,
    report_pdf_url TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'amended')),
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. CONSENT FORMS
-- =====================================================

-- Consent Form Templates
CREATE TABLE IF NOT EXISTS consent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    procedure_type VARCHAR(100),
    content_en TEXT NOT NULL,
    content_ar TEXT,
    risks_en TEXT,
    risks_ar TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default consent templates
INSERT INTO consent_templates (name_en, name_ar, procedure_type, content_en, content_ar) VALUES
    ('General Treatment Consent', 'موافقة علاج عامة', 'general', 
     'I hereby consent to the dental treatment recommended by my dentist...', 
     'أوافق بموجب هذا على العلاج السني الموصى به من قبل طبيب أسناني...'),
    ('Extraction Consent', 'موافقة خلع', 'extraction',
     'I understand that extraction of teeth involves certain risks...', 
     'أفهم أن خلع الأسنان ينطوي على مخاطر معينة...'),
    ('Implant Consent', 'موافقة زراعة', 'implant',
     'I understand that dental implant surgery involves surgical procedures...', 
     'أفهم أن جراحة زراعة الأسنان تتضمن إجراءات جراحية...'),
    ('Root Canal Consent', 'موافقة علاج جذور', 'root_canal',
     'I understand that root canal treatment is a procedure to save a tooth...', 
     'أفهم أن علاج قناة الجذر هو إجراء لإنقاذ السن...'),
    ('Orthodontic Consent', 'موافقة تقويم', 'orthodontic',
     'I understand that orthodontic treatment involves wearing braces...', 
     'أفهم أن علاج تقويم الأسنان يتضمن ارتداء تقويم...'),
    ('Whitening Consent', 'موافقة تبييض', 'whitening',
     'I understand that teeth whitening may cause temporary sensitivity...', 
     'أفهم أن تبييض الأسنان قد يسبب حساسية مؤقتة...')
ON CONFLICT DO NOTHING;

-- Signed Consent Forms
CREATE TABLE IF NOT EXISTS consent_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES consent_templates(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL,
    custom_content TEXT,
    patient_signature TEXT NOT NULL,
    witness_signature TEXT,
    witness_name VARCHAR(255),
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. PROCEDURE NOTES
-- =====================================================

-- Procedure Note Templates
CREATE TABLE IF NOT EXISTS procedure_note_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    procedure_type VARCHAR(100),
    template_content TEXT,
    fields JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Procedure Notes
CREATE TABLE IF NOT EXISTS procedure_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL,
    treatment_plan_item_id UUID REFERENCES treatment_plan_items(id) ON DELETE SET NULL,
    template_id UUID REFERENCES procedure_note_templates(id) ON DELETE SET NULL,
    procedure_name VARCHAR(255) NOT NULL,
    teeth_involved VARCHAR(255),
    procedure_performed TEXT NOT NULL,
    materials_used TEXT,
    anesthesia_used VARCHAR(255),
    complications TEXT,
    post_op_instructions TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    notes TEXT,
    attachments JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. LAB ORDERS
-- =====================================================

-- Dental Labs
CREATE TABLE IF NOT EXISTS dental_labs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Order Types
CREATE TABLE IF NOT EXISTS lab_order_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    category VARCHAR(100),
    default_turnaround_days INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default lab order types
INSERT INTO lab_order_types (name_en, name_ar, category, default_turnaround_days) VALUES
    ('Crown - PFM', 'تاج - بورسلين على معدن', 'crown', 7),
    ('Crown - Zirconia', 'تاج - زيركون', 'crown', 7),
    ('Crown - E-Max', 'تاج - إي ماكس', 'crown', 7),
    ('Bridge - PFM', 'جسر - بورسلين على معدن', 'bridge', 10),
    ('Bridge - Zirconia', 'جسر - زيركون', 'bridge', 10),
    ('Full Denture Upper', 'طقم كامل علوي', 'denture', 14),
    ('Full Denture Lower', 'طقم كامل سفلي', 'denture', 14),
    ('Partial Denture', 'طقم جزئي', 'denture', 10),
    ('Nightguard', 'واقي ليلي', 'appliance', 5),
    ('Retainer', 'مثبت تقويم', 'appliance', 5),
    ('Implant Abutment', 'دعامة زرع', 'implant', 7),
    ('Implant Crown', 'تاج زرع', 'implant', 7),
    ('Veneer', 'قشرة', 'veneer', 7),
    ('Inlay/Onlay', 'حشوة مخبرية', 'restoration', 7)
ON CONFLICT DO NOTHING;

-- Lab Orders
CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    lab_id UUID REFERENCES dental_labs(id) ON DELETE SET NULL,
    order_type_id UUID REFERENCES lab_order_types(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE SET NULL,
    teeth_involved VARCHAR(255),
    shade VARCHAR(50),
    material VARCHAR(100),
    specifications TEXT,
    special_instructions TEXT,
    status VARCHAR(50) DEFAULT 'placed' CHECK (status IN ('placed', 'in_fabrication', 'ready', 'delivered', 'adjustment_needed', 'completed', 'cancelled')),
    due_date DATE,
    sent_date DATE,
    received_date DATE,
    cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_doctor ON treatment_plans(doctor_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON treatment_plans(status);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_plan ON treatment_plan_items(treatment_plan_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON prescription_items(prescription_id);

CREATE INDEX IF NOT EXISTS idx_xrays_patient ON xrays(patient_id);
CREATE INDEX IF NOT EXISTS idx_xrays_type ON xrays(xray_type_id);

CREATE INDEX IF NOT EXISTS idx_cbct_orders_patient ON cbct_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_cbct_orders_status ON cbct_orders(status);
CREATE INDEX IF NOT EXISTS idx_cbct_scans_order ON cbct_scans(order_id);

CREATE INDEX IF NOT EXISTS idx_consent_forms_patient ON consent_forms(patient_id);

CREATE INDEX IF NOT EXISTS idx_procedure_notes_patient ON procedure_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedure_notes_appointment ON procedure_notes(appointment_id);

CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_orders_lab ON lab_orders(lab_id);

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Auto-update updated_at for Phase 2 tables
CREATE OR REPLACE FUNCTION update_phase2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'treatment_plans', 'treatment_plan_items', 'medications', 'prescriptions',
        'xrays', 'cbct_orders', 'cbct_reports', 'consent_templates',
        'procedure_note_templates', 'procedure_notes', 'dental_labs', 'lab_orders'
    ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION update_phase2_updated_at();
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;

-- =====================================================
-- 10. AUTO-GENERATE ORDER NUMBERS
-- =====================================================

-- Prescription number sequence
CREATE SEQUENCE IF NOT EXISTS prescription_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_prescription_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.prescription_number IS NULL THEN
        NEW.prescription_number := 'RX-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('prescription_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_prescription_number
    BEFORE INSERT ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION generate_prescription_number();

-- CBCT order number sequence
CREATE SEQUENCE IF NOT EXISTS cbct_order_number_seq START 100;

CREATE OR REPLACE FUNCTION generate_cbct_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'CBCT-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('cbct_order_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_cbct_order_number
    BEFORE INSERT ON cbct_orders
    FOR EACH ROW EXECUTE FUNCTION generate_cbct_order_number();

-- Lab order number sequence
CREATE SEQUENCE IF NOT EXISTS lab_order_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_lab_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'LAB-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('lab_order_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_lab_order_number
    BEFORE INSERT ON lab_orders
    FOR EACH ROW EXECUTE FUNCTION generate_lab_order_number();

-- =====================================================
-- 11. RLS POLICIES
-- =====================================================

-- Enable RLS on all Phase 2 tables
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE xray_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE xrays ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbct_scan_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbct_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbct_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbct_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_order_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;

-- Staff can view all clinical data
CREATE POLICY "Staff can view treatment plans" ON treatment_plans FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage treatment plans" ON treatment_plans FOR ALL USING (is_staff());

CREATE POLICY "Staff can view treatment plan items" ON treatment_plan_items FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage treatment plan items" ON treatment_plan_items FOR ALL USING (is_staff());

CREATE POLICY "Everyone can view medications" ON medications FOR SELECT USING (true);
CREATE POLICY "Admin can manage medications" ON medications FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Staff can view prescriptions" ON prescriptions FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage prescriptions" ON prescriptions FOR ALL USING (is_staff());

CREATE POLICY "Staff can view prescription items" ON prescription_items FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage prescription items" ON prescription_items FOR ALL USING (is_staff());

CREATE POLICY "Everyone can view xray types" ON xray_types FOR SELECT USING (true);
CREATE POLICY "Admin can manage xray types" ON xray_types FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Staff can view xrays" ON xrays FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage xrays" ON xrays FOR ALL USING (is_staff());

CREATE POLICY "Everyone can view cbct scan regions" ON cbct_scan_regions FOR SELECT USING (true);
CREATE POLICY "Admin can manage cbct scan regions" ON cbct_scan_regions FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Staff can view cbct orders" ON cbct_orders FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage cbct orders" ON cbct_orders FOR ALL USING (is_staff());

CREATE POLICY "Staff can view cbct scans" ON cbct_scans FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage cbct scans" ON cbct_scans FOR ALL USING (is_staff());

CREATE POLICY "Staff can view cbct reports" ON cbct_reports FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage cbct reports" ON cbct_reports FOR ALL USING (is_staff());

CREATE POLICY "Everyone can view consent templates" ON consent_templates FOR SELECT USING (true);
CREATE POLICY "Admin can manage consent templates" ON consent_templates FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Staff can view consent forms" ON consent_forms FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage consent forms" ON consent_forms FOR ALL USING (is_staff());

CREATE POLICY "Everyone can view procedure note templates" ON procedure_note_templates FOR SELECT USING (true);
CREATE POLICY "Admin can manage procedure note templates" ON procedure_note_templates FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Staff can view procedure notes" ON procedure_notes FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage procedure notes" ON procedure_notes FOR ALL USING (is_staff());

CREATE POLICY "Staff can view dental labs" ON dental_labs FOR SELECT USING (is_staff());
CREATE POLICY "Admin can manage dental labs" ON dental_labs FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Everyone can view lab order types" ON lab_order_types FOR SELECT USING (true);
CREATE POLICY "Admin can manage lab order types" ON lab_order_types FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Staff can view lab orders" ON lab_orders FOR SELECT USING (is_staff());
CREATE POLICY "Staff can manage lab orders" ON lab_orders FOR ALL USING (is_staff());

-- =====================================================
-- PHASE 2 MIGRATION COMPLETE
-- =====================================================
