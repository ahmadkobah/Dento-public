import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Bug,
  Server,
  Globe,
  Building2,
  RefreshCw,
  Filter,
  BarChart3,
} from 'lucide-react';
import { useErrorStats, useErrors, useSystemHealth } from '../../hooks/useDevApi';

// Map API error stats to expected format
const mapStats = (stats) => ({
  total24h: stats?.total_24h || stats?.total || 0,
  totalChange: stats?.total_change || 0,
  critical: stats?.critical || 0,
  criticalChange: stats?.critical_change || 0,
  resolved: stats?.resolved || 0,
  avgResolutionTime: stats?.avg_resolution_time || 0,
});

const mapErrorsByType = (data) => (data || []).map(item => ({
  type: item.type || item.error_type,
  count: item.count || item.error_count || 0,
  change: item.change || 0,
}));

const mapErrorsByTenant = (data) => (data || []).map(item => ({
  id: item.tenant_id || item.id,
  name: item.tenant_name || item.name,
  slug: item.slug,
  errors: item.error_count || item.errors || 0,
  critical: item.critical_count || item.critical || 0,
}));

const mapRecentError = (e) => ({
  id: e.id,
  fingerprint: e.fingerprint || `err_${e.id.substring(0, 6)}`,
  message: e.message || e.error_message,
  type: e.type || e.error_type || 'javascript',
  severity: e.severity || 'error',
  tenant: e.tenant_name || e.tenant?.name || 'Unknown',
  tenantId: e.tenant_id,
  occurrences: e.occurrences || e.occurrence_count || 1,
  firstSeen: e.first_seen || e.created_at,
  lastSeen: e.last_seen || e.updated_at,
  status: e.status || 'unresolved',
  url: e.url || e.path,
});

const mapHealth = (health) => ({
  overall: health?.status || health?.overall || 'healthy',
  services: (health?.services || []).map(s => ({
    name: s.name,
    status: s.status || 'healthy',
    latency: s.latency || 0,
  })),
});

// Mock hourly error chart data
const mockHourlyErrors = [
  { hour: '00:00', errors: 2 },
  { hour: '02:00', errors: 1 },
  { hour: '04:00', errors: 0 },
  { hour: '06:00', errors: 3 },
  { hour: '08:00', errors: 8 },
  { hour: '10:00', errors: 15 },
  { hour: '12:00', errors: 7 },
  { hour: '14:00', errors: 5 },
  { hour: '16:00', errors: 4 },
  { hour: '18:00', errors: 2 },
  { hour: '20:00', errors: 0 },
  { hour: '22:00', errors: 0 },
];

