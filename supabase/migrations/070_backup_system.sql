-- =====================================================
-- BACKUP SYSTEM FOR MULTI-TENANT SAAS
-- =====================================================
-- Provides per-tenant backup capabilities with:
-- - Backup metadata tracking
-- - Backup settings per tenant
-- - Configurable as paid module
-- =====================================================

-- Backup metadata table
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'automatic', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  storage_path TEXT, -- Path in storage bucket
  storage_bucket TEXT DEFAULT 'backups',
  size_bytes BIGINT DEFAULT 0,
  tables_count INTEGER DEFAULT 0,
  records_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- For automatic cleanup
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb -- Store extra info like included tables, versions, etc.
);

-- Backup settings per tenant
CREATE TABLE IF NOT EXISTS backup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  auto_backup_enabled BOOLEAN DEFAULT false,
  backup_frequency TEXT DEFAULT 'daily' CHECK (backup_frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
  backup_time TIME DEFAULT '03:00:00', -- Default 3 AM
  backup_day_of_week INTEGER DEFAULT 0, -- 0 = Sunday, for weekly backups
  backup_day_of_month INTEGER DEFAULT 1, -- For monthly backups
  retention_days INTEGER DEFAULT 30,
  include_media BOOLEAN DEFAULT false, -- Media files can be large
  include_audit_logs BOOLEAN DEFAULT true,
  encrypt_backups BOOLEAN DEFAULT true,
  notify_on_complete BOOLEAN DEFAULT true,
  notify_on_failure BOOLEAN DEFAULT true,
  notification_email TEXT,
  last_backup_at TIMESTAMPTZ,
  last_backup_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Developer portal backup settings (global)
CREATE TABLE IF NOT EXISTS dev_backup_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default dev portal backup settings
INSERT INTO dev_backup_settings (setting_key, setting_value) VALUES
  ('global_backup_enabled', 'true'::jsonb),
  ('global_backup_frequency', '"daily"'::jsonb),
  ('global_backup_time', '"03:00"'::jsonb),
  ('global_retention_days', '90'::jsonb),
  ('backup_all_tenants', 'true'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_backups_tenant_id ON backups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_type ON backups(type);
CREATE INDEX IF NOT EXISTS idx_backup_settings_tenant ON backup_settings(tenant_id);

-- Enable RLS
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_backup_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for backups
-- Drop existing policies first
DROP POLICY IF EXISTS "developers_view_all_backups" ON backups;
DROP POLICY IF EXISTS "tenant_admins_view_own_backups" ON backups;
DROP POLICY IF EXISTS "developers_manage_backups" ON backups;
DROP POLICY IF EXISTS "service_role_manage_backups" ON backups;

-- Developers can see all backups
CREATE POLICY "developers_view_all_backups" ON backups
  FOR SELECT TO authenticated
  USING (auth_user_role() IN ('developer', 'admin'));

-- Tenant admins can see their own backups
CREATE POLICY "tenant_admins_view_own_backups" ON backups
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_tenant_id() 
    AND auth_user_role() IN ('admin', 'developer')
  );

-- Only developers and service role can insert/update/delete
CREATE POLICY "developers_manage_backups" ON backups
  FOR ALL TO authenticated
  USING (auth_user_role() = 'developer')
  WITH CHECK (auth_user_role() = 'developer');

CREATE POLICY "service_role_manage_backups" ON backups
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for backup_settings
DROP POLICY IF EXISTS "developers_view_all_backup_settings" ON backup_settings;
DROP POLICY IF EXISTS "tenant_admins_view_own_settings" ON backup_settings;
DROP POLICY IF EXISTS "developers_manage_backup_settings" ON backup_settings;
DROP POLICY IF EXISTS "tenant_admins_update_own_settings" ON backup_settings;
DROP POLICY IF EXISTS "service_role_manage_backup_settings" ON backup_settings;

CREATE POLICY "developers_view_all_backup_settings" ON backup_settings
  FOR SELECT TO authenticated
  USING (auth_user_role() IN ('developer', 'admin'));

CREATE POLICY "tenant_admins_view_own_settings" ON backup_settings
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id() AND auth_user_role() = 'admin');

