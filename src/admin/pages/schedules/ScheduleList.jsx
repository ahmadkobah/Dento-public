import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight,
  AlertCircle,
  User,
  Filter,
  Search,
  CalendarDays,
  ArrowLeft
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../../hooks/useToast';

const ScheduleList = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity();
  const userRole = identity?.role;
  const userId = identity?.id;

  // Check if user is admin/developer or doctor
  const isAdmin = ['developer', 'admin'].includes(userRole);
  const { tenantId } = useTenant();
  
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch doctors (all for admin, own for doctor)
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!identity) return;
      if (!tenantId) return;
      
      let query = supabase
        .from('doctors')
        .select('id, name_en, name_ar, photo_url, working_hours, user_id, branch_id, branches(name_en)')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('name_en');

      // If doctor, only fetch their own record
      if (!isAdmin) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching doctors:', error);
      } else {
        setDoctors(data || []);
        // Auto-select first doctor or the doctor themselves
        if (data && data.length > 0) {
          setSelectedDoctor(data[0]);
        }
      }
      setLoading(false);
    };

    fetchDoctors();
  }, [identity, isAdmin, userId, tenantId]);

  // Fetch schedule exceptions for selected doctor
  useEffect(() => {
    const fetchExceptions = async () => {
      if (!selectedDoctor) return;

      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('schedule_exceptions')
        .select('*, approved_by_user:users!schedule_exceptions_approved_by_fkey(full_name)')
        .eq('doctor_id', selectedDoctor.id)
        .gte('end_date', startDate)
        .lte('start_date', endDate)
        .order('start_date');

      if (error) {
        console.error('Error fetching exceptions:', error);
      } else {
        setExceptions(data || []);
      }
    };

    fetchExceptions();
  }, [selectedDoctor, currentMonth]);

  const handleDeleteException = async (exceptionId) => {
    if (!confirm('Are you sure you want to delete this schedule exception?')) return;

    const { error } = await supabase
      .from('schedule_exceptions')
      .delete()
      .eq('id', exceptionId);

    if (error) {
      toast.error('Failed to delete exception');
    } else {
      setExceptions(prev => prev.filter(e => e.id !== exceptionId));
    }
  };

  const handleApproveException = async (exceptionId) => {
    const { error } = await supabase
      .from('schedule_exceptions')
      .update({
        is_approved: true,
        approved_by: userId
      })
      .eq('id', exceptionId);

    if (error) {
      toast.error('Failed to approve exception');
    } else {
      setExceptions(prev => prev.map(e => 
        e.id === exceptionId 
          ? { ...e, is_approved: true, approved_by: userId }
          : e
      ));
    }
  };

  // Calendar helpers
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getExceptionsForDay = (day) => {
    return exceptions.filter(exc => {
      const start = parseISO(exc.start_date);
      const end = parseISO(exc.end_date);
      return day >= start && day <= end;
    });
  };

  const getExceptionColor = (type) => {
    const colors = {
      vacation: 'bg-blue-100 text-blue-800 border-blue-300',
      sick_leave: 'bg-red-100 text-red-800 border-red-300',
      special_hours: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      day_off: 'bg-gray-100 text-gray-800 border-gray-300',
      conference: 'bg-purple-100 text-purple-800 border-purple-300',
      other: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[type] || colors.other;
  };

  const exceptionLabels = {
    vacation: 'Vacation',
    sick_leave: 'Sick Leave',
    special_hours: 'Special Hours',
    day_off: 'Day Off',
    conference: 'Conference',
    other: 'Other'
  };

  const getDayWorkingHours = (day) => {
    if (!selectedDoctor?.working_hours) return null;
    const dayName = format(day, 'EEEE').toLowerCase();
    return selectedDoctor.working_hours[dayName];
  };

  const filteredDoctors = doctors.filter(doc =>
    doc.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.name_ar?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No Doctors Found</h3>
        <p className="text-gray-500 mt-2">
          {isAdmin 
            ? 'Add doctors first to manage their schedules.'
            : 'Your doctor profile is not set up yet. Contact an administrator.'}
        </p>
        {isAdmin && (
          <Link
            to="/doctors/create"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Add Doctor
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
            <p className="text-gray-600 mt-1">
              {isAdmin ? 'Manage doctor schedules and time-off requests' : 'View and manage your schedule'}
            </p>
          </div>
        </div>
        <Link
          to="/schedules/exception/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Request Time Off
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Doctor Selector (Admin only) */}
        {isAdmin && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Select Doctor
              </h3>
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search doctors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredDoctors.map(doctor => (
                  <button
                    key={doctor.id}
                    onClick={() => setSelectedDoctor(doctor)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedDoctor?.id === doctor.id
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    {doctor.photo_url ? (
                      <img
                        src={doctor.photo_url}
                        alt={doctor.name_en}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doctor.name_en}</p>
                      <p className="text-xs text-gray-500 truncate">{doctor.branches?.name_en || 'No branch'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calendar and Schedule */}
        <div className={isAdmin ? 'lg:col-span-3' : 'lg:col-span-4'}>
          {selectedDoctor && (
            <div className="space-y-6">
              {/* Working Hours Card */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary-600" />
                    Regular Working Hours - {selectedDoctor.name_en}
                  </h3>
                  <Link
                    to={`/doctors/edit/${selectedDoctor.id}`}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Schedule
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => {
                    const hours = selectedDoctor.working_hours?.[day];
                    const isOff = hours?.off;
                    
                    return (
                      <div
                        key={day}
                        className={`p-3 rounded-lg text-center ${
                          isOff ? 'bg-gray-100 text-gray-500' : 'bg-primary-50'
                        }`}
                      >
                        <p className="font-medium text-sm capitalize">{day.slice(0, 3)}</p>
                        {isOff ? (
                          <p className="text-xs mt-1">Off</p>
                        ) : (
                          <p className="text-xs mt-1">
                            {hours?.start || '09:00'} - {hours?.end || '17:00'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calendar */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary-600" />
                    Schedule Calendar
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-medium min-w-[140px] text-center">
                      {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-24 p-2 bg-gray-50 rounded-lg" />
                  ))}

                  {/* Actual days */}
                  {daysInMonth.map(day => {
                    const dayExceptions = getExceptionsForDay(day);
                    const workingHours = getDayWorkingHours(day);
                    const isDayOff = workingHours?.off;

                    return (
                      <div
                        key={day.toISOString()}
                        className={`h-24 p-2 rounded-lg border ${
                          isToday(day)
                            ? 'border-primary-500 bg-primary-50'
                            : isDayOff
                            ? 'bg-gray-100 border-gray-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <p className={`text-sm font-medium ${
                          isToday(day) ? 'text-primary-600' : 'text-gray-900'
                        }`}>
                          {format(day, 'd')}
                        </p>
                        
                        <div className="mt-1 space-y-1">
                          {dayExceptions.slice(0, 2).map(exc => (
                            <div
                              key={exc.id}
                              className={`text-xs px-1 py-0.5 rounded truncate border ${getExceptionColor(exc.exception_type)} ${
                                !exc.is_approved ? 'opacity-60' : ''
                              }`}
                              title={`${exceptionLabels[exc.exception_type]}${!exc.is_approved ? ' (Pending)' : ''}`}
                            >
                              {exceptionLabels[exc.exception_type]}
                            </div>
                          ))}
                          {dayExceptions.length > 2 && (
                            <p className="text-xs text-gray-500">+{dayExceptions.length - 2} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Exceptions List */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary-600" />
                  Schedule Exceptions - {format(currentMonth, 'MMMM yyyy')}
                </h3>

                {exceptions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No schedule exceptions for this month.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {exceptions.map(exc => (
                      <div
                        key={exc.id}
                        className={`p-4 rounded-lg border ${getExceptionColor(exc.exception_type)} ${
                          !exc.is_approved ? 'border-dashed' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {exceptionLabels[exc.exception_type]}
                              </span>
                              {!exc.is_approved && (
                                <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                                  Pending Approval
                                </span>
                              )}
                              {exc.is_approved && (
                                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">
                                  Approved
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-1">
                              {format(parseISO(exc.start_date), 'MMM d, yyyy')}
                              {exc.start_date !== exc.end_date && (
                                <> - {format(parseISO(exc.end_date), 'MMM d, yyyy')}</>
                              )}
                            </p>
                            {exc.exception_type === 'special_hours' && exc.special_start_time && (
                              <p className="text-sm mt-1">
                                Hours: {exc.special_start_time} - {exc.special_end_time}
                              </p>
                            )}
                            {exc.reason && (
                              <p className="text-sm mt-1 italic">"{exc.reason}"</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Approve button for admins on pending exceptions */}
                            {isAdmin && !exc.is_approved && (
                              <button
                                onClick={() => handleApproveException(exc.id)}
                                className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Edit link */}
                            <Link
                              to={`/schedules/exception/edit/${exc.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            
                            {/* Delete button */}
                            {(isAdmin || !exc.is_approved) && (
                              <button
                                onClick={() => handleDeleteException(exc.id)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h4 className="font-medium text-gray-900 mb-3">Legend</h4>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(exceptionLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded ${getExceptionColor(key)}`} />
                      <span className="text-sm text-gray-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduleList;
