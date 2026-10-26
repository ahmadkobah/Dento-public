import { useState, useEffect } from 'react';
import { 
  Database, 
  Table2,
  RefreshCw,
  Server,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  FileJson,
  Layers,
  Hash,
  Calendar,
  Activity,
  Info,
  ExternalLink
} from 'lucide-react';
import clsx from 'clsx';

// Database tables organized by category
const DATABASE_SCHEMA = {
  core: {
    name: 'Core',
    color: 'emerald',
    tables: [
      { name: 'tenants', description: 'Multi-tenant clinic organizations', icon: Layers },
      { name: 'users', description: 'User accounts and profiles', icon: Layers },
      { name: 'tenant_users', description: 'User-tenant associations', icon: Layers },
      { name: 'user_sessions', description: 'Active user sessions', icon: Clock },
    ]
  },
  clinical: {
    name: 'Clinical',
    color: 'blue',
    tables: [
      { name: 'patients', description: 'Patient records', icon: Table2 },
      { name: 'appointments', description: 'Scheduled appointments', icon: Calendar },
      { name: 'treatments', description: 'Treatment plans', icon: Activity },
      { name: 'treatment_items', description: 'Individual treatment items', icon: Table2 },
      { name: 'medical_records', description: 'Patient medical history', icon: FileJson },
    ]
  },
  financial: {
    name: 'Financial',
    color: 'yellow',
    tables: [
      { name: 'invoices', description: 'Patient invoices', icon: Table2 },
      { name: 'payments', description: 'Payment transactions', icon: Table2 },
      { name: 'subscriptions', description: 'Tenant subscriptions', icon: Table2 },
      { name: 'subscription_plans', description: 'Available plans', icon: Table2 },
    ]
  },
  developer: {
    name: 'Developer Portal',
    color: 'purple',
    tables: [
      { name: 'api_keys', description: 'API key management', icon: Table2 },
      { name: 'api_key_usage', description: 'API usage tracking', icon: Activity },
      { name: 'api_definitions', description: 'API catalog definitions', icon: FileJson },
      { name: 'api_categories', description: 'API category metadata', icon: Layers },
      { name: 'webhooks', description: 'Webhook configurations', icon: Table2 },
      { name: 'webhook_logs', description: 'Webhook delivery logs', icon: Activity },
      { name: 'webhook_event_types', description: 'Available webhook events', icon: FileJson },
      { name: 'webhook_categories', description: 'Webhook category metadata', icon: Layers },
      { name: 'audit_logs', description: 'System audit trail', icon: Activity },
      { name: 'error_logs', description: 'Error tracking', icon: AlertTriangle },
    ]
  },
  cms: {
    name: 'Content Management',
    color: 'pink',
    tables: [
      { name: 'pages', description: 'Website pages', icon: Table2 },
      { name: 'page_versions', description: 'Page version history', icon: Clock },
      { name: 'navigation_settings', description: 'Menu configurations', icon: Layers },
      { name: 'media', description: 'Media files', icon: Table2 },
      { name: 'templates', description: 'Email/notification templates', icon: FileJson },
      { name: 'feature_flags', description: 'Feature toggles', icon: Table2 },
    ]
  },
  modules: {
    name: 'Modules',
    color: 'orange',
    tables: [
      { name: 'modules', description: 'Available system modules', icon: Layers },
      { name: 'tenant_modules', description: 'Module activations', icon: Table2 },
      { name: 'custom_fields', description: 'Dynamic custom fields', icon: FileJson },
      { name: 'workflows', description: 'Automation workflows', icon: Activity },
    ]
  },
  config: {
    name: 'Configuration',
    color: 'gray',
    tables: [
      { name: 'domains', description: 'Custom domains', icon: Table2 },
      { name: 'deployments', description: 'Deployment history', icon: Clock },
      { name: 'support_sessions', description: 'Impersonation sessions', icon: Table2 },
      { name: 'system_settings', description: 'Global settings', icon: Table2 },
    ]
  },
};

const colorClasses = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  gray: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
};

const DatabaseSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(['core', 'developer']);
  const [showConnectionString, setShowConnectionString] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [dbStats, setDbStats] = useState({
    totalTables: 0,
    totalRows: 0,
    dbSize: '0 MB',
    connectionStatus: 'connected',
    lastBackup: null,
    version: 'PostgreSQL 15.1',
  });
  const [tableStats, setTableStats] = useState({});

  // Simulate loading database stats
  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock stats
        const totalTables = Object.values(DATABASE_SCHEMA).reduce(
          (sum, cat) => sum + cat.tables.length, 0
        );
        
        // Generate mock row counts
        const mockTableStats = {};
        Object.values(DATABASE_SCHEMA).forEach(category => {
          category.tables.forEach(table => {
            mockTableStats[table.name] = {
              rowCount: Math.floor(Math.random() * 10000) + 100,
              size: `${(Math.random() * 50 + 1).toFixed(1)} MB`,
              lastModified: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
            };
          });
        });
        
        setTableStats(mockTableStats);
        setDbStats({
          totalTables,
          totalRows: Object.values(mockTableStats).reduce((sum, t) => sum + t.rowCount, 0),
          dbSize: '247 MB',
          connectionStatus: 'connected',
          lastBackup: new Date(Date.now() - 3600000 * 6).toISOString(),
          version: 'PostgreSQL 15.1',
        });
      } catch (err) {
        console.error('Failed to load database stats:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStats();
  }, []);

  const toggleCategory = (key) => {
    setExpandedCategories(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // Connection info (would come from env in real app)
  const connectionInfo = {
    host: 'db.supabase.co',
    port: '5432',
    database: 'postgres',
    user: 'postgres',
    pooler: 'pooler.supabase.com:6543',
    connectionString: 'postgresql://postgres:[YOUR-PASSWORD]@db.supabase.co:5432/postgres',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Database className="w-7 h-7 text-emerald-400" />
            Database
          </h1>
          <p className="text-gray-400 mt-1">
            View database schema, connection details, and statistics
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Table2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{dbStats.totalTables}</p>
              <p className="text-sm text-gray-400">Tables</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Hash className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{dbStats.totalRows.toLocaleString()}</p>
              <p className="text-sm text-gray-400">Total Rows</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{dbStats.dbSize}</p>
              <p className="text-sm text-gray-400">Database Size</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              dbStats.connectionStatus === 'connected' ? 'bg-emerald-500/10' : 'bg-red-500/10'
            )}>
              <Server className={clsx(
                "w-5 h-5",
                dbStats.connectionStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'
              )} />
            </div>
            <div>
              <p className={clsx(
                "text-lg font-semibold capitalize",
                dbStats.connectionStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'
              )}>
                {dbStats.connectionStatus}
              </p>
              <p className="text-sm text-gray-400">Status</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-400" />
          Connection Details
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Host</p>
                <p className="text-sm text-gray-300 font-mono">{connectionInfo.host}</p>
              </div>
              <button
                onClick={() => copyToClipboard(connectionInfo.host, 'host')}
                className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {copiedField === 'host' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Port</p>
                <p className="text-sm text-gray-300 font-mono">{connectionInfo.port}</p>
              </div>
              <button
                onClick={() => copyToClipboard(connectionInfo.port, 'port')}
                className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {copiedField === 'port' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Database</p>
                <p className="text-sm text-gray-300 font-mono">{connectionInfo.database}</p>
              </div>
              <button
                onClick={() => copyToClipboard(connectionInfo.database, 'database')}
                className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {copiedField === 'database' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Supabase URL</p>
                <p className="text-sm text-gray-300 font-mono truncate max-w-[200px]">{connectionInfo.supabaseUrl}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => copyToClipboard(connectionInfo.supabaseUrl, 'url')}
                  className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {copiedField === 'url' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={connectionInfo.supabaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Version</p>
                <p className="text-sm text-gray-300">{dbStats.version}</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Last Backup</p>
                <p className="text-sm text-gray-300">{formatDate(dbStats.lastBackup)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Connection String */}
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-500">Connection String</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConnectionString(!showConnectionString)}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {showConnectionString ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => copyToClipboard(connectionInfo.connectionString, 'connString')}
                className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
              >
                {copiedField === 'connString' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <code className="text-sm text-gray-400 font-mono break-all">
            {showConnectionString 
              ? connectionInfo.connectionString 
              : 'postgresql://postgres:••••••••@db.supabase.co:5432/postgres'}
          </code>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-400">
          <p className="mb-1">
            This is a read-only view of your database schema. To manage tables, run migrations, 
            or query data, use the Supabase Dashboard or SQL Editor.
          </p>
          <a 
            href="https://supabase.com/dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
          >
            Open Supabase Dashboard
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Table Browser */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Table2 className="w-5 h-5 text-emerald-400" />
          Schema Browser
        </h2>
        
        {Object.entries(DATABASE_SCHEMA).map(([key, category]) => {
          const colors = colorClasses[category.color];
          const isExpanded = expandedCategories.includes(key);
          const categoryRowCount = category.tables.reduce(
            (sum, t) => sum + (tableStats[t.name]?.rowCount || 0), 0
          );

          return (
            <div 
              key={key}
              className={clsx(
                'border rounded-xl overflow-hidden',
                colors.border,
                colors.bg
              )}
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(key)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colors.bg)}>
                    <Database className={clsx('w-5 h-5', colors.text)} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-white">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.tables.length} tables • {categoryRowCount.toLocaleString()} rows</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', colors.bg, colors.text)}>
                    {category.tables.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Tables List */}
              {isExpanded && (
                <div className="border-t border-gray-800">
                  <table className="w-full">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2">Table Name</th>
                        <th className="text-left text-xs font-medium text-gray-400 px-4 py-2">Description</th>
                        <th className="text-right text-xs font-medium text-gray-400 px-4 py-2">Rows</th>
                        <th className="text-right text-xs font-medium text-gray-400 px-4 py-2">Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {category.tables.map((table) => {
                        const stats = tableStats[table.name] || { rowCount: 0, size: '0 MB' };
                        const Icon = table.icon;
                        
                        return (
                          <tr key={table.name} className="hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-gray-500" />
                                <code className="text-sm text-emerald-400 font-mono">{table.name}</code>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">{table.description}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-300 font-mono">
                              {stats.rowCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-gray-400">
                              {stats.size}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DatabaseSettings;
