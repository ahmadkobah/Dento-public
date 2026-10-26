import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Search,
  User,
  AlertCircle,
  FileCheck,
  FileText,
  Languages,
  Eye
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { sanitizeConsentForm } from '../../../utils/sanitize';
import { escapeSearchTerm } from '../../../utils/validation';
import { useTenant } from '../../contexts/TenantContext';

const ConsentFormForm = () => {
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
    template_id: '',
    doctor_id: '',
    custom_content: '',
    witness_name: '',
    language: 'en',
  });

  // Doctors for dropdown
  const [doctors, setDoctors] = useState([]);

  // Reference data
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // Load initial data
  useEffect(() => {
    loadTemplates();
    loadDoctors();
    if (isEditing) {
      loadForm();
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

  const loadTemplates = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('consent_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setTemplates(data || []);
  };

  const loadForm = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consent_forms')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email),
          consent_templates:template_id (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        patient_id: data.patient_id || '',
        template_id: data.template_id || '',
        doctor_id: data.doctor_id || '',
        custom_content: data.custom_content || '',
        witness_name: data.witness_name || '',
        language: data.language || 'en',
      });

      if (data.patients) {
        setSelectedPatient(data.patients);
        setPatientSearch(getPatientName(data.patients));
      }

      if (data.consent_templates) {
        setSelectedTemplate(data.consent_templates);
      }
    } catch (error) {
      console.error('Error loading consent form:', error);
      setMessage({ type: 'error', text: 'Failed to load consent form' });
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

  // Handle template selection
  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template || null);
    setFormData(prev => ({ ...prev, template_id: templateId }));
  };

  // Get template content based on selected language
  const getTemplateContent = (template, lang) => {
    if (!template) return '';
    if (lang === 'ar') return template.content_ar || template.content_en || '';
    return template.content_en || template.content_ar || '';
  };

  const getTemplateName = (template, lang) => {
    if (!template) return '';
    if (lang === 'ar') return template.name_ar || template.name_en || '';
    return template.name_en || template.name_ar || '';
  };

  const getTemplateDescription = (template, lang) => {
    if (!template) return '';
    if (lang === 'ar') return template.description_ar || template.description_en || '';
    return template.description_en || template.description_ar || '';
  };

  const getTemplateRisks = (template, lang) => {
    if (!template) return '';
    if (lang === 'ar') return template.risks_ar || template.risks_en || '';
    return template.risks_en || template.risks_ar || '';
  };

  const isArabic = formData.language === 'ar';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.patient_id) {
      setMessage({ type: 'error', text: 'Please select a patient' });
      return;
    }

    if (!formData.template_id) {
      setMessage({ type: 'error', text: 'Please select a consent template' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        patient_id: formData.patient_id,
        template_id: formData.template_id || null,
        doctor_id: formData.doctor_id || null,
        custom_content: formData.custom_content || null,
        witness_name: formData.witness_name || null,
        language: formData.language,
        status: 'pending',
      };

      if (isEditing) {
        const { error } = await supabase
          .from('consent_forms')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('consent_forms')
          .insert(payload);
        if (error) throw error;
      }

      setMessage({ type: 'success', text: `Consent form ${isEditing ? 'updated' : 'created'} successfully` });
      setTimeout(() => navigate('/consent-forms'), 1000);
    } catch (error) {
      console.error('Error saving consent form:', error);
      setMessage({ type: 'error', text: 'Failed to save consent form' });
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
              {isEditing ? 'Edit Consent Form' : 'New Consent Form'}
            </h1>
            <p className="text-gray-500">
              {isEditing ? 'Update consent form details' : 'Create a new patient consent form'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedTemplate && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                showPreview ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Eye className="w-5 h-5" />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
          )}
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
        <div className={`${showPreview ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-6`}>
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
                    className="text-green-600 hover:text-green-700"
                  >
                    Change
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

          {/* Language Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Languages className="w-5 h-5 text-gray-400" />
              Form Language
            </h2>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, language: 'en' }))}
                className={`flex-1 px-4 py-3 rounded-lg border-2 text-center transition-all ${
                  formData.language === 'en'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="text-2xl block mb-1">🇬🇧</span>
                <span className="font-medium text-sm">English</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, language: 'ar' }))}
                className={`flex-1 px-4 py-3 rounded-lg border-2 text-center transition-all ${
                  formData.language === 'ar'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="text-2xl block mb-1">🇸🇦</span>
                <span className="font-medium text-sm">العربية</span>
              </button>
            </div>
          </div>

          {/* Template Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-gray-400" />
              Consent Template
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Template <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.template_id}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Choose a template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {isArabic
                        ? (template.name_ar || template.name_en)
                        : (template.name_en || template.name_ar)}
                      {template.procedure_type && ` — ${template.procedure_type}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Info Card */}
              {selectedTemplate && !showPreview && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {getTemplateName(selectedTemplate, formData.language)}
                  </h3>
                  {getTemplateDescription(selectedTemplate, formData.language) && (
                    <p className={`text-sm text-gray-600 mb-2 ${isArabic ? 'text-right' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
                      {getTemplateDescription(selectedTemplate, formData.language)}
                    </p>
                  )}
                  {selectedTemplate.validity_days && (
                    <p className="text-xs text-gray-500">
                      Valid for {selectedTemplate.validity_days} days from signing
                    </p>
                  )}
                  {getTemplateRisks(selectedTemplate, formData.language) && (
                    <div className={`mt-2 pt-2 border-t border-gray-200 ${isArabic ? 'text-right' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
                      <p className="text-xs font-medium text-red-600 mb-1">
                        {isArabic ? 'المخاطر الرئيسية:' : 'Key Risks:'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {getTemplateRisks(selectedTemplate, formData.language)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Content Override */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Content (Optional)
                </label>
                <textarea
                  value={formData.custom_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, custom_content: e.target.value }))}
                  rows={4}
                  dir={isArabic ? 'rtl' : 'ltr'}
                  placeholder={isArabic ? 'أضف محتوى إضافي...' : 'Override or add to template content...'}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none ${isArabic ? 'text-right' : ''}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use template content as-is
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && selectedTemplate && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-gray-400" />
                Live Preview
              </h2>
              <div 
                className={`prose prose-sm max-w-none max-h-[70vh] overflow-y-auto border border-gray-100 rounded-lg p-4 bg-gray-50 ${isArabic ? 'text-right' : ''}`}
                dir={isArabic ? 'rtl' : 'ltr'}
              >
                <div 
                  className="text-gray-700"
                  dangerouslySetInnerHTML={{ 
                    __html: sanitizeConsentForm(
                      formData.custom_content || getTemplateContent(selectedTemplate, formData.language)
                    ) 
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Doctor Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Attending Doctor
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                <select
                  value={formData.doctor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, doctor_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
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

          {/* Witness Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Witness (Optional)
            </h2>

            <input
              type="text"
              value={formData.witness_name}
              onChange={(e) => setFormData(prev => ({ ...prev, witness_name: e.target.value }))}
              placeholder="Witness name..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Info Box */}
          <div className="bg-teal-50 rounded-xl p-4">
            <h3 className="font-medium text-teal-800 mb-2">About Consent Forms</h3>
            <ul className="text-sm text-teal-700 space-y-1">
              <li>• Select language before creating</li>
              <li>• Patient must sign to confirm</li>
              <li>• PDF export available after creation</li>
              <li>• Touch signature on tablets</li>
              <li>• Forms are timestamped for compliance</li>
            </ul>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ConsentFormForm;
