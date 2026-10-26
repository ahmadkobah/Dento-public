import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Search, Calendar, DollarSign, 
  AlertCircle, CheckCircle, Clock, User, FileText, Eye,
  RefreshCw
} from 'lucide-react';
import { parseISO, isPast } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';

const statusConfig = {
  active: { color: 'bg-green-100 text-green-700', label: 'Active' },
  completed: { color: 'bg-blue-100 text-blue-700', label: 'Completed' },
  defaulted: { color: 'bg-red-100 text-red-700', label: 'Defaulted' },
  cancelled: { color: 'bg-gray-100 text-gray-700', label: 'Cancelled' },
};

const InstallmentList = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadPlans = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('installment_plans')
        .select(`
          *,
          patients:patient_id (id, first_name, last_name, phone),
          invoices:invoice_id (invoice_number),
          installment_payments (*)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading installment plans:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tenantId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const filteredPlans = plans.filter(plan => {
    if (!searchTerm) return true;
    const patientName = `${plan.patients?.first_name || ''} ${plan.patients?.last_name || ''}`.toLowerCase();
    const phone = plan.patients?.phone || '';
    return patientName.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
  });

  const getNextPayment = (payments) => {
    if (!payments || payments.length === 0) return null;
    return payments
      .filter(p => p.status === 'pending' || p.status === 'overdue')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
  };

  const getOverdueCount = (payments) => {
    if (!payments) return 0;
    return payments.filter(p => p.status === 'overdue' || (p.status === 'pending' && isPast(parseISO(p.due_date)))).length;
  };

  const getPaidCount = (payments) => {
    if (!payments) return 0;
    return payments.filter(p => p.status === 'paid').length;
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
            <h1 className="text-2xl font-bold text-gray-900">Installment Plans</h1>
            <p className="text-gray-500 mt-1">Manage patient payment plans</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPlans}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/installments/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="defaulted">Defaulted</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Plans</p>
              <p className="text-xl font-bold text-gray-900">
                {plans.filter(p => p.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overdue Payments</p>
              <p className="text-xl font-bold text-gray-900">
                {plans.reduce((acc, p) => acc + getOverdueCount(p.installment_payments), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Outstanding</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(plans.filter(p => p.status === 'active').reduce((acc, p) => acc + parseFloat(p.remaining_amount || 0), 0))}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Due This Week</p>
              <p className="text-xl font-bold text-gray-900">
                {plans.reduce((acc, p) => {
                  const next = getNextPayment(p.installment_payments);
                  if (next) {
                    const dueDate = parseISO(next.due_date);
                    const weekFromNow = new Date();
                    weekFromNow.setDate(weekFromNow.getDate() + 7);
                    if (dueDate <= weekFromNow) return acc + 1;
                  }
                  return acc;
                }, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No installment plans found</h3>
            <p className="text-gray-500 mb-4">Create a new plan to get started</p>
            <Link
              to="/installments/new"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Patient</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Invoice</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Progress</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPlans.map((plan) => {
                const _nextPayment = getNextPayment(plan.installment_payments);
                const overdueCount = getOverdueCount(plan.installment_payments);
                const paidCount = getPaidCount(plan.installment_payments);

                return (
                  <tr 
                    key={plan.id} 
                    className={`hover:bg-gray-50 transition-colors ${overdueCount > 0 ? 'bg-red-50' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {plan.patients?.first_name} {plan.patients?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {plan.patients?.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-700">
                        {plan.invoices?.invoice_number || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${(paidCount / plan.number_of_installments) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-500">
                          {paidCount}/{plan.number_of_installments}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-gray-900">{formatCurrency(plan.total_amount)}</p>
                        <p className="text-sm text-gray-500">
                          Remaining: {formatCurrency(plan.remaining_amount)}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block w-fit ${statusConfig[plan.status]?.color}`}>
                          {statusConfig[plan.status]?.label}
                        </span>
                        {overdueCount > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium inline-block w-fit">
                            {overdueCount} overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/installments/${plan.id}`}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default InstallmentList;
