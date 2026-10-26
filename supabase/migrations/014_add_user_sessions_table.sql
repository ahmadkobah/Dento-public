-- Migration: Add user sessions table for session management and device tracking
-- Created: Phase 1 Foundation - Session Management

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  location JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- Activity Log for tracking user actions
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  resource_type TEXT,
  resource_id UUID,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_session ON user_activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON user_activity_log(action_type);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
-- Users can view their own sessions, admins can view all
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    get_user_role() IN ('admin', 'developer')
  );

-- Users can update their own sessions (for ending sessions)
CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Anyone authenticated can insert (on login)
CREATE POLICY "Authenticated users can create sessions" ON user_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for activity_log
-- Users can view their own activity, admins can view all
CREATE POLICY "Users can view own activity" ON user_activity_log
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    get_user_role() IN ('admin', 'developer')
  );

-- Anyone authenticated can log activity
CREATE POLICY "Authenticated users can log activity" ON user_activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to end all other sessions when force logout
CREATE OR REPLACE FUNCTION end_other_sessions(p_user_id UUID, p_current_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET 
    is_active = false,
    ended_at = CURRENT_TIMESTAMP
  WHERE 
    user_id = p_user_id 
    AND id != p_current_session_id
    AND is_active = true;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET 
    is_active = false,
    ended_at = CURRENT_TIMESTAMP
  WHERE 
    is_active = true
    AND (
      expires_at < CURRENT_TIMESTAMP
      OR last_activity < CURRENT_TIMESTAMP - INTERVAL '24 hours'
    );
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for active sessions with user info
CREATE OR REPLACE VIEW active_sessions_view AS
SELECT 
  us.id,
  us.user_id,
  u.email as user_email,
  up.first_name,
  up.last_name,
  us.device_info,
  us.ip_address,
  us.location,
  us.last_activity,
  us.created_at as session_started,
  EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - us.created_at)) / 3600 as hours_active
FROM user_sessions us
JOIN auth.users u ON us.user_id = u.id
LEFT JOIN user_profiles up ON us.user_id = up.user_id
WHERE us.is_active = true
ORDER BY us.last_activity DESC;

COMMENT ON TABLE user_sessions IS 'Tracks user login sessions for security and device management';
COMMENT ON TABLE user_activity_log IS 'Audit log of user actions in the system';
