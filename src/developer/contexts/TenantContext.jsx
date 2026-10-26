/**
 * TenantContext for the Developer Portal
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
import { tenantApi } from '../services/devApi';
import { supabase } from '../../lib/supabase';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load tenants on mount with cleanup for React Strict Mode
  useEffect(() => {
    let cancelled = false;
    
    const load = async () => {
      try {
        const result = await tenantApi.list();
        if (!cancelled) {
          setTenants(result.tenants || []);
          setError(null);
        }
      } catch (err) {
        // Ignore abort errors from React Strict Mode double-mounting
        if (err.name === 'AbortError' || err.message?.includes('aborted')) {
          return;
        }
        if (!cancelled) {
          console.error('Failed to load tenants:', err);
          setError(err.message);
          setTenants([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    load();
    
    return () => {
      cancelled = true;
    };
  }, []);

  // Issue #46: Load and validate saved selection from localStorage
  useEffect(() => {
    const savedTenantId = localStorage.getItem('devPortal_selectedTenantId');
    if (savedTenantId && tenants.length > 0) {
      const found = tenants.find(t => t.id === savedTenantId);
      if (found) {
        // Validate tenant is still active before selecting
        if (found.status !== 'suspended' && found.status !== 'deleted') {
          setSelectedTenant(found);
        } else {
          // Clear invalid selection
          localStorage.removeItem('devPortal_selectedTenantId');
          setSelectedTenant(null);
        }
      } else {
        // Tenant no longer exists, clear localStorage
        localStorage.removeItem('devPortal_selectedTenantId');
      }
    }
  }, [tenants]);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await tenantApi.list();
      setTenants(result.tenants || []);
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setError(err.message);
      // Issue #47: Removed insecure fallback direct query
      // The API should handle all tenant loading with proper auth
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectTenant = useCallback((tenant) => {
    setSelectedTenant(tenant);
    if (tenant) {
      localStorage.setItem('devPortal_selectedTenantId', tenant.id);
    } else {
      localStorage.removeItem('devPortal_selectedTenantId');
    }
  }, []);

  const selectTenantById = useCallback((tenantId) => {
    if (!tenantId) {
      selectTenant(null);
      return;
    }
    const found = tenants.find(t => t.id === tenantId);
    if (found) {
      selectTenant(found);
    }
  }, [tenants, selectTenant]);

  const refreshTenants = useCallback(async () => {
    await loadTenants();
  }, [loadTenants]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('tenant_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenants',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTenants(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setTenants(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
            // Update selected tenant if it was updated
            if (selectedTenant?.id === payload.new.id) {
              setSelectedTenant(payload.new);
            }
          } else if (payload.eventType === 'DELETE') {
            setTenants(prev => prev.filter(t => t.id !== payload.old.id));
            // Clear selection if deleted tenant was selected
            if (selectedTenant?.id === payload.old.id) {
              selectTenant(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTenant, selectTenant]);

  const value = {
    tenants,
    selectedTenant,
    loading,
    error,
    selectTenant,
    selectTenantById,
    refreshTenants,
    // Computed values
    tenantCount: tenants.length,
    activeTenants: tenants.filter(t => t.status === 'active'),
    trialTenants: tenants.filter(t => t.status === 'trial'),
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
}

// Alias for useTenantContext - returns { tenant, loading, error, ... }
export function useTenant() {
  const context = useTenantContext();
  return {
    tenant: context.selectedTenant,
    loading: context.loading,
    error: context.error,
    setTenant: context.selectTenant,
    ...context,
  };
}

// Hook to use selected tenant ID
export function useSelectedTenantId() {
  const { selectedTenant } = useTenantContext();
  return selectedTenant?.id || null;
}

// Hook for tenant-scoped data
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
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [selectedTenant?.id, ...deps]);

  return { data, loading, error, tenantId: selectedTenant?.id };
}

*/

// Original default export kept for backward compatibility
