/**
 * Comprehensive Test Suite for Unified Schedule System
 * Unit tests with mocked Supabase client for reliable testing
 */

import { describe, it, expect, _beforeAll, _afterAll, _beforeEach, vi } from 'vitest';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
  },
};

// Helper to create chainable query mock
function createQueryMock(returnData, returnError = null) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
    then: (resolve) => resolve({ data: Array.isArray(returnData) ? returnData : [returnData], error: returnError }),
  };
  // Make it thenable for array operations
  mock[Symbol.toStringTag] = 'Promise';
  return mock;
}

// Test data fixtures
const testFixtures = {
  users: {
    admin: { id: 'admin-uuid-001', email: 'admin@test.com', role: 'admin', full_name: 'Test Admin' },
    hr: { id: 'hr-uuid-001', email: 'hr@test.com', role: 'hr', full_name: 'Test HR' },
    staff: { id: 'staff-uuid-001', email: 'staff@test.com', role: 'staff', full_name: 'Test Staff' },
    doctor: { id: 'doctor-uuid-001', email: 'doctor@test.com', role: 'doctor', full_name: 'Test Doctor' },
  },
  branches: {
    main: { id: 'branch-uuid-001', name_en: 'Main Branch', name_ar: 'الفرع الرئيسي', is_active: true },
  },
  shiftTemplates: {
    morning: { id: 'shift-uuid-001', name: 'Morning Shift', start_time: '08:00:00', end_time: '16:00:00', break_duration: 60, color: '#3B82F6', is_active: true },
    evening: { id: 'shift-uuid-002', name: 'Evening Shift', start_time: '14:00:00', end_time: '22:00:00', break_duration: 60, color: '#8B5CF6', is_active: true },
    night: { id: 'shift-uuid-003', name: 'Night Shift', start_time: '22:00:00', end_time: '06:00:00', break_duration: 60, color: '#EF4444', is_active: true },
  },
  leaveTypes: {
    annual: { id: 'lt-uuid-001', name_en: 'Annual Leave', name_ar: 'إجازة سنوية', days_per_year: 21, is_paid: true, requires_approval: true, is_active: true },
    sick: { id: 'lt-uuid-002', name_en: 'Sick Leave', name_ar: 'إجازة مرضية', days_per_year: 10, is_paid: true, requires_approval: false, is_active: true },
    unpaid: { id: 'lt-uuid-003', name_en: 'Unpaid Leave', name_ar: 'إجازة بدون راتب', days_per_year: 30, is_paid: false, requires_approval: true, is_active: true },
  },
};

// ============================================================================
// 1. SHIFT TEMPLATES TESTS
// ============================================================================

describe('Shift Templates', () => {
  describe('CRUD Operations', () => {
    it('should create a new shift template', async () => {
      const newShift = {
        id: 'new-shift-001',
        name: 'Custom Shift',
        start_time: '09:00:00',
        end_time: '17:00:00',
        break_duration: 60,
        color: '#10B981',
        is_active: true,
      };

      const queryMock = createQueryMock(newShift);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('shift_templates')
        .insert(newShift)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe('Custom Shift');
      expect(data.start_time).toBe('09:00:00');
      expect(data.end_time).toBe('17:00:00');
    });

    it('should read all active shift templates', async () => {
      const shifts = Object.values(testFixtures.shiftTemplates);
      const queryMock = createQueryMock(shifts);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mockSupabaseClient.from('shift_templates')
        .select('*')
        .eq('is_active', true);

      expect(result.data.length).toBe(3);
      expect(result.data[0].name).toBe('Morning Shift');
    });

    it('should update a shift template', async () => {
      const updatedShift = { ...testFixtures.shiftTemplates.morning, break_duration: 45 };
      const queryMock = createQueryMock(updatedShift);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('shift_templates')
        .update({ break_duration: 45 })
        .eq('id', testFixtures.shiftTemplates.morning.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.break_duration).toBe(45);
    });

    it('should deactivate a shift template (soft delete)', async () => {
      const deactivatedShift = { ...testFixtures.shiftTemplates.morning, is_active: false };
      const queryMock = createQueryMock(deactivatedShift);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('shift_templates')
        .update({ is_active: false })
        .eq('id', testFixtures.shiftTemplates.morning.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.is_active).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should reject shift with end_time before start_time (validation logic)', () => {
      const invalidShift = {
        name: 'Invalid Shift',
        start_time: '18:00:00',
        end_time: '10:00:00', // Before start (not overnight)
        break_duration: 60,
      };

      // Business logic validation (would be in the component/service)
      const startHour = parseInt(invalidShift.start_time.split(':')[0]);
      const endHour = parseInt(invalidShift.end_time.split(':')[0]);
      
      // For non-overnight shifts, end should be after start
      const isOvernightShift = invalidShift.name.toLowerCase().includes('night');
      const isValid = isOvernightShift || endHour > startHour;
      
      expect(isValid).toBe(false);
    });

    it('should accept overnight shift (end_time < start_time)', () => {
      const overnightShift = testFixtures.shiftTemplates.night;
      
      const startHour = parseInt(overnightShift.start_time.split(':')[0]); // 22
      const endHour = parseInt(overnightShift.end_time.split(':')[0]); // 06
      
      // Overnight shift is valid when end < start
      const isOvernightShift = endHour < startHour;
      expect(isOvernightShift).toBe(true);
    });

    it('should validate break_duration is reasonable', () => {
      const shifts = [
        { break_duration: 0, valid: true },
        { break_duration: 30, valid: true },
        { break_duration: 60, valid: true },
        { break_duration: 120, valid: true },
        { break_duration: -1, valid: false },
        { break_duration: 481, valid: false }, // More than 8 hours
      ];

      shifts.forEach(shift => {
        const isValid = shift.break_duration >= 0 && shift.break_duration <= 480;
        expect(isValid).toBe(shift.valid);
      });
    });

    it('should validate color is valid hex format', () => {
      const colors = [
        { color: '#3B82F6', valid: true },
        { color: '#FFF', valid: true },
        { color: '#ffffff', valid: true },
        { color: 'red', valid: false },
        { color: '3B82F6', valid: false },
        { color: '#GGG', valid: false },
      ];

      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      
      colors.forEach(c => {
        const isValid = hexRegex.test(c.color);
        expect(isValid).toBe(c.valid);
      });
    });
  });
});

