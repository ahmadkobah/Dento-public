import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  Building2,
  Phone,
  X,
  Edit,
  Check,
  AlertCircle,
  List,
  Grid3X3,
  Filter,
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
  subMonths
} from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../../contexts/UnifiedTenantContext';
import { useToast } from '../../../hooks/useToast';

const statusConfig = {
  booked: { color: 'bg-yellow-500', label: 'Booked', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  pending: { color: 'bg-yellow-500', label: 'Pending', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  confirmed: { color: 'bg-blue-500', label: 'Confirmed', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  arrived: { color: 'bg-teal-500', label: 'Arrived', textColor: 'text-teal-700', bgLight: 'bg-teal-50' },
  in_progress: { color: 'bg-purple-500', label: 'In Progress', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  completed: { color: 'bg-green-500', label: 'Completed', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  cancelled: { color: 'bg-gray-400', label: 'Cancelled', textColor: 'text-gray-500', bgLight: 'bg-gray-50' },
  no_show: { color: 'bg-red-500', label: 'No Show', textColor: 'text-red-700', bgLight: 'bg-red-50' },
};

const AppointmentCalendar = () => {
  const toast = useToast();
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [chairs, setChairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // State for assignment modal when marking as arrived
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [appointmentToAssign, setAppointmentToAssign] = useState(null);
  const [assignmentData, setAssignmentData] = useState({
    doctor_id: '',
    branch_id: '',
    chair_id: ''
  });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Load data
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    
    // Load appointments for the month using datetime_start
    const { data: appointmentsData, error: _error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (id, name, phone),
        doctors (id, name_en, name_ar, specialty_en),
        branches (id, name_en, name_ar)
      `)
      .eq('tenant_id', tenantId)
      .gte('datetime_start', monthStart.toISOString())
      .lte('datetime_start', monthEnd.toISOString())
      .order('datetime_start', { ascending: true });

    // Load doctors
    const { data: doctorsData } = await supabase
      .from('doctors')
      .select('id, name_en, name_ar')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');

    // Load branches
    const { data: branchesData } = await supabase
      .from('branches')
      .select('id, name_en, name_ar')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');

    // Load chairs
    const { data: chairsData } = await supabase
      .from('chairs')
      .select('id, branch_id, name_en, chair_number')
      .eq('is_active', true)
      .order('chair_number');

    setAppointments(appointmentsData || []);
    setDoctors(doctorsData || []);
    setBranches(branchesData || []);
    setChairs(chairsData || []);
    setLoading(false);
  }, [currentDate, tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      if (filterDoctor !== 'all' && apt.doctor_id !== filterDoctor) return false;
      if (filterBranch !== 'all' && apt.branch_id !== filterBranch) return false;
      if (filterStatus !== 'all' && apt.status !== filterStatus) return false;
      return true;
    });
  }, [appointments, filterDoctor, filterBranch, filterStatus]);

  // Get appointments for a specific day
  const getAppointmentsForDay = useCallback((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return filteredAppointments.filter(apt => {
      if (!apt.datetime_start) return false;
      const aptDate = format(new Date(apt.datetime_start), 'yyyy-MM-dd');
      return aptDate === dayStr;
    });
  }, [filteredAppointments]);

  // Get appointments for selected day
  const selectedDayAppointments = useMemo(() => {
    return getAppointmentsForDay(selectedDate);
  }, [selectedDate, getAppointmentsForDay]);

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Get chairs for a specific branch
  const getChairsForBranch = (branchId) => {
    return chairs.filter(chair => chair.branch_id === branchId);
  };

  // Update appointment status
  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId);

    if (!error) {
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      );
      setSelectedAppointment(prev => 
        prev?.id === appointmentId ? { ...prev, status: newStatus } : prev
      );
    }
  };

  // Handle marking appointment as arrived - check for missing assignments first
  const handleMarkArrived = (appointment) => {
    // Check if doctor, branch, or chair is missing
    if (!appointment.doctor_id || !appointment.branch_id || !appointment.chair_id) {
      setAppointmentToAssign(appointment);
      setAssignmentData({
        doctor_id: appointment.doctor_id || '',
        branch_id: appointment.branch_id || '',
        chair_id: appointment.chair_id || ''
      });
      setShowAssignmentModal(true);
      return;
    }
    // All assignments present, just update status
    updateAppointmentStatus(appointment.id, 'arrived');
  };

  // Handle assignment modal submission
  const handleAssignmentSubmit = async () => {
    if (!appointmentToAssign) return;
    
    try {
      // Update appointment with assignments
      const updateData = {
        status: 'arrived',
        updated_at: new Date().toISOString()
      };
      
      if (assignmentData.doctor_id) updateData.doctor_id = assignmentData.doctor_id;
      if (assignmentData.branch_id) updateData.branch_id = assignmentData.branch_id;
      if (assignmentData.chair_id) updateData.chair_id = assignmentData.chair_id;
      
      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentToAssign.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentToAssign.id ? { ...apt, ...updateData } : apt
        )
      );
      setSelectedAppointment(prev => 
        prev?.id === appointmentToAssign.id ? { ...prev, ...updateData } : prev
      );
      
      setShowAssignmentModal(false);
      setAppointmentToAssign(null);
      setAssignmentData({ doctor_id: '', branch_id: '', chair_id: '' });
    } catch (err) {
      console.error('Error updating appointment with assignments:', err);
      toast.error('Error updating appointment: ' + err.message);
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-gray-500 mt-1">
              {filteredAppointments.length} appointments this month
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
              onClick={() => setViewMode('list')}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>
          
          <Link 
            to="/appointments/create"
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Filter:</span>
        </div>
        
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
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
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
          <div className="flex-1 grid grid-cols-7 auto-rows-fr">
            {calendarDays.map((day, index) => {
              const dayAppointments = getAppointmentsForDay(day);
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
                  
                  {/* Appointment Indicators */}
                  {dayAppointments.length > 0 && (
                    <div className="space-y-0.5">
                      {dayAppointments.slice(0, viewMode === 'calendar' ? 3 : 2).map(apt => {
                        const startTime = apt.datetime_start ? format(new Date(apt.datetime_start), 'HH:mm') : '';
                        return (
                        <div
                          key={apt.id}
                          className={clsx(
                            'text-xs px-1.5 py-0.5 rounded truncate',
                            statusConfig[apt.status]?.bgLight || 'bg-gray-100',
                            statusConfig[apt.status]?.textColor || 'text-gray-700'
                          )}
                          title={`${startTime} - ${apt.patients?.name || 'Patient'}`}
                        >
                          {viewMode === 'calendar' ? (
                            <>
                              <span className="font-medium">{startTime}</span>
                              {' '}{apt.patients?.name || 'Patient'}
                            </>
                          ) : (
                            startTime
                          )}
                        </div>
                      )})}
                      {dayAppointments.length > (viewMode === 'calendar' ? 3 : 2) && (
                        <div className="text-xs text-gray-500 px-1.5">
                          +{dayAppointments.length - (viewMode === 'calendar' ? 3 : 2)} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel - Day Details */}
        <div className={clsx(
          'bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col',
          viewMode === 'calendar' ? 'w-96' : 'flex-1'
        )}>
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
                {selectedDayAppointments.length} appointments
              </span>
            </div>
          </div>

          {/* Appointments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedDayAppointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No appointments scheduled</p>
                <Link
                  to="/appointments/create"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block"
                >
                  + Add appointment
                </Link>
              </div>
            ) : (
              selectedDayAppointments.map(apt => (
                <div
                  key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className={clsx(
                    'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                    statusConfig[apt.status]?.bgLight || 'bg-gray-50',
                    'border-l-4',
                    apt.status === 'pending' && 'border-l-yellow-500',
                    apt.status === 'confirmed' && 'border-l-blue-500',
                    apt.status === 'in_progress' && 'border-l-purple-500',
                    apt.status === 'completed' && 'border-l-green-500',
                    apt.status === 'cancelled' && 'border-l-gray-400',
                    apt.status === 'no_show' && 'border-l-red-500'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900">
                        {apt.datetime_start ? format(new Date(apt.datetime_start), 'HH:mm') : ''} - {apt.datetime_end ? format(new Date(apt.datetime_end), 'HH:mm') : ''}
                      </span>
                    </div>
                    <span className={clsx(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      statusConfig[apt.status]?.color,
                      'text-white'
                    )}>
                      {statusConfig[apt.status]?.label}
                    </span>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 font-medium">
                        {apt.patients?.name || 'Unknown Patient'}
                      </span>
                      {apt.patients?.phone && (
                        <span className="text-xs text-gray-400">({apt.patients.phone})</span>
                      )}
                    </div>
                    
                    {apt.doctors && (
                      <div className="flex items-center gap-2 text-sm">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Dr. {apt.doctors.name_en}</span>
                      </div>
                    )}
                    
                    {apt.branches && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{apt.branches.name_en}</span>
                      </div>
                    )}
                    
                    {apt.service_type && (
                      <div className="text-xs text-gray-500 mt-1 bg-white/50 px-2 py-1 rounded">
                        {apt.service_type}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Add for Selected Day */}
          <div className="p-4 border-t border-gray-100">
            <Link
              to={`/appointments/create?date=${format(selectedDate, 'yyyy-MM-dd')}`}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add appointment for this day
            </Link>
          </div>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className={clsx(
                  'px-3 py-1.5 rounded-full text-sm font-medium',
                  statusConfig[selectedAppointment.status]?.color,
                  'text-white'
                )}>
                  {statusConfig[selectedAppointment.status]?.label}
                </span>
                <span className="text-sm text-gray-500">
                  ID: {selectedAppointment.id?.slice(0, 8)}...
                </span>
              </div>

              {/* Date & Time */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedAppointment.datetime_start ? format(new Date(selectedAppointment.datetime_start), 'EEEE, MMMM d, yyyy') : 'No date'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedAppointment.datetime_start ? format(new Date(selectedAppointment.datetime_start), 'HH:mm') : ''} - {selectedAppointment.datetime_end ? format(new Date(selectedAppointment.datetime_end), 'HH:mm') : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Patient Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase">Patient</h4>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedAppointment.patients?.name?.[0] || 'P'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {selectedAppointment.patients?.name || 'Unknown Patient'}
                    </p>
                    <p className="text-sm text-gray-600">{selectedAppointment.patients?.phone}</p>
                  </div>
                  {selectedAppointment.patients?.phone && (
                    <a 
                      href={`tel:${selectedAppointment.patients.phone}`}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Doctor & Branch */}
              <div className="grid grid-cols-2 gap-3">
                {selectedAppointment.doctors && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Stethoscope className="w-4 h-4" />
                      Doctor
                    </div>
                    <p className="font-medium text-gray-900">Dr. {selectedAppointment.doctors.name_en}</p>
                    {selectedAppointment.doctors.specialty_en && (
                      <p className="text-xs text-gray-500">{selectedAppointment.doctors.specialty_en}</p>
                    )}
                  </div>
                )}
                {selectedAppointment.branches && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Building2 className="w-4 h-4" />
                      Branch
                    </div>
                    <p className="font-medium text-gray-900">{selectedAppointment.branches.name_en}</p>
                  </div>
                )}
              </div>

              {/* Service & Notes */}
              {selectedAppointment.service_type && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Service</p>
                  <p className="font-medium text-gray-900">{selectedAppointment.service_type}</p>
                </div>
              )}

              {selectedAppointment.notes && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-700 font-medium mb-1">Notes</p>
                  <p className="text-gray-700">{selectedAppointment.notes}</p>
                </div>
              )}

              {/* Status Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase">Update Status</h4>
                <div className="grid grid-cols-3 gap-2">
                  {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'booked') && (
                    <button
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'confirmed')}
                      className="flex items-center justify-center gap-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      <Check className="w-4 h-4" />
                      Confirm
                    </button>
                  )}
                  {(selectedAppointment.status === 'pending' || selectedAppointment.status === 'booked' || selectedAppointment.status === 'confirmed') && (
                    <>
                      <button
                        onClick={() => handleMarkArrived(selectedAppointment)}
                        className="flex items-center justify-center gap-1 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm"
                      >
                        Arrived
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                        className="flex items-center justify-center gap-1 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {selectedAppointment.status === 'arrived' && (
                    <button
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'in_progress')}
                      className="flex items-center justify-center gap-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm col-span-2"
                    >
                      Start
                    </button>
                  )}
                  {selectedAppointment.status === 'in_progress' && (
                    <button
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'completed')}
                      className="flex items-center justify-center gap-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm col-span-2"
                    >
                      <Check className="w-4 h-4" />
                      Complete
                    </button>
                  )}
                  {['pending', 'booked', 'confirmed'].includes(selectedAppointment.status) && (
                    <button
                      onClick={() => updateAppointmentStatus(selectedAppointment.id, 'no_show')}
                      className="flex items-center justify-center gap-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                    >
                      <AlertCircle className="w-4 h-4" />
                      No Show
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50">
              <Link
                to={`/patients/${selectedAppointment.patient_id}/view`}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View Patient Profile
              </Link>
              <div className="flex gap-2">
                <Link
                  to={`/appointments/edit/${selectedAppointment.id}`}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal for Arrived Appointments */}
      {showAssignmentModal && appointmentToAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Assign Before Marking Arrived</h3>
              <button 
                onClick={() => {
                  setShowAssignmentModal(false);
                  setAppointmentToAssign(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="font-medium text-gray-900">
                  {appointmentToAssign.patients?.name || 'Unknown Patient'}
                </p>
                <p className="text-sm text-gray-500">
                  {appointmentToAssign.datetime_start && format(new Date(appointmentToAssign.datetime_start), 'h:mm a')}
                  {appointmentToAssign.service_type && ` - ${appointmentToAssign.service_type}`}
                </p>
              </div>
              
              {/* Branch Selection */}
              {!appointmentToAssign.branch_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignmentData.branch_id}
                    onChange={(e) => {
                      const branchId = e.target.value;
                      setAssignmentData(prev => ({ ...prev, branch_id: branchId, chair_id: '' }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name_en}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Doctor Selection */}
              {!appointmentToAssign.doctor_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doctor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignmentData.doctor_id}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, doctor_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>{doctor.name_en}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Chair Selection */}
              {!appointmentToAssign.chair_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chair <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assignmentData.chair_id}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, chair_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    disabled={!appointmentToAssign.branch_id && !assignmentData.branch_id}
                  >
                    <option value="">Select Chair</option>
                    {getChairsForBranch(appointmentToAssign.branch_id || assignmentData.branch_id).map(chair => (
                      <option key={chair.id} value={chair.id}>
                        {chair.name_en || `Chair ${chair.chair_number}`}
                      </option>
                    ))}
                  </select>
                  {!appointmentToAssign.branch_id && !assignmentData.branch_id && (
                    <p className="text-xs text-gray-500 mt-1">Select a branch first to see available chairs</p>
                  )}
                </div>
              )}

              {/* Show what's already assigned */}
              <div className="text-sm text-gray-600 space-y-1">
                {appointmentToAssign.branch_id && appointmentToAssign.branches && (
                  <p>✓ Branch: {appointmentToAssign.branches.name_en}</p>
                )}
                {appointmentToAssign.doctor_id && appointmentToAssign.doctors && (
                  <p>✓ Doctor: Dr. {appointmentToAssign.doctors.name_en}</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignmentModal(false);
                  setAppointmentToAssign(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateAppointmentStatus(appointmentToAssign.id, 'arrived');
                  setShowAssignmentModal(false);
                  setAppointmentToAssign(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
              >
                Skip & Mark Arrived
              </button>
              <button
                onClick={handleAssignmentSubmit}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Assign & Mark Arrived
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;
 