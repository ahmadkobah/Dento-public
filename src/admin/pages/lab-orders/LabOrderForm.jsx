import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search,
  User,
  AlertCircle,
  FlaskConical,
  Calendar
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { escapeSearchTerm, validateStatusTransition, getAllowedTransitions } from '../../../utils/validation';
import { useTenant } from '../../contexts/TenantContext';

const WORK_TYPES = [
  'Crown',
  'Bridge',
  'Denture - Full',
  'Denture - Partial',
  'Implant Crown',
  'Veneer',
  'Inlay/Onlay',
  'Night Guard',
  'Retainer',
  'Orthodontic Appliance',
  'Surgical Guide',
  'Custom Tray',
  'Other',
];

const MATERIALS = [
  'Porcelain Fused to Metal (PFM)',
  'Zirconia',
  'E-max',
  'Full Cast Gold',
  'Acrylic',
  'Flexible Denture Material',
  'PMMA',
  'Titanium',
  'Chrome Cobalt',
  'Other',
];

const SHADES = [
  'A1', 'A2', 'A3', 'A3.5', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D2', 'D3', 'D4',
  'Bleach 1', 'Bleach 2', 'Bleach 3', 'Bleach 4',
];

const LabOrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { tenantId } = useTenant();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    lab_id: '',
    order_type_id: '',
    teeth_involved: '',
    shade: '',
    material: '',
    specifications: '',
    special_instructions: '',
    status: 'placed',
    due_date: '',
    cost: '',
    notes: '',
  });
  
  // Issue #27: Track original status for state machine validation
  const [originalStatus, setOriginalStatus] = useState('placed');
  
  // Get allowed status transitions
  const allowedStatuses = isEditing
    ? [originalStatus, ...getAllowedTransitions('lab_order', originalStatus)]
    : ['placed'];

  // Reference data
  const [labs, setLabs] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [orderTypes, setOrderTypes] = useState([]);
  
  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Teeth selection
  const [showTeethSelector, setShowTeethSelector] = useState(false);

  // Load initial data
  useEffect(() => {
    loadLabs();
    loadDoctors();
    loadOrderTypes();
    if (isEditing) {
      loadOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing, tenantId]);

  const loadLabs = async () => {
    const { data } = await supabase
      .from('dental_labs')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setLabs(data || []);
  };

  const loadOrderTypes = async () => {
    const { data } = await supabase
      .from('lab_order_types')
      .select('*')
      .eq('is_active', true)
      .order('name_en');
    setOrderTypes(data || []);
  };

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

  const loadOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const currentStatus = data.status || 'placed';
      setOriginalStatus(currentStatus); // Store for state machine validation
      
      setFormData({
        patient_id: data.patient_id || '',
        doctor_id: data.doctor_id || '',
        lab_id: data.lab_id || '',
        order_type_id: data.order_type_id || '',
        teeth_involved: data.teeth_involved || '',
        shade: data.shade || '',
        material: data.material || '',
        specifications: data.specifications || '',
        special_instructions: data.special_instructions || '',
        status: currentStatus,
        due_date: data.due_date ? data.due_date.split('T')[0] : '',
        cost: data.cost || '',
        notes: data.notes || '',
      });

      if (data.patients) {
        setSelectedPatient(data.patients);
        setPatientSearch(getPatientName(data.patients));
      }
    } catch (error) {
      console.error('Error loading lab order:', error);
      setMessage({ type: 'error', text: 'Failed to load lab order' });
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

  // Teeth selection
  const toggleTooth = (tooth) => {
    const currentTeeth = formData.teeth_involved ? formData.teeth_involved.split(',').map(t => t.trim()).filter(Boolean) : [];
    const toothStr = tooth.toString();
    const newTeeth = currentTeeth.includes(toothStr)
      ? currentTeeth.filter(t => t !== toothStr)
      : [...currentTeeth, toothStr].sort((a, b) => parseInt(a) - parseInt(b));
    setFormData(prev => ({
      ...prev,
      teeth_involved: newTeeth.join(', ')
    }));
  };

  const TEETH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const TEETH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.patient_id) {
      setMessage({ type: 'error', text: 'Please select a patient' });
      return;
    }

    if (!formData.doctor_id) {
      setMessage({ type: 'error', text: 'Please select a doctor' });
      return;
    }

    // Issue #27: Validate status transition
    if (isEditing && formData.status !== originalStatus) {
      const validation = validateStatusTransition('lab_order', originalStatus, formData.status);
      if (!validation.valid) {
        setMessage({ type: 'error', text: validation.error });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        patient_id: formData.patient_id,
        doctor_id: formData.doctor_id,
        lab_id: formData.lab_id || null,
        order_type_id: formData.order_type_id || null,
        teeth_involved: formData.teeth_involved || null,
        shade: formData.shade || null,
        material: formData.material || null,
        specifications: formData.specifications || null,
        special_instructions: formData.special_instructions || null,
        status: formData.status || 'placed',
        due_date: formData.due_date || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        notes: formData.notes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('lab_orders')
          .update(payload)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lab_orders')
          .insert(payload);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: `Lab order ${isEditing ? 'updated' : 'created'} successfully` });
      setTimeout(() => navigate('/lab-orders'), 1000);
    } catch (error) {
      console.error('Error saving lab order:', error);
      setMessage({ type: 'error', text: 'Failed to save lab order' });
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
              {isEditing ? 'Edit Lab Order' : 'New Lab Order'}
            </h1>
            <p className="text-gray-500">
              {isEditing ? 'Update lab order details' : 'Create a new dental lab order'}
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
          {/* Patient & Doctor */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Patient & Provider
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patient <span className="text-red-500">*</span>
                </label>
                
                {selectedPatient ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{getPatientName(selectedPatient)}</p>
                      <p className="text-xs text-gray-500">{selectedPatient.phone}</p>
                    </div>
                    <button type="button" onClick={clearPatient} className="text-xs text-green-600 hover:text-green-700">
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                      onFocus={() => setShowPatientDropdown(true)}
                      placeholder="Search patient..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                    
                    {showPatientDropdown && (patientResults.length > 0 || searchingPatient) && (
                      <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-auto">
                        {searchingPatient ? (
                          <div className="p-3 text-center text-gray-500"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                        ) : (
                          patientResults.map((patient) => (
                            <button key={patient.id} type="button" onClick={() => selectPatient(patient)}
                              className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 text-left text-sm">
                              <User className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="font-medium">{getPatientName(patient)}</p>
                                <p className="text-xs text-gray-500">{patient.phone}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.doctor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, doctor_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                  required
                >
                  <option value="">Select doctor...</option>
                  {doctors.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name_en || doc.name_ar}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Work Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-gray-400" />
              Work Details
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Order Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Type
                  </label>
                  <select
                    value={formData.order_type_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_type_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="">Select type...</option>
                    {orderTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name_en}</option>
                    ))}
                  </select>
                </div>

                {/* Lab */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dental Lab</label>
                  <select
                    value={formData.lab_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, lab_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="">Select lab...</option>
                    {labs.map(lab => (
                      <option key={lab.id} value={lab.id}>{lab.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Teeth Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teeth</label>
                <button type="button" onClick={() => setShowTeethSelector(!showTeethSelector)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-left text-sm hover:bg-gray-50">
                  {formData.teeth_involved ? `Selected: ${formData.teeth_involved}` : 'Click to select teeth...'}
                </button>
                
                {showTeethSelector && (
                  <div className="mt-2 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-xs text-gray-500 mb-2 text-center">Upper Jaw</p>
                    <div className="flex justify-center gap-1 mb-4">
                      {TEETH_UPPER.map(tooth => {
                        const currentTeeth = formData.teeth_involved ? formData.teeth_involved.split(',').map(t => t.trim()) : [];
                        return (
                        <button key={tooth} type="button" onClick={() => toggleTooth(tooth)}
                          className={`w-7 h-7 text-xs rounded ${
                            currentTeeth.includes(tooth.toString()) ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'
                          }`}>{tooth}</button>
                      )})}
                    </div>
                    <p className="text-xs text-gray-500 mb-2 text-center">Lower Jaw</p>
                    <div className="flex justify-center gap-1">
                      {TEETH_LOWER.map(tooth => {
                        const currentTeeth = formData.teeth_involved ? formData.teeth_involved.split(',').map(t => t.trim()) : [];
                        return (
                        <button key={tooth} type="button" onClick={() => toggleTooth(tooth)}
                          className={`w-7 h-7 text-xs rounded ${
                            currentTeeth.includes(tooth.toString()) ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-100'
                          }`}>{tooth}</button>
                      )})}
                    </div>
                  </div>
                )}
              </div>

              {/* Shade & Material */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shade</label>
                  <select value={formData.shade} onChange={(e) => setFormData(prev => ({ ...prev, shade: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm">
                    <option value="">Select shade...</option>
                    {SHADES.map(shade => <option key={shade} value={shade}>{shade}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                  <select value={formData.material} onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm">
                    <option value="">Select material...</option>
                    {MATERIALS.map(mat => <option key={mat} value={mat}>{mat}</option>)}
                  </select>
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                <textarea value={formData.special_instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                  rows={3} placeholder="Any special instructions for the lab..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Dates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Status & Timeline
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500">
                  {allowedStatuses.includes('placed') && <option value="placed">📋 Placed</option>}
                  {allowedStatuses.includes('in_fabrication') && <option value="in_fabrication">⏳ In Fabrication</option>}
                  {allowedStatuses.includes('on_hold') && <option value="on_hold">⏸️ On Hold</option>}
                  {allowedStatuses.includes('ready') && <option value="ready">✅ Ready</option>}
                  {allowedStatuses.includes('delivered') && <option value="delivered">📦 Delivered</option>}
                  {allowedStatuses.includes('adjustment_needed') && <option value="adjustment_needed">🔧 Adjustment Needed</option>}
                  {allowedStatuses.includes('completed') && <option value="completed">✓ Completed</option>}
                  {allowedStatuses.includes('cancelled') && <option value="cancelled">❌ Cancelled</option>}
                </select>
                {isEditing && allowedStatuses.length <= 1 && (
                  <p className="text-xs text-gray-500 mt-1">Status cannot be changed (terminal state)</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                <input type="number" value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0.00" step="0.01" min="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <textarea value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4} placeholder="Internal notes..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>

          {/* Info Box */}
          <div className="bg-purple-50 rounded-xl p-4">
            <h3 className="font-medium text-purple-800 mb-2">Lab Order Tips</h3>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Always specify shade and material</li>
              <li>• Include clear instructions</li>
              <li>• Set realistic due dates</li>
              <li>• Track status updates</li>
            </ul>
          </div>
        </div>
      </div>
    </form>
  );
};

export default LabOrderForm;