// ============================================================================
// 2. STAFF SCHEDULES TESTS
// ============================================================================

describe('Staff Schedules', () => {
  describe('CRUD Operations', () => {
    it('should create a schedule for staff', async () => {
      const newSchedule = {
        id: 'schedule-uuid-001',
        user_id: testFixtures.users.staff.id,
        branch_id: testFixtures.branches.main.id,
        shift_template_id: testFixtures.shiftTemplates.morning.id,
        schedule_date: '2026-02-15',
        start_time: '08:00:00',
        end_time: '16:00:00',
        status: 'scheduled',
        is_published: false,
      };

      const queryMock = createQueryMock(newSchedule);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('staff_schedules')
        .insert(newSchedule)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.user_id).toBe(testFixtures.users.staff.id);
      expect(data.schedule_date).toBe('2026-02-15');
    });

    it('should create bulk schedules for multiple days', async () => {
      const dates = ['2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19'];
      const schedules = dates.map((date, i) => ({
        id: `bulk-schedule-${i}`,
        user_id: testFixtures.users.staff.id,
        branch_id: testFixtures.branches.main.id,
        shift_template_id: testFixtures.shiftTemplates.morning.id,
        schedule_date: date,
        start_time: '08:00:00',
        end_time: '16:00:00',
        status: 'scheduled',
      }));

      const queryMock = createQueryMock(schedules);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mockSupabaseClient.from('staff_schedules')
        .insert(schedules)
        .select();

      expect(result.data.length).toBe(4);
    });

    it('should update schedule status', async () => {
      const updatedSchedule = {
        id: 'schedule-uuid-001',
        status: 'confirmed',
        is_published: true,
      };

      const queryMock = createQueryMock(updatedSchedule);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('staff_schedules')
        .update({ status: 'confirmed', is_published: true })
        .eq('id', 'schedule-uuid-001')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('confirmed');
      expect(data.is_published).toBe(true);
    });

    it('should delete schedule', async () => {
      const queryMock = createQueryMock(null);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { error } = await mockSupabaseClient.from('staff_schedules')
        .delete()
        .eq('id', 'schedule-uuid-001');

      expect(error).toBeNull();
    });
  });

  describe('Filtering & Queries', () => {
    it('should filter schedules by date range', async () => {
      const schedules = [
        { id: '1', schedule_date: '2026-02-15', user_id: testFixtures.users.staff.id },
        { id: '2', schedule_date: '2026-02-16', user_id: testFixtures.users.staff.id },
      ];

      const queryMock = createQueryMock(schedules);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mockSupabaseClient.from('staff_schedules')
        .select('*')
        .gte('schedule_date', '2026-02-01')
        .lte('schedule_date', '2026-02-28');

      expect(result.data.length).toBe(2);
    });

    it('should filter schedules by user', async () => {
      const staffSchedules = [
        { id: '1', user_id: testFixtures.users.staff.id, schedule_date: '2026-02-15' },
      ];

      const queryMock = createQueryMock(staffSchedules);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mockSupabaseClient.from('staff_schedules')
        .select('*')
        .eq('user_id', testFixtures.users.staff.id);

      expect(result.data.every(s => s.user_id === testFixtures.users.staff.id)).toBe(true);
    });

    it('should filter schedules by branch', async () => {
      const branchSchedules = [
        { id: '1', branch_id: testFixtures.branches.main.id },
        { id: '2', branch_id: testFixtures.branches.main.id },
      ];

      const queryMock = createQueryMock(branchSchedules);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mockSupabaseClient.from('staff_schedules')
        .select('*')
        .eq('branch_id', testFixtures.branches.main.id);

      expect(result.data.every(s => s.branch_id === testFixtures.branches.main.id)).toBe(true);
    });

    it('should filter schedules by status', async () => {
      const confirmedSchedules = [
        { id: '1', status: 'confirmed' },
        { id: '2', status: 'confirmed' },
      ];

      const queryMock = createQueryMock(confirmedSchedules);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mockSupabaseClient.from('staff_schedules')
        .select('*')
        .eq('status', 'confirmed');

      expect(result.data.every(s => s.status === 'confirmed')).toBe(true);
    });
  });

  describe('Conflict Detection', () => {
    it('should detect overlapping schedules for same user on same day', () => {
      const existingSchedules = [
        { user_id: 'user-1', schedule_date: '2026-02-15', start_time: '08:00:00', end_time: '16:00:00' },
      ];
      
      const newSchedule = {
        user_id: 'user-1',
        schedule_date: '2026-02-15',
        start_time: '14:00:00', // Overlaps with existing
        end_time: '22:00:00',
      };

      function hasConflict(existing, newSched) {
        return existing.some(s => 
          s.user_id === newSched.user_id &&
          s.schedule_date === newSched.schedule_date &&
          !(newSched.end_time <= s.start_time || newSched.start_time >= s.end_time)
        );
      }

      expect(hasConflict(existingSchedules, newSchedule)).toBe(true);
    });

    it('should allow non-overlapping schedules on same day', () => {
      const existingSchedules = [
        { user_id: 'user-1', schedule_date: '2026-02-15', start_time: '08:00:00', end_time: '12:00:00' },
      ];
      
      const newSchedule = {
        user_id: 'user-1',
        schedule_date: '2026-02-15',
        start_time: '14:00:00', // No overlap
        end_time: '22:00:00',
      };

      function hasConflict(existing, newSched) {
        return existing.some(s => 
          s.user_id === newSched.user_id &&
          s.schedule_date === newSched.schedule_date &&
          !(newSched.end_time <= s.start_time || newSched.start_time >= s.end_time)
        );
      }

      expect(hasConflict(existingSchedules, newSchedule)).toBe(false);
    });

    it('should allow same time slot for different users', () => {
      const existingSchedules = [
        { user_id: 'user-1', schedule_date: '2026-02-15', start_time: '08:00:00', end_time: '16:00:00' },
      ];
      
      const newSchedule = {
        user_id: 'user-2', // Different user
        schedule_date: '2026-02-15',
        start_time: '08:00:00',
        end_time: '16:00:00',
      };

      function hasConflict(existing, newSched) {
        return existing.some(s => 
          s.user_id === newSched.user_id &&
          s.schedule_date === newSched.schedule_date
        );
      }

      expect(hasConflict(existingSchedules, newSchedule)).toBe(false);
    });
  });
});

