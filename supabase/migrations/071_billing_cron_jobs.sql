-- Migration 071: Billing Cron Jobs
-- Adds automated overdue detection and trial expiry handling

-- ============================================
-- 1. OVERDUE INVOICE DETECTION
-- ============================================
-- Marks pending invoices as overdue when past due date

CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE saas_invoices
  SET 
    status = 'overdue',
    updated_at = NOW()
  WHERE 
    status = 'pending'
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- Log the action if any invoices were updated
  IF affected_count > 0 THEN
    INSERT INTO saas_audit_log (
      action,
      entity_type,
      details,
      created_at
    ) VALUES (
      'auto_mark_overdue',
      'invoice',
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

COMMENT ON FUNCTION mark_overdue_invoices() IS 'Automatically marks pending invoices as overdue when past due date. Run daily via pg_cron.';

-- ============================================
-- 2. TRIAL EXPIRY HANDLING
-- ============================================
-- Deactivates tenants whose trial period has expired

CREATE OR REPLACE FUNCTION handle_expired_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE tenants
  SET 
    status = 'suspended',
    updated_at = NOW()
  WHERE 
    status = 'active'
    AND subscription_status = 'trial'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < NOW();

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- Log the action
  IF affected_count > 0 THEN
    INSERT INTO saas_audit_log (
      action,
      entity_type,
      details,
      created_at
    ) VALUES (
      'auto_expire_trial',
      'tenant',
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

COMMENT ON FUNCTION handle_expired_trials() IS 'Suspends tenants whose trial period has expired. Run daily via pg_cron.';

-- ============================================
-- 3. SCHEDULE CRON JOBS
-- ============================================
-- pg_cron is available on Supabase Pro plans
-- Run overdue check daily at 2:00 AM UTC
-- Run trial expiry check daily at 2:30 AM UTC

-- Note: These will be no-ops if pg_cron extension is not available
DO $$
BEGIN
  -- Check if cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule overdue invoice detection (daily at 2:00 AM UTC)
    PERFORM cron.schedule(
      'mark-overdue-invoices',
      '0 2 * * *',
      'SELECT mark_overdue_invoices()'
    );

    -- Schedule trial expiry handling (daily at 2:30 AM UTC)
    PERFORM cron.schedule(
      'handle-expired-trials',
      '30 2 * * *',
      'SELECT handle_expired_trials()'
    );

    RAISE NOTICE 'Cron jobs scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available — cron jobs not scheduled. Functions can still be called manually.';
  END IF;
END;
$$;
