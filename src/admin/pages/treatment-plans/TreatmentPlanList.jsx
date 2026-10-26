import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  FileText,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  User,
  Calendar,
  Loader2,
  MoreVertical,
  Send,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const TreatmentPlanList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { tenantId } = useTenant();
  const { formatCurrency, defaultCurrency } = useRegionalSettings();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const fetchPlans = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('treatment_plans')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone),
          doctors:doctor_id (id, name_en, name_ar),
          treatment_plan_items (id, status)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply search filter
      let filteredData = data || [];
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(plan => 
          plan.title?.toLowerCase().includes(term) ||
          plan.patients?.name?.toLowerCase().includes(term) ||
          `${plan.patients?.first_name} ${plan.patients?.last_name}`.toLowerCase().includes(term) ||
          plan.patients?.phone?.includes(term)
        );
      }

      setPlans(filteredData);
    } catch (error) {
      console.error('Error fetching treatment plans:', error);
      setMessage({ type: 'error', text: 'Failed to load treatment plans' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, tenantId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleDelete = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete "${plan.title}"?`)) return;

    setDeleting(plan.id);
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .delete()
        .eq('id', plan.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Treatment plan deleted successfully' });
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      setMessage({ type: 'error', text: 'Failed to delete treatment plan' });
    } finally {
      setDeleting(null);
      setMenuOpen(null);
    }
  };

  const handleDuplicate = async (plan) => {
    try {
      // Fetch full plan with items
      const { data: fullPlan, error: fetchError } = await supabase
        .from('treatment_plans')
        .select('*, treatment_plan_items(*)')
        .eq('id', plan.id)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;

      // Create new plan
      const { data: newPlan, error: createError } = await supabase
        .from('treatment_plans')
        .insert({
          tenant_id: tenantId,
          patient_id: fullPlan.patient_id,
          doctor_id: fullPlan.doctor_id,
          title: `${fullPlan.title} (Copy)`,
          description: fullPlan.description,
          status: 'draft',
          total_cost: fullPlan.total_cost,
          discount_type: fullPlan.discount_type,
          discount_value: fullPlan.discount_value,
          final_cost: fullPlan.final_cost,
          notes: fullPlan.notes,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy items
      if (fullPlan.treatment_plan_items?.length > 0) {
        const newItems = fullPlan.treatment_plan_items.map(item => ({
          tenant_id: tenantId,
          treatment_plan_id: newPlan.id,
          service_id: item.service_id,
          tooth_number: item.tooth_number,
          surface: item.surface,
          procedure_name: item.procedure_name,
          description: item.description,
          cost: item.cost,
          sequence_order: item.sequence_order,
          status: 'pending',
          notes: item.notes,
        }));

        await supabase.from('treatment_plan_items').insert(newItems);
      }

      setMessage({ type: 'success', text: 'Treatment plan duplicated successfully' });
      fetchPlans();
    } catch (error) {
      console.error('Error duplicating plan:', error);
      setMessage({ type: 'error', text: 'Failed to duplicate treatment plan' });
    }
    setMenuOpen(null);
  };

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown Patient';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  const getProgress = (items) => {
    if (!items || items.length === 0) return 0;
    const completed = items.filter(item => item.status === 'completed').length;
    return Math.round((completed / items.length) * 100);
  };

  // Use the formatCurrency from regional settings - wrapped for simple usage
  const fmtCurrency = (amount) => formatCurrency(amount, defaultCurrency?.code);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Treatment Plans</h1>
            <p className="text-gray-500 mt-1">Manage patient treatment plans and procedures</p>
          </div>
        </div>
        <Link
          to="/treatment-plans/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Treatment Plan
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name, phone, or plan title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No treatment plans found</h3>
          <p className="text-gray-500 mb-4">Create your first treatment plan to get started</p>
          <Link
            to="/treatment-plans/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
            Create Treatment Plan
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-visible">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plans.map((plan) => {
                  const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;
                  const StatusIcon = status.icon;
                  const progress = getProgress(plan.treatment_plan_items);

                  return (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{plan.title}</p>
                            <p className="text-sm text-gray-500">
                              {plan.treatment_plan_items?.length || 0} procedures
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{getPatientName(plan.patients)}</p>
                            <p className="text-sm text-gray-500">{plan.patients?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{fmtCurrency(plan.final_cost)}</p>
                          {plan.discount_value > 0 && (
                            <p className="text-sm text-gray-500 line-through">{fmtCurrency(plan.total_cost)}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(plan.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 relative">
                          <Link
                            to={`/treatment-plans/${plan.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Link>
                          <Link
                            to={`/treatment-plans/edit/${plan.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </Link>
                          <button
                            onClick={() => setMenuOpen(menuOpen === plan.id ? null : plan.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          
                          {menuOpen === plan.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                              <button
                                onClick={() => handleDuplicate(plan)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicate
                              </button>
                              <button
                                onClick={() => toast.info('Send to patient feature coming soon')}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Send className="w-4 h-4" />
                                Send to Patient
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => handleDelete(plan)}
                                disabled={deleting === plan.id}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                {deleting === plan.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
};

export default TreatmentPlanList;
