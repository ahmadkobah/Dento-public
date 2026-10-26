import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * ProtectedRoute - Wraps routes that require authentication and/or specific roles
 * 
 * @param {ReactNode} children - The component to render if authorized
 * @param {string[]} allowedRoles - Array of roles that can access this route
 * @param {string} redirectTo - Where to redirect if not authenticated (default: /login)
 * @param {string} unauthorizedRedirect - Where to redirect if authenticated but wrong role (default: /)
 */
export const ProtectedRoute = ({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login',
  unauthorizedRedirect = '/'
}) => {
  const { user, loading, userRole, hasPermission } = useAuth();
  const location = useLocation();
  const [waitCount, setWaitCount] = useState(0);

  // Poll for role loading - check every 500ms for up to 5 seconds
  useEffect(() => {
    if (user && userRole === null && waitCount < 10) {
      const timer = setTimeout(() => {
        setWaitCount(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, userRole, waitCount]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If roles are required but userRole hasn't loaded yet, show loading (max 5 seconds)
  if (allowedRoles.length > 0 && userRole === null && waitCount < 10) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // SECURITY FIX: If timeout reached and still no role, redirect to unauthorized
  // Do NOT allow access without proper role verification
  if (allowedRoles.length > 0 && userRole === null && waitCount >= 10) {
    return <Navigate to={unauthorizedRedirect} state={{ error: 'Unable to verify permissions. Please try logging in again.' }} replace />;
  }

  // Authenticated but no role required - allow access
  if (allowedRoles.length === 0) {
    return children;
  }

  // Check if user has required role
  if (!hasPermission(allowedRoles)) {
    // User doesn't have permission - redirect to appropriate page
    return <Navigate to={unauthorizedRedirect} replace />;
  }

  // User is authenticated and has permission
  return children;
};

/**
 * PublicOnlyRoute - For routes that should only be accessible when NOT logged in
 * (e.g., login page, register page)
 */
export const PublicOnlyRoute = ({ children, redirectTo = '/' }) => {
  const { user, loading, userRole } = useAuth();
  const location = useLocation();
  const [showLogin, setShowLogin] = useState(false);

  // Show login after 2 seconds even if still loading (prevents endless spinner)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setShowLogin(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [loading]);

  // If loading but timeout reached, show login page
  if (loading && !showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    // Determine where to redirect based on role
    let targetPath = redirectTo;
    
    if (location.state?.from) {
      targetPath = location.state.from.pathname;
    } else if (userRole === 'developer' || userRole === 'admin') {
      targetPath = '/';
    } else if (userRole === 'doctor') {
      targetPath = '/doctor';
    } else if (userRole === 'receptionist') {
      targetPath = '/appointments';
    }
    
    return <Navigate to={targetPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
