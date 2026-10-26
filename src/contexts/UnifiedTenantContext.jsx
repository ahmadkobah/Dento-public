/**
 * UnifiedTenantContext
 * 
 * Single source of truth for tenant management across all portals.
 * Replaces duplicate contexts in developer and admin portals.
 * 
 * Mode Behaviors:
 * - 'developer': Load all tenants via edge function, allow dropdown selection
 * - 'admin': Load user's assigned tenants, auto-select first or stored
 * - 'public': Resolve tenant from subdomain (not yet implemented)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getTenantStorageKey } from '../lib/storageKeys';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const TenantContext = createContext(null);

/**
 * UnifiedTenantProvider
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'developer' | 'admin' | 'public'} props.mode - Portal mode
 */
export function UnifiedTenantProvider({ children, mode = 'public' }) {
  // State
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Module state (admin mode only)
  const [activeModules, setActiveModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  // Get storage key based on mode
  const getStorageKey = useCallback(() => {
    return getTenantStorageKey(mode);
  }, [mode]);

  // ========================================
  // FETCH METHODS
  // ========================================

  // Fetch all tenants via edge function (for developers)
  const fetchTenantsViaEdge = useCallback(async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) return [];

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
        console.error('Failed to fetch tenants:', response.status);
        return [];
      }

      const data = await response.json();
      return data.tenants || [];
    } catch (err) {
      console.error('Failed to fetch tenants via edge:', err);
      return [];
    }
  }, []);

  // Fetch user's assigned tenants (for admins)
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

      // Map and filter - include trial status too
      const tenants = (data || [])
        .map(tu => tu.tenants)
        .filter(t => t && ['active', 'trial'].includes(t.status));
      
      return tenants;
    } catch (err) {
      console.error('Failed to fetch user tenants:', err);
      return [];
    }
  }, []);

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

      if (fetchError) {
        console.error('[TenantContext] Module fetch error:', fetchError);
        throw fetchError;
      }


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

  // ========================================
  // INITIALIZATION
  // ========================================

  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user role
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const isDeveloper = userProfile?.role === 'developer';

      // Fetch tenants based on mode and role
      let fetchedTenants = [];
      
      if (mode === 'developer') {
        // Developer portal: Always use edge function for all tenants
        fetchedTenants = await fetchTenantsViaEdge();
      } else if (mode === 'admin') {
        // Admin portal: Developers see all, others see assigned
        if (isDeveloper) {
          fetchedTenants = await fetchTenantsViaEdge();
        } else {
          fetchedTenants = await fetchUserTenants(user.id);
        }
      }
      // Public mode: Would resolve from subdomain (not implemented yet)

      setTenants(fetchedTenants);

      // Restore saved selection
      const storageKey = getStorageKey();
      const storedTenantId = localStorage.getItem(storageKey);
      
      let tenant = null;
      if (storedTenantId) {
        tenant = fetchedTenants.find(t => t.id === storedTenantId);
      }
      
      // Fallback to first tenant
      if (!tenant && fetchedTenants.length > 0) {
        tenant = fetchedTenants[0];
      }

      if (tenant) {
        setSelectedTenant(tenant);
        localStorage.setItem(storageKey, tenant.id);
        
        // Load modules in admin mode
        if (mode === 'admin') {
          await fetchActiveModules(tenant.id);
        }
      } else {
        // No matching tenant found
      }
    } catch (err) {
      // Ignore AbortError from React StrictMode double-mounting cleanup
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        return;
      }
      console.error('Failed to initialize tenant context:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode, fetchTenantsViaEdge, fetchUserTenants, fetchActiveModules, getStorageKey]);

  // Initialize on mount and auth changes
  useEffect(() => {
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        initialize();
      } else if (event === 'SIGNED_OUT') {
        setSelectedTenant(null);
        setTenants([]);
        setActiveModules([]);
        localStorage.removeItem(getStorageKey());
      }
    });

    return () => subscription.unsubscribe();
  }, [initialize, getStorageKey]);

  // ========================================
  // REALTIME SUBSCRIPTIONS (Developer mode)
  // ========================================

  useEffect(() => {
    if (mode !== 'developer') return;

    const channel = supabase
      .channel('tenant_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenants' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTenants(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setTenants(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
            if (selectedTenant?.id === payload.new.id) {
              setSelectedTenant(payload.new);
            }
          } else if (payload.eventType === 'DELETE') {
            setTenants(prev => prev.filter(t => t.id !== payload.old.id));
            if (selectedTenant?.id === payload.old.id) {
              // Clear selection if current tenant was deleted
              setSelectedTenant(null);
              localStorage.removeItem(getStorageKey());
              setActiveModules([]);
            }
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [mode, selectedTenant?.id, getStorageKey]);

  // ========================================
  // ACTIONS
  // ========================================

  const selectTenant = useCallback(async (tenant) => {
    setSelectedTenant(tenant);
    
    const storageKey = getStorageKey();
    if (tenant) {
      localStorage.setItem(storageKey, tenant.id);
      
      if (mode === 'admin') {
        await fetchActiveModules(tenant.id);
      }
    } else {
      localStorage.removeItem(storageKey);
      setActiveModules([]);
    }
  }, [mode, getStorageKey, fetchActiveModules]);

  const selectTenantById = useCallback((tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      selectTenant(tenant);
    }
  }, [tenants, selectTenant]);

  const refreshTenants = useCallback(async () => {
    await initialize();
  }, [initialize]);

  // Check if a module is active
  const hasModule = useCallback((moduleSlug) => {
    return activeModules.some(m => m.slug === moduleSlug);
  }, [activeModules]);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value = {
    // Core state
    tenant: selectedTenant,
    selectedTenant,
    tenants,
    loading,
    error,
    
    // Actions
    selectTenant,
    selectTenantById,
    setTenant: selectTenant, // alias
    switchTenant: selectTenantById, // alias
    refreshTenants,
    refetch: initialize,
    clearTenant: () => selectTenant(null),
    
    // Computed values
    tenantId: selectedTenant?.id,
    tenantSlug: selectedTenant?.slug,
    tenantName: selectedTenant?.display_name || selectedTenant?.name,
    tenantCount: tenants.length,
    activeTenants: tenants.filter(t => t.status === 'active'),
    trialTenants: tenants.filter(t => t.status === 'trial'),
    availableTenants: tenants, // alias
    
    // Module access (admin mode)
    activeModules,
    activeModuleSlugs: activeModules.map(m => m.slug),
    hasModule,
    modulesLoading,
    
    // Helper flags
    isMultiTenant: true,
    hasAccess: !!selectedTenant,
    isDev: import.meta.env.DEV || window.location.hostname === 'localhost',
    mode,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

// ========================================
// HOOKS
// ========================================

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantContext must be used within a UnifiedTenantProvider');
  }
  return context;
}

// Main hook - works for both developer and admin
export function useTenant() {
  return useTenantContext();
}

// Get just the tenant ID
export function useSelectedTenantId() {
  const { selectedTenant } = useTenantContext();
  return selectedTenant?.id || null;
}

// Tenant-scoped data fetching hook
export function useTenantScoped(fetchFn, deps = []) {
  const { selectedTenant } = useTenantContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedTenant) {
      setData(null);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFn(selectedTenant.id);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant?.id, fetchFn, ...deps]);

  return { data, loading, error, tenantId: selectedTenant?.id };
}

// ========================================
// BACKWARD COMPATIBILITY
// ========================================

// Re-export as TenantProvider for easy migration
export const TenantProvider = UnifiedTenantProvider;

export default TenantContext;
