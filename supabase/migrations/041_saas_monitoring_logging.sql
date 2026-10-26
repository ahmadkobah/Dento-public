-- =====================================================
-- MIGRATION 041: SaaS Monitoring & Logging Tables
-- =====================================================
-- Centralized error tracking, logging, health monitoring,
-- and alerting across all tenant instances.
-- =====================================================

-- ===========================================
-- 1. ERROR LOGS TABLE
-- ===========================================
-- Centralized error tracking (like Sentry)

CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Error Identity
    error_fingerprint TEXT NOT NULL,
    error_type TEXT NOT NULL CHECK (error_type IN (
        'javascript',   -- Frontend JS errors
        'react',        -- React component errors
        'api',          -- API/Backend errors
        'database',     -- Database errors
        'network',      -- Network/fetch errors
        'validation',   -- Form/data validation
        'auth',         -- Authentication errors
        'permission',   -- Authorization errors
        'payment',      -- Payment processing errors
        'integration',  -- Third-party integration errors
        'unknown'       -- Uncategorized
    )),
    
    -- Error Details
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_name TEXT,
    error_code TEXT,
    
    -- Severity
    severity TEXT DEFAULT 'error' CHECK (severity IN (
        'debug', 'info', 'warning', 'error', 'critical', 'fatal'
    )),
    
    -- Context
    url TEXT,
    route TEXT,
    component TEXT,
    action TEXT,
    
    -- User Context
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    session_id TEXT,
    
    -- Environment
    environment TEXT DEFAULT 'production' CHECK (environment IN (
        'development', 'staging', 'production'
    )),
    release_version TEXT,
    commit_sha TEXT,
    
    -- Browser/Device
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    device_type TEXT,
    screen_resolution TEXT,
    user_agent TEXT,
    
    -- Network
    ip_address INET,
    country_code VARCHAR(3),
    
    -- Request Context (for API errors)
    request_method TEXT,
    request_url TEXT,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    
    -- Additional Context
    breadcrumbs JSONB DEFAULT '[]',
    tags JSONB DEFAULT '{}',
    extra_data JSONB DEFAULT '{}',
    
    -- Occurrence Tracking
    occurrence_count INTEGER DEFAULT 1,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Resolution Status
    status TEXT DEFAULT 'unresolved' CHECK (status IN (
        'unresolved',   -- New/Active error
        'investigating', -- Being looked at
        'resolved',     -- Fixed
        'ignored',      -- Intentionally ignored
        'muted'         -- Temporarily muted
    )),
    assigned_to UUID,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Notifications
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 2. APPLICATION LOGS TABLE
-- ===========================================
-- Centralized structured logging

CREATE TABLE IF NOT EXISTS application_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Log Identity
    level TEXT NOT NULL CHECK (level IN (
        'trace', 'debug', 'info', 'warn', 'error', 'fatal'
    )),
    logger TEXT NOT NULL,
    
    -- Message
    message TEXT NOT NULL,
    
    -- Structured Data
    data JSONB DEFAULT '{}',
    
    -- Context
    source TEXT DEFAULT 'backend' CHECK (source IN (
        'frontend', 'backend', 'edge', 'worker', 'cron'
    )),
    environment TEXT DEFAULT 'production',
    
    -- Tracing
    correlation_id TEXT,
    request_id TEXT,
    span_id TEXT,
    trace_id TEXT,
    
    -- User Context
    user_id UUID,
    session_id TEXT,
    
    -- Performance
    duration_ms INTEGER,
    
    -- Location
    file_name TEXT,
    line_number INTEGER,
    function_name TEXT,
    
    -- Network
    ip_address INET,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 3. HEALTH CHECKS TABLE
-- ===========================================
-- System health monitoring

CREATE TABLE IF NOT EXISTS health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    
    -- Check Identity
    check_name TEXT NOT NULL,
    check_type TEXT NOT NULL CHECK (check_type IN (
        'http',         -- HTTP endpoint check
        'database',     -- Database connectivity
        'storage',      -- File storage
        'auth',         -- Authentication service
        'email',        -- Email service
        'payment',      -- Payment gateway
        'api',          -- External API
        'dns',          -- DNS resolution
        'ssl',          -- SSL certificate
        'custom'        -- Custom check
    )),
    
    -- Target
    endpoint TEXT,
    expected_status INTEGER,
    
    -- Result
    status TEXT NOT NULL CHECK (status IN (
        'healthy',      -- All good
        'degraded',     -- Slow/partial issues
        'unhealthy',    -- Down/failing
        'unknown'       -- Check failed to run
    )),
    
    -- Metrics
    response_time_ms INTEGER,
    response_status INTEGER,
    
    -- Details
    error_message TEXT,
    response_body TEXT,
    headers JSONB,
    
    -- Metadata
    region TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 4. ALERTS TABLE
