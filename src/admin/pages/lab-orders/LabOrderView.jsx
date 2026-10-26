import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Printer,
  Loader2, 
  User,
  Calendar,
  FlaskConical,
  Clock,
  Phone,
  Mail,
  MapPin,
  Package,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const STATUS_CONFIG = {
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-800', icon: '📋' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-800', icon: '✅' },
  delivered: { label: 'Delivered', color: 'bg-purple-100 text-purple-800', icon: '📦' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '❌' },
  on_hold: { label: 'On Hold', color: 'bg-gray-100 text-gray-800', icon: '⏸️' },
};

const LabOrderView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tenantId } = useTenant();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenantId]);

  const loadOrder = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email),
          doctors:doctor_id (id, name_en, name_ar),
          dental_labs:lab_id (id, name, phone, email, address)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error loading lab order:', error);
      setMessage({ type: 'error', text: 'Failed to load lab order' });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const updates = { status: newStatus };
      
      // Add timestamps for certain status changes
      if (newStatus === 'delivered') {
        updates.delivery_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('lab_orders')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      setOrder(prev => ({ ...prev, ...updates }));
      setMessage({ type: 'success', text: `Status updated to ${STATUS_CONFIG[newStatus].label}` });
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage({ type: 'error', text: 'Failed to update status' });
    } finally {
      setUpdating(false);
    }
  };

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isOverdue = () => {
    if (!order?.due_date) return false;
    if (['delivered', 'cancelled'].includes(order.status)) return false;
    return new Date(order.due_date) < new Date();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Lab Order Not Found</h2>
        <button onClick={() => navigate('/lab-orders')}
          className="mt-4 text-primary-600 hover:text-primary-700">
          Back to Lab Orders
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.ordered;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lab Order Details</h1>
            <p className="text-gray-500">Order #{order.id?.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => navigate(`/lab-orders/${id}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">Lab Order</h1>
        <p className="text-gray-600">#{order.id?.slice(-8).toUpperCase()}</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 print:hidden ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Overdue Alert */}
      {isOverdue() && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 print:hidden">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <div>
            <p className="font-medium text-red-800">Order is overdue!</p>
            <p className="text-sm text-red-600">Due date was {formatDate(order.due_date)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Work Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-gray-400" />
                  Work Details
                </h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.icon} {statusConfig.label}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Work Type</p>
                <p className="font-semibold text-gray-900">{order.work_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Material</p>
                <p className="font-semibold text-gray-900">{order.material || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Shade</p>
                <p className="font-semibold text-gray-900">{order.shade || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Teeth</p>
                <p className="font-semibold text-gray-900">
                  {order.teeth && order.teeth.length > 0 
                    ? order.teeth.join(', ') 
                    : 'Not specified'}
                </p>
              </div>
            </div>

            {order.special_instructions && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Special Instructions</p>
                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <p className="text-gray-800">{order.special_instructions}</p>
                </div>
              </div>
            )}
          </div>

          {/* Patient Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Patient Information
            </h2>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{getPatientName(order.patients)}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {order.patients?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {order.patients.phone}
                    </span>
                  )}
                  {order.patients?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {order.patients.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {order.doctors && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Treating Doctor</p>
                <p className="font-medium text-gray-900">{order.doctors.name_en || order.doctors.name_ar}</p>
              </div>
            )}
          </div>

          {/* Lab Info */}
          {order.dental_labs && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-400" />
                Dental Lab
              </h2>

              <div className="space-y-3">
                <p className="font-semibold text-gray-900">{order.dental_labs.name}</p>
                {order.dental_labs.phone && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" /> {order.dental_labs.phone}
                  </p>
                )}
                {order.dental_labs.email && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" /> {order.dental_labs.email}
                  </p>
                )}
                {order.dental_labs.address && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" /> {order.dental_labs.address}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Notes
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Timeline
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Created</span>
                <span className="font-medium text-gray-900">{formatDate(order.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Due Date</span>
                <span className={`font-medium ${isOverdue() ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(order.due_date)}
                </span>
              </div>
              {order.delivery_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Delivered</span>
                  <span className="font-medium text-green-600">{formatDate(order.delivery_date)}</span>
                </div>
              )}
              {order.estimated_cost && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Estimated Cost</span>
                  <span className="font-medium text-gray-900">
                    ${parseFloat(order.estimated_cost).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Update Status
            </h2>

            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => updateStatus(key)}
                  disabled={updating || order.status === key}
                  className={`w-full px-4 py-2 rounded-lg text-left text-sm font-medium transition-colors disabled:opacity-50 ${
                    order.status === key
                      ? `${config.color} ring-2 ring-offset-1`
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {config.icon} {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-purple-50 rounded-xl p-4 print:hidden">
            <h3 className="font-medium text-purple-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/patients/${order.patient_id}`)}
                className="w-full text-left text-sm text-purple-700 hover:text-purple-900 py-1"
              >
                → View Patient Profile
              </button>
              <button
                onClick={() => navigate('/lab-orders/new')}
                className="w-full text-left text-sm text-purple-700 hover:text-purple-900 py-1"
              >
                → Create New Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabOrderView;
