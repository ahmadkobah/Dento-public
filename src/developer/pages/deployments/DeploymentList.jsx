import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ExternalLink,
  Eye,
  Undo2,
  X,
  History,
  GitBranch,
} from 'lucide-react';
import { useDeployments, useTenantVersions } from '../../hooks/useDevApi';
import { deploymentApi } from '../../services/devApi';
import { useToast } from '../../../hooks/useToast';

// Map API deployment data to expected format
const mapDeployment = (deployment) => ({
  id: deployment.id,
  version: deployment.version,
  environment: deployment.environment || 'production',
  status: deployment.status || 'success',
  deployedAt: deployment.deployed_at || deployment.created_at,
  deployedBy: deployment.deployed_by || 'CI/CD Pipeline',
  duration: deployment.duration_seconds || deployment.duration,
  commit: deployment.commit_sha?.substring(0, 7) || deployment.commit,
  commitMessage: deployment.commit_message || 'No commit message',
  branch: deployment.branch || 'main',
  tenantsAffected: deployment.tenants_affected || 0,
  changelogs: deployment.changelogs || [],
  rollbackReason: deployment.rollback_reason,
});

const mapTenantVersion = (tv) => {
  const version = tv.version || tv.current_version || 'unknown';
  // If version is unknown or matches latest, consider it latest (not outdated)
  const isUnknown = version === 'unknown' || !version;
  return {
    tenant: tv.tenant_name || tv.tenant?.name || 'Unknown',
    version: version,
    // Don't mark as outdated if we simply don't have deployment data yet
    status: isUnknown ? 'unknown' : (tv.is_latest !== false ? 'latest' : 'outdated'),
  };
};

const statusConfig = {
  success: {
    label: 'Success',
    color: 'bg-emerald-500/20 text-emerald-400',
    icon: CheckCircle,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-500/20 text-blue-400',
    icon: Clock,
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-500/20 text-red-400',
    icon: XCircle,
  },
  rolled_back: {
    label: 'Rolled Back',
    color: 'bg-amber-500/20 text-amber-400',
    icon: Undo2,
  },
  pending: {
    label: 'Pending',
    color: 'bg-gray-500/20 text-gray-400',
    icon: Clock,
  },
};

const environmentConfig = {
  production: { label: 'Production', color: 'bg-red-500/20 text-red-400' },
  staging: { label: 'Staging', color: 'bg-amber-500/20 text-amber-400' },
  development: { label: 'Development', color: 'bg-blue-500/20 text-blue-400' },
};

