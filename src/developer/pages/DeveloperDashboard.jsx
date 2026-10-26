import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Boxes, 
  Flag, 
  Key, 
  Webhook, 
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Server,
  Database,
  HardDrive,
  Cpu,
  RefreshCw,
  ExternalLink,
  Terminal,
  GitBranch,
  Shield,
  Globe,
  Building2,
  Users
} from 'lucide-react';
import clsx from 'clsx';
import { useDashboardStats, useActivityFeed, useHealthSummary } from '../hooks/useDevApi';

const DeveloperDashboard = () => {
  const [_refreshKey, setRefreshKey] = useState(0);
  
  // Real data hooks
  const { data: dashboardData, loading: statsLoading, error: statsError, refetch: refetchStats } = useDashboardStats('30d');
  const { data: activityData, loading: activityLoading } = useActivityFeed(10);
  const { data: healthData, loading: healthLoading } = useHealthSummary();

  const isLoading = statsLoading && !dashboardData;

  // Extract stats from real data with fallbacks
  const stats = dashboardData?.stats || {
    modules: { total: 0, activeInstances: 0 },
    tenants: { total: 0, active: 0, trial: 0, new: 0 },
    apiKeys: { active: 0, totalRequests: 0 },
    webhooks: { active: 0, totalDeliveries: 0, successRate: 100 },
    errors: { total: 0, unresolved: 0, critical: 0 },
    health: { healthy: 0, total: 0, percentage: 100 },
    domains: { total: 0, active: 0, sslIssues: 0 },
    revenue: { mrr: 0, arr: 0 },
  };

  const activity = activityData?.activity || [];
  const health = healthData?.health || { overall: 'operational', checks: [] };

  const formatTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetchStats();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
      case 'healthy': return 'text-emerald-400';
      case 'degraded': return 'text-yellow-400';
      case 'down':
      case 'unhealthy': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational':
      case 'healthy': return CheckCircle2;
      case 'degraded': return AlertTriangle;
      case 'down':
      case 'unhealthy': return XCircle;
      default: return Activity;
    }
  };

  const getActivityIcon = (action) => {
    if (action?.includes('flag')) return Flag;
    if (action?.includes('key')) return Key;
    if (action?.includes('webhook')) return Webhook;
    if (action?.includes('module')) return Boxes;
    if (action?.includes('tenant')) return Building2;
    if (action?.includes('user')) return Users;
    return Activity;
  };

  const getActionColor = (action) => {
    if (!action) return 'text-gray-400 bg-gray-500/10';
    if (action.includes('created') || action.includes('enabled') || action.includes('activated')) {
      return 'text-emerald-400 bg-emerald-500/10';
    }
    if (action.includes('deleted') || action.includes('disabled') || action.includes('revoked')) {
      return 'text-red-400 bg-red-500/10';
    }
    if (action.includes('updated') || action.includes('modified')) {
      return 'text-blue-400 bg-blue-500/10';
    }
    return 'text-gray-400 bg-gray-500/10';
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Developer Dashboard</h1>
          <p className="text-gray-400 mt-1">Monitor your system and manage configurations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors',
              statsLoading && 'opacity-50 cursor-not-allowed'
            )}
            disabled={statsLoading}
          >
            <RefreshCw className={clsx('w-4 h-4', statsLoading && 'animate-spin')} />
            Refresh
          </button>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Supabase Console
          </a>
        </div>
      </div>

      {/* Error Banner */}
      {statsError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">Failed to load dashboard data: {statsError}</span>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tenants */}
        <Link
          to="/developer/tenants"
          className="group bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Building2 className="w-5 h-5 text-cyan-400" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-white">{stats.tenants.total}</h3>
          <p className="text-gray-400 text-sm mt-1">Tenants</p>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-emerald-400">{stats.tenants.active} active</span>
            <span className="text-gray-600">•</span>
            <span className="text-yellow-400">{stats.tenants.trial} trial</span>
          </div>
        </Link>

        {/* Modules */}
        <Link
          to="/developer/modules"
          className="group bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Boxes className="w-5 h-5 text-purple-400" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-white">{stats.modules.total}</h3>
          <p className="text-gray-400 text-sm mt-1">Modules</p>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-emerald-400">{stats.modules.activeInstances} active instances</span>
          </div>
        </Link>

        {/* API Keys */}
        <Link
          to="/developer/api-keys"
          className="group bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-white">{stats.apiKeys.active}</h3>
          <p className="text-gray-400 text-sm mt-1">API Keys</p>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-emerald-400">{(stats.apiKeys.totalRequests || 0).toLocaleString()} requests</span>
          </div>
        </Link>

        {/* Webhooks */}
        <Link
          to="/developer/webhooks"
          className="group bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Webhook className="w-5 h-5 text-orange-400" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <h3 className="text-3xl font-bold text-white">{stats.webhooks.active}</h3>
          <p className="text-gray-400 text-sm mt-1">Webhooks</p>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-emerald-400">{stats.webhooks.successRate}% success rate</span>
          </div>
        </Link>
      </div>

      {/* System Status & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">System Health</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={clsx(
                'w-2 h-2 rounded-full animate-pulse',
                health.overall === 'healthy' ? 'bg-emerald-500' :
                health.overall === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              )} />
              <span className={clsx('text-sm capitalize', getStatusColor(health.overall))}>
                {health.overall || 'operational'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                Health Score
              </div>
              <p className="text-2xl font-bold text-white">{stats.health.percentage}%</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <AlertTriangle className="w-4 h-4" />
                Unresolved Errors
              </div>
              <p className={clsx(
                'text-2xl font-bold',
                stats.errors.unresolved > 0 ? 'text-red-400' : 'text-white'
              )}>
                {stats.errors.unresolved}
              </p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Globe className="w-4 h-4" />
                SSL Issues
              </div>
              <p className={clsx(
                'text-2xl font-bold',
                stats.domains.sslIssues > 0 ? 'text-yellow-400' : 'text-white'
              )}>
                {stats.domains.sslIssues}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {healthLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : health.checks?.length > 0 ? (
              health.checks.slice(0, 5).map((service) => {
                const StatusIcon = getStatusIcon(service.status);
                return (
                  <div 
                    key={service.check_name}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className={clsx('w-5 h-5', getStatusColor(service.status))} />
                      <span className="text-gray-200">{service.check_name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {service.response_time_ms && (
                        <span className={clsx(
                          'text-sm px-2 py-0.5 rounded',
                          service.response_time_ms < 100 
                            ? 'text-emerald-400 bg-emerald-500/10' 
                            : service.response_time_ms < 500
                            ? 'text-yellow-400 bg-yellow-500/10'
                            : 'text-red-400 bg-red-500/10'
                        )}>
                          {service.response_time_ms}ms
                        </span>
                      )}
                      <span className={clsx('text-sm capitalize', getStatusColor(service.status))}>
                        {service.status}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No health checks configured</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue & MRR */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Revenue</h2>
          </div>

          <div className="text-center mb-6">
            <p className="text-4xl font-bold text-white">
              ${(stats.revenue.mrr || 0).toLocaleString()}
            </p>
            <p className="text-gray-400 text-sm mt-1">Monthly Recurring Revenue</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
            <span className="font-medium text-emerald-400">
              ${(stats.revenue.arr || 0).toLocaleString()} ARR
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Active Tenants</span>
              <span className="text-white font-medium">{stats.tenants.active}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Trial Tenants</span>
              <span className="text-yellow-400 font-medium">{stats.tenants.trial}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">New (30 days)</span>
              <span className="text-emerald-400 font-medium">+{stats.tenants.new}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            </div>
            <Link 
              to="/developer/logs/audit"
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
              </div>
            ) : activity.length > 0 ? (
              activity.map((item) => {
                const Icon = getActivityIcon(item.action);
                return (
                  <div 
                    key={item.id}
                    className="flex items-center gap-4 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="p-2 bg-gray-800 rounded-lg">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 truncate">
                        <span className={clsx(
                          'inline-flex px-2 py-0.5 rounded text-xs mr-2',
                          getActionColor(item.action)
                        )}>
                          {item.action?.split('.').pop() || item.action}
                        </span>
                        {item.tenants?.name || 'System'}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {item.actor_email || 'System'} • {formatTimeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/developer/tenants/new"
              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Building2 className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-gray-200 group-hover:text-white transition-colors">
                Create Tenant
              </span>
            </Link>

            <Link
              to="/developer/modules"
              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Boxes className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-gray-200 group-hover:text-white transition-colors">
                Manage Modules
              </span>
            </Link>

            <Link
              to="/developer/feature-flags"
              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Flag className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-gray-200 group-hover:text-white transition-colors">
                Toggle Feature Flags
              </span>
            </Link>

            <Link
              to="/developer/api-keys"
              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Key className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-gray-200 group-hover:text-white transition-colors">
                Manage API Keys
              </span>
            </Link>

            <Link
              to="/developer/monitoring/errors"
              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
            >
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-gray-200 group-hover:text-white transition-colors">
                View Error Logs
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Environment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
            <Globe className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Environment</p>
              <p className="text-gray-200 font-medium">Development</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
            <GitBranch className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Version</p>
              <p className="text-gray-200 font-medium">v1.0.0</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
            <Database className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Database</p>
              <p className="text-gray-200 font-medium">Supabase PostgreSQL</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
            <Shield className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Security</p>
              <p className="text-emerald-400 font-medium">RLS Enabled</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperDashboard;
