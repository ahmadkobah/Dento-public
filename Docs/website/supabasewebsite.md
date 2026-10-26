# Supabase Website Infrastructure — Full Scan

**Date:** February 15, 2026  
**Purpose:** Complete inventory of all database tables, migrations, and edge functions related to the website/CMS system.

---

## 1. Website-Related Database Tables

### 1.1 Content & Pages (Migration 050)

| Table | Has tenant_id | Purpose | Key Columns |
|-------|:---:|---------|-------------|
| `pages` | ✅ | Website pages with structure + content | `slug`, `structure` (JSONB), `content` (JSONB), `title_en/ar`, `is_homepage`, `status`, `seo_*` |
| `page_versions` | ✅ | Version history for pages | `page_id`, `version_number`, `content`, `structure`, `change_type`, `change_summary` |
| `content_drafts` | ✅ | Unpublished content changes | `page_id`, `content` (JSONB), `status` (pending/approved/rejected), `submitted_by` |
| `content_change_log` | ✅ | Audit trail for content edits | `page_id`, `field_path`, `old_value`, `new_value`, `change_type`, `changed_by` |
| `content_locks` | ❌ (052) | Prevent concurrent editing | `resource_type`, `resource_id`, `user_id`, `user_name` |
| `navigation_menus` | ✅ | Site navigation config | `menu_type` (header/footer/sidebar), `items` (JSONB), unique per tenant |
| `website_settings` | ✅ | Website branding/config | Unique per tenant, branding fields |
| `media_library` | ✅ | Website asset manager | `filename`, `file_url`, `file_type`, `file_size`, `folder`, `tags` |
| `section_templates` | ✅ | Reusable section templates | `name`, `category`, `structure` (JSONB), `thumbnail_url` |
| `page_templates` | ✅ | Full page templates | `name`, `category`, `pages` (JSONB), `is_system` |
| `form_submissions` | ✅ | Contact form inbox | `page_id`, `form_type`, `data` (JSONB), `status`, `ip_address` |
| `faqs` | ✅ | FAQ entries | `question_en/ar`, `answer_en/ar`, `category`, `sort_order` |

### 1.2 Foundation Content Tables (Migration 001)

| Table | Has tenant_id | Purpose | Key Columns |
|-------|:---:|---------|-------------|
| `services` | ✅ (045) | Dental service listings | `name_en/ar`, `category_id` → `service_categories`, `price_min/max`, `duration_minutes`, `image_url` |
| `testimonials` | ✅ (045) | Patient testimonials | `patient_name_en/ar`, `text_en/ar`, `rating`, `photo_url`, `is_featured` |
| `portfolio_cases` | ✅ (045) | Before/after portfolio | `title_en/ar`, `category`, `before_image_url`, `after_image_url`, `doctor_id` |
| `tourism_packages` | ✅ (045) | Dental tourism packages | `name_en/ar`, `duration_days`, `includes_json`, `price_usd`, `image_url` |
| `translations` | ✅ (045) | CMS translation strings | `key` (unique), `en`, `ar`, `page`, `section` |
| `site_settings` | ✅ (045) | Key-value settings store | `key` (unique), `value` (JSONB) |
| `media` | ✅ (045) | Legacy media storage | `filename`, `url`, `thumbnail_url`, `category`, `size_bytes`, `mime_type` |
| `team_members` | ❌ | Website team display | `doctor_id`, `name_en/ar`, `role_en/ar`, `specialty_en/ar` |

### 1.3 Theme Tables (Migration 076)

| Table | Has tenant_id | Purpose | Key Columns |
|-------|:---:|---------|-------------|
| `website_themes` | ✅ | Theme definitions with full config | `name`, `slug`, `colors` (JSONB), `typography` (JSONB), `layout` (JSONB), `is_active`, `is_system` |
| `theme_history` | ✅ | Theme activation/change log | `theme_id`, `action` (activated/deactivated/customized), `changed_by` |

