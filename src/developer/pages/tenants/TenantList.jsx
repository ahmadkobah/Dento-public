import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  RefreshCw,
  Building2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  MoreVertical,
  Globe,
  Users,
  Package,
  Edit,
  Trash2,
  Ban,
  ExternalLink,
  PlayCircle,
} from 'lucide-react';
import { useDeleteTenant, useUpdateTenant } from '../../hooks/useDevApi';
import { useTenants } from '../../hooks/useDevApi';
import { useToast } from '../../../hooks/useToast';

const statusConfig = {
  active: {
    label: 'Active',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle,
  },
  trial: {
    label: 'Trial',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Clock,
  },
  suspended: {
    label: 'Suspended',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: AlertTriangle,
  },
  expired: {
    label: 'Expired',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: XCircle,
  },
  pending: {
    label: 'Pending',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: Clock,
  },
};

const tierConfig = {
  trial: { label: 'Trial', color: 'text-blue-400' },
  basic: { label: 'Basic', color: 'text-gray-400' },
  starter: { label: 'Starter', color: 'text-gray-400' },
  professional: { label: 'Professional', color: 'text-emerald-400' },
  enterprise: { label: 'Enterprise', color: 'text-purple-400' },
  unlimited: { label: 'Unlimited', color: 'text-amber-400' },
};

