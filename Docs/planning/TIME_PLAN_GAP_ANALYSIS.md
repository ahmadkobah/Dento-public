# Dento – Time Plan Gap Analysis

**Generated:** February 15, 2026  
**Based on:** Full codebase scan vs. `TIME_PLAN_WORK.md`  
**Scope:** Missing items, undocumented work, untracked features, and known bugs

---

## Executive Summary

The `TIME_PLAN_WORK.md` is comprehensive for the completed phases (1–5.8) and has detailed sub-task checklists for Phases 6, 7, and 8. However, the analysis reveals **8 categories of gaps** — ranging from critical known bugs that are documented but not tracked in the plan, to entire operational areas (CI/CD, documentation, compliance) that have no phase or checklist assigned.

| Category | Gap Count | Severity |
|----------|-----------|----------|
| 🔴 Known Critical Bugs (not in any phase) | 8 | Critical |
| 🟠 Codebase Work Not Tracked in Plan | 12 | High |
| 🟡 Missing Operational Phases | 9 | High |
| 🔵 Planning Doc Tasks Not In Time Plan | 6 | Medium |
| 🟣 Code Quality Debt | 7 | Medium |
| ⚪ Infrastructure & DevOps Gaps | 8 | High |
| 🟤 Data & Content Gaps | 7 | Medium |
| 🟢 Security Checklist Unchecked Items | 8 | High |

---

## 1. 🔴 Known Critical Bugs NOT Assigned to Any Phase

These are documented in `WEB_BUILDER_ANALYSIS.md` and the bottom of `TIME_PLAN_WORK.md` under "Known Remaining Issues" but have **no phase, assignee, or timeline** — they are just listed:

| # | Bug | Source | Impact |
|---|-----|--------|--------|
| 1 | `useTemplates.js` queries non-existent `is_global`/`tenant_id` columns → Template Library broken | WEB_BUILDER_ANALYSIS §4.1 | Template system non-functional |
| 2 | `template-api` edge function same schema mismatch | WEB_BUILDER_ANALYSIS §4.2 | API returns no templates |
| 3 | `useTheme.js` import path `../../lib` → should be `../lib` | WEB_BUILDER_ANALYSIS §4.3 | Theme hook may fail in production |
| 4 | `ContentEditor.jsx` built (233 lines) but NOT ROUTED in AdminApp | WEB_BUILDER_ANALYSIS §4.4 | Admin cannot edit page content |
| 5 | Two competing theme systems (OLD `website_settings` vs NEW `website_themes`) | WEB_BUILDER_ANALYSIS §4.5 | Dev/Admin theme changes don't sync |
| 6 | Frontend template files (`src/templates/`) disconnected from DB | WEB_BUILDER_ANALYSIS §4.6 | Two independent template catalogs |
| 7 | Template Editor has `TODO: Save to API` / `TODO: Fetch from API` | WEB_BUILDER_ANALYSIS §5 | Template editing non-functional |
| 8 | Bundle browsing UI & "Apply Bundle" action not built | WEB_BUILDER_ANALYSIS §5 | 39 templates in DB but no way to apply bundles |

**Recommendation:** Create a **Phase 5.9: Web Builder Bug Fixes** to address these before proceeding.

---

## 2. 🟠 Codebase Modules/Work NOT Tracked in Time Plan

These exist in the codebase but have no mention or checklist in `TIME_PLAN_WORK.md`:

| # | Module/Feature | Location | Status |
|---|----------------|----------|--------|
| 1 | **Platform App** (universal login, clinic registration) | `src/platform/PlatformApp.jsx`, `UniversalLogin.jsx`, `ClinicRegistration.jsx` | Built, no phase assigned |
| 2 | **Tenant Router / Domain Resolver** (subdomain-based routing) | `src/routing/TenantRouter.jsx`, `DomainResolver.jsx`, `useSubdomain.js` | Built, no phase assigned |
| 3 | **Module Gate** (route-level module access control) | `src/routing/ModuleGate.jsx` | Built, no phase assigned |
| 4 | **Language Router** (locale-based routing) | `src/routing/LanguageRouter.jsx` | Built, not documented |
| 5 | **Public App** (standalone public website app) | `src/public/PublicApp.jsx` with layouts and pages | Built, not documented as separate app |
| 6 | **Workflow Engine** (developer portal) | `src/developer/pages/workflows/WorkflowList.jsx` | UI exists, no backend |
| 7 | **Custom Fields** (developer portal) | `src/developer/pages/custom-fields/CustomFieldsList.jsx`, migration `057_dynamic_catalogs.sql` | Partially built |
| 8 | **Revenue Dashboard** | `src/developer/pages/subscriptions/RevenueDashboard.jsx` | Built, not in plan |
| 9 | **Google Calendar Integration** | `google-apps-script-calendar.js` (123 lines) + `BookingCalendar.jsx` | Script exists, no integration phase |
| 10 | **Sentry Error Tracking** | `@sentry/react` in deps, initialized in `main.jsx` | Integrated but DSN commented out |
| 11 | **RegionalContext** (currency, locale) | `src/contexts/RegionalContext.jsx` | Built, not tracked |
| 12 | **Translation List** (admin) | `src/admin/pages/translations/TranslationList.jsx` | Static mock data, not DB-connected |

