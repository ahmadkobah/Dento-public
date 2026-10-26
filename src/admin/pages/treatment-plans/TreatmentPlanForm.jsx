import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, 
  ArrowLeft, 
  Plus,
  Trash2,
  Search,
  User,
  FileText,
  DollarSign,
  GripVertical,
  Loader2,
  X,
  ChevronDown,
  Percent,
  Package
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';
import { escapeSearchTerm, validateStatusTransition, getAllowedTransitions } from '../../../utils/validation';
import { useGetIdentity } from '@refinedev/core';
import MaterialSelector from '../../components/MaterialSelector';
import DentalChartMini from '../../components/DentalChartMini';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TreatmentPlanForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { formatCurrency, defaultCurrency, getCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();
  const currencySymbol = defaultCurrency?.symbol || getCurrency(defaultCurrency?.code)?.symbol || '$';
  const { data: identity } = useGetIdentity();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Branch selection for materials
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [showMaterialsForItem, setShowMaterialsForItem] = useState(null); // index of item showing materials
  
  // Form data
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    title: '',
    description: '',
    status: 'draft',
    discount_type: 'percentage',
    discount_value: 0,
    notes: '',
    valid_until: '',
  });
  
  // Issue #25: Track original status for state machine validation
  const [originalStatus, setOriginalStatus] = useState('draft');

  // Treatment items
  const [items, setItems] = useState([]);
  
  // Lookups
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientTeethData, setPatientTeethData] = useState({});
  const [showDentalChart, setShowDentalChart] = useState(false);
  
  // Get allowed status transitions based on current status
  const allowedStatuses = isEditing 
    ? [originalStatus, ...getAllowedTransitions('treatment_plan', originalStatus)]
    : ['draft'];
  
  // Load initial data
  useEffect(() => {
    if (!tenantId) return;
    loadDoctors();
    loadServices();
    loadBranches();
    if (isEditing) {
      loadPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEditing, tenantId]);

  // Set default branch from identity
  useEffect(() => {
    if (identity?.branch_id && !selectedBranch) {
      setSelectedBranch(identity.branch_id);
    }
  }, [identity, selectedBranch]);

  const loadBranches = async () => {
    const { data } = await supabase
      .from('branches')
      .select('id, name, name_en, name_ar')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');
    setBranches(data || []);
  };

  const loadDoctors = async () => {
    const { data } = await supabase
      .from('doctors')
      .select('id, name_en, name_ar')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setDoctors(data || []);
  };

  const loadServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name_en, name_ar, price')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setServices(data || []);
  };

  const loadPlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone),
          treatment_plan_items (*)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      const currentStatus = data.status || 'draft';
      setOriginalStatus(currentStatus); // Store original for state machine validation
      
      setFormData({
        patient_id: data.patient_id || '',
        doctor_id: data.doctor_id || '',
        title: data.title || '',
        description: data.description || '',
        status: currentStatus,
        discount_type: data.discount_type || 'percentage',
        discount_value: data.discount_value || 0,
        notes: data.notes || '',
        valid_until: data.valid_until || '',
      });

      setSelectedPatient(data.patients);
      setItems(data.treatment_plan_items || []);
    } catch (error) {
      console.error('Error loading plan:', error);
      setMessage({ type: 'error', text: 'Failed to load treatment plan' });
    } finally {
      setLoading(false);
    }
  };

  // Load patient dental chart data
  const loadPatientTeethData = useCallback(async (patientId) => {
    if (!patientId) { setPatientTeethData({}); return; }
    const { data } = await supabase
      .from('dental_charts')
      .select('tooth_number, condition, surface, notes, case_label, notice')
      .eq('patient_id', patientId)
      .eq('tenant_id', tenantId);
    const teethMap = {};
    data?.forEach(t => { teethMap[t.tooth_number] = t; });
    setPatientTeethData(teethMap);
  }, [tenantId]);

  // Load teeth data when patient changes
  useEffect(() => {
    if (formData.patient_id) loadPatientTeethData(formData.patient_id);
  }, [formData.patient_id, loadPatientTeethData]);

  // Build highlight map from items
  const itemsHighlightMap = useMemo(() => {
    const map = {};
    items.forEach(item => {
      if (item.tooth_number) {
        // Handle comma-separated tooth numbers
        String(item.tooth_number).split(',').forEach(t => {
          const num = parseInt(t.trim());
          if (!isNaN(num)) map[num] = { status: item.status || 'pending' };
        });
      }
    });
    return map;
  }, [items]);

  // Handle tooth click from mini chart — add a new item with that tooth
  const handleChartToothClick = (toothNumber) => {
    if (!toothNumber) return;
    // Check if tooth already has an item
    const existingItemIndex = items.findIndex(item => 
      String(item.tooth_number) === String(toothNumber)
    );
    if (existingItemIndex >= 0) {
      // Scroll to existing item or highlight it
      return;
    }
    // Add new item with this tooth number
    setItems(prev => [...prev, {
      id: `new-${Date.now()}`,
      procedure_name: '',
      service_id: '',
      tooth_number: String(toothNumber),
      surface: '',
      description: '',
      cost: 0,
      sequence_order: prev.length,
      status: 'pending',
      notes: '',
      materials: [],
    }]);
  };

  // Search patients
  const searchPatients = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setPatients([]);
      return;
    }

    const safeTerm = escapeSearchTerm(term);
    const { data } = await supabase
      .from('patients')
      .select('id, name, first_name, last_name, phone')
      .eq('tenant_id', tenantId)
      .or(`name.ilike.%${safeTerm}%,first_name.ilike.%${safeTerm}%,last_name.ilike.%${safeTerm}%,phone.ilike.%${safeTerm}%`)
      .limit(10);

    setPatients(data || []);
  }, [tenantId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(patientSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, searchPatients]);

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setFormData(prev => ({ ...prev, patient_id: patient.id }));
    setShowPatientDropdown(false);
    setPatientSearch('');
  };

  const getPatientName = (patient) => {
    if (!patient) return '';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();
  };

  // Calculate totals
  const totalCost = items.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
  const discountAmount = formData.discount_type === 'percentage'
    ? totalCost * (formData.discount_value / 100)
    : parseFloat(formData.discount_value) || 0;
  const finalCost = Math.max(0, totalCost - discountAmount);

  // Add new item
  const addItem = () => {
    setItems([...items, {
      id: `new-${Date.now()}`,
      procedure_name: '',
      service_id: '',
      tooth_number: '',
      surface: '',
      description: '',
      cost: 0,
      sequence_order: items.length,
      status: 'pending',
      notes: '',
      materials: [], // Track materials for this item
    }]);
  };

  // Update item
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // If service selected, auto-fill name, cost and load default materials
    if (field === 'service_id' && value) {
      const service = services.find(s => s.id === value);
      if (service) {
        newItems[index].procedure_name = service.name_en;
        newItems[index].cost = service.price || 0;
        
        // Load default materials for service
        loadServiceMaterials(value, index, newItems);
        return; // loadServiceMaterials will call setItems
      }
    }

    setItems(newItems);
  };

  // Load default materials when a service is selected
  const loadServiceMaterials = async (serviceId, itemIndex, currentItems) => {
    try {
      const { data } = await supabase
        .from('service_materials')
        .select(`
          inventory_item_id,
          default_quantity,
          is_required,
          notes,
          inventory_items:inventory_item_id (
            id, sku, name_en, name_ar, unit, unit_cost, selling_price
          )
        `)
        .eq('service_id', serviceId);

      if (data && data.length > 0) {
        const materials = data.map(m => ({
          inventory_item_id: m.inventory_item_id,
          quantity: m.default_quantity,
          is_required: m.is_required,
          notes: m.notes,
          item: m.inventory_items
        }));
        currentItems[itemIndex].materials = materials;
      }
    } catch (error) {
      console.error('Error loading service materials:', error);
    }
    setItems([...currentItems]);
  };

  // Update materials for an item
  const updateItemMaterials = (index, materials) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], materials };
    setItems(newItems);
  };

  // Remove item
  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Save plan
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.patient_id) {
      setMessage({ type: 'error', text: 'Please select a patient' });
      return;
    }

    if (!formData.title) {
      setMessage({ type: 'error', text: 'Please enter a title' });
      return;
    }

    if (items.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one procedure' });
      return;
    }

    // Issue #25: Validate status transition
    if (isEditing && formData.status !== originalStatus) {
      const validation = validateStatusTransition('treatment_plan', originalStatus, formData.status);
      if (!validation.valid) {
        setMessage({ type: 'error', text: validation.error });
        return;
      }
    }

    setSaving(true);
    setMessage(null);

    try {
      const planData = {
        patient_id: formData.patient_id,
        doctor_id: formData.doctor_id || null,
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        total_cost: totalCost,
        discount_type: formData.discount_type,
        discount_value: formData.discount_value || 0,
        final_cost: finalCost,
        notes: formData.notes || null,
        valid_until: formData.valid_until || null,
      };

      let planId = id;

      if (isEditing) {
        const { error } = await supabase
          .from('treatment_plans')
          .update(planData)
          .eq('id', id)
          .eq('tenant_id', tenantId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('treatment_plans')
          .insert({ ...planData, tenant_id: tenantId })
          .select()
          .single();
        if (error) throw error;
        planId = data.id;
      }

      // Handle items
      if (isEditing) {
        // Delete removed items
        const existingIds = items.filter(i => !String(i.id).startsWith('new-')).map(i => i.id);
        await supabase
          .from('treatment_plan_items')
          .delete()
          .eq('treatment_plan_id', id)
          .eq('tenant_id', tenantId)
          .not('id', 'in', `(${existingIds.join(',')})`);
      }

      // Upsert items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemData = {
          treatment_plan_id: planId,
          service_id: item.service_id || null,
          tooth_number: item.tooth_number || null,
          surface: item.surface || null,
          procedure_name: item.procedure_name,
          description: item.description || null,
          cost: parseFloat(item.cost) || 0,
          sequence_order: i,
          status: item.status || 'pending',
          notes: item.notes || null,
        };

        let itemId;
        if (String(item.id).startsWith('new-')) {
          const { data: insertedItem } = await supabase.from('treatment_plan_items').insert({ ...itemData, tenant_id: tenantId }).select().single();
          itemId = insertedItem?.id;
        } else {
          await supabase.from('treatment_plan_items').update(itemData).eq('id', item.id).eq('tenant_id', tenantId);
          itemId = item.id;
        }

        // Issue #18 Fix: Only deduct if not already deducted
        // If item is completed, has materials, and hasn't been deducted yet
        if (item.status === 'completed' && item.materials && item.materials.length > 0 && selectedBranch && !item.materials_deducted) {
          for (const mat of item.materials) {
            if (mat.quantity > 0) {
              // Deduct from inventory
              await supabase.rpc('deduct_inventory_stock', {
                p_branch_id: selectedBranch,
                p_inventory_item_id: mat.inventory_item_id,
                p_quantity: mat.quantity,
                p_reason: 'treatment_plan_completion',
                p_reference_type: 'treatment_plan_item',
                p_reference_id: itemId,
                p_notes: `Treatment Plan: ${formData.title} - ${item.procedure_name}`
              });
            }
          }
          
          // Mark as deducted to prevent double deduction
          await supabase
            .from('treatment_plan_items')
            .update({ materials_deducted: true })
            .eq('id', itemId)
            .eq('tenant_id', tenantId);
        }
      }

      // Auto-save dental chart history snapshot linked to this treatment plan
      if (Object.keys(patientTeethData).length > 0) {
        try {
          await supabase.from('dental_chart_history').insert({
            patient_id: formData.patient_id,
            chart_data: patientTeethData,
            treatment_plan_id: planId,
            source: 'treatment_plan',
            case_summary: formData.title,
            notice: items.filter(i => i.tooth_number).map(i => `${i.procedure_name} (Tooth ${i.tooth_number})`).join('; ') || null,
          });
        } catch (histErr) {
          console.warn('Failed to save chart history snapshot:', histErr);
        }
      }

      setMessage({ type: 'success', text: `Treatment plan ${isEditing ? 'updated' : 'created'} successfully` });
      setTimeout(() => navigate('/treatment-plans'), 1500);
    } catch (error) {
      console.error('Error saving plan:', error);
      setMessage({ type: 'error', text: 'Failed to save treatment plan' });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Treatment Plan' : 'New Treatment Plan'}
            </h1>
            <p className="text-gray-500">
              {isEditing ? 'Update the treatment plan details' : 'Create a new treatment plan for a patient'}
            </p>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient <span className="text-red-500">*</span>
              </label>
              {selectedPatient ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{getPatientName(selectedPatient)}</p>
                    <p className="text-sm text-gray-500">{selectedPatient.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setFormData(prev => ({ ...prev, patient_id: '' }));
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patient by name or phone..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  {showPatientDropdown && patients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 max-h-60 overflow-y-auto">
                      {patients.map(patient => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => selectPatient(patient)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                        >
                          <User className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{getPatientName(patient)}</p>
                            <p className="text-sm text-gray-500">{patient.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Doctor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
              <select
                value={formData.doctor_id}
                onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select doctor...</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name_en || doctor.name_ar}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Full Mouth Rehabilitation"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                {STATUS_OPTIONS
                  .filter(option => allowedStatuses.includes(option.value))
                  .map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
              </select>
              {isEditing && allowedStatuses.length <= 1 && (
                <p className="text-xs text-gray-500 mt-1">Status cannot be changed (terminal state)</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Treatment plan description..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Dental Chart — Visual Tooth Selection */}
        {formData.patient_id && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Dental Chart</h2>
              <button
                type="button"
                onClick={() => setShowDentalChart(!showDentalChart)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {showDentalChart ? 'Hide Chart' : 'Show Chart'}
              </button>
            </div>
            {showDentalChart && (
              <>
                <p className="text-xs text-gray-500 mb-3">Click a tooth to add a procedure for it. Highlighted teeth already have procedures assigned.</p>
                <DentalChartMini
                  teethData={{}}
                  highlightTeeth={itemsHighlightMap}
                  onSelectTooth={handleChartToothClick}
                  label="Click to assign procedure"
                />
              </>
            )}
          </div>
        )}

        {/* Procedures */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Procedures</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100"
            >
              <Plus className="w-4 h-4" />
              Add Procedure
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No procedures added yet</p>
              <button
                type="button"
                onClick={addItem}
                className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                Add your first procedure
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 text-gray-400 cursor-move">
                      <GripVertical className="w-5 h-5" />
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Service Selection */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Service</label>
                        <select
                          value={item.service_id || ''}
                          onChange={(e) => updateItem(index, 'service_id', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select or enter custom...</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name_en} - {formatCurrency(service.price, defaultCurrency?.code)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Procedure Name */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Procedure Name</label>
                        <input
                          type="text"
                          value={item.procedure_name || ''}
                          onChange={(e) => updateItem(index, 'procedure_name', e.target.value)}
                          placeholder="e.g., Root Canal Treatment"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Tooth Number */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tooth #</label>
                        <input
                          type="text"
                          value={item.tooth_number || ''}
                          onChange={(e) => updateItem(index, 'tooth_number', e.target.value)}
                          placeholder="e.g., 14, 15"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Surface */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Surface</label>
                        <input
                          type="text"
                          value={item.surface || ''}
                          onChange={(e) => updateItem(index, 'surface', e.target.value)}
                          placeholder="e.g., MOD"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Cost */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cost ({currencySymbol})</label>
                        <input
                          type="number"
                          value={item.cost || ''}
                          onChange={(e) => updateItem(index, 'cost', e.target.value)}
                          placeholder="0"
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select
                          value={item.status || 'pending'}
                          onChange={(e) => updateItem(index, 'status', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Notes & Materials Row */}
                  <div className="mt-3 pl-11 space-y-3">
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      placeholder="Notes for this procedure..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />

                    {/* Materials Section */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowMaterialsForItem(showMaterialsForItem === index ? null : index)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          showMaterialsForItem === index 
                            ? 'bg-primary-50 border-primary-200 text-primary-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Package className="w-4 h-4" />
                        Materials {item.materials?.length > 0 && `(${item.materials.length})`}
                        <ChevronDown className={`w-3 h-3 transition-transform ${showMaterialsForItem === index ? 'rotate-180' : ''}`} />
                      </button>
                      {item.materials?.length > 0 && (
                        <span className="text-xs text-gray-500">
                          Total: ${item.materials.reduce((sum, m) => sum + (m.quantity * (m.item?.unit_cost || 0)), 0).toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Expanded Materials Selector */}
                    {showMaterialsForItem === index && (
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        {/* Branch selection for stock check */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Branch for Stock Check</label>
                          <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select branch...</option>
                            {branches.map(branch => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name || branch.name_en}
                              </option>
                            ))}
                          </select>
                        </div>

                        <MaterialSelector
                          selectedMaterials={item.materials || []}
                          onChange={(materials) => updateItemMaterials(index, materials)}
                          branchId={selectedBranch}
                          showCosts={true}
                          showStock={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Discount Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ({currencySymbol})</option>
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Value</label>
              <div className="relative">
                {formData.discount_type === 'percentage' ? (
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                ) : (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{currencySymbol}</span>
                )}
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max={formData.discount_type === 'percentage' ? 100 : undefined}
                  className="w-full px-4 py-2 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(totalCost, defaultCurrency?.code)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(discountAmount, defaultCurrency?.code)}</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary-600">{formatCurrency(finalCost, defaultCurrency?.code)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={4}
            placeholder="Any additional notes or instructions..."
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {isEditing ? 'Update Plan' : 'Create Plan'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Click outside to close dropdowns */}
      {showPatientDropdown && (
        <div className="fixed inset-0 z-0" onClick={() => setShowPatientDropdown(false)} />
      )}
    </div>
  );
};

export default TreatmentPlanForm;
