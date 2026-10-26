import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  Loader2,
  FileText,
  Filter,
  ChevronDown,
  User,
  Calendar,
  Stethoscope,
  Copy,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../../hooks/useToast';

const ProcedureNoteList = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenantId } = useTenant();
  const patientFilter = searchParams.get('patient');
  const [notes, setNotes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [patientName, setPatientName] = useState('');

  useEffect(() => {
    loadNotes();
    loadTemplates();
    loadDoctors();
    if (patientFilter) {
      loadPatientName();
    }
  }, [selectedDoctor, selectedTemplate, patientFilter, tenantId]);

  const loadPatientName = async () => {
    if (!patientFilter || !tenantId) return;
    const { data } = await supabase
      .from('patients')
      .select('name, first_name, last_name')
      .eq('tenant_id', tenantId)
      .eq('id', patientFilter)
      .single();
    if (data) {
      setPatientName(data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim());
    }
  };

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('procedure_note_templates')
      .select('id, name_en, name_ar, procedure_type')
      .eq('is_active', true)
      .order('name_en');
    setTemplates(data || []);
  };

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

  const loadNotes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('procedure_notes')
        .select(`
          id,
          patient_id,
          doctor_id,
          template_id,
          procedure_name,
          teeth_involved,
          procedure_performed,
          follow_up_required,
          follow_up_date,
          created_at,
          patients:patient_id (id, name, first_name, last_name, phone),
          doctors:doctor_id (id, name_en, name_ar),
          procedure_note_templates:template_id (id, name_en, name_ar)
        `)
        .order('created_at', { ascending: false });

      if (patientFilter) {
        query = query.eq('patient_id', patientFilter);
      }

      if (selectedDoctor !== 'all') {
        query = query.eq('doctor_id', selectedDoctor);
      }

      if (selectedTemplate !== 'all') {
        query = query.eq('template_id', selectedTemplate);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading procedure notes:', error);
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
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this procedure note?')) return;
    
    try {
      const { error } = await supabase
        .from('procedure_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadNotes();
    } catch (error) {
      console.error('Error deleting procedure note:', error);
      toast.error('Failed to delete procedure note');
    }
  };

  const handleDuplicate = async (note) => {
    try {
      const { id: _id, created_at: _created_at, updated_at: _updated_at, patients: _patients, doctors: _doctors, procedure_note_templates: _procedure_note_templates, ...noteData } = note;
      
      const { data, error } = await supabase
        .from('procedure_notes')
        .insert({
          ...noteData,
        })
        .select()
        .single();

      if (error) throw error;
      
      navigate(`/procedure-notes/${data.id}/edit`);
    } catch (error) {
      console.error('Error duplicating procedure note:', error);
      toast.error('Failed to duplicate procedure note');
    }
  };

  const filteredNotes = notes.filter(note => {
    if (!search) return true;
    const patientName = getPatientName(note.patients).toLowerCase();
    const procedureName = (note.procedure_name || '').toLowerCase();
    const templateName = (note.procedure_note_templates?.name_en || '').toLowerCase();
    return patientName.includes(search.toLowerCase()) || 
           procedureName.includes(search.toLowerCase()) ||
           templateName.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patientFilter && patientName ? `Procedure Notes - ${patientName}` : 'Procedure Notes'}
            </h1>
            <p className="text-gray-500">
              {patientFilter && patientName 
                ? `Viewing procedure notes for ${patientName}`
                : 'Document clinical procedures and treatments'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {patientFilter && (
            <button
              onClick={() => navigate('/procedure-notes')}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View All
            </button>
          )}
          <button
            onClick={() => navigate(patientFilter ? `/procedure-notes/create?patient=${patientFilter}` : '/procedure-notes/create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Procedure Note
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient, procedure, or template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Doctors</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name_en || doc.name_ar}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Templates</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name_en || template.name_ar}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-3xl font-bold text-gray-900">{notes.length}</p>
          <p className="text-sm text-gray-500">Total Notes</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-3xl font-bold text-blue-600">
            {notes.filter(n => {
              const date = new Date(n.procedure_date || n.created_at);
              const today = new Date();
              return date.toDateString() === today.toDateString();
            }).length}
          </p>
          <p className="text-sm text-gray-500">Today</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-3xl font-bold text-green-600">
            {notes.filter(n => {
              const date = new Date(n.procedure_date || n.created_at);
              const week = new Date();
              week.setDate(week.getDate() - 7);
              return date >= week;
            }).length}
          </p>
          <p className="text-sm text-gray-500">This Week</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-3xl font-bold text-purple-600">{templates.length}</p>
          <p className="text-sm text-gray-500">Templates</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No procedure notes found</p>
            <button
              onClick={() => navigate('/procedure-notes/create')}
              className="mt-4 text-primary-600 hover:underline"
            >
              Create a procedure note
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Procedure
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teeth
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{getPatientName(note.patients)}</p>
                          <p className="text-sm text-gray-500">{note.patients?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {note.procedure_name || note.procedure_note_templates?.name_en || '-'}
                      </p>
                      {note.procedure_note_templates && (
                        <p className="text-sm text-gray-500">
                          Template: {note.procedure_note_templates.name_en}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">
                          {note.doctors?.name_en || note.doctors?.name_ar || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(note.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {note.teeth_involved ? (
                        <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {Array.isArray(note.teeth_involved) 
                            ? note.teeth_involved.join(', ') 
                            : note.teeth_involved}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/procedure-notes/${note.id}`)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(note)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => navigate(`/procedure-notes/${note.id}/edit`)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcedureNoteList;
