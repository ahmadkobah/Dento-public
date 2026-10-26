import { Link } from 'react-router-dom';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Cloud,
  ShieldCheck,
  Mail,
  CreditCard,
  Globe,
  Clock,
  Signal,
} from 'lucide-react';
import { useSystemHealth, useIncidents, useHealthHistory } from '../../hooks/useDevApi';

// Service icon mapping
const serviceIcons = {
  api: Server,
  database: Database,
  storage: Cloud,
  auth: ShieldCheck,
  email: Mail,
  payments: CreditCard,
  cdn: Globe,
  realtime: Signal,
};

// Map API health data to expected format
const mapSystemHealth = (health) => ({
  overall: health?.status || health?.overall || 'healthy',
  lastChecked: health?.last_checked || health?.checked_at || new Date().toISOString(),
  uptime: health?.uptime_percentage || health?.uptime || 99.9,
  uptimeDays: health?.uptime_days || 30,
});

const mapServices = (services) => (services || []).map(s => ({
  id: s.id || s.name.toLowerCase(),
  name: s.name,
  description: s.description || `${s.name} service`,
  status: s.status || 'healthy',
  latency: s.latency || s.response_time || 0,
  uptime: s.uptime || 99.9,
  lastCheck: s.last_check || s.checked_at || new Date().toISOString(),
  region: s.region || 'global',
  icon: serviceIcons[s.id] || serviceIcons[s.name?.toLowerCase()] || Server,
  issue: s.issue || s.error_message,
}));

const mapIncidents = (incidents) => (incidents || []).map(i => ({
  id: i.id,
  title: i.title,
  status: i.status || 'investigating',
  severity: i.severity || 'warning',
  startedAt: i.started_at || i.created_at,
  affectedServices: i.affected_services || [],
  updates: (i.updates || []).map(u => ({
    time: u.time || u.created_at,
    message: u.message,
  })),
}));

const mapUptimeHistory = (history) => (history || []).map(h => ({
  date: h.date,
  status: h.status || 'healthy',
}));

const statusConfig = {
  healthy: {
    label: 'Healthy',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    icon: CheckCircle,
  },
  degraded: {
    label: 'Degraded',
    color: 'bg-amber-500',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    icon: AlertTriangle,
  },
  unhealthy: {
    label: 'Unhealthy',
    color: 'bg-red-500',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: XCircle,
  },
};

const incidentStatusConfig = {
  investigating: { label: 'Investigating', color: 'text-amber-400 bg-amber-500/20' },
  identified: { label: 'Identified', color: 'text-blue-400 bg-blue-500/20' },
  monitoring: { label: 'Monitoring', color: 'text-purple-400 bg-purple-500/20' },
  resolved: { label: 'Resolved', color: 'text-emerald-400 bg-emerald-500/20' },
};

export default function HealthStatus() {
  // Fetch real data from API
  const { data: healthData, loading: isLoading, refetch } = useSystemHealth();
  const { data: incidentsData } = useIncidents();
  const { data: historyData } = useHealthHistory('overall', 7);

  // Map data to expected formats
  const systemHealth = mapSystemHealth(healthData);
  const services = mapServices(healthData?.services || healthData?.checks);
  const incidents = mapIncidents(incidentsData?.incidents || incidentsData);
  const uptimeHistory = mapUptimeHistory(historyData?.history || historyData);

  const isRefreshing = isLoading;

  const handleRefresh = () => {
    refetch();
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const StatusIcon = statusConfig[systemHealth.overall]?.icon || CheckCircle;
  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const degradedCount = services.filter((s) => s.status === 'degraded').length;
  const unhealthyCount = services.filter((s) => s.status === 'unhealthy').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Health</h1>
          <p className="mt-1 text-sm text-gray-400">
            Last checked {formatTime(systemHealth.lastChecked)}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall Status */}
      <div className={`rounded-lg border p-6 ${
        systemHealth.overall === 'healthy'
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : systemHealth.overall === 'degraded'
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'border-red-500/30 bg-red-500/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-3 ${statusConfig[systemHealth.overall]?.bgColor || 'bg-gray-500/20'}`}>
              <StatusIcon className={`h-8 w-8 ${statusConfig[systemHealth.overall]?.textColor || 'text-gray-400'}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {systemHealth.overall === 'healthy'
                  ? 'All Systems Operational'
                  : systemHealth.overall === 'degraded'
                  ? 'Partial System Degradation'
                  : 'System Outage'}
              </h2>
              <p className="text-sm text-gray-400">
                {healthyCount} healthy, {degradedCount} degraded, {unhealthyCount} unhealthy
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{systemHealth.uptime}%</p>
            <p className="text-sm text-gray-400">Uptime (30 days)</p>
          </div>
        </div>

        {/* Uptime History */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Last 7 days</span>
            <span className="text-sm text-gray-400">{systemHealth.uptimeDays} days since last incident</span>
          </div>
          <div className="flex gap-1">
            {uptimeHistory.map((day, index) => (
              <div
                key={index}
                className={`h-8 flex-1 rounded ${statusConfig[day.status]?.color || 'bg-gray-500'}`}
                title={`${day.date}: ${statusConfig[day.status]?.label || 'Unknown'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Active Incidents */}
      {incidents.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Incidents</h3>
          {incidents.map((incident) => (
            <div key={incident.id} className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <h4 className="font-medium text-white">{incident.title}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${incidentStatusConfig[incident.status].color}`}>
                      {incidentStatusConfig[incident.status].label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    Started {formatTime(incident.startedAt)}
                  </p>
                </div>
              </div>

              <div className="ml-8 border-l-2 border-amber-500/30 pl-4 space-y-3">
                {incident.updates.map((update, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-amber-500" />
                    <p className="text-xs text-gray-500">{formatTime(update.time)}</p>
                    <p className="text-sm text-gray-300">{update.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Services Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Services</h3>
        <div className="grid grid-cols-2 gap-4">
          {services.map((service) => {
            const ServiceIcon = service.icon || Server;
            const config = statusConfig[service.status] || statusConfig.healthy;

            return (
              <div
                key={service.id}
                className={`rounded-lg border p-4 transition-all ${
                  service.status === 'healthy'
                    ? 'border-gray-700 bg-gray-800/50'
                    : service.status === 'degraded'
                    ? 'border-amber-500/30 bg-amber-500/10'
                    : 'border-red-500/30 bg-red-500/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${config.bgColor}`}>
                      <ServiceIcon className={`h-5 w-5 ${config.textColor}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{service.name}</h4>
                      <p className="text-xs text-gray-500">{service.description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${config.color}`} />
                    {config.label}
                  </span>
                </div>

                {service.issue && (
                  <div className="mt-3 rounded-lg bg-amber-500/20 px-3 py-2 text-xs text-amber-300">
                    ⚠️ {service.issue}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold text-white">{service.latency}ms</p>
                    <p className="text-xs text-gray-500">Latency</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">{service.uptime}%</p>
                    <p className="text-xs text-gray-500">Uptime</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">{service.region}</p>
                    <p className="text-xs text-gray-500">Region</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Response Time Chart Placeholder */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Response Time (24h)</h3>
        <div className="h-48 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Clock className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-2">Response time chart</p>
            <p className="text-sm text-gray-600">Coming soon...</p>
          </div>
        </div>
      </div>

      {/* Scheduled Maintenance */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Scheduled Maintenance</h3>
        <div className="text-center py-8">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-2 text-gray-400">No scheduled maintenance</p>
        </div>
      </div>
    </div>
  );
}
