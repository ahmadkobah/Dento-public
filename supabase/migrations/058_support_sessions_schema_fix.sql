-- ================================================
-- Migration: Support Sessions Schema Fix & Seed
-- Fixes column naming mismatches and seeds demo data
-- ================================================

-- ================================================
-- PART 1: Add missing columns for edge function compatibility
-- ================================================

-- Add session_type column
ALTER TABLE support_sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'screen_share' 
CHECK (session_type IN ('screen_share', 'view_only', 'chat'));

-- Add agent_id as a generated column referencing developer_id for API compatibility
-- (Using a simple alias approach - we'll use developer_id directly in the API)

-- Add user display fields for better querying
ALTER TABLE support_sessions
ADD COLUMN IF NOT EXISTS agent_name TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS tenant_name TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Add resolution column for completion summary
ALTER TABLE support_sessions
ADD COLUMN IF NOT EXISTS resolution TEXT;

-- ================================================
-- PART 2: Update support_session_actions for better logging
-- ================================================

-- Add action column for simple action string (edge function uses 'action' not 'action_type')
ALTER TABLE support_session_actions
ADD COLUMN IF NOT EXISTS action TEXT,
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}';

-- ================================================
-- PART 3: Create trigger to auto-populate display names
-- ================================================

CREATE OR REPLACE FUNCTION populate_support_session_names()
RETURNS TRIGGER AS $$
BEGIN
    -- Get tenant name
    SELECT name INTO NEW.tenant_name
    FROM tenants WHERE id = NEW.tenant_id;
    
    -- Get developer/agent name from user_profiles
    SELECT CONCAT(up.first_name, ' ', up.last_name) INTO NEW.agent_name
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE u.id = NEW.developer_id;
    
    -- Get impersonated user info if set
    IF NEW.impersonated_user_id IS NOT NULL THEN
        SELECT CONCAT(up.first_name, ' ', up.last_name), u.email 
        INTO NEW.user_name, NEW.user_email
        FROM users u
        LEFT JOIN user_profiles up ON up.user_id = u.id
        WHERE u.id = NEW.impersonated_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_support_session_names ON support_sessions;
CREATE TRIGGER trg_populate_support_session_names
    BEFORE INSERT ON support_sessions
    FOR EACH ROW
    EXECUTE FUNCTION populate_support_session_names();

-- ================================================
-- PART 4: Seed demo support sessions
-- ================================================

-- First, ensure we have test developer and tenants
DO $$
DECLARE
    dev_id UUID;
    tenant1_id UUID;
    tenant2_id UUID;
    tenant3_id UUID;
    session1_id UUID;
    session2_id UUID;
    session3_id UUID;
    session4_id UUID;
    tenant_count INT;
