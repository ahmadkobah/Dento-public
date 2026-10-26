import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search,
  Plus,
  Trash2,
  User,
  Calendar,
  Pill,
  AlertCircle,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { escapeSearchTerm } from '../../../utils/validation';
import { useTenant } from '../../contexts/TenantContext';

const FREQUENCY_OPTIONS = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily (BID)' },
  { value: 'three_times_daily', label: 'Three times daily (TID)' },
  { value: 'four_times_daily', label: 'Four times daily (QID)' },
  { value: 'every_4_hours', label: 'Every 4 hours' },
  { value: 'every_6_hours', label: 'Every 6 hours' },
  { value: 'every_8_hours', label: 'Every 8 hours' },
  { value: 'every_12_hours', label: 'Every 12 hours' },
  { value: 'as_needed', label: 'As needed (PRN)' },
  { value: 'before_meals', label: 'Before meals' },
  { value: 'after_meals', label: 'After meals' },
  { value: 'at_bedtime', label: 'At bedtime' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'other', label: 'Other (specify)' },
];

const DURATION_OPTIONS = [
  { value: '3_days', label: '3 days' },
  { value: '5_days', label: '5 days' },
  { value: '7_days', label: '7 days (1 week)' },
  { value: '10_days', label: '10 days' },
  { value: '14_days', label: '14 days (2 weeks)' },
  { value: '21_days', label: '21 days (3 weeks)' },
  { value: '30_days', label: '30 days (1 month)' },
  { value: '60_days', label: '60 days (2 months)' },
  { value: '90_days', label: '90 days (3 months)' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'other', label: 'Other (specify)' },
];

