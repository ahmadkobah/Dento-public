/**
 * Generic Async Hooks
 * 
 * Reusable hooks for async data fetching and mutations.
 * Used across all portals for consistent data handling patterns.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Create a stable key from an object for use in dependency arrays.
 * Prevents re-renders from object reference changes.
 * 
 * @param {Object} obj - Object to convert to key
 * @returns {string} Stable string key
 */
export function createFilterKey(obj = {}) {
  if (!obj || typeof obj !== 'object') return '';
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('|');
}

/**
 * Generic async data fetching hook with cleanup for React Strict Mode
 * 
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Configuration options
 * @param {boolean} options.immediate - Execute immediately on mount (default: true)
 * @param {Array} options.deps - Additional dependencies to trigger refetch
 * @param {boolean} options.enabled - Enable/disable fetching (default: true)
 * @param {Function} options.onSuccess - Callback on successful fetch
 * @param {Function} options.onError - Callback on error
 * 
 * @returns {Object} { data, loading, error, refetch, setData }
 */
export function useAsync(asyncFn, options = {}) {
  const {
    immediate = true,
    deps = [],
    enabled = true,
    onSuccess,
    onError,
  } = typeof options === 'boolean' 
    ? { immediate: options } // Legacy support for useAsync(fn, immediate)
    : options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate && enabled);
  const [error, setError] = useState(null);
  
  // Track if component is mounted
  const isMountedRef = useRef(true);
  
  // Store latest asyncFn in ref to avoid stale closures
  const asyncFnRef = useRef(asyncFn);
  asyncFnRef.current = asyncFn;

  const execute = useCallback(async (...args) => {
    if (!isMountedRef.current) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFnRef.current(...args);
      
      if (isMountedRef.current) {
        setData(result);
        onSuccess?.(result);
      }
      
      return result;
    } catch (err) {
      // Ignore abort errors from React Strict Mode double-mounting
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return null;
      }
      
      const errorMessage = err.message || 'An error occurred';
      
      if (isMountedRef.current) {
        setError(errorMessage);
        onError?.(err);
      }
      
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    
    if (immediate && enabled) {
      execute();
    }
    
    return () => {
      isMountedRef.current = false;
    };
    // Use deps spread for legacy compatibility
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, immediate, ...deps]);

  const refetch = useCallback((...args) => execute(...args), [execute]);

  return { 
    data, 
    loading, 
    error, 
    refetch, 
    setData,
    isLoading: loading, // alias for React Query compatibility
    isError: !!error,
    isSuccess: !!data && !error && !loading,
  };
}

/**
 * Generic mutation hook for create/update/delete operations
 * 
 * @param {Function} mutationFn - Async function to execute
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback on successful mutation
 * @param {Function} options.onError - Callback on error
 * @param {Function} options.onSettled - Callback after mutation (success or error)
 * 
 * @returns {Object} { mutate, mutateAsync, loading, error, data, reset }
 */
export function useMutation(mutationFn, options = {}) {
  const { onSuccess, onError, onSettled } = options;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const isMountedRef = useRef(true);
  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutateAsync = useCallback(async (...args) => {
    if (!isMountedRef.current) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await mutationFnRef.current(...args);
      
      if (isMountedRef.current) {
        setData(result);
        onSuccess?.(result, ...args);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err.message || 'An error occurred';
      
      if (isMountedRef.current) {
        setError(errorMessage);
        onError?.(err, ...args);
      }
      
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        onSettled?.(...args);
      }
    }
  }, [onSuccess, onError, onSettled]);

  // Fire-and-forget version that doesn't throw
  const mutate = useCallback(async (...args) => {
    try {
      await mutateAsync(...args);
    } catch {
      // Error already handled in state
    }
  }, [mutateAsync]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { 
    mutate, 
    mutateAsync,
    loading, 
    error, 
    data,
    reset,
    isLoading: loading, // alias
    isError: !!error,
    isSuccess: !!data && !error && !loading,
  };
}

/**
 * Hook for debounced async operations
 * 
 * @param {Function} asyncFn - Function to debounce
 * @param {number} delay - Debounce delay in ms (default: 300)
 * @returns {Object} { data, loading, error, debouncedExecute }
 */
export function useDebouncedAsync(asyncFn, delay = 300) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedExecute = useCallback(async (...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);
    
    return new Promise((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await asyncFn(...args);
          if (isMountedRef.current) {
            setData(result);
            setError(null);
          }
          resolve(result);
        } catch (err) {
          if (isMountedRef.current) {
            setError(err.message);
          }
          reject(err);
        } finally {
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      }, delay);
    });
  }, [asyncFn, delay]);

  return { data, loading, error, debouncedExecute };
}

export default useAsync;
