import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Eye,
  Loader2,
  MoreVertical,
  RefreshCw,
  User,
  ImageIcon,
  AlertCircle,
  CheckCircle,
  Trash2,
  Download,
  Edit,
  ScanLine,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const XrayList = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [xrays, setXrays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [message, setMessage] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [xrayTypes, setXrayTypes] = useState([]);

  const fetchXrays = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('xrays')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone),
          doctors:doctor_id (id, name_en, name_ar),
          xray_types:xray_type_id (id, name_en, name_ar)
        `)
        .order('created_at', { ascending: false })
        .eq('tenant_id', tenantId);

      // Apply type filter
      if (typeFilter !== 'all') {
        query = query.eq('xray_type_id', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply search filter client-side
      let filtered = data || [];
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(x => {
          const patientName = getPatientName(x.patients).toLowerCase();
          const doctorName = (x.doctors?.name_en || x.doctors?.name_ar || '').toLowerCase();
          const typeName = (x.xray_types?.name_en || x.xray_types?.name_ar || '').toLowerCase();
          return patientName.includes(search) || 
                 doctorName.includes(search) ||
                 typeName.includes(search);
        });
      }

      setXrays(filtered);
    } catch (error) {
      console.error('Error fetching x-rays:', error);
      setMessage({ type: 'error', text: 'Failed to load x-rays' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, typeFilter, tenantId]);

  const fetchXrayTypes = async () => {
    const { data } = await supabase
      .from('xray_types')
      .select('*')
      .eq('is_active', true)
      .eq('tenant_id', tenantId)
      .order('name_en');
    setXrayTypes(data || []);
  };

  useEffect(() => {
    fetchXrays();
    fetchXrayTypes();
  }, [fetchXrays]);

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown Patient';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this x-ray record?')) return;
    
    setDeleting(id);
    try {
      const { error } = await supabase.from('xrays').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
      
      setXrays(prev => prev.filter(x => x.id !== id));
      setMessage({ type: 'success', text: 'X-ray record deleted successfully' });
    } catch (error) {
      console.error('Error deleting x-ray:', error);
      setMessage({ type: 'error', text: 'Failed to delete x-ray record' });
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
            <h1 className="text-2xl font-bold text-gray-900">X-Ray Management</h1>
            <p className="text-gray-500 mt-1">Manage patient x-rays and imaging records</p>
          </div>
        </div>
        <Link
          to="/xrays/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New X-Ray Order
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
              placeholder="Search by patient, doctor, or x-ray type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              {xrayTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name_en || type.name_ar}</option>
              ))}
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchXrays}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* X-Ray List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : xrays.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No X-Rays Found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              {searchTerm || typeFilter !== 'all'
                ? 'No x-rays match your search criteria.'
                : 'Create your first x-ray order to get started.'}
            </p>
            <Link
              to="/xrays/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              New X-Ray Order
            </Link>
          </div>
        ) : (
          <div className="overflow-visible">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    X-Ray Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tooth #
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {xrays.map((xray) => {
                  return (
                    <tr key={xray.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{getPatientName(xray.patients)}</p>
                            {xray.patients?.phone && (
                              <p className="text-sm text-gray-500">{xray.patients.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ScanLine className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="font-medium text-gray-900">{xray.xray_types?.name_en || xray.xray_types?.name_ar || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">
                          {xray.doctors?.name_en || xray.doctors?.name_ar || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{formatDate(xray.captured_at || xray.created_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">
                          {xray.tooth_number ? `#${xray.tooth_number}` : '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/xrays/${xray.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-500" />
                          </Link>
                          {xray.image_url && (
                            <a
                              href={xray.image_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download className="w-4 h-4 text-gray-500" />
                            </a>
                          )}
                          
                          {/* More Actions */}
                          <div className="relative">
                            <button
                              onClick={() => setMenuOpen(menuOpen === xray.id ? null : xray.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            
                            {menuOpen === xray.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                                <Link
                                  to={`/xrays/edit/${xray.id}`}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </Link>
                                <hr className="my-1" />
                                <button
                                  onClick={() => handleDelete(xray.id)}
                                  disabled={deleting === xray.id}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  {deleting === xray.id ? (
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

export default XrayList;
