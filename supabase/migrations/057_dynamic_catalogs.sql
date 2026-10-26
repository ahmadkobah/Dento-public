-- ================================================
-- Migration: Dynamic API & Webhook Catalogs
-- Enables real-time API and webhook event documentation
-- ================================================

-- ================================================
-- PART 1: Enhance webhook_event_types table
-- ================================================

-- Add new columns for richer event documentation
ALTER TABLE webhook_event_types 
ADD COLUMN IF NOT EXISTS use_case TEXT,
ADD COLUMN IF NOT EXISTS retry_policy TEXT DEFAULT '3 attempts with exponential backoff',
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT 'v1',
ADD COLUMN IF NOT EXISTS deprecated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deprecated_message TEXT;

-- Update existing events with use cases and example payloads
UPDATE webhook_event_types SET 
  use_case = 'Sync new patients to CRM, send welcome emails',
  example_payload = '{
    "event": "patient.created",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "patient_id": "uuid",
      "first_name": "string",
      "last_name": "string",
      "email": "string",
      "phone": "string",
      "tenant_id": "uuid"
    }
  }'::jsonb
WHERE event_name = 'patient.created';

UPDATE webhook_event_types SET 
  use_case = 'Keep external systems in sync with patient data',
  example_payload = '{
    "event": "patient.updated",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "patient_id": "uuid",
      "updated_fields": ["email", "phone"],
      "previous": {"email": "old@example.com"},
      "current": {"email": "new@example.com"}
    }
  }'::jsonb
WHERE event_name = 'patient.updated';

UPDATE webhook_event_types SET 
  use_case = 'GDPR compliance, cleanup in external systems',
  retry_policy = '5 attempts with exponential backoff',
  example_payload = '{
    "event": "patient.deleted",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "patient_id": "uuid",
      "deleted_by": "uuid",
      "reason": "string"
    }
  }'::jsonb
WHERE event_name = 'patient.deleted';

UPDATE webhook_event_types SET 
  use_case = 'Sync to external calendar, send confirmation SMS',
  example_payload = '{
    "event": "appointment.created",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "appointment_id": "uuid",
      "patient_id": "uuid",
      "practitioner_id": "uuid",
      "start_time": "datetime",
      "end_time": "datetime",
      "service_type": "string",
      "status": "scheduled"
    }
  }'::jsonb
WHERE event_name = 'appointment.created';

UPDATE webhook_event_types SET 
  use_case = 'Update calendar integrations, notify affected parties',
  example_payload = '{
    "event": "appointment.updated",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "appointment_id": "uuid",
      "updated_fields": ["start_time", "practitioner_id"],
      "previous": {},
      "current": {}
    }
  }'::jsonb
WHERE event_name = 'appointment.updated';

UPDATE webhook_event_types SET 
  use_case = 'Process refunds, send cancellation notifications',
  retry_policy = '5 attempts with exponential backoff',
  example_payload = '{
    "event": "appointment.cancelled",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "appointment_id": "uuid",
      "cancelled_by": "uuid",
      "reason": "string",
      "refund_amount": "number"
    }
  }'::jsonb
WHERE event_name = 'appointment.cancelled';

UPDATE webhook_event_types SET 
  use_case = 'Trigger follow-up workflows, update analytics',
  example_payload = '{
    "event": "appointment.completed",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "appointment_id": "uuid",
      "patient_id": "uuid",
      "practitioner_id": "uuid",
      "services_rendered": [],
      "notes_added": true
    }
  }'::jsonb
WHERE event_name = 'appointment.completed';

UPDATE webhook_event_types SET 
  use_case = 'Send custom reminder via preferred channel',
  example_payload = '{
    "event": "appointment.reminder",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "appointment_id": "uuid",
      "patient_id": "uuid",
      "reminder_type": "24h | 1h",
      "appointment_time": "datetime"
    }
  }'::jsonb
WHERE event_name = 'appointment.reminder';

UPDATE webhook_event_types SET 
  use_case = 'Track no-show patterns, apply fee policies',
  example_payload = '{
    "event": "appointment.no_show",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "appointment_id": "uuid",
      "patient_id": "uuid",
      "no_show_count": "number",
      "fee_charged": "number"
    }
  }'::jsonb
WHERE event_name = 'appointment.no_show';

