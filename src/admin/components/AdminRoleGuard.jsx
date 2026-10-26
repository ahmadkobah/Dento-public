// Role-based route guard for Admin Panel
// Prevents unauthorized access to routes based on user role

import { Navigate, useLocation } from 'react-router-dom';
import { useGetIdentity } from '@refinedev/core';
import { AlertCircle, Loader2 } from 'lucide-react';

/**
 * AdminRoleGuard - Protects routes based on user role
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The protected content
 * @param {string[]} props.allowedRoles - Array of roles that can access this route
 * @param {string} [props.fallbackPath] - Optional redirect path (defaults to /admin)
 * @param {boolean} [props.showAccessDenied] - Show access denied message instead of redirect
 */
const AdminRoleGuard = ({ 
  children, 
  allowedRoles = [], 
  fallbackPath = '/',
  showAccessDenied = true 
}) => {
  const { data: identity, isLoading } = useGetIdentity();
  const location = useLocation();
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }
  
  const userRole = identity?.role;
  
  // If no roles specified, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }
  
  // Check if user role is in allowed roles
  const hasAccess = userRole && allowedRoles.includes(userRole);
  
  if (!hasAccess) {
    if (showAccessDenied) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center px-4">
          <div className="rounded-full bg-red-100 p-4 mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 max-w-md mb-4">
            You don't have permission to access this page. 
            This feature requires {allowedRoles.length === 1 
              ? `${allowedRoles[0]} role` 
              : `one of these roles: ${allowedRoles.join(', ')}`}.
          </p>
          <p className="text-sm text-gray-500">
            Your current role: <span className="font-medium capitalize">{userRole || 'Unknown'}</span>
          </p>
        </div>
      );
    }
    
    // Redirect to fallback
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }
  
  return children;
};

export default AdminRoleGuard;
