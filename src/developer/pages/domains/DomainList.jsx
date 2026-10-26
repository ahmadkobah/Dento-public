import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Plus,
  ShieldCheck,
  Link as LinkIcon,
  Trash2,
  Pencil,
  Eye,
  ChevronDown,
  X,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useDomains, useDomainStats, useCreateDomain, useUpdateDomain, useDeleteDomain, useVerifyDns, useTenants } from '../../hooks/useDevApi';

// Map API domain data to expected format
const mapDomain = (d) => {
  // Edge function returns tenants as a joined object: { id, name, slug }
  const tenantName = d.tenants?.name || d.tenant_name || 'Unknown';
  const isCustom = d.domain_type === 'custom' || d.domain_type === 'primary' || d.domain_type === 'alias';

  // Build DNS records from individual columns if not already an array
  let dnsRecords = d.dns_records || null;
  if (!dnsRecords && d.dns_verification_token) {
    dnsRecords = [
      {
        type: 'TXT',
        name: `_dento-verify.${d.domain}`,
        value: d.dns_verification_token,
        status: d.dns_verified ? 'verified' : 'pending',
      },
      {
        type: d.dns_record_type || 'CNAME',
        name: d.domain,
        value: d.dns_record_value || 'cname.vercel-dns.com',
        status: d.dns_verified ? 'verified' : 'pending',
      },
    ];
  }

  return {
    id: d.id,
    domain: d.domain,
    type: isCustom ? 'custom' : 'subdomain',
    tenant: tenantName,
    tenantId: d.tenant_id,
    status: d.is_active ? 'active' : d.dns_verified ? 'inactive' : 'pending',
    sslStatus: d.ssl_status || 'pending',
    sslExpiry: d.ssl_expires_at,
    dnsStatus: d.dns_verified ? 'verified' : 'pending',
    isPrimary: d.is_primary || false,
    createdAt: d.created_at,
    dnsRecords,
    notes: d.metadata?.notes || null,
  };
};