-- ===========================================
-- System alerts and notifications

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Alert Identity
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'error_spike',          -- Sudden increase in errors
        'error_new',            -- New error type detected
        'high_latency',         -- Performance degradation
        'downtime',             -- Service unavailable
        'ssl_expiring',         -- SSL certificate expiring
        'usage_limit',          -- Approaching usage limits
        'payment_failed',       -- Payment processing failed
        'subscription_expiring', -- Subscription ending soon
        'security',             -- Security-related alert
        'deployment',           -- Deployment issues
        'custom'                -- Custom alert
    )),
    
    -- Severity
    severity TEXT NOT NULL CHECK (severity IN (
        'info', 'warning', 'critical'
    )),
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    
    -- Source
    source_type TEXT,
    source_id UUID,
    source_url TEXT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active',       -- Alert is active
        'acknowledged', -- Someone is looking at it
        'resolved',     -- Issue resolved
        'snoozed'       -- Temporarily muted
    )),
    
    -- Actions
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Snooze
    snoozed_until TIMESTAMPTZ,
    snoozed_by UUID,
    
    -- Notifications
    notification_channels TEXT[] DEFAULT '{}',
    notifications_sent JSONB DEFAULT '[]',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 5. ALERT RULES TABLE
-- ===========================================
-- Configurable alerting rules

CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Rule Identity
    name TEXT NOT NULL,
    description TEXT,
    
    -- Condition
    rule_type TEXT NOT NULL CHECK (rule_type IN (
        'threshold',    -- Value exceeds threshold
        'anomaly',      -- Statistical anomaly
        'absence',      -- Expected event didn't occur
        'pattern'       -- Pattern matching
    )),
    
    metric TEXT NOT NULL,
    operator TEXT NOT NULL CHECK (operator IN (
        'gt', 'gte', 'lt', 'lte', 'eq', 'neq', 'contains', 'matches'
    )),
    threshold_value TEXT NOT NULL,
    
    -- Time Window
    time_window_minutes INTEGER DEFAULT 5,
    evaluation_interval_minutes INTEGER DEFAULT 1,
    
    -- Alert Configuration
    alert_severity TEXT DEFAULT 'warning',
    alert_title_template TEXT,
    alert_description_template TEXT,
    
    -- Notification
    notification_channels TEXT[] DEFAULT '{}',
    cooldown_minutes INTEGER DEFAULT 60,
    
    -- Status
    is_enabled BOOLEAN DEFAULT true,
    is_global BOOLEAN DEFAULT false,
    
    -- Metadata
    tags JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ
);

-- ===========================================
-- 6. NOTIFICATION CHANNELS TABLE
-- ===========================================
-- Alert delivery channels

CREATE TABLE IF NOT EXISTS notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Channel Identity
    name TEXT NOT NULL,
    channel_type TEXT NOT NULL CHECK (channel_type IN (
        'email',        -- Email notification
        'slack',        -- Slack webhook
        'discord',      -- Discord webhook
        'webhook',      -- Generic webhook
        'sms',          -- SMS notification
        'push'          -- Push notification
    )),
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Status
    is_enabled BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- Rate Limiting
    rate_limit_per_hour INTEGER DEFAULT 60,
    
    -- Metadata
    last_used_at TIMESTAMPTZ,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 7. ERROR AGGREGATION VIEW
-- ===========================================
-- Aggregated error statistics

CREATE OR REPLACE VIEW error_stats AS
SELECT 
    tenant_id,
    error_type,
    severity,
    status,
    COUNT(*) as total_errors,
    SUM(occurrence_count) as total_occurrences,
    COUNT(DISTINCT error_fingerprint) as unique_errors,
    MAX(last_seen_at) as most_recent,
    MIN(first_seen_at) as first_seen
FROM error_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY tenant_id, error_type, severity, status;

-- ===========================================
-- 8. HEALTH STATUS VIEW
-- ===========================================
-- Latest health check status per check

CREATE OR REPLACE VIEW latest_health_status AS
SELECT DISTINCT ON (tenant_id, check_name)
    id,
    tenant_id,
    check_name,
    check_type,
    endpoint,
    status,
    response_time_ms,
    error_message,
    created_at
