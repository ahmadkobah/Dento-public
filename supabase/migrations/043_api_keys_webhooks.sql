-- Migration: 043_api_keys_webhooks.sql
-- Creates tables for API keys, webhooks, and webhook logs
-- Also adds feature_flags table for granular feature control

-- ================================================
-- API KEYS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Key identity
    name TEXT NOT NULL,
    description TEXT,
    key_prefix TEXT NOT NULL, -- First 8 chars for display (e.g., "dk_live_")
    key_hash TEXT NOT NULL, -- SHA-256 hash of the full key
    key_hint TEXT, -- Last 4 chars for identification
    
    -- Key type and scope
    key_type TEXT NOT NULL DEFAULT 'live' CHECK (key_type IN ('live', 'test', 'restricted')),
    environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'development')),
    
    -- Permissions
    scopes TEXT[] NOT NULL DEFAULT ARRAY['read'], -- read, write, delete, admin
    allowed_ips TEXT[], -- IP whitelist (null = all allowed)
    allowed_origins TEXT[], -- CORS origins (null = all allowed)
    
    -- Rate limiting
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    
    -- Usage tracking
    total_requests BIGINT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    
    -- Lifecycle
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id),
    revoked_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_type ON api_keys(key_type, environment);

-- ================================================
-- API KEY USAGE LOGS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS api_key_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    
    -- Request details
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    
    -- Client info
    ip_address INET,
    user_agent TEXT,
    origin TEXT,
    
    -- Request/Response size
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Error info
    error_code TEXT,
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_tenant ON api_key_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_time ON api_key_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_endpoint ON api_key_usage(endpoint, created_at DESC);

-- Partition by time for performance (optional, can be added later)
-- This table will grow fast, consider partitioning or retention policy

-- ================================================
-- WEBHOOKS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Webhook identity
    name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    
    -- Authentication
    secret TEXT, -- Signing secret for webhook payload
    auth_type TEXT DEFAULT 'signature' CHECK (auth_type IN ('signature', 'basic', 'bearer', 'none')),
    auth_config JSONB, -- Additional auth configuration
    
    -- Events
    events TEXT[] NOT NULL, -- Array of event types to trigger
    
    -- Request configuration
    http_method TEXT DEFAULT 'POST' CHECK (http_method IN ('POST', 'PUT', 'PATCH')),
    content_type TEXT DEFAULT 'application/json',
    headers JSONB DEFAULT '{}', -- Custom headers
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Retry configuration
    retry_enabled BOOLEAN DEFAULT true,
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    retry_backoff_multiplier NUMERIC(3,1) DEFAULT 2.0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused', 'failed')),
    failure_count INTEGER DEFAULT 0,
    consecutive_failures INTEGER DEFAULT 0,
    last_failure_at TIMESTAMPTZ,
    last_failure_reason TEXT,
    
    -- Auto-disable on failures
    auto_disable_threshold INTEGER DEFAULT 10, -- Disable after N consecutive failures
    disabled_at TIMESTAMPTZ,
    disabled_reason TEXT,
    
    -- Stats
    total_deliveries BIGINT DEFAULT 0,
    successful_deliveries BIGINT DEFAULT 0,
    failed_deliveries BIGINT DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    average_response_time_ms INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);

