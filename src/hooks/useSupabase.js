import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { escapeSearchTerm } from '../utils/validation';

/**
 * Generic hook for fetching data from Supabase
 */
export const useSupabaseQuery = (table, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    select = '*',
    filters = [],
    orderBy = null,
    limit = null,
    single = false,
    enabled = true,
  } = options;

  // Memoize stringified values for dependency array
  const filtersString = useMemo(() => JSON.stringify(filters), [filters]);
  const orderByString = useMemo(() => JSON.stringify(orderBy), [orderBy]);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(table).select(select);

      // Parse filters from string
      const parsedFilters = JSON.parse(filtersString);
      const parsedOrderBy = orderByString ? JSON.parse(orderByString) : null;

      // Apply filters
      parsedFilters.forEach(({ column, operator, value }) => {
        switch (operator) {
          case 'eq':
            query = query.eq(column, value);
            break;
          case 'neq':
            query = query.neq(column, value);
            break;
          case 'gt':
            query = query.gt(column, value);
            break;
          case 'gte':
            query = query.gte(column, value);
            break;
          case 'lt':
            query = query.lt(column, value);
            break;
          case 'lte':
            query = query.lte(column, value);
            break;
          case 'like':
            query = query.like(column, value);
            break;
          case 'ilike':
            query = query.ilike(column, value);
            break;
          case 'in':
            query = query.in(column, value);
            break;
          case 'is':
            query = query.is(column, value);
            break;
          default:
            query = query.eq(column, value);
        }
      });

      // Apply ordering
      if (parsedOrderBy) {
        query = query.order(parsedOrderBy.column, { ascending: parsedOrderBy.ascending ?? true });
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      // Get single or multiple
      if (single) {
        const { data: result, error: queryError } = await query.single();
        if (queryError) throw queryError;
        setData(result);
      } else {
        const { data: result, error: queryError } = await query;
        if (queryError) throw queryError;
        setData(result);
      }
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [table, select, filtersString, orderByString, limit, single, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

/**
 * Hook for fetching branches
 */
export const useBranches = (activeOnly = true) => {
  const filters = activeOnly ? [{ column: 'is_active', operator: 'eq', value: true }] : [];
  return useSupabaseQuery('branches', {
    filters,
    orderBy: { column: 'name_en', ascending: true },
  });
};

/**
 * Hook for fetching doctors
 */
export const useDoctors = (options = {}) => {
  const { activeOnly = true } = options;
  
  const filters = [];
  if (activeOnly) {
    filters.push({ column: 'is_active', operator: 'eq', value: true });
  }

  // Note: For branch filtering, we'll need to join with doctor_branch_assignments
  // This is a simplified version
  return useSupabaseQuery('doctors', {
    select: '*, doctor_branch_assignments(branch_id)',
    filters,
    orderBy: { column: 'name_en', ascending: true },
  });
};

/**
 * Hook for fetching doctor availability
 */
export const useDoctorAvailability = (doctorId, branchId = null) => {
  const filters = [{ column: 'doctor_id', operator: 'eq', value: doctorId }];
  if (branchId) {
    filters.push({ column: 'branch_id', operator: 'eq', value: branchId });
  }

  return useSupabaseQuery('doctor_availability', {
    filters,
    orderBy: { column: 'day_of_week', ascending: true },
    enabled: !!doctorId,
  });
};

/**
 * Hook for fetching appointments
 */
export const useAppointments = (options = {}) => {
  const { doctorId, branchId, patientId, date, status, dateRange } = options;

  const filters = [];
  if (doctorId) filters.push({ column: 'doctor_id', operator: 'eq', value: doctorId });
  if (branchId) filters.push({ column: 'branch_id', operator: 'eq', value: branchId });
  if (patientId) filters.push({ column: 'patient_id', operator: 'eq', value: patientId });
  if (status) filters.push({ column: 'status', operator: 'eq', value: status });
  if (date) {
    filters.push({ column: 'datetime_start', operator: 'gte', value: `${date}T00:00:00` });
    filters.push({ column: 'datetime_start', operator: 'lt', value: `${date}T23:59:59` });
  }
  if (dateRange) {
    filters.push({ column: 'datetime_start', operator: 'gte', value: dateRange.start });
    filters.push({ column: 'datetime_start', operator: 'lte', value: dateRange.end });
  }

  return useSupabaseQuery('appointments', {
    select: '*, patients(name, phone), doctors(name_en, name_ar), branches(name_en, name_ar)',
    filters,
    orderBy: { column: 'datetime_start', ascending: true },
  });
};

/**
 * Hook for fetching patients
 */
export const usePatients = (options = {}) => {
  const { search, activeOnly = true } = options;

  const filters = [];
  if (activeOnly) {
    filters.push({ column: 'is_active', operator: 'eq', value: true });
  }
  if (search) {
    // Note: For full-text search, you might want to use Supabase's text search
    const safeSearch = escapeSearchTerm(search);
    filters.push({ column: 'name', operator: 'ilike', value: `%${safeSearch}%` });
  }

  return useSupabaseQuery('patients', {
    filters,
    orderBy: { column: 'name', ascending: true },
  });
};

/**
 * Hook for fetching patient by phone (for returning patient detection)
 */
export const usePatientByPhone = (phone) => {
  return useSupabaseQuery('patients', {
    filters: [{ column: 'phone', operator: 'eq', value: phone }],
    single: true,
    enabled: !!phone && phone.length >= 10,
  });
};

/**
 * Hook for fetching services
 */
export const useServices = (categoryId = null) => {
  const filters = [{ column: 'is_active', operator: 'eq', value: true }];
  if (categoryId) {
    filters.push({ column: 'category_id', operator: 'eq', value: categoryId });
  }

  return useSupabaseQuery('services', {
    select: '*, service_categories(name_en, name_ar)',
    filters,
    orderBy: { column: 'sort_order', ascending: true },
  });
};

/**
 * Hook for fetching service categories
 */
export const useServiceCategories = () => {
  return useSupabaseQuery('service_categories', {
    filters: [{ column: 'is_active', operator: 'eq', value: true }],
    orderBy: { column: 'sort_order', ascending: true },
  });
};

/**
 * Hook for fetching testimonials
 */
export const useTestimonials = (featuredOnly = false) => {
  const filters = [{ column: 'is_active', operator: 'eq', value: true }];
  if (featuredOnly) {
    filters.push({ column: 'is_featured', operator: 'eq', value: true });
  }

  return useSupabaseQuery('testimonials', {
    filters,
    orderBy: { column: 'created_at', ascending: false },
  });
};

/**
 * Hook for fetching portfolio cases
 */
export const usePortfolioCases = (options = {}) => {
  const { category, featuredOnly = false } = options;

  const filters = [{ column: 'is_active', operator: 'eq', value: true }];
  if (category) {
    filters.push({ column: 'category', operator: 'eq', value: category });
  }
  if (featuredOnly) {
    filters.push({ column: 'is_featured', operator: 'eq', value: true });
  }

  return useSupabaseQuery('portfolio_cases', {
    select: '*, doctors(name_en, name_ar)',
    filters,
    orderBy: { column: 'created_at', ascending: false },
  });
};

/**
 * Hook for fetching team members
 */
export const useTeamMembers = () => {
  return useSupabaseQuery('team_members', {
    filters: [{ column: 'is_active', operator: 'eq', value: true }],
    orderBy: { column: 'sort_order', ascending: true },
  });
};

/**
 * Hook for fetching translations
 */
export const useTranslations = (page = null) => {
  const filters = [];
  if (page) {
    filters.push({ column: 'page', operator: 'eq', value: page });
  }

  return useSupabaseQuery('translations', {
    filters,
    orderBy: { column: 'key', ascending: true },
  });
};

/**
 * Hook for fetching site settings
 */
export const useSiteSettings = () => {
  return useSupabaseQuery('site_settings', {
    orderBy: { column: 'key', ascending: true },
  });
};

/**
 * Hook for creating/updating records
 */
export const useMutation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const insert = async (table, data, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const query = supabase.from(table).insert(data);
      
      if (options.select) {
        const { data: result, error: insertError } = await query.select(options.select).single();
        if (insertError) throw insertError;
        return { data: result, error: null };
      } else {
        const { data: result, error: insertError } = await query.select().single();
        if (insertError) throw insertError;
        return { data: result, error: null };
      }
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const update = async (table, id, data) => {
    setLoading(true);
    setError(null);

    try {
      const { data: result, error: updateError } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return { data: result, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const remove = async (table, id) => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      return { error: null };
    } catch (err) {
      setError(err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  return { insert, update, remove, loading, error };
};

export default useSupabaseQuery;
