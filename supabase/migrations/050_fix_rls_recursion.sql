-- Fix infinite recursion in tenant_users RLS policy
-- The policy was checking tenant_users to validate access to tenant_users (circular)

-- Drop the problematic policies
DROP POLICY IF EXISTS tenant_users_developer_all ON tenant_users;
DROP POLICY IF EXISTS tenant_users_tenant_admin ON tenant_users;

-- Create a security definer function to check tenant membership
-- This bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION is_tenant_member(check_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE tenant_id = check_tenant_id 
    AND user_id = auth.uid() 
    AND status = 'active'
  );
$$;

-- Create a security definer function to get user's tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM tenant_users 
  WHERE user_id = auth.uid() 
  AND status = 'active';
$$;

-- Recreate policies using the security definer functions

-- Developers can do everything
CREATE POLICY tenant_users_developer_all ON tenant_users
    FOR ALL USING (is_saas_developer());

-- Users can see their own tenant_users records
CREATE POLICY tenant_users_self_select ON tenant_users
    FOR SELECT USING (user_id = auth.uid());

-- Tenant admins can manage users in their tenant (using security definer function)
CREATE POLICY tenant_users_admin_manage ON tenant_users
    FOR ALL USING (
        is_saas_developer() OR 
        (
            user_id = auth.uid() AND status = 'active'
        ) OR
        EXISTS (
            SELECT 1 FROM get_user_tenant_ids() AS t(tid)
            WHERE t.tid = tenant_users.tenant_id
            AND (
                SELECT role FROM tenant_users tu2 
                WHERE tu2.tenant_id = tenant_users.tenant_id 
                AND tu2.user_id = auth.uid() 
                AND tu2.status = 'active'
                LIMIT 1
            ) IN ('owner', 'admin')
        )
    );

-- Also fix the tenants policy that might have similar issues
DROP POLICY IF EXISTS tenants_user_select ON tenants;

CREATE POLICY tenants_user_select ON tenants
    FOR SELECT USING (
        is_saas_developer() OR
        id IN (SELECT get_user_tenant_ids())
    );

-- Fix tenant_modules policy
DROP POLICY IF EXISTS tenant_modules_user_select ON tenant_modules;

CREATE POLICY tenant_modules_user_select ON tenant_modules
    FOR SELECT USING (
        is_saas_developer() OR
        tenant_id IN (SELECT get_user_tenant_ids())
    );
