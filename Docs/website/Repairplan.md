# Website System — Master Repair Plan (Deep Analysis v2)

**Date:** February 15, 2026  
**Based on:** [supabasewebsite.md](supabasewebsite.md), [devportalwebsite.md](devportalwebsite.md), [adminappwebsite.md](adminappwebsite.md) + full codebase deep scan  
**Total issues found:** 47 bugs/issues across 4 systems + database  
**Estimated files to modify:** ~30 files + 1 new migration

---

## Executive Summary

The website system has **7 categories of problems**, including 3 **architecture-level** disconnections discovered during deep code tracing:

| Category | Count | Severity |
|----------|-------|----------|
| **A. Architecture Disconnection** — PublicApp not mounted, TenantRouter dead code, 2 separate website systems | 3 systems | 🔴🔴 BLOCKER |
| **B. Settings Data Model Mismatch** — Dev Portal writes JSONB cols that don't exist, hooks use nested structure vs flat DB | 5 files + 1 hook | 🔴 Critical |
| **C. Schema Mismatches** — Code writes to DB columns that don't exist | 3 tables | 🔴 Critical |
| **D. Wrong Column/Table Names** — Dev Portal uses `clinic_id` / `website_pages` | 4 files + 2 edge fns | 🔴 Critical |
| **E. Missing Tenant Isolation** — Admin pages show all tenants' data | 9 pages | 🔴 Critical |
| **F. Missing Tables** — `contact_submissions` and `contact_settings` don't exist | 2 tables | 🔴 Critical |
| **G. Duplicate/Conflicting Systems** — services dual cols, 2 media tables, 2 settings tables, unused edge fns | 8 items | 🟡 Medium |

**Repair strategy:** Fix in dependency order — Architecture decisions first (A), then DB schema (B+C+F), then code fixes (D+E), then consolidation (G).

---

## DEEP ANALYSIS: Architecture & Connection Map

### The 3 Separate App Entry Points

The system has 3 completely separate Vite entry points that never share routing:

| App | Entry HTML | Entry JS | Port | Router |
|-----|-----------|----------|------|--------|
| **Admin + Dev** | `index.html` | `src/main.jsx` → `App.jsx` | 5173 | Direct `Routes/Route` |
| **Legacy Website** | `website.html` | `src/website/main.jsx` → `WebsiteApp.jsx` | 5174 | Own routes |
| **Developer Portal** | `developer.html` | `src/developer/main.jsx` | 9000 | Own routes |

### BLOCKER 1: PublicApp Is Dead Code

`src/public/PublicApp.jsx` is a complete multi-tenant public website with:
- 8 page routes (Home, Services, Doctors, About, Contact, Book, Blog, DynamicPage)
- Proper `tenantId` prop passing to all pages
- `PublicLayout` that reads `website_settings` and applies theme CSS variables
- `DynamicPage` that renders page builder JSONB from `pages` table
- Language routing (`/ar/` prefix)

**BUT IT IS NEVER MOUNTED:**
- `App.jsx` L59-71: Routes `/*` → AdminApp (protected), `/developer/*` → DeveloperApp. No public route.
- `TenantRouter.jsx` exists and would route to PublicApp based on domain — BUT App.jsx doesn't use TenantRouter. It uses direct `<Routes>`.
- `WebsiteApp.jsx` uses its own legacy pages from `src/pages/`, NOT `src/public/`.

**Result:** The entire page builder output (pages table, section rendering, dynamic routing) has NO way to reach end users.

### BLOCKER 2: Legacy Website Has No Multi-Tenant

`WebsiteApp.jsx` (port 5174):
- Initializes with `<ThemeProvider tenantId={null}>`
- Legacy pages in `src/pages/` query Supabase WITHOUT any tenant_id filter
- `Home.jsx` is 100% hardcoded (no DB queries, static arrays)
- `Services.jsx` queries `services` with `is_active=true` only — shows ALL tenants' services
- Uses `PageGate` to check if a slug exists in `pages` table (as on/off switch), but renders hardcoded React components, NOT page builder content

### BLOCKER 3: Settings Data Model Is Fundamentally Broken

The `website_settings` table (migration 050) has **40+ flat columns**:
```
primary_color VARCHAR(7), animation_style VARCHAR(50), button_radius INTEGER,
google_analytics_id VARCHAR(50), contact_email VARCHAR(255), ...
```

But 3 different consumers expect 3 different data shapes:

| Consumer | Expected Shape | What It Reads/Writes |
|----------|---------------|---------------------|
| **Dev Portal pages** (AnimationSettings, ButtonCardStyles, IntegrationSettings) | **Single JSONB columns** | `.select('animation_settings')` → writes `{ clinic_id, animation_settings: {...} }` — COLUMNS DON'T EXIST |
| **useWebsiteSettings hook** | **Nested objects** | Defaults: `{ theme: { primaryColor }, navigation: { items }, seo: { defaultTitle } }` — `theme`, `navigation`, `seo` ARE NOT COLUMNS |
| **PublicLayout** | **Nested `settings.theme`** | Reads `settings.theme.primaryColor` to set CSS vars — but DB row is flat: `primary_color` |

**Complete data flow breakdown:**
```
Dev Portal saves → animation_settings JSONB (column doesn't exist) → FAILS SILENTLY
Hook reads → flat row → wraps in defaults → { theme: undefined, ... } → theme is never populated
PublicLayout → reads settings.theme?.primaryColor → undefined → falls back to defaults
```

**Nothing connects. Every write fails. Every read gets defaults.**

### BLOCKER 4: Themes Go Nowhere

Two completely separate theme systems:
1. `website_themes` table + `useTheme` hook + `WebsiteThemeSettings.jsx` (Dev Portal) — saves to `website_themes` table
2. `website_settings.primary_color/heading_font/etc` columns — the flat settings

PublicLayout reads `website_settings`, NOT `website_themes`. So themes selected in the Dev Portal theme settings page have NO effect on the public website.

### Connection Map (what connects to what)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                                │
│                                                                     │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────────────┐  │
│  │    pages      │  │website_themes │  │   website_settings      │  │
│  │  (tenant_id)  │  │  (tenant_id)  │  │   (tenant_id, 40+ cols)│  │
│  └──┬───────┬───┘  └──────┬────────┘  └───┬──────────┬──────────┘  │
│     │       │              │               │          │             │
│     │       │              │               │          │             │
│  ┌──┴───────┴──┐  ┌───────┴────────┐  ┌───┴──┐   ┌──┴───────────┐│
│  │ form_subs   │  │ testimonials   │  │site_ │   │media_library ││
│  │ (exists)    │  │ portfolio_cases│  │sett. │   │(exists,unused)││
│  └─────────────┘  │ translations   │  └──────┘   └──────────────┘││
│                   │ tourism_pkgs   │                               │
│                   └────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
         │                │                 │              │
    ┌────┘         ┌──────┘          ┌──────┘         ┌────┘
    │              │                 │                 │
┌───┴───────┐  ┌───┴──────────┐  ┌──┴──────────┐  ┌──┴────────────┐
│ DEV PORTAL│  │  ADMIN APP   │  │ PUBLIC SITE │  │ EDGE FUNCTIONS│
│           │  │              │  │             │  │               │
│ Pages ✅   │  │ Testimonials│  │(LEGACY)     │  │ page-builder  │
│ Navigation│  │   ❌ no TID  │  │ NO tenantId │  │  ❌ wrong table│
│  ✅        │  │ Portfolio   │  │ hardcoded   │  │ gen-sitemap   │
│ Themes ✅  │  │   ❌ no TID  │  │             │  │  ❌ wrong table│
│ SEO ⚠️    │  │ Translations│  │(NEW/PUBLIC) │  │ settings-api  │
│  breaks   │  │   ❌ no TID  │  │ ✅ has TID   │  │  ✅ but unused │
│ Animations│  │ SiteSettings│  │ ❌ NOT       │  │ form-submit   │
│  ❌ clinic │  │   ❌ no TID  │  │   MOUNTED   │  │  ✅ but unused │
│ Styles    │  │ Tourism     │  │             │  │ media-upload  │
│  ❌ clinic │  │   ❌ no TID  │  │             │  │  ✅ but unused │
│ Integr.   │  │ MediaLibrary│  │             │  │               │
│  ❌ clinic │  │   ❌ no TID  │  │             │  │               │
│ Preview   │  │   ❌ no bucket│ │             │  │               │
│  ❌ wrong  │  │              │  │             │  │               │
│   table   │  │              │  │             │  │               │
└───────────┘  └──────────────┘  └─────────────┘  └───────────────┘

