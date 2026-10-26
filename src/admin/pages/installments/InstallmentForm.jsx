import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Save, Loader2, Search, User, Calculator,
  Calendar, DollarSign, Plus, Trash2, AlertTriangle
} from 'lucide-react';
import { format, addMonths, addWeeks } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useRegionalSettings } from '../../../contexts/RegionalContext';
import { validateInstallmentPlan, escapeSearchTerm } from '../../../utils/validation';
import { roundCurrency } from '../../../utils/currency';
import { useTenant } from '../../contexts/TenantContext';

const InstallmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { formatCurrency } = useRegionalSettings();
  const { tenantId } = useTenant();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Invoice search
  const [invoices, setInvoices] = useState([]);
  // Invoice selection happens through formData.invoice_id

  const [formData, setFormData] = useState({
    patient_id: '',
    invoice_id: '',
    total_amount: 0,
    down_payment: 0,
    number_of_installments: 3,
    frequency: 'monthly',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    late_fee_percentage: 0,
    notes: '',
  });

  const [previewPayments, setPreviewPayments] = useState([]);

  // Search patients
  useEffect(() => {
    const searchPatients = async () => {
      if (patientSearch.length < 2) {
        setPatientResults([]);
        return;
      }

      if (!tenantId) return;
      const safeSearch = escapeSearchTerm(patientSearch);
      const { data } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone')
        .eq('tenant_id', tenantId)
        .or(`first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`)
        .limit(10);

      setPatientResults(data || []);
    };

    const timer = setTimeout(searchPatients, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, tenantId]);

  // Load patient invoices
  useEffect(() => {
    const loadInvoices = async () => {
      if (!selectedPatient) {
        setInvoices([]);
        return;
      }

      if (!tenantId) return;

      // Get all invoices that are NOT fully paid/cancelled/refunded
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, amount_paid, status, balance_due')
        .eq('tenant_id', tenantId)
        .eq('patient_id', selectedPatient.id)
        .not('status', 'in', '("paid","cancelled","refunded")')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading invoices:', error);
      }
      
      // Filter to only show invoices with outstanding balance
      const unpaidInvoices = (data || []).filter(inv => {
        const outstanding = inv.balance_due || (inv.total_amount - (inv.amount_paid || 0));
        return outstanding > 0;
      });
      
      setInvoices(unpaidInvoices);
    };

    loadInvoices();
  }, [selectedPatient, tenantId]);

  // Calculate preview payments
  useEffect(() => {
    if (!formData.total_amount || !formData.number_of_installments) return;

    const remainingAmount = roundCurrency(formData.total_amount - formData.down_payment);
    
    // Warn if down payment exceeds total (but don't prevent preview)
    if (formData.down_payment > formData.total_amount) {
      setPreviewPayments([]);
      return;
    }
    
    const installmentAmount = roundCurrency(remainingAmount / formData.number_of_installments);
    const payments = [];

    for (let i = 1; i <= formData.number_of_installments; i++) {
      let dueDate = new Date(formData.start_date);
      
      switch (formData.frequency) {
        case 'weekly':
          dueDate = addWeeks(dueDate, i);
          break;
        case 'biweekly':
          dueDate = addWeeks(dueDate, i * 2);
          break;
        case 'monthly':
        default:
          dueDate = addMonths(dueDate, i);
          break;
      }

      payments.push({
        installment_number: i,
        due_date: format(dueDate, 'yyyy-MM-dd'),
        amount_due: installmentAmount,
      });
    }

    // Adjust last payment for rounding
    if (payments.length > 0) {
      const totalPayments = payments.reduce((sum, p) => sum + p.amount_due, 0);
      const diff = roundCurrency(remainingAmount - totalPayments);
      payments[payments.length - 1].amount_due = roundCurrency(payments[payments.length - 1].amount_due + diff);
    }

    setPreviewPayments(payments);
  }, [formData.total_amount, formData.down_payment, formData.number_of_installments, formData.frequency, formData.start_date]);

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(`${patient.first_name} ${patient.last_name}`);
    setFormData(prev => ({ ...prev, patient_id: patient.id }));
    setShowPatientDropdown(false);
  };

  const selectInvoice = (invoice) => {
    const outstanding = invoice.balance_due || (invoice.total_amount - (invoice.amount_paid || 0));
    setFormData(prev => ({
      ...prev,
      invoice_id: invoice.id,
      total_amount: outstanding,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Run validation
    const validationErrors = validateInstallmentPlan(formData);
    if (validationErrors.length > 0) {
      setMessage({ type: 'error', text: validationErrors[0] });
      return;
    }

    if (!formData.invoice_id) {
      setMessage({ type: 'error', text: 'Please select an invoice' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const remainingAmount = roundCurrency(formData.total_amount - formData.down_payment);
      const installmentAmount = roundCurrency(remainingAmount / formData.number_of_installments);

      // Create installment plan
      const { data: plan, error: planError } = await supabase
        .from('installment_plans')
        .insert({
          tenant_id: tenantId,
          patient_id: formData.patient_id,
          invoice_id: formData.invoice_id || null,
          total_amount: formData.total_amount,
          down_payment: formData.down_payment,
          remaining_amount: remainingAmount,
          number_of_installments: formData.number_of_installments,
          installment_amount: installmentAmount,
          frequency: formData.frequency,
          start_date: formData.start_date,
          late_fee_percentage: formData.late_fee_percentage,
          notes: formData.notes,
          status: 'active',
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create installment payments
      const payments = previewPayments.map(p => ({
        tenant_id: tenantId,
        installment_plan_id: plan.id,
        installment_number: p.installment_number,
        due_date: p.due_date,
        amount_due: p.amount_due,
        status: 'pending',
      }));

      const { error: paymentsError } = await supabase
        .from('installment_payments')
        .insert(payments);

      if (paymentsError) throw paymentsError;

      // Record down payment if any
      if (formData.down_payment > 0) {
        await supabase.from('payments').insert({
          invoice_id: formData.invoice_id,
          patient_id: formData.patient_id,
          amount: formData.down_payment,
          payment_method: 'cash',
          payment_date: new Date().toISOString(),
          notes: 'Down payment for installment plan',
        });
        
        // Issue #14 Fix: Update invoice with down payment
        if (formData.invoice_id) {
          // Get current invoice state
          const { data: currentInvoice } = await supabase
            .from('invoices')
            .select('amount_paid, total_amount, status')
            .eq('id', formData.invoice_id)
            .eq('tenant_id', tenantId)
            .single();
          
          if (currentInvoice) {
            const newAmountPaid = (currentInvoice.amount_paid || 0) + formData.down_payment;
            const newBalanceDue = Math.max(0, (currentInvoice.total_amount || 0) - newAmountPaid);
            
            let newStatus = currentInvoice.status;
            if (newBalanceDue <= 0.01) {
              newStatus = 'paid';
            } else if (newAmountPaid > 0) {
              newStatus = 'partial';
            }
            
            await supabase
              .from('invoices')
              .update({
                amount_paid: newAmountPaid,
                balance_due: newBalanceDue,
                status: newStatus,
              })
              .eq('id', formData.invoice_id)
              .eq('tenant_id', tenantId);
          }
        }
      }

      setMessage({ type: 'success', text: 'Installment plan created successfully!' });
      setTimeout(() => navigate('/installments'), 1500);
    } catch (error) {
      console.error('Error creating installment plan:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create installment plan' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Installment Plan' : 'Create Installment Plan'}
          </h1>
          <p className="text-gray-500 mt-1">Set up a payment plan for a patient</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-600" />
              Patient Information
            </h2>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Patient *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              {showPatientDropdown && patientResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {patientResults.map(patient => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => selectPatient(patient)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50"
                    >
                      <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                      <p className="text-sm text-gray-500">{patient.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice Selection */}
            {selectedPatient && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Invoice *
                </label>
                {invoices.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    No unpaid invoices found for this patient. Create an invoice first to set up an installment plan.
                  </div>
                ) : (
                  <select
                    value={formData.invoice_id}
                    onChange={(e) => {
                      const inv = invoices.find(i => i.id === e.target.value);
                      if (inv) selectInvoice(inv);
                      else setFormData(prev => ({ ...prev, invoice_id: '' }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select an invoice...</option>
                    {invoices.map(inv => {
                      const outstanding = inv.balance_due || (inv.total_amount - (inv.amount_paid || 0));
                      return (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} - {formatCurrency(outstanding)} outstanding ({inv.status})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Plan Details */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary-600" />
              Plan Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Down Payment
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.down_payment}
                    onChange={(e) => setFormData(prev => ({ ...prev, down_payment: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Installments *
                </label>
                <input
                  type="number"
                  min="2"
                  max="24"
                  value={formData.number_of_installments}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_installments: parseInt(e.target.value) || 3 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency *
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Late Fee %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.late_fee_percentage}
                  onChange={(e) => setFormData(prev => ({ ...prev, late_fee_percentage: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Any additional notes..."
              />
            </div>
          </div>
        </div>

        {/* Preview Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              Payment Preview
            </h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-medium">{formatCurrency(formData.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Down Payment</span>
                <span className="font-medium">-{formatCurrency(formData.down_payment)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium text-gray-900">Remaining</span>
                <span className="font-bold text-primary-600">
                  {formatCurrency(formData.total_amount - formData.down_payment)}
                </span>
              </div>
            </div>

            {previewPayments.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Payment Schedule</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {previewPayments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <span className="font-medium">#{payment.installment_number}</span>
                        <span className="text-gray-500 ml-2">{format(new Date(payment.due_date), 'MMM d, yyyy')}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(payment.amount_due)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !formData.patient_id}
              className="w-full mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Plan
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InstallmentForm;