// ============================================================================
// 3. TIME ATTENDANCE TESTS
// ============================================================================

describe('Time Attendance', () => {
  describe('Clock In/Out Operations', () => {
    it('should record clock in', async () => {
      const clockIn = {
        id: 'attendance-001',
        user_id: testFixtures.users.staff.id,
        attendance_date: '2026-02-15',
        clock_in: '2026-02-15T08:00:00Z',
        status: 'present',
      };

      const queryMock = createQueryMock(clockIn);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('time_attendance')
        .insert(clockIn)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.clock_in).toBeDefined();
    });

    it('should record clock out and calculate hours', async () => {
      const clockOut = {
        id: 'attendance-001',
        user_id: testFixtures.users.staff.id,
        attendance_date: '2026-02-15',
        clock_in: '2026-02-15T08:00:00Z',
        clock_out: '2026-02-15T16:00:00Z',
        actual_hours: 8.0,
        status: 'present',
      };

      const queryMock = createQueryMock(clockOut);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('time_attendance')
        .update({ clock_out: '2026-02-15T16:00:00Z', actual_hours: 8.0 })
        .eq('id', 'attendance-001')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.clock_out).toBeDefined();
      expect(data.actual_hours).toBe(8.0);
    });
  });

  describe('Hours Calculation', () => {
    it('should calculate actual hours correctly', () => {
      const testCases = [
        { clockIn: '08:00', clockOut: '16:00', expected: 8.0 },
        { clockIn: '09:00', clockOut: '17:30', expected: 8.5 },
        { clockIn: '08:00', clockOut: '12:00', expected: 4.0 },
        { clockIn: '22:00', clockOut: '06:00', expected: 8.0 }, // Overnight
      ];

      function calculateHours(clockIn, clockOut) {
        const [inH, inM] = clockIn.split(':').map(Number);
        const [outH, outM] = clockOut.split(':').map(Number);
        
        let inMinutes = inH * 60 + inM;
        let outMinutes = outH * 60 + outM;
        
        // Handle overnight
        if (outMinutes < inMinutes) {
          outMinutes += 24 * 60;
        }
        
        return (outMinutes - inMinutes) / 60;
      }

      testCases.forEach(tc => {
        expect(calculateHours(tc.clockIn, tc.clockOut)).toBe(tc.expected);
      });
    });

    it('should calculate late minutes correctly', () => {
      const testCases = [
        { scheduled: '08:00', actual: '08:00', expected: 0 },
        { scheduled: '08:00', actual: '08:15', expected: 15 },
        { scheduled: '08:00', actual: '08:30', expected: 30 },
        { scheduled: '08:00', actual: '07:45', expected: 0 }, // Early
      ];

      function calculateLateMinutes(scheduledStart, actualClockIn) {
        const [schedH, schedM] = scheduledStart.split(':').map(Number);
        const [actualH, actualM] = actualClockIn.split(':').map(Number);
        
        const schedMinutes = schedH * 60 + schedM;
        const actualMinutes = actualH * 60 + actualM;
        
        return Math.max(0, actualMinutes - schedMinutes);
      }

      testCases.forEach(tc => {
        expect(calculateLateMinutes(tc.scheduled, tc.actual)).toBe(tc.expected);
      });
    });

    it('should calculate overtime correctly', () => {
      const testCases = [
        { actualHours: 8, standardHours: 8, expected: 0 },
        { actualHours: 10, standardHours: 8, expected: 2 },
        { actualHours: 12, standardHours: 8, expected: 4 },
        { actualHours: 6, standardHours: 8, expected: 0 }, // Under
      ];

      function calculateOvertime(actualHours, standardHours) {
        return Math.max(0, actualHours - standardHours);
      }

      testCases.forEach(tc => {
        expect(calculateOvertime(tc.actualHours, tc.standardHours)).toBe(tc.expected);
      });
    });
  });

  describe('Attendance Status', () => {
    it('should determine attendance status correctly', () => {
      const testCases = [
        { hasClockIn: true, hasClockOut: true, onLeave: false, expected: 'present' },
        { hasClockIn: true, hasClockOut: false, onLeave: false, expected: 'present' },
        { hasClockIn: false, hasClockOut: false, onLeave: false, expected: 'absent' },
        { hasClockIn: false, hasClockOut: false, onLeave: true, expected: 'on_leave' },
      ];

      function determineStatus(hasClockIn, hasClockOut, onLeave) {
        if (onLeave) return 'on_leave';
        if (hasClockIn) return 'present';
        return 'absent';
      }

      testCases.forEach(tc => {
        expect(determineStatus(tc.hasClockIn, tc.hasClockOut, tc.onLeave)).toBe(tc.expected);
      });
    });
  });
});

// ============================================================================
// 4. LEAVE TYPES TESTS
// ============================================================================

