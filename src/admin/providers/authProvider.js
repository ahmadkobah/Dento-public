import { supabase, getUserRole } from '../../lib/supabase';

export const authProvider = {
  login: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: {
          name: 'LoginError',
          message: error.message,
        },
      };
    }

    // Check user role
    const roleData = await getUserRole(data.user.id);
    if (!roleData || !roleData.is_active) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          name: 'LoginError',
          message: 'Account is deactivated or not found',
        },
      };
    }

    // Check if user can access admin
    const allowedRoles = ['developer', 'admin', 'receptionist', 'doctor'];
    if (!allowedRoles.includes(roleData.role)) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: {
          name: 'LoginError',
          message: 'You do not have permission to access the admin panel',
        },
      };
    }

    return {
      success: true,
      redirectTo: '/',
    };
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: {
          name: 'LogoutError',
          message: error.message,
        },
      };
    }

    return {
      success: true,
      redirectTo: '/login',
    };
  },

  check: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        authenticated: false,
        redirectTo: '/login',
      };
    }

    return {
      authenticated: true,
    };
  },

  getPermissions: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const roleData = await getUserRole(user.id);
    return roleData?.role || null;
  },

  getIdentity: async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Get user data from users table
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, role, avatar_url, is_active')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      // SECURITY FIX: Default to null role instead of admin
      role: userData?.role || null,
      name: userData?.full_name || user.email,
      avatar: userData?.avatar_url,
      // SECURITY FIX: Default to false if not explicitly active
      is_active: userData?.is_active === true,
    };
  },

  onError: async (error) => {
    console.error('Auth error:', error);
    return { error };
  },
};

export default authProvider;
