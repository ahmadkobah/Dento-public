import { useState } from 'react';
import { 
  Flag, 
  Search, 
  Plus, 
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Clock,
  User,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Copy,
  MoreVertical,
  Trash2,
  Edit,
  History,
  X,
  Users,
  Building2,
  Target,
  Percent,
  Save
} from 'lucide-react';
import clsx from 'clsx';
import { useFeatureFlags, useUpdateFeatureFlag } from '../../hooks/useDevApi';
import { supabase } from '../../../lib/supabase';

// Map API feature flag data to expected format
const mapFeatureFlag = (flag) => ({
  id: flag.id,
  key: flag.key || flag.flag_key,
  name: flag.name || flag.flag_name,
  description: flag.description || '',
  enabled: flag.enabled ?? flag.is_enabled ?? false,
  category: flag.category || 'features',
  rollout: flag.rollout_percentage ?? flag.rollout ?? 0,
  createdAt: flag.created_at,
  updatedAt: flag.updated_at,
  updatedBy: flag.updated_by || 'System',
  environments: flag.environments || ['development'],
});

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'ui', label: 'UI/UX' },
  { value: 'features', label: 'Features' },
  { value: 'experimental', label: 'Experimental' },
  { value: 'communications', label: 'Communications' },
  { value: 'operations', label: 'Operations' },
  { value: 'i18n', label: 'i18n' },
];