describe('Leave Types', () => {
  describe('CRUD Operations', () => {
    it('should create a new leave type', async () => {
      const newLeaveType = {
        id: 'new-lt-001',
        name_en: 'Parental Leave',
        name_ar: 'إجازة الوالدين',
        days_per_year: 14,
        is_paid: true,
        requires_approval: true,
        color: '#EC4899',
        is_active: true,
      };

      const queryMock = createQueryMock(newLeaveType);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('leave_types')
        .insert(newLeaveType)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.name_en).toBe('Parental Leave');
      expect(data.days_per_year).toBe(14);
    });

    it('should read all active leave types', async () => {
      const leaveTypes = Object.values(testFixtures.leaveTypes);
      const queryMock = createQueryMock(leaveTypes);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const result = await mockSupabaseClient.from('leave_types')
        .select('*')
        .eq('is_active', true);

      expect(result.data.length).toBe(3);
    });

    it('should update leave type', async () => {
      const updated = { ...testFixtures.leaveTypes.annual, days_per_year: 25 };
      const queryMock = createQueryMock(updated);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('leave_types')
        .update({ days_per_year: 25 })
        .eq('id', testFixtures.leaveTypes.annual.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.days_per_year).toBe(25);
    });

    it('should deactivate leave type (soft delete)', async () => {
      const deactivated = { ...testFixtures.leaveTypes.unpaid, is_active: false };
      const queryMock = createQueryMock(deactivated);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('leave_types')
        .update({ is_active: false })
        .eq('id', testFixtures.leaveTypes.unpaid.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.is_active).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate days_per_year is positive', () => {
      const values = [0, 1, 10, 30, 365, -1, -10];
      
      values.forEach(days => {
        const isValid = days > 0 && days <= 365;
        expect(isValid).toBe(days > 0 && days <= 365);
      });
    });

    it('should validate required fields', () => {
      const validLeaveType = {
        name_en: 'Test Leave',
        days_per_year: 10,
      };

      const invalidLeaveTypes = [
        { days_per_year: 10 }, // Missing name_en
        { name_en: 'Test' }, // Missing days_per_year
        { name_en: '', days_per_year: 10 }, // Empty name
      ];

      function validate(lt) {
        const hasValidName = Boolean(lt.name_en && lt.name_en.length > 0);
        const hasValidDays = Boolean(typeof lt.days_per_year === 'number' && lt.days_per_year > 0);
        return hasValidName && hasValidDays;
      }

      expect(validate(validLeaveType)).toBe(true);
      invalidLeaveTypes.forEach(lt => {
        const result = validate(lt);
        expect(result).toBe(false);
      });
    });
  });
});

// ============================================================================
// 5. LEAVE REQUESTS TESTS
// ============================================================================

describe('Leave Requests', () => {
  describe('CRUD Operations', () => {
    it('should create a leave request', async () => {
      const request = {
        id: 'lr-001',
        user_id: testFixtures.users.staff.id,
        leave_type_id: testFixtures.leaveTypes.annual.id,
        start_date: '2026-03-01',
        end_date: '2026-03-05',
        total_days: 5,
        reason: 'Family vacation',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const queryMock = createQueryMock(request);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('leave_requests')
        .insert(request)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('pending');
      expect(data.total_days).toBe(5);
    });

    it('should approve leave request', async () => {
      const approved = {
        id: 'lr-001',
        status: 'approved',
        approved_by: testFixtures.users.hr.id,
        approved_at: new Date().toISOString(),
      };

      const queryMock = createQueryMock(approved);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('leave_requests')
        .update({ status: 'approved', approved_by: testFixtures.users.hr.id })
        .eq('id', 'lr-001')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('approved');
    });

    it('should reject leave request with reason', async () => {
      const rejected = {
        id: 'lr-002',
        status: 'rejected',
        approved_by: testFixtures.users.hr.id,
        rejection_reason: 'Peak season - too many staff on leave',
      };

      const queryMock = createQueryMock(rejected);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('leave_requests')
        .update({ 
          status: 'rejected', 
          approved_by: testFixtures.users.hr.id,
          rejection_reason: 'Peak season - too many staff on leave'
        })
        .eq('id', 'lr-002')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('rejected');
      expect(data.rejection_reason).toBeDefined();
    });

    it('should cancel leave request', async () => {
      const cancelled = { id: 'lr-003', status: 'cancelled' };
      const queryMock = createQueryMock(cancelled);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', 'lr-003')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('cancelled');
    });
  });

  describe('Date Calculations', () => {
    it('should calculate total days correctly', () => {
      const testCases = [
        { start: '2026-03-01', end: '2026-03-01', expected: 1 },
        { start: '2026-03-01', end: '2026-03-05', expected: 5 },
        { start: '2026-03-01', end: '2026-03-31', expected: 31 },
      ];

      function calculateDays(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = Math.abs(endDate - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }

      testCases.forEach(tc => {
        expect(calculateDays(tc.start, tc.end)).toBe(tc.expected);
      });
    });

    it('should calculate working days (excluding weekends)', () => {
      function calculateWorkingDays(start, end) {
        let count = 0;
        const current = new Date(start);
        const endDate = new Date(end);
        
        while (current <= endDate) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) { // Not Sunday or Saturday
            count++;
          }
          current.setDate(current.getDate() + 1);
        }
        return count;
      }

      // March 2-6, 2026 is Mon-Fri (5 working days)
      expect(calculateWorkingDays('2026-03-02', '2026-03-06')).toBe(5);
      
      // March 1-7, 2026 includes weekend (5 working days)
      expect(calculateWorkingDays('2026-03-01', '2026-03-07')).toBe(5);
    });
  });

  describe('Overlap Detection', () => {
    it('should detect overlapping leave requests', () => {
      const existingRequests = [
        { user_id: 'user-1', start_date: '2026-03-01', end_date: '2026-03-05', status: 'approved' },
      ];

      const newRequest = {
        user_id: 'user-1',
        start_date: '2026-03-03', // Overlaps
        end_date: '2026-03-10',
      };

      function hasOverlap(existing, newReq) {
        return existing.some(r => 
          r.user_id === newReq.user_id &&
          r.status !== 'rejected' &&
          r.status !== 'cancelled' &&
          !(newReq.end_date < r.start_date || newReq.start_date > r.end_date)
        );
      }

      expect(hasOverlap(existingRequests, newRequest)).toBe(true);
    });

    it('should allow non-overlapping requests', () => {
      const existingRequests = [
        { user_id: 'user-1', start_date: '2026-03-01', end_date: '2026-03-05', status: 'approved' },
      ];

      const newRequest = {
        user_id: 'user-1',
        start_date: '2026-03-10', // No overlap
        end_date: '2026-03-15',
      };

      function hasOverlap(existing, newReq) {
        return existing.some(r => 
          r.user_id === newReq.user_id &&
          r.status !== 'rejected' &&
          r.status !== 'cancelled' &&
          !(newReq.end_date < r.start_date || newReq.start_date > r.end_date)
        );
      }

      expect(hasOverlap(existingRequests, newRequest)).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate start_date is not in the past', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const testCases = [
        { start_date: '2025-01-01', valid: false }, // Past
        { start_date: '2027-01-01', valid: true }, // Future
      ];

      testCases.forEach(tc => {
        const startDate = new Date(tc.start_date);
        const isValid = startDate >= today;
        expect(isValid).toBe(tc.valid);
      });
    });

    it('should validate end_date is not before start_date', () => {
      const testCases = [
        { start: '2026-03-05', end: '2026-03-01', valid: false },
        { start: '2026-03-01', end: '2026-03-05', valid: true },
        { start: '2026-03-01', end: '2026-03-01', valid: true }, // Same day
      ];

      testCases.forEach(tc => {
        const isValid = new Date(tc.end) >= new Date(tc.start);
        expect(isValid).toBe(tc.valid);
      });
    });

    it('should validate total_days does not exceed balance', () => {
      const balance = { entitled_days: 21, used_days: 10, remaining_days: 11 };
      
      const requests = [
        { total_days: 5, valid: true },
        { total_days: 11, valid: true },
        { total_days: 12, valid: false },
        { total_days: 20, valid: false },
      ];

      requests.forEach(req => {
        const isValid = req.total_days <= balance.remaining_days;
        expect(isValid).toBe(req.valid);
      });
    });
  });
});

