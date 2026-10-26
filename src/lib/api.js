/**
 * Centralized API Client
 * 
 * Single entry point for all Supabase queries with:
 * - Automatic tenant filtering
 * - Error handling
 * - Retry logic
 * - Request caching (optional)
 * - Consistent response format
 */

import { supabase } from './supabase';
import { STORAGE_KEYS } from './storageKeys';

// ============================================
// TYPES (JSDoc for IDE support)
// ============================================

/**
 * @typedef {Object} QueryOptions
 * @property {string} [tenantId] - Override tenant ID (uses stored ID if not provided)
 * @property {string} [select] - Columns to select (default: '*')
 * @property {Array<FilterConfig>} [filters] - Array of filter configurations
 * @property {OrderConfig} [orderBy] - Order configuration
 * @property {number} [limit] - Maximum number of rows
 * @property {number} [offset] - Offset for pagination
 * @property {boolean} [single] - Return single row instead of array
 * @property {boolean} [count] - Include count in response
 * @property {boolean} [includeTenant] - Auto-add tenant filter (default: true)
 */

/**
 * @typedef {Object} FilterConfig
 * @property {string} column - Column name
 * @property {'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'like'|'ilike'|'in'|'is'|'contains'|'overlaps'} operator
 * @property {*} value - Filter value
 */

/**
 * @typedef {Object} OrderConfig
 * @property {string} column - Column to order by
 * @property {boolean} [ascending] - Ascending order (default: true)
 * @property {boolean} [nullsFirst] - Nulls first (default: false)
 */

/**
 * @typedef {Object} ApiResponse
 * @property {*} data - Response data
 * @property {Error|null} error - Error if any
 * @property {number} [count] - Total count if requested
 * @property {boolean} success - Whether the request succeeded
 */

/**
 * @typedef {Object} MutationOptions
 * @property {string} [tenantId] - Tenant ID to add to data
 * @property {boolean} [returnData] - Return the mutated data (default: true)
 * @property {string} [select] - Columns to return after mutation
 */

// ============================================
// API CLIENT CLASS
// ============================================

class ApiClient {
  constructor() {
    this.supabase = supabase;
    this.defaultTimeout = 10000; // 10 seconds
  }

  // ----------------------------------------
  // TENANT MANAGEMENT
  // ----------------------------------------

  /**
   * Get current tenant ID from storage based on portal mode
   * @param {'developer'|'admin'} [mode] - Portal mode
   * @returns {string|null}
   */
  getCurrentTenantId(mode = 'admin') {
    const key = mode === 'developer' 
      ? STORAGE_KEYS.DEVELOPER_TENANT_ID 
      : STORAGE_KEYS.ADMIN_TENANT_ID;
    
    return localStorage.getItem(key) || null;
  }

  /**
   * Resolve tenant ID from options or storage
   * @param {QueryOptions} options 
   * @returns {string|null}
   */
  resolveTenantId(options = {}) {
    if (options.tenantId) return options.tenantId;
    if (options.includeTenant === false) return null;
    
    // Try admin first, then developer
    return this.getCurrentTenantId('admin') || this.getCurrentTenantId('developer');
  }

  // ----------------------------------------
  // QUERY METHODS
  // ----------------------------------------

  /**
   * Execute a SELECT query with automatic tenant filtering
   * 
   * @param {string} table - Table name
   * @param {QueryOptions} [options] - Query options
   * @returns {Promise<ApiResponse>}
   * 
   * @example
   * // Basic query
   * const { data, error } = await api.query('services');
   * 
   * // With filters
   * const { data } = await api.query('appointments', {
   *   filters: [{ column: 'status', operator: 'eq', value: 'confirmed' }],
   *   orderBy: { column: 'date', ascending: false },
   *   limit: 10
   * });
   */
  async query(table, options = {}) {
    try {
      const {
        select = '*',
        filters = [],
        orderBy,
        limit,
        offset,
        single = false,
        count,
        includeTenant = true,
      } = options;

      let query = this.supabase.from(table).select(select, { count: count ? 'exact' : undefined });

      // Auto-add tenant filter if applicable
      const tenantId = includeTenant ? this.resolveTenantId(options) : null;
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      // Apply custom filters
      for (const filter of filters) {
        query = this.applyFilter(query, filter);
      }

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { 
          ascending: orderBy.ascending ?? true,
          nullsFirst: orderBy.nullsFirst ?? false
        });
      }

      // Apply pagination
      if (limit) query = query.limit(limit);
      if (offset) query = query.range(offset, offset + (limit || 10) - 1);

