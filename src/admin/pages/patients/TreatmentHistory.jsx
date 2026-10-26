import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  User,
  Stethoscope,
  FileText,
  ClipboardList,
  DollarSign,
  Loader2,
  Eye,
  ChevronUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useSelectedTenantId } from '../../../contexts/UnifiedTenantContext';
import DentalChartMini from '../../components/DentalChartMini';

const TreatmentHistory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const tenantId = useSelectedTenantId();
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showDentalChart, setShowDentalChart] = useState(false);
  const [patientTeethData, setPatientTeethData] = useState({});

  const getPatientName = (patient) => {
    if (!patient) return 'Unknown';
    return patient.name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  };

  const loadPatient = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('patients')
      .select('id, name, first_name, last_name, phone')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    setPatient(data);
  }, [id, tenantId]);

  const loadRecords = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      // Load treatments
      const { data: treatmentsData } = await supabase
        .from('treatments')
        .select(`
          *,
          doctors (name_en, name_ar)
        `)
        .eq('patient_id', id)
        .order('treatment_date', { ascending: false });

      // Load procedure notes
      const { data: procedureNotesData } = await supabase
        .from('procedure_notes')
        .select(`
          *,
          doctors:doctor_id (name_en, name_ar)
        `)
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      // Load completed treatment plans
      const { data: treatmentPlansData } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          doctors:doctor_id (name_en, name_ar)
        `)
        .eq('patient_id', id)
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      // Combine all records
      const combinedData = [
        ...(treatmentsData || []).map(t => ({ 
          ...t, 
          recordType: 'treatment', 
          date: t.treatment_date,
          displayName: t.treatment_type || t.service_type || 'Treatment'
        })),
        ...(procedureNotesData || []).map(p => ({ 
          ...p, 
          recordType: 'procedure_note', 
          date: p.created_at,
          displayName: p.procedure_name
        })),
        ...(treatmentPlansData || []).map(tp => ({ 
          ...tp, 
          recordType: 'treatment_plan', 
          date: tp.updated_at,
          displayName: tp.title
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setRecords(combinedData);

      // Load patient dental chart data
      const { data: chartData } = await supabase
        .from('dental_charts')
        .select('tooth_number, condition, surface, notes, case_label, notice')
        .eq('patient_id', id)
        .eq('tenant_id', tenantId);
      const teethMap = {};
      chartData?.forEach(t => { teethMap[t.tooth_number] = t; });
      setPatientTeethData(teethMap);
    } catch (err) {
      console.error('Error loading treatment history:', err);
    } finally {
      setLoading(false);
    }
  }, [id, tenantId]);

  useEffect(() => {
    loadPatient();
    loadRecords();
  }, [loadPatient, loadRecords]);

  const getRecordLink = (record) => {
    switch (record.recordType) {
      case 'procedure_note':
        return `/procedure-notes/${record.id}`;
      case 'treatment_plan':
        return `/treatment-plans/${record.id}`;
      case 'treatment':
      default:
        return `/treatments/${record.id}`;
    }
  };

  const getTypeBadge = (recordType) => {
    switch (recordType) {
      case 'procedure_note':
        return <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Procedure Note</span>;
      case 'treatment_plan':
        return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Treatment Plan</span>;
      case 'treatment':
      default:
        return <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">Treatment</span>;
    }
  };

  const getTypeIcon = (recordType) => {
    switch (recordType) {
      case 'procedure_note':
        return <Stethoscope className="w-5 h-5 text-blue-500" />;
      case 'treatment_plan':
        return <ClipboardList className="w-5 h-5 text-green-500" />;
      case 'treatment':
      default:
        return <FileText className="w-5 h-5 text-purple-500" />;
    }
  };

  const filteredRecords = records.filter(record => {
    // Filter by type
    if (filterType !== 'all' && record.recordType !== filterType) return false;
    
    // Filter by search
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      (record.displayName || '').toLowerCase().includes(searchLower) ||
      (record.doctors?.name_en || '').toLowerCase().includes(searchLower) ||
      (record.notes || '').toLowerCase().includes(searchLower) ||
      (record.teeth_involved || '').toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: records.length,
    treatments: records.filter(r => r.recordType === 'treatment').length,
    procedureNotes: records.filter(r => r.recordType === 'procedure_note').length,
    treatmentPlans: records.filter(r => r.recordType === 'treatment_plan').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Treatment History</h1>
          {patient && (
            <p className="text-gray-500">
              {getPatientName(patient)} {patient.phone && `• ${patient.phone}`}
            </p>
          )}
        </div>
        <Link
          to={`/patients/${id}/view`}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <User className="w-4 h-4" />
          View Profile
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border bg-white border-gray-100 text-center">
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Records</p>
        </div>
        <div className="p-3 rounded-xl border bg-white border-gray-100 text-center">
          <p className="text-xl font-bold text-purple-600">{stats.treatments}</p>
          <p className="text-xs text-gray-500">Treatments</p>
        </div>
        <div className="p-3 rounded-xl border bg-white border-gray-100 text-center">
          <p className="text-xl font-bold text-blue-600">{stats.procedureNotes}</p>
          <p className="text-xs text-gray-500">Procedure Notes</p>
        </div>
        <div className="p-3 rounded-xl border bg-white border-gray-100 text-center">
          <p className="text-xl font-bold text-green-600">{stats.treatmentPlans}</p>
          <p className="text-xs text-gray-500">Treatment Plans</p>
        </div>
      </div>

      {/* Dental Chart Overview */}
      {Object.keys(patientTeethData).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <button
            type="button"
            onClick={() => setShowDentalChart(!showDentalChart)}
            className="flex items-center justify-between w-full"
          >
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
              <span>🦷</span>
              Dental Chart Overview
            </h3>
            {showDentalChart ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showDentalChart && (
            <div className="mt-3">
              <DentalChartMini
                teethData={patientTeethData}
                readOnly
                label="Current dental chart status"
              />
              <div className="mt-2 text-center">
                <Link
                  to={`/patients/${id}/dental-chart`}
                  className="text-xs text-primary-500 hover:text-primary-600"
                >
                  Open Full Dental Chart →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by procedure, doctor, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <Filter className="w-5 h-5" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Record Type</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Records' },
                { value: 'treatment', label: 'Treatments' },
                { value: 'procedure_note', label: 'Procedure Notes' },
                { value: 'treatment_plan', label: 'Treatment Plans' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilterType(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    filterType === option.value
                      ? 'bg-primary-50 border-primary-200 text-primary-700'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Records List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No treatment history found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRecords.map(record => (
              <Link
                key={`${record.recordType}-${record.id}`}
                to={getRecordLink(record)}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-gray-50 rounded-lg">
                  {getTypeIcon(record.recordType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">{record.displayName}</p>
                    {getTypeBadge(record.recordType)}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {record.date ? format(parseISO(record.date), 'PPP') : 'No date'}
                    </span>
                    {record.doctors?.name_en && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        Dr. {record.doctors.name_en}
                      </span>
                    )}
                  </div>
                  {record.recordType === 'procedure_note' && record.teeth_involved && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400 mr-1">Teeth:</span>
                      {record.teeth_involved.split(',').map(t => {
                        const num = t.trim();
                        const toothData = patientTeethData[num];
                        const condColor = toothData?.condition && toothData.condition !== 'healthy' 
                          ? { cavity: '#ef4444', filling: '#3b82f6', crown: '#f59e0b', rct: '#ec4899', missing: '#6b7280', implant: '#06b6d4' }[toothData.condition] || '#9ca3af'
                          : '#9ca3af';
                        return (
                          <span key={num} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border" style={{ borderColor: condColor, color: condColor, backgroundColor: `${condColor}15` }}>
                            {num}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {record.recordType === 'treatment_plan' && record.description && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{record.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {(record.cost || record.final_cost) && (
                    <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                      <DollarSign className="w-4 h-4" />
                      {record.final_cost || record.cost}
                    </span>
                  )}
                  <Eye className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TreatmentHistory;
