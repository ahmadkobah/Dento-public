import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Loader2, 
  User,
  Calendar,
  FileText,
  AlertCircle,
  FileCheck,
  PenTool,
  CheckCircle,
  XCircle,
  Download,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { sanitizeConsentForm } from '../../../utils/sanitize';

const STATUS_CONFIG = {
  pending: { label: 'Pending Signature', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  signed: { label: 'Signed', color: 'bg-green-100 text-green-700', icon: '✅' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: '❌' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-700', icon: '⏰' },
  revoked: { label: 'Revoked', color: 'bg-orange-100 text-orange-700', icon: '🚫' },
};

const ConsentFormView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const sigCanvasRef = useRef(null);
  const printContentRef = useRef(null);
  const { tenantId } = useTenant();
  
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [clinicInfo, setClinicInfo] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [message, setMessage] = useState(null);
  const [signing, setSigning] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [fullscreenSignature, setFullscreenSignature] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadForm();
    loadClinicInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenantId]);

  const loadForm = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consent_forms')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email, date_of_birth),
          consent_templates:template_id (*),
          doctors:doctor_id (id, name_en, name_ar, specialty_en)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      setForm(data);
      if (data.doctors) setDoctorInfo(data.doctors);
    } catch (error) {
      console.error('Error loading consent form:', error);
      setMessage({ type: 'error', text: 'Failed to load consent form' });
    } finally {
      setLoading(false);
    }
  };

  const loadClinicInfo = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .eq('tenant_id', tenantId);
      // Convert key-value rows into a flat object
      const info = {};
      (data || []).forEach(row => {
        if (row.key === 'seo') {
          info.clinic_name = row.value?.title || '';
        } else if (row.key === 'contact') {
          info.phone = row.value?.phone || '';
          info.email = row.value?.email || '';
        } else if (row.key === 'branding') {
          info.logo_url = row.value?.logo_url || '';
        }
      });
      setClinicInfo(info);
    } catch (error) {
      console.error('Error loading clinic info:', error);
    }
  };

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get content based on form language
  const getContent = useCallback(() => {
    if (!form) return '';
    const lang = form.language || 'en';
    const template = form.consent_templates;
    if (form.custom_content) return form.custom_content;
    if (!template) return '';
    if (lang === 'ar') return template.content_ar || template.content_en || '';
    return template.content_en || template.content_ar || '';
  }, [form]);

  const getTemplateName = useCallback(() => {
    if (!form?.consent_templates) return 'Consent Form';
    const lang = form.language || 'en';
    const t = form.consent_templates;
    if (lang === 'ar') return t.name_ar || t.name_en || 'Consent Form';
    return t.name_en || t.name_ar || 'Consent Form';
  }, [form]);

  const isArabic = form?.language === 'ar';

  // Signature handlers
  const handleSign = async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setMessage({ type: 'error', text: 'Please provide a signature' });
      return;
    }

    const signatureDataUrl = sigCanvasRef.current.getCanvas().toDataURL('image/png');

    setSigning(true);
    try {
      const { error } = await supabase
        .from('consent_forms')
        .update({ 
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_data: signatureDataUrl,
          ip_address: 'web-client',
          user_agent: navigator.userAgent,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setShowSignatureModal(false);
      setFullscreenSignature(false);
      setMessage({ type: 'success', text: 'Consent form signed successfully' });
      loadForm();
    } catch (error) {
      console.error('Error signing form:', error);
      setMessage({ type: 'error', text: 'Failed to sign consent form' });
    } finally {
      setSigning(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to mark this consent as declined?')) return;
    
    try {
      const { error } = await supabase
        .from('consent_forms')
        .update({ status: 'declined' })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Consent form declined' });
      loadForm();
    } catch (error) {
      console.error('Error declining form:', error);
      setMessage({ type: 'error', text: 'Failed to update status' });
    }
  };

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this consent?')) return;
    
    try {
      const { error } = await supabase
        .from('consent_forms')
        .update({ status: 'revoked' })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Consent has been revoked' });
      loadForm();
    } catch (error) {
      console.error('Error revoking form:', error);
      setMessage({ type: 'error', text: 'Failed to revoke consent' });
    }
  };

  const clearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
  };

  // PDF Export
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const element = printContentRef.current;
      if (!element) return;

      // Make element visible for capture
      element.style.display = 'block';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794, // A4 width at 96 DPI
      });

      element.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Additional pages if content overflows
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const patientName = getPatientName(form.patients).replace(/\s+/g, '_');
      const templateType = form.consent_templates?.procedure_type || 'consent';
      pdf.save(`consent_${templateType}_${patientName}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      setMessage({ type: 'success', text: 'PDF exported successfully' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setMessage({ type: 'error', text: 'Failed to export PDF' });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Consent form not found</p>
        <button
          onClick={() => navigate('/consent-forms')}
          className="mt-4 text-primary-600 hover:underline"
        >
          Back to Consent Forms
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[form.status] || STATUS_CONFIG.pending;
  const template = form.consent_templates;
  const canSign = form.status === 'pending';
  const clinicName = clinicInfo?.clinic_name || 'Dental Clinic';
  const clinicLogo = clinicInfo?.logo_url || null;

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
            <h1 className="text-2xl font-bold text-gray-900">Consent Form</h1>
            <p className="text-gray-500">{getTemplateName()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={() => navigate(`/consent-forms/${id}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Edit className="w-5 h-5" />
            Edit
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
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Status</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.icon} {statusConfig.label}
              </span>
            </div>

            {/* Language Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">Language:</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                {isArabic ? '🇸🇦 العربية' : '🇬🇧 English'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {canSign && (
                <>
                  <button
                    onClick={() => setShowSignatureModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <PenTool className="w-4 h-4" />
                    Sign Consent
                  </button>
                  <button
                    onClick={handleDecline}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                </>
              )}
              {form.status === 'signed' && (
                <button
                  onClick={handleRevoke}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50"
                >
                  Revoke Consent
                </button>
              )}
            </div>
          </div>

          {/* Consent Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-gray-400" />
              Consent Document
            </h2>

            {/* Template Description */}
            {template?.description_en && !isArabic && (
              <p className="text-gray-600 mb-4 pb-4 border-b border-gray-100">
                {template.description_en}
              </p>
            )}
            {template?.description_ar && isArabic && (
              <p className="text-gray-600 mb-4 pb-4 border-b border-gray-100 text-right" dir="rtl">
                {template.description_ar}
              </p>
            )}

            {/* Main Content */}
            <div 
              className={`prose max-w-none ${isArabic ? 'text-right' : ''}`}
              dir={isArabic ? 'rtl' : 'ltr'}
            >
              <div 
                className="text-gray-700"
                dangerouslySetInnerHTML={{ __html: sanitizeConsentForm(getContent()) }}
              />
            </div>

            {/* Signature Display */}
            {form.status === 'signed' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 text-green-600 mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Signed on {formatDateTime(form.signed_at)}</span>
                </div>
                
                {form.signature_data && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <p className="text-sm text-gray-500 mb-2">Patient Signature:</p>
                    <img 
                      src={form.signature_data} 
                      alt="Patient signature" 
                      className="max-h-24"
                    />
                  </div>
                )}

                {form.witness_name && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Witness</p>
                    <p className="font-medium text-gray-900">{form.witness_name}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Patient Information
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{getPatientName(form.patients)}</p>
              </div>
              {form.patients?.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{form.patients.phone}</p>
                </div>
              )}
              {form.patients?.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{form.patients.email}</p>
                </div>
              )}
              {form.patients?.date_of_birth && (
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium text-gray-900">{formatDate(form.patients.date_of_birth)}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(`/patients/${form.patient_id}`)}
              className="mt-4 w-full px-4 py-2 text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50"
            >
              View Patient Profile
            </button>
          </div>

          {/* Form Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Form Details
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(form.created_at)}</p>
              </div>
              {form.signed_at && (
                <div>
                  <p className="text-sm text-gray-500">Signed</p>
                  <p className="font-medium text-green-600">{formatDateTime(form.signed_at)}</p>
                </div>
              )}
              {template?.procedure_type && (
                <div>
                  <p className="text-sm text-gray-500">Procedure Type</p>
                  <p className="font-medium text-gray-900 capitalize">{template.procedure_type.replace(/_/g, ' ')}</p>
                </div>
              )}
              {doctorInfo && (
                <div>
                  <p className="text-sm text-gray-500">Doctor</p>
                  <p className="font-medium text-gray-900">{doctorInfo.name_en || doctorInfo.name_ar}</p>
                  {doctorInfo.specialty_en && (
                    <p className="text-xs text-gray-500">{doctorInfo.specialty_en}</p>
                  )}
                </div>
              )}
              {template?.validity_days && (
                <div>
                  <p className="text-sm text-gray-500">Validity Period</p>
                  <p className="font-medium text-gray-900">{template.validity_days} days</p>
                </div>
              )}
            </div>
          </div>

          {/* Risks Summary */}
          {template && (isArabic ? template.risks_ar : template.risks_en) && (
            <div className="bg-red-50 rounded-xl p-4">
              <h3 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {isArabic ? 'ملخص المخاطر' : 'Risks Summary'}
              </h3>
              <p className={`text-sm text-red-700 ${isArabic ? 'text-right' : ''}`} dir={isArabic ? 'rtl' : 'ltr'}>
                {isArabic ? (template.risks_ar || template.risks_en) : (template.risks_en || template.risks_ar)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className={`fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 ${fullscreenSignature ? '' : ''}`}>
          <div className={`bg-white rounded-xl w-full ${fullscreenSignature ? 'max-w-full h-full m-0 rounded-none' : 'max-w-lg'} p-6 flex flex-col`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sign Consent Form</h3>
              <button
                onClick={() => setFullscreenSignature(!fullscreenSignature)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title={fullscreenSignature ? 'Exit fullscreen' : 'Fullscreen (better for tablets)'}
              >
                <Maximize2 className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              By signing below, the patient confirms that they have read and understood the consent document 
              and agree to proceed with the treatment.
            </p>

            {/* Signature Canvas — react-signature-canvas with touch support */}
            <div className={`border-2 border-dashed border-gray-300 rounded-lg mb-4 bg-white ${fullscreenSignature ? 'flex-1' : ''}`}>
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{
                  className: `w-full ${fullscreenSignature ? 'h-full' : 'h-48'} cursor-crosshair touch-none`,
                  style: { width: '100%', height: fullscreenSignature ? '100%' : '192px' },
                }}
                penColor="black"
                minWidth={1.5}
                maxWidth={3}
                velocityFilterWeight={0.7}
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={clearSignature}
                className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Signature
              </button>
              <p className="text-xs text-gray-400">Draw with mouse or finger (touch)</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  setFullscreenSignature(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSign}
                disabled={signing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {signing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PenTool className="w-4 h-4" />
                )}
                {signing ? 'Signing...' : 'Confirm Signature'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print/PDF Content */}
      <div ref={printContentRef} style={{ display: 'none', width: '794px', padding: '40px', fontFamily: 'Arial, sans-serif', backgroundColor: '#fff' }}>
        {/* Clinic Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #0d9488', paddingBottom: '20px', marginBottom: '20px' }}>
          {clinicLogo && (
            <img src={clinicLogo} alt="Clinic Logo" style={{ height: '60px', margin: '0 auto 10px', display: 'block' }} crossOrigin="anonymous" />
          )}
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0d9488', margin: '0 0 4px' }}>
            {clinicName}
          </h1>
          {clinicInfo?.address && (
            <p style={{ fontSize: '12px', color: '#666', margin: '2px 0' }}>{clinicInfo.address}</p>
          )}
          {clinicInfo?.phone && (
            <p style={{ fontSize: '12px', color: '#666', margin: '2px 0' }}>Tel: {clinicInfo.phone}</p>
          )}
        </div>

        {/* Form Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' }}>
            {getTemplateName()}
          </h2>
          <p style={{ fontSize: '12px', color: '#888' }}>
            Form ID: {id?.slice(0, 8)} | Created: {formatDate(form?.created_at)}
          </p>
        </div>

        {/* Patient Info */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', marginBottom: '20px', backgroundColor: '#f9fafb' }}>
          <table style={{ width: '100%', fontSize: '13px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px', fontWeight: 'bold', width: '30%' }}>Patient Name:</td>
                <td style={{ padding: '4px 8px' }}>{getPatientName(form?.patients)}</td>
              </tr>
              {form?.patients?.date_of_birth && (
                <tr>
                  <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Date of Birth:</td>
                  <td style={{ padding: '4px 8px' }}>{formatDate(form.patients.date_of_birth)}</td>
                </tr>
              )}
              {form?.patients?.phone && (
                <tr>
                  <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Phone:</td>
                  <td style={{ padding: '4px 8px' }}>{form.patients.phone}</td>
                </tr>
              )}
              {doctorInfo && (
                <tr>
                  <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Attending Doctor:</td>
                  <td style={{ padding: '4px 8px' }}>{doctorInfo.name_en || doctorInfo.name_ar}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>Date:</td>
                <td style={{ padding: '4px 8px' }}>{formatDateTime(form?.created_at)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Form Content */}
        <div 
          style={{ fontSize: '13px', lineHeight: '1.7', direction: isArabic ? 'rtl' : 'ltr', textAlign: isArabic ? 'right' : 'left' }}
          dangerouslySetInnerHTML={{ __html: sanitizeConsentForm(getContent()) }}
        />

        {/* Signature Section */}
        <div style={{ marginTop: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
          {form?.status === 'signed' && form?.signature_data ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Patient Signature:</p>
                <img src={form.signature_data} alt="Signature" style={{ maxHeight: '60px', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '4px' }} />
                <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                  Signed: {formatDateTime(form.signed_at)}
                </p>
              </div>
              {form.witness_name && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Witness:</p>
                  <p style={{ fontSize: '13px', fontWeight: 'bold' }}>{form.witness_name}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
              <div>
                <div style={{ borderBottom: '1px solid #000', width: '250px', marginBottom: '5px' }}>&nbsp;</div>
                <p style={{ fontSize: '12px', color: '#666' }}>Patient Signature</p>
              </div>
              <div>
                <div style={{ borderBottom: '1px solid #000', width: '150px', marginBottom: '5px' }}>&nbsp;</div>
                <p style={{ fontSize: '12px', color: '#666' }}>Date</p>
              </div>
              <div>
                <div style={{ borderBottom: '1px solid #000', width: '200px', marginBottom: '5px' }}>&nbsp;</div>
                <p style={{ fontSize: '12px', color: '#666' }}>Witness</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '30px', paddingTop: '10px', borderTop: '1px solid #e5e7eb', textAlign: 'center', fontSize: '10px', color: '#999' }}>
          <p>This document was generated by {clinicName} using Dento Clinic Management System</p>
          <p>Generated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default ConsentFormView;
