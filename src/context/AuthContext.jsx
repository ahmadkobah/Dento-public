import { createContext, useEffect, useState, useCallback } from 'react';
import { supabase, getUserRole, ROLES } from '../lib/supabase';

const AuthContext = createContext({});

// Helper to log login attempts
const logLoginAttempt = async (userId, success, failureReason = null, tenantId = null) => {
  try {
    // Parse user agent for device type
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

    await supabase.from('login_history').insert({
      user_id: userId,
      success,
      failure_reason: failureReason,
      user_agent: ua,
      device_type: deviceType,
      tenant_id: tenantId,
      // ip_address and location can be set by Edge Function if needed
    });
  } catch (err) {
    console.error('Failed to log login attempt:', err);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user role and details from database
  const fetchUserDetails = useCallback(async (userId) => {
    try {
      const roleData = await getUserRole(userId);
      // SECURITY FIX: Default to null if no role found - most restrictive
      const role = roleData?.role || null;
      setUserRole(role);
      setUserDetails(roleData);
      return roleData;
    } catch (err) {
      console.error('Error fetching user role:', err);
      // SECURITY FIX: Default to null on error - do NOT default to admin
      setUserRole(null);
      setUserDetails(null);
      return { role: null, is_active: false };
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Check if session should be cleared (non-remembered session after browser restart)
    const checkSessionPersistence = () => {
      const rememberMe = localStorage.getItem('dento_remember_me');
      const tempSession = sessionStorage.getItem('dento_session_temp');
      
      // If there's no remember me preference and no temp session marker,
      // this is a fresh browser session - clear any stored auth
      if (!rememberMe && !tempSession) {
        // Clear any existing auth tokens
        supabase.auth.signOut();
      }
    };
    
    // Get initial session - optimized for speed
    const getInitialSession = async () => {
      try {
        // Check session persistence first
        checkSessionPersistence();
        
        // Use shorter timeout for faster perceived load
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 2000)
        );
        
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]).catch(() => ({ data: { session: null } }));
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          // Fetch role in background - don't block UI
          fetchUserDetails(session.user.id);
        }
      } catch {
        // Silently fail - user just won't be logged in
      } finally {
        if (mounted) setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          fetchUserDetails(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserRole(null);
          setUserDetails(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserDetails]);

  // Sign in with email and password
  const signIn = async (email, password, rememberMe = true) => {
    setError(null);
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('dento_remember_me', 'true');
      } else {
        localStorage.removeItem('dento_remember_me');
        // For non-remembered sessions, we'll clear on tab close
        sessionStorage.setItem('dento_session_temp', 'true');
      }

      if (data.user) {
        // Set user immediately
        setUser(data.user);
        
        // Fetch role (this won't block the login)
        const roleData = await fetchUserDetails(data.user.id);
        
        // Check if user is active
        if (roleData && roleData.is_active === false) {
          await logLoginAttempt(data.user.id, false, 'Account deactivated', roleData?.tenant_id);
          await supabase.auth.signOut();
          setUser(null);
          throw new Error('Your account has been deactivated. Please contact admin.');
        }

        // Log successful login
        await logLoginAttempt(data.user.id, true, null, roleData?.tenant_id);
      }

      return { data, error: null };
    } catch (err) {
      // Log failed login (without user_id since we don't have it)
      await logLoginAttempt(null, false, err.message);
      setError(err.message);
      return { data: null, error: err };
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      
      // Clear remember me preferences
      localStorage.removeItem('dento_remember_me');
      sessionStorage.removeItem('dento_session_temp');
      
      setUser(null);
      setUserRole(null);
      setUserDetails(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  // Check if user has any of the allowed roles
  const hasPermission = (allowedRoles) => {
    if (!userRole) return false;
    return allowedRoles.includes(userRole);
  };

  // Check specific role
  const isRole = (role) => userRole === role;

  // Role checks
  const isDeveloper = () => isRole(ROLES.DEVELOPER);
  const isAdmin = () => isRole(ROLES.ADMIN) || isRole(ROLES.DEVELOPER);
  const isDoctor = () => isRole(ROLES.DOCTOR);
  const isReceptionist = () => isRole(ROLES.RECEPTIONIST);
  const isCBCTTech = () => isRole(ROLES.CBCT_TECH);
  const isAssistant = () => isRole(ROLES.ASSISTANT);
  const isPatient = () => isRole(ROLES.PATIENT);

  // Check if user can access admin panel
  const canAccessAdmin = () => {
    return hasPermission([ROLES.DEVELOPER, ROLES.ADMIN, ROLES.RECEPTIONIST]);
  };

  // Check if user can access clinical features
  const canAccessClinical = () => {
    return hasPermission([ROLES.DEVELOPER, ROLES.ADMIN, ROLES.DOCTOR, ROLES.ASSISTANT]);
  };

  const value = {
    user,
    userRole,
    userDetails,
    loading,
    error,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    hasPermission,
    isRole,
    isDeveloper,
    isAdmin,
    isDoctor,
    isReceptionist,
    isCBCTTech,
    isAssistant,
    isPatient,
    canAccessAdmin,
    canAccessClinical,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
