-- Migration: 056_seed_api_keys.sql
-- Seeds sample API keys for development and testing
-- Note: In production, API keys should only be created through the UI

-- ================================================
-- API KEY TYPES EXPLANATION
-- ================================================
-- 
-- 1. TENANT-SPECIFIC API KEYS (tenant_id IS NOT NULL)
--    - Belong to a specific tenant/clinic
--    - Used for: Integrations with clinic's own systems, third-party apps, EHR integrations
--    - Visibility: Only visible to that tenant's admins in their portal
--
-- 2. PLATFORM API KEYS (tenant_id IS NULL) 
--    - Platform-wide access for internal services
--    - Used for: Admin tools, monitoring, cross-tenant analytics
--    - Visibility: Only visible to SaaS developers/admins
--
-- KEY TYPES:
--   - 'live': Production keys with full access
--   - 'test': Sandbox/testing keys (may have rate limits)
--   - 'restricted': Limited scope keys for specific integrations
--
-- ENVIRONMENTS:
--   - 'production': Live environment
--   - 'staging': Pre-production testing
--   - 'development': Local development
--
-- SCOPES:
--   - 'read': Read-only access
--   - 'write': Create/update access
--   - 'delete': Delete access
--   - 'admin': Full administrative access

-- ================================================
-- FUNCTION TO SEED API KEYS FOR A TENANT
-- ================================================

CREATE OR REPLACE FUNCTION seed_tenant_api_keys(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only seed if no API keys exist for this tenant
    IF NOT EXISTS (SELECT 1 FROM api_keys WHERE tenant_id = p_tenant_id) THEN
        
        -- Production Live Key (Full Access)
        INSERT INTO api_keys (
            tenant_id,
            name,
            description,
            key_prefix,
            key_hash,
            key_hint,
            key_type,
            environment,
            scopes,
            rate_limit_per_minute,
            rate_limit_per_hour,
            rate_limit_per_day,
            status
        ) VALUES (
            p_tenant_id,
            'Production API Key',
            'Main production API key for live integrations',
            'dk_live_',
            encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
            'PROD',
            'live',
            'production',
            ARRAY['read', 'write'],
            100,
            2000,
            20000,
            'active'
        );
        
        -- Test/Sandbox Key
        INSERT INTO api_keys (
            tenant_id,
            name,
            description,
            key_prefix,
            key_hash,
            key_hint,
            key_type,
            environment,
            scopes,
            rate_limit_per_minute,
            rate_limit_per_hour,
            rate_limit_per_day,
            status
        ) VALUES (
            p_tenant_id,
            'Test API Key',
            'Sandbox key for testing integrations - limited rate limits',
            'dk_test_',
            encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
            'TEST',
            'test',
            'development',
            ARRAY['read', 'write', 'delete'],
            30,
            500,
            5000,
            'active'
        );

        -- Read-Only Restricted Key
        INSERT INTO api_keys (
            tenant_id,
            name,
            description,
            key_prefix,
            key_hash,
            key_hint,
            key_type,
            environment,
            scopes,
            rate_limit_per_minute,
            rate_limit_per_hour,
            rate_limit_per_day,
            status
        ) VALUES (
            p_tenant_id,
            'Analytics Read-Only Key',
            'Restricted read-only key for analytics dashboards',
            'dk_ro_',
            encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
            'ANLZ',
            'restricted',
            'production',
            ARRAY['read'],
            200,
            5000,
            50000,
            'active'
        );

        RAISE NOTICE 'Seeded 3 API keys for tenant %', p_tenant_id;
    END IF;
END;
$$;

-- ================================================
-- SEED API KEYS FOR EXISTING TENANTS
-- ================================================

-- Seed for all existing active tenants
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    FOR tenant_record IN 
        SELECT id, name FROM tenants WHERE status = 'active'
    LOOP
        PERFORM seed_tenant_api_keys(tenant_record.id);
        RAISE NOTICE 'Processed tenant: % (%)', tenant_record.name, tenant_record.id;
    END LOOP;
END;
$$;

-- ================================================
-- PLATFORM-WIDE API KEYS (Developer Portal)
-- ================================================
-- These are NOT tenant-specific - used for platform administration

-- Only insert if no platform keys exist
INSERT INTO api_keys (
    tenant_id,
    name,
    description,
    key_prefix,
    key_hash,
    key_hint,
    key_type,
    environment,
    scopes,
    rate_limit_per_minute,
    rate_limit_per_hour,
    rate_limit_per_day,
    status
) 
SELECT 
    NULL,
    'Platform Admin Key',
    'Internal platform administration - full cross-tenant access',
    'dk_admin_',
    encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
    'ADMN',
    'live',
    'production',
    ARRAY['read', 'write', 'delete', 'admin'],
    500,
    10000,
    100000,
    'active'
WHERE NOT EXISTS (
    SELECT 1 FROM api_keys WHERE tenant_id IS NULL AND name = 'Platform Admin Key'
);

INSERT INTO api_keys (
    tenant_id,
    name,
    description,
    key_prefix,
    key_hash,
    key_hint,
    key_type,
    environment,
    scopes,
    rate_limit_per_minute,
    rate_limit_per_hour,
    rate_limit_per_day,
    status
) 
SELECT 
    NULL,
    'Platform Monitoring Key',
    'Read-only key for monitoring and health checks',
    'dk_mon_',
    encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
    'MNTR',
    'restricted',
    'production',
    ARRAY['read'],
    1000,
    20000,
    200000,
    'active'
WHERE NOT EXISTS (
    SELECT 1 FROM api_keys WHERE tenant_id IS NULL AND name = 'Platform Monitoring Key'
);

-- ================================================
-- AUTO-SEED TRIGGER FOR NEW TENANTS
-- ================================================

CREATE OR REPLACE FUNCTION trigger_seed_api_keys_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- Only seed for active tenants
    IF NEW.status = 'active' THEN
        PERFORM seed_tenant_api_keys(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS auto_seed_api_keys_on_tenant_create ON tenants;
CREATE TRIGGER auto_seed_api_keys_on_tenant_create
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION trigger_seed_api_keys_for_new_tenant();

-- ================================================
-- HELPER VIEW FOR API KEY SUMMARY
-- ================================================

CREATE OR REPLACE VIEW api_keys_summary AS
SELECT 
    ak.id,
    ak.name,
    ak.key_prefix,
    ak.key_hint,
    ak.key_type,
    ak.environment,
    ak.scopes,
    ak.status,
    ak.total_requests,
    ak.last_used_at,
    ak.created_at,
    ak.expires_at,
    t.name as tenant_name,
    t.slug as tenant_slug,
    CASE 
        WHEN ak.tenant_id IS NULL THEN 'platform'
        ELSE 'tenant'
    END as key_scope
FROM api_keys ak
LEFT JOIN tenants t ON ak.tenant_id = t.id;

-- Grant access to the view
GRANT SELECT ON api_keys_summary TO authenticated;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON FUNCTION seed_tenant_api_keys(UUID) IS 'Seeds default API keys for a new tenant';
COMMENT ON FUNCTION trigger_seed_api_keys_for_new_tenant() IS 'Trigger function to auto-seed API keys when a new tenant is created';
COMMENT ON VIEW api_keys_summary IS 'Summary view of all API keys with tenant information';
