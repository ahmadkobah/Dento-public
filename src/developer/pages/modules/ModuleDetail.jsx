import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Settings,
  Power,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Package,
  Calendar,
  Clock,
  GitBranch,
  ExternalLink,
  Code,
  FileText,
  Shield,
  AlertTriangle,
  Download,
  Upload,
  DollarSign,
  Save,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { moduleApi } from '../../services/devApi';

// Module icons mapping (matches actual slugs in DB)
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
};

const ModuleDetail = () => {
  const { slug } = useParams();
  const [module, setModule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Pricing edit state
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    base_price_monthly: 0,
    base_price_yearly: 0,
    is_free: false,
    min_tier: 'basic',
  });

  // Version & settings edit state
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    version: '',
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    category: 'core',
    entry_point: '',
    documentation_url: '',
    is_visible: true,
    changelog_notes: '',
  });

  const fetchModule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await moduleApi.getBySlug(slug);
      setModule(data);
      setPricingForm({
        base_price_monthly: data.base_price_monthly || 0,
        base_price_yearly: data.base_price_yearly || 0,
        is_free: data.is_free || false,
        min_tier: data.min_tier || 'basic',
      });
      setSettingsForm({
        version: data.version || '1.0.0',
        name_en: data.name_en || '',
        name_ar: data.name_ar || '',
        description_en: data.description_en || '',
        description_ar: data.description_ar || '',
        category: data.category || 'core',
        entry_point: data.entry_point || '',
        documentation_url: data.documentation_url || '',
        is_visible: data.is_visible !== false,
        changelog_notes: '',
      });
    } catch (err) {
      console.error('Failed to fetch module:', err);
      setError(err.message || 'Failed to load module');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModule();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleModuleStatus = async () => {
    if (!module) return;
    const newStatus = module.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await moduleApi.updateModuleInfo(module.id, { status: newStatus });
      setModule(updated);
      setSaveMessage({ type: 'success', text: `Module ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message });
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const handlePricingSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await moduleApi.updateModuleInfo(module.id, {
        base_price_monthly: parseFloat(pricingForm.base_price_monthly) || 0,
        base_price_yearly: parseFloat(pricingForm.base_price_yearly) || 0,
        is_free: pricingForm.is_free,
        min_tier: pricingForm.min_tier,
      });
      setModule(updated);
      setIsEditingPricing(false);
      setSaveMessage({ type: 'success', text: 'Pricing updated successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage({ type: 'error', text: err.message });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelPricingEdit = () => {
    setPricingForm({
      base_price_monthly: module.base_price_monthly || 0,
      base_price_yearly: module.base_price_yearly || 0,
      is_free: module.is_free || false,
      min_tier: module.min_tier || 'basic',
    });
    setIsEditingPricing(false);
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        version: settingsForm.version,
        name_en: settingsForm.name_en,
        name_ar: settingsForm.name_ar,
        description_en: settingsForm.description_en,
        description_ar: settingsForm.description_ar,
        category: settingsForm.category,
        entry_point: settingsForm.entry_point || null,
        documentation_url: settingsForm.documentation_url || null,
        is_visible: settingsForm.is_visible,
      };
      // If version was bumped, include changelog notes
      if (settingsForm.version !== (module.version || '1.0.0') && settingsForm.changelog_notes) {
        payload.changelog_notes = settingsForm.changelog_notes;
      }
      const updated = await moduleApi.updateModuleInfo(module.id, payload);
      setModule(updated);
      setIsEditingSettings(false);
      setSettingsForm(prev => ({ ...prev, changelog_notes: '' }));
      setSaveMessage({ type: 'success', text: 'Module settings updated!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Settings update error:', err, err.message);
      setSaveMessage({ type: 'error', text: err.message });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelSettingsEdit = () => {
    setSettingsForm({
      version: module.version || '1.0.0',
      name_en: module.name_en || '',
      name_ar: module.name_ar || '',
      description_en: module.description_en || '',
      description_ar: module.description_ar || '',
      category: module.category || 'core',
      entry_point: module.entry_point || '',
      documentation_url: module.documentation_url || '',
      is_visible: module.is_visible !== false,
      changelog_notes: '',
    });
    setIsEditingSettings(false);
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
        <p className="text-red-400 mb-2">Error loading module</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <div className="flex gap-3">
          <button onClick={fetchModule} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
            Retry
          </button>
          <Link to="/developer/modules" className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700">
            Back to Modules
          </Link>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Module not found</p>
        <Link to="/developer/modules" className="mt-4 text-emerald-400 hover:text-emerald-300 transition-colors inline-block">
          Back to Modules
        </Link>
      </div>
    );
  }

  const moduleName = module.name_en || module.name || 'Unknown Module';
  const moduleDescription = module.description_en || module.description || 'No description available.';
  const moduleIcon = moduleIcons[module.slug] || '📦';
  const dependencies = module.depends_on || [];
  const permissions = module.permissions_required || [];
  const changelog = module.changelog || [];

  return (
    <div className="space-y-6">
      {/* Save Message Toast */}
      {saveMessage && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium',
          saveMessage.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        )}>
          {saveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {saveMessage.text}
        </div>
      )}

      {/* Back Button */}
      <Link 
        to="/developer/modules"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Modules
      </Link>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{moduleIcon}</div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{moduleName}</h1>
                {module.status === 'active' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
                    <XCircle className="w-3 h-3" />
                    Inactive
                  </span>
                )}
                {module.is_free && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                    Free
                  </span>
                )}
              </div>
              <p className="text-gray-400 max-w-2xl">{moduleDescription}</p>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4" />
                  v{module.version || '1.0.0'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Created {new Date(module.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Updated {new Date(module.updated_at).toLocaleDateString()}
                </span>
                {!module.is_free && (
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                    ${module.base_price_monthly}/mo
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={toggleModuleStatus}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                module.status === 'active'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              )}
            >
              <Power className="w-4 h-4" />
              {module.status === 'active' ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={fetchModule}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="flex gap-6">
          {['overview', 'pricing', 'settings', 'permissions', 'changelog'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'pb-3 px-1 text-sm font-medium transition-colors relative capitalize',
                activeTab === tab
                  ? 'text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Module Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Category</p>
                <p className="text-white font-medium mt-1 capitalize">{module.category}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Min Tier</p>
                <p className="text-white font-medium mt-1 capitalize">{module.min_tier || 'basic'}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Monthly Price</p>
                <p className="text-white font-medium mt-1">
                  {module.is_free ? 'Free' : `$${module.base_price_monthly || 0}`}
                </p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Yearly Price</p>
                <p className="text-white font-medium mt-1">
                  {module.is_free ? 'Free' : `$${module.base_price_yearly || 0}`}
                </p>
              </div>
            </div>

            {/* Dependencies */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Dependencies</h3>
              {dependencies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {dependencies.map(dep => (
                    <span 
                      key={dep}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-gray-300"
                    >
                      <Package className="w-4 h-4 text-gray-500" />
                      {dep}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No dependencies</p>
              )}
            </div>

            {/* Module Metadata */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Module Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Slug</span>
                  <code className="text-emerald-400 text-sm">{module.slug}</code>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Entry Point</span>
                  <code className="text-gray-300 text-sm">{module.entry_point || 'Not configured'}</code>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Visibility</span>
                  <span className={module.is_visible ? 'text-emerald-400' : 'text-gray-500'}>
                    {module.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Routes</span>
                  <span className="text-gray-300 text-sm">
                    {module.routes && module.routes.length > 0 ? module.routes.join(', ') : 'None configured'}
                  </span>
                </div>
                {module.documentation_url && (
                  <div className="flex justify-between py-2 border-b border-gray-800">
                    <span className="text-gray-400">Documentation</span>
                    <a href={module.documentation_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> View Docs
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Descriptions */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Descriptions</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">English</p>
                  <p className="text-gray-200 text-sm">{module.description_en || 'No English description'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs uppercase mb-1">Arabic</p>
                  <p className="text-gray-200 text-sm" dir="rtl">{module.description_ar || 'No Arabic description'}</p>
                </div>
              </div>
            </div>

            {/* Conflicts */}
            {module.conflicts_with && module.conflicts_with.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Conflicts With</h3>
                <div className="flex flex-wrap gap-2">
                  {module.conflicts_with.map(conflict => (
                    <span key={conflict} className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm">
                      {conflict}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRICING TAB */}
      {activeTab === 'pricing' && (
        <div className="max-w-2xl">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Pricing Configuration
              </h3>
              {!isEditingPricing ? (
                <button
                  onClick={() => setIsEditingPricing(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Edit Pricing
                </button>
              ) : (
                <button
                  onClick={cancelPricingEdit}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}
            </div>

            {!isEditingPricing ? (
              /* Read-only pricing view */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Monthly Price</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {module.is_free ? (
                        <span className="text-emerald-400">Free</span>
                      ) : (
                        <>${module.base_price_monthly || 0}<span className="text-sm text-gray-400 font-normal">/mo</span></>
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Yearly Price</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {module.is_free ? (
                        <span className="text-emerald-400">Free</span>
                      ) : (
                        <>${module.base_price_yearly || 0}<span className="text-sm text-gray-400 font-normal">/yr</span></>
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Plan Type</p>
                    <p className="text-white font-medium mt-1">
                      {module.is_free ? (
                        <span className="text-emerald-400">Free Module</span>
                      ) : (
                        <span className="text-amber-400">Paid Module</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">Minimum Tier</p>
                    <p className="text-white font-medium mt-1 capitalize">{module.min_tier || 'basic'}</p>
                  </div>
                </div>
                {!module.is_free && module.base_price_yearly > 0 && module.base_price_monthly > 0 && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4">
                    <p className="text-emerald-400 text-sm font-medium">
                      Yearly savings: {Math.round((1 - module.base_price_yearly / (module.base_price_monthly * 12)) * 100)}% off
                      (${(module.base_price_monthly * 12 - module.base_price_yearly).toFixed(0)} saved/year)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Editing pricing form */
              <form onSubmit={handlePricingSubmit} className="space-y-5">
                {/* Free toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Free Module</p>
                    <p className="text-gray-400 text-sm">Mark this module as free for all tenants</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPricingForm(prev => ({ ...prev, is_free: !prev.is_free }))}
                    className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      pricingForm.is_free ? 'bg-emerald-600' : 'bg-gray-600'
                    )}
                  >
                    <span className={clsx(
                      'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                      pricingForm.is_free ? 'translate-x-6' : 'translate-x-1'
                    )} />
                  </button>
                </div>

                {/* Price inputs */}
                {!pricingForm.is_free && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Monthly Price ($)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pricingForm.base_price_monthly}
                          onChange={(e) => setPricingForm(prev => ({ ...prev, base_price_monthly: e.target.value }))}
                          className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">
                        Yearly Price ($)
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={pricingForm.base_price_yearly}
                          onChange={(e) => setPricingForm(prev => ({ ...prev, base_price_yearly: e.target.value }))}
                          className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Min Tier */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Minimum Subscription Tier
                  </label>
                  <select
                    value={pricingForm.min_tier}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, min_tier: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>

                {/* Preview */}
                {!pricingForm.is_free && parseFloat(pricingForm.base_price_monthly) > 0 && parseFloat(pricingForm.base_price_yearly) > 0 && (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">Preview</p>
                    <p className="text-white">
                      ${pricingForm.base_price_monthly}/month · ${pricingForm.base_price_yearly}/year
                    </p>
                    <p className="text-emerald-400 text-sm mt-1">
                      Yearly discount: {Math.round((1 - parseFloat(pricingForm.base_price_yearly) / (parseFloat(pricingForm.base_price_monthly) * 12)) * 100)}%
                    </p>
                  </div>
                )}

                {/* Submit buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Saving...' : 'Save Pricing'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelPricingEdit}
                    className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Module Settings</h3>
            {!isEditingSettings && (
              <button
                onClick={() => setIsEditingSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Edit Settings
              </button>
            )}
          </div>

          {!isEditingSettings ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Version</p>
                  <p className="text-emerald-400 font-mono font-semibold text-lg">v{module.version || '1.0.0'}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Category</p>
                  <p className="text-white capitalize">{(module.category || 'core').replace('-', ' ')}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Name (EN)</p>
                  <p className="text-white">{module.name_en || '-'}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Name (AR)</p>
                  <p className="text-white" dir="rtl">{module.name_ar || '-'}</p>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Description (EN)</p>
                <p className="text-gray-300 text-sm">{module.description_en || '-'}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Description (AR)</p>
                <p className="text-gray-300 text-sm" dir="rtl">{module.description_ar || '-'}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Entry Point</p>
                  <p className="text-gray-300 font-mono text-sm">{module.entry_point || '-'}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Visible</p>
                  <p className={module.is_visible !== false ? 'text-emerald-400' : 'text-red-400'}>
                    {module.is_visible !== false ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
              {module.documentation_url && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Documentation URL</p>
                  <a href={module.documentation_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline text-sm flex items-center gap-1">
                    {module.documentation_url} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSettingsSubmit} className="space-y-4">
              {/* Version */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Version</label>
                <input
                  type="text"
                  value={settingsForm.version}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="e.g. 1.2.0"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
                {settingsForm.version !== (module.version || '1.0.0') && (
                  <p className="mt-1 text-xs text-yellow-400">
                    Version will be bumped from {module.version || '1.0.0'} → {settingsForm.version}. Downgrades are not allowed.
                  </p>
                )}
              </div>

              {/* Changelog Notes (shown when version is bumped) */}
              {settingsForm.version !== (module.version || '1.0.0') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Changelog Notes <span className="text-gray-500 text-xs">(what changed in this version?)</span>
                  </label>
                  <textarea
                    value={settingsForm.changelog_notes}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, changelog_notes: e.target.value }))}
                    rows={2}
                    placeholder="e.g. Fixed currency conversion, added new report..."
                    className="w-full px-4 py-2.5 bg-gray-800 border border-yellow-600/50 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors resize-none"
                  />
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Name (EN)</label>
                  <input
                    type="text"
                    value={settingsForm.name_en}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, name_en: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Name (AR)</label>
                  <input
                    type="text"
                    value={settingsForm.name_ar}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, name_ar: e.target.value }))}
                    dir="rtl"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description (EN)</label>
                <textarea
                  value={settingsForm.description_en}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, description_en: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description (AR)</label>
                <textarea
                  value={settingsForm.description_ar}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, description_ar: e.target.value }))}
                  rows={3}
                  dir="rtl"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                />
              </div>

              {/* Category & Entry Point */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
                  <select
                    value={settingsForm.category}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, category: e.target.value }))}
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
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Entry Point</label>
                  <input
                    type="text"
                    value={settingsForm.entry_point}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, entry_point: e.target.value }))}
                    placeholder="/modules/my-module"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Documentation URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Documentation URL</label>
                <input
                  type="url"
                  value={settingsForm.documentation_url}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, documentation_url: e.target.value }))}
                  placeholder="https://docs.example.com/module"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Visible Toggle */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.is_visible}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, is_visible: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <span className="text-sm text-gray-300">Visible to tenants</span>
              </div>

              {/* Submit buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  type="button"
                  onClick={cancelSettingsEdit}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Required Permissions</h3>
          {permissions.length > 0 ? (
            <div className="space-y-4">
              {permissions.map((perm, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg"
                >
                  <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 font-mono text-sm">{perm}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No permissions defined for this module.</p>
          )}
        </div>
      )}

      {activeTab === 'changelog' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Changelog</h3>
          {changelog.length > 0 ? (
            <div className="space-y-6">
              {changelog.map((release, index) => (
                <div key={index} className="relative pl-6 pb-6 border-l border-gray-800 last:pb-0">
                  <div className="absolute left-0 top-0 w-3 h-3 -translate-x-1.5 rounded-full bg-emerald-500" />
                  <div className="mb-2">
                    <span className="text-emerald-400 font-semibold">v{release.version}</span>
                    {release.date && <span className="text-gray-500 text-sm ml-3">{release.date}</span>}
                  </div>
                  {release.changes && (
                    <ul className="space-y-2">
                      {release.changes.map((change, i) => (
                        <li key={i} className="text-gray-400 text-sm flex items-start gap-2">
                          <span className="text-gray-600">•</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No changelog available for this module.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ModuleDetail;
