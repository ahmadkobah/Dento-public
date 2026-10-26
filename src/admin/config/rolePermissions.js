// Role-based permissions configuration
// Each role defines what menu items, routes, and actions the user can access

/**
 * User roles in the system (from users.role field)
 * Note: These are different from tenant_users.role (owner, admin, manager, member, readonly)
 */
export const USER_ROLES = {
  DEVELOPER: 'developer',    // Full system access (can access Developer Portal)
  ADMIN: 'admin',            // Clinic admin - full access to Admin Portal
  MANAGER: 'manager',        // Clinic manager - most admin access except user management
  DOCTOR: 'doctor',          // Dentist/Specialist - clinical access only
  RECEPTIONIST: 'receptionist', // Front desk - scheduling and basic patient access
  ACCOUNTANT: 'accountant',  // Financial access only
  HYGIENIST: 'hygienist',    // Hygienist - limited clinical access
  ASSISTANT: 'assistant',    // Dental assistant - limited clinical access
};

/**
 * Role hierarchy - higher roles include permissions of lower roles
 * Developer > Admin > Manager > Doctor/Receptionist/Accountant
 */
export const ROLE_HIERARCHY = {
  developer: 100,
  admin: 90,
  manager: 70,
  doctor: 50,
  receptionist: 40,
  accountant: 40,
  hygienist: 30,
  assistant: 20,
};

/**
 * Check if a role has access (considering hierarchy)
 */
export const hasRoleAccess = (userRole, requiredRoles) => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (!userRole) return false;
  
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  
  return requiredRoles.some(role => {
    const requiredLevel = ROLE_HIERARCHY[role] || 0;
    // User has access if their level is >= required level OR role matches exactly
    return userRole === role || userLevel >= requiredLevel;
  });
};

/**
 * Permission types for actions
 */
export const PERMISSIONS = {
  FULL: 'full',       // Complete CRUD access
  ALL: 'all',         // Access to all records
  OWN: 'own',         // Access to own records only
  VIEW: 'view',       // Read-only access
  CREATE: 'create',   // Can create new records
  LIMITED: 'limited', // Restricted view
  NONE: 'none',       // No access
};

/**
 * Menu item configurations with role requirements
 */
