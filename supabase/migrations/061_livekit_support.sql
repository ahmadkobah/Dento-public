-- Migration: 061_livekit_support.sql
-- Purpose: Add LiveKit room tracking for screen share/video sessions
-- Date: Support Session Implementation Plan

-- ================================================
-- PART 1: Add LiveKit columns to support_sessions
-- ================================================

-- Add LiveKit-specific columns to support_sessions table
ALTER TABLE support_sessions 
ADD COLUMN IF NOT EXISTS livekit_room_name TEXT,
ADD COLUMN IF NOT EXISTS livekit_room_sid TEXT,
ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recording_ended_at TIMESTAMPTZ;

-- Index for active rooms
CREATE INDEX IF NOT EXISTS idx_support_sessions_livekit_room ON support_sessions(livekit_room_name) WHERE livekit_room_name IS NOT NULL;

-- ================================================
-- PART 2: Create support_recordings table
-- ================================================

CREATE TABLE IF NOT EXISTS support_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    egress_id TEXT, -- LiveKit egress ID
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'recording', 'processing', 'completed', 'failed')),
    file_url TEXT,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recordings_session ON support_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON support_recordings(status);

-- ================================================
-- PART 3: RLS Policies
-- ================================================

-- Enable RLS
ALTER TABLE support_recordings ENABLE ROW LEVEL SECURITY;

-- Developers can view recordings for their sessions
DROP POLICY IF EXISTS "Developers can view recordings" ON support_recordings;
CREATE POLICY "Developers can view recordings" ON support_recordings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_sessions ss
            WHERE ss.id = support_recordings.session_id
            AND ss.developer_id = auth.uid()
        )
    );

-- Requesters can view their session recordings
DROP POLICY IF EXISTS "Requesters can view their recordings" ON support_recordings;
CREATE POLICY "Requesters can view their recordings" ON support_recordings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_sessions ss
            WHERE ss.id = support_recordings.session_id
            AND ss.requester_id = auth.uid()
        )
    );

-- ================================================
-- PART 4: Comments
-- ================================================

COMMENT ON TABLE support_recordings IS 'Recordings of support sessions via LiveKit';
COMMENT ON COLUMN support_sessions.livekit_room_name IS 'LiveKit room name for video/screen share sessions';
COMMENT ON COLUMN support_sessions.livekit_room_sid IS 'LiveKit room SID (server ID)';
COMMENT ON COLUMN support_sessions.recording_enabled IS 'Whether session recording is enabled';
COMMENT ON COLUMN support_sessions.recording_url IS 'URL to the completed recording';
