// Developer Portal Authentication Context
// Manages developer login/logout and session state

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const DevAuthContext = createContext(null);

// Helper to log login attempts for developer portal
const logDeveloperLogin = async (userId, success, failureReason = null) => {
  try {
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
      tenant_id: null, // Developer portal is system-level
    });
  } catch (err) {
    console.error('Failed to log developer login:', err);
  }
};

export function DevAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    let mounted = true;
    let timeoutId = null;
    
    const checkSession = async () => {
      try {
        // First, quickly check if there's a session at all (from cache)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          // No session in cache - definitely not authenticated
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        // Session exists in cache - now validate with server
        // Use Promise.race to add timeout to getUser() call
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('getUser timeout')), 4000);
        });
        
        let authUser;
        try {
          const result = await Promise.race([getUserPromise, timeoutPromise]);
          authUser = result.data?.user;
          clearTimeout(timeoutId);
        } catch (_timeoutErr) {
          // getUser() timed out - session might be stale, try to refresh
          console.warn('getUser timed out, attempting session refresh...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData?.user) {
            // Refresh failed - sign out and clear corrupted state
            console.warn('Session refresh failed, signing out');
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setLoading(false);
            }
            return;
          }
          authUser = refreshData.user;
        }
        
        if (!authUser) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        if (mounted) {
          await validateDeveloperRole(authUser);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (session?.user) {
          await validateDeveloperRole(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const validateDeveloperRole = async (authUser) => {
    try {
      // First check: Use auth user metadata if available (fastest, no DB query)
      const userMetadata = authUser.user_metadata || {};
      const appMetadata = authUser.app_metadata || {};
      
      // Check if role is in metadata
      const metadataRole = userMetadata.role || appMetadata.role;
      if (metadataRole && ['developer', 'admin'].includes(metadataRole)) {
        setUser({
          ...authUser,
          profile: {
            id: authUser.id,
            email: authUser.email,
            full_name: userMetadata.full_name || authUser.email,
            role: metadataRole,
            is_active: true,
          },
        });
        setError(null);
        setLoading(false);
        return;
      }
      
      // Second check: Query the users table
      const queryPromise = supabase
        .from('users')
        .select('id, email, full_name, role, is_active')
        .eq('id', authUser.id)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timed out')), 8000)
      );
      
      const { data: userData, error: userError } = await Promise.race([queryPromise, timeoutPromise]);
      
      if (userError) {
        console.error('Error fetching user role:', userError);
        // Fallback: For developers, allow access if email matches known developer emails
        const developerEmails = ['user1@example.com']; // Add your developer emails
        if (developerEmails.includes(authUser.email?.toLowerCase())) {
          setUser({
            ...authUser,
            profile: {
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.email,
              role: 'developer',
              is_active: true,
            },
          });
          setError(null);
          setLoading(false);
          return;
        }
        
        // Try profiles table as last resort
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, is_active')
          .eq('id', authUser.id)
          .single();
        
        if (profileError || !profileData) {
          setError('Unable to verify your role. Please contact support.');
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Check if user has developer or admin role
        if (!['developer', 'admin'].includes(profileData.role)) {
          setError('Access denied. Developer Portal requires developer or admin role.');
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Check if user is active
        if (profileData.is_active === false) {
          setError('Your account has been deactivated. Please contact support.');
          setUser(null);
          setLoading(false);
          return;
        }
        
        setUser({
          ...authUser,
          profile: profileData,
        });
        setError(null);
        setLoading(false);
        return;
      }
      
      // Check if user has developer or admin role
      if (!['developer', 'admin'].includes(userData.role)) {
        console.warn('User does not have developer role:', userData.role);
        setError('Access denied. Developer Portal requires developer or admin role.');
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Check if user is active
      if (userData.is_active === false) {
        setError('Your account has been deactivated. Please contact support.');
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Valid developer - set user
      setUser({
        ...authUser,
        profile: userData,
      });
      setError(null);
      setLoading(false);
      
    } catch (err) {
      // Only log error if it's not a timeout (which is handled by fallbacks above)
      if (!err.message?.includes('timed out')) {
        console.error('Role validation error:', err);
        setError('Authentication error. Please try again.');
        setUser(null);
      }
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      // Add timeout to prevent infinite waiting
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timed out. Please check your internet connection.')), 15000)
      );
      
      const { data, error: signInError } = await Promise.race([loginPromise, timeoutPromise]);

      if (signInError) throw signInError;

      if (data?.user) {
        await validateDeveloperRole(data.user);
        // Log successful developer login
        await logDeveloperLogin(data.user.id, true);
      }

      return { success: true };
    } catch (err) {
      console.error('Login failed:', err);
      // Log failed login attempt
      await logDeveloperLogin(null, false, err.message);
      setError(err.message);
      setLoading(false);
      return { success: false, error: err.message };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setError(null);
  }, []);

  // Issue #48: Token refresh handling
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh failed:', error);
        // On refresh failure, log the user out
        setUser(null);
        setError('Session expired. Please log in again.');
        return false;
      }
      if (session?.user) {
        await validateDeveloperRole(session.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Token refresh error:', err);
      return false;
    }
  }, []);

  // Set up periodic token refresh (every 10 minutes while user is logged in)
  useEffect(() => {
    if (!user) return;
    
    const refreshInterval = setInterval(async () => {
      await refreshSession();
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(refreshInterval);
  }, [user, refreshSession]);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    refreshSession,
  };

  return (
    <DevAuthContext.Provider value={value}>
      {children}
    </DevAuthContext.Provider>
  );
}

export function useDevAuth() {
  const context = useContext(DevAuthContext);
  if (!context) {
    throw new Error('useDevAuth must be used within a DevAuthProvider');
  }
  return context;
}