CREATE POLICY "developers_manage_backup_settings" ON backup_settings
  FOR ALL TO authenticated
  USING (auth_user_role() = 'developer')
  WITH CHECK (auth_user_role() = 'developer');

CREATE POLICY "tenant_admins_update_own_settings" ON backup_settings
  FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id() AND auth_user_role() = 'admin')
  WITH CHECK (tenant_id = current_tenant_id() AND auth_user_role() = 'admin');

CREATE POLICY "service_role_manage_backup_settings" ON backup_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for dev_backup_settings (developers only)
DROP POLICY IF EXISTS "developers_manage_dev_backup_settings" ON dev_backup_settings;
DROP POLICY IF EXISTS "service_role_dev_backup_settings" ON dev_backup_settings;

CREATE POLICY "developers_manage_dev_backup_settings" ON dev_backup_settings
  FOR ALL TO authenticated
  USING (auth_user_role() = 'developer')
  WITH CHECK (auth_user_role() = 'developer');

CREATE POLICY "service_role_dev_backup_settings" ON dev_backup_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Add backup module to modules table if not exists
INSERT INTO modules (slug, name_en, name_ar, description_en, description_ar, category, is_free, base_price_monthly, base_price_yearly, icon, status)
VALUES (
  'backup',
  'Backup & Recovery',
  'النسخ الاحتياطي والاسترداد',
  'Automated backups with point-in-time recovery and data export capabilities',
  'نسخ احتياطية تلقائية مع إمكانية الاسترداد في أي وقت وتصدير البيانات',
  'operations',
  false,
  29.00,
  290.00,
  'Archive',
  'active'
)
ON CONFLICT (slug) DO NOTHING;

-- Function to create tenant storage bucket
CREATE OR REPLACE FUNCTION create_tenant_bucket(p_tenant_id UUID, p_tenant_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_name TEXT;
BEGIN
  bucket_name := 'tenant-' || p_tenant_slug;
  
  -- Note: Actual bucket creation must be done via Supabase Storage API
  -- This function just returns the expected bucket name
  -- The Edge Function will handle actual creation
  
  RETURN bucket_name;
END;
$$;

-- Function to get backup stats for a tenant
CREATE OR REPLACE FUNCTION get_tenant_backup_stats(p_tenant_id UUID)
RETURNS TABLE (
  total_backups BIGINT,
  successful_backups BIGINT,
  failed_backups BIGINT,
  total_size_bytes BIGINT,
  last_backup_at TIMESTAMPTZ,
  last_backup_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_backups,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as successful_backups,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_backups,
    COALESCE(SUM(size_bytes), 0)::BIGINT as total_size_bytes,
    MAX(created_at) as last_backup_at,
    (SELECT b.status FROM backups b WHERE b.tenant_id = p_tenant_id ORDER BY b.created_at DESC LIMIT 1) as last_backup_status
  FROM backups
  WHERE tenant_id = p_tenant_id;
END;
$$;

-- Trigger to update backup_settings.last_backup_at
CREATE OR REPLACE FUNCTION update_last_backup_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE backup_settings 
    SET 
      last_backup_at = NEW.completed_at,
      last_backup_status = 'completed',
      updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id;
  ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    UPDATE backup_settings 
    SET 
      last_backup_status = 'failed',
      updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_backup_timestamp ON backups;
CREATE TRIGGER trg_update_backup_timestamp
  AFTER UPDATE ON backups
  FOR EACH ROW
  EXECUTE FUNCTION update_last_backup_timestamp();

-- Add audit triggers
DROP TRIGGER IF EXISTS audit_backups ON backups;
CREATE TRIGGER audit_backups
  AFTER INSERT OR UPDATE OR DELETE ON backups
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_backup_settings ON backup_settings;
CREATE TRIGGER audit_backup_settings
  AFTER INSERT OR UPDATE OR DELETE ON backup_settings
  FOR EACH ROW EXECUTE FUNCTION log_audit();

COMMENT ON TABLE backups IS 'Stores backup history and metadata for each tenant';
COMMENT ON TABLE backup_settings IS 'Per-tenant backup configuration';
COMMENT ON TABLE dev_backup_settings IS 'Global backup settings for developer portal';
