// Developer Portal API Service
// Centralized API layer for all Developer Portal data fetching

import { supabase } from '../../lib/supabase';
import { getExchangeRates, convertFromUSD } from '../../utils/currencyConverter';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// NOTE: Service role key should NEVER be in client code - removed for security

// Singleton lock for session refresh to prevent race conditions
// When multiple API calls get 401 simultaneously, only one refresh happens
let refreshPromise = null;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 5000; // Don't refresh again within 5 seconds

const refreshSessionSingleton = async () => {
  // If we just refreshed recently, just get the current session
  if (Date.now() - lastRefreshTime < REFRESH_COOLDOWN) {
    const { data } = await supabase.auth.getSession();
    if (data?.session) return data.session;
  }
  
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }
  
  // Start a new refresh
  refreshPromise = supabase.auth.refreshSession()
    .then(({ data, error }) => {
      refreshPromise = null; // Clear the lock
      if (error) {
        console.error('Refresh error:', error.message, error);
        throw new Error('Session refresh failed: ' + error.message);
      }
      if (!data?.session) {
        console.error('Refresh returned no session');
        throw new Error('Session refresh failed: no session returned');
      }
      lastRefreshTime = Date.now();
      return data.session;
    })
    .catch(err => {
      refreshPromise = null; // Clear the lock on error too
      console.error('Refresh catch:', err);
      throw err;
    });
  
  return refreshPromise;
};

