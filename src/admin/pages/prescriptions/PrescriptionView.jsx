import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Printer,
  User,
  Stethoscope,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  XCircle,
  Pill,
  Copy,
  Building2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  filled: { label: 'Filled', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-700', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const FREQUENCY_LABELS = {
  once_daily: 'Once daily',
  twice_daily: 'Twice daily (BID)',
  three_times_daily: 'Three times daily (TID)',
  four_times_daily: 'Four times daily (QID)',
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
  '7_days': '7 days (1 week)',
  '10_days': '10 days',
  '14_days': '14 days (2 weeks)',
  '21_days': '21 days (3 weeks)',
  '30_days': '30 days (1 month)',
  '60_days': '60 days (2 months)',
  '90_days': '90 days (3 months)',
  'ongoing': 'Ongoing',
  'other': 'Other',
};

const PrescriptionView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tenantId } = useTenant();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [clinicInfo, setClinicInfo] = useState(null);

  useEffect(() => {
    if (!tenantId) return;
    loadPrescription();
    loadClinicInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenantId]);

  const loadPrescription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email, date_of_birth, gender),
          doctors:doctor_id (id, name_en, name_ar, specialty_en, license_number),
          prescription_items (
            *,
            medications:medication_id (name_en, name_ar, generic_name)
          )
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      
      // Sort items by sequence
      if (data.prescription_items) {
        data.prescription_items.sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0));
      }
      
      setPrescription(data);
    } catch (error) {
      console.error('Error loading prescription:', error);
      setMessage({ type: 'error', text: 'Failed to load prescription' });
    } finally {
      setLoading(false);
    }
  };

  const loadClinicInfo = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      setClinicInfo(data);
    } catch (error) {
      console.error('Error loading clinic info:', error);
    }
  };

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown Patient';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  const _handlePrint = () => {
    window.print();
  };

  const handleDuplicate = async () => {
    if (!prescription) return;
    
    try {
      // Create a new prescription based on the existing one
      const { data: newPrescription, error: presError } = await supabase
        .from('prescriptions')
        .insert({
          tenant_id: tenantId,
          patient_id: prescription.patient_id,
          doctor_id: prescription.doctor_id,
          prescribed_date: new Date().toISOString().split('T')[0],
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          diagnosis: prescription.diagnosis,
          notes: prescription.notes,
          status: 'active',
        })
        .select()
        .single();

      if (presError) throw presError;

      // Duplicate items
      if (prescription.prescription_items?.length > 0) {
        const items = prescription.prescription_items.map((item, index) => ({
          prescription_id: newPrescription.id,
          medication_id: item.medication_id,
          medication_name: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions,
          sequence_order: index + 1,
        }));

        const { error: itemsError } = await supabase
          .from('prescription_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      navigate(`/prescriptions/edit/${newPrescription.id}`);
    } catch (error) {
      console.error('Error duplicating prescription:', error);
      setMessage({ type: 'error', text: 'Failed to duplicate prescription' });
    }
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
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Prescription Not Found</h2>
        <p className="text-gray-500 mb-4">The requested prescription could not be found.</p>
        <Link to="/prescriptions" className="text-primary-600 hover:text-primary-700">
          ← Back to Prescriptions
        </Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[prescription.status] || STATUS_CONFIG.active;
  const StatusIcon = status.icon;
  const patientAge = calculateAge(prescription.patients?.date_of_birth);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header - Hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Prescription {prescription.prescription_number || `RX-${prescription.id.slice(0, 8).toUpperCase()}`}
            </h1>
            <p className="text-gray-500">View prescription details</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <Link
            to={`/prescriptions/${id}/print`}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Printer className="w-4 h-4" />
            Print
          </Link>
          <Link
            to={`/prescriptions/edit/${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg print:hidden ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Print Layout - Prescription */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 print:shadow-none print:p-4">
        {/* Print Header */}
        <div className="print:block hidden text-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">
            {clinicInfo?.clinic_name_en || clinicInfo?.clinic_name || 'Dental Clinic'}
          </h1>
          {clinicInfo?.address && <p className="text-sm text-gray-600">{clinicInfo.address}</p>}
          {clinicInfo?.phone && <p className="text-sm text-gray-600">Tel: {clinicInfo.phone}</p>}
        </div>

        {/* Prescription Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold">Prescription</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color} print:border print:border-current`}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
            </div>
            <p className="text-gray-500 font-mono">
              {prescription.prescription_number || `RX-${prescription.id.slice(0, 8).toUpperCase()}`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium">Date: {formatDate(prescription.prescribed_date)}</p>
            {prescription.valid_until && (
              <p className="text-sm text-gray-500">Valid until: {formatDate(prescription.valid_until)}</p>
            )}
          </div>
        </div>

        {/* Patient & Doctor Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-lg print:bg-white print:border">
          {/* Patient */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Patient
            </h3>
            <p className="font-medium text-lg">{getPatientName(prescription.patients)}</p>
            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
              {patientAge !== null && <p>Age: {patientAge} years</p>}
              {prescription.patients?.gender && <p>Gender: {prescription.patients.gender}</p>}
              {prescription.patients?.phone && <p>Phone: {prescription.patients.phone}</p>}
            </div>
          </div>

          {/* Doctor */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Prescribing Doctor
            </h3>
            <p className="font-medium text-lg">
              Dr. {prescription.doctors?.name_en || prescription.doctors?.name_ar}
            </p>
            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
              {prescription.doctors?.specialty_en && <p>{prescription.doctors.specialty_en}</p>}
              {prescription.doctors?.license_number && <p>License: {prescription.doctors.license_number}</p>}
            </div>
          </div>
        </div>

        {/* Diagnosis */}
        {prescription.diagnosis && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Diagnosis</h3>
            <p className="text-gray-900">{prescription.diagnosis}</p>
          </div>
        )}

        {/* Medications */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Medications
          </h3>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 print:bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Medication</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Dosage</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Frequency</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prescription.prescription_items?.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.medication_name}</p>
                      {item.instructions && (
                        <p className="text-xs text-gray-500 mt-1 italic">{item.instructions}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{item.dosage || '-'}</td>
                    <td className="px-4 py-3 text-sm">{FREQUENCY_LABELS[item.frequency] || item.frequency || '-'}</td>
                    <td className="px-4 py-3 text-sm">{DURATION_LABELS[item.duration] || item.duration || '-'}</td>
                    <td className="px-4 py-3 text-sm">{item.quantity || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        {prescription.notes && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 print:bg-white">
            <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{prescription.notes}</p>
          </div>
        )}

        {/* Signature Line - Print only */}
        <div className="hidden print:block mt-12 pt-8 border-t">
          <div className="flex justify-between">
            <div className="text-center">
              <div className="w-48 border-b border-gray-400 mb-2"></div>
              <p className="text-sm text-gray-600">Doctor's Signature</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-b border-gray-400 mb-2"></div>
              <p className="text-sm text-gray-600">Date</p>
            </div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-gray-500">
          <p>This prescription is valid only with doctor's signature and clinic stamp.</p>
          <p className="mt-1">Generated on {new Date().toLocaleDateString()} | {clinicInfo?.clinic_name_en || 'Dento Dental Clinic'}</p>
        </div>
      </div>

      {/* Quick Actions - Hidden in print */}
      <div className="print:hidden grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to={`/patients/${prescription.patient_id}/view`}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">View Patient Profile</p>
            <p className="text-sm text-gray-500">See full patient information</p>
          </div>
        </Link>

        <Link
          to={`/prescriptions/create?patient=${prescription.patient_id}`}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Pill className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">New Prescription</p>
            <p className="text-sm text-gray-500">Create another for this patient</p>
          </div>
        </Link>

        <Link
          to="/prescriptions"
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">All Prescriptions</p>
            <p className="text-sm text-gray-500">Back to prescriptions list</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default PrescriptionView;
