import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Calendar,
  FileText,
  User,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { format, parseISO, differenceInBusinessDays, addDays } from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import useAuth from '../../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';

const LeaveRequestForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const isEditing = Boolean(id);
  const isManager = ['developer', 'admin'].includes(user?.role);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    user_id: user?.id || '',
    leave_type_id: '',
    start_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    reason: ''
  });

  // Calculate days count (excluding weekends for simplicity)
  const daysCount = formData.start_date && formData.end_date 
    ? Math.max(1, differenceInBusinessDays(parseISO(formData.end_date), parseISO(formData.start_date)) + 1)
    : 0;

  useEffect(() => {
    loadData();
    if (isEditing) {
      loadLeaveRequest();
    }
  }, [id, tenantId]);

  useEffect(() => {
    if (formData.leave_type_id && formData.user_id) {
      loadLeaveBalance();
    }
  }, [formData.leave_type_id, formData.user_id]);

  const loadData = async () => {
    if (!tenantId) return;
    try {
      // Load leave types
      const { data: types } = await supabase
        .from('leave_types')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name_en');
      setLeaveTypes(types || []);

      // Load users (managers can submit for others)
      if (isManager) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, role')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('full_name');
        setUsers(usersData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadLeaveRequest = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, leave_types(name_en, color)')
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Only pending requests can be edited by the owner
      if (data.status !== 'pending') {
        setMessage({ type: 'error', text: 'Only pending requests can be edited' });
        return;
      }

      // Users can only edit their own requests
      if (data.user_id !== user?.id && !isManager) {
        setMessage({ type: 'error', text: 'You can only edit your own requests' });
        return;
      }

      setFormData({
        user_id: data.user_id,
        leave_type_id: data.leave_type_id,
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason || ''
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveBalance = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*, leave_types(name_en, days_per_year)')
        .eq('user_id', formData.user_id)
        .eq('leave_type_id', formData.leave_type_id)
        .eq('year', currentYear)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // If no balance record exists, get default from leave type
      if (!data) {
        const selectedType = leaveTypes.find(t => t.id === formData.leave_type_id);
        setLeaveBalance({
          entitled_days: selectedType?.days_per_year || 21,
          used_days: 0,
          remaining_days: selectedType?.days_per_year || 21
        });
      } else {
        setLeaveBalance(data);
      }
    } catch (error) {
      console.error('Error loading leave balance:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-adjust end date if start date is after it
      ...(name === 'start_date' && new Date(value) > new Date(prev.end_date) 
        ? { end_date: value } 
        : {})
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Validation
    if (new Date(formData.start_date) < new Date().setHours(0, 0, 0, 0)) {
      setMessage({ type: 'error', text: 'Start date cannot be in the past' });
      setSaving(false);
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      setMessage({ type: 'error', text: 'End date cannot be before start date' });
      setSaving(false);
      return;
    }

    // Check leave balance
    if (leaveBalance && daysCount > leaveBalance.remaining_days) {
      if (!window.confirm(`You are requesting ${daysCount} days but only have ${leaveBalance.remaining_days} days remaining. Continue anyway?`)) {
        setSaving(false);
        return;
      }
    }

    try {
      const payload = {
        ...formData,
        days_count: daysCount,
        status: 'pending',
        tenant_id: tenantId
      };

      if (isEditing) {
        const { error } = await supabase
          .from('leave_requests')
          .update(payload)
          .eq('id', id)
          .eq('tenant_id', tenantId);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Leave request updated successfully!' });
      } else {
        const { error } = await supabase
          .from('leave_requests')
          .insert([payload]);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Leave request submitted successfully!' });
        setTimeout(() => navigate('/leave'), 1500);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const selectedLeaveType = leaveTypes.find(t => t.id === formData.leave_type_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/leave')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Leave Request' : 'New Leave Request'}
          </h1>
          <p className="text-gray-500">Submit a request for time off</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={clsx(
          'mb-6 p-4 rounded-lg flex items-center gap-2',
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        )}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Employee Selection (managers only) */}
        {isManager && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              Employee
            </h2>
            
            <select
              name="user_id"
              value={formData.user_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Employee</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
              ))}
            </select>
          </div>
        )}

        {/* Leave Type */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Leave Details
          </h2>
          
          <div className="space-y-4">
            {/* Leave Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {leaveTypes.map(type => (
                  <label
                    key={type.id}
                    className={clsx(
                      'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition',
                      formData.leave_type_id === type.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="radio"
                      name="leave_type_id"
                      value={type.id}
                      checked={formData.leave_type_id === type.id}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: type.color || '#6B7280' }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{type.name_en}</p>
                      <p className="text-xs text-gray-500">
                        {type.days_per_year} days/year • {type.is_paid ? 'Paid' : 'Unpaid'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Leave Balance Info */}
            {leaveBalance && selectedLeaveType && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Your {selectedLeaveType.name_en} Balance</p>
                    <p className="mt-1">
                      Entitled: {leaveBalance.entitled_days} days • 
                      Used: {leaveBalance.used_days} days • 
                      <span className="font-semibold"> Remaining: {leaveBalance.remaining_days} days</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  min={formData.start_date}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Days Count */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Business Days:</span>
                <span className="text-xl font-bold text-primary-600">
                  {daysCount} {daysCount === 1 ? 'day' : 'days'}
                </span>
              </div>
              {leaveBalance && daysCount > leaveBalance.remaining_days && (
                <p className="text-sm text-amber-600 mt-2">
                  ⚠️ This exceeds your remaining balance
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Reason
          </h2>
          
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            rows={4}
            placeholder="Please provide a reason for your leave request (optional but recommended)..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate('/leave')}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || !formData.leave_type_id}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEditing ? 'Update Request' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveRequestForm;