// Generic Edge Function caller with automatic retry on 401
// Using direct fetch for all methods for better control
const callEdgeFunction = async (functionName, method = 'GET', body = null, params = {}, retried = false) => {
  // If retrying, refresh session first
  if (retried) {
    try {
      await refreshSessionSingleton();
    } catch (refreshErr) {
      console.error('Session refresh failed:', refreshErr);
      await supabase.auth.signOut();
      window.location.href = '/developer/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  // Get auth token
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  
  if (!token) {
    throw new Error('Not authenticated. Please log in to access the Developer Portal.');
  }

  // Build URL with query params for GET
  // Build URL with query params (always append, not just GET)
  const url = new URL(`${SUPABASE_URL}/functions/v1/${functionName}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.append(key, value);
    }
  });

  // Make the request
  const fetchOptions = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), fetchOptions);

  if (response.status === 401 && !retried) {
    let errorBody = '';
    try {
      errorBody = await response.clone().text();
    } catch (_) {
      // Ignore error body parse failure
    }
    console.warn('Got 401, response:', errorBody, 'Retrying...');
    return callEdgeFunction(functionName, method, body, params, true);
  }

  if (response.status === 401 && retried) {
    console.error('401 after refresh - signing out');
    await supabase.auth.signOut();
    window.location.href = '/developer/login';
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();
  if (!response.ok) {
    console.error('Edge function error response:', response.status, data);
    throw new Error(data.error || `API Error: ${response.status}`);
  }
  return data;
};

// ============================================
// TENANT MANAGEMENT
// ============================================

export const tenantApi = {
  // List all tenants with filters
  list: async (filters = {}) => {
    return callEdgeFunction('tenant-management', 'GET', null, filters);
  },

  // Get single tenant by ID
  get: async (id) => {
    return callEdgeFunction('tenant-management', 'GET', null, { id });
  },

  // Create new tenant
  create: async (tenantData) => {
    return callEdgeFunction('tenant-management', 'POST', tenantData);
  },

  // Update tenant
  update: async (id, updates) => {
    return callEdgeFunction('tenant-management', 'PUT', { id, ...updates });
  },

  // Delete/deactivate tenant
  delete: async (id) => {
    return callEdgeFunction('tenant-management', 'DELETE', { id, action: 'delete' });
  },

  // Get tenant stats
  getStats: async () => {
    return callEdgeFunction('tenant-management', 'GET', null, { stats: 'true' });
  },
};

// ============================================
// MODULE MANAGEMENT
// ============================================

export const moduleApi = {
  // List all modules
  list: async () => {
    return callEdgeFunction('tenant-modules', 'GET');
  },

  // Get modules for specific tenant
  getForTenant: async (tenantId) => {
    return callEdgeFunction('tenant-modules', 'GET', null, { tenant_id: tenantId });
  },

  // Activate module for tenant
  activate: async (tenantId, moduleId, trialDays = null) => {
    return callEdgeFunction('tenant-modules', 'POST', {
      tenant_id: tenantId,
      module_id: moduleId,
      trial_days: trialDays,
    });
  },

  // Update tenant module
  update: async (id, updates) => {
    return callEdgeFunction('tenant-modules', 'PUT', { id, ...updates });
  },

  // Deactivate module
  deactivate: async (tenantId, moduleId) => {
    return callEdgeFunction('tenant-modules', 'DELETE', {
      tenant_id: tenantId,
      module_id: moduleId,
    });
  },

  // Direct query for module list (public data)
  listAll: async () => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('category');
    if (error) throw error;
    return { modules: data };
  },

  // Get single module by slug
  getBySlug: async (slug) => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error) throw error;
    return data;
  },

  // Update module info (pricing, version, settings etc.) via edge function
  // Validates: semver, category, prevents version downgrade, auto-updates changelog
  updateModuleInfo: async (id, updates) => {
    return callEdgeFunction('tenant-modules', 'PUT', { id, ...updates }, { scope: 'modules' });
  },

  // Create a new module via edge function
  // Validates: slug format/uniqueness, semver, category, depends_on references
  create: async (moduleData) => {
    return callEdgeFunction('tenant-modules', 'POST', moduleData, { scope: 'modules' });
  },

  // Delete a module via edge function
  // Validates: no tenant_modules reference it, no other modules depend on it
  remove: async (id) => {
    return callEdgeFunction('tenant-modules', 'DELETE', { id }, { scope: 'modules' });
  },
};

// ============================================
// MONITORING API
// ============================================

export const monitoringApi = {
  // Get error dashboard stats
  getErrorStats: async (filters = {}) => {
    return callEdgeFunction('monitoring-api', 'GET', null, { type: 'error_stats', ...filters });
  },

  // List errors with pagination
  listErrors: async (filters = {}) => {
    return callEdgeFunction('monitoring-api', 'GET', null, { type: 'errors', ...filters });
  },

  // Get single error details
  getError: async (id) => {
    return callEdgeFunction('monitoring-api', 'GET', null, { type: 'error', id });
  },

  // Update error status (resolve, ignore, etc.)
  updateError: async (id, updates) => {
    return callEdgeFunction('monitoring-api', 'PUT', { id, ...updates });
  },

  // Get system health status
  getHealth: async () => {
    return callEdgeFunction('monitoring-api', 'GET', null, { type: 'health' });
  },

  // Get health check history
  getHealthHistory: async (checkName, days = 7) => {
    return callEdgeFunction('monitoring-api', 'GET', null, { 
      type: 'health_history', 
      check_name: checkName,
      days 
    });
  },

  // List alerts
  listAlerts: async (filters = {}) => {
    return callEdgeFunction('monitoring-api', 'GET', null, { type: 'alerts', ...filters });
  },

  // Acknowledge/resolve alert
  updateAlert: async (id, updates) => {
    return callEdgeFunction('monitoring-api', 'PUT', { type: 'alert', id, ...updates });
  },

  // Get incidents
  listIncidents: async (filters = {}) => {
    return callEdgeFunction('monitoring-api', 'GET', null, { type: 'incidents', ...filters });
  },
};

// ============================================
// DEPLOYMENT API
// ============================================

export const deploymentApi = {
  // List deployments
  list: async (filters = {}) => {
    return callEdgeFunction('deployment-api', 'GET', null, filters);
  },

  // Get deployment details
  get: async (id) => {
    return callEdgeFunction('deployment-api', 'GET', null, { id });
  },

  // Create new deployment
  create: async (deploymentData) => {
    return callEdgeFunction('deployment-api', 'POST', deploymentData);
  },

  // Update deployment (cancel, rollback)
  update: async (id, updates) => {
    return callEdgeFunction('deployment-api', 'PUT', { id, ...updates });
  },

  // Get tenant versions
  getTenantVersions: async () => {
    return callEdgeFunction('deployment-api', 'GET', null, { type: 'tenant_versions' });
  },

  // Trigger rollback
  rollback: async (deploymentId, tenantIds = null) => {
    return callEdgeFunction('deployment-api', 'POST', { 
      action: 'rollback',
      deployment_id: deploymentId,
      tenant_ids: tenantIds,
    });
  },
};

// ============================================
// SUBSCRIPTION API
// ============================================

export const subscriptionApi = {
  // Get subscription stats (MRR, churn, etc.)
  getStats: async () => {
    return callEdgeFunction('subscription-api', 'GET', null, { type: 'stats' });
  },

  // Get revenue breakdown
  getRevenue: async (groupBy = 'plan') => {
    return callEdgeFunction('subscription-api', 'GET', null, { type: 'revenue', group_by: groupBy });
  },

  // List subscription plans
  listPlans: async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly_usd');
    if (error) throw error;
    return { plans: data };
  },

  // Get upcoming renewals
  getUpcomingRenewals: async (days = 30) => {
    return callEdgeFunction('subscription-api', 'GET', null, { type: 'renewals', days });
  },

  // Get recent transactions
  getTransactions: async (filters = {}) => {
    return callEdgeFunction('subscription-api', 'GET', null, { type: 'transactions', ...filters });
  },

  // Update subscription
  updateSubscription: async (tenantId, updates) => {
    return callEdgeFunction('subscription-api', 'PUT', { tenant_id: tenantId, ...updates });
  },
};

// ============================================
// DOMAIN API
// ============================================

export const domainApi = {
  // List all domains
  list: async (filters = {}) => {
    return callEdgeFunction('domain-api', 'GET', null, filters);
  },

  // Get domain details
  get: async (id) => {
    return callEdgeFunction('domain-api', 'GET', null, { id });
  },

  // Add domain
  create: async (domainData) => {
    return callEdgeFunction('domain-api', 'POST', domainData);
  },

  // Update domain
  update: async (id, updates) => {
    return callEdgeFunction('domain-api', 'PUT', { id, ...updates });
  },

  // Delete domain
  delete: async (id) => {
    return callEdgeFunction('domain-api', 'DELETE', { id });
  },

  // Verify DNS
  verifyDns: async (id) => {
    return callEdgeFunction('domain-api', 'POST', { action: 'verify_dns', id });
  },

  // Provision SSL
  provisionSsl: async (id) => {
    return callEdgeFunction('domain-api', 'POST', { action: 'provision_ssl', id });
  },

  // Get domain stats
  getStats: async () => {
    return callEdgeFunction('domain-api', 'GET', null, { type: 'stats' });
  },

  // Vercel integration
  addToVercel: async (domainId) => {
    return callEdgeFunction('vercel-domain', 'POST', { domain_id: domainId });
  },

  removeFromVercel: async (domainId) => {
    return callEdgeFunction('vercel-domain', 'DELETE', { domain_id: domainId });
  },

  checkVercel: async (domain) => {
    return callEdgeFunction('vercel-domain', 'GET', null, { domain });
  },
};

// ============================================
// API KEYS API
// ============================================

export const apiKeysApi = {
  // List API keys
  list: async (filters = {}) => {
    return callEdgeFunction('api-keys', 'GET', null, filters);
  },

  // Get API key details
  get: async (id) => {
    return callEdgeFunction('api-keys', 'GET', null, { id });
  },

  // Create API key
  create: async (keyData) => {
    return callEdgeFunction('api-keys', 'POST', keyData);
  },

  // Update API key
  update: async (id, updates) => {
    return callEdgeFunction('api-keys', 'PUT', { id, ...updates });
  },

  // Revoke API key
  revoke: async (id) => {
    return callEdgeFunction('api-keys', 'DELETE', { id });
  },

  // Regenerate API key
  regenerate: async (id) => {
    return callEdgeFunction('api-keys', 'POST', { action: 'regenerate', id });
  },

  // Get usage stats
  getUsage: async (keyId, period = '30d') => {
    return callEdgeFunction('api-keys', 'GET', null, { type: 'usage', key_id: keyId, period });
  },

  // Get API definitions catalog
  getDefinitions: async () => {
    return callEdgeFunction('api-keys', 'GET', null, { type: 'api_definitions' });
  },
};

// ============================================
// WEBHOOKS API
// ============================================

export const webhooksApi = {
  // List webhooks
  list: async (filters = {}) => {
    return callEdgeFunction('webhooks-api', 'GET', null, filters);
  },

  // Get webhook details
  get: async (id) => {
    return callEdgeFunction('webhooks-api', 'GET', null, { id });
  },

  // Create webhook
  create: async (webhookData) => {
    return callEdgeFunction('webhooks-api', 'POST', webhookData);
  },

  // Update webhook
  update: async (id, updates) => {
    return callEdgeFunction('webhooks-api', 'PUT', { id, ...updates });
  },

  // Delete webhook
  delete: async (id) => {
    return callEdgeFunction('webhooks-api', 'DELETE', { id });
  },

  // Test webhook
  test: async (id) => {
    return callEdgeFunction('webhooks-api', 'POST', { action: 'test', id });
  },

  // Get delivery logs
  getLogs: async (webhookId, filters = {}) => {
    return callEdgeFunction('webhooks-api', 'GET', null, { 
      type: 'logs', 
      webhook_id: webhookId,
      ...filters 
    });
  },

  // Get available event types
  getEventTypes: async () => {
    return callEdgeFunction('webhooks-api', 'GET', null, { type: 'event_types' });
  },

  // Retry failed delivery
  retry: async (logId) => {
    return callEdgeFunction('webhooks-api', 'POST', { action: 'retry', log_id: logId });
  },
};

// ============================================
// AUDIT LOG API
// ============================================

export const auditApi = {
  // List audit logs
  list: async (filters = {}) => {
    return callEdgeFunction('audit-api', 'GET', null, filters);
  },

  // Get audit log details
  get: async (id) => {
    return callEdgeFunction('audit-api', 'GET', null, { id });
  },

  // Export audit logs
  export: async (filters = {}) => {
    return callEdgeFunction('audit-api', 'GET', null, { ...filters, export: 'true' });
  },
};

// ============================================
// SUPPORT SESSION API
// ============================================

export const supportApi = {
  // List support sessions with optional filters
  list: async (filters = {}) => {
    return callEdgeFunction('tenant-impersonate', 'GET', null, filters);
  },

  // Create support session
  create: async (sessionData) => {
    return callEdgeFunction('tenant-impersonate', 'POST', sessionData);
  },

  // End support session (using PUT with action: 'end')
  end: async (sessionId, summary = '') => {
    return callEdgeFunction('tenant-impersonate', 'PUT', { 
      session_id: sessionId, 
      action: 'end',
      summary 
    });
  },

  // Log action in session (using PUT)
  logAction: async (sessionId, actionDetails) => {
    return callEdgeFunction('tenant-impersonate', 'PUT', { 
      session_id: sessionId,
      action: actionDetails.action || actionDetails.description,
      details: actionDetails
    });
  },

  // Get single session details
  get: async (sessionId) => {
    return callEdgeFunction('tenant-impersonate', 'GET', null, { session_id: sessionId });
  },

  // Join a waiting session (start it)
  join: async (sessionId) => {
    return callEdgeFunction('tenant-impersonate', 'PUT', {
      session_id: sessionId,
      action: 'join',
    });
  },
};

// ============================================
// DASHBOARD STATS API
// ============================================

export const dashboardApi = {
  // Get all dashboard stats
  getStats: async (period = '30d') => {
    return callEdgeFunction('dashboard-stats', 'GET', null, { period });
  },

  // Get specific metric
  getMetric: async (metric, period = '30d') => {
    return callEdgeFunction('dashboard-stats', 'GET', null, { metric, period });
  },

  // Get recent activity
  getActivity: async (limit = 20) => {
    return callEdgeFunction('dashboard-stats', 'GET', null, { type: 'activity', limit });
  },

  // Get system health summary
  getHealthSummary: async () => {
    return callEdgeFunction('dashboard-stats', 'GET', null, { type: 'health' });
  },
};

// ============================================
// FEATURE FLAGS API (Direct Supabase)
// ============================================

export const featureFlagsApi = {
  // Get feature flags for tenant
  getForTenant: async (tenantId) => {
    const { data, error } = await supabase
      .from('tenants')
      .select('feature_flags')
      .eq('id', tenantId)
      .single();
    if (error) throw error;
    return { featureFlags: data?.feature_flags || {} };
  },

  // Update feature flags
  updateForTenant: async (tenantId, flags) => {
    const { data, error } = await supabase
      .from('tenants')
      .update({ feature_flags: flags })
      .eq('id', tenantId)
      .select('feature_flags')
      .single();
    if (error) throw error;
    return { featureFlags: data?.feature_flags };
  },

  // Get global feature flags config
  getGlobalFlags: async () => {
    // Query the feature_flags table for global flags (tenant_id IS NULL)
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .is('tenant_id', null);
    if (error) throw error;
    return { flags: data };
  },
};

// ============================================
// BILLING API (SaaS Invoices & Payments)
// ============================================

export const billingApi = {
  // Get invoices for a tenant
  getInvoices: async (tenantId, options = {}) => {
    let query = supabase
      .from('saas_invoices')
      .select(`
        *,
        saas_invoice_items (*)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (options.status) query = query.eq('status', options.status);
    if (options.limit) query = query.limit(options.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return { invoices: data || [] };
  },

  // Get single invoice
  getInvoice: async (invoiceId) => {
    const { data, error } = await supabase
      .from('saas_invoices')
      .select(`
        *,
        saas_invoice_items (*),
        tenants (id, name, slug, owner_email)
      `)
      .eq('id', invoiceId)
      .single();
    if (error) throw error;
    return { invoice: data };
  },

  // Create invoice
  createInvoice: async (invoiceData) => {
    const { items, ...invoiceFields } = invoiceData;
    
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('saas_invoices')
      .insert(invoiceFields)
      .select()
      .single();
    
    if (invoiceError) throw invoiceError;
    
    // Add items if provided
    if (items && items.length > 0) {
      const itemsWithInvoiceId = items.map((item, index) => ({
        ...item,
        invoice_id: invoice.id,
        sort_order: index,
        total: (item.quantity || 1) * (item.unit_price || 0),
      }));
      
      const { error: itemsError } = await supabase
        .from('saas_invoice_items')
        .insert(itemsWithInvoiceId);
      
      if (itemsError) throw itemsError;
    }
    
    // Fetch complete invoice with items
    return billingApi.getInvoice(invoice.id);
  },

  // Update invoice
  updateInvoice: async (invoiceId, updates) => {
    const { data, error } = await supabase
      .from('saas_invoices')
      .update(updates)
      .eq('id', invoiceId)
      .select()
      .single();
    if (error) throw error;
    return { invoice: data };
  },

  // Delete invoice (only drafts can be deleted)
  deleteInvoice: async (invoiceId) => {
    // First check status
    const { data: invoice } = await supabase
      .from('saas_invoices')
      .select('status')
      .eq('id', invoiceId)
      .single();
    
    if (invoice && invoice.status !== 'draft') {
      throw new Error('Only draft invoices can be deleted. Cancel the invoice instead.');
    }
    
    const { error } = await supabase
      .from('saas_invoices')
      .delete()
      .eq('id', invoiceId);
    if (error) throw error;
    return { success: true };
  },

  // Mark invoice as paid (also records a payment in saas_payments)
  markAsPaid: async (invoiceId, paymentDetails = {}) => {
    // First get the invoice to know tenant_id, total, and currency
    const { data: invoice, error: fetchError } = await supabase
      .from('saas_invoices')
      .select('id, tenant_id, total, currency')
      .eq('id', invoiceId)
      .single();
    
    if (fetchError) throw fetchError;

    // Update invoice status to paid
    const { data, error } = await supabase
      .from('saas_invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: paymentDetails.method || 'manual',
        payment_reference: paymentDetails.reference || null,
      })
      .eq('id', invoiceId)
      .select()
      .single();
    if (error) throw error;

    // Record the payment in saas_payments so it shows in Recent Payments
    const { error: paymentError } = await supabase
      .from('saas_payments')
      .insert({
        tenant_id: invoice.tenant_id,
        invoice_id: invoiceId,
        amount: invoice.total,
        currency: invoice.currency || 'USD',
        payment_method: paymentDetails.method || 'manual',
        status: 'completed',
        processed_at: new Date().toISOString(),
        notes: paymentDetails.reference ? `Ref: ${paymentDetails.reference}` : 'Marked as paid manually',
      });
    
    if (paymentError) {
      console.error('Payment record failed (invoice already marked paid):', paymentError);
    }

    return { invoice: data };
  },

  // Cancel invoice
  cancelInvoice: async (invoiceId, reason = '') => {
    const { data, error } = await supabase
      .from('saas_invoices')
      .update({
        status: 'cancelled',
        internal_notes: reason ? `Cancelled: ${reason}` : 'Invoice cancelled',
      })
      .eq('id', invoiceId)
      .select()
      .single();
    if (error) throw error;
    return { invoice: data };
  },

  // Send invoice (mark as pending + send email notification)
  sendInvoice: async (invoiceId) => {
    // Fetch full invoice with tenant info
    const { data: invoice, error: fetchError } = await supabase
      .from('saas_invoices')
      .select(`
        *,
        saas_invoice_items (*),
        tenants (id, name, slug, owner_email, settings)
      `)
      .eq('id', invoiceId)
      .single();
    if (fetchError) throw fetchError;

    // Update status to pending
    const { data: updated, error: updateError } = await supabase
      .from('saas_invoices')
      .update({
        status: 'pending',
        issue_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', invoiceId)
      .select()
      .single();
    if (updateError) throw updateError;

    // Send email notification via send-notification edge function
    const recipientEmail = invoice.tenants?.owner_email;
    if (recipientEmail) {
      const currencySymbols = { USD: '$', EGP: 'E£', EUR: '€', GBP: '£', SAR: 'SAR ', AED: 'AED ', TRY: '₺', KWD: 'KD ' };
      const curr = currencySymbols[invoice.currency] || `${invoice.currency} `;
      const items = invoice.saas_invoice_items || [];
      const itemsList = items.map(i => `  • ${i.description}: ${curr}${parseFloat(i.total || 0).toFixed(2)}`).join('\n');

      const emailBody = [
        `Dear ${invoice.tenants?.name || 'Valued Customer'},`,
        '',
        `A new invoice has been generated for your account.`,
        '',
        `Invoice: ${invoice.invoice_number}`,
        `Amount: ${curr}${parseFloat(invoice.total || 0).toFixed(2)}`,
        `Due Date: ${invoice.due_date || 'N/A'}`,
        `Period: ${invoice.billing_period_start || ''} to ${invoice.billing_period_end || ''}`,
        '',
        'Items:',
        itemsList || '  (No line items)',
        '',
        'Please process this payment at your earliest convenience.',
        '',
        'Thank you,',
        'Dento Platform Billing',
      ].join('\n');

      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'invoice',
            channel: 'email',
            recipient: recipientEmail,
            template: emailBody,
            variables: {
              invoice_number: invoice.invoice_number,
              amount: `${curr}${parseFloat(invoice.total || 0).toFixed(2)}`,
              due_date: invoice.due_date || 'N/A',
              tenant_name: invoice.tenants?.name || '',
            },
          },
        });
      } catch (emailError) {
        // Log but don't fail — invoice is already marked pending
        console.warn('Failed to send invoice email:', emailError.message);
      }
    }

    return { invoice: updated };
  },

  // Add invoice item
  addInvoiceItem: async (invoiceId, item) => {
    const { data, error } = await supabase
      .from('saas_invoice_items')
      .insert({
        ...item,
        invoice_id: invoiceId,
        total: (item.quantity || 1) * (item.unit_price || 0),
      })
      .select()
      .single();
    if (error) throw error;
    return { item: data };
  },

  // Update invoice item
  updateInvoiceItem: async (itemId, updates) => {
    const itemUpdates = { ...updates };
    if (updates.quantity !== undefined || updates.unit_price !== undefined) {
      const quantity = updates.quantity ?? 1;
      const unitPrice = updates.unit_price ?? 0;
      itemUpdates.total = quantity * unitPrice;
    }
    
    const { data, error } = await supabase
      .from('saas_invoice_items')
      .update(itemUpdates)
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    return { item: data };
  },

  // Delete invoice item
  deleteInvoiceItem: async (itemId) => {
    const { error } = await supabase
      .from('saas_invoice_items')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
    return { success: true };
  },

  // Get payments for a tenant
  getPayments: async (tenantId, options = {}) => {
    let query = supabase
      .from('saas_payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    
    if (options.limit) query = query.limit(options.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    return { payments: data || [] };
  },

  // Record a payment
  recordPayment: async (paymentData) => {
    const { data, error } = await supabase
      .from('saas_payments')
      .insert({
        ...paymentData,
        processed_at: paymentData.status === 'completed' ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (error) throw error;
    
    // If invoice_id provided and payment completed, mark invoice as paid
    if (paymentData.invoice_id && paymentData.status === 'completed') {
      await billingApi.markAsPaid(paymentData.invoice_id, {
        method: paymentData.payment_method,
        reference: data.id,
      });
    }
    
    return { payment: data };
  },

  // Create Stripe checkout session for an invoice
  createStripeCheckout: async (invoiceId, options = {}) => {
    const { data, error } = await supabase.functions.invoke('stripe-billing', {
      body: {
        invoice_id: invoiceId,
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
      },
      headers: { 'x-action': 'create-checkout' },
    });
    if (error) throw error;
    return data;
  },

  // Create Stripe customer portal session
  createStripePortal: async (tenantId, returnUrl) => {
    const { data, error } = await supabase.functions.invoke('stripe-billing?action=create-portal', {
      body: { tenant_id: tenantId, return_url: returnUrl },
    });
    if (error) throw error;
    return data;
  },

  // Get billing summary for a tenant (currency-aware)
  getBillingSummary: async (tenantId) => {
    // Get tenant currency
    const { data: tenantInfo } = await supabase
      .from('tenants')
      .select('currency_code')
      .eq('id', tenantId)
      .single();
    const currency = tenantInfo?.currency_code || 'USD';

    // Get all invoices summary
    const { data: invoices, error: invError } = await supabase
      .from('saas_invoices')
      .select('status, total, currency')
      .eq('tenant_id', tenantId);
    
    if (invError) throw invError;
    
    // Get all payments
    const { data: payments, error: payError } = await supabase
      .from('saas_payments')
      .select('status, amount, currency')
      .eq('tenant_id', tenantId);
    
    if (payError) throw payError;
    
    const summary = {
      currency,
      totalInvoiced: invoices?.reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0) || 0,
      totalPaid: payments?.filter(p => p.status === 'completed').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0,
      totalPending: invoices?.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0) || 0,
      totalOverdue: invoices?.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0) || 0,
      invoiceCount: {
        draft: invoices?.filter(inv => inv.status === 'draft').length || 0,
        pending: invoices?.filter(inv => inv.status === 'pending').length || 0,
        paid: invoices?.filter(inv => inv.status === 'paid').length || 0,
        overdue: invoices?.filter(inv => inv.status === 'overdue').length || 0,
        cancelled: invoices?.filter(inv => inv.status === 'cancelled').length || 0,
      },
    };
    
    summary.balance = summary.totalInvoiced - summary.totalPaid;
    
    return { summary };
  },

  // Run overdue invoice detection manually
  markOverdueInvoices: async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('saas_invoices')
      .update({ status: 'overdue', updated_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('due_date', today)
      .select('id, invoice_number, tenant_id');
    if (error) throw error;
    return { updated: data?.length || 0, invoices: data || [] };
  },

  // Run trial expiry check manually
  handleExpiredTrials: async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('tenants')
      .update({ status: 'suspended', updated_at: now })
      .eq('status', 'active')
      .eq('subscription_status', 'trialing')
      .lt('trial_ends_at', now)
      .select('id, name, slug');
    if (error) throw error;
    return { suspended: data?.length || 0, tenants: data || [] };
  },

  // Generate invoice for current billing period
  generateSubscriptionInvoice: async (tenantId) => {
    // Get tenant with subscription info (including price_override & license_type)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        *,
        subscription_plans (*),
        tenant_modules (
          status,
          license_type,
          price_override,
          modules (id, name_en, base_price_monthly, base_price_yearly, is_free)
        )
      `)
      .eq('id', tenantId)
      .single();
    
    if (tenantError) throw tenantError;

    // Determine tenant currency and billing cycle
    const currency = tenant.currency_code || 'USD';
    const billingCycle = tenant.billing_cycle || 'monthly';
    const isYearly = billingCycle === 'yearly';
    const periodLabel = isYearly ? 'Yearly' : 'Monthly';

    // Fetch live exchange rates for currency conversion
    const rates = await getExchangeRates();
    const convertPrice = (usdAmount) => convertFromUSD(usdAmount, currency, rates);
    
    // For subscription plans, use the stored EGP price if available, otherwise convert dynamically
    const getPlanPrice = (plan) => {
      if (!plan) return 0;
      // subscription_plans has both USD and EGP columns — use them directly
      if (currency === 'EGP') {
        const egpPrice = isYearly ? plan.price_yearly_egp : plan.price_monthly_egp;
        if (egpPrice && egpPrice > 0) return parseFloat(egpPrice);
      }
      // For USD, use USD columns directly
      if (currency === 'USD') {
        return parseFloat(isYearly ? (plan.price_yearly_usd || 0) : (plan.price_monthly_usd || 0));
      }
      // For ALL other currencies — convert from USD dynamically
      const usdPrice = parseFloat(isYearly ? (plan.price_yearly_usd || 0) : (plan.price_monthly_usd || 0));
      return convertPrice(usdPrice);
    };

    // Module prices are always stored in USD — convert dynamically for non-USD tenants
    const getModulePrice = (tm) => {
      // price_override is tenant-specific and already in the tenant's currency
      if (tm.price_override != null) {
        return parseFloat(tm.price_override);
      }
      // Base prices are in USD — convert to tenant currency
      const usdPrice = isYearly
        ? (tm.modules.base_price_yearly || (tm.modules.base_price_monthly || 0) * 12)
        : (tm.modules.base_price_monthly || 0);
      return convertPrice(usdPrice);
    };
    
    // Duplicate invoice prevention: check if invoice already exists for this billing period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodStartStr = periodStart.toISOString().split('T')[0];
    const periodEndStr = periodEnd.toISOString().split('T')[0];

    const { data: existingInvoices } = await supabase
      .from('saas_invoices')
      .select('id, status, invoice_number')
      .eq('tenant_id', tenantId)
      .eq('billing_period_start', periodStartStr)
      .eq('billing_period_end', periodEndStr)
      .in('status', ['draft', 'pending', 'paid']);

    if (existingInvoices && existingInvoices.length > 0) {
      const existing = existingInvoices[0];
      throw new Error(
        `Invoice already exists for this billing period (${existing.invoice_number}, status: ${existing.status}). ` +
        `Cancel or delete the existing invoice first.`
      );
    }
    
    const items = [];
    let subtotal = 0;
    
    // Add subscription plan (with dynamic currency conversion)
    if (tenant.subscription_plans) {
      const planPrice = getPlanPrice(tenant.subscription_plans);
      items.push({
        description: `${tenant.subscription_plans.name_en} Plan - ${periodLabel}`,
        item_type: 'subscription',
        plan_id: tenant.subscription_plans.id,
        quantity: 1,
        unit_price: planPrice,
      });
      subtotal += planPrice;
    }
    
    // Add active paid modules (respecting price_override and license_type)
    tenant.tenant_modules?.forEach(tm => {
      if (tm.status !== 'active' || !tm.modules || tm.modules.is_free) return;
      // Skip modules included in plan or lifetime (already paid one-time)
      if (['included', 'lifetime'].includes(tm.license_type)) return;

      const modulePrice = getModulePrice(tm);

      items.push({
        description: `${tm.modules.name_en} Module - ${periodLabel}`,
        item_type: 'module',
        module_id: tm.modules.id,
        quantity: 1,
        unit_price: modulePrice,
      });
      subtotal += modulePrice;
    });
    
    // Calculate due date (15th of current month, or end of period)
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 15);
    if (dueDate < now) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    // Tax/VAT calculation
    const taxRate = parseFloat(tenant.settings?.tax_rate || tenant.settings?.vat_rate || 0);
    const discountAmount = parseFloat(tenant.settings?.discount_amount || 0);
    const discountPercent = parseFloat(tenant.settings?.discount_percent || 0);
    
    // Apply discount (flat or percentage, flat takes precedence)
    let discount = 0;
    if (discountAmount > 0) {
      discount = discountAmount;
    } else if (discountPercent > 0) {
      discount = subtotal * (discountPercent / 100);
    }
    discount = Math.round(discount * 100) / 100;

    // Calculate tax on discounted subtotal
    const taxableAmount = Math.max(subtotal - discount, 0);
    const taxAmount = taxRate > 0 ? Math.round(taxableAmount * (taxRate / 100) * 100) / 100 : 0;
    const total = Math.round((taxableAmount + taxAmount) * 100) / 100;

    // Add tax line item if applicable
    if (taxAmount > 0) {
      items.push({
        description: `Tax/VAT (${taxRate}%)`,
        item_type: 'tax',
        quantity: 1,
        unit_price: taxAmount,
      });
    }
    
    return billingApi.createInvoice({
      tenant_id: tenantId,
      status: 'draft',
      currency,
      billing_period_start: periodStartStr,
      billing_period_end: periodEndStr,
      due_date: dueDate.toISOString().split('T')[0],
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discount,
      total,
      notes: [
        taxRate > 0 ? `Tax/VAT: ${taxRate}%` : null,
        currency !== 'USD' ? `Exchange rate: 1 USD = ${rates[currency] || '?'} ${currency}` : null,
      ].filter(Boolean).join(' | ') || undefined,
      items,
    });
  },

  // ─── SaaS Invoice PDF Generation ───
  generateSaasInvoicePdf: async (invoiceId, format = 'html') => {
    const { data, error } = await supabase.functions.invoke('generate-invoice-pdf?type=saas', {
      body: { invoiceId, format },
    });
    if (error) throw error;
    return data;
  },

  // ─── Dunning / Payment Reminders ───
  runDunningProcess: async () => {
    const { data, error } = await supabase.functions.invoke('billing-dunning?action=run-dunning', {
      body: {},
    });
    if (error) throw error;
    return data;
  },

  getDunningStatus: async (tenantId = null) => {
    const { data, error } = await supabase.functions.invoke('billing-dunning?action=check-status', {
      body: { tenantId },
    });
    if (error) throw error;
    return data;
  },

  // ─── Subscription Expiry Handling ───
  handleSubscriptionExpiry: async () => {
    // Calls the DB function directly via RPC
    const { error } = await supabase.rpc('handle_subscription_expiry');
    if (error) throw error;
    return { success: true, message: 'Subscription expiry check completed' };
  },

  // ─── Auto-Suspend for Non-Payment ───
  autoSuspendNonPayment: async () => {
    // Calls the DB function directly via RPC
    const { error: suspendError } = await supabase.rpc('auto_suspend_non_payment');
    if (suspendError) throw suspendError;
    return { success: true, message: 'Auto-suspend check completed' };
  },

  // ─── Monthly Invoice Auto-Generation ───
  generateMonthlyInvoices: async () => {
    const { error: invoiceError } = await supabase.rpc('generate_monthly_invoices');
    if (invoiceError) throw invoiceError;
    return { success: true, message: 'Monthly invoice generation completed' };
  },

  // ─── Self-Service Plan Changes ───
  getAvailablePlans: async (tenantId = null) => {
    const { data, error } = await supabase.functions.invoke('billing-plan-change?action=get-available-plans', {
      body: { tenantId },
    });
    if (error) throw error;
    return data;
  },

  requestPlanChange: async ({ tenantId, newPlanId, billingCycle, requestedBy, immediate = true }) => {
    const { data, error } = await supabase.functions.invoke('billing-plan-change?action=request-change', {
      body: { tenantId, newPlanId, billingCycle, requestedBy, immediate },
    });
    if (error) throw error;
    return data;
  },

  approvePlanChange: async (changeId, approvedBy = 'admin') => {
    const { data, error } = await supabase.functions.invoke('billing-plan-change?action=approve-change', {
      body: { changeId, approvedBy },
    });
    if (error) throw error;
    return data;
  },

  getPlanChangeHistory: async (tenantId) => {
    const { data, error } = await supabase.functions.invoke('billing-plan-change?action=list-changes', {
      body: { tenantId },
    });
    if (error) throw error;
    return data;
  },

  // ─── Stripe Product/Price Sync ───
  syncStripeProducts: async () => {
    const { data, error } = await supabase.functions.invoke('stripe-sync?action=sync-products', {
      body: {},
    });
    if (error) throw error;
    return data;
  },

  getStripeProductMapping: async () => {
    const { data, error } = await supabase.functions.invoke('stripe-sync?action=get-mapping', {
      body: {},
    });
    if (error) throw error;
    return data;
  },

  createStripeCheckoutLink: async ({ planId, billingCycle, currency, tenantId, successUrl, cancelUrl }) => {
    const { data, error } = await supabase.functions.invoke('stripe-sync?action=create-checkout-link', {
      body: { planId, billingCycle, currency, tenantId, successUrl, cancelUrl },
    });
    if (error) throw error;
    return data;
  },
};

// Export all APIs
export default {
  tenant: tenantApi,
  module: moduleApi,
  monitoring: monitoringApi,
  deployment: deploymentApi,
  subscription: subscriptionApi,
  domain: domainApi,
  apiKeys: apiKeysApi,
  webhooks: webhooksApi,
  audit: auditApi,
  support: supportApi,
  dashboard: dashboardApi,
  featureFlags: featureFlagsApi,
  billing: billingApi,
};
