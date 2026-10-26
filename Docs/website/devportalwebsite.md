# Developer Portal — Website Builder Full Scan

**Date:** February 15, 2026  
**Purpose:** Complete inventory of all Developer Portal pages, components, hooks, and data flows related to the website builder system.

---

## 1. Developer Portal Website Routes

All website-related routes are under `/developer/website/*`:

| Route | Component | Lines | Purpose |
|-------|-----------|-------|---------|
| `/website` | `PageList` | 304 | List all pages for tenant, create/delete/duplicate |
| `/website/pages` | `PageList` | 304 | Same as above (alias) |
| `/website/pages/:id/edit` | `PageBuilderPage` | 243 | Craft.js visual page editor |
| `/website/pages/new` | `PageBuilderPage` | 243 | Create new page with Craft.js |
| `/website/navigation` | `NavigationEditor` | 401 | Drag & drop navigation menu editor |
| `/website/theme` | `WebsiteThemeSettings` | 558 | Theme activation & customization |
| `/website/animations` | `AnimationSettings` | 429 | Animation settings (scroll, hover, page transitions) |
| `/website/styles` | `ButtonCardStyles` | 601 | Button & card visual style editor |
| `/website/seo` | `WebsiteSEOSettings` | 435 | SEO meta tags, analytics, sitemap config |
| `/website/integrations` | `IntegrationSettings` | 537 | Third-party integrations (GA, Chat, Maps, Booking) |
| `/website/templates` | `TemplateLibrary` | 425 | Browse & apply page/section templates |
| `/website/templates/:id/edit` | `TemplateEditor` | 475 | Edit template structure |
| `/website/versions` | `VersionHistory` | 265 | Page version history & restore |
| `/website/domains` | `DomainSettings` | 428 | Custom domain management |
| `/website/preview` | `PreviewMode` | 313 | Live preview in different devices |

**Total: 15 routes, 13 unique pages, ~5,414 lines**

---

## 2. Page-by-Page Data Access Analysis

### 2.1 PageList.jsx (304 lines)
- **Hook:** `useWebsitePages(tenantId)` → `usePages` → queries `pages` table
- **Operations:** `createPage`, `deletePage`, `duplicatePage`
- **Table:** `pages`
- **Status:** ✅ Works (uses correct table + tenant filter)

### 2.2 PageBuilderPage.jsx (243 lines)
- **Hook:** `useWebsitePages(tenantId)` → queries `pages` table
- **Component:** Craft.js `<Editor>` with `resolver={allComponents}`
- **Frame:** `<Element is={Container}>` — requires `Container` in resolver
- **Table:** `pages` (reads `structure` + `content` JSONB)
- **Status:** ⚠️ Was broken (Container not in resolver — fixed by changing component maps from strings to references)

### 2.3 NavigationEditor.jsx (401 lines)
- **Hook:** `useNavigation(tenantId)` → queries `navigation_menus` table
- **Operations:** Drag & drop reorder, add/edit/delete nav items, nested items
- **Table:** `navigation_menus`
- **Status:** ✅ Likely works (uses correct hook + table)

### 2.4 WebsiteThemeSettings.jsx (558 lines)
- **Hook:** `useTheme(tenantId)` → queries `website_themes` table
- **Operations:** Browse themes, activate, customize colors/fonts/layout
- **Table:** `website_themes`, `theme_history`
- **Status:** ✅ Works (tenant filter verified)

### 2.5 AnimationSettings.jsx (429 lines)
- **Tenant source:** `const { clinicId } = useParams()` — gets clinicId from URL params
- **Direct query L105:** `supabase.from('website_settings').select('animation_settings').eq('clinic_id', clinicId)` 
- **Write L127:** `supabase.from('website_settings').upsert({ clinic_id: clinicId, ... }, { onConflict: 'clinic_id' })`
- **Table:** `website_settings`
- **🔴 BUG:** Uses column `clinic_id` which **does not exist** — actual column is `tenant_id`. Both read and write will fail silently.

### 2.6 ButtonCardStyles.jsx (601 lines)
- **Tenant source:** `const { clinicId } = useParams()` — gets clinicId from URL params
- **Direct query L109:** `supabase.from('website_settings').select('button_card_styles').eq('clinic_id', clinicId)`
- **Write L131:** `supabase.from('website_settings').upsert({ clinic_id: clinicId, ... }, { onConflict: 'clinic_id' })`
- **Table:** `website_settings`
- **🔴 BUG:** Same as AnimationSettings — uses `clinic_id` instead of `tenant_id`. Both read and write will fail.

