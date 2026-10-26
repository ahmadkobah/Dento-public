import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList,
  Pill,
  Image,
  Scan,
  FileSignature,
  Package,
  Receipt,
  Plus,
  ChevronRight,
  Eye,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useSelectedTenantId } from '../../../contexts/UnifiedTenantContext';
import { useRegionalSettings } from '../../../contexts/RegionalContext';

const TABS = [
  { id: 'treatment-plans', label: 'Treatment Plans', icon: ClipboardList, color: 'text-blue-500' },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill, color: 'text-green-500' },
  { id: 'xrays', label: 'X-Rays', icon: Image, color: 'text-purple-500' },
  { id: 'cbct', label: 'CBCT Scans', icon: Scan, color: 'text-indigo-500' },
  { id: 'consent-forms', label: 'Consent Forms', icon: FileSignature, color: 'text-orange-500' },
  { id: 'lab-orders', label: 'Lab Orders', icon: Package, color: 'text-teal-500' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, color: 'text-red-500' },
];

const STATUS_COLORS = {
  // Treatment Plan statuses
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  // Prescription statuses
  active: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-500',
  // Invoice statuses
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  // Consent statuses
  signed: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  // Lab order statuses
  submitted: 'bg-blue-100 text-blue-700',
  fabricating: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
};