BEGIN
    -- Get or create a developer user from users table
    SELECT id INTO dev_id FROM users WHERE role = 'developer' LIMIT 1;
    
    -- If no developer exists, we'll use a placeholder
    IF dev_id IS NULL THEN
        dev_id := '00000000-0000-0000-0000-000000000001'::UUID;
    END IF;
    
    -- Count available tenants
    SELECT COUNT(*) INTO tenant_count FROM tenants;
    
    -- Only proceed if we have at least one tenant
    IF tenant_count = 0 THEN
        RAISE NOTICE 'No tenants found - skipping demo support session seeding';
        RETURN;
    END IF;
    
    -- Get tenant IDs (only those that exist)
    SELECT id INTO tenant1_id FROM tenants ORDER BY created_at LIMIT 1;
    SELECT id INTO tenant2_id FROM tenants ORDER BY created_at OFFSET 1 LIMIT 1;
    SELECT id INTO tenant3_id FROM tenants ORDER BY created_at OFFSET 2 LIMIT 1;
    
    -- Fallback to first tenant if we don't have enough tenants
    tenant2_id := COALESCE(tenant2_id, tenant1_id);
    tenant3_id := COALESCE(tenant3_id, tenant1_id);

    -- Clear existing demo sessions (if any)
    DELETE FROM support_sessions WHERE notes LIKE '%[DEMO]%';
    
    -- Session 1: Active screen share session
    session1_id := gen_random_uuid();
    INSERT INTO support_sessions (
        id, developer_id, developer_email, tenant_id, tenant_name,
        session_type, status, reason, started_at, expires_at,
        agent_name, user_name, user_email, notes
    ) VALUES (
        session1_id,
        dev_id,
        'developer@dento.ae',
        tenant1_id,
        'Dento Clinic',
        'screen_share',
        'active',
        'Help with appointment scheduling setup',
        NOW() - INTERVAL '30 minutes',
        NOW() + INTERVAL '30 minutes',
        'Support Agent',
        'Dr. Ahmad',
        'ahmad@dentoclinic.com',
        '[DEMO] Demo active session'
    );
    
    -- Add actions for session 1
    INSERT INTO support_session_actions (session_id, action_type, action, description, details, created_at)
    VALUES 
        (session1_id, 'other', 'session_started', 'Session started', '{"type": "screen_share"}'::jsonb, NOW() - INTERVAL '30 minutes'),
        (session1_id, 'page_view', 'page_navigated', 'Navigated to Settings > Appointments', '{"page": "/settings/appointments"}'::jsonb, NOW() - INTERVAL '25 minutes'),
        (session1_id, 'setting_change', 'setting_updated', 'Updated working hours configuration', '{"setting": "working_hours"}'::jsonb, NOW() - INTERVAL '20 minutes');
    
    -- Session 2: Active view-only session
    session2_id := gen_random_uuid();
    INSERT INTO support_sessions (
        id, developer_id, developer_email, tenant_id, tenant_name,
        session_type, status, reason, started_at, expires_at,
        agent_name, user_name, user_email, notes
    ) VALUES (
        session2_id,
        dev_id,
        'developer@dento.ae',
        tenant2_id,
        'Smile Center',
        'view_only',
        'active',
        'Investigating invoice generation issue',
        NOW() - INTERVAL '15 minutes',
        NOW() + INTERVAL '45 minutes',
        'Support Agent',
        'Admin User',
        'admin@smilecenter.ae',
        '[DEMO] Demo view-only session'
    );
    
    INSERT INTO support_session_actions (session_id, action_type, action, description, details, created_at)
    VALUES 
        (session2_id, 'other', 'session_started', 'Session started (view-only)', '{"type": "view_only"}'::jsonb, NOW() - INTERVAL '15 minutes'),
        (session2_id, 'data_read', 'data_viewed', 'Viewing invoice #INV-2024-0145', '{"entity": "invoice", "id": "INV-2024-0145"}'::jsonb, NOW() - INTERVAL '12 minutes');
    
    -- Session 3: Completed session
    session3_id := gen_random_uuid();
    INSERT INTO support_sessions (
        id, developer_id, developer_email, tenant_id, tenant_name,
        session_type, status, reason, started_at, ended_at, expires_at,
        agent_name, user_name, user_email, resolution, notes
    ) VALUES (
        session3_id,
        dev_id,
        'developer@dento.ae',
        tenant3_id,
        'Dental Plus',
        'screen_share',
        'ended',
        'Training on new patient registration flow',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '1 hour 35 minutes',
        NOW() - INTERVAL '1 hour',
        'Support Agent',
        'Receptionist',
        'reception@dentalplus.com',
        'Completed training successfully',
        '[DEMO] Demo completed session'
    );
    
    INSERT INTO support_session_actions (session_id, action_type, action, description, details, created_at)
    VALUES 
        (session3_id, 'other', 'session_started', 'Session started', '{"type": "screen_share"}'::jsonb, NOW() - INTERVAL '2 hours'),
        (session3_id, 'other', 'training_demo', 'Demonstrated patient registration', '{"topic": "patient_registration"}'::jsonb, NOW() - INTERVAL '1 hour 55 minutes'),
        (session3_id, 'other', 'training_demo', 'Showed bulk import feature', '{"topic": "bulk_import"}'::jsonb, NOW() - INTERVAL '1 hour 45 minutes'),
        (session3_id, 'other', 'session_ended', 'Session ended by agent', '{"resolution": "success"}'::jsonb, NOW() - INTERVAL '1 hour 35 minutes');
    
    -- Session 4: Waiting/pending session
    session4_id := gen_random_uuid();
    INSERT INTO support_sessions (
        id, developer_id, developer_email, tenant_id, tenant_name,
        session_type, status, reason, started_at, expires_at,
        user_name, user_email, notes
    ) VALUES (
        session4_id,
        dev_id,
        'developer@dento.ae',
        tenant1_id,
        'Bright Teeth',
        'chat',
        'active', -- Using 'active' for now since 'waiting' may not be in schema
        'Question about treatment plan templates',
        NOW() - INTERVAL '5 minutes',
        NOW() + INTERVAL '10 minutes',
        'Dr. Sarah',
        'sarah@brightteeth.com',
        '[DEMO] Demo chat session'
    );

    RAISE NOTICE 'Created % demo support sessions', 4;
