import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../../hooks/useTenant';

/**
 * ModuleContext - Admin Panel
 * Tracks which modules are enabled for the current tenant
 * Controls admin menu visibility and feature access
 */

const ModuleContext = createContext(null);

// Default modules configuration
const DEFAULT_MODULES = {
  // Core modules (always enabled)
  dashboard: { enabled: true, core: true },
  patients: { enabled: true, core: true },
  appointments: { enabled: true, core: true },
  
  // Optional modules
  website: { enabled: false, core: false },
  pageBuilder: { enabled: false, core: false },
  onlineBooking: { enabled: false, core: false },
  treatments: { enabled: true, core: false },
  billing: { enabled: false, core: false },
  inventory: { enabled: false, core: false },
  marketing: { enabled: false, core: false },
  reports: { enabled: true, core: false },
  staff: { enabled: true, core: false },
  branches: { enabled: false, core: false },
};

export const ModuleProvider = ({ children }) => {
  const { tenant } = useTenant();
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);

  // Load tenant's module configuration
  useEffect(() => {
    const loadModules = async () => {
      if (!tenant?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenant_modules')
          .select('*')
          .eq('tenant_id', tenant.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading modules:', error);
        }

        if (data?.modules) {
          setModules((prev) => ({
            ...prev,
            ...data.modules,
          }));
        }
      } catch (err) {
        console.error('Failed to load modules:', err);
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, [tenant?.id]);

  // Check if a module is enabled
  const isModuleEnabled = (moduleKey) => {
    return modules[moduleKey]?.enabled === true;
  };

  // Enable a module
  const enableModule = async (moduleKey) => {
    if (!tenant?.id || modules[moduleKey]?.core) return;

    const newModules = {
      ...modules,
      [moduleKey]: { ...modules[moduleKey], enabled: true },
    };

    setModules(newModules);

    try {
      await supabase
        .from('tenant_modules')
        .upsert({
          tenant_id: tenant.id,
          modules: newModules,
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.error('Failed to update modules:', err);
      // Revert on error
      setModules(modules);
    }
  };

  // Disable a module
  const disableModule = async (moduleKey) => {
    if (!tenant?.id || modules[moduleKey]?.core) return;

    const newModules = {
      ...modules,
      [moduleKey]: { ...modules[moduleKey], enabled: false },
    };

    setModules(newModules);

    try {
      await supabase
        .from('tenant_modules')
        .upsert({
          tenant_id: tenant.id,
          modules: newModules,
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.error('Failed to update modules:', err);
      // Revert on error
      setModules(modules);
    }
  };

  // Toggle a module
  const toggleModule = async (moduleKey) => {
    if (isModuleEnabled(moduleKey)) {
      await disableModule(moduleKey);
    } else {
      await enableModule(moduleKey);
    }
  };

  // Get all enabled modules
  const getEnabledModules = () => {
    return Object.entries(modules)
      .filter(([, config]) => config.enabled)
      .map(([key]) => key);
  };

  // Get module configuration
  const getModuleConfig = (moduleKey) => {
    return modules[moduleKey] || null;
  };

  const value = {
    modules,
    loading,
    isModuleEnabled,
    enableModule,
    disableModule,
    toggleModule,
    getEnabledModules,
    getModuleConfig,
  };

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
};

ModuleProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useModules = () => {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModules must be used within a ModuleProvider');
  }
  return context;
};

// Convenience hook for checking single module
export const useModule = (moduleKey) => {
  const { isModuleEnabled, getModuleConfig, loading } = useModules();
  return {
    enabled: isModuleEnabled(moduleKey),
    config: getModuleConfig(moduleKey),
    loading,
  };
};

// HOC for conditionally rendering based on module status
export const withModule = (moduleKey, Component) => {
  const WrappedComponent = (props) => {
    const { enabled, loading } = useModule(moduleKey);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      );
    }

    if (!enabled) {
      return (
        <div className="p-6 text-center">
          <div className="max-w-md mx-auto">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Module Not Enabled</h2>
            <p className="text-gray-600 mb-4">
              This feature requires the {moduleKey} module to be enabled.
            </p>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Enable Module
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withModule(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};

export default ModuleContext;
