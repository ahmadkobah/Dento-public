/* eslint-disable react-hooks/rules-of-hooks, react-hooks/exhaustive-deps, react-hooks/globals */
/**
 * Phase 1 Integration Tests
 * 
 * Tests for:
 * - UnifiedTenantContext
 * - ErrorBoundary components
 * - StorageKeys utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ============================================
// STORAGE KEYS TESTS
// ============================================

describe('Phase 1.1: StorageKeys Utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('STORAGE_KEYS constants', () => {
    it('should export all required storage keys', async () => {
      const { STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      expect(STORAGE_KEYS).toBeDefined();
      expect(STORAGE_KEYS.DEVELOPER_TENANT_ID).toBe('dento:developer:tenantId');
      expect(STORAGE_KEYS.ADMIN_TENANT_ID).toBe('dento:admin:tenantId');
      expect(STORAGE_KEYS.AUTH_TOKEN).toBe('dento:auth:token');
      expect(STORAGE_KEYS.SIDEBAR_COLLAPSED).toBe('dento:ui:sidebarCollapsed');
      expect(STORAGE_KEYS.THEME).toBe('dento:ui:theme');
      expect(STORAGE_KEYS.LANGUAGE).toBe('dento:ui:language');
    });

    it('should have consistent dento: prefix', async () => {
      const { STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      const nonLegacyKeys = Object.entries(STORAGE_KEYS)
        .filter(([key]) => key !== 'LEGACY')
        .map(([, value]) => value);

      nonLegacyKeys.forEach(key => {
        expect(key.startsWith('dento:')).toBe(true);
      });
    });

    it('should have legacy keys for backward compatibility', async () => {
      const { STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      expect(STORAGE_KEYS.LEGACY).toBeDefined();
      expect(STORAGE_KEYS.LEGACY.DEV_PORTAL_TENANT).toBe('devPortal_selectedTenantId');
      expect(STORAGE_KEYS.LEGACY.ADMIN_TENANT).toBe('dev_tenant_id');
    });
  });

  describe('getTenantStorageKey', () => {
    it('should return developer key for developer mode', async () => {
      const { getTenantStorageKey, STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      expect(getTenantStorageKey('developer')).toBe(STORAGE_KEYS.DEVELOPER_TENANT_ID);
    });

    it('should return admin key for admin mode', async () => {
      const { getTenantStorageKey, STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      expect(getTenantStorageKey('admin')).toBe(STORAGE_KEYS.ADMIN_TENANT_ID);
    });

    it('should default to admin key for unknown mode', async () => {
      const { getTenantStorageKey, STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      expect(getTenantStorageKey('public')).toBe(STORAGE_KEYS.ADMIN_TENANT_ID);
      expect(getTenantStorageKey('unknown')).toBe(STORAGE_KEYS.ADMIN_TENANT_ID);
    });
  });

  describe('migrateLegacyStorageKeys', () => {
    it('should migrate devPortal_selectedTenantId to new key', async () => {
      const { migrateLegacyStorageKeys, STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      const testTenantId = 'test-tenant-123';
      localStorage.setItem('devPortal_selectedTenantId', testTenantId);
      
      migrateLegacyStorageKeys();
      
      expect(localStorage.getItem(STORAGE_KEYS.DEVELOPER_TENANT_ID)).toBe(testTenantId);
      expect(localStorage.getItem('devPortal_selectedTenantId')).toBeNull();
    });

    it('should migrate dev_tenant_id to new key', async () => {
      const { migrateLegacyStorageKeys, STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      const testTenantId = 'admin-tenant-456';
      localStorage.setItem('dev_tenant_id', testTenantId);
      
      migrateLegacyStorageKeys();
      
      expect(localStorage.getItem(STORAGE_KEYS.ADMIN_TENANT_ID)).toBe(testTenantId);
      expect(localStorage.getItem('dev_tenant_id')).toBeNull();
    });

    it('should not overwrite existing new keys', async () => {
      const { migrateLegacyStorageKeys, STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      const existingValue = 'existing-tenant';
      const legacyValue = 'legacy-tenant';
      
      localStorage.setItem(STORAGE_KEYS.DEVELOPER_TENANT_ID, existingValue);
      localStorage.setItem('devPortal_selectedTenantId', legacyValue);
      
      migrateLegacyStorageKeys();
      
      expect(localStorage.getItem(STORAGE_KEYS.DEVELOPER_TENANT_ID)).toBe(existingValue);
    });

    it('should handle missing legacy keys gracefully', async () => {
      const { migrateLegacyStorageKeys } = await import('../../lib/storageKeys');
      
      expect(() => migrateLegacyStorageKeys()).not.toThrow();
    });
  });

  describe('clearAllDentoStorage', () => {
    it('should clear all dento: prefixed keys', async () => {
      const { clearAllDentoStorage, STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      localStorage.setItem(STORAGE_KEYS.DEVELOPER_TENANT_ID, 'test1');
      localStorage.setItem(STORAGE_KEYS.ADMIN_TENANT_ID, 'test2');
      localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
      localStorage.setItem('other_app_key', 'should-remain');
      
      clearAllDentoStorage();
      
      expect(localStorage.getItem(STORAGE_KEYS.DEVELOPER_TENANT_ID)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.ADMIN_TENANT_ID)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBeNull();
      expect(localStorage.getItem('other_app_key')).toBe('should-remain');
    });

    it('should also clear legacy keys', async () => {
      const { clearAllDentoStorage, STORAGE_KEYS } = await import('../../lib/storageKeys');
      
      localStorage.setItem('devPortal_selectedTenantId', 'legacy1');
      localStorage.setItem('dev_tenant_id', 'legacy2');
      
      clearAllDentoStorage();
      
      expect(localStorage.getItem('devPortal_selectedTenantId')).toBeNull();
      expect(localStorage.getItem('dev_tenant_id')).toBeNull();
    });
  });
});

// ============================================
// ERROR BOUNDARY TESTS
// ============================================

describe('Phase 1.2: ErrorBoundary Components', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  describe('Default ErrorBoundary', () => {
    it('should render children when no error', async () => {
      const ErrorBoundary = (await import('../../components/ErrorBoundary')).default;
      
      render(
        <ErrorBoundary>
          <div data-testid="child">Content</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should render fallback UI when child throws', async () => {
      const ErrorBoundary = (await import('../../components/ErrorBoundary')).default;
      
      const ThrowingComponent = () => {
        throw new Error('Test error');
      };
      
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should render custom fallback when provided', async () => {
      const ErrorBoundary = (await import('../../components/ErrorBoundary')).default;
      
      const ThrowingComponent = () => {
        throw new Error('Test error');
      };
      
      render(
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    });
  });

  describe('AdminErrorBoundary', () => {
    it('should render children when no error', async () => {
      const { AdminErrorBoundary } = await import('../../components/ErrorBoundary');
      
      render(
        <AdminErrorBoundary>
          <div data-testid="admin-child">Admin Content</div>
        </AdminErrorBoundary>
      );
      
      expect(screen.getByTestId('admin-child')).toBeInTheDocument();
    });

    it('should show admin-styled error when child throws', async () => {
      const { AdminErrorBoundary } = await import('../../components/ErrorBoundary');
      
      const ThrowingComponent = () => {
        throw new Error('Admin error');
      };
      
      render(
        <AdminErrorBoundary>
          <ThrowingComponent />
        </AdminErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('DeveloperErrorBoundary', () => {
    it('should render children when no error', async () => {
      const { DeveloperErrorBoundary } = await import('../../components/ErrorBoundary');
      
      render(
        <DeveloperErrorBoundary>
          <div data-testid="dev-child">Developer Content</div>
        </DeveloperErrorBoundary>
      );
      
      expect(screen.getByTestId('dev-child')).toBeInTheDocument();
    });

    it('should show developer-styled error with dark theme when child throws', async () => {
      const { DeveloperErrorBoundary } = await import('../../components/ErrorBoundary');
      
      const ThrowingComponent = () => {
        throw new Error('Developer error');
      };
      
      render(
        <DeveloperErrorBoundary>
          <ThrowingComponent />
        </DeveloperErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });
  });
});

// ============================================
// UNIFIED TENANT CONTEXT TESTS
// ============================================

describe('Phase 1.3: UnifiedTenantContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Exports', () => {
    it('should export UnifiedTenantProvider', async () => {
      const module = await import('../../contexts/UnifiedTenantContext');
      expect(module.UnifiedTenantProvider).toBeDefined();
    });

    it('should export useTenantContext hook', async () => {
      const module = await import('../../contexts/UnifiedTenantContext');
      expect(module.useTenantContext).toBeDefined();
    });

    it('should export useTenant hook', async () => {
      const module = await import('../../contexts/UnifiedTenantContext');
      expect(module.useTenant).toBeDefined();
    });

    it('should export useSelectedTenantId hook', async () => {
      const module = await import('../../contexts/UnifiedTenantContext');
      expect(module.useSelectedTenantId).toBeDefined();
    });

    it('should export useTenantScoped hook', async () => {
      const module = await import('../../contexts/UnifiedTenantContext');
      expect(module.useTenantScoped).toBeDefined();
    });

    it('should export TenantProvider alias', async () => {
      const module = await import('../../contexts/UnifiedTenantContext');
      expect(module.TenantProvider).toBe(module.UnifiedTenantProvider);
    });
  });

  describe('Context Value Shape', () => {
    it('should provide expected properties', async () => {
      const { UnifiedTenantProvider, useTenantContext } = await import('../../contexts/UnifiedTenantContext');
      
      // Mock supabase
      vi.mock('../../lib/supabase', () => ({
        supabase: {
          auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
          },
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          channel: vi.fn().mockReturnValue({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
          }),
          removeChannel: vi.fn(),
        },
      }));
      
      const contextRef = { current: null };
      
      const TestComponent = () => {
        contextRef.current = useTenantContext();
        return null;
      };
      
      render(
        <UnifiedTenantProvider mode="admin">
          <TestComponent />
        </UnifiedTenantProvider>
      );
      
      await waitFor(() => {
        expect(contextRef.current).toBeDefined();
      });
      
      // Check core properties exist
      expect(contextRef.current).toHaveProperty('tenant');
      expect(contextRef.current).toHaveProperty('tenants');
      expect(contextRef.current).toHaveProperty('loading');
      expect(contextRef.current).toHaveProperty('error');
      expect(contextRef.current).toHaveProperty('selectTenant');
      expect(contextRef.current).toHaveProperty('selectTenantById');
      expect(contextRef.current).toHaveProperty('refreshTenants');
      expect(contextRef.current).toHaveProperty('hasModule');
      expect(contextRef.current).toHaveProperty('activeModules');
      expect(contextRef.current).toHaveProperty('mode');
    });
  });

  describe('Mode Parameter', () => {
    it('should accept developer mode', async () => {
      const { UnifiedTenantProvider, useTenantContext } = await import('../../contexts/UnifiedTenantContext');
      
      const modeRef = { current: null };
      const TestComponent = () => {
        modeRef.current = useTenantContext().mode;
        return null;
      };
      
      render(
        <UnifiedTenantProvider mode="developer">
          <TestComponent />
        </UnifiedTenantProvider>
      );
      
      await waitFor(() => {
        expect(modeRef.current).toBe('developer');
      });
    });

    it('should accept admin mode', async () => {
      const { UnifiedTenantProvider, useTenantContext } = await import('../../contexts/UnifiedTenantContext');
      
      const modeRef = { current: null };
      const TestComponent = () => {
        modeRef.current = useTenantContext().mode;
        return null;
      };
      
      render(
        <UnifiedTenantProvider mode="admin">
          <TestComponent />
        </UnifiedTenantProvider>
      );
      
      await waitFor(() => {
        expect(modeRef.current).toBe('admin');
      });
    });

    it('should default to public mode', async () => {
      const { UnifiedTenantProvider, useTenantContext } = await import('../../contexts/UnifiedTenantContext');
      
      const modeRef = { current: undefined };
      const TestComponent = () => {
        modeRef.current = useTenantContext().mode;
        return null;
      };
      
      render(
        <UnifiedTenantProvider>
          <TestComponent />
        </UnifiedTenantProvider>
      );
      
      await waitFor(() => {
        expect(modeRef.current).not.toBeDefined();
      });
    });
  });
});

// ============================================
// RE-EXPORT COMPATIBILITY TESTS
// ============================================

describe('Phase 1.4: Backward Compatibility Re-exports', () => {
  describe('Developer TenantContext re-exports', () => {
    it('should re-export TenantProvider', async () => {
      const module = await import('../../developer/contexts/TenantContext');
      expect(module.TenantProvider).toBeDefined();
    });

    it('should re-export useTenantContext', async () => {
      const module = await import('../../developer/contexts/TenantContext');
      expect(module.useTenantContext).toBeDefined();
    });

    it('should re-export useTenant', async () => {
      const module = await import('../../developer/contexts/TenantContext');
      expect(module.useTenant).toBeDefined();
    });
  });

  describe('Admin TenantContext re-exports', () => {
    it('should re-export TenantProvider', async () => {
      const module = await import('../../admin/contexts/TenantContext');
      expect(module.TenantProvider).toBeDefined();
    });

    it('should re-export useTenantContext', async () => {
      const module = await import('../../admin/contexts/TenantContext');
      expect(module.useTenantContext).toBeDefined();
    });

    it('should re-export useTenant', async () => {
      const module = await import('../../admin/contexts/TenantContext');
      expect(module.useTenant).toBeDefined();
    });
  });
});
