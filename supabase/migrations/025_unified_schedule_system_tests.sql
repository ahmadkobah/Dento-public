-- =====================================================
-- COMPREHENSIVE SQL TESTS FOR UNIFIED SCHEDULE SYSTEM
-- Run these tests in Supabase SQL Editor
-- =====================================================

-- ============================================================================
-- MAIN TEST BLOCK
-- ============================================================================

DO $$
DECLARE
    v_test_count INT := 0;
    v_pass_count INT := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UNIFIED SCHEDULE SYSTEM - SQL TESTS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- ============================================================================
    -- TEST 1: VIEW EXISTENCE TESTS
    -- ============================================================================
    RAISE NOTICE '--- TEST 1: View Existence ---';
    
    -- Test clinic_staff view exists
    v_test_count := v_test_count + 1;
    BEGIN
        PERFORM 1 FROM clinic_staff LIMIT 1;
        RAISE NOTICE 'PASS: clinic_staff view exists';
        v_pass_count := v_pass_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'FAIL: clinic_staff view does not exist - %', SQLERRM;
    END;

    -- Test today_attendance view exists
    v_test_count := v_test_count + 1;
    BEGIN
        PERFORM 1 FROM today_attendance LIMIT 1;
        RAISE NOTICE 'PASS: today_attendance view exists';
        v_pass_count := v_pass_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'FAIL: today_attendance view does not exist - %', SQLERRM;
    END;

    -- Test pending_leave_requests view exists
    v_test_count := v_test_count + 1;
    BEGIN
        PERFORM 1 FROM pending_leave_requests LIMIT 1;
        RAISE NOTICE 'PASS: pending_leave_requests view exists';
        v_pass_count := v_pass_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'FAIL: pending_leave_requests view does not exist - %', SQLERRM;
    END;

    -- Test schedule_overview view exists
    v_test_count := v_test_count + 1;
    BEGIN
        PERFORM 1 FROM schedule_overview LIMIT 1;
        RAISE NOTICE 'PASS: schedule_overview view exists';
        v_pass_count := v_pass_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'FAIL: schedule_overview view does not exist - %', SQLERRM;
    END;

    RAISE NOTICE '';

    -- ============================================================================
    -- TEST 2: TABLE COLUMN EXISTENCE TESTS
    -- ============================================================================
    RAISE NOTICE '--- TEST 2: Table Column Existence ---';

    -- Test shift_templates has shift_type column
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shift_templates' AND column_name = 'shift_type'
    ) THEN
        RAISE NOTICE 'PASS: shift_templates.shift_type column exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: shift_templates.shift_type column missing';
    END IF;

    -- Test shift_templates has is_default column
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shift_templates' AND column_name = 'is_default'
    ) THEN
        RAISE NOTICE 'PASS: shift_templates.is_default column exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: shift_templates.is_default column missing';
    END IF;

    -- Test time_attendance has clock_in_location column
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_attendance' AND column_name = 'clock_in_location'
    ) THEN
        RAISE NOTICE 'PASS: time_attendance.clock_in_location column exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: time_attendance.clock_in_location column missing';
    END IF;

    -- Test staff_schedules has is_published column
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff_schedules' AND column_name = 'is_published'
    ) THEN
        RAISE NOTICE 'PASS: staff_schedules.is_published column exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: staff_schedules.is_published column missing';
    END IF;

    -- Test leave_types has max_days_per_request column
    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leave_types' AND column_name = 'max_days_per_request'
    ) THEN
        RAISE NOTICE 'PASS: leave_types.max_days_per_request column exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: leave_types.max_days_per_request column missing';
    END IF;

    RAISE NOTICE '';

    -- ============================================================================
    -- TEST 3: INDEX EXISTENCE TESTS
    -- ============================================================================
    RAISE NOTICE '--- TEST 3: Index Existence ---';

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_staff_schedules_date') THEN
        RAISE NOTICE 'PASS: idx_staff_schedules_date index exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: idx_staff_schedules_date index missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_staff_schedules_user_date') THEN
        RAISE NOTICE 'PASS: idx_staff_schedules_user_date index exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: idx_staff_schedules_user_date index missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_time_attendance_date') THEN
        RAISE NOTICE 'PASS: idx_time_attendance_date index exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: idx_time_attendance_date index missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leave_requests_status') THEN
        RAISE NOTICE 'PASS: idx_leave_requests_status index exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: idx_leave_requests_status index missing';
    END IF;

    RAISE NOTICE '';

    -- ============================================================================
    -- TEST 4: RLS POLICY EXISTENCE TESTS
    -- ============================================================================
    RAISE NOTICE '--- TEST 4: RLS Policy Existence ---';

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'staff_schedules' 
        AND policyname = 'Staff can view their own schedules'
    ) THEN
        RAISE NOTICE 'PASS: staff_schedules RLS policy exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: staff_schedules RLS policy missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'time_attendance' 
        AND policyname = 'Staff can view their own attendance'
    ) THEN
        RAISE NOTICE 'PASS: time_attendance RLS policy exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: time_attendance RLS policy missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'leave_requests' 
        AND policyname = 'Staff can view their own leave requests'
    ) THEN
        RAISE NOTICE 'PASS: leave_requests RLS policy exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: leave_requests RLS policy missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shift_templates' 
        AND policyname = 'Authenticated users can view shift templates'
    ) THEN
        RAISE NOTICE 'PASS: shift_templates RLS policy exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: shift_templates RLS policy missing';
    END IF;

    RAISE NOTICE '';

    -- ============================================================================
    -- TEST 5: RLS ENABLED TESTS
    -- ============================================================================
    RAISE NOTICE '--- TEST 5: RLS Enabled on Tables ---';

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'staff_schedules' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE 'PASS: RLS enabled on staff_schedules';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: RLS not enabled on staff_schedules';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'time_attendance' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE 'PASS: RLS enabled on time_attendance';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: RLS not enabled on time_attendance';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'leave_requests' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE 'PASS: RLS enabled on leave_requests';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: RLS not enabled on leave_requests';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'shift_templates' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE 'PASS: RLS enabled on shift_templates';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: RLS not enabled on shift_templates';
    END IF;

    RAISE NOTICE '';

    -- ============================================================================
    -- TEST 6: VIEW DATA STRUCTURE TESTS
    -- ============================================================================
    RAISE NOTICE '--- TEST 6: View Data Structure ---';

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clinic_staff' AND column_name = 'staff_type'
    ) THEN
        RAISE NOTICE 'PASS: clinic_staff has staff_type column';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: clinic_staff missing staff_type column';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clinic_staff' AND column_name = 'specialty_en'
    ) THEN
        RAISE NOTICE 'PASS: clinic_staff has specialty_en column';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: clinic_staff missing specialty_en column';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'today_attendance' AND column_name = 'hours_worked'
    ) THEN
        RAISE NOTICE 'PASS: today_attendance has hours_worked column';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: today_attendance missing hours_worked column';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pending_leave_requests' AND column_name = 'leave_type'
    ) THEN
        RAISE NOTICE 'PASS: pending_leave_requests has leave_type column';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: pending_leave_requests missing leave_type column';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schedule_overview' AND column_name = 'shift_name'
    ) THEN
        RAISE NOTICE 'PASS: schedule_overview has shift_name column';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: schedule_overview missing shift_name column';
    END IF;

    RAISE NOTICE '';

    -- ============================================================================
    -- TEST 7: DATA INTEGRITY TESTS
    -- ============================================================================
    RAISE NOTICE '--- TEST 7: Data Integrity ---';

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'staff_schedules' 
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE 'PASS: staff_schedules has foreign key constraints';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: staff_schedules missing foreign key constraints';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'leave_requests' 
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE 'PASS: leave_requests has foreign key constraints';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: leave_requests missing foreign key constraints';
    END IF;

    -- ============================================================================
    -- TEST 8: CORE TABLES EXISTENCE
    -- ============================================================================
    RAISE NOTICE '';
    RAISE NOTICE '--- TEST 8: Core Tables Existence ---';

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shift_templates') THEN
        RAISE NOTICE 'PASS: shift_templates table exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: shift_templates table missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_schedules') THEN
        RAISE NOTICE 'PASS: staff_schedules table exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: staff_schedules table missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_attendance') THEN
        RAISE NOTICE 'PASS: time_attendance table exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: time_attendance table missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_types') THEN
        RAISE NOTICE 'PASS: leave_types table exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: leave_types table missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests') THEN
        RAISE NOTICE 'PASS: leave_requests table exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: leave_requests table missing';
    END IF;

    v_test_count := v_test_count + 1;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_balances') THEN
        RAISE NOTICE 'PASS: leave_balances table exists';
        v_pass_count := v_pass_count + 1;
    ELSE
        RAISE NOTICE 'FAIL: leave_balances table missing';
    END IF;

    RAISE NOTICE '';

    -- ============================================================================
    -- TEST SUMMARY
    -- ============================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Tests: %', v_test_count;
    RAISE NOTICE 'Passed: %', v_pass_count;
    RAISE NOTICE 'Failed: %', v_test_count - v_pass_count;
    RAISE NOTICE 'Pass Rate: % percent', ROUND((v_pass_count::NUMERIC / v_test_count::NUMERIC) * 100, 1);
    RAISE NOTICE '========================================';

    IF v_pass_count = v_test_count THEN
        RAISE NOTICE 'ALL TESTS PASSED!';
    ELSE
        RAISE NOTICE 'Some tests failed. Please review the output above.';
    END IF;

