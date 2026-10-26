-- =====================================================
-- MIGRATION 040: SaaS Multi-Tenant Core Schema
-- =====================================================
-- This migration establishes the foundation for multi-tenant
-- SaaS architecture, enabling management of multiple clinic
-- instances from a centralized Developer Portal.
-- =====================================================

-- ===========================================
-- 1. SUBSCRIPTION PLANS TABLE
-- ===========================================
-- Defines available pricing tiers and their limits

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    description_en TEXT,
    description_ar TEXT,
    
    -- Pricing
    price_monthly_usd DECIMAL(10,2) DEFAULT 0,
    price_yearly_usd DECIMAL(10,2) DEFAULT 0,
    price_monthly_egp DECIMAL(10,2) DEFAULT 0,
    price_yearly_egp DECIMAL(10,2) DEFAULT 0,
    
    -- Limits
    max_users INTEGER,
    max_patients INTEGER,
    max_branches INTEGER,
    max_storage_gb INTEGER DEFAULT 5,
    
    -- Features
    included_modules UUID[] DEFAULT '{}',
    features JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 2. TENANTS TABLE (Clinic Instances)
-- ===========================================
-- Each row represents a clinic like "Canine Dental"

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    logo_url TEXT,
    favicon_url TEXT,
    
    -- Contact Information
    owner_name TEXT,
    owner_email TEXT NOT NULL,
    owner_phone TEXT,
    billing_email TEXT,
    support_email TEXT,
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country_code VARCHAR(3) DEFAULT 'EG',
    
    -- Status
    status TEXT DEFAULT 'trial' CHECK (status IN (
        'pending',      -- Awaiting setup
        'trial',        -- In trial period
        'active',       -- Paid and active
        'suspended',    -- Payment failed or violation
        'cancelled',    -- User cancelled
        'expired'       -- Trial/subscription expired
    )),
    
    -- Subscription
    subscription_plan_id UUID REFERENCES subscription_plans(id),
    subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN (
        'trialing', 'active', 'past_due', 'cancelled', 'unpaid'
    )),
    subscription_started_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    trial_started_at TIMESTAMPTZ DEFAULT NOW(),
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    
    -- Billing
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    next_billing_date TIMESTAMPTZ,
    
    -- Regional Settings
    timezone TEXT DEFAULT 'Africa/Cairo',
    currency_code VARCHAR(3) DEFAULT 'EGP',
    locale TEXT DEFAULT 'ar-EG',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    time_format TEXT DEFAULT '12h',
    
    -- Domain Configuration
    subdomain TEXT UNIQUE,
    custom_domain TEXT UNIQUE,
    domain_verified BOOLEAN DEFAULT false,
    ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN (
        'pending', 'provisioning', 'active', 'expired', 'failed'
    )),
    
    -- Branding
    primary_color TEXT DEFAULT '#10B981',
    secondary_color TEXT DEFAULT '#059669',
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    
    -- Feature Flags (tenant-specific overrides)
    feature_flags JSONB DEFAULT '{}',
    
    -- Usage Tracking
    current_users_count INTEGER DEFAULT 0,
    current_patients_count INTEGER DEFAULT 0,
    current_storage_bytes BIGINT DEFAULT 0,
    
    -- Metadata
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    last_login_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_subdomain CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'),
    CONSTRAINT valid_custom_domain CHECK (custom_domain ~ '^[a-z0-9]([a-z0-9-]*\.)*[a-z0-9]+\.[a-z]{2,}$' OR custom_domain IS NULL)
);

-- ===========================================
-- 3. TENANT USERS TABLE
-- ===========================================
-- Maps auth users to tenants with roles

CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role within tenant
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN (
        'owner',        -- Full control, billing access
        'admin',        -- Full control except billing
        'manager',      -- Manage users and settings
        'member',       -- Standard user
        'readonly'      -- View-only access
    )),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'pending',      -- Invited, not yet accepted
        'active',       -- Active user
        'suspended',    -- Temporarily disabled
        'removed'       -- Soft deleted
    )),
    
    -- Invitation
    invited_by UUID,
    invited_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    invitation_token TEXT UNIQUE,
    invitation_expires_at TIMESTAMPTZ,
    
    -- Permissions (granular overrides)
    permissions JSONB DEFAULT '{}',
    
    -- Activity
    last_active_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, user_id)
);

-- ===========================================
-- 4. MODULES TABLE
-- ===========================================
-- Available feature modules that can be licensed

CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    slug TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_ar TEXT,
    description_en TEXT,
    description_ar TEXT,
    
    -- Classification
    category TEXT NOT NULL CHECK (category IN (
        'core',         -- Essential features (scheduling, patients)
        'clinical',     -- Treatment plans, dental charts
        'financial',    -- Billing, invoices, payments
        'operations',   -- Inventory, HR, multi-branch
        'marketing',    -- Dental tourism, campaigns
        'integration',  -- API access, webhooks
        'advanced'      -- Analytics, white-label
    )),
    
    -- Pricing
    is_free BOOLEAN DEFAULT false,
    base_price_monthly DECIMAL(10,2) DEFAULT 0,
    base_price_yearly DECIMAL(10,2) DEFAULT 0,
    
    -- Requirements
    min_tier TEXT DEFAULT 'basic',
    depends_on UUID[],
    conflicts_with UUID[],
    
    -- Technical
    version TEXT DEFAULT '1.0.0',
    entry_point TEXT,
    routes JSONB DEFAULT '[]',
    permissions_required JSONB DEFAULT '[]',
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'development', 'beta', 'active', 'deprecated', 'retired'
    )),
    is_visible BOOLEAN DEFAULT true,
    
    -- Metadata
    icon TEXT,
    color TEXT,
    documentation_url TEXT,
    changelog JSONB DEFAULT '[]',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 5. TENANT MODULES TABLE
-- ===========================================
-- Module assignments per tenant (licensing)

CREATE TABLE IF NOT EXISTS tenant_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    
    -- License Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'trial',        -- Module in trial
        'active',       -- Licensed and active
        'inactive',     -- Manually disabled
        'expired',      -- License expired
        'suspended'     -- Suspended for violation
    )),
    
    -- License Details
    license_key TEXT UNIQUE,
    license_type TEXT DEFAULT 'subscription' CHECK (license_type IN (
        'included',     -- Included in plan
        'addon',        -- Purchased addon
        'trial',        -- Trial period
        'lifetime',     -- One-time purchase
        'subscription'  -- Monthly/yearly
    )),
    
    -- Dates
    enabled_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    
    -- Limits (overrides module defaults)
    max_users INTEGER,
    usage_limit INTEGER,
    current_usage INTEGER DEFAULT 0,
    
    -- Configuration
    settings JSONB DEFAULT '{}',
    
    -- Billing
    price_override DECIMAL(10,2),
    stripe_price_id TEXT,
    
    -- Audit
    enabled_by UUID,
    disabled_by UUID,
    disabled_at TIMESTAMPTZ,
    disable_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, module_id)
);

-- ===========================================
-- 6. TENANT USAGE METRICS TABLE
-- ===========================================
-- Daily usage tracking per tenant

CREATE TABLE IF NOT EXISTS tenant_usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Period
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- User Metrics
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    total_logins INTEGER DEFAULT 0,
    
    -- Patient Metrics
    new_patients INTEGER DEFAULT 0,
    total_patients INTEGER DEFAULT 0,
    
    -- Appointment Metrics
    appointments_created INTEGER DEFAULT 0,
    appointments_completed INTEGER DEFAULT 0,
    appointments_cancelled INTEGER DEFAULT 0,
    
    -- Financial Metrics
    invoices_created INTEGER DEFAULT 0,
    invoices_paid INTEGER DEFAULT 0,
    revenue_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Storage Metrics
    storage_used_bytes BIGINT DEFAULT 0,
    files_uploaded INTEGER DEFAULT 0,
    
    -- API Metrics
    api_calls INTEGER DEFAULT 0,
    api_errors INTEGER DEFAULT 0,
    
    -- Performance Metrics
    avg_response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, date)
);

-- ===========================================
-- 7. SAAS AUDIT TRAIL TABLE
-- ===========================================
-- Audit log for SaaS-level actions (not tenant actions)

CREATE TABLE IF NOT EXISTS saas_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Actor
    actor_id UUID,
    actor_email TEXT,
    actor_role TEXT,
    
    -- Target
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    
    -- Action
    action TEXT NOT NULL,
    description TEXT,
    
    -- Details
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    
    -- Result
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failure', 'partial')),
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 8. INDEXES
-- ===========================================

-- Tenants
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_plan ON tenants(subscription_plan_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);

-- Tenant Users
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_tenant_users_status ON tenant_users(status);

-- Modules
CREATE INDEX IF NOT EXISTS idx_modules_category ON modules(category);
CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);

-- Tenant Modules
CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant ON tenant_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_module ON tenant_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_status ON tenant_modules(status);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_expires ON tenant_modules(expires_at) WHERE expires_at IS NOT NULL;

-- Usage Metrics
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant_date ON tenant_usage_metrics(tenant_id, date DESC);

