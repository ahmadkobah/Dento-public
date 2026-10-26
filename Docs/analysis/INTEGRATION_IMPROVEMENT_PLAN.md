# Integration Improvement Plan

> Developer Portal ↔ Admin Panel ↔ Public Website Consolidation

**Created:** February 8, 2026  
**Current Integration Score:** 6/10  
**Target Integration Score:** 9/10

---

## Executive Summary

This plan consolidates duplicated code across the three main application areas (Developer Portal, Admin Panel, Public Website) while maintaining their distinct purposes. The goal is to reduce maintenance burden, improve consistency, and prevent bugs from divergent implementations.

---

## Risk Mitigation Strategy

### Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing functionality | Medium | High | Run full test suite after each task |
| Context import chaos | High | Medium | Staged migration with re-exports |
| Missing edge cases | Medium | Medium | Test all three portals after each change |
| Regression in auth | Low | Critical | Dedicated auth testing checklist |

### Pre-Implementation Safety Checklist

```powershell
# Create safety branch FIRST
git checkout -b feature/unified-contexts

# Verify baseline
npm run build
npm test
```

### Verification Script (Run After Each Task)

```powershell
# Save as scripts/verify.ps1
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

npm test
if ($LASTEXITCODE -ne 0) { Write-Error "Tests failed"; exit 1 }

Write-Host "✓ Build and tests passed" -ForegroundColor Green
```

### Context Migration Strategy (Prevents Import Chaos)

**Step 1:** Create new unified context with backward-compatible exports
```javascript
// src/contexts/UnifiedTenantContext.jsx
export { UnifiedTenantProvider, useTenant, useTenantContext }
```

**Step 2:** Update old files to re-export (temporary compatibility layer)
```javascript
// src/developer/contexts/TenantContext.jsx
export * from '../../contexts/UnifiedTenantContext';
```

**Step 3:** Find and update all imports
```powershell
# Before deleting old files, find ALL usages
grep -r "developer/contexts/TenantContext" src/
grep -r "admin/contexts/TenantContext" src/
```

**Step 4:** Delete old files only after all imports updated

### Auth Regression Testing Checklist

After any auth-related changes, manually verify:

| Portal | Test | Status |
|--------|------|--------|
| Developer (localhost:9000) | Login works | ☐ |
| Developer | Logout clears session | ☐ |
| Developer | Protected routes redirect when logged out | ☐ |
| Developer | Session persists on refresh | ☐ |
| Admin (localhost:5173) | Login works | ☐ |
| Admin | Role-based access works | ☐ |
| Admin | Logout clears session | ☐ |
| Both | Switching between portals doesn't break session | ☐ |

---

## Phase 1: Foundation (Priority: Critical)

**Timeline:** 1-2 days  
**Risk Level:** Medium

### Task 1.1: Unified TenantContext

**Current State:**
- `src/contexts/TenantContext.jsx` (main)
- `src/developer/contexts/TenantContext.jsx` (duplicate)
- `src/admin/contexts/TenantContext.jsx` (duplicate)

**Target State:**
- Single `src/contexts/UnifiedTenantContext.jsx` with mode parameter

**Implementation:**

```javascript
// src/contexts/UnifiedTenantContext.jsx
export function UnifiedTenantProvider({ children, mode = 'public' }) {
  // mode: 'developer' | 'admin' | 'public'
  
  // Developer: Can select any tenant from dropdown
  // Admin: Gets assigned tenant from user profile
  // Public: Resolves tenant from domain/subdomain
}
```

**Steps:**
1. [ ] Create `UnifiedTenantContext.jsx` with mode logic
2. [ ] Add temporary re-exports in old locations
3. [ ] Update `DeveloperApp.jsx` to use new context with `mode="developer"`
4. [ ] Update `AdminApp.jsx` to use new context with `mode="admin"`
5. [ ] Update `App.jsx` (public) to use new context with `mode="public"`
6. [ ] Run verification script
7. [ ] Find and update all remaining imports
8. [ ] Delete old duplicate files
9. [ ] Run verification script again