### 1.4 CMS Column Patches (Migration 083)

Added CMS-style columns to `services` table because admin forms expected different column names:

| Original Column | Added CMS Column | Backfill |
|-----------------|-------------------|----------|
| `name_en` | `title_en` | ✅ `title_en = name_en` |
| `name_ar` | `title_ar` | ✅ `title_ar = name_ar` |
| `category_id` (FK) | `category` (TEXT) | ❌ No backfill |
| `price_min` | `price_from` | ✅ |
| `price_max` | `price_to` | ✅ |
| `sort_order` | `display_order` | ✅ |
| — | `short_description_en/ar` | New |
| — | `features_en/ar` (JSONB) | New |

**⚠️ PROBLEM:** Services table now has **duplicate columns** for the same data (name_en + title_en, price_min + price_from, etc.). Admin forms use one set, clinical code could use the other. Data can get out of sync.

---

## 2. Known Schema Issues

### 2.1 Duplicate Column Problem (services table)
The `services` table has two parallel column sets after migration 083:
- **Clinical:** `name_en`, `name_ar`, `category_id`, `price_min`, `price_max`, `sort_order`
- **CMS:** `title_en`, `title_ar`, `category`, `price_from`, `price_to`, `display_order`, `features_en/ar`, `short_description_en/ar`

Neither set is authoritative. Admin writes to CMS columns, but clinical code may read clinical columns.

### 2.2 Duplicate Media Tables
Two separate media tables exist:
- `media` (Migration 001) — legacy, simple: `filename`, `url`, `thumbnail_url`, `category`
- `media_library` (Migration 050) — richer: `file_url`, `file_type`, `file_size`, `folder`, `tags`, `alt_text_en/ar`

Admin Media Library page likely queries one, while other code references the other.

### 2.3 Duplicate Settings Tables
- `site_settings` (Migration 001) — simple key-value store (`key`, `value` JSONB)
- `website_settings` (Migration 050) — single row per tenant with specific branding columns

Both store website configuration but with different structures.

### 2.4 Missing tenant_id
- `content_locks` (Migration 052) — no `tenant_id` column
- `team_members` (Migration 001) — no `tenant_id` added in migration 045
- `auto_save_drafts` (Migration 052) — has `tenant_id` via joined data but verify
- `user_preferences` (Migration 052) — user-level, no tenant needed

### 2.5 translations Table Uniqueness
`translations.key` has a UNIQUE constraint but no tenant scoping. This means:
- Only one tenant can have a translation for key `"welcome_title"`
- Multi-tenant translation is broken — needs `UNIQUE(tenant_id, key)` instead

---

## 3. All Website-Related Migrations

| # | File | Purpose | Tables Affected | Status |
|---|------|---------|-----------------|--------|
| 001 | `001_foundation.sql` | Core schema | `services`, `testimonials`, `portfolio_cases`, `tourism_packages`, `translations`, `site_settings`, `media`, `team_members` | ✅ Applied |
| 045 | `045_add_tenant_id_to_core_tables.sql` | Add tenant_id | All foundation tables | ✅ Applied |
| 050 | `050_page_builder_tables.sql` | Page builder system | `pages`, `page_versions`, `content_drafts`, `navigation_menus`, `website_settings`, `media_library`, `section_templates`, `page_templates`, `form_submissions`, `content_change_log`, `faqs` | ✅ Applied |
| 051 | `051_additional_templates.sql` | Seed templates | `section_templates`, `page_templates` | ✅ Applied |
| 052 | `052_content_locks_polish.sql` | Content locking | `content_locks`, `auto_save_drafts`, `user_preferences` | ✅ Applied |
| 053 | `053_seed_default_pages.sql` | Seed default pages | `pages` | ✅ Applied |
| 054 | `054_fix_pages_rls.sql` | Fix RLS policies | `pages` (policies) | ✅ Applied |
| 055 | `055_seed_navigation_settings.sql` | Seed navigation | `navigation_menus` | ✅ Applied |
| 076 | `076_website_themes.sql` | Theme system | `website_themes`, `theme_history` | ✅ Applied |
| 077 | `077_seed_website_themes.sql` | Seed themes | `website_themes` | ✅ Applied |
| 078 | `078_seed_canine_clinic_content.sql` | Seed clinic content | Multiple content tables | ✅ Applied |
| 079 | `079_website_template_bundles.sql` | Template bundles | `page_templates`, `section_templates` | ✅ Applied |
| 080 | `080_canine_classic_bundle.sql` | Canine Classic theme | `page_templates` | ✅ Applied |
| 081 | `081_seed_faqs.sql` | Seed FAQs | `faqs` | ✅ Applied |
| 083 | `083_fix_services_cms_columns.sql` | Patch services columns | `services` (added CMS columns + seed data) | ✅ Applied via edge fn |

