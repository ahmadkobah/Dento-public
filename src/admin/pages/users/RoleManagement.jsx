import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Settings,
  Calendar,
  FileText,
  Stethoscope,
  CreditCard,
  BarChart3,
  Building2,
  Package,
  Bell,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

// Define all available permissions per module
const PERMISSIONS = {
  cms: {
    label: 'CMS / Site Builder',
    icon: FileText,
    permissions: {
      view: 'View content',
      edit: 'Edit content',
      publish: 'Publish changes',
    }
  },
  branches: {
    label: 'Branches',
    icon: Building2,
    permissions: {
      view: 'View branches',
      create: 'Create branches',
      edit: 'Edit branches',
      delete: 'Delete branches',
    }
  },
  doctors: {
    label: 'Doctors/Staff',
    icon: Users,
    permissions: {
      view: 'View doctors',
      create: 'Add doctors',
      edit: 'Edit doctors',
      delete: 'Remove doctors',
      assign_branch: 'Assign to branches',
    }
  },
  appointments: {
    label: 'Appointments',
    icon: Calendar,
    permissions: {
      view_own: 'View own appointments',
      view_all: 'View all appointments',
      create: 'Create appointments',
      edit: 'Edit appointments',
      cancel: 'Cancel appointments',
    }
  },
  patients: {
    label: 'Patients',
    icon: Stethoscope,
    permissions: {
      view_own: 'View assigned patients',
      view_all: 'View all patients',
      create: 'Create patients',
      edit: 'Edit patient info',
      medical_history: 'Access medical history',
      dental_chart: 'Access dental charts',
    }
  },
  financial: {
    label: 'Financial',
    icon: CreditCard,
    permissions: {
      view_own: 'View own commissions',
      view_all: 'View all finances',
      create_invoice: 'Create invoices',
      edit_invoice: 'Edit invoices',
      payments: 'Record payments',
      refunds: 'Process refunds',
    }
  },
  inventory: {
    label: 'Inventory',
    icon: Package,
    permissions: {
      view: 'View stock',
      manage: 'Manage stock',
      order: 'Create orders',
    }
  },
  analytics: {
    label: 'Analytics',
    icon: BarChart3,
    permissions: {
      view_own: 'View own stats',
      view_all: 'View all reports',
      export: 'Export data',
    }
  },
  settings: {
    label: 'Settings',
    icon: Settings,
    permissions: {
      view: 'View settings',
      edit: 'Edit settings',
      users: 'Manage users',
    }
  },
};

// Default role permissions
const ROLE_DEFAULTS = {
  developer: {
    // Full access to everything
    cms: ['view', 'edit', 'publish'],
    branches: ['view', 'create', 'edit', 'delete'],
    doctors: ['view', 'create', 'edit', 'delete', 'assign_branch'],
    appointments: ['view_own', 'view_all', 'create', 'edit', 'cancel'],
    patients: ['view_own', 'view_all', 'create', 'edit', 'medical_history', 'dental_chart'],
    financial: ['view_own', 'view_all', 'create_invoice', 'edit_invoice', 'payments', 'refunds'],
    inventory: ['view', 'manage', 'order'],
    analytics: ['view_own', 'view_all', 'export'],
    settings: ['view', 'edit', 'users'],
  },
  admin: {
    cms: ['view', 'edit', 'publish'],
    branches: ['view', 'create', 'edit', 'delete'],
    doctors: ['view', 'create', 'edit', 'delete', 'assign_branch'],
    appointments: ['view_own', 'view_all', 'create', 'edit', 'cancel'],
    patients: ['view_own', 'view_all', 'create', 'edit', 'medical_history', 'dental_chart'],
    financial: ['view_own', 'view_all', 'create_invoice', 'edit_invoice', 'payments', 'refunds'],
    inventory: ['view', 'manage', 'order'],
    analytics: ['view_own', 'view_all', 'export'],
    settings: ['view', 'edit', 'users'],
  },
  doctor: {
    cms: [],
    branches: ['view'],
    doctors: ['view'],
    appointments: ['view_own', 'create', 'edit', 'cancel'],
    patients: ['view_own', 'edit', 'medical_history', 'dental_chart'],
    financial: ['view_own'],
    inventory: ['view'],
    analytics: ['view_own'],
    settings: [],
  },
  receptionist: {
    cms: [],
    branches: ['view'],
    doctors: ['view'],
    appointments: ['view_all', 'create', 'edit', 'cancel'],
    patients: ['view_all', 'create', 'edit'],
    financial: ['view_all', 'create_invoice', 'payments'],
    inventory: ['view'],
    analytics: ['view_own'],
    settings: [],
  },
  cbct_tech: {
    cms: [],
    branches: ['view'],
    doctors: ['view'],
    appointments: ['view_all'],
    patients: ['view_all'],
    financial: [],
    inventory: ['view'],
    analytics: [],
    settings: [],
  },
  assistant: {
    cms: [],
    branches: ['view'],
    doctors: ['view'],
    appointments: ['view_own'],
    patients: ['view_own'],
    financial: [],
    inventory: ['view'],
    analytics: [],
    settings: [],
  },
  patient: {
    cms: [],
    branches: [],
    doctors: [],
    appointments: ['view_own'],
    patients: [],
    financial: ['view_own'],
    inventory: [],
    analytics: [],
    settings: [],
  },
};