const severityConfig = {
  critical: { color: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/20' },
  error: { color: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/20' },
  warning: { color: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  info: { color: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/20' },
};

const statusConfig = {
  unresolved: { label: 'Unresolved', color: 'text-red-400 bg-red-500/20' },
  investigating: { label: 'Investigating', color: 'text-amber-400 bg-amber-500/20' },
  resolved: { label: 'Resolved', color: 'text-emerald-400 bg-emerald-500/20' },
  ignored: { label: 'Ignored', color: 'text-gray-400 bg-gray-500/20' },
};

const healthConfig = {
  healthy: { color: 'bg-emerald-500', text: 'text-emerald-400' },
  degraded: { color: 'bg-amber-500', text: 'text-amber-400' },
  unhealthy: { color: 'bg-red-500', text: 'text-red-400' },
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export default function ErrorDashboard() {
  const [timeRange, setTimeRange] = useState('24h');

  // Fetch real data from API
  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useErrorStats({ period: timeRange });
  const { data: errorsData, refetch: refetchErrors } = useErrors({ limit: 5, period: timeRange });
  const { data: healthData, refetch: refetchHealth } = useSystemHealth();

  // Map data to expected formats
  const errorStats = mapStats(statsData);
  const errorsByType = mapErrorsByType(statsData?.by_type);
  const errorsByTenant = mapErrorsByTenant(statsData?.by_tenant);
  const recentErrors = (errorsData?.errors || []).slice(0, 5).map(mapRecentError);
  const healthStatus = mapHealth(healthData);

  const isRefreshing = statsLoading;

  const handleRefresh = () => {
    refetchStats();
    refetchErrors();
    refetchHealth();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Error Monitoring</h1>
          <p className="mt-1 text-sm text-gray-400">
            Real-time error tracking across all tenant instances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-amber-500/20 p-2">
              <Bug className="h-5 w-5 text-amber-400" />
            </div>
            <div className={`flex items-center gap-1 text-xs ${
              errorStats.totalChange < 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {errorStats.totalChange < 0 ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              {Math.abs(errorStats.totalChange)}%
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{errorStats.total24h}</p>
          <p className="text-xs text-gray-400">Total Errors (24h)</p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-red-500/20 p-2">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className={`flex items-center gap-1 text-xs ${
              errorStats.criticalChange > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {errorStats.criticalChange > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {errorStats.criticalChange}
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-red-400">{errorStats.critical}</p>
          <p className="text-xs text-gray-400">Critical Errors</p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-400">{errorStats.resolved}</p>
          <p className="text-xs text-gray-400">Resolved This Week</p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{errorStats.avgResolutionTime}h</p>
          <p className="text-xs text-gray-400">Avg Resolution Time</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Error Timeline */}
        <div className="col-span-2 space-y-6">
          {/* Error Chart */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Error Timeline</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Errors per hour
              </div>
            </div>
            <div className="flex items-end gap-1 h-32">
              {(() => {
                const maxErrors = Math.max(...mockHourlyErrors.map(e => e.errors), 1);
                return mockHourlyErrors.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-amber-500/80 rounded-t transition-all hover:bg-amber-400"
                      style={{ height: `${maxErrors > 0 ? (item.errors / maxErrors) * 100 : 0}%`, minHeight: item.errors > 0 ? '4px' : '0' }}
                      title={`${item.errors} errors`}
                    />
                    <span className="text-[10px] text-gray-500">{item.hour.split(':')[0]}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Recent Errors */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Errors</h3>
              <Link to="/developer/monitoring/errors" className="text-sm text-emerald-400 hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {recentErrors.slice(0, 5).map((error) => (
                <Link
                  key={error.id}
                  to={`/monitoring/errors/${error.id}`}
                  className="flex items-start gap-3 rounded-lg bg-gray-700/50 p-3 hover:bg-gray-700 transition-colors"
                >
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${severityConfig[error.severity].color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{error.message}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span>{error.type}</span>
                      <span>•</span>
                      <span>{error.tenant}</span>
                      <span>•</span>
                      <span>{error.occurrences} occurrences</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusConfig[error.status].color}`}>
                      {statusConfig[error.status].label}
                    </span>
                    <p className="mt-1 text-xs text-gray-500">{formatTime(error.lastSeen)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* System Health */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">System Health</h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
                healthStatus.overall === 'healthy'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : healthStatus.overall === 'degraded'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${healthConfig[healthStatus.overall]?.color || 'bg-gray-500'}`} />
                {healthStatus.overall.charAt(0).toUpperCase() + healthStatus.overall.slice(1)}
              </span>
            </div>
            <div className="space-y-3">
              {(healthStatus.services || []).map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${healthConfig[service.status]?.color || 'bg-gray-500'}`} />
                    <span className="text-sm text-gray-300">{service.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{service.latency}ms</span>
                </div>
              ))}
            </div>
            <Link
              to="/developer/monitoring/health"
              className="mt-4 block text-center text-sm text-emerald-400 hover:underline"
            >
              View details
            </Link>
          </div>

          {/* Errors by Type */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Errors by Type</h3>
            <div className="space-y-3">
              {errorsByType.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{item.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{item.count}</span>
                    <span className={`text-xs ${item.change < 0 ? 'text-emerald-400' : item.change > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {item.change > 0 ? '+' : ''}{item.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Errors by Tenant */}
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Errors by Tenant</h3>
            <div className="space-y-3">
              {errorsByTenant.map((tenant) => (
                <Link
                  key={tenant.id}
                  to={`/monitoring/errors?tenant=${tenant.id}`}
                  className="flex items-center justify-between hover:bg-gray-700/50 rounded-lg p-2 -mx-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-700 text-xs font-medium text-white">
                      {tenant.name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm text-gray-300">{tenant.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{tenant.errors}</span>
                    {tenant.critical > 0 && (
                      <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
                        {tenant.critical}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
