// Developer Portal React Hooks
// Reusable hooks for data fetching with loading/error states
/* eslint-disable react-hooks/exhaustive-deps */

import { useCallback } from 'react';
import { useAsync as useAsyncBase, useMutation as useMutationBase, createFilterKey } from '../../hooks/shared';
import {
  tenantApi,
  moduleApi,
  monitoringApi,
  deploymentApi,
  subscriptionApi,
  domainApi,
  apiKeysApi,
  webhooksApi,
  auditApi,
  supportApi,
  dashboardApi,
  featureFlagsApi,
  billingApi,
} from '../services/devApi';

// ============================================
// GENERIC HOOKS (re-export from shared)
// ============================================

/**
 * Generic async data fetching hook with cleanup for React Strict Mode
 * @deprecated Import from '../../hooks/shared' instead
 */
export function useAsync(asyncFn, immediate = true, deps = []) {
  return useAsyncBase(asyncFn, { immediate, deps });
}

/**
 * Generic mutation hook for POST/PUT/DELETE operations
 * @deprecated Import from '../../hooks/shared' instead
 */
export function useMutation(mutationFn) {
  return useMutationBase(mutationFn);
}

// ============================================
// TENANT HOOKS
// ============================================

// Issue #48: Memoize filters object to prevent infinite re-renders
export function useTenants(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchTenants = useCallback(() => tenantApi.list(filters), [filterKey]);
  return useAsync(fetchTenants, true, [filterKey]);
}

export function useTenant(id) {
  const fetchTenant = useCallback(() => id ? tenantApi.get(id) : Promise.resolve(null), [id]);
  return useAsync(fetchTenant, !!id, [id]);
}

export function useTenantStats() {
  return useAsync(tenantApi.getStats);
}

export function useCreateTenant() {
  return useMutation(tenantApi.create);
}

export function useUpdateTenant() {
  return useMutation(tenantApi.update);
}

export function useDeleteTenant() {
  return useMutation(tenantApi.delete);
}

// ============================================
// MODULE HOOKS
// ============================================

export function useModules() {
  return useAsync(moduleApi.listAll);
}

export function useTenantModules(tenantId) {
  const fetchModules = useCallback(
    () => tenantId ? moduleApi.getForTenant(tenantId) : Promise.resolve({ tenantModules: [] }),
    [tenantId]
  );
  return useAsync(fetchModules, !!tenantId, [tenantId]);
}

export function useActivateModule() {
  return useMutation((tenantId, moduleId, trialDays) => 
    moduleApi.activate(tenantId, moduleId, trialDays)
  );
}

export function useDeactivateModule() {
  return useMutation((tenantId, moduleId) => moduleApi.deactivate(tenantId, moduleId));
}

// ============================================
// MONITORING HOOKS
// ============================================

export function useErrorStats(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchStats = useCallback(() => monitoringApi.getErrorStats(filters), [filterKey]);
  return useAsync(fetchStats, true, [filterKey]);
}

export function useErrors(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchErrors = useCallback(() => monitoringApi.listErrors(filters), [filterKey]);
  return useAsync(fetchErrors, true, [filterKey]);
}

export function useError(id) {
  const fetchError = useCallback(() => id ? monitoringApi.getError(id) : Promise.resolve(null), [id]);
  return useAsync(fetchError, !!id, [id]);
}

export function useUpdateError() {
  return useMutation(monitoringApi.updateError);
}

export function useSystemHealth() {
  return useAsync(monitoringApi.getHealth);
}

export function useHealthHistory(checkName, days = 7) {
  const fetchHistory = useCallback(
    () => checkName ? monitoringApi.getHealthHistory(checkName, days) : Promise.resolve(null),
    [checkName, days]
  );
  return useAsync(fetchHistory, !!checkName, [checkName, days]);
}

export function useAlerts(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchAlerts = useCallback(() => monitoringApi.listAlerts(filters), [filterKey]);
  return useAsync(fetchAlerts, true, [filterKey]);
}

export function useIncidents(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchIncidents = useCallback(() => monitoringApi.listIncidents(filters), [filterKey]);
  return useAsync(fetchIncidents, true, [filterKey]);
}

// ============================================
// DEPLOYMENT HOOKS
// ============================================

export function useDeployments(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchDeployments = useCallback(() => deploymentApi.list(filters), [filterKey]);
  return useAsync(fetchDeployments, true, [filterKey]);
}

export function useDeployment(id) {
  const fetchDeployment = useCallback(() => id ? deploymentApi.get(id) : Promise.resolve(null), [id]);
  return useAsync(fetchDeployment, !!id, [id]);
}

export function useTenantVersions() {
  return useAsync(deploymentApi.getTenantVersions);
}

export function useCreateDeployment() {
  return useMutation(deploymentApi.create);
}

export function useRollbackDeployment() {
  return useMutation(deploymentApi.rollback);
}

// ============================================
// SUBSCRIPTION HOOKS
// ============================================

export function useSubscriptionStats() {
  return useAsync(subscriptionApi.getStats);
}