END $$;


-- ============================================================================
-- ADDITIONAL QUERY TESTS (Run separately to see results)
-- ============================================================================

-- Test 1: Check table row counts
SELECT 'TABLE ROW COUNTS' AS test_name;
SELECT 'shift_templates' as table_name, COUNT(*) as row_count FROM shift_templates
UNION ALL
SELECT 'leave_types', COUNT(*) FROM leave_types
UNION ALL
SELECT 'staff_schedules', COUNT(*) FROM staff_schedules
UNION ALL
SELECT 'time_attendance', COUNT(*) FROM time_attendance
UNION ALL
SELECT 'leave_requests', COUNT(*) FROM leave_requests
UNION ALL
SELECT 'leave_balances', COUNT(*) FROM leave_balances;

-- Test 2: Check RLS policies list
SELECT 'RLS POLICIES' AS test_name;
SELECT 
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename IN ('staff_schedules', 'time_attendance', 'leave_requests', 
                    'leave_balances', 'shift_templates', 'leave_types')
ORDER BY tablename, policyname;

-- Test 3: Check indexes
SELECT 'INDEXES' AS test_name;
SELECT 
    indexname,
    tablename
FROM pg_indexes
WHERE indexname LIKE 'idx_staff%' 
   OR indexname LIKE 'idx_time%' 
   OR indexname LIKE 'idx_leave%';

-- Test 4: Verify shift_templates data
SELECT 'SHIFT TEMPLATES' AS test_name;
SELECT 
    name,
    start_time,
    end_time,
    shift_type,
    is_default,
    color,
    is_active
FROM shift_templates
LIMIT 10;

-- Test 5: Verify leave_types data
SELECT 'LEAVE TYPES' AS test_name;
SELECT 
    name_en,
    name_ar,
    days_per_year,
    is_paid,
    requires_approval,
    color,
    is_active
FROM leave_types;
