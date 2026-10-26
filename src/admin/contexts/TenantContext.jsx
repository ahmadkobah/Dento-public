/**
 * TenantContext for the Admin Panel
 * 
 * @deprecated This file now re-exports from UnifiedTenantContext.
 * Import directly from '../../contexts/UnifiedTenantContext' for new code.
 */

// Re-export from unified context for backward compatibility
export {
  UnifiedTenantProvider as TenantProvider,
  useTenantContext,
  useTenant,
  useSelectedTenantId,
  useTenantScoped,
} from '../../contexts/UnifiedTenantContext';

import TenantContext from '../../contexts/UnifiedTenantContext';
export default TenantContext;

/* DEPRECATED: Original implementation below kept for reference

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const TenantContext = createContext(null);

// Supabase URL from env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [activeModules, setActiveModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  // Fetch active modules for a tenant
  const fetchActiveModules = useCallback(async (tenantId) => {
    if (!tenantId) {
      setActiveModules([]);
      return;
    }
    
    setModulesLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('tenant_modules')
        .select('status, modules(slug, name_en, category)')
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'trial']);
      
      if (fetchError) throw fetchError;
      
      // Extract module slugs for easy checking
      const modules = (data || []).map(tm => ({
        slug: tm.modules?.slug,
        name: tm.modules?.name_en,
        category: tm.modules?.category,
        status: tm.status,
      })).filter(m => m.slug);
      
      setActiveModules(modules);
    } catch (err) {
      console.error('Failed to fetch active modules:', err);
      setActiveModules([]);
    } finally {
      setModulesLoading(false);
    }
  }, []);

  // Fetch user's tenants via tenant_users (for regular admins)
  const fetchUserTenants = useCallback(async (userId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('tenant_users')
        .select(`
          tenant_id,
          role,
          status,
          tenants:tenant_id (
            id,
            name,
            slug,
            display_name,
            status,
            owner_email,
            settings
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');
      
      if (fetchError) {
        console.error('Failed to fetch user tenants:', fetchError);
        return [];
      }
      
      // Extract tenants from the join
      return (data || [])
        .map(tu => tu.tenants)
        .filter(t => t && t.status === 'active');
    } catch (err) {
      console.error('Failed to fetch user tenants:', err);
      return [];
    }
  }, []);

  // Fetch all tenants via edge function (bypasses RLS) - for developers only
  const fetchTenantsViaEdge = useCallback(async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        // No session, skip tenant fetch
        return [];
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/tenant-management`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch tenants:', response.status, errorText);
        return [];
      }

      const data = await response.json();
      return data.tenants || [];
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      return [];
    }
  }, []);

  // Initialize tenant context
  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check user's role to determine fetch method
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const isDeveloper = userProfile?.role === 'developer';
      
      // Fetch tenants based on role
      let tenants = [];
      if (isDeveloper) {
        // Developers can see all tenants via edge function
        tenants = await fetchTenantsViaEdge();
      } else {
        // Regular users see only their assigned tenants
        tenants = await fetchUserTenants(user.id);
      }
      
      setAvailableTenants(tenants);

      // Check for stored tenant selection
      const storedTenantId = localStorage.getItem('dev_tenant_id');
      
      // Check URL for tenant slug
      const urlParams = new URLSearchParams(window.location.search);
      const tenantSlug = urlParams.get('tenant');

      // Find tenant to use
      let selectedTenant = null;

      if (tenantSlug) {
        // URL param takes priority
        selectedTenant = tenants.find(t => t.slug === tenantSlug);
        if (selectedTenant) {
          localStorage.setItem('dev_tenant_id', selectedTenant.id);
        }
      } else if (storedTenantId) {
        // Use stored tenant
        selectedTenant = tenants.find(t => t.id === storedTenantId);
      }

      // If no selection but tenants available, use first one
      if (!selectedTenant && tenants.length > 0) {
        selectedTenant = tenants[0];
        localStorage.setItem('dev_tenant_id', selectedTenant.id);
      }

      setTenant(selectedTenant);
      
      // Fetch active modules for the selected tenant
      if (selectedTenant) {
        await fetchActiveModules(selectedTenant.id);
      }
    } catch (err) {
      console.error('Failed to initialize tenant context:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchTenantsViaEdge, fetchUserTenants, fetchActiveModules]);

  useEffect(() => {
    initialize();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        initialize();
      } else if (event === 'SIGNED_OUT') {
        setTenant(null);
        setAvailableTenants([]);
        localStorage.removeItem('dev_tenant_id');
      }
    });

    return () => subscription.unsubscribe();
  }, [initialize]);

  // Switch tenant (for development)
  const switchTenant = useCallback(async (tenantId) => {
    const selectedTenant = availableTenants.find(t => t.id === tenantId);
    if (selectedTenant) {
      setTenant(selectedTenant);
      localStorage.setItem('dev_tenant_id', tenantId);
      await fetchActiveModules(tenantId);
    }
  }, [availableTenants, fetchActiveModules]);

  // Clear tenant selection
  const clearTenant = useCallback(() => {
    localStorage.removeItem('dev_tenant_id');
    setTenant(null);
    setActiveModules([]);
  }, []);

  // Check if a module is active for current tenant
  const hasModule = useCallback((moduleSlug) => {
    return activeModules.some(m => m.slug === moduleSlug);
  }, [activeModules]);

  // Get list of active module slugs
  const activeModuleSlugs = activeModules.map(m => m.slug);

  const value = {
    tenant,
    tenantId: tenant?.id,
    tenantSlug: tenant?.slug,
    tenantName: tenant?.display_name || tenant?.name,
    loading,
    error,
    availableTenants,
    switchTenant,
    clearTenant,
    refetch: initialize,
    // Module access
    activeModules,
    activeModuleSlugs,
    hasModule,
    modulesLoading,
    // Helper flags
    isMultiTenant: true,
    hasAccess: !!tenant,
    isDev: import.meta.env.DEV || window.location.hostname === 'localhost',
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

*/

// Original default export kept for backward compatibility
