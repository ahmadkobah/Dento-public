-- ================================================
-- Migration: Admin Support Request Schema
-- Adds columns needed for admin-initiated support requests
-- ================================================

-- ================================================
-- PART 1: Add requester_id for admin-initiated sessions
-- ================================================

-- requester_id: The admin user who requested support (different from developer_id who joins)
ALTER TABLE support_sessions
ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES users(id);

-- requested_at: When the admin requested support
ALTER TABLE support_sessions
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

-- priority: Request priority level
ALTER TABLE support_sessions
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' 
CHECK (priority IN ('urgent', 'normal', 'low'));

-- ================================================
-- PART 2: Update status constraint to include waiting/cancelled
-- ================================================

-- Drop the existing constraint first
ALTER TABLE support_sessions DROP CONSTRAINT IF EXISTS support_sessions_status_check;

-- Add updated constraint with waiting and cancelled status
DO $$
BEGIN
    -- Check if constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'support_sessions_status_check'
    ) THEN
        ALTER TABLE support_sessions 
        ADD CONSTRAINT support_sessions_status_check 
        CHECK (status IN (
            'waiting',    -- Admin requested, waiting for developer
            'active',     -- Developer joined, session in progress
            'completed',  -- Normally ended
            'ended',      -- Legacy: same as completed
            'expired',    -- Auto-expired (timeout)
            'cancelled',  -- Cancelled by admin
            'revoked'     -- Forcefully terminated
        ));
    END IF;
END $$;

-- Make developer_id nullable (not assigned until developer joins)
ALTER TABLE support_sessions ALTER COLUMN developer_id DROP NOT NULL;
ALTER TABLE support_sessions ALTER COLUMN developer_email DROP NOT NULL;

-- ================================================
-- PART 3: Create support_chat_messages table
-- ================================================

CREATE TABLE IF NOT EXISTS support_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'developer', 'system')),
    sender_name TEXT,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON support_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON support_chat_messages(session_id, created_at);

-- ================================================
-- PART 4: RLS Policies for Admin Support Requests
-- ================================================

-- Enable RLS on support_sessions if not already enabled
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can create support requests for their tenant
DROP POLICY IF EXISTS "Admins can create support requests" ON support_sessions;
CREATE POLICY "Admins can create support requests" ON support_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- User must be the requester
        requester_id = auth.uid()
        AND
        -- User must belong to the tenant
        tenant_id IN (
            SELECT tenant_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Admins can view their own support requests
DROP POLICY IF EXISTS "Admins can view own support requests" ON support_sessions;
CREATE POLICY "Admins can view own support requests" ON support_sessions
    FOR SELECT
    TO authenticated
    USING (
        requester_id = auth.uid()
        OR
        -- Developers can see all sessions
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer'
        )
    );

-- Policy: Admins can update their own waiting requests (cancel)
DROP POLICY IF EXISTS "Admins can update own requests" ON support_sessions;
CREATE POLICY "Admins can update own requests" ON support_sessions
    FOR UPDATE
    TO authenticated
    USING (
        requester_id = auth.uid()
        OR
        developer_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer'
        )
    );

-- Enable RLS on chat messages
ALTER TABLE support_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for their sessions
DROP POLICY IF EXISTS "Users can view session messages" ON support_chat_messages;
CREATE POLICY "Users can view session messages" ON support_chat_messages
    FOR SELECT
    TO authenticated
    USING (
        session_id IN (
            SELECT id FROM support_sessions 
            WHERE requester_id = auth.uid() OR developer_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer'
        )
    );

-- Policy: Users can send messages to their sessions
DROP POLICY IF EXISTS "Users can send messages" ON support_chat_messages;
CREATE POLICY "Users can send messages" ON support_chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND
        session_id IN (
            SELECT id FROM support_sessions 
            WHERE requester_id = auth.uid() OR developer_id = auth.uid()
        )
    );

-- ================================================
-- PART 5: Index for waiting sessions
-- ================================================

CREATE INDEX IF NOT EXISTS idx_support_sessions_waiting 
ON support_sessions(status, requested_at) 
WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS idx_support_sessions_requester 
ON support_sessions(requester_id, status);

-- ================================================
-- PART 6: Function to auto-expire waiting sessions
-- ================================================

CREATE OR REPLACE FUNCTION expire_old_support_requests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE support_sessions
    SET status = 'expired',
        ended_at = NOW(),
        resolution = 'Request timed out'
    WHERE status = 'waiting'
      AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (will be called by edge function)
GRANT EXECUTE ON FUNCTION expire_old_support_requests() TO authenticated;

-- ================================================
-- PART 7: Comments
-- ================================================

COMMENT ON COLUMN support_sessions.requester_id IS 'User ID of admin who requested support';
COMMENT ON COLUMN support_sessions.requested_at IS 'Timestamp when support was requested';
COMMENT ON COLUMN support_sessions.priority IS 'Request priority: urgent, normal, low';
COMMENT ON TABLE support_chat_messages IS 'Chat messages exchanged during support sessions';