export default function DeploymentList() {
  const toast = useToast();
  const { data: deploymentsData, refetch } = useDeployments();
  const { data: versionsData } = useTenantVersions();
  const [searchTerm, setSearchTerm] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedDeployment, setExpandedDeployment] = useState(null);
  const [rollbackModal, setRollbackModal] = useState(null);
  const [rollbackReason, setRollbackReason] = useState('');
  const [isRollingBack, setIsRollingBack] = useState(false);

  const deployments = (deploymentsData?.deployments || []).map(mapDeployment);
  const tenantVersions = (versionsData?.versions || []).map(mapTenantVersion);

  // Find previous successful deployment for rollback
  const getPreviousDeployment = (deployment) => {
    const sortedDeployments = deployments
      .filter(d => d.environment === deployment.environment && d.status === 'success' && d.id !== deployment.id)
      .sort((a, b) => new Date(b.deployedAt) - new Date(a.deployedAt));
    return sortedDeployments[0] || null;
  };

  const handleRollback = async () => {
    if (!rollbackModal) return;
    setIsRollingBack(true);
    try {
      await deploymentApi.rollback(rollbackModal.id);
      toast.success('Rollback initiated successfully');
      setRollbackModal(null);
      setRollbackReason('');
      refetch();
    } catch (err) {
      toast.error(`Rollback failed: ${err.message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  // Stats
  const totalDeployments = deployments.length;
  const successfulDeployments = deployments.filter((d) => d.status === 'success').length;
  const failedDeployments = deployments.filter((d) => d.status === 'failed').length;
  const rolledBack = deployments.filter((d) => d.status === 'rolled_back').length;

  // Filter deployments
  const filteredDeployments = deployments.filter((deployment) => {
    const matchesSearch =
      deployment.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.commitMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.branch.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnvironment =
      environmentFilter === 'all' || deployment.environment === environmentFilter;
    const matchesStatus = statusFilter === 'all' || deployment.status === statusFilter;
    return matchesSearch && matchesEnvironment && matchesStatus;
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Deployments</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage application deployments across all environments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
            <Rocket className="h-4 w-4" />
            New Deployment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-sm text-gray-400">Total Deployments</p>
          <p className="text-2xl font-bold text-white">{totalDeployments}</p>
          <p className="text-xs text-gray-500">Last 30 days</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-sm text-gray-400">Successful</p>
          <p className="text-2xl font-bold text-emerald-400">{successfulDeployments}</p>
          <p className="text-xs text-emerald-500">
            {((successfulDeployments / totalDeployments) * 100).toFixed(0)}% success rate
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-sm text-gray-400">Failed</p>
          <p className="text-2xl font-bold text-red-400">{failedDeployments}</p>
          <p className="text-xs text-gray-500">Requires attention</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-sm text-gray-400">Rolled Back</p>
          <p className="text-2xl font-bold text-amber-400">{rolledBack}</p>
          <p className="text-xs text-gray-500">Reverted deployments</p>
        </div>
      </div>

      {/* Tenant Versions */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
        <h3 className="font-medium text-white mb-3">Tenant Version Status</h3>
        <div className="flex flex-wrap gap-2">
          {tenantVersions.map((tenant, index) => (
            <div
              key={index}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                tenant.status === 'latest'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : tenant.status === 'unknown'
                  ? 'bg-gray-500/20 text-gray-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {tenant.tenant}: {tenant.version === 'unknown' ? 'No deployment' : `v${tenant.version}`}
            </div>
          ))}
        </div>
        {tenantVersions.filter((t) => t.status === 'outdated').length > 0 && (
          <p className="mt-2 text-xs text-amber-400">
            {tenantVersions.filter((t) => t.status === 'outdated').length} tenants running
            outdated versions
          </p>
        )}
        {tenantVersions.filter((t) => t.status === 'unknown').length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            {tenantVersions.filter((t) => t.status === 'unknown').length} tenants have no deployment records yet
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by version, commit, or branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="relative">
          <select
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-600 bg-gray-800 py-2 pl-4 pr-10 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-600 bg-gray-800 py-2 pl-4 pr-10 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="in_progress">In Progress</option>
            <option value="failed">Failed</option>
            <option value="rolled_back">Rolled Back</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Deployments List */}
      <div className="space-y-3">
        {filteredDeployments.map((deployment) => {
          const StatusIcon = statusConfig[deployment.status].icon;
          const isExpanded = expandedDeployment === deployment.id;

          return (
            <div
              key={deployment.id}
              className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-800/80 transition-colors"
                onClick={() => setExpandedDeployment(isExpanded ? null : deployment.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${statusConfig[deployment.status].color}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-white">
                          {deployment.version}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            environmentConfig[deployment.environment].color
                          }`}
                        >
                          {environmentConfig[deployment.environment].label}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusConfig[deployment.status].color
                          }`}
                        >
                          {statusConfig[deployment.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{deployment.commitMessage}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-white">{deployment.deployedBy}</p>
                      <p className="text-gray-500">{formatTime(deployment.deployedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white">{formatDuration(deployment.duration)}</p>
                      <p className="text-gray-500">{deployment.tenantsAffected} tenants</p>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-700 bg-gray-900/50 p-4">
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        Git Info
                      </p>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-gray-500">Commit:</span>{' '}
                          <code className="text-emerald-400">{deployment.commit}</code>
                        </p>
                        <p>
                          <span className="text-gray-500">Branch:</span>{' '}
                          <span className="text-white">{deployment.branch}</span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        Deployment Info
                      </p>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-gray-500">Duration:</span>{' '}
                          <span className="text-white">{formatDuration(deployment.duration)}</span>
                        </p>
                        <p>
                          <span className="text-gray-500">Deployed:</span>{' '}
                          <span className="text-white">
                            {new Date(deployment.deployedAt).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="col-span-2">
                      {deployment.changelogs.length > 0 && (
                        <>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                            Changes
                          </p>
                          <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                            {deployment.changelogs.map((change, index) => (
                              <li key={index}>{change}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {deployment.rollbackReason && (
                        <div className="mt-2 rounded-lg bg-amber-500/20 p-3 text-sm text-amber-300">
                          <strong>Rollback Reason:</strong> {deployment.rollbackReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-3">
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
                      <Eye className="h-4 w-4" />
                      View Logs
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
                      <ExternalLink className="h-4 w-4" />
                      View in GitHub
                    </button>
                    {deployment.status === 'success' &&
                      deployment.environment === 'production' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setRollbackModal(deployment); }}
                          className="inline-flex items-center gap-2 rounded-lg border border-amber-600 bg-amber-600/20 px-3 py-1.5 text-sm text-amber-400 hover:bg-amber-600/30 transition-colors"
                        >
                          <Undo2 className="h-4 w-4" />
                          Rollback
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredDeployments.length === 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 py-12 text-center">
          <Rocket className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-2 text-gray-400">No deployments found</p>
          <p className="text-sm text-gray-500">Try adjusting your filters</p>
        </div>
      )}

      {/* Rollback Confirmation Modal */}
      {rollbackModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRollbackModal(null)} />
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-gray-900 rounded-xl shadow-2xl border border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Undo2 className="w-5 h-5 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Rollback Deployment</h2>
                </div>
                <button onClick={() => setRollbackModal(null)} className="p-2 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Warning</span>
                  </div>
                  <p className="text-sm text-amber-300">
                    Rolling back will revert all changes from version <code className="bg-amber-500/20 px-1 rounded">{rollbackModal.version}</code> and restore the previous deployment.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Current Version</p>
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-red-400" />
                      <span className="font-mono text-white">{rollbackModal.version}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{rollbackModal.commitMessage}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase mb-2">Rollback To</p>
                    {getPreviousDeployment(rollbackModal) ? (
                      <>
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-emerald-400" />
                          <span className="font-mono text-white">{getPreviousDeployment(rollbackModal).version}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{getPreviousDeployment(rollbackModal).commitMessage}</p>
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm">No previous deployment available</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reason for Rollback <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={rollbackReason}
                    onChange={(e) => setRollbackReason(e.target.value)}
                    placeholder="Explain why you're rolling back this deployment..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => setRollbackModal(null)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRollback}
                    disabled={!rollbackReason.trim() || isRollingBack || !getPreviousDeployment(rollbackModal)}
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    {isRollingBack ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Rolling Back...
                      </>
                    ) : (
                      <>
                        <Undo2 className="w-4 h-4" />
                        Confirm Rollback
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
