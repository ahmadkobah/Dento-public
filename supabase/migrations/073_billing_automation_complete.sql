-- Migration 073: Complete Billing Automation
-- Implements: subscription expiry, auto-suspend, dunning, auto-invoice gen, Stripe sync
-- Date: 2026-02-14

-- ============================================
-- 1. SUBSCRIPTION EXPIRY HANDLING
-- ============================================
-- Handles tenants whose paid subscription has expired (subscription_ends_at passed)

CREATE OR REPLACE FUNCTION handle_subscription_expiry()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Mark active paid subscriptions as expired when subscription_ends_at has passed
  UPDATE tenants
  SET 
    subscription_status = 'expired',
    updated_at = NOW()
  WHERE 
    subscription_status = 'active'
    AND subscription_ends_at IS NOT NULL
    AND subscription_ends_at < NOW();

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  IF affected_count > 0 THEN
    INSERT INTO saas_audit_trail (
      action,
      resource_type,
      description,
      metadata,
      created_at
    ) VALUES (
      'auto_subscription_expiry',
      'tenant',
      'Auto-expired ' || affected_count || ' subscriptions',
      jsonb_build_object(
        'count', affected_count,
        'run_at', NOW()::text
      ),
      NOW()
    );
  END IF;

  RETURN affected_count;
END;
$$;

COMMENT ON FUNCTION handle_subscription_expiry() IS 'Marks active subscriptions as expired when subscription_ends_at has passed. Run daily via pg_cron.';

-- ============================================
-- 2. AUTO-SUSPEND FOR NON-PAYMENT
-- ============================================
-- Suspends tenants with overdue invoices past the grace period (14 days after due_date)

CREATE OR REPLACE FUNCTION auto_suspend_non_payment()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER;
  grace_period_days INTEGER := 14;
BEGIN
  -- Find tenants with overdue invoices past the grace period
  WITH overdue_tenants AS (
    SELECT DISTINCT tenant_id
    FROM saas_invoices
    WHERE status = 'overdue'
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE - grace_period_days
  )
  UPDATE tenants t
  SET 
    status = 'suspended',
    subscription_status = 'unpaid',
    updated_at = NOW()
  FROM overdue_tenants ot
  WHERE t.id = ot.tenant_id
    AND t.status = 'active';

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  IF affected_count > 0 THEN
    INSERT INTO saas_audit_trail (
      action,
      resource_type,
      description,
      metadata,
      created_at
    ) VALUES (
      'auto_suspend_non_payment',
      'tenant',
      'Auto-suspended ' || affected_count || ' tenants for non-payment',
      jsonb_build_object(
        'count', affected_count,
        'grace_period_days', grace_period_days,
        'run_at', NOW()::text
      ),
      NOW()
    );
  END IF;

  RETURN affected_count;
END;
$$;

COMMENT ON FUNCTION auto_suspend_non_payment() IS 'Suspends tenants with overdue invoices past the grace period (14 days). Run daily via pg_cron.';

-- ============================================
-- 3. DUNNING TRACKING TABLE
-- ============================================
-- Track dunning emails sent to avoid duplicate reminders

CREATE TABLE IF NOT EXISTS saas_dunning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES saas_invoices(id) ON DELETE CASCADE,
  dunning_level INTEGER NOT NULL DEFAULT 1,        -- 1=first reminder, 2=second, 3=final warning
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel VARCHAR(20) NOT NULL DEFAULT 'email',    -- email, sms, whatsapp
  status VARCHAR(20) NOT NULL DEFAULT 'sent',      -- sent, failed, bounced
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_dunning_log_tenant ON saas_dunning_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_dunning_log_invoice ON saas_dunning_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_saas_dunning_log_level ON saas_dunning_log(dunning_level, sent_at);

-- RLS
ALTER TABLE saas_dunning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can manage dunning logs" ON saas_dunning_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'developer'
    )
  );

CREATE POLICY "Tenants can view own dunning logs" ON saas_dunning_log
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE saas_dunning_log IS 'Tracks dunning/reminder emails sent for overdue invoices';

-- ============================================
-- 4. STRIPE PRODUCT SYNC TABLE
-- ============================================
-- Maps Stripe products/prices to internal plans and modules

CREATE TABLE IF NOT EXISTS saas_stripe_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL,                 -- 'plan' or 'module'
  entity_id UUID NOT NULL,                          -- FK to subscription_plans.id or modules.id
  stripe_product_id VARCHAR(255) NOT NULL,
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, archived, error
  stripe_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (entity_type, entity_id, currency)
);

CREATE INDEX IF NOT EXISTS idx_saas_stripe_products_entity ON saas_stripe_products(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_saas_stripe_products_stripe ON saas_stripe_products(stripe_product_id);

ALTER TABLE saas_stripe_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can manage stripe products" ON saas_stripe_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'developer'
    )
  );

