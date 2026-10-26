import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Clock, User, Plus, Edit, Trash2, 
  RefreshCw, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { 
  format, startOfWeek, endOfWeek, addWeeks, subWeeks, 
  eachDayOfInterval, parseISO, isSameDay 
} from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const shiftColors = {
  morning: 'bg-blue-100 text-blue-700 border-blue-200',
  afternoon: 'bg-orange-100 text-orange-700 border-orange-200',
  evening: 'bg-purple-100 text-purple-700 border-purple-200',
  full_day: 'bg-green-100 text-green-700 border-green-200',
  off: 'bg-gray-100 text-gray-500 border-gray-200',
};

const StaffScheduleList = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();

  const [schedules, setSchedules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState('all');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const loadStaff = useCallback(async () => {
    if (!tenantId) return;
    // Load both doctors and staff
    const [doctorsRes, staffRes] = await Promise.all([
      supabase.from('doctors').select('id, name_en, photo_url').eq('is_active', true).eq('tenant_id', tenantId),
      supabase.from('clinic_staff').select('id, first_name, last_name, role').eq('is_active', true),
    ]);

    const doctors = (doctorsRes.data || []).map(d => ({
      id: d.id,
      name: d.name_en,
      photo_url: d.photo_url,
      type: 'doctor',
    }));

    const staffMembers = (staffRes.data || []).map(s => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      role: s.role,
      type: 'staff',
    }));

    setStaff([...doctors, ...staffMembers]);
  }, [tenantId]);

  const loadShiftTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('is_active', true)
      .order('start_time');
    setShiftTemplates(data || []);
  }, []);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('staff_schedules')
        .select(`
          *,
          shift_templates:shift_id (id, name, shift_type, start_time, end_time)
        `)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'));

      if (selectedStaff !== 'all') {
        query = query.or(`doctor_id.eq.${selectedStaff},staff_id.eq.${selectedStaff}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd, selectedStaff]);

  useEffect(() => {
    loadStaff();
    loadShiftTemplates();
  }, [loadStaff, loadShiftTemplates]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const getScheduleForDay = (staffId, date, staffType) => {
    return schedules.find(s => {
      const matchesStaff = staffType === 'doctor' 
        ? s.doctor_id === staffId 
        : s.staff_id === staffId;
      return matchesStaff && isSameDay(parseISO(s.date), date);
    });
  };

  const handleQuickAssign = async (staffId, staffType, date, shiftId) => {
    try {
      const existing = getScheduleForDay(staffId, date, staffType);
      
      const payload = {
        doctor_id: staffType === 'doctor' ? staffId : null,
        staff_id: staffType === 'staff' ? staffId : null,
        date: format(date, 'yyyy-MM-dd'),
        shift_id: shiftId,
        status: 'scheduled',
      };

      if (existing) {
        await supabase
          .from('staff_schedules')
          .update({ shift_id: shiftId })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('staff_schedules')
          .insert(payload);
      }

      loadSchedules();
    } catch (error) {
      console.error('Error assigning shift:', error);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Staff Schedule</h1>
            <p className="text-gray-500 mt-1">Manage shifts and working hours</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSchedules}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/staff-schedule/attendance"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Attendance
          </Link>
          <Link
            to="/staff-schedule/leave"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Leave Requests
          </Link>
        </div>
      </div>

      {/* Week Navigation & Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="text-center">
              <h2 className="font-semibold text-gray-900">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </h2>
            </div>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Staff</option>
              <optgroup label="Doctors">
                {staff.filter(s => s.type === 'doctor').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="Staff">
                {staff.filter(s => s.type === 'staff').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Shift Legend */}
      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Shifts:</span>
          {shiftTemplates.map(shift => (
            <span 
              key={shift.id}
              className={`px-3 py-1 text-xs font-medium rounded-full ${shiftColors[shift.shift_type] || shiftColors.full_day}`}
            >
              {shift.name} ({shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)})
            </span>
          ))}
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${shiftColors.off}`}>
            Off
          </span>
        </div>
      </div>

      {/* Schedule Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-48">
                    Staff Member
                  </th>
                  {weekDays.map(day => (
                    <th 
                      key={day.toISOString()} 
                      className={`px-2 py-3 text-center text-sm font-medium ${
                        isSameDay(day, new Date()) ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      <div>{format(day, 'EEE')}</div>
                      <div className="text-xs font-normal">{format(day, 'MMM d')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {staff.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {member.photo_url ? (
                          <img 
                            src={member.photo_url} 
                            alt="" 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {member.type === 'doctor' ? 'Doctor' : member.role}
                          </p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map(day => {
                      const schedule = getScheduleForDay(member.id, day, member.type);
                      const shift = schedule?.shift_templates;

                      return (
                        <td 
                          key={day.toISOString()} 
                          className={`px-2 py-3 text-center ${
                            isSameDay(day, new Date()) ? 'bg-primary-50/50' : ''
                          }`}
                        >
                          {shift ? (
                            <div className="relative group">
                              <span 
                                className={`inline-block px-2 py-1 text-xs font-medium rounded ${shiftColors[shift.shift_type] || shiftColors.full_day}`}
                              >
                                {shift.name}
                              </span>
                              {/* Hover dropdown to change shift */}
                              <div className="absolute hidden group-hover:block z-10 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border rounded-lg shadow-lg p-2 min-w-[120px]">
                                {shiftTemplates.map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => handleQuickAssign(member.id, member.type, day, s.id)}
                                    className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${
                                      s.id === shift.id ? 'font-medium' : ''
                                    }`}
                                  >
                                    {s.name}
                                  </button>
                                ))}
                                <button
                                  onClick={() => handleQuickAssign(member.id, member.type, day, null)}
                                  className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 text-red-600"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="relative group">
                              <span className="inline-block px-2 py-1 text-xs text-gray-400">-</span>
                              {/* Hover dropdown to assign shift */}
                              <div className="absolute hidden group-hover:block z-10 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border rounded-lg shadow-lg p-2 min-w-[120px]">
                                {shiftTemplates.map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => handleQuickAssign(member.id, member.type, day, s.id)}
                                    className="w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100"
                                  >
                                    {s.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffScheduleList;
