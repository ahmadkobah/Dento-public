/**
 * useApi Hook
 * 
 * React hook wrapper for the centralized API client.
 * Provides useQuery and useMutation patterns similar to React Query.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';

/**
 * @typedef {Object} UseQueryOptions
 * @property {boolean} [enabled] - Enable/disable the query (default: true)
 * @property {Array} [deps] - Additional dependencies to trigger refetch
 * @property {Function} [onSuccess] - Callback on successful fetch
 * @property {Function} [onError] - Callback on error
 * @property {number} [staleTime] - Time in ms before data is considered stale
 */

/**
 * Query hook for fetching data with the API client
 * 
 * @param {string} table - Table name
 * @param {import('../lib/api').QueryOptions} [queryOptions] - Query options
 * @param {UseQueryOptions} [hookOptions] - Hook behavior options
 * @returns {Object} { data, loading, error, refetch, isStale }
 * 
 * @example
 * // Basic usage
 * const { data: services, loading } = useApiQuery('services');
 * 
 * // With filters
 * const { data: appointments } = useApiQuery('appointments', {
 *   filters: [{ column: 'status', operator: 'eq', value: 'confirmed' }],
 *   orderBy: { column: 'date', ascending: false }
 * });
 * 
 * // With tenant override
 * const { data } = useApiQuery('pages', { tenantId: specificTenantId });
 */
export function useApiQuery(table, queryOptions = {}, hookOptions = {}) {
  const {
    enabled = true,
    deps = [],
    onSuccess,
    onError,
    staleTime = 0,
  } = hookOptions;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const isMountedRef = useRef(true);
  const optionsRef = useRef(queryOptions);
  optionsRef.current = queryOptions;

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    const result = await api.query(table, optionsRef.current);

    if (!isMountedRef.current) return;

    if (result.success) {
      setData(result.data);
      setFetchedAt(Date.now());
      onSuccess?.(result.data);
    } else {
      setError(result.error?.message || 'Query failed');
      onError?.(result.error);
    }

    setLoading(false);
  }, [table, onSuccess, onError]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, table, ...deps]);

  const isStale = staleTime > 0 && fetchedAt 
    ? Date.now() - fetchedAt > staleTime 
    : false;

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isStale,
    isLoading: loading,
    isError: !!error,
    isSuccess: !!data && !error && !loading,
  };
}

/**
 * Get a single record by ID
 * 
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @param {import('../lib/api').QueryOptions} [queryOptions] - Query options
 * @param {UseQueryOptions} [hookOptions] - Hook options
 */
export function useApiGetById(table, id, queryOptions = {}, hookOptions = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState(null);

  const { enabled = true, onSuccess, onError } = hookOptions;
  
  // Store options in ref to avoid stale closures
  const optionsRef = useRef({ queryOptions, onSuccess, onError });
  optionsRef.current = { queryOptions, onSuccess, onError };

  const fetchData = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await api.getById(table, id, optionsRef.current.queryOptions);

    if (result.success) {
      setData(result.data);
      optionsRef.current.onSuccess?.(result.data);
    } else {
      setError(result.error?.message || 'Record not found');
      optionsRef.current.onError?.(result.error);
    }

    setLoading(false);
  }, [table, id]);

  useEffect(() => {
    if (enabled && id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, id]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Mutation hook for insert/update/delete operations
 * 
 * @param {'insert'|'update'|'upsert'|'delete'} operation - Mutation type
 * @param {string} table - Table name
 * @param {Object} [options] - Default options for each mutation
 * @returns {Object} { mutate, mutateAsync, loading, error, data, reset }
 * 
 * @example
 * const { mutate, loading } = useApiMutation('insert', 'appointments');
 * 
 * const handleSubmit = () => {
 *   mutate({ patient_id: '...', date: '2026-02-10' });
 * };
 */
export function useApiMutation(operation, table, options = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const { onSuccess, onError, onSettled } = options;

  const mutateAsync = useCallback(async (...args) => {
    setLoading(true);
    setError(null);

    let result;

    switch (operation) {
      case 'insert':
        result = await api.insert(table, args[0], args[1] || options);
        break;
      case 'update':
        result = await api.update(table, args[0], args[1], args[2] || options);
        break;
      case 'upsert':
        result = await api.upsert(table, args[0], args[1] || options);
        break;
      case 'delete':
        result = await api.delete(table, args[0], args[1] || options);
        break;
      default:
        result = { success: false, error: new Error('Invalid operation') };
    }

    setLoading(false);

    if (result.success) {
      setData(result.data);
      onSuccess?.(result.data, ...args);
    } else {
      setError(result.error?.message || 'Mutation failed');
      onError?.(result.error, ...args);
    }

    onSettled?.(...args);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }, [operation, table, options, onSuccess, onError, onSettled]);

  const mutate = useCallback(async (...args) => {
    try {
      await mutateAsync(...args);
    } catch {
      // Error already set in state
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
    isLoading: loading,
    isError: !!error,
    isSuccess: !!data && !error && !loading,
  };
}

/**
 * Convenience hook for insert mutation
 */
export function useApiInsert(table, options = {}) {
  return useApiMutation('insert', table, options);
}

/**
 * Convenience hook for update mutation
 */
export function useApiUpdate(table, options = {}) {
  return useApiMutation('update', table, options);
}

/**
 * Convenience hook for delete mutation
 */
export function useApiDelete(table, options = {}) {
  return useApiMutation('delete', table, options);
}

/**
 * Subscribe to realtime changes
 * 
 * @param {string} table - Table name
 * @param {Function} callback - Change callback
 * @param {Object} [options] - Subscription options
 * 
 * @example
 * useApiSubscription('appointments', (payload) => {
 *   if (payload.eventType === 'INSERT') {
 *     setAppointments(prev => [...prev, payload.new]);
 *   }
 * });
 */
export function useApiSubscription(table, callback, options = {}) {
  const { enabled = true, tenantId, event = '*' } = options;
  const callbackRef = useRef(callback);
  
  // Update ref in effect to satisfy React Compiler
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = api.subscribe(
      table, 
      (payload) => callbackRef.current(payload),
      { tenantId, event }
    );

    return unsubscribe;
  }, [enabled, table, tenantId, event]);
}

export default {
  useApiQuery,
  useApiGetById,
  useApiMutation,
  useApiInsert,
  useApiUpdate,
  useApiDelete,
  useApiSubscription,
};
