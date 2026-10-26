import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Globe,
  Users,
  Package,
  CreditCard,
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Pencil,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Key,
  ShieldCheck,
  Server,
  FileText,
  Mail,
  MessageCircle,
  Smartphone,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Link2,
  Receipt,
  DollarSign,
  Send,
  X,
  Download,
  Ban,
} from 'lucide-react';
import { useTenant, useTenantModules, useErrors, useDomains, useCreateDomain, useVerifyDns, useUpdateTenant, useTenantInvoices, useTenantPayments, useBillingSummary, useCreateInvoice, useDeleteInvoice, useMarkInvoiceAsPaid, useCancelInvoice, useSendInvoice, useGenerateSubscriptionInvoice, useUpdateInvoice, useAddInvoiceItem, useDeleteInvoiceItem, useRecordPayment } from '../../hooks/useDevApi';
import devApi, { apiKeysApi } from '../../services/devApi';
import {
  EmailConfigModal,
  WhatsAppConfigModal,
  DomainConfigModal,
  ApiKeysModal,
  IntegrationModal,
} from '../../components/ChannelSettingsModal';
import { useToast } from '../../../hooks/useToast';

// Map API tenant data to expected format
const mapTenant = (t) => ({
  id: t?.id,
  name: t?.name || t?.business_name || 'Unknown',
  slug: t?.slug || 'unknown',
  displayName: t?.display_name || t?.business_name || t?.name || 'Unknown Tenant',
  logoUrl: t?.logo_url,
  ownerName: t?.owner_name || t?.contact_name,
  ownerEmail: t?.owner_email || t?.contact_email,
  ownerPhone: t?.owner_phone || t?.contact_phone,
  billingEmail: t?.billing_email || t?.contact_email,
  addressLine1: t?.address_line1 || t?.address,
  city: t?.city,
  state: t?.state,
  postalCode: t?.postal_code,
  countryCode: t?.country_code || 'US',
  status: t?.status || 'active',
  subscriptionTier: t?.subscription_tier || t?.plan || 'starter',
  subscriptionStatus: t?.subscription_status || 'active',
  subscriptionStartedAt: t?.subscription_started_at,
  subscriptionEndsAt: t?.subscription_ends_at,
  subdomain: t?.subdomain,
  customDomain: t?.custom_domain,
  domainVerified: t?.domain_verified ?? true,
  sslStatus: t?.ssl_status || 'active',
  // User counts - use current_users_count from DB or count tenant_users array  
  currentUsers: t?.current_users_count || t?.current_users || t?.user_count || t?.tenant_users?.length || 0,
  maxUsers: t?.max_users || t?.subscription_plans?.max_users || 10,
  currentPatients: t?.current_patients || t?.patient_count || 0,
  maxPatients: t?.max_patients || 1000,
  currentStorageBytes: t?.storage_used_bytes || 0,
  maxStorageGb: t?.max_storage_gb || 10,
  timezone: t?.timezone || 'UTC',
  currencyCode: t?.currency_code || 'USD',
  locale: t?.locale || 'en-US',
  primaryColor: t?.primary_color || '#10B981',
  stripeCustomerId: t?.stripe_customer_id,
  nextBillingDate: t?.next_billing_date,
  monthlyPrice: t?.monthly_price || 0,
  modulesActive: t?.modules_active || 0,
  errorsLast24h: t?.errors_24h || 0,
  errorsLast7d: t?.errors_7d || 0,
  apiCallsLast24h: t?.api_calls_24h || 0,
  lastLoginAt: t?.last_login_at,
  createdAt: t?.created_at,
  currentVersion: t?.current_version || '1.0.0',
  lastDeployedAt: t?.last_deployed_at,
  // Also store tenant_users array for display
  tenantUsers: t?.tenant_users || [],
});

const mapModule = (m) => ({
  id: m.id,
  slug: m.modules?.slug || m.slug || m.module_slug,
  name: m.modules?.name_en || m.name || m.module_name,
  status: m.status || (m.is_active ? 'active' : 'inactive'),
  isCore: m.modules?.is_core ?? m.is_core ?? false,
  trialEndsAt: m.trial_ends_at,
});

