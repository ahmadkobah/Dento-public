import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useDomain } from './DomainResolver';

/**
 * ModuleGate Context
 * Controls access to features based on tenant's enabled modules
 * 
 * Modules:
 * - core: Always enabled (patients, appointments, users)
 * - clinical: Treatment plans, prescriptions, x-rays
 * - financial: Invoices, payments, insurance
 * - operations: Inventory, scheduling, attendance
 * - website: Public website, page builder, online booking
 * - patient_portal: Patient login, view records
 */

const ModuleContext = createContext(null);

export const useModules = () => {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModules must be used within ModuleGate');
  }
  return context;
};

// Module slugs
export const MODULES = {
  CORE: 'core',
  CLINICAL: 'clinical',
  FINANCIAL: 'financial',
  OPERATIONS: 'operations',
  WEBSITE: 'website',
  PATIENT_PORTAL: 'patient_portal',
};

export const ModuleGate = ({ children }) => {
  const { tenantId, loading: domainLoading } = useDomain();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      if (domainLoading) return;
      
      if (!tenantId) {
        // No tenant = main platform, no modules needed
        setModules([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('tenant_modules')
          .select(`
            status,
            module:modules (
              id, slug, name_en
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'active');

        if (error) throw error;

        // Always include 'core' module
        const enabledModules = ['core', ...data.map(tm => tm.module.slug)];
        setModules([...new Set(enabledModules)]);
      } catch (err) {
        console.error('Failed to fetch modules:', err);
        // Default to core only on error
        setModules(['core']);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [tenantId, domainLoading]);

  /**
   * Check if a module is enabled
   */
  const hasModule = useCallback((moduleSlug) => {
    return modules.includes(moduleSlug);
  }, [modules]);

  /**
   * Check if website module is enabled
   */
  const hasWebsite = useCallback(() => {
    return hasModule(MODULES.WEBSITE);
  }, [hasModule]);

  /**
   * Check if patient portal is enabled
   */
  const hasPatientPortal = useCallback(() => {
    return hasModule(MODULES.PATIENT_PORTAL);
  }, [hasModule]);

  /**
   * Check if clinical features are enabled
   */
  const hasClinical = useCallback(() => {
    return hasModule(MODULES.CLINICAL);
  }, [hasModule]);

  /**
   * Check if financial features are enabled
   */
  const hasFinancial = useCallback(() => {
    return hasModule(MODULES.FINANCIAL);
  }, [hasModule]);

  /**
   * Check if operations features are enabled
   */
  const hasOperations = useCallback(() => {
    return hasModule(MODULES.OPERATIONS);
  }, [hasModule]);

  const value = {
    modules,
    loading: loading || domainLoading,
    hasModule,
    hasWebsite,
    hasPatientPortal,
    hasClinical,
    hasFinancial,
    hasOperations,
  };

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
};

/**
 * ModuleRequired Component
 * Renders children only if the required module is enabled
 */
export const ModuleRequired = ({ module, children, fallback = null }) => {
  const { hasModule, loading } = useModules();

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!hasModule(module)) {
    return fallback;
  }

  return children;
};

export default ModuleGate;
