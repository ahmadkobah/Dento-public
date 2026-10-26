import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Calendar,
  User,
  Clock,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  Check,
  X,
  CalendarDays,
  FileText,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import useAuth from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useTenant } from '../../contexts/TenantContext';

const LeaveRequestList = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const isManager = ['developer', 'admin'].includes(user?.role);

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    myPending: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    leaveTypeId: '',
    userId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadData();
  }, [filters, tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Load leave types
      const { data: types } = await supabase
        .from('leave_types')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name_en');
      setLeaveTypes(types || []);

      // Load users for filter (only if manager)
      if (isManager) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, role')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('full_name');
        setUsers(usersData || []);
      }

      // Build leave requests query
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          users!leave_requests_user_id_fkey(id, full_name, email, role),
          leave_types(id, name_en, name_ar, color, is_paid),
          approver:users!leave_requests_approved_by_fkey(id, full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Filter by user role
      if (!isManager) {
        query = query.eq('user_id', user.id);
      } else if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.leaveTypeId) {
        query = query.eq('leave_type_id', filters.leaveTypeId);
      }
      if (filters.startDate) {
        query = query.gte('start_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('end_date', filters.endDate);
      }

      const { data: requests, error } = await query;
      if (error) throw error;

      // Apply search filter
      let filteredRequests = requests || [];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredRequests = filteredRequests.filter(req =>
          req.users?.full_name?.toLowerCase().includes(searchLower) ||
          req.reason?.toLowerCase().includes(searchLower)
        );
      }

      setLeaveRequests(filteredRequests);

      // Calculate stats
      const allRequests = requests || [];
      setStats({
        pending: allRequests.filter(r => r.status === 'pending').length,
        approved: allRequests.filter(r => r.status === 'approved').length,
        rejected: allRequests.filter(r => r.status === 'rejected').length,
        myPending: allRequests.filter(r => r.user_id === user?.id && r.status === 'pending').length
      });
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!window.confirm('Approve this leave request?')) return;
    
    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      loadData();
    } catch (error) {
      toast.error('Error approving request: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', requestId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      loadData();
    } catch (error) {
      toast.error('Error rejecting request: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (requestId) => {
    if (!window.confirm('Cancel this leave request?')) return;

    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      loadData();
    } catch (error) {
      toast.error('Error cancelling request: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', styles[status] || styles.pending)}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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
            <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
            <p className="text-gray-500 mt-1">Manage staff leave and time off requests</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4 text-gray-500', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => navigate('/leave/new')}
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              <p className="text-sm text-gray-500">Approved</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
              <p className="text-sm text-gray-500">Rejected</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.myPending}</p>
              <p className="text-sm text-gray-500">My Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Leave Type */}
          <select
            value={filters.leaveTypeId}
            onChange={(e) => setFilters(f => ({ ...f, leaveTypeId: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Types</option>
            {leaveTypes.map(type => (
              <option key={type.id} value={type.id}>{type.name_en}</option>
            ))}
          </select>

          {/* User (managers only) */}
          {isManager && (
            <select
              value={filters.userId}
              onChange={(e) => setFilters(f => ({ ...f, userId: e.target.value }))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Staff</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          )}

          {/* Date Range */}
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="From date"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            placeholder="To date"
          />
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : leaveRequests.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests found</h3>
            <p className="text-gray-500">Submit a leave request to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Employee</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Leave Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Days</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Reason</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaveRequests.map(request => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{request.users?.full_name}</p>
                          <p className="text-xs text-gray-500">{request.users?.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: request.leave_types?.color || '#6B7280' }}
                        />
                        <span className="text-gray-700">{request.leave_types?.name_en}</span>
                        {request.leave_types?.is_paid && (
                          <span className="text-xs text-green-600">(Paid)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="text-gray-900">
                          {format(parseISO(request.start_date), 'MMM d, yyyy')}
                        </div>
                        {request.start_date !== request.end_date && (
                          <div className="text-gray-500">
                            to {format(parseISO(request.end_date), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">
                        {request.days_count} {request.days_count === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600 max-w-xs truncate" title={request.reason}>
                        {request.reason || '-'}
                      </p>
                      {request.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1" title={request.rejection_reason}>
                          Rejected: {request.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        {getStatusBadge(request.status)}
                      </div>
                      {request.approver && (
                        <p className="text-xs text-gray-500 mt-1">
                          by {request.approver.full_name}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/leave/${request.id}`)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        
                        {/* Manager actions for pending requests */}
                        {isManager && request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              disabled={actionLoading === request.id}
                              className="p-2 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              {actionLoading === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                              ) : (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              disabled={actionLoading === request.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        {/* User can cancel their own pending requests */}
                        {request.user_id === user?.id && request.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(request.id)}
                            disabled={actionLoading === request.id}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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

export default LeaveRequestList;
