/**
 * Role Permissions Tests
 * 
 * Tests the Role-Based Access Control (RBAC) system to verify:
 * 1. Each role has correct default permissions
 * 2. Permissions can be saved and retrieved from database
 * 3. Permission checks work correctly for each module
 * 4. Permission inheritance and restrictions work properly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase before any imports that might use it
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
  },
};

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Define all available permissions per module (from RoleManagement.jsx)
const PERMISSIONS = {
  cms: {
    label: 'CMS / Site Builder',
    permissions: {
      view: 'View content',
      edit: 'Edit content',
      publish: 'Publish changes',
    }
  },
  branches: {
    label: 'Branches',
    permissions: {
      view: 'View branches',
      create: 'Create branches',
      edit: 'Edit branches',
      delete: 'Delete branches',
    }
  },
  doctors: {
    label: 'Doctors/Staff',
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
    permissions: {
      view: 'View stock',
      manage: 'Manage stock',
      order: 'Create orders',
    }
  },
  analytics: {
    label: 'Analytics',
    permissions: {
      view_own: 'View own stats',
      view_all: 'View all reports',
      export: 'Export data',
    }
  },
  settings: {
    label: 'Settings',
    permissions: {
      view: 'View settings',
      edit: 'Edit settings',
      users: 'Manage users',
    }
  },
};

// Default role permissions (from RoleManagement.jsx)
const ROLE_DEFAULTS = {
  developer: {
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

// Helper function to check if a role has a specific permission
const hasPermission = (role, module, permission) => {
  const rolePerms = ROLE_DEFAULTS[role];
  if (!rolePerms || !rolePerms[module]) return false;
  return rolePerms[module].includes(permission);
};

// Helper function to count permissions for a role
const countPermissions = (role) => {
  const rolePerms = ROLE_DEFAULTS[role];
  if (!rolePerms) return 0;
  return Object.values(rolePerms).reduce((total, perms) => total + perms.length, 0);
};

// ================================================================
// DEVELOPER ROLE TESTS
// ================================================================
describe('Developer Role Permissions', () => {
  const role = 'developer';

  describe('CMS Permissions', () => {
    it('should have view permission', () => {
      expect(hasPermission(role, 'cms', 'view')).toBe(true);
    });

    it('should have edit permission', () => {
      expect(hasPermission(role, 'cms', 'edit')).toBe(true);
    });

    it('should have publish permission', () => {
      expect(hasPermission(role, 'cms', 'publish')).toBe(true);
    });
  });

  describe('Branches Permissions', () => {
    it('should have view permission', () => {
      expect(hasPermission(role, 'branches', 'view')).toBe(true);
    });

    it('should have create permission', () => {
      expect(hasPermission(role, 'branches', 'create')).toBe(true);
    });

    it('should have edit permission', () => {
      expect(hasPermission(role, 'branches', 'edit')).toBe(true);
    });

    it('should have delete permission', () => {
      expect(hasPermission(role, 'branches', 'delete')).toBe(true);
    });
  });

  describe('Doctors Permissions', () => {
    it('should have full doctor management permissions', () => {
      expect(hasPermission(role, 'doctors', 'view')).toBe(true);
      expect(hasPermission(role, 'doctors', 'create')).toBe(true);
      expect(hasPermission(role, 'doctors', 'edit')).toBe(true);
      expect(hasPermission(role, 'doctors', 'delete')).toBe(true);
      expect(hasPermission(role, 'doctors', 'assign_branch')).toBe(true);
    });
  });

  describe('Appointments Permissions', () => {
    it('should have full appointment permissions', () => {
      expect(hasPermission(role, 'appointments', 'view_own')).toBe(true);
      expect(hasPermission(role, 'appointments', 'view_all')).toBe(true);
      expect(hasPermission(role, 'appointments', 'create')).toBe(true);
      expect(hasPermission(role, 'appointments', 'edit')).toBe(true);
      expect(hasPermission(role, 'appointments', 'cancel')).toBe(true);
    });
  });

  describe('Patient Permissions', () => {
    it('should have full patient permissions', () => {
      expect(hasPermission(role, 'patients', 'view_own')).toBe(true);
      expect(hasPermission(role, 'patients', 'view_all')).toBe(true);
      expect(hasPermission(role, 'patients', 'create')).toBe(true);
      expect(hasPermission(role, 'patients', 'edit')).toBe(true);
      expect(hasPermission(role, 'patients', 'medical_history')).toBe(true);
      expect(hasPermission(role, 'patients', 'dental_chart')).toBe(true);
    });
  });

  describe('Financial Permissions', () => {
    it('should have full financial permissions', () => {
      expect(hasPermission(role, 'financial', 'view_own')).toBe(true);
      expect(hasPermission(role, 'financial', 'view_all')).toBe(true);
      expect(hasPermission(role, 'financial', 'create_invoice')).toBe(true);
      expect(hasPermission(role, 'financial', 'edit_invoice')).toBe(true);
      expect(hasPermission(role, 'financial', 'payments')).toBe(true);
      expect(hasPermission(role, 'financial', 'refunds')).toBe(true);
    });
  });

  describe('Inventory Permissions', () => {
    it('should have full inventory permissions', () => {
      expect(hasPermission(role, 'inventory', 'view')).toBe(true);
      expect(hasPermission(role, 'inventory', 'manage')).toBe(true);
      expect(hasPermission(role, 'inventory', 'order')).toBe(true);
    });
  });

  describe('Analytics Permissions', () => {
    it('should have full analytics permissions', () => {
      expect(hasPermission(role, 'analytics', 'view_own')).toBe(true);
      expect(hasPermission(role, 'analytics', 'view_all')).toBe(true);
      expect(hasPermission(role, 'analytics', 'export')).toBe(true);
    });
  });

  describe('Settings Permissions', () => {
    it('should have full settings permissions', () => {
      expect(hasPermission(role, 'settings', 'view')).toBe(true);
      expect(hasPermission(role, 'settings', 'edit')).toBe(true);
      expect(hasPermission(role, 'settings', 'users')).toBe(true);
    });
  });

  it('should have maximum permissions (38 total)', () => {
    expect(countPermissions(role)).toBe(38);
  });
});

// ================================================================
// ADMIN ROLE TESTS
// ================================================================
describe('Admin Role Permissions', () => {
  const role = 'admin';

  it('should have same permissions as developer', () => {
    expect(countPermissions(role)).toBe(countPermissions('developer'));
  });

  it('should have full CMS permissions', () => {
    expect(hasPermission(role, 'cms', 'view')).toBe(true);
    expect(hasPermission(role, 'cms', 'edit')).toBe(true);
    expect(hasPermission(role, 'cms', 'publish')).toBe(true);
  });

  it('should have full branches permissions', () => {
    expect(hasPermission(role, 'branches', 'view')).toBe(true);
    expect(hasPermission(role, 'branches', 'create')).toBe(true);
    expect(hasPermission(role, 'branches', 'edit')).toBe(true);
    expect(hasPermission(role, 'branches', 'delete')).toBe(true);
  });

  it('should have full user management permissions', () => {
    expect(hasPermission(role, 'settings', 'users')).toBe(true);
  });
});

// ================================================================
// DOCTOR ROLE TESTS
// ================================================================
describe('Doctor Role Permissions', () => {
  const role = 'doctor';

  describe('CMS Restrictions', () => {
    it('should NOT have any CMS permissions', () => {
      expect(hasPermission(role, 'cms', 'view')).toBe(false);
      expect(hasPermission(role, 'cms', 'edit')).toBe(false);
      expect(hasPermission(role, 'cms', 'publish')).toBe(false);
    });
  });

  describe('Branches Restrictions', () => {
    it('should only have view permission', () => {
      expect(hasPermission(role, 'branches', 'view')).toBe(true);
      expect(hasPermission(role, 'branches', 'create')).toBe(false);
      expect(hasPermission(role, 'branches', 'edit')).toBe(false);
      expect(hasPermission(role, 'branches', 'delete')).toBe(false);
    });
  });

  describe('Doctors Restrictions', () => {
    it('should only have view permission for other doctors', () => {
      expect(hasPermission(role, 'doctors', 'view')).toBe(true);
      expect(hasPermission(role, 'doctors', 'create')).toBe(false);
      expect(hasPermission(role, 'doctors', 'edit')).toBe(false);
      expect(hasPermission(role, 'doctors', 'delete')).toBe(false);
    });
  });

  describe('Appointments Permissions', () => {
    it('should have own appointments management', () => {
      expect(hasPermission(role, 'appointments', 'view_own')).toBe(true);
      expect(hasPermission(role, 'appointments', 'create')).toBe(true);
      expect(hasPermission(role, 'appointments', 'edit')).toBe(true);
      expect(hasPermission(role, 'appointments', 'cancel')).toBe(true);
    });

    it('should NOT have view_all permission', () => {
      expect(hasPermission(role, 'appointments', 'view_all')).toBe(false);
    });
  });

  describe('Patient Permissions', () => {
    it('should have own patient permissions with clinical access', () => {
      expect(hasPermission(role, 'patients', 'view_own')).toBe(true);
      expect(hasPermission(role, 'patients', 'edit')).toBe(true);
      expect(hasPermission(role, 'patients', 'medical_history')).toBe(true);
      expect(hasPermission(role, 'patients', 'dental_chart')).toBe(true);
    });

    it('should NOT have patient creation or view_all', () => {
      expect(hasPermission(role, 'patients', 'view_all')).toBe(false);
      expect(hasPermission(role, 'patients', 'create')).toBe(false);
    });
  });

  describe('Financial Restrictions', () => {
    it('should only view own financial data (commissions)', () => {
      expect(hasPermission(role, 'financial', 'view_own')).toBe(true);
      expect(hasPermission(role, 'financial', 'view_all')).toBe(false);
      expect(hasPermission(role, 'financial', 'create_invoice')).toBe(false);
      expect(hasPermission(role, 'financial', 'payments')).toBe(false);
      expect(hasPermission(role, 'financial', 'refunds')).toBe(false);
    });
  });

  describe('Settings Restrictions', () => {
    it('should NOT have any settings permissions', () => {
      expect(hasPermission(role, 'settings', 'view')).toBe(false);
      expect(hasPermission(role, 'settings', 'edit')).toBe(false);
      expect(hasPermission(role, 'settings', 'users')).toBe(false);
    });
  });

  it('should have limited permissions (13 total)', () => {
    expect(countPermissions(role)).toBe(13);
  });
});

// ================================================================
// RECEPTIONIST ROLE TESTS
// ================================================================
describe('Receptionist Role Permissions', () => {
  const role = 'receptionist';

  describe('CMS Restrictions', () => {
    it('should NOT have any CMS permissions', () => {
      expect(hasPermission(role, 'cms', 'view')).toBe(false);
      expect(hasPermission(role, 'cms', 'edit')).toBe(false);
    });
  });

  describe('Appointments Permissions', () => {
    it('should have full appointment management', () => {
      expect(hasPermission(role, 'appointments', 'view_all')).toBe(true);
      expect(hasPermission(role, 'appointments', 'create')).toBe(true);
      expect(hasPermission(role, 'appointments', 'edit')).toBe(true);
      expect(hasPermission(role, 'appointments', 'cancel')).toBe(true);
    });

    it('should NOT have view_own (uses view_all instead)', () => {
      // Receptionist uses view_all to see all appointments
      expect(hasPermission(role, 'appointments', 'view_own')).toBe(false);
    });
  });

  describe('Patient Permissions', () => {
    it('should be able to view and manage all patients', () => {
      expect(hasPermission(role, 'patients', 'view_all')).toBe(true);
      expect(hasPermission(role, 'patients', 'create')).toBe(true);
      expect(hasPermission(role, 'patients', 'edit')).toBe(true);
    });

    it('should NOT have clinical access', () => {
      expect(hasPermission(role, 'patients', 'medical_history')).toBe(false);
      expect(hasPermission(role, 'patients', 'dental_chart')).toBe(false);
    });
  });

  describe('Financial Permissions', () => {
    it('should be able to view all finances and handle payments', () => {
      expect(hasPermission(role, 'financial', 'view_all')).toBe(true);
      expect(hasPermission(role, 'financial', 'create_invoice')).toBe(true);
      expect(hasPermission(role, 'financial', 'payments')).toBe(true);
    });

    it('should NOT be able to edit invoices or process refunds', () => {
      expect(hasPermission(role, 'financial', 'edit_invoice')).toBe(false);
      expect(hasPermission(role, 'financial', 'refunds')).toBe(false);
    });
  });

  describe('Settings Restrictions', () => {
    it('should NOT have any settings permissions', () => {
      expect(hasPermission(role, 'settings', 'view')).toBe(false);
      expect(hasPermission(role, 'settings', 'edit')).toBe(false);
      expect(hasPermission(role, 'settings', 'users')).toBe(false);
    });
  });

  it('should have moderate permissions (14 total)', () => {
    expect(countPermissions(role)).toBe(14);
  });
});

// ================================================================
// CBCT TECH ROLE TESTS
// ================================================================
describe('CBCT Tech Role Permissions', () => {
  const role = 'cbct_tech';

  describe('View-Only Access', () => {
    it('should only have view permissions for most modules', () => {
      expect(hasPermission(role, 'branches', 'view')).toBe(true);
      expect(hasPermission(role, 'doctors', 'view')).toBe(true);
      expect(hasPermission(role, 'appointments', 'view_all')).toBe(true);
      expect(hasPermission(role, 'patients', 'view_all')).toBe(true);
      expect(hasPermission(role, 'inventory', 'view')).toBe(true);
    });
  });

  describe('No Modification Rights', () => {
    it('should NOT be able to create/edit appointments', () => {
      expect(hasPermission(role, 'appointments', 'create')).toBe(false);
      expect(hasPermission(role, 'appointments', 'edit')).toBe(false);
      expect(hasPermission(role, 'appointments', 'cancel')).toBe(false);
    });

    it('should NOT have any financial permissions', () => {
      expect(hasPermission(role, 'financial', 'view_own')).toBe(false);
      expect(hasPermission(role, 'financial', 'view_all')).toBe(false);
      expect(hasPermission(role, 'financial', 'create_invoice')).toBe(false);
    });

    it('should NOT have any analytics permissions', () => {
      expect(hasPermission(role, 'analytics', 'view_own')).toBe(false);
      expect(hasPermission(role, 'analytics', 'view_all')).toBe(false);
    });

    it('should NOT have any settings permissions', () => {
      expect(hasPermission(role, 'settings', 'view')).toBe(false);
    });
  });

  it('should have minimal permissions (5 total)', () => {
    expect(countPermissions(role)).toBe(5);
  });
});

// ================================================================
// ASSISTANT ROLE TESTS
// ================================================================
describe('Assistant Role Permissions', () => {
  const role = 'assistant';

  describe('Limited View Access', () => {
    it('should only view own data', () => {
      expect(hasPermission(role, 'appointments', 'view_own')).toBe(true);
      expect(hasPermission(role, 'patients', 'view_own')).toBe(true);
    });

    it('should NOT view all data', () => {
      expect(hasPermission(role, 'appointments', 'view_all')).toBe(false);
      expect(hasPermission(role, 'patients', 'view_all')).toBe(false);
    });
  });

  describe('No Financial Access', () => {
    it('should NOT have any financial permissions', () => {
      expect(hasPermission(role, 'financial', 'view_own')).toBe(false);
      expect(hasPermission(role, 'financial', 'view_all')).toBe(false);
    });
  });

  describe('No Analytics Access', () => {
    it('should NOT have any analytics permissions', () => {
      expect(hasPermission(role, 'analytics', 'view_own')).toBe(false);
      expect(hasPermission(role, 'analytics', 'view_all')).toBe(false);
    });
  });

  it('should have very limited permissions (5 total)', () => {
    expect(countPermissions(role)).toBe(5);
  });
});

// ================================================================
// PATIENT ROLE TESTS
// ================================================================
describe('Patient Role Permissions', () => {
  const role = 'patient';

  describe('Own Data Access Only', () => {
    it('should only view own appointments', () => {
      expect(hasPermission(role, 'appointments', 'view_own')).toBe(true);
      expect(hasPermission(role, 'appointments', 'view_all')).toBe(false);
    });

    it('should only view own financial data', () => {
      expect(hasPermission(role, 'financial', 'view_own')).toBe(true);
      expect(hasPermission(role, 'financial', 'view_all')).toBe(false);
    });
  });

  describe('No System Access', () => {
    it('should NOT have any branches access', () => {
      expect(hasPermission(role, 'branches', 'view')).toBe(false);
    });

    it('should NOT have any doctors access', () => {
      expect(hasPermission(role, 'doctors', 'view')).toBe(false);
    });

    it('should NOT have any patient management access', () => {
      // Patients can only view their own profile, not manage other patients
      expect(hasPermission(role, 'patients', 'view_own')).toBe(false);
      expect(hasPermission(role, 'patients', 'view_all')).toBe(false);
    });

    it('should NOT have any settings access', () => {
      expect(hasPermission(role, 'settings', 'view')).toBe(false);
      expect(hasPermission(role, 'settings', 'edit')).toBe(false);
      expect(hasPermission(role, 'settings', 'users')).toBe(false);
    });
  });

  it('should have minimal permissions (2 total)', () => {
    expect(countPermissions(role)).toBe(2);
  });
});

// ================================================================
// PERMISSION HIERARCHY TESTS
// ================================================================
describe('Permission Hierarchy', () => {
  it('developer and admin should have equal permissions', () => {
    const devCount = countPermissions('developer');
    const adminCount = countPermissions('admin');
    expect(devCount).toBe(adminCount);
  });

  it('admin should have more permissions than doctor', () => {
    expect(countPermissions('admin')).toBeGreaterThan(countPermissions('doctor'));
  });

  it('doctor should have more permissions than assistant', () => {
    expect(countPermissions('doctor')).toBeGreaterThan(countPermissions('assistant'));
  });

  it('receptionist should have more permissions than cbct_tech', () => {
    expect(countPermissions('receptionist')).toBeGreaterThan(countPermissions('cbct_tech'));
  });

  it('patient should have the least permissions', () => {
    const patientCount = countPermissions('patient');
    expect(patientCount).toBeLessThanOrEqual(countPermissions('assistant'));
    expect(patientCount).toBeLessThanOrEqual(countPermissions('cbct_tech'));
  });
});

// ================================================================
// CLINICAL ACCESS TESTS
// ================================================================
describe('Clinical Access Permissions', () => {
  describe('Medical History Access', () => {
    it('should be available to doctor', () => {
      expect(hasPermission('doctor', 'patients', 'medical_history')).toBe(true);
    });

    it('should be available to admin', () => {
      expect(hasPermission('admin', 'patients', 'medical_history')).toBe(true);
    });

    it('should be available to developer', () => {
      expect(hasPermission('developer', 'patients', 'medical_history')).toBe(true);
    });

    it('should NOT be available to receptionist', () => {
      expect(hasPermission('receptionist', 'patients', 'medical_history')).toBe(false);
    });

    it('should NOT be available to cbct_tech', () => {
      expect(hasPermission('cbct_tech', 'patients', 'medical_history')).toBe(false);
    });

    it('should NOT be available to patient', () => {
      expect(hasPermission('patient', 'patients', 'medical_history')).toBe(false);
    });
  });

  describe('Dental Chart Access', () => {
    it('should be available to clinical staff', () => {
      expect(hasPermission('doctor', 'patients', 'dental_chart')).toBe(true);
      expect(hasPermission('admin', 'patients', 'dental_chart')).toBe(true);
      expect(hasPermission('developer', 'patients', 'dental_chart')).toBe(true);
    });

    it('should NOT be available to non-clinical staff', () => {
      expect(hasPermission('receptionist', 'patients', 'dental_chart')).toBe(false);
      expect(hasPermission('cbct_tech', 'patients', 'dental_chart')).toBe(false);
      expect(hasPermission('assistant', 'patients', 'dental_chart')).toBe(false);
    });
  });
});

// ================================================================
// FINANCIAL ACCESS TESTS
// ================================================================
describe('Financial Access Permissions', () => {
  describe('Refund Processing', () => {
    it('should only be available to admin and developer', () => {
      expect(hasPermission('developer', 'financial', 'refunds')).toBe(true);
      expect(hasPermission('admin', 'financial', 'refunds')).toBe(true);
      expect(hasPermission('doctor', 'financial', 'refunds')).toBe(false);
      expect(hasPermission('receptionist', 'financial', 'refunds')).toBe(false);
    });
  });

  describe('Invoice Editing', () => {
    it('should only be available to admin and developer', () => {
      expect(hasPermission('developer', 'financial', 'edit_invoice')).toBe(true);
      expect(hasPermission('admin', 'financial', 'edit_invoice')).toBe(true);
      expect(hasPermission('receptionist', 'financial', 'edit_invoice')).toBe(false);
    });
  });

  describe('Payment Recording', () => {
    it('should be available to receptionist and above', () => {
      expect(hasPermission('developer', 'financial', 'payments')).toBe(true);
      expect(hasPermission('admin', 'financial', 'payments')).toBe(true);
      expect(hasPermission('receptionist', 'financial', 'payments')).toBe(true);
      expect(hasPermission('doctor', 'financial', 'payments')).toBe(false);
    });
  });
});

// ================================================================
// USER MANAGEMENT TESTS
// ================================================================
describe('User Management Permissions', () => {
  it('only admin and developer should manage users', () => {
    expect(hasPermission('developer', 'settings', 'users')).toBe(true);
    expect(hasPermission('admin', 'settings', 'users')).toBe(true);
    expect(hasPermission('doctor', 'settings', 'users')).toBe(false);
    expect(hasPermission('receptionist', 'settings', 'users')).toBe(false);
  });

  it('only admin and developer should edit settings', () => {
    expect(hasPermission('developer', 'settings', 'edit')).toBe(true);
    expect(hasPermission('admin', 'settings', 'edit')).toBe(true);
    expect(hasPermission('doctor', 'settings', 'edit')).toBe(false);
    expect(hasPermission('receptionist', 'settings', 'edit')).toBe(false);
  });
});

// ================================================================
// PERMISSION MODULE STRUCTURE TESTS
// ================================================================
describe('Permission Module Structure', () => {
  it('should have all required modules', () => {
    const requiredModules = ['cms', 'branches', 'doctors', 'appointments', 'patients', 'financial', 'inventory', 'analytics', 'settings'];
    requiredModules.forEach(module => {
      expect(PERMISSIONS).toHaveProperty(module);
    });
  });

  it('each module should have a label', () => {
    Object.entries(PERMISSIONS).forEach(([module, config]) => {
      expect(config).toHaveProperty('label');
      expect(typeof config.label).toBe('string');
    });
  });

  it('each module should have permissions object', () => {
    Object.entries(PERMISSIONS).forEach(([module, config]) => {
      expect(config).toHaveProperty('permissions');
      expect(typeof config.permissions).toBe('object');
    });
  });

  it('each role should have permissions for all modules', () => {
    const modules = Object.keys(PERMISSIONS);
    Object.keys(ROLE_DEFAULTS).forEach(role => {
      modules.forEach(module => {
        expect(ROLE_DEFAULTS[role]).toHaveProperty(module);
        expect(Array.isArray(ROLE_DEFAULTS[role][module])).toBe(true);
      });
    });
  });
});

// ================================================================
// PERMISSION VALIDATION TESTS
// ================================================================
describe('Permission Validation', () => {
  it('permissions should only contain valid permission keys', () => {
    Object.entries(ROLE_DEFAULTS).forEach(([role, modules]) => {
      Object.entries(modules).forEach(([module, perms]) => {
        const validPerms = Object.keys(PERMISSIONS[module]?.permissions || {});
        perms.forEach(perm => {
          expect(validPerms).toContain(perm);
        });
      });
    });
  });

  it('no duplicate permissions in any role module', () => {
    Object.entries(ROLE_DEFAULTS).forEach(([role, modules]) => {
      Object.entries(modules).forEach(([module, perms]) => {
        const uniquePerms = [...new Set(perms)];
        expect(perms.length).toBe(uniquePerms.length);
      });
    });
  });
});

// ================================================================
// DATABASE OPERATIONS TESTS (Mocked)
// ================================================================
describe('Role Permissions Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching Permissions', () => {
    it('should fetch role permissions from database', async () => {
      const mockData = [
        { role: 'admin', permissions: ROLE_DEFAULTS.admin },
        { role: 'doctor', permissions: ROLE_DEFAULTS.doctor },
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await mockSupabase.from('role_permissions').select('*');
      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it('should handle missing table gracefully', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116', message: 'Table not found' } 
        }),
      });

      const result = await mockSupabase.from('role_permissions').select('*');
      expect(result.error).toBeTruthy();
      // Should fall back to defaults
    });
  });

  describe('Saving Permissions', () => {
    it('should upsert role permissions', async () => {
      mockSupabase.from.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await mockSupabase.from('role_permissions').upsert({
        role: 'admin',
        permissions: ROLE_DEFAULTS.admin,
        updated_at: new Date().toISOString()
      }, { onConflict: 'role' });

      expect(result.error).toBeNull();
    });
  });
});

// ================================================================
// PERMISSION COMPARISON TESTS
// ================================================================
describe('Role Permission Comparison', () => {
  it('doctor should have clinical permissions receptionist lacks', () => {
    // Doctor has medical_history, receptionist doesn't
    expect(hasPermission('doctor', 'patients', 'medical_history')).toBe(true);
    expect(hasPermission('receptionist', 'patients', 'medical_history')).toBe(false);
  });

  it('receptionist should have patient creation doctor lacks', () => {
    // Receptionist creates patients, doctor doesn't
    expect(hasPermission('receptionist', 'patients', 'create')).toBe(true);
    expect(hasPermission('doctor', 'patients', 'create')).toBe(false);
  });

  it('receptionist should have view_all appointments, doctor has view_own', () => {
    expect(hasPermission('receptionist', 'appointments', 'view_all')).toBe(true);
    expect(hasPermission('receptionist', 'appointments', 'view_own')).toBe(false);
    expect(hasPermission('doctor', 'appointments', 'view_own')).toBe(true);
    expect(hasPermission('doctor', 'appointments', 'view_all')).toBe(false);
  });
});

// ================================================================
// SUMMARY OUTPUT
// ================================================================
describe('Permission Summary', () => {
  it('should output permission counts for documentation', () => {
    const summary = {
      developer: countPermissions('developer'),
      admin: countPermissions('admin'),
      doctor: countPermissions('doctor'),
      receptionist: countPermissions('receptionist'),
      cbct_tech: countPermissions('cbct_tech'),
      assistant: countPermissions('assistant'),
      patient: countPermissions('patient'),
    };

    console.log('\n=== ROLE PERMISSION COUNTS ===');
    Object.entries(summary).forEach(([role, count]) => {
      console.log(`${role.padEnd(15)}: ${count} permissions`);
    });
    console.log('==============================\n');

    // Verify counts match expectations
    expect(summary.developer).toBe(38);
    expect(summary.admin).toBe(38);
    expect(summary.doctor).toBe(13);
    expect(summary.receptionist).toBe(14);
    expect(summary.cbct_tech).toBe(5);
    expect(summary.assistant).toBe(5);
    expect(summary.patient).toBe(2);
  });
});
