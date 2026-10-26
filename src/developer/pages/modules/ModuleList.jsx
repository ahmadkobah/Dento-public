import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Boxes, 
  Search, 
  Plus, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Settings,
  Trash2,
  Eye,
  Power,
  Package,
  Filter,
  LayoutGrid,
  List,
  AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { useModules } from '../../hooks/useDevApi';
import { moduleApi } from '../../services/devApi';
import { useToast } from '../../../hooks/useToast';

// Module icons mapping (matches actual DB slugs)
const moduleIcons = {
  'core-scheduling': '📅',
  'patient-records': '🏥',
  'basic-billing': '💳',
  'dental-charting': '🦷',
  inventory: '📦',
  'dental-tourism': '✈️',
  'hr-management': '👥',
  'multi-branch': '🏢',
  'advanced-analytics': '📊',
  'api-access': '🔌',
  'white-label': '🏷️',
  website: '🌐',
  backup: '💾',
  core: '⚙️',
};

// Map API module data to expected format
const mapModule = (module) => {
  const name = module.name_en || module.name || 'Unknown Module';
  const description = module.description_en || module.description || 'No description available';
  return {
    id: module.id,
    name,
    slug: module.slug || name.toLowerCase().replace(/\s+/g, '-'),
    description,
    version: module.version || '1.0.0',
    status: module.status === 'active' || module.is_active !== false ? 'active' : 'inactive',
    category: module.category || 'operations',
    dependencies: module.depends_on || module.dependencies || ['core'],
    installedAt: module.created_at,
    updatedAt: module.updated_at,
    icon: moduleIcons[module.slug] || '📦',
    isFree: module.is_free || false,
    price: module.base_price_monthly || 0,
  };
};

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'core', label: 'Core' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'financial', label: 'Financial' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'integration', label: 'Integration' },
];

