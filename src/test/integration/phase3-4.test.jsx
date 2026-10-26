/**
 * Phase 3-4 Integration Tests
 * 
 * Tests for:
 * - Centralized API Client (src/lib/api.js)
 * - React API Hooks (src/hooks/useApi.js)
 * - JSDoc Type Annotations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Import the actual modules for export tests
import * as apiModule from '../../lib/api';
import * as useApiModule from '../../hooks/useApi';

// ============================================
// API CLIENT EXPORTS TESTS
// ============================================

describe('Phase 3.1: API Client Exports', () => {
  it('should export api object', () => {
    expect(apiModule.api).toBeDefined();
  });

  it('should export all CRUD methods', () => {
    const { api } = apiModule;
    
    expect(api.query).toBeDefined();
    expect(api.getById).toBeDefined();
    expect(api.insert).toBeDefined();
    expect(api.update).toBeDefined();
    expect(api.upsert).toBeDefined();
    expect(api.delete).toBeDefined();
  });

  it('should export additional methods', () => {
    const { api } = apiModule;
    
    expect(api.subscribe).toBeDefined();
    expect(api.rpc).toBeDefined();
    expect(api.uploadFile).toBeDefined();
    expect(api.deleteFile).toBeDefined();
  });

  it('should export supabase client', () => {
    expect(apiModule.supabase).toBeDefined();
  });
});

// ============================================
// API CLIENT METHOD SIGNATURES
// ============================================

describe('Phase 3.2: API Client Method Signatures', () => {
  describe('api.query', () => {
    it('should be a function', () => {
      expect(typeof apiModule.api.query).toBe('function');
    });
  });

  describe('api.getById', () => {
    it('should be a function', () => {
      expect(typeof apiModule.api.getById).toBe('function');
    });
  });

  describe('api.insert', () => {
    it('should be a function', () => {
      expect(typeof apiModule.api.insert).toBe('function');
    });
  });

  describe('api.update', () => {
    it('should be a function', () => {
      expect(typeof apiModule.api.update).toBe('function');
    });
  });

  describe('api.delete', () => {
    it('should be a function', () => {
      expect(typeof apiModule.api.delete).toBe('function');
    });
  });

  describe('api.upsert', () => {
    it('should be a function', () => {
      expect(typeof apiModule.api.upsert).toBe('function');
    });
  });

  describe('api.subscribe', () => {
    it('should be a function', () => {
      expect(typeof apiModule.api.subscribe).toBe('function');
    });
  });

  describe('api.rpc', () => {
    it('should be a function', () => {
      expect(typeof apiModule.api.rpc).toBe('function');
    });
  });
});

// ============================================
// API ERROR HANDLING
// ============================================

describe('Phase 3.3: API Response Format', () => {
  it('api.query should return an object with success property', async () => {
    const { api } = apiModule;
    
    // Call with a non-existent table to test the response format
    const result = await api.query('__test_nonexistent_table__');
    
    // Result should have success boolean
    expect(typeof result.success).toBe('boolean');
  });

  it('api methods should handle errors gracefully', async () => {
    const { api } = apiModule;
    
    // Call should not throw, but return error in result
    const result = await api.getById('__test__', 'invalid-id');
    
    expect(result).toHaveProperty('success');
  });
});

// ============================================
// REACT API HOOKS EXPORTS TESTS
// ============================================

describe('Phase 3.6: useApi Hooks Exports', () => {
  it('should export useApiQuery', () => {
    expect(useApiModule.useApiQuery).toBeDefined();
  });

  it('should export useApiGetById', () => {
    expect(useApiModule.useApiGetById).toBeDefined();
  });

  it('should export useApiMutation', () => {
    expect(useApiModule.useApiMutation).toBeDefined();
  });

  it('should export useApiInsert', () => {
    expect(useApiModule.useApiInsert).toBeDefined();
  });

  it('should export useApiUpdate', () => {
    expect(useApiModule.useApiUpdate).toBeDefined();
  });

  it('should export useApiDelete', () => {
    expect(useApiModule.useApiDelete).toBeDefined();
  });

  it('should export useApiSubscription', () => {
    expect(useApiModule.useApiSubscription).toBeDefined();
  });
});

// ============================================
// USE API QUERY HOOK TESTS
// ============================================

describe('Phase 3.7: useApiQuery Hook', () => {
  it('should return expected state shape', () => {
    const { useApiQuery } = useApiModule;
    
    // Disabled to avoid making actual API calls
    const { result } = renderHook(() => useApiQuery('test_table', {}, { enabled: false }));
    
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(result.current).toHaveProperty('isStale');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('isSuccess');
  });

  it('should not fetch when enabled is false', () => {
    const { useApiQuery } = useApiModule;
    
    const { result } = renderHook(() => useApiQuery('users', {}, { enabled: false }));
    
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });
});

// ============================================
// USE API GET BY ID HOOK TESTS
// ============================================

describe('Phase 3.8: useApiGetById Hook', () => {
  it('should return expected state shape', () => {
    const { useApiGetById } = useApiModule;
    
    const { result } = renderHook(() => useApiGetById('users', null));
    
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
  });

  it('should not fetch when id is null', () => {
    const { useApiGetById } = useApiModule;
    
    const { result } = renderHook(() => useApiGetById('users', null));
    
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('should not fetch when id is undefined', () => {
    const { useApiGetById } = useApiModule;
    
    const { result } = renderHook(() => useApiGetById('users', undefined));
    
    expect(result.current.loading).toBe(false);
  });
});

// ============================================
// USE API MUTATION HOOK TESTS
// ============================================

describe('Phase 3.9: useApiMutation Hook', () => {
  it('should return expected state shape', () => {
    const { useApiMutation } = useApiModule;
    
    const { result } = renderHook(() => useApiMutation('insert', 'test_table'));
    
    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('mutateAsync');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('reset');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isError');
    expect(result.current).toHaveProperty('isSuccess');
  });

  it('should have callable mutate function', () => {
    const { useApiMutation } = useApiModule;
    
    const { result } = renderHook(() => useApiMutation('insert', 'users'));
    
    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
  });
});

// ============================================
// USE API INSERT HOOK TESTS
// ============================================

describe('Phase 3.10: useApiInsert Hook', () => {
  it('should return expected state shape (same as mutation)', () => {
    const { useApiInsert } = useApiModule;
    
    const { result } = renderHook(() => useApiInsert('users'));
    
    // useApiInsert wraps useApiMutation, so returns same shape
    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('mutateAsync');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('data');
  });

  it('should have callable mutate function', () => {
    const { useApiInsert } = useApiModule;
    
    const { result } = renderHook(() => useApiInsert('users'));
    
    expect(typeof result.current.mutate).toBe('function');
  });
});

// ============================================
// USE API UPDATE HOOK TESTS
// ============================================

describe('Phase 3.11: useApiUpdate Hook', () => {
  it('should return expected state shape (same as mutation)', () => {
    const { useApiUpdate } = useApiModule;
    
    const { result } = renderHook(() => useApiUpdate('users'));
    
    // useApiUpdate wraps useApiMutation, so returns same shape
    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('mutateAsync');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('data');
  });

  it('should have callable mutate function', () => {
    const { useApiUpdate } = useApiModule;
    
    const { result } = renderHook(() => useApiUpdate('users'));
    
    expect(typeof result.current.mutate).toBe('function');
  });
});

// ============================================
// USE API DELETE HOOK TESTS
// ============================================

describe('Phase 3.12: useApiDelete Hook', () => {
  it('should return expected state shape (same as mutation)', () => {
    const { useApiDelete } = useApiModule;
    
    const { result } = renderHook(() => useApiDelete('users'));
    
    // useApiDelete wraps useApiMutation, so returns same shape
    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('mutateAsync');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
  });

  it('should have callable mutate function', () => {
    const { useApiDelete } = useApiModule;
    
    const { result } = renderHook(() => useApiDelete('users'));
    
    expect(typeof result.current.mutate).toBe('function');
  });
});

// ============================================
// USE API SUBSCRIPTION HOOK TESTS
// ============================================

describe('Phase 3.13: useApiSubscription Hook', () => {
  it('should be a function', () => {
    expect(typeof useApiModule.useApiSubscription).toBe('function');
  });

  it('should accept table and callback arguments', () => {
    const { useApiSubscription } = useApiModule;
    const callback = vi.fn();
    
    // Should not throw with disabled subscription
    expect(() => {
      renderHook(() => useApiSubscription('users', callback, { enabled: false }));
    }).not.toThrow();
  });
});

// ============================================
// PHASE 4: JSDOC TYPE ANNOTATIONS
// ============================================

describe('Phase 4: JSDoc Type Annotations', () => {
  describe('API Client Types', () => {
    it('should have all exported functions as functions', () => {
      const { api } = apiModule;
      
      // All functions should exist - types are compile-time checked
      expect(typeof api.query).toBe('function');
      expect(typeof api.getById).toBe('function');
      expect(typeof api.insert).toBe('function');
      expect(typeof api.update).toBe('function');
      expect(typeof api.upsert).toBe('function');
      expect(typeof api.delete).toBe('function');
      expect(typeof api.subscribe).toBe('function');
      expect(typeof api.rpc).toBe('function');
      expect(typeof api.uploadFile).toBe('function');
      expect(typeof api.deleteFile).toBe('function');
    });
  });

  describe('Hook Types', () => {
    it('should export all hooks as functions', () => {
      // All hooks should be functions
      expect(typeof useApiModule.useApiQuery).toBe('function');
      expect(typeof useApiModule.useApiGetById).toBe('function');
      expect(typeof useApiModule.useApiMutation).toBe('function');
      expect(typeof useApiModule.useApiInsert).toBe('function');
      expect(typeof useApiModule.useApiUpdate).toBe('function');
      expect(typeof useApiModule.useApiDelete).toBe('function');
      expect(typeof useApiModule.useApiSubscription).toBe('function');
    });
  });
});

// ============================================
// INTEGRATION TESTS: API + HOOKS TOGETHER
// ============================================

describe('Phase 3-4 Integration: API Client with Hooks', () => {
  it('should have api.query and useApiQuery available', () => {
    expect(apiModule.api.query).toBeDefined();
    expect(useApiModule.useApiQuery).toBeDefined();
  });

  it('should have api.insert and useApiInsert available', () => {
    expect(apiModule.api.insert).toBeDefined();
    expect(useApiModule.useApiInsert).toBeDefined();
  });

  it('should have api.update and useApiUpdate available', () => {
    expect(apiModule.api.update).toBeDefined();
    expect(useApiModule.useApiUpdate).toBeDefined();
  });

  it('should have api.delete and useApiDelete available', () => {
    expect(apiModule.api.delete).toBeDefined();
    expect(useApiModule.useApiDelete).toBeDefined();
  });

  it('should have api.subscribe and useApiSubscription available', () => {
    expect(apiModule.api.subscribe).toBeDefined();
    expect(useApiModule.useApiSubscription).toBeDefined();
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe('Phase 3.14: Error Handling', () => {
  it('api methods should return error in result object', async () => {
    const { api } = apiModule;
    
    // Call with invalid parameters
    const result = await api.query('__test_nonexistent__');
    
    // Should not throw, should return result with success/error
    expect(result).toHaveProperty('success');
  });

  it('api should handle missing table gracefully', async () => {
    const { api } = apiModule;
    
    const result = await api.getById('', '');
    
    expect(result).toHaveProperty('success');
  });
});
