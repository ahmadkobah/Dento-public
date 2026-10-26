/**
 * Phase 2 Integration Tests
 * 
 * Tests for:
 * - useAsync hook
 * - useMutation hook
 * - useDebouncedAsync hook
 * - createFilterKey utility
 * - Shared hooks exports
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ============================================
// SHARED HOOKS EXPORTS TESTS
// ============================================

describe('Phase 2.1: Shared Hooks Index Exports', () => {
  it('should export useAsync', async () => {
    const module = await import('../../hooks/shared/index');
    expect(module.useAsync).toBeDefined();
  });

  it('should export useMutation', async () => {
    const module = await import('../../hooks/shared/index');
    expect(module.useMutation).toBeDefined();
  });

  it('should export useDebouncedAsync', async () => {
    const module = await import('../../hooks/shared/index');
    expect(module.useDebouncedAsync).toBeDefined();
  });

  it('should export createFilterKey', async () => {
    const module = await import('../../hooks/shared/index');
    expect(module.createFilterKey).toBeDefined();
  });

  it('should export useSupabaseQuery', async () => {
    const module = await import('../../hooks/shared/index');
    expect(module.useSupabaseQuery).toBeDefined();
  });

  it('should export useSupabaseMutation', async () => {
    const module = await import('../../hooks/shared/index');
    expect(module.useSupabaseMutation).toBeDefined();
  });

  it('should export useApi hooks', async () => {
    const module = await import('../../hooks/shared/index');
    expect(module.useApiQuery).toBeDefined();
    expect(module.useApiGetById).toBeDefined();
    expect(module.useApiMutation).toBeDefined();
    expect(module.useApiInsert).toBeDefined();
    expect(module.useApiUpdate).toBeDefined();
    expect(module.useApiDelete).toBeDefined();
    expect(module.useApiSubscription).toBeDefined();
  });
});

// ============================================
// CREATE FILTER KEY TESTS
// ============================================

describe('Phase 2.2: createFilterKey Utility', () => {
  it('should create consistent key for same inputs', async () => {
    const { createFilterKey } = await import('../../hooks/shared/useAsync');
    
    // createFilterKey takes a single object parameter
    const key1 = createFilterKey({ status: 'active', page: 1 });
    const key2 = createFilterKey({ status: 'active', page: 1 });
    
    expect(key1).toBe(key2);
  });

  it('should create different keys for different filters', async () => {
    const { createFilterKey } = await import('../../hooks/shared/useAsync');
    
    const key1 = createFilterKey({ status: 'active' });
    const key2 = createFilterKey({ status: 'inactive' });
    
    expect(key1).not.toBe(key2);
  });

  it('should handle empty filters', async () => {
    const { createFilterKey } = await import('../../hooks/shared/useAsync');
    
    const key1 = createFilterKey({});
    const key2 = createFilterKey({});
    
    expect(key1).toBe(key2);
    expect(key1).toBe('');
  });

  it('should handle null and undefined filter values', async () => {
    const { createFilterKey } = await import('../../hooks/shared/useAsync');
    
    // null and undefined are filtered out
    const key1 = createFilterKey({ a: null, b: undefined });
    const key2 = createFilterKey({ a: null, b: undefined });
    
    expect(key1).toBe(key2);
    expect(key1).toBe(''); // Both are filtered out
  });

  it('should handle nested objects', async () => {
    const { createFilterKey } = await import('../../hooks/shared/useAsync');
    
    const key1 = createFilterKey({ filter: { status: 'active' } });
    const key2 = createFilterKey({ filter: { status: 'active' } });
    
    expect(key1).toBe(key2);
  });

  it('should handle arrays in filters', async () => {
    const { createFilterKey } = await import('../../hooks/shared/useAsync');
    
    const key1 = createFilterKey({ tags: ['a', 'b', 'c'] });
    const key2 = createFilterKey({ tags: ['a', 'b', 'c'] });
    
    expect(key1).toBe(key2);
  });

  it('should sort keys alphabetically for consistency', async () => {
    const { createFilterKey } = await import('../../hooks/shared/useAsync');
    
    const key1 = createFilterKey({ z: 1, a: 2, m: 3 });
    const key2 = createFilterKey({ a: 2, m: 3, z: 1 });
    
    expect(key1).toBe(key2);
  });
});

// ============================================
// USE ASYNC HOOK TESTS
// ============================================

describe('Phase 2.3: useAsync Hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should start in loading state when immediate is true', async () => {
      const { useAsync } = await import('../../hooks/shared/useAsync');
      
      const asyncFn = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      
      // useAsync(asyncFn, options) - options.immediate defaults to true
      const { result } = renderHook(() => useAsync(asyncFn, { immediate: true }));
      
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should not execute when immediate is false', async () => {
      const { useAsync } = await import('../../hooks/shared/useAsync');
      
      const asyncFn = vi.fn().mockResolvedValue('data');
      
      const { result } = renderHook(() => useAsync(asyncFn, { immediate: false }));
      
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(asyncFn).not.toHaveBeenCalled();
    });

    it('should return data on success', async () => {
      const { useAsync } = await import('../../hooks/shared/useAsync');
      
      const asyncFn = vi.fn().mockResolvedValue({ name: 'Test' });
      
      const { result } = renderHook(() => useAsync(asyncFn, { immediate: true }));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.data).toEqual({ name: 'Test' });
      expect(result.current.error).toBeNull();
    });

    it('should return error on failure', async () => {
      const { useAsync } = await import('../../hooks/shared/useAsync');
      
      const asyncFn = vi.fn().mockRejectedValue(new Error('Test error'));
      
      // Don't use immediate: true to avoid unhandled rejection
      const { result } = renderHook(() => useAsync(asyncFn, { immediate: false }));
      
      // Manually trigger and catch the error
      await act(async () => {
        try {
          await result.current.refetch();
        } catch {
          // Expected to throw
        }
      });
      
      // Error should be the error message string
      expect(result.current.error).toBe('Test error');
      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it('should expose refetch function for manual trigger', async () => {
      const { useAsync } = await import('../../hooks/shared/useAsync');
      
      const asyncFn = vi.fn().mockResolvedValue('result');
      
      const { result } = renderHook(() => useAsync(asyncFn, { immediate: false }));
      
      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
      
      await act(async () => {
        await result.current.refetch();
      });
      
      expect(asyncFn).toHaveBeenCalledTimes(1);
      expect(result.current.data).toBe('result');
    });
  });

  describe('State Shape', () => {
    it('should have all expected properties', async () => {
      const { useAsync } = await import('../../hooks/shared/useAsync');
      
      const asyncFn = vi.fn().mockResolvedValue('data');
      
      const { result } = renderHook(() => useAsync(asyncFn, { immediate: false }));
      
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('setData');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('isSuccess');
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback on success', async () => {
      const { useAsync } = await import('../../hooks/shared/useAsync');
      
      const onSuccess = vi.fn();
      const asyncFn = vi.fn().mockResolvedValue({ id: 1 });
      
      const { result } = renderHook(() => 
        useAsync(asyncFn, { immediate: true, onSuccess })
      );
      
      await waitFor(() => expect(result.current.loading).toBe(false));
      
      expect(onSuccess).toHaveBeenCalledWith({ id: 1 });
    });

    it('should call onError callback on failure', async () => {
      const { useAsync } = await import('../../hooks/shared/useAsync');
      
      const onError = vi.fn();
      const error = new Error('Failure');
      const asyncFn = vi.fn().mockRejectedValue(error);
      
      // Don't use immediate: true to avoid unhandled rejection
      const { result } = renderHook(() => 
        useAsync(asyncFn, { immediate: false, onError })
      );
      
      // Manually trigger and catch the error
      await act(async () => {
        try {
          await result.current.refetch();
        } catch {
          // Expected to throw
        }
      });
      
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});

// ============================================
// USE MUTATION HOOK TESTS
// ============================================

describe('Phase 2.4: useMutation Hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should start in idle state', async () => {
      const { useMutation } = await import('../../hooks/shared/useAsync');
      
      const mutationFn = vi.fn();
      
      const { result } = renderHook(() => useMutation(mutationFn));
      
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should provide mutate function', async () => {
      const { useMutation } = await import('../../hooks/shared/useAsync');
      
      const mutationFn = vi.fn();
      
      const { result } = renderHook(() => useMutation(mutationFn));
      
      expect(result.current.mutate).toBeDefined();
      expect(typeof result.current.mutate).toBe('function');
    });

    it('should execute mutation and return data', async () => {
      const { useMutation } = await import('../../hooks/shared/useAsync');
      
      const mutationFn = vi.fn().mockResolvedValue({ id: 123 });
      
      const { result } = renderHook(() => useMutation(mutationFn));
      
      await act(async () => {
        await result.current.mutate({ name: 'Test' });
      });
      
      expect(mutationFn).toHaveBeenCalledWith({ name: 'Test' });
      expect(result.current.data).toEqual({ id: 123 });
      expect(result.current.loading).toBe(false);
    });

    it('should set loading during mutation', async () => {
      const { useMutation } = await import('../../hooks/shared/useAsync');
      
      let resolveFn;
      const mutationFn = vi.fn().mockImplementation(() => {
        return new Promise(resolve => { resolveFn = resolve; });
      });
      
      const { result } = renderHook(() => useMutation(mutationFn));
      
      let mutatePromise;
      act(() => {
        mutatePromise = result.current.mutate({});
      });
      
      expect(result.current.loading).toBe(true);
      
      await act(async () => {
        resolveFn({ success: true });
        await mutatePromise;
      });
      
      expect(result.current.loading).toBe(false);
    });
  });

  describe('State Shape', () => {
    it('should have all expected properties', async () => {
      const { useMutation } = await import('../../hooks/shared/useAsync');
      
      const mutationFn = vi.fn();
      
      const { result } = renderHook(() => useMutation(mutationFn));
      
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
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback', async () => {
      const { useMutation } = await import('../../hooks/shared/useAsync');
      
      const onSuccess = vi.fn();
      const mutationFn = vi.fn().mockResolvedValue({ created: true });
      
      const { result } = renderHook(() => useMutation(mutationFn, { onSuccess }));
      
      await act(async () => {
        await result.current.mutate({});
      });
      
      // onSuccess is called with (data, variables)
      expect(onSuccess).toHaveBeenCalled();
      expect(onSuccess.mock.calls[0][0]).toEqual({ created: true });
    });

    it('should call onError callback', async () => {
      const { useMutation } = await import('../../hooks/shared/useAsync');
      
      const onError = vi.fn();
      const error = new Error('Failed');
      const mutationFn = vi.fn().mockRejectedValue(error);
      
      const { result } = renderHook(() => useMutation(mutationFn, { onError }));
      
      await act(async () => {
        try {
          await result.current.mutateAsync({});
        } catch {
          // Expected to throw
        }
      });
      
      // onError is called with (error, variables)
      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toBe(error);
    });

    it('should call onSettled after success', async () => {
      const { useMutation } = await import('../../hooks/shared/useAsync');
      
      const onSettled = vi.fn();
      const mutationFn = vi.fn().mockResolvedValue({ done: true });
      
      const { result } = renderHook(() => useMutation(mutationFn, { onSettled }));
      
      await act(async () => {
        await result.current.mutate({});
      });
      
      expect(onSettled).toHaveBeenCalled();
    });
  });

  describe('Reset Function', () => {
    it('should reset state to initial values', async () => {
      const { useMutation } = await import('../../hooks/shared/useAsync');
      
      const mutationFn = vi.fn().mockResolvedValue({ data: 'test' });
      
      const { result } = renderHook(() => useMutation(mutationFn));
      
      await act(async () => {
        await result.current.mutate({});
      });
      
      expect(result.current.data).toEqual({ data: 'test' });
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });
});

// ============================================
// USE DEBOUNCED ASYNC TESTS
// ============================================

describe('Phase 2.5: useDebouncedAsync Hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be a function', async () => {
    const { useDebouncedAsync } = await import('../../hooks/shared/useAsync');
    expect(typeof useDebouncedAsync).toBe('function');
  });

  it('should return expected state shape', async () => {
    const { useDebouncedAsync } = await import('../../hooks/shared/useAsync');
    
    const asyncFn = vi.fn().mockResolvedValue('data');
    
    const { result } = renderHook(() => 
      useDebouncedAsync(asyncFn, { enabled: false, delay: 300 })
    );
    
    // Should have same shape as useAsync
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
  });
});