-- ================================================
-- WEBHOOK EVENT TYPES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS webhook_event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identity
    event_name TEXT NOT NULL UNIQUE, -- e.g., 'patient.created'
    category TEXT NOT NULL, -- e.g., 'patient', 'appointment', 'invoice'
    description TEXT,
    
    -- Payload schema
    payload_schema JSONB, -- JSON Schema for event payload
    example_payload JSONB,
    
    -- Availability
    is_active BOOLEAN DEFAULT true,
    is_beta BOOLEAN DEFAULT false,
    min_plan TEXT, -- Minimum subscription plan required
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default webhook event types
INSERT INTO webhook_event_types (event_name, category, description) VALUES
    -- Patient events
    ('patient.created', 'patient', 'Triggered when a new patient is created'),
    ('patient.updated', 'patient', 'Triggered when patient information is updated'),
    ('patient.deleted', 'patient', 'Triggered when a patient is deleted'),
    
    -- Appointment events
    ('appointment.created', 'appointment', 'Triggered when an appointment is scheduled'),
    ('appointment.updated', 'appointment', 'Triggered when an appointment is modified'),
    ('appointment.cancelled', 'appointment', 'Triggered when an appointment is cancelled'),
    ('appointment.completed', 'appointment', 'Triggered when an appointment is marked complete'),
    ('appointment.reminder', 'appointment', 'Triggered when appointment reminder is due'),
    ('appointment.no_show', 'appointment', 'Triggered when patient is marked as no-show'),
    
    -- Invoice events
    ('invoice.created', 'invoice', 'Triggered when an invoice is created'),
    ('invoice.paid', 'invoice', 'Triggered when an invoice is paid'),
    ('invoice.overdue', 'invoice', 'Triggered when an invoice becomes overdue'),
    ('invoice.cancelled', 'invoice', 'Triggered when an invoice is cancelled'),
    
    -- Treatment events
    ('treatment.started', 'treatment', 'Triggered when a treatment plan is started'),
    ('treatment.completed', 'treatment', 'Triggered when a treatment plan is completed'),
    ('treatment.updated', 'treatment', 'Triggered when a treatment plan is modified'),
    
    -- User events
    ('user.created', 'user', 'Triggered when a new user is created'),
    ('user.updated', 'user', 'Triggered when user information is updated'),
    ('user.login', 'user', 'Triggered on user login'),
    ('user.logout', 'user', 'Triggered on user logout'),
    
    -- System events
    ('system.backup_completed', 'system', 'Triggered when a backup is completed'),
    ('system.maintenance', 'system', 'Triggered for maintenance notifications'),
    ('system.error', 'system', 'Triggered on system errors')
ON CONFLICT (event_name) DO NOTHING;

-- ================================================
-- WEBHOOK DELIVERY LOGS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    
    -- Event details
    event_type TEXT NOT NULL,
    event_id TEXT, -- Unique event ID for idempotency
    
    -- Request details
    request_url TEXT NOT NULL,
    request_method TEXT NOT NULL,
    request_headers JSONB,
    request_body JSONB,
    request_size_bytes INTEGER,
    
    -- Response details
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    response_size_bytes INTEGER,
    response_time_ms INTEGER,
    
    -- Delivery status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
    attempt_number INTEGER DEFAULT 1,
    
    -- Error info
    error_code TEXT,
    error_message TEXT,
    
    -- Retry info
    next_retry_at TIMESTAMPTZ,
    will_retry BOOLEAN DEFAULT false,
    
    -- Timestamps
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_tenant ON webhook_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_time ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry ON webhook_logs(next_retry_at) WHERE will_retry = true;

-- ================================================
-- FEATURE FLAGS TABLE (Global and Tenant-specific)
-- ================================================

CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Flag identity
    key TEXT NOT NULL, -- e.g., 'new_dashboard', 'beta_reports'
    name TEXT NOT NULL,
    description TEXT,
    
    -- Scope
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = global flag
    
    -- Value
    enabled BOOLEAN DEFAULT false,
    value JSONB, -- For flags with complex values
    
    -- Targeting
    percentage_rollout INTEGER, -- 0-100 for gradual rollout
    user_ids UUID[], -- Specific users to enable for
    
    -- Conditions
    conditions JSONB, -- Complex targeting rules
    
    -- Schedule
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Unique constraint: one flag per key per tenant (or global)
    UNIQUE (key, tenant_id)
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_global ON feature_flags(key) WHERE tenant_id IS NULL;

-- ================================================
-- ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY api_keys_developer_all ON api_keys 
    FOR ALL TO authenticated 
    USING (is_saas_developer())
    WITH CHECK (is_saas_developer());

CREATE POLICY api_keys_tenant_admin ON api_keys 
    FOR ALL TO authenticated 
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- API Key Usage policies
CREATE POLICY api_key_usage_developer_all ON api_key_usage 
    FOR ALL TO authenticated 
    USING (is_saas_developer());

CREATE POLICY api_key_usage_tenant_read ON api_key_usage 
    FOR SELECT TO authenticated 
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Webhooks policies
CREATE POLICY webhooks_developer_all ON webhooks 
    FOR ALL TO authenticated 
    USING (is_saas_developer())
    WITH CHECK (is_saas_developer());

