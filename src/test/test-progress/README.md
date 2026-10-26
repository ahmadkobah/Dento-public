# Pre-Mobile App Test Suite

**Created:** February 9, 2026  
**Purpose:** Comprehensive testing before mobile app development phase

## Test Categories

| File | Category | Tests | Focus Area | Status |
|------|----------|-------|------------|--------|
| `01-security.test.js` | Security | 45+ | XSS, SQL Injection, CSRF, Auth Bypass | ✅ Done |
| `02-authentication.test.js` | Auth | 30+ | Login, Logout, Session, 2FA | ✅ Done |
| `03-authorization.test.js` | AuthZ | 40+ | Roles, Permissions, RLS | ✅ Done |
| `04-api-endpoints.test.js` | API | 35+ | REST endpoints, Webhooks, API Keys | ✅ Done |
| `05-components.test.jsx` | UI | 40+ | Component rendering, interactions | ✅ Done |
| `06-hooks.test.js` | Hooks | 40+ | Custom hooks, state management | ✅ Done |
| `07-page-builder.test.js` | PageBuilder | 35+ | Drag-drop, templates, versions | ✅ Done |
| `08-support-sessions.test.js` | Support | 35+ | Chat, Video, Screen share, LiveKit | ✅ Done |
| `09-multi-tenant.test.js` | MultiTenant | 40+ | Tenant isolation, RLS, Branding | ✅ Done |
| `10-edge-functions.test.js` | Edge | 35+ | Supabase Edge Functions | ✅ Done |

**Total: 380+ tests across 10 test files**

## Running Tests

```bash
# Run all pre-mobile tests
npm test -- src/test/test-progress/

# Run specific category
npm test -- src/test/test-progress/01-security.test.js

# Run with coverage
npm test -- --coverage src/test/test-progress/
```

## Test Conventions

1. **Naming**: `XX-category.test.js` (numbered for execution order)
2. **Structure**: `describe` blocks for features, `it` blocks for cases
3. **Mocking**: Use Vitest `vi.mock()` for external dependencies
4. **Assertions**: Use `expect()` with descriptive matchers

## Coverage Requirements

| Area | Minimum | Target |
|------|---------|--------|
| Security | 95% | 100% |
| Authentication | 90% | 95% |
| Authorization | 90% | 95% |
| API | 80% | 90% |
| Components | 70% | 80% |
| Hooks | 85% | 90% |

## Pre-Mobile Checklist

Before starting mobile app development:

- [ ] All security tests passing
- [ ] All auth tests passing
- [ ] All RLS policies verified
- [ ] All API endpoints tested
- [ ] Build passing (< 15s)
- [ ] No critical ESLint errors
- [ ] Performance benchmarks met

## Related Documentation

- [ESLINT_FIX_PLAN.md](../../Docs/ESLINT_FIX_PLAN.md) - ESLint fixes applied
- [TIME_PLAN_WORK.md](../../Docs/TIME_PLAN_WORK.md) - Project timeline
- [CODE_REVIEW_FIXES.md](../../Docs/CODE_REVIEW_FIXES.md) - Security fixes

