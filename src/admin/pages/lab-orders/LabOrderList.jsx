import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Loader2,
  FlaskConical,
  Filter,
  ChevronDown,
  User,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../../hooks/useToast';

const STATUS_CONFIG = {
  placed: { label: 'Placed', color: 'bg-blue-100 text-blue-700', icon: '📋' },
  in_fabrication: { label: 'In Fabrication', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-700', icon: '✅' },
  delivered: { label: 'Delivered', color: 'bg-purple-100 text-purple-700', icon: '📦' },
  adjustment_needed: { label: 'Adjustment Needed', color: 'bg-orange-100 text-orange-700', icon: '🔧' },
  completed: { label: 'Completed', color: 'bg-teal-100 text-teal-700', icon: '✓' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: '❌' },
};

const LabOrderList = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [orders, setOrders] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLab, setSelectedLab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    loadOrders();
    loadLabs();
  }, [selectedStatus, selectedLab, tenantId]);

  const loadLabs = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('dental_labs')
      .select('id, name')
      .eq('is_active', true)
      .eq('tenant_id', tenantId)
      .order('name');
    setLabs(data || []);
  };

  const loadOrders = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('lab_orders')
        .select(`
          id,
          order_number,
          patient_id,
          doctor_id,
          lab_id,
          order_type_id,
          teeth_involved,
          shade,
          material,
          status,
          due_date,
          cost,
          created_at,
          patients:patient_id (id, name, first_name, last_name, phone),
          doctors:doctor_id (id, name_en, name_ar),
          dental_labs:lab_id (id, name),
          lab_order_types:order_type_id (id, name_en, name_ar)
        `)
        .order('created_at', { ascending: false })
        .eq('tenant_id', tenantId);

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      if (selectedLab !== 'all') {
        query = query.eq('lab_id', selectedLab);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading lab orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'delivered' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lab order?')) return;
    
    try {
      const { error } = await supabase
        .from('lab_orders')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      loadOrders();
    } catch (error) {
      console.error('Error deleting lab order:', error);
      toast.error('Failed to delete lab order');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!search) return true;
    const patientName = getPatientName(order.patients).toLowerCase();
    const orderNumber = (order.order_number || '').toLowerCase();
    const orderTypeName = (order.lab_order_types?.name_en || '').toLowerCase();
    const labName = (order.dental_labs?.name || '').toLowerCase();
    return patientName.includes(search.toLowerCase()) || 
           orderNumber.includes(search.toLowerCase()) ||
           orderTypeName.includes(search.toLowerCase()) ||
           labName.includes(search.toLowerCase());
  });

  const overdueCount = orders.filter(o => isOverdue(o.due_date, o.status)).length;

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
            <h1 className="text-2xl font-bold text-gray-900">Lab Orders</h1>
            <p className="text-gray-500">Track dental lab work and orders</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/lab-orders/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Lab Order
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient, order #, or work type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.icon} {config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lab</label>
              <select
                value={selectedLab}
                onChange={(e) => setSelectedLab(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Labs</option>
                {labs.map(lab => (
                  <option key={lab.id} value={lab.id}>{lab.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-7 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const count = orders.filter(o => o.status === key).length;
          return (
            <div
              key={key}
              className="p-3 rounded-xl border bg-white border-gray-100 text-center"
            >
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 truncate">{config.label}</p>
            </div>
          );
        })}
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <div>
            <p className="font-medium text-red-800">
              {overdueCount} overdue order{overdueCount > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-red-600">Check due dates and follow up with labs</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No lab orders found</p>
            <button
              onClick={() => navigate('/lab-orders/new')}
              className="mt-4 text-primary-600 hover:underline"
            >
              Create a lab order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Work Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Lab</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
                  const overdue = isOverdue(order.due_date, order.status);
                  
                  return (
                    <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-mono font-medium text-gray-900">{order.order_number || '-'}</p>
                        <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{getPatientName(order.patients)}</p>
                            <p className="text-xs text-gray-500">{order.doctors?.name_en || order.doctors?.name_ar || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{order.lab_order_types?.name_en || '-'}</p>
                        {order.teeth_involved && (
                          <p className="text-xs text-gray-500">Teeth: {order.teeth_involved}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-900">{order.dental_labs?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {order.due_date ? (
                          <div className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {overdue && <AlertTriangle className="w-4 h-4" />}
                            {formatDate(order.due_date)}
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => navigate(`/lab-orders/${order.id}`)} className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                            <Eye className="w-4 h-4 text-gray-500" />
                          </button>
                          <button onClick={() => navigate(`/lab-orders/${order.id}/edit`)} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                            <Edit className="w-4 h-4 text-gray-500" />
                          </button>
                          <button onClick={() => handleDelete(order.id)} className="p-2 hover:bg-red-50 rounded-lg" title="Delete">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabOrderList;
