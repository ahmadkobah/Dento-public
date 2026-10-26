/**
 * Shared Hooks Library
 * 
 * Unified hooks used across Developer Portal, Admin Panel, and Public Website.
 * These generic hooks form the foundation for data fetching patterns.
 */

// Centralized API hooks (recommended for new code)
export {
  useApiQuery,
  useApiGetById,
  useApiMutation,
  useApiInsert,
  useApiUpdate,
  useApiDelete,
  useApiSubscription,
} from '../useApi';

// Generic async hooks
export { useAsync, useMutation, useDebouncedAsync, createFilterKey } from './useAsync';

// Supabase-specific hooks
export { 
  useSupabaseQuery, 
  useSupabaseMutation,
  useBranches,
  useDoctors,
  useDoctorAvailability,
  useAppointments,
  usePatients,
  usePatientByPhone,
  useServices,
  useServiceCategories,
  useTestimonials,
  usePortfolioCases,
  useTeamMembers,
  useTranslations,
  useSiteSettings,
} from './useSupabase';

// Toast notifications
export { useToast } from '../useToast';
export { ToastProvider, ToastContext } from '../../components/Toast';