export function useRevenue(groupBy = 'plan') {
  const fetchRevenue = useCallback(() => subscriptionApi.getRevenue(groupBy), [groupBy]);
  return useAsync(fetchRevenue, true, [groupBy]);
}

export function useSubscriptionPlans() {
  return useAsync(subscriptionApi.listPlans);
}

export function useUpcomingRenewals(days = 30) {
  const fetchRenewals = useCallback(() => subscriptionApi.getUpcomingRenewals(days), [days]);
  return useAsync(fetchRenewals, true, [days]);
}

export function useTransactions(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchTransactions = useCallback(() => subscriptionApi.getTransactions(filters), [filterKey]);
  return useAsync(fetchTransactions, true, [filterKey]);
}

// ============================================
// DOMAIN HOOKS
// ============================================

export function useDomains(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchDomains = useCallback(() => domainApi.list(filters), [filterKey]);
  return useAsync(fetchDomains, true, [filterKey]);
}

export function useDomain(id) {
  const fetchDomain = useCallback(() => id ? domainApi.get(id) : Promise.resolve(null), [id]);
  return useAsync(fetchDomain, !!id, [id]);
}

export function useDomainStats() {
  return useAsync(domainApi.getStats);
}

export function useCreateDomain() {
  return useMutation(domainApi.create);
}

export function useUpdateDomain() {
  return useMutation((id, updates) => domainApi.update(id, updates));
}

export function useDeleteDomain() {
  return useMutation(domainApi.delete);
}

export function useVerifyDns() {
  return useMutation(domainApi.verifyDns);
}

export function useProvisionSsl() {
  return useMutation(domainApi.provisionSsl);
}

export function useAddDomainToVercel() {
  return useMutation(domainApi.addToVercel);
}

export function useRemoveDomainFromVercel() {
  return useMutation(domainApi.removeFromVercel);
}

// ============================================
// API KEYS HOOKS
// ============================================

export function useApiKeys(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchKeys = useCallback(() => apiKeysApi.list(filters), [filterKey]);
  return useAsync(fetchKeys, true, [filterKey]);
}

export function useApiKey(id) {
  const fetchKey = useCallback(() => id ? apiKeysApi.get(id) : Promise.resolve(null), [id]);
  return useAsync(fetchKey, !!id, [id]);
}

export function useApiKeyUsage(keyId, period = '30d') {
  const fetchUsage = useCallback(
    () => keyId ? apiKeysApi.getUsage(keyId, period) : Promise.resolve(null),
    [keyId, period]
  );
  return useAsync(fetchUsage, !!keyId, [keyId, period]);
}

export function useCreateApiKey() {
  return useMutation(apiKeysApi.create);
}

export function useUpdateApiKey() {
  return useMutation((id, updates) => apiKeysApi.update(id, updates));
}

export function useRevokeApiKey() {
  return useMutation(apiKeysApi.revoke);
}

export function useRegenerateApiKey() {
  return useMutation(apiKeysApi.regenerate);
}

export function useApiDefinitions() {
  return useAsync(apiKeysApi.getDefinitions);
}

// ============================================
// WEBHOOK HOOKS
// ============================================

export function useWebhooks(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchWebhooks = useCallback(() => webhooksApi.list(filters), [filterKey]);
  return useAsync(fetchWebhooks, true, [filterKey]);
}

export function useWebhook(id) {
  const fetchWebhook = useCallback(() => id ? webhooksApi.get(id) : Promise.resolve(null), [id]);
  return useAsync(fetchWebhook, !!id, [id]);
}

export function useWebhookLogs(webhookId, filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchLogs = useCallback(
    () => webhookId ? webhooksApi.getLogs(webhookId, filters) : Promise.resolve({ logs: [] }),
    [webhookId, filterKey]
  );
  return useAsync(fetchLogs, !!webhookId, [webhookId, filterKey]);
}

export function useCreateWebhook() {
  return useMutation(webhooksApi.create);
}

export function useUpdateWebhook() {
  return useMutation((id, updates) => webhooksApi.update(id, updates));
}

export function useDeleteWebhook() {
  return useMutation(webhooksApi.delete);
}

export function useTestWebhook() {
  return useMutation(webhooksApi.test);
}

export function useWebhookEventTypes() {
  return useAsync(webhooksApi.getEventTypes);
}

export function useRetryWebhook() {
  return useMutation(webhooksApi.retry);
}

// ============================================
// AUDIT LOG HOOKS
// ============================================

export function useAuditLogs(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchLogs = useCallback(() => auditApi.list(filters), [filterKey]);
  return useAsync(fetchLogs, true, [filterKey]);
}

export function useAuditLog(id) {
  const fetchLog = useCallback(() => id ? auditApi.get(id) : Promise.resolve(null), [id]);
  return useAsync(fetchLog, !!id, [id]);
}

export function useExportAuditLogs() {
  return useMutation(auditApi.export);
}

// ============================================
// SUPPORT SESSION HOOKS
// ============================================

