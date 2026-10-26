import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Check,
  X,
  Play,
  Pause,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useModules, useTenantModules, useTenant } from '../../hooks/useDevApi';
import { supabase } from '../../../lib/supabase';

// Icon mapping for module categories
const moduleIcons = {
  core: '📦',
  clinical: '🦷',
  financial: '💳',
  operations: '⚙️',
  marketing: '📢',
  integration: '🔌',
  advanced: '🚀',
};

const categoryConfig = {
  core: { label: 'Core', color: 'bg-gray-500/20 text-gray-400' },
  clinical: { label: 'Clinical', color: 'bg-blue-500/20 text-blue-400' },
  financial: { label: 'Financial', color: 'bg-green-500/20 text-green-400' },
  operations: { label: 'Operations', color: 'bg-purple-500/20 text-purple-400' },
  marketing: { label: 'Marketing', color: 'bg-pink-500/20 text-pink-400' },
  integration: { label: 'Integration', color: 'bg-amber-500/20 text-amber-400' },
  advanced: { label: 'Advanced', color: 'bg-red-500/20 text-red-400' },
};

export default function TenantModules() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [tenantModulesMap, setTenantModulesMap] = useState({});
  const [pendingChanges, setPendingChanges] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all available modules
  const { data: modulesData, loading: modulesLoading } = useModules();
  
  // Fetch tenant's active modules
  const { data: tenantModulesData, loading: tenantModulesLoading } = useTenantModules(id);
  
  // Fetch tenant info
  const { data: tenantData } = useTenant(id);

  // Transform modules from API format to display format
  const allModules = (modulesData?.modules || []).map(m => ({
    id: m.id,
    slug: m.slug,
    name: m.name_en || m.slug, // Use name_en from database
    category: m.category || 'core',
    description: m.description_en || '',
    isFree: m.is_free || false,
    price: m.base_price_monthly || 0,
    icon: m.icon || moduleIcons[m.category] || '📦',
  }));

  // Build tenant modules map from API data
  useEffect(() => {
    // Edge function returns { tenantModules: [...] } with nested modules data
    if (tenantModulesData?.tenantModules) {
      const modulesMap = {};
      tenantModulesData.tenantModules.forEach(tm => {
        // Access the nested module data from the join
        const moduleData = tm.modules || {};
        modulesMap[moduleData.slug || tm.module_slug] = {
          status: tm.status || 'active',
          enabledAt: tm.enabled_at || tm.created_at,
          isCore: moduleData.is_core || moduleData.category === 'core',
          trialEndsAt: tm.trial_ends_at,
        };
      });
      setTenantModulesMap(modulesMap);
    }
  }, [tenantModulesData]);

  const isLoading = modulesLoading || tenantModulesLoading;

  // Filter modules
  const filteredModules = allModules.filter((module) => {
    const matchesSearch =
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || module.category === categoryFilter;
    const matchesActive = !showOnlyActive || tenantModulesMap[module.slug];
    return matchesSearch && matchesCategory && matchesActive;
  });

  const getModuleStatus = (slug) => {
    if (pendingChanges[slug] !== undefined) {
      return pendingChanges[slug] ? 'pending-activate' : 'pending-deactivate';
    }
    return tenantModulesMap[slug]?.status || 'inactive';
  };

  const toggleModule = (slug) => {
    const currentStatus = tenantModulesMap[slug];
    const isCore = currentStatus?.isCore;
    
    if (isCore) {
      // Can't disable core modules
      return;
    }

    setPendingChanges((prev) => {
      const newChanges = { ...prev };
      if (prev[slug] !== undefined) {
        delete newChanges[slug];
      } else {
        newChanges[slug] = !currentStatus;
      }
      return newChanges;
    });
  };

  const startTrial = (slug) => {
    setPendingChanges((prev) => ({
      ...prev,
      [slug]: 'trial',
    }));
  };

  // Issue #42: Use real API instead of setTimeout simulation
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Call actual API to save module changes
      const activations = [];
      const deactivations = [];
      
      Object.entries(pendingChanges).forEach(([slug, value]) => {
        if (value === true || value === 'trial') {
          activations.push({ slug, trial: value === 'trial' });
        } else if (value === false) {
          deactivations.push({ slug });
        }
      });
      
      // Process activations
      for (const activation of activations) {
        const module = allModules.find(m => m.slug === activation.slug);
        if (module) {
          const { error } = await supabase
            .from('tenant_modules')
            .upsert({
              tenant_id: id,
              module_id: module.id,
              status: activation.trial ? 'trial' : 'active',
              enabled_at: new Date().toISOString(),
              ...(activation.trial && {
                trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              }),
            }, { onConflict: 'tenant_id,module_id' });
          if (error) throw error;
        }
      }
      
      // Process deactivations
      for (const deactivation of deactivations) {
        const module = allModules.find(m => m.slug === deactivation.slug);
        if (module) {
          const { error } = await supabase
            .from('tenant_modules')
            .update({ status: 'inactive', disabled_at: new Date().toISOString() })
            .eq('tenant_id', id)
            .eq('module_id', module.id);
          if (error) throw error;
        }
      }
      
      // Apply changes locally
      const newTenantModulesMap = { ...tenantModulesMap };
      Object.entries(pendingChanges).forEach(([slug, value]) => {
        if (value === true || value === 'trial') {
          newTenantModulesMap[slug] = {
            status: value === 'trial' ? 'trial' : 'active',
            enabledAt: new Date().toISOString().split('T')[0],
            ...(value === 'trial' && {
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            }),
          };
        } else {
          delete newTenantModulesMap[slug];
        }
      });
      
      setTenantModulesMap(newTenantModulesMap);
      setPendingChanges({});
    } catch (error) {
      console.error('Error saving modules:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const discardChanges = () => {
    setPendingChanges({});
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  // Calculate monthly cost
  const calculateMonthlyCost = () => {
    let current = 0;
    let pending = 0;

    allModules.forEach((module) => {
      const status = tenantModulesMap[module.slug];
      const change = pendingChanges[module.slug];

      if (status && status.status === 'active') {
        current += module.price;
      }

      if (change === true) {
        pending += module.price;
      } else if (change === false && status) {
        pending -= module.price;
      }
    });

    return { current, pending, total: current + pending };
  };

  const costs = calculateMonthlyCost();
  const tenantName = tenantData?.tenant?.display_name || tenantData?.tenant?.name || 'Tenant';

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="ml-3 text-gray-400">Loading modules...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/tenants/${id}`)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Manage Modules</h1>
            <p className="mt-1 text-sm text-gray-400">
              {tenantName} • Activate or deactivate feature modules
            </p>
          </div>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-3">
            <button
              onClick={discardChanges}
              className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                `Save Changes (${Object.keys(pendingChanges).length})`
              )}
            </button>
          </div>
        )}
      </div>

      {/* Cost Summary */}
      {hasChanges && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-amber-200">
                {Object.keys(pendingChanges).length} pending change(s)
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Monthly cost: </span>
              <span className="text-white">${costs.current}</span>
              {costs.pending !== 0 && (
                <>
                  <span className="text-gray-500 mx-2">→</span>
                  <span className={costs.pending > 0 ? 'text-red-400' : 'text-emerald-400'}>
                    ${costs.total} ({costs.pending > 0 ? '+' : ''}{costs.pending})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={showOnlyActive}
            onChange={(e) => setShowOnlyActive(e.target.checked)}
            className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
          />
          Active only
        </label>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredModules.map((module) => {
          const status = getModuleStatus(module.slug);
          const tenantModule = tenantModulesMap[module.slug];
          const isCore = tenantModule?.isCore;
          const isPending = status.startsWith('pending');

          return (
            <div
              key={module.id}
              className={`rounded-lg border p-4 transition-all ${
                isPending
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : status === 'active'
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : status === 'trial'
                  ? 'border-blue-500/30 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{module.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{module.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${categoryConfig[module.category].color}`}>
                        {categoryConfig[module.category].label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">{module.description}</p>
                    
                    {/* Pricing */}
                    <div className="mt-2">
                      {module.isFree ? (
                        <span className="text-sm text-emerald-400">Free</span>
                      ) : (
                        <span className="text-sm text-white">${module.price}<span className="text-gray-500">/mo</span></span>
                      )}
                    </div>

                    {/* Trial info */}
                    {status === 'trial' && tenantModule?.trialEndsAt && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-blue-400">
                        <Clock className="h-4 w-4" />
                        Trial ends {tenantModule.trialEndsAt}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2">
                  {isCore ? (
                    <span className="text-xs text-gray-500">Core module</span>
                  ) : status === 'inactive' ? (
                    <div className="flex gap-2">
                      {!module.isFree && (
                        <button
                          onClick={() => startTrial(module.slug)}
                          className="rounded-lg border border-blue-500/50 bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/30 transition-colors"
                        >
                          Start Trial
                        </button>
                      )}
                      <button
                        onClick={() => toggleModule(module.slug)}
                        className="rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      >
                        Activate
                      </button>
                    </div>
                  ) : status === 'pending-activate' ? (
                    <button
                      onClick={() => toggleModule(module.slug)}
                      className="flex items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400"
                    >
                      <Play className="h-3 w-3" />
                      Pending Activation
                    </button>
                  ) : status === 'pending-deactivate' ? (
                    <button
                      onClick={() => toggleModule(module.slug)}
                      className="flex items-center gap-1 rounded-lg border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400"
                    >
                      <Pause className="h-3 w-3" />
                      Pending Deactivation
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleModule(module.slug)}
                      className="rounded-lg border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Deactivate
                    </button>
                  )}

                  {/* Status Badge */}
                  {!isPending && status !== 'inactive' && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                      status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      <Check className="h-3 w-3" />
                      {status === 'active' ? 'Active' : 'Trial'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredModules.length === 0 && (
        <div className="py-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-4 text-gray-400">No modules found</p>
        </div>
      )}
    </div>
  );
}