const PrescriptionForm = () => {
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
    prescribed_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    diagnosis: '',
    notes: '',
    status: 'active',
  });

  const [items, setItems] = useState([
    { 
      medication_id: null,
      medication_name: '', 
      dosage: '', 
      frequency: 'twice_daily', 
      duration: '7_days',
      quantity: '',
      instructions: '',
    }
  ]);

  // Reference data
  const [doctors, setDoctors] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [medications, setMedications] = useState([]);
  
  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  
  // Medication search for each item
  const [medSearchIndex, setMedSearchIndex] = useState(null);
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [searchingMed, setSearchingMed] = useState(false);

  // Load initial data
  useEffect(() => {
    if (!tenantId) return;
    loadDoctors();
    loadMedications();
    if (isEditing) {
      loadPrescription();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing, tenantId]);

  const loadDoctors = async () => {
    const { data } = await supabase
      .from('doctors')
      .select('id, name_en, name_ar')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setDoctors(data || []);
  };

  const loadMedications = async () => {
    const { data } = await supabase
      .from('medications')
      .select('*')
      .eq('is_active', true)
      .order('name');
    setMedications(data || []);
  };

  const loadPrescription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email),
          prescription_items (*)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      setFormData({
        patient_id: data.patient_id || '',
        doctor_id: data.doctor_id || '',
        prescribed_date: data.prescribed_date || '',
        valid_until: data.valid_until || '',
        diagnosis: data.diagnosis || '',
        notes: data.notes || '',
        status: data.status || 'active',
      });

      if (data.patients) {
        setSelectedPatient(data.patients);
        setPatientSearch(getPatientName(data.patients));
      }

      if (data.prescription_items?.length > 0) {
        setItems(data.prescription_items.map(item => ({
          id: item.id,
          medication_id: item.medication_id,
          medication_name: item.medication_name || '',
          dosage: item.dosage || '',
          frequency: item.frequency || 'twice_daily',
          duration: item.duration || '7_days',
          quantity: item.quantity || '',
          instructions: item.instructions || '',
        })));
      }
    } catch (error) {
      console.error('Error loading prescription:', error);
      setMessage({ type: 'error', text: 'Failed to load prescription' });
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

  // Medication search
  const searchMedications = useCallback(async (search) => {
    if (!search || search.length < 2) {
      setMedResults([]);
      return;
    }

    setSearchingMed(true);
    try {
      const safeSearch = escapeSearchTerm(search);
      const { data } = await supabase
        .from('medications')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${safeSearch}%`)
        .limit(10);
      
      setMedResults(data || []);
    } catch (error) {
      console.error('Error searching medications:', error);
    } finally {
      setSearchingMed(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (medSearch && medSearchIndex !== null) {
        searchMedications(medSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [medSearch, medSearchIndex, searchMedications]);

  const selectMedication = (medication, index) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      medication_id: medication.id,
      medication_name: medication.name,
      dosage: medication.default_dosage || newItems[index].dosage,
      frequency: medication.default_frequency || newItems[index].frequency,
      instructions: medication.instructions || newItems[index].instructions,
    };
    setItems(newItems);
    setMedSearchIndex(null);
    setMedSearch('');
    setMedResults([]);
  };

  // Item management
  const addItem = () => {
    setItems([...items, {
      medication_id: null,
      medication_name: '',
      dosage: '',
      frequency: 'twice_daily',
      duration: '7_days',
      quantity: '',
      instructions: '',
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.patient_id) {
      setMessage({ type: 'error', text: 'Please select a patient' });
      return;
    }

    if (!formData.doctor_id) {
      setMessage({ type: 'error', text: 'Please select a prescribing doctor' });
      return;
    }

    const validItems = items.filter(item => item.medication_name.trim());
    if (validItems.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one medication' });
      return;
    }

    setSaving(true);
    try {
      let prescriptionId = id;

      if (isEditing) {
        // Update prescription
        const { error } = await supabase
          .from('prescriptions')
          .update({
            patient_id: formData.patient_id,
            doctor_id: formData.doctor_id,
            prescribed_date: formData.prescribed_date,
            valid_until: formData.valid_until || null,
            diagnosis: formData.diagnosis || null,
            notes: formData.notes || null,
            status: formData.status,
          })
          .eq('id', id)
          .eq('tenant_id', tenantId);

        if (error) throw error;

        // Delete existing items and re-insert
        await supabase.from('prescription_items').delete().eq('prescription_id', id);
      } else {
        // Create prescription
        const { data, error } = await supabase
          .from('prescriptions')
          .insert({
            tenant_id: tenantId,
            patient_id: formData.patient_id,
            doctor_id: formData.doctor_id,
            prescribed_date: formData.prescribed_date,
            valid_until: formData.valid_until || null,
            diagnosis: formData.diagnosis || null,
            notes: formData.notes || null,
            status: formData.status,
          })
          .select()
          .single();

        if (error) throw error;
        prescriptionId = data.id;
      }

      // Insert items
      const itemsToInsert = validItems.map((item, index) => ({
        prescription_id: prescriptionId,
        medication_id: item.medication_id,
        medication_name: item.medication_name,
        dosage: item.dosage || null,
        frequency: item.frequency || null,
        duration: item.duration || null,
        quantity: item.quantity ? parseInt(item.quantity) : null,
        instructions: item.instructions || null,
        sequence_order: index + 1,
      }));

      const { error: itemsError } = await supabase
        .from('prescription_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      setMessage({ type: 'success', text: `Prescription ${isEditing ? 'updated' : 'created'} successfully` });
      setTimeout(() => navigate('/prescriptions'), 1000);
    } catch (error) {
      console.error('Error saving prescription:', error);
      setMessage({ type: 'error', text: 'Failed to save prescription' });
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
              {isEditing ? 'Edit Prescription' : 'New Prescription'}
            </h1>
            <p className="text-gray-500">
              {isEditing ? 'Update prescription details' : 'Create a new prescription for a patient'}
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
          {saving ? 'Saving...' : 'Save Prescription'}
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

          {/* Medications */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-gray-400" />
                Medications
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Add Medication
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Medication #{index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Medication Name */}
                    <div className="md:col-span-2 relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Medication Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.medication_name}
                        onChange={(e) => {
                          updateItem(index, 'medication_name', e.target.value);
                          setMedSearchIndex(index);
                          setMedSearch(e.target.value);
                        }}
                        onFocus={() => {
                          setMedSearchIndex(index);
                          setMedSearch(item.medication_name);
                        }}
                        placeholder="Type to search or enter medication name..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        required
                      />
                      
                      {medSearchIndex === index && medResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-auto">
                          {medResults.map((med) => (
                            <button
                              key={med.id}
                              type="button"
                              onClick={() => selectMedication(med, index)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                            >
                              <Pill className="w-4 h-4 text-purple-500" />
                              <div>
                                <p className="font-medium text-gray-900">{med.name}</p>
                                {med.default_dosage && (
                                  <p className="text-xs text-gray-500">{med.default_dosage}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dosage */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                        placeholder="e.g., 500mg, 10ml"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        placeholder="e.g., 30"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        min="1"
                      />
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                      <select
                        value={item.frequency}
                        onChange={(e) => updateItem(index, 'frequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        {FREQUENCY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                      <select
                        value={item.duration}
                        onChange={(e) => updateItem(index, 'duration', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      >
                        {DURATION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Instructions */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                      <input
                        type="text"
                        value={item.instructions}
                        onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                        placeholder="e.g., Take with food, avoid dairy..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Doctor & Dates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Prescription Details
            </h2>

            <div className="space-y-4">
              {/* Doctor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prescribing Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.doctor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, doctor_id: e.target.value }))}
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

              {/* Prescribed Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prescribed Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.prescribed_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, prescribed_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              {/* Valid Until */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="filled">Filled</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Diagnosis & Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>

            <div className="space-y-4">
              {/* Diagnosis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                <input
                  type="text"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Enter diagnosis..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default PrescriptionForm;
