import React, { lazy, Suspense, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import DeveloperLayout from './components/DeveloperLayout';
import { TenantProvider } from './contexts/TenantContext';
import { DevAuthProvider, useDevAuth } from './contexts/DevAuthContext';
import { DeveloperErrorBoundary as ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider } from '../components/Toast';
import { RefreshCw } from 'lucide-react';

// Auth pages
import DevLogin from './pages/DevLogin';

// Lazy load pages for better performance
const DeveloperDashboard = lazy(() => import('./pages/DeveloperDashboard'));
const ModuleList = lazy(() => import('./pages/modules/ModuleList'));
const ModuleDetail = lazy(() => import('./pages/modules/ModuleDetail'));
const FeatureFlagList = lazy(() => import('./pages/feature-flags/FeatureFlagList'));
const SystemSettings = lazy(() => import('./pages/settings/SystemSettings'));
const ApiKeyList = lazy(() => import('./pages/api-keys/ApiKeyList'));
const WebhookList = lazy(() => import('./pages/webhooks/WebhookList'));
const AuditLogs = lazy(() => import('./pages/logs/AuditLogs'));
const SystemLogs = lazy(() => import('./pages/logs/SystemLogs'));

// Multi-tenant SaaS pages
const TenantList = lazy(() => import('./pages/tenants/TenantList'));
const TenantDetail = lazy(() => import('./pages/tenants/TenantDetail'));
const TenantCreate = lazy(() => import('./pages/tenants/TenantCreate'));
const TenantModules = lazy(() => import('./pages/tenants/TenantModules'));

// Monitoring pages
const ErrorDashboard = lazy(() => import('./pages/monitoring/ErrorDashboard'));
const ErrorList = lazy(() => import('./pages/monitoring/ErrorList'));
const HealthStatus = lazy(() => import('./pages/monitoring/HealthStatus'));

// Deployment pages
const DeploymentList = lazy(() => import('./pages/deployments/DeploymentList'));

// Subscription pages
const SubscriptionOverview = lazy(() => import('./pages/subscriptions/SubscriptionOverview'));
const RevenueDashboard = lazy(() => import('./pages/subscriptions/RevenueDashboard'));

// Domain pages
const DomainList = lazy(() => import('./pages/domains/DomainList'));

// Support pages
const SupportSessions = lazy(() => import('./pages/support/SupportSessions'));
const SessionDetail = lazy(() => import('./pages/support/SessionDetail'));

// Custom Fields
const CustomFieldsList = lazy(() => import('./pages/custom-fields/CustomFieldsList'));

// Workflows
const WorkflowList = lazy(() => import('./pages/workflows/WorkflowList'));

// Settings - Advanced
const StorageSettings = lazy(() => import('./pages/settings/StorageSettings'));
const BackupSettings = lazy(() => import('./pages/settings/BackupSettings'));
const BrandingSettings = lazy(() => import('./pages/settings/BrandingSettings'));
const DatabaseSettings = lazy(() => import('./pages/settings/DatabaseSettings'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
  </div>
);

// Auth guard wrapper component
const AuthGuard = ({ children }) => {
  const { isAuthenticated, loading } = useDevAuth();
  const location = useLocation();
  
  // Memoize the from state to prevent infinite re-renders
  const fromState = useMemo(() => ({ from: location.pathname }), [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/developer/login" state={fromState} replace />;
  }

  return children;
};

// Main app content with all routes
const DeveloperContent = () => {
  return (
    <TenantProvider mode="developer">
      <ToastProvider>
        <DeveloperLayout>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Dashboard */}
                <Route index element={<DeveloperDashboard />} />
                
                {/* Tenants (Multi-tenant SaaS) */}
                <Route path="tenants" element={<TenantList />} />
                <Route path="tenants/new" element={<TenantCreate />} />
                <Route path="tenants/:id" element={<TenantDetail />} />
                <Route path="tenants/:id/modules" element={<TenantModules />} />
                
                {/* Monitoring */}
                <Route path="monitoring" element={<ErrorDashboard />} />
                <Route path="monitoring/errors" element={<ErrorList />} />
                <Route path="monitoring/health" element={<HealthStatus />} />
              
                {/* Deployments */}
                <Route path="deployments" element={<DeploymentList />} />
                
                {/* Subscriptions & Billing */}
                <Route path="subscriptions" element={<SubscriptionOverview />} />
                <Route path="revenue" element={<RevenueDashboard />} />
                
                {/* Domains */}
                <Route path="domains" element={<DomainList />} />
                
                {/* Support Sessions */}
                <Route path="support" element={<SupportSessions />} />
                <Route path="support/:sessionId" element={<SessionDetail />} />
                
                {/* Modules */}
                <Route path="modules" element={<ModuleList />} />
                <Route path="modules/:slug" element={<ModuleDetail />} />
                
                {/* Feature Flags */}
                <Route path="feature-flags" element={<FeatureFlagList />} />
                
                {/* Settings */}
                <Route path="settings" element={<SystemSettings />} />
                <Route path="settings/database" element={<DatabaseSettings />} />
                <Route path="settings/storage" element={<StorageSettings />} />
                <Route path="settings/backups" element={<BackupSettings />} />
                <Route path="settings/branding" element={<BrandingSettings />} />
                
                {/* Custom Fields */}
                <Route path="custom-fields" element={<CustomFieldsList />} />
                
                {/* Workflows */}
                <Route path="workflows" element={<WorkflowList />} />
                
                {/* API */}
                <Route path="api-keys" element={<ApiKeyList />} />
                <Route path="webhooks" element={<WebhookList />} />
                <Route path="webhooks/logs" element={<AuditLogs />} />
                <Route path="webhooks/:id" element={<WebhookList />} />
                
                {/* Logs */}
                <Route path="logs/audit" element={<AuditLogs />} />
                <Route path="logs/system" element={<SystemLogs />} />
                
                {/* Fallback - show dashboard for unmatched routes */}
                <Route path="*" element={<DeveloperDashboard />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </DeveloperLayout>
      </ToastProvider>
    </TenantProvider>
  );
};

// Main DeveloperApp - handles /developer/* and /* paths
const DeveloperApp = () => {
  return (
    <DevAuthProvider>
      <Routes>
        {/* Handle /developer/* paths */}
        <Route path="/developer/*" element={<DeveloperRoutes />} />
        
        {/* Also handle /* paths for when served standalone */}
        <Route path="/*" element={<DeveloperRoutes />} />
      </Routes>
    </DevAuthProvider>
  );
};

// Inner routes component
const DeveloperRoutes = () => {
  return (
    <Routes>
      {/* Login page - no auth required */}
      <Route path="login" element={<DevLogin />} />
      
      {/* All other routes require auth */}
      <Route path="*" element={
        <AuthGuard>
          <DeveloperContent />
        </AuthGuard>
      } />
    </Routes>
  );
};

export default DeveloperApp;
