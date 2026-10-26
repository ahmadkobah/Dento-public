-- ================================================
-- Fix RLS policies for admin chat in developer-initiated sessions
-- Admin's ID can be in either requester_id OR impersonated_user_id
-- ================================================

-- Drop and recreate the INSERT policy
DROP POLICY IF EXISTS "Users can send messages" ON support_chat_messages;

CREATE POLICY "Users can send messages" ON support_chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND (
            -- User is participant in the session (as requester or impersonated user)
            session_id IN (
                SELECT id FROM support_sessions 
                WHERE requester_id = auth.uid() 
                   OR developer_id = auth.uid()
                   OR impersonated_user_id = auth.uid()
            )
            OR
            -- Developer role can send to any active session
            (
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
                AND
                session_id IN (SELECT id FROM support_sessions WHERE status = 'active')
            )
        )
    );

-- Fix SELECT policy to include impersonated_user_id
DROP POLICY IF EXISTS "Users can view session messages" ON support_chat_messages;

CREATE POLICY "Users can view session messages" ON support_chat_messages
    FOR SELECT
    TO authenticated
    USING (
        -- User is participant in the session (as requester, developer, or impersonated user)
        session_id IN (
            SELECT id FROM support_sessions 
            WHERE requester_id = auth.uid() 
               OR developer_id = auth.uid()
               OR impersonated_user_id = auth.uid()
        )
        OR
        -- Developers can see all messages
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
    );

-- Also fix support_sessions policies for admins in developer-initiated sessions
DROP POLICY IF EXISTS "Admins can view their sessions" ON support_sessions;

CREATE POLICY "Admins can view their sessions" ON support_sessions
    FOR SELECT
    TO authenticated
    USING (
        -- Requester can see their sessions
        requester_id = auth.uid()
        OR
        -- Impersonated user (in developer-initiated sessions) can see their sessions
        impersonated_user_id = auth.uid()
        OR
        -- Tenant members can see sessions for their tenant
        tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
        OR
        -- Developers can see all sessions
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
    );

-- Fix update policy for admins to update developer-initiated sessions
DROP POLICY IF EXISTS "Developers can join sessions" ON support_sessions;

CREATE POLICY "Users can update their sessions" ON support_sessions
    FOR UPDATE
    TO authenticated
    USING (
        -- Developer can update any session
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
        OR
        -- Requester can update their session
        requester_id = auth.uid()
        OR
        -- Impersonated user can update the session
        impersonated_user_id = auth.uid()
    )
    WITH CHECK (
        -- Same conditions for the new row
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
        OR
        requester_id = auth.uid()
        OR
        impersonated_user_id = auth.uid()
    );

-- Ensure realtime is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_chat_messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_sessions;
  END IF;
END $$;
