# Admin Portal — Website Pages Full Scan

**Date:** February 15, 2026  
**Purpose:** Complete inventory of all Admin Portal pages related to website content management, including data access patterns, tenant isolation status, and known issues.

---

## 1. Admin Portal Website Sidebar

Current sidebar under **"Website Content"** section:

| # | Label | Route | Component | Lines |
|---|-------|-------|-----------|-------|
| 1 | Services | `/services` | ServiceList / ServiceForm | 305 + 593 |
| 2 | Tourism Packages | `/tourism-packages` | TourismPackageList / TourismPackageForm | 284 + 526 |
| 3 | Portfolio | `/portfolio` | PortfolioList / PortfolioForm | 315 + 424 |
| 4 | Testimonials | `/testimonials` | TestimonialList / TestimonialForm | 298 + 446 |
| 5 | Translations | `/translations` | TranslationList | 509 |
| 6 | Media Library | `/media` | MediaLibrary | 901 |
| 7 | Content Editor | `/website/content` | ContentEditor | 736 |
| 8 | Form Submissions | `/form-submissions` | FormSubmissionsList | 383 |
| 9 | Theme / Design | `/theme` | ThemeSelector | 834 |

**Also related but in "Settings" section:**
| Label | Route | Component | Lines |
|-------|-------|-----------|-------|
| Site Settings | `/settings` | SiteSettings | 1,312 |

**Total admin website code: ~6,866 lines (9 sidebar pages + SiteSettings)**

---

## 2. Page-by-Page Analysis

### 2.1 ServiceList.jsx (305 lines) ✅ Fixed
- **Table:** `services`
- **Tenant:** ✅ Uses `useTenant()` → `.eq('tenant_id', tenantId)` (recently fixed)
- **Columns queried:** `title_en, title_ar, category, price_from, price_to, is_active, is_featured, display_order, image_url`
- **⚠️ Issue:** Queries CMS columns (title_en, price_from) added in migration 083. Original clinical columns (name_en, price_min) also exist. Dual column problem.

### 2.2 ServiceForm.jsx (593 lines) ✅ Fixed
- **Table:** `services`
- **Tenant:** ✅ Uses `useTenant()` → sets `tenant_id` on insert (recently fixed)
- **Columns written:** `title_en, title_ar, description_en, description_ar, short_description_en, short_description_ar, category, price_from, price_to, duration_minutes, features_en, features_ar, image_url, is_active, is_featured, display_order`
- **Also writes:** `name_en = title_en, name_ar = title_ar` (backfill for compatibility)
- **⚠️ Issue:** Writes to both CMS columns AND backfills to clinical columns. If clinical code writes to name_en directly, CMS columns won't sync back.

### 2.3 ServiceMaterialsManager.jsx (441 lines)
- **Table:** `service_materials`, `services`, `inventory_items`
- **Tenant:** ❌ No tenant filter
- **Purpose:** Manage materials/supplies needed per service (clinical, not website-facing)

### 2.4 TestimonialList.jsx (298 lines) 🔴 No Tenant + Schema Mismatch
- **Table:** `testimonials`
- **Tenant:** ❌ **NO** `useTenant()`, **NO** `.eq('tenant_id', ...)` 
- **Query L35:** `supabase.from('testimonials').select('*').order('created_at', { ascending: false })` — fetches ALL testimonials across ALL tenants
- **Delete L64:** `supabase.from('testimonials').delete().eq('id', id)` — can delete any tenant's testimonial
- **Toggle L78:** `supabase.from('testimonials').update({ is_approved: !currentStatus }).eq('id', id)` — 🔴 `is_approved` column doesn't exist in schema
- **Frontend filters on:** `patient_name` (🔴 doesn't exist, schema has `patient_name_en`), `content_en` (🔴 doesn't exist, schema has `text_en`)

### 2.5 TestimonialForm.jsx (446 lines) 🔴 No Tenant + MAJOR Schema Mismatch
- **Table:** `testimonials`, also reads `doctors` and `branches` (both without tenant filter)
- **Tenant:** ❌ **NO** tenant filter on any query
- **Doctors query L37:** `supabase.from('doctors').select('id, name_en')` — loads ALL doctors across tenants
- **Branches query L38:** `supabase.from('branches').select('id, name_en')` — loads ALL branches
- **Columns WRITTEN vs ACTUAL SCHEMA:**

