import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search,
  User,
  Upload,
  X,
  AlertCircle,
  ImageIcon,
  ScanLine
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { escapeSearchTerm } from '../../../utils/validation';
import { useTenant } from '../../contexts/TenantContext';

const XrayForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { tenantId } = useTenant();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    xray_type_id: '',
    tooth_number: '',
    title: '',
    captured_at: new Date().toISOString().split('T')[0],
    image_url: '',
    notes: '',
  });

  // Reference data
  const [doctors, setDoctors] = useState([]);
  const [xrayTypes, setXrayTypes] = useState([]);
  
  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDoctors();
    loadXrayTypes();
    if (isEditing) {
      loadXray();
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

  const loadXrayTypes = async () => {
    const { data } = await supabase
      .from('xray_types')
      .select('*')
      .eq('is_active', true)
      .order('name_en');
    setXrayTypes(data || []);
  };

  const loadXray = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('xrays')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        patient_id: data.patient_id || '',
        doctor_id: data.doctor_id || '',
        xray_type_id: data.xray_type_id || '',
        tooth_number: data.tooth_number || '',
        title: data.title || '',
        captured_at: data.captured_at ? data.captured_at.split('T')[0] : '',
        image_url: data.image_url || '',
        notes: data.notes || '',
      });

      if (data.patients) {
        setSelectedPatient(data.patients);
        setPatientSearch(getPatientName(data.patients));
      }
    } catch (error) {
      console.error('Error loading x-ray:', error);
      setMessage({ type: 'error', text: 'Failed to load x-ray record' });
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

  // Image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Issue #20 Fix: Validate file extension (not just MIME type)
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'dicom', 'dcm'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      setMessage({ type: 'error', text: `Invalid file type. Allowed: ${allowedExtensions.join(', ')}` });
      return;
    }
    
    // Also check MIME type as additional validation
    if (!file.type.startsWith('image/') && !['application/dicom'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }
    
    // Issue #20 Fix: Validate file magic bytes for common image formats
    const validateMagicBytes = async (file) => {
      const buffer = await file.slice(0, 8).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      // JPEG: FF D8 FF
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return true;
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return true;
      // GIF: 47 49 46 38
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
      // WebP: 52 49 46 46 ... 57 45 42 50
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return true;
      // BMP: 42 4D
      if (bytes[0] === 0x42 && bytes[1] === 0x4D) return true;
      // DICOM: 44 49 43 4D (at offset 128, but allow files that claim to be DICOM)
      if (['dicom', 'dcm'].includes(fileExt)) return true;
      
      return false;
    };
    
    const isValidMagic = await validateMagicBytes(file);
    if (!isValidMagic) {
      setMessage({ type: 'error', text: 'File content does not match a valid image format' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 10MB' });
      return;
    }

    setUploading(true);
    try {
      // Issue #21 Fix: Use crypto.randomUUID() for unpredictable filenames
      const uniqueId = crypto.randomUUID();
      const fileName = `xray_${uniqueId}.${fileExt}`;
      const filePath = `xrays/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      setMessage({ type: 'success', text: 'Image uploaded successfully' });
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

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

    // Validate image - required field
    if (!formData.image_url) {
      setMessage({ type: 'error', text: 'Please upload an x-ray image' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        patient_id: formData.patient_id,
        doctor_id: formData.doctor_id,
        xray_type_id: formData.xray_type_id || null,
        tooth_number: formData.tooth_number || null,
        title: formData.title || null,
        captured_at: formData.captured_at || new Date().toISOString(),
        image_url: formData.image_url,
        notes: formData.notes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('xrays')
          .update(payload)
          .eq('id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('xrays')
          .insert(payload);

        if (error) throw error;
      }

      setMessage({ type: 'success', text: `X-ray record ${isEditing ? 'updated' : 'created'} successfully` });
      setTimeout(() => navigate('/xrays'), 1000);
    } catch (error) {
      console.error('Error saving x-ray:', error);
      setMessage({ type: 'error', text: 'Failed to save x-ray record' });
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
              {isEditing ? 'Edit X-Ray Record' : 'New X-Ray Order'}
            </h1>
            <p className="text-gray-500">
              {isEditing ? 'Update x-ray details' : 'Create a new x-ray order for a patient'}
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

          {/* X-Ray Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-gray-400" />
              X-Ray Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* X-Ray Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  X-Ray Type
                </label>
                <select
                  value={formData.xray_type_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, xray_type_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select type...</option>
                  {xrayTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name_en || type.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tooth Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tooth Number</label>
                <input
                  type="text"
                  value={formData.tooth_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, tooth_number: e.target.value }))}
                  placeholder="e.g., 14, 36"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Title/Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title/Description</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Upper Right Quadrant"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Date Captured */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Captured</label>
                <input
                  type="date"
                  value={formData.captured_at}
                  onChange={(e) => setFormData(prev => ({ ...prev, captured_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Doctor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordering Doctor <span className="text-red-500">*</span>
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
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sidebar - Image Upload */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-gray-400" />
              X-Ray Image
            </h2>

            {formData.image_url ? (
              <div className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={formData.image_url}
                    alt="X-Ray"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <a
                  href={formData.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-sm text-primary-600 hover:text-primary-700"
                >
                  View Full Size
                </a>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="xray-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="xray-upload"
                  className="cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="w-10 h-10 mx-auto text-gray-400 animate-spin" />
                  ) : (
                    <Upload className="w-10 h-10 mx-auto text-gray-400" />
                  )}
                  <p className="mt-2 text-sm text-gray-600">
                    {uploading ? 'Uploading...' : 'Click to upload x-ray image'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Max 10MB</p>
                </label>
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="font-medium text-blue-800 mb-2">Tips</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Supported formats: JPEG, PNG, DICOM</li>
              <li>• Ensure image is clear and properly oriented</li>
              <li>• Include patient name marker if visible</li>
              <li>• Add clinical findings after review</li>
            </ul>
          </div>
        </div>
      </div>
    </form>
  );
};

export default XrayForm;
