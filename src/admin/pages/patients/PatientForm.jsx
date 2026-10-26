import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  User,
  Phone,
  Heart,
  AlertTriangle,
  Pill,
  Stethoscope,
  Shield,
  Plus,
  X,
  Camera,
  Upload,
  Trash2,
  Globe,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useSelectedTenantId } from '../../../contexts/UnifiedTenantContext';
import { validatePatient, escapeSearchTerm } from '../../../utils/validation';

const PatientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  // Tenant ID for data isolation
  const tenantId = useSelectedTenantId();
  
  // Regional settings
  const { countries, currencies, defaultCountry, defaultCurrency } = useRegionalSettings();

  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [patientCode, setPatientCode] = useState('');
  
  // Duplicate detection
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Patient form data
  const [patient, setPatient] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    address: '',
    city: '',
    country: '',
    nationality: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    preferred_language: 'en',
    how_did_you_hear: '',
    notes: '',
    photo_url: '',
    is_active: true,
    // Regional fields
    country_code: '',
    phone_country_code: '',
    preferred_currency: '',
  });

  // Medical history form data
  const [medicalHistory, setMedicalHistory] = useState({
    // Medical Conditions
    has_diabetes: false,
    has_hypertension: false,
    has_heart_disease: false,
    has_bleeding_disorder: false,
    has_hepatitis: false,
    has_hiv: false,
    has_asthma: false,
    has_epilepsy: false,
    has_pregnancy: false,
    other_conditions: '',
    // Allergies
    allergies: [],
    allergic_to_anesthesia: false,
    allergic_to_penicillin: false,
    allergic_to_latex: false,
    allergy_notes: '',
    // Medications
    current_medications: [],
    taking_blood_thinners: false,
    // Dental History
    previous_dental_surgeries: '',
    last_dental_visit: '',
    has_dental_anxiety: false,
    dental_anxiety_level: 1,
    // Lifestyle
    is_smoker: false,
    smoking_frequency: '',
    // Notes
    additional_notes: '',
  });

  const [allergyInput, setAllergyInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  // Fetch patient data directly from Supabase
  useEffect(() => {
    const fetchPatient = async () => {
      if (!isEdit || !id || !tenantId) return;
      
      setIsFetching(true);
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setPatientCode(data.patient_code || '');
          setPatient({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            phone: data.phone || '',
            email: data.email || '',
            date_of_birth: data.date_of_birth || '',
            gender: data.gender || '',
            address: data.address || '',
            city: data.city || '',
            country: data.country || 'UAE',
            nationality: data.nationality || '',
            emergency_contact_name: data.emergency_contact_name || '',
            emergency_contact_phone: data.emergency_contact_phone || '',
            preferred_language: data.preferred_language || 'en',
            how_did_you_hear: data.how_did_you_hear || '',
            notes: data.notes || '',
            photo_url: data.photo_url || '',
            is_active: data.is_active !== false,
          });

          // Load medical history
          loadMedicalHistory(data.id);
        }
      } catch (err) {
        console.error('Error fetching patient:', err);
        setMessage({ type: 'error', text: 'Failed to load patient data' });
      } finally {
        setIsFetching(false);
      }
    };

    fetchPatient();
  }, [id, isEdit, tenantId]);

  const loadMedicalHistory = async (patientId) => {
    const { data, error } = await supabase
      .from('medical_history')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    if (data && !error) {
      setMedicalHistory({
        ...data,
        allergies: data.allergies || [],
        current_medications: data.current_medications || [],
      });
    }
  };

  // Check for duplicate patients by phone number
  const checkDuplicatePatient = async (phone) => {
    if (!phone || phone.length < 6) {
      setDuplicateWarning(null);
      return;
    }

    // Don't check for duplicates when editing existing patient
    if (isEdit) return;

    setCheckingDuplicate(true);
    try {
      // Normalize phone number (remove spaces, dashes, etc.)
      const normalizedPhone = phone.replace(/[\s\-()]/g, '');
      const safeNormalizedPhone = escapeSearchTerm(normalizedPhone);
      const safePhone = escapeSearchTerm(phone);
      
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone, patient_code')
        .eq('tenant_id', tenantId)
        .or(`phone.ilike.%${safeNormalizedPhone}%,phone.ilike.%${safePhone}%`)
        .limit(5);

      if (error) throw error;

      if (data && data.length > 0) {
        setDuplicateWarning({
          message: `Found ${data.length} existing patient(s) with similar phone number`,
          patients: data
        });
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error('Error checking duplicates:', err);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  // Debounced phone check
  useEffect(() => {
    if (!patient.phone || isEdit) return;
    
    const timer = setTimeout(() => {
      checkDuplicatePatient(patient.phone);
    }, 500);

    return () => clearTimeout(timer);
  }, [patient.phone, isEdit]);

  const handlePatientChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPatient(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleMedicalChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMedicalHistory(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !medicalHistory.allergies.includes(allergyInput.trim())) {
      setMedicalHistory(prev => ({
        ...prev,
        allergies: [...prev.allergies, allergyInput.trim()],
      }));
      setAllergyInput('');
    }
  };

  const removeAllergy = (allergy) => {
    setMedicalHistory(prev => ({
      ...prev,
      allergies: prev.allergies.filter(a => a !== allergy),
    }));
  };

  const addMedication = () => {
    if (medicationInput.trim() && !medicalHistory.current_medications.includes(medicationInput.trim())) {
      setMedicalHistory(prev => ({
        ...prev,
        current_medications: [...prev.current_medications, medicationInput.trim()],
      }));
      setMedicationInput('');
    }
  };

  const removeMedication = (medication) => {
    setMedicalHistory(prev => ({
      ...prev,
      current_medications: prev.current_medications.filter(m => m !== medication),
    }));
  };

  // Photo upload handler
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    setUploadingPhoto(true);
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `patients/${timestamp}_${safeName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // Update patient state
      setPatient(prev => ({ ...prev, photo_url: publicUrl }));
      setMessage({ type: 'success', text: 'Photo uploaded successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Photo upload error:', error);
      setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setPatient(prev => ({ ...prev, photo_url: '' }));
  };

  // Sanitize empty strings to null for database
  const sanitizePatientData = (data) => {
    const sanitized = { ...data };
    // Construct name from first_name and last_name (required field)
    sanitized.name = `${data.first_name || ''} ${data.last_name || ''}`.trim();
    // Add tenant_id for data isolation (only on create)
    if (!isEdit && tenantId) {
      sanitized.tenant_id = tenantId;
    }
    // Date fields - convert empty string to null
    if (sanitized.date_of_birth === '') sanitized.date_of_birth = null;
    // Other optional fields (convert empty strings to null)
    ['email', 'address', 'city', 'nationality', 'emergency_contact_name', 
     'emergency_contact_phone', 'how_did_you_hear', 'notes', 'photo_url',
     'country_code', 'phone_country_code', 'preferred_currency'].forEach(field => {
      if (sanitized[field] === '') sanitized[field] = null;
    });
    return sanitized;
  };

  const sanitizeMedicalData = (data) => {
    const sanitized = { ...data };
    // Date fields
    if (sanitized.last_dental_visit === '') sanitized.last_dental_visit = null;
    // Optional text fields
    ['other_conditions', 'allergy_notes', 'previous_dental_surgeries', 
     'smoking_frequency', 'additional_notes'].forEach(field => {
      if (sanitized[field] === '') sanitized[field] = null;
    });
    // dental_anxiety_level should be null if no anxiety
    if (!sanitized.has_dental_anxiety) sanitized.dental_anxiety_level = null;
    return sanitized;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Run validation
    const validationErrors = validatePatient(patient);
    if (validationErrors.length > 0) {
      setMessage({ type: 'error', text: validationErrors[0] });
      return;
    }
    
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let patientId = id;
      const cleanPatient = sanitizePatientData(patient);

      if (isEdit) {
        // Update patient
        const { error } = await supabase
          .from('patients')
          .update(cleanPatient)
          .eq('id', id)
          .eq('tenant_id', tenantId);

        if (error) throw error;
      } else {
        // Create patient
        const { data, error } = await supabase
          .from('patients')
          .insert(cleanPatient)
          .select()
          .single();

        if (error) throw error;
        patientId = data.id;
      }

      // Save medical history
      const medicalData = sanitizeMedicalData({
        ...medicalHistory,
        patient_id: patientId,
      });

      // Check if medical history exists
      const { data: existing } = await supabase
        .from('medical_history')
        .select('id')
        .eq('patient_id', patientId)
        .single();

      if (existing) {
        // Update
        await supabase
          .from('medical_history')
          .update(medicalData)
          .eq('patient_id', patientId);
      } else {
        // Insert
        await supabase
          .from('medical_history')
          .insert(medicalData);
      }

      setMessage({ type: 'success', text: 'Patient saved successfully!' });
      setTimeout(() => navigate('/patients'), 1500);
    } catch (error) {
      console.error('Error saving patient:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save patient' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'medical', label: 'Medical Conditions', icon: Heart },
    { id: 'allergies', label: 'Allergies', icon: AlertTriangle },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'dental', label: 'Dental History', icon: Stethoscope },
  ];

  if (isEdit && isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Patient' : 'Add New Patient'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? `Patient Code: ${patientCode || 'Loading...'}` : 'Register a new patient with complete medical history'}
          </p>
        </div>
        {isEdit && patientCode && (
          <Link
            to={`/patients/${id}/view`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Profile
          </Link>
        )}
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              Basic Information
            </h2>

            {/* Photo Upload Section */}
            <div className="flex items-start gap-6 pb-4 border-b border-gray-100">
              <div className="flex-shrink-0">
                {patient.photo_url ? (
                  <div className="relative group">
                    <img
                      src={patient.photo_url}
                      alt="Patient photo"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-md">
                    <User className="w-10 h-10 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Photo
                </label>
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      {patient.photo_url ? 'Change Photo' : 'Upload Photo'}
                    </>
                  )}
                </button>
                <p className="mt-1 text-xs text-gray-500">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={patient.first_name}
                  onChange={handlePatientChange}
                  required
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
                  value={patient.last_name}
                  onChange={handlePatientChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={patient.date_of_birth}
                  onChange={handlePatientChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={patient.gender}
                  onChange={handlePatientChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  name="nationality"
                  value={patient.nationality}
                  onChange={handlePatientChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Emirati, Egyptian, Indian"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Language
                </label>
                <select
                  name="preferred_language"
                  value={patient.preferred_language}
                  onChange={handlePatientChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  How did you hear about us?
                </label>
                <select
                  name="how_did_you_hear"
                  value={patient.how_did_you_hear}
                  onChange={handlePatientChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select option</option>
                  <option value="google">Google Search</option>
                  <option value="social_media">Social Media</option>
                  <option value="friend">Friend/Family Referral</option>
                  <option value="doctor">Doctor Referral</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={patient.is_active}
                onChange={handlePatientChange}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="font-medium text-gray-900">Active Patient</span>
                <p className="text-sm text-gray-500">Inactive patients won't appear in searches</p>
              </div>
            </label>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary-500" />
              Contact Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <div className="flex gap-2">
                  {/* Phone Country Code Picker */}
                  <select
                    value={patient.phone_country_code || defaultCountry?.phone_code || '+20'}
                    onChange={(e) => setPatient(prev => ({ ...prev, phone_country_code: e.target.value }))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                  >
                    {countries.length === 0 && <option value="">Loading...</option>}
                    {countries.map(c => (
                      <option key={c.code} value={c.phone_code}>
                        {c.flag_emoji || ''} {c.phone_code}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <input
                      type="tel"
                      name="phone"
                      value={patient.phone}
                      onChange={handlePatientChange}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        duplicateWarning ? 'border-yellow-400' : 'border-gray-300'
                      }`}
                      placeholder="1144848521"
                    />
                    {checkingDuplicate && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Duplicate Warning */}
                {duplicateWarning && !isEdit && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">
                          {duplicateWarning.message}
                        </p>
                        <div className="mt-2 space-y-1">
                          {duplicateWarning.patients.map(p => (
                            <Link
                              key={p.id}
                              to={`/patients/view/${p.id}`}
                              className="block text-sm text-yellow-700 hover:text-yellow-900 hover:underline"
                            >
                              {p.first_name} {p.last_name} • {p.phone} • {p.patient_code}
                            </Link>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-yellow-600">
                          Click a patient to view their profile, or continue if this is a new patient.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={patient.email}
                  onChange={handlePatientChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="patient@email.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={patient.address}
                  onChange={handlePatientChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={patient.city}
                  onChange={handlePatientChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Dubai"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Country of Residence
                </label>
                <select
                  name="country_code"
                  value={patient.country_code || defaultCountry?.code || 'EG'}
                  onChange={(e) => {
                    const selectedCountry = countries.find(c => c.code === e.target.value);
                    setPatient(prev => ({ 
                      ...prev, 
                      country_code: e.target.value,
                      country: selectedCountry?.name_en || '',
                      phone_country_code: selectedCountry?.phone_code || prev.phone_country_code
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  {countries.length === 0 && <option value="">Loading countries...</option>}
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.flag_emoji || ''} {c.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Preferred Billing Currency
                </label>
                <select
                  name="preferred_currency"
                  value={patient.preferred_currency || defaultCurrency?.code || 'EGP'}
                  onChange={(e) => setPatient(prev => ({ ...prev, preferred_currency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  {currencies.length === 0 && <option value="">Loading currencies...</option>}
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.name_en} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="border-gray-200" />

            <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              Emergency Contact
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={patient.emergency_contact_name}
                  onChange={handlePatientChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Emergency contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={patient.emergency_contact_phone}
                  onChange={handlePatientChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="+971 50 123 4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={patient.notes}
                onChange={handlePatientChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Any additional notes about the patient..."
              />
            </div>
          </div>
        )}

        {/* Medical Conditions Tab */}
        {activeTab === 'medical' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Medical Conditions
            </h2>
            <p className="text-sm text-gray-500">
              Please indicate if the patient has any of the following conditions
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'has_diabetes', label: 'Diabetes' },
                { name: 'has_hypertension', label: 'Hypertension (High Blood Pressure)' },
                { name: 'has_heart_disease', label: 'Heart Disease' },
                { name: 'has_bleeding_disorder', label: 'Bleeding Disorder' },
                { name: 'has_hepatitis', label: 'Hepatitis' },
                { name: 'has_hiv', label: 'HIV/AIDS' },
                { name: 'has_asthma', label: 'Asthma' },
                { name: 'has_epilepsy', label: 'Epilepsy' },
                { name: 'has_pregnancy', label: 'Pregnancy' },
              ].map(condition => (
                <label key={condition.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    name={condition.name}
                    checked={medicalHistory[condition.name]}
                    onChange={handleMedicalChange}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700">{condition.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other Medical Conditions
              </label>
              <textarea
                name="other_conditions"
                value={medicalHistory.other_conditions}
                onChange={handleMedicalChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="List any other medical conditions not mentioned above..."
              />
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Important Notice</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This information is crucial for safe dental treatment. Please ensure all medical conditions are accurately recorded.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Allergies Tab */}
        {activeTab === 'allergies' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Allergies
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'allergic_to_anesthesia', label: 'Allergic to Anesthesia' },
                { name: 'allergic_to_penicillin', label: 'Allergic to Penicillin' },
                { name: 'allergic_to_latex', label: 'Allergic to Latex' },
              ].map(allergy => (
                <label key={allergy.name} className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer border-2 transition-colors ${
                  medicalHistory[allergy.name] 
                    ? 'bg-red-50 border-red-300' 
                    : 'bg-gray-50 border-transparent hover:bg-gray-100'
                }`}>
                  <input
                    type="checkbox"
                    name={allergy.name}
                    checked={medicalHistory[allergy.name]}
                    onChange={handleMedicalChange}
                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-700 font-medium">{allergy.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other Allergies
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Type an allergy and press Enter or click Add"
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              
              {medicalHistory.allergies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {medicalHistory.allergies.map((allergy, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => removeAllergy(allergy)}
                        className="hover:text-red-900 ml-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allergy Notes
              </label>
              <textarea
                name="allergy_notes"
                value={medicalHistory.allergy_notes}
                onChange={handleMedicalChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Additional details about allergies, severity, reactions..."
              />
            </div>
          </div>
        )}

        {/* Medications Tab */}
        {activeTab === 'medications' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-500" />
              Current Medications
            </h2>

            <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer border-2 transition-colors max-w-md ${
              medicalHistory.taking_blood_thinners 
                ? 'bg-red-50 border-red-300' 
                : 'bg-gray-50 border-transparent hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                name="taking_blood_thinners"
                checked={medicalHistory.taking_blood_thinners}
                onChange={handleMedicalChange}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-gray-700 font-medium">Taking Blood Thinners</span>
                <p className="text-sm text-gray-500">e.g., Warfarin, Aspirin, Plavix</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Medications List
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={medicationInput}
                  onChange={(e) => setMedicationInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedication())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter medication name and press Enter"
                />
                <button
                  type="button"
                  onClick={addMedication}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              
              {medicalHistory.current_medications.length > 0 ? (
                <div className="space-y-2">
                  {medicalHistory.current_medications.map((medication, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-blue-500" />
                        <span className="text-blue-700 font-medium">{medication}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedication(medication)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No medications added</p>
              )}
            </div>
          </div>
        )}

        {/* Dental History Tab */}
        {activeTab === 'dental' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary-500" />
              Dental History
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Dental Visit
                </label>
                <input
                  type="date"
                  name="last_dental_visit"
                  value={medicalHistory.last_dental_visit}
                  onChange={handleMedicalChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-3 h-full">
                  <input
                    type="checkbox"
                    name="has_dental_anxiety"
                    checked={medicalHistory.has_dental_anxiety}
                    onChange={handleMedicalChange}
                    className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700">Patient has dental anxiety</span>
                </label>
              </div>
            </div>

            {medicalHistory.has_dental_anxiety && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anxiety Level (1-10)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    name="dental_anxiety_level"
                    min="1"
                    max="10"
                    value={medicalHistory.dental_anxiety_level}
                    onChange={handleMedicalChange}
                    className="flex-1"
                  />
                  <span className={`text-lg font-bold px-3 py-1 rounded ${
                    medicalHistory.dental_anxiety_level <= 3 ? 'bg-green-100 text-green-700' :
                    medicalHistory.dental_anxiety_level <= 6 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {medicalHistory.dental_anxiety_level}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Mild</span>
                  <span>Moderate</span>
                  <span>Severe</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Previous Dental Surgeries
              </label>
              <textarea
                name="previous_dental_surgeries"
                value={medicalHistory.previous_dental_surgeries}
                onChange={handleMedicalChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="List any previous dental surgeries, extractions, implants, etc."
              />
            </div>

            <hr className="border-gray-200" />

            <h3 className="text-md font-semibold text-gray-900">Lifestyle</h3>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_smoker"
                  checked={medicalHistory.is_smoker}
                  onChange={handleMedicalChange}
                  className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-700">Patient is a smoker</span>
              </label>
            </div>

            {medicalHistory.is_smoker && (
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Smoking Frequency
                </label>
                <select
                  name="smoking_frequency"
                  value={medicalHistory.smoking_frequency}
                  onChange={handleMedicalChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select frequency</option>
                  <option value="occasional">Occasional (few per week)</option>
                  <option value="light">Light (few per day)</option>
                  <option value="moderate">Moderate (half pack/day)</option>
                  <option value="heavy">Heavy (1+ pack/day)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                name="additional_notes"
                value={medicalHistory.additional_notes}
                onChange={handleMedicalChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Any other relevant medical or dental information..."
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-3">
            {activeTab !== 'dental' && (
              <button
                type="button"
                onClick={() => {
                  const tabIndex = tabs.findIndex(t => t.id === activeTab);
                  if (tabIndex < tabs.length - 1) {
                    setActiveTab(tabs[tabIndex + 1].id);
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Next Tab
              </button>
            )}
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
                  {isEdit ? 'Update Patient' : 'Create Patient'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;
