import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper to get user role from users table
export const getUserRole = async (userId) => {
  try {
    // Use shorter timeout for better UX
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const { data, error } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', userId)
      .single()
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);
    
    if (error) {
      // SECURITY: Never default to admin - use most restrictive role
      console.warn('getUserRole: User not found in users table, defaulting to patient role');
      return { role: 'patient', is_active: false, error: error.message };
    }
    
    return data;
  } catch (err) {
    console.error('getUserRole error:', err);
    // SECURITY: On any error, return most restrictive role (patient) with inactive status
    return { role: 'patient', is_active: false, error: err.message };
  }
};

// Helper to check if user has specific role
export const hasRole = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole);
};

// Role hierarchy for permission checks
export const ROLES = {
  DEVELOPER: 'developer',
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  CBCT_TECH: 'cbct_tech',
  ASSISTANT: 'assistant',
  PATIENT: 'patient',
};

// Role display names
export const ROLE_NAMES = {
  developer: { en: 'Developer', ar: 'مطور' },
  admin: { en: 'Admin', ar: 'مدير' },
  doctor: { en: 'Doctor', ar: 'طبيب' },
  receptionist: { en: 'Receptionist', ar: 'موظف استقبال' },
  cbct_tech: { en: 'CBCT Technician', ar: 'فني أشعة' },
  assistant: { en: 'Dental Assistant', ar: 'مساعد طبيب' },
  patient: { en: 'Patient', ar: 'مريض' },
};

export default supabase;