// Create/Edit Feature Flag Modal
const FeatureFlagModal = ({ flag, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: flag?.name || '',
    key: flag?.key || '',
    description: flag?.description || '',
    category: flag?.category || 'features',
    enabled: flag?.enabled || false,
    rollout_percentage: flag?.rollout || 100,
    environments: flag?.environments || ['development'],
    targeting_rules: flag?.targeting_rules || [],
  });

  const [newRule, setNewRule] = useState({ type: 'user_role', operator: 'equals', value: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addTargetingRule = () => {
    if (newRule.value) {
      setFormData(prev => ({
        ...prev,
        targeting_rules: [...prev.targeting_rules, { ...newRule, id: Date.now() }]
      }));
      setNewRule({ type: 'user_role', operator: 'equals', value: '' });
    }
  };

  const removeRule = (ruleId) => {
    setFormData(prev => ({
      ...prev,
      targeting_rules: prev.targeting_rules.filter(r => r.id !== ruleId)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-gray-900 rounded-xl shadow-2xl border border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">
              {flag ? 'Edit Feature Flag' : 'Create Feature Flag'}
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="New Feature"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Key</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={e => setFormData(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="new_feature"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What does this flag control?"
                rows={2}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="features">Features</option>
                  <option value="ui">UI/UX</option>
                  <option value="experimental">Experimental</option>
                  <option value="communications">Communications</option>
                  <option value="operations">Operations</option>
                  <option value="i18n">i18n</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={clsx(
                    'w-full px-4 py-2 rounded-lg border flex items-center justify-center gap-2 transition-colors',
                    formData.enabled 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  )}
                >
                  {formData.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {formData.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Rollout Percentage */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Percent className="w-5 h-5 text-emerald-400" />
                <h3 className="font-medium text-white">Percentage Rollout</h3>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.rollout_percentage}
                  onChange={e => setFormData(prev => ({ ...prev, rollout_percentage: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="w-20">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.rollout_percentage}
                    onChange={e => setFormData(prev => ({ ...prev, rollout_percentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                    className="w-full px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center"
                  />
                </div>
                <span className="text-gray-400">%</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {formData.rollout_percentage}% of users will see this feature when enabled
              </p>
            </div>

            {/* Environments */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Environments</label>
              <div className="flex gap-2">
                {['development', 'staging', 'production'].map(env => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        environments: prev.environments.includes(env)
                          ? prev.environments.filter(e => e !== env)
                          : [...prev.environments, env]
                      }));
                    }}
                    className={clsx(
                      'px-4 py-2 rounded-lg border capitalize transition-colors',
                      formData.environments.includes(env)
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    )}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            {/* Targeting Rules */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-400" />
                <h3 className="font-medium text-white">Targeting Rules</h3>
                <span className="text-xs text-gray-500">(Optional)</span>
              </div>
              
              {/* Existing Rules */}
              {formData.targeting_rules.length > 0 && (
                <div className="space-y-2 mb-4">
                  {formData.targeting_rules.map((rule, index) => (
                    <div key={rule.id} className="flex items-center gap-2 bg-gray-900 rounded-lg p-3">
                      <span className="text-xs text-gray-500 w-6">{index > 0 ? 'AND' : 'IF'}</span>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                        {rule.type.replace('_', ' ')}
                      </span>
                      <span className="text-gray-400 text-sm">{rule.operator}</span>
                      <span className="px-2 py-1 bg-gray-700 rounded text-white text-sm font-mono">
                        {rule.value}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeRule(rule.id)}
                        className="ml-auto p-1 text-gray-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Rule */}
              <div className="flex items-center gap-2">
                <select
                  value={newRule.type}
                  onChange={e => setNewRule(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                >
                  <option value="user_role">User Role</option>
                  <option value="tenant_id">Tenant ID</option>
                  <option value="user_id">User ID</option>
                  <option value="email_domain">Email Domain</option>
                  <option value="country">Country</option>
                </select>
                <select
                  value={newRule.operator}
                  onChange={e => setNewRule(prev => ({ ...prev, operator: e.target.value }))}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                  <option value="in_list">in list</option>
                </select>
                <input
                  type="text"
                  value={newRule.value}
                  onChange={e => setNewRule(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                />
                <button
                  type="button"
                  onClick={addTargetingRule}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Rules are evaluated in order. Users matching ALL rules will see the feature.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {flag ? 'Update Flag' : 'Create Flag'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const FeatureFlagList = () => {
  const { data: flagsData, loading: isLoading, error: _error, refetch } = useFeatureFlags();
  const { mutate: updateFlag } = useUpdateFeatureFlag();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const flags = (flagsData?.flags || flagsData || []).map(mapFeatureFlag);

  const filteredFlags = flags.filter(flag => {
    const matchesSearch = flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         flag.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || flag.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'enabled' && flag.enabled) ||
                         (statusFilter === 'disabled' && !flag.enabled);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const toggleFlag = async (flagId) => {
    const flag = flags.find(f => f.id === flagId);
    if (flag) {
      try {
        await updateFlag(flagId, { enabled: !flag.enabled });
        refetch();
      } catch (err) {
        console.error('Failed to toggle flag:', err);
      }
    }
  };

  const copyToClipboard = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveFlag = async (formData) => {
    try {
      if (editingFlag) {
        await updateFlag(editingFlag.id, formData);
      } else {
        const { error } = await supabase
          .from('feature_flags')
          .insert({ ...formData, tenant_id: null });
        if (error) throw error;
      }
      refetch();
      setShowCreateModal(false);
      setEditingFlag(null);
    } catch (err) {
      console.error('Failed to save flag:', err);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'ui': return 'text-purple-400 bg-purple-500/10';
      case 'features': return 'text-blue-400 bg-blue-500/10';
      case 'experimental': return 'text-orange-400 bg-orange-500/10';
      case 'communications': return 'text-green-400 bg-green-500/10';
      case 'operations': return 'text-yellow-400 bg-yellow-500/10';
      case 'i18n': return 'text-pink-400 bg-pink-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getEnvironmentBadge = (env) => {
    switch (env) {
      case 'production': return 'bg-emerald-500/10 text-emerald-400';
      case 'staging': return 'bg-yellow-500/10 text-yellow-400';
      case 'development': return 'bg-blue-500/10 text-blue-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
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
          <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
          <p className="text-gray-400 mt-1">Control feature availability across environments</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Flag
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Flags</p>
          <p className="text-2xl font-bold text-white mt-1">{flags.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Enabled</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{flags.filter(f => f.enabled).length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Disabled</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{flags.filter(f => !f.enabled).length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">In Production</p>
          <p className="text-2xl font-bold text-white mt-1">
            {flags.filter(f => f.environments.includes('production') && f.enabled).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search flags by name or key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
        >
          <option value="all">All Status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Feature Flag List */}
      <div className="space-y-4">
        {filteredFlags.map((flag) => (
          <div 
            key={flag.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-4">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleFlag(flag.id)}
                    className={clsx(
                      'flex-shrink-0 mt-1 transition-colors',
                      flag.enabled ? 'text-emerald-400' : 'text-gray-600'
                    )}
                  >
                    {flag.enabled ? (
                      <ToggleRight className="w-10 h-6" />
                    ) : (
                      <ToggleLeft className="w-10 h-6" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-white">{flag.name}</h3>
                      <span className={clsx(
                        'px-2 py-0.5 rounded text-xs font-medium capitalize',
                        getCategoryColor(flag.category)
                      )}>
                        {flag.category}
                      </span>
                      {flag.category === 'experimental' && (
                        <span className="flex items-center gap-1 text-xs text-yellow-400">
                          <AlertTriangle className="w-3 h-3" />
                          Experimental
                        </span>
                      )}
                    </div>

                    {/* Key */}
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-sm text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">
                        {flag.key}
                      </code>
                      <button
                        onClick={() => copyToClipboard(flag.key)}
                        className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {copiedKey === flag.key ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-gray-400 text-sm mt-2">{flag.description}</p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        Updated {flag.updatedAt}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        {flag.updatedBy}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side */}
              <div className="flex flex-col items-end gap-3">
                {/* Menu */}
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === flag.id ? null : flag.id)}
                    className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {activeMenu === flag.id && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-10">
                      <button 
                        onClick={() => { setEditingFlag(flag); setActiveMenu(null); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Flag
                      </button>
                      <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors">
                        <History className="w-4 h-4" />
                        View History
                      </button>
                      <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Rollout Percentage */}
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Rollout</p>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={clsx(
                          'h-full rounded-full transition-all',
                          flag.enabled ? 'bg-emerald-500' : 'bg-gray-600'
                        )}
                        style={{ width: `${flag.rollout}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400">{flag.rollout}%</span>
                  </div>
                </div>

                {/* Environments */}
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {flag.environments.map(env => (
                    <span 
                      key={env}
                      className={clsx(
                        'px-2 py-0.5 rounded text-xs font-medium capitalize',
                        getEnvironmentBadge(env)
                      )}
                    >
                      {env}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredFlags.length === 0 && (
        <div className="text-center py-12">
          <Flag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No feature flags found matching your criteria</p>
          <button
            onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setStatusFilter('all'); }}
            className="mt-4 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Usage Hint */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-gray-300 text-sm font-medium">How to use feature flags in code:</p>
            <pre className="mt-2 text-sm text-gray-400 font-mono bg-gray-800 rounded-lg p-3 overflow-x-auto">
{`// Check if a feature flag is enabled
const isEnabled = await featureFlags.isEnabled('dark_mode_v2');

if (isEnabled) {
  // New feature code
} else {
  // Fallback code
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingFlag) && (
        <FeatureFlagModal
          flag={editingFlag}
          onClose={() => { setShowCreateModal(false); setEditingFlag(null); }}
          onSave={handleSaveFlag}
        />
      )}
    </div>
  );
};

export default FeatureFlagList;