-- Audit Trail
CREATE INDEX IF NOT EXISTS idx_saas_audit_tenant ON saas_audit_trail(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_audit_actor ON saas_audit_trail(actor_id);
CREATE INDEX IF NOT EXISTS idx_saas_audit_action ON saas_audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_saas_audit_created ON saas_audit_trail(created_at DESC);

-- ===========================================
-- 9. TRIGGER FUNCTIONS
-- ===========================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_tenants_updated_at ON tenants;
CREATE TRIGGER trigger_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_saas_updated_at();

DROP TRIGGER IF EXISTS trigger_tenant_users_updated_at ON tenant_users;
CREATE TRIGGER trigger_tenant_users_updated_at
    BEFORE UPDATE ON tenant_users
    FOR EACH ROW EXECUTE FUNCTION update_saas_updated_at();

DROP TRIGGER IF EXISTS trigger_modules_updated_at ON modules;
CREATE TRIGGER trigger_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_saas_updated_at();

DROP TRIGGER IF EXISTS trigger_tenant_modules_updated_at ON tenant_modules;
CREATE TRIGGER trigger_tenant_modules_updated_at
    BEFORE UPDATE ON tenant_modules
    FOR EACH ROW EXECUTE FUNCTION update_saas_updated_at();

DROP TRIGGER IF EXISTS trigger_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER trigger_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_saas_updated_at();

-- ===========================================
-- 10. HELPER FUNCTIONS
-- ===========================================

-- Check if user is a SaaS developer/admin
CREATE OR REPLACE FUNCTION is_saas_developer()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' IN ('developer', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's tenant ID (for RLS)
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    SELECT tu.tenant_id INTO tenant_id
    FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
    AND tu.status = 'active'
    LIMIT 1;
    
    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if module is active for tenant
CREATE OR REPLACE FUNCTION is_module_active(p_tenant_id UUID, p_module_slug TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_modules tm
        JOIN modules m ON m.id = tm.module_id
        WHERE tm.tenant_id = p_tenant_id
        AND m.slug = p_module_slug
        AND tm.status = 'active'
        AND (tm.expires_at IS NULL OR tm.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check tenant usage limits
CREATE OR REPLACE FUNCTION check_tenant_limit(
    p_tenant_id UUID,
    p_limit_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    tenant_record RECORD;
    plan_record RECORD;
    result JSONB;
BEGIN
    SELECT t.*, sp.max_users, sp.max_patients, sp.max_branches, sp.max_storage_gb
    INTO tenant_record
    FROM tenants t
    LEFT JOIN subscription_plans sp ON sp.id = t.subscription_plan_id
    WHERE t.id = p_tenant_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Tenant not found');
    END IF;
    
    CASE p_limit_type
        WHEN 'users' THEN
            result := jsonb_build_object(
                'allowed', tenant_record.current_users_count < COALESCE(tenant_record.max_users, 999999),
                'current', tenant_record.current_users_count,
                'limit', tenant_record.max_users
            );
        WHEN 'patients' THEN
            result := jsonb_build_object(
                'allowed', tenant_record.current_patients_count < COALESCE(tenant_record.max_patients, 999999),
                'current', tenant_record.current_patients_count,
                'limit', tenant_record.max_patients
            );
        WHEN 'storage' THEN
            result := jsonb_build_object(
                'allowed', tenant_record.current_storage_bytes < (COALESCE(tenant_record.max_storage_gb, 5) * 1024 * 1024 * 1024),
                'current', tenant_record.current_storage_bytes,
                'limit', COALESCE(tenant_record.max_storage_gb, 5) * 1024 * 1024 * 1024
            );
        ELSE
            result := jsonb_build_object('allowed', true, 'reason', 'Unknown limit type');
    END CASE;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 11. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_audit_trail ENABLE ROW LEVEL SECURITY;

-- Subscription Plans: Public read, developer write
CREATE POLICY subscription_plans_select ON subscription_plans
    FOR SELECT USING (is_public = true OR is_saas_developer());
    
CREATE POLICY subscription_plans_all ON subscription_plans
    FOR ALL USING (is_saas_developer());

-- Tenants: Developers see all, users see their own
CREATE POLICY tenants_developer_all ON tenants
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY tenants_user_select ON tenants
    FOR SELECT USING (
        id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
    );

-- Tenant Users: Developers see all, admins see their tenant
CREATE POLICY tenant_users_developer_all ON tenant_users
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY tenant_users_tenant_admin ON tenant_users
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );
    
CREATE POLICY tenant_users_self ON tenant_users
    FOR SELECT USING (user_id = auth.uid());

-- Modules: Public read, developer write
CREATE POLICY modules_select ON modules
    FOR SELECT USING (is_visible = true OR is_saas_developer());
    
CREATE POLICY modules_all ON modules
    FOR ALL USING (is_saas_developer());

-- Tenant Modules: Developers see all, users see their tenant
CREATE POLICY tenant_modules_developer_all ON tenant_modules
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY tenant_modules_user_select ON tenant_modules
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND status = 'active')
    );

-- Usage Metrics: Developers see all, owners see their tenant
CREATE POLICY usage_metrics_developer_all ON tenant_usage_metrics
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY usage_metrics_owner_select ON tenant_usage_metrics
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );

-- Audit Trail: Developers only
CREATE POLICY saas_audit_developer_all ON saas_audit_trail
    FOR ALL USING (is_saas_developer());

-- ===========================================
-- 12. SEED DATA
-- ===========================================

-- Default Subscription Plans
INSERT INTO subscription_plans (slug, name_en, name_ar, description_en, price_monthly_usd, price_yearly_usd, price_monthly_egp, price_yearly_egp, max_users, max_patients, max_branches, max_storage_gb, sort_order) VALUES
    ('trial', 'Free Trial', 'تجربة مجانية', '14-day free trial with all features', 0, 0, 0, 0, 3, 100, 1, 1, 0),
    ('basic', 'Basic', 'أساسي', 'Perfect for small clinics', 49, 490, 1500, 15000, 5, 1000, 1, 5, 1),
    ('professional', 'Professional', 'احترافي', 'For growing practices', 149, 1490, 4500, 45000, 15, 5000, 3, 25, 2),
    ('enterprise', 'Enterprise', 'مؤسسي', 'For large organizations', 399, 3990, 12000, 120000, 50, 25000, 10, 100, 3),
    ('unlimited', 'Unlimited', 'غير محدود', 'No limits, full customization', 999, 9990, 30000, 300000, NULL, NULL, NULL, NULL, 4)
ON CONFLICT (slug) DO UPDATE SET
    price_monthly_usd = EXCLUDED.price_monthly_usd,
    price_yearly_usd = EXCLUDED.price_yearly_usd,
    price_monthly_egp = EXCLUDED.price_monthly_egp,
    price_yearly_egp = EXCLUDED.price_yearly_egp;

-- Default Modules
INSERT INTO modules (slug, name_en, name_ar, category, is_free, base_price_monthly, min_tier, description_en) VALUES
    ('core-scheduling', 'Appointment Scheduling', 'جدولة المواعيد', 'core', true, 0, 'basic', 'Core appointment and calendar management'),
    ('patient-records', 'Patient Records', 'سجلات المرضى', 'core', true, 0, 'basic', 'Patient demographics and medical history'),
    ('basic-billing', 'Basic Billing', 'الفوترة الأساسية', 'financial', true, 0, 'basic', 'Simple invoicing and payments'),
    ('dental-charting', 'Dental Charting', 'رسم الأسنان', 'clinical', false, 29, 'basic', 'Interactive dental charts and treatment planning'),
    ('inventory', 'Inventory Management', 'إدارة المخزون', 'operations', false, 39, 'professional', 'Stock management and supplier tracking'),
    ('dental-tourism', 'Dental Tourism', 'سياحة الأسنان', 'marketing', false, 49, 'professional', 'International patient management'),
    ('hr-management', 'HR & Payroll', 'الموارد البشرية', 'operations', false, 59, 'enterprise', 'Employee management and payroll'),
    ('multi-branch', 'Multi-Branch', 'متعدد الفروع', 'operations', false, 79, 'professional', 'Manage multiple clinic locations'),
    ('advanced-analytics', 'Advanced Analytics', 'تحليلات متقدمة', 'advanced', false, 49, 'enterprise', 'Detailed reports and insights'),
    ('api-access', 'API Access', 'واجهة برمجة التطبيقات', 'integration', false, 99, 'enterprise', 'REST API for custom integrations'),
    ('white-label', 'White Label', 'العلامة البيضاء', 'advanced', false, 199, 'unlimited', 'Custom branding and domain')
ON CONFLICT (slug) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    category = EXCLUDED.category,
    base_price_monthly = EXCLUDED.base_price_monthly;

-- Sample Tenant (Canine Dental)
INSERT INTO tenants (name, slug, display_name, owner_email, status, subdomain, country_code, currency_code, timezone) VALUES
    ('Canine Dental Clinic', 'canine-dental', 'Canine Dental', 'owner@caninedental.com', 'active', 'canine', 'EG', 'EGP', 'Africa/Cairo')
ON CONFLICT (slug) DO NOTHING;

-- Grant comment for documentation
COMMENT ON TABLE tenants IS 'Multi-tenant clinic instances - each row is a separate clinic (e.g., Canine Dental)';
COMMENT ON TABLE modules IS 'Available feature modules that can be licensed to tenants';
COMMENT ON TABLE tenant_modules IS 'Module license assignments per tenant';
COMMENT ON TABLE subscription_plans IS 'Pricing tiers with usage limits';