---

## 4. Website-Related Edge Functions

### 4.1 Direct Website Functions

| Function | Lines | Purpose | Used By |
|----------|-------|---------|---------|
| `website-settings-api` | 228 | CRUD for website_settings (branding, SEO, social) | Admin → Settings |
| `page-builder-api` | 244 | CRUD for pages (create, update, publish, reorder) | Dev Portal → Page Builder |
| `template-api` | 237 | CRUD for section/page templates | Dev Portal → Templates |
| `form-submission-api` | 247 | Handle contact form submissions + list inbox | Website forms → Admin inbox |
| `media-upload` | 229 | Upload media to Supabase Storage (10MB limit) | Admin → Media Library |
| `optimize-image` | 164 | Resize/compress/convert images to WebP | Called after upload |
| `generate-sitemap` | 204 | Generate dynamic sitemap.xml from published pages | SEO / public |

### 4.2 Deployment & Domain Functions

| Function | Lines | Purpose | Used By |
|----------|-------|---------|---------|
| `deployment-api` | 301 | Deployment management & version tracking | Dev Portal → Deployments |
| `domain-api` | 326 | Custom domain management | Dev Portal → Domains |
| `verify-domain` | 390 | DNS verification for custom domains | Dev Portal → Domains |
| `vercel-domain` | 212 | Add/remove domains on Vercel project | Dev Portal → Domains |

### 4.3 Platform Functions (Not Website-Specific)

| Function | Lines | Purpose |
|----------|-------|---------|
| `admin-support-request` | 493 | Support ticket system |
| `api-keys` | 440 | API key management |
| `audit-api` | 194 | Audit log queries |
| `backup-management` | 887 | Database backups |
| `billing-dunning` | 306 | Failed payment handling |
| `billing-plan-change` | 361 | Plan upgrades/downgrades |
| `calculate-commission` | 312 | Doctor commission calc |
| `currency-rates` | 139 | Currency exchange rates |
| `dashboard-stats` | 277 | Dashboard statistics |
| `generate-invoice-pdf` | 383 | PDF invoice generation |
| `livekit-token` | 421 | LiveKit video tokens |
| `monitoring-api` | 359 | System monitoring |
| `process-payment` | 420 | Payment processing |
| `send-notification` | 235 | Push/email notifications |
| `stripe-billing` | 353 | Stripe billing integration |
| `stripe-sync` | 404 | Stripe webhook sync |
| `subscription-api` | 320 | Subscription management |
| `tenant-impersonate` | 657 | Admin tenant impersonation |
| `tenant-management` | 512 | Tenant CRUD |
| `tenant-modules` | 674 | Module enable/disable |
| `webhooks-api` | 496 | Webhook management |

---

## 5. Data Flow Problems

### 5.1 Who Writes Where?