### 2.7 WebsiteSEOSettings.jsx (435 lines)
- **Hook:** `useWebsiteSEO(tenantId)` → `useWebsiteSettings(tenantId)` → queries `website_settings`
- **Table:** `website_settings`
- **Status:** ✅ Likely works (uses hook with tenant_id)

### 2.8 IntegrationSettings.jsx (537 lines)
- **Tenant source:** `const { clinicId } = useParams()` — gets clinicId from URL params
- **Direct query L92:** `supabase.from('website_settings').select('integration_settings').eq('clinic_id', clinicId)`
- **Write L114:** `supabase.from('website_settings').upsert({ clinic_id: clinicId, ... }, { onConflict: 'clinic_id' })`
- **Table:** `website_settings`
- **🔴 BUG:** Same as AnimationSettings — uses `clinic_id` instead of `tenant_id`. Both read and write will fail.

### 2.9 TemplateLibrary.jsx (425 lines)
- **Hook:** `useWebsitePages(tenantId)` → queries `pages` table
- **Operations:** Browse templates, apply template to create page
- **Table:** `pages`, `page_templates`, `section_templates` (reads)
- **Status:** ⚠️ May work but template application logic may be fragile

### 2.10 TemplateEditor.jsx (475 lines)
- **Direct query L34:** `supabase.from('section_templates').select('*')` — no tenant filter, loads ALL templates
- **Direct query L51:** `supabase.from('page_templates').select('*')` — no tenant filter
- **Write L97:** `supabase.from('page_templates').insert(payload)` — no tenant_id in payload
- **Write L102:** `supabase.from('page_templates').update(payload).eq('id', id)`
- **Table:** `section_templates`, `page_templates`
- **⚠️ NOTE:** Templates are designed to be global (no tenant ownership), so no tenant filter is by design. But inserts won't include tenant_id.

### 2.11 VersionHistory.jsx (265 lines)
- **Hook:** `usePageVersions(pageId)` → `useVersionHistory` → queries `page_versions` table
- **Operations:** View versions, restore, compare
- **Table:** `page_versions`
- **Status:** ✅ Likely works (version-level access, page already tenant-scoped)

### 2.12 DomainSettings.jsx (428 lines)
- **Tenant source:** `const { clinicId } = useParams()` — gets clinicId from URL params
- **Direct query L36:** `supabase.from('domains').select('*').eq('tenant_id', clinicId)` — ✅ correct column
- **Direct query L51:** `supabase.from('website_settings').select('domain_settings').eq('tenant_id', clinicId)` — ✅ correct column
- **Write L80:** `supabase.from('domains').insert({ tenant_id: clinicId, ... })` — ✅ correct
- **Write L176:** `supabase.from('website_settings').upsert({ tenant_id: clinicId, ... }, { onConflict: 'tenant_id' })` — ✅ correct
- **Table:** `domains`, `website_settings`
- **Status:** ✅ Works correctly — this is the ONLY direct-query page that uses `tenant_id` instead of `clinic_id`

### 2.13 PreviewMode.jsx (313 lines)
- **Tenant source:** Uses `clinic_id` from context
- **Direct query:** `supabase.from('website_pages').select('*').eq('clinic_id', ...)`
- **Table:** `website_pages` ← **THIS TABLE DOESN'T EXIST!** (should be `pages`)
- **🔴 BUG:** Two bugs: wrong table name (`website_pages` → `pages`) AND wrong column name (`clinic_id` → `tenant_id`)
- **Status:** Completely broken — will never load any data

---

## 3. Shared Hooks — Deep Scan

### 3.1 `usePages.js` (215 lines) — `src/hooks/pageBuilder/usePages.js` ✅ CORRECT
- **Table:** `pages`
- **Fetch:** `.from('pages').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })`
- **Realtime:** Subscribes to `postgres_changes` on `pages` table filtered by `tenant_id` for INSERT/UPDATE/DELETE
- **Create:** `.from('pages').insert({ tenant_id, title_en, title_ar, slug, structure, content, status: 'draft', ... })`
- **Update:** `.from('pages').update({ ...updates, updated_at }).eq('id', pageId)`
- **Delete:** `.from('pages').delete().eq('id', pageId)`
- **Duplicate:** Copies page with `(Copy)` suffix + `-copy` slug
- **Publish/Unpublish:** Sets `status: 'published'` with `published_at` / clears them
- **Status:** Well-structured, correct tenant isolation, has realtime sync

