/**
 * Supabase Query Hooks
 * 
 * Re-exports from the main useSupabase.js with proper naming
 * to avoid conflicts with generic hooks.
 */

// Re-export all hooks from the main file
export { 
  useSupabaseQuery,
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
} from '../useSupabase';

// Re-export useMutation as useSupabaseMutation to avoid naming conflict
import { useMutation as useSupabaseMutationOriginal } from '../useSupabase';
export const useSupabaseMutation = useSupabaseMutationOriginal;

export { useSupabaseQuery as default } from '../useSupabase';