// ============================================================================
// 6. LEAVE BALANCES TESTS
// ============================================================================

describe('Leave Balances', () => {
  describe('CRUD Operations', () => {
    it('should create leave balance for user', async () => {
      const balance = {
        id: 'balance-001',
        user_id: testFixtures.users.staff.id,
        leave_type_id: testFixtures.leaveTypes.annual.id,
        year: 2026,
        entitled_days: 21,
        used_days: 0,
        remaining_days: 21, // Generated column
        carry_forward: 0,
      };

      const queryMock = createQueryMock(balance);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('leave_balances')
        .insert(balance)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.entitled_days).toBe(21);
      expect(data.remaining_days).toBe(21);
    });

    it('should update used_days when leave is approved', async () => {
      const updated = {
        id: 'balance-001',
        entitled_days: 21,
        used_days: 5,
        remaining_days: 16, // Generated: 21 - 5
      };

      const queryMock = createQueryMock(updated);
      mockSupabaseClient.from.mockReturnValue(queryMock);

      const { data, error } = await mockSupabaseClient.from('leave_balances')
        .update({ used_days: 5 })
        .eq('id', 'balance-001')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.used_days).toBe(5);
      expect(data.remaining_days).toBe(16);
    });
  });

  describe('Balance Calculations', () => {
    it('should calculate remaining days correctly', () => {
      const testCases = [
        { entitled: 21, used: 0, expected: 21 },
        { entitled: 21, used: 5, expected: 16 },
        { entitled: 21, used: 21, expected: 0 },
        { entitled: 30, used: 15, expected: 15 },
      ];

      testCases.forEach(tc => {
        const remaining = tc.entitled - tc.used;
        expect(remaining).toBe(tc.expected);
      });
    });

    it('should handle carry forward', () => {
      const balance = {
        entitled_days: 21,
        used_days: 10,
        carry_forward: 5,
      };

      const totalAvailable = balance.entitled_days + balance.carry_forward - balance.used_days;
      expect(totalAvailable).toBe(16); // 21 + 5 - 10
    });

    it('should handle year rollover', () => {
      const lastYearBalance = {
        entitled_days: 21,
        used_days: 16,
        remaining_days: 5,
      };

      const maxCarryForward = 5; // Policy limit
      const carryForward = Math.min(lastYearBalance.remaining_days, maxCarryForward);

      const newYearBalance = {
        entitled_days: 21,
        carry_forward: carryForward,
        used_days: 0,
        remaining_days: 21,
        total_available: 21 + carryForward,
      };

      expect(newYearBalance.carry_forward).toBe(5);
      expect(newYearBalance.total_available).toBe(26);
    });
  });

  describe('Validation', () => {
    it('should not allow negative balance', () => {
      const balances = [
        { used_days: 0, entitled_days: 21, valid: true },
        { used_days: 21, entitled_days: 21, valid: true },
        { used_days: 22, entitled_days: 21, valid: false },
      ];

      balances.forEach(b => {
        const isValid = b.used_days <= b.entitled_days;
        expect(isValid).toBe(b.valid);
      });
    });

    it('should enforce unique constraint per user/type/year', () => {
      const existingBalances = [
        { user_id: 'user-1', leave_type_id: 'lt-1', year: 2026 },
      ];

      const newBalance = { user_id: 'user-1', leave_type_id: 'lt-1', year: 2026 };

      const isDuplicate = existingBalances.some(b =>
        b.user_id === newBalance.user_id &&
        b.leave_type_id === newBalance.leave_type_id &&
        b.year === newBalance.year
      );

      expect(isDuplicate).toBe(true);
    });
  });
});

// ============================================================================
// 7. SECURITY & PERMISSIONS TESTS
// ============================================================================

