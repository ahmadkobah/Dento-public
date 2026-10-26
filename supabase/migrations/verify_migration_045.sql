-- =====================================================
-- QUICK VERIFICATION TESTS FOR MIGRATION 045
-- Run these in Supabase SQL Editor to verify migration
-- =====================================================

-- Test 1: Count tables with tenant_id column
SELECT COUNT(DISTINCT table_name) as tables_with_tenant_id
FROM information_schema.columns
WHERE column_name = 'tenant_id' 
  AND table_schema = 'public';
-- Expected: 70+ tables

-- Test 2: List all tables with tenant_id
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'tenant_id' 
  AND table_schema = 'public'
ORDER BY table_name;

-- Test 3: Count tenant indexes
SELECT COUNT(*) as tenant_indexes
FROM pg_indexes
WHERE indexname LIKE '%_tenant';
-- Expected: 87 indexes

-- Test 4: Verify current_tenant_id() function
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'current_tenant_id';

-- Test 5: Count RLS policies per type
SELECT 
    CASE 
        WHEN policyname LIKE 'tenant_isolation%' THEN 'SELECT policies'
        WHEN policyname LIKE 'tenant_insert%' THEN 'INSERT policies'
        WHEN policyname LIKE 'tenant_update%' THEN 'UPDATE policies'
        WHEN policyname LIKE 'tenant_delete%' THEN 'DELETE policies'
        WHEN policyname LIKE 'service_role%' THEN 'Service role policies'
    END as policy_type,
    COUNT(*) as count
FROM pg_policies
WHERE policyname LIKE 'tenant_%' OR policyname LIKE 'service_role%'
GROUP BY policy_type
ORDER BY count DESC;

-- Test 6: Count triggers
SELECT COUNT(*) as tenant_triggers
FROM information_schema.triggers
WHERE trigger_name LIKE 'set_tenant_id_%';
-- Expected: 70+ triggers

-- Test 7: Check RLS is enabled on core tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('patients', 'appointments', 'doctors', 'invoices', 'users', 'branches')
ORDER BY tablename;
-- Expected: All should show rls_enabled = true

-- Test 8: Sample a few tables to verify tenant_id structure
SELECT 
    'patients' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'patients' AND column_name = 'tenant_id'

UNION ALL

SELECT 
    'appointments',
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'appointments' AND column_name = 'tenant_id'

UNION ALL

SELECT 
    'invoices',
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name = 'tenant_id';

-- Test 9: List all RLS policies on patients table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies
WHERE tablename = 'patients'
ORDER BY policyname;

-- Test 10: Verify foreign key constraint on tenant_id
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'tenant_id'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name
LIMIT 20;
-- Expected: All tenant_id columns should reference tenants(id)

-- =====================================================
-- SUMMARY QUERY - Run this for a complete overview
-- =====================================================
SELECT 
    'Tables with tenant_id' as metric,
    COUNT(DISTINCT table_name)::text as value
FROM information_schema.columns
WHERE column_name = 'tenant_id' AND table_schema = 'public'

UNION ALL

SELECT 
    'Tenant indexes',
    COUNT(*)::text
FROM pg_indexes
WHERE indexname LIKE '%_tenant'

UNION ALL

SELECT 
    'RLS policies (total)',
    COUNT(*)::text
FROM pg_policies
WHERE policyname LIKE 'tenant_%' OR policyname LIKE 'service_role%'

UNION ALL

SELECT 
    'Auto-set triggers',
    COUNT(*)::text
FROM information_schema.triggers
WHERE trigger_name LIKE 'set_tenant_id_%'

UNION ALL

SELECT 
    'Tables with RLS enabled',
    COUNT(*)::text
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT 
    'Functions created',
    COUNT(*)::text
FROM pg_proc
WHERE proname IN ('current_tenant_id', 'set_tenant_id');