```
Website (Public)
  └─ Reads: pages, services, testimonials, portfolio_cases, faqs, tourism_packages
  └─ Writes: form_submissions (contact forms)
  └─ Currently: HARDCODED data in Home.jsx (doesn't read DB at all!)

Admin Portal
  └─ Reads/Writes: services, testimonials, portfolio_cases, tourism_packages, translations
  └─ Reads/Writes: site_settings (SiteSettings page)
  └─ Reads/Writes: pages, content_drafts, content_change_log (Content Editor)
  └─ Reads: form_submissions
  └─ Reads/Writes: media (Media Library — but which table?)
  └─ Uses: website-settings-api, media-upload edge functions

Developer Portal
  └─ Reads/Writes: pages (Page Builder — visual editor with Craft.js)
  └─ Reads/Writes: website_themes (Theme settings)
  └─ Reads/Writes: navigation_menus, website_settings
  └─ Reads/Writes: section_templates, page_templates
  └─ Uses: page-builder-api, template-api, deployment-api, domain-api edge functions
```

### 5.2 Conflict Points

| Conflict | Detail |
|----------|--------|
| **pages.structure vs pages.content** | Dev portal writes `structure` (Craft.js JSON), Admin writes `content` (text/image values). These use DIFFERENT formats. |
| **services dual columns** | Admin ServiceForm writes `title_en`, `category`, `price_from`. Clinical code may read `name_en`, `category_id`, `price_min`. |
| **media vs media_library** | Two tables, unclear which is authoritative. Media Library page may use `media`, Page Builder may use `media_library`. |
| **site_settings vs website_settings** | `site_settings` is key-value (used by SiteSettings page). `website_settings` is structured row (used by edge function). |
| **Website hardcoded data** | Home.jsx has hardcoded services/team data, ignoring the database entirely. |
| **translations.key uniqueness** | `UNIQUE(key)` not `UNIQUE(tenant_id, key)` — broken for multi-tenant. |

---

## 6. Edge Function Deep Scan — Exact Logic

### 6.1 `website-settings-api/index.ts` (228 lines) ✅ CORRECT
- **Auth:** JWT Bearer → `supabase.auth.getUser(token)` → checks `tenant_members` for role `['owner','admin','developer']`
- **GET:** `website_settings.select('*').eq('tenant_id', tenantId).single()` — returns defaults if PGRST116
- **PUT:** `website_settings.upsert({ tenant_id, ...body })` — full replace
- **PATCH:** `website_settings.update(body).eq('tenant_id', tenantId)` — partial update
- **Status:** Well-structured. Uses correct `tenant_id` column. **BUT: mostly unused** — Dev Portal pages (AnimationSettings, ButtonCardStyles, IntegrationSettings) query `website_settings` directly with WRONG column `clinic_id`

### 6.2 `page-builder-api/index.ts` (244 lines) 🔴 BROKEN
- **Auth:** JWT Bearer → `supabase.auth.getUser(token)` → checks `tenant_members`
- **GET:** `website_pages.select('*').eq('tenant_id', tenantId)` — 🔴 **BUG: table `website_pages` does NOT exist** (should be `pages`)
- **POST:** `website_pages.insert(...)` → also creates `page_versions` record — 🔴 Same wrong table
- **PUT:** `website_pages.update(...)` — 🔴 Same wrong table
- **DELETE:** `website_pages.delete(...)` — 🔴 Same wrong table
- **Homepage logic:** On POST, if `is_home=true`, unsets other homepages for same tenant
- **Status:** Completely broken. Every query references non-existent `website_pages` table. Should use `pages`.

### 6.3 `template-api/index.ts` (237 lines) ⚠️ PARTIALLY BROKEN
- **Auth (write):** JWT Bearer → check `tenant_members` → requires `developer` role
- **Auth (read):** No auth required on GET
- **GET:** `page_templates.select('*').eq('is_active', true)` — returns ALL active templates globally, **no tenant scoping**
- **POST:** `page_templates.insert(body)` — premium check against `tenants.subscription_tier`
- **PUT:** `page_templates.update(body).eq('id', id)`
- **DELETE:** `page_templates.update({ is_active: false }).eq('id', id)` — soft delete
- **Status:** GET returns all tenants' templates. No tenant isolation on reads.

