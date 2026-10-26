import { useMemo } from 'react';

/**
 * useSubdomain Hook
 * Extracts the subdomain from the current URL
 * 
 * Examples:
 * - smile-dental.dento.app -> 'smile-dental'
 * - app.dento.com -> null (main app)
 * - localhost:5173 -> null (development, use ?tenant=slug)
 * - dento-xyz.vercel.app -> null (preview deployment)
 * - *.app.github.dev -> null (Codespace preview)
 * - www.smiledental.com -> null (custom domain, resolved separately)
 */
export const useSubdomain = () => {
  const subdomain = useMemo(() => {
    const hostname = window.location.hostname;
    
    // Development: localhost or 127.0.0.1
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Check for query param override in dev
      const params = new URLSearchParams(window.location.search);
      return params.get('tenant') || null;
    }

    // Preview / CI deployments: treat as main platform (not custom domain)
    if (isPreviewDomain(hostname)) {
      const params = new URLSearchParams(window.location.search);
      return params.get('tenant') || null;
    }
    
    // Production: Check for dento.app subdomain
    if (hostname.endsWith('.dento.app')) {
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        const sub = parts[0];
        // Exclude 'app' and 'www' as they're not tenant subdomains
        if (sub !== 'app' && sub !== 'www') {
          return sub;
        }
      }
      return null;
    }
    
    // Production: app.dento.com (main platform)
    if (hostname === 'app.dento.com' || hostname === 'dento.com') {
      return null;
    }
    
    // Custom domain: Will be resolved via DomainResolver
    return null;
  }, []);

  const isMainPlatform = useMemo(() => {
    const hostname = window.location.hostname;
    return hostname === 'app.dento.com' || 
           hostname === 'dento.com' || 
           hostname === 'localhost' ||
           hostname === '127.0.0.1' ||
           isPreviewDomain(hostname);
  }, []);

  const isCustomDomain = useMemo(() => {
    const hostname = window.location.hostname;
    return !hostname.endsWith('.dento.app') && 
           hostname !== 'app.dento.com' && 
           hostname !== 'dento.com' &&
           hostname !== 'localhost' &&
           hostname !== '127.0.0.1' &&
           !isPreviewDomain(hostname);
  }, []);

  return {
    subdomain,
    isMainPlatform,
    isCustomDomain,
    hostname: window.location.hostname,
  };
};

/**
 * Check if the hostname is a known preview/CI deployment domain
 * that should be treated as main platform (not a custom client domain).
 */
function isPreviewDomain(hostname) {
  return hostname.endsWith('.vercel.app') ||
         hostname.endsWith('.app.github.dev') ||
         hostname.endsWith('.github.dev') ||
         hostname.endsWith('.preview.app') ||
         hostname.endsWith('.gitpod.io') ||
         hostname.endsWith('.codespaces.dev') ||
         hostname.endsWith('.ngrok.io') ||
         hostname.endsWith('.ngrok-free.app');
}

export default useSubdomain;
