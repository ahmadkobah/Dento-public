import { useState, useMemo } from 'react';
import { 
  Server, 
  Users, 
  Shield, 
  CreditCard, 
  FileText, 
  Monitor, 
  Globe, 
  Bell,
  Database,
  Code,
  ExternalLink,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { useApiDefinitions } from '../../hooks/useDevApi';

// Icon mapping for dynamic categories
const categoryIcons = {
  tenant: Users,
  developer: Code,
  domain: Globe,
  financial: CreditCard,
  cms: FileText,
  notification: Bell,
  public: Globe,
};

// Complete API catalog - scanned from codebase
const API_CATALOG = {
  tenant: {
    name: 'Tenant Management',
    icon: Users,
    color: 'emerald',
    description: 'Multi-tenant clinic management',
    apis: [
      {
        name: 'tenant-management',
        endpoint: '/functions/v1/tenant-management',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Full CRUD for tenant/clinic management',
        operations: ['List tenants', 'Create tenant', 'Update settings', 'Get stats'],
        scopes: ['read', 'write', 'delete'],
        roles: ['developer', 'admin'],
        authenticated: true
      },
      {
        name: 'tenant-modules',
        endpoint: '/functions/v1/tenant-modules',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Manage tenant module licenses',
        operations: ['List modules', 'Activate module', 'Start trial', 'Deactivate'],
        scopes: ['read', 'write'],
        roles: ['authenticated'],
        authenticated: true
      },
      {
        name: 'tenant-impersonate',
        endpoint: '/functions/v1/tenant-impersonate',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Secure tenant impersonation for support',
        operations: ['List sessions', 'Start session', 'Log action', 'End session'],
        scopes: ['admin'],
        roles: ['developer'],
        authenticated: true
      }
    ]
  },
  developer: {
    name: 'Developer Portal',
    icon: Code,
    color: 'purple',
    description: 'API keys, webhooks, monitoring',
    apis: [
      {
        name: 'api-keys',
        endpoint: '/functions/v1/api-keys',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'API key management',
        operations: ['List keys', 'Create key', 'Get usage', 'Revoke key'],
        scopes: ['read', 'write', 'delete'],
        roles: ['developer', 'admin'],
        authenticated: true
      },
      {
        name: 'webhooks-api',
        endpoint: '/functions/v1/webhooks-api',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Webhook configuration and logs',
        operations: ['List webhooks', 'Create webhook', 'Test delivery', 'View logs'],
        scopes: ['read', 'write', 'delete'],
        roles: ['developer', 'admin'],
        authenticated: true
      },
      {
        name: 'audit-api',
        endpoint: '/functions/v1/audit-api',
        methods: ['GET'],
        description: 'Query platform audit logs',
        operations: ['List logs', 'Filter by action', 'Export CSV'],
        scopes: ['read'],
        roles: ['developer'],
        authenticated: true
      },
      {
        name: 'monitoring-api',
        endpoint: '/functions/v1/monitoring-api',
        methods: ['GET', 'PUT'],
        description: 'Error monitoring and health checks',
        operations: ['Error stats', 'List errors', 'Health status', 'Manage alerts'],
        scopes: ['read', 'write'],
        roles: ['developer'],
        authenticated: true
      },
      {
        name: 'dashboard-stats',
        endpoint: '/functions/v1/dashboard-stats',
        methods: ['GET'],
        description: 'Aggregated platform statistics',
        operations: ['Full stats', 'Activity feed', 'Health summary'],
        scopes: ['read'],
        roles: ['authenticated'],
        authenticated: true
      },
      {
        name: 'deployment-api',
        endpoint: '/functions/v1/deployment-api',
        methods: ['GET', 'POST', 'PUT'],
        description: 'Deployment management and versioning',
        operations: ['List deployments', 'Create deployment', 'Rollback'],
        scopes: ['read', 'write'],
        roles: ['developer'],
        authenticated: true
      }
    ]
  },
  domain: {
    name: 'Domain Management',
    icon: Globe,
    color: 'blue',
    description: 'Custom domains and DNS',
    apis: [
      {
        name: 'domain-api',
        endpoint: '/functions/v1/domain-api',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Custom domain management',
        operations: ['List domains', 'Add domain', 'Verify DNS', 'Provision SSL'],
        scopes: ['read', 'write', 'delete'],
        roles: ['developer'],
        authenticated: true
      },
      {
        name: 'verify-domain',
        endpoint: '/functions/v1/verify-domain',
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        description: 'Domain DNS verification',
        operations: ['Check status', 'Initiate verification', 'Verify DNS'],
        scopes: ['write'],
        roles: ['owner', 'admin', 'developer'],
        authenticated: true
      }
    ]
  },
  financial: {
    name: 'Financial',
    icon: CreditCard,
    color: 'amber',
    description: 'Payments, billing, commissions',
    apis: [
      {
        name: 'subscription-api',
        endpoint: '/functions/v1/subscription-api',
        methods: ['GET', 'PUT'],
        description: 'Subscription and billing management',
        operations: ['Get stats', 'Revenue breakdown', 'Upcoming renewals'],
        scopes: ['read', 'write'],
        roles: ['developer'],
        authenticated: true
      },
      {
        name: 'process-payment',
        endpoint: '/functions/v1/process-payment',
        methods: ['POST'],
        description: 'Process invoice payments',
        operations: ['Process payment', 'Track installments'],
        scopes: ['write'],
        roles: ['admin', 'receptionist', 'manager'],
        authenticated: true
      },
      {
        name: 'calculate-commission',
        endpoint: '/functions/v1/calculate-commission',
        methods: ['POST'],
        description: 'Calculate doctor commissions',
        operations: ['Calculate commission for invoice'],
        scopes: ['write'],
        roles: ['admin', 'developer'],
        authenticated: true
      },
      {
        name: 'generate-invoice-pdf',
        endpoint: '/functions/v1/generate-invoice-pdf',
        methods: ['POST'],
        description: 'Generate PDF invoices',
        operations: ['Generate PDF', 'Generate HTML'],
        scopes: ['read'],
        roles: ['authenticated'],
        authenticated: true
      }
    ]
  },
  cms: {
    name: 'Website & CMS',
    icon: FileText,
    color: 'pink',
    description: 'Pages, templates, media',
    apis: [
      {
        name: 'page-builder-api',
        endpoint: '/functions/v1/page-builder-api',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Website page management',
        operations: ['List pages', 'Create page', 'Update page', 'Delete page'],
        scopes: ['read', 'write', 'delete'],
        roles: ['owner', 'admin', 'developer'],
        authenticated: true
      },
      {
        name: 'template-api',
        endpoint: '/functions/v1/template-api',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Page template management',
        operations: ['List templates', 'Create template', 'Update', 'Delete'],
        scopes: ['read', 'write', 'delete'],
        roles: ['owner', 'admin', 'developer'],
        authenticated: true
      },
      {
        name: 'website-settings-api',
        endpoint: '/functions/v1/website-settings-api',
        methods: ['GET', 'PUT', 'PATCH'],
        description: 'Theme, navigation, SEO settings',
        operations: ['Get settings', 'Save settings', 'Update theme'],
        scopes: ['read', 'write'],
        roles: ['owner', 'admin', 'developer'],
        authenticated: true
      },
      {
        name: 'media-upload',
        endpoint: '/functions/v1/media-upload',
        methods: ['GET', 'POST', 'DELETE'],
        description: 'Media asset management',
        operations: ['List media', 'Upload file', 'Delete asset'],
        scopes: ['read', 'write', 'delete'],
        roles: ['authenticated'],
        authenticated: true
      },
      {
        name: 'optimize-image',
        endpoint: '/functions/v1/optimize-image',
        methods: ['GET'],
        description: 'Image optimization (resize, WebP)',
        operations: ['Optimize with params (w, h, q, f, fit)'],
        scopes: ['public'],
        roles: [],
        authenticated: false
      },
      {
        name: 'generate-sitemap',
        endpoint: '/functions/v1/generate-sitemap',
        methods: ['GET'],
        description: 'Dynamic sitemap.xml generation',
        operations: ['Generate sitemap for tenant'],
        scopes: ['public'],
        roles: [],
        authenticated: false
      }
    ]
  },
  notification: {
    name: 'Notifications',
    icon: Bell,
    color: 'orange',
    description: 'WhatsApp, Email, SMS',
    apis: [
      {
        name: 'send-notification',
        endpoint: '/functions/v1/send-notification',
        methods: ['POST'],
        description: 'Send notifications via multiple channels',
        operations: ['Send WhatsApp', 'Send Email', 'Send SMS'],
        scopes: ['write'],
        roles: ['service'],
        authenticated: true
      }
    ]
  },
  public: {
    name: 'Public APIs',
    icon: Unlock,
    color: 'gray',
    description: 'Unauthenticated endpoints',
    apis: [
      {
        name: 'form-submission-api',
        endpoint: '/functions/v1/form-submission-api',
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        description: 'Contact form submissions',
        operations: ['Submit form (public)', 'List submissions', 'Mark read'],
        scopes: ['read', 'write', 'delete'],
        roles: ['public (POST)', 'authenticated (others)'],
        authenticated: 'partial'
      }
    ]
  }
};

// Database tables accessible via direct queries
const DATABASE_TABLES = [
  { name: 'tenants', category: 'Tenant', operations: ['select', 'insert', 'update'] },
  { name: 'tenant_users', category: 'Tenant', operations: ['select'] },
  { name: 'tenant_modules', category: 'Tenant', operations: ['select'] },
  { name: 'modules', category: 'Tenant', operations: ['select'] },
  { name: 'users', category: 'Auth', operations: ['select'] },
  { name: 'subscription_plans', category: 'Financial', operations: ['select'] },
  { name: 'pages', category: 'CMS', operations: ['select', 'insert', 'update', 'delete'] },
  { name: 'website_settings', category: 'CMS', operations: ['select', 'upsert'] },
  { name: 'media_library', category: 'CMS', operations: ['select', 'insert', 'delete'] },
  { name: 'testimonials', category: 'CMS', operations: ['select', 'insert', 'update', 'delete'] },
  { name: 'services', category: 'Clinical', operations: ['select'] },
  { name: 'doctors', category: 'Clinical', operations: ['select'] },
  { name: 'branches', category: 'Clinical', operations: ['select'] },
  { name: 'appointments', category: 'Clinical', operations: ['select', 'insert', 'update'] },
  { name: 'patients', category: 'Clinical', operations: ['select'] },
  { name: 'api_keys', category: 'Developer', operations: ['select', 'insert', 'update', 'delete'] },
  { name: 'webhooks', category: 'Developer', operations: ['select', 'insert', 'update', 'delete'] },
  { name: 'audit_logs', category: 'Developer', operations: ['select'] },
  { name: 'error_logs', category: 'Developer', operations: ['select'] },
];

const METHOD_COLORS = {
  GET: 'bg-blue-500/20 text-blue-400',
  POST: 'bg-emerald-500/20 text-emerald-400',
  PUT: 'bg-amber-500/20 text-amber-400',
  PATCH: 'bg-orange-500/20 text-orange-400',
  DELETE: 'bg-red-500/20 text-red-400',
};

const CATEGORY_COLORS = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  gray: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' },
};

