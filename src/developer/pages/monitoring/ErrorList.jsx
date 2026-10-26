import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  Bug,
  ChevronDown,
  X,
} from 'lucide-react';
import { useErrors, useTenants } from '../../hooks/useDevApi';
import { useToast } from '../../../hooks/useToast';
import { supabase } from '../../../lib/supabase';

// Map API error data to expected format
const mapError = (error) => ({
  id: error.id,
  fingerprint: error.fingerprint || `err_${error.id.substring(0, 6)}`,
  message: error.message || error.error_message,
  type: error.type || error.error_type || 'javascript',
  severity: error.severity || 'error',
  tenant: error.tenant || { id: error.tenant_id, name: error.tenant_name || 'Unknown' },
  occurrences: error.occurrences || error.occurrence_count || 1,
  users: error.affected_users || error.users || 1,
  firstSeen: error.first_seen || error.created_at,
  lastSeen: error.last_seen || error.updated_at,
  status: error.status || 'unresolved',
  url: error.url || error.path,
  stack: error.stack || error.stack_trace,
  assignedTo: error.assigned_to,
  resolvedBy: error.resolved_by,
  resolvedAt: error.resolved_at,
});

const severityConfig = {
  critical: { color: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/20', label: 'Critical' },
  error: { color: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Error' },
  warning: { color: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Warning' },
  info: { color: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Info' },
};

const statusConfig = {
  unresolved: { label: 'Unresolved', color: 'text-red-400 bg-red-500/20 border-red-500/30' },
  investigating: { label: 'Investigating', color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' },
  resolved: { label: 'Resolved', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' },
  ignored: { label: 'Ignored', color: 'text-gray-400 bg-gray-500/20 border-gray-500/30' },
  muted: { label: 'Muted', color: 'text-purple-400 bg-purple-500/20 border-purple-500/30' },
};

const typeConfig = {
  javascript: { label: 'JavaScript', color: 'text-yellow-400' },
  api: { label: 'API', color: 'text-blue-400' },
  network: { label: 'Network', color: 'text-purple-400' },
  database: { label: 'Database', color: 'text-cyan-400' },
  auth: { label: 'Auth', color: 'text-red-400' },
};

export default function ErrorList() {
  const [searchParams, _setSearchParams] = useSearchParams();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState(searchParams.get('tenant') || 'all');
  const [selectedErrors, setSelectedErrors] = useState([]);
  const [expandedError, setExpandedError] = useState(null);

  // Fetch data from API
  const { data: errorsData, loading: _isLoading, error: _fetchError, refetch } = useErrors({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    tenant_id: tenantFilter !== 'all' ? tenantFilter : undefined,
  });
  const { data: tenantsData } = useTenants();

  const errors = (errorsData?.errors || []).map(mapError);
  const tenants = [
    { id: 'all', name: 'All Tenants' },
    ...(tenantsData?.tenants || []).map(t => ({ id: t.id, name: t.name || t.business_name }))
  ];

  // Filter errors locally for search and type
  const filteredErrors = errors.filter((error) => {
    const matchesSearch =
      error.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.fingerprint.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || error.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || error.severity === severityFilter;
    const matchesType = typeFilter === 'all' || error.type === typeFilter;
    const matchesTenant = tenantFilter === 'all' || error.tenant.id === tenantFilter;
    return matchesSearch && matchesStatus && matchesSeverity && matchesType && matchesTenant;
  });

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

  const toggleSelectError = (id) => {
    setSelectedErrors((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedErrors.length === filteredErrors.length) {
      setSelectedErrors([]);
    } else {
      setSelectedErrors(filteredErrors.map((e) => e.id));
    }
  };

  const bulkAction = async (action) => {
    try {
      // Bulk update error status via Supabase
      const { error } = await supabase
        .from('error_logs')
        .update({ status: action === 'resolve' ? 'resolved' : action === 'ignore' ? 'ignored' : action })
        .in('id', selectedErrors);
      if (error) throw error;
      toast.success(`${selectedErrors.length} error(s) updated`);
      setSelectedErrors([]);
      refetch();
    } catch (err) {
      toast.error(`Bulk action failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Error List</h1>
          <p className="mt-1 text-sm text-gray-400">
            {filteredErrors.length} errors found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by error message or fingerprint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            {Object.entries(statusConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Severity</option>
            {Object.entries(severityConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            {Object.entries(typeConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedErrors.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <span className="text-sm text-emerald-400">
            {selectedErrors.length} error(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => bulkAction('resolve')}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Mark Resolved
            </button>
            <button
              onClick={() => bulkAction('ignore')}
              className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-500 transition-colors"
            >
              Ignore
            </button>
            <button
              onClick={() => bulkAction('mute')}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 transition-colors"
            >
              Mute
            </button>
          </div>
          <button
            onClick={() => setSelectedErrors([])}
            className="ml-auto text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Error Table */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedErrors.length === filteredErrors.length && filteredErrors.length > 0}
                  onChange={selectAll}
                  className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Error
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Tenant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Events
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Users
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Last Seen
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredErrors.map((error) => (
              <>
                <tr
                  key={error.id}
                  className={`hover:bg-gray-700/50 transition-colors ${
                    selectedErrors.includes(error.id) ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedErrors.includes(error.id)}
                      onChange={() => toggleSelectError(error.id)}
                      className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-2 w-2 rounded-full ${severityConfig[error.severity].color}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate max-w-md">
                          {error.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {error.fingerprint} • {error.url}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      to={`/tenants/${error.tenant.id}`}
                      className="text-sm text-emerald-400 hover:underline"
                    >
                      {error.tenant.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-sm ${typeConfig[error.type]?.color || 'text-gray-400'}`}>
                      {typeConfig[error.type]?.label || error.type}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-white">{error.occurrences}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-400">{error.users}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig[error.status].color}`}>
                      {statusConfig[error.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-400">{formatTime(error.lastSeen)}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedError === error.id ? 'rotate-180' : ''}`} />
                      </button>
                      <Link
                        to={`/monitoring/errors/${error.id}`}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
                {expandedError === error.id && (
                  <tr className="bg-gray-800/80">
                    <td colSpan={9} className="px-4 py-4">
                      <div className="ml-8 space-y-3">
                        <div>
                          <h4 className="text-xs font-medium text-gray-400 uppercase mb-1">Stack Trace</h4>
                          <pre className="text-xs text-gray-300 bg-gray-900 rounded-lg p-3 overflow-x-auto">
                            {error.stack || 'No stack trace available'}
                          </pre>
                        </div>
                        <div className="flex items-center gap-6 text-xs">
                          <div>
                            <span className="text-gray-500">First seen:</span>
                            <span className="ml-2 text-gray-300">{new Date(error.firstSeen).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Last seen:</span>
                            <span className="ml-2 text-gray-300">{new Date(error.lastSeen).toLocaleString()}</span>
                          </div>
                          {error.assignedTo && (
                            <div>
                              <span className="text-gray-500">Assigned to:</span>
                              <span className="ml-2 text-gray-300">{error.assignedTo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>

        {filteredErrors.length === 0 && (
          <div className="py-12 text-center">
            <Bug className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">No errors found</p>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Showing {filteredErrors.length} of {errors.length} errors
        </p>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 disabled:opacity-50">
            Previous
          </button>
          <button className="rounded-lg border border-emerald-500 bg-emerald-500/20 px-3 py-1.5 text-sm text-emerald-400">
            1
          </button>
          <button className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