UPDATE webhook_event_types SET 
  use_case = 'Sync to accounting software, generate PDF',
  example_payload = '{
    "event": "invoice.created",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "invoice_id": "uuid",
      "patient_id": "uuid",
      "amount": "number",
      "currency": "string",
      "line_items": [],
      "due_date": "date"
    }
  }'::jsonb
WHERE event_name = 'invoice.created';

UPDATE webhook_event_types SET 
  use_case = 'Update accounting, send receipt, update patient balance',
  retry_policy = '5 attempts with exponential backoff',
  example_payload = '{
    "event": "invoice.paid",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "invoice_id": "uuid",
      "patient_id": "uuid",
      "amount_paid": "number",
      "payment_method": "string",
      "transaction_id": "string"
    }
  }'::jsonb
WHERE event_name = 'invoice.paid';

UPDATE webhook_event_types SET 
  use_case = 'Send payment reminders, escalate to collections',
  example_payload = '{
    "event": "invoice.overdue",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "invoice_id": "uuid",
      "patient_id": "uuid",
      "days_overdue": "number",
      "amount_due": "number"
    }
  }'::jsonb
WHERE event_name = 'invoice.overdue';

UPDATE webhook_event_types SET 
  use_case = 'Reverse accounting entries, update reports',
  example_payload = '{
    "event": "invoice.cancelled",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "invoice_id": "uuid",
      "cancelled_by": "uuid",
      "reason": "string"
    }
  }'::jsonb
WHERE event_name = 'invoice.cancelled';

UPDATE webhook_event_types SET 
  use_case = 'Initialize treatment tracking, setup reminders',
  example_payload = '{
    "event": "treatment.started",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "treatment_id": "uuid",
      "patient_id": "uuid",
      "treatment_type": "string",
      "estimated_cost": "number",
      "planned_sessions": "number"
    }
  }'::jsonb
WHERE event_name = 'treatment.started';

UPDATE webhook_event_types SET 
  use_case = 'Generate final invoice, request review, update records',
  example_payload = '{
    "event": "treatment.completed",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "treatment_id": "uuid",
      "patient_id": "uuid",
      "total_cost": "number",
      "sessions_completed": "number",
      "outcome": "string"
    }
  }'::jsonb
WHERE event_name = 'treatment.completed';

UPDATE webhook_event_types SET 
  use_case = 'Notify patient of plan changes, update cost estimates',
  example_payload = '{
    "event": "treatment.updated",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "treatment_id": "uuid",
      "updated_fields": [],
      "updated_by": "uuid"
    }
  }'::jsonb
WHERE event_name = 'treatment.updated';

UPDATE webhook_event_types SET 
  use_case = 'Send onboarding emails, provision accounts',
  example_payload = '{
    "event": "user.created",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "user_id": "uuid",
      "email": "string",
      "role": "string",
      "tenant_id": "uuid"
    }
  }'::jsonb
WHERE event_name = 'user.created';

UPDATE webhook_event_types SET 
  use_case = 'Sync profile changes, update permissions',
  example_payload = '{
    "event": "user.updated",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "user_id": "uuid",
      "updated_fields": [],
      "updated_by": "uuid"
    }
  }'::jsonb
WHERE event_name = 'user.updated';

UPDATE webhook_event_types SET 
  use_case = 'Security monitoring, analytics, session tracking',
  retry_policy = '1 attempt (best effort)',
  example_payload = '{
    "event": "user.login",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "user_id": "uuid",
      "ip_address": "string",
      "user_agent": "string",
      "location": {"country": "string", "city": "string"}
    }
  }'::jsonb
WHERE event_name = 'user.login';

UPDATE webhook_event_types SET 
  use_case = 'Session analytics, usage tracking',
  retry_policy = '1 attempt (best effort)',
  example_payload = '{
    "event": "user.logout",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "user_id": "uuid",
      "session_duration_minutes": "number"
    }
  }'::jsonb
WHERE event_name = 'user.logout';

UPDATE webhook_event_types SET 
  use_case = 'Notify admins, trigger secondary backups, compliance logs',
  retry_policy = '5 attempts with exponential backoff',
  example_payload = '{
    "event": "system.backup_completed",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "backup_id": "string",
      "size_bytes": "number",
      "duration_seconds": "number",
      "storage_location": "string"
    }
  }'::jsonb
