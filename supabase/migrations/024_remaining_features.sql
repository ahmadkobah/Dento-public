-- =====================================================
-- Phase 1 & 3 Remaining Features Migration
-- Created: January 30, 2026
-- Description: Commission system, Installments, Insurance,
--              Inventory, Staff scheduling, Family linking,
--              Waitlist, Recurring appointments
-- =====================================================

-- =====================================================
-- 1. COMMISSION SYSTEM
-- =====================================================

-- Commission Records table (track individual commissions)
CREATE TABLE IF NOT EXISTS doctor_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    procedure_name VARCHAR(255),
    procedure_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    paid_at TIMESTAMPTZ,
    payment_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_doctor ON doctor_commissions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON doctor_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_created ON doctor_commissions(created_at);

-- Commission payout records
CREATE TABLE IF NOT EXISTS commission_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    payout_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to calculate and record commission
CREATE OR REPLACE FUNCTION calculate_commission(
    p_appointment_id UUID,
    p_invoice_id UUID DEFAULT NULL
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_doctor_id UUID;
    v_commission_rate DECIMAL(5,2);
    v_amount DECIMAL(10,2);
    v_commission DECIMAL(10,2);
BEGIN
    -- Get appointment details
    SELECT a.doctor_id, d.commission_rate, COALESCE(a.total_amount, 0)
    INTO v_doctor_id, v_commission_rate, v_amount
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.id = p_appointment_id;
    
    IF v_doctor_id IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate commission
    v_commission := v_amount * (COALESCE(v_commission_rate, 30) / 100);
    
    -- Insert commission record
    INSERT INTO doctor_commissions (
        doctor_id, appointment_id, invoice_id, 
        procedure_amount, commission_rate, commission_amount
    ) VALUES (
        v_doctor_id, p_appointment_id, p_invoice_id,
        v_amount, COALESCE(v_commission_rate, 30), v_commission
    );
    
    RETURN v_commission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. INSTALLMENT PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2) DEFAULT 0,
    remaining_amount DECIMAL(10,2) NOT NULL,
    number_of_installments INT NOT NULL,
    installment_amount DECIMAL(10,2) NOT NULL,
    frequency VARCHAR(20) DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
    start_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled')),
    late_fee_percentage DECIMAL(5,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS installment_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_plan_id UUID NOT NULL REFERENCES installment_plans(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    late_fee DECIMAL(10,2) DEFAULT 0,
    payment_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'overdue', 'waived')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installments_patient ON installment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installment_plans(status);
CREATE INDEX IF NOT EXISTS idx_installment_payments_due ON installment_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_installment_payments_status ON installment_payments(status);

-- =====================================================
-- 3. INSURANCE CLAIMS
-- =====================================================

-- Insurance companies
CREATE TABLE IF NOT EXISTS insurance_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    code VARCHAR(50) UNIQUE,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    coverage_percentage DECIMAL(5,2) DEFAULT 80,
    max_coverage DECIMAL(10,2),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient insurance policies
CREATE TABLE IF NOT EXISTS patient_insurance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    insurance_company_id UUID NOT NULL REFERENCES insurance_companies(id) ON DELETE CASCADE,
    policy_number VARCHAR(100) NOT NULL,
    group_number VARCHAR(100),
    member_id VARCHAR(100),
    coverage_type VARCHAR(50) DEFAULT 'individual' CHECK (coverage_type IN ('individual', 'family')),
    coverage_percentage DECIMAL(5,2),
    max_coverage DECIMAL(10,2),
    deductible DECIMAL(10,2) DEFAULT 0,
    deductible_met DECIMAL(10,2) DEFAULT 0,
    effective_date DATE,
    expiry_date DATE,
    is_primary BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insurance claims
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(100) UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_insurance_id UUID NOT NULL REFERENCES patient_insurance(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    service_date DATE NOT NULL,
    procedure_codes TEXT[],
    diagnosis_codes TEXT[],
    total_amount DECIMAL(10,2) NOT NULL,
    claimed_amount DECIMAL(10,2) NOT NULL,
    approved_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2) DEFAULT 0,
    patient_responsibility DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending', 'under_review', 'approved', 'partially_approved', 'rejected', 'paid', 'appealed')),
    submission_date DATE,
    response_date DATE,
    rejection_reason TEXT,
    notes TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_patient ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_date ON insurance_claims(claim_date);

-- Generate claim number
CREATE OR REPLACE FUNCTION generate_claim_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(claim_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM insurance_claims
    WHERE claim_number LIKE 'CLM-%';
    
    NEW.claim_number := 'CLM-' || LPAD(next_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_claim_number ON insurance_claims;
CREATE TRIGGER set_claim_number
    BEFORE INSERT ON insurance_claims
    FOR EACH ROW
    WHEN (NEW.claim_number IS NULL)
    EXECUTE FUNCTION generate_claim_number();

-- =====================================================
-- 4. CASH RECONCILIATION
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    reconciliation_date DATE NOT NULL,
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(10,2),
    cash_received DECIMAL(10,2) DEFAULT 0,
    card_received DECIMAL(10,2) DEFAULT 0,
    bank_transfer_received DECIMAL(10,2) DEFAULT 0,
    other_received DECIMAL(10,2) DEFAULT 0,
    total_received DECIMAL(10,2) DEFAULT 0,
    expenses DECIMAL(10,2) DEFAULT 0,
    expected_balance DECIMAL(10,2),
    actual_balance DECIMAL(10,2),
    discrepancy DECIMAL(10,2),
    discrepancy_reason TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'approved')),
    closed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, reconciliation_date)
);