COMMENT ON TABLE saas_stripe_products IS 'Maps internal plans/modules to Stripe products and prices';

-- ============================================
-- 5. AUTO MONTHLY INVOICE GENERATION FUNCTION
-- ============================================
-- Generates invoices for all active tenants whose next_billing_date has passed

CREATE OR REPLACE FUNCTION generate_monthly_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_record RECORD;
  inv_count INTEGER := 0;
  period_start DATE;
  period_end DATE;
  due_dt DATE;
  plan_price DECIMAL(10,2);
  module_price DECIMAL(10,2);
  subtotal DECIMAL(10,2);
  tax_rate_val DECIMAL(5,2);
  tax_amt DECIMAL(10,2);
  total_amt DECIMAL(10,2);
  new_invoice_id UUID;
  module_rec RECORD;
  is_yearly BOOLEAN;
BEGIN
  -- Current billing period
  period_start := date_trunc('month', CURRENT_DATE)::DATE;
  period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  due_dt := period_start + INTERVAL '15 days';

  FOR tenant_record IN
    SELECT t.*, sp.*,
           t.id AS tenant_id,
           t.currency_code AS t_currency,
           t.billing_cycle AS t_billing_cycle,
           sp.price_monthly_usd AS sp_price_monthly_usd,
           sp.price_yearly_usd AS sp_price_yearly_usd,
           sp.price_monthly_egp AS sp_price_monthly_egp,
           sp.price_yearly_egp AS sp_price_yearly_egp,
           sp.name_en AS sp_name
    FROM tenants t
    LEFT JOIN subscription_plans sp ON t.subscription_plan_id = sp.id
    WHERE t.status = 'active'
      AND t.subscription_status IN ('active', 'trialing')
      AND t.subscription_plan_id IS NOT NULL
      -- Only generate if no invoice exists for this period
      AND NOT EXISTS (
        SELECT 1 FROM saas_invoices si
        WHERE si.tenant_id = t.id
          AND si.billing_period_start = period_start
          AND si.billing_period_end = period_end
          AND si.status IN ('draft', 'pending', 'paid')
      )
      -- Only generate if next_billing_date has passed (or is not set)
      AND (t.next_billing_date IS NULL OR t.next_billing_date <= CURRENT_DATE)
  LOOP
    is_yearly := COALESCE(tenant_record.t_billing_cycle, 'monthly') = 'yearly';
    subtotal := 0;

    -- Calculate plan price (use stored EGP if available, otherwise USD)
    IF tenant_record.t_currency = 'EGP' THEN
      IF is_yearly THEN
        plan_price := COALESCE(tenant_record.sp_price_yearly_egp, 0);
      ELSE
        plan_price := COALESCE(tenant_record.sp_price_monthly_egp, 0);
      END IF;
    ELSE
      IF is_yearly THEN
        plan_price := COALESCE(tenant_record.sp_price_yearly_usd, 0);
      ELSE
        plan_price := COALESCE(tenant_record.sp_price_monthly_usd, 0);
      END IF;
    END IF;

    subtotal := plan_price;

    -- Create the invoice
    INSERT INTO saas_invoices (
      tenant_id, invoice_number, status, currency,
      billing_period_start, billing_period_end,
      due_date, subtotal, total,
      issue_date, notes
    ) VALUES (
      tenant_record.tenant_id,
      'INV-' || UPPER(LEFT(tenant_record.tenant_id::text, 6)) || '-' || TO_CHAR(period_start, 'YYYYMM'),
      'pending', COALESCE(tenant_record.t_currency, 'USD'),
      period_start, period_end,
      due_dt, subtotal, subtotal,
      CURRENT_DATE,
      'Auto-generated monthly invoice'
    ) RETURNING id INTO new_invoice_id;

    -- Add plan line item
    IF plan_price > 0 THEN
      INSERT INTO saas_invoice_items (
        invoice_id, description, item_type, plan_id,
        quantity, unit_price, total,
        period_start, period_end, sort_order
      ) VALUES (
        new_invoice_id,
        COALESCE(tenant_record.sp_name, 'Subscription') || ' Plan - ' || CASE WHEN is_yearly THEN 'Yearly' ELSE 'Monthly' END,
        'subscription', tenant_record.subscription_plan_id,
        1, plan_price, plan_price,
        period_start, period_end, 1
      );
    END IF;

    -- Add module line items
    FOR module_rec IN
      SELECT tm.price_override, tm.license_type, m.id AS module_id,
             m.name_en, m.base_price_monthly, m.base_price_yearly, m.is_free
      FROM tenant_modules tm
      JOIN modules m ON tm.module_id = m.id
      WHERE tm.tenant_id = tenant_record.tenant_id
        AND tm.status = 'active'
        AND COALESCE(m.is_free, false) = false
        AND COALESCE(tm.license_type, 'addon') NOT IN ('included', 'lifetime')
    LOOP
      -- Use price_override if set, otherwise base price (USD-based)
      IF module_rec.price_override IS NOT NULL THEN
        module_price := module_rec.price_override;
      ELSIF is_yearly THEN
        module_price := COALESCE(module_rec.base_price_yearly, COALESCE(module_rec.base_price_monthly, 0) * 12);
      ELSE
        module_price := COALESCE(module_rec.base_price_monthly, 0);
      END IF;

      IF module_price > 0 THEN
        INSERT INTO saas_invoice_items (
          invoice_id, description, item_type, module_id,
          quantity, unit_price, total,
          period_start, period_end, sort_order
        ) VALUES (
          new_invoice_id,
          module_rec.name_en || ' Module - ' || CASE WHEN is_yearly THEN 'Yearly' ELSE 'Monthly' END,
          'module', module_rec.module_id,
          1, module_price, module_price,
          period_start, period_end, 2
        );
        subtotal := subtotal + module_price;
      END IF;
    END LOOP;

    -- Calculate tax
    tax_rate_val := COALESCE((tenant_record.settings->>'tax_rate')::DECIMAL, 0);
    tax_amt := CASE WHEN tax_rate_val > 0 THEN ROUND(subtotal * tax_rate_val / 100, 2) ELSE 0 END;
    total_amt := subtotal + tax_amt;

    -- Update invoice totals
    UPDATE saas_invoices
    SET subtotal = generate_monthly_invoices.subtotal,
        tax_amount = tax_amt,
        total = total_amt
    WHERE id = new_invoice_id;

    -- Update tenant next billing date
    UPDATE tenants
    SET next_billing_date = CASE
          WHEN is_yearly THEN CURRENT_DATE + INTERVAL '1 year'
          ELSE CURRENT_DATE + INTERVAL '1 month'
        END,
        updated_at = NOW()
    WHERE id = tenant_record.tenant_id;

    inv_count := inv_count + 1;
  END LOOP;

  -- Log the action
  IF inv_count > 0 THEN
    INSERT INTO saas_audit_trail (
      action, resource_type, description, metadata, created_at
    ) VALUES (
      'auto_generate_invoices', 'invoice',
      'Auto-generated ' || inv_count || ' invoices for period ' || period_start::text || ' to ' || period_end::text,
      jsonb_build_object('count', inv_count, 'period', period_start::text || ' to ' || period_end::text, 'run_at', NOW()::text),
      NOW()
    );
  END IF;

  RETURN inv_count;
