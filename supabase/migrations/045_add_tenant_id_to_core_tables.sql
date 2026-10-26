-- =====================================================
-- MIGRATION 045: Add tenant_id to Core Tables
-- =====================================================
-- This migration adds tenant isolation to all core clinic
-- tables, enabling true multi-tenancy where each clinic
-- only sees their own data.
-- =====================================================

-- ===========================================
-- 1. ADD TENANT_ID TO CORE TABLES
-- ===========================================

-- =========== SCHEDULING ===========
-- Branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Walk-in Queue
DO $$ BEGIN ALTER TABLE walk_in_queue ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE walkin_queue ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Schedule Management
DO $$ BEGIN ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE schedule_exceptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE staff_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- =========== PEOPLE ===========
-- Users (clinic staff)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Doctors
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- =========== CLINICAL ===========
-- Treatment Plans
DO $$ BEGIN ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE treatment_plan_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Treatments
DO $$ BEGIN ALTER TABLE treatments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Procedure Notes
DO $$ BEGIN ALTER TABLE procedure_notes ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE procedure_note_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Prescriptions
DO $$ BEGIN ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE prescription_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE medications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- X-Rays
DO $$ BEGIN ALTER TABLE xrays ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE xray_types ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- CBCT Scans
DO $$ BEGIN ALTER TABLE cbct_scans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE cbct_orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE cbct_reports ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE cbct_scan_regions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Lab Orders
DO $$ BEGIN ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE lab_order_types ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE dental_labs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Consent Forms
DO $$ BEGIN ALTER TABLE consent_forms ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE consent_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Dental Charts
DO $$ BEGIN ALTER TABLE dental_charts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE dental_chart_history ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Medical History
DO $$ BEGIN ALTER TABLE patient_medical_history ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE medical_history ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE patient_allergies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- =========== FINANCE ===========
-- Invoices
DO $$ BEGIN ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Payments
DO $$ BEGIN ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Installment Plans
DO $$ BEGIN ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE installment_payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Insurance
DO $$ BEGIN ALTER TABLE insurance_companies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE insurance_claims ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE patient_insurance ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Commissions
DO $$ BEGIN ALTER TABLE doctor_commissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE commission_payouts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Daily Reconciliation
DO $$ BEGIN ALTER TABLE daily_reconciliation ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- =========== INVENTORY ===========
-- Inventory Items
DO $$ BEGIN ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE inventory_categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE inventory_stock ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Material Usage
DO $$ BEGIN ALTER TABLE procedure_material_usage ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE service_materials ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE procedure_template_materials ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Suppliers & Purchase Orders
DO $$ BEGIN ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- =========== FACILITIES ===========
-- Chairs
DO $$ BEGIN ALTER TABLE chairs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- =========== SERVICES ===========
-- Services
DO $$ BEGIN ALTER TABLE services ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Appointment Types
DO $$ BEGIN ALTER TABLE appointment_types ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- =========== WEBSITE CONTENT ===========
-- Site Settings
DO $$ BEGIN ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Tourism Packages
DO $$ BEGIN ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Portfolio
DO $$ BEGIN ALTER TABLE portfolio_cases ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Testimonials
DO $$ BEGIN ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Team Members (Website)
DO $$ BEGIN ALTER TABLE team_members ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Translations
DO $$ BEGIN ALTER TABLE translations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Media Library
DO $$ BEGIN ALTER TABLE media ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- =========== NOTIFICATIONS ===========
DO $$ BEGIN ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notification_queue ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- =========== SETTINGS ===========
-- Role Permissions
DO $$ BEGIN ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- =========== HR / ATTENDANCE ===========
DO $$ BEGIN ALTER TABLE time_attendance ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- =========== AUDIT & LOGS ===========
DO $$ BEGIN ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE login_history ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ===========================================
-- 2. CREATE INDEXES FOR TENANT FILTERING
-- ===========================================

-- Core tables (always exist)
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doctors_tenant ON doctors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_tenant ON patients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);