---

## 3. 🟡 Missing Operational Phases (No Phase in Time Plan)

These are standard requirements for a production SaaS dental clinic system that have **no phase, checklist, or timeline**:

### 3.1 CI/CD Pipeline Completion
- **Current state:** `.github/workflows/ci.yml` exists with lint → build → security audit → deploy steps
- **Missing:**
  - [ ] Preview deployment step is a placeholder (`echo "Preview deployment configured"`)
  - [ ] Production deployment step is a placeholder (`echo "Production deployment configured"`)
  - [ ] No Vercel/hosting provider integration configured in CI
  - [ ] No test step in CI pipeline (tests exist but aren't run in CI)
  - [ ] No database migration step in CI/CD
  - [ ] No edge function deployment automation
  - [ ] No notification integration (Slack/Discord commented out)

### 3.2 Production Deployment Documentation
- **Current state:** `README.md` is default Vite template (14 lines about "React + Vite")
- **Missing:**
  - [ ] Project-specific README with architecture overview
  - [ ] Environment setup guide (`.env.example` does not exist)
  - [ ] Supabase project setup instructions
  - [ ] Edge function deployment instructions
  - [ ] Database migration execution guide
  - [ ] Vercel deployment configuration guide
  - [ ] Domain/DNS setup for multi-tenant

### 3.3 i18n/Localization Completion
- **Current state:** 
  - `LanguageContext.jsx` has bilingual EN/AR translations (600+ lines of static strings)
  - `useTranslations` hook exists for DB-driven translations
  - `TranslationList.jsx` uses hardcoded mock data (not DB-connected)
  - 616 RTL-related references in codebase (good RTL support)
  - Templates have bilingual content (`name_en`/`name_ar` pattern throughout)
- **Missing:**
  - [ ] No i18n library (react-intl, i18next) — rolling custom solution
  - [ ] `TranslationList.jsx` admin page uses static data, not connected to DB
  - [ ] No translation management workflow (add/edit translations)
  - [ ] No language-specific date/number formatting (beyond what date-fns provides)
  - [ ] Many admin pages have hardcoded English strings (not from LanguageContext)
  - [ ] No translation coverage report

### 3.4 Accessibility (a11y) Audit
- **Current state:**
  - Basic ARIA attributes in `sanitize.js`
  - One `accessibility.test.jsx` file exists (Phase 2 only)
  - Alt text field in image picker
- **Missing:**
  - [ ] No comprehensive a11y audit across all pages
  - [ ] No keyboard navigation testing
  - [ ] No WCAG 2.1 AA compliance verification
  - [ ] No screen reader testing
  - [ ] No color contrast verification
  - [ ] No focus management in modals/drawers
  - [ ] No skip navigation links
  - [ ] No ARIA landmarks on most pages

### 3.5 Performance Optimization
- **Current state:**
  - Lazy loading configured for major routes
  - Bundle sizes: index 842KB, PageBuilder 1064KB, AdminApp 1431KB (all gzipped ~250-300KB each)
  - 13 DB indexes for performance
- **Missing:**
  - [ ] No load testing (no k6, Artillery, or similar)
  - [ ] No performance budgets configured
  - [ ] AdminApp bundle is 1.4MB (should be further code-split)
  - [ ] No Lighthouse CI scores tracked
  - [ ] No image optimization pipeline (lazy loading, WebP)
  - [ ] No CDN caching strategy documented
  - [ ] No database query performance analysis
  - [ ] No API response time monitoring

### 3.6 GDPR/Data Privacy Compliance
- **Current state:**
  - Privacy Policy page exists (static content)
  - GDPR mentioned in webhook catalog use case
  - Audit logging on 15 tables
- **Missing:**
  - [ ] No data subject access request (DSAR) workflow
  - [ ] No "right to deletion" / data erasure endpoint
  - [ ] No data export for patients (download my data)
  - [ ] No consent management system (beyond treatment consent)
  - [ ] No data retention policy enforcement
  - [ ] No cookie consent banner
  - [ ] No Data Processing Agreement (DPA) for tenants
  - [ ] No privacy impact assessment

### 3.7 Backup & Disaster Recovery
- **Current state:**
  - `backup-management` edge function exists
  - `070_backup_system.sql` migration for backup tables
  - Security checklist: backup items are all `[ ]` unchecked
- **Missing:**
  - [ ] Daily backups not configured
  - [ ] Backup encryption not implemented
  - [ ] Backup restore never tested
  - [ ] Recovery procedures not documented
  - [ ] No RTO/RPO targets defined
  - [ ] No disaster recovery runbook

### 3.8 Email/SMS Notification Delivery
- **Current state:**
  - `send-notification` edge function exists
  - `notification_templates` table has 7 templates
  - `NotificationSettings.jsx` admin page exists
  - Notification triggers on appointments/payments
- **Missing:**
  - [ ] No actual email provider configured (SendGrid, SES, Resend)
  - [ ] No SMS provider configured (Twilio, MessageBird)
  - [ ] No WhatsApp Business API integration (UI references it)
  - [ ] Notifications are queued but delivery mechanism is a stub
  - [ ] No email template HTML rendering
  - [ ] No delivery tracking/bounce handling
  - [ ] No notification preference center for patients

### 3.9 Data Export/Import
- **Current state:**
  - `MaterialUsageReport.jsx` has CSV export
  - `FormSubmissions.jsx` has CSV export button
  - Tests reference data export/import
- **Missing:**
  - [ ] No patient data bulk import (CSV/Excel)
  - [ ] No patient data export (all records)
  - [ ] No appointment data export
  - [ ] No financial data export (beyond material usage)
  - [ ] No database dump/restore for tenants
  - [ ] No data migration tools between tenants

---

## 4. 🔵 Planning Docs with Tasks NOT in Time Plan

These docs contain detailed task lists that are not reflected in `TIME_PLAN_WORK.md`:

### 4.1 `INTEGRATION_IMPROVEMENT_PLAN.md` (449 lines)
Status: **0% complete** — all checkboxes unchecked
- [ ] Phase 1: Unified TenantContext (merge 3 duplicates)
- [ ] Phase 1: Single ErrorBoundary (merge 3 duplicates)
- [ ] Phase 1: Merge DevAuthProvider with AuthContext
- [ ] Phase 1: Unify localStorage keys
- [ ] Phase 2: Shared component library (Loading, Card, Modal, Form)
- [ ] Phase 3: Centralized API client
- [ ] Phase 4: JSDoc type safety

### 4.2 `DENTAL_CHART_IMPLEMENTATION_PLAN.md` (472 lines)
Status: **Partially implemented** — react-odontogram is in `package.json`, some tasks done
- [ ] Task 1: Admin Header search bar center + clinic name left
- [ ] Task 2: Dental Chart better design (react-odontogram wrapper)
- [ ] Task 3: Dental Chart history save/clear & history view
- [ ] Task 4–6: Further dental chart enhancements

### 4.3 `MODULES_SYSTEM_ANALYSIS.md` (547 lines)
Status: **~88% functional** — critical fixes done but remaining gaps:
- [ ] Module icon mapping system
- [ ] Module dependency resolution UI
- [ ] Module uninstall with cleanup

### 4.4 `TENANT_BILLING_ANALYSIS.md` (955 lines)
Status: **~98% functional** — but remaining gaps:
- [ ] Stripe webhook secret rotation
- [ ] Invoice PDF email delivery
- [ ] Self-service subscription change UI for tenants

### 4.5 `COMPREHENSIVE_CODEBASE_ANALYSIS.md` (522 lines)
Status: Documents that **55% of Developer Portal pages use mock data**
- [ ] 21 developer portal pages still using mock/static data
- [ ] `services` table has 0 rows (core feature)
- [ ] `treatments` table has 0 rows (core feature)
- [ ] 26 tables with 0 rows total

### 4.6 `CODEBASE_SCAN_REPORT.md` / `CODE_REVIEW_FIXES.md`
- Previously tracked but may contain unfixed items from later scans

---

## 5. 🟣 Code Quality Debt (Not Tracked)

| # | Item | Count | Notes |
|---|------|-------|-------|
| 1 | `alert()` calls that should be Toast | **94** | COMPREHENSIVE_CODEBASE_ANALYSIS says 84, actual count is 94 |
| 2 | `console.log` in production code | **43** | Should be removed or replaced with proper logging |
| 3 | `TODO`/`FIXME`/`HACK` comments | **14** | Unresolved technical debt markers |
| 4 | ESLint `exhaustive-deps` warnings | **61** | React hooks dependency warnings |
| 5 | ESLint `react-refresh` warnings | **41** | DX-only, non-blocking |
| 6 | ESLint test file errors | **4** | Skipped, non-blocking |
| 7 | `.env` file committed with real secrets | **1** | Service role key is in `.env` (should be `.env.local` + `.gitignore`) |

---

## 6. ⚪ Infrastructure & DevOps Gaps

| # | Item | Status |
|---|------|--------|
| 1 | `.env.example` file | ❌ Does not exist — developers have no template for env vars |
| 2 | `README.md` | ❌ Default Vite boilerplate — no project documentation |
| 3 | Docker/Container setup | ❌ No Dockerfile or docker-compose |
| 4 | Staging environment | ❌ No staging config or docs |
| 5 | Database migration runner | ⚠️ `run-migration.mjs` exists but pipeline doesn't use it |
| 6 | Edge function CI deployment | ❌ No automation — manual `supabase functions deploy` |
| 7 | Monitoring/Alerting | ⚠️ Sentry imported but DSN commented out; no uptime monitoring |
| 8 | Log aggregation | ⚠️ `SystemLogs.jsx` UI exists but no real log source configured |

---

## 7. 🟤 Data & Content Gaps

Tables that exist in schema but have **0 rows**, impacting functionality:

| # | Table | Impact | Related Feature |
|---|-------|--------|-----------------|
| 1 | `services` | 🔴 Services page shows empty | Core — needs seed data |
| 2 | `treatments` | 🔴 Treatment catalog empty | Core — treatment plans reference this |
| 3 | `medications` | ⚠️ Prescription medication list empty | Prescriptions need medications |
| 4 | `insurance_companies` | ⚠️ Insurance module non-functional | Insurance claims need companies |
| 5 | `testimonials` | ⚠️ Public site testimonials empty | Public website testimonials page |
| 6 | `portfolio_cases` | ⚠️ Portfolio showcase empty | Public website portfolio page |
| 7 | `domains` / `deployments` | ⚠️ Multi-tenant deployment tracking empty | Domain management |

---

## 8. 🟢 Security Checklist Unchecked Items (from TIME_PLAN_WORK.md)

These are in the time plan's own security checklist but remain unchecked:

| # | Item | Category |
|---|------|----------|
| 1 | MFA enabled for admin/doctor | Authentication |
| 2 | Biometric auth (mobile) | Authentication |
| 3 | Sensitive field encryption | Data Security |
| 4 | Data masking | Data Security |
| 5 | CSRF protection | API Security |
| 6 | Log retention (365 days) | Audit & Compliance |
| 7 | Daily backups | Backup |
| 8 | Backup encryption + testing + documentation | Backup |

---

## 9. Phases 6/7/8 Detail Assessment

### Phase 6: Mobile App (Lines 2688–4456 in TIME_PLAN_WORK.md)
- **Detail Level:** ★★★★★ Excellent (1768 lines)
- **Sub-task checklists:** ✅ Yes — 8 categories with 40+ checkboxes
- **Tech stack:** Defined (React Native, Expo, TypeScript, Zustand)
- **Screen mockups:** ASCII art for all major screens
- **DB queries:** Listed (tables, edge functions needed)
- **Testing plan:** Unit, component, E2E (Detox)
- **Timeline:** 2-3 months (10 sprints of 2 weeks each)
- **Also documented in:** `MOBILE_APP_PLAN.md` (2844 lines, even more detailed)
- **Status:** 0% — Ready to start
- **Gap:** No dependency on fixing known critical bugs first

### Phase 7: Advanced Features (Lines 4457–4563)
- **Detail Level:** ★★★☆☆ Moderate (106 lines)
- **Sub-task checklists:** ✅ Yes — 4 features with checkboxes
- **Features:** License tracker, advanced analytics, workflow automation
- **Gap:** Less detailed than Phase 6, no screen mockups, no tech decisions
- **Gap:** Workflow automation overlaps with existing `WorkflowList.jsx` (not mentioned)
- **Gap:** No user story / acceptance criteria
- **Timeline:** 2 months (stated, no sprint breakdown)

### Phase 8: Patient Portal (Lines 4565–4684)
- **Detail Level:** ★★★☆☆ Moderate (119 lines)
- **Sub-task checklists:** ✅ Yes — 8 sections with checkboxes
- **Features:** Registration, dashboard, appointments, medical records, payments, messaging, profile, family
- **Gap:** No tech stack decision (web app? mobile? PWA?)
- **Gap:** No screen mockups
- **Gap:** Online payment integration details missing
- **Gap:** No HIPAA/data access scope definition
- **Timeline:** 2-3 months (stated, no sprint breakdown)

---

## 10. Recommended New Phases / Additions to Time Plan

### Phase 5.9: Web Builder Bug Fixes (Recommended: 2-3 days)
- [ ] Fix `useTemplates.js` schema mismatch
- [ ] Fix `template-api` edge function schema mismatch
- [ ] Fix `useTheme.js` import path
- [ ] Route `ContentEditor.jsx` in AdminApp
- [ ] Unify theme systems (OLD → NEW)
- [ ] Connect frontend templates to DB
- [ ] Wire Template Editor save/load API
- [ ] Build bundle browsing UI + apply action

### Phase 5.10: Integration & Code Quality (Recommended: 3-5 days)
- [ ] Execute INTEGRATION_IMPROVEMENT_PLAN.md tasks
- [ ] Replace 94 `alert()` calls with Toast
- [ ] Remove 43 `console.log` statements
- [ ] Resolve 14 TODO/FIXME comments
- [ ] Connect `TranslationList.jsx` to database
- [ ] Connect developer portal pages to real data (21 pages on mock)

### Phase 5.11: DevOps & Documentation (Recommended: 2-3 days)
- [ ] Create `.env.example` with documented variables
- [ ] Write proper `README.md` (architecture, setup, deployment)
- [ ] Complete CI/CD pipeline (Vercel deploy steps, test step, migration step)
- [ ] Configure Sentry DSN for production
- [ ] Set up staging environment
- [ ] Document edge function deployment process
- [ ] Create developer onboarding guide

### Phase 5.12: Data Seeding & Content (Recommended: 1-2 days)
- [ ] Seed `services` table with dental services
- [ ] Seed `treatments` table with treatment catalog
- [ ] Seed `medications` table with common dental medications
- [ ] Seed `insurance_companies` with sample companies
- [ ] Seed `testimonials` and `portfolio_cases` for demo
- [ ] Create seed script for new tenant onboarding

### Phase 5.13: Compliance & Security Hardening (Recommended: 3-5 days)
- [ ] Implement DSAR (data subject access request) workflow
- [ ] Add data export endpoint for patients
- [ ] Add data deletion endpoint (right to erasure)
- [ ] Configure actual email provider (SendGrid/Resend)
- [ ] Add cookie consent banner
- [ ] Implement MFA for admin/doctor roles
- [ ] Add CSRF protection
- [ ] Remove secrets from `.env` (use `.env.local`)
- [ ] Configure backup schedule
- [ ] Document disaster recovery plan

### Phase 5.14: a11y & Performance (Recommended: 2-3 days)
- [ ] Run Lighthouse audit on all public pages
- [ ] Add skip navigation links
- [ ] Verify keyboard navigation on all forms/modals
- [ ] Verify color contrast (WCAG AA)
- [ ] Add ARIA landmarks to admin pages
- [ ] Further code-split AdminApp bundle (1.4MB)
- [ ] Add performance budgets to CI
- [ ] Implement image lazy loading

---

## Summary Table

| What | Time Plan Status | Actual Status |
|------|-----------------|---------------|
| Phases 1–5.8 | ✅ Documented, complete | ✅ Complete (with 8 known bugs) |
| Phase 6: Mobile | ✅ Detailed (1768 lines) | ⬜ 0% - Not started |
| Phase 7: Advanced | ⚠️ Moderate detail (106 lines) | ⬜ 0% - Not started |
| Phase 8: Patient Portal | ⚠️ Moderate detail (119 lines) | ⬜ 0% - Not started |
| Known critical bugs | Listed but no phase | ❌ Not assigned to any timeline |
| Platform/Routing code | Not mentioned | ✅ Code exists, untested |
| Integration plan | Separate doc, not in plan | ✅ Planned but 0% executed |
| CI/CD pipeline | Not mentioned | ⚠️ Skeleton exists, not functional |
| README/docs | "Final Checklist" says `[ ]` | ❌ Default Vite template |
| a11y audit | Not mentioned | ❌ Not started |
| GDPR compliance | Not mentioned | ❌ Not started |
| Email/SMS delivery | Implied in Phase 3 | ⚠️ Queue exists, no provider |
| Performance testing | Not mentioned | ❌ Not started |
| Data seeding | Partially done | ⚠️ 7 core tables still empty |
| E2E testing (web) | Not mentioned (only mobile Phase 6) | ❌ No Playwright/Cypress |
| Security unchecked items | Listed in plan as `[ ]` | ❌ 8 items still unchecked |
