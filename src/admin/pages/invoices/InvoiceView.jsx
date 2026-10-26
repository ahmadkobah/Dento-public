import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Printer,
  Download,
  DollarSign,
  FileText,
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  CreditCard,
  Banknote,
  Loader2,
  ClipboardList
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';
import { useToast } from '../../../hooks/useToast';

const InvoiceView = () => {
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, defaultCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [patient, setPatient] = useState(null);
  const [treatmentPlan, setTreatmentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Helper to format with invoice currency
  const fmtCurrency = (amount) => formatCurrency(amount, invoice?.currency || defaultCurrency?.code);

  const loadInvoice = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    // Load invoice
    const { data: invoiceData, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error || !invoiceData) {
      setLoading(false);
      return;
    }

    setInvoice(invoiceData);

    // Load patient
    if (invoiceData.patient_id) {
      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', invoiceData.patient_id)
        .single();
      setPatient(patientData);
    }

    // Load items
    const { data: itemsData } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('invoice_id', id);
    setItems(itemsData || []);

    // Load payments
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('invoice_id', id)
      .order('created_at', { ascending: false });
    setPayments(paymentsData || []);

    // Load linked treatment plan if exists
    if (invoiceData.treatment_plan_id) {
      const { data: planData } = await supabase
        .from('treatment_plans')
        .select('id, title, status')
        .eq('tenant_id', tenantId)
        .eq('id', invoiceData.treatment_plan_id)
        .single();
      setTreatmentPlan(planData);
    } else {
      setTreatmentPlan(null);
    }

    setLoading(false);
  }, [id, tenantId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const recordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;

    setSavingPayment(true);

    try {
      const amount = parseFloat(paymentAmount);
      
      // Issue #13 Fix: Re-fetch current invoice state to prevent race conditions
      // This is a client-side mitigation - ideally use database RPC for true atomicity
      const { data: currentInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select('amount_paid, total_amount, status, version')
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Verify invoice hasn't been paid in the meantime
      if (currentInvoice.status === 'paid' || currentInvoice.status === 'cancelled') {
        throw new Error(`Cannot add payment - invoice is ${currentInvoice.status}`);
      }
      
      // Calculate new totals using freshly fetched data
      const currentAmountPaid = currentInvoice.amount_paid || 0;
      const newAmountPaid = currentAmountPaid + amount;
      const newBalanceDue = Math.max(0, (currentInvoice.total_amount || 0) - newAmountPaid);
      
      // Validate payment doesn't exceed balance
      const currentBalance = (currentInvoice.total_amount || 0) - currentAmountPaid;
      if (amount > currentBalance + 0.01) { // Small tolerance for floating point
        throw new Error(`Payment amount (${amount}) exceeds balance due (${currentBalance.toFixed(2)})`);
      }
      
      // Determine new status based on payment
      let newStatus = currentInvoice.status;
      if (newBalanceDue <= 0.01) { // Small tolerance
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partial';
      }

      // Insert payment record first
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: id,
          patient_id: invoice.patient_id,
          tenant_id: tenantId,
          amount: amount,
          payment_method: paymentMethod,
          payment_reference: paymentRef || null,
          status: 'completed',
        });

      if (paymentError) throw paymentError;

      // Update invoice with optimistic lock check using amount_paid as version
      // This ensures we only update if no other payment was recorded between fetch and update
      const { data: updateResult, error: updateError } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: newBalanceDue,
          status: newStatus,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('amount_paid', currentAmountPaid) // Optimistic lock
        .select('id');

      if (updateError) throw updateError;
      
      // If no rows updated, another payment was recorded - reload and alert user
      if (!updateResult || updateResult.length === 0) {
        loadInvoice();
        throw new Error('Another payment was recorded simultaneously. Please review and try again.');
      }

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentMethod('cash');
      setPaymentRef('');
      loadInvoice(); // Reload to get updated balances
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock },
      sent: { bg: 'bg-blue-100', text: 'text-blue-700', icon: FileText },
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: Clock },
    };
    return styles[status] || styles.draft;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found</p>
        <button
          onClick={() => navigate('/invoices')}
          className="mt-4 text-primary-500 hover:underline"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  const statusInfo = getStatusBadge(invoice.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/invoices')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium capitalize ${statusInfo.bg} ${statusInfo.text}`}>
                <StatusIcon className="w-4 h-4" />
                {invoice.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status !== 'paid' && invoice.balance_due > 0 && (
            <button
              onClick={() => {
                setPaymentAmount(invoice.balance_due.toString());
                setShowPaymentModal(true);
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              Record Payment
            </button>
          )}
          <Link
            to={`/invoices/edit/${id}`}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
          <Link
            to={`/invoices/${id}/print`}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </Link>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="flex justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary-600">DENTO</h2>
              <p className="text-sm text-gray-500 mt-1">Dental Clinic</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">INVOICE</p>
              <p className="text-sm text-gray-500">#{invoice.invoice_number}</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 grid grid-cols-2 gap-6 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">BILL TO</h3>
            {patient ? (
              <div>
                <p className="font-medium text-gray-900">
                  {patient.first_name} {patient.last_name}
                </p>
                <p className="text-sm text-gray-600">{patient.phone}</p>
                {patient.email && <p className="text-sm text-gray-600">{patient.email}</p>}
                {patient.address && <p className="text-sm text-gray-600">{patient.address}</p>}
              </div>
            ) : (
              <p className="text-gray-400">Patient information unavailable</p>
            )}
          </div>
          <div className="text-right">
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Issue Date</p>
                <p className="font-medium text-gray-900">
                  {format(parseISO(invoice.issue_date), 'MMMM d, yyyy')}
                </p>
              </div>
              {invoice.due_date && (
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium text-gray-900">
                    {format(parseISO(invoice.due_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-medium text-gray-500">Description</th>
                <th className="text-center py-3 text-sm font-medium text-gray-500 w-20">Qty</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500 w-28">Price</th>
                <th className="text-right py-3 text-sm font-medium text-gray-500 w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="py-3 text-gray-900">{item.description}</td>
                  <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-3 text-right text-gray-600">{fmtCurrency(item.unit_price)}</td>
                  <td className="py-3 text-right font-medium text-gray-900">{fmtCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{fmtCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount ({invoice.discount_percentage}%)</span>
                  <span className="text-red-600">-{fmtCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              {invoice.tax_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">VAT ({invoice.tax_percentage}%)</span>
                  <span className="text-gray-900">{fmtCurrency(invoice.tax_amount)}</span>
                </div>
              )}
              <hr className="border-gray-200" />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{fmtCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Paid</span>
                  <span>-{fmtCurrency(invoice.amount_paid)}</span>
                </div>
              )}
              {invoice.balance_due > 0 && (
                <div className="flex justify-between text-lg font-bold text-red-600">
                  <span>Balance Due</span>
                  <span>{fmtCurrency(invoice.balance_due)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <div className="grid grid-cols-2 gap-6">
              {invoice.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Terms & Conditions</h4>
                  <p className="text-sm text-gray-600">{invoice.terms}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Linked Treatment Plan */}
      {treatmentPlan && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-500" />
            Linked Treatment Plan
          </h3>
          <Link 
            to={`/treatment-plans/${treatmentPlan.id}`}
            className="flex items-center justify-between p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <div>
              <p className="font-medium text-primary-700">{treatmentPlan.title || 'Treatment Plan'}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
              treatmentPlan.status === 'completed' ? 'bg-green-100 text-green-700' :
              treatmentPlan.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
              treatmentPlan.status === 'approved' ? 'bg-indigo-100 text-indigo-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {treatmentPlan.status?.replace('_', ' ')}
            </span>
          </Link>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Payment History
          </h3>
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {payment.payment_method === 'cash' ? (
                    <Banknote className="w-5 h-5 text-green-500" />
                  ) : (
                    <CreditCard className="w-5 h-5 text-blue-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{payment.payment_method}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(payment.created_at), 'MMM d, yyyy h:mm a')}
                      {payment.payment_reference && ` • Ref: ${payment.payment_reference}`}
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-green-600">
                  +{fmtCurrency(payment.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Payment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({invoice?.currency || defaultCurrency?.code}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Balance due: {fmtCurrency(invoice.balance_due)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="insurance">Insurance</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Transaction ID, cheque number, etc."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={recordPayment}
                disabled={savingPayment || !paymentAmount}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {savingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceView;