-- Optional table indexes (skip if table doesn't exist)
-- Scheduling
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_walk_in_queue_tenant ON walk_in_queue(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_doctor_schedules_tenant ON doctor_schedules(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_tenant ON schedule_exceptions(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_staff_schedules_tenant ON staff_schedules(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_shift_templates_tenant ON shift_templates(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Clinical
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_treatments_tenant ON treatments(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_treatment_plans_tenant ON treatment_plans(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_procedure_notes_tenant ON procedure_notes(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant ON prescriptions(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_xrays_tenant ON xrays(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_cbct_scans_tenant ON cbct_scans(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_cbct_orders_tenant ON cbct_orders(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_lab_orders_tenant ON lab_orders(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_consent_forms_tenant ON consent_forms(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_dental_charts_tenant ON dental_charts(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_medical_history_tenant ON medical_history(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Finance
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant ON invoice_items(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_installment_plans_tenant ON installment_plans(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_installment_payments_tenant ON installment_payments(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_insurance_claims_tenant ON insurance_claims(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_doctor_commissions_tenant ON doctor_commissions(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Inventory
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant ON inventory_items(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_inventory_stock_tenant ON inventory_stock(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant ON inventory_movements(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_procedure_material_usage_tenant ON procedure_material_usage(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Facilities
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_chairs_tenant ON chairs(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Services
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_service_categories_tenant ON service_categories(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_appointment_types_tenant ON appointment_types(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Website Content
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_site_settings_tenant ON site_settings(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_tourism_packages_tenant ON tourism_packages(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_portfolio_cases_tenant ON portfolio_cases(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_testimonials_tenant ON testimonials(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON team_members(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_media_tenant ON media(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Notifications
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant ON notification_templates(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Settings
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant ON role_permissions(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- HR
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_time_attendance_tenant ON time_attendance(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant ON leave_requests(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Audit
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ===========================================
-- 3. FUNCTION TO GET CURRENT TENANT FROM JWT
-- ===========================================
-- This reads the tenant_id from the user's JWT token or tenant_users

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    -- First try: get from JWT claim
    (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid,
    -- Second try: get from user's active tenant_users record
    (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid() 
        AND tu.status = 'active'
      ORDER BY tu.last_active_at DESC NULLS LAST
      LIMIT 1
    )
  );
$$;

-- ===========================================
-- 4. RLS POLICIES FOR TENANT ISOLATION
-- ===========================================

-- Enable RLS on core tables (only tables that exist)
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on all optional tables dynamically
DO $$ 
DECLARE
    optional_tables TEXT[] := ARRAY[
        -- Scheduling
        'walk_in_queue', 'doctor_schedules', 'schedule_exceptions', 'staff_schedules', 'shift_templates',
        -- Clinical
        'treatments', 'treatment_plans', 'treatment_plan_items', 'procedure_notes', 'procedure_note_templates',
        'prescriptions', 'prescription_items', 'medications',
        'xrays', 'xray_types', 'cbct_scans', 'cbct_orders', 'cbct_reports', 'cbct_scan_regions',
        'lab_orders', 'lab_order_types', 'dental_labs',
        'consent_forms', 'consent_templates',
        'dental_charts', 'dental_chart_history',
        'patient_medical_history', 'medical_history', 'patient_allergies',
        -- Finance
        'invoices', 'invoice_items', 'payments',
        'installment_plans', 'installment_payments',
        'insurance_companies', 'insurance_claims', 'patient_insurance',
        'doctor_commissions', 'commission_payouts', 'daily_reconciliation',
        -- Inventory
        'inventory_items', 'inventory_categories', 'inventory_stock', 'inventory_movements',
        'procedure_material_usage', 'service_materials', 'procedure_template_materials',
        'suppliers', 'purchase_orders', 'purchase_order_items',
        -- Facilities
        'chairs',
        -- Services
        'services', 'service_categories', 'appointment_types',
        -- Website
        'site_settings', 'tourism_packages', 'portfolio_cases', 'testimonials', 'team_members', 'translations', 'media',
        -- Notifications
        'notifications', 'notification_templates', 'notification_queue', 'notification_logs',
        -- Settings
        'role_permissions',
        -- HR
        'time_attendance', 'leave_requests', 'leave_types', 'leave_balances',
        -- Audit
        'audit_logs', 'login_history', 'user_activity_log'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY optional_tables LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXCEPTION WHEN undefined_table THEN 
            -- Table doesn't exist, skip
            NULL;
        END;
    END LOOP;
END $$;

-- Drop existing tenant policies if they conflict
DO $$ 
DECLARE
    all_tables TEXT[] := ARRAY[
        'branches', 'users', 'doctors', 'patients', 'appointments',
        'walk_in_queue', 'doctor_schedules', 'schedule_exceptions', 'staff_schedules', 'shift_templates',
        'treatments', 'treatment_plans', 'treatment_plan_items', 'procedure_notes',
        'prescriptions', 'xrays', 'cbct_scans', 'cbct_orders', 'lab_orders',
        'consent_forms', 'dental_charts', 'medical_history',
        'invoices', 'invoice_items', 'payments',
        'installment_plans', 'installment_payments', 'insurance_claims', 'doctor_commissions',
        'inventory_items', 'inventory_stock', 'inventory_movements', 'procedure_material_usage',
        'chairs', 'services', 'service_categories', 'appointment_types',
        'site_settings', 'tourism_packages', 'portfolio_cases', 'testimonials', 'team_members', 'media',
        'notifications', 'notification_templates', 'role_permissions',
        'time_attendance', 'leave_requests', 'audit_logs'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY all_tables LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%s ON %I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS tenant_insert_%s ON %I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS tenant_update_%s ON %I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS tenant_delete_%s ON %I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS service_role_all_%s ON %I', t, t);
        EXCEPTION WHEN undefined_table THEN 
            NULL;
        END;
    END LOOP;
END $$;

-- Create tenant isolation policies dynamically for ALL tables with tenant_id
DO $$ 
DECLARE
    all_tables TEXT[] := ARRAY[
        'branches', 'users', 'doctors', 'patients', 'appointments',
        'walk_in_queue', 'doctor_schedules', 'schedule_exceptions', 'staff_schedules', 'shift_templates',
        'treatments', 'treatment_plans', 'treatment_plan_items', 'procedure_notes', 'procedure_note_templates',
        'prescriptions', 'prescription_items', 'medications',
        'xrays', 'xray_types', 'cbct_scans', 'cbct_orders', 'cbct_reports',
        'lab_orders', 'lab_order_types', 'dental_labs',
        'consent_forms', 'consent_templates',
        'dental_charts', 'dental_chart_history',
        'patient_medical_history', 'medical_history', 'patient_allergies',
        'invoices', 'invoice_items', 'payments',
        'installment_plans', 'installment_payments',
        'insurance_companies', 'insurance_claims', 'patient_insurance',
        'doctor_commissions', 'commission_payouts', 'daily_reconciliation',
        'inventory_items', 'inventory_categories', 'inventory_stock', 'inventory_movements',
        'procedure_material_usage', 'service_materials',
        'suppliers', 'purchase_orders', 'purchase_order_items',
        'chairs',
        'services', 'service_categories', 'appointment_types',
        'site_settings', 'tourism_packages', 'portfolio_cases', 'testimonials', 'team_members', 'translations', 'media',
        'notifications', 'notification_templates', 'notification_queue', 'notification_logs',
        'role_permissions',
        'time_attendance', 'leave_requests', 'leave_types', 'leave_balances',
        'audit_logs', 'login_history', 'user_activity_log'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY all_tables LOOP
        BEGIN
            -- SELECT policy - tenant can see their own data + shared (NULL tenant_id)
            EXECUTE format(
                'CREATE POLICY tenant_isolation_%s ON %I FOR SELECT USING (tenant_id = public.current_tenant_id() OR tenant_id IS NULL)',
                t, t
            );
            
            -- INSERT policy - must match tenant
            EXECUTE format(
                'CREATE POLICY tenant_insert_%s ON %I FOR INSERT WITH CHECK (tenant_id = public.current_tenant_id() OR tenant_id IS NULL)',
                t, t
            );
            
            -- UPDATE policy
            EXECUTE format(
                'CREATE POLICY tenant_update_%s ON %I FOR UPDATE USING (tenant_id = public.current_tenant_id())',
                t, t
            );
            
            -- DELETE policy
            EXECUTE format(
                'CREATE POLICY tenant_delete_%s ON %I FOR DELETE USING (tenant_id = public.current_tenant_id())',
                t, t
            );
            
            -- Service role bypass
            EXECUTE format(
                'CREATE POLICY service_role_all_%s ON %I TO service_role USING (true) WITH CHECK (true)',
                t, t
            );
        EXCEPTION WHEN undefined_table THEN 
            -- Table doesn't exist, skip
            NULL;
        WHEN duplicate_object THEN
            -- Policy already exists, skip
            NULL;
        END;
    END LOOP;
END $$;

-- ===========================================
-- 5. TRIGGER TO AUTO-SET TENANT_ID ON INSERT
-- ===========================================

CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := public.current_tenant_id();
    END IF;
    RETURN NEW;
END;
$$;

-- Apply trigger to ALL tables with tenant_id dynamically
DO $$ 
DECLARE
    all_tables TEXT[] := ARRAY[
        'branches', 'users', 'doctors', 'patients', 'appointments',
        'walk_in_queue', 'doctor_schedules', 'schedule_exceptions', 'staff_schedules', 'shift_templates',
        'treatments', 'treatment_plans', 'treatment_plan_items', 'procedure_notes', 'procedure_note_templates',
        'prescriptions', 'prescription_items', 'medications',
        'xrays', 'xray_types', 'cbct_scans', 'cbct_orders', 'cbct_reports',
        'lab_orders', 'lab_order_types', 'dental_labs',
        'consent_forms', 'consent_templates',
        'dental_charts', 'dental_chart_history',
        'patient_medical_history', 'medical_history', 'patient_allergies',
        'invoices', 'invoice_items', 'payments',
        'installment_plans', 'installment_payments',
        'insurance_companies', 'insurance_claims', 'patient_insurance',
        'doctor_commissions', 'commission_payouts', 'daily_reconciliation',
        'inventory_items', 'inventory_categories', 'inventory_stock', 'inventory_movements',
        'procedure_material_usage', 'service_materials',
        'suppliers', 'purchase_orders', 'purchase_order_items',
        'chairs',
        'services', 'service_categories', 'appointment_types',
        'site_settings', 'tourism_packages', 'portfolio_cases', 'testimonials', 'team_members', 'translations', 'media',
        'notifications', 'notification_templates', 'notification_queue', 'notification_logs',
        'role_permissions',
        'time_attendance', 'leave_requests', 'leave_types', 'leave_balances',
        'audit_logs', 'login_history', 'user_activity_log'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY all_tables LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id_%s ON %I', t, t);
            EXECUTE format('CREATE TRIGGER set_tenant_id_%s BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION set_tenant_id()', t, t);
        EXCEPTION WHEN undefined_table THEN 
            -- Table doesn't exist, skip
            NULL;
        END;
    END LOOP;
END $$;

-- ===========================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON FUNCTION public.current_tenant_id() IS 'Returns the current tenant ID from JWT or tenant_users table';
COMMENT ON FUNCTION set_tenant_id() IS 'Trigger function to auto-set tenant_id on INSERT';

DO $$ BEGIN COMMENT ON COLUMN patients.tenant_id IS 'Tenant this patient belongs to - enables multi-clinic isolation'; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN COMMENT ON COLUMN appointments.tenant_id IS 'Tenant this appointment belongs to'; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN COMMENT ON COLUMN doctors.tenant_id IS 'Tenant this doctor works for'; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN COMMENT ON COLUMN invoices.tenant_id IS 'Tenant this invoice belongs to'; EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN COMMENT ON COLUMN inventory_items.tenant_id IS 'Tenant this inventory item belongs to'; EXCEPTION WHEN undefined_column THEN NULL; END $$;