### 6.4 `form-submission-api/index.ts` (247 lines) ✅ CORRECT
- **POST (public):** No auth. Rate limit 5 per 5 min per IP. Inserts to `form_submissions` with `tenant_id`. Calls `send-notification` edge function.
- **GET:** Auth required. `form_submissions.select('*').eq('tenant_id', tenantId)`
- **PATCH (status):** Auth required. Updates status (read/replied/spam).
- **DELETE:** Auth required.
- **Status:** Well-structured. Public POST is properly rate-limited. Correct tenant_id usage.

### 6.5 `media-upload/index.ts` (229 lines) ✅ CORRECT BUT UNUSED
- **Auth:** JWT Bearer → `supabase.auth.getUser(token)` → checks `tenant_members`
- **POST (upload):** Uploads to Storage bucket `media` at path `{tenantId}/{timestamp}-{uuid}.{ext}`. Creates `media_library` record with dimensions, mime type, file size.
- **GET:** `media_library.select('*').eq('tenant_id', tenantId)` with optional folder/type filters
- **DELETE:** Removes from Storage + deletes `media_library` record
- **Image dimensions:** Extracts width/height from uploaded images
- **Status:** Well-structured BUT **Admin MediaLibrary.jsx does NOT use this function**. It does raw `supabase.storage.from('media').list()` instead, and doesn't create `media_library` records at all.

### 6.6 `generate-sitemap/index.ts` (204 lines) 🔴 BROKEN
- **Auth:** None (public endpoint)
- **Queries:** `website_pages.select(...)` — 🔴 **BUG: table doesn't exist** (should be `pages`)
- **Also queries:** `services.select('slug, ...)` — 🔴 services table may not have `slug` column
- **Also queries:** `doctors.select('slug, ...)` for doctor pages
- **Domain lookup:** `domains.select('*').eq('domain', hostname)` → resolves tenant_id
- **Status:** Cannot generate sitemap. Wrong table name.

### 6.7 `optimize-image/index.ts` (164 lines) ✅ OK
- **Auth:** Service role key
- **Logic:** Fetches image from URL → resize/compress → upload to `image-cache` storage bucket
- **Status:** Simple image optimization utility. No tenant issues.

### 6.8 Domain Functions Summary
- **`domain-api` (326 lines):** CRUD on `domains` table. Proper auth via `users.role`. Uses `tenant_id` correctly.
- **`vercel-domain` (212 lines):** Adds/removes domains from Vercel project via API. Logs to `saas_audit_trail`.
- **`verify-domain` (390 lines):** DNS verification (TXT record, CNAME check). Proper auth via `tenant_members` role.

---

## 7. Edge Function Architecture Issues

### 7.1 Auth Pattern Inconsistency
- **Pattern A** (correct): JWT → `auth.getUser(token)` → check `tenant_members` for role → `['owner','admin','developer']`
  - Used by: `website-settings-api`, `page-builder-api`, `media-upload`, `verify-domain`
- **Pattern B**: JWT → `auth.getUser(token)` → check `users.role` directly
  - Used by: `domain-api`, `vercel-domain`
- **Pattern C**: No auth (public)
  - Used by: `form-submission-api` (POST), `generate-sitemap`, `optimize-image`

### 7.2 Direct DB Queries vs Edge Functions
Admin portal does ALL data access via direct Supabase client, ignoring edge functions entirely:
- Services CRUD — `supabase.from('services')` directly
- Testimonials CRUD — `supabase.from('testimonials')` directly
- Portfolio CRUD — `supabase.from('portfolio_cases')` directly
- Translations — `supabase.from('translations')` directly
- Site Settings — `supabase.from('site_settings')` directly
- MediaLibrary — `supabase.storage.from('media')` directly (not `media-upload` edge fn)