WHERE event_name = 'system.backup_completed';

UPDATE webhook_event_types SET 
  use_case = 'Alert stakeholders, update status page',
  retry_policy = '5 attempts with exponential backoff',
  example_payload = '{
    "event": "system.maintenance",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "maintenance_type": "scheduled | emergency",
      "start_time": "datetime",
      "estimated_duration_minutes": "number",
      "affected_services": []
    }
  }'::jsonb
WHERE event_name = 'system.maintenance';

UPDATE webhook_event_types SET 
  use_case = 'PagerDuty integration, Slack alerts, incident management',
  retry_policy = '5 attempts with exponential backoff',
  example_payload = '{
    "event": "system.error",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
      "error_id": "string",
      "severity": "warning | error | critical",
      "service": "string",
      "message": "string",
      "stack_trace": "string"
    }
  }'::jsonb
WHERE event_name = 'system.error';

-- ================================================
-- PART 2: Create api_definitions table
-- ================================================

CREATE TABLE IF NOT EXISTS api_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- API identity
    name TEXT NOT NULL UNIQUE,
    endpoint TEXT NOT NULL,
    category TEXT NOT NULL,
    
    -- Documentation
    description TEXT,
    methods TEXT[] NOT NULL DEFAULT '{}',
    operations TEXT[] DEFAULT '{}',
    scopes TEXT[] DEFAULT '{}',
    required_roles TEXT[] DEFAULT '{}',
    
    -- Configuration
    is_authenticated BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    is_beta BOOLEAN DEFAULT false,
    is_deprecated BOOLEAN DEFAULT false,
    deprecated_message TEXT,
    version TEXT DEFAULT 'v1',
    
    -- Rate limiting
    rate_limit_per_minute INTEGER,
    rate_limit_per_day INTEGER,
    
    -- Display
    display_order INTEGER DEFAULT 0,
    icon TEXT,
    color TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_definitions_category ON api_definitions(category);
CREATE INDEX IF NOT EXISTS idx_api_definitions_active ON api_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_api_definitions_order ON api_definitions(category, display_order);

-- Triggers
CREATE OR REPLACE TRIGGER update_api_definitions_updated_at
    BEFORE UPDATE ON api_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE api_definitions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view API definitions
CREATE POLICY api_definitions_read ON api_definitions 
    FOR SELECT TO authenticated USING (true);

-- Only developers/admins can manage
CREATE POLICY api_definitions_manage ON api_definitions 
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('developer', 'admin')
        )
    );

-- ================================================
-- PART 3: Seed API definitions
-- ================================================

INSERT INTO api_definitions (name, endpoint, category, description, methods, operations, scopes, required_roles, display_order) VALUES
-- Tenant Management (category: tenant)
('tenant-management', '/functions/v1/tenant-management', 'tenant', 'Full CRUD for tenant/clinic management', 
 ARRAY['GET', 'POST', 'PUT', 'DELETE'], 
 ARRAY['List tenants', 'Create tenant', 'Update settings', 'Get stats'],
 ARRAY['read', 'write', 'delete'],
 ARRAY['developer', 'admin'], 1),

('tenant-modules', '/functions/v1/tenant-modules', 'tenant', 'Manage tenant module licenses',
 ARRAY['GET', 'POST', 'PUT', 'DELETE'],
 ARRAY['List modules', 'Activate module', 'Start trial', 'Deactivate'],
 ARRAY['read', 'write'],
 ARRAY['authenticated'], 2),

('tenant-impersonate', '/functions/v1/tenant-impersonate', 'tenant', 'Secure tenant impersonation for support',
 ARRAY['GET', 'POST', 'PUT', 'DELETE'],
 ARRAY['List sessions', 'Start session', 'Log action', 'End session'],
 ARRAY['admin'],
 ARRAY['developer'], 3),

-- Developer Portal (category: developer)
('api-keys', '/functions/v1/api-keys', 'developer', 'API key management',
 ARRAY['GET', 'POST', 'PUT', 'DELETE'],
 ARRAY['List keys', 'Create key', 'Get usage', 'Revoke key'],
 ARRAY['read', 'write', 'delete'],
 ARRAY['developer', 'admin'], 1),

