-- =====================================================
-- MIGRATION 042: SaaS Deployment & Domain Management
-- =====================================================
-- Deployment tracking, version management, custom domains,
-- SSL certificates, and remote support sessions.
-- =====================================================

-- ===========================================
-- 1. DEPLOYMENTS TABLE
-- ===========================================
-- Track application deployments/releases

CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Version Info
    version TEXT NOT NULL,
    version_name TEXT,
    commit_sha TEXT,
    branch TEXT DEFAULT 'main',
    
    -- Release Details
    release_notes TEXT,
    changelog JSONB DEFAULT '[]',
    breaking_changes TEXT[],
    
    -- Deployment Configuration
    deployment_type TEXT DEFAULT 'standard' CHECK (deployment_type IN (
        'standard',     -- Normal deployment
        'hotfix',       -- Emergency fix
        'rollback',     -- Rollback to previous
        'canary',       -- Canary release
        'blue_green'    -- Blue/green deployment
    )),
    
    -- Targeting
    target_type TEXT DEFAULT 'all' CHECK (target_type IN (
        'all',          -- All tenants
        'tenants',      -- Specific tenants
        'tiers',        -- Specific subscription tiers
        'percentage'    -- Percentage rollout
    )),
    target_tenants UUID[],
    target_tiers TEXT[],
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Waiting to start
        'building',     -- Build in progress
        'deploying',    -- Deployment in progress
        'verifying',    -- Running health checks
        'deployed',     -- Successfully deployed
        'failed',       -- Deployment failed
        'rolled_back',  -- Rolled back to previous
        'cancelled'     -- Manually cancelled
    )),
    
    -- Timing
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Metrics
    duration_seconds INTEGER,
    affected_tenants_count INTEGER,
    
    -- Errors
    error_message TEXT,
    error_details JSONB,
    
    -- Actor
    deployed_by UUID,
    approved_by UUID,
    
    -- Rollback Info
    previous_version TEXT,
    rollback_deployment_id UUID REFERENCES deployments(id),
    
    -- Build Info
    build_url TEXT,
    build_logs TEXT,
    artifacts JSONB DEFAULT '{}',
    
    -- Metadata
    environment TEXT DEFAULT 'production',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 2. TENANT DEPLOYMENTS TABLE
-- ===========================================
-- Track which version each tenant is running

CREATE TABLE IF NOT EXISTS tenant_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Waiting
        'deploying',    -- In progress
        'deployed',     -- Success
        'failed',       -- Failed
        'skipped'       -- Skipped (excluded)
    )),
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Version
    previous_version TEXT,
    current_version TEXT,
    
    -- Errors
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Health Check
    health_check_passed BOOLEAN,
    health_check_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, deployment_id)
);

-- ===========================================
-- 3. DOMAINS TABLE
-- ===========================================
-- Custom domain management

CREATE TABLE IF NOT EXISTS domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Domain Info
    domain TEXT NOT NULL UNIQUE,
    domain_type TEXT DEFAULT 'custom' CHECK (domain_type IN (
        'primary',      -- Main subdomain (tenant.dento.app)
        'custom',       -- Custom domain (clinic.com)
        'alias'         -- Additional alias
    )),
    
    -- DNS Verification
    dns_verified BOOLEAN DEFAULT false,
    dns_verification_token TEXT,
    dns_record_type TEXT DEFAULT 'CNAME',
    dns_record_value TEXT,
    dns_verified_at TIMESTAMPTZ,
    dns_last_checked_at TIMESTAMPTZ,
    
    -- SSL Certificate
    ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN (
        'pending',          -- Not yet requested
        'requesting',       -- Certificate being issued
        'provisioning',     -- Being provisioned
        'active',           -- Valid and active
        'expiring_soon',    -- Expiring within 30 days
        'expired',          -- Certificate expired
        'failed'            -- Provisioning failed
    )),
    ssl_provider TEXT DEFAULT 'lets_encrypt',
    ssl_certificate_id TEXT,
    ssl_issued_at TIMESTAMPTZ,
    ssl_expires_at TIMESTAMPTZ,
    ssl_auto_renew BOOLEAN DEFAULT true,
    ssl_last_renewed_at TIMESTAMPTZ,
    ssl_error_message TEXT,
    
    -- CDN/Hosting
    hosting_provider TEXT,
    cdn_enabled BOOLEAN DEFAULT false,
    cdn_provider TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    
    -- Redirects
    redirect_to TEXT,
    force_https BOOLEAN DEFAULT true,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 4. SUPPORT SESSIONS TABLE
-- ===========================================
-- Remote support / impersonation sessions

