import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useSubdomain from './useSubdomain';

/**
 * DomainResolver Context
 * Resolves custom domains and subdomains to tenant information
 */
const DomainContext = createContext(null);

export const useDomain = () => {
  const context = useContext(DomainContext);
  if (!context) {
    throw new Error('useDomain must be used within DomainResolver');
  }
  return context;
};

export const DomainResolver = ({ children }) => {
  const { subdomain, isMainPlatform, isCustomDomain, hostname } = useSubdomain();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const resolveTenant = async () => {
      setLoading(true);
      setError(null);

      try {
        // Main platform (app.dento.com) - no tenant needed
        if (isMainPlatform && !subdomain) {
          setTenant(null);
          setLoading(false);
          return;
        }

        // Subdomain: smile-dental.dento.app
        if (subdomain) {
          const { data, error: fetchError } = await supabase
            .from('tenants')
            .select('id, name, slug, logo_url, status, subscription_status')
            .eq('slug', subdomain)
            .maybeSingle();

          if (fetchError) {
            setError({ type: 'error', message: fetchError.message });
            setTenant(null);
          } else if (!data) {
            setError({ type: 'not_found', message: 'Clinic not found' });
            setTenant(null);
          } else if (data.status !== 'active') {
            setError({ type: 'inactive', message: 'Clinic account is not active' });
            setTenant(null);
          } else {
            setTenant(data);
          }
          setLoading(false);
          return;
        }

        // Custom domain: www.smiledental.com
        if (isCustomDomain) {
          const { data, error: fetchError } = await supabase
            .from('domains')
            .select(`
              domain,
              is_primary,
              tenant:tenants (
                id, name, slug, logo_url, status, subscription_status
              )
            `)
            .eq('domain', hostname)
            .eq('dns_verified', true)
            .eq('is_active', true)
            .maybeSingle();

          if (fetchError) {
            setError({ type: 'not_found', message: 'Domain not configured' });
            setTenant(null);
          } else if (!data) {
            setError({ type: 'not_found', message: 'Domain not configured' });
            setTenant(null);
          } else if (data.tenant?.status !== 'active') {
            setError({ type: 'inactive', message: 'Clinic account is not active' });
            setTenant(null);
          } else {
            setTenant(data.tenant);
          }
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('Domain resolution error:', err);
        setError({ type: 'error', message: 'Failed to resolve domain' });
        setLoading(false);
      }
    };

    resolveTenant();
  }, [subdomain, isMainPlatform, isCustomDomain, hostname]);

  const value = {
    tenant,
    loading,
    error,
    subdomain,
    isMainPlatform,
    isCustomDomain,
    hostname,
    tenantId: tenant?.id || null,
    tenantSlug: tenant?.slug || subdomain || null,
  };

  return (
    <DomainContext.Provider value={value}>
      {children}
    </DomainContext.Provider>
  );
};

export default DomainResolver;
