import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Eye,
  Printer,
  Loader2,
  MoreVertical,
  RefreshCw,
  Filter,
  Calendar,
  User,
  Pill as PillIcon,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  Copy,
  Edit,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  filled: { label: 'Filled', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-700', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const PrescriptionList = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [message, setMessage] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const fetchPrescriptions = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone),
          doctors:doctor_id (id, name_en, name_ar),
          prescription_items (
            id,
            medication_id,
            medication_name,
            dosage,
            frequency,
            duration,
            quantity
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          default:
            startDate = null;
        }
        
        if (startDate) {
          query = query.gte('prescribed_date', startDate.toISOString().split('T')[0]);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply search filter client-side for patient name
      let filtered = data || [];
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(p => {
          const patientName = getPatientName(p.patients).toLowerCase();
          const doctorName = (p.doctors?.name_en || p.doctors?.name_ar || '').toLowerCase();
          return patientName.includes(search) || 
                 doctorName.includes(search) ||
                 p.prescription_number?.toLowerCase().includes(search);
        });
      }

      setPrescriptions(filtered);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      setMessage({ type: 'error', text: 'Failed to load prescriptions' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, dateFilter, tenantId]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown Patient';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this prescription?')) return;
    
    setDeleting(id);
    try {
      // Delete items first
      await supabase.from('prescription_items').delete().eq('prescription_id', id);
      // Delete prescription
      const { error } = await supabase.from('prescriptions').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
      
      setPrescriptions(prev => prev.filter(p => p.id !== id));
      setMessage({ type: 'success', text: 'Prescription deleted successfully' });
    } catch (error) {
      console.error('Error deleting prescription:', error);
      setMessage({ type: 'error', text: 'Failed to delete prescription' });
    } finally {
      setDeleting(null);
      setMenuOpen(null);
    }
  };

  const handleDuplicate = async (prescription) => {
    try {
      // Create a new prescription based on the existing one
      const { data: newPrescription, error: presError } = await supabase
        .from('prescriptions')
        .insert({
          tenant_id: tenantId,
          patient_id: prescription.patient_id,
          doctor_id: prescription.doctor_id,
          prescribed_date: new Date().toISOString().split('T')[0],
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          diagnosis: prescription.diagnosis,
          notes: prescription.notes,
          status: 'active',
        })
        .select()
        .single();

      if (presError) throw presError;

      // Duplicate items
      if (prescription.prescription_items?.length > 0) {
        const items = prescription.prescription_items.map(item => ({
          prescription_id: newPrescription.id,
          medication_id: item.medication_id,
          medication_name: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('prescription_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      setMessage({ type: 'success', text: 'Prescription duplicated successfully' });
      fetchPrescriptions();
    } catch (error) {
      console.error('Error duplicating prescription:', error);
      setMessage({ type: 'error', text: 'Failed to duplicate prescription' });
    } finally {
      setMenuOpen(null);
    }
  };

  const handlePrint = (prescription) => {
    // Open in new window for printing
    window.open(`/prescriptions/${prescription.id}/print`, '_blank');
    setMenuOpen(null);
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
            <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
            <p className="text-gray-500 mt-1">Manage patient prescriptions and medications</p>
          </div>
        </div>
        <Link
          to="/prescriptions/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Prescription
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
              placeholder="Search by patient, doctor, or prescription #..."
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
              <option value="active">Active</option>
              <option value="filled">Filled</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchPrescriptions}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PillIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Prescriptions Found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'No prescriptions match your search criteria.'
                : 'Create your first prescription to get started.'}
            </p>
            <Link
              to="/prescriptions/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              New Prescription
            </Link>
          </div>
        ) : (
          <div className="overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Prescription #
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Medications
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
                {prescriptions.map((prescription) => {
                  const status = STATUS_CONFIG[prescription.status] || STATUS_CONFIG.active;
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr key={prescription.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-600">
                          {prescription.prescription_number || `RX-${prescription.id.slice(0, 8).toUpperCase()}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{getPatientName(prescription.patients)}</p>
                            {prescription.patients?.phone && (
                              <p className="text-sm text-gray-500">{prescription.patients.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">
                          {prescription.doctors?.name_en || prescription.doctors?.name_ar || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{formatDate(prescription.prescribed_date)}</p>
                        {prescription.valid_until && (
                          <p className="text-xs text-gray-500">
                            Valid until: {formatDate(prescription.valid_until)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {prescription.prescription_items?.slice(0, 2).map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs"
                            >
                              <PillIcon className="w-3 h-3 mr-1" />
                              {item.medication_name}
                            </span>
                          ))}
                          {prescription.prescription_items?.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{prescription.prescription_items.length - 2} more
                            </span>
                          )}
                        </div>
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
                            to={`/prescriptions/${prescription.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Link>
                          <button
                            onClick={() => handlePrint(prescription)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Print"
                          >
                            <Printer className="w-4 h-4 text-gray-500" />
                          </button>
                          
                          {/* More Actions */}
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpen(menuOpen === prescription.id ? null : prescription.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            
                            {menuOpen === prescription.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                                <Link
                                  to={`/prescriptions/edit/${prescription.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </Link>
                                <button
                                  onClick={() => handleDuplicate(prescription)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Copy className="w-4 h-4" />
                                  Duplicate
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => handleDelete(prescription.id)}
                                  disabled={deleting === prescription.id}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  {deleting === prescription.id ? (
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

export default PrescriptionList;