CREATE POLICY webhooks_tenant_admin ON webhooks 
    FOR ALL TO authenticated 
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

-- Webhook Event Types policies (public read)
CREATE POLICY webhook_event_types_read ON webhook_event_types 
    FOR SELECT TO authenticated 
    USING (is_active = true);

CREATE POLICY webhook_event_types_manage ON webhook_event_types 
    FOR ALL TO authenticated 
    USING (is_saas_developer())
    WITH CHECK (is_saas_developer());

-- Webhook Logs policies
CREATE POLICY webhook_logs_developer_all ON webhook_logs 
    FOR ALL TO authenticated 
    USING (is_saas_developer());

CREATE POLICY webhook_logs_tenant_read ON webhook_logs 
    FOR SELECT TO authenticated 
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Feature Flags policies
CREATE POLICY feature_flags_developer_all ON feature_flags 
    FOR ALL TO authenticated 
    USING (is_saas_developer())
    WITH CHECK (is_saas_developer());

CREATE POLICY feature_flags_tenant_read ON feature_flags 
    FOR SELECT TO authenticated 
    USING (
        tenant_id IS NULL -- Global flags readable by all
        OR tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- ================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_webhook_event_types_updated_at
    BEFORE UPDATE ON webhook_event_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to generate API key prefix
CREATE OR REPLACE FUNCTION generate_api_key_prefix(key_type TEXT, environment TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN 'dk_' || 
           CASE key_type 
               WHEN 'live' THEN 'live' 
               WHEN 'test' THEN 'test' 
               ELSE 'rest' 
           END || '_';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to increment webhook delivery stats
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'success' THEN
        UPDATE webhooks SET
            total_deliveries = total_deliveries + 1,
            successful_deliveries = successful_deliveries + 1,
            last_success_at = NOW(),
            last_triggered_at = NOW(),
            consecutive_failures = 0,
            average_response_time_ms = COALESCE(
                (average_response_time_ms * successful_deliveries + NEW.response_time_ms) / (successful_deliveries + 1),
                NEW.response_time_ms
            )
        WHERE id = NEW.webhook_id;
    ELSIF NEW.status = 'failed' AND NOT NEW.will_retry THEN
        UPDATE webhooks SET
            total_deliveries = total_deliveries + 1,
            failed_deliveries = failed_deliveries + 1,
            last_failure_at = NOW(),
            last_failure_reason = NEW.error_message,
            last_triggered_at = NOW(),
            consecutive_failures = consecutive_failures + 1,
            -- Auto-disable if threshold reached
            status = CASE 
                WHEN consecutive_failures + 1 >= auto_disable_threshold THEN 'failed'
                ELSE status
            END,
            disabled_at = CASE 
                WHEN consecutive_failures + 1 >= auto_disable_threshold THEN NOW()
                ELSE disabled_at
            END,
            disabled_reason = CASE 
                WHEN consecutive_failures + 1 >= auto_disable_threshold THEN 'Auto-disabled: exceeded failure threshold'
                ELSE disabled_reason
            END
        WHERE id = NEW.webhook_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_webhook_stats
    AFTER INSERT OR UPDATE OF status ON webhook_logs
    FOR EACH ROW
    WHEN (NEW.status IN ('success', 'failed'))
    EXECUTE FUNCTION update_webhook_stats();

-- Function to increment API key usage
CREATE OR REPLACE FUNCTION update_api_key_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE api_keys SET
        total_requests = total_requests + 1,
        last_used_at = NOW(),
        last_used_ip = NEW.ip_address
    WHERE id = NEW.api_key_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_api_key_usage_stats
    AFTER INSERT ON api_key_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_api_key_usage_stats();

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE api_keys IS 'Stores API keys for tenant integrations';
COMMENT ON TABLE api_key_usage IS 'Logs all API key usage for analytics and rate limiting';
COMMENT ON TABLE webhooks IS 'Webhook configurations for event notifications';
COMMENT ON TABLE webhook_event_types IS 'Available webhook event types with schemas';
COMMENT ON TABLE webhook_logs IS 'Delivery logs for webhook calls';
COMMENT ON TABLE feature_flags IS 'Feature flags for gradual rollouts and A/B testing';
