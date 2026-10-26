-- Migration: 060_support_session_ratings.sql
-- Purpose: Add rating/feedback system for support sessions
-- Date: Support Session Implementation Plan

-- ================================================
-- PART 1: Add rating columns to support_sessions
-- ================================================

-- Add rating columns to support_sessions table
ALTER TABLE support_sessions 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS rating_comment TEXT,
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Add index for rated sessions
CREATE INDEX IF NOT EXISTS idx_support_sessions_rating ON support_sessions(rating) WHERE rating IS NOT NULL;

-- ================================================
-- PART 2: Update the session end flow
-- ================================================

-- No changes needed - rating will be submitted separately

-- ================================================
-- PART 3: RLS Policies for ratings
-- ================================================

-- Allow session requester to update their session's rating
DROP POLICY IF EXISTS "Requester can rate session" ON support_sessions;
CREATE POLICY "Requester can rate session" ON support_sessions
    FOR UPDATE
    USING (
        requester_id = auth.uid() 
        AND status IN ('completed')
    )
    WITH CHECK (
        requester_id = auth.uid()
        AND status IN ('completed')
    );

-- ================================================
-- PART 4: Comments
-- ================================================

COMMENT ON COLUMN support_sessions.rating IS 'User rating 1-5 stars for the support session';
COMMENT ON COLUMN support_sessions.rating_comment IS 'Optional feedback text from user about the session';
COMMENT ON COLUMN support_sessions.rated_at IS 'Timestamp when the session was rated';
