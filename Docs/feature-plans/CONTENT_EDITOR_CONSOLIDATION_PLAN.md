# Content Editor Consolidation Plan

**Date:** February 15, 2026  
**Goal:** Consolidate 13 fragmented CMS sidebar pages into a clean, unified Content Editor with Dashboard-matching styling.

---

## Problem Statement

The admin sidebar currently has **13 separate Website Content pages** that are overwhelming for clinic admins. There are dead duplicate files, two competing content storage systems (`site_settings` vs `pages`), and the Media Library shows clinical data instead of website assets. The styling is inconsistent with the Dashboard.

---

## Current State (13 Sidebar Items)

| # | Page | Route | Table | Lines | Status |
|---|------|-------|-------|-------|--------|
| 1 | Home Page | `/pages/home` | `site_settings` | 851 | **REMOVE** — duplicates Content Editor's `pages` table |
| 2 | Services | `/services` | `services` | 302 | **KEEP** — unique CRUD, separate data |
| 3 | Tourism Packages | `/tourism-packages` | `tourism_packages` | — | **KEEP** — separate module |
| 4 | Portfolio | `/portfolio` | `portfolio_cases` | — | **KEEP** — unique CRUD, separate data |
| 5 | Testimonials | `/testimonials` | `testimonials` | — | **KEEP** — unique CRUD, separate data |
| 6 | Translations | `/translations` | `translations` | 509 | **KEEP** — unique functionality |
| 7 | Media Library | `/media` | Storage `media` | 901 | **KEEP** — but fix bucket issue |
| 8 | Content Editor | `/website/content` | `pages` | 247 | **KEEP & EXPAND** — becomes the hub |
| 9 | Form Submissions | `/form-submissions` | `form_submissions` | 383 | **KEEP** — unique inbox |
| 10 | Content Log | `/content-log` | `content_change_log` | 276 | **MERGE** → into Content Editor tab |
| 11 | Page Versions | `/page-versions` | `page_versions` | 309 | **MERGE** → into Content Editor tab |
| 12 | Content Drafts | `/content-drafts` | `content_drafts` | 319 | **MERGE** → into Content Editor tab |
| 13 | Theme / Design | `/theme` | `website_themes` | 835 | **KEEP** — complex standalone |

---

## Target State (8 Sidebar Items)

After consolidation, the sidebar will have **8 clean items** instead of 13:

| # | Page | Route | What's Inside |
|---|------|-------|---------------|
| 1 | Services | `/services` | Service CRUD (unchanged) |
| 2 | Portfolio | `/portfolio` | Portfolio CRUD (unchanged) |
| 3 | Testimonials | `/testimonials` | Testimonials CRUD (unchanged) |
| 4 | Translations | `/translations` | Translation strings (unchanged) |
| 5 | Media Library | `/media` | Website asset manager (fixed) |
| 6 | **Content Editor** | `/website/content` | **Expanded** — see below |
| 7 | Form Submissions | `/form-submissions` | Form inbox (unchanged) |
| 8 | Theme / Design | `/theme` | Theme builder (unchanged) |

**Removed from sidebar:**
- ~~Home Page~~ (merged into Content Editor)
- ~~Content Log~~ (merged into Content Editor tab)
- ~~Page Versions~~ (merged into Content Editor tab)
- ~~Content Drafts~~ (merged into Content Editor tab)
- ~~Tourism Packages~~ (only if dental-tourism module is inactive)

---

## The New Content Editor

### Layout: Dashboard-Style with Tabs