const ModuleList = () => {
  const { data: modulesData, loading: isLoading, error, refetch } = useModules();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [activeMenu, setActiveMenu] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState(null);
  const [installForm, setInstallForm] = useState({
    slug: '',
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    category: 'core',
    version: '1.0.0',
    is_free: true,
    base_price_monthly: 0,
    base_price_yearly: 0,
    min_tier: 'basic',
    status: 'active',
    is_visible: true,
  });

  // Safely map modules, ensuring we have an array
  const modulesArray = Array.isArray(modulesData?.modules) ? modulesData.modules : 
                       Array.isArray(modulesData) ? modulesData : [];
  const modules = modulesArray.map(mapModule);

  const filteredModules = modules.filter(module => {
    const matchesSearch = (module.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (module.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || module.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || module.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const toggleModuleStatus = async (moduleId) => {
    try {
      const module = modules.find(m => m.id === moduleId);
      const newStatus = module?.status === 'active' ? 'inactive' : 'active';
      await moduleApi.update(moduleId, { status: newStatus });
      toast.success(`Module ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      refetch();
    } catch (err) {
      toast.error(`Failed to toggle module: ${err.message}`);
    } finally {
      setActiveMenu(null);
    }
  };

  const handleInstallModule = async (e) => {
    e.preventDefault();
    if (!installForm.slug || !installForm.name_en) return;
    setIsInstalling(true);
    setInstallError(null);
    try {
      await moduleApi.create({
        ...installForm,
        base_price_monthly: installForm.is_free ? 0 : parseFloat(installForm.base_price_monthly) || 0,
        base_price_yearly: installForm.is_free ? 0 : parseFloat(installForm.base_price_yearly) || 0,
      });
      setShowInstallModal(false);
      setInstallForm({
        slug: '', name_en: '', name_ar: '', description_en: '', description_ar: '',
        category: 'core', version: '1.0.0', is_free: true,
        base_price_monthly: 0, base_price_yearly: 0, min_tier: 'basic',
        status: 'active', is_visible: true,
      });
      refetch();
    } catch (err) {
      setInstallError(err.message || 'Failed to create module');
    } finally {
      setIsInstalling(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
            <XCircle className="w-3 h-3" />
            Inactive
          </span>
        );
      default:
        return null;
    }
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
      <div className="flex flex-col items-center justify-center h-64">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-red-400 mb-4">Error loading modules: {error}</p>
        <button onClick={refetch} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
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
          <h1 className="text-2xl font-bold text-white">Modules</h1>
          <p className="text-gray-400 mt-1">Manage and configure system modules</p>
        </div>
        <div className="flex gap-3">
          <button onClick={refetch} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={() => setShowInstallModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
            <Plus className="w-4 h-4" />
            Install Module
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search modules..."
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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={clsx(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid' ? 'bg-gray-700 text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'p-2 rounded-md transition-colors',
              viewMode === 'list' ? 'bg-gray-700 text-emerald-400' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Modules</p>
          <p className="text-2xl font-bold text-white mt-1">{modules.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Active</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{modules.filter(m => m.status === 'active').length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Inactive</p>
          <p className="text-2xl font-bold text-gray-400 mt-1">{modules.filter(m => m.status === 'inactive').length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Categories</p>
          <p className="text-2xl font-bold text-white mt-1">{new Set(modules.map(m => m.category)).size}</p>
        </div>
      </div>

      {/* Module Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map((module) => (
            <div 
              key={module.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors relative group"
            >
              {/* Menu */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setActiveMenu(activeMenu === module.id ? null : module.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {activeMenu === module.id && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-10">
                    <Link
                      to={`/modules/${module.slug}`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </Link>
                    <Link
                      to={`/modules/${module.slug}/settings`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Configure
                    </Link>
                    <button
                      onClick={() => toggleModuleStatus(module.id)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                    >
                      <Power className="w-4 h-4" />
                      {module.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors">
                      <Trash2 className="w-4 h-4" />
                      Uninstall
                    </button>
                  </div>
                )}
              </div>

              {/* Icon & Title */}
              <div className="flex items-start gap-3 mb-4">
                <div className="text-3xl">{module.icon}</div>
                <div>
                  <h3 className="font-semibold text-white">{module.name}</h3>
                  <p className="text-xs text-gray-500">v{module.version}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">{module.description}</p>

              {/* Status & Category & Price */}
              <div className="flex items-center justify-between">
                {getStatusBadge(module.status)}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-400">
                    {module.isFree ? 'Free' : `$${module.price}/mo`}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{module.category.replace('-', ' ')}</span>
                </div>
              </div>

              {/* Dependencies */}
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">Dependencies</p>
                <div className="flex flex-wrap gap-1">
                  {module.dependencies.map(dep => (
                    <span key={dep} className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Module</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Category</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Version</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredModules.map((module) => (
                <tr key={module.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{module.icon}</span>
                      <div>
                        <p className="font-medium text-white">{module.name}</p>
                        <p className="text-sm text-gray-500 line-clamp-1">{module.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className="text-gray-400 capitalize">{module.category.replace('-', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <span className="text-gray-400">v{module.version}</span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(module.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/modules/${module.slug}`}
                        className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => toggleModuleStatus(module.id)}
                        className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/modules/${module.slug}/settings`}
                        className="p-2 text-gray-400 hover:text-emerald-400 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredModules.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No modules found matching your criteria</p>
          <button
            onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setStatusFilter('all'); }}
            className="mt-4 text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Install Module Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Install New Module</h2>
              <button
                onClick={() => { setShowInstallModal(false); setInstallError(null); }}
                className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInstallModule} className="p-6 space-y-4">
              {installError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{installError}</p>
                </div>
              )}

              {/* Slug & Version */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Slug *</label>
                  <input
                    type="text"
                    required
                    value={installForm.slug}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                    placeholder="my-module"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Version</label>
                  <input
                    type="text"
                    value={installForm.version}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="1.0.0"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Name (EN) *</label>
                  <input
                    type="text"
                    required
                    value={installForm.name_en}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, name_en: e.target.value }))}
                    placeholder="My Module"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Name (AR)</label>
                  <input
                    type="text"
                    value={installForm.name_ar}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, name_ar: e.target.value }))}
                    dir="rtl"
                    placeholder="الوحدة"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Description EN */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description (EN)</label>
                <textarea
                  value={installForm.description_en}
                  onChange={(e) => setInstallForm(prev => ({ ...prev, description_en: e.target.value }))}
                  rows={2}
                  placeholder="Brief description of the module..."
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>

              {/* Category & Tier */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
                  <select
                    value={installForm.category}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="core">Core</option>
                    <option value="clinical">Clinical</option>
                    <option value="financial">Financial</option>
                    <option value="operations">Operations</option>
                    <option value="marketing">Marketing</option>
                    <option value="advanced">Advanced</option>
                    <option value="integration">Integration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Min Tier</label>
                  <select
                    value={installForm.min_tier}
                    onChange={(e) => setInstallForm(prev => ({ ...prev, min_tier: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={installForm.is_free}
                      onChange={(e) => setInstallForm(prev => ({ ...prev, is_free: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                  <span className="text-sm text-gray-300">Free Module</span>
                </div>

                {!installForm.is_free && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Monthly Price ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={installForm.base_price_monthly}
                        onChange={(e) => setInstallForm(prev => ({ ...prev, base_price_monthly: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Yearly Price ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={installForm.base_price_yearly}
                        onChange={(e) => setInstallForm(prev => ({ ...prev, base_price_yearly: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => { setShowInstallModal(false); setInstallError(null); }}
                  className="px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInstalling || !installForm.slug || !installForm.name_en}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isInstalling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isInstalling ? 'Creating...' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleList;
