import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Eye,
  FileText,
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Filter,
  Check,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../../hooks/useToast';

const InvoiceList = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { formatCurrency, defaultCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [menuOpen, setMenuOpen] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const loadInvoices = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    
    // Load invoices
    const { data: invoiceData, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading invoices:', error);
      setIsLoading(false);
      return;
    }

    // Load patients for these invoices
    const patientIds = [...new Set(invoiceData.map(i => i.patient_id).filter(Boolean))];
    if (patientIds.length > 0) {
      const { data: patientData } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone')
        .eq('tenant_id', tenantId)
        .in('id', patientIds);

      const patientMap = {};
      patientData?.forEach(p => {
        patientMap[p.id] = p;
      });
      setPatients(patientMap);
    }

    setInvoices(invoiceData || []);
    setIsLoading(false);
  }, [tenantId]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const filteredInvoices = invoices.filter(invoice => {
    const patient = patients[invoice.patient_id];
    const patientName = patient ? `${patient.first_name} ${patient.last_name}`.toLowerCase() : '';
    const matchesSearch = 
      invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patientName.includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-600',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      partial: 'bg-yellow-100 text-yellow-700',
      overdue: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500',
      refunded: 'bg-purple-100 text-purple-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-600';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const markAsPaid = async (invoice) => {
    if (!confirm(`Mark invoice #${invoice.invoice_number || invoice.id} as paid?`)) return;
    
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          amount_paid: invoice.total_amount || 0,
          balance_due: 0,
        })
        .eq('id', invoice.id)
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      loadInvoices(); // Refresh list
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      toast.error('Failed to update invoice');
    }
  };

  const handleDelete = async (invoice) => {
    // Issue #22 Fix: Prevent deletion of paid invoices
    if (invoice.status === 'paid' || parseFloat(invoice.amount_paid || 0) > 0) {
      toast.warning('Cannot delete an invoice that has payments. Please void it instead or refund the payments first.');
      setMenuOpen(null);
      return;
    }
    
    if (!confirm(`Are you sure you want to delete invoice #${invoice.invoice_number || invoice.id}? This action cannot be undone.`)) return;
    
    setDeleting(invoice.id);
    try {
      // First delete related invoice items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id)
        .eq('tenant_id', tenantId);

      // Then delete the invoice
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id)
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      loadInvoices(); // Refresh list
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toast.error('Failed to delete invoice');
    } finally {
      setDeleting(null);
      setMenuOpen(null);
    }
  };

  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    pending: invoices.filter(i => ['draft', 'sent', 'partial'].includes(i.status)).length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
    // If status is 'paid', count full amount as paid regardless of amount_paid field
    totalPaid: invoices.reduce((sum, i) => {
      if (i.status === 'paid') return sum + (i.total_amount || 0);
      return sum + (i.amount_paid || 0);
    }, 0),
    // If status is 'paid', outstanding is 0 regardless of balance_due field
    totalOutstanding: invoices.reduce((sum, i) => {
      if (i.status === 'paid') return sum;
      return sum + (i.balance_due || i.total_amount || 0);
    }, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-500 mt-1">Manage patient invoices and payments</p>
          </div>
        </div>
        <Link 
          to="/invoices/create"
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Paid</p>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalPaid, defaultCurrency?.code)}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Outstanding</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalOutstanding, defaultCurrency?.code)}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by invoice number or patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-500 mb-4">Create your first invoice to get started.</p>
          <Link 
            to="/invoices/create"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Invoice</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Patient</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((invoice) => {
                const patient = patients[invoice.patient_id];
                return (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                          <p className="text-xs text-gray-500">
                            Due: {invoice.due_date ? format(parseISO(invoice.due_date), 'MMM d, yyyy') : 'No due date'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {patient ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{patient.phone}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unknown patient</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-gray-600">
                        {format(parseISO(invoice.issue_date), 'MMM d, yyyy')}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(invoice.total_amount || 0, invoice.currency || defaultCurrency?.code)}
                        </p>
                        {invoice.status !== 'paid' && invoice.balance_due > 0 && (
                          <p className="text-xs text-red-500">
                            Due: {formatCurrency(invoice.balance_due, invoice.currency || defaultCurrency?.code)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize',
                        getStatusBadge(invoice.status)
                      )}>
                        {getStatusIcon(invoice.status)}
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {invoice.status !== 'paid' && (
                          <button
                            onClick={() => markAsPaid(invoice)}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                            title="Mark as Paid"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                        <Link
                          to={`/invoices/${invoice.id}`}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </Link>
                        
                        {/* Dropdown Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === invoice.id ? null : invoice.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          {menuOpen === invoice.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                              <button
                                onClick={() => {
                                  setMenuOpen(null);
                                  navigate(`/invoices/${invoice.id}/edit`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(invoice)}
                                disabled={deleting === invoice.id}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deleting === invoice.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