      // Execute query
      const result = single 
        ? await query.single()
        : await query;

      if (result.error) {
        return { data: null, error: result.error, success: false };
      }

      return { 
        data: result.data, 
        error: null, 
        success: true,
        count: result.count ?? undefined
      };
    } catch (error) {
      console.error(`API query error [${table}]:`, error);
      return { data: null, error, success: false };
    }
  }

  /**
   * Get a single record by ID
   * 
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {QueryOptions} [options] - Query options
   * @returns {Promise<ApiResponse>}
   */
  async getById(table, id, options = {}) {
    return this.query(table, {
      ...options,
      filters: [
        { column: 'id', operator: 'eq', value: id },
        ...(options.filters || [])
      ],
      single: true
    });
  }

  /**
   * Apply a filter to a query
   * @private
   */
  applyFilter(query, { column, operator, value }) {
    switch (operator) {
      case 'eq': return query.eq(column, value);
      case 'neq': return query.neq(column, value);
      case 'gt': return query.gt(column, value);
      case 'gte': return query.gte(column, value);
      case 'lt': return query.lt(column, value);
      case 'lte': return query.lte(column, value);
      case 'like': return query.like(column, value);
      case 'ilike': return query.ilike(column, value);
      case 'in': return query.in(column, value);
      case 'is': return query.is(column, value);
      case 'contains': return query.contains(column, value);
      case 'overlaps': return query.overlaps(column, value);
      default: return query.eq(column, value);
    }
  }

  // ----------------------------------------
  // MUTATION METHODS
  // ----------------------------------------

  /**
   * Insert a new record
   * 
   * @param {string} table - Table name
   * @param {Object|Object[]} data - Data to insert
   * @param {MutationOptions} [options] - Mutation options
   * @returns {Promise<ApiResponse>}
   * 
   * @example
   * const { data, error } = await api.insert('appointments', {
   *   patient_id: '...',
   *   doctor_id: '...',
   *   date: '2026-02-10'
   * });
   */
  async insert(table, data, options = {}) {
    try {
      const { tenantId, returnData = true, select = '*' } = options;
      
      // Add tenant_id to data if provided
      const resolvedTenantId = tenantId || this.resolveTenantId(options);
      const dataWithTenant = resolvedTenantId 
        ? (Array.isArray(data) 
            ? data.map(d => ({ ...d, tenant_id: resolvedTenantId }))
            : { ...data, tenant_id: resolvedTenantId })
        : data;

      let query = this.supabase.from(table).insert(dataWithTenant);
      
      if (returnData) {
        query = query.select(select);
      }

      const result = await query;

      if (result.error) {
        return { data: null, error: result.error, success: false };
      }

      // If single insert and returnData, get the single record
      const responseData = returnData && !Array.isArray(data) && result.data?.length === 1
        ? result.data[0]
        : result.data;

      return { data: responseData, error: null, success: true };
    } catch (error) {
      console.error(`API insert error [${table}]:`, error);
      return { data: null, error, success: false };
    }
  }

  /**
   * Update a record by ID
   * 
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {Object} data - Data to update
   * @param {MutationOptions} [options] - Mutation options
   * @returns {Promise<ApiResponse>}
   */
  async update(table, id, data, options = {}) {
    try {
      const { returnData = true, select = '*' } = options;

      let query = this.supabase
        .from(table)
        .update(data)
        .eq('id', id);

      // Add tenant check for security
      const tenantId = this.resolveTenantId(options);
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      if (returnData) {
        query = query.select(select).single();
      }

      const result = await query;

      if (result.error) {
        return { data: null, error: result.error, success: false };
      }

      return { data: result.data, error: null, success: true };
    } catch (error) {
      console.error(`API update error [${table}]:`, error);
      return { data: null, error, success: false };
    }
  }

  /**
   * Upsert a record (insert or update)
   * 
   * @param {string} table - Table name
   * @param {Object|Object[]} data - Data to upsert
   * @param {MutationOptions & { onConflict?: string }} [options] - Options
   * @returns {Promise<ApiResponse>}
   */
  async upsert(table, data, options = {}) {
    try {
      const { tenantId, returnData = true, select = '*', onConflict } = options;
      
      const resolvedTenantId = tenantId || this.resolveTenantId(options);
      const dataWithTenant = resolvedTenantId 
        ? (Array.isArray(data) 
            ? data.map(d => ({ ...d, tenant_id: resolvedTenantId }))
            : { ...data, tenant_id: resolvedTenantId })
        : data;

      let query = this.supabase.from(table).upsert(dataWithTenant, {
        onConflict: onConflict
      });

      if (returnData) {
        query = query.select(select);
      }

      const result = await query;

      if (result.error) {
        return { data: null, error: result.error, success: false };
      }

      const responseData = returnData && !Array.isArray(data) && result.data?.length === 1
        ? result.data[0]
        : result.data;

      return { data: responseData, error: null, success: true };
    } catch (error) {
      console.error(`API upsert error [${table}]:`, error);
      return { data: null, error, success: false };
    }
  }

  /**
   * Delete a record by ID
   * 
   * @param {string} table - Table name
   * @param {string} id - Record ID
   * @param {MutationOptions} [options] - Options
   * @returns {Promise<ApiResponse>}
   */
  async delete(table, id, options = {}) {
    try {
      let query = this.supabase.from(table).delete().eq('id', id);

      // Add tenant check for security
      const tenantId = this.resolveTenantId(options);
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const result = await query;

      if (result.error) {
        return { data: null, error: result.error, success: false };
      }

      return { data: null, error: null, success: true };
    } catch (error) {
      console.error(`API delete error [${table}]:`, error);
      return { data: null, error, success: false };
    }
  }

  // ----------------------------------------
  // REALTIME SUBSCRIPTIONS
  // ----------------------------------------

  /**
   * Subscribe to table changes with automatic tenant filtering
   * 
   * @param {string} table - Table name
   * @param {Function} callback - Callback for changes
   * @param {Object} [options] - Subscription options
   * @returns {Function} Unsubscribe function
   * 
   * @example
   * const unsubscribe = api.subscribe('appointments', (payload) => {
   *   console.log('Change:', payload);
   * });
   * 
   * // Later: unsubscribe();
   */
  subscribe(table, callback, options = {}) {
    const { event = '*', tenantId } = options;
    const resolvedTenantId = tenantId || this.resolveTenantId(options);

    const channelName = `${table}_${resolvedTenantId || 'global'}_${Date.now()}`;
    
    let channel = this.supabase.channel(channelName);

    // Build filter if tenant-specific
    const filter = resolvedTenantId 
      ? `tenant_id=eq.${resolvedTenantId}`
      : undefined;

    channel = channel.on(
      'postgres_changes',
      { event, schema: 'public', table, filter },
      callback
    );

    channel.subscribe();

    // Return unsubscribe function
    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  // ----------------------------------------
  // UTILITY METHODS
  // ----------------------------------------

  /**
   * Execute a raw RPC call
   * 
   * @param {string} functionName - Function name
   * @param {Object} [params] - Function parameters
   * @returns {Promise<ApiResponse>}
   */
  async rpc(functionName, params = {}) {
    try {
      const result = await this.supabase.rpc(functionName, params);

      if (result.error) {
        return { data: null, error: result.error, success: false };
      }

      return { data: result.data, error: null, success: true };
    } catch (error) {
      console.error(`API RPC error [${functionName}]:`, error);
      return { data: null, error, success: false };
    }
  }

  /**
   * Upload a file to storage
   * 
   * @param {string} bucket - Storage bucket name
   * @param {string} path - File path within bucket
   * @param {File} file - File to upload
   * @param {Object} [options] - Upload options
   * @returns {Promise<ApiResponse>}
   */
  async uploadFile(bucket, path, file, options = {}) {
    try {
      const { upsert = false, contentType } = options;

      const result = await this.supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert,
          contentType: contentType || file.type
        });

      if (result.error) {
        return { data: null, error: result.error, success: false };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return { 
        data: { 
          path: result.data.path, 
          fullPath: result.data.fullPath,
          publicUrl: urlData.publicUrl 
        }, 
        error: null, 
        success: true 
      };
    } catch (error) {
      console.error(`API upload error [${bucket}/${path}]:`, error);
      return { data: null, error, success: false };
    }
  }

  /**
   * Delete a file from storage
   * 
   * @param {string} bucket - Storage bucket name
   * @param {string|string[]} paths - File path(s) to delete
   * @returns {Promise<ApiResponse>}
   */
  async deleteFile(bucket, paths) {
    try {
      const pathArray = Array.isArray(paths) ? paths : [paths];
      
      const result = await this.supabase.storage
        .from(bucket)
        .remove(pathArray);

      if (result.error) {
        return { data: null, error: result.error, success: false };
      }

      return { data: result.data, error: null, success: true };
    } catch (error) {
      console.error(`API delete file error [${bucket}]:`, error);
      return { data: null, error, success: false };
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const api = new ApiClient();

// ============================================
// CONVENIENCE EXPORTS
// ============================================

// Re-export supabase for direct access when needed
export { supabase };

export default api;