('webhooks-api', '/functions/v1/webhooks-api', 'developer', 'Webhook configuration and logs',
 ARRAY['GET', 'POST', 'PUT', 'DELETE'],
 ARRAY['List webhooks', 'Create webhook', 'Test delivery', 'View logs'],
 ARRAY['read', 'write', 'delete'],
 ARRAY['developer', 'admin'], 2),

('audit-api', '/functions/v1/audit-api', 'developer', 'Query platform audit logs',
 ARRAY['GET'],
 ARRAY['List logs', 'Filter by action', 'Export CSV'],
 ARRAY['read'],
 ARRAY['developer'], 3),

('monitoring-api', '/functions/v1/monitoring-api', 'developer', 'Error monitoring and health checks',
 ARRAY['GET', 'PUT'],
 ARRAY['Error stats', 'List errors', 'Health status', 'Manage alerts'],
 ARRAY['read', 'write'],
 ARRAY['developer'], 4),

('dashboard-stats', '/functions/v1/dashboard-stats', 'developer', 'Aggregated platform statistics',
 ARRAY['GET'],
 ARRAY['Full stats', 'Activity feed', 'Health summary'],
 ARRAY['read'],
 ARRAY['authenticated'], 5),

('deployment-api', '/functions/v1/deployment-api', 'developer', 'Deployment management and versioning',
 ARRAY['GET', 'POST', 'PUT'],
 ARRAY['List deployments', 'Create deployment', 'Rollback'],
 ARRAY['read', 'write'],
 ARRAY['developer'], 6),

-- Domain Management (category: domain)
('domain-api', '/functions/v1/domain-api', 'developer', 'Custom domain management',
 ARRAY['GET', 'POST', 'PUT', 'DELETE'],
 ARRAY['List domains', 'Add domain', 'Verify DNS', 'Provision SSL'],
 ARRAY['read', 'write', 'delete'],
 ARRAY['developer'], 1),

('verify-domain', '/functions/v1/verify-domain', 'domain', 'Domain verification and SSL',
 ARRAY['GET', 'POST', 'PATCH', 'DELETE'],
 ARRAY['Check DNS', 'Verify ownership', 'Update config', 'Remove domain'],
 ARRAY['read', 'write'],
 ARRAY['developer'], 2),

-- Financial (category: financial)
('subscription-api', '/functions/v1/subscription-api', 'financial', 'Subscription and billing management',
 ARRAY['GET', 'POST', 'PUT'],
 ARRAY['Get subscription', 'Create subscription', 'Update plan', 'Cancel'],
 ARRAY['read', 'write'],
 ARRAY['developer', 'admin'], 1),

('billing-api', '/functions/v1/billing-api', 'financial', 'Invoice and payment processing',
 ARRAY['GET', 'POST'],
 ARRAY['List invoices', 'Get invoice', 'Process payment', 'Refund'],
 ARRAY['read', 'write'],
 ARRAY['developer', 'admin'], 2),

('usage-api', '/functions/v1/usage-api', 'financial', 'Usage metering and tracking',
 ARRAY['GET', 'POST'],
 ARRAY['Get usage', 'Record usage', 'Usage by period'],
 ARRAY['read', 'write'],
 ARRAY['authenticated'], 3),

('stripe-webhook', '/functions/v1/stripe-webhook', 'financial', 'Stripe payment webhooks',
 ARRAY['POST'],
 ARRAY['Handle payment events', 'Subscription updates', 'Invoice events'],
 ARRAY['webhook'],
 ARRAY['public'], 4),

-- CMS (category: cms)
('cms-api', '/functions/v1/cms-api', 'cms', 'Content management system',
 ARRAY['GET', 'POST', 'PUT', 'DELETE'],
 ARRAY['List content', 'Create content', 'Update content', 'Delete content'],
 ARRAY['read', 'write', 'delete'],
 ARRAY['authenticated'], 1),

('pages-api', '/functions/v1/pages-api', 'cms', 'Website page management',
 ARRAY['GET', 'POST', 'PUT', 'DELETE'],
 ARRAY['List pages', 'Create page', 'Update page', 'Publish page'],
 ARRAY['read', 'write', 'delete'],
 ARRAY['authenticated'], 2),

