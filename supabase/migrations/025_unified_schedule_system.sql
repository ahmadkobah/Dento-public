-- =====================================================
-- UNIFIED SCHEDULE SYSTEM MIGRATION
-- This migration ENHANCES existing tables rather than recreating them
-- Existing tables: staff_schedules, time_attendance, leave_balances, 
-- leave_requests, shift_templates, leave_types - all use user_id
-- =====================================================

-- 1. Create clinic_staff view to unify doctors and staff members
-- This allows the unified scheduler to work with all clinic personnel
CREATE OR REPLACE VIEW clinic_staff AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.phone,
    u.avatar_url,
    u.is_active,
    u.created_at,
    u.updated_at,
    'staff' as staff_type,
    NULL::uuid as branch_id,
    NULL::text as specialty_en,
    NULL::text as specialty_ar
FROM users u
WHERE u.role IN ('admin', 'staff', 'receptionist', 'hr', 'accountant', 'manager')
UNION ALL
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.phone,
    u.avatar_url,
    u.is_active,
    u.created_at,
    u.updated_at,
    'doctor' as staff_type,
    d.branch_id,
    d.specialty_en,
    d.specialty_ar
FROM users u
JOIN doctors d ON u.id = d.user_id
WHERE u.role = 'doctor';

-- 2. Add optional columns to shift_templates if they don't exist
DO $$ 
BEGIN
    -- Add shift_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shift_templates' AND column_name = 'shift_type') THEN
        ALTER TABLE shift_templates ADD COLUMN shift_type VARCHAR(50) DEFAULT 'regular';
    END IF;
    
    -- Add description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shift_templates' AND column_name = 'description') THEN
        ALTER TABLE shift_templates ADD COLUMN description TEXT;
    END IF;
    
    -- Add is_default column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shift_templates' AND column_name = 'is_default') THEN
        ALTER TABLE shift_templates ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
    
    -- Add branch_id column for branch-specific templates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shift_templates' AND column_name = 'branch_id') THEN
        ALTER TABLE shift_templates ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add optional columns to leave_types if they don't exist
-- Note: leave_types already has: name_en, name_ar, days_per_year, is_paid, requires_approval, color, is_active
DO $$ 
BEGIN
    -- Add max_days_per_request column if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leave_types' AND column_name = 'max_days_per_request') THEN
        ALTER TABLE leave_types ADD COLUMN max_days_per_request INTEGER;
    END IF;
END $$;

-- 4. leave_requests already has: user_id, leave_type_id, start_date, end_date, days_count, reason, status, approved_by, approved_at, rejection_reason
-- No additional columns needed

-- 5. time_attendance already has: user_id, branch_id, attendance_date, clock_in, clock_out, break_start, break_end,
-- scheduled_start, scheduled_end, actual_hours, overtime_hours, late_minutes, early_leave_minutes, status, notes
-- Add optional location columns if needed
DO $$ 
BEGIN
    -- Add clock_in_location column for GPS tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_attendance' AND column_name = 'clock_in_location') THEN
        ALTER TABLE time_attendance ADD COLUMN clock_in_location JSONB;
    END IF;
    
    -- Add clock_out_location column for GPS tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_attendance' AND column_name = 'clock_out_location') THEN
        ALTER TABLE time_attendance ADD COLUMN clock_out_location JSONB;
    END IF;
END $$;

-- 6. staff_schedules already has: user_id, branch_id, shift_template_id, schedule_date, start_time, end_time, break_start, break_end, status, notes
-- Add is_published column if needed
DO $$ 
BEGIN
    -- Add is_published column for schedule publishing workflow
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff_schedules' AND column_name = 'is_published') THEN
        ALTER TABLE staff_schedules ADD COLUMN is_published BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 7. Create helpful views for the unified scheduler

-- View for today's attendance with staff info
CREATE OR REPLACE VIEW today_attendance AS
SELECT 
    ta.id,
    ta.user_id,
    u.full_name,
    u.role,
    ta.attendance_date,
    ta.clock_in,
    ta.clock_out,
    ta.branch_id,
    b.name_en as branch_name,
    ta.status,
    ta.notes,
    ta.actual_hours as hours_worked,
    ta.late_minutes,
    ta.overtime_hours
FROM time_attendance ta
JOIN users u ON ta.user_id = u.id
LEFT JOIN branches b ON ta.branch_id = b.id
WHERE ta.attendance_date = CURRENT_DATE;

-- View for pending leave requests
CREATE OR REPLACE VIEW pending_leave_requests AS
SELECT 
    lr.id,
    lr.user_id,
    u.full_name,
    u.role,
    lt.name_en as leave_type,
    lt.color as leave_type_color,
    lr.start_date,
    lr.end_date,
    lr.days_count,
    lr.reason,
    lr.status,
    lr.created_at
FROM leave_requests lr
JOIN users u ON lr.user_id = u.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.status = 'pending'
ORDER BY lr.created_at ASC;

-- View for staff schedule overview
CREATE OR REPLACE VIEW schedule_overview AS
SELECT 
    ss.id,
    ss.user_id,
    u.full_name,
    u.role,
    ss.schedule_date,
    st.name as shift_name,
    COALESCE(st.start_time, ss.start_time) as start_time,
    COALESCE(st.end_time, ss.end_time) as end_time,
    st.color as shift_color,
    ss.branch_id,
    b.name_en as branch_name,
    ss.status,
    ss.notes
FROM staff_schedules ss
JOIN users u ON ss.user_id = u.id
LEFT JOIN shift_templates st ON ss.shift_template_id = st.id
LEFT JOIN branches b ON ss.branch_id = b.id;