Legend: ✅ = works correctly, ❌ = broken, ⚠️ = partially broken
TID = tenant_id filtering
```

### Missing Tables (code references tables that don't exist in any migration)

| Table | Referenced By | Should Be |
|-------|-------------|-----------|
| `contact_submissions` | `src/public/pages/ContactPage.jsx` L33 | Use `form_submissions` (type='contact') OR create table |
| `contact_settings` | `src/hooks/pageBuilder/useContactSettings.js` L25 | Use `website_settings` contact columns OR create table |
| `website_pages` | PreviewMode.jsx, page-builder-api, generate-sitemap | Use `pages` table |

### RLS Policy Mismatch

Page builder tables (migration 054) have proper tenant RLS via `get_user_tenant_ids()`:
```sql
USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
```

But admin-managed tables (migration 001) have permissive RLS:
```sql
-- testimonials, portfolio_cases, tourism_packages, translations, site_settings
USING (is_admin_or_developer())  -- ANY admin sees ALL tenants' data!
```

This means even with code-level tenant filtering, these tables have NO RLS-level tenant isolation.

### Edge Functions: ALL Unused

No website edge function is called from any frontend code. They only appear in `ApiCatalog.jsx` as documentation:
```
grep -r "functions.invoke" → only: livekit-token, send-notification, stripe-billing,
verify-domain, generate-invoice-pdf, billing-dunning, billing-plan-change, stripe-sync
```
ZERO calls to: `website-settings-api`, `page-builder-api`, `template-api`, `form-submission-api`, `media-upload`, `generate-sitemap`, `optimize-image`

### `useWebsiteSEO` Is Broken

```js
// useWebsiteSEO.js L10:
const { settings, loading, error, updateSettings } = useWebsiteSettings(tenantId);
//                                  ^^^^^^^^^^^^^^ NOT EXPORTED by useWebsiteSettings!

// useWebsiteSettings.js returns:
{ settings, loading, error, fetchSettings, saveSettings, updateTheme, 
  updateNavigation, updateFooter, updateSEO, setWebsiteEnabled }
// ❌ No `updateSettings` in return object! (_updateSettings exists but isn't returned)
```

When `saveSEO()` is called → `updateSettings({ seo: seoData })` → `undefined is not a function` → crash.

---

## PHASE 0: Architecture Decision (MUST DO FIRST)
**Priority:** 🔴🔴 BLOCKER  
**Decision needed before any code changes**

### The Core Question: Which public website system do we use?

| Option | System | Pros | Cons |
|--------|--------|------|------|
| **A** | Keep Legacy (`src/website/`) | Already running, simpler | No multi-tenant, no page builder, hardcoded |
| **B** | Activate New (`src/public/`) | Multi-tenant, page builder integration, proper architecture | Needs TenantRouter wired up, PublicLayout settings fix |
| **C** | Merge both | Best of both worlds | Most work |

### Recommended: Option B — Activate the New System

**Changes needed:**
1. Replace `App.jsx` direct routing with `TenantRouter`
2. OR: Add public website routes to `WebsiteApp.jsx` using `PublicApp`  
3. Fix `PublicLayout` to read flat columns (not nested `settings.theme`)
4. Fix `ContactPage` to use `form_submissions` instead of `contact_submissions`

**Alternative (simpler):** Keep legacy website for now, focus on fixing Admin + Dev Portal. The public website can be activated later.

### Decision Impacts Everything Else

- If **Option A** (legacy): Skip Phase 7. Focus only on Admin + Dev Portal fixes. Public website stays hardcoded.
- If **Option B** (new): Must fix PublicLayout settings read, wire TenantRouter, fix ContactPage. Full page builder pipeline works.
- If **Option C** (merge): Biggest effort but cleanest result.

---

## PHASE 1: Database Migration (Single Migration File)
**Priority:** 🔴 CRITICAL — Must be done first  
**File:** `supabase/migrations/084_fix_schema_mismatches.sql`  
**Deploy:** Run on remote Supabase after local testing  

This single migration fixes ALL schema mismatches so the existing code can work.
**Priority:** 🔴 CRITICAL — Must be done first  
**File:** `supabase/migrations/084_fix_schema_mismatches.sql`  
**Deploy:** Run on remote Supabase after local testing  

This single migration fixes ALL schema mismatches so the existing code can work.

### 1.1 Fix `testimonials` table — add missing columns

The admin TestimonialForm writes to 8 columns that don't exist. The actual DB schema (migration 001) has:
`patient_name_en, patient_name_ar, treatment_en, treatment_ar, text_en, text_ar, rating, photo_url, video_url, location, date, is_featured, is_active`

But the admin form writes: `patient_name, patient_name_ar, patient_avatar, rating, content_en, content_ar, treatment_type, doctor_id, branch_id, video_url, is_featured, is_approved, is_active`

```sql
-- Testimonials: add columns the admin form expects
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS content_en TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS content_ar TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS treatment_type TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS patient_avatar TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id);

-- Backfill: copy existing data to new columns
UPDATE testimonials SET 
  patient_name = patient_name_en,
  content_en = text_en,
  content_ar = text_ar
WHERE patient_name IS NULL AND patient_name_en IS NOT NULL;
```

**Why add columns instead of renaming:** The admin form field names (`patient_name`, `content_en`, `is_approved`, `doctor_id`) are more intuitive than the original schema names (`patient_name_en`, `text_en`). Adding is safer — no risk of breaking other code.

### 1.2 Fix `translations` table — rename columns + fix uniqueness

The admin TranslationList uses `value_en`/`value_ar`/`category` but schema has `en`/`ar`/`page`. Rename columns in DB to match the code:

```sql
-- Translations: rename columns to match code expectations
ALTER TABLE translations RENAME COLUMN en TO value_en;
ALTER TABLE translations RENAME COLUMN ar TO value_ar;
ALTER TABLE translations ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill category from page column
UPDATE translations SET category = page WHERE category IS NULL AND page IS NOT NULL;

-- Fix multi-tenant uniqueness: drop UNIQUE(key), add UNIQUE(tenant_id, key)
ALTER TABLE translations DROP CONSTRAINT IF EXISTS translations_key_key;
ALTER TABLE translations ADD CONSTRAINT translations_tenant_key UNIQUE (tenant_id, key);
```

**Why rename columns:** `value_en`/`value_ar` is clearer than `en`/`ar`, and the code uses these names in 4+ places including the default translations array. Renaming is simpler than changing all code references.

### 1.3 Fix `tourism_packages` table — add missing columns

The admin TourismPackageForm writes to 6 columns that don't match. The actual DB schema (migration 001) has:
`name_en, name_ar, description_en, description_ar, duration_days INTEGER, includes_json JSONB, price_usd DECIMAL, image_url, sort_order, is_active`

But the admin form writes: `name_en, name_ar, description_en, description_ar, duration TEXT, price_from, price_to, includes_en, includes_ar, is_featured, image_url, sort_order, is_active`

Column mismatches: `duration` vs `duration_days`, `price_from/price_to` vs `price_usd`, `includes_en/includes_ar` vs `includes_json`, `is_featured` doesn't exist.

```sql
-- Tourism packages: add columns the admin form expects  
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS price_from DECIMAL(10,2);
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS price_to DECIMAL(10,2);
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS includes_en JSONB DEFAULT '[]';
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS includes_ar JSONB DEFAULT '[]';
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Backfill from existing columns
UPDATE tourism_packages SET 
  duration = duration_days::text || ' days',
  price_from = price_usd
WHERE duration IS NULL AND duration_days IS NOT NULL;
```

### 1.4 Fix `site_settings` uniqueness for multi-tenant

```sql
-- site_settings: fix for multi-tenant
ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_key_key;
ALTER TABLE site_settings ADD CONSTRAINT site_settings_tenant_key UNIQUE (tenant_id, key);
```

### 1.5 Add JSONB columns to `website_settings` (CRITICAL)

The Dev Portal pages write to JSONB columns that DON'T EXIST. The table has 40+ flat columns (primary_color, animation_style, button_radius, etc.) but the code tries to write single JSONB columns:

```sql
-- website_settings: add JSONB columns that Dev Portal pages expect
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS animation_settings JSONB DEFAULT '{}';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS button_card_styles JSONB DEFAULT '{}';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS integration_settings JSONB DEFAULT '{}';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS domain_settings JSONB DEFAULT '{}';
```

### 1.6 Create missing `contact_submissions` table

Public ContactPage inserts into `contact_submissions` but this table doesn't exist in any migration:

```sql
-- Create contact_submissions table (used by public ContactPage)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public can submit contact forms
CREATE POLICY contact_submissions_public_insert ON contact_submissions
  FOR INSERT TO anon WITH CHECK (true);

-- Authenticated users can read their tenant's submissions
CREATE POLICY contact_submissions_tenant_access ON contact_submissions
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());
```

### 1.7 Fix RLS on admin-managed tables (SECURITY)

Current RLS on testimonials/portfolio/tourism/translations/site_settings allows ANY admin to see ALL tenants' data:
```sql
-- CURRENT (insecure): USING (is_admin_or_developer())
-- PROPOSED (secure):  USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
```

```sql
-- Fix testimonials RLS
DROP POLICY IF EXISTS "Admins can manage testimonials" ON testimonials;
CREATE POLICY testimonials_tenant_access ON testimonials
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());

-- Fix portfolio_cases RLS
DROP POLICY IF EXISTS "Admins can manage portfolio" ON portfolio_cases;
CREATE POLICY portfolio_tenant_access ON portfolio_cases
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());

-- Fix tourism_packages RLS
DROP POLICY IF EXISTS "Admins can manage packages" ON tourism_packages;
CREATE POLICY tourism_tenant_access ON tourism_packages
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());

-- Fix translations RLS
DROP POLICY IF EXISTS "Admins can manage translations" ON translations;
CREATE POLICY translations_tenant_access ON translations
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());

