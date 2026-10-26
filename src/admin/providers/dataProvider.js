import { dataProvider as supabaseDataProvider } from '@refinedev/supabase';
import { supabase } from '../../lib/supabase';
import { STORAGE_KEYS } from '../../lib/storageKeys';

// Create the base data provider
const baseDataProvider = supabaseDataProvider(supabase);

// Issue #31: User-friendly error messages
const formatError = (error, operation) => {
  // Handle common Supabase errors
  if (error?.code === '23505') {
    return 'A record with this data already exists. Please use unique values.';
  }
  if (error?.code === '23503') {
    return 'Cannot complete this action because it references data that no longer exists.';
  }
  if (error?.code === '22P02') {
    return 'Invalid data format. Please check your input.';
  }
  if (error?.code === 'PGRST301') {
    return 'The requested record was not found.';
  }
  if (error?.code === 'PGRST116') {
    return 'The requested record was not found.';
  }
  if (error?.message?.includes('JWT')) {
    return 'Your session has expired. Please log in again.';
  }
  if (error?.message?.includes('network')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Default error with operation context
  return error?.message || `Failed to ${operation}. Please try again.`;
};

// Get current tenant ID from localStorage (set by TenantContext)
const getCurrentTenantId = () => {
  // Try new key first, then fallback to legacy for backward compatibility
  return localStorage.getItem(STORAGE_KEYS.ADMIN_TENANT_ID) 
      || localStorage.getItem(STORAGE_KEYS.LEGACY?.ADMIN_TENANT);
};

// Helper to add tenant filter to queries
const addTenantFilter = (filters = []) => {
  const tenantId = getCurrentTenantId();
  if (!tenantId) return filters;
  
  // Check if tenant_id filter already exists
  const hasTenantFilter = filters.some(f => f.field === 'tenant_id');
  if (hasTenantFilter) return filters;
  
  return [...filters, { field: 'tenant_id', operator: 'eq', value: tenantId }];
};

// Extend with tenant-aware methods
export const dataProvider = {
  ...baseDataProvider,
  
  // Override getList to add tenant filter
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    try {
      const tenantFilters = addTenantFilter(filters);
      return await baseDataProvider.getList({ 
        resource, 
        pagination, 
        filters: tenantFilters, 
        sorters, 
        meta 
      });
    } catch (error) {
      throw new Error(formatError(error, `load ${resource}`));
    }
  },
  
  // Override getOne to add tenant filter - SECURITY: Verify record belongs to current tenant
  getOne: async ({ resource, id, meta }) => {
    try {
      const tenantId = getCurrentTenantId();
      
      // First fetch the record
      const result = await baseDataProvider.getOne({ resource, id, meta });
      
      // If tenant isolation is active, verify the record belongs to current tenant
      if (tenantId && result.data && result.data.tenant_id) {
        if (result.data.tenant_id !== tenantId) {
          throw new Error('Access denied: Record does not belong to your organization');
        }
      }
      
      return result;
    } catch (error) {
      if (error.message?.includes('Access denied')) throw error;
      throw new Error(formatError(error, `load ${resource}`));
    }
  },
  
  // Override create to add tenant_id
  create: async ({ resource, variables, meta }) => {
    try {
      const tenantId = getCurrentTenantId();
      const dataWithTenant = tenantId 
        ? { ...variables, tenant_id: tenantId }
        : variables;
      return await baseDataProvider.create({ resource, variables: dataWithTenant, meta });
    } catch (error) {
      throw new Error(formatError(error, `create ${resource}`));
    }
  },
  
  // Override update - SECURITY: Verify record belongs to current tenant before update
  update: async ({ resource, id, variables, meta }) => {
    try {
      const tenantId = getCurrentTenantId();
      
      // If tenant isolation is active, verify ownership before update
      if (tenantId) {
        const existing = await baseDataProvider.getOne({ resource, id, meta });
        if (existing.data && existing.data.tenant_id && existing.data.tenant_id !== tenantId) {
          throw new Error('Access denied: Cannot update record from another organization');
        }
        // Ensure tenant_id cannot be changed during update
        const { tenant_id: _, ...safeVariables } = variables;
        return await baseDataProvider.update({ resource, id, variables: safeVariables, meta });
      }
      
      return await baseDataProvider.update({ resource, id, variables, meta });
    } catch (error) {
      if (error.message?.includes('Access denied')) throw error;
      throw new Error(formatError(error, `update ${resource}`));
    }
  },
  
  // Override delete - SECURITY: Verify record belongs to current tenant before delete
  delete: async ({ resource, id, meta }) => {
    try {
      const tenantId = getCurrentTenantId();
      
      // If tenant isolation is active, verify ownership before delete
      if (tenantId) {
        const existing = await baseDataProvider.getOne({ resource, id, meta });
        if (existing.data && existing.data.tenant_id && existing.data.tenant_id !== tenantId) {
          throw new Error('Access denied: Cannot delete record from another organization');
        }
      }
      
      return await baseDataProvider.delete({ resource, id, meta });
    } catch (error) {
      if (error.message?.includes('Access denied')) throw error;
      throw new Error(formatError(error, `delete ${resource}`));
    }
  },
  
  // Custom method to get dashboard stats (tenant-aware)
  getDashboardStats: async () => {
    const tenantId = getCurrentTenantId();
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    
    let appointmentsQuery = supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('datetime_start', `${today}T00:00:00`)
      .lt('datetime_start', `${today}T23:59:59`);
    
    let patientsQuery = supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    let doctorsQuery = supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    let monthQuery = supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('datetime_start', startOfMonth);
    
    // Add tenant filter if available
    if (tenantId) {
      appointmentsQuery = appointmentsQuery.eq('tenant_id', tenantId);
      patientsQuery = patientsQuery.eq('tenant_id', tenantId);
      doctorsQuery = doctorsQuery.eq('tenant_id', tenantId);
      monthQuery = monthQuery.eq('tenant_id', tenantId);
    }

    const [
      { count: todayAppointments },
      { count: totalPatients },
      { count: activeDoctors },
      { count: monthAppointments }
    ] = await Promise.all([
      appointmentsQuery,
      patientsQuery,
      doctorsQuery,
      monthQuery
    ]);

    return {
      todayAppointments: todayAppointments || 0,
      totalPatients: totalPatients || 0,
      activeDoctors: activeDoctors || 0,
      monthAppointments: monthAppointments || 0,
    };
  },

  // Get recent appointments (tenant-aware)
  getRecentAppointments: async (limit = 5) => {
    const tenantId = getCurrentTenantId();
    
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone),
        doctors (name_en, name_ar),
        branches (name_en, name_ar)
      `)
      .order('datetime_start', { ascending: false })
      .limit(limit);
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get upcoming appointments (tenant-aware)
  getUpcomingAppointments: async (limit = 10) => {
    const tenantId = getCurrentTenantId();
    const now = new Date().toISOString();
    
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patients (name, phone),
        doctors (name_en, name_ar),
        branches (name_en, name_ar)
      `)
      .gte('datetime_start', now)
      .in('status', ['booked', 'confirmed'])
      .order('datetime_start', { ascending: true })
      .limit(limit);
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },
};

export default dataProvider;
