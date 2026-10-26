/**
 * useTenant - Standalone hook for tenant context
 * Can be used outside of TenantProvider by accepting tenantId parameter
 */
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

// Create a simple context for tenant
const TenantContext = createContext(null);

export const TenantProvider = TenantContext.Provider;

/**
 * useTenant hook
 * @param {string} tenantIdParam - Optional tenant ID to use instead of context
 * @returns {Object} tenant, loading, error, setTenant
 */
export const useTenant = (tenantIdParam) => {
  const contextValue = useContext(TenantContext);
  const [tenant, setTenant] = useState(contextValue?.tenant || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If tenantId is provided as parameter, fetch that tenant
  useEffect(() => {
    if (tenantIdParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing with Supabase API (external system)
      setLoading(true);
      supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantIdParam)
        .single()
        .then(({ data, error: fetchError }) => {
          if (fetchError) {
            setError(fetchError.message);
          } else {
            setTenant(data);
          }
          setLoading(false);
        });
    } else if (contextValue?.tenant) {
      setTenant(contextValue.tenant);
    }
  }, [tenantIdParam, contextValue?.tenant]);

  return {
    tenant,
    loading: contextValue?.loading || loading,
    error: contextValue?.error || error,
    setTenant: contextValue?.setTenant || setTenant,
  };
};

export default useTenant;