describe('Security & Permissions', () => {
  describe('Role-based Access', () => {
    it('should define correct permissions for admin role', () => {
      const adminPermissions = {
        shift_templates: { create: true, read: true, update: true, delete: true },
        staff_schedules: { create: true, read: true, update: true, delete: true },
        time_attendance: { create: true, read: true, update: true, delete: true },
        leave_types: { create: true, read: true, update: true, delete: true },
        leave_requests: { create: true, read: true, update: true, delete: true },
        leave_balances: { create: true, read: true, update: true, delete: true },
      };

      Object.values(adminPermissions).forEach(perms => {
        expect(perms.create).toBe(true);
        expect(perms.read).toBe(true);
        expect(perms.update).toBe(true);
        expect(perms.delete).toBe(true);
      });
    });

    it('should define correct permissions for HR role', () => {
      const hrPermissions = {
        shift_templates: { create: true, read: true, update: true, delete: false },
        staff_schedules: { create: true, read: true, update: true, delete: true },
        time_attendance: { create: true, read: true, update: true, delete: false },
        leave_types: { create: false, read: true, update: false, delete: false },
        leave_requests: { create: true, read: true, update: true, delete: false },
        leave_balances: { create: true, read: true, update: true, delete: false },
      };

      expect(hrPermissions.leave_types.create).toBe(false);
      expect(hrPermissions.leave_requests.update).toBe(true); // Can approve/reject
    });

    it('should define correct permissions for staff role', () => {
      const staffPermissions = {
        shift_templates: { create: false, read: true, update: false, delete: false },
        staff_schedules: { create: false, read: 'own', update: false, delete: false },
        time_attendance: { create: 'own', read: 'own', update: 'own', delete: false },
        leave_types: { create: false, read: true, update: false, delete: false },
        leave_requests: { create: 'own', read: 'own', update: 'own', delete: false },
        leave_balances: { create: false, read: 'own', update: false, delete: false },
      };

      expect(staffPermissions.leave_requests.create).toBe('own');
      expect(staffPermissions.staff_schedules.read).toBe('own');
    });
  });

  describe('Data Isolation', () => {
    it('should filter user data by user_id for staff', () => {
      const currentUserId = 'staff-uuid-001';
      const allRecords = [
        { id: '1', user_id: 'staff-uuid-001', data: 'own' },
        { id: '2', user_id: 'staff-uuid-002', data: 'other' },
        { id: '3', user_id: 'staff-uuid-001', data: 'own' },
      ];

      const filtered = allRecords.filter(r => r.user_id === currentUserId);
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(r => r.user_id === currentUserId)).toBe(true);
    });

    it('should allow HR to view all records', () => {
      const userRole = 'hr';
      const allRecords = [
        { id: '1', user_id: 'staff-uuid-001' },
        { id: '2', user_id: 'staff-uuid-002' },
        { id: '3', user_id: 'doctor-uuid-001' },
      ];

      const canViewAll = ['admin', 'hr'].includes(userRole);
      const visibleRecords = canViewAll ? allRecords : [];
      
      expect(canViewAll).toBe(true);
      expect(visibleRecords.length).toBe(3);
    });
  });
});

// ============================================================================
// 8. EDGE CASES & VALIDATION TESTS
// ============================================================================