END;
$$;

COMMENT ON FUNCTION generate_monthly_invoices() IS 'Auto-generates invoices for all active tenants whose billing period has started. Run on 1st of each month via pg_cron.';

-- ============================================
-- 6. PLAN CHANGE TRACKING TABLE
-- ============================================
-- Tracks plan changes for proration and billing history

CREATE TABLE IF NOT EXISTS saas_plan_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  old_plan_id UUID REFERENCES subscription_plans(id),
  new_plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  change_type VARCHAR(20) NOT NULL DEFAULT 'upgrade',  -- upgrade, downgrade, cancel
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  proration_amount DECIMAL(10,2) DEFAULT 0,            -- credit or charge for mid-cycle change
  proration_applied BOOLEAN DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',        -- pending, applied, cancelled
  requested_by UUID REFERENCES users(id),            -- who requested the change
  approved_by UUID REFERENCES users(id),             -- who approved (NULL = auto-approved)
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_plan_changes_tenant ON saas_plan_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_plan_changes_status ON saas_plan_changes(status);

ALTER TABLE saas_plan_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can manage plan changes" ON saas_plan_changes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'developer'
    )
  );

CREATE POLICY "Tenants can view own plan changes" ON saas_plan_changes
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Tenants can request plan changes" ON saas_plan_changes
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE saas_plan_changes IS 'Tracks subscription plan change requests for self-service and billing';

-- ============================================
-- 7. SCHEDULE NEW CRON JOBS
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Subscription expiry check (daily at 3:00 AM UTC)
    PERFORM cron.schedule(
      'handle-subscription-expiry',
      '0 3 * * *',
      'SELECT handle_subscription_expiry()'
    );

    -- Auto-suspend for non-payment (daily at 3:30 AM UTC)
    PERFORM cron.schedule(
      'auto-suspend-non-payment',
      '30 3 * * *',
      'SELECT auto_suspend_non_payment()'
    );

    -- Auto-generate monthly invoices (1st of each month at 1:00 AM UTC)
    PERFORM cron.schedule(
      'generate-monthly-invoices',
      '0 1 1 * *',
      'SELECT generate_monthly_invoices()'
    );

    RAISE NOTICE 'New cron jobs scheduled: subscription-expiry, auto-suspend, monthly-invoices';
  ELSE
    RAISE NOTICE 'pg_cron not available — functions must be called manually';
  END IF;
END;
$$;