-- =====================================================
-- 5. INVENTORY MANAGEMENT
-- =====================================================

-- Item categories
CREATE TABLE IF NOT EXISTS inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    parent_id UUID REFERENCES inventory_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    category_id UUID REFERENCES inventory_categories(id),
    description TEXT,
    unit VARCHAR(50) DEFAULT 'piece', -- piece, box, pack, bottle, etc.
    unit_cost DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    reorder_level INT DEFAULT 10,
    reorder_quantity INT DEFAULT 50,
    is_consumable BOOLEAN DEFAULT true,
    requires_prescription BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock levels per branch
CREATE TABLE IF NOT EXISTS inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    reserved_quantity INT DEFAULT 0,
    available_quantity INT GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    last_counted_at TIMESTAMPTZ,
    last_counted_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, branch_id)
);

-- Stock movements (in/out transactions)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'expired', 'damaged', 'return')),
    quantity INT NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reference_type VARCHAR(50), -- invoice, purchase_order, transfer, etc.
    reference_id UUID,
    batch_number VARCHAR(100),
    expiry_date DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    tax_number VARCHAR(100),
    payment_terms VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'confirmed', 'shipped', 'received', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    received_quantity INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. STAFF SCHEDULING & ATTENDANCE
-- =====================================================

-- Shift templates
CREATE TABLE IF NOT EXISTS shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration INT DEFAULT 60, -- minutes
    color VARCHAR(20) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff schedules
CREATE TABLE IF NOT EXISTS staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    shift_template_id UUID REFERENCES shift_templates(id),
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME,
    break_end TIME,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'swapped', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, schedule_date)
);

-- Time attendance
CREATE TABLE IF NOT EXISTS time_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    break_start TIMESTAMPTZ,
    break_end TIMESTAMPTZ,
    scheduled_start TIME,
    scheduled_end TIME,
    actual_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    late_minutes INT DEFAULT 0,
    early_leave_minutes INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, attendance_date)
);

-- Leave types
CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    days_per_year INT DEFAULT 21,
    is_paid BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT true,
    color VARCHAR(20) DEFAULT '#F59E0B',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INT NOT NULL,
    entitled_days INT NOT NULL,
    used_days INT DEFAULT 0,
    remaining_days INT GENERATED ALWAYS AS (entitled_days - used_days) STORED,
    carry_forward INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, leave_type_id, year)
);

-- =====================================================
-- 7. FAMILY MEMBER LINKING
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_family_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    related_patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL CHECK (relationship IN ('spouse', 'parent', 'child', 'sibling', 'grandparent', 'grandchild', 'other')),
    is_emergency_contact BOOLEAN DEFAULT false,
    is_financial_responsible BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, related_patient_id)
);