-- Fix site_settings RLS
DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
CREATE POLICY site_settings_tenant_access ON site_settings
  FOR ALL TO authenticated
  USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());
```

### 1.8 Add tenant_id to tables that lack it

```sql
-- content_locks: add tenant_id
ALTER TABLE content_locks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- team_members: add tenant_id  
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
```

### Step 1 Verification
After running migration:
- [ ] Check that `testimonials` has `patient_name`, `content_en`, `content_ar`, `treatment_type`, `patient_avatar`, `is_approved`, `branch_id`, `doctor_id`
- [ ] Check that `translations` has `value_en`, `value_ar`, `category` and UNIQUE on `(tenant_id, key)`
- [ ] Check that `tourism_packages` has `duration`, `price_from`, `price_to`, `includes_en`, `includes_ar`, `is_featured`
- [ ] Check that `website_settings` has `animation_settings`, `button_card_styles`, `integration_settings`, `domain_settings` JSONB columns
- [ ] Check that `contact_submissions` table exists with RLS
- [ ] Check that `site_settings` has UNIQUE on `(tenant_id, key)`
- [ ] Check that testimonials/portfolio/tourism/translations/site_settings have updated RLS policies
- [ ] Verify `get_user_tenant_ids()` function exists (from migration 054)

---

## PHASE 2: Fix Wrong Column & Table Names in Code
**Priority:** 🔴 CRITICAL  
**Files to modify:** 7  
**No deployment needed** — these are frontend code fixes

### 2.0 Fix `useWebsiteSettings` hook — export `updateSettings` and fix data model

The hook has a `_updateSettings` function defined but NOT returned. `useWebsiteSEO` calls `updateSettings()` which crashes.

#### File: `src/hooks/pageBuilder/useWebsiteSettings.js`
```diff
  return {
    settings,
    loading,
    error,
    fetchSettings,
    saveSettings,
+   updateSettings: _updateSettings,
    updateTheme,
    ...
  };
```

Also: The hook's `updateTheme`/`updateNavigation`/`updateSEO` methods try to write nested objects (`{ theme: {...} }`) to a flat-column table. After Phase 1 adds the JSONB columns, the Dev Portal pages can write JSONB. But the hook's nested methods will still fail because `theme`, `navigation`, `seo` are not columns. **Recommendation:** Either:
- (A) Refactor hook to write flat columns (`primary_color`, `heading_font`, etc.) — matches DB
- (B) Add `theme JSONB`, `navigation JSONB`, `seo JSONB` columns to the migration — matches hook
- **(C) RECOMMENDED:** Keep flat columns as-is, fix the hook to read/write flat columns, rename prop accessors

### 2.1 Fix Dev Portal `clinic_id` → `tenant_id` (3 files)

These 3 pages use `useParams()` to get `clinicId`, but the route has no `:clinicId` param, so it's `undefined`. They also query `website_settings` with column `clinic_id` which doesn't exist.

**Fix pattern:** Replace `useParams()` with `useTenant()` from Dev Portal TenantContext, and change all `clinic_id` → `tenant_id`.

#### File: `src/developer/pages/website/AnimationSettings.jsx`

**Note:** AnimationSettings has a DIFFERENT `useParams` pattern from the other two. It destructures `{ id: paramTenantId }` and does use `useTenant()` as fallback. But it still writes `clinic_id`:

```diff
- const { id: paramTenantId } = useParams();
- const clinicId = paramTenantId || currentTenant?.id;
+ // Remove useParams entirely — use tenant context only
+ const tenantId = currentTenant?.id;

// L105: fetch
- .select('animation_settings')
- .eq('clinic_id', clinicId)
+ .select('animation_settings')
+ .eq('tenant_id', tenantId)

// L127-134: upsert
- clinic_id: clinicId,
+ tenant_id: tenantId,
- }, { onConflict: 'clinic_id' });
+ }, { onConflict: 'tenant_id' });
```

#### File: `src/developer/pages/website/ButtonCardStyles.jsx`

```diff
- import { useParams } from 'react-router-dom';
+ import { useTenant } from '../../contexts/TenantContext';

- const { clinicId } = useParams();
+ const { tenant, selectedTenant } = useTenant();
+ const tenantId = (tenant || selectedTenant)?.id;
```
Then replace `clinic_id` → `tenant_id` at lines 109, 131, 134.

#### File: `src/developer/pages/website/IntegrationSettings.jsx`
Same pattern — replace at lines 92, 114, 117.

### 2.2 Fix Dev Portal `PreviewMode.jsx` — wrong table + wrong column

#### File: `src/developer/pages/website/PreviewMode.jsx`
```diff
- import { useParams } from 'react-router-dom';
+ import { useTenant } from '../../contexts/TenantContext';

- const { clinicId } = useParams();
+ const { tenant, selectedTenant } = useTenant();
+ const tenantId = (tenant || selectedTenant)?.id;

