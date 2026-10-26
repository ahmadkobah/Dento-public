import { useState } from 'react';
import { 
  Key, 
  Plus, 
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  AlertTriangle,
  Activity,
  Calendar,
  Server,
  BookOpen
} from 'lucide-react';
import clsx from 'clsx';
import { useApiKeys, useRevokeApiKey, useCreateApiKey } from '../../hooks/useDevApi';
import ApiCatalog from './ApiCatalog';

const ApiKeyList = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('keys');
  
  // Fetch real API keys from database
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const { data: apiKeysData, loading: isLoading, error, refetch } = useApiKeys({
    key_type: filterType !== 'all' ? filterType : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
  });
  
  const { mutate: revokeApiKey, loading: revoking } = useRevokeApiKey();
  const { mutate: _createApiKey, loading: _creating } = useCreateApiKey();

  // eslint-disable-next-line no-unused-vars
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [_visibleKeys, setVisibleKeys] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  const apiKeys = apiKeysData?.apiKeys || [];

  // Map API key data to expected format
  // Issue #44: Note that actual API key is only shown once on creation
  // After creation, only key_prefix and key_hint are available for display
  const mapApiKey = (key) => ({
    id: key.id,
    name: key.name,
    // Actual key is not stored - only hash. We show preview for user reference
    keyHash: key.key_hash, 
    keyPreview: `${key.key_prefix || 'dk_'}****${key.key_hint || '****'}`,
    type: key.key_type || 'live',
    status: key.status,
    permissions: key.scopes || ['read'],
    lastUsed: key.last_used_at,
    createdAt: key.created_at,
    expiresAt: key.expires_at,
    usageCount: key.total_requests || 0,
    ipRestrictions: key.allowed_ips || [],
    revokedAt: key.revoked_at,
    revokedBy: key.revoked_by,
    revokeReason: key.revoked_reason,
    tenantName: key.tenants?.name,
  });

  const _toggleKeyVisibility = (keyId) => {
    setVisibleKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  // Issue #44 Fix: Copy the key preview (identifier) since actual key can't be retrieved
  const copyToClipboard = (keyPreview, keyId) => {
    navigator.clipboard.writeText(keyPreview);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRevokeKey = async (keyId) => {
    try {
      await revokeApiKey(keyId, 'Manually revoked');
      refetch();
      setActiveMenu(null);
    } catch (err) {
      console.error('Failed to revoke key:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLastUsed = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateString);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 mb-2">Failed to load API keys</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">API Keys & Documentation</h1>
          <p className="text-gray-400 mt-1">Manage API keys and explore available endpoints</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-gray-900/50 border border-gray-800 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('keys')}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'keys'
              ? "bg-emerald-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          )}
        >
          <Key className="w-4 h-4" />
          My API Keys
          <span className={clsx(
            "px-2 py-0.5 rounded-full text-xs",
            activeTab === 'keys' ? "bg-white/20" : "bg-gray-700"
          )}>
            {apiKeys.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'catalog'
              ? "bg-emerald-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          )}
        >
          <BookOpen className="w-4 h-4" />
          API Catalog
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'catalog' ? (
        <ApiCatalog />
      ) : (
        <>
          {/* Warning Banner */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium">Keep your API keys secure</p>
                <p className="text-yellow-400/80 text-sm mt-1">
                  Never share your API keys in public repositories, client-side code, or unsecured environments. 
                  Use environment variables and secret management tools.
                </p>
              </div>
            </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Keys</p>
          <p className="text-2xl font-bold text-white mt-1">{apiKeys.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{apiKeys.filter(k => k.status === 'active').length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Live Keys</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{apiKeys.filter(k => k.type === 'live').length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Test Keys</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{apiKeys.filter(k => k.type === 'test').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
        >
          <option value="all">All Types</option>
          <option value="live">Live Keys</option>
          <option value="test">Test Keys</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <Key className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No API keys found</p>
            <p className="text-gray-500 text-sm">Create your first API key to get started</p>
          </div>
        ) : (
        apiKeys.map((rawKey) => {
          const apiKey = mapApiKey(rawKey);
          return (
          <div 
            key={apiKey.id}
            className={clsx(
              'bg-gray-900 border rounded-xl p-5 transition-colors',
              apiKey.status === 'revoked' 
                ? 'border-red-500/20 opacity-75' 
                : 'border-gray-800 hover:border-gray-700'
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <div className={clsx(
                    'p-2 rounded-lg',
                    apiKey.type === 'live' ? 'bg-blue-500/10' : 'bg-purple-500/10'
                  )}>
                    <Key className={clsx(
                      'w-5 h-5',
                      apiKey.type === 'live' ? 'text-blue-400' : 'text-purple-400'
                    )} />
                  </div>
                  <h3 className="font-semibold text-white">{apiKey.name}</h3>
                  <span className={clsx(
                    'px-2 py-0.5 rounded text-xs font-medium uppercase',
                    apiKey.type === 'live' 
                      ? 'bg-blue-500/10 text-blue-400' 
                      : 'bg-purple-500/10 text-purple-400'
                  )}>
                    {apiKey.type}
                  </span>
                  {apiKey.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                      <XCircle className="w-3 h-3" />
                      Revoked
                    </span>
                  )}
                </div>

                {/* API Key Value */}
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 text-sm text-gray-400 font-mono bg-gray-800 px-3 py-2 rounded-lg truncate">
                    {apiKey.keyPreview}
                  </code>
                  <button
                    onClick={() => copyToClipboard(apiKey.keyPreview, apiKey.id)}
                    className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                    disabled={apiKey.status === 'revoked'}
                    title="Copy key identifier"
                  >
                    {copiedKey === apiKey.id ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Permissions */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {apiKey.permissions.map(perm => (
                    <span 
                      key={perm}
                      className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400 capitalize"
                    >
                      <Shield className="w-3 h-3 inline mr-1" />
                      {perm}
                    </span>
                  ))}
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    {apiKey.usageCount.toLocaleString()} requests
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Last used {formatLastUsed(apiKey.lastUsed)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Created {formatDate(apiKey.createdAt)}
                  </span>
                  {apiKey.expiresAt && (
                    <span className={clsx(
                      'flex items-center gap-1.5',
                      new Date(apiKey.expiresAt) < new Date() ? 'text-red-400' : 'text-yellow-400'
                    )}>
                      <AlertTriangle className="w-4 h-4" />
                      Expires {formatDate(apiKey.expiresAt)}
                    </span>
                  )}
                </div>

                {/* IP Restrictions */}
                {apiKey.ipRestrictions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-2">IP Restrictions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {apiKey.ipRestrictions.map(ip => (
                        <span key={ip} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400 font-mono">
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revoke Info */}
                {apiKey.status === 'revoked' && (
                  <div className="mt-3 pt-3 border-t border-red-500/20">
                    <p className="text-sm text-red-400">
                      Revoked on {formatDate(apiKey.revokedAt)} by {apiKey.revokedBy}
                    </p>
                    {apiKey.revokeReason && (
                      <p className="text-sm text-gray-500 mt-1">Reason: {apiKey.revokeReason}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-start gap-2">
                {apiKey.status === 'active' && (
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === apiKey.id ? null : apiKey.id)}
                      className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeMenu === apiKey.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-10">
                        <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors">
                          <RefreshCw className="w-4 h-4" />
                          Regenerate
                        </button>
                        <button
                          onClick={() => handleRevokeKey(apiKey.id)}
                          disabled={revoking}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          {revoking ? 'Revoking...' : 'Revoke Key'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          );
        })
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default ApiKeyList;
