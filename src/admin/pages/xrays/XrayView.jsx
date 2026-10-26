import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Printer,
  User,
  Stethoscope,
  Calendar,
  AlertCircle,
  Loader2,
  Download,
  ZoomIn,
  ScanLine
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const XrayView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tenantId } = useTenant();
  const [xray, setXray] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    loadXray();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenantId]);

  const loadXray = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('xrays')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email, date_of_birth),
          doctors:doctor_id (id, name_en, name_ar, specialty_en),
          xray_types:xray_type_id (id, name_en, name_ar, description)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      setXray(data);
    } catch (error) {
      console.error('Error loading x-ray:', error);
      setMessage({ type: 'error', text: 'Failed to load x-ray record' });
    } finally {
      setLoading(false);
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

  if (!xray) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">X-Ray Not Found</h2>
        <p className="text-gray-500 mb-4">The requested x-ray record could not be found.</p>
        <Link to="/xrays" className="text-primary-600 hover:text-primary-700">
          ← Back to X-Rays
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">X-Ray Record</h1>
            <p className="text-gray-500">{xray.xray_types?.name_en || xray.xray_types?.name_ar || 'View x-ray details'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {xray.image_url && (
            <a
              href={xray.image_url}
              download
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <Link
            to={`/xrays/edit/${id}`}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Image */}
        <div className="lg:col-span-2 space-y-6">
          {/* X-Ray Image */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-gray-400" />
                X-Ray Image
              </h2>
              {xray.image_url && (
                <button
                  onClick={() => setShowImageModal(true)}
                  className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 print:hidden"
                >
                  <ZoomIn className="w-4 h-4" />
                  Full Screen
                </button>
              )}
            </div>

            {xray.image_url ? (
              <div 
                className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden cursor-pointer print:bg-white"
                onClick={() => setShowImageModal(true)}
              >
                <img
                  src={xray.image_url}
                  alt="X-Ray"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <ScanLine className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No image uploaded</p>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {xray.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{xray.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Patient
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{getPatientName(xray.patients)}</p>
              </div>
              {xray.patients?.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{xray.patients.phone}</p>
                </div>
              )}
              <Link
                to={`/patients/${xray.patient_id}/view`}
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 print:hidden"
              >
                View Patient Profile →
              </Link>
            </div>
          </div>

          {/* Doctor Info */}
          {xray.doctors && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-gray-400" />
                Ordering Doctor
              </h3>
              <div className="space-y-2">
                <p className="font-medium">{xray.doctors.name_en || xray.doctors.name_ar}</p>
                {xray.doctors.specialty_en && (
                  <p className="text-sm text-gray-500">{xray.doctors.specialty_en}</p>
                )}
              </div>
            </div>
          )}

          {/* X-Ray Type Info */}
          {xray.xray_types && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-gray-400" />
                X-Ray Type
              </h3>
              <div className="space-y-2">
                <p className="font-medium">{xray.xray_types.name_en || xray.xray_types.name_ar}</p>
                {xray.xray_types.description && (
                  <p className="text-sm text-gray-500">{xray.xray_types.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Details
            </h3>
            <div className="space-y-3">
              {xray.tooth_number && (
                <div>
                  <p className="text-sm text-gray-500">Tooth Number</p>
                  <p className="font-medium">#{xray.tooth_number}</p>
                </div>
              )}
              {xray.region && (
                <div>
                  <p className="text-sm text-gray-500">Region</p>
                  <p className="font-medium">{xray.region}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Date Taken</p>
                <p className="font-medium">{formatDate(xray.taken_at || xray.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && xray.image_url && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-lg"
          >
            <XCircle className="w-8 h-8" />
          </button>
          <img
            src={xray.image_url}
            alt="X-Ray Full Size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>Generated on {new Date().toLocaleDateString()} | Dento Dental Clinic</p>
      </div>
    </div>
  );
};

export default XrayView;
