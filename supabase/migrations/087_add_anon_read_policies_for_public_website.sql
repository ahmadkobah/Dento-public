-- Migration 087: Add anonymous read policies for public website
-- The public-facing website needs to:
--   1. Resolve tenants from subdomains/slugs (tenants table)
--   2. Resolve custom domains to tenants (domains table)
--   3. Read site settings for regional/public config (site_settings table)
-- Without these policies, anonymous visitors get 406 errors → tenant resolution fails → all pages 404

-- =====================================================
-- 1. Tenants table: allow anon to read active tenants
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'tenants'::regclass
      AND polname = 'anon_read_active_tenants'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "anon_read_active_tenants" ON tenants
        FOR SELECT
        TO anon
        USING (status = 'active')
    $policy$;
  END IF;
END $$;

-- =====================================================
-- 2. Domains table: allow anon to read verified active domains
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'domains'::regclass
      AND polname = 'anon_read_verified_domains'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "anon_read_verified_domains" ON domains
        FOR SELECT
        TO anon
        USING (is_active = true AND dns_verified = true)
    $policy$;
  END IF;
END $$;

-- =====================================================
-- 3. Site settings: ensure anon can read global settings
--    (tenant_isolation policy allows tenant_id IS NULL,
--     but only when current_tenant_id() is callable)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'site_settings'::regclass
      AND polname = 'anon_read_global_site_settings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "anon_read_global_site_settings" ON site_settings
        FOR SELECT
        TO anon
        USING (tenant_id IS NULL)
    $policy$;
  END IF;
END $$;