| Form writes | Schema has | Match? |
|---|---|---|
| `patient_name` | `patient_name_en` | 🔴 NO |
| `patient_name_ar` | `patient_name_ar` | ✅ OK |
| `content_en` | `text_en` | 🔴 NO |
| `content_ar` | `text_ar` | 🔴 NO |
| `treatment_type` | `treatment_en` / `treatment_ar` | 🔴 NO |
| `patient_avatar` | `photo_url` | 🔴 NO |
| `is_approved` | (doesn't exist) | 🔴 NO |
| `branch_id` | (doesn't exist) | 🔴 NO |
| `doctor_id` | (doesn't exist) | 🔴 NO |
| `rating` | `rating` | ✅ OK |
| `video_url` | `video_url` | ✅ OK |
| `is_featured` | `is_featured` | ✅ OK |
| `is_active` | `is_active` | ✅ OK |

**Impact:** 7 out of 14 columns written by the form don't exist in the database. Inserts/updates silently ignore these columns — testimonials appear created but are missing most data.

### 2.6 PortfolioList.jsx (315 lines) 🔴 No Tenant
- **Table:** `portfolio_cases`
- **Tenant:** ❌ **NO** tenant filter
- **Problem:** Shows all portfolio cases from all tenants.

### 2.7 PortfolioForm.jsx (424 lines) 🔴 No Tenant
- **Table:** `portfolio_cases`, `doctors`
- **Tenant:** ❌ **NO** tenant filter
- **Problem:** Creates portfolio without tenant_id. Loads all doctors across tenants.

### 2.8 TranslationList.jsx (509 lines) 🔴 No Tenant + Schema Mismatch
- **Table:** `translations`
- **Tenant:** ❌ **NO** tenant filter
- **Query L101:** `supabase.from('translations').select('*')` — fetches ALL translations globally
- **Seed L128:** `supabase.from('translations').upsert(defaultTranslations, { onConflict: 'key' })` — seeds 60+ default translations
- **Save L148:** `supabase.from('translations').upsert({ key, value_en, value_ar, category }, { onConflict: 'key' })`
- **Columns WRITTEN vs ACTUAL SCHEMA:**

| Form writes | Schema has | Match? |
|---|---|---|
| `value_en` | `en` | 🔴 NO |
| `value_ar` | `ar` | 🔴 NO |
| `category` | `page` / `section` | 🔴 NO |
| `key` | `key` | ✅ OK |

**Impact:** 3 out of 4 data columns don't exist. Translations are saved with only `key` — the actual translation values are lost. Additionally, `UNIQUE(key)` without tenant scoping means tenants compete for key ownership.

### 2.9 SiteSettings.jsx (1,312 lines) 🔴 No Tenant
- **Table:** `site_settings`  
- **Tenant:** ❌ **NO** tenant filter
- **Load L562:** `supabase.from('site_settings').select('*')` — loads ALL settings rows
- **Save L596:** For each category: `supabase.from('site_settings').upsert({ key: category, value: settings[category], category, updated_at }, { onConflict: 'key' })`
- **Problem:** All tenants share the same settings. Upsert on `key` conflict — last writer wins.
- **Note:** `site_settings` table is SEPARATE from `website_settings` table. Dev Portal writes to `website_settings`, Admin writes to `site_settings`. No connection.
- **Categories managed:** general, contact, seo, branding, social, notifications, privacy, appearance

### 2.10 MediaLibrary.jsx (901 lines) ⚠️ Storage, No Tenant Path
- **Storage API:** `supabase.storage.from('media')`
- **NOT using:** `media` database table NOR `media_library` database table — only Supabase Storage API
- **NOT using:** `media-upload` edge function (which properly uses `media_library` table + tenant path isolation)
- **Tenant:** ❌ No tenant path isolation. Lists root of `media` bucket.
- **Load L49:** `supabase.storage.from('media').list(currentPath, { limit: 100 })` — lists whatever `currentPath` is (starts at root)
- **Upload L89:** `supabase.storage.from('media').upload(filePath, file)` — uploads to `currentPath/timestamp_filename`
- **Delete L119:** `supabase.storage.from('media').remove([fullPath])`
- **Problem:** All tenants share the same bucket root. No `{tenantId}/` prefix. Files are mixed together. The `media-upload` edge function correctly uses `{tenantId}/` prefix, but MediaLibrary.jsx doesn't call it.

### 2.11 ThemeSelector.jsx (834 lines) ✅ Has Tenant
- **Hook:** `useTheme(tenantId)`
- **Table:** `website_themes`
- **Tenant:** ✅ Uses `useTenant()` → passes tenantId to hook
- **Status:** ✅ Works correctly (recently fixed from `currentTenant` → `tenantId`)

### 2.12 ContentEditor.jsx (736 lines) ✅ Has Tenant
- **Hook:** `useWebsiteContent(tenantId)` for pages tab
- **Direct queries:** `page_versions`, `content_drafts`, `content_change_log` — all with `.eq('tenant_id', tenantId)`
- **Tenant:** ✅ Proper tenant filtering on all queries
- **Tabs:** Pages (edit content), History (versions), Drafts (approval flow), Log (audit trail)
- **Status:** ✅ Recently consolidated and rewritten with Dashboard styling

### 2.13 FormSubmissionsList.jsx (383 lines) ✅ Has Tenant
- **Table:** `form_submissions`
- **Tenant:** ✅ Uses `useTenant()` → `.eq('tenant_id', tenantId)`
- **Status:** ✅ Proper tenant filtering

### 2.14 TourismPackageList.jsx (284 lines) 🔴 No Tenant
- **Table:** `tourism_packages`
- **Tenant:** ❌ **NO** tenant filter
- **Query L34:** `supabase.from('tourism_packages').select('*').order('sort_order')` — ALL packages
- **Toggle L64:** `supabase.from('tourism_packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id)` — can toggle any tenant's packages

### 2.15 TourismPackageForm.jsx (526 lines) 🔴 No Tenant + Schema Mismatch
- **Table:** `tourism_packages`, Supabase Storage `public` bucket
- **Tenant:** ❌ **NO** tenant filter
- **Image upload:** Goes to `supabase.storage.from('public').upload('tourism/...')` — shared path, no tenant isolation
- **Columns WRITTEN vs ACTUAL SCHEMA:**

| Form writes | Schema has | Match? |
|---|---|---|
| `name_en`, `name_ar` | `name_en`, `name_ar` | ✅ OK |
| `description_en` | (doesn't exist) | 🔴 NO |
| `description_ar` | (doesn't exist) | 🔴 NO |
| `duration` (string) | `duration_days` (integer) | 🔴 NO |
| `price_from` | `price_usd` | 🔴 NO |
| `price_to` | (doesn't exist) | 🔴 NO |
| `includes_en` (array) | `includes_json` (JSONB) | 🔴 NO |
| `includes_ar` (array) | (doesn't exist) | 🔴 NO |
| `is_featured` | (doesn't exist) | 🔴 NO |
| `is_active` | `is_active` | ✅ OK |
| `sort_order` | `sort_order` | ✅ OK |
| `image_url` | `image_url` | ✅ OK |

**Impact:** 8 out of 12 columns mismatch. Tourism package form saves basically only the name, image_url, is_active, and sort_order. Descriptions, pricing, duration, includes, and featured status are silently dropped.

---

## 3. Tenant Isolation Status Summary

### ✅ Pages WITH Tenant Filtering (4/10)

| Page | How |
|------|-----|
| ServiceList | `useTenant()` → `.eq('tenant_id', tenantId)` |
| ServiceForm | `useTenant()` → sets `tenant_id` on insert |
| ContentEditor | `useTenant()` → tenant filter on all 4 tabs |
| FormSubmissionsList | `useTenant()` → `.eq('tenant_id', tenantId)` |
| ThemeSelector | `useTenant()` → passes to `useTheme(tenantId)` |

### 🔴 Pages WITHOUT Tenant Filtering (9/10)

| Page | Table | Impact |
|------|-------|--------|
| **TestimonialList** | `testimonials` | Shows all tenants' testimonials |
| **TestimonialForm** | `testimonials` | Creates without tenant_id |
| **PortfolioList** | `portfolio_cases` | Shows all tenants' portfolio |
| **PortfolioForm** | `portfolio_cases` | Creates without tenant_id |
| **TranslationList** | `translations` | Shows all tenants' translations, unique key conflict |
| **SiteSettings** | `site_settings` | All tenants share same settings |
| **MediaLibrary** | Storage `media` bucket | All tenants share same folder |
| **TourismPackageList** | `tourism_packages` | Shows all tenants' packages |
| **TourismPackageForm** | `tourism_packages` | Creates without tenant_id |

---

## 4. Database Table → Admin Page Mapping

| Database Table | Admin Page | Tenant Filter | Edge Function Available |
|----------------|------------|:---:|:---:|
| `services` | ServiceList/Form | ✅ | ❌ (direct query) |
| `testimonials` | TestimonialList/Form | ❌ | ❌ |
| `portfolio_cases` | PortfolioList/Form | ❌ | ❌ |
| `tourism_packages` | TourismPackageList/Form | ❌ | ❌ |
| `translations` | TranslationList | ❌ | ❌ |
| `site_settings` | SiteSettings | ❌ | ❌ |
| `media` (Storage) | MediaLibrary | ❌ | ✅ `media-upload` (unused) |
| `website_themes` | ThemeSelector | ✅ | ❌ |
| `pages` | ContentEditor | ✅ | ✅ `page-builder-api` (unused) |
| `content_drafts` | ContentEditor (Drafts tab) | ✅ | ❌ |
| `content_change_log` | ContentEditor (Log tab) | ✅ | ❌ |
| `page_versions` | ContentEditor (History tab) | ✅ | ❌ |
| `form_submissions` | FormSubmissionsList | ✅ | ✅ `form-submission-api` (unused) |

**Pattern:** All admin pages use **direct Supabase client queries** from the browser. None call edge functions. Edge functions exist but are completely unused by the admin portal.

---

## 5. Public Website Pages (Two Sets!)

### 5.1 Legacy Pages (`src/pages/`) — NO Tenant

| File | Lines | Data Source | Tenant Filter |
|------|-------|-------------|:---:|
| `Home.jsx` | ~200 | **HARDCODED** services array | ❌ |
| `Services.jsx` | ~150 | `supabase.from('services')` | ❌ |
| `Portfolio.jsx` | ~150 | `supabase.from('portfolio_cases')` | ❌ |
| `Testimonials.jsx` | ~150 | `supabase.from('testimonials')` | ❌ |
| `DentalTourism.jsx` | ~200 | `supabase.from('tourism_packages')` | ❌ |
| `Contact.jsx` | ~150 | Static / form | ❌ |
| `WhoWeAre.jsx` | ~100 | Static | ❌ |

**Problem:** None have tenant_id filtering. They show data from ALL tenants.

### 5.2 New Public Pages (`src/public/pages/`) — HAS Tenant

| File | Tenant Refs | Supabase Refs |
|------|:-----------:|:-------------:|
| `HomePage.jsx` | 4 | 3 |
| `ServicesPage.jsx` | 4 | 3 |
| `AboutPage.jsx` | 4 | 3 |
| `DoctorsPage.jsx` | 4 | 3 |
| `ContactPage.jsx` | 3 | 3 |
| `BookingPage.jsx` | 8 | 8 |
| `BlogPage.jsx` | 4 | 3 |
| `BlogPostPage.jsx` | 5 | 5 |
| `DynamicPage.jsx` | 3 | 0 |

**These are tenant-aware!** But it's unclear which set is actually used in production.

---

## 6. Known Problems Summary

### 6.1 Critical — Tenant Isolation

| # | Problem | Affected Pages | Severity |
|---|---------|----------------|----------|
| 1 | 9 admin pages have NO tenant_id filter | Testimonials, Portfolio, Translations, SiteSettings, MediaLibrary, Tourism | 🔴 Data leak across tenants |
| 2 | Legacy public pages have NO tenant filter | Home, Services, Portfolio, Testimonials, Tourism | 🔴 Shows all tenants' data |
| 3 | MediaLibrary uses shared bucket with no tenant folder isolation | MediaLibrary | 🔴 Cross-tenant file access |

### 6.2 Data Architecture

| # | Problem | Detail |
|---|---------|--------|
| 4 | **Two sets of public website pages** | `src/pages/` (legacy, no tenant) vs `src/public/pages/` (new, has tenant). Unclear which is active. |
| 5 | **Services dual columns** | `name_en` + `title_en`, `price_min` + `price_from` — keeps going out of sync |
| 6 | **SiteSettings vs website_settings** | Admin SiteSettings writes to `site_settings` table. Dev Portal pages write to `website_settings` table. Two separate configs. |
| 7 | **translations UNIQUE(key)** | Should be `UNIQUE(tenant_id, key)` for multi-tenant. Currently blocks tenants from having independent translations. |
| 8 | **Edge functions deployed but unused** | `media-upload`, `page-builder-api`, `form-submission-api`, `website-settings-api` all exist but admin uses direct browser queries instead. |
| 9 | **Home.jsx hardcoded data** | Legacy Home page has hardcoded services/team data. Ignores database. |

### 6.3 Missing Features

| # | Problem | Detail |
|---|---------|--------|
| 10 | No image upload in ServiceForm | Service images are URL text fields, no file upload |
| 11 | No image upload in TestimonialForm | Testimonial photos are URL text fields |
| 12 | No image upload in PortfolioForm | Before/after images are URL text fields |
| 13 | No image upload in TourismPackageForm | Package images go to `public` bucket (wrong bucket) |

---

## 7. Admin Website File Inventory

| Directory | Files | Total Lines |
|-----------|-------|-------------|
| `src/admin/pages/services/` | 3 (List, Form, MaterialsManager) | 1,339 |
| `src/admin/pages/testimonials/` | 2 (List, Form) | 744 |
| `src/admin/pages/portfolio/` | 2 (List, Form) | 739 |
| `src/admin/pages/tourism/` | 2 (List, Form) | 810 |
| `src/admin/pages/translations/` | 1 (List) | 509 |
| `src/admin/pages/media/` | 1 (MediaLibrary) | 901 |
| `src/admin/pages/website/` | 2 (ContentEditor, ThemeSelector) | 1,570 |
| `src/admin/pages/form-submissions/` | 1 (List) | 383 |
| `src/admin/pages/settings/` | 1 (SiteSettings - partial) | 1,312 |
| **Total** | **15 files** | **~8,307 lines** |

---

## 8. Relationship: Admin ↔ Dev Portal ↔ Public Website

```
ADMIN PORTAL (Clinic Staff)              DEV PORTAL (Developer)              PUBLIC WEBSITE (Patients)
─────────────────────────                ────────────────────                ──────────────────────────
                                          
Services      → services table    ←─── (no connection) ──────→  ServicesPage reads services
Testimonials  → testimonials      ←─── (no connection) ──────→  Testimonials reads testimonials  
Portfolio     → portfolio_cases   ←─── (no connection) ──────→  Portfolio reads portfolio_cases
Tourism       → tourism_packages  ←─── (no connection) ──────→  DentalTourism reads tourism_packages
Translations  → translations      ←─── (no connection) ──────→  (not connected to public pages)
SiteSettings  → site_settings     ←─── (no connection) ──────→  (not connected to public pages)
                                          
ContentEditor → pages.content     ←─── PageBuilder → pages.structure ──→  DynamicPage reads pages
                                          
ThemeSelector → website_themes    ←─── ThemeSettings → website_themes ──→  (theme applied to website)
                                          
MediaLibrary  → Storage:media     ←─── (no connection) ──────→  (images referenced by URL)
                                          
FormSubmissions ← form_submissions ←── (no connection) ──────←  Contact form submits
                                          
                                   Animations → website_settings
                                   ButtonStyles → website_settings  
                                   SEO → website_settings
                                   Integrations → website_settings
                                   Navigation → navigation_menus
                                   Templates → section/page_templates
                                   Domains → domains
```

**Key Insight:** Admin and Dev Portal both write to the same tables but with different column expectations and no coordination layer. The public website reads from the same tables but often without tenant filtering.
---

## 9. Deep Scan: Complete Schema Mismatch Summary

Three admin pages write to columns that **do not exist** in the respective database tables. These operations silently fail — the form appears to save, but the data is dropped.

### 9.1 TestimonialForm → `testimonials` table
- **7 of 14 columns** written by the form don't exist in the schema
- Missing in schema: `patient_name` (has `patient_name_en`), `content_en`/`content_ar` (has `text_en`/`text_ar`), `treatment_type` (has `treatment_en`/`treatment_ar`), `patient_avatar` (has `photo_url`), `is_approved`, `branch_id`, `doctor_id`
- **Fix options:** (A) Add ALTER TABLE to create missing columns, or (B) change form to use existing column names

### 9.2 TranslationList → `translations` table
- **3 of 4 data columns** don't exist
- Missing in schema: `value_en` (has `en`), `value_ar` (has `ar`), `category` (has `page`/`section`)
- **Fix options:** (A) Rename columns in DB, or (B) change form code

### 9.3 TourismPackageForm → `tourism_packages` table
- **8 of 12 columns** mismatch
- Missing in schema: `description_en`, `description_ar`, `duration` (has `duration_days`), `price_from`/`price_to` (has `price_usd`), `includes_en`/`includes_ar` (has `includes_json`), `is_featured`
- **Note:** Migration 078 (seed data) also uses `description_en`/`description_ar` which don't exist — seed data was likely never inserted either
- **Fix options:** (A) Create migration to add missing columns, or (B) rewrite form to match existing schema

### 9.4 Portfolio — OK  
- PortfolioForm columns match `portfolio_cases` schema ✅
- **Only issue:** No `tenant_id` on insert

### 9.5 Recommended Fix Strategy
**Option A (Add columns):** for each table, `ALTER TABLE ADD COLUMN IF NOT EXISTS` for all missing columns. This is the simplest fix but adds more columns to already wide tables.

**Option B (Rewrite code):** for each form, change field names to match existing schema. This requires careful field mapping but keeps schema clean.

**Recommendation:** Mix — use Option A for `testimonials` (the form field names are better than the schema names), use Option B for `translations` (rename in code), and use Option A for `tourism_packages` (form has richer fields than schema).