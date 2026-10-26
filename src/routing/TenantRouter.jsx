import { lazy, Suspense } from 'react';
import { useDomain } from './DomainResolver';
import { useModules, MODULES } from './ModuleGate';
import LoadingScreen from '../components/common/LoadingScreen';

// Lazy load apps for code splitting
const AdminApp = lazy(() => import('../admin/AdminApp'));
const DeveloperApp = lazy(() => import('../developer/DeveloperApp'));
const PlatformApp = lazy(() => import('../platform/PlatformApp'));

/**
 * TenantRouter Component
 * Routes to the appropriate app based on:
 * - Subdomain/domain (tenant identification)
 * - URL path (/admin, /developer, or public)
 * - Module configuration (website enabled/disabled)
 */
const TenantRouter = () => {
  const { tenant, loading: domainLoading, error, isMainPlatform } = useDomain();
  const { loading: moduleLoading } = useModules();
  
  const pathname = window.location.pathname;

  // Show loading while resolving domain and modules
  if (domainLoading || moduleLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // Handle domain resolution errors
  if (error) {
    return <ErrorPage error={error} />;
  }

  // Main platform (app.dento.com) - show platform app
  if (isMainPlatform && !tenant) {
    return (
      <Suspense fallback={<LoadingScreen message="Loading platform..." />}>
        <PlatformApp />
      </Suspense>
    );
  }

  // Tenant-specific routing
  if (tenant) {
    // Developer Portal routes
    if (pathname.startsWith('/developer')) {
      return (
        <Suspense fallback={<LoadingScreen message="Loading developer portal..." />}>
          <DeveloperApp tenantId={tenant.id} tenantSlug={tenant.slug} />
        </Suspense>
      );
    }

    // Admin Panel routes (root path is admin — website is now a separate app)
    if (!pathname.startsWith('/developer')) {
      return (
        <Suspense fallback={<LoadingScreen message="Loading admin panel..." />}>
          <AdminApp tenantId={tenant.id} tenantSlug={tenant.slug} />
        </Suspense>
      );
    }

    // Fallback
    return <NoWebsiteLanding tenant={tenant} />;
  }

  // Fallback - shouldn't reach here
  return <ErrorPage error={{ type: 'error', message: 'Unknown routing state' }} />;
};

/**
 * NoWebsiteLanding Component
 * Shown when tenant doesn't have the website module enabled
 */
const NoWebsiteLanding = ({ tenant }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Logo */}
        <div className="mb-6">
          {tenant.logo_url ? (
            <img 
              src={tenant.logo_url} 
              alt={tenant.name} 
              className="h-16 mx-auto object-contain"
            />
          ) : (
            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-primary-600">
                {tenant.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Clinic Name */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {tenant.name}
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-8">
          This clinic uses Dento for internal management.
          <br />
          Staff members can access the system below.
        </p>

        {/* Login Button */}
        <a
          href={`/login`}
          className="inline-flex items-center justify-center w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
        >
          Staff Login
        </a>

        {/* Footer */}
        <p className="mt-8 text-sm text-gray-400">
          Powered by{' '}
          <a href="https://dento.app" className="text-primary-600 hover:underline">
            Dento
          </a>
        </p>
      </div>
    </div>
  );
};

/**
 * ErrorPage Component
 * Shown when domain resolution fails
 */
const ErrorPage = ({ error }) => {
  const getErrorContent = () => {
    switch (error.type) {
      case 'not_found':
        return {
          title: 'Clinic Not Found',
          message: 'The clinic you\'re looking for doesn\'t exist or the URL is incorrect.',
          icon: '🔍',
        };
      case 'inactive':
        return {
          title: 'Account Inactive',
          message: 'This clinic\'s account is currently inactive. Please contact support.',
          icon: '⚠️',
        };
      default:
        return {
          title: 'Oops! Something went wrong',
          message: error.message || 'An unexpected error occurred.',
          icon: '❌',
        };
    }
  };

  const content = getErrorContent();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">{content.icon}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h1>
        <p className="text-gray-600 mb-8">{content.message}</p>
        <div className="space-y-3">
          <a
            href="https://app.dento.com"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
          >
            Go to Dento Platform
          </a>
          <a
            href="https://dento.app"
            className="inline-flex items-center justify-center w-full px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Learn About Dento
          </a>
        </div>
      </div>
    </div>
  );
};

export default TenantRouter;
