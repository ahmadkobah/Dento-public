import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search,
  User,
  X,
  AlertCircle,
  Box
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { escapeSearchTerm } from '../../../utils/validation';
import { useTenant } from '../../contexts/TenantContext';

const CbctForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { tenantId } = useTenant();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state - for order
  const [formData, setFormData] = useState({
    patient_id: '',
    requesting_doctor_id: '',
    scan_region_id: '',
    indication: '',
    clinical_notes: '',
    priority: 'normal',
    scheduled_date: '',
    status: 'requested',
  });

  // Reference data
  const [doctors, setDoctors] = useState([]);
  const [scanRegions, setScanRegions] = useState([]);
  
  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDoctors();
    loadScanRegions();
    if (isEditing) {
      loadOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing, tenantId]);

  const loadDoctors = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('doctors')
      .select('id, name_en, name_ar')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setDoctors(data || []);
  };

  const loadScanRegions = async () => {
    const { data } = await supabase
      .from('cbct_scan_regions')
      .select('*')
      .eq('is_active', true)
      .order('name_en');
    setScanRegions(data || []);
  };

  const loadOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cbct_orders')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email),
          cbct_scans (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        patient_id: data.patient_id || '',
        requesting_doctor_id: data.requesting_doctor_id || '',
        scan_region_id: data.scan_region_id || '',
        indication: data.indication || '',
        clinical_notes: data.clinical_notes || '',
        priority: data.priority || 'normal',
        scheduled_date: data.scheduled_date || '',
        status: data.status || 'requested',
      });

      if (data.patients) {
        setSelectedPatient(data.patients);
        setPatientSearch(getPatientName(data.patients));
      }
    } catch (error) {
      console.error('Error loading CBCT order:', error);
      setMessage({ type: 'error', text: 'Failed to load CBCT order' });
    } finally {
      setLoading(false);
    }
  };

  const getPatientName = (patient) => {
    if (!patient) return '';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
  };

  // Patient search
  const searchPatients = useCallback(async (search) => {
    if (!search || search.length < 2) {
      setPatientResults([]);
      return;
    }

    setSearchingPatient(true);
    try {
      if (!tenantId) return;
      const safeSearch = escapeSearchTerm(search);
      const { data } = await supabase
        .from('patients')
        .select('id, name, first_name, last_name, phone, email')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.%${safeSearch}%,first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`)
        .limit(10);
      
      setPatientResults(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setSearchingPatient(false);
    }
  }, [tenantId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearch && !selectedPatient) {
        searchPatients(patientSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, selectedPatient, searchPatients]);

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patient_id: patient.id }));
    setPatientSearch(getPatientName(patient));
    setPatientResults([]);
    setShowPatientDropdown(false);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setFormData(prev => ({ ...prev, patient_id: '' }));
    setPatientSearch('');
    setPatientResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.patient_id) {
      setMessage({ type: 'error', text: 'Please select a patient' });
      return;
    }

    if (!formData.requesting_doctor_id) {
      setMessage({ type: 'error', text: 'Please select a doctor' });
      return;
    }

    setSaving(true);
    try {
      const orderPayload = {
        patient_id: formData.patient_id,
        requesting_doctor_id: formData.requesting_doctor_id,
        scan_region_id: formData.scan_region_id || null,
        indication: formData.indication || null,
        clinical_notes: formData.clinical_notes || null,
        priority: formData.priority || 'normal',
        scheduled_date: formData.scheduled_date || null,
        status: formData.status || 'requested',
      };

      if (isEditing) {
        const { error } = await supabase
          .from('cbct_orders')
          .update(orderPayload)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cbct_orders')
          .insert(orderPayload);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: `CBCT order ${isEditing ? 'updated' : 'created'} successfully` });
      setTimeout(() => navigate('/cbct'), 1000);
    } catch (error) {
      console.error('Error saving CBCT order:', error);
      setMessage({ type: 'error', text: 'Failed to save CBCT scan' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit CBCT Scan' : 'New CBCT Order'}
            </h1>
            <p className="text-gray-500">
              {isEditing ? 'Update CBCT scan details' : 'Create a new CBCT scan order'}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <AlertCircle className="w-5 h-5" />
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Patient Information
            </h2>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient <span className="text-red-500">*</span>
              </label>
              
              {selectedPatient ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{getPatientName(selectedPatient)}</p>
                    <p className="text-sm text-gray-500">{selectedPatient.phone || selectedPatient.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearPatient}
                    className="p-1 hover:bg-green-100 rounded"
                  >
                    <X className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    placeholder="Search patient by name or phone..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  
                  {showPatientDropdown && (patientResults.length > 0 || searchingPatient) && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
                      {searchingPatient ? (
                        <div className="p-3 text-center text-gray-500">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        </div>
                      ) : (
                        patientResults.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => selectPatient(patient)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                          >
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{getPatientName(patient)}</p>
                              <p className="text-sm text-gray-500">{patient.phone}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Scan Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Box className="w-5 h-5 text-gray-400" />
              Order Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Doctor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requesting Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.requesting_doctor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, requesting_doctor_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select doctor...</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name_en || doc.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="requested">Requested</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="reported">Reported</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Region */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scan Region</label>
                <select
                  value={formData.scan_region_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, scan_region_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select region...</option>
                  {scanRegions.map(region => (
                    <option key={region.id} value={region.id}>
                      {region.name_en || region.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Scheduled Date */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Indication (Reason) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Indication / Reason for Scan</label>
                <input
                  type="text"
                  value={formData.indication}
                  onChange={(e) => setFormData(prev => ({ ...prev, indication: e.target.value }))}
                  placeholder="e.g., Implant planning, TMJ evaluation..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Clinical Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes</label>
                <textarea
                  value={formData.clinical_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, clinical_notes: e.target.value }))}
                  rows={3}
                  placeholder="Clinical details and notes..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Info Box */}
        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-purple-50 rounded-xl p-4">
            <h3 className="font-medium text-purple-800 mb-2">About CBCT Orders</h3>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• 3D imaging for detailed dental analysis</li>
              <li>• Essential for implant planning</li>
              <li>• TMJ and sinus evaluation</li>
              <li>• Lower radiation than medical CT</li>
            </ul>
          </div>
        </div>
      </div>
    </form>
  );
};

export default CbctForm;
