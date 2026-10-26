-- =====================================================
-- MIGRATION 054: Fix Pages Table RLS Policies
-- =====================================================
-- The original policies use current_setting('app.current_tenant_id')
-- which requires setting a session variable. This breaks frontend queries.
-- 
-- Fixed policies use the get_user_tenant_ids() function we created
-- for proper multi-tenant access control.
-- =====================================================

-- First, ensure the get_user_tenant_ids function exists
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id 
  FROM tenant_users 
  WHERE user_id = auth.uid() 
    AND status = 'active';
$$;

-- Also create a function to check developer role
CREATE OR REPLACE FUNCTION is_developer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'developer'
  );
$$;

-- =====================================================
-- FIX PAGES TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS pages_public_read ON pages;
DROP POLICY IF EXISTS pages_authenticated_all ON pages;
DROP POLICY IF EXISTS pages_tenant_select ON pages;
DROP POLICY IF EXISTS pages_tenant_all ON pages;
DROP POLICY IF EXISTS pages_developer_all ON pages;

-- Public can read published pages (for public website)
CREATE POLICY pages_public_read ON pages
  FOR SELECT TO anon
  USING (status = 'published');

-- Authenticated users can read pages for their tenants
CREATE POLICY pages_tenant_select ON pages
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- Authenticated users can insert/update/delete pages for their tenants
CREATE POLICY pages_tenant_modify ON pages
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  )
  WITH CHECK (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- =====================================================
-- FIX PAGE VERSIONS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS page_versions_authenticated ON page_versions;
DROP POLICY IF EXISTS page_versions_tenant_access ON page_versions;

CREATE POLICY page_versions_tenant_access ON page_versions
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- =====================================================
-- FIX CONTENT DRAFTS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS content_drafts_authenticated ON content_drafts;
DROP POLICY IF EXISTS content_drafts_tenant_access ON content_drafts;

CREATE POLICY content_drafts_tenant_access ON content_drafts
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- =====================================================
-- FIX NAVIGATION MENUS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS nav_menus_authenticated_all ON navigation_menus;
DROP POLICY IF EXISTS nav_menus_tenant_access ON navigation_menus;

CREATE POLICY nav_menus_tenant_access ON navigation_menus
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- =====================================================
-- FIX WEBSITE SETTINGS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS website_settings_authenticated_all ON website_settings;
DROP POLICY IF EXISTS website_settings_tenant_access ON website_settings;

CREATE POLICY website_settings_tenant_access ON website_settings
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- =====================================================
-- FIX MEDIA LIBRARY TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS media_library_authenticated ON media_library;
DROP POLICY IF EXISTS media_library_tenant_access ON media_library;

CREATE POLICY media_library_tenant_access ON media_library
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- =====================================================
-- FIX FORM SUBMISSIONS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS form_submissions_authenticated ON form_submissions;
DROP POLICY IF EXISTS form_submissions_tenant_access ON form_submissions;

-- Keep public insert for contact forms
-- Add tenant access for reading
CREATE POLICY form_submissions_tenant_access ON form_submissions
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- =====================================================
-- FIX CONTENT CHANGE LOG TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS change_log_authenticated ON content_change_log;
DROP POLICY IF EXISTS change_log_tenant_access ON content_change_log;

CREATE POLICY change_log_tenant_access ON content_change_log
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- =====================================================
-- FIX FAQS TABLE POLICIES
-- =====================================================
DROP POLICY IF EXISTS faqs_authenticated_all ON faqs;
DROP POLICY IF EXISTS faqs_tenant_access ON faqs;

CREATE POLICY faqs_tenant_access ON faqs
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

COMMENT ON POLICY pages_tenant_select ON pages IS 'Authenticated users can read pages for tenants they belong to, or if they are developers';
COMMENT ON POLICY pages_tenant_modify ON pages IS 'Authenticated users can modify pages for tenants they belong to, or if they are developers';
