import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope,
  Building2,
  Search,
  X,
  UserPlus,
  Phone,
  Mail,
  Repeat,
  Armchair,
  AlertTriangle
} from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useSelectedTenantId } from '../../../contexts/UnifiedTenantContext';
import { validateAppointment } from '../../../utils/validation';

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'arrived', label: 'Arrived', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'no_show', label: 'No Show', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

const serviceTypes = [
  'Consultation',
  'Dental Cleaning',
  'Teeth Whitening',
  'Dental Filling',
  'Root Canal Treatment',
  'Tooth Extraction',
  'Dental Crown',
  'Dental Bridge',
  'Dental Implant',
  'Orthodontics / Braces',
  'Invisalign',
  'Dentures',
  'Gum Treatment',
  'Emergency',
  'Follow-up',
  'X-Ray',
  'Other',
];

const durationOptions = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const AppointmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  
  // Tenant ID for data isolation
  const tenantId = useSelectedTenantId();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Data for dropdowns
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [branches, setBranches] = useState([]);
  const [chairs, setChairs] = useState([]);
  const [loadingChairs, setLoadingChairs] = useState(false);

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Conflict checking state
  const [conflicts, setConflicts] = useState([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [_checkingConflicts, setCheckingConflicts] = useState(false);

  // New patient modal
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
  });

  // Form data - use date from URL if provided
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    branch_id: '',
    chair_id: '',
    appointment_date: searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    end_time: '09:30',
    duration: 30,
    service_type: '',
    status: 'pending',
    notes: '',
    // Recurring appointment fields
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_end_date: '',
    recurrence_count: 4,
    recurrence_days_of_week: [],
  });

  // Load initial data
  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    // Load patients - using 'name' field from 001 schema
    const { data: patientsData } = await supabase
      .from('patients')
      .select('id, name, phone')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');
    
    // Convert to first_name/last_name format for UI
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

    // Load doctors
    const { data: doctorsData } = await supabase
      .from('doctors')
      .select('id, name_en, name_ar, specialty_en')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setDoctors(doctorsData || []);

    // Load branches
    const { data: branchesData } = await supabase
      .from('branches')
      .select('id, name_en, name_ar')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setBranches(branchesData || []);

    // Load appointment if editing
    if (isEdit) {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (id, name, phone)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (appointment && !error) {
        // Parse datetime_start and datetime_end into date and time components
        const startDate = appointment.datetime_start ? new Date(appointment.datetime_start) : null;
        const endDate = appointment.datetime_end ? new Date(appointment.datetime_end) : null;
        
        setFormData({
          patient_id: appointment.patient_id || '',
          doctor_id: appointment.doctor_id || '',
          branch_id: appointment.branch_id || '',
          chair_id: appointment.chair_id || '',
          appointment_date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
          start_time: startDate ? format(startDate, 'HH:mm') : '09:00',
          end_time: endDate ? format(endDate, 'HH:mm') : '09:30',
          duration: 30,
          service_type: appointment.service_type || '',
          status: appointment.status || 'booked',
          notes: appointment.notes || '',
        });

        // Load chairs for the branch if present
        if (appointment.branch_id) {
          loadChairsForBranch(appointment.branch_id);
        }
        
        // Convert patient to expected format
        if (appointment.patients) {
          const nameParts = appointment.patients.name?.split(' ') || [''];
          setSelectedPatient({
            ...appointment.patients,
            first_name: nameParts[0] || '',
            last_name: nameParts.slice(1).join(' ') || '',
            patient_code: appointment.patients.id?.slice(0, 8).toUpperCase() || '',
          });
        }
      }
    }

    setLoading(false);
  }, [id, isEdit, tenantId]);

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

  // Handle new patient form changes
  const handleNewPatientChange = (e) => {
    const { name, value } = e.target;
    setNewPatientData(prev => ({ ...prev, [name]: value }));
  };

  // Create new patient
  const handleCreatePatient = async (e) => {
    e.preventDefault();
    
    if (!newPatientData.first_name || !newPatientData.last_name) {
      setMessage({ type: 'error', text: 'First name and last name are required' });
      return;
    }

    setSavingPatient(true);
    setMessage({ type: '', text: '' });

    try {
      // Combine first and last name for the 'name' field (001 schema compatibility)
      const fullName = `${newPatientData.first_name} ${newPatientData.last_name}`.trim();
      
      const patientToCreate = {
        name: fullName,
        phone: newPatientData.phone || '',
        email: newPatientData.email || null,
        date_of_birth: newPatientData.date_of_birth || null,
        gender: newPatientData.gender || null,
        is_active: true,
        ...(tenantId && { tenant_id: tenantId }),
      };

      const { data: newPatient, error } = await supabase
        .from('patients')
        .insert(patientToCreate)
        .select('id, name, phone')
        .single();

      if (error) throw error;

      // Convert to expected format with first_name/last_name for UI
      const nameParts = newPatient.name?.split(' ') || [''];
      const patientForUI = {
        ...newPatient,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        patient_code: newPatient.id?.slice(0, 8).toUpperCase() || '',
      };

      // Add to patients list and select
      setPatients(prev => [patientForUI, ...prev]);
      selectPatient(patientForUI);
      
      // Close modal and reset form
      setShowNewPatientModal(false);
      setNewPatientData({
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        date_of_birth: '',
        gender: '',
      });
      
      setMessage({ type: 'success', text: 'Patient created successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error creating patient:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create patient' });
    } finally {
      setSavingPatient(false);
    }
  };

  // Open new patient modal with search term as name
  const openNewPatientModal = () => {
    // If there's a search term, use it as initial name
    const nameParts = patientSearch.trim().split(' ');
    setNewPatientData({
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      phone: '',
      email: '',
      date_of_birth: '',
      gender: '',
    });
    setShowPatientDropdown(false);
    setShowNewPatientModal(true);
  };

  // Load chairs for selected branch
  const loadChairsForBranch = async (branchId) => {
    if (!branchId) {
      setChairs([]);
      return;
    }
    
    setLoadingChairs(true);
    try {
      const { data, error } = await supabase
        .from('chairs')
        .select('id, chair_number, name_en, name_ar, chair_type')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('chair_number');
      
      if (error) throw error;
      setChairs(data || []);
    } catch (error) {
      console.error('Error loading chairs:', error);
      setChairs([]);
    } finally {
      setLoadingChairs(false);
    }
  };

  // Check for appointment conflicts (same doctor or chair at overlapping time)
  const checkAppointmentConflicts = async () => {
    if (!formData.appointment_date || !formData.start_time || !formData.end_time) {
      return [];
    }

    const datetimeStart = new Date(`${formData.appointment_date}T${formData.start_time}:00`);
    const datetimeEnd = new Date(`${formData.appointment_date}T${formData.end_time}:00`);

    try {
      let query = supabase
        .from('appointments')
        .select(`
          id, datetime_start, datetime_end, status,
          patients (name),
          doctors (name_en),
          chairs (name_en, chair_number)
        `)
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled')
        .neq('status', 'no_show')
        .lt('datetime_start', datetimeEnd.toISOString())
        .gt('datetime_end', datetimeStart.toISOString());

      // Exclude current appointment when editing
      if (isEdit && id) {
        query = query.neq('id', id);
      }

      // Check for doctor conflicts
      const conflictingAppointments = [];

      if (formData.doctor_id) {
        const { data: doctorConflicts, error: doctorError } = await query
          .eq('doctor_id', formData.doctor_id);
        
        if (!doctorError && doctorConflicts?.length > 0) {
          doctorConflicts.forEach(apt => {
            conflictingAppointments.push({
              ...apt,
              conflictType: 'doctor',
              conflictReason: `Doctor ${apt.doctors?.name_en || 'Unknown'} already has an appointment`
            });
          });
        }
      }

      // Check for chair conflicts (separate query to avoid overwriting doctor filter)
      if (formData.chair_id) {
        let chairQuery = supabase
          .from('appointments')
          .select(`
            id, datetime_start, datetime_end, status,
            patients (name),
            doctors (name_en),
            chairs (name_en, chair_number)
          `)
          .eq('tenant_id', tenantId)
          .neq('status', 'cancelled')
          .neq('status', 'no_show')
          .lt('datetime_start', datetimeEnd.toISOString())
          .gt('datetime_end', datetimeStart.toISOString())
          .eq('chair_id', formData.chair_id);

        if (isEdit && id) {
          chairQuery = chairQuery.neq('id', id);
        }

        const { data: chairConflicts, error: chairError } = await chairQuery;
        
        if (!chairError && chairConflicts?.length > 0) {
          chairConflicts.forEach(apt => {
            // Avoid duplicate entries if same appointment conflicts on both doctor and chair
            if (!conflictingAppointments.find(c => c.id === apt.id)) {
              conflictingAppointments.push({
                ...apt,
                conflictType: 'chair',
                conflictReason: `Chair ${apt.chairs?.name_en || apt.chairs?.chair_number || 'Unknown'} is already booked`
              });
            } else {
              // Add chair conflict to existing entry
              const existing = conflictingAppointments.find(c => c.id === apt.id);
              if (existing) {
                existing.conflictType = 'both';
                existing.conflictReason = `Both doctor and chair are already booked`;
              }
            }
          });
        }
      }

      return conflictingAppointments;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return [];
    }
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Load chairs when branch changes
    if (name === 'branch_id') {
      setFormData(prev => ({ ...prev, branch_id: value, chair_id: '' })); // Reset chair when branch changes
      loadChairsForBranch(value);
    }

    // Auto-calculate end time based on duration
    if (name === 'start_time' || name === 'duration') {
      const startTime = name === 'start_time' ? value : formData.start_time;
      const duration = name === 'duration' ? parseInt(value) : formData.duration;
      
      if (startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = addMinutes(startDate, duration);
        const endTime = format(endDate, 'HH:mm');
        
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          end_time: endTime,
          duration: duration
        }));
      }
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Run validation
    const validationErrors = validateAppointment({
      patient_id: formData.patient_id,
      doctor_id: formData.doctor_id,
      appointment_date: formData.appointment_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
    });

    if (validationErrors.length > 0) {
      setMessage({ type: 'error', text: validationErrors[0] });
      return;
    }

    // Check for conflicts
    setCheckingConflicts(true);
    const foundConflicts = await checkAppointmentConflicts();
    setCheckingConflicts(false);

    if (foundConflicts.length > 0 && !showConflictWarning) {
      setConflicts(foundConflicts);
      setShowConflictWarning(true);
      return; // Show warning first, user must confirm to proceed
    }

    // Reset conflict warning for next submission
    setShowConflictWarning(false);
    setConflicts([]);

    setSaving(true);
    setMessage({ type: '', text: '' });

    // Combine date and time into ISO timestamps for datetime_start and datetime_end
    const datetimeStart = new Date(`${formData.appointment_date}T${formData.start_time}:00`);
    const datetimeEnd = new Date(`${formData.appointment_date}T${formData.end_time}:00`);

    const dataToSubmit = {
      patient_id: formData.patient_id,
      doctor_id: formData.doctor_id || null,
      branch_id: formData.branch_id || null,
      chair_id: formData.chair_id || null,
      datetime_start: datetimeStart.toISOString(),
      datetime_end: datetimeEnd.toISOString(),
      status: formData.status === 'pending' ? 'booked' : formData.status,
      notes: formData.notes || null,
      // Recurring fields
      is_recurring: formData.is_recurring,
      recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
      recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? formData.recurrence_end_date : null,
      recurrence_count: formData.is_recurring ? formData.recurrence_count : null,
      recurrence_days_of_week: formData.is_recurring && formData.recurrence_pattern === 'weekly' && formData.recurrence_days_of_week.length > 0 
        ? formData.recurrence_days_of_week 
        : null,
      // Tenant ID for data isolation (only on create)
      ...(!isEdit && tenantId && { tenant_id: tenantId }),
    };

    try {
      if (isEdit) {
        const { data: _data, error } = await supabase
          .from('appointments')
          .update(dataToSubmit)
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .select();
        
        if (error) throw error;
        setMessage({ type: 'success', text: 'Appointment updated successfully!' });
      } else {
        // Create the initial appointment
        const { data, error } = await supabase
          .from('appointments')
          .insert(dataToSubmit)
          .select();
        
        if (error) throw error;

        // If recurring, generate additional appointments
        if (formData.is_recurring && data && data[0]) {
          try {
            const { data: recurringCount, error: recurringError } = await supabase.rpc('generate_recurring_appointments', {
              p_parent_id: data[0].id,
              p_pattern: formData.recurrence_pattern,
              p_end_date: formData.recurrence_end_date || null,
              p_count: formData.recurrence_count || 4,
              p_days_of_week: formData.recurrence_pattern === 'weekly' && formData.recurrence_days_of_week.length > 0 
                ? formData.recurrence_days_of_week 
                : null
            });

            if (recurringError) {
              console.error('Error generating recurring appointments:', recurringError);
              setMessage({ type: 'success', text: `Appointment created! Note: Recurring series creation may require migration.` });
            } else {
              setMessage({ type: 'success', text: `Created appointment series with ${recurringCount + 1} occurrences!` });
            }
          } catch (recurringErr) {
            console.error('Recurring appointment error:', recurringErr);
            setMessage({ type: 'success', text: 'Appointment created successfully! (Recurring series requires database migration)' });
          }
        } else {
          setMessage({ type: 'success', text: 'Appointment created successfully!' });
        }
      }
      
      setTimeout(() => navigate('/appointments'), 1500);
    } catch (error) {
      console.error('Error saving appointment:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save appointment' });
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
          onClick={() => navigate('/appointments')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Appointment' : 'New Appointment'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? 'Update appointment details' : 'Schedule a new appointment'}
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
            Patient
          </h2>

          {selectedPatient ? (
            <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg border border-primary-200">
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
                  {/* Create New Patient Button */}
                  <button
                    type="button"
                    onClick={openNewPatientModal}
                    className="w-full flex items-center gap-3 p-3 hover:bg-primary-50 text-left border-b border-gray-200 bg-gray-50"
                  >
                    <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-primary-600">Create New Patient</p>
                      <p className="text-sm text-gray-500">
                        {patientSearch ? `Add "${patientSearch}" as new patient` : 'Add a new patient to the system'}
                      </p>
                    </div>
                  </button>
                  
                  {filteredPatients.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No existing patients found
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

        {/* Date & Time */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            Date & Time
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                name="appointment_date"
                value={formData.appointment_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {durationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-500 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Appointment ends at <span className="font-medium">{formData.end_time}</span>
          </div>
        </div>

        {/* Doctor & Branch */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary-500" />
            Doctor & Location
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Doctor
              </label>
              <select
                name="doctor_id"
                value={formData.doctor_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select doctor (optional)</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name_en} {doc.specialty_en ? `- ${doc.specialty_en}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select branch (optional)</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name_en}</option>
                ))}
              </select>
            </div>

            {/* Chair Selection - Only shown when branch is selected */}
            {formData.branch_id && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Armchair className="w-4 h-4 text-primary-500" />
                  Chair / Room
                </label>
                {loadingChairs ? (
                  <div className="flex items-center gap-2 py-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading chairs...
                  </div>
                ) : (
                  <select
                    name="chair_id"
                    value={formData.chair_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select chair (optional)</option>
                    {chairs.map(chair => (
                      <option key={chair.id} value={chair.id}>
                        Chair {chair.chair_number} - {chair.name_en || chair.chair_type}
                      </option>
                    ))}
                  </select>
                )}
                {chairs.length === 0 && !loadingChairs && (
                  <p className="text-sm text-gray-500 mt-1">
                    No chairs available for this branch
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Service & Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Appointment Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type
              </label>
              <select
                name="service_type"
                value={formData.service_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select service type</option>
                {serviceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: opt.value }))}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.status === opt.value 
                        ? opt.color + ' ring-2 ring-offset-1'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Additional notes about the appointment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Recurring Appointment Section - Only show for new appointments */}
            {!isEdit && (
              <div className="border-t pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="font-medium text-gray-900 flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-primary-500" />
                      Make this a recurring appointment
                    </span>
                  </label>
                </div>

                {formData.is_recurring && (
                  <div className="ml-6 space-y-4 p-4 bg-gray-50 rounded-lg">
                    {/* Recurrence Pattern */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repeat
                      </label>
                      <select
                        value={formData.recurrence_pattern}
                        onChange={(e) => setFormData(prev => ({ ...prev, recurrence_pattern: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 Weeks</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    {/* Days of Week - Only for weekly */}
                    {formData.recurrence_pattern === 'weekly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Repeat on
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  recurrence_days_of_week: prev.recurrence_days_of_week.includes(idx)
                                    ? prev.recurrence_days_of_week.filter(d => d !== idx)
                                    : [...prev.recurrence_days_of_week, idx]
                                }));
                              }}
                              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                                formData.recurrence_days_of_week.includes(idx)
                                  ? 'bg-primary-500 text-white border-primary-500'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-primary-500'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* End Options */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Occurrences
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="52"
                          value={formData.recurrence_count}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurrence_count: parseInt(e.target.value) || 4 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Or End By Date
                        </label>
                        <input
                          type="date"
                          value={formData.recurrence_end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, recurrence_end_date: e.target.value }))}
                          min={formData.appointment_date}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      {formData.recurrence_count} appointment(s) will be created 
                      {formData.recurrence_pattern === 'daily' && ' every day'}
                      {formData.recurrence_pattern === 'weekly' && ' every week'}
                      {formData.recurrence_pattern === 'biweekly' && ' every 2 weeks'}
                      {formData.recurrence_pattern === 'monthly' && ' every month'}
                      {formData.recurrence_end_date && ` until ${formData.recurrence_end_date}`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/appointments')}
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
                {isEdit ? 'Update Appointment' : 'Create Appointment'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* New Patient Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">New Patient</h2>
                  <p className="text-sm text-gray-500">Create a new patient record</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPatientModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={newPatientData.first_name}
                    onChange={handleNewPatientChange}
                    required
                    placeholder="First name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={newPatientData.last_name}
                    onChange={handleNewPatientChange}
                    required
                    placeholder="Last name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={newPatientData.phone}
                  onChange={handleNewPatientChange}
                  placeholder="+971 50 123 4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={newPatientData.email}
                  onChange={handleNewPatientChange}
                  placeholder="patient@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={newPatientData.date_of_birth}
                    onChange={handleNewPatientChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={newPatientData.gender}
                    onChange={handleNewPatientChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPatient}
                  className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {savingPatient ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Patient
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conflict Warning Modal */}
      {showConflictWarning && conflicts.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Scheduling Conflict Detected</h3>
                <p className="text-sm text-gray-600">
                  {conflicts.length} conflicting appointment{conflicts.length > 1 ? 's' : ''} found
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {conflicts.map((conflict, index) => (
                <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">{conflict.conflictReason}</p>
                      <p className="text-amber-700 mt-1">
                        Patient: {conflict.patients?.name || 'Unknown'}<br />
                        Time: {conflict.datetime_start ? format(new Date(conflict.datetime_start), 'HH:mm') : '?'} - 
                        {conflict.datetime_end ? format(new Date(conflict.datetime_end), 'HH:mm') : '?'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Do you want to proceed with this appointment anyway? This may cause double-bookings.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConflictWarning(false);
                  setConflicts([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  // Proceed despite conflicts - the flag will bypass conflict check
                  handleSubmit(e);
                }}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Book Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentForm;