### 3.2 `useNavigation.js` (131 lines) — `src/hooks/useNavigation.js` ✅ CORRECT
- **Table:** `navigation_menus`
- **Fetch:** `.from('navigation_menus').select('*').eq('tenant_id', tenantId)` → organizes by `menu_type` (header/footer/mobile)
- **Save:** `.from('navigation_menus').upsert({ tenant_id, menu_type, items, updated_at }, { onConflict: 'tenant_id,menu_type' })`
- **Operations:** `addMenuItem`, `updateMenuItem`, `removeMenuItem`, `reorderItems` — all delegate to `saveMenu`
- **Status:** Well-structured, correct tenant isolation

### 3.3 `useTheme.js` (353 lines) — `src/hooks/useTheme.js` ✅ CORRECT
- **Table:** `website_themes`, `theme_history`
- **Fetch:** Loads system themes (`.eq('is_system', true)`) + tenant themes (`.eq('tenant_id', tenantId)`) separately, merges
- **Activate:** If system theme → creates tenant copy with `is_active: true`. If tenant theme → updates `is_active`. Logs to `theme_history`.
- **Customize:** `.from('website_themes').update(updates).eq('id', themeId).eq('tenant_id', tenantId)` — version increment
- **Create:** Inserts new custom theme for tenant
- **Delete:** Soft logic: deletes `theme_history` first, then theme. Only tenant's own, not system themes.
- **CSS Variables:** `generateCSSVariables(theme)` — converts theme JSONB to CSS custom properties
- **Status:** Well-structured, correct tenant isolation

### 3.4 `useWebsiteSettings.js` (165 lines) — `src/hooks/pageBuilder/useWebsiteSettings.js` ✅ CORRECT
- **Table:** `website_settings`
- **Fetch:** `.from('website_settings').select('*').eq('tenant_id', tenantId).single()` — falls back to defaults on PGRST116
- **Save:** `.from('website_settings').upsert({ tenant_id, ...settings, updated_at }).select().single()`
- **Convenience methods:** `updateTheme`, `updateNavigation`, `updateFooter`, `updateSEO`, `setWebsiteEnabled`
- **Status:** Well-structured, correct tenant isolation. Used by `useWebsiteSEO` wrapper.

### 3.5 `useWebsiteSEO.js` (45 lines) — `src/hooks/useWebsiteSEO.js` ✅ CORRECT
- **Wraps:** `useWebsiteSettings(tenantId)` — exposes `settings.seo` field with defaults
- **Save:** `updateSettings({ seo: seoData })` — delegates to `useWebsiteSettings.updateSettings`
- **Status:** Thin wrapper, inherits correct tenant isolation

### 3.6 `useTemplates.js` (200 lines) — `src/hooks/useTemplates.js` ⚠️ NO TENANT SCOPING ON READ
- **Table:** `page_templates`
- **Fetch:** `.from('page_templates').select('*').eq('is_active', true)` — returns ALL active templates globally (by design — templates are shared)
- **Apply bundle:** Creates pages from bundle templates: `.from('pages').insert(pages)` with `tenant_id`
- **Status:** Read is global (by design). Write (applyBundle) correctly adds `tenant_id` to created pages.

### 3.7 `useWebsitePages.js` (3 lines) — Re-export
- Simply re-exports `usePages` from `./pageBuilder/usePages` for backward compatibility

---

## 4. Page Builder Components (`src/components/pageBuilder/`)

### 4.1 Component Categories