const PatientClinicalRecords = ({ patientId }) => {
  const tenantId = useSelectedTenantId();
  const [activeTab, setActiveTab] = useState('treatment-plans');
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({});
  const [records, setRecords] = useState([]);

  // Fetch record counts for all tabs
  const fetchCounts = useCallback(async () => {
    if (!patientId || !tenantId) return;

    const [
      { count: treatmentPlans },
      { count: prescriptions },
      { count: xrays },
      { count: cbct },
      { count: consentForms },
      { count: labOrders },
      { count: invoices },
    ] = await Promise.all([
      supabase.from('treatment_plans').select('*', { count: 'exact', head: true }).eq('patient_id', patientId).eq('tenant_id', tenantId),
      supabase.from('prescriptions').select('*', { count: 'exact', head: true }).eq('patient_id', patientId).eq('tenant_id', tenantId),
      supabase.from('xrays').select('*', { count: 'exact', head: true }).eq('patient_id', patientId),
      supabase.from('cbct_orders').select('*', { count: 'exact', head: true }).eq('patient_id', patientId),
      supabase.from('consent_forms').select('*', { count: 'exact', head: true }).eq('patient_id', patientId),
      supabase.from('lab_orders').select('*', { count: 'exact', head: true }).eq('patient_id', patientId),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('patient_id', patientId).eq('tenant_id', tenantId),
    ]);

    setCounts({
      'treatment-plans': treatmentPlans || 0,
      'prescriptions': prescriptions || 0,
      'xrays': xrays || 0,
      'cbct': cbct || 0,
      'consent-forms': consentForms || 0,
      'lab-orders': labOrders || 0,
      'invoices': invoices || 0,
    });
  }, [patientId, tenantId]);

  // Fetch records for active tab
  const fetchRecords = useCallback(async () => {
    if (!patientId || !tenantId) return;
    setLoading(true);

    try {
      let query;
      switch (activeTab) {
        case 'treatment-plans':
          query = supabase
            .from('treatment_plans')
            .select('id, title, status, total_cost, created_at, doctors:doctor_id(name_en)')
            .eq('patient_id', patientId)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(10);
          break;
        case 'prescriptions':
          query = supabase
            .from('prescriptions')
            .select('id, diagnosis, status, created_at, doctors:doctor_id(name_en)')
            .eq('patient_id', patientId)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(10);
          break;
        case 'xrays':
          query = supabase
            .from('xrays')
            .select('id, title, captured_at, notes, xray_types:xray_type_id(name_en)')
            .eq('patient_id', patientId)
            .order('captured_at', { ascending: false })
            .limit(10);
          break;
        case 'cbct':
          query = supabase
            .from('cbct_orders')
            .select('id, indication, status, priority, created_at, cbct_scan_regions:scan_region_id(name_en)')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(10);
          break;
        case 'consent-forms':
          query = supabase
            .from('consent_forms')
            .select('id, patient_signature, signed_at, created_at, consent_templates:template_id(name_en)')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(10);
          break;
        case 'lab-orders':
          query = supabase
            .from('lab_orders')
            .select('id, status, due_date, created_at, dental_labs:lab_id(name), lab_order_types:order_type_id(name_en)')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(10);
          break;
        case 'invoices':
          query = supabase
            .from('invoices')
            .select('id, invoice_number, status, total_amount, amount_paid, issue_date')
            .eq('patient_id', patientId)
            .eq('tenant_id', tenantId)
            .order('issue_date', { ascending: false })
            .limit(10);
          break;
        default:
          setRecords([]);
          setLoading(false);
          return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [patientId, activeTab, tenantId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const { formatCurrency: formatCurrencyFn, defaultCurrency } = useRegionalSettings();

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return format(parseISO(date), 'MMM d, yyyy');
    } catch {
      return '-';
    }
  };

  // Use regional settings for currency formatting
  const formatCurrency = (amount, currency = null) => {
    return formatCurrencyFn(amount, currency || defaultCurrency?.code);
  };

  const getStatusBadge = (status) => {
    const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  const getCreateUrl = () => {
    const urls = {
      'treatment-plans': `/treatment-plans/new?patient=${patientId}`,
      'prescriptions': `/prescriptions/new?patient=${patientId}`,
      'xrays': `/xrays/new?patient=${patientId}`,
      'cbct': `/cbct/new?patient=${patientId}`,
      'consent-forms': `/consent-forms/new?patient=${patientId}`,
      'lab-orders': `/lab-orders/new?patient=${patientId}`,
      'invoices': `/invoices/new?patient=${patientId}`,
    };
    return urls[activeTab];
  };

  const getViewUrl = (id) => {
    const urls = {
      'treatment-plans': `/treatment-plans/${id}`,
      'prescriptions': `/prescriptions/${id}`,
      'xrays': `/xrays/${id}`,
      'cbct': `/cbct/${id}`,
      'consent-forms': `/consent-forms/${id}`,
      'lab-orders': `/lab-orders/${id}`,
      'invoices': `/invoices/${id}`,
    };
    return urls[activeTab];
  };

  const getListUrl = () => {
    const urls = {
      'treatment-plans': `/treatment-plans?patient=${patientId}`,
      'prescriptions': `/prescriptions?patient=${patientId}`,
      'xrays': `/xrays?patient=${patientId}`,
      'cbct': `/cbct?patient=${patientId}`,
      'consent-forms': `/consent-forms?patient=${patientId}`,
      'lab-orders': `/lab-orders?patient=${patientId}`,
      'invoices': `/invoices?patient=${patientId}`,
    };
    return urls[activeTab];
  };

  const renderRecordItem = (record) => {
    switch (activeTab) {
      case 'treatment-plans':
        return (
          <Link
            key={record.id}
            to={getViewUrl(record.id)}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{record.title || 'Treatment Plan'}</p>
              <p className="text-sm text-gray-500">
                {formatDate(record.created_at)}
                {record.doctors?.name_en && ` • Dr. ${record.doctors.name_en}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {record.total_cost > 0 && (
                <span className="text-sm font-medium text-gray-700">
                  {formatCurrency(record.total_cost)}
                </span>
              )}
              {getStatusBadge(record.status)}
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        );

      case 'prescriptions':
        return (
          <Link
            key={record.id}
            to={getViewUrl(record.id)}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{record.diagnosis || 'Prescription'}</p>
              <p className="text-sm text-gray-500">
                {formatDate(record.created_at)}
                {record.doctors?.name_en && ` • Dr. ${record.doctors.name_en}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(record.status)}
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        );

      case 'xrays':
        return (
          <Link
            key={record.id}
            to={getViewUrl(record.id)}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{record.xray_types?.name_en || record.title || 'X-Ray'}</p>
              <p className="text-sm text-gray-500">
                {formatDate(record.captured_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-gray-400" />
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        );

      case 'cbct':
        return (
          <Link
            key={record.id}
            to={getViewUrl(record.id)}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{record.cbct_scan_regions?.name_en || 'CBCT Order'}</p>
              <p className="text-sm text-gray-500">
                {formatDate(record.created_at)}
                {record.indication && ` • ${record.indication}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(record.status)}
              <Scan className="w-4 h-4 text-gray-400" />
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        );

      case 'consent-forms':
        return (
          <Link
            key={record.id}
            to={getViewUrl(record.id)}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{record.consent_templates?.name_en || 'Consent Form'}</p>
              <p className="text-sm text-gray-500">
                {record.signed_at ? `Signed: ${formatDate(record.signed_at)}` : `Created: ${formatDate(record.created_at)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {record.patient_signature && record.patient_signature !== 'pending' && <CheckCircle className="w-4 h-4 text-green-500" />}
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        );

      case 'lab-orders':
        return (
          <Link
            key={record.id}
            to={getViewUrl(record.id)}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{record.lab_order_types?.name_en || 'Lab Order'}</p>
              <p className="text-sm text-gray-500">
                {formatDate(record.created_at)}
                {record.dental_labs?.name && ` • ${record.dental_labs.name}`}
                {record.due_date && ` • Due: ${formatDate(record.due_date)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(record.status)}
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        );

      case 'invoices':
        return (
          <Link
            key={record.id}
            to={getViewUrl(record.id)}
            className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex-1">
              <p className="font-medium text-gray-900">{record.invoice_number || 'Invoice'}</p>
              <p className="text-sm text-gray-500">{formatDate(record.issue_date)}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{formatCurrency(record.total_amount)}</p>
                {record.amount_paid > 0 && record.amount_paid < record.total_amount && (
                  <p className="text-xs text-gray-500">Paid: {formatCurrency(record.amount_paid)}</p>
                )}
              </div>
              {getStatusBadge(record.status)}
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Tabs */}
      <div className="border-b border-gray-100 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = counts[tab.id] || 0;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : ''}`} />
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Actions */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            {TABS.find(t => t.id === activeTab)?.label}
          </h3>
          <div className="flex items-center gap-2">
            <Link
              to={getListUrl()}
              className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to={getCreateUrl()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </Link>
          </div>
        </div>

        {/* Records List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              {(() => {
                const Icon = TABS.find(t => t.id === activeTab)?.icon || FileText;
                return <Icon className="w-6 h-6 text-gray-400" />;
              })()}
            </div>
            <p className="text-gray-500 mb-4">No {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} found</p>
            <Link
              to={getCreateUrl()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First {TABS.find(t => t.id === activeTab)?.label.slice(0, -1)}
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map(record => renderRecordItem(record))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientClinicalRecords;
