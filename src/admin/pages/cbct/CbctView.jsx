import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Printer, 
  Loader2, 
  User,
  Calendar,
  FileText,
  Box,
  AlertCircle,
  Stethoscope,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  ExternalLink,
  Trash2,
  Image
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const STATUS_CONFIG = {
  requested: { label: 'Requested', color: 'bg-blue-100 text-blue-700', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-yellow-100 text-yellow-700', icon: Calendar },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  reported: { label: 'Reported', color: 'bg-purple-100 text-purple-700', icon: FileText },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const PRIORITY_CONFIG = {
  routine: { label: 'Routine', color: 'bg-gray-100 text-gray-700' },
  urgent: { label: 'Urgent', color: 'bg-orange-100 text-orange-700' },
  emergency: { label: 'Emergency', color: 'bg-red-100 text-red-700' },
};

const CbctView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tenantId } = useTenant();
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [scan, setScan] = useState(null);
  const [message, setMessage] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanForm, setScanForm] = useState({
    scan_reference_id: '',
    notes: ''
  });

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenantId]);

  const loadOrder = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Load order
      const { data: orderData, error: orderError } = await supabase
        .from('cbct_orders')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email, date_of_birth),
          doctors:requesting_doctor_id (id, name_en, name_ar),
          cbct_scan_regions:scan_region_id (id, name_en, name_ar)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Load existing scan if any
      const { data: scanData } = await supabase
        .from('cbct_scans')
        .select('*')
        .eq('order_id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (scanData) {
        setScan(scanData);
        setScanForm({
          scan_reference_id: scanData.scan_reference_id || '',
          notes: scanData.notes || ''
        });
      }
    } catch (error) {
      console.error('Error loading CBCT order:', error);
      setMessage({ type: 'error', text: 'Failed to load CBCT order details' });
    } finally {
      setLoading(false);
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

  const updateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('cbct_orders')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setOrder(prev => ({ ...prev, status: newStatus }));
      setMessage({ type: 'success', text: 'Status updated successfully' });
    } catch (error) {
      console.error('Error updating status:', error);
      setMessage({ type: 'error', text: 'Failed to update status' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Handle scan file upload
  const handleScanUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 500MB for DICOM files)
    if (file.size > 500 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 500MB' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cbct_${id}_${Date.now()}.${fileExt}`;
      const filePath = `cbct/${fileName}`;

      // Upload file to storage
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

      // Create or update scan record
      if (scan) {
        // Update existing scan
        const { error: updateError } = await supabase
          .from('cbct_scans')
          .update({
            dicom_path: publicUrl,
            scan_reference_id: scanForm.scan_reference_id || null,
            notes: scanForm.notes || null,
            scanned_at: new Date().toISOString()
          })
          .eq('id', scan.id)
          .eq('tenant_id', tenantId);

        if (updateError) throw updateError;
      } else {
        // Create new scan record
        const { data: newScan, error: insertError } = await supabase
          .from('cbct_scans')
          .insert({
            order_id: id,
            tenant_id: tenantId,
            dicom_path: publicUrl,
            scan_reference_id: scanForm.scan_reference_id || null,
            notes: scanForm.notes || null,
            scanned_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setScan(newScan);
      }

      // Update order status to completed if it was scheduled
      if (order.status === 'scheduled' || order.status === 'requested') {
        await supabase
          .from('cbct_orders')
          .update({ status: 'completed' })
          .eq('id', id)
          .eq('tenant_id', tenantId);
        setOrder(prev => ({ ...prev, status: 'completed' }));
      }

      setMessage({ type: 'success', text: 'Scan uploaded successfully' });
      loadOrder(); // Reload to get updated data
    } catch (error) {
      console.error('Error uploading scan:', error);
      setMessage({ type: 'error', text: 'Failed to upload scan: ' + error.message });
    } finally {
      setUploading(false);
    }
  };

  // Handle thumbnail upload
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 10MB' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `cbct_thumb_${id}_${Date.now()}.${fileExt}`;
      const filePath = `cbct/thumbnails/${fileName}`;

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

      if (scan) {
        await supabase
          .from('cbct_scans')
          .update({ thumbnail_url: publicUrl })
          .eq('id', scan.id)
          .eq('tenant_id', tenantId);
        setScan(prev => ({ ...prev, thumbnail_url: publicUrl }));
      }

      setMessage({ type: 'success', text: 'Thumbnail uploaded successfully' });
    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      setMessage({ type: 'error', text: 'Failed to upload thumbnail' });
    } finally {
      setUploading(false);
    }
  };

  // Save scan notes
  const handleSaveScanNotes = async () => {
    if (!scan) return;
    
    try {
      const { error } = await supabase
        .from('cbct_scans')
        .update({
          scan_reference_id: scanForm.scan_reference_id || null,
          notes: scanForm.notes || null
        })
        .eq('id', scan.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Scan details saved' });
    } catch (error) {
      console.error('Error saving scan details:', error);
      setMessage({ type: 'error', text: 'Failed to save scan details' });
    }
  };

  // Delete scan
  const handleDeleteScan = async () => {
    if (!scan || !confirm('Are you sure you want to delete this scan?')) return;

    try {
      const { error } = await supabase
        .from('cbct_scans')
        .delete()
        .eq('id', scan.id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setScan(null);
      setScanForm({ scan_reference_id: '', notes: '' });
      setMessage({ type: 'success', text: 'Scan deleted successfully' });
    } catch (error) {
      console.error('Error deleting scan:', error);
      setMessage({ type: 'error', text: 'Failed to delete scan' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">CBCT order not found</p>
        <button
          onClick={() => navigate('/cbct')}
          className="mt-4 text-primary-600 hover:underline"
        >
          Back to CBCT List
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.requested;
  const priorityConfig = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG.routine;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header - Hide on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CBCT Order Details</h1>
            <p className="text-gray-500">
              Order #{order.order_number || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          <button
            onClick={() => navigate(`/cbct/edit/${id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Edit className="w-5 h-5" />
            Edit
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">CBCT Order Request</h1>
        <p className="text-gray-500">Order #{order.order_number || '-'}</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 print:hidden ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          <AlertCircle className="w-5 h-5" />
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-1">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Status</h2>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityConfig.color}`}>
                  {priorityConfig.label}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusConfig.color}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* Status Actions */}
            <div className="flex flex-wrap gap-2 print:hidden">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => updateStatus(key)}
                    disabled={updatingStatus || order.status === key}
                    className={`px-3 py-1 rounded-lg text-sm border transition-colors flex items-center gap-1 ${
                      order.status === key 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Box className="w-5 h-5 text-gray-400" />
              Order Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Scan Region</p>
                <p className="font-medium text-gray-900">
                  {order.cbct_scan_regions?.name_en || order.cbct_scan_regions?.name_ar || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Priority</p>
                <p className="font-medium text-gray-900">{priorityConfig.label}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Scheduled Date</p>
                <p className="font-medium text-gray-900">{formatDate(order.scheduled_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Date</p>
                <p className="font-medium text-gray-900">{formatDate(order.created_at)}</p>
              </div>
            </div>

            {/* Indication */}
            {order.indication && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Indication</p>
                <p className="text-gray-900">{order.indication}</p>
              </div>
            )}

            {/* Clinical Notes */}
            {order.clinical_notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Clinical Notes</p>
                <p className="text-gray-900 whitespace-pre-wrap">{order.clinical_notes}</p>
              </div>
            )}
          </div>

          {/* CBCT Scan Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                CBCT Scan
              </h2>
              {scan && (
                <button
                  onClick={handleDeleteScan}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors print:hidden"
                  title="Delete scan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {scan ? (
              <div className="space-y-4">
                {/* Thumbnail */}
                {scan.thumbnail_url ? (
                  <div className="relative">
                    <img 
                      src={scan.thumbnail_url} 
                      alt="CBCT Thumbnail" 
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                    <label className="absolute bottom-2 right-2 p-2 bg-white/90 rounded-lg cursor-pointer hover:bg-white transition-colors print:hidden">
                      <Image className="w-4 h-4 text-gray-600" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block w-full h-32 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary-400 transition-colors print:hidden">
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Image className="w-8 h-8 mb-2" />
                      <span className="text-sm">Upload thumbnail image</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}

                {/* Scan File */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">Scan File Uploaded</p>
                      <p className="text-sm text-green-600 truncate max-w-xs">
                        {scan.dicom_path?.split('/').pop() || 'CBCT Scan'}
                      </p>
                      {scan.scanned_at && (
                        <p className="text-xs text-green-500 mt-1">
                          Uploaded: {formatDate(scan.scanned_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 print:hidden">
                      <a
                        href={scan.dicom_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        title="View"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a
                        href={scan.dicom_path}
                        download
                        className="p-2 border border-green-300 text-green-700 rounded-lg hover:bg-green-100"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Scan Details Form */}
                <div className="space-y-3 print:hidden">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scan Reference ID
                    </label>
                    <input
                      type="text"
                      value={scanForm.scan_reference_id}
                      onChange={(e) => setScanForm(prev => ({ ...prev, scan_reference_id: e.target.value }))}
                      placeholder="e.g., SCAN-2026-001"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={scanForm.notes}
                      onChange={(e) => setScanForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any notes about the scan..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <button
                    onClick={handleSaveScanNotes}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Save Details
                  </button>
                </div>

                {/* Replace Scan */}
                <label className="block w-full p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-center print:hidden">
                  <span className="text-sm text-gray-600">
                    {uploading ? 'Uploading...' : 'Replace scan file'}
                  </span>
                  <input
                    type="file"
                    onChange={handleScanUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4 print:hidden">
                {/* Upload Area */}
                <label className={`block w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  uploading ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-400'
                }`}>
                  <div className="flex flex-col items-center text-center">
                    {uploading ? (
                      <>
                        <Loader2 className="w-10 h-10 text-primary-600 animate-spin mb-3" />
                        <p className="font-medium text-primary-700">Uploading scan...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="font-medium text-gray-700">Upload CBCT Scan</p>
                        <p className="text-sm text-gray-500 mt-1">
                          DICOM, ZIP, or other scan files (max 500MB)
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    onChange={handleScanUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>

                {/* Pre-upload form */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scan Reference ID (optional)
                    </label>
                    <input
                      type="text"
                      value={scanForm.scan_reference_id}
                      onChange={(e) => setScanForm(prev => ({ ...prev, scan_reference_id: e.target.value }))}
                      placeholder="e.g., SCAN-2026-001"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={scanForm.notes}
                      onChange={(e) => setScanForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any notes about the scan..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Print view */}
            {!scan && (
              <div className="hidden print:block text-gray-500 text-center py-4">
                No scan uploaded yet
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Patient Information
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{getPatientName(order.patients)}</p>
              </div>
              {order.patients?.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{order.patients.phone}</p>
                </div>
              )}
              {order.patients?.email && (
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{order.patients.email}</p>
                </div>
              )}
              {order.patients?.date_of_birth && (
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium text-gray-900">{formatDate(order.patients.date_of_birth)}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(`/patients/${order.patient_id}`)}
              className="mt-4 w-full px-4 py-2 text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 print:hidden"
            >
              View Patient Profile
            </button>
          </div>

          {/* Doctor Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-gray-400" />
              Requesting Doctor
            </h2>

            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium text-gray-900">
                {order.doctors?.name_en || order.doctors?.name_ar || 'Unknown'}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Timeline
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(order.created_at)}</p>
              </div>
              {order.scheduled_date && (
                <div>
                  <p className="text-sm text-gray-500">Scheduled</p>
                  <p className="font-medium text-gray-900">{formatDate(order.scheduled_date)}</p>
                </div>
              )}
              {order.updated_at !== order.created_at && (
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium text-gray-900">{formatDate(order.updated_at)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>Printed on {new Date().toLocaleDateString()} | Dento Clinic Management System</p>
      </div>
    </div>
  );
};

export default CbctView;