export default function TenantList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortBy, _setSortBy] = useState('created_at');
  const [sortOrder, _setSortOrder] = useState('desc');
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const toast = useToast();

  // Mutations
  const { mutateAsync: deleteTenant } = useDeleteTenant();
  const { mutateAsync: updateTenant } = useUpdateTenant();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real tenants from database
  const { data: tenantsData, loading, error, refetch } = useTenants({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery || undefined,
  });

  const tenants = tenantsData?.tenants || [];
  const total = tenantsData?.total || 0;

  // Filter tenants by tier and exclude cancelled by default
  const filteredTenants = tenants.filter((tenant) => {
    const matchesTier = tierFilter === 'all' || tenant.subscription_plans?.slug === tierFilter;
    // Handle cancelled filter: only show cancelled when explicitly selected, hide otherwise
    let matchesStatus = true;
    if (statusFilter === 'all') {
      // When showing all, exclude cancelled
      matchesStatus = tenant.status !== 'cancelled';
    } else if (statusFilter === 'cancelled') {
      // When filtering for cancelled, only show cancelled
      matchesStatus = tenant.status === 'cancelled';
    }
    // For other status filters, server-side filtering handles it
    return matchesTier && matchesStatus;
  });

  // Sort tenants
  const sortedTenants = [...filteredTenants].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  // Stats from real data
  const stats = {
    total: total,
    active: tenants.filter((t) => t.status === 'active').length,
    trial: tenants.filter((t) => t.status === 'trial').length,
    issues: tenants.filter((t) => ['suspended', 'expired'].includes(t.status)).length,
  };

  // Action handlers
  const handleDelete = async (tenant) => {
    if (!confirm(`Are you sure you want to delete "${tenant.name}"? This action cannot be undone.`)) return;
    try {
      await deleteTenant(tenant.id);
      setOpenDropdown(null);
      refetch();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Failed to delete tenant: ' + err.message);
    }
  };

  const handleSuspend = async (tenant) => {
    try {
      await updateTenant(tenant.id, { status: 'suspended' });
      setOpenDropdown(null);
      refetch();
    } catch (err) {
      console.error('Suspend failed:', err);
      toast.error('Failed to suspend tenant: ' + err.message);
    }
  };

  const handleReactivate = async (tenant) => {
    try {
      await updateTenant(tenant.id, { status: 'active' });
      setOpenDropdown(null);
      refetch();
    } catch (err) {
      console.error('Reactivate failed:', err);
      toast.error('Failed to reactivate tenant: ' + err.message);
    }
  };

  const handleImpersonate = (tenant) => {
    // Open tenant's admin in new tab
    window.open(`https://${tenant.slug}.localhost:5173/`, '_blank');
    setOpenDropdown(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
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

  // Map tenant data to expected format
  const mapTenant = (tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    displayName: tenant.display_name || tenant.name,
    ownerEmail: tenant.owner_email,
    status: tenant.status,
    subscriptionTier: tenant.subscription_plans?.slug || 'basic',
    subdomain: `${tenant.slug}.dento.app`,
    customDomain: tenant.domains?.find(d => d.domain_type === 'custom')?.domain || null,
    currentUsers: tenant.current_users_count || tenant.current_users || tenant.tenant_users?.[0]?.count || tenant.tenant_users?.length || 0,
    maxUsers: tenant.max_users || tenant.subscription_plans?.max_users || 5,
    modulesActive: tenant.tenant_modules?.filter(m => m.status === 'active').length || 0,
    errorsLast24h: 0, // Would need to fetch from error_logs
    lastLoginAt: tenant.updated_at,
    createdAt: tenant.created_at,
    trialEndsAt: tenant.trial_ends_at,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenants</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage clinic instances and their subscriptions
          </p>
        </div>
        <Link
          to="/developer/tenants/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Tenant
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-700 p-2">
              <Building2 className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400">Total Tenants</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.active}</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.trial}</p>
              <p className="text-xs text-gray-400">In Trial</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.issues}</p>
              <p className="text-xs text-gray-400">Need Attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenants by name, slug, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Plans</option>
            <option value="trial">Trial</option>
            <option value="basic">Basic</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <button 
          onClick={() => refetch()}
          className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tenant Table */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <p className="mt-4 text-red-400">Failed to load tenants</p>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
            >
              Retry
            </button>
          </div>
        ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Tenant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Plan
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Usage
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Health
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Last Active
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedTenants.map((rawTenant) => {
              const tenant = mapTenant(rawTenant);
              const StatusIcon = statusConfig[tenant.status]?.icon || CheckCircle;
              const usagePercent = tenant.maxUsers > 0 ? Math.round((tenant.currentUsers / tenant.maxUsers) * 100) : 0;

              return (
                <tr
                  key={tenant.id}
                  className="hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold">
                        {tenant.displayName.charAt(0)}
                      </div>
                      <div>
                        <Link
                          to={`/tenants/${tenant.id}`}
                          className="font-medium text-white hover:text-emerald-400 transition-colors"
                        >
                          {tenant.displayName}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{tenant.slug}</span>
                          {tenant.customDomain && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                              <Globe className="h-3 w-3" />
                              {tenant.customDomain}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig[tenant.status]?.color}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusConfig[tenant.status]?.label}
                    </span>
                    {tenant.status === 'trial' && tenant.trialEndsAt && (
                      <p className="mt-1 text-xs text-gray-500">
                        Ends {formatDate(tenant.trialEndsAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`font-medium ${tierConfig[tenant.subscriptionTier]?.color}`}>
                      {tierConfig[tenant.subscriptionTier]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-300">
                          {tenant.currentUsers}/{tenant.maxUsers}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-gray-700">
                          <div
                            className={`h-full rounded-full ${
                              usagePercent > 90
                                ? 'bg-red-500'
                                : usagePercent > 70
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-300">{tenant.modulesActive} modules</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {tenant.errorsLast24h > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        {tenant.errorsLast24h} errors
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle className="h-4 w-4" />
                        Healthy
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-400">
                      {formatDate(tenant.lastLoginAt)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/tenants/${tenant.id}`}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      >
                        View
                      </Link>
                      <div className="relative">
                        <button 
                          onClick={() => setOpenDropdown(openDropdown === tenant.id ? null : tenant.id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {openDropdown === tenant.id && (
                          <div 
                            ref={dropdownRef}
                            className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-700 bg-gray-800 shadow-xl z-[9999]"
                          >
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  navigate(`/developer/tenants/${tenant.id}`);
                                  setOpenDropdown(null);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                              >
                                <Edit className="h-4 w-4" />
                                Edit Tenant
                              </button>
                              <button
                                onClick={() => handleImpersonate(tenant)}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Impersonate
                              </button>
                              {tenant.status === 'suspended' ? (
                                <button
                                  onClick={() => handleReactivate(tenant)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-400 hover:bg-gray-700"
                                >
                                  <PlayCircle className="h-4 w-4" />
                                  Reactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSuspend(tenant)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-amber-400 hover:bg-gray-700"
                                >
                                  <Ban className="h-4 w-4" />
                                  Suspend
                                </button>
                              )}
                              <hr className="my-1 border-gray-700" />
                              <button
                                onClick={() => handleDelete(tenant)}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Tenant
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}

        {!loading && !error && sortedTenants.length === 0 && (
          <div className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">No tenants found</p>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Showing {sortedTenants.length} of {total} tenants
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