**Verification:**
```powershell
npm run build; npm test
# Manual: Test tenant selection in Developer Portal
# Manual: Test tenant assignment in Admin Panel
```

---

### Task 1.2: Single ErrorBoundary

**Current State:**
- `src/components/ErrorBoundary.jsx`
- `src/developer/components/ErrorBoundary.jsx` (duplicate)
- `src/admin/components/ErrorBoundary.jsx` (duplicate)

**Target State:**
- Single `src/components/ErrorBoundary.jsx` with portal-aware styling

**Implementation:**

```javascript
// src/components/ErrorBoundary.jsx
export function ErrorBoundary({ children, variant = 'default' }) {
  // variant: 'default' | 'developer' | 'admin'
  // Each variant has appropriate styling (dark theme for developer, etc.)
}
```

**Steps:**
1. [ ] Enhance main ErrorBoundary with variant prop
2. [ ] Update DeveloperLayout to use shared component with `variant="developer"`
3. [ ] Update AdminLayout to use shared component with `variant="admin"`
4. [ ] Run verification script
5. [ ] Delete duplicate ErrorBoundary files
6. [ ] Run verification script again

---

### Task 1.3: Merge DevAuthProvider

**Current State:**
- `src/contexts/AuthContext.jsx` (main)
- `src/developer/contexts/DevAuthProvider.jsx` (separate)

**Target State:**
- Single `AuthContext` with role-based capabilities

**Steps:**
1. [ ] Analyze differences between AuthContext and DevAuthProvider
2. [ ] Add developer-specific fields to main AuthContext
3. [ ] Update DeveloperApp to use enhanced AuthContext
4. [ ] Run verification script
5. [ ] Test login/logout in both portals
6. [ ] Delete DevAuthProvider
7. [ ] Run verification script again

---

### Task 1.4: Unify localStorage Keys

**Current State:**
- Inconsistent keys: `selectedTenant`, `dev_selected_tenant`, `admin_tenant`

**Target State:**
- Namespaced keys with clear purpose

**Implementation:**

```javascript
// src/utils/storageKeys.js
export const STORAGE_KEYS = {
  DEVELOPER_TENANT: 'dento:developer:tenantId',
  ADMIN_TENANT: 'dento:admin:tenantId',
  AUTH_TOKEN: 'dento:auth:token',
  USER_PREFERENCES: 'dento:user:preferences'
};
```

**Steps:**
1. [ ] Create `storageKeys.js` utility
2. [ ] Find all localStorage usage: `grep -r "localStorage" src/`
3. [ ] Update each usage to use constants
4. [ ] Add migration for existing keys (one-time conversion)
5. [ ] Run verification script

---

## Phase 2: Shared Component Library

**Timeline:** 2-3 days  
**Risk Level:** Low

### Task 2.1: Loading Components

**Target:** Single `src/components/ui/Loading.jsx` with variants

```javascript
<Loading variant="spinner" />      // Default spinner
<Loading variant="skeleton" />     // Skeleton loader
<Loading variant="overlay" />      // Full-page overlay
<Loading variant="inline" />       // Inline text loader
```

**Steps:**
1. [ ] Audit all loading components: `grep -r "Loading\|Spinner\|Skeleton" src/`
2. [ ] Create unified Loading component
3. [ ] Replace usages one file at a time
4. [ ] Run verification after each file
5. [ ] Delete old loading components

---

### Task 2.2: Card Components

**Target:** Single `src/components/ui/Card.jsx`

```javascript
<Card variant="default" />
<Card variant="elevated" />
<Card variant="outlined" />
<Card variant="dark" />  // For developer portal
```

---

### Task 2.3: Modal Components

**Target:** Single `src/components/ui/Modal.jsx`

---

### Task 2.4: Form Components

**Target:** Unified form components in `src/components/forms/`

- `Input.jsx`
- `Select.jsx`
- `Checkbox.jsx`
- `TextArea.jsx`
- `FormField.jsx` (wrapper with label, error, etc.)

---

## Phase 3: API Layer Unification

