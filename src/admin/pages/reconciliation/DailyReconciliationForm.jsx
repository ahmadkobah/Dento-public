import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Calendar,
  Building2,
  DollarSign,
  CreditCard,
  Banknote,
  Wallet,
  AlertCircle,
  CheckCircle,
  Calculator,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useRegionalSettings } from '../../../contexts/RegionalContext';

const DailyReconciliationForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { formatCurrency, currencySymbol } = useRegionalSettings();
  const { tenantId } = useTenant();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [branches, setBranches] = useState([]);
  const [todayPayments, setTodayPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [formData, setFormData] = useState({
    branch_id: '',
    reconciliation_date: format(new Date(), 'yyyy-MM-dd'),
    opening_balance: 0,
    cash_received: 0,
    card_received: 0,
    bank_transfer_received: 0,
    other_received: 0,
    expenses: 0,
    actual_balance: 0,
    discrepancy_reason: '',
    notes: '',
    status: 'open'
  });

  // Calculated values
  const totalReceived = 
    parseFloat(formData.cash_received || 0) +
    parseFloat(formData.card_received || 0) +
    parseFloat(formData.bank_transfer_received || 0) +
    parseFloat(formData.other_received || 0);

  const expectedBalance = 
    parseFloat(formData.opening_balance || 0) +
    totalReceived -
    parseFloat(formData.expenses || 0);

  const discrepancy = parseFloat(formData.actual_balance || 0) - expectedBalance;

  // Issue #40: Fetch previous day's closing balance as opening balance for new reconciliations
  const loadPreviousClosingBalance = useCallback(async (branchId, currentDate) => {
    if (!branchId || !currentDate || isEditing) return; // Skip if editing existing record
    
    try {
      // Get the most recent closed reconciliation for this branch before the current date
      const { data, error } = await supabase
        .from('daily_reconciliation')
        .select('closing_balance, reconciliation_date')
        .eq('branch_id', branchId)
        .eq('status', 'closed')
        .lt('reconciliation_date', currentDate)
        .order('reconciliation_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (!error && data?.closing_balance != null) {
        setFormData(prev => ({
          ...prev,
          opening_balance: parseFloat(data.closing_balance) || 0
        }));
      }
    } catch (error) {
      console.error('Error loading previous closing balance:', error);
    }
  }, [isEditing]);

  useEffect(() => {
    loadBranches();
    if (isEditing) {
      loadReconciliation();
    }
  }, [id, tenantId]);

  // Auto-load previous closing balance when branch or date changes (for new reconciliations)
  useEffect(() => {
    if (!isEditing && formData.branch_id && formData.reconciliation_date) {
      loadPreviousClosingBalance(formData.branch_id, formData.reconciliation_date);
    }
  }, [isEditing, formData.branch_id, formData.reconciliation_date, loadPreviousClosingBalance]);

  const loadBranches = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from('branches')
      .select('id, name_en, name_ar')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name_en');
    setBranches(data || []);
  };

  const loadReconciliation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_reconciliation')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        branch_id: data.branch_id || '',
        reconciliation_date: data.reconciliation_date || format(new Date(), 'yyyy-MM-dd'),
        opening_balance: data.opening_balance || 0,
        cash_received: data.cash_received || 0,
        card_received: data.card_received || 0,
        bank_transfer_received: data.bank_transfer_received || 0,
        other_received: data.other_received || 0,
        expenses: data.expenses || 0,
        actual_balance: data.actual_balance || 0,
        discrepancy_reason: data.discrepancy_reason || '',
        notes: data.notes || '',
        status: data.status || 'open'
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Load payments for selected date and branch
  const loadTodayPayments = useCallback(async () => {
    if (!formData.branch_id || !formData.reconciliation_date) return;

    setLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          created_at,
          invoices!inner(branch_id)
        `)
        .eq('tenant_id', tenantId)
        .eq('invoices.branch_id', formData.branch_id)
        .gte('created_at', `${formData.reconciliation_date}T00:00:00`)
        .lte('created_at', `${formData.reconciliation_date}T23:59:59`);

      if (error) throw error;

      setTodayPayments(data || []);

      // Auto-fill payment totals
      const cashTotal = data?.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const cardTotal = data?.filter(p => p.payment_method === 'card').reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const bankTotal = data?.filter(p => p.payment_method === 'bank_transfer').reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const otherTotal = data?.filter(p => !['cash', 'card', 'bank_transfer'].includes(p.payment_method)).reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

      setFormData(prev => ({
        ...prev,
        cash_received: cashTotal,
        card_received: cardTotal,
        bank_transfer_received: bankTotal,
        other_received: otherTotal
      }));
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoadingPayments(false);
    }
  }, [formData.branch_id, formData.reconciliation_date, tenantId]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  // Issue #39: Check if discrepancy is significant (> 100 currency units or > 5% of expected)
  const isSignificantDiscrepancy = (discAmount, expectedAmount) => {
    const absDiscrepancy = Math.abs(discAmount);
    const threshold = Math.max(100, Math.abs(expectedAmount) * 0.05); // 100 or 5% of expected
    return absDiscrepancy >= threshold;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Issue #39: Require reason for significant discrepancy
    if (isSignificantDiscrepancy(discrepancy, expectedBalance) && !formData.discrepancy_reason?.trim()) {
      setMessage({ 
        type: 'error', 
        text: 'Please provide a reason for the significant discrepancy before saving.' 
      });
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        total_received: totalReceived,
        expected_balance: expectedBalance,
        discrepancy: discrepancy
      };

      if (isEditing) {
        // Issue #24 Fix: Prevent editing closed reconciliations
        // First, verify the current status hasn't changed to closed
        const { data: currentRecord, error: fetchError } = await supabase
          .from('daily_reconciliation')
          .select('status')
          .eq('id', id)
          .single();
        
        if (fetchError) throw fetchError;
        
        if (currentRecord.status === 'closed') {
          setMessage({ type: 'error', text: 'Cannot modify a closed reconciliation.' });
          setSaving(false);
          return;
        }
        
        // Don't allow status to be changed back from closed via payload
        if (formData.status === 'closed') {
          delete payload.status; // Prevent accidental status changes
        }
        
        const { error } = await supabase
          .from('daily_reconciliation')
          .update(payload)
          .eq('id', id)
          .eq('status', 'open'); // Extra safety: only update if still open
        if (error) throw error;
        setMessage({ type: 'success', text: 'Reconciliation updated successfully!' });
      } else {
        const { error } = await supabase
          .from('daily_reconciliation')
          .insert([payload]);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Reconciliation created successfully!' });
        setTimeout(() => navigate('/reconciliation'), 1500);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    // Issue #39: Require reason for significant discrepancy before closing
    if (isSignificantDiscrepancy(discrepancy, expectedBalance) && !formData.discrepancy_reason?.trim()) {
      setMessage({ 
        type: 'error', 
        text: 'Please provide a reason for the significant discrepancy before closing.' 
      });
      return;
    }
    
    if (!window.confirm('Are you sure you want to close this reconciliation? This action cannot be undone.')) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('daily_reconciliation')
        .update({ 
          status: 'closed',
          total_received: totalReceived,
          expected_balance: expectedBalance,
          discrepancy: discrepancy,
          closing_balance: formData.actual_balance
        })
        .eq('id', id);
      
      if (error) throw error;
      setMessage({ type: 'success', text: 'Reconciliation closed successfully!' });
      setFormData(prev => ({ ...prev, status: 'closed' }));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/reconciliation')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Reconciliation' : 'New Daily Reconciliation'}
          </h1>
          <p className="text-gray-500">End-of-day cash balancing</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={clsx(
          'mb-6 p-4 rounded-lg flex items-center gap-2',
          message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
        )}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Basic Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch *
              </label>
              <select
                name="branch_id"
                value={formData.branch_id}
                onChange={handleChange}
                required
                disabled={formData.status !== 'open'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              >
                <option value="">Select Branch</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name_en}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                name="reconciliation_date"
                value={formData.reconciliation_date}
                onChange={handleChange}
                required
                disabled={formData.status !== 'open'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opening Balance ({currencySymbol})
              </label>
              <input
                type="number"
                name="opening_balance"
                value={formData.opening_balance}
                onChange={handleChange}
                step="0.01"
                disabled={formData.status !== 'open'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Auto-load payments button */}
          {formData.branch_id && formData.reconciliation_date && formData.status === 'open' && (
            <button
              type="button"
              onClick={loadTodayPayments}
              disabled={loadingPayments}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              {loadingPayments ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4" />
              )}
              Auto-fill from payments ({todayPayments.length} found)
            </button>
          )}
        </div>

        {/* Income Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Income Received
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Banknote className="w-4 h-4 inline mr-1" />
                Cash ({currencySymbol})
              </label>
              <input
                type="number"
                name="cash_received"
                value={formData.cash_received}
                onChange={handleChange}
                step="0.01"
                disabled={formData.status !== 'open'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Card ({currencySymbol})
              </label>
              <input
                type="number"
                name="card_received"
                value={formData.card_received}
                onChange={handleChange}
                step="0.01"
                disabled={formData.status !== 'open'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="w-4 h-4 inline mr-1" />
                Bank Transfer ({currencySymbol})
              </label>
              <input
                type="number"
                name="bank_transfer_received"
                value={formData.bank_transfer_received}
                onChange={handleChange}
                step="0.01"
                disabled={formData.status !== 'open'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Wallet className="w-4 h-4 inline mr-1" />
                Other ({currencySymbol})
              </label>
              <input
                type="number"
                name="other_received"
                value={formData.other_received}
                onChange={handleChange}
                step="0.01"
                disabled={formData.status !== 'open'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Total Received:</strong> {formatCurrency(totalReceived)}
            </p>
          </div>
        </div>

        {/* Expenses Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-600" />
            Expenses
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Expenses ({currencySymbol})
            </label>
            <input
              type="number"
              name="expenses"
              value={formData.expenses}
              onChange={handleChange}
              step="0.01"
              disabled={formData.status !== 'open'}
              className="w-full max-w-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* Balance Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary-600" />
            Balance Reconciliation
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">Expected Balance</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(expectedBalance)}</p>
              <p className="text-xs text-blue-500 mt-1">
                Opening + Received - Expenses
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Balance ({currencySymbol}) *
              </label>
              <input
                type="number"
                name="actual_balance"
                value={formData.actual_balance}
                onChange={handleChange}
                step="0.01"
                required
                disabled={formData.status !== 'open'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100 text-lg"
              />
            </div>

            <div className={clsx(
              'p-4 rounded-lg',
              discrepancy === 0 ? 'bg-green-50' : discrepancy > 0 ? 'bg-green-50' : 'bg-red-50'
            )}>
              <p className={clsx(
                'text-sm mb-1',
                discrepancy === 0 ? 'text-green-600' : discrepancy > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                Discrepancy
              </p>
              <p className={clsx(
                'text-2xl font-bold',
                discrepancy === 0 ? 'text-green-700' : discrepancy > 0 ? 'text-green-700' : 'text-red-700'
              )}>
                {discrepancy > 0 ? '+' : ''}{formatCurrency(discrepancy)}
              </p>
              <p className="text-xs mt-1 text-gray-500">
                {discrepancy === 0 ? '✓ Balanced' : discrepancy > 0 ? 'Surplus' : 'Shortage'}
              </p>
            </div>
          </div>

          {discrepancy !== 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discrepancy Reason
              </label>
              <textarea
                name="discrepancy_reason"
                value={formData.discrepancy_reason}
                onChange={handleChange}
                rows={2}
                disabled={formData.status !== 'open'}
                placeholder="Explain the reason for the discrepancy..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              />
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Additional Notes
          </h2>
          
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            disabled={formData.status !== 'open'}
            placeholder="Any additional notes..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate('/reconciliation')}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {formData.status === 'open' && (
              <>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Close Day
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default DailyReconciliationForm;
