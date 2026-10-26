import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Search, 
  Calendar,
  User,
  Filter,
  Loader2,
  LogIn,
  LogOut,
  Coffee,
  AlertCircle,
  CheckCircle,
  Timer,
  Users,
  Building2,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import useAuth from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useTenant } from '../../contexts/TenantContext';

const AttendanceList = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const isManager = ['developer', 'admin'].includes(user?.role);

  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [myAttendance, setMyAttendance] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    branchId: '',
    userId: '',
    status: ''
  });

  useEffect(() => {
    if (tenantId) {
      loadData();
      loadMyAttendanceToday();
    }
  }, [filters, tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load branches
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name_en')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)
        .order('name_en');
      setBranches(branchData || []);

      // Load users (for managers)
      if (isManager) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, role')
          .eq('is_active', true)
          .eq('tenant_id', tenantId)
          .order('full_name');
        setUsers(userData || []);
      }

      // Build attendance query
      let query = supabase
        .from('time_attendance')
        .select(`
          *,
          users(id, full_name, email, role),
          branches(id, name_en)
        `)
        .eq('attendance_date', filters.date)
        .eq('tenant_id', tenantId)
        .order('clock_in', { ascending: false, nullsFirst: true });

      // Filter by user role
      if (!isManager) {
        query = query.eq('user_id', user.id);
      } else {
        if (filters.userId) {
          query = query.eq('user_id', filters.userId);
        }
        if (filters.branchId) {
          query = query.eq('branch_id', filters.branchId);
        }
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply search filter
      let filteredData = data || [];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(a =>
          a.users?.full_name?.toLowerCase().includes(searchLower)
        );
      }

      setAttendance(filteredData);

      // Calculate stats
      setStats({
        present: filteredData.filter(a => a.status === 'present').length,
        late: filteredData.filter(a => a.status === 'late').length,
        absent: filteredData.filter(a => a.status === 'absent').length,
        onLeave: filteredData.filter(a => a.status === 'on_leave').length
      });
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyAttendanceToday = async () => {
    try {
      const { data, error } = await supabase
        .from('time_attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('attendance_date', format(new Date(), 'yyyy-MM-dd'))
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      setMyAttendance(data);
    } catch (error) {
      console.error('Error loading my attendance:', error);
    }
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      // Get user's branch (simplified - should come from user profile)
      const { data: userData } = await supabase
        .from('users')
        .select('branch_id')
        .eq('id', user.id)
        .single();

      const branchId = userData?.branch_id || branches[0]?.id;
      if (!branchId) {
        toast.error('No branch assigned. Please contact admin.');
        return;
      }

      const now = new Date();
      const { error } = await supabase
        .from('time_attendance')
        .insert([{
          user_id: user.id,
          branch_id: branchId,
          attendance_date: format(now, 'yyyy-MM-dd'),
          clock_in: now.toISOString(),
          status: 'present',
          tenant_id: tenantId
        }]);

      if (error) throw error;
      loadMyAttendanceToday();
      loadData();
    } catch (error) {
      toast.error('Error clocking in: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!myAttendance) return;
    
    setActionLoading(true);
    try {
      const now = new Date();
      const clockIn = parseISO(myAttendance.clock_in);
      const actualHours = differenceInMinutes(now, clockIn) / 60;

      const { error } = await supabase
        .from('time_attendance')
        .update({
          clock_out: now.toISOString(),
          actual_hours: actualHours.toFixed(2)
        })
        .eq('id', myAttendance.id);

      if (error) throw error;
      loadMyAttendanceToday();
      loadData();
    } catch (error) {
      toast.error('Error clocking out: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreakStart = async () => {
    if (!myAttendance || myAttendance.break_start) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('time_attendance')
        .update({ break_start: new Date().toISOString() })
        .eq('id', myAttendance.id);

      if (error) throw error;
      loadMyAttendanceToday();
    } catch (error) {
      toast.error('Error starting break: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreakEnd = async () => {
    if (!myAttendance || !myAttendance.break_start || myAttendance.break_end) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('time_attendance')
        .update({ break_end: new Date().toISOString() })
        .eq('id', myAttendance.id);

      if (error) throw error;
      loadMyAttendanceToday();
    } catch (error) {
      toast.error('Error ending break: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    return format(parseISO(dateStr), 'hh:mm a');
  };

  const formatHours = (hours) => {
    if (!hours) return '-';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: 'bg-green-100 text-green-800',
      late: 'bg-yellow-100 text-yellow-800',
      absent: 'bg-red-100 text-red-800',
      half_day: 'bg-orange-100 text-orange-800',
      on_leave: 'bg-blue-100 text-blue-800'
    };
    const labels = {
      present: 'Present',
      late: 'Late',
      absent: 'Absent',
      half_day: 'Half Day',
      on_leave: 'On Leave'
    };
    return (
      <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', styles[status] || styles.present)}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Time & Attendance</h1>
            <p className="text-gray-500 mt-1">Track staff clock in/out and attendance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadData(); loadMyAttendanceToday(); }}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4 text-gray-500', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* My Clock In/Out Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-600" />
          My Attendance Today
        </h2>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Display */}
          <div className="flex-1 min-w-[200px]">
            {myAttendance ? (
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Clock In</p>
                    <p className="font-medium text-green-600">{formatTime(myAttendance.clock_in)}</p>
                  </div>
                  {myAttendance.clock_out && (
                    <div>
                      <p className="text-sm text-gray-500">Clock Out</p>
                      <p className="font-medium text-red-600">{formatTime(myAttendance.clock_out)}</p>
                    </div>
                  )}
                  {myAttendance.actual_hours && (
                    <div>
                      <p className="text-sm text-gray-500">Total Hours</p>
                      <p className="font-medium text-blue-600">{formatHours(myAttendance.actual_hours)}</p>
                    </div>
                  )}
                </div>
                {myAttendance.break_start && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">Break: {formatTime(myAttendance.break_start)}</span>
                    {myAttendance.break_end && (
                      <span className="text-gray-500">- {formatTime(myAttendance.break_end)}</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">You haven't clocked in yet today</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!myAttendance ? (
              <button
                onClick={handleClockIn}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Clock In
              </button>
            ) : !myAttendance.clock_out ? (
              <>
                {!myAttendance.break_start ? (
                  <button
                    onClick={handleBreakStart}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
                  >
                    <Coffee className="w-4 h-4" />
                    Start Break
                  </button>
                ) : !myAttendance.break_end ? (
                  <button
                    onClick={handleBreakEnd}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:opacity-50"
                  >
                    <Coffee className="w-4 h-4" />
                    End Break
                  </button>
                ) : null}
                <button
                  onClick={handleClockOut}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Clock Out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">Day Complete</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards (Managers only) */}
      {isManager && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.present}</p>
                <p className="text-sm text-gray-500">Present</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Timer className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
                <p className="text-sm text-gray-500">Late</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.absent}</p>
                <p className="text-sm text-gray-500">Absent</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.onLeave}</p>
                <p className="text-sm text-gray-500">On Leave</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {isManager && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Date */}
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Branch */}
            <select
              value={filters.branchId}
              onChange={(e) => setFilters(f => ({ ...f, branchId: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Branches</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name_en}</option>
              ))}
            </select>

            {/* Employee */}
            <select
              value={filters.userId}
              onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Employees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>

            {/* Status */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : attendance.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records</h3>
            <p className="text-gray-500">No attendance records for this date</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Employee</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Branch</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Clock In</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Clock Out</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Break</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Hours</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Late</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendance.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{record.users?.full_name}</p>
                          <p className="text-xs text-gray-500">{record.users?.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{record.branches?.name_en || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'font-medium',
                        record.clock_in ? 'text-green-600' : 'text-gray-400'
                      )}>
                        {formatTime(record.clock_in)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'font-medium',
                        record.clock_out ? 'text-red-600' : 'text-gray-400'
                      )}>
                        {formatTime(record.clock_out)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {record.break_start ? (
                        <span className="text-sm text-gray-600">
                          {formatTime(record.break_start)} - {formatTime(record.break_end)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">
                        {formatHours(record.actual_hours)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {record.late_minutes > 0 ? (
                        <span className="text-yellow-600">
                          {record.late_minutes} min
                        </span>
                      ) : (
                        <span className="text-green-600">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(record.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceList;