('media-api', '/functions/v1/media-api', 'cms', 'Media file management',
 ARRAY['GET', 'POST', 'DELETE'],
 ARRAY['List files', 'Upload file', 'Get file', 'Delete file'],
 ARRAY['read', 'write', 'delete'],
 ARRAY['authenticated'], 3),

('templates-api', '/functions/v1/templates-api', 'cms', 'Email and notification templates',
 ARRAY['GET', 'POST', 'PUT', 'DELETE'],
 ARRAY['List templates', 'Create template', 'Update template', 'Preview'],
 ARRAY['read', 'write'],
 ARRAY['authenticated'], 4),

('feature-flags', '/functions/v1/feature-flags', 'cms', 'Feature flag management',
 ARRAY['GET', 'POST', 'PUT', 'DELETE'],
 ARRAY['List flags', 'Create flag', 'Toggle flag', 'Delete flag'],
 ARRAY['read', 'write', 'delete'],
 ARRAY['developer'], 5),

('navigation-settings', '/functions/v1/navigation-settings', 'cms', 'Navigation menu configuration',
 ARRAY['GET', 'POST', 'PUT'],
 ARRAY['Get navigation', 'Update navigation', 'Reset to default'],
 ARRAY['read', 'write'],
 ARRAY['authenticated'], 6),

-- Notification (category: notification)
('send-notification', '/functions/v1/send-notification', 'notification', 'Send multi-channel notifications',
 ARRAY['POST'],
 ARRAY['Send email', 'Send SMS', 'Send push notification'],
 ARRAY['write'],
 ARRAY['authenticated'], 1),

-- Public (category: public)
('public-tenant', '/functions/v1/public-tenant', 'public', 'Public tenant information',
 ARRAY['GET'],
 ARRAY['Get tenant by slug', 'Get public settings'],
 ARRAY['public'],
 ARRAY['public'], 1)

ON CONFLICT (name) DO UPDATE SET
  endpoint = EXCLUDED.endpoint,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  methods = EXCLUDED.methods,
  operations = EXCLUDED.operations,
  scopes = EXCLUDED.scopes,
  required_roles = EXCLUDED.required_roles,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- ================================================
-- PART 4: Add category metadata tables
-- ================================================

CREATE TABLE IF NOT EXISTS api_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed API categories
INSERT INTO api_categories (name, display_name, description, icon, color, display_order) VALUES
('tenant', 'Tenant Management', 'Multi-tenant clinic management', 'Users', 'emerald', 1),
('developer', 'Developer Portal', 'API keys, webhooks, monitoring', 'Code', 'purple', 2),
('domain', 'Domain Management', 'Custom domains and DNS', 'Globe', 'blue', 3),
('financial', 'Financial', 'Billing, subscriptions, payments', 'CreditCard', 'yellow', 4),
('cms', 'Content Management', 'Pages, media, templates', 'FileText', 'pink', 5),
('notification', 'Notifications', 'Email, SMS, push notifications', 'Bell', 'orange', 6),
('public', 'Public APIs', 'Unauthenticated endpoints', 'Globe', 'gray', 7)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order;

-- Seed webhook categories
INSERT INTO webhook_categories (name, display_name, description, icon, color, display_order) VALUES
('patient', 'Patient Events', 'Triggered when patient records change', 'Users', 'emerald', 1),
('appointment', 'Appointment Events', 'Triggered on appointment lifecycle changes', 'Calendar', 'blue', 2),
('invoice', 'Invoice Events', 'Triggered on invoice and billing changes', 'FileText', 'yellow', 3),
('treatment', 'Treatment Events', 'Triggered on treatment plan changes', 'Heart', 'pink', 4),
('user', 'User Events', 'Triggered on user account activities', 'User', 'purple', 5),
('system', 'System Events', 'Triggered on system-level operations', 'Settings', 'gray', 6)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order;

-- RLS for category tables
ALTER TABLE api_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_categories_read ON api_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY webhook_categories_read ON webhook_categories FOR SELECT TO authenticated USING (true);

-- Comments
COMMENT ON TABLE api_definitions IS 'API endpoint definitions for developer portal catalog';
COMMENT ON TABLE api_categories IS 'Categories for grouping API endpoints';
COMMENT ON TABLE webhook_categories IS 'Categories for grouping webhook events';
