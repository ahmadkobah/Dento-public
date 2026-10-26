-- =====================================================
-- MIGRATION 052: Content Locks & Polish Tables
-- =====================================================
-- This migration adds content locking for Phase 5.9
-- =====================================================

-- ===========================================
-- 1. CONTENT LOCKS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS content_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Resource identification
  resource_type VARCHAR(50) NOT NULL,  -- 'page', 'section', 'settings'
  resource_id UUID NOT NULL,
  
  -- Lock holder
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint for resource locking
  CONSTRAINT unique_resource_lock UNIQUE(resource_type, resource_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_content_locks_resource 
  ON content_locks(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_content_locks_user 
  ON content_locks(user_id);

-- Auto-cleanup expired locks (older than 10 minutes)
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM content_locks 
  WHERE updated_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 2. AUTO-SAVE DRAFTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS auto_save_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Resource identification
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Draft content
  content JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One draft per user per resource
  CONSTRAINT unique_user_draft UNIQUE(resource_type, resource_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_auto_save_drafts_resource 
  ON auto_save_drafts(resource_type, resource_id, user_id);

-- ===========================================
-- 3. USER PREFERENCES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  
  -- Editor preferences
  auto_save_enabled BOOLEAN DEFAULT true,
  auto_save_interval INTEGER DEFAULT 30000,  -- ms
  show_grid_lines BOOLEAN DEFAULT false,
  show_element_outlines BOOLEAN DEFAULT true,
  preferred_device_preview VARCHAR(20) DEFAULT 'desktop',
  
  -- UI preferences
  sidebar_collapsed BOOLEAN DEFAULT false,
  dark_mode BOOLEAN DEFAULT false,
  
  -- Notification preferences
  email_on_publish BOOLEAN DEFAULT true,
  email_on_form_submission BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 4. RLS POLICIES
-- ===========================================

ALTER TABLE content_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_save_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Content locks: Users can manage their own locks, see all locks
CREATE POLICY content_locks_select ON content_locks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY content_locks_insert ON content_locks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY content_locks_update ON content_locks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY content_locks_delete ON content_locks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Auto-save drafts: Users can only access their own
CREATE POLICY auto_save_drafts_all ON auto_save_drafts
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- User preferences: Users can only access their own
CREATE POLICY user_preferences_all ON user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- ===========================================
-- 5. TRIGGERS
-- ===========================================

CREATE TRIGGER update_content_locks_timestamp
  BEFORE UPDATE ON content_locks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_save_drafts_timestamp
  BEFORE UPDATE ON auto_save_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_timestamp
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 6. ENABLE REALTIME FOR LOCKS
-- ===========================================

ALTER PUBLICATION supabase_realtime ADD TABLE content_locks;

-- ===========================================
-- MIGRATION COMPLETE
-- ===========================================
