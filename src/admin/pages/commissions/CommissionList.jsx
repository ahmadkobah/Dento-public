import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, DollarSign, User, Calendar, Filter, Download,
  CheckCircle, Clock, AlertCircle, RefreshCw, TrendingUp, Search
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import useAuth from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending', icon: Clock },
  approved: { color: 'bg-blue-100 text-blue-700', label: 'Approved', icon: CheckCircle },
  paid: { color: 'bg-green-100 text-green-700', label: 'Paid', icon: CheckCircle },
  cancelled: { color: 'bg-gray-100 text-gray-700', label: 'Cancelled', icon: AlertCircle },
};

const CommissionList = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { formatCurrency } = useRegionalSettings();
  const { user } = useAuth();
  const { tenantId } = useTenant();
  
  // Issue #23 Fix: Check if user has permission to approve payments
  const canApprovePayments = ['developer', 'admin'].includes(user?.role);

  const [commissions, setCommissions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    doctorCount: 0,
  });

  const loadDoctors = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('doctors')
      .select('id, name_en, commission_rate')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setDoctors(data || []);
  }, [tenantId]);

  const loadCommissions = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('doctor_commissions')
        .select(`
          *,
          doctors:doctor_id (id, name_en, name_ar, photo_url, commission_rate),
          appointments:appointment_id (id, datetime_start, patients:patient_id (first_name, last_name))
        `)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (selectedDoctor !== 'all') {
        query = query.eq('doctor_id', selectedDoctor);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommissions(data || []);

      // Calculate stats
      const total = (data || []).reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0);
      const pending = (data || []).filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0);
      const paid = (data || []).filter(c => c.status === 'paid').reduce((sum, c) => sum + parseFloat(c.commission_amount || 0), 0);
      const uniqueDoctors = new Set((data || []).map(c => c.doctor_id)).size;

      setStats({ total, pending, paid, doctorCount: uniqueDoctors });
    } catch (error) {
      console.error('Error loading commissions:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDoctor, selectedStatus, dateRange, tenantId]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  const updateCommissionStatus = async (id, newStatus) => {
    // Issue #23 Fix: Require admin/developer role for payment approvals
    if (!canApprovePayments) {
      toast.warning('You do not have permission to approve commission payments.');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('doctor_commissions')
        .update({ 
          status: newStatus,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
          paid_by: newStatus === 'paid' ? user?.id : null,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      loadCommissions();
    } catch (error) {
      console.error('Error updating commission:', error);
    }
  };

  const groupedByDoctor = commissions.reduce((acc, comm) => {
    const doctorId = comm.doctor_id;
    if (!acc[doctorId]) {
      acc[doctorId] = {
        doctor: comm.doctors,
        commissions: [],
        total: 0,
        pending: 0,
        paid: 0,
      };
    }
    acc[doctorId].commissions.push(comm);
    acc[doctorId].total += parseFloat(comm.commission_amount || 0);
    if (comm.status === 'pending') acc[doctorId].pending += parseFloat(comm.commission_amount || 0);
    if (comm.status === 'paid') acc[doctorId].paid += parseFloat(comm.commission_amount || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Commission Tracking</h1>
            <p className="text-gray-500 mt-1">Track and manage doctor commissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCommissions}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Commission</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.total)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.pending)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Paid Out</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.paid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Doctors</p>
              <p className="text-xl font-bold text-gray-900">{stats.doctorCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Doctors</option>
            {doctors.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.name_en}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Commission List by Doctor */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : Object.keys(groupedByDoctor).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No commissions found</h3>
          <p className="text-gray-500 mt-1">Commissions will appear here when appointments are completed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(groupedByDoctor).map(({ doctor, commissions, total, pending, paid }) => (
            <div key={doctor?.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Doctor Header */}
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {doctor?.photo_url ? (
                      <img src={doctor.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{doctor?.name_en || 'Unknown Doctor'}</h3>
                      <p className="text-sm text-gray-500">{doctor?.commission_rate}% commission rate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-gray-500">Total</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(total)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Pending</p>
                      <p className="font-semibold text-yellow-600">{formatCurrency(pending)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Paid</p>
                      <p className="font-semibold text-green-600">{formatCurrency(paid)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commission Items */}
              <div className="divide-y divide-gray-100">
                {commissions.map(comm => {
                  const StatusIcon = statusConfig[comm.status]?.icon || Clock;
                  return (
                    <div key={comm.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">
                              {comm.procedure_name || 'Appointment'}
                            </p>
                            <p className="text-gray-500">
                              {comm.appointments?.patients?.first_name} {comm.appointments?.patients?.last_name}
                              {comm.appointments?.datetime_start && (
                                <span className="ml-2">
                                  • {format(parseISO(comm.appointments.datetime_start), 'MMM d, yyyy')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {formatCurrency(comm.procedure_amount)} × {comm.commission_rate}%
                            </p>
                            <p className="font-semibold text-gray-900">{formatCurrency(comm.commission_amount)}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[comm.status]?.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[comm.status]?.label}
                          </span>
                          {comm.status === 'pending' && canApprovePayments && (
                            <button
                              onClick={() => updateCommissionStatus(comm.id, 'paid')}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommissionList;