| Category | Count | Files |
|----------|-------|-------|
| **Sections** | 18 | HeroSection, HeroSliderSection, ServicesSection, TeamSection, CTASection, ContactSection, TestimonialsSection, FAQSection, FeaturesSection, GallerySection, StatsSection, VideoSection, TextSection, BookingSection, MapSection, PricingSection, PartnersSection, BranchesSection |
| **Elements** | 10 (+1) | HeadingElement, TextElement, ImageElement, ButtonElement, IconElement, DividerElement, SpacerElement, VideoElement, SocialLinksElement, FormElement (+ CardElement exists but NOT in index) |
| **Layouts** | 5 | Container, FlexRow, FlexColumn, Grid, TwoColumnLayout |
| **Builder UI** | 11 | AlignmentControl, AnimationPicker, ColorPicker, ColumnLayoutPicker, DragHandle, DropZone, ElementSettings, SectionSettings, SectionTemplatePicker, SelectionBox, SpacingControl, TemplateSelector |
| **Common** | 4 | DynamicContent, EditableImage, EditableText, SectionWrapper |
| **Renderer** | 3 | ContentRenderer, ElementRenderer, SectionRenderer |
| **Top-level** | 13 | PageBuilder, BuilderCanvas, BuilderSidebar, BuilderToolbar, ComponentToolbox, DevicePreview, HistoryControls, LayersPanel, PageManager, PageRenderer, PublishControls, ResponsiveControls, SEOPanel, SettingsPanel, ThemeManager, AssetManager |

**Total: ~80 files, ~15,198 lines**

### 4.2 Craft.js Resolver Map

The resolver (`allComponents`) is built by merging three maps:

```js
// src/components/pageBuilder/index.js
export const allComponents = {
  ...sectionComponents,   // 18 sections
  ...elementComponents,   // 10 elements  
  ...layoutComponents,    // 5 layouts
};
```

**Previously broken:** Maps used strings (`{ container: 'Container' }`) instead of component references (`{ Container: ContainerComponent }`). **Fixed** — now uses actual component imports.