export const MENU_PERMISSIONS = {
  // Dashboard - different views per role
  dashboard: {
    path: '/',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant', 'hygienist', 'assistant'],
  },
  
  // Scheduling
  appointments: {
    path: '/appointments',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  walkInQueue: {
    path: '/appointments/walk-in',
    roles: ['developer', 'admin', 'manager', 'receptionist'],
  },
  scheduleManagement: {
    path: '/schedules',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  
  // People
  patients: {
    path: '/patients',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  doctors: {
    path: '/doctors',
    roles: ['developer', 'admin', 'manager'],
  },
  branches: {
    path: '/branches',
    roles: ['developer', 'admin', 'manager'],
  },
  
  // Clinical
  dentalChart: {
    path: '/patients/:id/dental-chart',
    roles: ['developer', 'admin', 'manager', 'doctor', 'hygienist', 'assistant'],
  },
  treatmentPlans: {
    path: '/treatment-plans',
    roles: ['developer', 'admin', 'manager', 'doctor', 'assistant'],
  },
  prescriptions: {
    path: '/prescriptions',
    roles: ['developer', 'admin', 'manager', 'doctor'],
  },
  labOrders: {
    path: '/lab-orders',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'assistant'],
  },
  xrays: {
    path: '/xrays',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  cbct: {
    path: '/cbct',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  
  // Services
  services: {
    path: '/services',
    roles: ['developer', 'admin', 'manager'],
  },
  
  // Financial
  invoices: {
    path: '/invoices',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant'],
  },
  installments: {
    path: '/installments',
    roles: ['developer', 'admin', 'manager', 'receptionist', 'accountant'],
  },
  commissions: {
    path: '/commissions',
    roles: ['developer', 'admin', 'manager', 'doctor', 'accountant'],
  },
  dailyReconciliation: {
    path: '/reconciliation',
    roles: ['developer', 'admin', 'manager', 'accountant'],
  },
  
  // Insurance
  insurance: {
    path: '/insurance',
    roles: ['developer', 'admin', 'manager', 'receptionist', 'accountant'],
  },
  
  // Inventory
  inventory: {
    path: '/inventory',
    roles: ['developer', 'admin', 'manager', 'hygienist', 'assistant'],
  },
  
  // Staff Management
  staffSchedule: {
    path: '/staff-schedule',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'hygienist', 'assistant'],
  },
  leaveRequests: {
    path: '/leave-requests',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant', 'hygienist', 'assistant'],
  },
  attendance: {
    path: '/attendance',
    roles: ['developer', 'admin', 'manager'],
  },
  
  // Content
  testimonials: {
    path: '/testimonials',
    roles: ['developer', 'admin', 'manager'],
  },
  portfolio: {
    path: '/portfolio',
    roles: ['developer', 'admin', 'manager'],
  },
  mediaLibrary: {
    path: '/media',
    roles: ['developer', 'admin', 'manager'],
  },
  
  // Tourism
  tourismPackages: {
    path: '/tourism-packages',
    roles: ['developer', 'admin', 'manager'],
  },
  
  // Settings - ADMIN ONLY
  users: {
    path: '/users',
    roles: ['developer', 'admin', 'manager'], // Manager can view staff
    managerRestriction: 'staff_only', // Manager can only manage non-admin staff
  },
  roleManagement: {
    path: '/users/roles',
    roles: ['developer', 'admin'], // ONLY admin and developer
  },
  userSessions: {
    path: '/users/sessions',
    roles: ['developer', 'admin'],
  },
  siteSettings: {
    path: '/settings',
    roles: ['developer', 'admin', 'manager'],
  },
  translations: {
    path: '/translations',
    roles: ['developer', 'admin'],
  },
  notifications: {
    path: '/notifications',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist'],
  },
  profile: {
    path: '/profile',
    roles: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant', 'hygienist', 'assistant'],
  },
};

/**
 * Get roles that can access a specific route/menu item
 */
export const getRolesForPath = (path) => {
  const permission = Object.values(MENU_PERMISSIONS).find(p => p.path === path);
  return permission?.roles || [];
};

/**
 * Check if user can access a specific path
 */
export const canAccessPath = (userRole, path) => {
  const roles = getRolesForPath(path);
  if (roles.length === 0) return true; // No restriction defined
  return roles.includes(userRole);
};

/**
 * Check if user can access a menu item by key
 */
export const canAccessMenu = (userRole, menuKey) => {
  const permission = MENU_PERMISSIONS[menuKey];
  if (!permission) return true;
  return permission.roles.includes(userRole);
};

/**
 * Get all accessible menu items for a role
 */
export const getAccessibleMenus = (userRole) => {
  return Object.entries(MENU_PERMISSIONS)
    .filter(([_, permission]) => permission.roles.includes(userRole))
    .map(([key, permission]) => ({ key, ...permission }));
};

/**
 * Roles that can access the Developer Portal
 */
export const DEVELOPER_PORTAL_ROLES = ['developer'];

/**
 * Roles that can manage other users
 */
export const USER_MANAGEMENT_ROLES = ['developer', 'admin'];

/**
 * Roles that can configure role permissions
 */
export const ROLE_MANAGEMENT_ROLES = ['developer', 'admin'];

/**
 * Roles that can access site settings
 */
export const SETTINGS_ROLES = ['developer', 'admin', 'manager'];

/**
 * Common role groups for route protection
 */
export const ROLE_GROUPS = {
  // Full admin access - only developer and admin
  ADMIN_ONLY: ['developer', 'admin'],
  
  // Management access - admin + manager
  MANAGEMENT: ['developer', 'admin', 'manager'],
  
  // Clinical staff - can access clinical features
  CLINICAL: ['developer', 'admin', 'manager', 'doctor', 'hygienist', 'assistant'],
  
  // Front office - receptionists and managers
  FRONT_OFFICE: ['developer', 'admin', 'manager', 'receptionist'],
  
  // Financial access - accounting features
  FINANCIAL: ['developer', 'admin', 'manager', 'accountant'],
  
  // All staff roles
  ALL_STAFF: ['developer', 'admin', 'manager', 'doctor', 'receptionist', 'accountant', 'hygienist', 'assistant'],
};

export default {
  USER_ROLES,
  ROLE_HIERARCHY,
  PERMISSIONS,
  MENU_PERMISSIONS,
  ROLE_GROUPS,
  hasRoleAccess,
  getRolesForPath,
  canAccessPath,
  canAccessMenu,
  getAccessibleMenus,
  DEVELOPER_PORTAL_ROLES,
  USER_MANAGEMENT_ROLES,
  ROLE_MANAGEMENT_ROLES,
  SETTINGS_ROLES,
};