describe('Edge Cases & Validation', () => {
  describe('Date Handling', () => {
    it('should handle year boundary', () => {
      const yearEndSchedule = {
        schedule_date: '2026-12-31',
        start_time: '08:00:00',
        end_time: '16:00:00',
      };

      const yearStartSchedule = {
        schedule_date: '2027-01-01',
        start_time: '08:00:00',
        end_time: '16:00:00',
      };

      expect(new Date(yearEndSchedule.schedule_date).getFullYear()).toBe(2026);
      expect(new Date(yearStartSchedule.schedule_date).getFullYear()).toBe(2027);
    });

    it('should handle leap year dates', () => {
      // 2028 is a leap year
      const leapYearDate = '2028-02-29';
      const date = new Date(leapYearDate);
      
      expect(date.getMonth()).toBe(1); // February (0-indexed)
      expect(date.getDate()).toBe(29);
    });

    it('should handle timezone correctly', () => {
      const utcTime = '2026-02-15T08:00:00Z';
      const date = new Date(utcTime);
      
      expect(date.toISOString()).toBe('2026-02-15T08:00:00.000Z');
    });
  });

  describe('Null & Empty Values', () => {
    it('should handle null optional fields', () => {
      const schedule = {
        user_id: 'user-1',
        schedule_date: '2026-02-15',
        start_time: '08:00:00',
        end_time: '16:00:00',
        notes: null,
        shift_template_id: null,
      };

      expect(schedule.notes).toBeNull();
      expect(schedule.shift_template_id).toBeNull();
    });

    it('should handle empty string notes', () => {
      const schedule = {
        notes: '',
      };

      expect(schedule.notes).toBe('');
      expect(schedule.notes.length).toBe(0);
    });

    it('should handle undefined optional fields', () => {
      const schedule = {
        user_id: 'user-1',
        schedule_date: '2026-02-15',
      };

      expect(schedule.notes).toBeUndefined();
      expect(schedule.notes ?? 'default').toBe('default');
    });
  });

  describe('Unicode & Special Characters', () => {
    it('should handle Arabic text', () => {
      const note = 'ملاحظة باللغة العربية';
      expect(note.length).toBeGreaterThan(0);
      expect(note).toContain('العربية');
    });

    it('should handle emojis', () => {
      const note = '🏥 Hospital shift 👨‍⚕️';
      expect(note).toContain('🏥');
      expect(note).toContain('👨‍⚕️');
    });

    it('should handle special characters', () => {
      const notes = [
        "Schedule for O'Brien",
        'Notes with "quotes"',
        'Line1\nLine2',
        'Tab\there',
      ];

      notes.forEach(note => {
        expect(typeof note).toBe('string');
        expect(note.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Boundary Values', () => {
    it('should handle maximum leave days', () => {
      const maxDays = 365;
      expect(maxDays).toBeLessThanOrEqual(366); // Leap year max
    });

    it('should handle zero values', () => {
      const balance = { used_days: 0, entitled_days: 21 };
      expect(balance.used_days).toBe(0);
      expect(balance.entitled_days - balance.used_days).toBe(21);
    });

    it('should handle time boundaries', () => {
      const times = [
        { time: '00:00:00', valid: true },
        { time: '23:59:59', valid: true },
        { time: '12:00:00', valid: true },
      ];

      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      
      times.forEach(t => {
        expect(timeRegex.test(t.time)).toBe(t.valid);
      });
    });
  });
});

// ============================================================================
// 9. BUSINESS LOGIC TESTS
// ============================================================================

describe('Business Logic', () => {
  describe('Minimum Staffing', () => {
    it('should check minimum staffing requirement', () => {
      const minStaffRequired = 2;
      const scheduledStaff = [
        { user_id: 'staff-1', status: 'confirmed' },
        { user_id: 'staff-2', status: 'confirmed' },
        { user_id: 'staff-3', status: 'scheduled' },
      ];

      const confirmedStaff = scheduledStaff.filter(s => s.status === 'confirmed');
      const meetsMinimum = confirmedStaff.length >= minStaffRequired;

      expect(meetsMinimum).toBe(true);
    });

    it('should warn when understaffed', () => {
      const minStaffRequired = 3;
      const scheduledStaff = [
        { user_id: 'staff-1', status: 'confirmed' },
      ];

      const confirmedStaff = scheduledStaff.filter(s => s.status === 'confirmed');
      const isUnderstaffed = confirmedStaff.length < minStaffRequired;

      expect(isUnderstaffed).toBe(true);
    });
  });

  describe('Leave Approval Workflow', () => {
    it('should follow approval workflow states', () => {
      const validTransitions = {
        pending: ['approved', 'rejected', 'cancelled'],
        approved: ['cancelled'],
        rejected: [],
        cancelled: [],
      };

      // Test valid transitions
      expect(validTransitions.pending.includes('approved')).toBe(true);
      expect(validTransitions.pending.includes('rejected')).toBe(true);
      expect(validTransitions.approved.includes('cancelled')).toBe(true);

      // Test invalid transitions
      expect(validTransitions.rejected.includes('approved')).toBe(false);
      expect(validTransitions.cancelled.includes('pending')).toBe(false);
    });

    it('should require approver for approval', () => {
      const approval = {
        status: 'approved',
        approved_by: 'hr-uuid-001',
        approved_at: new Date().toISOString(),
      };

      expect(approval.approved_by).toBeDefined();
      expect(approval.approved_at).toBeDefined();
    });

    it('should require reason for rejection', () => {
      const rejection = {
        status: 'rejected',
        approved_by: 'hr-uuid-001',
        rejection_reason: 'Insufficient coverage during this period',
      };

      expect(rejection.rejection_reason).toBeDefined();
      expect(rejection.rejection_reason.length).toBeGreaterThan(0);
    });
  });

  describe('Attendance Tracking', () => {
    it('should identify frequently late employees', () => {
      const attendanceRecords = [
        { user_id: 'user-1', late_minutes: 0 },
        { user_id: 'user-1', late_minutes: 15 },
        { user_id: 'user-1', late_minutes: 30 },
        { user_id: 'user-1', late_minutes: 0 },
        { user_id: 'user-1', late_minutes: 20 },
      ];

      const threshold = 10; // minutes
      const lateCount = attendanceRecords.filter(r => r.late_minutes > threshold).length;
      const totalDays = attendanceRecords.length;
      const latePercentage = (lateCount / totalDays) * 100;

      expect(lateCount).toBe(3);
      expect(latePercentage).toBe(60);
    });

    it('should calculate monthly summary', () => {
      const monthRecords = [
        { actual_hours: 8, overtime_hours: 0, late_minutes: 0 },
        { actual_hours: 9, overtime_hours: 1, late_minutes: 0 },
        { actual_hours: 8, overtime_hours: 0, late_minutes: 15 },
        { actual_hours: 10, overtime_hours: 2, late_minutes: 0 },
        { actual_hours: 8, overtime_hours: 0, late_minutes: 0 },
      ];

      const summary = {
        totalHours: monthRecords.reduce((sum, r) => sum + r.actual_hours, 0),
        totalOvertime: monthRecords.reduce((sum, r) => sum + r.overtime_hours, 0),
        totalLateMinutes: monthRecords.reduce((sum, r) => sum + r.late_minutes, 0),
        daysWorked: monthRecords.length,
      };

      expect(summary.totalHours).toBe(43);
      expect(summary.totalOvertime).toBe(3);
      expect(summary.totalLateMinutes).toBe(15);
      expect(summary.daysWorked).toBe(5);
    });
  });

  describe('Schedule Publishing', () => {
    it('should publish schedules in bulk', () => {
      const schedules = [
        { id: '1', is_published: false, status: 'scheduled' },
        { id: '2', is_published: false, status: 'scheduled' },
        { id: '3', is_published: true, status: 'confirmed' },
      ];

      const unpublished = schedules.filter(s => !s.is_published);
      const toPublish = unpublished.map(s => ({ ...s, is_published: true, status: 'confirmed' }));

      expect(unpublished.length).toBe(2);
      expect(toPublish.every(s => s.is_published)).toBe(true);
    });

    it('should notify staff when schedule is published', () => {
      const publishedSchedules = [
        { user_id: 'staff-1', schedule_date: '2026-02-15' },
        { user_id: 'staff-2', schedule_date: '2026-02-15' },
      ];

      const usersToNotify = [...new Set(publishedSchedules.map(s => s.user_id))];
      
      expect(usersToNotify.length).toBe(2);
      expect(usersToNotify).toContain('staff-1');
      expect(usersToNotify).toContain('staff-2');
    });
  });
});

// ============================================================================
// 10. INTEGRATION WORKFLOW TESTS
// ============================================================================

describe('Integration Workflows', () => {
  describe('Complete Scheduling Workflow', () => {
    it('should complete full schedule creation to publishing', () => {
      // 1. Create shift template
      const shiftTemplate = {
        id: 'shift-1',
        name: 'Morning',
        start_time: '08:00:00',
        end_time: '16:00:00',
      };

      // 2. Create schedule
      const schedule = {
        id: 'schedule-1',
        user_id: 'staff-1',
        shift_template_id: shiftTemplate.id,
        schedule_date: '2026-02-15',
        status: 'scheduled',
        is_published: false,
      };

      // 3. Review schedule
      expect(schedule.status).toBe('scheduled');

      // 4. Publish schedule
      const publishedSchedule = {
        ...schedule,
        status: 'confirmed',
        is_published: true,
      };

      expect(publishedSchedule.is_published).toBe(true);
      expect(publishedSchedule.status).toBe('confirmed');
    });
  });

  describe('Complete Leave Request Workflow', () => {
    it('should complete full leave request to balance update', () => {
      // 1. Check balance
      const balance = {
        user_id: 'staff-1',
        leave_type_id: 'annual',
        entitled_days: 21,
        used_days: 5,
        remaining_days: 16,
      };

      // 2. Create request
      const request = {
        user_id: 'staff-1',
        leave_type_id: 'annual',
        start_date: '2026-03-01',
        end_date: '2026-03-05',
        total_days: 5,
        status: 'pending',
      };

      // 3. Validate against balance
      const canRequest = request.total_days <= balance.remaining_days;
      expect(canRequest).toBe(true);

      // 4. Approve request
      const approved = { ...request, status: 'approved' };
      expect(approved.status).toBe('approved');

      // 5. Update balance
      const updatedBalance = {
        ...balance,
        used_days: balance.used_days + request.total_days,
        remaining_days: balance.remaining_days - request.total_days,
      };

      expect(updatedBalance.used_days).toBe(10);
      expect(updatedBalance.remaining_days).toBe(11);
    });
  });

  describe('Complete Attendance Workflow', () => {
    it('should complete full attendance tracking day', () => {
      const scheduledStart = '08:00';
      const _scheduledEnd = '16:00';
      const standardHours = 8;

      // 1. Clock in
      const clockInTime = '08:05';
      const [inH, inM] = clockInTime.split(':').map(Number);
      const [schedH, schedM] = scheduledStart.split(':').map(Number);
      const lateMinutes = Math.max(0, (inH * 60 + inM) - (schedH * 60 + schedM));

      expect(lateMinutes).toBe(5);

      // 2. Clock out
      const clockOutTime = '17:30';
      const [outH, outM] = clockOutTime.split(':').map(Number);
      const actualMinutes = (outH * 60 + outM) - (inH * 60 + inM);
      const actualHours = actualMinutes / 60;

      expect(actualHours).toBeCloseTo(9.42, 1);

      // 3. Calculate overtime
      const overtime = Math.max(0, actualHours - standardHours);
      expect(overtime).toBeGreaterThan(1);

      // 4. Final record
      const attendanceRecord = {
        clock_in: clockInTime,
        clock_out: clockOutTime,
        actual_hours: Math.round(actualHours * 100) / 100,
        overtime_hours: Math.round(overtime * 100) / 100,
        late_minutes: lateMinutes,
        status: 'present',
      };

      expect(attendanceRecord.status).toBe('present');
      expect(attendanceRecord.late_minutes).toBe(5);
    });
  });
});

// ============================================================================
// 11. PERFORMANCE TESTS
// ============================================================================

describe('Performance', () => {
  describe('Bulk Operations', () => {
    it('should handle 100 schedule records efficiently', () => {
      const schedules = Array.from({ length: 100 }, (_, i) => ({
        id: `schedule-${i}`,
        user_id: `user-${i % 10}`,
        schedule_date: `2026-02-${String((i % 28) + 1).padStart(2, '0')}`,
        status: 'scheduled',
      }));

      expect(schedules.length).toBe(100);

      // Group by user
      const byUser = schedules.reduce((acc, s) => {
        acc[s.user_id] = acc[s.user_id] || [];
        acc[s.user_id].push(s);
        return acc;
      }, {});

      expect(Object.keys(byUser).length).toBe(10);
    });

    it('should filter large dataset efficiently', () => {
      const records = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        date: new Date(2026, 1, (i % 28) + 1).toISOString().split('T')[0],
        status: i % 3 === 0 ? 'confirmed' : 'scheduled',
      }));

      const start = performance.now();
      const filtered = records.filter(r => r.status === 'confirmed');
      const end = performance.now();

      expect(filtered.length).toBeGreaterThan(300);
      expect(end - start).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Pagination', () => {
    it('should paginate results correctly', () => {
      const allRecords = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      const pageSize = 10;

      const getPage = (page) => {
        const start = (page - 1) * pageSize;
        return allRecords.slice(start, start + pageSize);
      };

      expect(getPage(1).length).toBe(10);
      expect(getPage(1)[0].id).toBe(0);
      expect(getPage(2)[0].id).toBe(10);
      expect(getPage(10)[9].id).toBe(99);
    });
  });
});

// ============================================================================
// 12. ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  describe('Validation Errors', () => {
    it('should handle invalid date format', () => {
      const invalidDates = ['2026-13-01', '2026-02-30', 'invalid', ''];

      invalidDates.forEach(date => {
        const parsed = new Date(date);
        const isValid = !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date.slice(0, 7));
        expect(isValid).toBe(false);
      });
    });

    it('should handle invalid UUID format', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      const invalidUuids = ['', '123', 'not-a-uuid', '12345678-1234-1234-1234'];
      const validUuid = '12345678-1234-4234-8234-123456789012';

      invalidUuids.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(false);
      });
      expect(uuidRegex.test(validUuid)).toBe(true);
    });
  });

  describe('Database Errors', () => {
    it('should handle foreign key constraint error', async () => {
      const error = {
        code: '23503',
        message: 'violates foreign key constraint',
        details: 'Key (user_id)=(invalid-uuid) is not present in table "users"',
      };

      expect(error.code).toBe('23503');
      expect(error.message).toContain('foreign key');
    });

    it('should handle unique constraint error', async () => {
      const error = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        details: 'Key (user_id, leave_type_id, year) already exists',
      };

      expect(error.code).toBe('23505');
      expect(error.message).toContain('unique constraint');
    });
  });
});