-- 8. Insert default shift templates if none exist
INSERT INTO shift_templates (name, start_time, end_time, break_duration, color, shift_type, is_default)
SELECT * FROM (VALUES 
    ('Morning Shift', '08:00:00'::TIME, '16:00:00'::TIME, 60, '#3B82F6', 'regular', true),
    ('Evening Shift', '14:00:00'::TIME, '22:00:00'::TIME, 60, '#8B5CF6', 'regular', false),
    ('Night Shift', '22:00:00'::TIME, '06:00:00'::TIME, 60, '#1F2937', 'regular', false),
    ('Half Day AM', '08:00:00'::TIME, '12:00:00'::TIME, 0, '#10B981', 'half_day', false),
    ('Half Day PM', '13:00:00'::TIME, '17:00:00'::TIME, 0, '#F59E0B', 'half_day', false)
) AS new_templates(name, start_time, end_time, break_duration, color, shift_type, is_default)
WHERE NOT EXISTS (SELECT 1 FROM shift_templates LIMIT 1);

-- 9. Insert default leave types if none exist
INSERT INTO leave_types (name_en, name_ar, days_per_year, is_paid, color, is_active, requires_approval)
SELECT * FROM (VALUES 
    ('Annual Leave', 'إجازة سنوية', 21, true, '#3B82F6', true, true),
    ('Sick Leave', 'إجازة مرضية', 14, true, '#EF4444', true, true),
    ('Emergency Leave', 'إجازة طارئة', 5, true, '#F59E0B', true, true),
    ('Maternity Leave', 'إجازة أمومة', 90, true, '#EC4899', true, true),
    ('Unpaid Leave', 'إجازة بدون راتب', 0, false, '#6B7280', true, true)
) AS new_types(name_en, name_ar, days_per_year, is_paid, color, is_active, requires_approval)
WHERE NOT EXISTS (SELECT 1 FROM leave_types LIMIT 1);

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_schedules_date ON staff_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_user_date ON staff_schedules(user_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_time_attendance_date ON time_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_time_attendance_user_date ON time_attendance(user_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_dates ON leave_requests(user_id, start_date, end_date);

-- 11. Enable RLS on tables if not already enabled
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies (drop if exists, then create)

-- Staff Schedules policies
DROP POLICY IF EXISTS "Staff can view their own schedules" ON staff_schedules;
CREATE POLICY "Staff can view their own schedules" ON staff_schedules
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager'))
    );

DROP POLICY IF EXISTS "HR and Admin can manage schedules" ON staff_schedules;
CREATE POLICY "HR and Admin can manage schedules" ON staff_schedules
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager'))
    );

-- Time Attendance policies
DROP POLICY IF EXISTS "Staff can view their own attendance" ON time_attendance;
CREATE POLICY "Staff can view their own attendance" ON time_attendance
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager'))
    );

DROP POLICY IF EXISTS "Staff can clock in/out" ON time_attendance;
CREATE POLICY "Staff can clock in/out" ON time_attendance
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "HR and Admin can manage attendance" ON time_attendance;
CREATE POLICY "HR and Admin can manage attendance" ON time_attendance
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager'))
    );

-- Leave Requests policies
DROP POLICY IF EXISTS "Staff can view their own leave requests" ON leave_requests;
CREATE POLICY "Staff can view their own leave requests" ON leave_requests
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager'))
    );

DROP POLICY IF EXISTS "Staff can create leave requests" ON leave_requests;
CREATE POLICY "Staff can create leave requests" ON leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "HR and Admin can manage leave requests" ON leave_requests;
CREATE POLICY "HR and Admin can manage leave requests" ON leave_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager'))
    );

-- Leave Balances policies
DROP POLICY IF EXISTS "Staff can view their own leave balances" ON leave_balances;
CREATE POLICY "Staff can view their own leave balances" ON leave_balances
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager'))
    );

DROP POLICY IF EXISTS "HR and Admin can manage leave balances" ON leave_balances;
CREATE POLICY "HR and Admin can manage leave balances" ON leave_balances
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager'))
    );

-- Shift Templates policies (viewable by all authenticated, manageable by HR/Admin)
DROP POLICY IF EXISTS "Authenticated users can view shift templates" ON shift_templates;
CREATE POLICY "Authenticated users can view shift templates" ON shift_templates
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "HR and Admin can manage shift templates" ON shift_templates;
CREATE POLICY "HR and Admin can manage shift templates" ON shift_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager'))
    );

-- Leave Types policies (viewable by all authenticated, manageable by HR/Admin)
DROP POLICY IF EXISTS "Authenticated users can view leave types" ON leave_types;
CREATE POLICY "Authenticated users can view leave types" ON leave_types
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "HR and Admin can manage leave types" ON leave_types;
CREATE POLICY "HR and Admin can manage leave types" ON leave_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'hr', 'manager'))
    );

-- Grant permissions on views
GRANT SELECT ON clinic_staff TO authenticated;
GRANT SELECT ON today_attendance TO authenticated;
GRANT SELECT ON pending_leave_requests TO authenticated;
GRANT SELECT ON schedule_overview TO authenticated;

-- Done!
COMMENT ON VIEW clinic_staff IS 'Unified view of all clinic staff (doctors + non-doctor staff)';
COMMENT ON VIEW today_attendance IS 'Current day attendance records with staff info';
COMMENT ON VIEW pending_leave_requests IS 'All pending leave requests awaiting approval';
COMMENT ON VIEW schedule_overview IS 'Complete schedule view with shift and branch details';
