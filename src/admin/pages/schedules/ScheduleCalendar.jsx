import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  Building2,
  X,
  Edit,
  Check,
  AlertCircle,
  List,
  Grid3X3,
  Filter,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  ArrowLeft
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval
} from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const exceptionConfig = {
  vacation: { color: 'bg-blue-500', label: 'Vacation', textColor: 'text-blue-700', bgLight: 'bg-blue-50', border: 'border-blue-300' },
  sick_leave: { color: 'bg-red-500', label: 'Sick Leave', textColor: 'text-red-700', bgLight: 'bg-red-50', border: 'border-red-300' },
  special_hours: { color: 'bg-yellow-500', label: 'Special Hours', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50', border: 'border-yellow-300' },
  day_off: { color: 'bg-gray-500', label: 'Day Off', textColor: 'text-gray-700', bgLight: 'bg-gray-50', border: 'border-gray-300' },
  conference: { color: 'bg-purple-500', label: 'Conference', textColor: 'text-purple-700', bgLight: 'bg-purple-50', border: 'border-purple-300' },
  other: { color: 'bg-green-500', label: 'Other', textColor: 'text-green-700', bgLight: 'bg-green-50', border: 'border-green-300' },
};

const ScheduleCalendar = () => {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity();
  const userRole = identity?.role;
  const userId = identity?.id;
  const isAdmin = ['developer', 'admin'].includes(userRole);
  const { tenantId } = useTenant();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [doctors, setDoctors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'availability'
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'approved' | 'pending'

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Load data
  useEffect(() => {
    if (!identity) return;
    if (!tenantId) return;

    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      // Load doctors
      let doctorsQuery = supabase
        .from('doctors')
        .select('id, name_en, name_ar, photo_url, working_hours, user_id, branch_id, title_en, branches(id, name_en)')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('name_en');

      // If not admin, only fetch their own doctor record
      if (!isAdmin && userId) {
        doctorsQuery = doctorsQuery.eq('user_id', userId);
      }

      const { data: doctorsData } = await doctorsQuery;

      // Load branches
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, name_en, name_ar, working_hours')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('name_en');

      // Load schedule exceptions for the month
      let exceptionsQuery = supabase
        .from('schedule_exceptions')
        .select(`
          *,
          doctors(id, name_en, photo_url),
          approved_by_user:users!schedule_exceptions_approved_by_fkey(full_name)
        `)
        .lte('start_date', format(monthEnd, 'yyyy-MM-dd'))
        .gte('end_date', format(monthStart, 'yyyy-MM-dd'))
        .order('start_date');

      // If not admin, filter to own exceptions
      if (!isAdmin && doctorsData && doctorsData.length > 0) {
        const doctorIds = doctorsData.map(d => d.id);
        exceptionsQuery = exceptionsQuery.in('doctor_id', doctorIds);
      }

      const { data: exceptionsData } = await exceptionsQuery;

      // Load doctor schedules (branch assignments)
      const { data: schedulesData } = await supabase
        .from('doctor_schedules')
        .select(`
          *,
          doctors(id, name_en, photo_url),
          branches(id, name_en)
        `)
        .eq('is_active', true)
        .order('start_time');

      if (isMounted) {
        setDoctors(doctorsData || []);
        setBranches(branchesData || []);
        setExceptions(exceptionsData || []);
        setDoctorSchedules(schedulesData || []);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [currentDate, isAdmin, userId, identity, tenantId]);

  // Filter exceptions
  const filteredExceptions = useMemo(() => {
    return exceptions.filter(exc => {
      if (filterDoctor !== 'all' && exc.doctor_id !== filterDoctor) return false;
      if (filterStatus === 'approved' && !exc.is_approved) return false;
      if (filterStatus === 'pending' && exc.is_approved) return false;
      return true;
    });
  }, [exceptions, filterDoctor, filterStatus]);

  // Filter doctor schedules
  const filteredSchedules = useMemo(() => {
    return doctorSchedules.filter(sch => {
      if (filterDoctor !== 'all' && sch.doctor_id !== filterDoctor) return false;
      if (filterBranch !== 'all' && sch.branch_id !== filterBranch) return false;
      return true;
    });
  }, [doctorSchedules, filterDoctor, filterBranch]);

  // Filter doctors by branch
  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      if (filterBranch !== 'all' && doc.branch_id !== filterBranch) return false;
      return true;
    });
  }, [doctors, filterBranch]);

  // Get doctor schedules for a specific day
  const getSchedulesForDay = useCallback((day) => {
    const dayOfWeek = day.getDay();
    const dateStr = format(day, 'yyyy-MM-dd');
    
    return filteredSchedules.filter(sch => {
      if (sch.schedule_type === 'recurring') {
        return sch.day_of_week === dayOfWeek;
      } else {
        return sch.specific_date === dateStr;
      }
    });
  }, [filteredSchedules]);

  // Get exceptions for a specific day
  const getExceptionsForDay = useCallback((day) => {
    return filteredExceptions.filter(exc => {
      const start = parseISO(exc.start_date);
      const end = parseISO(exc.end_date);
      return isWithinInterval(day, { start, end });
    });
  }, [filteredExceptions]);

  // Get doctor's working hours for a day
  const getDoctorWorkingHours = useCallback((doctor, day) => {
    if (!doctor?.working_hours) return null;
    const dayName = format(day, 'EEEE').toLowerCase();
    return doctor.working_hours[dayName];
  }, []);

  // Check if doctor is available on a day
  const isDoctorAvailable = useCallback((doctor, day) => {
    // Check regular working hours
    const workingHours = getDoctorWorkingHours(doctor, day);
    if (!workingHours || workingHours.off) return false;

    // Check for exceptions (day off, vacation, etc.)
    const dayExceptions = exceptions.filter(exc => {
      if (exc.doctor_id !== doctor.id) return false;
      if (!exc.is_approved) return false; // Only approved exceptions affect availability
      const start = parseISO(exc.start_date);
      const end = parseISO(exc.end_date);
      return isWithinInterval(day, { start, end });
    });

    // If there's a non-special-hours exception, doctor is not available
    const hasBlockingException = dayExceptions.some(
      exc => exc.exception_type !== 'special_hours'
    );

    return !hasBlockingException;
  }, [exceptions, getDoctorWorkingHours]);

  // Get available doctors for a day
  const getAvailableDoctorsForDay = useCallback((day) => {
    return filteredDoctors.filter(doc => isDoctorAvailable(doc, day));
  }, [filteredDoctors, isDoctorAvailable]);

  // Get exceptions for selected day
  const selectedDayExceptions = useMemo(() => {
    return getExceptionsForDay(selectedDate);
  }, [selectedDate, getExceptionsForDay]);

  // Get schedules for selected day
  const selectedDaySchedules = useMemo(() => {
    return getSchedulesForDay(selectedDate);
  }, [selectedDate, getSchedulesForDay]);

  // Get available doctors for selected day
  const selectedDayAvailableDoctors = useMemo(() => {
    return getAvailableDoctorsForDay(selectedDate);
  }, [selectedDate, getAvailableDoctorsForDay]);

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Delete exception
  const handleDeleteException = async (exceptionId) => {
    if (!confirm('Are you sure you want to delete this schedule exception?')) return;

    const { error } = await supabase
      .from('schedule_exceptions')
      .delete()
      .eq('id', exceptionId);

    if (!error) {
      setExceptions(prev => prev.filter(e => e.id !== exceptionId));
    }
  };

  // Approve exception
  const handleApproveException = async (exceptionId) => {
    const { error } = await supabase
      .from('schedule_exceptions')
      .update({
        is_approved: true,
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', exceptionId);

    if (!error) {
      setExceptions(prev => prev.map(e => 
        e.id === exceptionId 
          ? { ...e, is_approved: true, approved_by: userId }
          : e
      ));
    }
  };

  // Delete doctor schedule
  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this doctor schedule assignment?')) return;

    const { error } = await supabase
      .from('doctor_schedules')
      .delete()
      .eq('id', scheduleId);

    if (!error) {
      setDoctorSchedules(prev => prev.filter(s => s.id !== scheduleId));
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
            <p className="text-gray-500 mt-1">
              {filteredDoctors.length} doctors • {filteredSchedules.length} assignments • {filteredExceptions.length} exceptions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'calendar' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Grid3X3 className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('availability')}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'availability' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <List className="w-4 h-4" />
              Availability
            </button>
          </div>
          
          {isAdmin && (
            <Link 
              to="/schedules/assign"
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Assign Doctor
            </Link>
          )}
          
          <Link 
            to="/schedules/exception/create"
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Time Off
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Filter:</span>
        </div>
        
        {isAdmin && (
          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Doctors</option>
            {doctors.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.name_en}</option>
            ))}
          </select>
        )}

        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">All Branches</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>{branch.name_en}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
        </select>

        {(filterDoctor !== 'all' || filterBranch !== 'all' || filterStatus !== 'all') && (
          <button
            onClick={() => {
              setFilterDoctor('all');
              setFilterBranch('all');
              setFilterStatus('all');
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Calendar Grid */}
        <div className={clsx(
          'bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col',
          viewMode === 'calendar' ? 'flex-1' : 'w-80'
        )}>
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {weekDays.map(day => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-auto">
            {calendarDays.map((day, index) => {
              const dayExceptions = getExceptionsForDay(day);
              const daySchedules = getSchedulesForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, selectedDate);
              const isDayToday = isToday(day);

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(day)}
                  className={clsx(
                    'relative p-1 border-r border-b border-gray-100 text-left transition-colors min-h-[90px]',
                    !isCurrentMonth && 'bg-gray-50',
                    isSelected && 'bg-primary-50 ring-2 ring-primary-500 ring-inset',
                    !isSelected && 'hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={clsx(
                      'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium',
                      isDayToday && !isSelected && 'bg-primary-500 text-white',
                      isDayToday && isSelected && 'bg-primary-600 text-white',
                      !isDayToday && isCurrentMonth && 'text-gray-900',
                      !isDayToday && !isCurrentMonth && 'text-gray-400'
                    )}>
                      {format(day, 'd')}
                    </div>
                    
                    {/* Available doctors count badge */}
                    {isCurrentMonth && (
                      <span className={clsx(
                        'text-xs px-1.5 py-0.5 rounded-full',
                        daySchedules.length > 0 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      )}>
                        {daySchedules.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Doctor Schedule Indicators */}
                  {daySchedules.length > 0 && (
                    <div className="space-y-0.5">
                      {daySchedules.slice(0, viewMode === 'calendar' ? 2 : 1).map(sch => (
                        <div
                          key={sch.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate border bg-primary-50 text-primary-700 border-primary-200"
                          title={`${sch.doctors?.name_en} @ ${sch.branches?.name_en}`}
                        >
                          {sch.doctors?.name_en?.split(' ')[0]}
                        </div>
                      ))}
                      {daySchedules.length > (viewMode === 'calendar' ? 2 : 1) && (
                        <p className="text-xs text-gray-500 px-1">
                          +{daySchedules.length - (viewMode === 'calendar' ? 2 : 1)} more
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Exception Indicators */}
                  {dayExceptions.length > 0 && daySchedules.length === 0 && (
                    <div className="space-y-0.5">
                      {dayExceptions.slice(0, viewMode === 'calendar' ? 2 : 1).map(exc => {
                        const config = exceptionConfig[exc.exception_type] || exceptionConfig.other;
                        return (
                          <div
                            key={exc.id}
                            className={clsx(
                              'text-xs px-1.5 py-0.5 rounded truncate border',
                              config.bgLight,
                              config.textColor,
                              config.border,
                              !exc.is_approved && 'opacity-60 border-dashed'
                            )}
                            title={`${exc.doctors?.name_en}: ${config.label}${!exc.is_approved ? ' (Pending)' : ''}`}
                          >
                            {filterDoctor === 'all' ? exc.doctors?.name_en?.split(' ')[0] : config.label}
                          </div>
                        );
                      })}
                      {dayExceptions.length > (viewMode === 'calendar' ? 3 : 2) && (
                        <p className="text-xs text-gray-500 px-1">
                          +{dayExceptions.length - (viewMode === 'calendar' ? 3 : 2)} more
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side Panel */}
        <div className={clsx(
          'bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden',
          viewMode === 'calendar' ? 'w-96' : 'flex-1'
        )}>
          {/* Panel Header */}
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary-600" />
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto p-4 space-y-6">
            {/* Assigned Doctors Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary-600" />
                Assigned Doctors ({selectedDaySchedules.length})
              </h4>
              
              {selectedDaySchedules.length === 0 ? (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                  <p>No doctors assigned on this day</p>
                  {isAdmin && (
                    <Link 
                      to="/schedules/assign"
                      className="text-primary-600 hover:text-primary-700 font-medium mt-2 inline-block"
                    >
                      + Assign a doctor
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDaySchedules.map(schedule => (
                    <div
                      key={schedule.id}
                      className="p-3 bg-primary-50 rounded-lg border border-primary-200"
                    >
                      <div className="flex items-center gap-3">
                        {schedule.doctors?.photo_url ? (
                          <img
                            src={schedule.doctors.photo_url}
                            alt={schedule.doctors.name_en}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-700" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{schedule.doctors?.name_en}</p>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {schedule.branches?.name_en}
                          </p>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {schedule.start_time} - {schedule.end_time}
                            {schedule.schedule_type === 'recurring' && (
                              <span className="text-primary-600 ml-1">
                                (Every {dayNames[schedule.day_of_week]})
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/appointments/create?doctor=${schedule.doctor_id}&date=${format(selectedDate, 'yyyy-MM-dd')}`}
                            className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                          >
                            Book
                          </Link>
                          {isAdmin && (
                            <>
                              <Link
                                to={`/schedules/assign/edit/${schedule.id}`}
                                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Doctors Section */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Available (by working hours) ({selectedDayAvailableDoctors.length})
              </h4>
              
              {selectedDayAvailableDoctors.length === 0 ? (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                  No doctors available on this day
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDayAvailableDoctors.map(doctor => {
                    const hours = getDoctorWorkingHours(doctor, selectedDate);
                    // Check for special hours exception
                    const specialHours = exceptions.find(
                      exc => exc.doctor_id === doctor.id 
                        && exc.exception_type === 'special_hours'
                        && exc.is_approved
                        && isWithinInterval(selectedDate, {
                          start: parseISO(exc.start_date),
                          end: parseISO(exc.end_date)
                        })
                    );

                    return (
                      <div
                        key={doctor.id}
                        className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        {doctor.photo_url ? (
                          <img
                            src={doctor.photo_url}
                            alt={doctor.name_en}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                            <User className="w-5 h-5 text-green-700" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{doctor.name_en}</p>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {specialHours 
                              ? `${specialHours.special_start_time} - ${specialHours.special_end_time} (Special)`
                              : `${hours?.start || '09:00'} - ${hours?.end || '17:00'}`
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/appointments/create?doctor=${doctor.id}&date=${format(selectedDate, 'yyyy-MM-dd')}`}
                            className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                          >
                            Book
                          </Link>
                          {isAdmin && (
                            <Link
                              to={`/doctors/edit/${doctor.id}`}
                              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                              title="Edit Schedule"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unavailable Doctors Section */}
            {filteredDoctors.length > selectedDayAvailableDoctors.length && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Unavailable ({filteredDoctors.length - selectedDayAvailableDoctors.length})
                </h4>
                <div className="space-y-2">
                  {filteredDoctors
                    .filter(doc => !isDoctorAvailable(doc, selectedDate))
                    .map(doctor => {
                      const hours = getDoctorWorkingHours(doctor, selectedDate);
                      const doctorExceptions = selectedDayExceptions.filter(exc => exc.doctor_id === doctor.id);
                      const reason = hours?.off 
                        ? 'Regular day off' 
                        : doctorExceptions[0] 
                          ? exceptionConfig[doctorExceptions[0].exception_type]?.label 
                          : 'Unavailable';

                      return (
                        <div
                          key={doctor.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-75"
                        >
                          {doctor.photo_url ? (
                            <img
                              src={doctor.photo_url}
                              alt={doctor.name_en}
                              className="w-10 h-10 rounded-full object-cover grayscale"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-700 truncate">{doctor.name_en}</p>
                            <p className="text-xs text-red-600">{reason}</p>
                          </div>
                          {isAdmin && (
                            <Link
                              to={`/doctors/edit/${doctor.id}`}
                              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                              title="Edit Schedule"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Exceptions for the day */}
            {selectedDayExceptions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  Schedule Exceptions ({selectedDayExceptions.length})
                </h4>
                <div className="space-y-2">
                  {selectedDayExceptions.map(exc => {
                    const config = exceptionConfig[exc.exception_type] || exceptionConfig.other;
                    
                    return (
                      <div
                        key={exc.id}
                        className={clsx(
                          'p-3 rounded-lg border',
                          config.bgLight,
                          config.border,
                          !exc.is_approved && 'border-dashed'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {exc.doctors?.photo_url ? (
                              <img
                                src={exc.doctors.photo_url}
                                alt={exc.doctors.name_en}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm text-gray-900">{exc.doctors?.name_en}</p>
                              <p className={clsx('text-xs', config.textColor)}>{config.label}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {!exc.is_approved && (
                              <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {exc.exception_type === 'special_hours' && exc.special_start_time && (
                          <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {exc.special_start_time} - {exc.special_end_time}
                          </p>
                        )}
                        
                        {exc.reason && (
                          <p className="text-xs text-gray-500 mt-2 italic">"{exc.reason}"</p>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/50">
                          <span className="text-xs text-gray-500">
                            {format(parseISO(exc.start_date), 'MMM d')}
                            {exc.start_date !== exc.end_date && ` - ${format(parseISO(exc.end_date), 'MMM d')}`}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            {isAdmin && !exc.is_approved && (
                              <button
                                onClick={() => handleApproveException(exc.id)}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <Link
                              to={`/schedules/exception/edit/${exc.id}`}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            {(isAdmin || !exc.is_approved) && (
                              <button
                                onClick={() => handleDeleteException(exc.id)}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Legend</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(exceptionConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className={clsx('w-3 h-3 rounded', config.color)} />
                  <span className="text-xs text-gray-600">{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;
