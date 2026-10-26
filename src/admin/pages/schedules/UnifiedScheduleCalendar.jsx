import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { 
  Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Stethoscope,
  Building2, X, Edit, Check, AlertCircle, List, Grid3X3, Filter, Trash2, CheckCircle2,
  XCircle, Search, ArrowLeft, Users, ClipboardList, Timer, Coffee, LogIn, LogOut,
  CalendarDays, FileText, UserCheck, UserX, Settings, Download, RefreshCw
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO, isWithinInterval
} from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../../hooks/useToast';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const exceptionConfig = {
  vacation: { color: 'bg-blue-500', label: 'Vacation', textColor: 'text-blue-700', bgLight: 'bg-blue-50', border: 'border-blue-300' },
  sick_leave: { color: 'bg-red-500', label: 'Sick Leave', textColor: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-300' },
  special_hours: { color: 'bg-yellow-500', label: 'Special Hours', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50', border: 'border-yellow-300' },
  day_off: { color: 'bg-gray-500', label: 'Day Off', textColor: 'text-gray-700', bgLight: 'bg-gray-50', border: 'border-gray-300' },
  conference: { color: 'bg-purple-500', label: 'Conference', textColor: 'text-purple-700', bgLight: 'bg-purple-50', border: 'border-purple-300' },
  other: { color: 'bg-green-500', label: 'Other', textColor: 'text-green-700', bgLight: 'bg-green-50', border: 'border-green-300' },
};

const shiftColors = {
  morning: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  afternoon: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  evening: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  night: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  full_day: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  split: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
  custom: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

const _attendanceStatusColors = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
  half_day: 'bg-orange-100 text-orange-700',
  on_leave: 'bg-blue-100 text-blue-700',
  holiday: 'bg-purple-100 text-purple-700',
};

const UnifiedScheduleCalendar = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity();
  const userRole = identity?.role;
  const userId = identity?.id;
  const isAdmin = ['developer', 'admin'].includes(userRole);
  const { tenantId } = useTenant();

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data
  const [doctors, setDoctors] = useState([]);
  const [clinicStaff, setClinicStaff] = useState([]);
  const [branches, setBranches] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [staffSchedules, setStaffSchedules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  
  // Filters
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'attendance' | 'leave' | 'shifts'
  const [filterStaffType, setFilterStaffType] = useState('all'); // 'all' | 'doctor' | 'staff'
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Combined staff list
  const allStaff = useMemo(() => {
    const doctorsList = doctors.map(d => ({
      id: d.id,
      name: d.name_en,
      name_ar: d.name_ar,
      photo_url: d.photo_url,
      type: 'doctor',
      role: 'Doctor',
      branch_id: d.branch_id,
      user_id: d.user_id,
    }));
    
    // clinicStaff now comes from users table
    const staffList = clinicStaff.map(s => ({
      id: s.id,
      name: s.full_name,
      photo_url: null,
      type: 'staff',
      role: s.role,
      branch_id: null,
      user_id: s.id, // user_id is the same as id for users table
    }));
    
    return [...doctorsList, ...staffList];
  }, [doctors, clinicStaff]);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return allStaff.filter(s => {
      if (filterStaffType !== 'all' && s.type !== filterStaffType) return false;
      if (filterBranch !== 'all' && s.branch_id !== filterBranch) return false;
      if (filterPerson !== 'all' && s.id !== filterPerson) return false;
      return true;
    });
  }, [allStaff, filterStaffType, filterBranch, filterPerson]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Load all data
  const loadData = useCallback(async () => {
    if (!identity) return;
    if (!tenantId) return;
    setLoading(true);
    
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    try {
      // Load doctors - simplified query
      let doctorsQuery = supabase
        .from('doctors')
        .select('id, name_en, name_ar, photo_url, user_id, branch_id')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('name_en');
      if (!isAdmin && userId) {
        doctorsQuery = doctorsQuery.eq('user_id', userId);
      }
      
      // Load clinic staff - check if table exists and has data
      let staffQuery = supabase
        .from('users')
        .select('id, full_name, email, role, is_active')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .in('role', ['staff', 'receptionist', 'nurse', 'hr', 'manager'])
        .order('full_name');

      // Load branches - simplified
      const branchesQuery = supabase
        .from('branches')
        .select('id, name_en, name_ar')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('name_en');

      // Load shift templates
      const shiftsQuery = supabase
        .from('shift_templates')
        .select('*')
        .eq('is_active', true)
        .order('start_time');

      // Load doctor schedules (branch assignments) - simplified
      const doctorSchedulesQuery = supabase
        .from('doctor_schedules')
        .select('*, doctors(id, name_en, photo_url), branches(id, name_en)')
        .eq('is_active', true)
        .order('start_time');

      // Load staff schedules for the month - use user_id and join to users
      const staffSchedulesQuery = supabase
        .from('staff_schedules')
        .select(`
          *,
          users:user_id(id, full_name, email),
          branches(id, name_en),
          shift_templates(id, name, shift_type, start_time, end_time)
        `)
        .gte('schedule_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('schedule_date', format(monthEnd, 'yyyy-MM-dd'));

      // Load exceptions for the month - schedule_exceptions uses doctor_id (no branch_id)
      let exceptionsQuery = supabase
        .from('schedule_exceptions')
        .select(`
          *,
          doctors(id, name_en, photo_url)
        `)
        .lte('start_date', format(monthEnd, 'yyyy-MM-dd'))
        .gte('end_date', format(monthStart, 'yyyy-MM-dd'))
        .order('start_date');

      // Load attendance for the month - uses user_id
      const attendanceQuery = supabase
        .from('time_attendance')
        .select(`
          *,
          users:user_id(id, full_name)
        `)
        .eq('tenant_id', tenantId)
        .gte('attendance_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('attendance_date', format(monthEnd, 'yyyy-MM-dd'));

      // Load pending leave requests - uses user_id, approved_by
      const leaveQuery = supabase
        .from('leave_requests')
        .select(`
          *,
          users:user_id(id, full_name),
          leave_types(id, name_en, color),
          approver:approved_by(id, full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      const [
        { data: doctorsData },
        { data: staffData },
        { data: branchesData },
        { data: shiftsData },
        { data: doctorSchedulesData },
        { data: staffSchedulesData },
        { data: exceptionsData },
        { data: attendanceData },
        { data: leaveData },
      ] = await Promise.all([
        doctorsQuery,
        staffQuery,
        branchesQuery,
        shiftsQuery,
        doctorSchedulesQuery,
        staffSchedulesQuery,
        exceptionsQuery,
        attendanceQuery,
        leaveQuery,
      ]);
      
      setDoctors(doctorsData || []);
      setClinicStaff(staffData || []);
      setBranches(branchesData || []);
      setShiftTemplates(shiftsData || []);
      setDoctorSchedules(doctorSchedulesData || []);
      setStaffSchedules(staffSchedulesData || []);
      setExceptions(exceptionsData || []);
      setAttendance(attendanceData || []);
      setLeaveRequests(leaveData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, isAdmin, userId, identity, tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Get schedules for a specific day
  const getSchedulesForDay = useCallback((day) => {
    const dayOfWeek = day.getDay();
    const dateStr = format(day, 'yyyy-MM-dd');
    
    // Doctor recurring schedules
    const recurring = doctorSchedules.filter(sch => {
      if (sch.schedule_type === 'recurring') {
        const matches = sch.day_of_week === dayOfWeek;
        return matches;
      } else {
        const matches = sch.specific_date === dateStr;
        return matches;
      }
    });

    // Daily staff schedules
    const daily = staffSchedules.filter(sch => sch.schedule_date === dateStr);

    return { recurring, daily };
  }, [doctorSchedules, staffSchedules]);

  // Get exceptions for a specific day
  const getExceptionsForDay = useCallback((day) => {
    return exceptions.filter(exc => {
      const start = parseISO(exc.start_date);
      const end = parseISO(exc.end_date);
      return isWithinInterval(day, { start, end });
    });
  }, [exceptions]);

  // Get attendance for a specific day
  const getAttendanceForDay = useCallback((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return attendance.filter(a => a.attendance_date === dateStr);
  }, [attendance]);

  // Get person's working hours for a day
  const getWorkingHours = useCallback((person, day) => {
    if (!person?.working_hours) return null;
    const dayName = format(day, 'EEEE').toLowerCase();
    return person.working_hours[dayName];
  }, []);

  // Check if person is available
  const isPersonAvailable = useCallback((person, day) => {
    const workingHours = getWorkingHours(person, day);
    if (!workingHours || workingHours.off) return false;

    const dayExceptions = exceptions.filter(exc => {
      const matchesPerson = person.type === 'doctor' 
        ? exc.doctor_id === person.id 
        : exc.staff_id === person.id;
      if (!matchesPerson || !exc.is_approved) return false;
      const start = parseISO(exc.start_date);
      const end = parseISO(exc.end_date);
      return isWithinInterval(day, { start, end });
    });

    return !dayExceptions.some(exc => exc.exception_type !== 'special_hours');
  }, [exceptions, getWorkingHours]);

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Actions
  const handleDeleteException = async (exceptionId) => {
    if (!confirm('Delete this schedule exception?')) return;
    const { error } = await supabase.from('schedule_exceptions').delete().eq('id', exceptionId);
    if (!error) setExceptions(prev => prev.filter(e => e.id !== exceptionId));
  };

  const handleApproveException = async (exceptionId) => {
    const { error } = await supabase
      .from('schedule_exceptions')
      .update({ is_approved: true, approved_by: userId })
      .eq('id', exceptionId);
    if (!error) {
      setExceptions(prev => prev.map(e => 
        e.id === exceptionId ? { ...e, is_approved: true } : e
      ));
    }
  };

  const handleApproveLeave = async (leaveId) => {
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
      .eq('id', leaveId)
      .eq('tenant_id', tenantId);
    if (!error) {
      setLeaveRequests(prev => prev.map(l => 
        l.id === leaveId ? { ...l, status: 'approved' } : l
      ));
    }
  };

  const handleRejectLeave = async (leaveId) => {
    const reason = prompt('Rejection reason (optional):');
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'rejected', approved_by: userId, approved_at: new Date().toISOString(), reason: reason || undefined })
      .eq('id', leaveId)
      .eq('tenant_id', tenantId);
    if (!error) {
      setLeaveRequests(prev => prev.map(l => 
        l.id === leaveId ? { ...l, status: 'rejected' } : l
      ));
    }
  };

  const handleDeleteSchedule = async (scheduleId, isRecurring = false) => {
    if (!confirm('Delete this schedule assignment?')) return;
    const table = isRecurring ? 'doctor_schedules' : 'staff_schedules';
    const { error } = await supabase.from(table).delete().eq('id', scheduleId);
    if (!error) {
      if (isRecurring) {
        setDoctorSchedules(prev => prev.filter(s => s.id !== scheduleId));
      } else {
        setStaffSchedules(prev => prev.filter(s => s.id !== scheduleId));
      }
    }
  };

  // Quick clock in/out
  const handleClockIn = async (personId, personType, userId, branchId) => {
    // time_attendance requires user_id and branch_id
    const payload = {
      user_id: userId,
      branch_id: branchId || branches[0]?.id, // Use provided branch or first available
      attendance_date: format(new Date(), 'yyyy-MM-dd'),
      clock_in: new Date().toISOString(),
      status: 'present',
      tenant_id: tenantId,
    };
    
    if (!payload.branch_id) {
      console.error('No branch available for clock in');
      toast.warning('Cannot clock in: No branch available');
      return;
    }
    
    const { data, error } = await supabase.from('time_attendance').insert(payload).select().single();
    if (!error && data) {
      setAttendance(prev => [...prev, data]);
    } else if (error) {
      console.error('Clock in error:', error);
      toast.error('Clock in failed: ' + error.message);
    }
  };

  const handleClockOut = async (attendanceId) => {
    // First, get the current attendance record to access clock_in and break times
    const { data: currentRecord, error: fetchError } = await supabase
      .from('time_attendance')
      .select('*')
      .eq('id', attendanceId)
      .eq('tenant_id', tenantId)
      .single();
    
    if (fetchError || !currentRecord) {
      console.error('Failed to fetch attendance record:', fetchError);
      toast.error('Clock out failed: Could not fetch attendance record');
      return;
    }
    
    const clockOutTime = new Date();
    const clockInTime = new Date(currentRecord.clock_in);
    
    // Issue #38: Calculate actual hours worked (clock_out - clock_in - break_duration)
    let totalMinutes = (clockOutTime - clockInTime) / 1000 / 60; // Total minutes between clock in and out
    
    // Subtract break time if recorded
    if (currentRecord.break_start && currentRecord.break_end) {
      const breakStart = new Date(currentRecord.break_start);
      const breakEnd = new Date(currentRecord.break_end);
      const breakMinutes = (breakEnd - breakStart) / 1000 / 60;
      totalMinutes -= breakMinutes;
    }
    
    // Convert to hours (2 decimal places)
    const actualHours = Math.max(0, totalMinutes / 60).toFixed(2);
    
    const { data, error } = await supabase
      .from('time_attendance')
      .update({ 
        clock_out: clockOutTime.toISOString(),
        actual_hours: parseFloat(actualHours)
      })
      .eq('id', attendanceId)
      .eq('tenant_id', tenantId)
      .select()
      .single();
    if (!error && data) {
      setAttendance(prev => prev.map(a => a.id === attendanceId ? data : a));
    } else if (error) {
      console.error('Clock out error:', error);
      toast.error('Clock out failed: ' + error.message);
    }
  };

  // Stats for the selected day
  const selectedDayData = useMemo(() => {
    const schedules = getSchedulesForDay(selectedDate);
    const dayExceptions = getExceptionsForDay(selectedDate);
    const dayAttendance = getAttendanceForDay(selectedDate);
    const availableStaff = filteredStaff.filter(s => isPersonAvailable(s, selectedDate));
    const unavailableStaff = filteredStaff.filter(s => !isPersonAvailable(s, selectedDate));
    
    // Collect user_ids of staff scheduled for this day
    const scheduledUserIds = new Set();
    
    // Add user_ids from recurring doctor schedules (need to look up doctor's user_id)
    schedules.recurring.forEach(sch => {
      const doctor = doctors.find(d => d.id === sch.doctor_id);
      if (doctor?.user_id) {
        scheduledUserIds.add(doctor.user_id);
      }
    });
    
    // Add user_ids from daily staff schedules
    schedules.daily.forEach(sch => {
      if (sch.user_id) {
        scheduledUserIds.add(sch.user_id);
      }
    });
    
    return {
      schedules,
      exceptions: dayExceptions,
      attendance: dayAttendance,
      availableStaff,
      unavailableStaff,
      scheduledUserIds,
    };
  }, [selectedDate, getSchedulesForDay, getExceptionsForDay, getAttendanceForDay, filteredStaff, isPersonAvailable, doctors]);

  // Pending counts
  const pendingLeaveCount = leaveRequests.filter(l => l.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
            <p className="text-gray-500 text-sm">
              {allStaff.length} staff • {doctorSchedules.length} assignments • {exceptions.length} exceptions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={refresh} disabled={refreshing} className="p-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
          
          {isAdmin && (
            <>
              <Link to="/schedules/assign" className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Assign Schedule
              </Link>
              <Link to="/schedules/exception/create" className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Add Exception
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b">
        {[
          { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
          { id: 'attendance', label: 'Attendance', icon: UserCheck, badge: isToday(selectedDate) ? selectedDayData.attendance.length : null },
          { id: 'leave', label: 'Leave Requests', icon: FileText, badge: pendingLeaveCount || null },
          { id: 'shifts', label: 'Shift Templates', icon: Clock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 border-b-2 -mb-px transition-colors',
              activeTab === tab.id 
                ? 'border-primary-600 text-primary-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && (
              <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        
        <select
          value={filterStaffType}
          onChange={(e) => { setFilterStaffType(e.target.value); setFilterPerson('all'); }}
          className="text-sm border rounded-lg px-3 py-1.5"
        >
          <option value="all">All Staff Types</option>
          <option value="doctor">Doctors Only</option>
          <option value="staff">Clinic Staff Only</option>
        </select>

        <select
          value={filterPerson}
          onChange={(e) => setFilterPerson(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5"
        >
          <option value="all">All People</option>
          {(filterStaffType === 'all' || filterStaffType === 'doctor') && doctors.length > 0 && (
            <optgroup label="Doctors">
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name_en}</option>
              ))}
            </optgroup>
          )}
          {(filterStaffType === 'all' || filterStaffType === 'staff') && clinicStaff.length > 0 && (
            <optgroup label="Clinic Staff">
              {clinicStaff.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </optgroup>
          )}
        </select>

        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5"
        >
          <option value="all">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name_en}</option>
          ))}
        </select>

        {activeTab === 'leave' && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        )}

        {(filterStaffType !== 'all' || filterPerson !== 'all' || filterBranch !== 'all' || filterStatus !== 'all') && (
          <button
            onClick={() => { setFilterStaffType('all'); setFilterPerson('all'); setFilterBranch('all'); setFilterStatus('all'); }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Main Content */}
      {activeTab === 'calendar' && (
        <CalendarView
          currentDate={currentDate}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          calendarDays={calendarDays}
          goToPreviousMonth={goToPreviousMonth}
          goToNextMonth={goToNextMonth}
          goToToday={goToToday}
          getSchedulesForDay={getSchedulesForDay}
          getExceptionsForDay={getExceptionsForDay}
          selectedDayData={selectedDayData}
          isAdmin={isAdmin}
          handleDeleteSchedule={handleDeleteSchedule}
          handleDeleteException={handleDeleteException}
          handleApproveException={handleApproveException}
          exceptionConfig={exceptionConfig}
          shiftColors={shiftColors}
        />
      )}

      {activeTab === 'attendance' && (
        <AttendanceView
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          attendance={selectedDayData.attendance}
          allStaff={filteredStaff}
          scheduledStaffIds={selectedDayData.scheduledUserIds}
          handleClockIn={handleClockIn}
          handleClockOut={handleClockOut}
        />
      )}

      {activeTab === 'leave' && (
        <LeaveRequestsView
          leaveRequests={leaveRequests}
          filterStatus={filterStatus}
          isAdmin={isAdmin}
          handleApproveLeave={handleApproveLeave}
          handleRejectLeave={handleRejectLeave}
        />
      )}

      {activeTab === 'shifts' && (
        <ShiftTemplatesView
          shiftTemplates={shiftTemplates}
          shiftColors={shiftColors}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

// Calendar View Component
const CalendarView = ({
  currentDate, selectedDate, setSelectedDate, calendarDays,
  goToPreviousMonth, goToNextMonth, goToToday,
  getSchedulesForDay, getExceptionsForDay, selectedDayData,
  isAdmin,
  handleDeleteSchedule, handleDeleteException, handleApproveException,
  exceptionConfig, shiftColors
}) => {
  return (
    <div className="flex-1 flex gap-4 min-h-0">
      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button onClick={goToPreviousMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button onClick={goToNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <button onClick={goToToday} className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
            Today
          </button>
        </div>

        {/* Week Header */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((day, index) => {
            const { recurring, daily } = getSchedulesForDay(day);
            const dayExceptions = getExceptionsForDay(day);
            const totalSchedules = recurring.length + daily.length;
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = isSameDay(day, selectedDate);
            const isDayToday = isToday(day);

            return (
              <button
                key={index}
                onClick={() => setSelectedDate(day)}
                className={clsx(
                  'relative p-1 border-r border-b border-gray-100 text-left transition-colors min-h-[80px]',
                  !isCurrentMonth && 'bg-gray-50',
                  isSelected && 'bg-primary-50 ring-2 ring-primary-500 ring-inset',
                  !isSelected && 'hover:bg-gray-50'
                )}
              >
                <div className={clsx(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1',
                  isDayToday && !isSelected && 'bg-primary-500 text-white',
                  isDayToday && isSelected && 'bg-primary-600 text-white',
                  !isDayToday && isCurrentMonth && 'text-gray-900',
                  !isDayToday && !isCurrentMonth && 'text-gray-400'
                )}>
                  {format(day, 'd')}
                </div>
                
                {/* Schedule Indicators */}
                {isCurrentMonth && (totalSchedules > 0 || dayExceptions.length > 0) && (
                  <div className="space-y-0.5">
                    {[...recurring, ...daily].slice(0, 2).map((sch, i) => {
                      const shiftType = sch.shift_templates?.shift_type || 'full_day';
                      const colors = shiftColors[shiftType] || shiftColors.custom;
                      const name = sch.doctors?.name_en || sch.users?.full_name || 'Staff';
                      const startTime = sch.start_time?.slice(0, 5) || '';
                      return (
                        <div
                          key={i}
                          className={clsx('text-xs px-1.5 py-0.5 rounded truncate', colors.bg, colors.text)}
                          title={`${startTime} - ${name}`}
                        >
                          <span className="font-medium">{startTime}</span> {name.split(' ')[0]}
                        </div>
                      );
                    })}
                    
                    {dayExceptions.slice(0, totalSchedules > 0 ? 1 : 2).map(exc => {
                      const config = exceptionConfig[exc.exception_type] || exceptionConfig.other;
                      const name = exc.doctors?.name_en?.split(' ')[0] || 'Staff';
                      return (
                        <div
                          key={exc.id}
                          className={clsx(
                            'text-xs px-1.5 py-0.5 rounded truncate',
                            config.bgLight, config.textColor,
                            !exc.is_approved && 'opacity-60'
                          )}
                        >
                          {name} - {config.label}
                        </div>
                      );
                    })}
                    
                    {(totalSchedules + dayExceptions.length) > 3 && (
                      <div className="text-xs text-gray-500 px-1.5">
                        +{totalSchedules + dayExceptions.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Side Panel - Day Details */}
      <div className="w-96 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
              </h3>
              <p className="text-sm text-gray-500">{format(selectedDate, 'MMMM d, yyyy')}</p>
            </div>
            <span className="bg-primary-100 text-primary-700 text-sm font-medium px-2.5 py-1 rounded-full">
              {selectedDayData.schedules.recurring.length + selectedDayData.schedules.daily.length} scheduled
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Assigned Schedules */}
          {selectedDayData.schedules.recurring.length === 0 && selectedDayData.schedules.daily.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No schedules assigned</p>
              {isAdmin && (
                <Link
                  to="/schedules/assign"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block"
                >
                  + Assign schedule
                </Link>
              )}
            </div>
          ) : (
            [...selectedDayData.schedules.recurring, ...selectedDayData.schedules.daily].map(sch => {
              const isRecurring = !!sch.schedule_type;
              const name = sch.doctors?.name_en || sch.users?.full_name || 'Staff';
              const photoUrl = sch.doctors?.photo_url;
              const shiftType = sch.shift_templates?.shift_type || 'full_day';
              const colors = shiftColors[shiftType] || shiftColors.custom;

              return (
                <div
                  key={sch.id}
                  className={clsx(
                    'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                    colors.bg,
                    'border-l-4',
                    shiftType === 'morning' && 'border-l-blue-500',
                    shiftType === 'afternoon' && 'border-l-orange-500',
                    shiftType === 'evening' && 'border-l-purple-500',
                    shiftType === 'night' && 'border-l-indigo-500',
                    shiftType === 'full_day' && 'border-l-green-500',
                    shiftType === 'split' && 'border-l-pink-500',
                    (!shiftType || shiftType === 'custom') && 'border-l-gray-400'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">
                        {sch.start_time?.slice(0, 5)} - {sch.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    {isRecurring && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-500 text-white">
                        Weekly
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      {photoUrl ? (
                        <img src={photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                      )}
                      <span className="text-gray-700 font-medium">{name}</span>
                    </div>
                    
                    {sch.branches?.name_en && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {sch.branches.name_en}
                      </div>
                    )}
                    
                    {sch.shift_templates?.name_en && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        {sch.shift_templates.name_en}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="mt-3 pt-2 border-t border-gray-200 flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(sch.id, isRecurring); }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Exceptions Section */}
          {selectedDayData.exceptions.length > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                Exceptions ({selectedDayData.exceptions.length})
              </h4>
              
              {selectedDayData.exceptions.map(exc => {
                const config = exceptionConfig[exc.exception_type] || exceptionConfig.other;
                const name = exc.doctors?.name_en || 'Staff';
                
                return (
                  <div
                    key={exc.id}
                    className={clsx(
                      'p-3 rounded-lg border mb-2 transition-all',
                      config.bgLight,
                      'border-l-4',
                      exc.exception_type === 'vacation' && 'border-l-blue-500',
                      exc.exception_type === 'sick_leave' && 'border-l-red-500',
                      exc.exception_type === 'personal' && 'border-l-green-500',
                      exc.exception_type === 'training' && 'border-l-purple-500',
                      exc.exception_type === 'other' && 'border-l-gray-500',
                      !exc.is_approved && 'opacity-70'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={clsx('text-sm font-medium', config.textColor)}>
                          {name}
                        </span>
                        <span className={clsx('ml-2 text-xs px-2 py-0.5 rounded-full', config.color, 'text-white')}>
                          {config.label}
                        </span>
                      </div>
                      {!exc.is_approved && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    
                    {exc.reason && (
                      <p className="text-xs text-gray-500 mt-1">{exc.reason}</p>
                    )}
                    
                    {isAdmin && !exc.is_approved && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleApproveException(exc.id)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteException(exc.id)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Shift Types</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(shiftColors).slice(0, 5).map(([key, colors]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={clsx('w-3 h-3 rounded', colors.bg, 'border', colors.border)} />
                <span className="text-xs text-gray-600 capitalize">{key.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Attendance View Component
const AttendanceView = ({ selectedDate, setSelectedDate, attendance, allStaff, scheduledStaffIds, handleClockIn, handleClockOut }) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const selectedStr = format(selectedDate, 'yyyy-MM-dd');
  const isViewingToday = todayStr === selectedStr;
  const isPastDay = selectedStr < todayStr;

  // Get attendance records mapped by user_id
  const attendanceMap = useMemo(() => {
    const map = {};
    attendance.forEach(a => {
      map[a.user_id] = a;
    });
    return map;
  }, [attendance]);

  // Only show staff who are scheduled for this day, or who have attendance records
  const relevantStaff = useMemo(() => {
    return allStaff.filter(person => 
      scheduledStaffIds.has(person.user_id) || attendanceMap[person.user_id]
    );
  }, [allStaff, scheduledStaffIds, attendanceMap]);

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const absentCount = isPastDay ? relevantStaff.filter(p => !attendanceMap[p.user_id]).length : 0;

  return (
    <div className="flex-1 flex gap-4 min-h-0">
      {/* Main Attendance Table */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
                </h3>
                <p className="text-sm text-gray-500">{format(selectedDate, 'MMMM d, yyyy')}</p>
              </div>
              <input
                type="date"
                value={selectedStr}
                onChange={(e) => setSelectedDate(parseISO(e.target.value))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <span className="bg-primary-100 text-primary-700 text-sm font-medium px-2.5 py-1 rounded-full">
              {relevantStaff.length} staff scheduled
            </span>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Present</p>
              <p className="font-semibold text-gray-900">{presentCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Late</p>
              <p className="font-semibold text-gray-900">{lateCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Absent</p>
              <p className="font-semibold text-gray-900">{absentCount}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {relevantStaff.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No staff scheduled for this day</p>
              <Link
                to="/schedules/assign"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block"
              >
                + Assign schedule
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {relevantStaff.map(person => {
                const record = attendanceMap[person.user_id];
                const isScheduled = scheduledStaffIds.has(person.user_id);
                const status = record?.status || (isPastDay && isScheduled ? 'absent' : 'not_scheduled');
                
                return (
                  <div
                    key={person.id}
                    className={clsx(
                      'p-4 rounded-lg border transition-all hover:shadow-md',
                      'border-l-4',
                      status === 'present' && 'bg-green-50 border-l-green-500',
                      status === 'late' && 'bg-yellow-50 border-l-yellow-500',
                      status === 'absent' && 'bg-red-50 border-l-red-500',
                      status === 'not_scheduled' && 'bg-gray-50 border-l-gray-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {person.photo_url ? (
                          <img src={person.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{person.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="capitalize">{person.role}</span>
                            <span className={clsx(
                              'px-1.5 py-0.5 rounded-full',
                              person.type === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            )}>
                              {person.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Time Info */}
                        <div className="text-right">
                          {record?.clock_in ? (
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-xs text-gray-500">Clock In</p>
                                <p className="font-semibold text-gray-900">{format(parseISO(record.clock_in), 'HH:mm')}</p>
                              </div>
                              {record?.clock_out && (
                                <div>
                                  <p className="text-xs text-gray-500">Clock Out</p>
                                  <p className="font-semibold text-gray-900">{format(parseISO(record.clock_out), 'HH:mm')}</p>
                                </div>
                              )}
                              {record?.actual_hours && (
                                <div>
                                  <p className="text-xs text-gray-500">Hours</p>
                                  <p className="font-semibold text-gray-900">{record.actual_hours.toFixed(1)}h</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">No clock in</p>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span className={clsx(
                          'text-xs font-medium px-2.5 py-1 rounded-full',
                          status === 'present' && 'bg-green-500 text-white',
                          status === 'late' && 'bg-yellow-500 text-white',
                          status === 'absent' && 'bg-red-500 text-white',
                          status === 'not_scheduled' && 'bg-gray-400 text-white'
                        )}>
                          {status.replace('_', ' ')}
                        </span>

                        {/* Actions */}
                        {isViewingToday && (
                          <div>
                            {!record ? (
                              <button
                                onClick={() => handleClockIn(person.id, person.type, person.user_id, person.branch_id)}
                                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5 transition-colors"
                              >
                                <LogIn className="w-4 h-4" />
                                Clock In
                              </button>
                            ) : !record.clock_out ? (
                              <button
                                onClick={() => handleClockOut(record.id)}
                                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1.5 transition-colors"
                              >
                                <LogOut className="w-4 h-4" />
                                Clock Out
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 px-3">Completed</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Leave Requests View Component
const LeaveRequestsView = ({ leaveRequests, filterStatus, isAdmin, handleApproveLeave, handleRejectLeave }) => {
  const filteredRequests = useMemo(() => {
    return leaveRequests.filter(l => {
      if (filterStatus !== 'all' && l.status !== filterStatus) return false;
      return true;
    });
  }, [leaveRequests, filterStatus]);

  const pendingCount = leaveRequests.filter(l => l.status === 'pending').length;
  const approvedCount = leaveRequests.filter(l => l.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(l => l.status === 'rejected').length;

  return (
    <div className="flex-1 flex gap-4 min-h-0">
      {/* Main Leave Requests List */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Leave Requests</h3>
              <p className="text-sm text-gray-500">{filteredRequests.length} requests</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-primary-100 text-primary-700 text-sm font-medium px-2.5 py-1 rounded-full">
                {pendingCount} pending
              </span>
              {isAdmin && (
                <Link 
                  to="/schedules/exception/create" 
                  className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Request
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="font-semibold text-gray-900">{pendingCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Approved</p>
              <p className="font-semibold text-gray-900">{approvedCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Rejected</p>
              <p className="font-semibold text-gray-900">{rejectedCount}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No leave requests found</p>
              {isAdmin && (
                <Link
                  to="/schedules/exception/create"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block"
                >
                  + Create leave request
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(leave => {
                const name = leave.users?.full_name || 'Unknown';
                const leaveColor = leave.leave_types?.color || '#6B7280';
                
                return (
                  <div
                    key={leave.id}
                    className={clsx(
                      'p-4 rounded-lg border transition-all hover:shadow-md',
                      'border-l-4',
                      leave.status === 'pending' && 'bg-yellow-50 border-l-yellow-500',
                      leave.status === 'approved' && 'bg-green-50 border-l-green-500',
                      leave.status === 'rejected' && 'bg-red-50 border-l-red-500',
                      leave.status === 'cancelled' && 'bg-gray-50 border-l-gray-400'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">
                          {format(parseISO(leave.start_date), 'MMM d')}
                          {leave.start_date !== leave.end_date && (
                            <> - {format(parseISO(leave.end_date), 'MMM d, yyyy')}</>
                          )}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({leave.days_count || leave.total_days || 1} day{(leave.days_count || leave.total_days || 1) > 1 ? 's' : ''})
                        </span>
                      </div>
                      <span className={clsx(
                        'text-xs font-medium px-2.5 py-1 rounded-full',
                        leave.status === 'pending' && 'bg-yellow-500 text-white',
                        leave.status === 'approved' && 'bg-green-500 text-white',
                        leave.status === 'rejected' && 'bg-red-500 text-white',
                        leave.status === 'cancelled' && 'bg-gray-400 text-white'
                      )}>
                        {leave.status}
                      </span>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 font-medium">{name}</span>
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full" 
                          style={{ backgroundColor: `${leaveColor}20`, color: leaveColor }}
                        >
                          {leave.leave_types?.name_en || 'Leave'}
                        </span>
                      </div>
                      
                      {leave.reason && (
                        <div className="flex items-start gap-2 text-sm text-gray-500">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span className="line-clamp-2">{leave.reason}</span>
                        </div>
                      )}
                    </div>

                    {isAdmin && leave.status === 'pending' && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApproveLeave(leave.id)}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectLeave(leave.id)}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1.5 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}

                    {leave.status !== 'pending' && leave.approver && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                        {leave.status === 'approved' ? 'Approved' : 'Rejected'} by {leave.approver?.full_name || 'Admin'}
                        {leave.approved_at && <> on {format(parseISO(leave.approved_at), 'MMM d, yyyy')}</>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Shift Templates View Component
const ShiftTemplatesView = ({ shiftTemplates, shiftColors, isAdmin }) => {
  return (
    <div className="flex-1 flex gap-4 min-h-0">
      {/* Main Shift Templates Grid */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Shift Templates</h3>
              <p className="text-sm text-gray-500">Define reusable work schedules</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-primary-100 text-primary-700 text-sm font-medium px-2.5 py-1 rounded-full">
                {shiftTemplates.length} templates
              </span>
              {isAdmin && (
                <button className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1.5 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add Template
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {shiftTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No shift templates configured</p>
              <p className="text-sm text-gray-400 mt-1">Add your first template to get started</p>
              {isAdmin && (
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-3 inline-block">
                  + Create shift template
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shiftTemplates.map(shift => {
                const colors = shiftColors[shift.shift_type] || shiftColors.custom;
                
                return (
                  <div 
                    key={shift.id} 
                    className={clsx(
                      'p-4 rounded-lg border transition-all hover:shadow-md',
                      colors.bg,
                      'border-l-4',
                      shift.shift_type === 'morning' && 'border-l-blue-500',
                      shift.shift_type === 'afternoon' && 'border-l-orange-500',
                      shift.shift_type === 'evening' && 'border-l-purple-500',
                      shift.shift_type === 'night' && 'border-l-indigo-500',
                      shift.shift_type === 'full_day' && 'border-l-green-500',
                      shift.shift_type === 'split' && 'border-l-pink-500',
                      (!shift.shift_type || shift.shift_type === 'custom') && 'border-l-gray-400'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className={clsx('font-semibold', colors.text)}>{shift.name_en || shift.name}</h4>
                      <span className={clsx(
                        'text-xs font-medium px-2 py-0.5 rounded-full capitalize',
                        colors.bg, colors.text, 'border', colors.border
                      )}>
                        {(shift.shift_type || 'custom').replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                        </span>
                      </div>
                      
                      {shift.break_start && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Coffee className="w-4 h-4 text-gray-400" />
                          <span>Break: {shift.break_start?.slice(0, 5)} - {shift.break_end?.slice(0, 5)}</span>
                        </div>
                      )}
                      
                      {shift.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{shift.description}</p>
                      )}
                    </div>
                    
                    {isAdmin && (
                      <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                        <button className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-white rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Shift Types</h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(shiftColors).map(([key, colors]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={clsx('w-3 h-3 rounded', colors.bg, 'border', colors.border)} />
                <span className="text-xs text-gray-600 capitalize">{key.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedScheduleCalendar;
