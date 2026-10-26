import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Eye, Loader2, FileCheck, Filter, ChevronDown,
  User, CheckCircle, XCircle, Clock, ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  signed: { label: 'Signed', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  revoked: { label: 'Revoked', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
};

const ConsentFormList = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [forms, setForms] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadForms(); loadTemplates(); }, [filterTemplate, filterStatus, tenantId]);

  const loadTemplates = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from('consent_templates').select('id, name_en, name_ar')
      .eq('tenant_id', tenantId).eq('is_active', true).order('name_en');
    setTemplates(data || []);
  };

  const loadForms = async () => {
    setLoading(true);
    try {
      let query = supabase.from('consent_forms').select(`
        id, patient_id, template_id, doctor_id, status, language,
        patient_signature, witness_name, signed_at, created_at,
        patients:patient_id (id, name, first_name, last_name, phone),
        consent_templates:template_id (id, name_en, name_ar, procedure_type),
        doctors:doctor_id (id, name_en, name_ar)
      `).order('created_at', { ascending: false });

      if (filterTemplate !== 'all') query = query.eq('template_id', filterTemplate);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);

      const { data, error } = await query;
      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error loading consent forms:', error);
    } finally { setLoading(false); }
  };

  const getName = (p) => p?.name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Unknown';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  const filtered = forms.filter(f => {
    if (!search) return true;
    const s = search.toLowerCase();
    const pName = getName(f.patients).toLowerCase();
    const tName = (f.consent_templates?.name_en || '').toLowerCase();
    return pName.includes(s) || tName.includes(s);
  });

  const stats = {
    total: forms.length,
    pending: forms.filter(f => (f.status || 'pending') === 'pending').length,
    signed: forms.filter(f => f.status === 'signed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Consent Forms</h1>
            <p className="text-gray-500">Manage patient consent forms and signatures</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/consent-forms/create')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5" />
          New Consent Form
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Forms</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-gray-500">Pending Signature</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.signed}</p>
          <p className="text-xs text-gray-500">Signed</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient or template..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm ${showFilters ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
            <select value={filterTemplate} onChange={(e) => setFilterTemplate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
              <option value="all">All Templates</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name_en}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500">
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No consent forms found</p>
            <button onClick={() => navigate('/consent-forms/create')}
              className="mt-3 text-primary-600 hover:underline text-sm">
              Create one
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(form => {
              const status = STATUS_CONFIG[form.status || 'pending'] || STATUS_CONFIG.pending;
              const template = form.consent_templates;
              return (
                <div key={form.id}
                  onClick={() => navigate(`/consent-forms/${form.id}`)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="p-2.5 bg-orange-50 rounded-lg">
                    <FileCheck className="w-5 h-5 text-orange-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">
                        {template?.name_en || 'Consent Form'}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      {form.language && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 uppercase">
                          {form.language}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {getName(form.patients)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {fmtDate(form.created_at)}
                      </span>
                      {form.doctors?.name_en && (
                        <span className="text-gray-400">Dr. {form.doctors.name_en}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {form.status === 'signed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <Eye className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsentFormList;
