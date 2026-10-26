# Dento – Web Builder, Content & Template System Analysis

> **Generated**: Code Review + Architecture Audit  
> **Scope**: Dev Portal Web Builder, Admin Web Content, Template Selector, Theme System  
> **Status**: Multiple critical disconnections found – templates broken, theme system duplicated, content editor unrouted  
> **Last Updated**: Template Bundle system added (Migration 079 + 080) – 39 page templates in 8 complete website bundles (incl. Canine Classic)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [System Map & Connections](#2-system-map--connections)
3. [What Is Implemented](#3-what-is-implemented)
4. [Critical Bugs & Errors](#4-critical-bugs--errors)
5. [What Is Missing / Incomplete](#5-what-is-missing--incomplete)
6. [Database Inventory](#6-database-inventory)
7. [Edge Functions Status](#7-edge-functions-status)
8. [Website Template Bundles](#8-website-template-bundles)
9. [Recommended Fixes (Prioritized)](#9-recommended-fixes-prioritized)
10. [Custom Domain Workflow](#10-custom-domain-workflow)

---

## 1. Architecture Overview

The platform has **3 portals** that share web builder / content infrastructure:

```
┌──────────────────────────────────────────────────────────────┐
│  DEVELOPER PORTAL  (src/developer/)                          │
│  • Defines page STRUCTURE (layout, sections, order)          │
│  • Visual Page Builder (CraftJS)                             │
│  • Template Library (browse & apply templates)               │
│  • Template Editor (create/edit templates) – INCOMPLETE      │
│  • Theme Settings – uses OLD useWebsiteTheme hook            │
├──────────────────────────────────────────────────────────────┤
│  ADMIN PANEL  (src/admin/)                                   │
│  • Edits page CONTENT within developer-defined structure     │
│  • HomePageEditor (standalone, direct DB queries)            │
│  • ContentEditor (built but NOT ROUTED)                      │
│  • ThemeSelector (full builder) – uses NEW useTheme hook     │
│  • Services, Portfolio, Testimonials, Tourism, FAQs CRUD     │
├──────────────────────────────────────────────────────────────┤
│  PUBLIC WEBSITE  (src/public/)                               │
│  • Renders pages via ContentRenderer                         │
│  • Static legacy pages (Home, Services, etc.) WITH DB        │
│    fallback pattern (hard-coded defaults → DB overrides)     │
│  • Dynamic page builder renderer exists but disconnected     │
└──────────────────────────────────────────────────────────────┘
```

**Intended data flow:**
```
Developer defines structure → Admin edits content → Public renders merged result
         │                           │                        │
    page_templates            pages.content               pages.structure
    section_templates         pages.structure (read)       + pages.content
         │                                                    merged
    pages.structure ──────────────── ↕ ─────────────────── ContentRenderer
```

---

## 2. System Map & Connections

### 2.1 Template System (3 disconnected layers)

| Layer | Location | Templates | Connected? |
|-------|----------|-----------|------------|
| **Database** | `page_templates` table | 39 rows (8 bundles) | ❌ Queried with wrong columns |
| **Database** | `section_templates` table | 23 rows | ❌ Same issue via edge function |
| **Frontend JS** | `src/templates/pageTemplates.js` | 10 templates | ❌ Never synced to DB |
| **Frontend JS** | `src/templates/sectionTemplates.js` | 15 templates | ❌ Only used in TemplateEditor |
| **Edge Function** | `template-api` (v5, ACTIVE) | CRUD endpoint | ❌ References non-existent columns |

### 2.2 Theme System (2 competing systems)

| System | Hook | DB Table | Used By |
|--------|------|----------|---------|
| **OLD** | `useWebsiteTheme.js` → `useWebsiteSettings` | `website_settings` | Dev Portal `WebsiteThemeSettings.jsx` |
| **NEW** | `useTheme.js` | `website_themes` | Admin `ThemeSelector.jsx`, `ThemeProvider` in App.jsx |

**Problem:** Dev Portal and Admin Panel write theme data to DIFFERENT tables. Changes in one are invisible to the other.

### 2.3 Page/Content System

| Component | File | Hook | DB Table | Status |
|-----------|------|------|----------|--------|
| PageBuilder | `developer/pages/website/PageBuilderPage.jsx` | `useWebsitePages` → `usePages` | `pages` | ✅ Working |
| PageList | `developer/pages/website/PageList.jsx` | `useWebsitePages` | `pages` | ✅ Working |
| ContentEditor | `admin/pages/website/ContentEditor.jsx` | `useWebsiteContent` | `pages` | ❌ NOT ROUTED |
| HomePageEditor | `admin/pages/pages/HomePageEditor.jsx` | Direct `supabase` | `pages` | ⚠️ Standalone |
| ContentRenderer | `components/pageBuilder/renderer/ContentRenderer.jsx` | – | `pages` | ✅ Built |

---

## 3. What Is Implemented

### ✅ Fully Working

| Component | Location | Lines | Notes |
|-----------|----------|-------|-------|
| CraftJS Page Builder | `developer/pages/website/PageBuilderPage.jsx` | 244 | Save, publish, unpublish, preview |
| Page List (Dev Portal) | `developer/pages/website/PageList.jsx` | 305 | CRUD grid with status badges |
| Pages CRUD Hook | `hooks/pageBuilder/usePages.js` | 217 | Realtime subscriptions |
| Website Content Hook | `hooks/pageBuilder/useWebsiteContent.js` | 289 | Structure + content merge |
| Website Settings Hook | `hooks/pageBuilder/useWebsiteSettings.js` | 165 | CRUD for `website_settings` |
| ThemeSelector (Admin) | `admin/pages/website/ThemeSelector.jsx` | 836 | Full tabbed builder (6 tabs) |
| Theme Hook (NEW) | `hooks/useTheme.js` | 353 | CRUD for `website_themes` |
| Content Renderer | `components/pageBuilder/renderer/ContentRenderer.jsx` | 188 | Section-based rendering |
| 79 Page Builder Components | `components/pageBuilder/**` | ~7000+ | Toolbox, panels, resolver |
| 23 Page Builder Hooks | `hooks/pageBuilder/**` | ~3000+ | Full builder state management |
| Navigation Menus | `hooks/pageBuilder/useNavigationMenus.js` | – | CRUD + realtime |
| HomePageEditor (Admin) | `admin/pages/pages/HomePageEditor.jsx` | 851 | Section-based, standalone |
| 5 Seeded Themes | `website_themes` table | – | Teal, Royal Blue, Coral, Dark, Minimal |
| 39 Page Templates (DB) | `page_templates` table | – | 8 complete website bundles + 2 standalone |
| 23 Section Templates (DB) | `section_templates` table | – | All categories covered |
| 7 Default Pages (DB) | `pages` table | – | Seeded for one tenant |
| 31 Edge Functions | Supabase | – | All ACTIVE |

### ⚠️ Partially Working

| Component | Location | Issue |
|-----------|----------|-------|
| Dev Portal Theme Settings | `developer/pages/website/WebsiteThemeSettings.jsx` (533 lines) | Uses OLD theme system, disconnected from admin themes |
| Template Editor | `developer/pages/website/TemplateEditor.jsx` (394 lines) | UI built but `TODO: Save to API` / `TODO: Fetch from API` |
| SEO Settings Page | `developer/pages/website/SEOSettings.jsx` | Built, untested, uses `useWebsiteSEO` |
| Analytics Page | `developer/pages/website/AnalyticsPage.jsx` | Built, mock data |
| Deployment Page | `developer/pages/website/DeploymentPage.jsx` | Built, mock deployment flow |

---

## 4. Critical Bugs & Errors

### 🔴 BUG #1: "No templates found" – Schema Mismatch (CRITICAL)

**Symptom:** Template Library shows "No templates found – Try selecting a different category"

**Root Cause:** `src/hooks/useTemplates.js` line 23–24:
```javascript
const { data, error: fetchError } = await supabase
  .from('page_templates')
  .select('*')
  .or(`is_global.eq.true,tenant_id.eq.${tenantId}`)  // ← BROKEN
```

**Problem:** The `page_templates` table has **NEITHER** `is_global` **NOR** `tenant_id` columns.

**Actual `page_templates` columns:**
```
id, name, slug, description, category, thumbnail_url, sections, 
default_settings, is_premium, is_active, created_at, updated_at
```

**Missing columns queried by hook:** `is_global`, `tenant_id`, `content`, `tags`, `created_by`

**Impact:** ALL 8 seeded templates are invisible. Template Library is completely non-functional.

**Fix:** Remove the `.or()` filter or add missing columns via migration.

---

### 🔴 BUG #2: Edge Function `template-api` – Same Schema Mismatch

**File:** `supabase/functions/template-api/index.ts` (252 lines, deployed as v5)

**Problem:** The edge function also references `tenant_id` on `page_templates`:
```typescript
// GET handler:
.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)

// POST handler:
.insert({ ...body, tenant_id: tenantId })
```

**Impact:** Even if the frontend hook is fixed, the API endpoint will still fail for tenant-filtered queries.

---

### 🔴 BUG #3: Import Path Error in `useTheme.js`

**File:** `src/hooks/useTheme.js` line 2:
```javascript
import { supabase } from '../../lib/supabase';  // ← WRONG
```

**Actual resolution:** `/workspaces/Dento/lib/supabase` (does NOT exist)  
**Correct path:** `../lib/supabase` → resolves to `src/lib/supabase`

**Impact:** Theme hook may fail at runtime. Currently no Vite path aliases cover this. May work only due to Vite's fuzzy resolution or HMR caching — will break in production build.

---

### 🟡 BUG #4: ContentEditor Built But Not Routed

**File:** `src/admin/pages/website/ContentEditor.jsx` (233 lines)  
**Export:** `src/admin/pages/website/index.js` exports `ContentEditor`

**Problem:** `AdminApp.jsx` does NOT import ContentEditor. No `<Route>` exists for it. No sidebar item in `AdminLayout.jsx`.

**Impact:** Admin cannot edit page content within developer-defined structures. The entire developer↔admin content separation flow is broken.

---

### 🟡 BUG #5: Two Competing Theme Systems

| | OLD System | NEW System |
|---|---|---|
| **Hook** | `useWebsiteTheme.js` | `useTheme.js` |
| **Table** | `website_settings` | `website_themes` |
| **Used by** | Dev Portal | Admin Panel + App.jsx ThemeProvider |
| **Data shape** | Simple flat theme object | Full JSONB (colors, typography, buttons, layout, effects) |

**Impact:** Developer sets themes in `website_settings`, admin sets themes in `website_themes`. Neither sees the other's changes. Public website gets theme from ThemeProvider (NEW system), so developer theme changes have NO effect.

---

### 🟡 BUG #6: Frontend Template Files Disconnected from DB

**Files:**
- `src/templates/pageTemplates.js` – 10 templates (326 lines)
- `src/templates/sectionTemplates.js` – 15 templates (463 lines)

**Problem:** These frontend JS template definitions are never synced to the DB `page_templates` / `section_templates` tables. The DB was seeded separately via `migrations/051_additional_templates.sql` with DIFFERENT content.

**Used by:** Only `TemplateEditor.jsx` section picker uses `sectionTemplates.js`. Nothing uses `pageTemplates.js`.

**Impact:** Two independent template catalogs exist with no synchronization.

---

## 5. What Is Missing / Incomplete

### ❌ Not Implemented

| Feature | Expected Location | Status |
|---------|-------------------|--------|
| Template Editor API integration | `TemplateEditor.jsx` | Has `TODO: Save to API` / `TODO: Fetch from API` comments |
| Content Editor routing | `AdminApp.jsx` | Component built, no route configured |
| Content Editor sidebar item | `AdminLayout.jsx` | No entry in sidebar navigation |
| Template categories sync | DB ↔ Frontend | Templates use different category names |
| FAQs data | `faqs` table | 0 rows – FAQsManager exists but table is empty |
| Media Library content | `media_library` table | 0 rows – component exists but no media uploaded |
| Multi-tenant template ownership | `page_templates` schema | No `tenant_id` or `is_global` columns |
| Bundle browsing UI | `TemplateLibrary.jsx` | No bundle grouping or "Apply Bundle" action |
| Bundle apply action | `useTemplates.js` | No `applyBundle()` function to create all pages at once |
| Theme system unification | Both theme hooks | Dev Portal and Admin use different systems |
| Public website dynamic rendering | `PublicApp.jsx` | Static legacy pages take priority over dynamic |
| Page versioning UI | Dev Portal | `page_versions` table exists, `usePageVersions.js` exists, no UI page |
| Content drafts UI | Dev Portal | `content_drafts` table exists, no UI |
| Form submissions viewer | Admin | `form_submissions` table exists, no viewer |
| Content change log viewer | Admin | `content_change_log` table exists, no viewer |

### ⚠️ Partially Implemented

| Feature | Current State | Missing |
|---------|---------------|---------|
| Template Library | UI complete, hook broken | Fix `useTemplates.js` query |
| Template Editor | UI with section picker works | Save/load to DB not wired |
| SEO Settings | Hook + page built | Not tested, unclear data flow |
| Website Analytics | Page built | Uses mock data only |
| Website Deployment | Page built | Mock deployment flow |
| Page Preview | Button exists in builder | Opens blank `/preview/:id` – may not render |
| HomePageEditor sections | 7 section types | Disconnected from page builder structure model |

---

## 6. Database Inventory

### Tables & Row Counts

| Table | Rows | Status | Notes |
|-------|------|--------|-------|
| `pages` | 7 | ✅ | 1 tenant, 7 pages (/, /contact, etc.) |
| `page_templates` | 39 | ⚠️ | 8 complete bundles + 2 standalone. Data unreachable (schema mismatch in hook) |
| `section_templates` | 23 | ⚠️ | Data exists, same issue via edge function |
| `page_versions` | 0 | ❌ | Table exists, never populated |
| `content_drafts` | 0 | ❌ | Table exists, never populated |
| `navigation_menus` | 3 | ✅ | Header, footer, mobile |
| `website_settings` | 1 | ✅ | Used by OLD theme system |
| `website_themes` | 5 | ✅ | 5 system themes (seeded) |
| `theme_history` | 0 | ✅ | Ready, populated on theme activation |
| `media_library` | 0 | ❌ | Table exists, never populated |
| `form_submissions` | 0 | ❌ | Table exists, no frontend forms submit here |
| `content_change_log` | 0 | ❌ | Table exists, no triggers active |
| `faqs` | 0 | ❌ | FAQsManager exists, no data |

### RLS Policies

| Table | Policies | Issue |
|-------|----------|-------|
| `page_templates` | `page_templates_public_read` (SELECT WHERE is_active=true) | No tenant filtering – consistent with schema (no tenant_id) but hook expects it |
| `section_templates` | `section_templates_public_read` (SELECT WHERE is_active=true) | Same pattern |
| `pages` | Tenant-based + developer access | ✅ Correct |
| `website_themes` | System readable + tenant manageable | ✅ Correct |
| `website_settings` | Read/write policies | ✅ Correct |

### Relevant Migrations (Applied)

| Migration | Purpose | Status |
|-----------|---------|--------|
| `050_page_builder_tables.sql` | Core tables (pages, templates, settings, etc.) | ✅ Applied |
| `051_additional_templates.sql` | Seed 8 page + 23 section templates | ✅ Applied |
| `053_seed_default_pages.sql` | Seed 7 default pages for tenant | ✅ Applied |
| `076_website_themes.sql` | Create `website_themes` + `theme_history` | ✅ Applied |
| `077_seed_themes.sql` | Seed 5 system themes | ✅ Applied |
| `078_seed_content.sql` | Seed services, testimonials, portfolio, tourism | ✅ Applied |
| `079_website_template_bundles.sql` | Add bundle columns + seed 6 complete website bundles (24 pages) | ✅ Applied |
| `080_canine_classic_bundle.sql` | Canine Dental Clinic default pages as reusable 7-page bundle | ✅ Applied |

---

## 7. Edge Functions Status

All 31 edge functions are **ACTIVE** and deployed. Key ones for this analysis:

| Function | Version | Status | Issue |
|----------|---------|--------|-------|
| `template-api` | v5 | ✅ ACTIVE | ❌ References non-existent `tenant_id` column |
| `page-builder-api` | v4 | ✅ ACTIVE | Needs review for same issues |
| `website-settings-api` | v4 | ✅ ACTIVE | Works with `website_settings` table |
| `media-upload` | v1 | ✅ ACTIVE | – |

---

## 8. Website Template Bundles

### 8.1 Bundle System (Migration 079)

Added `bundle_slug`, `bundle_name`, `bundle_description`, `bundle_order`, `bundle_thumbnail_url` columns to `page_templates` to group individual page templates into complete website packages.

**Migration:** `supabase/migrations/079_website_template_bundles.sql`

### 8.2 Complete Website Bundles (8 Bundles, 39 Templates)

Each bundle provides a complete website that a tenant can apply in one click:

| # | Bundle | Slug | Pages | Style / Design Concept | Inspiration |
|---|--------|------|-------|----------------------|-------------|
| 1 | **Canine Classic** | `canine-classic` | 7 | The original proven design – full clinic website with tourism, portfolio, testimonials | Canine Dental Clinic default |
| 2 | **Modern Dental** | `modern-dental` | 5 (+ Booking) | Clean modern design, appointment booking | Original |
| 3 | **DiwaDental Premium** | `diwadental-premium` | 4 | Luxury/premium with slider hero, before/after gallery, partner logos | DiwaDental (MIT) |
| 4 | **MedicPro Clean** | `medicpro-clean` | 4 | Professional medical, feature boxes, evidence-based | themefisher/medic-bootstrap (MIT) |
| 5 | **Minimal Smile** | `minimal-smile` | 4 | Clean minimal, generous whitespace, boutique feel | Minimal design principles |
| 6 | **Tourism Dental** | `tourism-dental` | 4 | Dental tourism, pricing comparison, travel packages, multilingual | Dental tourism industry |
| 7 | **Pediatric Gentle** | `pediatric-gentle` | 4 | Child-friendly, warm colors, playful, parent FAQ | Pediatric dental practices |
| 8 | **Emergency 24/7** | `emergency-247` | 4 | Urgent care, prominent booking, bold CTAs, 24/7 emphasis | Emergency dental clinics |

Plus **2 standalone** templates (Classic Medical Home, Pricing Page) and the original **Minimal Dental Home**.

### 8.3 Bundle Page Breakdown

| Bundle | Home | About | Services | Contact | Tourism | Portfolio | Testimonials |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Canine Classic** | 6 | 4 | 2 | 4 | 4 | 2 | 2 |
| DiwaDental Premium | 10 | 7 | 6 | 5 | – | – | – |
| MedicPro Clean | 8 | 6 | 5 | 5 | – | – | – |
| Minimal Smile | 4 | 4 | 4 | 3 | – | – | – |
| Tourism Dental | 9 | 6 | 6 | 5 | – | – | – |
| Pediatric Gentle | 7 | 5 | 5 | 4 | – | – | – |
| Emergency 24/7 | 6 | 5 | 4 | 5 | – | – | – |

### 8.4 Section Templates Used Across Bundles

All 23 existing section template slugs are referenced. Most used:

| Section Slug | Used in Bundles |
|-------------|----------------|
| `hero-centered` | 7/7 |
| `contact-split` | 7/7 |
| `cta-simple` / `cta-fullwidth` | 7/7 |
| `services-grid-3` / `services-grid-4` | 7/7 |
| `team-grid` | 6/7 |
| `about-split` | 6/7 |
| `faq-accordion` / `faq-two-column` | 6/7 |
| `testimonials-slider` / `testimonials-grid` | 6/7 |
| `gallery-masonry` | 5/7 |
| `booking-widget` | 4/7 |
| `map-full` | 5/7 |
| `stats-counter` | 4/7 |
| `branches-cards` | 4/7 |
| `pricing-table` | 3/7 |
| `features-grid` | 5/7 |
| `partners-carousel` | 3/7 |

### 8.5 Bilingual Content

All templates include `content_override` with both **English (`title_en`, `subtitle_en`, `body_en`)** and **Arabic (`title_ar`, `subtitle_ar`, `body_ar`)** text, matching the platform's multilingual architecture.

### 8.6 What's Still Needed for Bundles to Work

| Task | Priority | Status |
|------|----------|--------|
| Fix `useTemplates.js` query (Bug #1) | 🔴 Critical | Not fixed yet |
| Add bundle browsing UI to Template Library | 🟡 High | Not built |
| Add "Apply Bundle" action (creates all 4 pages at once) | 🟡 High | Not built |
| Update `useTemplates.js` to expose `bundle_slug` grouping | 🟡 High | Not built |
| Bundle preview/thumbnail display | 🟢 Medium | Thumbnail URLs seeded |
| Bundle selection in onboarding wizard | 🟢 Low | Not planned yet |

---

## 9. Recommended Fixes (Prioritized)

### Priority 1 – Critical (Blocking Features)

#### Fix 1A: Fix `useTemplates.js` – Remove Non-Existent Column Query

**File:** `src/hooks/useTemplates.js`  
**Change:** Replace `.or('is_global.eq.true,tenant_id.eq.${tenantId}')` with `.eq('is_active', true)`

```javascript
// BEFORE (broken):
.or(`is_global.eq.true,tenant_id.eq.${tenantId}`)

// AFTER (working):
.eq('is_active', true)
```

**Why:** The `page_templates` table uses `is_active` for visibility. Templates are currently global (no tenant ownership). This immediately fixes "No templates found" and makes all 32 templates (incl. 7 bundles) visible.

#### Fix 1B: Fix `template-api` Edge Function

**File:** `supabase/functions/template-api/index.ts`  
**Change:** Remove `tenant_id` references from GET/POST/PUT/DELETE handlers. Use `is_active` filter instead.

#### Fix 1C: Fix `useTheme.js` Import Path

**File:** `src/hooks/useTheme.js`  
**Change:** Line 2: `../../lib/supabase` → `../lib/supabase`

---

### Priority 2 – High (Core Feature Gaps)

#### Fix 2A: Route ContentEditor in Admin

**File:** `src/admin/AdminApp.jsx`  
1. Import `ContentEditor` from `./pages/website/ContentEditor`
2. Add route: `<Route path="website/content" element={<ContentEditor />} />`

**File:** `src/admin/layouts/AdminLayout.jsx`  
3. Add sidebar item for "Content Editor" under Website Content section

#### Fix 2B: Unify Theme System

**Option A (Recommended):** Migrate Dev Portal `WebsiteThemeSettings.jsx` to use `useTheme` hook (NEW system)  
**Option B:** Keep both but sync data between `website_settings.theme` and `website_themes`

The NEW system (`website_themes`) is more capable (full JSONB schema, theme history, multiple themes). The OLD system should be deprecated.

#### Fix 2C: Wire Template Editor Save/Load

#### Fix 2D: Build Bundle Browsing & Apply UI

**File:** `src/developer/pages/website/TemplateLibrary.jsx`  
1. Group templates by `bundle_slug` in the UI  
2. Show bundle cards with `bundle_name`, `bundle_description`, `bundle_thumbnail_url`  
3. Add "Apply Bundle" button that creates all bundle pages for the tenant at once  
4. Show individual page templates within each bundle as a collapsible list

**File:** `src/hooks/useTemplates.js`  
5. Add `bundles` computed property that groups templates by `bundle_slug`  
6. Add `applyBundle(bundleSlug)` function that inserts all pages from a bundle into the `pages` table

**File:** `src/developer/pages/website/TemplateEditor.jsx`  
- Replace `TODO: Save to API` with actual Supabase insert/update to `page_templates`
- Replace `TODO: Fetch from API` with query from `page_templates` + `section_templates`

---

### Priority 3 – Medium (Data & Consistency)

#### Fix 3A: Decide on Template Ownership Model

**Option A:** Keep templates global (current DB schema) – remove tenant filtering from all hooks/functions  
**Option B:** Add `tenant_id` + `is_global` columns via migration – enables per-tenant custom templates

If Option B:
```sql
ALTER TABLE page_templates 
  ADD COLUMN tenant_id UUID REFERENCES tenants(id),
  ADD COLUMN is_global BOOLEAN DEFAULT false;

UPDATE page_templates SET is_global = true; -- existing templates become global
```

#### Fix 3B: Sync Frontend Templates to DB or Remove

Either:
- Remove `src/templates/pageTemplates.js` and `sectionTemplates.js` (use DB as single source of truth)
- OR create a migration/seed script to import them into the DB

#### Fix 3C: Seed FAQs Data

The `FAQsManager` admin page exists but `faqs` table has 0 rows. Seed sample FAQs or document that admins must create them manually.

---

### Priority 4 – Low (Polish & Future Features)

| Fix | Description |
|-----|-------------|
| Page Versioning UI | Build a version history panel in the Dev Portal page builder |
| Content Drafts | Wire draft save/restore in ContentEditor |
| Form Submissions Viewer | Build admin page to view `form_submissions` |
| Content Change Log | Build admin audit log viewer |
| Media Library population | Ensure upload flow works and populates `media_library` |
| Public website dynamic rendering | Connect page builder output to `PublicApp.jsx` routes |
| HomePageEditor alignment | Align with page builder data model or deprecate |

---

## Appendix: File Reference

### Dev Portal Web Builder Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/developer/DeveloperApp.jsx` | 234 | All routes including Website section |
| `src/developer/pages/website/TemplateLibrary.jsx` | 241 | Browse & apply templates |
| `src/developer/pages/website/PageBuilderPage.jsx` | 244 | CraftJS visual editor |
| `src/developer/pages/website/TemplateEditor.jsx` | 394 | Create/edit templates (INCOMPLETE) |
| `src/developer/pages/website/PageList.jsx` | 305 | Page management grid |
| `src/developer/pages/website/WebsiteThemeSettings.jsx` | 533 | Theme settings (OLD system) |
| `src/developer/pages/website/SEOSettings.jsx` | – | SEO configuration |
| `src/developer/pages/website/AnalyticsPage.jsx` | – | Analytics (mock data) |
| `src/developer/pages/website/DeploymentPage.jsx` | – | Deployment (mock flow) |
| `src/developer/pages/website/WebsiteSettings.jsx` | – | General settings |
| `src/developer/pages/website/NavigationEditor.jsx` | – | Menu management |

### Admin Web Content Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/admin/AdminApp.jsx` | 603 | All admin routes |
| `src/admin/layouts/AdminLayout.jsx` | ~580 | Sidebar navigation |
| `src/admin/pages/website/ThemeSelector.jsx` | 836 | Theme builder (NEW system) |
| `src/admin/pages/website/ContentEditor.jsx` | 233 | Content editing (NOT ROUTED) |
| `src/admin/pages/website/ContentEditorField.jsx` | 231 | Field-level content editor |
| `src/admin/pages/website/FAQsManager.jsx` | – | FAQ management |
| `src/admin/pages/pages/HomePageEditor.jsx` | 851 | Standalone home page editor |

### Shared Hooks

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `src/hooks/useTemplates.js` | 130 | Template CRUD | ❌ BROKEN |
| `src/hooks/useTheme.js` | 353 | Theme CRUD (NEW) | ⚠️ Bad import |
| `src/hooks/useWebsiteTheme.js` | – | Theme (OLD, wraps settings) | ⚠️ Deprecated |
| `src/hooks/useWebsitePages.js` | – | Re-exports `usePages` | ✅ Working |
| `src/hooks/pageBuilder/usePages.js` | 217 | Pages CRUD + realtime | ✅ Working |
| `src/hooks/pageBuilder/useWebsiteContent.js` | 289 | Content merge + edit | ✅ Working |
| `src/hooks/pageBuilder/useWebsiteSettings.js` | 165 | Settings CRUD | ✅ Working |

### Page Builder Components (79 files)

Located at `src/components/pageBuilder/` – CraftJS-based visual builder with:
- Toolbox, panels, resolver
- Section components (Hero, Features, Testimonials, FAQ, CTA, etc.)
- Drag & drop editing
- Property panels per component
- Content renderer for public display

---

## 10. Custom Domain Workflow

### 10.1 Intended Flow (6 Steps)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Step 1: Developer Portal → Tenant Detail → Channels Tab           │
│          → "Add Domain" → enters "www.smileclinic.com"             │
├─────────────────────────────────────────────────────────────────────┤
│  Step 2: System generates TXT verification token                   │
│          _dento-verify.smileclinic.com → dento-verify-<uuid>       │
├─────────────────────────────────────────────────────────────────────┤
│  Step 3: Tenant configures DNS:                                    │
│          CNAME: @ → websites.dento.app                             │
│          TXT:   _dento-verify → dento-verify-<uuid>                │
├─────────────────────────────────────────────────────────────────────┤
│  Step 4: Developer clicks "Verify" → Edge Function checks DNS      │
│          → domain_verified = true, SSL provisioned                 │
├─────────────────────────────────────────────────────────────────────┤
│  Step 5: Vercel: Custom domain added to project                    │
│          → Automatic Let's Encrypt SSL                             │
├─────────────────────────────────────────────────────────────────────┤
│  Step 6: Visitor on www.smileclinic.com sees the tenant website    │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Implementation Status Per Step

| Step | Description | Built? | Functional? | Details |
|------|-------------|--------|-------------|----------|
| **1** | Channels tab → "Add Domain" button | ✅ UI exists | ❌ Handler is STUB | `TenantDetail.jsx` line 1741 renders the button. `DomainConfigModal` opens with domain input. But `handleAddDomain()` (line 219) is **empty** — contains only `TODO: Implement domain API`. |
| **2** | TXT verification token generation | ✅ Edge function exists | ❌ Not wired | `verify-domain` edge function (POST handler) generates `dento-verify-<UUID>` and stores on `tenants.domain_verification_token`. But the frontend **never calls** this function. |
| **3** | DNS instructions display | ⚠️ Static only | ❌ No real token | `DomainConfigModal` shows static CNAME instructions (`@ → {slug}.dento.app`) but does **NOT** display the TXT verification record since no token is generated (Step 2 not wired). |
| **4** | "Verify" button → DNS check | ✅ Edge function exists | ❌ No UI trigger | `verify-domain` PATCH handler queries Google DNS API (`dns.google/resolve`) to check CNAME + TXT records. `domainApi.verifyDns()` service and `useVerifyDns()` hook exist. But **no "Verify" button** exists in the Channels tab UI. |
| **5** | Vercel API auto-add domain | ❌ Not implemented | ❌ Missing entirely | No Vercel API integration code exists anywhere. `ci.yml` has commented-out `VERCEL_TOKEN`. No call to `POST /v10/projects/{projectId}/domains`. |
| **6** | Visitor sees tenant website | ✅ Routing exists | ⚠️ Table mismatch | `DomainResolver.jsx` resolves custom domains by querying `tenant_domains` table. But `verify-domain` edge function writes to `tenants.custom_domain` (different table). This **mismatch** means a verified domain won't be found by the resolver. |

### 10.3 Component Map

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| Channels Tab UI | `src/developer/pages/tenants/TenantDetail.jsx` | 2396 | ⚠️ UI renders, handlers are stubs |
| DomainConfigModal | `src/developer/components/ChannelSettingsModal.jsx` | 777 | ⚠️ Shows static DNS instructions only |
| DomainSettings page | `src/developer/pages/website/DomainSettings.jsx` | 419 | ⚠️ Queries `website_domains` table (yet another table) |
| verify-domain edge function | `supabase/functions/verify-domain/index.ts` | 276 | ✅ Full DNS verification logic |
| domain-api edge function | `supabase/functions/domain-api/index.ts` | 327 | ✅ CRUD + stats for `domains` table |
| DomainResolver | `src/routing/DomainResolver.jsx` | 122 | ✅ Resolves subdomains + custom domains |
| useSubdomain | `src/routing/useSubdomain.js` | – | ✅ Hostname parsing |
| domainApi service | `src/developer/services/devApi.js` | – | ✅ Full API client |
| useDomains / useVerifyDns hooks | `src/developer/hooks/useDevApi.js` | – | ✅ Hooks exist |

### 10.4 Database Tables for Domains (3 Competing Tables)

| Table | Migration | Used By | Purpose |
|-------|-----------|---------|----------|
| `tenants` (columns: `custom_domain`, `domain_verified`, `domain_verification_token`, `ssl_status`) | `040_saas_multi_tenant_core.sql` | `verify-domain` edge function | Stores ONE custom domain per tenant |
| `domains` | `042_saas_deployment_domains.sql` | `domain-api` edge function, `domainApi` service | Multi-domain support with `domain_type`, DNS verification, SSL tracking |
| `tenant_domains` | (referenced in code) | `DomainResolver.jsx` | Custom domain resolution for routing |

**Problem:** Three different tables are used for domain data by different parts of the system. The `verify-domain` function writes to `tenants.custom_domain`, but `DomainResolver.jsx` reads from `tenant_domains`, and `domain-api` manages the `domains` table. None are synchronized.

### 10.5 What's Missing to Complete the Workflow

| Task | Priority | Effort |
|------|----------|--------|
| Wire `handleAddDomain` in TenantDetail to call `useCreateDomain()` hook | 🔴 Critical | ~30 min |
| After domain creation, call `verify-domain` POST to generate TXT token | 🔴 Critical | ~30 min |
| Display real TXT verification token + CNAME in DomainConfigModal | 🔴 Critical | ~1 hour |
| Add "Verify" button per domain in Channels tab, call `useVerifyDns()` | 🔴 Critical | ~1 hour |
| Reconcile domain table mismatch (unify to ONE table) | 🟡 High | ~2 hours |
| Add Vercel API integration for auto-adding custom domains | 🟡 High | ~3 hours |
| SSL status polling / webhook after Vercel provisions cert | 🟢 Medium | ~2 hours |
| Domain health monitoring (periodic DNS re-check) | 🟢 Low | ~2 hours |

**Total estimated effort:** ~10-12 hours

---

## Summary

The Web Builder system has strong foundations – CraftJS integration, comprehensive hooks, seeded DB data, deployed edge functions. However, **3 critical bugs** prevent core features from working:

1. **Template Library is completely broken** due to querying non-existent columns
2. **Two competing theme systems** create data conflicts between portals  
3. **Content Editor exists but isn't accessible** (no route, no sidebar item)

**Template Bundle System (NEW):** Migrations 079 + 080 added **8 complete website bundles** (39 total page templates) with bundle grouping columns. Each bundle provides a ready-to-use website with bilingual EN/AR content. Bundles cover: **Canine Classic** (7 pages – the proven default), Premium, Professional, Minimal, Tourism, Pediatric, Emergency, and Modern Dental.

**Custom Domain Workflow:** The 6-step custom domain flow is ~50% built. Backend edge functions (`verify-domain`, `domain-api`) are deployed and functional. Frontend UI (Channels tab, DomainConfigModal) exists but handlers are empty stubs. **Critical gaps:** `handleAddDomain` is a TODO, no "Verify" button, no Vercel API integration, and 3 competing domain tables (`tenants`, `domains`, `tenant_domains`) are unsynchronized.

**Next steps to make bundles functional:**
1. Fix `useTemplates.js` query (Bug #1) → makes all 39 templates visible (~30 min)
2. Build bundle browsing UI in Template Library (~2-3 hours)
3. Build "Apply Bundle" action to create all pages at once (~1-2 hours)
4. Unify theme system + route ContentEditor (~3-4 hours)

**Next steps for custom domains:**
1. Wire `handleAddDomain` + token generation (~1 hour)
2. Add "Verify" button + real DNS instructions (~2 hours)
3. Unify domain tables (~2 hours)
4. Add Vercel API integration (~3 hours)

Total estimated effort to full functionality: **~18-22 hours**
