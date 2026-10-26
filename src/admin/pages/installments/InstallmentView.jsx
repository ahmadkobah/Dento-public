import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, User, Calendar, DollarSign, FileText, 
  CheckCircle, Clock, AlertCircle, CreditCard, Loader2,
  X, Plus, Receipt, Ban, RefreshCw
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { useTenant } from '../../contexts/TenantContext';

const statusConfig = {
  active: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Active' },
  completed: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Completed' },
  defaulted: { color: 'bg-red-100 text-red-700', icon: AlertCircle, label: 'Defaulted' },
  cancelled: { color: 'bg-gray-100 text-gray-700', icon: Ban, label: 'Cancelled' },
};

const paymentStatusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  paid: { color: 'bg-green-100 text-green-700', label: 'Paid' },
  partial: { color: 'bg-blue-100 text-blue-700', label: 'Partial' },
  overdue: { color: 'bg-red-100 text-red-700', label: 'Overdue' },
  waived: { color: 'bg-gray-100 text-gray-700', label: 'Waived' },
};

const InstallmentView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { formatCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: 0,
    payment_method: 'cash',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    apply_late_fee: false,
    notes: '',
  });

  const loadPlan = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('installment_plans')
        .select(`
          *,
          patients:patient_id (id, first_name, last_name, phone, email),
          invoices:invoice_id (id, invoice_number, total_amount, balance_due),
          installment_payments (*)
        `)
        .eq('tenant_id', tenantId)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Sort payments by installment number
      if (data.installment_payments) {
        data.installment_payments.sort((a, b) => a.installment_number - b.installment_number);
      }

      setPlan(data);
    } catch (error) {
      console.error('Error loading installment plan:', error);
      setMessage({ type: 'error', text: 'Failed to load installment plan' });
    } finally {
      setLoading(false);
    }
  }, [id, tenantId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const openPaymentModal = (payment) => {
    const isOverdue = payment.status === 'overdue' || 
      (payment.status === 'pending' && isPast(parseISO(payment.due_date)) && !isToday(parseISO(payment.due_date)));
    
    setSelectedPayment(payment);
    setPaymentForm({
      amount_paid: payment.amount_due - (payment.amount_paid || 0),
      payment_method: 'cash',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      apply_late_fee: isOverdue && plan?.late_fee_percentage > 0,
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const calculateLateFee = () => {
    if (!paymentForm.apply_late_fee || !plan?.late_fee_percentage) return 0;
    return (selectedPayment.amount_due * plan.late_fee_percentage) / 100;
  };

  const handleRecordPayment = async () => {
    if (!selectedPayment) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const lateFee = calculateLateFee();
      
      // Issue #15 clarification: Late fee handling
      // - amount_paid tracks the base installment amount paid
      // - late_fee is stored separately for tracking
      // - The total payment to invoice includes late fee
      // - Status comparison uses base amount only (late fee is separate charge)
      
      const totalPaid = (selectedPayment.amount_paid || 0) + paymentForm.amount_paid;
      const baseDue = selectedPayment.amount_due; // Base amount without late fee
      
      let newStatus = 'pending';
      if (totalPaid >= baseDue) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partial';
      }

      // Update the installment payment
      const { error: paymentError } = await supabase
        .from('installment_payments')
        .update({
          amount_paid: totalPaid,
          late_fee: lateFee,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          status: newStatus,
          notes: paymentForm.notes || null,
        })
        .eq('id', selectedPayment.id)
        .eq('tenant_id', tenantId);

      if (paymentError) throw paymentError;

      // Calculate new remaining amount for the plan
      const { data: payments } = await supabase
        .from('installment_payments')
        .select('amount_paid')
        .eq('installment_plan_id', id)
        .eq('tenant_id', tenantId);

      const totalPaidOnPlan = payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
      const newRemainingAmount = plan.total_amount - plan.down_payment - totalPaidOnPlan;

      // Check if plan is completed
      const _allPaid = payments?.every(p => p.amount_paid >= selectedPayment.amount_due);
      
      // Update the installment plan
      await supabase
        .from('installment_plans')
        .update({
          remaining_amount: Math.max(0, newRemainingAmount),
          status: newRemainingAmount <= 0 ? 'completed' : plan.status,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      // Record payment in payments table (linked to invoice)
      // Include late fee in the total payment amount
      const totalPaymentAmount = paymentForm.amount_paid + lateFee;
      
      if (plan.invoice_id) {
        await supabase.from('payments').insert({
          invoice_id: plan.invoice_id,
          patient_id: plan.patient_id,
          amount: totalPaymentAmount,
          payment_method: paymentForm.payment_method,
          payment_date: paymentForm.payment_date,
          notes: lateFee > 0 
            ? `Installment #${selectedPayment.installment_number}: ${formatCurrency(paymentForm.amount_paid)} + Late Fee: ${formatCurrency(lateFee)}`
            : `Installment #${selectedPayment.installment_number} payment`,
        });

        // Update invoice amount_paid and balance_due
        const { data: invoice } = await supabase
          .from('invoices')
          .select('amount_paid, total_amount')
          .eq('id', plan.invoice_id)
          .eq('tenant_id', tenantId)
          .single();

        if (invoice) {
          // Include late fee in the invoice payment amount
          const newAmountPaid = (invoice.amount_paid || 0) + totalPaymentAmount;
          const newBalanceDue = invoice.total_amount - newAmountPaid;
          
          await supabase
            .from('invoices')
            .update({
              amount_paid: newAmountPaid,
              balance_due: Math.max(0, newBalanceDue),
              status: newBalanceDue <= 0 ? 'paid' : 'partial',
            })
            .eq('id', plan.invoice_id)
            .eq('tenant_id', tenantId);
        }
      }

      setMessage({ type: 'success', text: 'Payment recorded successfully!' });
      setShowPaymentModal(false);
      loadPlan();
    } catch (error) {
      console.error('Error recording payment:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to record payment' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPlan = async () => {
    if (!confirm('Are you sure you want to cancel this installment plan?')) return;

    try {
      await supabase
        .from('installment_plans')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      setMessage({ type: 'success', text: 'Plan cancelled' });
      loadPlan();
    } catch {
      setMessage({ type: 'error', text: 'Failed to cancel plan' });
    }
  };

  const handleMarkDefaulted = async () => {
    if (!confirm('Are you sure you want to mark this plan as defaulted?')) return;

    try {
      await supabase
        .from('installment_plans')
        .update({ status: 'defaulted' })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      setMessage({ type: 'success', text: 'Plan marked as defaulted' });
      loadPlan();
    } catch {
      setMessage({ type: 'error', text: 'Failed to update plan' });
    }
  };

  const getPaymentStatus = (payment) => {
    if (payment.status === 'paid') return 'paid';
    if (payment.status === 'partial') return 'partial';
    if (payment.status === 'waived') return 'waived';
    if (isPast(parseISO(payment.due_date)) && !isToday(parseISO(payment.due_date))) return 'overdue';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Installment plan not found</p>
      </div>
    );
  }

  const StatusIcon = statusConfig[plan.status]?.icon || Clock;
  const paidCount = plan.installment_payments?.filter(p => p.status === 'paid').length || 0;
  const overdueCount = plan.installment_payments?.filter(p => getPaymentStatus(p) === 'overdue').length || 0;
  const totalPaid = (plan.down_payment || 0) + (plan.installment_payments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0);
  const progressPercent = Math.round((totalPaid / plan.total_amount) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/installments')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Installment Plan</h1>
            <p className="text-gray-500 mt-1">
              Invoice: {plan.invoices?.invoice_number || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPlan}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${statusConfig[plan.status]?.color}`}>
            <StatusIcon className="w-4 h-4" />
            {statusConfig[plan.status]?.label}
          </span>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {/* Patient & Plan Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            Patient Information
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-primary-600">
                {plan.patients?.first_name?.[0]}{plan.patients?.last_name?.[0]}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">
                {plan.patients?.first_name} {plan.patients?.last_name}
              </p>
              <p className="text-gray-500">{plan.patients?.phone}</p>
              {plan.patients?.email && (
                <p className="text-gray-500 text-sm">{plan.patients?.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Plan Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-400" />
            Plan Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Amount</span>
              <span className="font-semibold">{formatCurrency(plan.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Down Payment</span>
              <span className="font-medium text-green-600">-{formatCurrency(plan.down_payment || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Installments</span>
              <span className="font-medium">{plan.number_of_installments} × {formatCurrency(plan.installment_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Frequency</span>
              <span className="font-medium capitalize">{plan.frequency}</span>
            </div>
            {plan.late_fee_percentage > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Late Fee</span>
                <span className="font-medium text-amber-600">{plan.late_fee_percentage}%</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between">
              <span className="font-medium text-gray-900">Remaining</span>
              <span className="font-bold text-primary-600">{formatCurrency(plan.remaining_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Progress</h2>
          <span className="text-sm text-gray-500">{paidCount}/{plan.number_of_installments} installments paid</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div 
            className="bg-primary-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Paid: {formatCurrency(totalPaid)}</span>
          <span className="font-medium text-primary-600">{progressPercent}%</span>
        </div>
        {overdueCount > 0 && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{overdueCount} overdue payment{overdueCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Payment Schedule */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Payment Schedule
          </h2>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">#</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Due Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Amount</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {plan.installment_payments?.map((payment) => {
              const status = getPaymentStatus(payment);
              const _remaining = payment.amount_due - (payment.amount_paid || 0);
              const canPay = status !== 'paid' && status !== 'waived' && plan.status === 'active';

              return (
                <tr 
                  key={payment.id}
                  className={`hover:bg-gray-50 transition-colors ${status === 'overdue' ? 'bg-red-50' : ''}`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                        status === 'paid' ? 'bg-green-100 text-green-600' :
                        status === 'overdue' ? 'bg-red-100 text-red-600' :
                        status === 'partial' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {payment.installment_number}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(parseISO(payment.due_date), 'MMM d, yyyy')}
                        </p>
                        {payment.payment_date && (
                          <p className="text-sm text-green-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Paid: {format(parseISO(payment.payment_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-gray-900">{formatCurrency(payment.amount_due)}</p>
                      {payment.late_fee > 0 && (
                        <p className="text-xs text-red-600">+{formatCurrency(payment.late_fee)} late fee</p>
                      )}
                      {status === 'partial' && (
                        <p className="text-xs text-blue-600">Paid: {formatCurrency(payment.amount_paid)}</p>
                      )}
                      {status === 'overdue' && plan?.late_fee_percentage > 0 && (
                        <p className="text-xs text-amber-600">
                          +{plan.late_fee_percentage}% late fee
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatusConfig[status]?.color}`}>
                      {paymentStatusConfig[status]?.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      {canPay && (
                        <button
                          onClick={() => openPaymentModal(payment)}
                          className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <CreditCard className="w-4 h-4" />
                          {status === 'partial' ? 'Pay Rest' : 'Record'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {plan.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            Notes
          </h2>
          <p className="text-gray-600">{plan.notes}</p>
        </div>
      )}

      {/* Actions */}
      {plan.status === 'active' && (
        <div className="flex justify-end gap-3">
          <button
            onClick={handleMarkDefaulted}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            Mark as Defaulted
          </button>
          <button
            onClick={handleCancelPlan}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel Plan
          </button>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Record Payment - Installment #{selectedPayment.installment_number}
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Amount Due</span>
                  <span className="font-medium">{formatCurrency(selectedPayment.amount_due)}</span>
                </div>
                {selectedPayment.amount_paid > 0 && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Already Paid</span>
                    <span className="font-medium text-green-600">-{formatCurrency(selectedPayment.amount_paid)}</span>
                  </div>
                )}
                {paymentForm.apply_late_fee && (
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Late Fee ({plan.late_fee_percentage}%)</span>
                    <span className="font-medium text-red-600">+{formatCurrency(calculateLateFee())}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t mt-2">
                  <span className="font-medium">Remaining</span>
                  <span className="font-bold">
                    {formatCurrency(
                      selectedPayment.amount_due - (selectedPayment.amount_paid || 0) + calculateLateFee()
                    )}
                  </span>
                </div>
                {paymentForm.apply_late_fee && (
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-red-200 bg-red-50 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
                    <span className="font-medium text-red-700">Total to Collect</span>
                    <span className="font-bold text-red-700">
                      {formatCurrency(paymentForm.amount_paid + calculateLateFee())}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount_paid}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount_paid: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {plan.late_fee_percentage > 0 && getPaymentStatus(selectedPayment) === 'overdue' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentForm.apply_late_fee}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, apply_late_fee: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    Apply late fee ({plan.late_fee_percentage}% = {formatCurrency(calculateLateFee())})
                  </span>
                </label>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={saving || paymentForm.amount_paid <= 0}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallmentView;