CREATE TABLE IF NOT EXISTS support_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Developer (supporter)
    developer_id UUID NOT NULL,
    developer_email TEXT NOT NULL,
    
    -- Target Tenant
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Impersonation (optional)
    impersonated_user_id UUID,
    impersonated_user_email TEXT,
    
    -- Session Info
    reason TEXT NOT NULL,
    ticket_reference TEXT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active',       -- Session in progress
        'ended',        -- Normally ended
        'expired',      -- Auto-expired
        'revoked'       -- Forcefully terminated
    )),
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
    ended_at TIMESTAMPTZ,
    
    -- Activity Tracking
    actions_performed JSONB DEFAULT '[]',
    pages_visited TEXT[],
    data_accessed JSONB DEFAULT '[]',
    changes_made JSONB DEFAULT '[]',
    
    -- Security
    ip_address INET,
    user_agent TEXT,
    access_token TEXT UNIQUE,
    
    -- Permissions
    permissions_granted TEXT[] DEFAULT '{}',
    read_only BOOLEAN DEFAULT false,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 5. SUPPORT SESSION ACTIONS TABLE
-- ===========================================
-- Detailed audit of support session actions

CREATE TABLE IF NOT EXISTS support_session_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
    
    -- Action Info
    action_type TEXT NOT NULL CHECK (action_type IN (
        'page_view',    -- Viewed a page
        'data_read',    -- Read data
        'data_write',   -- Modified data
        'setting_change', -- Changed settings
        'export',       -- Exported data
        'delete',       -- Deleted something
        'other'         -- Other action
    )),
    
    -- Details
    description TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    
    -- Data
    old_value JSONB,
    new_value JSONB,
    
    -- Context
    url TEXT,
    ip_address INET,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 6. DEPLOYMENT HOOKS TABLE
-- ===========================================
-- Webhooks for deployment events

CREATE TABLE IF NOT EXISTS deployment_hooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Hook Config
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,
    
    -- Events
    events TEXT[] NOT NULL DEFAULT '{deployment.started,deployment.completed,deployment.failed}',
    
    -- Status
    is_enabled BOOLEAN DEFAULT true,
    
    -- Stats
    last_triggered_at TIMESTAMPTZ,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 7. INDEXES
-- ===========================================