FROM health_checks
ORDER BY tenant_id, check_name, created_at DESC;

-- ===========================================
-- 9. INDEXES
-- ===========================================

-- Error Logs
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant ON error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_fingerprint ON error_logs(error_fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant_created ON error_logs(tenant_id, created_at DESC);

-- Application Logs
CREATE INDEX IF NOT EXISTS idx_app_logs_tenant ON application_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON application_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_logger ON application_logs(logger);
CREATE INDEX IF NOT EXISTS idx_app_logs_created ON application_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_correlation ON application_logs(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_logs_tenant_created ON application_logs(tenant_id, created_at DESC);

-- Health Checks
CREATE INDEX IF NOT EXISTS idx_health_checks_tenant ON health_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_health_checks_type ON health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_created ON health_checks(created_at DESC);

-- Alerts
CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at DESC);

-- Alert Rules
CREATE INDEX IF NOT EXISTS idx_alert_rules_tenant ON alert_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(is_enabled) WHERE is_enabled = true;

-- Notification Channels
CREATE INDEX IF NOT EXISTS idx_notification_channels_tenant ON notification_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON notification_channels(channel_type);

-- ===========================================
-- 10. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;

-- Error Logs: Developers see all, users see their tenant
CREATE POLICY error_logs_developer_all ON error_logs
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY error_logs_tenant_select ON error_logs
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );

-- Application Logs: Same as error logs
CREATE POLICY app_logs_developer_all ON application_logs
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY app_logs_tenant_select ON application_logs
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );

-- Health Checks: Developers see all
CREATE POLICY health_checks_developer_all ON health_checks
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY health_checks_select ON health_checks
    FOR SELECT USING (
        tenant_id IS NULL OR
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Alerts: Developers see all, admins see their tenant
CREATE POLICY alerts_developer_all ON alerts
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY alerts_tenant_all ON alerts
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );

-- Alert Rules: Same as alerts
CREATE POLICY alert_rules_developer_all ON alert_rules
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY alert_rules_tenant_all ON alert_rules
    FOR ALL USING (
        is_global = true OR
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );

-- Notification Channels: Same as alerts
CREATE POLICY notification_channels_developer_all ON notification_channels
    FOR ALL USING (is_saas_developer());
    
CREATE POLICY notification_channels_tenant_all ON notification_channels
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );

-- ===========================================
-- 11. TRIGGER FOR ALERT CREATION
-- ===========================================

-- Auto-create alert on critical errors
CREATE OR REPLACE FUNCTION create_error_alert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.severity IN ('critical', 'fatal') THEN
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
            'error_new',
            CASE WHEN NEW.severity = 'fatal' THEN 'critical' ELSE 'warning' END,
            'Critical Error: ' || LEFT(NEW.error_message, 100),
            NEW.error_message,
            'error_log',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_error_alert ON error_logs;
CREATE TRIGGER trigger_error_alert
    AFTER INSERT ON error_logs
    FOR EACH ROW
    WHEN (NEW.severity IN ('critical', 'fatal'))
    EXECUTE FUNCTION create_error_alert();

-- ===========================================
-- 12. CLEANUP FUNCTIONS
-- ===========================================

-- Delete old logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_logs(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(deleted_errors BIGINT, deleted_app_logs BIGINT, deleted_health_checks BIGINT) AS $$
DECLARE
    cutoff_date TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
    errors_deleted BIGINT;
    logs_deleted BIGINT;
    health_deleted BIGINT;
BEGIN
    DELETE FROM error_logs WHERE created_at < cutoff_date AND status IN ('resolved', 'ignored');
    GET DIAGNOSTICS errors_deleted = ROW_COUNT;
    
    DELETE FROM application_logs WHERE created_at < cutoff_date;
    GET DIAGNOSTICS logs_deleted = ROW_COUNT;
    
    DELETE FROM health_checks WHERE created_at < cutoff_date;
    GET DIAGNOSTICS health_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT errors_deleted, logs_deleted, health_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant comment for documentation
COMMENT ON TABLE error_logs IS 'Centralized error tracking across all tenant instances';
COMMENT ON TABLE application_logs IS 'Structured application logs for debugging';
COMMENT ON TABLE health_checks IS 'System health monitoring results';
COMMENT ON TABLE alerts IS 'Active and historical system alerts';
