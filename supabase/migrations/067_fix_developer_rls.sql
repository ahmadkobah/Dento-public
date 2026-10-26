-- Migration 067: Fix Developer RLS Functions
-- Updates is_saas_developer() to check users table in addition to auth metadata

-- ============================================
-- FIX is_saas_developer() FUNCTION
-- ============================================
-- The original function only checked auth.users.raw_user_meta_data
-- But user roles are stored in the users table, not auth metadata

CREATE OR REPLACE FUNCTION is_saas_developer()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check auth metadata first (fastest)
    IF EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' IN ('developer', 'admin')
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Also check the users table (where roles are actually stored)
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('developer', 'admin')
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_saas_developer() TO authenticated;

-- ============================================
-- ENSURE tenant_modules policies are correct
-- ============================================

-- Drop and recreate to ensure WITH CHECK is included
DROP POLICY IF EXISTS tenant_modules_developer_all ON tenant_modules;
CREATE POLICY tenant_modules_developer_all ON tenant_modules
    FOR ALL
    TO authenticated
    USING (is_saas_developer())
    WITH CHECK (is_saas_developer());

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION is_saas_developer() IS 'Returns true if current user is a SaaS developer or admin. Checks both auth metadata and users table.';