-- Deployments
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_version ON deployments(version);
CREATE INDEX IF NOT EXISTS idx_deployments_created ON deployments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_deployed_by ON deployments(deployed_by);
CREATE INDEX IF NOT EXISTS idx_deployments_scheduled ON deployments(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Tenant Deployments
CREATE INDEX IF NOT EXISTS idx_tenant_deployments_tenant ON tenant_deployments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_deployments_deployment ON tenant_deployments(deployment_id);
CREATE INDEX IF NOT EXISTS idx_tenant_deployments_status ON tenant_deployments(status);

-- Domains
CREATE INDEX IF NOT EXISTS idx_domains_tenant ON domains(tenant_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_ssl_status ON domains(ssl_status);
CREATE INDEX IF NOT EXISTS idx_domains_ssl_expires ON domains(ssl_expires_at) WHERE ssl_expires_at IS NOT NULL;

-- Support Sessions
CREATE INDEX IF NOT EXISTS idx_support_sessions_developer ON support_sessions(developer_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_tenant ON support_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_status ON support_sessions(status);
CREATE INDEX IF NOT EXISTS idx_support_sessions_active ON support_sessions(status, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_support_sessions_token ON support_sessions(access_token) WHERE access_token IS NOT NULL;

-- Support Session Actions
CREATE INDEX IF NOT EXISTS idx_support_actions_session ON support_session_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_support_actions_created ON support_session_actions(created_at DESC);

-- ===========================================
-- 8. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_session_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_hooks ENABLE ROW LEVEL SECURITY;

-- Deployments: Developers only
CREATE POLICY deployments_developer_all ON deployments
    FOR ALL USING (is_saas_developer());

-- Tenant Deployments: Developers see all, admins see their tenant
CREATE POLICY tenant_deployments_developer_all ON tenant_deployments
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY tenant_deployments_admin_select ON tenant_deployments
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );

-- Domains: Developers see all, admins manage their tenant
CREATE POLICY domains_developer_all ON domains
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY domains_admin_all ON domains
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );

-- Support Sessions: Developers only
CREATE POLICY support_sessions_developer_all ON support_sessions
    FOR ALL USING (is_saas_developer());

-- Support Session Actions: Developers only
CREATE POLICY support_actions_developer_all ON support_session_actions
    FOR ALL USING (is_saas_developer());

-- Deployment Hooks: Developers see all, admins manage their tenant
CREATE POLICY deployment_hooks_developer_all ON deployment_hooks
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY deployment_hooks_admin_all ON deployment_hooks
    FOR ALL USING (
        tenant_id IS NULL OR
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );

-- ===========================================
-- 9. HELPER FUNCTIONS
-- ===========================================

-- Get current deployment version for tenant
CREATE OR REPLACE FUNCTION get_tenant_version(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_version TEXT;
BEGIN
    SELECT td.current_version INTO current_version
    FROM tenant_deployments td
    WHERE td.tenant_id = p_tenant_id
    AND td.status = 'deployed'
    ORDER BY td.completed_at DESC
    LIMIT 1;
    
    RETURN COALESCE(current_version, '1.0.0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if support session is valid
CREATE OR REPLACE FUNCTION is_valid_support_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM support_sessions
        WHERE id = p_session_id
        AND status = 'active'
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End expired support sessions (call via cron)
CREATE OR REPLACE FUNCTION expire_support_sessions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE support_sessions
    SET status = 'expired',
        ended_at = NOW()
    WHERE status = 'active'
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check domains with expiring SSL
CREATE OR REPLACE FUNCTION get_expiring_ssl_domains(days_threshold INTEGER DEFAULT 30)
RETURNS TABLE(
    id UUID,
    tenant_id UUID,
    domain TEXT,
    ssl_expires_at TIMESTAMPTZ,
    days_until_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.tenant_id,
        d.domain,
        d.ssl_expires_at,
        EXTRACT(DAY FROM d.ssl_expires_at - NOW())::INTEGER as days_until_expiry
    FROM domains d
    WHERE d.ssl_status = 'active'
    AND d.ssl_expires_at IS NOT NULL
    AND d.ssl_expires_at < NOW() + (days_threshold || ' days')::INTERVAL
    ORDER BY d.ssl_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 10. TRIGGERS
-- ===========================================

-- Update deployment updated_at
DROP TRIGGER IF EXISTS trigger_deployments_updated_at ON deployments;
CREATE TRIGGER trigger_deployments_updated_at
    BEFORE UPDATE ON deployments
    FOR EACH ROW EXECUTE FUNCTION update_saas_updated_at();

-- Update domains updated_at
DROP TRIGGER IF EXISTS trigger_domains_updated_at ON domains;
CREATE TRIGGER trigger_domains_updated_at
    BEFORE UPDATE ON domains
    FOR EACH ROW EXECUTE FUNCTION update_saas_updated_at();

-- Log support session actions
CREATE OR REPLACE FUNCTION log_support_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO support_session_actions (
        session_id,
        action_type,
        description,
        resource_type,
        resource_id,
        new_value
    ) VALUES (
        NEW.id,
        'other',
        'Session status changed to ' || NEW.status,
        'support_session',
        NEW.id,
        jsonb_build_object('status', NEW.status)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create alert for expiring SSL
CREATE OR REPLACE FUNCTION check_ssl_expiry_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ssl_status = 'active' 
       AND NEW.ssl_expires_at IS NOT NULL 
       AND NEW.ssl_expires_at < NOW() + INTERVAL '14 days' THEN
        
        UPDATE domains 
        SET ssl_status = 'expiring_soon'
        WHERE id = NEW.id;
        
        INSERT INTO alerts (
            tenant_id,
            alert_type,
            severity,
            title,
            description,
            source_type,
            source_id
        ) VALUES (
            NEW.tenant_id,
            'ssl_expiring',
            'warning',
            'SSL Certificate Expiring Soon',
            'SSL certificate for ' || NEW.domain || ' expires on ' || NEW.ssl_expires_at::TEXT,
            'domain',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ssl_expiry_check ON domains;
CREATE TRIGGER trigger_ssl_expiry_check
    AFTER UPDATE OF ssl_expires_at ON domains
    FOR EACH ROW EXECUTE FUNCTION check_ssl_expiry_alert();

-- ===========================================
-- 11. VIEWS
-- ===========================================

-- Current tenant versions
CREATE OR REPLACE VIEW tenant_current_versions AS
SELECT DISTINCT ON (t.id)
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    td.current_version,
    td.completed_at as deployed_at,
    d.version_name,
    d.deployed_by
FROM tenants t
LEFT JOIN tenant_deployments td ON td.tenant_id = t.id AND td.status = 'deployed'
LEFT JOIN deployments d ON d.id = td.deployment_id
ORDER BY t.id, td.completed_at DESC;

-- Domain health status
CREATE OR REPLACE VIEW domain_health AS
SELECT 
    d.id,
    d.tenant_id,
    d.domain,
    d.domain_type,
    d.dns_verified,
    d.ssl_status,
    d.ssl_expires_at,
    CASE 
        WHEN NOT d.dns_verified THEN 'DNS not verified'
        WHEN d.ssl_status = 'failed' THEN 'SSL provisioning failed'
        WHEN d.ssl_status = 'expired' THEN 'SSL expired'
        WHEN d.ssl_status = 'expiring_soon' THEN 'SSL expiring soon'
        WHEN d.ssl_status = 'active' AND d.dns_verified THEN 'Healthy'
        ELSE 'Pending setup'
    END as health_status,
    d.is_active
FROM domains d;

-- Grant comments
COMMENT ON TABLE deployments IS 'Application deployment/release tracking';
COMMENT ON TABLE tenant_deployments IS 'Per-tenant deployment status';
COMMENT ON TABLE domains IS 'Custom domain and SSL management';
COMMENT ON TABLE support_sessions IS 'Remote support/impersonation sessions for debugging';