END $$;

-- ================================================
-- PART 5: Add status 'waiting' to the check constraint
-- ================================================

-- Safely update the status check constraint to include 'waiting' and 'completed'
DO $$
BEGIN
    -- Drop the old constraint if it exists
    ALTER TABLE support_sessions DROP CONSTRAINT IF EXISTS support_sessions_status_check;
    
    -- Add new constraint with all statuses
    ALTER TABLE support_sessions ADD CONSTRAINT support_sessions_status_check
        CHECK (status IN ('active', 'waiting', 'ended', 'completed', 'expired', 'revoked'));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not update status constraint: %', SQLERRM;
END $$;

-- ================================================
-- PART 6: Create view for easy querying
-- ================================================

CREATE OR REPLACE VIEW v_support_sessions AS
SELECT 
    s.id,
    s.tenant_id,
    COALESCE(s.tenant_name, t.name) as tenant_name,
    s.developer_id as agent_id,
    COALESCE(s.agent_name, CONCAT(up.first_name, ' ', up.last_name)) as agent_name,
    s.developer_email as agent_email,
    s.impersonated_user_id as target_user_id,
    COALESCE(s.user_name, CONCAT(upu.first_name, ' ', upu.last_name)) as user_name,
    COALESCE(s.user_email, u2.email) as user_email,
    s.session_type,
    s.status,
    s.reason,
    s.resolution,
    s.ticket_reference,
    s.started_at,
    s.ended_at,
    s.expires_at,
    s.read_only,
    s.permissions_granted,
    s.notes,
    s.ip_address,
    s.created_at,
    -- Computed fields
    CASE 
        WHEN s.status = 'active' AND s.expires_at < NOW() THEN 'expired'
        ELSE s.status 
    END as computed_status,
    EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at)) / 60 as duration_minutes,
    (SELECT COUNT(*) FROM support_session_actions a WHERE a.session_id = s.id) as action_count
FROM support_sessions s
LEFT JOIN tenants t ON t.id = s.tenant_id
LEFT JOIN users u ON u.id = s.developer_id
LEFT JOIN user_profiles up ON up.user_id = s.developer_id
LEFT JOIN users u2 ON u2.id = s.impersonated_user_id
LEFT JOIN user_profiles upu ON upu.user_id = s.impersonated_user_id
ORDER BY s.created_at DESC;

-- Grant access to the view
GRANT SELECT ON v_support_sessions TO authenticated;

-- ================================================
-- Comments
-- ================================================

COMMENT ON COLUMN support_sessions.session_type IS 'Type of support session: screen_share, view_only, or chat';
COMMENT ON COLUMN support_sessions.agent_name IS 'Cached agent display name for fast querying';
COMMENT ON COLUMN support_sessions.user_name IS 'Cached user display name for fast querying';
COMMENT ON COLUMN support_sessions.resolution IS 'Summary of how the session was resolved';
COMMENT ON VIEW v_support_sessions IS 'Flattened view of support sessions with computed fields';
