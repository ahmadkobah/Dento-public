import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Eye,
  Loader2,
  MoreVertical,
  RefreshCw,
  Filter,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  Edit,
  Box,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const STATUS_CONFIG = {
  requested: { label: 'Requested', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  reported: { label: 'Reported', color: 'bg-purple-100 text-purple-700', icon: FileText },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const CbctList = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('cbct_orders')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone),
          doctors:requesting_doctor_id (id, name_en, name_ar),
          cbct_scan_regions:scan_region_id (id, name_en, name_ar, description)
        `)
        .order('created_at', { ascending: false })
        .eq('tenant_id', tenantId);

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply search filter client-side
      let filtered = data || [];
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(o => {
          const patientName = getPatientName(o.patients).toLowerCase();
          const doctorName = (o.doctors?.name_en || o.doctors?.name_ar || '').toLowerCase();
          return patientName.includes(search) || 
                 doctorName.includes(search) ||
                 o.order_number?.toLowerCase().includes(search);
        });
      }

      setOrders(filtered);
    } catch (error) {
      console.error('Error fetching CBCT orders:', error);
      setOrders([]);
      setMessage({ type: 'error', text: 'Failed to load CBCT orders' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, tenantId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown Patient';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this CBCT order?')) return;
    
    setDeleting(id);
    try {
      const { error } = await supabase.from('cbct_orders').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
      
      setOrders(prev => prev.filter(o => o.id !== id));
      setMessage({ type: 'success', text: 'CBCT order deleted successfully' });
    } catch (error) {
      console.error('Error deleting CBCT order:', error);
      setMessage({ type: 'error', text: 'Failed to delete CBCT order' });
    } finally {
      setDeleting(null);
      setMenuOpen(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
            <h1 className="text-2xl font-bold text-gray-900">CBCT Management</h1>
            <p className="text-gray-500 mt-1">Manage Cone Beam CT orders and 3D imaging</p>
          </div>
        </div>
        <Link
          to="/cbct/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New CBCT Order
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto hover:opacity-70">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient, doctor, or order #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="requested">Requested</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="reported">Reported</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchOrders}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* CBCT List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Box className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No CBCT Orders Found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'No orders match your search criteria.'
                : 'Create your first CBCT order to get started.'}
            </p>
            <Link
              to="/cbct/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              New CBCT Order
            </Link>
          </div>
        ) : (
          <div className="overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => {
                  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.requested;
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-600">
                          {order.order_number || `CBCT-${order.id.slice(0, 8).toUpperCase()}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{getPatientName(order.patients)}</p>
                            {order.patients?.phone && (
                              <p className="text-sm text-gray-500">{order.patients.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">
                          {order.cbct_scan_regions?.name_en || order.cbct_scan_regions?.name_ar || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">
                          {order.doctors?.name_en || order.doctors?.name_ar || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{formatDate(order.scheduled_date || order.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/cbct/${order.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Link>
                          
                          {/* More Actions */}
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpen(menuOpen === order.id ? null : order.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            
                            {menuOpen === order.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                                <Link
                                  to={`/cbct/edit/${order.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </Link>
                                <hr className="my-1" />
                                <button
                                  onClick={() => handleDelete(order.id)}
                                  disabled={deleting === order.id}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  {deleting === order.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
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

export default CbctList;
