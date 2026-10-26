-- Migration 066: SaaS Platform Billing Invoices
-- Creates tables for platform-level invoicing of tenants

-- ============================================
-- SAAS INVOICES TABLE
-- ============================================
-- Invoices sent by the platform to tenants for their subscriptions
CREATE TABLE IF NOT EXISTS saas_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Invoice identification
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Invoice details
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded')),
    
    -- Billing period
    billing_period_start DATE,
    billing_period_end DATE,
    
    -- Amounts (in USD for platform billing)
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Currency
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- Dates
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    
    -- Payment info
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    
    -- Notes
    notes TEXT,
    internal_notes TEXT,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SAAS INVOICE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS saas_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES saas_invoices(id) ON DELETE CASCADE,
    
    -- Item details
    description VARCHAR(500) NOT NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'subscription' CHECK (item_type IN ('subscription', 'module', 'addon', 'overage', 'credit', 'discount', 'other')),
    
    -- Reference to what was billed
    module_id UUID REFERENCES modules(id),
    plan_id UUID REFERENCES subscription_plans(id),
    
    -- Amounts
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Period for this item
    period_start DATE,
    period_end DATE,
    
    -- Ordering
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- SAAS PAYMENT HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS saas_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES saas_invoices(id) ON DELETE SET NULL,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    
    -- External references
    stripe_payment_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    transaction_id VARCHAR(255),
    
    -- Card/payment details (last 4 digits, etc.)
    payment_details JSONB,
    
    -- Notes
    notes TEXT,
    failure_reason TEXT,
    
    -- Timestamps
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_saas_invoices_tenant ON saas_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_status ON saas_invoices(status);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_due_date ON saas_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_issue_date ON saas_invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_saas_invoices_number ON saas_invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_saas_invoice_items_invoice ON saas_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_saas_invoice_items_type ON saas_invoice_items(item_type);

CREATE INDEX IF NOT EXISTS idx_saas_payments_tenant ON saas_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_invoice ON saas_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_status ON saas_payments(status);
CREATE INDEX IF NOT EXISTS idx_saas_payments_created ON saas_payments(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS trigger_saas_invoices_updated_at ON saas_invoices;
CREATE TRIGGER trigger_saas_invoices_updated_at
    BEFORE UPDATE ON saas_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: Generate invoice number
-- ============================================
CREATE OR REPLACE FUNCTION generate_saas_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month TEXT;
    seq_num INTEGER;
BEGIN
    year_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');
    
    -- Get next sequence number for this month
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(invoice_number FROM 'INV-' || year_month || '-(\d+)') AS INTEGER)
    ), 0) + 1 INTO seq_num
    FROM saas_invoices
    WHERE invoice_number LIKE 'INV-' || year_month || '-%';
    
    NEW.invoice_number := 'INV-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_saas_invoice_number ON saas_invoices;
CREATE TRIGGER trigger_saas_invoice_number
    BEFORE INSERT ON saas_invoices
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
    EXECUTE FUNCTION generate_saas_invoice_number();

-- ============================================
-- FUNCTION: Update invoice total
-- ============================================
CREATE OR REPLACE FUNCTION update_saas_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE saas_invoices
    SET 
        subtotal = (SELECT COALESCE(SUM(total), 0) FROM saas_invoice_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
        total = (SELECT COALESCE(SUM(total), 0) FROM saas_invoice_items WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)) 
               + COALESCE(saas_invoices.tax_amount, 0) 
               - COALESCE(saas_invoices.discount_amount, 0)
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_saas_invoice_item_total ON saas_invoice_items;
CREATE TRIGGER trigger_saas_invoice_item_total
    AFTER INSERT OR UPDATE OR DELETE ON saas_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_saas_invoice_total();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE saas_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_payments ENABLE ROW LEVEL SECURITY;

-- Developers can manage all invoices
DROP POLICY IF EXISTS saas_invoices_developer_all ON saas_invoices;
CREATE POLICY saas_invoices_developer_all ON saas_invoices
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
    );

-- Tenant admins can view their own invoices
DROP POLICY IF EXISTS saas_invoices_tenant_select ON saas_invoices;
CREATE POLICY saas_invoices_tenant_select ON saas_invoices
    FOR SELECT
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tu.tenant_id FROM tenant_users tu 
            WHERE tu.user_id = auth.uid() AND tu.role = 'admin'
        )
    );

-- Invoice items follow invoice visibility
DROP POLICY IF EXISTS saas_invoice_items_developer_all ON saas_invoice_items;
CREATE POLICY saas_invoice_items_developer_all ON saas_invoice_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
    );

DROP POLICY IF EXISTS saas_invoice_items_tenant_select ON saas_invoice_items;
CREATE POLICY saas_invoice_items_tenant_select ON saas_invoice_items
    FOR SELECT
    TO authenticated
    USING (
        invoice_id IN (
            SELECT si.id FROM saas_invoices si
            JOIN tenant_users tu ON tu.tenant_id = si.tenant_id
            WHERE tu.user_id = auth.uid() AND tu.role = 'admin'
        )
    );

-- Payments RLS
DROP POLICY IF EXISTS saas_payments_developer_all ON saas_payments;
CREATE POLICY saas_payments_developer_all ON saas_payments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
    );

DROP POLICY IF EXISTS saas_payments_tenant_select ON saas_payments;
CREATE POLICY saas_payments_tenant_select ON saas_payments
    FOR SELECT
    TO authenticated
    USING (
        tenant_id IN (
            SELECT tu.tenant_id FROM tenant_users tu 
            WHERE tu.user_id = auth.uid() AND tu.role = 'admin'
        )
    );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE saas_invoices IS 'Platform invoices sent to tenants for subscriptions and services';
COMMENT ON TABLE saas_invoice_items IS 'Line items for platform invoices';
COMMENT ON TABLE saas_payments IS 'Payment history for platform invoices';
COMMENT ON COLUMN saas_invoices.invoice_number IS 'Auto-generated unique invoice number';
COMMENT ON COLUMN saas_invoices.status IS 'draft=editable, pending=sent, paid=completed, overdue=past due, cancelled=voided, refunded=money returned';
