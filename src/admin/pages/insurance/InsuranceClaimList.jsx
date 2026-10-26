import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Plus, Search, Filter, RefreshCw,
  Clock, CheckCircle, XCircle, AlertCircle, DollarSign, Calendar, User
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-700', label: 'Draft', icon: FileText },
  submitted: { color: 'bg-blue-100 text-blue-700', label: 'Submitted', icon: Clock },
  pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending', icon: Clock },
  approved: { color: 'bg-green-100 text-green-700', label: 'Approved', icon: CheckCircle },
  partially_approved: { color: 'bg-orange-100 text-orange-700', label: 'Partial', icon: AlertCircle },
  rejected: { color: 'bg-red-100 text-red-700', label: 'Rejected', icon: XCircle },
  paid: { color: 'bg-emerald-100 text-emerald-700', label: 'Paid', icon: DollarSign },
};

const InsuranceClaimList = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();

  const [claims, setClaims] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalAmount: 0,
  });

  const loadCompanies = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('insurance_companies')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setCompanies(data || []);
  }, [tenantId]);

  const loadClaims = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('insurance_claims')
        .select(`
          *,
          patients:patient_id (id, first_name, last_name),
          insurance_companies:insurance_company_id (id, name, code),
          invoices:invoice_id (id, invoice_number, total_amount)
        `)
        .order('created_at', { ascending: false });

      if (selectedCompany !== 'all') {
        query = query.eq('insurance_company_id', selectedCompany);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by search
      let filtered = data || [];
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
          c.claim_number?.toLowerCase().includes(search) ||
          c.patients?.first_name?.toLowerCase().includes(search) ||
          c.patients?.last_name?.toLowerCase().includes(search)
        );
      }

      setClaims(filtered);

      // Calculate stats
      const allData = data || [];
      const total = allData.length;
      const pending = allData.filter(c => ['submitted', 'pending'].includes(c.status)).length;
      const approved = allData.filter(c => ['approved', 'partially_approved', 'paid'].includes(c.status)).length;
      const totalAmount = allData.reduce((sum, c) => sum + parseFloat(c.claim_amount || 0), 0);

      setStats({ total, pending, approved, totalAmount });
    } catch (error) {
      console.error('Error loading claims:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedStatus, searchQuery, tenantId]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const updateClaimStatus = async (id, newStatus) => {
    if (!tenantId) return;
    try {
      // First get the claim details for invoice sync
      const { data: claim, error: fetchError } = await supabase
        .from('insurance_claims')
        .select('*, invoices:invoice_id (id, amount_paid, balance_due, status)')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update claim status
      const { error } = await supabase
        .from('insurance_claims')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      // Issue #16 Fix: When marking as 'paid', sync payment to invoice
      if (newStatus === 'paid' && claim.invoice_id && claim.invoices) {
        const paymentAmount = parseFloat(claim.approved_amount || claim.claim_amount || 0);
        
        if (paymentAmount > 0) {
          // Record the insurance payment
          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              invoice_id: claim.invoice_id,
              patient_id: claim.patient_id,
              amount: paymentAmount,
              payment_method: 'insurance',
              payment_date: new Date().toISOString(),
              notes: `Insurance payment from claim ${claim.claim_number}`,
              insurance_claim_id: claim.id,
            });

          if (paymentError) {
            console.error('Error recording insurance payment:', paymentError);
          } else {
            // Update invoice balance
            const currentPaid = parseFloat(claim.invoices.amount_paid || 0);
            const newAmountPaid = currentPaid + paymentAmount;
            const currentBalance = parseFloat(claim.invoices.balance_due || 0);
            const newBalance = Math.max(0, currentBalance - paymentAmount);
            
            const invoiceStatus = newBalance <= 0 ? 'paid' : 
                                  newAmountPaid > 0 ? 'partial' : 'pending';

            const { error: invoiceError } = await supabase
              .from('invoices')
              .update({
                amount_paid: newAmountPaid,
                balance_due: newBalance,
                status: invoiceStatus,
              })
              .eq('id', claim.invoice_id)
              .eq('tenant_id', tenantId);

            if (invoiceError) {
              console.error('Error updating invoice balance:', invoiceError);
            }
          }
        }
      }

      loadClaims();
    } catch (error) {
      console.error('Error updating claim:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Insurance Claims</h1>
            <p className="text-gray-500 mt-1">Track and manage insurance claims</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadClaims}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/insurance"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Companies
          </Link>
          <Link
            to="/insurance/claims/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            New Claim
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Claims</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-xl font-bold text-gray-900">{stats.approved}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search claims..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
          </div>

          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="partially_approved">Partially Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Claims List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No claims found</h3>
          <p className="text-gray-500 mt-1">Insurance claims will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {claims.map(claim => {
                const StatusIcon = statusConfig[claim.status]?.icon || Clock;
                return (
                  <tr key={claim.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{claim.claim_number}</p>
                        {claim.invoices && (
                          <p className="text-sm text-gray-500">Invoice: {claim.invoices.invoice_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {claim.patients ? (
                        <Link 
                          to={`/patients/${claim.patient_id}`}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          {claim.patients.first_name} {claim.patients.last_name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900">
                        {claim.insurance_companies?.name}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(claim.claim_amount)}</p>
                      {claim.approved_amount && claim.approved_amount !== claim.claim_amount && (
                        <p className="text-sm text-green-600">
                          Approved: {formatCurrency(claim.approved_amount)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[claim.status]?.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[claim.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-500">
                      {format(parseISO(claim.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {claim.status === 'draft' && (
                          <button
                            onClick={() => updateClaimStatus(claim.id, 'submitted')}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Submit
                          </button>
                        )}
                        {claim.status === 'submitted' && (
                          <button
                            onClick={() => updateClaimStatus(claim.id, 'approved')}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                        )}
                        {claim.status === 'approved' && (
                          <button
                            onClick={() => updateClaimStatus(claim.id, 'paid')}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            Mark Paid
                          </button>
                        )}
                        <Link
                          to={`/insurance/claims/${claim.id}`}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          View
                        </Link>
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

export default InsuranceClaimList;