export function useSupportSessions(filters = {}) {
  const filterKey = createFilterKey(filters);
  const fetchSessions = useCallback(() => supportApi.list(filters), [filterKey]);
  return useAsync(fetchSessions, true, [filterKey]);
}

export function useCreateSupportSession() {
  return useMutation(supportApi.create);
}

export function useJoinSupportSession() {
  return useMutation((sessionId) => supportApi.join(sessionId));
}

export function useEndSupportSession() {
  return useMutation((sessionId, summary) => supportApi.end(sessionId, summary));
}

// ============================================
// DASHBOARD HOOKS
// ============================================

export function useDashboardStats(period = '30d') {
  const fetchStats = useCallback(() => dashboardApi.getStats(period), [period]);
  return useAsync(fetchStats, true, [period]);
}

export function useDashboardMetric(metric, period = '30d') {
  const fetchMetric = useCallback(() => dashboardApi.getMetric(metric, period), [metric, period]);
  return useAsync(fetchMetric, true, [metric, period]);
}

export function useActivityFeed(limit = 20) {
  const fetchActivity = useCallback(() => dashboardApi.getActivity(limit), [limit]);
  return useAsync(fetchActivity, true, [limit]);
}

export function useRecentActivity(limit = 20) {
  const fetchActivity = useCallback(() => dashboardApi.getActivity(limit), [limit]);
  return useAsync(fetchActivity, true, [limit]);
}

export function useHealthSummary() {
  return useAsync(dashboardApi.getHealthSummary);
}

export function useApiKeyStats() {
  const fetchStats = useCallback(() => apiKeysApi.list({ status: 'active' }), []);
  return useAsync(fetchStats, true, []);
}

// ============================================
// FEATURE FLAGS HOOKS
// ============================================

export function useFeatureFlags(tenantId) {
  const fetchFlags = useCallback(
    () => tenantId 
      ? featureFlagsApi.getForTenant(tenantId) 
      : featureFlagsApi.getGlobalFlags(),
    [tenantId]
  );
  return useAsync(fetchFlags, true, [tenantId]);
}

export function useUpdateFeatureFlag() {
  return useMutation((flagId, updates) => featureFlagsApi.update(flagId, updates));
}

export function useUpdateFeatureFlags() {
  return useMutation(featureFlagsApi.updateForTenant);
}

export function useGlobalFeatureFlags() {
  return useAsync(featureFlagsApi.getGlobalFlags);
}

// ============================================
// BILLING HOOKS
// ============================================

export function useTenantInvoices(tenantId, options = {}) {
  const optionsKey = createFilterKey(options);
  const fetchInvoices = useCallback(
    () => tenantId ? billingApi.getInvoices(tenantId, options) : Promise.resolve({ invoices: [] }),
    [tenantId, optionsKey]
  );
  return useAsync(fetchInvoices, !!tenantId, [tenantId, optionsKey]);
}

export function useInvoice(invoiceId) {
  const fetchInvoice = useCallback(
    () => invoiceId ? billingApi.getInvoice(invoiceId) : Promise.resolve(null),
    [invoiceId]
  );
  return useAsync(fetchInvoice, !!invoiceId, [invoiceId]);
}

export function useCreateInvoice() {
  return useMutation(billingApi.createInvoice);
}

export function useUpdateInvoice() {
  return useMutation((invoiceId, updates) => billingApi.updateInvoice(invoiceId, updates));
}

export function useDeleteInvoice() {
  return useMutation(billingApi.deleteInvoice);
}

export function useMarkInvoiceAsPaid() {
  return useMutation((invoiceId, paymentDetails) => billingApi.markAsPaid(invoiceId, paymentDetails));
}

export function useCancelInvoice() {
  return useMutation((invoiceId, reason) => billingApi.cancelInvoice(invoiceId, reason));
}

export function useSendInvoice() {
  return useMutation(billingApi.sendInvoice);
}

export function useAddInvoiceItem() {
  return useMutation((invoiceId, item) => billingApi.addInvoiceItem(invoiceId, item));
}

export function useUpdateInvoiceItem() {
  return useMutation((itemId, updates) => billingApi.updateInvoiceItem(itemId, updates));
}

export function useDeleteInvoiceItem() {
  return useMutation(billingApi.deleteInvoiceItem);
}

export function useTenantPayments(tenantId, options = {}) {
  const optionsKey = createFilterKey(options);
  const fetchPayments = useCallback(
    () => tenantId ? billingApi.getPayments(tenantId, options) : Promise.resolve({ payments: [] }),
    [tenantId, optionsKey]
  );
  return useAsync(fetchPayments, !!tenantId, [tenantId, optionsKey]);
}

export function useRecordPayment() {
  return useMutation(billingApi.recordPayment);
}

export function useBillingSummary(tenantId) {
  const fetchSummary = useCallback(
    () => tenantId ? billingApi.getBillingSummary(tenantId) : Promise.resolve({ summary: null }),
    [tenantId]
  );
  return useAsync(fetchSummary, !!tenantId, [tenantId]);
}

export function useGenerateSubscriptionInvoice() {
  return useMutation(billingApi.generateSubscriptionInvoice);
}
