-- Migration: Auto-update tenant user count
-- Created: 2026-02-10

-- Function to update tenant user count
CREATE OR REPLACE FUNCTION update_tenant_user_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE tenants SET current_users_count = (
      SELECT COUNT(*) FROM tenant_users 
      WHERE tenant_id = NEW.tenant_id AND status = 'active'
    ), updated_at = NOW()
    WHERE id = NEW.tenant_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tenants SET current_users_count = (
      SELECT COUNT(*) FROM tenant_users 
      WHERE tenant_id = OLD.tenant_id AND status = 'active'
    ), updated_at = NOW()
    WHERE id = OLD.tenant_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_tenant_user_count ON tenant_users;

-- Create trigger for insert/update/delete
CREATE TRIGGER trigger_update_tenant_user_count
AFTER INSERT OR UPDATE OR DELETE ON tenant_users
FOR EACH ROW EXECUTE FUNCTION update_tenant_user_count();

-- Initial sync: Update all tenant counts
UPDATE tenants t SET current_users_count = (
  SELECT COUNT(*) FROM tenant_users tu 
  WHERE tu.tenant_id = t.id AND tu.status = 'active'
);

-- Add comment
COMMENT ON FUNCTION update_tenant_user_count() IS 'Automatically updates tenants.current_users_count when tenant_users changes';