Dev Portal also mostly uses direct queries, NOT the edge functions:
- AnimationSettings/ButtonCardStyles/IntegrationSettings — `supabase.from('website_settings')` directly
- Pages — uses `usePages` hook which does `supabase.from('pages')` directly (NOT `page-builder-api`)
- Themes — `useTheme` hook does `supabase.from('website_themes')` directly
- Navigation — `useNavigation` hook does `supabase.from('navigation_menus')` directly

**All website edge functions are deployed but essentially UNUSED.**

### 7.3 Schema Mismatch Summary

| Code Location | column used | Actual Column | Table |
|---|---|---|---|
| AnimationSettings.jsx L105, L127 | `clinic_id` | `tenant_id` | `website_settings` |
| ButtonCardStyles.jsx L109, L131, L134 | `clinic_id` | `tenant_id` | `website_settings` |
| IntegrationSettings.jsx L92, L114, L117 | `clinic_id` | `tenant_id` | `website_settings` |
| PreviewMode.jsx | `clinic_id` + `website_pages` | `tenant_id` + `pages` | `website_settings` / `pages` |
| page-builder-api edge fn | `website_pages` | `pages` | — |
| generate-sitemap edge fn | `website_pages` | `pages` | — |
| TestimonialForm.jsx | `patient_name`, `content_en`, `is_approved`, `branch_id`, `treatment_type` | `patient_name_en`, `text_en`, none, none, `treatment_en` | `testimonials` |
| TranslationList.jsx | `value_en`, `value_ar`, `category` | `en`, `ar`, `page`/`section` | `translations` |
| TourismPackageForm.jsx | `duration`, `price_from`, `price_to`, `includes_en`, `includes_ar`, `is_featured` | `duration_days`, `price_usd`, `includes_json` | `tourism_packages` |

---

## 8. Summary of Problems to Fix

| # | Problem | Severity | Fix Strategy |
|---|---------|----------|--------------|
| 1 | **Dev Portal uses `clinic_id` — column doesn't exist** | 🔴 Critical | Change to `tenant_id` in AnimationSettings, ButtonCardStyles, IntegrationSettings, PreviewMode |
| 2 | **Edge functions use `website_pages` — table doesn't exist** | 🔴 Critical | Change to `pages` in page-builder-api, generate-sitemap |
| 3 | **Testimonials schema mismatch** — form writes 7 columns that don't exist | 🔴 Critical | Create migration to add missing columns OR fix form to use existing columns |
| 4 | **Translations schema mismatch** — `value_en`/`value_ar`/`category` don't exist | 🔴 Critical | Create migration OR fix code |
| 5 | **Tourism packages schema mismatch** — `duration`, `price_from`, `price_to`, etc. | 🔴 Critical | Create migration OR fix code |
| 6 | **9 admin pages have ZERO tenant filtering** | 🔴 Critical | Add `.eq('tenant_id', tenantId)` + use `useUnifiedTenantContext` |
| 7 | Services dual columns (name_en + title_en) | 🔴 High | Pick ONE set and migrate all code |
| 8 | Two media tables (`media` + `media_library`) | 🔴 High | Consolidate + use `media-upload` edge fn |
| 9 | MediaLibrary.jsx bypasses `media-upload` edge function | 🟡 Medium | Refactor to use edge fn or use `media_library` table |
| 10 | Two settings tables (`site_settings` + `website_settings`) | 🟡 Medium | Define clear separation or merge |
| 11 | `translations.key` UNIQUE without tenant scope | 🔴 High | Change to `UNIQUE(tenant_id, key)` |
| 12 | All edge functions deployed but UNUSED | 🟡 Medium | Either use them or remove them |
| 13 | `content_locks` / `team_members` missing tenant_id | 🟡 Medium | Add tenant_id |
| 14 | Old public pages (`src/pages/`) have zero tenant filtering | 🔴 High | These are legacy — use `src/public/pages/` instead |
| 15 | `template-api` GET returns ALL tenants' templates | 🟡 Medium | Add tenant_id scoping |
