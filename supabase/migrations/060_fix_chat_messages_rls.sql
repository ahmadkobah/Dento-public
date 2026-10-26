-- ================================================
-- Fix RLS policy for support_chat_messages INSERT
-- The current policy is too restrictive for developers and admins
-- ================================================

-- Drop and recreate the INSERT policy with role-based fallbacks
DROP POLICY IF EXISTS "Users can send messages" ON support_chat_messages;

CREATE POLICY "Users can send messages" ON support_chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND (
            -- User is participant in the session
            session_id IN (
                SELECT id FROM support_sessions 
                WHERE requester_id = auth.uid() OR developer_id = auth.uid()
            )
            OR
            -- Developer role can send to any active session
            (
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
                AND
                session_id IN (SELECT id FROM support_sessions WHERE status = 'active')
            )
            OR
            -- Admin/owner can send to any active session they requested
            (
                EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
                AND
                session_id IN (SELECT id FROM support_sessions WHERE status = 'active' AND requester_id = auth.uid())
            )
        )
    );

-- Fix SELECT policy to also allow admins to see their messages
DROP POLICY IF EXISTS "Users can view session messages" ON support_chat_messages;

CREATE POLICY "Users can view session messages" ON support_chat_messages
    FOR SELECT
    TO authenticated
    USING (
        -- User is participant in the session
        session_id IN (
            SELECT id FROM support_sessions 
            WHERE requester_id = auth.uid() OR developer_id = auth.uid()
        )
        OR
        -- Developers can see all messages
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
        OR
        -- Admin/owner can see messages for their sessions
        (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'owner'))
            AND
            session_id IN (SELECT id FROM support_sessions WHERE requester_id = auth.uid())
        )
    );

-- Also ensure developers can be set as developer_id when they join
DROP POLICY IF EXISTS "Developers can join sessions" ON support_sessions;

CREATE POLICY "Developers can join sessions" ON support_sessions
    FOR UPDATE
    TO authenticated
    USING (
        -- Can update if developer
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
        OR
        -- Or if they're the requester
        requester_id = auth.uid()
    )
    WITH CHECK (
        -- Same conditions for the new row
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'developer')
        OR
        requester_id = auth.uid()
    );

-- ================================================
-- ENABLE REALTIME FOR SUPPORT TABLES
-- ================================================

-- Enable realtime for support_chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_chat_messages;
  END IF;
END $$;

-- Enable realtime for support_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_sessions;
  END IF;
END $$;