### 4.3 Missing from Resolver
- `CardElement` — exists as a file but NOT exported in `elements/index.js`
- `PageBuilder` (top-level) — not in resolver (probably shouldn't be)

---

## 5. Data Flow Diagram

```
Developer Portal
├── PageList ──────────────── usePages ──────────────── pages table
├── PageBuilderPage ────────── usePages ──────────────── pages table
│   └── Craft.js Editor ───── Container/Section/Element components
│       └── allComponents resolver (33 components)
├── NavigationEditor ───────── useNavigation ──────────── navigation_menus table
├── WebsiteThemeSettings ───── useTheme ────────────────── website_themes table
├── AnimationSettings ──────── DIRECT supabase query ──── website_settings table ⚠️
├── ButtonCardStyles ───────── DIRECT supabase query ──── website_settings table ⚠️
├── WebsiteSEOSettings ─────── useWebsiteSEO → useWebsiteSettings ── website_settings table
├── IntegrationSettings ────── DIRECT supabase query ──── website_settings table ⚠️
├── TemplateLibrary ────────── useWebsitePages ────────── pages + templates tables
├── TemplateEditor ─────────── DIRECT supabase query ──── section/page_templates ⚠️
├── VersionHistory ─────────── usePageVersions ────────── page_versions table
├── DomainSettings ─────────── DIRECT supabase query ──── domains + website_settings ⚠️
└── PreviewMode ────────────── DIRECT supabase query ──── website_pages 🔴 WRONG TABLE
```

---

## 6. Known Problems

### 6.1 Critical Bugs (Code-Level)

| # | Page | Line(s) | Problem | Impact |
|---|------|---------|---------|--------|
| 1 | **PreviewMode.jsx** | ~L20 | Queries `website_pages` (doesn't exist) with `clinic_id` (doesn't exist) | 🔴 Page loads no data, likely throws error |
| 2 | **AnimationSettings.jsx** | L105, L127 | Uses `clinic_id` column — actual column is `tenant_id` | 🔴 Read returns empty, write creates row with null tenant_id |
| 3 | **ButtonCardStyles.jsx** | L109, L131, L134 | Uses `clinic_id` column — actual column is `tenant_id` | 🔴 Same as above |
| 4 | **IntegrationSettings.jsx** | L92, L114, L117 | Uses `clinic_id` column — actual column is `tenant_id` | 🔴 Same as above |

### 6.2 Tenant Isolation Issues

| # | Page | Problem | Impact |
|---|------|---------|--------|
| 5 | **AnimationSettings** | Gets `clinicId` from `useParams()` instead of `useTenant()` — the URL-based approach works if route has `:clinicId` param | ⚠️ Depends on routing |
| 6 | **ButtonCardStyles** | Same `useParams()` approach | ⚠️ Same |
| 7 | **IntegrationSettings** | Same `useParams()` approach | ⚠️ Same |
| 8 | **DomainSettings** | Uses `useParams()` but correctly uses `tenant_id` column | ✅ Works |
| 9 | **TemplateEditor** | No tenant filter on reads — by design (templates are global) | ✅ By design |

### 6.3 Architecture Issues

| # | Problem | Detail |
|---|---------|--------|
| 8 | **Mixed data access** | Some pages use hooks (proper tenant filtering), others make direct supabase queries (fragile, no tenant filtering) |
| 9 | **No edge function usage** | None of the website pages call edge functions (page-builder-api, template-api, website-settings-api). All are direct DB queries via supabase client. Edge functions are deployed but unused from Dev Portal. |
| 10 | **CardElement missing** | `CardElement.jsx` exists but not registered in `elements/index.js` — not available in resolver |
| 11 | **Page structure vs content** | Dev portal writes `structure` (Craft.js JSON tree). Admin writes `content` (key-value text/images). The two formats are incompatible — no bridge between them. |

### 6.4 Component Issues

| # | Problem | Detail |
|---|---------|--------|
| 12 | **allComponents map** | Was using kebab-case string keys (`container: 'Container'`). Craft.js needs PascalCase component refs. **Fixed.** |
| 13 | **Section defaults** | Each section component has `craft.props` defaults — but they may not match what's stored in `pages.structure` |
| 14 | **No error recovery** | If a saved page references a component not in resolver, entire editor crashes (as seen with Container bug) |

---

## 7. Edge Functions — Deployed but Unused

These edge functions exist and are deployed but the Dev Portal doesn't call them:

| Edge Function | Purpose | Should Be Called By |
|---------------|---------|---------------------|
| `page-builder-api` | CRUD for pages | PageList, PageBuilderPage (instead of direct `supabase.from('pages')`) |
| `template-api` | CRUD for templates | TemplateLibrary, TemplateEditor |
| `website-settings-api` | CRUD for website settings | AnimationSettings, ButtonCardStyles, IntegrationSettings, DomainSettings |
| `generate-sitemap` | Generate sitemap | Should be triggered after publishing pages |
| `deployment-api` | Deployment tracking | DeploymentList (probably used there, not in website pages) |

---

## 8. File Inventory

### Developer Portal Website Files

| File | Lines | Status |
|------|-------|--------|
| `PageBuilderPage.jsx` | 243 | ✅ Fixed (resolver) |
| `PageList.jsx` | 304 | ✅ Works |
| `NavigationEditor.jsx` | 401 | ✅ Works |
| `WebsiteThemeSettings.jsx` | 558 | ✅ Works |
| `VersionHistory.jsx` | 265 | ✅ Works |
| `WebsiteSEOSettings.jsx` | 435 | ✅ Works (via hook) |
| `TemplateLibrary.jsx` | 425 | ⚠️ Template apply may be fragile |
| `TemplateEditor.jsx` | 475 | 🔴 No tenant filter |
| `AnimationSettings.jsx` | 429 | 🔴 No tenant filter |
| `ButtonCardStyles.jsx` | 601 | 🔴 No tenant filter |
| `IntegrationSettings.jsx` | 537 | 🔴 No tenant filter |
| `DomainSettings.jsx` | 428 | 🔴 No tenant filter |
| `PreviewMode.jsx` | 313 | 🔴 Wrong table name |
| `index.js` | 27 | ✅ Exports |

### Shared Hooks

| File | Lines | Status |
|------|-------|--------|
| `usePages.js` | 215 | ✅ Works |
| `useVersionHistory.js` | 126 | ✅ Works |
| `useWebsiteContent.js` | 287 | ✅ Works |
| `useWebsiteSettings.js` | ~130 | ✅ Works |
| `useNavigation.js` | 131 | ✅ Works |
| `useTheme.js` | 352 | ✅ Works |
| `useWebsiteSEO.js` | 45 | ✅ Works |
| `useWebsitePages.js` | 3 | ✅ Re-export |
| `usePageVersions.js` | 2 | ✅ Re-export |

### Page Builder Components
- **Total:** ~80 files, 15,198 lines
- **Status:** Components seem functional but are never tested with real saved data