// Query fix:
- .from('website_pages')
+ .from('pages')
- .eq('clinic_id', clinicId)
+ .eq('tenant_id', tenantId)
```

### 2.3 Fix Edge Function `page-builder-api` — wrong table name

#### File: `supabase/functions/page-builder-api/index.ts`
```diff
// ALL occurrences (GET, POST, PUT, DELETE):
- .from('website_pages')
+ .from('pages')
```

### 2.4 Fix Edge Function `generate-sitemap` — wrong table name

#### File: `supabase/functions/generate-sitemap/index.ts`
```diff
- .from('website_pages')
+ .from('pages')
```

### Step 2 Verification
- [ ] AnimationSettings loads/saves animation data for selected tenant
- [ ] ButtonCardStyles loads/saves button/card styles for selected tenant
- [ ] IntegrationSettings loads/saves integration config for selected tenant
- [ ] PreviewMode loads pages from correct `pages` table with correct `tenant_id`
- [ ] `page-builder-api` edge function queries correct `pages` table
- [ ] `generate-sitemap` edge function queries correct `pages` table
- [ ] Build succeeds: `npm run build`

---

## PHASE 3: Add Tenant Isolation to Admin Pages
**Priority:** 🔴 CRITICAL — data leak across tenants  
**Files to modify:** 9 admin pages  
**Pattern:** Import `useTenant` → destructure `tenantId` → add `.eq('tenant_id', tenantId)` to all queries + add `tenant_id` on insert

### Reference Pattern (from already-fixed ServiceList)
```jsx
import { useTenant } from '../../contexts/TenantContext';
// Inside component:
const { tenantId } = useTenant();
// On fetch:
.from('tablename').select('*').eq('tenant_id', tenantId)
// On insert:
.from('tablename').insert({ ...payload, tenant_id: tenantId })
```

### 3.1 TestimonialList.jsx
| Change | Detail |
|--------|--------|
| Import | `import { useTenant } from '../../contexts/TenantContext';` |
| Destructure | `const { tenantId } = useTenant();` |
| Fetch L35 | Add `.eq('tenant_id', tenantId)` |
| Add dependency | Add `tenantId` to `useCallback` deps + `useEffect` deps |
| Early return | If `!tenantId` show "Select a tenant" message |

### 3.2 TestimonialForm.jsx
| Change | Detail |
|--------|--------|
| Import | `import { useTenant } from '../../contexts/TenantContext';` |
| Destructure | `const { tenantId } = useTenant();` |
| Doctors query L37 | Add `.eq('tenant_id', tenantId)` |
| Branches query L38 | Add `.eq('tenant_id', tenantId)` |
| Insert L119 | Add `tenant_id: tenantId` to payload |

### 3.3 PortfolioList.jsx
| Change | Detail |
|--------|--------|
| Import | `import { useTenant } from '../../contexts/TenantContext';` |
| Destructure | `const { tenantId } = useTenant();` |
| Fetch L35 | Add `.eq('tenant_id', tenantId)` |

### 3.4 PortfolioForm.jsx
| Change | Detail |
|--------|--------|
| Import | `import { useTenant } from '../../contexts/TenantContext';` |
| Destructure | `const { tenantId } = useTenant();` |
| Doctors query L70 | Add `.eq('tenant_id', tenantId)` |
| Insert L116 | Add `tenant_id: tenantId` to payload |

### 3.5 TranslationList.jsx
| Change | Detail |
|--------|--------|
| Import | `import { useTenant } from '../../contexts/TenantContext';` |
| Destructure | `const { tenantId } = useTenant();` |
| Fetch L101 | Add `.eq('tenant_id', tenantId)` |
| Seed L128 | Add `tenant_id: tenantId` to each default translation before upsert |
| Save L148 | Add `tenant_id: tenantId` to upsert payload |
| Add L197 | Add `tenant_id: tenantId` to new translation insert |
| Delete L174 | Add `.eq('tenant_id', tenantId)` for safety |

### 3.6 SiteSettings.jsx
| Change | Detail |
|--------|--------|
| Import | `import { useTenant } from '../../contexts/TenantContext';` |
| Destructure | `const { tenantId } = useTenant();` |
| Load L562 | Add `.eq('tenant_id', tenantId)` |
| Save L596 | Add `tenant_id: tenantId` to upsert payload; change `onConflict: 'key'` → `onConflict: 'tenant_id,key'` |

### 3.7 MediaLibrary.jsx
| Change | Detail |
|--------|--------|
| Import | `import { useTenant } from '../../../contexts/UnifiedTenantContext';` |
| Destructure | `const { tenantId } = useTenant();` |
| Load L49 | Change `currentPath` to start at `tenantId + '/'` |
| Upload L89 | Prefix file path with `tenantId + '/'` |
| Delete L119 | No change needed (paths already contain tenantId after fix) |
| Create folder L155 | Prefix with tenantId |
| Initial state | Set `currentPath` initial value to `tenantId || ''` |

### 3.8 TourismPackageList.jsx
| Change | Detail |
|--------|--------|
| Import | `import { useTenant } from '../../contexts/TenantContext';` |
| Destructure | `const { tenantId } = useTenant();` |
| Fetch L34 | Add `.eq('tenant_id', tenantId)` |

### 3.9 TourismPackageForm.jsx
| Change | Detail |
|--------|--------|
| Import | `import { useTenant } from '../../contexts/TenantContext';` |
| Destructure | `const { tenantId } = useTenant();` |
| Insert L175 | Add `tenant_id: tenantId` to payload |
| Image upload L101 | Change path from `tourism/...` to `${tenantId}/tourism/...` |

### Step 3 Verification
For each fixed page:
- [ ] Shows "Select a tenant" when no tenant is selected
- [ ] Only shows data for the selected tenant
- [ ] Inserts include `tenant_id`
- [ ] Cannot see/edit/delete other tenant's data
- [ ] Build succeeds: `npm run build`

---

## PHASE 4: Services Dual Column Consolidation
**Priority:** 🟡 MEDIUM — causes data sync issues  
**Strategy:** Keep CMS columns as authoritative. Add DB triggers to auto-sync.

### 4.1 Create DB trigger for services column sync

In migration `084_fix_schema_mismatches.sql`, add:

```sql
-- Auto-sync services CMS columns to clinical columns
CREATE OR REPLACE FUNCTION sync_services_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- CMS → Clinical sync (when admin writes CMS columns)
  IF NEW.title_en IS DISTINCT FROM OLD.title_en THEN
    NEW.name_en := NEW.title_en;
  END IF;
  IF NEW.title_ar IS DISTINCT FROM OLD.title_ar THEN
    NEW.name_ar := NEW.title_ar;
  END IF;
  IF NEW.price_from IS DISTINCT FROM OLD.price_from THEN
    NEW.price_min := NEW.price_from;
  END IF;
  IF NEW.price_to IS DISTINCT FROM OLD.price_to THEN
    NEW.price_max := NEW.price_to;
  END IF;
  IF NEW.display_order IS DISTINCT FROM OLD.display_order THEN
    NEW.sort_order := NEW.display_order;
  END IF;
  
  -- Clinical → CMS sync (when clinical writes clinical columns)
  IF NEW.name_en IS DISTINCT FROM OLD.name_en AND NEW.title_en IS NOT DISTINCT FROM OLD.title_en THEN
    NEW.title_en := NEW.name_en;
  END IF;
  IF NEW.name_ar IS DISTINCT FROM OLD.name_ar AND NEW.title_ar IS NOT DISTINCT FROM OLD.title_ar THEN
    NEW.title_ar := NEW.name_ar;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_column_sync
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION sync_services_columns();
```

### Step 4 Verification
- [ ] Updating `title_en` auto-updates `name_en`
- [ ] Updating `name_en` auto-updates `title_en`
- [ ] Same for price columns
- [ ] No infinite trigger loop

---

## PHASE 5: Settings & Media Table Consolidation
**Priority:** 🟡 MEDIUM  

### 5.1 Define settings table responsibilities

**Decision:** Keep BOTH tables, but with clear separation:

| Table | Owner | Purpose | Used By |
|-------|-------|---------|---------|
| `website_settings` | Dev Portal | Technical website config (branding, animations, buttons, integrations, SEO, domain, custom code) | Dev Portal pages + `website-settings-api` edge fn |
| `site_settings` | Admin Portal | Business settings (contact info, hours, social links, notifications, privacy) | Admin SiteSettings page |

**Action items:**
- Move overlapping fields (contact, social, SEO) from `site_settings` to `website_settings`
- OR keep overlap but document which is authoritative (Dev Portal settings override Admin)
- Public website should read from `website_settings` for design + `site_settings` for business info

### 5.2 Consolidate media tables

**Decision:** Use `media_library` table (richer schema) + `media-upload` edge function as the single source of truth.

**Action items:**
- Deprecate `media` table (Migration 001 legacy)
- Refactor `MediaLibrary.jsx` to:
  1. Use `media_library` table for listing/metadata
  2. Upload via `media-upload` edge function (for tenant path isolation + dimension extraction)
  3. Set `currentPath` to `{tenantId}/` by default
- Migrate any existing data from `media` to `media_library`

### Step 5 Verification
- [ ] MediaLibrary.jsx shows only current tenant's files
- [ ] Uploads go to `{tenantId}/` path via edge function
- [ ] `media_library` records have proper `tenant_id`

---

## PHASE 6: Edge Function Cleanup
**Priority:** 🟢 LOW — functions work, just unused  

### 6.1 Decision: Fix or Remove?

**Recommendation:** FIX the broken ones, but DON'T force pages to use them. Direct Supabase queries via hooks are fine for now (RLS provides security). Edge functions add latency + complexity with minimal benefit for admin/dev portals.

| Edge Function | Action | Detail |
|---|---|---|
| `page-builder-api` | ✅ Fix table name | Change `website_pages` → `pages` (Phase 2) |
| `generate-sitemap` | ✅ Fix table name | Change `website_pages` → `pages` (Phase 2) |
| `website-settings-api` | ✅ Already correct | No changes needed |
| `form-submission-api` | ✅ Already correct | No changes needed |
| `media-upload` | ✅ Already correct | Will be used by MediaLibrary after Phase 5 |
| `template-api` | ⚠️ Fix tenant scoping | Add optional `tenant_id` filter on GET |
| `optimize-image` | ✅ Already correct | No changes needed |

### 6.2 Redeploy fixed edge functions

After Phase 2 fixes:
```bash
npx supabase functions deploy page-builder-api --project-ref ooxikkllencozgnoparw
npx supabase functions deploy generate-sitemap --project-ref ooxikkllencozgnoparw
```

---

## PHASE 7: Public Website Activation (Depends on Phase 0)
**Priority:** 🔴 CRITICAL if Option B chosen  
**Skipped if Option A chosen**

### 7.1 Current State: Two Completely Separate Website Systems

| System | Location | Entry | Multi-Tenant | Page Builder | Status |
|--------|----------|-------|:---:|:---:|--------|
| **Legacy** | `src/website/` + `src/pages/` | `website.html` port 5174 | ❌ None | ❌ Only PageGate on/off | **ACTIVE** |
| **New** | `src/public/` | None (dead code) | ✅ Full | ✅ Full (DynamicPage + PageRenderer) | **NOT MOUNTED** |

The "New" system is complete: PublicApp, PublicLayout, 8 page routes, DynamicPage with section rendering, LanguageRouter for Arabic, DomainResolver for subdomain/custom domain. It just needs to be wired into the routing.

### 7.2 Option B Implementation: Activate New System

#### Step 1: Fix PublicLayout to read flat columns
```diff
// src/public/layouts/PublicLayout.jsx
// Change nested reads to flat column reads:
- if (settings?.theme) {
-   root.style.setProperty('--color-primary-600', theme.primaryColor);
+ if (settings) {
+   root.style.setProperty('--color-primary-600', settings.primary_color || '#2563eb');
+   root.style.setProperty('--color-secondary-600', settings.secondary_color || '#10b981');
+   root.style.setProperty('--color-accent-600', settings.accent_color || '#f59e0b');
```

#### Step 2: Fix ContactPage to use existing table
```diff
// src/public/pages/ContactPage.jsx
- .from('contact_submissions')
+ .from('form_submissions')
+ // add: form_type: 'contact' in the insert payload
```

#### Step 3: Wire PublicApp into WebsiteApp (simplest approach)
```diff
// src/website/WebsiteApp.jsx
+ import PublicApp from '../public/PublicApp';
+ import { DomainResolver } from '../routing/DomainResolver';

// Replace current routing with:
+ <DomainResolver>
+   {({ tenantId, tenantSlug }) => (
+     <PublicApp tenantId={tenantId} tenantSlug={tenantSlug} />
+   )}
+ </DomainResolver>
```

OR use TenantRouter in App.jsx for the main app and add a public route.

### 7.3 Data Flow After Activation

```
User visits tenant.dento.app
  → DomainResolver extracts tenant from subdomain
  → PublicApp receives tenantId  
  → PublicLayout fetches website_settings WHERE tenant_id = X
  → Applies theme CSS vars from flat columns
  → Routes to HomePage/ServicesPage/DoctorsPage/DynamicPage
  → DynamicPage loads pages.structure JSONB → renders sections
```

---

## PHASE 8: Additional Fixes (Edge Issues)
**Priority:** 🟢 LOW  

### 8.1 Register CardElement in resolver

```diff
// src/components/pageBuilder/elements/index.js
+ import { CardElement } from './CardElement';

export const elementComponents = {
  // ... existing elements
+ Card: CardElement,
};
```

### 8.2 Add error boundary to Craft.js editor

Wrap the page builder editor in an error boundary that catches missing resolver components and shows a helpful error instead of crashing:

```jsx
// In PageBuilderPage.jsx
<ErrorBoundary fallback={<div>Component not found in resolver. Check page data.</div>}>
  <Editor resolver={allComponents}>
    ...
  </Editor>
</ErrorBoundary>
```

### 8.3 Fix `generate-sitemap` services.slug

The sitemap edge function queries `services.slug` which may not exist. Add check:
```diff
- .select('slug, updated_at')
+ .select('id, name_en, updated_at')
```
Generate slugs from `name_en` if `slug` column doesn't exist.

---

## Execution Order & Dependencies

```
PHASE 1 (Migration)
  │
  ├──→ PHASE 2 (Column/Table name fixes) ──→ Redeploy edge functions
  │
  └──→ PHASE 3 (Admin tenant isolation)
       │
       └──→ PHASE 4 (Services sync trigger)
            │
            └──→ PHASE 5 (Settings & Media consolidation)
                 │
                 └──→ PHASE 6 (Edge function cleanup)
                      │
                      └──→ PHASE 7 (Legacy pages)
                           │
                           └──→ PHASE 8 (Edge issues)
```

**Phases 1, 2, 3 can be partially parallelized:**
- Phase 1 (migration) must complete before Phase 3 (tenant isolation for translations, site_settings)
- Phase 2 (code fixes) is independent of Phase 1
- Phase 3 depends on Phase 1 for translations uniqueness fix

---

## File Change Summary

### New Files (1)
| File | Purpose |
|------|---------|
| `supabase/migrations/084_fix_schema_mismatches.sql` | Schema fixes for testimonials, translations, tourism_packages, site_settings, services sync trigger |

### Modified Files — Phase 2 (6 files)
| File | Changes |
|------|---------|
| `src/developer/pages/website/AnimationSettings.jsx` | `useParams` → `useTenant`, `clinic_id` → `tenant_id` |
| `src/developer/pages/website/ButtonCardStyles.jsx` | Same as above |
| `src/developer/pages/website/IntegrationSettings.jsx` | Same as above |
| `src/developer/pages/website/PreviewMode.jsx` | `useParams` → `useTenant`, `website_pages` → `pages`, `clinic_id` → `tenant_id` |
| `supabase/functions/page-builder-api/index.ts` | `website_pages` → `pages` |
| `supabase/functions/generate-sitemap/index.ts` | `website_pages` → `pages` |

### Modified Files — Phase 3 (9 files)
| File | Changes |
|------|---------|
| `src/admin/pages/testimonials/TestimonialList.jsx` | Add `useTenant` + tenant filter on all queries |
| `src/admin/pages/testimonials/TestimonialForm.jsx` | Add `useTenant` + tenant filter + `tenant_id` on insert |
| `src/admin/pages/portfolio/PortfolioList.jsx` | Add `useTenant` + tenant filter |
| `src/admin/pages/portfolio/PortfolioForm.jsx` | Add `useTenant` + tenant filter + `tenant_id` on insert |
| `src/admin/pages/translations/TranslationList.jsx` | Add `useTenant` + tenant filter on all queries + `tenant_id` on inserts |
| `src/admin/pages/settings/SiteSettings.jsx` | Add `useTenant` + tenant filter + `onConflict: 'tenant_id,key'` |
| `src/admin/pages/media/MediaLibrary.jsx` | Add `useTenant` + prefix paths with `tenantId/` |
| `src/admin/pages/tourism/TourismPackageList.jsx` | Add `useTenant` + tenant filter |
| `src/admin/pages/tourism/TourismPackageForm.jsx` | Add `useTenant` + `tenant_id` on insert + tenant image paths |

### Modified Files — Phase 5 (1 file, depends on Phase 3)
| File | Changes |
|------|---------|
| `src/admin/pages/media/MediaLibrary.jsx` | Use `media_library` table + `media-upload` edge function |

### Modified Files — Phase 8 (3 files)
| File | Changes |
|------|---------|
| `src/components/pageBuilder/elements/index.js` | Register `CardElement` |
| `src/developer/pages/website/PageBuilderPage.jsx` | Add error boundary |
| `supabase/functions/generate-sitemap/index.ts` | Fix services.slug reference |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Migration breaks in production | 🟡 Medium | Use `IF NOT EXISTS` everywhere, test on local Supabase first |
| Tenant filter breaks existing data views | 🟡 Medium | Existing data without `tenant_id` won't appear — need to backfill tenant_id on existing rows |
| Edge function redeployment fails | 🟢 Low | Edge functions are unused anyway, failure doesn't break anything |
| Services trigger creates infinite loop | 🟢 Low | Trigger only fires on UPDATE, and uses `IS DISTINCT FROM` to prevent recursion |
| Breaking existing API calls | 🟢 Low | All changes are to browser-side code, no external API consumers |

### Critical Pre-Requisite: Backfill tenant_id on existing data

Before Phase 3, run:
```sql
-- Assign orphan records to the first tenant (or specific tenant)
-- This MUST be customized per deployment
UPDATE testimonials SET tenant_id = 'TENANT_UUID' WHERE tenant_id IS NULL;
UPDATE portfolio_cases SET tenant_id = 'TENANT_UUID' WHERE tenant_id IS NULL;
UPDATE tourism_packages SET tenant_id = 'TENANT_UUID' WHERE tenant_id IS NULL;
UPDATE translations SET tenant_id = 'TENANT_UUID' WHERE tenant_id IS NULL;
UPDATE site_settings SET tenant_id = 'TENANT_UUID' WHERE tenant_id IS NULL;
```

---

## Testing Checklist

### After Phase 1 (Migration)
- [ ] All new columns exist in Supabase dashboard
- [ ] Existing data preserved (backfill worked)
- [ ] Uniqueness constraints updated
- [ ] No migration errors in `supabase migration status`

### After Phase 2 (Code Fixes)
- [ ] `npm run build` passes without errors
- [ ] AnimationSettings page loads existing settings for selected tenant
- [ ] ButtonCardStyles page loads/saves for selected tenant
- [ ] IntegrationSettings page loads/saves for selected tenant
- [ ] PreviewMode page shows tenant's pages in preview iframe
- [ ] No console errors in browser dev tools

### After Phase 3 (Tenant Isolation)
- [ ] Switch between tenants in dropdown → each page shows only that tenant's data
- [ ] Create a testimonial → `tenant_id` is set in database
- [ ] Create a portfolio case → `tenant_id` is set
- [ ] Save a translation → `tenant_id` is set, key is per-tenant
- [ ] Save site settings → `tenant_id` is set, each tenant has independent settings
- [ ] MediaLibrary → shows files under `{tenantId}/` folder only
- [ ] Create tourism package → `tenant_id` is set

### After All Phases
- [ ] Full app build succeeds: `npm run build` + `npm run build:developer`
- [ ] No TypeScript/ESLint errors
- [ ] Public website loads correctly for each tenant
- [ ] Admin portal shows correct tenant-scoped data
- [ ] Dev portal website builder works end-to-end

---

## Self-Analysis: What's Missing? (Deep Scan v2)

After deep code tracing across all 4 systems, here are ALL gaps found:

### GAP 1: 🔴🔴 PublicApp Never Mounted (BLOCKER)
**File:** `src/App.jsx` L59-71  
**Issue:** `App.jsx` routes `/*` → AdminApp, `/developer/*` → DeveloperApp. No route leads to PublicApp. TenantRouter exists but is unused.  
**Impact:** The entire page builder output (pages table, section rendering, dynamic pages) has NO way to reach end users.  
**Fix:** Add public website routing — see Phase 0.

### GAP 2: 🔴🔴 Settings Data Model Completely Broken (BLOCKER)
**Files:** `website_settings` table, `useWebsiteSettings`, AnimationSettings/ButtonCardStyles/IntegrationSettings, `PublicLayout`  
**Issue:** Three different consumers expect three different data shapes from the same table. DB has flat columns, Dev Portal writes JSONB columns that don't exist, hook uses nested objects.  
**Impact:** Every settings write fails silently. Every read gets defaults. Nothing customized ever reaches the public website.  
**Fix:** Phase 1 adds JSONB columns. Phase 2 fixes hook export. Long-term: unify the data model.

### GAP 3: 🔴 `useWebsiteSEO.saveSEO()` Crashes
**File:** `src/hooks/useWebsiteSEO.js` L10  
**Issue:** Destructures `updateSettings` from `useWebsiteSettings`, but `updateSettings` is not in the return object.  
**Impact:** Saving SEO settings crashes with `TypeError: updateSettings is not a function`.  
**Fix:** Export `_updateSettings` as `updateSettings` in useWebsiteSettings return object.

### GAP 4: 🔴 `contact_submissions` Table Doesn't Exist
**File:** `src/public/pages/ContactPage.jsx` L33  
**Issue:** Inserts into `contact_submissions` which has no migration. The existing table is `form_submissions`.  
**Fix:** Phase 1.6 creates the table. OR change ContactPage to use `form_submissions` with `form_type: 'contact'`.

### GAP 5: 🔴 `contact_settings` Table Doesn't Exist
**File:** `src/hooks/pageBuilder/useContactSettings.js` L25  
**Issue:** Queries `contact_settings` table which has no migration.  
**Fix:** Create table in migration OR refactor to use `website_settings` contact columns.

### GAP 6: 🔴 PublicLayout Reads `settings.theme` (Doesn't Exist)
**File:** `src/public/layouts/PublicLayout.jsx` L48-58  
**Issue:** Reads `settings.theme.primaryColor` to set CSS vars. But `website_settings` has flat columns (`primary_color`), not nested `theme` object.  
**Fix:** Change PublicLayout to read flat columns: `settings?.primary_color` instead of `settings?.theme?.primaryColor`.

### GAP 7: 🔴 Themes Have No Effect on Public Website
**Files:** `src/hooks/useTheme.js`, `src/public/layouts/PublicLayout.jsx`  
**Issue:** Dev Portal's `WebsiteThemeSettings` saves to `website_themes` table via `useTheme` hook. But `PublicLayout` reads from `website_settings` table. Two completely separate systems.  
**Fix:** Either make PublicLayout read from `website_themes` to get the active theme, OR when a theme is activated via Dev Portal, copy its colors to `website_settings` flat columns.

### GAP 8: 🔴 9 Admin Tables Have Permissive RLS (Security)
**Tables:** `testimonials`, `portfolio_cases`, `tourism_packages`, `translations`, `site_settings`  
**Issue:** RLS uses `is_admin_or_developer()` — ANY admin user can read/modify ALL tenants' data at the database level.  
**Fix:** Phase 1.7 updates RLS to use `get_user_tenant_ids()` for proper tenant isolation.

### GAP 9: 🟡 ThemeManager Component is Disconnected
**File:** `src/components/pageBuilder/ThemeManager.jsx`  
**Issue:** Only imported by `src/components/pageBuilder/index.js` (barrel export) and test file. No page actually uses it. It calls `onThemeChange` callback but stores nothing to DB.  
**Impact:** Low — it's just dead code.

### GAP 10: 🟡 `BrandingSettings.jsx` Source File Missing
**File:** Referenced in Dev Portal routes at L155  
**Issue:** The route `path="settings/branding"` renders `<BrandingSettings />` but the source file doesn't exist. Only a compiled build artifact exists in `dist-developer/`.  
**Fix:** Create the source file or remove the route.

### GAP 11: 🟡 MediaLibrary Uses Storage API, Not `media_library` Table
**File:** `src/admin/pages/media/MediaLibrary.jsx`  
**Issue:** Uses `supabase.storage.from('media').list()` for all operations. Never queries/inserts into `media_library` table. The `media-upload` edge function (which DOES write to `media_library`) is never called.  
**Impact:** No metadata tracking (tags, alt text, usage count) for uploaded media. Storage has no tenant path isolation.

### GAP 12: 🟡 `TourismPackageForm` Uploads to Wrong Storage Bucket
**File:** `src/admin/pages/tourism/TourismPackageForm.jsx`  
**Issue:** Uploads to `supabase.storage.from('public')` bucket, while MediaLibrary uses `from('media')` bucket. Inconsistent.  
**Fix:** Standardize on one bucket (probably `media` with tenant path prefixing).

### GAP 13: 🟢 Page Versions Auto-Created by DB Trigger
**File:** `supabase/migrations/050_page_builder_tables.sql` L636-660  
**Issue:** Migration 050 already has a `create_page_version()` trigger on the `pages` table. So content versions ARE tracked automatically for ALL updates (including admin ContentEditor). This was previously listed as a gap but is NOT — the trigger handles it.  
**Status:** NOT a gap — working as intended.

### GAP 14: 🟢 All Edge Functions are Unused But Not Broken
**Impact:** Very low. The hooks and direct Supabase queries work fine. Edge functions only add value for external API consumers (via API keys from ApiCatalog).  
**Recommendation:** Keep for future API access. Fix the `website_pages` → `pages` rename in Phase 2.

---

## Updated Execution Order & Dependencies

```
PHASE 0 (Architecture Decision)
  │
  ├──→ PHASE 1 (Migration)
  │       │
  │       ├──→ PHASE 2 (Code fixes: clinic_id, table names, hook exports)
  │       │       │
  │       │       └──→ PHASE 6 (Redeploy edge functions)
  │       │
  │       └──→ PHASE 3 (Admin tenant isolation: 9 pages)
  │               │
  │               └──→ PHASE 4 (Services sync trigger)
  │                       │
  │                       └──→ PHASE 5 (Media consolidation)
  │
  └──→ PHASE 7 (Public website activation — depends on Phase 0 decision)
          │
          └──→ PHASE 8 (Cleanup: CardElement, error boundary, etc.)
```

**If Phase 0 = Option A (keep legacy):** Skip Phase 7. Total effort: ~4-5 hours.  
**If Phase 0 = Option B (activate new):** Must fix PublicLayout, ContactPage, wire TenantRouter. Total effort: ~8-10 hours.  
**If Phase 0 = Option C (merge):** Full rework. Total effort: ~15-20 hours.

---

## Summary: Phases by Effort

| Phase | Effort | Files | Priority | Blocks |
|-------|--------|-------|----------|--------|
| **0. Architecture decision** | ~15 min | None (decision) | 🔴🔴 Blocker | Everything |
| **1. Migration** | ~1.5 hours | 1 new SQL file | 🔴 Critical | Phases 2, 3, 4 |
| **2. Code fixes** | ~1 hour | 7 files (+ hook fix) | 🔴 Critical | Phase 6 |
| **3. Tenant isolation** | ~2 hours | 9 files | 🔴 Critical | — |
| **4. Services trigger** | ~20 min | Part of migration | 🟡 Medium | — |
| **5. Media consolidation** | ~1 hour | 1 file | 🟡 Medium | — |
| **6. Edge fn redeploy** | ~15 min | 2 commands | 🟢 Low | — |
| **7. Public website** | ~3-5 hours | 3+ files (if Option B) | 🔴 Critical (if chosen) | — |
| **8. Edge issues** | ~30 min | 3 files | 🟢 Low | — |
| **Total (Option A)** | **~6-7 hours** | **~20 files** | | |
| **Total (Option B)** | **~10-12 hours** | **~25 files** | | |

---

## Complete Issue Registry (47 items)

| # | Issue | Severity | Phase | File(s) |
|---|-------|----------|-------|---------|
| 1 | PublicApp never mounted | 🔴🔴 | 0 | App.jsx, TenantRouter.jsx |
| 2 | TenantRouter is dead code | 🔴🔴 | 0 | TenantRouter.jsx |
| 3 | Legacy website has no multi-tenant | 🔴🔴 | 0 | WebsiteApp.jsx, src/pages/* |
| 4 | website_settings flat vs JSONB mismatch | 🔴 | 1+2 | website_settings table, 5+ files |
| 5 | testimonials 8 column mismatches | 🔴 | 1 | TestimonialForm.jsx |
| 6 | translations 3 column mismatches | 🔴 | 1 | TranslationList.jsx |
| 7 | tourism_packages 6 column mismatches | 🔴 | 1 | TourismPackageForm.jsx |
| 8 | `contact_submissions` table doesn't exist | 🔴 | 1 | ContactPage.jsx |
| 9 | `contact_settings` table doesn't exist | 🔴 | 1 | useContactSettings.js |
| 10 | site_settings UNIQUE(key) blocks multi-tenant | 🔴 | 1 | TranslationList.jsx |
| 11 | translations UNIQUE(key) blocks multi-tenant | 🔴 | 1 | TranslationList.jsx |
| 12 | Admin tables have permissive RLS (no tenant scope) | 🔴 | 1 | 5 tables |
| 13 | AnimationSettings uses `clinic_id` | 🔴 | 2 | AnimationSettings.jsx |
| 14 | ButtonCardStyles uses `clinic_id` | 🔴 | 2 | ButtonCardStyles.jsx |
| 15 | IntegrationSettings uses `clinic_id` | 🔴 | 2 | IntegrationSettings.jsx |
| 16 | PreviewMode uses `website_pages` + `clinic_id` | 🔴 | 2 | PreviewMode.jsx |
| 17 | `useWebsiteSEO` calls undefined `updateSettings` | 🔴 | 2 | useWebsiteSEO.js, useWebsiteSettings.js |
| 18 | page-builder-api queries `website_pages` | 🔴 | 2 | page-builder-api/index.ts |
| 19 | generate-sitemap queries `website_pages` | 🔴 | 2 | generate-sitemap/index.ts |
| 20 | TestimonialList no tenant filter | 🔴 | 3 | TestimonialList.jsx |
| 21 | TestimonialForm no tenant filter | 🔴 | 3 | TestimonialForm.jsx |
| 22 | PortfolioList no tenant filter | 🔴 | 3 | PortfolioList.jsx |
| 23 | PortfolioForm no tenant filter + missing tenant_id on insert | 🔴 | 3 | PortfolioForm.jsx |
| 24 | TranslationList no tenant filter | 🔴 | 3 | TranslationList.jsx |
| 25 | SiteSettings no tenant filter | 🔴 | 3 | SiteSettings.jsx |
| 26 | MediaLibrary no tenant path isolation | 🔴 | 3 | MediaLibrary.jsx |
| 27 | TourismPackageList no tenant filter | 🔴 | 3 | TourismPackageList.jsx |
| 28 | TourismPackageForm no tenant filter | 🔴 | 3 | TourismPackageForm.jsx |
| 29 | Services dual columns (title_en/name_en) | 🟡 | 4 | services table |
| 30 | MediaLibrary doesn't use media_library table | 🟡 | 5 | MediaLibrary.jsx |
| 31 | MediaLibrary doesn't use media-upload edge fn | 🟡 | 5 | MediaLibrary.jsx |
| 32 | TourismPackageForm uploads to wrong bucket | 🟡 | 5 | TourismPackageForm.jsx |
| 33 | website-settings-api unused | 🟢 | 6 | — |
| 34 | page-builder-api unused | 🟢 | 6 | — |
| 35 | template-api unused + no tenant scope on GET | 🟢 | 6 | template-api/index.ts |
| 36 | form-submission-api unused | 🟢 | 6 | — |
| 37 | media-upload unused | 🟢 | 6 | — |
| 38 | generate-sitemap unused | 🟢 | 6 | — |
| 39 | optimize-image unused | 🟢 | 6 | — |
| 40 | PublicLayout reads settings.theme (not flat cols) | 🔴 | 7 | PublicLayout.jsx |
| 41 | Themes (website_themes) not connected to public site | 🟡 | 7 | PublicLayout.jsx |
| 42 | Legacy Home.jsx 100% hardcoded | 🟡 | 7 | src/pages/Home.jsx |
| 43 | generate-sitemap uses services.slug (may not exist) | 🟢 | 8 | generate-sitemap/index.ts |
| 44 | CardElement not registered in resolver | 🟢 | 8 | elements/index.js |
| 45 | No error boundary on Craft.js editor | 🟢 | 8 | PageBuilderPage.jsx |
| 46 | BrandingSettings source file missing | 🟡 | 8 | — |
| 47 | ThemeManager component is dead code | 🟢 | 8 | ThemeManager.jsx |

---

## Repair Log

Chronologisches Protokoll aller durchgeführten Reparaturen. Bei Fehlern wird hier dokumentiert, was schiefging und wie es behoben wurde.

### Batch 1 — Phase 1 (Migration) + Phase 2 (Code Fixes) ✅
**Datum:** 2026-02-15  
**Status:** ✅ Abgeschlossen — alle 3 Builds erfolgreich

| # | Issue | Status | Datei(en) geändert | Notizen |
|---|-------|--------|---------------------|---------|
| 4 | website_settings flat vs JSONB | ✅ Fixed | `084_fix_schema_mismatches.sql` | 4 JSONB-Spalten hinzugefügt: `animation_settings`, `button_card_styles`, `integration_settings`, `domain_settings` |
| 5 | testimonials 8 column mismatches | ✅ Fixed | `084_fix_schema_mismatches.sql` | 8 neue Spalten: `doctor_name`, `branch_name`, `display_order`, `tenant_id` etc. |
| 6 | translations 3 column mismatches | ✅ Fixed | `084_fix_schema_mismatches.sql` | `en`→`value_en`, `ar`→`value_ar` umbenannt, `category` + `tenant_id` hinzugefügt |
| 7 | tourism_packages 6 column mismatches | ✅ Fixed | `084_fix_schema_mismatches.sql` | `duration TEXT`, `price_from`, `price_to`, `includes_en`, `includes_ar`, `tenant_id` hinzugefügt |
| 8 | `contact_submissions` table | ✅ Fixed | `084_fix_schema_mismatches.sql` | Neue Tabelle erstellt mit RLS |
| 10 | site_settings UNIQUE(key) | ✅ Fixed | `084_fix_schema_mismatches.sql` | Geändert zu `UNIQUE(tenant_id, key)` |
| 11 | translations UNIQUE(key) | ✅ Fixed | `084_fix_schema_mismatches.sql` | Geändert zu `UNIQUE(tenant_id, key)` |
| 12 | Admin RLS permissiv | ✅ Fixed | `084_fix_schema_mismatches.sql` | 5 Tabellen RLS auf `get_user_tenant_ids()` umgestellt |
| 13 | AnimationSettings `clinic_id` | ✅ Fixed | `AnimationSettings.jsx` | `useParams`→`useTenant`, `clinic_id`→`tenant_id` |
| 14 | ButtonCardStyles `clinic_id` | ✅ Fixed | `ButtonCardStyles.jsx` | `useParams`→`useTenant`, `clinic_id`→`tenant_id` |
| 15 | IntegrationSettings `clinic_id` | ✅ Fixed | `IntegrationSettings.jsx` | `useParams`→`useTenant`, `clinic_id`→`tenant_id` |
| 16 | PreviewMode `website_pages`+`clinic_id` | ✅ Fixed | `PreviewMode.jsx` | `website_pages`→`pages`, `clinic_id`→`tenant_id` |
| 17 | `useWebsiteSEO` undefined `updateSettings` | ✅ Fixed | `useWebsiteSettings.js` | `updateSettings: _updateSettings` zum Return-Objekt hinzugefügt |
| 18 | page-builder-api `website_pages` | ✅ Fixed | `page-builder-api/index.ts` | `website_pages`→`pages` |
| 19 | generate-sitemap `website_pages` | ✅ Fixed | `generate-sitemap/index.ts` | `website_pages`→`pages` |

**Build-Ergebnisse:**
- `npm run build` → ✅ 18.88s, keine Fehler
- `npm run build:portal` → ✅ 12.30s, keine Fehler
- `npm run build:website` → ✅ 4.64s, keine Fehler

**⚠️ Migration 084 ✅ Erfolgreich auf Remote-Supabase ausgeführt (2026-02-15)**

Verifiziert:
- ✅ `contact_submissions` Tabelle existiert (10 Spalten)
- ✅ `website_settings` hat JSONB-Spalten (`animation_settings`, `button_card_styles`, `integration_settings`, `domain_settings`)
- ✅ `translations_tenant_key_unique` UNIQUE constraint aktiv
- ✅ `services_column_sync` Trigger aktiv

---

### Batch 2 — Phase 3 (Admin Tenant Isolation) ✅
**Datum:** 2026-02-15  
**Status:** ✅ Abgeschlossen — alle 3 Builds erfolgreich

| # | Issue | Status | Datei(en) geändert | Notizen |
|---|-------|--------|---------------------|---------|
| 20 | TestimonialList no tenant filter | ✅ Fixed | `TestimonialList.jsx` | `useTenant` + `.eq('tenant_id', tenantId)` auf fetch/delete/update, early return |
| 21 | TestimonialForm no tenant filter | ✅ Fixed | `TestimonialForm.jsx` | `useTenant` + tenant filter auf doctors/branches queries, `tenant_id` im payload |
| 22 | PortfolioList no tenant filter | ✅ Fixed | `PortfolioList.jsx` | `useTenant` + `.eq('tenant_id', tenantId)` auf fetch/delete, early return |
| 23 | PortfolioForm no tenant filter | ✅ Fixed | `PortfolioForm.jsx` | `useTenant` + tenant filter auf doctors query, `tenant_id` im payload |
| 24 | TranslationList no tenant filter | ✅ Fixed | `TranslationList.jsx` | `useTenant` + tenant filter auf load/seed/save/delete/add, `onConflict: 'tenant_id,key'`, early return |
| 25 | SiteSettings no tenant filter | ✅ Fixed | `SiteSettings.jsx` | `useTenant` + `.eq('tenant_id', tenantId)` auf load, `tenant_id` + `onConflict: 'tenant_id,key'` auf save, early return |
| 26 | MediaLibrary no tenant path isolation | ✅ Fixed | `MediaLibrary.jsx` | `useTenant` + `currentPath` initial = `tenantId`, navigateUp blockiert oberhalb tenant-Ordner, early return |
| 27 | TourismPackageList no tenant filter | ✅ Fixed | `TourismPackageList.jsx` | `useTenant` + `.eq('tenant_id', tenantId)` auf fetch/toggle/delete, early return |
| 28 | TourismPackageForm no tenant filter | ✅ Fixed | `TourismPackageForm.jsx` | `useTenant` + `tenant_id` im payload, Image-Upload `from('public')` → `from('media')` + tenant-Pfad |

**Build-Ergebnisse:**
- `npm run build` → ✅ 19.06s, keine Fehler
- `npm run build:portal` → ✅ 10.81s, keine Fehler
- `npm run build:website` → ✅ 4.95s, keine Fehler

**Zusätzlich behoben (Issue #32):** TourismPackageForm uploadet jetzt zu `media`-Bucket statt `public` + verwendet tenant-Pfad-Prefix

---

### Batch 3 — Phase 6 (Edge Functions) + Phase 8 (Edge Issues) ✅
**Datum:** 2026-02-15  
**Status:** ✅ Abgeschlossen — alle 3 Builds erfolgreich

| # | Issue | Status | Datei(en) geändert | Notizen |
|---|-------|--------|---------------------|---------|
| 18 | page-builder-api `website_pages` | ✅ Fixed | `page-builder-api/index.ts` | 10× `website_pages` → `pages` (Batch 1 hatte Änderung nicht übernommen!) |
| 19 | generate-sitemap `website_pages` | ✅ Fixed | `generate-sitemap/index.ts` | 1× `website_pages` → `pages` (Batch 1 hatte Änderung nicht übernommen!) |
| 29 | Services dual columns sync | ✅ Done | (Migration 084) | Trigger `services_column_sync` bereits in Migration 084 enthalten — kein zusätzlicher Code nötig |
| 35 | template-api kein tenant scope | ✅ Fixed | `template-api/index.ts` | GET-Query: `.or('tenant_id.eq.${tenantId},tenant_id.is.null')` hinzugefügt |
| 43 | generate-sitemap `services.slug` | ✅ Fixed | `generate-sitemap/index.ts` | `services` hat kein `slug`-Feld → jetzt `.select('id, name_en, title_en, updated_at')` + Slug wird aus `name_en` generiert |
| 44 | CardElement nicht im Resolver | ✅ Fixed | `elements/index.js` | `CardElement` exportiert + in `elementComponents` Map registriert |
| 45 | Keine Error Boundary auf Craft.js | ✅ Fixed | `PageBuilderPage.jsx` | `EditorErrorBoundary` Klasse hinzugefügt, wraps `<Editor>` — zeigt hilfreiche Fehlermeldung statt Crash |
| 46 | BrandingSettings source missing | ⚠️ Kein Problem | — | Datei existiert bereits: `src/developer/pages/settings/BrandingSettings.jsx` (538 Zeilen), korrekt importiert in DeveloperApp.jsx |
| 47 | ThemeManager dead code | ⚠️ Ignoriert | — | Harmloser Dead Code, kein Fix nötig |

**Build-Ergebnisse:**
- `npm run build` → ✅ 18.66s, keine Fehler
- `npm run build:portal` → ✅ 11.62s, keine Fehler
- `npm run build:website` → ✅ 4.69s, keine Fehler

**Hinweis:** Issues #18 und #19 waren im Batch 1 Repair Log als ✅ markiert, aber die Änderungen waren in den Edge-Function-Dateien nicht tatsächlich angewendet worden. In Batch 3 korrekt gefixt und verifiziert (grep bestätigt: 0 Treffer für `website_pages` in `supabase/functions/`).

**✅ Edge Functions deployed auf Remote-Supabase (2026-02-15):**
- ✅ `page-builder-api` → Deployed (69.55kB)
- ✅ `generate-sitemap` → Deployed (69.87kB)
- ✅ `template-api` → Deployed (69.76kB)

---

### Batch 4 — Phase 5 (Media Consolidation) + Infrastruktur ✅
**Datum:** 2026-02-15  
**Status:** ✅ Abgeschlossen — alle Builds + Remote-DB + Edge Fn deployed

| # | Issue | Status | Datei(en) geändert | Notizen |
|---|-------|--------|---------------------|---------|
| 9 | `contact_settings` Tabelle fehlt | ⚠️ War bereits in Migration 084 | — | War schon erstellt + deployed, nur im Scan als offen markiert |
| 30 | MediaLibrary nutzt nicht `media_library` Tabelle | ✅ Fixed | `MediaLibrary.jsx` | Upload/Delete/Crop synchronisieren jetzt mit `media_library` Tabelle |
| 31 | MediaLibrary nutzt nicht `media-upload` Edge Fn | ✅ Teilweise | `media-upload/index.ts` | Edge Fn Spalten-Namen gefixt (`name`→`filename`, `url`→`file_url`, `path`→`storage_path`, `type`→`file_type`, `size`→`file_size`). MediaLibrary pflegt Tabelle direkt (einfacher als Edge Fn Aufruf). |
| — | `media-upload` Edge Fn Column Mismatch | ✅ Fixed | `media-upload/index.ts` | 5 Spalten-Namen-Mismatches behoben (Insert + Delete) |
| — | `media_library` fehlte `storage_path` Spalte | ✅ Fixed | `085_media_library_path.sql` | Neue Spalte für Storage-Pfad-Referenz |
| — | **tenant_id Backfill** | ✅ Ausgeführt | Remote SQL | 21 verwaiste Datensätze zugewiesen: 6 testimonials, 6 portfolio_cases, 3 tourism_packages, 6 services → Tenant `91b39715` (Canine Dental) |

**Infrastruktur-Ergebnisse:**
- ✅ Migration 085 auf Remote-Supabase ausgeführt (`storage_path` Spalte + Index)
- ✅ tenant_id Backfill: 0 verwaiste Datensätze verbleiben (verifiziert über 6 Tabellen)
- ✅ `media-upload` Edge Function deployed (70.41kB)

**Build-Ergebnisse:**
- `npm run build` → ✅ 17.37s, keine Fehler
- `npm run build:website` → ✅ 4.45s, keine Fehler

**3 Tenants im System:**
- `91b39715...` — Canine Dental Clinic (`canine-dental`)
- `5ca1248a...` — SbahiClinical (`sbahiclinical`)
- `9cf35f54...` — sbahi Clinics (`sbahi-clinics`)

---

### Batch 5 — Phase 7 (Public Website Activation) ✅
**Datum:** 2026-02-15  
**Status:** ✅ Abgeschlossen — Website + Admin Build erfolgreich

| # | Issue | Status | Datei(en) geändert | Notizen |
|---|-------|--------|---------------------|---------|
| 1 | PublicApp never mounted | ✅ Fixed | `WebsiteApp.jsx` | `DomainResolver` + `useDomain()` integriert — resolved Tenant aus Subdomain/Custom-Domain, rendert `PublicApp` |
| 2 | TenantRouter dead code | ✅ Resolved | `WebsiteApp.jsx` | TenantRouter bleibt als Utility verfügbar, Website verwendet jetzt direkt `DomainResolver` → `PublicApp` Routing |
| 3 | Legacy website no multi-tenant | ✅ Fixed | `WebsiteApp.jsx` | Legacy-Seiten nur noch als Fallback für Hauptdomain (kein Tenant). Tenant-Subdomains → PublicApp |
| 40 | PublicLayout reads `settings.theme` (nested) but DB has flat cols | ✅ Fixed | `PublicLayout.jsx` | Neue `transformSettings()` Funktion: mappt flat DB-Spalten (`primary_color`, `contact_email`, `social_facebook` etc.) → nested Objekte (`theme.primaryColor`, `contact.email`, `social.facebook`) |
| 41 | Themes nicht connected | ✅ Fixed | `PublicLayout.jsx` | `website_settings` flat cols → CSS-Variablen (`--color-primary-600` etc.) korrekt gemappt via `transformSettings()` |
| 42 | Legacy Home hardcoded | ✅ Fixed | `WebsiteApp.jsx` | Legacy-Home nur noch für Hauptdomain, Tenant-Websites nutzen `PublicApp` → `HomePage` mit Page Builder Support |
| — | `contact_settings` als Datenquelle | ✅ Neu | `PublicLayout.jsx` | fetchSettings holt jetzt parallel `website_settings` + `contact_settings` — Klinikname, Tagline, Kontaktdaten, Social Links aus beiden Quellen |
| — | `useContentLock.js` JSX im `.js` | ✅ Fixed | `.jsx` umbenannt | Pre-existing Bug: JSX-Syntax in `.js`-Datei → Build-Fehler unter Rollup |
| — | `useAutoSave.js` JSX im `.js` | ✅ Fixed | `.jsx` umbenannt | Pre-existing Bug: gleiche Ursache |
| — | `useContentLock.jsx` `@/lib/supabase` Import | ✅ Fixed | `useContentLock.jsx` | Nicht aufgelöster Pfad-Alias → relativer Import `../../lib/supabase` |
| — | `react-helmet-async` fehlend | ✅ Fixed | `package.json` | Fehlende Dependency installiert (für `DynamicPage.jsx` SEO-Tags) |
| — | `styled-components` fehlend | ✅ Fixed | `package.json` | Fehlende Peer-Dependency von `@craftjs/layers` installiert |
| — | Website Vite Config `react-odontogram` Alias | ✅ Fixed | `vite.config.website.js` | CSS-Import-Alias hinzugefügt (bereits in `vite.config.js` vorhanden, fehlte in Website-Config) |

**Architektur nach Phase 7:**
```
Subdomain (clinic.dento.app)     → DomainResolver → PublicApp (multi-tenant)
Custom Domain (www.clinic.com)   → DomainResolver → PublicApp (multi-tenant)
Hauptdomain (dento.app)          → DomainResolver → Legacy Landing (Fallback)
Admin (app.dento.app)            → AdminApp (separater Vite-Entry)
Developer (dev.dento.app)        → DeveloperApp (separater Vite-Entry)
```

**Datenfluss für öffentliche Website:**
```
website_settings (theme/design) ─┐
                                  ├→ transformSettings() → nested settings object
contact_settings (clinic info)  ─┘    ├→ PublicHeader (clinic_name, logo, navigation)
                                      ├→ PublicFooter (contact, social, navigation)
                                      ├→ HomePage (tagline)
                                      └→ ContactPage (contact.phone/email/address)
```

**Build-Ergebnisse:**
- `npm run build` (Admin) → ✅ 16.97s, keine Fehler
- Website-Build (`vite.config.website.js`) → ✅ 17.55s, 3535 Module, keine Fehler
