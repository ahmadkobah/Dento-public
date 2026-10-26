import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search,
  User,
  FileText,
  Stethoscope,
  Package,
  X,
  AlertTriangle,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import MaterialSelector from '../../components/MaterialSelector';
import DentalChartMini, { FDI_TO_UNIVERSAL, UNIVERSAL_TO_FDI, CONDITIONS } from '../../components/DentalChartMini';

const PROCEDURE_TYPES = [
  'Extraction',
  'Root Canal',
  'Crown Preparation',
  'Bridge Work',
  'Implant Placement',
  'Implant Restoration',
  'Scaling & Polishing',
  'Deep Cleaning',
  'Filling',
  'Veneer Placement',
  'Denture Fitting',
  'Orthodontic Adjustment',
  'Periodontal Surgery',
  'Biopsy',
  'TMJ Treatment',
  'Other',
];

const ProcedureNoteForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { data: identity } = useGetIdentity();
  const { tenantId } = useTenant();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Materials state
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    template_id: '',
    procedure_name: '',
    teeth_involved: '',
    procedure_performed: '',
    anesthesia_used: '',
    materials_used: '',
    complications: '',
    post_op_instructions: '',
    follow_up_required: false,
    follow_up_date: '',
    notes: '',
    notice: '',
  });

  // Reference data
  const [templates, setTemplates] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  
  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Teeth selection
  const [showTeethSelector, setShowTeethSelector] = useState(false);
  const [patientTeethData, setPatientTeethData] = useState({});

  // === Per-tooth entries (Fix 9.2) ===
  // Each entry: { toothNumber (FDI string), procedureType, surface, notes }
  const [toothEntries, setToothEntries] = useState([]);

  // === Per-tooth history (Fix 9.3) ===
  const [toothHistory, setToothHistory] = useState([]); // history for clicked tooth
  const [historyTooth, setHistoryTooth] = useState(null); // which tooth's history is showing
  const [pastSessions, setPastSessions] = useState([]); // all past procedure_notes for this patient
  const [showPastSessions, setShowPastSessions] = useState(false);
  const [viewingSession, setViewingSession] = useState(null); // viewing a past session's details

  // Load patient dental chart data when patient changes
  useEffect(() => {
    const loadTeethData = async () => {
      if (!formData.patient_id) { setPatientTeethData({}); return; }
      const { data } = await supabase
        .from('dental_charts')
        .select('tooth_number, condition, surface, notes, case_label, notice')
        .eq('patient_id', formData.patient_id);
      const teethMap = {};
      data?.forEach(t => { teethMap[t.tooth_number] = t; });
      setPatientTeethData(teethMap);
    };
    loadTeethData();
  }, [formData.patient_id]);

  // Load branches
  useEffect(() => {
    const loadBranches = async () => {
      if (!tenantId) return;
      const { data } = await supabase
        .from('branches')
        .select('id, name_en')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name_en');
      setBranches(data || []);
      
      // Set default branch from user identity
      if (identity?.branch_id && !selectedBranch) {
        setSelectedBranch(identity.branch_id);
      } else if (data && data.length > 0 && !selectedBranch) {
        setSelectedBranch(data[0].id);
      }
    };
    loadBranches();
  }, [identity?.branch_id, selectedBranch, tenantId]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    // Load templates
    const { data: templatesData } = await supabase
      .from('procedure_note_templates')
      .select('*')
      .eq('is_active', true)
      .order('name_en');
    setTemplates(templatesData || []);

    // Load doctors
    const { data: doctorsData } = await supabase
      .from('doctors')
      .select('id, name_en, name_ar, specialty_en')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setDoctors(doctorsData || []);

    // Load patients
    const { data: patientsData } = await supabase
      .from('patients')
      .select('id, name, phone')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');
    
    const patientsFormatted = (patientsData || []).map(p => {
      const nameParts = p.name?.split(' ') || [''];
      return {
        ...p,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        patient_code: p.id?.slice(0, 8).toUpperCase() || '',
      };
    });
    setPatients(patientsFormatted);

    // Load procedure note if editing
    if (isEditing) {
      const { data, error } = await supabase
        .from('procedure_notes')
        .select(`
          *,
          patients:patient_id (id, name, phone)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        setFormData({
          patient_id: data.patient_id || '',
          doctor_id: data.doctor_id || '',
          template_id: data.template_id || '',
          procedure_name: data.procedure_name || '',
          teeth_involved: data.teeth_involved || '',
          procedure_performed: data.procedure_performed || '',
          anesthesia_used: data.anesthesia_used || '',
          materials_used: data.materials_used || '',
          complications: data.complications || '',
          post_op_instructions: data.post_op_instructions || '',
          follow_up_required: data.follow_up_required || false,
          follow_up_date: data.follow_up_date ? data.follow_up_date.split('T')[0] : '',
          notes: data.notes || '',
          notice: data.notice || '',
        });

        // Restore per-tooth entries from teeth_details JSONB
        if (data.teeth_details && Array.isArray(data.teeth_details)) {
          setToothEntries(data.teeth_details);
        } else if (data.teeth_involved) {
          // Backward compat: create entries from comma string
          const entries = data.teeth_involved.split(',').map(t => t.trim()).filter(Boolean).map(fdi => ({
            toothNumber: fdi,
            procedureType: data.procedure_name || '',
            surface: '',
            notes: '',
          }));
          setToothEntries(entries);
        }

        if (data.patients) {
          const nameParts = data.patients.name?.split(' ') || [''];
          setSelectedPatient({
            ...data.patients,
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            patient_code: data.patients.id?.slice(0, 8).toUpperCase() || '',
          });
        }
        
        // Load existing materials for this procedure note
        const { data: materialsData } = await supabase
          .from('procedure_material_usage')
          .select(`
            id,
            inventory_item_id,
            quantity,
            unit_cost,
            branch_id,
            inventory_items:inventory_item_id (name_en, name_ar, sku, unit, selling_price)
          `)
          .eq('procedure_note_id', id);
        
        if (materialsData && materialsData.length > 0) {
          const formattedMaterials = materialsData.map(m => ({
            inventory_item_id: m.inventory_item_id,
            item_name: m.inventory_items?.name_en || '',
            item_name_ar: m.inventory_items?.name_ar || '',
            sku: m.inventory_items?.sku || '',
            unit: m.inventory_items?.unit || '',
            unit_cost: m.unit_cost || 0,
            selling_price: m.inventory_items?.selling_price || 0,
            stock_available: 0,
            quantity: m.quantity
          }));
          setSelectedMaterials(formattedMaterials);
          if (materialsData[0]?.branch_id) {
            setSelectedBranch(materialsData[0].branch_id);
          }
        }
      }
    }

    setLoading(false);
  }, [id, isEditing, tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter patients based on search
  const filteredPatients = patients.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    const code = p.patient_code?.toLowerCase() || '';
    const phone = p.phone || '';
    const search = patientSearch.toLowerCase();
    return name.includes(search) || code.includes(search) || phone.includes(search);
  });

  // Select patient
  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patient_id: patient.id }));
    setShowPatientDropdown(false);
    setPatientSearch('');
  };

  // Clear patient
  const clearPatient = () => {
    setSelectedPatient(null);
    setFormData(prev => ({ ...prev, patient_id: '' }));
  };

  // Handle template selection
  const handleTemplateChange = (templateId) => {
    setFormData(prev => ({ ...prev, template_id: templateId }));
    const template = templates.find(t => t.id === templateId);
    
    if (template?.template_content) {
      setFormData(prev => ({
        ...prev,
        template_id: templateId,
        procedure_name: template.name_en || prev.procedure_name,
        post_op_instructions: template.template_content || prev.post_op_instructions,
      }));
    }
  };

  // === Per-tooth entry management (Fix 9.2) ===

  // Add/remove tooth entry when chart is clicked
  const handleChartToothClick = (universalNum) => {
    const fdi = UNIVERSAL_TO_FDI[universalNum];
    if (!fdi) return;
    
    const existingIdx = toothEntries.findIndex(e => e.toothNumber === fdi);
    if (existingIdx >= 0) {
      // Remove entry
      setToothEntries(prev => prev.filter((_, i) => i !== existingIdx));
    } else {
      // Add new entry with empty procedure
      setToothEntries(prev => [...prev, {
        toothNumber: fdi,
        procedureType: '',
        surface: '',
        notes: '',
      }]);
    }
    // Also show history for this tooth
    loadToothHistory(fdi);
  };

  // Update a single tooth entry field
  const updateToothEntry = (index, field, value) => {
    setToothEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Remove a tooth entry
  const removeToothEntry = (index) => {
    setToothEntries(prev => prev.filter((_, i) => i !== index));
  };

  // Sync toothEntries → formData.teeth_involved (backward compat comma string)
  useEffect(() => {
    const teethStr = toothEntries.map(e => e.toothNumber).join(', ');
    setFormData(prev => ({ ...prev, teeth_involved: teethStr }));
  }, [toothEntries]);

  // Build highlight map from toothEntries for the chart
  const teethHighlightMap = useMemo(() => {
    const map = {};
    toothEntries.forEach(entry => {
      const universal = FDI_TO_UNIVERSAL[entry.toothNumber];
      if (universal) map[universal] = { status: entry.procedureType ? 'in_progress' : 'pending' };
    });
    return map;
  }, [toothEntries]);

  // === Per-tooth history (Fix 9.3) ===

  // Load treatment history for a specific tooth (FDI number)
  const loadToothHistory = async (fdiTooth) => {
    if (!formData.patient_id || !fdiTooth) { setToothHistory([]); setHistoryTooth(null); return; }
    setHistoryTooth(fdiTooth);
    try {
      const { data } = await supabase
        .from('procedure_notes')
        .select('id, procedure_name, teeth_involved, teeth_details, created_at, doctors:doctor_id(name_en)')
        .eq('patient_id', formData.patient_id)
        .ilike('teeth_involved', `%${fdiTooth}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      setToothHistory(data || []);
    } catch (err) {
      console.warn('Failed to load tooth history:', err);
      setToothHistory([]);
    }
  };

  // Load all past procedure sessions for this patient (for history dropdown)
  const loadPastSessions = async () => {
    if (!formData.patient_id) return;
    try {
      const { data } = await supabase
        .from('procedure_notes')
        .select('id, procedure_name, teeth_involved, teeth_details, created_at, doctors:doctor_id(name_en)')
        .eq('patient_id', formData.patient_id)
        .order('created_at', { ascending: false })
        .limit(20);
      setPastSessions(data || []);
    } catch (err) {
      console.warn('Failed to load past sessions:', err);
    }
  };

  // Load past sessions when patient changes
  useEffect(() => {
    if (formData.patient_id) loadPastSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.patient_id]);

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
    
    // Validate branch if materials are selected
    if (selectedMaterials.length > 0 && !selectedBranch) {
      setMessage({ type: 'error', text: 'Please select a branch for material tracking' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Build materials text for backward compatibility
      const materialsText = selectedMaterials.length > 0
        ? selectedMaterials.map(m => `${m.item_name} (${m.quantity} ${m.unit})`).join(', ')
        : formData.materials_used;
      
      const payload = {
        patient_id: formData.patient_id,
        doctor_id: formData.doctor_id,
        template_id: formData.template_id || null,
        procedure_name: formData.procedure_name || toothEntries[0]?.procedureType || 'General Procedure',
        teeth_involved: formData.teeth_involved || null,
        teeth_details: toothEntries.length > 0 ? toothEntries : null,
        procedure_performed: formData.procedure_performed || 'Procedure performed as planned',
        anesthesia_used: formData.anesthesia_used || null,
        materials_used: materialsText || null,
        complications: formData.complications || null,
        post_op_instructions: formData.post_op_instructions || null,
        follow_up_required: formData.follow_up_required || false,
        follow_up_date: formData.follow_up_date || null,
        notes: formData.notes || null,
        notice: formData.notice || null,
      };

      let procedureNoteId = id;

      if (isEditing) {
        const { error } = await supabase
          .from('procedure_notes')
          .update(payload)
          .eq('id', id);

        if (error) throw error;
        
        // Issue #19 Fix: Reverse previous deductions before deleting materials
        const { data: existingMaterials } = await supabase
          .from('procedure_material_usage')
          .select('inventory_item_id, quantity, branch_id, movement_id')
          .eq('procedure_note_id', id);
        
        if (existingMaterials && existingMaterials.length > 0) {
          for (const mat of existingMaterials) {
            // Reverse the previous deduction (add stock back)
            await supabase.rpc('adjust_inventory_stock', {
              p_item_id: mat.inventory_item_id,
              p_branch_id: mat.branch_id,
              p_quantity: mat.quantity, // Positive to add back
              p_reference_type: 'procedure_note_reversal',
              p_reference_id: id,
              p_user_id: identity?.id || null,
              p_notes: 'Reversal due to procedure note edit'
            });
          }
        }
        
        // Delete existing materials to replace with new ones
        await supabase
          .from('procedure_material_usage')
          .delete()
          .eq('procedure_note_id', id);
      } else {
        const { data: newNote, error } = await supabase
          .from('procedure_notes')
          .insert(payload)
          .select('id')
          .single();

        if (error) throw error;
        procedureNoteId = newNote.id;
      }
      
      // Save materials and deduct inventory
      if (selectedMaterials.length > 0 && procedureNoteId) {
        for (const material of selectedMaterials) {
          // Deduct from inventory (creates movement record)
          const { data: movementId } = await supabase.rpc('deduct_inventory_stock', {
            p_item_id: material.inventory_item_id,
            p_branch_id: selectedBranch,
            p_quantity: material.quantity,
            p_reference_type: 'procedure_note',
            p_reference_id: procedureNoteId,
            p_user_id: identity?.id || null
          });
          
          // Record material usage
          await supabase
            .from('procedure_material_usage')
            .insert({
              procedure_note_id: procedureNoteId,
              inventory_item_id: material.inventory_item_id,
              quantity: material.quantity,
              unit_cost: material.unit_cost,
              branch_id: selectedBranch,
              movement_id: movementId,
              created_by: identity?.id || null
            });
        }
      }

      setMessage({ type: 'success', text: `Procedure note ${isEditing ? 'updated' : 'created'} successfully!` });

      // Auto-save dental chart history linked to this procedure
      if (formData.teeth_involved && Object.keys(patientTeethData).length > 0) {
        try {
          await supabase.from('dental_chart_history').insert({
            patient_id: formData.patient_id,
            chart_data: patientTeethData,
            source: 'treatment',
            case_summary: formData.procedure_name || 'Procedure',
            notice: formData.notice || null,
          });
        } catch (histErr) {
          console.warn('Failed to save chart history:', histErr);
        }
      }

      setTimeout(() => navigate('/procedure-notes'), 1500);
    } catch (error) {
      console.error('Error saving procedure note:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save procedure note' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/procedure-notes')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Procedure Note' : 'New Procedure Note'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditing ? 'Update procedure details' : 'Document a clinical procedure'}
          </p>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            Patient & Provider
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient *
              </label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedPatient.patient_code} • {selectedPatient.phone}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearPatient}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="relative">
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
                      placeholder="Search patient by name, code, or phone..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {showPatientDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                      {filteredPatients.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No patients found
                        </div>
                      ) : (
                        filteredPatients.slice(0, 10).map(patient => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => selectPatient(patient)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                          >
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-sm">
                              {patient.first_name?.[0]}{patient.last_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {patient.first_name} {patient.last_name}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {patient.patient_code} • {patient.phone}
                              </p>
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
                Doctor *
              </label>
              <select
                value={formData.doctor_id}
                onChange={(e) => setFormData(prev => ({ ...prev, doctor_id: e.target.value }))}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select doctor</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name_en} {doc.specialty_en ? `- ${doc.specialty_en}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Procedure Details — Per-Tooth System */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary-500" />
            Procedure Details
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template (Optional)
                </label>
                <select
                  value={formData.template_id}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">No template</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name_en || template.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              {/* Primary Procedure Name (still kept for backward compat) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Procedure
                </label>
                <select
                  value={formData.procedure_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, procedure_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select procedure</option>
                  {PROCEDURE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dental Chart — Click To Select Teeth */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Teeth Involved — Click chart to add/remove
                </label>
                <div className="flex items-center gap-2">
                  {formData.patient_id && (
                    <button
                      type="button"
                      onClick={() => setShowPastSessions(!showPastSessions)}
                      className={`px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1.5 transition-colors ${
                        showPastSessions 
                          ? 'border-primary-500 bg-primary-50 text-primary-600' 
                          : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      Past Sessions
                      {showPastSessions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTeethSelector(!showTeethSelector)}
                    className={`px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1.5 transition-colors ${
                      showTeethSelector 
                        ? 'border-primary-500 bg-primary-50 text-primary-600' 
                        : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {showTeethSelector ? 'Hide Chart' : 'Show Chart'}
                  </button>
                </div>
              </div>

              {/* Past Sessions Dropdown (Fix 9.3c) */}
              {showPastSessions && (
                <div className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-xs font-medium text-gray-500 mb-2">Past treatment sessions for this patient:</p>
                  {pastSessions.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No previous sessions found.</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {pastSessions.map(session => (
                        <button
                          type="button"
                          key={session.id}
                          onClick={() => setViewingSession(viewingSession?.id === session.id ? null : session)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            viewingSession?.id === session.id 
                              ? 'bg-primary-100 border border-primary-300' 
                              : 'hover:bg-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="font-medium text-gray-700 truncate">
                              {session.procedure_name || 'Procedure'}
                            </span>
                            {session.teeth_involved && (
                              <span className="text-gray-400 truncate">• Teeth: {session.teeth_involved}</span>
                            )}
                          </div>
                          <span className="text-gray-400 shrink-0 ml-2">
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Viewing a past session's details */}
                  {viewingSession && (
                    <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-700">
                          {viewingSession.procedure_name} — {new Date(viewingSession.created_at).toLocaleDateString()}
                        </p>
                        <button type="button" onClick={() => setViewingSession(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {viewingSession.teeth_details && Array.isArray(viewingSession.teeth_details) ? (
                        <div className="space-y-1">
                          {viewingSession.teeth_details.map((entry, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded font-mono font-medium">{entry.toothNumber}</span>
                              <span>{entry.procedureType || '—'}</span>
                              {entry.surface && <span className="text-gray-400">({entry.surface})</span>}
                              {entry.notes && <span className="text-gray-400 italic truncate">— {entry.notes}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Teeth: {viewingSession.teeth_involved || 'None'}</p>
                      )}
                      {viewingSession.doctors?.name_en && (
                        <p className="text-xs text-gray-400 mt-1">Dr. {viewingSession.doctors.name_en}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Dental Chart (always starts fresh — baseline conditions shown as faded reference) */}
              {showTeethSelector && (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500 mb-2 text-center">
                    Click teeth to add individual treatments.
                  </p>
                  <DentalChartMini
                    teethData={{}}
                    highlightTeeth={teethHighlightMap}
                    onSelectTooth={handleChartToothClick}
                    label="Select teeth for treatment"
                    compact
                  />
                  {toothEntries.length > 0 && (
                    <p className="text-xs text-primary-600 text-center mt-2">
                      {toothEntries.length} {toothEntries.length === 1 ? 'tooth' : 'teeth'} selected
                    </p>
                  )}
                </div>
              )}

              {/* Per-Tooth History Panel (Fix 9.3d) — shows when a tooth is clicked */}
              {historyTooth && toothHistory.length > 0 && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Treatment History for Tooth {historyTooth}
                    </p>
                    <button type="button" onClick={() => { setHistoryTooth(null); setToothHistory([]); }} className="text-amber-400 hover:text-amber-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {toothHistory.map(h => {
                      // Find this tooth's specific treatment from teeth_details if available
                      const detail = h.teeth_details?.find?.(d => d.toothNumber === historyTooth);
                      return (
                        <div key={h.id} className="flex items-center gap-2 text-xs text-amber-900 bg-white/60 px-2 py-1.5 rounded">
                          <span className="text-amber-500 shrink-0">{new Date(h.created_at).toLocaleDateString()}</span>
                          <span className="font-medium">{detail?.procedureType || h.procedure_name || 'Procedure'}</span>
                          {detail?.surface && <span className="text-amber-600">({detail.surface})</span>}
                          {h.doctors?.name_en && <span className="text-amber-400 ml-auto shrink-0">Dr. {h.doctors.name_en}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* === Per-Tooth Entries List (Fix 9.2d) === */}
            {toothEntries.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Individual Tooth Treatments ({toothEntries.length})
                </label>
                <div className="space-y-2">
                  {toothEntries.map((entry, index) => {
                    const universalNum = FDI_TO_UNIVERSAL[entry.toothNumber];
                    const toothCondition = universalNum ? patientTeethData[universalNum] : null;
                    const condInfo = toothCondition?.condition && toothCondition.condition !== 'healthy'
                      ? CONDITIONS[toothCondition.condition]
                      : null;
                    return (
                      <div key={`${entry.toothNumber}-${index}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {/* Tooth number badge */}
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
                          <span 
                            className="inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-sm border-2"
                            style={condInfo ? {
                              backgroundColor: condInfo.bgColor,
                              borderColor: condInfo.color,
                              color: condInfo.color,
                            } : {
                              backgroundColor: '#f3f4f6',
                              borderColor: '#d1d5db',
                              color: '#374151',
                            }}
                          >
                            {entry.toothNumber}
                          </span>
                          {condInfo && (
                            <span className="text-[9px] font-medium" style={{ color: condInfo.color }}>
                              {condInfo.label}
                            </span>
                          )}
                        </div>

                        {/* Entry fields */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Procedure type dropdown */}
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Procedure</label>
                            <select
                              value={entry.procedureType}
                              onChange={(e) => updateToothEntry(index, 'procedureType', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">Select...</option>
                              {PROCEDURE_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>

                          {/* Surface */}
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Surface</label>
                            <select
                              value={entry.surface}
                              onChange={(e) => updateToothEntry(index, 'surface', e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            >
                              <option value="">None</option>
                              <option value="occlusal">Occlusal</option>
                              <option value="mesial">Mesial</option>
                              <option value="distal">Distal</option>
                              <option value="buccal">Buccal</option>
                              <option value="lingual">Lingual</option>
                            </select>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Notes</label>
                            <input
                              type="text"
                              value={entry.notes}
                              onChange={(e) => updateToothEntry(index, 'notes', e.target.value)}
                              placeholder="Optional notes"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            />
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => removeToothEntry(index)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 mt-1"
                          title="Remove tooth"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Procedure Performed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Procedure Performed *
              </label>
              <textarea
                value={formData.procedure_performed}
                onChange={(e) => setFormData(prev => ({ ...prev, procedure_performed: e.target.value }))}
                rows={4}
                placeholder="Detailed description of the procedure..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* Anesthesia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anesthesia Used
              </label>
              <input
                type="text"
                value={formData.anesthesia_used}
                onChange={(e) => setFormData(prev => ({ ...prev, anesthesia_used: e.target.value }))}
                placeholder="e.g., Lidocaine 2% with Epi"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Complications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Complications (if any)
              </label>
              <textarea
                value={formData.complications}
                onChange={(e) => setFormData(prev => ({ ...prev, complications: e.target.value }))}
                rows={2}
                placeholder="Any complications during procedure..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Materials Used */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-500" />
              Materials Used
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Branch:</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name_en}</option>
                ))}
              </select>
            </div>
          </div>

          <MaterialSelector
            selectedMaterials={selectedMaterials}
            onChange={setSelectedMaterials}
            branchId={selectedBranch}
            showCosts={true}
            showStock={true}
            disabled={!selectedBranch}
          />
          
          {!selectedBranch && (
            <p className="text-sm text-amber-600 mt-3">
              Select a branch to enable material selection and stock tracking
            </p>
          )}
          
          {/* Legacy text input for additional materials */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional materials (free text)
            </label>
            <input
              type="text"
              value={formData.materials_used}
              onChange={(e) => setFormData(prev => ({ ...prev, materials_used: e.target.value }))}
              placeholder="Other materials not in inventory..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Post-Op & Follow-up */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Post-Op Instructions & Follow-up
          </h2>

          <div className="space-y-4">
            {/* Post-op Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Post-Op Instructions
              </label>
              <textarea
                value={formData.post_op_instructions}
                onChange={(e) => setFormData(prev => ({ ...prev, post_op_instructions: e.target.value }))}
                rows={3}
                placeholder="Instructions given to patient..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Follow-up */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.follow_up_required}
                  onChange={(e) => setFormData(prev => ({ ...prev, follow_up_required: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Follow-up Required</span>
              </label>
            </div>

            {formData.follow_up_required && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="Any additional notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Notice / Warning */}
            <div>
              <label className="block text-sm font-medium text-amber-700 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Notice / Warning
              </label>
              <textarea
                value={formData.notice}
                onChange={(e) => setFormData(prev => ({ ...prev, notice: e.target.value }))}
                rows={2}
                placeholder="Warnings, alerts, follow-up concerns..."
                className="w-full px-3 py-2 border border-amber-300 bg-amber-50 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-amber-900 placeholder:text-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/procedure-notes')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? 'Update Procedure Note' : 'Create Procedure Note'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProcedureNoteForm;