**Timeline:** 1-2 days  
**Risk Level:** Medium

### Task 3.1: Centralized API Client

**Target:** Single `src/lib/api.js` with tenant-aware requests

```javascript
// src/lib/api.js
class ApiClient {
  constructor() {
    this.supabase = supabase;
  }

  async query(table, options = {}) {
    const { tenantId, ...queryOptions } = options;
    let query = this.supabase.from(table);
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    
    // Apply other options...
    return query;
  }
}

export const api = new ApiClient();
```

---

### Task 3.2: Shared Data Hooks

**Target:** Hooks that work across all portals

```javascript
// Already shared (good):
// - useServices, useDoctors, useBranches, usePatients

// Need to verify tenant parameter works:
// - usePages, useTemplates, useNavigation, etc.
```

---

## Phase 4: Type Safety (Optional)

**Timeline:** 2-3 days  
**Risk Level:** Low

### Task 4.1: JSDoc Types for Contexts

```javascript
/**
 * @typedef {Object} TenantContextValue
 * @property {string|null} tenantId
 * @property {Tenant|null} tenant
 * @property {boolean} loading
 * @property {(id: string) => void} setTenantId
 */

/** @type {React.Context<TenantContextValue>} */
const TenantContext = createContext(null);
```

### Task 4.2: JSDoc Types for Hooks

```javascript
/**
 * @typedef {Object} UseServicesReturn
 * @property {Service[]} services
 * @property {boolean} loading
 * @property {Error|null} error
 * @property {() => Promise<void>} refetch
 */

/**
 * @param {string} [tenantId]
 * @returns {UseServicesReturn}
 */
export function useServices(tenantId) { ... }
```

---

## Implementation Schedule

| Day | Phase | Tasks | Verification |
|-----|-------|-------|--------------|
| 1 | Setup | Create branch, baseline tests | `npm test` passes |
| 1 | Phase 1 | Task 1.1 (UnifiedTenantContext) | All 3 portals work |
| 2 | Phase 1 | Tasks 1.2, 1.3, 1.4 | Auth works in both portals |
| 3 | Phase 2 | Tasks 2.1, 2.2 (Loading, Cards) | Visual check |
| 4 | Phase 2 | Tasks 2.3, 2.4 (Modals, Forms) | Forms work |
| 5 | Phase 3 | API unification | Data loads correctly |
| 6+ | Phase 4 | Type safety (if time permits) | IDE autocomplete works |

---

## Git Workflow

```powershell
# Start
git checkout -b feature/unified-contexts

# After each task
git add .
git commit -m "feat: [Task X.Y] Description"

# If something breaks
git stash  # or
git checkout -- .  # to revert

# When complete
git checkout main
git merge feature/unified-contexts
```

---

## Success Criteria

- [ ] All 1901 tests still pass
- [ ] Build completes without errors
- [ ] Developer Portal: Login, tenant selection, all pages work
- [ ] Admin Panel: Login, assigned tenant access works
- [ ] Public Website: Pages render correctly
- [ ] No duplicate context files remain
- [ ] No duplicate ErrorBoundary files remain
- [ ] localStorage keys are consistent
- [ ] Integration score improved to 8+/10

---

## Rollback Plan

If any phase causes critical issues:

```powershell
# Option 1: Revert last commit
git revert HEAD

# Option 2: Return to main
git checkout main

# Option 3: Stash current changes
git stash
git checkout main
```

---

## Files to Delete After Consolidation

```
src/developer/contexts/TenantContext.jsx  (after Task 1.1)
src/admin/contexts/TenantContext.jsx      (after Task 1.1)
src/developer/components/ErrorBoundary.jsx (after Task 1.2)
src/admin/components/ErrorBoundary.jsx    (after Task 1.2)
src/developer/contexts/DevAuthProvider.jsx (after Task 1.3)
```

---

## Notes

- Run `npm run build && npm test` after EVERY task
- Commit after EVERY successful task
- Test manually in browser after context/auth changes
- Keep old files as re-exports until all imports are updated
- When in doubt, don't delete - deprecate first
