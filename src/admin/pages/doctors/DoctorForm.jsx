import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, X, Plus, Link2, User, AlertCircle, FileText, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import { useTenant } from '../../contexts/TenantContext';

const DoctorForm = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { tenantId } = useTenant();

  // Fetch branches for dropdown
  const [branches, setBranches] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBranches = async () => {
      if (!tenantId) return;
      const { data } = await supabase
        .from('branches')
        .select('id, name_en')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      setBranches(data || []);
    };
    fetchBranches();
  }, [tenantId]);

  // Fetch users with role 'doctor' who aren't linked to a doctor yet
  const [availableUsers, setAvailableUsers] = useState([]);
  const [linkedUser, setLinkedUser] = useState(null);
  const [doctorData, setDoctorData] = useState(null);

  // Fetch doctor data if editing
  useEffect(() => {
    const fetchDoctor = async () => {
      if (!isEdit || !id || !tenantId) return;
      
      setIsFetching(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('doctors')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('id', id)
          .single();
        
        if (fetchError) throw fetchError;
        setDoctorData({ data });
      } catch (err) {
        console.error('Error fetching doctor:', err);
        setError('Failed to load doctor data');
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchDoctor();
  }, [id, isEdit, tenantId]);

  useEffect(() => {
    const fetchDoctorUsers = async () => {
      if (!tenantId) return;
      // Get users with doctor role
      const { data: doctorUsers } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('tenant_id', tenantId)
        .eq('role', 'doctor')
        .eq('is_active', true);

      // Get doctors that already have user_id
      const { data: linkedDoctors } = await supabase
        .from('doctors')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .not('user_id', 'is', null);

      const linkedUserIds = linkedDoctors?.map(d => d.user_id) || [];
      
      // Filter out already linked users (except current doctor's user if editing)
      const available = (doctorUsers || []).filter(u => {
        if (isEdit && doctorData?.data?.user_id === u.id) return true;
        return !linkedUserIds.includes(u.id);
      });

      setAvailableUsers(available);
    };

    fetchDoctorUsers();
  }, [isEdit, doctorData, tenantId]);

  // Default avatar URLs
  const defaultAvatars = {
    male: 'https://api.dicebear.com/9.x/micah/svg?seed=Avery',
    female: 'https://api.dicebear.com/9.x/micah/svg?seed=Amaya',
  };

  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    title_en: '',
    title_ar: '',
    bio_en: '',
    bio_ar: '',
    gender: 'male',
    photo_url: '',
    specializations: [],
    qualifications: [],
    experience_years: '',
    consultation_fee: '',
    commission_rate: 30,
    branch_id: '',
    user_id: '',
    is_featured: false,
    is_active: true,
    display_order: 0,
    // License fields
    license_number: '',
    license_expiry_date: '',
    license_authority: '',
    // Buffer time
    buffer_minutes: 10,
    working_hours: {
      sunday: { start: '10:00', end: '22:00', off: false },
      monday: { start: '10:00', end: '22:00', off: false },
      tuesday: { start: '10:00', end: '22:00', off: false },
      wednesday: { start: '10:00', end: '22:00', off: false },
      thursday: { start: '10:00', end: '22:00', off: false },
      friday: { start: '', end: '', off: true },
      saturday: { start: '10:00', end: '22:00', off: false },
    },
  });

  // Certificates state
  const [certificates, setCertificates] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [certForm, setCertForm] = useState({
    certificate_name: '',
    certificate_name_ar: '',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    file_url: '',
  });
  const [uploadingCert, setUploadingCert] = useState(false);

  const [newSpecialization, setNewSpecialization] = useState('');
  const [newQualification, setNewQualification] = useState('');
  const [uploading, setUploading] = useState(false);

  // Update form when data loads
  useEffect(() => {
    if (doctorData?.data) {
      const data = doctorData.data;
      setFormData(prev => ({
        ...prev,
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        title_en: data.title_en || '',
        title_ar: data.title_ar || '',
        bio_en: data.bio_en || '',
        bio_ar: data.bio_ar || '',
        gender: data.gender || 'male',
        photo_url: data.photo_url || '',
        specializations: data.specializations || [],
        qualifications: data.qualifications || [],
        experience_years: data.experience_years || '',
        consultation_fee: data.consultation_fee || '',
        commission_rate: data.commission_rate ?? 30,
        branch_id: data.branch_id || '',
        user_id: data.user_id || '',
        is_featured: data.is_featured || false,
        is_active: data.is_active ?? true,
        display_order: data.display_order || 0,
        license_number: data.license_number || '',
        license_expiry_date: data.license_expiry_date || '',
        license_authority: data.license_authority || '',
        buffer_minutes: data.buffer_minutes ?? 10,
        working_hours: data.working_hours || prev.working_hours,
      }));
      
      // Fetch linked user details
      if (data.user_id) {
        supabase
          .from('users')
          .select('id, email, full_name')
          .eq('tenant_id', tenantId)
          .eq('id', data.user_id)
          .single()
          .then(({ data: userData }) => {
            if (userData) setLinkedUser(userData);
          });
      }
    }
  }, [doctorData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleWorkingHoursChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours[day],
          [field]: value,
        },
      },
    }));
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !formData.specializations.includes(newSpecialization.trim())) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization.trim()],
      }));
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== spec),
    }));
  };

  const addQualification = () => {
    if (newQualification.trim() && !formData.qualifications.includes(newQualification.trim())) {
      setFormData(prev => ({
        ...prev,
        qualifications: [...prev.qualifications, newQualification.trim()],
      }));
      setNewQualification('');
    }
  };

  const removeQualification = (qual) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter(q => q !== qual),
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `doctors/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        photo_url: data.publicUrl,
      }));
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({
      ...prev,
      photo_url: '',
    }));
  };

  // Load certificates for doctor
  const loadCertificates = async (doctorId) => {
    if (!doctorId) return;
    setLoadingCerts(true);
    try {
      const { data, error } = await supabase
        .from('doctor_certificates')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('issue_date', { ascending: false });

      if (!error && data) {
        setCertificates(data);
      }
    } catch (err) {
      console.error('Error loading certificates:', err);
    } finally {
      setLoadingCerts(false);
    }
  };

  // Load certificates when editing
  useEffect(() => {
    if (isEdit && id) {
      loadCertificates(id);
    }
  }, [isEdit, id]);

  // Handle certificate file upload
  const handleCertFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCert(true);
    try {
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `certificates/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setCertForm(prev => ({ ...prev, file_url: publicUrl }));
    } catch (err) {
      console.error('Certificate upload error:', err);
      toast.error('Failed to upload certificate file');
    } finally {
      setUploadingCert(false);
    }
  };

  // Save certificate
  const saveCertificate = async () => {
    if (!certForm.certificate_name || !id) {
      toast.error('Certificate name is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('doctor_certificates')
        .insert({
          doctor_id: id,
          certificate_name: certForm.certificate_name,
          certificate_name_ar: certForm.certificate_name_ar || null,
          issuing_authority: certForm.issuing_authority || null,
          issue_date: certForm.issue_date || null,
          expiry_date: certForm.expiry_date || null,
          file_url: certForm.file_url || null,
        });

      if (error) throw error;

      setShowCertModal(false);
      setCertForm({
        certificate_name: '',
        certificate_name_ar: '',
        issuing_authority: '',
        issue_date: '',
        expiry_date: '',
        file_url: '',
      });
      loadCertificates(id);
    } catch (err) {
      console.error('Error saving certificate:', err);
      toast.error('Failed to save certificate');
    }
  };

  // Delete certificate
  const deleteCertificate = async (certId) => {
    if (!confirm('Delete this certificate?')) return;

    try {
      const { error } = await supabase
        .from('doctor_certificates')
        .delete()
        .eq('id', certId);

      if (error) throw error;
      loadCertificates(id);
    } catch (err) {
      console.error('Error deleting certificate:', err);
      toast.error('Failed to delete certificate');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    // Use default avatar based on gender if no photo
    const photoUrl = formData.photo_url || defaultAvatars[formData.gender];
    
    const dataToSubmit = {
      name_en: formData.name_en,
      name_ar: formData.name_ar || formData.name_en,
      title_en: formData.title_en || null,
      title_ar: formData.title_ar || null,
      bio_en: formData.bio_en || null,
      bio_ar: formData.bio_ar || null,
      gender: formData.gender,
      photo_url: photoUrl,
      specializations: formData.specializations.length > 0 ? formData.specializations : null,
      qualifications: formData.qualifications.length > 0 ? formData.qualifications : null,
      experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
      consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
      commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : 30,
      branch_id: formData.branch_id || null,
      user_id: formData.user_id || null,
      is_featured: formData.is_featured,
      is_active: formData.is_active,
      display_order: parseInt(formData.display_order) || 0,
      working_hours: formData.working_hours,
      // License fields
      license_number: formData.license_number || null,
      license_expiry_date: formData.license_expiry_date || null,
      license_authority: formData.license_authority || null,
    };
    
    try {
      if (isEdit) {
        // Update existing doctor
        const { error: updateError } = await supabase
          .from('doctors')
          .update(dataToSubmit)
          .eq('tenant_id', tenantId)
          .eq('id', id);
        
        if (updateError) throw updateError;
      } else {
        // Create new doctor
        const { error: insertError } = await supabase
          .from('doctors')
          .insert({ ...dataToSubmit, tenant_id: tenantId });
        
        if (insertError) throw insertError;
      }
      
      // If doctor has a user_id, also update the user record
      const userId = formData.user_id || doctorData?.user_id;
      if (userId) {
        await supabase
          .from('users')
          .update({
            full_name: formData.name_en,
            gender: formData.gender,
            avatar_url: photoUrl,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId)
          .eq('id', userId);
      }
      
      navigate('/doctors');
    } catch (err) {
      console.error('Error submitting doctor:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const commonSpecializations = [
    'General Dentistry',
    'Orthodontics',
    'Periodontics',
    'Endodontics',
    'Prosthodontics',
    'Oral Surgery',
    'Pediatric Dentistry',
    'Cosmetic Dentistry',
    'Implantology',
    'Oral Medicine',
  ];

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  if (isEdit && isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/doctors')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Doctor' : 'Add New Doctor'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? 'Update doctor information' : 'Add a new doctor to your team'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo & Gender */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h2>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Current Photo or Default Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <img 
                  src={formData.photo_url || defaultAvatars[formData.gender]} 
                  alt="Doctor" 
                  className="w-24 h-24 rounded-full object-cover bg-gray-100"
                />
                {formData.photo_url && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">JPG, PNG up to 2MB</p>
              </div>
            </div>

            {/* Gender Selection for Default Avatar */}
            <div className="md:border-l md:pl-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Default Avatar (if no photo uploaded)
              </label>
              <div className="flex gap-4">
                <label className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.gender === 'male' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <img 
                    src={defaultAvatars.male} 
                    alt="Male avatar" 
                    className="w-16 h-16 rounded-full"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={handleChange}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium">Male</span>
                  </div>
                </label>
                <label className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.gender === 'female' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <img 
                    src={defaultAvatars.female} 
                    alt="Female avatar" 
                    className="w-16 h-16 rounded-full"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={handleChange}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium">Female</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (English) *
              </label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Dr. Ahmed Hassan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (Arabic)
              </label>
              <input
                type="text"
                name="name_ar"
                value={formData.name_ar}
                onChange={handleChange}
                dir="rtl"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="د. أحمد حسن"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title (English)
              </label>
              <input
                type="text"
                name="title_en"
                value={formData.title_en}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Senior Dentist"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title (Arabic)
              </label>
              <input
                type="text"
                name="title_ar"
                value={formData.title_ar}
                onChange={handleChange}
                dir="rtl"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="طبيب أسنان أول"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                name="experience_years"
                value={formData.experience_years}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consultation Fee (AED)
              </label>
              <input
                type="number"
                name="consultation_fee"
                value={formData.consultation_fee}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commission Rate (%)
              </label>
              <input
                type="number"
                name="commission_rate"
                value={formData.commission_rate}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="30"
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentage of procedure amount paid as commission
              </p>
            </div>
          </div>

          {/* License Information */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-500" />
              License Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="DHA-P-0012345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Expiry Date
                </label>
                <input
                  type="date"
                  name="license_expiry_date"
                  value={formData.license_expiry_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Licensing Authority
                </label>
                <input
                  type="text"
                  name="license_authority"
                  value={formData.license_authority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Dubai Health Authority"
                />
              </div>
            </div>
            
            {/* Buffer Time */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buffer Time Between Appointments
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="buffer_minutes"
                  value={formData.buffer_minutes}
                  onChange={handleChange}
                  min="0"
                  max="60"
                  step="5"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-gray-600">minutes</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Personal buffer time for this doctor. Overrides branch setting if higher.
              </p>
            </div>
          </div>

          {/* Certificates Section (only show when editing) */}
          {isEdit && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-500" />
                  Certificates & Credentials
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCertModal(true)}
                  className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Certificate
                </button>
              </div>
              
              {loadingCerts ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : certificates.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No certificates added yet</p>
              ) : (
                <div className="space-y-2">
                  {certificates.map(cert => (
                    <div key={cert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{cert.certificate_name}</p>
                          <p className="text-sm text-gray-500">
                            {cert.issuing_authority}
                            {cert.issue_date && ` • Issued: ${cert.issue_date}`}
                            {cert.expiry_date && ` • Expires: ${cert.expiry_date}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {cert.file_url && (
                          <a
                            href={cert.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-500 hover:underline"
                          >
                            View
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteCertificate(cert.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio (English)
              </label>
              <textarea
                name="bio_en"
                value={formData.bio_en}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Brief bio about the doctor..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio (Arabic)
              </label>
              <textarea
                name="bio_ar"
                value={formData.bio_ar}
                onChange={handleChange}
                rows={3}
                dir="rtl"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="نبذة عن الطبيب..."
              />
            </div>
          </div>
        </div>

        {/* Specializations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Specializations</h2>
          
          <div className="space-y-4">
            {/* Quick add buttons */}
            <div className="flex flex-wrap gap-2">
              {commonSpecializations.map(spec => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => {
                    if (!formData.specializations.includes(spec)) {
                      setFormData(prev => ({
                        ...prev,
                        specializations: [...prev.specializations, spec],
                      }));
                    }
                  }}
                  disabled={formData.specializations.includes(spec)}
                  className="px-3 py-1 text-sm border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  + {spec}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSpecialization}
                onChange={(e) => setNewSpecialization(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Add custom specialization..."
              />
              <button
                type="button"
                onClick={addSpecialization}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Selected specializations */}
            {formData.specializations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.specializations.map(spec => (
                  <span key={spec} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                    {spec}
                    <button
                      type="button"
                      onClick={() => removeSpecialization(spec)}
                      className="hover:text-primary-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Qualifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Qualifications</h2>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newQualification}
                onChange={(e) => setNewQualification(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addQualification())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Add qualification (e.g., BDS, MDS, PhD)..."
              />
              <button
                type="button"
                onClick={addQualification}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {formData.qualifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.qualifications.map(qual => (
                  <span key={qual} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {qual}
                    <button
                      type="button"
                      onClick={() => removeQualification(qual)}
                      className="hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Account Link */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary-500" />
            User Account Link
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Link this doctor to a user account so they can log in to the system.
          </p>
          
          <div>
            {linkedUser ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{linkedUser.full_name || 'No name'}</p>
                  <p className="text-sm text-gray-500">{linkedUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLinkedUser(null);
                    setFormData(prev => ({ ...prev, user_id: '' }));
                  }}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Unlink
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select User Account
                </label>
                <select
                  name="user_id"
                  value={formData.user_id || ''}
                  onChange={(e) => {
                    const userId = e.target.value;
                    setFormData(prev => ({ ...prev, user_id: userId }));
                    if (userId) {
                      const user = availableUsers.find(u => u.id === userId);
                      if (user) setLinkedUser(user);
                    } else {
                      setLinkedUser(null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">No user account linked</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email} ({user.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only users with role "Doctor" who aren't already linked to another doctor are shown.
                  Create a user with role "Doctor" first in the Users page.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Branch Assignment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Branch Assignment</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Branch
              </label>
              <select
                name="branch_id"
                value={formData.branch_id || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">No branch assigned</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                name="display_order"
                value={formData.display_order}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Working Hours</h2>
          
          <div className="space-y-3">
            {days.map(day => (
              <div key={day} className="flex items-center gap-4">
                <div className="w-24">
                  <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.working_hours[day]?.off || false}
                    onChange={(e) => handleWorkingHoursChange(day, 'off', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">Day Off</span>
                </label>
                {!formData.working_hours[day]?.off && (
                  <>
                    <input
                      type="time"
                      value={formData.working_hours[day]?.start || ''}
                      onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      value={formData.working_hours[day]?.end || ''}
                      onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="font-medium text-gray-900">Active Doctor</span>
                <p className="text-sm text-gray-500">Inactive doctors won't be available for appointments</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="font-medium text-gray-900">Featured Doctor</span>
                <p className="text-sm text-gray-500">Featured doctors appear prominently on the website</p>
              </div>
            </label>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || isFetching}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Update Doctor' : 'Create Doctor'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Certificate Modal */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Add Certificate</h2>
              <button onClick={() => setShowCertModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Name *
                </label>
                <input
                  type="text"
                  value={certForm.certificate_name}
                  onChange={(e) => setCertForm(prev => ({ ...prev, certificate_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Board Certification in Orthodontics"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Name (Arabic)
                </label>
                <input
                  type="text"
                  value={certForm.certificate_name_ar}
                  onChange={(e) => setCertForm(prev => ({ ...prev, certificate_name_ar: e.target.value }))}
                  dir="rtl"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issuing Authority
                </label>
                <input
                  type="text"
                  value={certForm.issuing_authority}
                  onChange={(e) => setCertForm(prev => ({ ...prev, issuing_authority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="American Board of Orthodontics"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={certForm.issue_date}
                    onChange={(e) => setCertForm(prev => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={certForm.expiry_date}
                    onChange={(e) => setCertForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate File
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    onChange={handleCertFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="flex-1 text-sm"
                  />
                  {uploadingCert && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                {certForm.file_url && (
                  <p className="text-xs text-green-600 mt-1">File uploaded successfully</p>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCertModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCertificate}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Save Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorForm;
