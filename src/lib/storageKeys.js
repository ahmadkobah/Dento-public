/**
 * Centralized Storage Keys
 * 
 * Single source of truth for all localStorage keys used across the application.
 * This prevents key collisions and makes key management easier.
 */

// Namespace prefix to avoid collisions with other apps on the same domain
const PREFIX = 'dento';

/**
 * Storage key definitions
 */
export const STORAGE_KEYS = {
  // Tenant selection
  DEVELOPER_TENANT_ID: `${PREFIX}:developer:tenantId`,
  ADMIN_TENANT_ID: `${PREFIX}:admin:tenantId`,
  
  // Authentication
  AUTH_TOKEN: `${PREFIX}:auth:token`,
  AUTH_REFRESH_TOKEN: `${PREFIX}:auth:refreshToken`,
  AUTH_USER: `${PREFIX}:auth:user`,
  
  // UI Preferences
  SIDEBAR_COLLAPSED: `${PREFIX}:ui:sidebarCollapsed`,
  THEME: `${PREFIX}:ui:theme`,
  LANGUAGE: `${PREFIX}:ui:language`,
  
  // Developer Portal
  DEV_LAST_ROUTE: `${PREFIX}:developer:lastRoute`,
  
  // Admin Portal
  ADMIN_LAST_ROUTE: `${PREFIX}:admin:lastRoute`,
  
  // Legacy keys (for backward compatibility migration)
  LEGACY: {
    DEV_PORTAL_TENANT: 'devPortal_selectedTenantId',
    ADMIN_TENANT: 'dev_tenant_id',
  },
};

/**
 * Migrate legacy storage keys to new format
 * Call this on app initialization
 */
export function migrateLegacyStorageKeys() {
  const migrations = [
    {
      from: STORAGE_KEYS.LEGACY.DEV_PORTAL_TENANT,
      to: STORAGE_KEYS.DEVELOPER_TENANT_ID,
    },
    {
      from: STORAGE_KEYS.LEGACY.ADMIN_TENANT,
      to: STORAGE_KEYS.ADMIN_TENANT_ID,
    },
  ];

  migrations.forEach(({ from, to }) => {
    const oldValue = localStorage.getItem(from);
    if (oldValue && !localStorage.getItem(to)) {
      localStorage.setItem(to, oldValue);
      localStorage.removeItem(from);
      console.info(`Migrated storage key: ${from} → ${to}`);
    }
  });
}

/**
 * Get storage key for tenant ID based on portal mode
 * @param {'developer' | 'admin' | 'public'} mode 
 * @returns {string}
 */
export function getTenantStorageKey(mode) {
  switch (mode) {
    case 'developer':
      return STORAGE_KEYS.DEVELOPER_TENANT_ID;
    case 'admin':
      return STORAGE_KEYS.ADMIN_TENANT_ID;
    default:
      return STORAGE_KEYS.ADMIN_TENANT_ID;
  }
}

/**
 * Clear all Dento storage keys
 * Useful for logout
 */
export function clearAllDentoStorage() {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(PREFIX)) {
      localStorage.removeItem(key);
    }
  });
  
  // Also clear legacy keys
  Object.values(STORAGE_KEYS.LEGACY).forEach(key => {
    localStorage.removeItem(key);
  });
}

export default STORAGE_KEYS;
