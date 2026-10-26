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
  AlertCircle,
  Stethoscope,
  Copy
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const ProcedureNoteView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tenantId } = useTenant();
  
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tenantId]);

  const loadNote = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('procedure_notes')
        .select(`
          *,
          patients:patient_id (id, name, first_name, last_name, phone, email, date_of_birth),
          doctors:doctor_id (id, name_en, name_ar),
          procedure_note_templates:template_id (id, name_en, name_ar)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      setNote(data);
    } catch (error) {
      console.error('Error loading procedure note:', error);
      setMessage({ type: 'error', text: 'Failed to load procedure note' });
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

  const handlePrint = () => {
    window.print();
  };

  const handleDuplicate = async () => {
    try {
      const { id: _noteId, created_at: _created_at, updated_at: _updated_at, patients: _patients, doctors: _doctors, procedure_note_templates: _procedure_note_templates, ...noteData } = note;
      
      const { data, error } = await supabase
        .from('procedure_notes')
        .insert({
          ...noteData,
          tenant_id: tenantId,
          procedure_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      
      navigate(`/procedure-notes/${data.id}/edit`);
    } catch (error) {
      console.error('Error duplicating note:', error);
      setMessage({ type: 'error', text: 'Failed to duplicate note' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Procedure note not found</p>
        <button
          onClick={() => navigate('/procedure-notes')}
          className="mt-4 text-primary-600 hover:underline"
        >
          Back to Procedure Notes
        </button>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Procedure Note</h1>
            <p className="text-gray-500">
              {note.procedure_type || note.procedure_note_templates?.name_en || 'Clinical Note'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Copy className="w-5 h-5" />
            Duplicate
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          <button
            onClick={() => navigate(`/procedure-notes/${id}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Edit className="w-5 h-5" />
            Edit
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">Procedure Note</h1>
        <p className="text-gray-500">{note.procedure_type || 'Clinical Procedure'}</p>
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
          {/* Procedure Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-gray-400" />
              Procedure Details
            </h2>

            <div className="space-y-4">
              {/* Type and Teeth */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Procedure Name</p>
                  <p className="font-medium text-gray-900">{note.procedure_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Teeth Involved</p>
                  <p className="font-medium text-gray-900">
                    {note.teeth_involved || '-'}
                  </p>
                </div>
              </div>

              {/* Procedure Performed */}
              {note.procedure_performed && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Procedure Performed</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{note.procedure_performed}</p>
                </div>
              )}

              {/* Anesthesia & Materials */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500">Anesthesia Used</p>
                  <p className="font-medium text-gray-900">{note.anesthesia_used || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Materials Used</p>
                  <p className="font-medium text-gray-900">{note.materials_used || '-'}</p>
                </div>
              </div>

              {/* Complications */}
              {note.complications && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Complications</p>
                  <p className="text-orange-700 bg-orange-50 p-3 rounded-lg">{note.complications}</p>
                </div>
              )}
            </div>
          </div>

          {/* Post-Op Instructions */}
          {note.post_op_instructions && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Post-Operative Instructions
              </h2>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-900 whitespace-pre-wrap">{note.post_op_instructions}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {note.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Additional Notes
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{note.notes}</p>
            </div>
          )}
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
                <p className="font-medium text-gray-900">{getPatientName(note.patients)}</p>
              </div>
              {note.patients?.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{note.patients.phone}</p>
                </div>
              )}
              {note.patients?.date_of_birth && (
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium text-gray-900">{formatDate(note.patients.date_of_birth)}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate(`/patients/${note.patient_id}`)}
              className="mt-4 w-full px-4 py-2 text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 print:hidden"
            >
              View Patient Profile
            </button>
          </div>

          {/* Doctor Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-gray-400" />
              Provider
            </h2>

            <div>
              <p className="text-sm text-gray-500">Doctor</p>
              <p className="font-medium text-gray-900">
                {note.doctors?.name_en || note.doctors?.name_ar || 'Unknown'}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              Dates
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Procedure Date</p>
                <p className="font-medium text-gray-900">{formatDate(note.procedure_date)}</p>
              </div>
              {note.follow_up_date && (
                <div>
                  <p className="text-sm text-gray-500">Follow-up Date</p>
                  <p className="font-medium text-primary-600">{formatDate(note.follow_up_date)}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(note.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Template Info */}
          {note.procedure_note_templates && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Template Used
              </h2>

              <p className="font-medium text-gray-900">
                {note.procedure_note_templates.name_en || note.procedure_note_templates.name_ar}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-500">
          <p>Provider: {note.doctors?.name_en || note.doctors?.name_ar}</p>
          <p>Date: {formatDate(note.procedure_date)}</p>
        </div>
        <p className="text-center mt-4 text-xs text-gray-400">
          Printed on {new Date().toLocaleDateString()} | Dento Clinic Management System
        </p>
      </div>
    </div>
  );
};

export default ProcedureNoteView;