const statusConfig = {
  active: { label: 'Active', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
  inactive: { label: 'Inactive', color: 'bg-gray-500/20 text-gray-400', icon: XCircle },
  error: { label: 'Error', color: 'bg-red-500/20 text-red-400', icon: XCircle },
};

const sslStatusConfig = {
  active: { label: 'Active', color: 'text-emerald-400' },
  valid: { label: 'Valid', color: 'text-emerald-400' },
  provisioning: { label: 'Provisioning', color: 'text-blue-400' },
  requesting: { label: 'Requesting', color: 'text-blue-400' },
  expiring_soon: { label: 'Expiring Soon', color: 'text-amber-400' },
  expired: { label: 'Expired', color: 'text-red-400' },
  pending: { label: 'Pending', color: 'text-gray-400' },
  none: { label: 'None', color: 'text-gray-500' },
  failed: { label: 'Failed', color: 'text-red-400' },
};

const dnsStatusConfig = {
  verified: { label: 'Verified', color: 'text-emerald-400' },
  pending: { label: 'Pending', color: 'text-amber-400' },
  failed: { label: 'Failed', color: 'text-red-400' },
};

export default function DomainList() {
  const { data: domainsData, loading, _error, refetch } = useDomains();
  const { data: statsData, refetch: refetchStats } = useDomainStats();
  const { data: tenantsData } = useTenants();
  const { mutateAsync: createDomain, loading: creating } = useCreateDomain();
  const { mutateAsync: updateDomain, loading: updating } = useUpdateDomain();
  const { mutateAsync: deleteDomain } = useDeleteDomain();
  const { mutateAsync: verifyDns } = useVerifyDns();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [expandedDomain, setExpandedDomain] = useState(null);

  // Form state for Add Domain modal
  const [newDomain, setNewDomain] = useState({ domain: '', tenant_id: '', domain_type: 'custom', is_primary: false });
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');

  const domains = (domainsData?.domains || []).map(mapDomain);
  const tenants = tenantsData?.tenants || [];

  // Stats from API or computed locally
  const stats = statsData?.stats || {};
  const totalDomains = stats.total || domains.length;
  const customDomains = stats.custom || domains.filter((d) => d.type === 'custom').length;
  const expiringSSL = stats.sslExpiring || domains.filter(
    (d) => d.sslStatus === 'expiring_soon' || d.sslStatus === 'expired'
  ).length;
  const pendingDomains = stats.pendingDns || domains.filter((d) => d.status === 'pending').length;

  // Filter domains
  const filteredDomains = domains.filter((domain) => {
    const matchesSearch =
      domain.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      domain.tenant.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || domain.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || domain.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedDomains.length === filteredDomains.length) {
      setSelectedDomains([]);
    } else {
      setSelectedDomains(filteredDomains.map((d) => d.id));
    }
  };

  const handleSelectDomain = (id) => {
    setSelectedDomains((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRefresh = () => {
    refetch();
    refetchStats();
  };

  const handleAddDomain = async () => {
    setAddError('');
    if (!newDomain.domain.trim()) {
      setAddError('Domain name is required');
      return;
    }
    if (!newDomain.tenant_id) {
      setAddError('Please select a tenant');
      return;
    }
    try {
      await createDomain(newDomain);
      setShowAddModal(false);
      setNewDomain({ domain: '', tenant_id: '', domain_type: 'custom', is_primary: false });
      handleRefresh();
    } catch (err) {
      setAddError(err.message || 'Failed to add domain');
    }
  };

  const handleDeleteDomain = async (id) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;
    try {
      await deleteDomain(id);
      handleRefresh();
    } catch (err) {
      console.error('Failed to delete domain:', err);
    }
  };

  const handleVerifyDns = async (id) => {
    try {
      await verifyDns(id);
      handleRefresh();
    } catch (err) {
      console.error('Failed to verify DNS:', err);
    }
  };

  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleEditDomain = (domain) => {
    // Find the raw domain data to get all fields
    const raw = (domainsData?.domains || []).find((d) => d.id === domain.id);
    setEditingDomain({
      id: domain.id,
      domain: domain.domain,
      originalDomain: domain.domain,
      is_primary: domain.isPrimary,
      is_active: domain.status === 'active',
      domain_type: raw?.domain_type || (domain.type === 'custom' ? 'custom' : 'subdomain'),
      originalType: raw?.domain_type || (domain.type === 'custom' ? 'custom' : 'subdomain'),
      tenant_id: domain.tenantId,
      tenant_name: domain.tenant,
      force_https: raw?.force_https ?? true,
      dns_verified: raw?.dns_verified || false,
      ssl_status: raw?.ssl_status || 'pending',
      dns_verification_token: raw?.dns_verification_token,
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setEditError('');
    if (!editingDomain) return;
    if (!editingDomain.domain.trim()) {
      setEditError('Domain name is required');
      return;
    }
    try {
      const typeChanged = editingDomain.domain_type !== editingDomain.originalType;
      const switchingToCustom = typeChanged && editingDomain.domain_type === 'custom';
      const switchingToSubdomain = typeChanged && editingDomain.domain_type === 'subdomain';

      const updates = {
        domain: editingDomain.domain,
        domain_type: editingDomain.domain_type,
        is_primary: editingDomain.is_primary,
        is_active: switchingToCustom ? false : editingDomain.is_active,
        force_https: editingDomain.force_https,
      };

      // When switching to custom, mark as needing DNS setup
      if (switchingToCustom) {
        updates.dns_verified = false;
        updates.ssl_status = 'pending';
        updates.needs_dns_setup = true; // Signal to backend
      }

      // When switching to subdomain, auto-verify
      if (switchingToSubdomain) {
        updates.dns_verified = true;
        updates.ssl_status = 'active';
        updates.is_active = true;
      }

      const _result = await updateDomain(editingDomain.id, updates);

      // If switched to custom, auto-expand to show DNS instructions
      if (switchingToCustom) {
        setExpandedDomain(editingDomain.id);
      }

      setShowEditModal(false);
      setEditingDomain(null);
      handleRefresh();
    } catch (err) {
      setEditError(err.message || 'Failed to update domain');
    }
  };

  // Generate preview subdomain from tenant slug
  const generatePreviewDomain = () => {
    const tenant = tenants.find((t) => t.id === newDomain.tenant_id);
    if (tenant) {
      setNewDomain((prev) => ({
        ...prev,
        domain: `${tenant.slug}.dento.app`,
        domain_type: 'subdomain',
      }));
    }
  };

  const daysUntil = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Custom Domains</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage custom domains and SSL certificates for tenant portals
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Total Domains</p>
            <Globe className="h-5 w-5 text-gray-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{totalDomains}</p>
          <p className="mt-1 text-xs text-gray-500">Across all tenants</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Custom Domains</p>
            <LinkIcon className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{customDomains}</p>
          <p className="mt-1 text-xs text-gray-500">Client-owned domains</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">SSL Alerts</p>
            <ShieldCheck className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-400">{expiringSSL}</p>
          <p className="mt-1 text-xs text-amber-500">Expiring or expired</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Pending Setup</p>
            <Clock className="h-5 w-5 text-gray-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{pendingDomains}</p>
          <p className="mt-1 text-xs text-gray-500">Awaiting DNS verification</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search domains or tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-600 bg-gray-800 py-2 pl-4 pr-10 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="custom">Custom Domain</option>
            <option value="subdomain">Subdomain</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-600 bg-gray-800 py-2 pl-4 pr-10 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedDomains.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <span className="text-sm text-emerald-400">
            {selectedDomains.length} domain(s) selected
          </span>
          <button className="text-sm text-red-400 hover:text-red-300">Remove Selected</button>
          <button className="text-sm text-blue-400 hover:text-blue-300">Renew SSL</button>
        </div>
      )}

      {/* Domains Table */}
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr className="border-b border-gray-700">
              <th className="w-10 py-3 px-4">
                <input
                  type="checkbox"
                  checked={selectedDomains.length === filteredDomains.length && filteredDomains.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                />
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Domain
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Tenant
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                SSL
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                DNS
              </th>
              <th className="py-3 px-4 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredDomains.map((domain) => {
              const StatusIcon = statusConfig[domain.status].icon;
              const sslDays = daysUntil(domain.sslExpiry);
              const isExpanded = expandedDomain === domain.id;

              return (
                <>
                  <tr
                    key={domain.id}
                    className={`group hover:bg-gray-800/80 transition-colors ${
                      isExpanded ? 'bg-gray-800/80' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedDomains.includes(domain.id)}
                        onChange={() => handleSelectDomain(domain.id)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-white">{domain.domain}</p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs ${
                                domain.type === 'custom' ? 'text-blue-400' : 'text-gray-500'
                              }`}
                            >
                              {domain.type === 'custom' ? 'Custom' : 'Subdomain'}
                            </span>
                            {domain.isPrimary && (
                              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
                                Primary
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/tenants/${domain.tenantId}`}
                        className="text-white hover:text-emerald-400"
                      >
                        {domain.tenant}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
                          statusConfig[domain.status].color
                        }`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusConfig[domain.status].label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className={`text-sm ${sslStatusConfig[domain.sslStatus].color}`}>
                          {sslStatusConfig[domain.sslStatus].label}
                        </span>
                        {sslDays !== null && (
                          <p className="text-xs text-gray-500">
                            {sslDays > 0 ? `${sslDays} days` : 'Expired'}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm ${dnsStatusConfig[domain.dnsStatus].color}`}>
                        {dnsStatusConfig[domain.dnsStatus].label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setExpandedDomain(isExpanded ? null : domain.id)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title="Edit"
                          onClick={() => handleEditDomain(domain)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Remove"
                          onClick={() => handleDeleteDomain(domain.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="bg-gray-900/50 px-4 py-4">
                        <div className="space-y-4">
                          {/* Workflow Status Indicator */}
                          <div className="flex items-center gap-2">
                            {[
                              { key: 'setup', label: 'Setup', done: true },
                              { key: 'dns', label: 'DNS', done: domain.dnsStatus === 'verified' },
                              { key: 'ssl', label: 'SSL', done: domain.sslStatus === 'active' || domain.sslStatus === 'valid' },
                              { key: 'live', label: 'Live', done: domain.status === 'active' },
                            ].map((step, idx, arr) => (
                              <div key={step.key} className="flex items-center gap-2">
                                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                  step.done
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : idx === arr.findIndex(s => !s.done)
                                      ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                                      : 'bg-gray-700/50 text-gray-500'
                                }`}>
                                  {step.done ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 flex items-center justify-center text-[10px]">{idx + 1}</span>}
                                  {step.label}
                                </div>
                                {idx < arr.length - 1 && (
                                  <ArrowRight className={`h-3 w-3 ${step.done ? 'text-emerald-500/50' : 'text-gray-600'}`} />
                                )}
                              </div>
                            ))}
                          </div>

                          {domain.dnsRecords && (
                            <div>
                              <h4 className="text-sm font-medium text-white mb-2">
                                DNS Records to Configure
                              </h4>
                              <div className="rounded-lg border border-gray-700 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-800">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-gray-400">Type</th>
                                      <th className="px-4 py-2 text-left text-gray-400">Name</th>
                                      <th className="px-4 py-2 text-left text-gray-400">Value</th>
                                      <th className="px-4 py-2 text-left text-gray-400">Status</th>
                                      <th className="px-4 py-2 text-right text-gray-400">Copy</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-700">
                                    {domain.dnsRecords.map((record, idx) => (
                                      <tr key={idx}>
                                        <td className="px-4 py-2 font-mono text-blue-400">
                                          {record.type}
                                        </td>
                                        <td className="px-4 py-2 font-mono text-white">
                                          {record.name}
                                        </td>
                                        <td className="px-4 py-2 font-mono text-gray-300 max-w-[200px] truncate">
                                          {record.value}
                                        </td>
                                        <td className="px-4 py-2">
                                          <span
                                            className={`text-xs ${
                                              dnsStatusConfig[record.status]?.color || 'text-gray-400'
                                            }`}
                                          >
                                            {dnsStatusConfig[record.status]?.label || record.status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                          <button
                                            onClick={() => copyToClipboard(record.value, `${domain.id}-${idx}`)}
                                            className="p-1 text-gray-400 hover:text-white transition-colors"
                                            title="Copy value"
                                          >
                                            {copiedField === `${domain.id}-${idx}` ? (
                                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                                            ) : (
                                              <Copy className="h-3.5 w-3.5" />
                                            )}
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {/* Action buttons based on workflow state */}
                              <div className="mt-3 flex items-center gap-3">
                                {domain.dnsStatus !== 'verified' && (
                                  <button
                                    onClick={() => handleVerifyDns(domain.id)}
                                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Verify DNS Records
                                  </button>
                                )}
                                {domain.dnsStatus === 'verified' && (domain.sslStatus === 'pending' || domain.sslStatus === 'none') && (
                                  <span className="inline-flex items-center gap-2 text-sm text-amber-400">
                                    <Shield className="h-4 w-4" />
                                    SSL provisioning will start automatically after DNS verification
                                  </span>
                                )}
                                {domain.dnsStatus === 'verified' && (domain.sslStatus === 'active' || domain.sslStatus === 'valid') && domain.status !== 'active' && (
                                  <span className="inline-flex items-center gap-2 text-sm text-emerald-400">
                                    <Check className="h-4 w-4" />
                                    Domain ready — activate it using the Edit button
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* No DNS records needed for subdomains */}
                          {!domain.dnsRecords && domain.type === 'subdomain' && (
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
                              <p className="font-medium">Preview Subdomain — No DNS Setup Required</p>
                              <p className="mt-1 text-xs text-emerald-500">This subdomain works instantly for previewing the website.</p>
                            </div>
                          )}

                          {domain.notes && (
                            <div className="rounded-lg bg-gray-800 px-4 py-3 text-sm text-gray-400">
                              <strong className="text-white">Note:</strong> {domain.notes}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Created: {new Date(domain.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {filteredDomains.length === 0 && !loading && (
          <div className="py-12 text-center">
            <Globe className="mx-auto h-12 w-12 text-gray-600" />
            <p className="mt-2 text-gray-400">No domains found</p>
            <p className="text-sm text-gray-500">
              {domains.length === 0
                ? 'Add your first domain to get started'
                : 'Try adjusting your search or filters'}
            </p>
            {domains.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Domain
              </button>
            )}
          </div>
        )}

        {loading && (
          <div className="py-12 text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-gray-500 animate-spin" />
            <p className="mt-2 text-gray-400">Loading domains...</p>
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Add Domain</h2>
              <button
                onClick={() => { setShowAddModal(false); setAddError(''); }}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {addError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {addError}
                </div>
              )}

              {/* Tenant Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Tenant</label>
                <select
                  value={newDomain.tenant_id}
                  onChange={(e) => setNewDomain((prev) => ({ ...prev, tenant_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2.5 px-4 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select a tenant...</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </option>
                  ))}
                </select>
              </div>

              {/* Domain Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Domain Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewDomain((prev) => ({ ...prev, domain_type: 'subdomain', domain: '' }))}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      newDomain.domain_type === 'subdomain'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-sm">Preview Subdomain</p>
                    <p className="text-xs mt-1 opacity-75">slug.dento.app — instant, no DNS needed</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDomain((prev) => ({ ...prev, domain_type: 'custom', domain: '' }))}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      newDomain.domain_type === 'custom'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-sm">Custom Domain</p>
                    <p className="text-xs mt-1 opacity-75">yourdomain.com — requires DNS setup</p>
                  </button>
                </div>
              </div>

              {/* Domain Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Domain Name</label>
                {newDomain.domain_type === 'subdomain' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter domain or generate from tenant"
                      value={newDomain.domain}
                      onChange={(e) => setNewDomain((prev) => ({ ...prev, domain: e.target.value }))}
                      className="flex-1 rounded-lg border border-gray-600 bg-gray-800 py-2.5 px-4 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={generatePreviewDomain}
                      disabled={!newDomain.tenant_id}
                      className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-emerald-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      Auto-fill
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. clinic.example.com"
                    value={newDomain.domain}
                    onChange={(e) => setNewDomain((prev) => ({ ...prev, domain: e.target.value }))}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2.5 px-4 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Primary toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDomain.is_primary}
                  onChange={(e) => setNewDomain((prev) => ({ ...prev, is_primary: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-sm text-white">Set as primary domain</p>
                  <p className="text-xs text-gray-500">This will be the main URL for the tenant website</p>
                </div>
              </label>

              {newDomain.domain_type === 'custom' && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                  <p className="font-medium">DNS Configuration Required</p>
                  <p className="mt-1 text-xs text-amber-400">
                    After adding the domain, you&apos;ll need to configure DNS records to point to our servers.
                    Verification instructions will be shown after creation.
                  </p>
                </div>
              )}

              {newDomain.domain_type === 'subdomain' && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  <p className="font-medium">Instant Preview</p>
                  <p className="mt-1 text-xs text-emerald-400">
                    Preview subdomains work immediately — no DNS configuration needed.
                    Use this to review the website before setting up a custom domain.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={() => { setShowAddModal(false); setAddError(''); }}
                className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDomain}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Domain
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Domain Modal */}
      {showEditModal && editingDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Edit Domain</h2>
              <button
                onClick={() => { setShowEditModal(false); setEditingDomain(null); setEditError(''); }}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {editError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {editError}
                </div>
              )}

              {/* Tenant (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Tenant</label>
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 py-2.5 px-4 text-gray-400 text-sm">
                  {editingDomain.tenant_name}
                </div>
              </div>

              {/* Domain Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Domain Name</label>
                {editingDomain.domain_type === 'subdomain' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="slug.dento.app"
                      value={editingDomain.domain}
                      onChange={(e) => setEditingDomain((prev) => ({ ...prev, domain: e.target.value }))}
                      className="flex-1 rounded-lg border border-gray-600 bg-gray-800 py-2.5 px-4 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const t = tenants.find((t) => t.id === editingDomain.tenant_id);
                        if (t) setEditingDomain((prev) => ({ ...prev, domain: `${t.slug}.dento.app` }));
                      }}
                      className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-emerald-400 hover:bg-gray-700 transition-colors whitespace-nowrap"
                    >
                      Auto-fill
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. clinic.example.com"
                    value={editingDomain.domain}
                    onChange={(e) => setEditingDomain((prev) => ({ ...prev, domain: e.target.value }))}
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 py-2.5 px-4 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Domain Type (switchable) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDomain((prev) => ({
                        ...prev,
                        domain_type: 'subdomain',
                        domain: prev.originalType === 'subdomain' ? prev.originalDomain : '',
                      }));
                    }}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      editingDomain.domain_type === 'subdomain'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-sm">Preview Subdomain</p>
                    <p className="text-xs mt-1 opacity-75">slug.dento.app — instant</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDomain((prev) => ({
                        ...prev,
                        domain_type: 'custom',
                        domain: prev.originalType === 'custom' ? prev.originalDomain : '',
                      }));
                    }}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      editingDomain.domain_type === 'custom'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-sm">Custom Domain</p>
                    <p className="text-xs mt-1 opacity-75">yourdomain.com — DNS setup</p>
                  </button>
                </div>
              </div>

              {/* Type-switch info banners */}
              {editingDomain.domain_type !== editingDomain.originalType && editingDomain.domain_type === 'custom' && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <p className="text-sm font-medium text-amber-300">Switching to Custom Domain</p>
                  <div className="mt-2 space-y-1 text-xs text-amber-400">
                    <p className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3" /> Domain will be deactivated until DNS is verified</p>
                    <p className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3" /> You&apos;ll need to configure DNS records at your registrar</p>
                    <p className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3" /> SSL certificate will be provisioned after DNS verification</p>
                  </div>
                </div>
              )}
              {editingDomain.domain_type !== editingDomain.originalType && editingDomain.domain_type === 'subdomain' && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-300">Switching to Preview Subdomain</p>
                  <p className="mt-1 text-xs text-emerald-400">Domain will be instantly active — no DNS setup required.</p>
                </div>
              )}

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Active</p>
                    <p className="text-xs text-gray-500">Domain is live and resolves to the website</p>
                  </div>
                  <div
                    onClick={() => setEditingDomain((prev) => ({ ...prev, is_active: !prev.is_active }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      editingDomain.is_active ? 'bg-emerald-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                        editingDomain.is_active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Primary Domain</p>
                    <p className="text-xs text-gray-500">Main URL used for this tenant</p>
                  </div>
                  <div
                    onClick={() => setEditingDomain((prev) => ({ ...prev, is_primary: !prev.is_primary }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      editingDomain.is_primary ? 'bg-emerald-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                        editingDomain.is_primary ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">Force HTTPS</p>
                    <p className="text-xs text-gray-500">Redirect HTTP requests to HTTPS</p>
                  </div>
                  <div
                    onClick={() => setEditingDomain((prev) => ({ ...prev, force_https: !prev.force_https }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      editingDomain.force_https ? 'bg-emerald-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                        editingDomain.force_https ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                onClick={() => { setShowEditModal(false); setEditingDomain(null); setEditError(''); }}
                className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updating}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
