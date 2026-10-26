import { describe, it, expect, vi } from 'vitest'
import { getUserRole, hasRole, ROLES } from '../../lib/supabase'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            abortSignal: vi.fn(),
          })),
        })),
      })),
    })),
  })),
}))

describe('Security Functions', () => {
  describe('getUserRole', () => {
    it('should return patient role on error (not admin)', async () => {
      // This tests that we don't default to admin on errors
      const result = await getUserRole('non-existent-user-id')
      
      // The key security test: should NEVER return admin on error
      expect(result.role).not.toBe('admin')
      expect(result.role).toBe('patient')
      expect(result.is_active).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('should return true when user has allowed role', () => {
      expect(hasRole('admin', ['admin', 'developer'])).toBe(true)
      expect(hasRole('developer', ['admin', 'developer'])).toBe(true)
      expect(hasRole('doctor', ['doctor', 'receptionist'])).toBe(true)
    })

    it('should return false when user does not have allowed role', () => {
      expect(hasRole('patient', ['admin', 'developer'])).toBe(false)
      expect(hasRole('receptionist', ['admin', 'developer'])).toBe(false)
    })
  })

  describe('ROLES constant', () => {
    it('should contain all required roles', () => {
      expect(ROLES.DEVELOPER).toBe('developer')
      expect(ROLES.ADMIN).toBe('admin')
      expect(ROLES.DOCTOR).toBe('doctor')
      expect(ROLES.RECEPTIONIST).toBe('receptionist')
      expect(ROLES.CBCT_TECH).toBe('cbct_tech')
      expect(ROLES.ASSISTANT).toBe('assistant')
      expect(ROLES.PATIENT).toBe('patient')
    })
  })
})

describe('Role Hierarchy', () => {
  const adminRoles = ['admin', 'developer']
  const staffRoles = ['admin', 'developer', 'doctor', 'receptionist', 'cbct_tech', 'assistant']
  
  it('admin should have admin privileges', () => {
    expect(hasRole('admin', adminRoles)).toBe(true)
  })

  it('developer should have admin privileges', () => {
    expect(hasRole('developer', adminRoles)).toBe(true)
  })

  it('doctor should have staff privileges but not admin', () => {
    expect(hasRole('doctor', staffRoles)).toBe(true)
    expect(hasRole('doctor', adminRoles)).toBe(false)
  })

  it('patient should not have staff or admin privileges', () => {
    expect(hasRole('patient', staffRoles)).toBe(false)
    expect(hasRole('patient', adminRoles)).toBe(false)
  })
})