const statusConfig = {
  active: { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  trial: { label: 'Trial', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock },
  suspended: { label: 'Suspended', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: AlertTriangle },
  expired: { label: 'Expired', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle },
};

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'modules', label: 'Modules', icon: Package },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'channels', label: 'Channels', icon: Link2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Modal states
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [apiKeysModalOpen, setApiKeysModalOpen] = useState(false);
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [editForm, setEditForm] = useState(null);
  
  // Billing states
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [billingActionLoading, setBillingActionLoading] = useState(null);
  const [newItemForm, setNewItemForm] = useState(null);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'bank_transfer', payment_reference: '', notes: '' });
  
  // Limits edit state
  const [limitsModalOpen, setLimitsModalOpen] = useState(false);
  const [limitsForm, setLimitsForm] = useState(null);
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [verifyingDomainId, setVerifyingDomainId] = useState(null);

  // Fetch real data from API
  const { data: tenantData, loading: tenantLoading, error: tenantError, refetch: refetchTenant } = useTenant(id);
  const { data: modulesData, loading: _modulesLoading, error: _modulesError } = useTenantModules(id);
  const { data: errorsData } = useErrors({ tenant_id: id, limit: 5 });
  const { data: domainsData } = useDomains({ tenant_id: id });
  const { mutate: updateTenant } = useUpdateTenant();
  const { mutateAsync: createDomain } = useCreateDomain();
  const { mutateAsync: verifyDns } = useVerifyDns();
  
  // Billing hooks
  const { data: invoicesData, refetch: refetchInvoices } = useTenantInvoices(id);
  const { data: paymentsData, refetch: refetchPayments } = useTenantPayments(id, { limit: 10 });
  const { data: summaryData, refetch: refetchSummary } = useBillingSummary(id);
  const { mutate: _createInvoice } = useCreateInvoice();
  const { mutate: deleteInvoice } = useDeleteInvoice();
  const { mutate: markAsPaid } = useMarkInvoiceAsPaid();
  const { mutate: cancelInvoice } = useCancelInvoice();
  const { mutate: sendInvoice } = useSendInvoice();
  const { mutateAsync: generateInvoice } = useGenerateSubscriptionInvoice();
  const { mutate: updateInvoice } = useUpdateInvoice();
  const { mutate: addInvoiceItem } = useAddInvoiceItem();
  const { mutate: deleteInvoiceItem } = useDeleteInvoiceItem();
  const { mutate: recordPayment } = useRecordPayment();

  // Billing data
  const invoices = invoicesData?.invoices || [];
  const payments = paymentsData?.payments || [];
  const billingSummary = summaryData?.summary || null;

  // Currency formatting helper
  const currencySymbols = { USD: '$', EGP: 'E£', EUR: '€', GBP: '£', SAR: 'SAR ', AED: 'AED ', TRY: '₺', KWD: 'KD ' };
  const billingCurrency = billingSummary?.currency || tenantData?.currency_code || 'USD';
  const cs = currencySymbols[billingCurrency] || `${billingCurrency} `;
  const formatCurrency = (amount) => `${cs}${parseFloat(amount || 0).toFixed(2)}`;



  // Map data to expected format
  const tenant = tenantData ? mapTenant(tenantData) : null;
  const tenantModules = (modulesData?.tenantModules || modulesData?.modules || []).map(mapModule);
  const tenantDomains = domainsData?.domains || [];
  const tenantUsers = tenantData?.tenant_users || [];
  const recentErrors = (errorsData?.errors || []).slice(0, 5).map(e => ({
    id: e.id,
    message: e.message || e.error_message,
    type: e.type || e.error_type,
    count: e.occurrences || e.occurrence_count || 1,
    lastSeen: e.last_seen || e.updated_at,
  }));

  // Handler to save settings (merges with existing settings)
  const handleSaveSettings = async (newSettings) => {
    try {
      const currentSettings = tenantData?.settings || {};
      await updateTenant(id, {
        settings: { ...currentSettings, ...newSettings }
      });
      // Refetch tenant data to get updated settings
      await refetchTenant();
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  // Handler to add a domain
  const handleAddDomain = async (domain) => {
    try {
      const result = await createDomain({
        tenant_id: id,
        domain: domain.toLowerCase().trim(),
        domain_type: 'custom',
      });
      // Refetch domains to update the UI
      refetchTenant();
      return result;
    } catch (error) {
      console.error('Failed to add domain:', error);
      throw error;
    }
  };

  // Handler to verify DNS for a domain
  const handleVerifyDns = async (domainId) => {
    setVerifyingDomainId(domainId);
    try {
      await verifyDns(domainId);
      refetchTenant();
    } catch (error) {
      console.error('Failed to verify DNS:', error);
    } finally {
      setVerifyingDomainId(null);
    }
  };

  // Handler to open integration modal
  const handleOpenIntegration = (integration) => {
    setSelectedIntegration(integration);
    setIntegrationModalOpen(true);
  };

  // Handler for Impersonate button
  const handleImpersonate = () => {
    // Navigate to support sessions with tenant pre-selected
    navigate(`/support?tenant=${id}&action=impersonate`);
  };

  // Handler for Edit button
  const handleOpenEdit = () => {
    setEditForm({
      displayName: tenant.displayName || '',
      ownerName: tenant.ownerName || '',
      ownerEmail: tenant.ownerEmail || '',
      ownerPhone: tenant.ownerPhone || '',
      subscriptionTier: tenant.subscriptionTier || 'starter',
      taxRate: tenant.settings?.tax_rate || '',
    });
    setEditModalOpen(true);
  };

  // Handler for saving tenant edits
  const handleSaveEdit = async () => {
    try {
      await updateTenant(id, {
        display_name: editForm.displayName,
        owner_name: editForm.ownerName,
        owner_email: editForm.ownerEmail,
        owner_phone: editForm.ownerPhone,
        subscription_tier: editForm.subscriptionTier,
        settings: {
          ...(tenant.settings || {}),
          tax_rate: editForm.taxRate ? parseFloat(editForm.taxRate) : 0,
        },
      });
      await refetchTenant();
      setEditModalOpen(false);
      setEditForm(null);
    } catch (error) {
      console.error('Failed to update tenant:', error);
    }
  };

  // Handler for Suspend/Activate
  const handleToggleStatus = async () => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    setStatusLoading(true);
    try {
      await updateTenant(id, { status: newStatus });
      await refetchTenant();
    } catch (error) {
      console.error('Failed to update tenant status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  // Billing handlers
  const handleGenerateInvoice = async () => {
    setBillingActionLoading('generate');
    try {
      const result = await generateInvoice(id);
      await refetchInvoices();
      await refetchSummary();
      // Auto-open the newly created invoice for editing
      if (result?.invoice) {
        setSelectedInvoice(result.invoice);
        setInvoiceModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      toast.error(error.message || 'Failed to generate invoice');
    } finally {
      setBillingActionLoading(null);
    }
  };

  const handleMarkAsPaid = async (invoiceId) => {
    setBillingActionLoading(invoiceId);
    try {
      await markAsPaid(invoiceId, { method: 'manual' });
      await refetchInvoices();
      await refetchPayments();
      await refetchSummary();
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
    } finally {
      setBillingActionLoading(null);
    }
  };

  const handleSendInvoice = async (invoiceId) => {
    setBillingActionLoading(invoiceId);
    try {
      await sendInvoice(invoiceId);
      await refetchInvoices();
    } catch (error) {
      console.error('Failed to send invoice:', error);
    } finally {
      setBillingActionLoading(null);
    }
  };

  const handleCancelInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to cancel this invoice?')) return;
    setBillingActionLoading(invoiceId);
    try {
      await cancelInvoice(invoiceId, 'Cancelled by admin');
      await refetchInvoices();
      await refetchSummary();
    } catch (error) {
      console.error('Failed to cancel invoice:', error);
    } finally {
      setBillingActionLoading(null);
    }
  };

  // Open invoice detail/edit modal
  const handleViewInvoice = async (invoice) => {
    try {
      // Fetch full invoice with items
      const result = await devApi.billing.getInvoice(invoice.id);
      setSelectedInvoice(result?.invoice || invoice);
    } catch {
      setSelectedInvoice(invoice);
    }
    setInvoiceModalOpen(true);
  };

  // Update invoice notes/due_date
  const handleUpdateInvoice = async (invoiceId, updates) => {
    try {
      await updateInvoice(invoiceId, updates);
      await refetchInvoices();
      // Refresh the selected invoice
      const updated = (invoicesData?.invoices || []).find(i => i.id === invoiceId);
      if (updated) setSelectedInvoice({ ...updated, ...updates });
    } catch (error) {
      console.error('Failed to update invoice:', error);
    }
  };

  // Add item to draft invoice
  const handleAddItem = async (invoiceId, item) => {
    try {
      await addInvoiceItem(invoiceId, item);
      await refetchInvoices();
      await refetchSummary();
      // Refresh modal data
      const refreshed = await devApi.billing.getInvoice(invoiceId);
      if (refreshed?.invoice) setSelectedInvoice(refreshed.invoice);
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  // Remove item from draft invoice
  const handleRemoveItem = async (itemId, invoiceId) => {
    try {
      await deleteInvoiceItem(itemId);
      await refetchInvoices();
      await refetchSummary();
      const refreshed = await devApi.billing.getInvoice(invoiceId);
      if (refreshed?.invoice) setSelectedInvoice(refreshed.invoice);
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  // Download invoice as printable HTML
  const handleDownloadInvoice = (invoice) => {
    const items = invoice.saas_invoice_items || [];
    const curr = currencySymbols[invoice.currency || billingCurrency] || `${invoice.currency || 'USD'} `;
    const fmtAmt = (v) => `${curr}${parseFloat(v || 0).toFixed(2)}`;
    
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .invoice-title { font-size: 28px; font-weight: bold; color: #10B981; }
  .invoice-number { font-size: 14px; color: #666; margin-top: 4px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
  .meta-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
  .meta-label { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 4px; }
  .meta-value { font-size: 14px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f3f4f6; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
  td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
  .total-row td { font-weight: bold; font-size: 16px; border-top: 2px solid #10B981; }
  .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  .status-paid { background: #d1fae5; color: #065f46; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .status-draft { background: #f3f4f6; color: #4b5563; }
  .status-overdue { background: #fee2e2; color: #991b1b; }
  .status-cancelled { background: #f3f4f6; color: #9ca3af; }
  .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <div>
    <div class="invoice-title">INVOICE</div>
    <div class="invoice-number">${invoice.invoice_number}</div>
  </div>
  <div style="text-align:right">
    <span class="status status-${invoice.status}">${invoice.status}</span>
  </div>
</div>
<div class="meta-grid">
  <div class="meta-box">
    <div class="meta-label">Bill To</div>
    <div class="meta-value">${tenant?.displayName || tenant?.name || 'Tenant'}</div>
    <div style="font-size:13px;color:#6b7280">${tenant?.ownerEmail || ''}</div>
  </div>
  <div class="meta-box">
    <div class="meta-label">Invoice Details</div>
    <div style="font-size:13px">
      <div><strong>Issue Date:</strong> ${invoice.issue_date || 'N/A'}</div>
      <div><strong>Due Date:</strong> ${invoice.due_date || 'N/A'}</div>
      <div><strong>Period:</strong> ${invoice.billing_period_start || ''} to ${invoice.billing_period_end || ''}</div>
      <div><strong>Currency:</strong> ${invoice.currency || 'USD'}</div>
    </div>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th>Type</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>
    ${items.map(item => `<tr>
      <td>${item.description}</td>
      <td>${item.item_type}</td>
      <td style="text-align:right">${item.quantity || 1}</td>
      <td style="text-align:right">${fmtAmt(item.unit_price)}</td>
      <td style="text-align:right">${fmtAmt(item.total)}</td>
    </tr>`).join('')}
    ${items.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#9ca3af">No line items</td></tr>' : ''}
    <tr class="total-row">
      <td colspan="4" style="text-align:right">Subtotal</td>
      <td style="text-align:right">${fmtAmt(invoice.subtotal)}</td>
    </tr>
    ${invoice.discount_amount > 0 ? `<tr><td colspan="4" style="text-align:right;color:#10B981">Discount</td><td style="text-align:right;color:#10B981">-${fmtAmt(invoice.discount_amount)}</td></tr>` : ''}
    ${invoice.tax_amount > 0 ? `<tr><td colspan="4" style="text-align:right">Tax/VAT</td><td style="text-align:right">+${fmtAmt(invoice.tax_amount)}</td></tr>` : ''}
    <tr class="total-row">
      <td colspan="4" style="text-align:right">Total</td>
      <td style="text-align:right">${fmtAmt(invoice.total)}</td>
    </tr>
  </tbody>
</table>
${invoice.notes ? `<div style="margin-top:20px;padding:12px;background:#f9fafb;border-radius:8px;font-size:13px"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
<div class="footer">Generated by Dento Platform</div>
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

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this draft invoice?')) return;
    setBillingActionLoading(invoiceId);
    try {
      await deleteInvoice(invoiceId);
      await refetchInvoices();
      await refetchSummary();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    } finally {
      setBillingActionLoading(null);
    }
  };

  // Handler for saving usage limits
  const handleSaveLimits = async () => {
    setLimitsLoading(true);
    try {
      await updateTenant(id, {
        max_users: parseInt(limitsForm.maxUsers) || 10,
        max_patients: parseInt(limitsForm.maxPatients) || 1000,
        max_storage_gb: parseInt(limitsForm.maxStorageGb) || 10,
      });
      await refetchTenant();
      setLimitsModalOpen(false);
      setLimitsForm(null);
    } catch (error) {
      console.error('Failed to update limits:', error);
    } finally {
      setLimitsLoading(false);
    }
  };

  const getInvoiceStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      paid: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
      cancelled: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
      refunded: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return colors[status] || colors.draft;
  };

  // Loading state
  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Error state
  if (tenantError || !tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 mb-4">{tenantError || 'Tenant not found'}</p>
        <button onClick={() => navigate('/tenants')} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">
          Back to Tenants
        </button>
      </div>
    );
  }

  const StatusIcon = statusConfig[tenant.status]?.icon || CheckCircle;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/tenants')}
            className="mt-1 rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white">
              {tenant.displayName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{tenant.displayName}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig[tenant.status]?.color}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusConfig[tenant.status]?.label}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm text-gray-400">
                <span>{tenant.slug}</span>
                <span>•</span>
                <span className="capitalize">{tenant.subscriptionTier}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {tenant.customDomain || tenant.subdomain}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleImpersonate}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Key className="h-4 w-4" />
            Impersonate
          </button>
          <button
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          {tenant.status === 'active' ? (
            <button
              onClick={handleToggleStatus}
              disabled={statusLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-600 bg-amber-600/20 px-3 py-2 text-sm font-medium text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-50"
            >
              {statusLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
              Suspend
            </button>
          ) : (
            <button
              onClick={handleToggleStatus}
              disabled={statusLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600/20 px-3 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
            >
              {statusLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Activate
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Stats */}
          <div className="col-span-2 space-y-6">
            {/* Usage Stats */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Usage & Limits</h3>
                <button
                  onClick={() => {
                    setLimitsForm({
                      maxUsers: tenant.maxUsers || 10,
                      maxPatients: tenant.maxPatients || 1000,
                      maxStorageGb: tenant.maxStorageGb || 10,
                    });
                    setLimitsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit Limits
                </button>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {/* Users */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Users</span>
                    <span className="text-sm font-medium text-white">
                      {tenant.currentUsers} / {tenant.maxUsers}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-700">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${(tenant.currentUsers / tenant.maxUsers) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Patients */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Patients</span>
                    <span className="text-sm font-medium text-white">
                      {tenant.currentPatients.toLocaleString()} / {tenant.maxPatients.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-700">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(tenant.currentPatients / tenant.maxPatients) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Storage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Storage</span>
                    <span className="text-sm font-medium text-white">
                      {formatBytes(tenant.currentStorageBytes)} / {tenant.maxStorageGb} GB
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-700">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${(tenant.currentStorageBytes / (tenant.maxStorageGb * 1024 * 1024 * 1024)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Package className="h-5 w-5" />
                  <span className="text-sm">Modules</span>
                </div>
                <p className="text-2xl font-bold text-white">{tenantModules.length}</p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">Errors (24h)</span>
                </div>
                <p className={`text-2xl font-bold ${tenant.errorsLast24h > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {tenant.errorsLast24h}
                </p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Server className="h-5 w-5" />
                  <span className="text-sm">API Calls (24h)</span>
                </div>
                <p className="text-2xl font-bold text-white">{tenant.apiCallsLast24h.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <RefreshCw className="h-5 w-5" />
                  <span className="text-sm">Version</span>
                </div>
                <p className="text-2xl font-bold text-white">v{tenant.currentVersion}</p>
              </div>
            </div>

            {/* Recent Errors */}
            {recentErrors.length > 0 && (
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Recent Errors</h3>
                  <Link to={`/monitoring/errors?tenant=${tenant.id}`} className="text-sm text-emerald-400 hover:underline">
                    View all
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentErrors.map((error) => (
                    <div key={error.id} className="flex items-center justify-between rounded-lg bg-gray-700/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-red-500/20 p-2">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{error.message}</p>
                          <p className="text-xs text-gray-500">{error.type} • {error.count} occurrences</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{formatTime(error.lastSeen)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Modules Preview */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Active Modules</h3>
                <button
                  onClick={() => setActiveTab('modules')}
                  className="text-sm text-emerald-400 hover:underline"
                >
                  Manage modules
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tenantModules.slice(0, 6).map((module) => (
                  <span
                    key={module.id}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                      module.status === 'trial'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    {module.name}
                    {module.status === 'trial' && (
                      <span className="text-xs text-blue-300">(trial)</span>
                    )}
                  </span>
                ))}
                {tenantModules.length > 6 && (
                  <span className="inline-flex items-center rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-gray-400">
                    +{tenantModules.length - 6} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Info & Activity */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Owner</p>
                  <p className="text-sm text-white">{tenant.ownerName}</p>
                  <p className="text-sm text-gray-400">{tenant.ownerEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                  <p className="text-sm text-white">{tenant.ownerPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Address</p>
                  <p className="text-sm text-white">{tenant.addressLine1}</p>
                  <p className="text-sm text-gray-400">{tenant.city}, {tenant.countryCode}</p>
                </div>
              </div>
            </div>

            {/* Subscription Info */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Subscription</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Plan</span>
                  <span className="text-sm font-medium text-emerald-400 capitalize">{tenant.subscriptionTier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Monthly</span>
                  <span className="text-sm font-medium text-white">${tenant.monthlyPrice}/mo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Next Billing</span>
                  <span className="text-sm text-white">{formatDate(tenant.nextBillingDate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Started</span>
                  <span className="text-sm text-white">{formatDate(tenant.subscriptionStartedAt)}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[].map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.user} • {formatTime(activity.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Domain Status */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Domain Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-white">{tenant.subdomain}</span>
                  </div>
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                {tenant.customDomain && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-white">{tenant.customDomain}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {tenant.domainVerified ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                      )}
                      <ShieldCheck className={`h-5 w-5 ${tenant.sslStatus === 'active' ? 'text-emerald-400' : 'text-amber-400'}`} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              Module Licenses ({tenantModules.length})
            </h3>
            <Link
              to={`/tenants/${tenant.id}/modules`}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Manage Modules
            </Link>
          </div>
          {tenantModules.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-500 mb-3" />
              <p className="text-gray-400">No modules activated yet</p>
              <Link
                to={`/tenants/${tenant.id}/modules`}
                className="inline-flex items-center gap-2 mt-4 text-sm text-emerald-400 hover:underline"
              >
                Activate modules
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {tenantModules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-700/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${module.isCore ? 'bg-gray-600' : 'bg-emerald-500/20'}`}>
                      <Package className={`h-5 w-5 ${module.isCore ? 'text-gray-400' : 'text-emerald-400'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-white">{module.name || 'Unknown Module'}</p>
                      <p className="text-xs text-gray-500">
                        {module.isCore ? 'Core Module' : 'Add-on'}
                        {module.status === 'trial' && ` • Trial ends ${formatDate(module.trialEndsAt)}`}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    module.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {module.status === 'active' ? 'Active' : 'Trial'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Tenant Users</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {tenant.currentUsers} of {tenant.maxUsers} users
              </span>
              <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
                <Users className="h-4 w-4" />
                Invite User
              </button>
            </div>
          </div>
          {tenantUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No users found</p>
              <p className="text-sm text-gray-500">Users will appear here once they join this tenant</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tenantUsers.map((user, index) => (
                <div key={user.id || index} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-medium">
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name || user.full_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      user.role === 'dentist' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.role || 'member'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {user.last_login_at ? formatDate(user.last_login_at) : 'Never logged in'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Billing Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-gray-400">Total Invoiced</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(billingSummary?.totalInvoiced)}</p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-gray-400">Total Paid</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(billingSummary?.totalPaid)}</p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <span className="text-sm text-gray-400">Pending</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{formatCurrency(billingSummary?.totalPending)}</p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span className="text-sm text-gray-400">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(billingSummary?.totalOverdue)}</p>
            </div>
          </div>

          {/* Current Subscription */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Current Subscription</h3>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-400 mb-1">Plan</p>
                <p className="text-xl font-bold text-white capitalize">{tenant.subscriptionTier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig[tenant.subscriptionStatus || tenant.status]?.color || 'bg-gray-500/20 text-gray-400'}`}>
                  {tenant.subscriptionStatus || tenant.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Monthly Price</p>
                <p className="text-xl font-bold text-white">{formatCurrency(tenant.monthlyPrice)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Next Billing Date</p>
                <p className="text-white">{tenant.nextBillingDate ? formatDate(tenant.nextBillingDate) : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Invoices */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Invoices</h3>
              <button
                onClick={handleGenerateInvoice}
                disabled={billingActionLoading === 'generate'}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {billingActionLoading === 'generate' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Generate Invoice
              </button>
            </div>
            
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No invoices yet</p>
                <p className="text-sm text-gray-500">Generate an invoice to start billing this tenant</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-gray-600/50">
                        <FileText className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-400">
                          {invoice.billing_period_start && invoice.billing_period_end
                            ? `${formatDate(invoice.billing_period_start)} - ${formatDate(invoice.billing_period_end)}`
                            : formatDate(invoice.issue_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{formatCurrency(invoice.total)}</p>
                        <p className="text-xs text-gray-500">Due: {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getInvoiceStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                      <div className="flex items-center gap-1">
                        {/* Edit (draft) or View (other) button */}
                        <button
                          onClick={() => handleViewInvoice(invoice)}
                          title={invoice.status === 'draft' ? 'Edit Invoice' : 'View Invoice'}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-600/50 rounded-lg transition-colors"
                        >
                          {invoice.status === 'draft' ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        {invoice.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleSendInvoice(invoice.id)}
                              disabled={billingActionLoading === invoice.id}
                              title="Send Invoice"
                              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-600/50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {billingActionLoading === invoice.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              disabled={billingActionLoading === invoice.id}
                              title="Delete Draft"
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600/50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {invoice.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              disabled={billingActionLoading === invoice.id}
                              title="Mark as Paid"
                              className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-gray-600/50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {billingActionLoading === invoice.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleCancelInvoice(invoice.id)}
                              disabled={billingActionLoading === invoice.id}
                              title="Cancel Invoice"
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600/50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {invoice.status === 'overdue' && (
                          <button
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            disabled={billingActionLoading === invoice.id}
                            title="Mark as Paid"
                            className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-gray-600/50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {billingActionLoading === invoice.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          title="Download Invoice"
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-600/50 rounded-lg transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Payments</h3>
              <button
                onClick={() => {
                  setPaymentForm({ amount: '', payment_method: 'bank_transfer', payment_reference: '', notes: '' });
                  setRecordPaymentOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </button>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-6">
                <CreditCard className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No payments recorded</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${payment.status === 'completed' ? 'bg-emerald-500/20' : 'bg-gray-600/50'}`}>
                        <CreditCard className={`h-4 w-4 ${payment.status === 'completed' ? 'text-emerald-400' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="text-white text-sm">{payment.payment_method || 'Manual'}</p>
                        <p className="text-xs text-gray-500">{formatDate(payment.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${payment.status === 'completed' ? 'text-emerald-400' : 'text-gray-400'}`}>
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        payment.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        payment.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Record Payment Modal */}
          {recordPaymentOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Record Payment</h3>
                  <button onClick={() => setRecordPaymentOpen(false)} className="text-gray-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Amount ({billingCurrency})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Payment Method</label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="stripe">Stripe</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="wire">Wire Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Reference / Transaction ID</label>
                    <input
                      type="text"
                      value={paymentForm.payment_reference}
                      onChange={(e) => setPaymentForm(f => ({ ...f, payment_reference: e.target.value }))}
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="e.g. TXN-12345"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none resize-none"
                      placeholder="Any additional notes..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setRecordPaymentOpen(false)}
                    className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
                        toast.warning('Please enter a valid amount');
                        return;
                      }
                      try {
                        await recordPayment({
                          tenant_id: id,
                          amount: parseFloat(paymentForm.amount),
                          currency: billingCurrency,
                          payment_method: paymentForm.payment_method,
                          payment_reference: paymentForm.payment_reference || null,
                          notes: paymentForm.notes || null,
                          status: 'completed',
                        });
                        await refetchPayments();
                        await refetchSummary();
                        setRecordPaymentOpen(false);
                      } catch (error) {
                        console.error('Failed to record payment:', error);
                        toast.error('Failed to record payment');
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors"
                  >
                    Record Payment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Usage Limits */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Usage Limits</h3>
              <button
                onClick={() => {
                  setLimitsForm({
                    maxUsers: tenant.maxUsers || 10,
                    maxPatients: tenant.maxPatients || 1000,
                    maxStorageGb: tenant.maxStorageGb || 10,
                  });
                  setLimitsModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Users</span>
                  <span className="text-white">{tenant.currentUsers} / {tenant.maxUsers}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((tenant.currentUsers / tenant.maxUsers) * 100, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Patients</span>
                  <span className="text-white">{tenant.currentPatients.toLocaleString()} / {tenant.maxPatients.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((tenant.currentPatients / tenant.maxPatients) * 100, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Storage</span>
                  <span className="text-white">{formatBytes(tenant.currentStorageBytes)} / {tenant.maxStorageGb} GB</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((tenant.currentStorageBytes / (tenant.maxStorageGb * 1024 * 1024 * 1024)) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Detail / Edit Modal */}
          {invoiceModalOpen && selectedInvoice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
                {/* Modal Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-gray-900 p-5">
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedInvoice.invoice_number}</h3>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getInvoiceStatusColor(selectedInvoice.status)}`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadInvoice(selectedInvoice)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                    <button onClick={() => { setInvoiceModalOpen(false); setSelectedInvoice(null); setNewItemForm(null); }} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Invoice Meta */}
                <div className="grid grid-cols-2 gap-4 p-5 border-b border-gray-800">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Issue Date</p>
                    <p className="text-sm text-white">{selectedInvoice.issue_date || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Due Date</p>
                    {selectedInvoice.status === 'draft' ? (
                      <input
                        type="date"
                        defaultValue={selectedInvoice.due_date || ''}
                        onBlur={(e) => {
                          if (e.target.value !== selectedInvoice.due_date) {
                            handleUpdateInvoice(selectedInvoice.id, { due_date: e.target.value });
                          }
                        }}
                        className="rounded bg-gray-800 border border-gray-600 px-2 py-1 text-sm text-white"
                      />
                    ) : (
                      <p className="text-sm text-white">{selectedInvoice.due_date || 'N/A'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Period</p>
                    <p className="text-sm text-white">
                      {selectedInvoice.billing_period_start && selectedInvoice.billing_period_end
                        ? `${formatDate(selectedInvoice.billing_period_start)} – ${formatDate(selectedInvoice.billing_period_end)}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Currency</p>
                    <p className="text-sm text-white">{selectedInvoice.currency || 'USD'}</p>
                  </div>
                </div>

                {/* Line Items */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-300 uppercase">Line Items</h4>
                    {selectedInvoice.status === 'draft' && (
                      <button
                        onClick={() => setNewItemForm({ description: '', item_type: 'custom', quantity: 1, unit_price: 0 })}
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        <Plus className="h-3 w-3" /> Add Item
                      </button>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-xs uppercase text-gray-500">
                        <th className="py-2 text-left">Description</th>
                        <th className="py-2 text-left">Type</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2 text-right">Unit Price</th>
                        <th className="py-2 text-right">Total</th>
                        {selectedInvoice.status === 'draft' && <th className="py-2 w-8"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedInvoice.saas_invoice_items || []).map((item) => (
                        <tr key={item.id} className="border-b border-gray-800">
                          <td className="py-3 text-white">{item.description}</td>
                          <td className="py-3 text-gray-400">{item.item_type}</td>
                          <td className="py-3 text-right text-white">{item.quantity || 1}</td>
                          <td className="py-3 text-right text-white">{formatCurrency(item.unit_price)}</td>
                          <td className="py-3 text-right text-white font-medium">{formatCurrency(item.total)}</td>
                          {selectedInvoice.status === 'draft' && (
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleRemoveItem(item.id, selectedInvoice.id)}
                                className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                                title="Remove Item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {(selectedInvoice.saas_invoice_items || []).length === 0 && (
                        <tr>
                          <td colSpan={selectedInvoice.status === 'draft' ? 6 : 5} className="py-6 text-center text-gray-500">No line items</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Add New Item Form */}
                  {newItemForm && selectedInvoice.status === 'draft' && (
                    <div className="mt-3 rounded-lg border border-gray-700 bg-gray-800/50 p-3 space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Description"
                            value={newItemForm.description}
                            onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                            className="w-full rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-sm text-white placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={newItemForm.quantity}
                            onChange={(e) => setNewItemForm({ ...newItemForm, quantity: parseInt(e.target.value) || 1 })}
                            className="w-full rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-sm text-white"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Unit Price"
                            value={newItemForm.unit_price}
                            onChange={(e) => setNewItemForm({ ...newItemForm, unit_price: parseFloat(e.target.value) || 0 })}
                            className="w-full rounded bg-gray-700 border border-gray-600 px-2 py-1.5 text-sm text-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setNewItemForm(null)}
                          className="px-3 py-1 text-xs text-gray-400 hover:text-white rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (!newItemForm.description) return;
                            await handleAddItem(selectedInvoice.id, {
                              description: newItemForm.description,
                              item_type: newItemForm.item_type || 'custom',
                              quantity: newItemForm.quantity || 1,
                              unit_price: newItemForm.unit_price || 0,
                            });
                            setNewItemForm(null);
                          }}
                          disabled={!newItemForm.description}
                          className="px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded disabled:opacity-50 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Totals with Tax/Discount breakdown */}
                  <div className="mt-4 flex justify-end border-t border-gray-700 pt-3">
                    <div className="text-right space-y-1 w-full max-w-xs">
                      <div className="flex justify-between gap-8">
                        <p className="text-xs text-gray-500 uppercase">Subtotal</p>
                        <p className="text-sm text-gray-300">{formatCurrency(selectedInvoice.subtotal)}</p>
                      </div>

                      {/* Editable Discount for draft invoices */}
                      {selectedInvoice.status === 'draft' ? (
                        <div className="flex justify-between items-center gap-4">
                          <p className="text-xs text-gray-500 uppercase">Discount</p>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-emerald-400">-</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={selectedInvoice.discount_amount || 0}
                              onBlur={async (e) => {
                                const newDiscount = parseFloat(e.target.value) || 0;
                                if (newDiscount !== (selectedInvoice.discount_amount || 0)) {
                                  const newTotal = Math.max((selectedInvoice.subtotal || 0) - newDiscount + (selectedInvoice.tax_amount || 0), 0);
                                  try {
                                    await updateInvoice(selectedInvoice.id, { 
                                      discount_amount: newDiscount,
                                      total: Math.round(newTotal * 100) / 100,
                                    });
                                    await refetchInvoices();
                                    await refetchSummary();
                                    const refreshed = await devApi.billing.getInvoice(selectedInvoice.id);
                                    if (refreshed?.invoice) setSelectedInvoice(refreshed.invoice);
                                  } catch (error) {
                                    console.error('Failed to update discount:', error);
                                  }
                                }
                              }}
                              className="w-24 text-right rounded bg-gray-800 border border-gray-600 px-2 py-0.5 text-sm text-emerald-400 focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : selectedInvoice.discount_amount > 0 ? (
                        <div className="flex justify-between gap-8">
                          <p className="text-xs text-gray-500 uppercase">Discount</p>
                          <p className="text-sm text-emerald-400">-{formatCurrency(selectedInvoice.discount_amount)}</p>
                        </div>
                      ) : null}

                      {selectedInvoice.tax_amount > 0 && (
                        <div className="flex justify-between gap-8">
                          <p className="text-xs text-gray-500 uppercase">Tax/VAT</p>
                          <p className="text-sm text-gray-300">+{formatCurrency(selectedInvoice.tax_amount)}</p>
                        </div>
                      )}
                      <div className="flex justify-between gap-8 border-t border-gray-600 pt-1">
                        <p className="text-xs text-gray-500 uppercase">Total</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(selectedInvoice.total)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes (editable for draft) */}
                <div className="px-5 pb-5">
                  <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
                  {selectedInvoice.status === 'draft' ? (
                    <textarea
                      defaultValue={selectedInvoice.notes || ''}
                      placeholder="Add notes..."
                      rows={2}
                      onBlur={(e) => {
                        if (e.target.value !== (selectedInvoice.notes || '')) {
                          handleUpdateInvoice(selectedInvoice.id, { notes: e.target.value });
                        }
                      }}
                      className="w-full rounded bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-white placeholder-gray-500 resize-none"
                    />
                  ) : (
                    <p className="text-sm text-gray-400">{selectedInvoice.notes || 'None'}</p>
                  )}
                </div>

                {/* Modal Actions */}
                {selectedInvoice.status === 'draft' && (
                  <div className="border-t border-gray-700 p-5 flex justify-end gap-3">
                    <button
                      onClick={async () => {
                        await handleSendInvoice(selectedInvoice.id);
                        setInvoiceModalOpen(false);
                        setSelectedInvoice(null);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                    >
                      <Send className="h-4 w-4" /> Send Invoice
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {activeTab === 'channels' && (
        <div className="space-y-6">
          {/* Website Domain Configuration */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/20 p-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Website & Domain</h3>
                  <p className="text-sm text-gray-400">Configure web presence and custom domains</p>
                </div>
              </div>
              <button 
                onClick={() => setDomainModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Domain
              </button>
            </div>
            
            {/* Default Subdomain */}
            <div className="mb-4 p-4 rounded-lg bg-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Default Subdomain</p>
                    <p className="text-white font-medium">{tenant.slug}.dento.app</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={`https://${tenant.slug}.dento.app`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Domains */}
            {tenantDomains.length > 0 && (
              <div className="space-y-3">
                {tenantDomains.map((domain) => (
                  <div key={domain.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50">
                    <div>
                      <p className="text-white font-medium">{domain.domain}</p>
                      <p className="text-xs text-gray-500 mt-1">Added {formatDate(domain.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Verify DNS button for unverified domains */}
                      {!domain.dns_verified && (
                        <button
                          onClick={() => handleVerifyDns(domain.id)}
                          disabled={verifyingDomainId === domain.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30 text-xs font-medium hover:bg-amber-600/30 transition-colors disabled:opacity-50"
                        >
                          {verifyingDomainId === domain.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Verify DNS
                        </button>
                      )}
                      <a 
                        href={`https://${domain.domain}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        domain.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        domain.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {domain.status === 'active' && <CheckCircle className="h-3.5 w-3.5" />}
                        {domain.status === 'pending' && <Clock className="h-3.5 w-3.5" />}
                        {domain.status}
                      </span>
                      {domain.ssl_status && (
                        <span className={`inline-flex items-center gap-1 text-xs ${
                          domain.ssl_status === 'active' ? 'text-emerald-400' : 'text-gray-500'
                        }`}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          SSL
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Configuration */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/20 p-2">
                  <Mail className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Email</h3>
                  <p className="text-sm text-gray-400">Configure email sending and notifications</p>
                </div>
              </div>
              <button 
                onClick={() => setEmailModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Configure
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gray-700/50">
                <p className="text-sm text-gray-400 mb-1">Sender Email</p>
                <p className="text-white">{tenantData?.settings?.email_sender || `noreply@${tenant.slug}.dento.app`}</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-700/50">
                <p className="text-sm text-gray-400 mb-1">Email Provider</p>
                <p className="text-white">{tenantData?.settings?.email_provider || 'Default (Resend)'}</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-700/50">
                <p className="text-sm text-gray-400 mb-1">Reply-To Address</p>
                <p className="text-white">{tenantData?.settings?.email_reply_to || tenant.ownerEmail || '-'}</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-700/50">
                <p className="text-sm text-gray-400 mb-1">Custom Domain</p>
                <p className="text-white">{tenantData?.settings?.email_domain || 'Not configured'}</p>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg border border-dashed border-gray-700">
              <h4 className="text-sm font-medium text-white mb-2">Email Notifications</h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Appointment Reminders', key: 'appointment_reminders', default: true },
                  { label: 'New Patient Welcome', key: 'new_patient', default: true },
                  { label: 'Treatment Confirmations', key: 'treatment_confirm', default: true },
                  { label: 'Invoice & Receipts', key: 'billing', default: true },
                  { label: 'Recall Reminders', key: 'recall', default: false },
                  { label: 'Marketing Campaigns', key: 'marketing', default: false },
                ].map(notif => (
                  <div key={notif.key} className="flex items-center justify-between p-2 rounded bg-gray-800">
                    <span className="text-sm text-gray-300">{notif.label}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      tenantData?.settings?.notifications?.[notif.key] ?? notif.default 
                        ? 'bg-emerald-400' : 'bg-gray-600'
                    }`} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* WhatsApp Configuration */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/20 p-2">
                  <MessageCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">WhatsApp Business</h3>
                  <p className="text-sm text-gray-400">Integrate WhatsApp for patient communication</p>
                </div>
              </div>
              {tenantData?.settings?.whatsapp_enabled ? (
                <button 
                  onClick={() => setWhatsappModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium hover:bg-emerald-500/30 transition-colors cursor-pointer"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Connected
                </button>
              ) : (
                <button 
                  onClick={() => setWhatsappModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Connect WhatsApp
                </button>
              )}
            </div>
            
            {tenantData?.settings?.whatsapp_enabled ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-gray-700/50">
                  <p className="text-sm text-gray-400 mb-1">Phone Number</p>
                  <p className="text-white">{tenantData?.settings?.whatsapp_phone || '-'}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-700/50">
                  <p className="text-sm text-gray-400 mb-1">Business Account ID</p>
                  <p className="text-white font-mono text-sm">{tenantData?.settings?.whatsapp_business_id || '-'}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-700/50">
                  <p className="text-sm text-gray-400 mb-1">API Status</p>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Active
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-gray-700/50">
                  <p className="text-sm text-gray-400 mb-1">Messages (30d)</p>
                  <p className="text-white">{tenantData?.settings?.whatsapp_messages_30d || '0'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
                <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">WhatsApp not connected</p>
                <p className="text-sm text-gray-500 mb-4">Connect WhatsApp Business to send appointment reminders and communicate with patients</p>
                <button 
                  onClick={() => setWhatsappModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Connect WhatsApp Business
                </button>
              </div>
            )}

            {tenantData?.settings?.whatsapp_enabled && (
              <div className="mt-4 p-4 rounded-lg border border-dashed border-gray-700">
                <h4 className="text-sm font-medium text-white mb-2">WhatsApp Message Templates</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Appointment Reminder', status: 'approved' },
                    { label: 'Appointment Confirmation', status: 'approved' },
                    { label: 'Recall Reminder', status: 'pending' },
                    { label: 'Treatment Follow-up', status: 'approved' },
                  ].map((template, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-gray-800">
                      <span className="text-sm text-gray-300">{template.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        template.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {template.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile App Configuration */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-500/20 p-2">
                  <Smartphone className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Mobile App</h3>
                  <p className="text-sm text-gray-400">Patient mobile app configuration</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 text-xs font-medium">
                <Clock className="h-3.5 w-3.5" />
                Coming Soon
              </span>
            </div>
            
            <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
              <Smartphone className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">Mobile App Coming Soon</p>
              <p className="text-sm text-gray-500 mb-4">Patient mobile app with appointment booking, treatment history, and push notifications</p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-gray-600" />
                  iOS App
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-gray-600" />
                  Android App
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-gray-600" />
                  Push Notifications
                </span>
              </div>
            </div>

            {/* Future Mobile Config UI - shown when enabled */}
            {tenantData?.settings?.mobile_app_enabled && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg bg-gray-700/50">
                  <p className="text-sm text-gray-400 mb-1">App Bundle ID (iOS)</p>
                  <p className="text-white font-mono text-sm">{tenantData?.settings?.ios_bundle_id || `app.dento.${tenant.slug}`}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-700/50">
                  <p className="text-sm text-gray-400 mb-1">Package Name (Android)</p>
                  <p className="text-white font-mono text-sm">{tenantData?.settings?.android_package || `app.dento.${tenant.slug}`}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-700/50">
                  <p className="text-sm text-gray-400 mb-1">Push Notifications</p>
                  <span className={`inline-flex items-center gap-1.5 text-sm ${
                    tenantData?.settings?.push_enabled ? 'text-emerald-400' : 'text-gray-500'
                  }`}>
                    {tenantData?.settings?.push_enabled ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    {tenantData?.settings?.push_enabled ? 'Enabled' : 'Not configured'}
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-gray-700/50">
                  <p className="text-sm text-gray-400 mb-1">Active Installs</p>
                  <p className="text-white">{tenantData?.settings?.mobile_installs || '0'}</p>
                </div>
              </div>
            )}
          </div>

          {/* API & Integrations */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-500/20 p-2">
                  <Key className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">API & Integrations</h3>
                  <p className="text-sm text-gray-400">Third-party integrations and API access</p>
                </div>
              </div>
              <button 
                onClick={() => setApiKeysModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <Key className="h-4 w-4" />
                Manage API Keys
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: 'Stripe', icon: CreditCard, status: tenantData?.stripe_customer_id ? 'connected' : 'not_connected', color: 'purple' },
                { name: 'Google Calendar', icon: Clock, status: tenantData?.settings?.google_calendar ? 'connected' : 'not_connected', color: 'blue' },
                { name: 'Twilio SMS', icon: MessageCircle, status: tenantData?.settings?.twilio_enabled ? 'connected' : 'not_connected', color: 'red' },
              ].map((integration) => (
                <button 
                  key={integration.name} 
                  onClick={() => handleOpenIntegration(integration)}
                  className="p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <integration.icon className={`h-5 w-5 text-${integration.color}-400`} />
                      <span className="text-white font-medium">{integration.name}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs ${
                    integration.status === 'connected' 
                      ? 'text-emerald-400' 
                      : 'text-gray-500'
                  }`}>
                    {integration.status === 'connected' ? (
                      <><CheckCircle className="h-3.5 w-3.5" /> Connected</>
                    ) : (
                      <><Clock className="h-3.5 w-3.5" /> Not connected</>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">General Settings</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Timezone</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white">{tenant.timezone}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Currency</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white">{tenant.currencyCode}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Locale</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white">{tenant.locale}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Primary Color</label>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg border border-gray-600" style={{ backgroundColor: tenant.primaryColor }} />
                  <span className="text-white">{tenant.primaryColor}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Contact Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Owner Name</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white">{tenant.ownerName || '-'}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Owner Email</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white">{tenant.ownerEmail || '-'}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Phone</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white">{tenant.ownerPhone || '-'}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Billing Email</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white">{tenant.billingEmail || '-'}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Technical Details</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tenant ID</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white font-mono text-sm">{tenant.id}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Slug</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white">{tenant.slug}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Created</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white">{formatDate(tenant.createdAt)}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Current Version</label>
                <div className="rounded-lg bg-gray-700/50 px-3 py-2 text-white">v{tenant.currentVersion}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-400 mb-4">These actions are irreversible. Please be careful.</p>
            <div className="flex gap-3">
              <button className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors">
                <Pause className="h-4 w-4" />
                Suspend Tenant
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors">
                <Trash2 className="h-4 w-4" />
                Delete Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Configuration Modals */}
      <EmailConfigModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        tenant={tenant}
        settings={tenantData?.settings}
        onSave={handleSaveSettings}
      />
      
      <WhatsAppConfigModal
        isOpen={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        tenant={tenant}
        settings={tenantData?.settings}
        onSave={handleSaveSettings}
      />
      
      <DomainConfigModal
        isOpen={domainModalOpen}
        onClose={() => setDomainModalOpen(false)}
        tenant={tenant}
        onSave={handleSaveSettings}
        onAddDomain={handleAddDomain}
      />
      
      <ApiKeysModal
        isOpen={apiKeysModalOpen}
        onClose={() => setApiKeysModalOpen(false)}
        tenant={tenant}
        apiKeys={[]}
        onCreateKey={async (keyData) => {
          try {
            await apiKeysApi.create({ ...keyData, tenant_id: tenant.id });
            toast.success('API key created successfully');
          } catch (err) {
            toast.error(`Failed to create API key: ${err.message}`);
          }
        }}
        onRevokeKey={async (keyId) => {
          try {
            await apiKeysApi.revoke(keyId);
            toast.success('API key revoked');
          } catch (err) {
            toast.error(`Failed to revoke API key: ${err.message}`);
          }
        }}
      />
      
      <IntegrationModal
        isOpen={integrationModalOpen}
        onClose={() => {
          setIntegrationModalOpen(false);
          setSelectedIntegration(null);
        }}
        integration={selectedIntegration}
        tenant={tenant}
        settings={tenantData?.settings}
        onSave={handleSaveSettings}
      />

      {/* Edit Tenant Modal */}
      {editModalOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Tenant</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={editForm.ownerName}
                  onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Owner Email</label>
                <input
                  type="email"
                  value={editForm.ownerEmail}
                  onChange={(e) => setEditForm({ ...editForm, ownerEmail: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Owner Phone</label>
                <input
                  type="text"
                  value={editForm.ownerPhone}
                  onChange={(e) => setEditForm({ ...editForm, ownerPhone: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subscription Tier</label>
                <select
                  value={editForm.subscriptionTier}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionTier: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="trial">Trial</option>
                  <option value="starter">Starter</option>
                  <option value="basic">Basic</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tax/VAT Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editForm.taxRate}
                  onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Applied automatically when generating invoices</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setEditForm(null);
                }}
                className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Limits Modal */}
      {limitsModalOpen && limitsForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Usage Limits</h2>
            <p className="text-sm text-gray-400 mb-6">Set the maximum allowed resources for this tenant.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Users</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={limitsForm.maxUsers}
                  onChange={(e) => setLimitsForm({ ...limitsForm, maxUsers: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Current: {tenant.currentUsers} users</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Patients</label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={limitsForm.maxPatients}
                  onChange={(e) => setLimitsForm({ ...limitsForm, maxPatients: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Current: {tenant.currentPatients.toLocaleString()} patients</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Max Storage (GB)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={limitsForm.maxStorageGb}
                  onChange={(e) => setLimitsForm({ ...limitsForm, maxStorageGb: e.target.value })}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Current: {formatBytes(tenant.currentStorageBytes)} used</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setLimitsModalOpen(false);
                  setLimitsForm(null);
                }}
                disabled={limitsLoading}
                className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLimits}
                disabled={limitsLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {limitsLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                Save Limits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