const RoleManagement = () => {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  // eslint-disable-next-line no-unused-vars
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('admin');
  const [rolePermissions, setRolePermissions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'users'

  // Fetch users grouped by role
  const fetchUsers = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, full_name, email, role, is_active, avatar_url')
        .eq('tenant_id', tenantId)
        .order('role');
      
      if (fetchError) throw fetchError;
      setUsers(data || []);

      // Group users by role
      const roleGroups = {};
      (data || []).forEach(user => {
        if (!roleGroups[user.role]) {
          roleGroups[user.role] = [];
        }
        roleGroups[user.role].push(user);
      });
      setRoles(Object.keys(roleGroups).sort());
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  // Fetch role permissions from database or use defaults
  const fetchRolePermissions = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('role_permissions')
        .select('*');
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        // Table might not exist yet, use defaults
        setRolePermissions(ROLE_DEFAULTS);
        return;
      }

      if (data && data.length > 0) {
        const perms = {};
        data.forEach(row => {
          perms[row.role] = row.permissions;
        });
        setRolePermissions(perms);
      } else {
        setRolePermissions(ROLE_DEFAULTS);
      }
    } catch {
      // Use default permissions on error
      setRolePermissions(ROLE_DEFAULTS);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRolePermissions();
  }, [fetchUsers, fetchRolePermissions]);

  const handlePermissionToggle = (module, permission) => {
    setRolePermissions(prev => {
      const current = prev[selectedRole]?.[module] || [];
      const updated = current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission];
      
      return {
        ...prev,
        [selectedRole]: {
          ...prev[selectedRole],
          [module]: updated
        }
      };
    });
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Try to save to role_permissions table
      const { error: upsertError } = await supabase
        .from('role_permissions')
        .upsert({
          role: selectedRole,
          permissions: rolePermissions[selectedRole],
          updated_at: new Date().toISOString()
        }, { onConflict: 'role' });

      if (upsertError) {
        // If table doesn't exist, show info message
        if (upsertError.code === '42P01') {
          setSuccess('Permissions configured (using defaults). Create role_permissions table for persistence.');
        } else {
          throw upsertError;
        }
      } else {
        setSuccess(`Permissions for ${selectedRole} saved successfully!`);
      }
    } catch (err) {
      console.error('Error saving permissions:', err);
      setError('Failed to save permissions: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setRolePermissions(prev => ({
      ...prev,
      [selectedRole]: ROLE_DEFAULTS[selectedRole] || {}
    }));
    setSuccess(`Reset ${selectedRole} permissions to defaults`);
  };

  const getRoleBadge = (role) => {
    const colors = {
      developer: 'bg-purple-100 text-purple-700 border-purple-200',
      admin: 'bg-red-100 text-red-700 border-red-200',
      doctor: 'bg-blue-100 text-blue-700 border-blue-200',
      receptionist: 'bg-green-100 text-green-700 border-green-200',
      cbct_tech: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      assistant: 'bg-orange-100 text-orange-700 border-orange-200',
      patient: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'developer': return <ShieldCheck className="w-5 h-5" />;
      case 'admin': return <Shield className="w-5 h-5" />;
      case 'doctor': return <Stethoscope className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  const getUsersForRole = (role) => users.filter(u => u.role === role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary-600" />
              Role Management
            </h1>
            <p className="text-gray-500 mt-1">Configure user roles and permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/users/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Users className="w-5 h-5" />
            Add User
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'roles'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Role Permissions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Users by Role
          </button>
        </nav>
      </div>

      {activeTab === 'roles' ? (
        <div className="grid grid-cols-12 gap-6">
          {/* Role Selector */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Select Role</h3>
              <div className="space-y-2">
                {Object.keys(ROLE_DEFAULTS).map(role => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
                      selectedRole === role
                        ? 'bg-primary-50 text-primary-700 border-2 border-primary-300'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    {getRoleIcon(role)}
                    <span className="capitalize font-medium">{role.replace('_', ' ')}</span>
                    <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      {getUsersForRole(role).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Permissions Grid */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadge(selectedRole)}`}>
                    {selectedRole.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-gray-500">
                    {getUsersForRole(selectedRole).length} user(s)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetToDefault}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Reset to Default
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Permissions
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(PERMISSIONS).map(([moduleKey, module]) => {
                  const ModuleIcon = module.icon;
                  const currentPerms = rolePermissions[selectedRole]?.[moduleKey] || [];
                  const allPerms = Object.keys(module.permissions);
                  const hasAll = allPerms.every(p => currentPerms.includes(p));
                  const hasNone = currentPerms.length === 0;

                  return (
                    <div key={moduleKey} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ModuleIcon className="w-5 h-5 text-gray-600" />
                        <h4 className="font-semibold text-gray-900">{module.label}</h4>
                        {hasAll && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                        {hasNone && <XCircle className="w-4 h-4 text-gray-300 ml-auto" />}
                      </div>
                      <div className="space-y-2">
                        {Object.entries(module.permissions).map(([permKey, permLabel]) => {
                          const isActive = currentPerms.includes(permKey);
                          return (
                            <label
                              key={permKey}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                                isActive ? 'bg-green-50' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => handlePermissionToggle(moduleKey, permKey)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className={`text-sm ${isActive ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                                {permLabel}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Users by Role Tab */
        <div className="space-y-6">
          {Object.keys(ROLE_DEFAULTS).map(role => {
            const roleUsers = getUsersForRole(role);
            if (roleUsers.length === 0) return null;

            return (
              <div key={role} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  {getRoleIcon(role)}
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {role.replace('_', ' ')}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(role)}`}>
                    {roleUsers.length} user{roleUsers.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roleUsers.map(user => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        user.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <img
                        src={user.avatar_url || `https://api.dicebear.com/9.x/micah/svg?seed=${user.email}`}
                        alt=""
                        className="w-10 h-10 rounded-full bg-gray-100"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {user.full_name || 'Unnamed'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                      {!user.is_active && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                      <Link
                        to={`/users/edit/${user.id}`}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {users.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
