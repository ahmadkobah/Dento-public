import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
  DollarSign,
  Calendar,
  Shield,
  ArrowUpCircle,
  ArrowDownCircle,
  Zap,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';

// Currency formatting
const currencySymbols = { USD: '$', EGP: 'E£', EUR: '€', GBP: '£', SAR: 'SAR ', AED: 'AED ', TRY: '₺', KWD: 'KD ' };

function formatCurrency(amount, currency = 'USD') {
  const sym = currencySymbols[currency] || `${currency} `;
  return `${sym}${parseFloat(amount || 0).toFixed(2)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-600', label: 'Draft' },
  pending: { color: 'bg-amber-100 text-amber-700', label: 'Pending' },
  paid: { color: 'bg-emerald-100 text-emerald-700', label: 'Paid' },
  overdue: { color: 'bg-red-100 text-red-700', label: 'Overdue' },
  cancelled: { color: 'bg-gray-100 text-gray-400', label: 'Cancelled' },
};

export default function MySubscription() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [plan, setPlan] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [showPlanChange, setShowPlanChange] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [changingPlan, setChangingPlan] = useState(false);
  const [planChangeResult, setPlanChangeResult] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return;

      // Fetch tenant + plan
      const { data: tenantData } = await supabase
        .from('tenants')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('id', profile.tenant_id)
        .single();

      setTenant(tenantData);
      setPlan(tenantData?.subscription_plans);

      // Fetch invoices
      const { data: invoiceData } = await supabase
        .from('saas_invoices')
        .select('*, saas_invoice_items (*)')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(20);

      setInvoices(invoiceData || []);

      // Fetch payments
      const { data: paymentData } = await supabase
        .from('saas_payments')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(10);

      setPayments(paymentData || []);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pay via Stripe checkout
  const handlePayWithStripe = async (invoiceId) => {
    setPayingInvoice(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-billing?action=create-checkout', {
        body: {
          invoice_id: invoiceId,
          success_url: `${window.location.origin}/subscription?payment=success`,
          cancel_url: `${window.location.origin}/subscription?payment=cancelled`,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create payment session. Stripe may not be configured.');
    } finally {
      setPayingInvoice(null);
    }
  };

  // Download invoice as HTML
  const handleDownload = (invoice) => {
    const items = invoice.saas_invoice_items || [];
    const curr = currencySymbols[invoice.currency] || `${invoice.currency} `;
    const fmtAmt = (v) => `${curr}${parseFloat(v || 0).toFixed(2)}`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .title { font-size: 28px; font-weight: bold; color: #10B981; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  th { background: #f3f4f6; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; color: #6b7280; }
  td { padding: 12px 10px; border-bottom: 1px solid #f3f4f6; }
  .total td { font-weight: bold; border-top: 2px solid #10B981; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <div><div class="title">INVOICE</div><div>${invoice.invoice_number}</div></div>
  <div style="text-align:right"><strong>Status:</strong> ${invoice.status}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px">
  <div><strong>Bill To:</strong><br>${tenant?.name || ''}<br>${tenant?.owner_email || ''}</div>
  <div><strong>Issue Date:</strong> ${invoice.issue_date || 'N/A'}<br><strong>Due Date:</strong> ${invoice.due_date || 'N/A'}<br><strong>Period:</strong> ${invoice.billing_period_start || ''} to ${invoice.billing_period_end || ''}</div>
</div>
<table>
  <thead><tr><th>Description</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>
    ${items.map(i => `<tr><td>${i.description}</td><td>${i.quantity || 1}</td><td style="text-align:right">${fmtAmt(i.unit_price)}</td><td style="text-align:right">${fmtAmt(i.total)}</td></tr>`).join('')}
    <tr class="total"><td colspan="3" style="text-align:right">Total</td><td style="text-align:right">${fmtAmt(invoice.total)}</td></tr>
  </tbody>
</table>
${invoice.notes ? `<p style="margin-top:20px;color:#6b7280"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
<p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:12px">Generated by Dento Platform</p>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice_number || 'invoice'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load available plans for plan change
  const handleShowPlanChange = async () => {
    setShowPlanChange(!showPlanChange);
    if (!showPlanChange && availablePlans.length === 0) {
      try {
        const { data: plansData } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly_usd', { ascending: true });
        setAvailablePlans(plansData || []);
      } catch (error) {
        console.error('Failed to load plans:', error);
      }
    }
  };

  // Request plan change
  const handlePlanChange = async (newPlanId) => {
    if (!tenant || newPlanId === tenant.subscription_plan_id) return;
    if (!confirm('Are you sure you want to change your plan? Upgrades take effect immediately. Downgrades apply at the end of your billing period.')) return;

    setChangingPlan(true);
    setPlanChangeResult(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('billing-plan-change?action=request-change', {
        body: {
          tenantId: tenant.id,
          newPlanId,
          billingCycle: tenant.billing_cycle || 'monthly',
          requestedBy: user?.id,
          immediate: true,
        },
      });
      if (error) throw error;
      setPlanChangeResult(data);
      // Refresh data after plan change
      setTimeout(() => fetchData(), 1500);
    } catch (error) {
      toast.error(error.message || 'Failed to change plan');
    } finally {
      setChangingPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-16">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No subscription information available</p>
      </div>
    );
  }

  const pendingInvoices = invoices.filter(i => ['pending', 'overdue'].includes(i.status));
  const _otherInvoices = invoices.filter(i => !['pending', 'overdue'].includes(i.status));

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Subscription</h1>
        <p className="text-gray-500 mt-1">Manage your plan, view invoices, and make payments</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-100">
              <CreditCard className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{plan?.name_en || 'Free Trial'}</h2>
              <p className="text-sm text-gray-500 capitalize">{tenant.subscription_status || tenant.status} • {tenant.billing_cycle || 'monthly'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(
                tenant.billing_cycle === 'yearly'
                  ? (tenant.currency_code === 'EGP' ? plan?.price_yearly_egp : plan?.price_yearly_usd)
                  : (tenant.currency_code === 'EGP' ? plan?.price_monthly_egp : plan?.price_monthly_usd),
                tenant.currency_code || 'USD'
              )}
            </p>
            <p className="text-sm text-gray-400">per {tenant.billing_cycle === 'yearly' ? 'year' : 'month'}</p>
          </div>
        </div>

        {tenant.trial_ends_at && tenant.subscription_status === 'trialing' && (
          <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Trial ends {formatDate(tenant.trial_ends_at)}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleShowPlanChange}
            className="inline-flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
          >
            <Zap className="h-4 w-4" />
            {showPlanChange ? 'Hide Plans' : 'Change Plan'}
          </button>
        </div>
      </div>

      {/* Plan Change Selection */}
      {showPlanChange && (
        <div className="bg-white rounded-xl border border-emerald-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-900">Change Your Plan</h3>
          </div>

          {planChangeResult && (
            <div className={`mb-4 p-4 rounded-lg border ${planChangeResult.data?.changeType === 'upgrade' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {planChangeResult.data?.changeType === 'upgrade' ? (
                  <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 text-blue-600" />
                )}
                <p className="font-medium text-gray-900">{planChangeResult.data?.message}</p>
              </div>
              {planChangeResult.data?.prorationAmount > 0 && (
                <p className="text-sm text-gray-600 ml-7">
                  Proration charge: {formatCurrency(planChangeResult.data.prorationAmount, tenant.currency_code || 'USD')}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {availablePlans.map((p) => {
              const isCurrent = p.id === tenant.subscription_plan_id;
              const currentPrice = plan?.price_monthly_usd || 0;
              const isUpgrade = (p.price_monthly_usd || 0) > currentPrice;
              const _isDowngrade = (p.price_monthly_usd || 0) < currentPrice;

              return (
                <div
                  key={p.id}
                  className={`relative rounded-xl border-2 p-5 transition-all ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 left-4 px-3 py-0.5 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                      Current Plan
                    </span>
                  )}
                  <h4 className="text-lg font-bold text-gray-900 mt-1">{p.name_en || p.name}</h4>
                  <p className="text-sm text-gray-500 mt-1 mb-3">{p.description_en || ''}</p>
                  <div className="mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">
                      {formatCurrency(p.price_monthly_usd || 0, 'USD')}
                    </span>
                    <span className="text-gray-400 text-sm">/mo</span>
                  </div>
                  {p.features && Array.isArray(p.features) && (
                    <ul className="text-sm text-gray-600 space-y-1.5 mb-4">
                      {p.features.slice(0, 5).map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          <span>{typeof f === 'string' ? f : f.label || f.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!isCurrent && (
                    <button
                      onClick={() => handlePlanChange(p.id)}
                      disabled={changingPlan}
                      className={`w-full mt-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                        isUpgrade
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      {changingPlan ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : isUpgrade ? (
                        <ArrowUpCircle className="h-4 w-4" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4" />
                      )}
                      {isUpgrade ? 'Upgrade' : 'Downgrade'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outstanding Invoices */}
      {pendingInvoices.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Outstanding Invoices</h3>
          </div>
          <div className="space-y-3">
            {pendingInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-4">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-500">Due: {formatDate(invoice.due_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total, invoice.currency)}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig[invoice.status]?.color}`}>
                      {statusConfig[invoice.status]?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePayWithStripe(invoice.id)}
                      disabled={payingInvoice === invoice.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {payingInvoice === invoice.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Pay Now
                    </button>
                    <button
                      onClick={() => handleDownload(invoice)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Download Invoice"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice History */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Receipt className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Invoice History</h3>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No invoices yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Invoice</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Period</th>
                  <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">Amount</th>
                  <th className="text-right py-3 px-2 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                      <p className="text-xs text-gray-400">{formatDate(invoice.issue_date)}</p>
                    </td>
                    <td className="py-3 px-2 text-gray-600">
                      {invoice.billing_period_start && invoice.billing_period_end
                        ? `${formatDate(invoice.billing_period_start)} – ${formatDate(invoice.billing_period_end)}`
                        : '—'}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig[invoice.status]?.color || 'bg-gray-100 text-gray-500'}`}>
                        {statusConfig[invoice.status]?.label || invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-gray-900">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {['pending', 'overdue'].includes(invoice.status) && (
                          <button
                            onClick={() => handlePayWithStripe(invoice.id)}
                            disabled={payingInvoice === invoice.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 text-xs font-medium disabled:opacity-50"
                          >
                            {payingInvoice === invoice.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedInvoice(selectedInvoice?.id === invoice.id ? null : invoice)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                          title="View Details"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(invoice)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
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

      {/* Invoice Detail Expand */}
      {selectedInvoice && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Invoice {selectedInvoice.invoice_number}
            </h3>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig[selectedInvoice.status]?.color}`}>
              {statusConfig[selectedInvoice.status]?.label}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-400">Issue Date</p>
              <p className="font-medium text-gray-900">{formatDate(selectedInvoice.issue_date)}</p>
            </div>
            <div>
              <p className="text-gray-400">Due Date</p>
              <p className="font-medium text-gray-900">{formatDate(selectedInvoice.due_date)}</p>
            </div>
            <div>
              <p className="text-gray-400">Currency</p>
              <p className="font-medium text-gray-900">{selectedInvoice.currency || 'USD'}</p>
            </div>
          </div>
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-500">Item</th>
                <th className="text-center py-2 font-medium text-gray-500">Qty</th>
                <th className="text-right py-2 font-medium text-gray-500">Price</th>
                <th className="text-right py-2 font-medium text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {(selectedInvoice.saas_invoice_items || []).map((item) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-900">{item.description}</td>
                  <td className="py-2 text-center text-gray-600">{item.quantity || 1}</td>
                  <td className="py-2 text-right text-gray-600">{formatCurrency(item.unit_price, selectedInvoice.currency)}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(item.total, selectedInvoice.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {selectedInvoice.tax_amount > 0 && (
                <tr className="border-t border-gray-200">
                  <td colSpan="3" className="py-2 text-right text-gray-500">Tax</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(selectedInvoice.tax_amount, selectedInvoice.currency)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-emerald-500">
                <td colSpan="3" className="py-2 text-right font-bold text-gray-900">Total</td>
                <td className="py-2 text-right font-bold text-lg text-emerald-600">{formatCurrency(selectedInvoice.total, selectedInvoice.currency)}</td>
              </tr>
            </tfoot>
          </table>
          {selectedInvoice.notes && (
            <p className="text-sm text-gray-500"><strong>Notes:</strong> {selectedInvoice.notes}</p>
          )}
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
          </div>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${payment.status === 'completed' ? 'bg-emerald-100' : 'bg-gray-200'}`}>
                    <CheckCircle className={`h-4 w-4 ${payment.status === 'completed' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{payment.payment_method || 'Payment'}</p>
                    <p className="text-xs text-gray-400">{formatDate(payment.processed_at || payment.created_at)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${payment.status === 'completed' ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{payment.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