-- =====================================================
-- 8. WAITLIST MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS appointment_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    preferred_dates JSONB DEFAULT '[]'::jsonb, -- Array of preferred dates
    preferred_times JSONB DEFAULT '[]'::jsonb, -- Array of preferred time slots
    flexibility VARCHAR(50) DEFAULT 'flexible' CHECK (flexibility IN ('strict', 'flexible', 'any')),
    priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest
    notes TEXT,
    status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'scheduled', 'cancelled', 'expired')),
    contacted_at TIMESTAMPTZ,
    scheduled_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    expires_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_patient ON appointment_waitlist(patient_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON appointment_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_priority ON appointment_waitlist(priority);

-- =====================================================
-- 9. RECURRING APPOINTMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS recurring_appointment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    recurrence_type VARCHAR(50) NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'biannual', 'annual')),
    day_of_week INT, -- 0-6 for weekly
    day_of_month INT, -- 1-31 for monthly
    preferred_time TIME,
    duration INT DEFAULT 30, -- minutes
    start_date DATE NOT NULL,
    end_date DATE,
    max_occurrences INT,
    occurrences_created INT DEFAULT 0,
    auto_confirm BOOLEAN DEFAULT false,
    reminder_days INT DEFAULT 7,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link appointments to recurring rules
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS recurring_rule_id UUID REFERENCES recurring_appointment_rules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_patient ON recurring_appointment_rules(patient_id);
CREATE INDEX IF NOT EXISTS idx_recurring_status ON recurring_appointment_rules(status);

-- =====================================================
-- 10. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE doctor_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_family_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_appointment_rules ENABLE ROW LEVEL SECURITY;

-- Admin/Developer policies (full access)
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'doctor_commissions', 'commission_payouts', 'installment_plans', 'installment_payments',
        'insurance_companies', 'patient_insurance', 'insurance_claims', 'daily_reconciliation',
        'inventory_categories', 'inventory_items', 'inventory_stock', 'inventory_movements',
        'suppliers', 'purchase_orders', 'purchase_order_items', 'shift_templates',
        'staff_schedules', 'time_attendance', 'leave_types', 'leave_requests', 'leave_balances',
        'patient_family_links', 'appointment_waitlist', 'recurring_appointment_rules'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS admin_all_%I ON %I;
            CREATE POLICY admin_all_%I ON %I FOR ALL TO authenticated
            USING (
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN (''admin'', ''developer''))
            );
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;

-- Insert default leave types
INSERT INTO leave_types (name_en, name_ar, days_per_year, is_paid, color) VALUES
    ('Annual Leave', 'إجازة سنوية', 21, true, '#22C55E'),
    ('Sick Leave', 'إجازة مرضية', 14, true, '#EF4444'),
    ('Personal Leave', 'إجازة شخصية', 5, true, '#3B82F6'),
    ('Maternity Leave', 'إجازة أمومة', 90, true, '#EC4899'),
    ('Unpaid Leave', 'إجازة بدون راتب', 30, false, '#6B7280')
ON CONFLICT DO NOTHING;

-- Insert default shift templates
INSERT INTO shift_templates (name, start_time, end_time, break_duration, color) VALUES
    ('Morning Shift', '08:00', '16:00', 60, '#22C55E'),
    ('Evening Shift', '14:00', '22:00', 60, '#3B82F6'),
    ('Full Day', '09:00', '21:00', 90, '#8B5CF6'),
    ('Half Day Morning', '08:00', '14:00', 30, '#F59E0B'),
    ('Half Day Evening', '14:00', '20:00', 30, '#EC4899')
ON CONFLICT DO NOTHING;

-- Insert default inventory categories
INSERT INTO inventory_categories (name_en, name_ar) VALUES
    ('Dental Materials', 'مواد طب الأسنان'),
    ('Medications', 'الأدوية'),
    ('Consumables', 'المستهلكات'),
    ('Equipment', 'المعدات'),
    ('Office Supplies', 'مستلزمات المكتب'),
    ('PPE & Safety', 'معدات الحماية والسلامة')
ON CONFLICT DO NOTHING;

COMMIT;
