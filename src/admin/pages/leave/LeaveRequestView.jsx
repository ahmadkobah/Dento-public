import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Loader2,
  Calendar,
  FileText,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Check,
  X,
  Printer,
  Edit
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import useAuth from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { useTenant } from '../../contexts/TenantContext';

const LeaveRequestView = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const isManager = ['developer', 'admin'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [leaveRequest, setLeaveRequest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeaveRequest();
  }, [id, tenantId]);

  const loadLeaveRequest = async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          users!leave_requests_user_id_fkey(id, full_name, email, role),
          leave_types(id, name_en, name_ar, color, is_paid, days_per_year),
          approver:users!leave_requests_approved_by_fkey(id, full_name)
        `)
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .single();

      if (error) throw error;
      setLeaveRequest(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this leave request?')) return;
    
    setActionLoading(true);
    try {
      // Update leave request status
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Issue #17 Fix: Decrement leave balance
      const currentYear = new Date().getFullYear();
      const daysToDeduct = leaveRequest.days_count || 1;

      // Check for existing balance record
      const { data: balanceRecord, error: balanceError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', leaveRequest.user_id)
        .eq('leave_type_id', leaveRequest.leave_type_id)
        .eq('year', currentYear)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        console.error('Error fetching leave balance:', balanceError);
      } else if (balanceRecord) {
        // Update existing balance
        const newUsedDays = (balanceRecord.used_days || 0) + daysToDeduct;
        const newRemainingDays = Math.max(0, (balanceRecord.entitled_days || 0) - newUsedDays);

        const { error: updateError } = await supabase
          .from('leave_balances')
          .update({
            used_days: newUsedDays,
            remaining_days: newRemainingDays,
          })
          .eq('id', balanceRecord.id);

        if (updateError) {
          console.error('Error updating leave balance:', updateError);
        }
      } else {
        // Create new balance record with the used days
        const entitledDays = leaveRequest.leave_types?.days_per_year || 21;
        
        const { error: insertError } = await supabase
          .from('leave_balances')
          .insert({
            user_id: leaveRequest.user_id,
            leave_type_id: leaveRequest.leave_type_id,
            year: currentYear,
            entitled_days: entitledDays,
            used_days: daysToDeduct,
            remaining_days: Math.max(0, entitledDays - daysToDeduct),
          });

        if (insertError) {
          console.error('Error creating leave balance:', insertError);
        }
      }

      loadLeaveRequest();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ 
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      loadLeaveRequest();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this leave request?')) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      loadLeaveRequest();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: Clock, color: 'yellow', text: 'Pending Approval' },
      approved: { icon: CheckCircle, color: 'green', text: 'Approved' },
      rejected: { icon: XCircle, color: 'red', text: 'Rejected' },
      cancelled: { icon: AlertCircle, color: 'gray', text: 'Cancelled' }
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !leaveRequest) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5 inline mr-2" />
          {error || 'Leave request not found'}
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(leaveRequest.status);
  const StatusIcon = statusConfig.icon;
  const canEdit = leaveRequest.user_id === user?.id && leaveRequest.status === 'pending';
  const canApprove = isManager && leaveRequest.status === 'pending';
  const canCancel = leaveRequest.user_id === user?.id && leaveRequest.status === 'pending';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/leave')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Request</h1>
            <p className="text-gray-500">
              Submitted {format(parseISO(leaveRequest.created_at), 'PPP')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => navigate(`/leave/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={clsx(
        'p-4 rounded-lg mb-6 flex items-center gap-3',
        statusConfig.color === 'yellow' && 'bg-yellow-50',
        statusConfig.color === 'green' && 'bg-green-50',
        statusConfig.color === 'red' && 'bg-red-50',
        statusConfig.color === 'gray' && 'bg-gray-50'
      )}>
        <StatusIcon className={clsx(
          'w-6 h-6',
          statusConfig.color === 'yellow' && 'text-yellow-600',
          statusConfig.color === 'green' && 'text-green-600',
          statusConfig.color === 'red' && 'text-red-600',
          statusConfig.color === 'gray' && 'text-gray-600'
        )} />
        <div className="flex-1">
          <p className={clsx(
            'font-semibold',
            statusConfig.color === 'yellow' && 'text-yellow-800',
            statusConfig.color === 'green' && 'text-green-800',
            statusConfig.color === 'red' && 'text-red-800',
            statusConfig.color === 'gray' && 'text-gray-800'
          )}>
            {statusConfig.text}
          </p>
          {leaveRequest.approver && (
            <p className="text-sm text-gray-600">
              by {leaveRequest.approver.full_name} on {format(parseISO(leaveRequest.approved_at), 'PPP')}
            </p>
          )}
          {leaveRequest.rejection_reason && (
            <p className="text-sm text-red-600 mt-1">
              Reason: {leaveRequest.rejection_reason}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {canApprove && (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}

        {canCancel && !canApprove && (
          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="flex items-center gap-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
          >
            <XCircle className="w-4 h-4" />
            Cancel Request
          </button>
        )}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Employee Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            Employee Information
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {leaveRequest.users?.full_name}
              </p>
              <p className="text-gray-500">{leaveRequest.users?.email}</p>
              <p className="text-sm text-gray-400 capitalize">{leaveRequest.users?.role}</p>
            </div>
          </div>
        </div>

        {/* Leave Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Leave Details
          </h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Leave Type</p>
              <div className="flex items-center gap-2">
                <span 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: leaveRequest.leave_types?.color || '#6B7280' }}
                />
                <span className="font-medium text-gray-900">
                  {leaveRequest.leave_types?.name_en}
                </span>
                {leaveRequest.leave_types?.is_paid && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Paid</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Duration</p>
              <p className="font-medium text-gray-900">
                {leaveRequest.days_count} {leaveRequest.days_count === 1 ? 'day' : 'days'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Start Date</p>
              <p className="font-medium text-gray-900">
                {format(parseISO(leaveRequest.start_date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">End Date</p>
              <p className="font-medium text-gray-900">
                {format(parseISO(leaveRequest.end_date), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Reason */}
        {leaveRequest.reason && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Reason
            </h2>
            
            <p className="text-gray-700 whitespace-pre-wrap">
              {leaveRequest.reason}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Timeline
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Request Submitted</p>
                <p className="text-sm text-gray-500">
                  {format(parseISO(leaveRequest.created_at), 'PPP p')}
                </p>
              </div>
            </div>

            {leaveRequest.approved_at && (
              <div className="flex items-start gap-4">
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  leaveRequest.status === 'approved' ? 'bg-green-100' : 'bg-red-100'
                )}>
                  {leaveRequest.status === 'approved' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {leaveRequest.status === 'approved' ? 'Approved' : 'Rejected'} by {leaveRequest.approver?.full_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(leaveRequest.approved_at), 'PPP p')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestView;
