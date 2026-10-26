import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { escapeHTML } from '../../../utils/validation';
import { useTenant } from '../../contexts/TenantContext';

const FREQUENCY_LABELS = {
  once_daily: 'Once daily',
  twice_daily: 'Twice daily',
  three_times_daily: 'Three times daily',
  four_times_daily: 'Four times daily',
  every_4_hours: 'Every 4 hours',
  every_6_hours: 'Every 6 hours',
  every_8_hours: 'Every 8 hours',
  every_12_hours: 'Every 12 hours',
  as_needed: 'As needed (PRN)',
  before_meals: 'Before meals',
  after_meals: 'After meals',
  at_bedtime: 'At bedtime',
  weekly: 'Weekly',
  other: 'Other',
};

const DURATION_LABELS = {
  '3_days': '3 days',
  '5_days': '5 days',
  '7_days': '7 days',
  '10_days': '10 days',
  '14_days': '14 days',
  '21_days': '21 days',
  '30_days': '30 days',
  '60_days': '60 days',
  '90_days': '90 days',
  'ongoing': 'Ongoing',
  'other': 'Other',
};

const PrescriptionPrint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const printRef = useRef();
  const [prescription, setPrescription] = useState(null);
  const [clinicInfo, setClinicInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    loadData();
  }, [id, tenantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load prescription
      const { data: prescriptionData, error: prescriptionError } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, date_of_birth, gender),
          doctors:doctor_id (id, name_en, name_ar, specialty_en, specialty_ar),
          prescription_items (
            *,
            medications:medication_id (name_en, name_ar, generic_name)
          )
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (prescriptionError) throw prescriptionError;
      
      // Sort items by sequence
      if (prescriptionData.prescription_items) {
        prescriptionData.prescription_items.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
      }
      
      setPrescription(prescriptionData);

      // Load clinic info
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*')
        .in('key', ['clinic_info', 'general']);

      if (settingsData) {
        const settings = {};
        settingsData.forEach(s => {
          try {
            settings[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
          } catch {
            settings[s.key] = s.value;
          }
        });
        setClinicInfo(settings);
      }
    } catch (error) {
      console.error('Error loading prescription:', error);
    } finally {
      setLoading(false);
    }
  };

  // Issue #33: Escape HTML in user-provided fields to prevent XSS
  const getPatientName = (patient) => {
    if (!patient) return 'Unknown Patient';
    const name = patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
    return escapeHTML(name);
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Prescription not found</p>
      </div>
    );
  }

  const patient = prescription.patients;
  const doctor = prescription.doctors;
  const patientAge = calculateAge(patient?.date_of_birth);
  const clinic = clinicInfo?.clinic_info || clinicInfo?.general || {};

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Control Bar - Hidden when printing */}
      <div className="print:hidden bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Prescription
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
        </div>
      </div>

      {/* Print Content */}
      <div className="max-w-4xl mx-auto p-4 print:p-0 print:max-w-none">
        <div 
          ref={printRef}
          className="bg-white shadow-lg print:shadow-none p-8 print:p-6"
          style={{ minHeight: '297mm' }}
        >
          {/* Clinic Header */}
          <div className="border-b-2 border-gray-300 pb-4 mb-4">
            <div className="flex items-start gap-4">
              {clinic.logo_url && (
                <img 
                  src={clinic.logo_url} 
                  alt="Clinic Logo" 
                  className="w-20 h-20 object-contain"
                />
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {clinic.name_en || clinic.name || 'Dental Clinic'}
                </h1>
                {clinic.name_ar && (
                  <h2 className="text-xl font-semibold text-gray-700 text-right" dir="rtl">
                    {clinic.name_ar}
                  </h2>
                )}
                <p className="text-gray-600 mt-1">
                  {clinic.address || clinic.address_en || ''}
                </p>
                <p className="text-gray-600">
                  {clinic.phone && `Phone: ${clinic.phone}`}
                  {clinic.phone && clinic.email && ' | '}
                  {clinic.email && `Email: ${clinic.email}`}
                </p>
              </div>
            </div>
          </div>

          {/* Prescription Title */}
          <div className="text-center mb-6">
            <div className="inline-block">
              <h2 className="text-3xl font-bold text-gray-900">℞ PRESCRIPTION</h2>
              <div className="flex justify-center gap-8 mt-2 text-gray-600">
                <span>Rx No: <strong>{prescription.prescription_number || `RX-${prescription.id.slice(0, 8).toUpperCase()}`}</strong></span>
                <span>Date: <strong>{formatDate(prescription.prescribed_date || prescription.created_at)}</strong></span>
              </div>
            </div>
          </div>

          {/* Patient & Doctor Info */}
          <div className="grid grid-cols-2 gap-6 mb-6 border border-gray-300 rounded-lg p-4">
            {/* Patient Info */}
            <div>
              <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                PATIENT INFORMATION
              </h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Name:</span> <strong>{getPatientName(patient)}</strong></p>
                <p>
                  {patientAge && <><span className="text-gray-600">Age:</span> <strong>{patientAge} years</strong></>}
                  {patientAge && patient?.gender && ' | '}
                  {patient?.gender && <><span className="text-gray-600">Gender:</span> <strong className="capitalize">{patient.gender}</strong></>}
                </p>
                {patient?.phone && (
                  <p><span className="text-gray-600">Phone:</span> <strong>{patient.phone}</strong></p>
                )}
              </div>
            </div>

            {/* Doctor Info */}
            <div>
              <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                DOCTOR INFORMATION
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>Dr. {doctor?.name_en || 'Unknown'}</strong></p>
                {doctor?.specialty_en && (
                  <p><span className="text-gray-600">Specialty:</span> {doctor.specialty_en}</p>
                )}
              </div>
            </div>
          </div>

          {/* Medications */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 border-b-2 border-gray-300 pb-1 mb-4 text-lg">
              MEDICATIONS
            </h3>
            <div className="space-y-4">
              {prescription.prescription_items?.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">
                        {escapeHTML(item.medication_name)}
                        {item.dosage && <span className="text-gray-600 font-normal ml-2">({escapeHTML(item.dosage)})</span>}
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                        {item.frequency && (
                          <p><span className="text-gray-600">Frequency:</span> {FREQUENCY_LABELS[item.frequency] || item.frequency}</p>
                        )}
                        {item.duration && (
                          <p><span className="text-gray-600">Duration:</span> {DURATION_LABELS[item.duration] || item.duration}</p>
                        )}
                        {item.quantity && (
                          <p><span className="text-gray-600">Quantity:</span> {item.quantity}</p>
                        )}
                      </div>
                      {item.instructions && (
                        <p className="mt-2 text-sm bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                          <span className="text-yellow-800 font-medium">Instructions:</span> {escapeHTML(item.instructions)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {prescription.notes && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-2">
                NOTES
              </h3>
              <p className="text-gray-700">{escapeHTML(prescription.notes)}</p>
            </div>
          )}

          {/* Signature Section */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-gray-600">
                  Valid Until: <strong>{formatDate(prescription.valid_until)}</strong>
                </p>
              </div>
              <div className="text-center">
                <div className="w-48 border-b border-gray-400 mb-2"></div>
                <p className="text-sm text-gray-600">Doctor's Signature</p>
                <p className="font-semibold">Dr. {doctor?.name_en || 'Unknown'}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
            <p>⚠️ This prescription is valid for 30 days from date of issue</p>
            {clinic.phone && (
              <p>For emergencies call: {clinic.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrescriptionPrint;