const ApiCatalog = () => {
  const { data: apiData, loading, error, refetch } = useApiDefinitions();
  const [expandedCategories, setExpandedCategories] = useState(['tenant', 'developer']);
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);
  const [showTables, setShowTables] = useState(false);

  // Transform API data into component format, fallback to static data
  const apiCatalog = useMemo(() => {
    if (apiData?.byCategory && Object.keys(apiData.byCategory).length > 0) {
      // Use dynamic data from API
      const result = {};
      Object.entries(apiData.byCategory).forEach(([catName, catData]) => {
        result[catName] = {
          name: catData.display_name || (catName.charAt(0).toUpperCase() + catName.slice(1)),
          icon: categoryIcons[catName] || Server,
          color: catData.color || 'gray',
          description: catData.description || '',
          apis: catData.apis.map(api => ({
            name: api.name,
            endpoint: api.endpoint,
            methods: api.methods || [],
            description: api.description || '',
            operations: api.operations || [],
            scopes: api.scopes || [],
            roles: api.required_roles || [],
            authenticated: api.is_authenticated !== false,
            isBeta: api.is_beta,
            isDeprecated: api.is_deprecated
          }))
        };
      });
      return result;
    }
    // Fallback to static data
    return API_CATALOG;
  }, [apiData]);

  const isFromDatabase = apiData?.byCategory && Object.keys(apiData.byCategory).length > 0;

  const toggleCategory = (key) => {
    setExpandedCategories(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const copyEndpoint = (endpoint) => {
    const fullUrl = `${window.location.origin.replace(':9000', ':54321')}${endpoint}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedEndpoint(endpoint);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const totalApis = Object.values(apiCatalog).reduce((sum, cat) => sum + cat.apis.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title with Live Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">API Catalog</h2>
          {isFromDatabase && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded-full text-xs text-emerald-400">
              <Database className="w-3 h-3" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={refetch}
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalApis}</p>
              <p className="text-sm text-gray-400">Total APIs</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{DATABASE_TABLES.length}</p>
              <p className="text-sm text-gray-400">Database Tables</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalApis - 2}</p>
              <p className="text-sm text-gray-400">Authenticated</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-500/10 rounded-lg flex items-center justify-center">
              <Unlock className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">2</p>
              <p className="text-sm text-gray-400">Public APIs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center gap-2 text-yellow-400 text-sm">
          <AlertTriangle className="w-4 h-4" />
          Using cached data. {error}
        </div>
      )}

      {/* API Categories */}
      <div className="space-y-4">
        {Object.entries(apiCatalog).map(([key, category]) => {
          const Icon = category.icon || categoryIcons[key] || Server;
          const colors = CATEGORY_COLORS[category.color] || CATEGORY_COLORS.gray;
          const isExpanded = expandedCategories.includes(key);

          return (
            <div key={key} className={clsx(
              "border rounded-xl overflow-hidden",
              colors.border,
              colors.bg
            )}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(key)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    colors.bg
                  )}>
                    <Icon className={clsx("w-5 h-5", colors.text)} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-400">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    colors.bg, colors.text
                  )}>
                    {category.apis.length} APIs
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* API Cards */}
              {isExpanded && (
                <div className="border-t border-gray-800 p-4 space-y-3">
                  {category.apis.map((api) => (
                    <div
                      key={api.name}
                      className="bg-gray-900/50 border border-gray-800 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium">{api.name}</h4>
                            {api.authenticated === true && (
                              <Lock className="w-3.5 h-3.5 text-amber-400" title="Authenticated" />
                            )}
                            {api.authenticated === false && (
                              <Unlock className="w-3.5 h-3.5 text-gray-400" title="Public" />
                            )}
                            {api.authenticated === 'partial' && (
                              <Shield className="w-3.5 h-3.5 text-blue-400" title="Partially authenticated" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{api.description}</p>
                        </div>
                        <button
                          onClick={() => copyEndpoint(api.endpoint)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                          title="Copy endpoint URL"
                        >
                          {copiedEndpoint === api.endpoint ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Endpoint */}
                      <div className="flex items-center gap-2 mb-3 font-mono text-sm">
                        <code className="text-gray-300 bg-gray-800 px-2 py-1 rounded">
                          {api.endpoint}
                        </code>
                      </div>

                      {/* Methods */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {api.methods.map((method) => (
                          <span
                            key={method}
                            className={clsx(
                              "px-2 py-0.5 rounded text-xs font-mono font-medium",
                              METHOD_COLORS[method]
                            )}
                          >
                            {method}
                          </span>
                        ))}
                      </div>

                      {/* Operations */}
                      <div className="text-sm text-gray-400 mb-3">
                        <span className="text-gray-500">Operations:</span>{' '}
                        {api.operations.join(' • ')}
                      </div>

                      {/* Scopes & Roles */}
                      <div className="flex flex-wrap items-center gap-2">
                        {api.scopes.map((scope) => (
                          <span
                            key={scope}
                            className={clsx(
                              "px-2 py-0.5 rounded text-xs",
                              scope === 'read' && "bg-blue-500/20 text-blue-400",
                              scope === 'write' && "bg-emerald-500/20 text-emerald-400",
                              scope === 'delete' && "bg-red-500/20 text-red-400",
                              scope === 'admin' && "bg-purple-500/20 text-purple-400",
                              scope === 'public' && "bg-gray-500/20 text-gray-400"
                            )}
                          >
                            {scope}
                          </span>
                        ))}
                        {api.roles.length > 0 && (
                          <span className="text-xs text-gray-500 ml-2">
                            Roles: {Array.isArray(api.roles) ? api.roles.join(', ') : api.roles}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Database Tables Toggle */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowTables(!showTables)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-left">
              <h3 className="text-white font-semibold">Database Tables</h3>
              <p className="text-sm text-gray-400">Direct Supabase table access</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-xs font-medium">
              {DATABASE_TABLES.length} tables
            </span>
            {showTables ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {showTables && (
          <div className="border-t border-gray-800 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {DATABASE_TABLES.map((table) => (
                <div
                  key={table.name}
                  className="bg-gray-800/50 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-cyan-400 font-mono text-sm">{table.name}</code>
                    <span className="text-xs text-gray-500">{table.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {table.operations.map((op) => (
                      <span
                        key={op}
                        className={clsx(
                          "px-1.5 py-0.5 rounded text-xs font-mono",
                          op === 'select' && "bg-blue-500/20 text-blue-400",
                          op === 'insert' && "bg-emerald-500/20 text-emerald-400",
                          op === 'update' && "bg-amber-500/20 text-amber-400",
                          op === 'upsert' && "bg-orange-500/20 text-orange-400",
                          op === 'delete' && "bg-red-500/20 text-red-400"
                        )}
                      >
                        {op}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* API Base URL */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <h4 className="text-white font-medium mb-2">API Base URL</h4>
        <code className="text-sm text-emerald-400 bg-gray-800 px-3 py-2 rounded-lg block font-mono">
          {window.location.origin.replace(':9000', ':54321')}/functions/v1/
        </code>
        <p className="text-sm text-gray-400 mt-2">
          All API endpoints require an <code className="text-amber-400">Authorization: Bearer &lt;api_key&gt;</code> header unless marked as public.
        </p>
      </div>
    </div>
  );
};

export default ApiCatalog;