```
┌─────────────────────────────────────────────────────────────┐
│  Content Editor                              [Page Selector]│
│  Edit your website pages and content                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 📄 Pages │ │ 🕓 History│ │ 📝 Drafts│ │ 📋 Log   │       │
│  │  5 total │ │ 23 vers. │ │  2 pend. │ │ 47 entry │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Tab Content Area — see below]                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tab 1: Pages (Edit) — Default Tab
The main content editing view. Dashboard-styled cards for each section.

**What it does:**
- Page selector dropdown at top (Home, Who We Are, Services, etc.)
- Each section shown as a **white card** (`bg-white rounded-xl shadow-sm border border-gray-100`) matching Dashboard `StatCard` pattern
- Section cards are collapsible (click header to expand/collapse)
- **Image fields**: Show thumbnail preview + "Upload" button that opens a **file picker** (local file system, not URL input). Upload goes to Supabase Storage `media` bucket, URL is saved to content.
- **Text fields**: Inline editable with label
- **Rich text fields**: TipTap editor (already exists via `RichTextEditor`)
- Save button with unsaved changes indicator
- Real-time sync notification when developer updates structure

**Styling changes from current ContentEditor:**
- Header: `text-2xl font-bold text-gray-900` (matches Dashboard)
- Cards: `bg-white rounded-xl shadow-sm p-6 border border-gray-100`
- Buttons: `bg-primary-600 text-white rounded-lg hover:bg-primary-700`
- Status badges: colored pills matching Dashboard pattern
- Section icons: colored circles (`w-10 h-10 rounded-xl`) like StatCard icons

### Tab 2: History (Page Versions)
Moved from standalone `PageVersionsList` page.

**What it shows:**
- Page selector (same as Tab 1, synced)
- Version list for selected page: version number, change type, summary, timestamp
- "Restore" button per version
- Expandable diff view

### Tab 3: Drafts (Content Drafts)
Moved from standalone `ContentDraftsList` page.

**What it shows:**
- Status filter tabs: All | Pending (count) | Approved | Rejected
- Draft cards with page name, changed fields, submitted date
- Approve / Reject buttons with notes
- Expandable detail view

### Tab 4: Log (Content Change Log)
Moved from standalone `ContentChangeLog` page.

**What it shows:**
- Timeline of all content changes
- Type filter (text, image, section, publish, etc.)
- Search by page/field
- Shows old → new values
- Pagination

---

## Image Upload in Content Editor

### Current Problem
`ContentEditorField` shows a text input for image URLs. No visual preview, no file upload.

### New Behavior
For fields with `type: 'image'`:

```
┌─────────────────────────────────────────┐
│  Hero Image                             │
│  ┌──────────────┐                       │
│  │              │  [📁 Upload File]     │
│  │  (thumbnail) │  [🗑️ Remove]          │
│  │   preview    │                       │
│  │              │  hero-banner.jpg      │
│  └──────────────┘  1200 × 600 · 245 KB │
└─────────────────────────────────────────┘
```

- **Upload button** opens native file picker (`<input type="file" accept="image/*">`)
- File uploads to Supabase Storage → `media` bucket → `website/` subfolder
- Thumbnail preview shown (max 200px height)
- File name, dimensions, and size displayed
- "Remove" button clears the image
- No manual URL input needed

---

## Files to Delete (Dead Code)

| File | Lines | Reason |
|------|-------|--------|
| `src/admin/pages/website/TestimonialsManager.jsx` | 340 | Dead duplicate of TestimonialList — not routed |
| `src/admin/pages/website/FormSubmissions.jsx` | 220 | Dead duplicate of FormSubmissionsList — not routed |
| `src/admin/pages/pages/HomePageEditor.jsx` | 851 | Uses stale `site_settings` table — replaced by Content Editor |

**Total dead code removed: ~1,411 lines**

---

## Files to Delete (Standalone pages merged into Content Editor)

These become tabs inside the new Content Editor. The original standalone files will be deleted and their logic integrated:

| File | Lines | Becomes |
|------|-------|---------|
| `src/admin/pages/content-log/ContentChangeLog.jsx` | 276 | Content Editor → Tab 4 "Log" |
| `src/admin/pages/page-versions/PageVersionsList.jsx` | 309 | Content Editor → Tab 2 "History" |
| `src/admin/pages/content-drafts/ContentDraftsList.jsx` | 319 | Content Editor → Tab 3 "Drafts" |

**Total refactored: ~904 lines → integrated into ContentEditor tabs**

---

## Routes to Remove from AdminApp.jsx

```diff
- <Route path="pages/home" element={<HomePageEditor />} />
- <Route path="content-log" element={<ContentChangeLog />} />
- <Route path="page-versions" element={<PageVersionsList />} />
- <Route path="content-drafts" element={<ContentDraftsList />} />
```

## Lazy Imports to Remove from AdminApp.jsx

```diff
- const HomePageEditor = lazy(() => import('./pages/pages/HomePageEditor'));
- const ContentChangeLog = lazy(() => import('./pages/content-log/ContentChangeLog'));
- const PageVersionsList = lazy(() => import('./pages/page-versions/PageVersionsList'));
- const ContentDraftsList = lazy(() => import('./pages/content-drafts/ContentDraftsList'));
```

---

## Sidebar Changes in AdminLayout.jsx

### Remove these menu items:
- ~~Home Page~~ (`/pages/home`)
- ~~Content Log~~ (`/content-log`)
- ~~Page Versions~~ (`/page-versions`)
- ~~Content Drafts~~ (`/content-drafts`)

### Rename "Content Editor" to just:
**"Content Editor"** with icon `FileText` at path `/website/content`

### Final sidebar order:
1. Services
2. Portfolio
3. Testimonials
4. Translations
5. Media Library
6. **Content Editor** (with History/Drafts/Log tabs inside)
7. Form Submissions
8. Theme / Design

---

## Implementation Steps

### Step 1: Delete Dead Files
- Delete `TestimonialsManager.jsx` (340 lines)
- Delete `FormSubmissions.jsx` (220 lines)
- Delete `HomePageEditor.jsx` (851 lines)

### Step 2: Rewrite Content Editor
Create new `ContentEditor.jsx` (~600 lines) with:
- Dashboard-matching styles (StatCard pattern, white cards, colored icons)
- 4 tabs: Pages | History | Drafts | Log
- Tab 1: Current ContentEditor logic (restyled)
- Tab 2: PageVersionsList logic (embedded)
- Tab 3: ContentDraftsList logic (embedded)
- Tab 4: ContentChangeLog logic (embedded)
- Image fields with file upload + thumbnail preview

### Step 3: Update Image Handling
Modify `ContentEditorField.jsx`:
- Add `<input type="file">` for image fields
- Upload to Supabase Storage `media/website/` folder
- Show thumbnail preview with dimensions/size
- Remove URL text input for images

### Step 4: Clean AdminApp.jsx
- Remove 4 lazy imports (HomePageEditor, ContentChangeLog, PageVersionsList, ContentDraftsList)
- Remove 4 routes
- Keep ContentEditor route unchanged

### Step 5: Clean AdminLayout.jsx Sidebar
- Remove 4 menu items from sidebar
- Keep remaining 8 items in clean order

### Step 6: Delete Merged Files
- Delete `content-log/ContentChangeLog.jsx`
- Delete `page-versions/PageVersionsList.jsx`
- Delete `content-drafts/ContentDraftsList.jsx`

### Step 7: Verify Build
- Run `npx vite build`
- Confirm no broken imports
- Confirm sidebar has 8 items

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Sidebar items | 13 | 8 |
| Dead files | 3 | 0 |
| Total lines removed | ~2,315 | — |
| Content storage systems | 2 (`site_settings` + `pages`) | 1 (`pages` only) |
| Image upload UX | URL text input | File picker + preview |
| History/Drafts/Log | 3 separate pages | 3 tabs in Content Editor |
| Styling | Inconsistent | Dashboard-matched |

---

## What Stays Unchanged

- **Services** — separate CRUD, different data (`services` table)
- **Portfolio** — separate CRUD, different data (`portfolio_cases` table)
- **Testimonials** — separate CRUD, different data (`testimonials` table)
- **Translations** — unique string management (`translations` table)
- **Media Library** — file manager (Supabase Storage)
- **Form Submissions** — inbox for website forms (`form_submissions` table)
- **Theme / Design** — complex theme builder (`website_themes` table)

These pages have genuinely different data sources and functionality — they are NOT duplications. Only the content workflow pages (editor + history + drafts + log) overlap and should be consolidated.
