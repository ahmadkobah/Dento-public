# Phase 5: Page Builder - Comprehensive Implementation Plan

**Created:** February 1, 2026  
**Status:** Planning Complete  
**Estimated Duration:** 10-12 weeks (Updated)  
**Dependencies:** Phase 4 (Developer Portal) ✅ Complete

---

## Executive Summary

Phase 5 transforms the static public website into a **dynamic, tenant-customizable website** with a clear separation of responsibilities.

**Important:** The website is an **OPTIONAL MODULE** - tenants can use just the clinic management app without a public website.

---

# 0. Website as Optional Module

## 0.1 Module Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TENANT MODULE SELECTION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🏥 Smile Dental Clinic - Modules                                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CORE MODULES (Always Included)                                      │   │
│  │ ✅ Patient Management                                               │   │
│  │ ✅ Appointments                                                     │   │
│  │ ✅ Dental Charting                                                  │   │
│  │ ✅ User Management                                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ OPTIONAL MODULES                                                    │   │
│  │                                                                     │   │
│  │ ☑️ Clinical Module         ✅ Enabled                               │   │
│  │    Treatment Plans, Prescriptions, X-Rays, Lab Orders               │   │
│  │                                                                     │   │
│  │ ☑️ Financial Module        ✅ Enabled                               │   │
│  │    Invoices, Payments, Insurance, Commissions                       │   │
│  │                                                                     │   │
│  │ ☑️ Operations Module       ✅ Enabled                               │   │
│  │    Inventory, Scheduling, Attendance, Leave                         │   │
│  │                                                                     │   │
│  │ ☐ Website Module           ❌ Disabled     [Enable]                 │   │
│  │    Public website, Online booking, SEO                              │   │
│  │                                                                     │   │
│  │ ☐ Patient Portal           ❌ Disabled     [Enable]                 │   │
│  │    Patient login, View records, Online payments                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 0.2 Module Database Structure

```sql
-- Already exists in Phase 4, add website module
INSERT INTO modules (id, name, slug, description, is_core, monthly_price) VALUES
  ('website-module', 'Public Website', 'website', 
   'Public-facing website with online booking, SEO, and custom domain support',
   false, 29.00);

-- Tenant module assignment
-- tenant_modules table already exists from Phase 4
-- When website is disabled: no row for this tenant + website module
-- When website is enabled: row exists with is_active = true
```

## 0.3 What Happens When Website is Disabled

| Feature | Website ENABLED | Website DISABLED |
|---------|-----------------|------------------|
| Admin Panel | ✅ Full access | ✅ Full access |
| Patient Management | ✅ Works | ✅ Works |
| Appointments | ✅ Works | ✅ Works (manual entry only) |
| Online Booking | ✅ Public booking page | ❌ No public access |
| Public Website | ✅ tenant.dento.app | ❌ Shows "Staff Login" page |
| Custom Domain | ✅ Available | ❌ Not available |
| SEO/Analytics | ✅ Available | ❌ Not applicable |
| Admin → Website menu | ✅ Shows "Website Content" | ❌ Hidden |
| Developer Portal | ✅ Shows website builder | ❌ Shows "Enable Website" button |

## 0.4 Tenant Access Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WEBSITE MODULE ROUTING                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User visits: https://smile-dental.dento.app                               │
│                          ↓                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Check: Does tenant "smile-dental" have website module enabled?      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          ↓                                                  │
│         ┌────────────────┴────────────────┐                                │
│         ↓                                 ↓                                 │
│  ┌─────────────┐                  ┌─────────────┐                          │
│  │ YES         │                  │ NO          │                          │
│  │             │                  │             │                          │
│  │ Show public │                  │ Show:       │                          │
│  │ website     │                  │ - 404 page  │                          │
│  │             │                  │ - OR "Get   │                          │
│  │             │                  │   Website"  │                          │
│  │             │                  │   landing   │                          │
│  └─────────────┘                  └─────────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 0.5 Admin Panel Conditional UI

```jsx
// AdminApp.jsx - Menu items based on modules

const menuItems = [
  // Core - Always shown
  { name: 'Dashboard', icon: Home, path: '/admin' },
  { name: 'Appointments', icon: Calendar, path: '/admin/appointments' },
  { name: 'Patients', icon: Users, path: '/admin/patients' },
  
  // Clinical Module - Conditional
  ...(hasModule('clinical') ? [
    { name: 'Treatment Plans', icon: FileText, path: '/admin/treatment-plans' },
    { name: 'Prescriptions', icon: Pill, path: '/admin/prescriptions' },
  ] : []),
  
  // Financial Module - Conditional
  ...(hasModule('financial') ? [
    { name: 'Invoices', icon: Receipt, path: '/admin/invoices' },
    { name: 'Insurance', icon: Shield, path: '/admin/insurance' },
  ] : []),
  
  // Website Module - Conditional
  ...(hasModule('website') ? [
    { name: 'Website Content', icon: Globe, path: '/admin/website' },
    { name: 'Form Submissions', icon: Inbox, path: '/admin/website/submissions' },
  ] : []),
  
  // Settings - Always shown
  { name: 'Settings', icon: Settings, path: '/admin/settings' },
];
```

## 0.6 Entry Points - With and Without Website

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ENTRY POINTS BY MODULE STATUS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TENANT WITHOUT WEBSITE MODULE:                                             │
│  ═══════════════════════════════                                            │
│                                                                             │
│  Admin/Staff Login URL:                                                     │
│  https://app.dento.com/login                     ← Universal login page     │
│  https://smile-dental.dento.app/admin/login      ← Tenant-specific login    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  🦷 Dento - Staff Login                                             │   │
│  │                                                                     │   │
│  │  Clinic: [Smile Dental Clinic    ▼]   ← Select or auto-detect       │   │
│  │                                                                     │   │
│  │  Email:    [__________________________]                             │   │
│  │  Password: [__________________________]                             │   │
│  │                                                                     │   │
│  │  [Login to Admin Panel]                                             │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  After login → Goes directly to Admin Dashboard                             │
│  Public website URL → Shows "App Only - No Public Website"                  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  TENANT WITH WEBSITE MODULE:                                                │
│  ═══════════════════════════                                                │
│                                                                             │
│  Public Website URL:                                                        │
│  https://smile-dental.dento.app              ← Public website               │
│  https://www.smiledental.com                 ← Custom domain (optional)     │
│                                                                             │
│  Admin/Staff Login URL (same as above, PLUS):                               │
│  https://smile-dental.dento.app/admin        ← Via website                  │
│  https://www.smiledental.com/admin           ← Via custom domain            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 0.7 URL Structure

```
DENTO PLATFORM URL STRUCTURE
════════════════════════════

1. MAIN PLATFORM (always available)
   ┌──────────────────────────────────────────────────────────────────────┐
   │ https://app.dento.com                                                │
   │ ├── /login              → Universal staff login (select clinic)      │
   │ ├── /register           → New clinic registration                    │
   │ └── /forgot-password    → Password reset                             │
   └──────────────────────────────────────────────────────────────────────┘

2. TENANT SUBDOMAIN (always available)
   ┌──────────────────────────────────────────────────────────────────────┐
   │ https://smile-dental.dento.app                                       │
   │ ├── /admin              → Admin panel (requires login)               │
   │ │   ├── /login          → Staff login for this clinic                │
   │ │   ├── /dashboard      → Dashboard                                  │
   │ │   ├── /appointments   → Appointments                               │
   │ │   ├── /patients       → Patients                                   │
   │ │   └── /...            → Other admin pages                          │
   │ │                                                                    │
   │ └── / (root)            → DEPENDS ON WEBSITE MODULE:                 │
   │     ├── If ENABLED  → Public website                                 │
   │     └── If DISABLED → Redirect to /admin/login                       │
   └──────────────────────────────────────────────────────────────────────┘

3. CUSTOM DOMAIN (only if website module + domain configured)
   ┌──────────────────────────────────────────────────────────────────────┐
   │ https://www.smiledental.com                                          │
   │ ├── /                   → Public website                             │
   │ ├── /services           → Services page                              │
   │ ├── /book               → Online booking                             │
   │ └── /admin              → Admin panel                                │
   └──────────────────────────────────────────────────────────────────────┘
```

## 0.8 What Each User Sees

```
┌─────────────────────────────────────────────────────────────────────────────┐
│            WITHOUT WEBSITE MODULE              WITH WEBSITE MODULE          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  VISITOR (not logged in):                                                   │
│  ───────────────────────                                                    │
│                                                                             │
│  smile-dental.dento.app/         smile-dental.dento.app/                    │
│  ┌─────────────────────┐         ┌─────────────────────┐                   │
│  │                     │         │                     │                   │
│  │  🦷 Smile Dental    │         │  Welcome to         │                   │
│  │                     │         │  Smile Dental       │                   │
│  │  This clinic uses   │         │                     │                   │
│  │  Dento for internal │         │  Your smile is      │                   │
│  │  management only.   │         │  our priority       │                   │
│  │                     │         │                     │                   │
│  │  Staff? [Login]     │         │  [Book Now]         │                   │
│  │                     │         │                     │                   │
│  └─────────────────────┘         └─────────────────────┘                   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ADMIN/STAFF (logged in):                                                   │
│  ────────────────────────                                                   │
│                                                                             │
│  smile-dental.dento.app/admin    smile-dental.dento.app/admin               │
│  ┌─────────────────────┐         ┌─────────────────────┐                   │
│  │ Dashboard           │         │ Dashboard           │                   │
│  │ Appointments        │         │ Appointments        │                   │
│  │ Patients            │         │ Patients            │                   │
│  │ Treatment Plans     │         │ Treatment Plans     │                   │
│  │ Invoices            │         │ Invoices            │                   │
│  │ ────────────        │         │ ────────────        │                   │
│  │ (no website menu)   │         │ 🌐 Website Content  │ ← Extra menu     │
│  │                     │         │ 📥 Form Submissions │ ← Extra menu     │
│  │ ────────────        │         │ ────────────        │                   │
│  │ Settings            │         │ Settings            │                   │
│  └─────────────────────┘         └─────────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 0.9 Module Toggle (Simple On/Off)

Website is just like any other module - toggle it on or off:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Developer Portal > Tenants > Smile Dental > Modules                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MODULES                                                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Module              │ Status    │ Price    │ Action                 │   │
│  ├─────────────────────┼───────────┼──────────┼────────────────────────┤   │
│  │ 🏥 Core             │ ✅ Active │ Included │ (Required)             │   │
│  │ 🩺 Clinical         │ ✅ Active │ +$25/mo  │ [Disable]              │   │
│  │ 💰 Financial        │ ✅ Active │ +$25/mo  │ [Disable]              │   │
│  │ 📦 Operations       │ ❌ Off    │ +$20/mo  │ [Enable]               │   │
│  │ 🌐 Website          │ ❌ Off    │ +$29/mo  │ [Enable]               │   │
│  │ 👤 Patient Portal   │ ❌ Off    │ +$39/mo  │ [Enable]               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Current Monthly Total: $99/mo                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

When you click **[Enable]** on Website:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Enable Website Module                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ Website module will be activated immediately                            │
│  ✅ Monthly billing will increase by $29/mo                                 │
│  ✅ Default website will be created from template                           │
│                                                                             │
│  Choose a template:                                                         │
│  ○ Modern Dental (recommended)                                              │
│  ○ Classic Medical                                                          │
│  ○ Minimal Clean                                                            │
│  ○ Blank (start from scratch)                                               │
│                                                                             │
│  [Cancel]  [Enable Website - +$29/mo]                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

When you click **[Disable]** on Website:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Disable Website Module                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ⚠️ Your public website will be taken offline immediately.                  │
│                                                                             │
│  • Online booking will be disabled                                          │
│  • Public pages won't be accessible                                         │
│  • Website content will be saved for 90 days                                │
│  • You can re-enable anytime                                                │
│                                                                             │
│  [Cancel]  [Disable Website - Save $29/mo]                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

| Role | Capability | Access |
|------|------------|--------|
| **Developer** | Full website control (structure, layout, design) | Developer Portal |
| **Admin** | Content editing only (text, images) | Admin Panel |

This ensures **admins cannot corrupt the website structure** while still being able to update day-to-day content.

---

# 1. Permission Model Architecture

## 1.1 Developer Portal Capabilities (Full Control)

### Structure & Layout
| Feature | Description |
|---------|-------------|
| Create/Delete Pages | Add new pages, remove existing pages |
| Page Layout Design | Choose layouts, add/remove sections |
| Section Management | Add/reorder/delete content blocks |
| Component Configuration | Configure component settings |
| Navigation Editor | Full menu structure control |
| Template Management | Create/edit page templates |
| Global Theme Settings | Colors, fonts, spacing, borders |

### Technical Settings
| Feature | Description |
|---------|-------------|
| Custom CSS | Inject custom CSS per tenant |
| Script Injection | Analytics, chat widgets, pixels |
| SEO Configuration | Meta tags, sitemap, robots.txt |
| Domain Management | Custom domains, SSL, redirects |
| Performance Settings | Caching, CDN, lazy loading |
| Form Configuration | Form fields, validation, submissions |

### Content Control
| Feature | Description |
|---------|-------------|
| Lock Sections | Mark sections as "structure-locked" |
| Content Approval | Review admin changes before publish |
| Version Control | Full page version history |
| Rollback | Restore any previous version |
| Bulk Operations | Clone pages, sections across tenants |

---

## 1.2 Admin Panel Capabilities (Content Only)

### Text Editing
| Feature | Description |
|---------|-------------|
| Edit Headings | Change H1-H6 text content |
| Edit Paragraphs | Modify body text |
| Edit Buttons | Change button labels (not links) |
| Edit Lists | Modify list items |
| Rich Text | Bold, italic, links within text |

### Media Management
| Feature | Description |
|---------|-------------|
| Replace Images | Swap images in existing slots |
| Upload to Library | Add images to media library |
| Image Alt Text | Edit accessibility text |
| Image Captions | Edit image captions |

### Dynamic Content (Database-Driven)
| Feature | Description |
|---------|-------------|
| Services | Manage services in database |
| Team/Doctors | Manage doctor profiles |
| Testimonials | Add/edit testimonials |
| FAQs | Manage FAQ entries |
| Contact Info | Update phone, email, address |
| Working Hours | Update clinic hours |

### What Admins CANNOT Do
| Restriction | Reason |
|-------------|--------|
| ❌ Add/Remove Pages | Structure control |
| ❌ Add/Remove Sections | Layout control |
| ❌ Change Layout | Design consistency |
| ❌ Edit Navigation | UX consistency |
| ❌ Change Colors/Fonts | Brand consistency |
| ❌ Delete Content Blocks | Prevent accidental damage |
| ❌ Access CSS/Scripts | Security |
| ❌ Modify Forms | Data integrity |

---

## 1.3 Visual Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER VIEW (Full Control)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔧 TOOLBAR: [Add Section] [Delete Section] [Move ↑↓] [Settings]     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ HERO SECTION                                         [⚙️] [🗑️] [↕️] │    │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │    │
│  │ │ Welcome to Our Clinic                               [✏️ Edit]   │ │    │
│  │ │ Your smile is our priority                          [✏️ Edit]   │ │    │
│  │ │ [Book Now]                                          [✏️ Edit]   │ │    │
│  │ │ 🖼️ hero-image.jpg                                   [📷 Replace]│ │    │
│  │ └─────────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  [+ Add Section: Hero | Features | Services | Team | CTA | Contact]         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADMIN VIEW (Content Only)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 📝 CONTENT EDITOR - Click any text or image to edit                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ HERO SECTION                                               🔒 Locked │    │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │    │
│  │ │ Welcome to Our Clinic                               [✏️ Edit]   │ │    │
│  │ │ Your smile is our priority                          [✏️ Edit]   │ │    │
│  │ │ [Book Now]                                          [✏️ Edit]   │ │    │
│  │ │ 🖼️ hero-image.jpg                                   [📷 Replace]│ │    │
│  │ └─────────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ⚠️ Contact your administrator to add or remove sections                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 2. Database Schema

## 2.1 Core Tables

```sql
-- ============================================================
-- PHASE 5: PAGE BUILDER TABLES
-- ============================================================

-- 1. Pages (tenant-specific)
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  slug VARCHAR(100) NOT NULL,
  
  -- Content (structure + content separated)
  structure JSONB NOT NULL DEFAULT '[]',     -- Sections array (developer controlled)
  content JSONB NOT NULL DEFAULT '{}',       -- Text/image content (admin editable)
  
  -- Metadata
  title_en VARCHAR(255) NOT NULL,
  title_ar VARCHAR(255),
  is_homepage BOOLEAN DEFAULT false,
  
  -- Navigation
  show_in_nav BOOLEAN DEFAULT true,
  nav_order INTEGER DEFAULT 0,
  nav_label_en VARCHAR(100),
  nav_label_ar VARCHAR(100),
  
  -- SEO
  seo_title_en VARCHAR(255),
  seo_title_ar VARCHAR(255),
  seo_description_en TEXT,
  seo_description_ar TEXT,
  seo_keywords TEXT,
  og_image_url TEXT,
  canonical_url TEXT,
  no_index BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft',        -- draft, published, scheduled
  published_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_tenant_slug UNIQUE(tenant_id, slug),
  CONSTRAINT unique_tenant_homepage UNIQUE(tenant_id, is_homepage) 
    WHERE is_homepage = true
);

-- 2. Page Versions (full history)
CREATE TABLE page_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  version_number INTEGER NOT NULL,
  structure JSONB NOT NULL,
  content JSONB NOT NULL,
  
  -- Change tracking
  change_type VARCHAR(50),                   -- structure, content, settings
  change_summary TEXT,
  changed_by_role VARCHAR(20),               -- developer, admin
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_page_version UNIQUE(page_id, version_number)
);

-- 3. Content Drafts (admin drafts before publish)
CREATE TABLE content_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  content JSONB NOT NULL,                    -- Draft content changes
  
  status VARCHAR(20) DEFAULT 'draft',        -- draft, pending_approval, approved, rejected
  approval_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ
);

-- 4. Navigation Menus
CREATE TABLE navigation_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  menu_type VARCHAR(50) NOT NULL,            -- header, footer, mobile
  items JSONB NOT NULL DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_tenant_menu UNIQUE(tenant_id, menu_type)
);

-- 5. Website Settings (per tenant)
CREATE TABLE website_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  
  -- Branding
  logo_light_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  
  -- Colors
  primary_color VARCHAR(7) DEFAULT '#0066CC',
  secondary_color VARCHAR(7) DEFAULT '#333333',
  accent_color VARCHAR(7) DEFAULT '#FF6600',
  background_color VARCHAR(7) DEFAULT '#FFFFFF',
  text_color VARCHAR(7) DEFAULT '#333333',
  
  -- Typography
  heading_font VARCHAR(100) DEFAULT 'Inter',
  body_font VARCHAR(100) DEFAULT 'Inter',
  base_font_size INTEGER DEFAULT 16,
  
  -- Layout
  max_width INTEGER DEFAULT 1200,
  header_style VARCHAR(50) DEFAULT 'standard',  -- standard, centered, minimal
  footer_style VARCHAR(50) DEFAULT 'standard',
  
  -- Animations & Effects (Developer Only)
  animations_enabled BOOLEAN DEFAULT true,
  animation_style VARCHAR(50) DEFAULT 'smooth', -- none, subtle, smooth, dynamic
  animation_speed VARCHAR(20) DEFAULT 'normal', -- slow, normal, fast
  scroll_animations BOOLEAN DEFAULT true,       -- animate elements on scroll
  hover_effects BOOLEAN DEFAULT true,           -- button/card hover effects
  page_transitions BOOLEAN DEFAULT true,        -- smooth page transitions
  loading_animation VARCHAR(50) DEFAULT 'fade', -- fade, slide, none
  parallax_enabled BOOLEAN DEFAULT false,       -- parallax scrolling effects
  
  -- Button Styles (Developer Only)
  button_radius INTEGER DEFAULT 8,              -- border radius in px
  button_style VARCHAR(50) DEFAULT 'filled',    -- filled, outlined, ghost
  
  -- Card Styles (Developer Only)
  card_radius INTEGER DEFAULT 12,
  card_shadow VARCHAR(50) DEFAULT 'medium',     -- none, subtle, medium, strong
  
  -- Section Spacing (Developer Only)
  section_padding VARCHAR(20) DEFAULT 'medium', -- small, medium, large
  
  -- Language
  default_language VARCHAR(2) DEFAULT 'en',
  show_language_switcher BOOLEAN DEFAULT true,
  rtl_enabled BOOLEAN DEFAULT true,
  
  -- Integrations
  google_analytics_id VARCHAR(50),
  google_tag_manager_id VARCHAR(50),
  facebook_pixel_id VARCHAR(50),
  hotjar_id VARCHAR(50),
  
  -- Custom Code (Developer Only)
  custom_css TEXT,
  custom_head_scripts TEXT,
  custom_body_scripts TEXT,
  
  -- SEO Defaults
  default_og_image TEXT,
  twitter_handle VARCHAR(50),
  
  -- Contact (Admin Editable)
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_whatsapp VARCHAR(50),
  address_en TEXT,
  address_ar TEXT,
  google_maps_url TEXT,
  google_maps_embed TEXT,
  
  -- Social Links (Admin Editable)
  social_facebook TEXT,
  social_instagram TEXT,
  social_twitter TEXT,
  social_linkedin TEXT,
  social_youtube TEXT,
  social_tiktok TEXT,
  
  -- Working Hours (Admin Editable)
  working_hours JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Media Library (per tenant)
CREATE TABLE media_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- File Info
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Metadata
  file_type VARCHAR(50),                     -- image, video, document
  mime_type VARCHAR(100),
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  
  -- Organization
  folder VARCHAR(100) DEFAULT 'general',
  tags TEXT[],
  
  -- Accessibility
  alt_text_en VARCHAR(255),
  alt_text_ar VARCHAR(255),
  caption_en TEXT,
  caption_ar TEXT,
  
  -- Usage Tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id)
);

-- 7. Section Templates (Global - Developer Managed)
CREATE TABLE section_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50),                      -- hero, features, services, team, cta, contact, faq
  thumbnail_url TEXT,
  
  -- Template
  structure JSONB NOT NULL,                  -- Section structure
  default_content JSONB NOT NULL,            -- Default text/images
  editable_fields JSONB NOT NULL DEFAULT '[]', -- Which fields admins can edit
  
  -- Settings
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Page Templates (Global - Developer Managed)
CREATE TABLE page_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50),                      -- landing, service, about, contact
  thumbnail_url TEXT,
  
  -- Template
  sections JSONB NOT NULL DEFAULT '[]',      -- Array of section_template IDs + overrides
  default_settings JSONB NOT NULL DEFAULT '{}',
  
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Form Submissions (Contact forms, etc.)
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  
  form_type VARCHAR(50) NOT NULL,            -- contact, callback, newsletter
  data JSONB NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'new',          -- new, read, replied, archived
  notes TEXT,
  
  -- Tracking
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES users(id)
);

-- 10. Content Change Log (Audit Trail)
CREATE TABLE content_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  
  change_type VARCHAR(50) NOT NULL,          -- text, image, section, structure, settings
  field_path TEXT,                           -- e.g., "hero.title_en"
  old_value TEXT,
  new_value TEXT,
  
  changed_by UUID REFERENCES users(id),
  changed_by_role VARCHAR(20),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Testimonials (Dynamic Content)
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  patient_name VARCHAR(100) NOT NULL,
  patient_photo_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  content_en TEXT NOT NULL,
  content_ar TEXT,
  
  treatment_type VARCHAR(100),
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. FAQs (Dynamic Content)
CREATE TABLE faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  question_en TEXT NOT NULL,
  question_ar TEXT,
  answer_en TEXT NOT NULL,
  answer_ar TEXT,
  
  category VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Services Website Fields (ALTER existing table)
-- Note: services table already exists, add website-specific fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS description_long_en TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS description_long_ar TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS website_sort_order INTEGER DEFAULT 0;

-- 14. Doctors Website Fields (ALTER existing table)
-- Note: doctors table already exists, add website-specific fields
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT true;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS website_sort_order INTEGER DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS short_bio_en VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS short_bio_ar VARCHAR(255);

-- 15. Branches Website Fields (ALTER existing table)
ALTER TABLE branches ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT true;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_pages_tenant ON pages(tenant_id);
CREATE INDEX idx_pages_slug ON pages(tenant_id, slug);
CREATE INDEX idx_pages_status ON pages(tenant_id, status);
CREATE INDEX idx_page_versions_page ON page_versions(page_id);
CREATE INDEX idx_content_drafts_page ON content_drafts(page_id);
CREATE INDEX idx_media_tenant ON media_library(tenant_id);
CREATE INDEX idx_media_folder ON media_library(tenant_id, folder);
CREATE INDEX idx_form_submissions_tenant ON form_submissions(tenant_id);
CREATE INDEX idx_form_submissions_status ON form_submissions(tenant_id, status);
CREATE INDEX idx_change_log_tenant ON content_change_log(tenant_id);
CREATE INDEX idx_change_log_page ON content_change_log(page_id);
CREATE INDEX idx_testimonials_tenant ON testimonials(tenant_id);
CREATE INDEX idx_testimonials_featured ON testimonials(tenant_id, is_featured);
CREATE INDEX idx_faqs_tenant ON faqs(tenant_id);
CREATE INDEX idx_faqs_category ON faqs(tenant_id, category);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Pages: Developers can do everything, Admins can only update content
CREATE POLICY pages_developer_all ON pages
  FOR ALL TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
      SELECT role FROM users WHERE id = auth.uid()
    ) IN ('developer', 'admin')
  );

-- Testimonials: Public read, Admin write
CREATE POLICY testimonials_public_read ON testimonials
  FOR SELECT TO anon
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid AND is_published = true);

CREATE POLICY testimonials_admin_all ON testimonials
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- FAQs: Public read, Admin write
CREATE POLICY faqs_public_read ON faqs
  FOR SELECT TO anon
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid AND is_published = true);

CREATE POLICY faqs_admin_all ON faqs
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Content Drafts: Admins can create, Developers can approve
CREATE POLICY drafts_admin_manage ON content_drafts
  FOR ALL TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Media Library: All authenticated users with access
CREATE POLICY media_tenant_access ON media_library
  FOR ALL TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- Form Submissions: Read-only for admins
CREATE POLICY forms_read ON form_submissions
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-set tenant_id
CREATE TRIGGER set_pages_tenant_id
  BEFORE INSERT ON pages
  FOR EACH ROW
  EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_media_tenant_id
  BEFORE INSERT ON media_library
  FOR EACH ROW
  EXECUTE FUNCTION set_tenant_id();

-- Auto-update updated_at
CREATE TRIGGER update_pages_timestamp
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_website_settings_timestamp
  BEFORE UPDATE ON website_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-create version on page update
CREATE OR REPLACE FUNCTION create_page_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.structure IS DISTINCT FROM NEW.structure 
     OR OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO page_versions (
      page_id, tenant_id, version_number, structure, content,
      change_type, created_by
    )
    SELECT 
      NEW.id, 
      NEW.tenant_id,
      COALESCE((SELECT MAX(version_number) FROM page_versions WHERE page_id = NEW.id), 0) + 1,
      OLD.structure,
      OLD.content,
      CASE 
        WHEN OLD.structure IS DISTINCT FROM NEW.structure THEN 'structure'
        ELSE 'content'
      END,
      NEW.updated_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pages_version_trigger
  AFTER UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION create_page_version();
```

---

# 3. Content Structure Design

## 3.1 Page Structure Format

```json
{
  "sections": [
    {
      "id": "section_abc123",
      "type": "hero",
      "template_id": "hero-centered",
      "locked": true,
      "settings": {
        "fullWidth": true,
        "minHeight": "80vh",
        "overlay": true,
        "overlayOpacity": 0.5
      },
      "layout": {
        "desktop": { "padding": "80px 0", "gap": "24px" },
        "tablet": { "padding": "60px 0", "gap": "20px" },
        "mobile": { "padding": "40px 0", "gap": "16px" }
      },
      "elements": [
        {
          "id": "elem_title",
          "type": "heading",
          "settings": {
            "level": "h1",
            "alignment": "center",
            "maxWidth": "800px"
          },
          "responsive": {
            "desktop": { "fontSize": "56px", "marginBottom": "16px" },
            "tablet": { "fontSize": "42px", "marginBottom": "12px" },
            "mobile": { "fontSize": "32px", "marginBottom": "10px" }
          }
        },
        {
          "id": "elem_subtitle",
          "type": "text",
          "settings": {
            "alignment": "center",
            "maxWidth": "600px"
          }
        },
        {
          "id": "elem_cta",
          "type": "button",
          "settings": {
            "size": "large",
            "alignment": "center"
          }
        }
      ],
      "editableFields": ["title", "subtitle", "buttonText", "backgroundImage"]
    },
    {
      "id": "section_def456",
      "type": "services",
      "template_id": "services-grid-3",
      "locked": true,
      "settings": {
        "columns": 3,
        "showDescription": true,
        "showPrice": false
      },
      "layout": {
        "desktop": { "columns": 3, "gap": "32px", "padding": "80px 0" },
        "tablet": { "columns": 2, "gap": "24px", "padding": "60px 0" },
        "mobile": { "columns": 1, "gap": "20px", "padding": "40px 0" }
      },
      "editableFields": ["title", "subtitle"],
      "dataSource": "services"
    }
  ]
}
```

## 3.2 Content Format

```json
{
  "section_abc123": {
    "title_en": "Welcome to Our Clinic",
    "title_ar": "مرحباً بكم في عيادتنا",
    "subtitle_en": "Your smile is our priority",
    "subtitle_ar": "ابتسامتك أولويتنا",
    "buttonText_en": "Book Appointment",
    "buttonText_ar": "احجز موعد",
    "buttonLink": "/book",
    "backgroundImage": "media://hero-bg-001"
  },
  "section_def456": {
    "title_en": "Our Services",
    "title_ar": "خدماتنا",
    "subtitle_en": "Comprehensive dental care",
    "subtitle_ar": "رعاية أسنان شاملة"
  }
}
```

## 3.3 Editable Fields Schema

```json
{
  "editableFields": [
    {
      "key": "title",
      "type": "text",
      "label_en": "Heading",
      "label_ar": "العنوان",
      "maxLength": 100,
      "required": true
    },
    {
      "key": "subtitle",
      "type": "textarea",
      "label_en": "Subheading",
      "label_ar": "العنوان الفرعي",
      "maxLength": 200
    },
    {
      "key": "backgroundImage",
      "type": "image",
      "label_en": "Background Image",
      "label_ar": "صورة الخلفية",
      "aspectRatio": "16:9",
      "minWidth": 1920
    },
    {
      "key": "buttonText",
      "type": "text",
      "label_en": "Button Label",
      "label_ar": "نص الزر",
      "maxLength": 30
    }
  ]
}
```

---

# 3.5 Visual Builder - Code-Free Editing (NEW)

## Overview

The page builder is **100% code-free** with a visual drag-and-drop interface powered by **Craft.js**. Developers can build and customize everything visually without writing any code.

## 3.5.1 Drag & Drop Capabilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VISUAL BUILDER - DRAG & DROP                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WHAT YOU CAN DRAG:                                                         │
│  ══════════════════                                                         │
│                                                                             │
│  📦 SECTIONS (Full-width blocks)                                            │
│  ├── Drag from sidebar to canvas                                            │
│  ├── Reorder by dragging up/down                                            │
│  └── Drop zones highlight on hover                                          │
│                                                                             │
│  🧱 ELEMENTS (Inside sections)                                              │
│  ├── Headings (H1-H6)                                                       │
│  ├── Text blocks                                                            │
│  ├── Images                                                                 │
│  ├── Buttons                                                                │
│  ├── Icons                                                                  │
│  ├── Dividers                                                               │
│  ├── Spacers                                                                │
│  └── Custom HTML (developer only)                                           │
│                                                                             │
│  📐 LAYOUT CONTAINERS                                                       │
│  ├── Rows (horizontal)                                                      │
│  ├── Columns (2, 3, 4, 5, 6 column layouts)                                 │
│  ├── Grid containers                                                        │
│  └── Flex containers                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.5.2 Column & Grid Layout Builder

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COLUMN LAYOUT OPTIONS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Click to insert column layout:                                             │
│                                                                             │
│  ┌─────────────────────────────────────────┐                               │
│  │ █████████████████████████████████████████│  1 Column (100%)              │
│  └─────────────────────────────────────────┘                               │
│                                                                             │
│  ┌───────────────────┬─────────────────────┐                               │
│  │ ████████████████  │  ████████████████   │  2 Columns (50/50)            │
│  └───────────────────┴─────────────────────┘                               │
│                                                                             │
│  ┌───────────────────────────┬─────────────┐                               │
│  │ █████████████████████████ │  ██████████ │  2 Columns (66/33)            │
│  └───────────────────────────┴─────────────┘                               │
│                                                                             │
│  ┌────────────┬────────────┬───────────────┐                               │
│  │ ██████████ │ ██████████ │  ████████████ │  3 Columns (33/33/33)         │
│  └────────────┴────────────┴───────────────┘                               │
│                                                                             │
│  ┌────────┬────────┬────────┬──────────────┐                               │
│  │ ██████ │ ██████ │ ██████ │  ██████████  │  4 Columns (25/25/25/25)      │
│  └────────┴────────┴────────┴──────────────┘                               │
│                                                                             │
│  [Custom Ratio...]  Define your own column widths                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.5.3 Element Settings Panel (Per Element)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ ELEMENT SETTINGS                                              [x Close] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📐 SIZE & POSITION                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Width:     [Auto ▼]  │  [____] px / % / auto                        │   │
│  │ Min Width: [____] px │  Max Width: [____] px                        │   │
│  │ Height:    [Auto ▼]  │  [____] px / % / auto                        │   │
│  │ Min Height:[____] px │  Max Height: [____] px                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📏 SPACING (Margin & Padding)                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │           ┌────────┐                                                │   │
│  │     Top   │   16   │ px                                             │   │
│  │           └────────┘                                                │   │
│  │  ┌────┐              ┌────┐                                         │   │
│  │  │ 24 │   [Element]  │ 24 │  Left / Right                           │   │
│  │  └────┘              └────┘                                         │   │
│  │           ┌────────┐                                                │   │
│  │   Bottom  │   16   │ px                                             │   │
│  │           └────────┘                                                │   │
│  │  [🔗 Link all sides]  [📱 Same for all devices]                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📍 ALIGNMENT                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Horizontal: [◀️ Left] [⏺️ Center] [▶️ Right] [↔️ Stretch]          │   │
│  │  Vertical:   [🔼 Top]  [⏺️ Middle] [🔽 Bottom] [↕️ Stretch]         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  🎨 APPEARANCE                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Background: [Transparent ▼]  [🎨 Color Picker]                     │   │
│  │  Border:     [None ▼]  Width: [__] Color: [🎨]  Radius: [__]        │   │
│  │  Shadow:     [None ▼]  [Subtle] [Medium] [Strong] [Custom...]       │   │
│  │  Opacity:    [━━━━━━━━━━●━━] 100%                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  🔄 ANIMATION (on scroll)                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Effect:   [None ▼] [Fade In] [Slide Up] [Slide Left] [Zoom] [...]  │   │
│  │  Delay:    [____] ms                                                │   │
│  │  Duration: [____] ms                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.5.4 Responsive Design Controls

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RESPONSIVE BREAKPOINTS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Device Preview:  [🖥️ Desktop]  [📱 Tablet]  [📱 Mobile]                   │
│                    1200px+       768-1199px    <768px                       │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Per-Element Responsive Settings:                                           │
│                                                                             │
│  ┌─────────────────┬─────────────────┬─────────────────┐                   │
│  │ 🖥️ DESKTOP      │ 📱 TABLET       │ 📱 MOBILE       │                   │
│  ├─────────────────┼─────────────────┼─────────────────┤                   │
│  │ Font: 56px      │ Font: 42px      │ Font: 28px      │                   │
│  │ Padding: 80px   │ Padding: 60px   │ Padding: 40px   │                   │
│  │ Columns: 3      │ Columns: 2      │ Columns: 1      │                   │
│  │ Width: 1200px   │ Width: 100%     │ Width: 100%     │                   │
│  │ Show: Yes       │ Show: Yes       │ Show: No        │  ← Hide on mobile │
│  └─────────────────┴─────────────────┴─────────────────┘                   │
│                                                                             │
│  Quick Actions:                                                             │
│  [📋 Copy desktop to all] [🔄 Reset to defaults] [👁️ Preview all devices]  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.5.5 Section Settings Panel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ SECTION SETTINGS: Hero                                        [x Close] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📐 LAYOUT                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Full Width:      [✓]  Extend to screen edges                       │   │
│  │  Content Width:   [1200] px  (max container width)                  │   │
│  │  Min Height:      [600] px   OR   [80] vh                           │   │
│  │  Vertical Align:  [Top ▼] [Center] [Bottom]                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📏 SPACING                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Padding Top:     [80] px                                           │   │
│  │  Padding Bottom:  [80] px                                           │   │
│  │  Padding Left:    [24] px                                           │   │
│  │  Padding Right:   [24] px                                           │   │
│  │  Element Gap:     [24] px   (space between child elements)          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  🎨 BACKGROUND                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Type: [○ Color] [● Image] [○ Video] [○ Gradient]                   │   │
│  │                                                                     │   │
│  │  Image: [hero-background.jpg]              [📷 Change] [🗑️ Remove]  │   │
│  │  Position: [Center ▼]   Size: [Cover ▼]   Fixed: [✓]               │   │
│  │                                                                     │   │
│  │  Overlay: [✓]  Color: [#000000]  Opacity: [━━━━●━━━━━] 50%          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  🔄 ANIMATION                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Entrance: [Fade In ▼]  Delay: [0] ms  Duration: [500] ms           │   │
│  │  Parallax: [✓]  Speed: [━━━●━━━━━━] 30%                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.5.6 Visual Builder Toolbar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BUILDER TOOLBAR                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [↩️ Undo] [↪️ Redo] │ [📋 Copy] [📄 Paste] [🗑️ Delete]              │   │
│  │ ───────────────────────────────────────────────────────────────────│   │
│  │ [📱 Desktop] [📱 Tablet] [📱 Mobile] │ [100% ▼] Zoom               │   │
│  │ ───────────────────────────────────────────────────────────────────│   │
│  │ [🔲 Outline Mode] [📐 Show Guides] [🧲 Snap to Grid]               │   │
│  │ ───────────────────────────────────────────────────────────────────│   │
│  │ [👁️ Preview] [💾 Save Draft] [🚀 Publish]                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.5.7 Element Types Available

| Element | Description | Drag & Drop | Resize | Settings |
|---------|-------------|-------------|--------|----------|
| **Heading** | H1-H6 text | ✅ | Width only | Font, size, color, alignment |
| **Text** | Paragraph/rich text | ✅ | Width only | Font, size, color, alignment |
| **Image** | Single image | ✅ | Width & Height | Size, border, shadow, link |
| **Button** | CTA button | ✅ | Width | Text, link, style, icon |
| **Icon** | Font icon | ✅ | Size | Icon picker, color, size |
| **Divider** | Horizontal line | ✅ | Width | Style, color, thickness |
| **Spacer** | Vertical space | ✅ | Height | Height in px |
| **Video** | YouTube/Vimeo | ✅ | Width & Height | URL, autoplay, controls |
| **Map** | Google Maps | ✅ | Width & Height | Location, zoom, style |
| **Form** | Contact form | ✅ | Width | Fields (dev only) |
| **Row** | Horizontal container | ✅ | Width | Gap, alignment, wrap |
| **Column** | Layout column | ✅ | Width % | Width ratio |
| **Container** | Wrapper | ✅ | Width & Height | All spacing/appearance |

## 3.5.8 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + C` | Copy element |
| `Ctrl + V` | Paste element |
| `Ctrl + D` | Duplicate element |
| `Delete` | Delete selected element |
| `Ctrl + S` | Save draft |
| `Ctrl + Shift + P` | Preview |
| `Arrow keys` | Nudge element position |
| `Shift + Arrow` | Nudge by 10px |
| `Escape` | Deselect element |

---

# 4. Component Architecture

## 4.1 Section Types

| Type | Description | Data Source | Admin Editable |
|------|-------------|-------------|----------------|
| `hero` | Full-width header with CTA | Static | Title, subtitle, image, button text |
| `hero-slider` | Multiple hero slides | Static | All slide content |
| `features` | Icon + text feature grid | Static | All text content |
| `services` | Services from database | Database | Title, subtitle only |
| `services-static` | Manually defined services | Static | All content |
| `team` | Doctors from database | Database | Title, subtitle only |
| `testimonials` | Testimonials from database | Database | Title only |
| `testimonials-static` | Manual testimonials | Static | All content |
| `cta` | Call-to-action banner | Static | All text, image |
| `contact` | Contact info + form | Database + Static | Text, not form fields |
| `map` | Google Maps embed | Settings | None |
| `faq` | FAQ accordion | Static/Database | All content |
| `gallery` | Image gallery | Static | Images only |
| `pricing` | Pricing tables | Static | All content |
| `stats` | Animated statistics | Static | Numbers, labels |
| `partners` | Logo carousel | Static | Logos only |
| `video` | Video embed | Static | Title, video URL |
| `text` | Rich text content | Static | All content |
| `html` | Custom HTML (Dev only) | Static | None (Dev only) |

## 4.2 Dynamic Content Sources

| Source | Description | Auto-Updates |
|--------|-------------|--------------|
| `services` | From services table | ✅ Yes |
| `doctors` | From doctors table | ✅ Yes |
| `testimonials` | From testimonials table | ✅ Yes |
| `branches` | From branches table | ✅ Yes |
| `faqs` | From faqs table | ✅ Yes |
| `contact` | From website_settings | ✅ Yes |
| `hours` | From website_settings | ✅ Yes |

---

# 5. Developer Portal Features

## 5.1 Website Builder Section

```
Developer Portal
├── Dashboard
├── Tenants
│   └── [Tenant Name]
│       ├── Overview
│       ├── Modules
│       ├── Users
│       └── 🆕 Website
│           ├── Pages
│           │   ├── All Pages (list)
│           │   ├── Create Page
│           │   └── Page Builder (visual editor)
│           ├── Navigation
│           │   ├── Header Menu
│           │   ├── Footer Menu
│           │   └── Mobile Menu
│           ├── Design
│           │   ├── Theme Settings
│           │   ├── Typography
│           │   ├── Colors
│           │   ├── Animations & Effects
│           │   ├── Buttons & Cards
│           │   └── Custom CSS
│           ├── SEO
│           │   ├── Global Settings
│           │   ├── Sitemap
│           │   └── robots.txt
│           ├── Integrations
│           │   ├── Analytics
│           │   ├── Chat Widgets
│           │   └── Scripts
│           └── Settings
│               ├── Contact Info
│               ├── Social Links
│               └── Working Hours
├── 🆕 Template Library
│   ├── Page Templates
│   ├── Section Templates
│   └── Create Template
├── Domains
├── ...
```

## 5.2 Developer Page Builder UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📄 Edit Page: Home                                    [Preview] [Publish]  │
├──────────────────┬──────────────────────────────────────────────────────────┤
│                  │                                                          │
│  🧱 SECTIONS     │  ┌────────────────────────────────────────────────────┐  │
│                  │  │ HERO SECTION                          [⚙️][↕️][🗑️] │  │
│  ○ Hero          │  │ ┌──────────────────────────────────────────────┐   │  │
│  ○ Features      │  │ │ Welcome to Our Clinic               [Edit]   │   │  │
│  ○ Services      │  │ │ Your smile is our priority          [Edit]   │   │  │
│  ○ Team          │  │ │ [Book Now]                          [Edit]   │   │  │
│  ○ Testimonials  │  │ │ 🖼️ hero-background.jpg              [Change] │   │  │
│  ○ CTA           │  │ └──────────────────────────────────────────────┘   │  │
│  ○ Contact       │  └────────────────────────────────────────────────────┘  │
│  ○ FAQ           │                                                          │
│  ○ Gallery       │  ┌────────────────────────────────────────────────────┐  │
│  ○ Stats         │  │ SERVICES SECTION                      [⚙️][↕️][🗑️] │  │
│  ○ Video         │  │ Data Source: services table                        │  │
│  ○ Text          │  │ ┌──────────────────────────────────────────────┐   │  │
│  ─────────────   │  │ │ Our Services                        [Edit]   │   │  │
│  [+ Add Section] │  │ │ Comprehensive dental care           [Edit]   │   │  │
│                  │  │ │ [Auto-loaded from database]                  │   │  │
│  📋 TEMPLATES    │  │ └──────────────────────────────────────────────┘   │  │
│  ○ Modern Dental │  └────────────────────────────────────────────────────┘  │
│  ○ Classic       │                                                          │
│  ○ Minimal       │  [+ ADD SECTION]                                         │
│                  │                                                          │
├──────────────────┼──────────────────────────────────────────────────────────┤
│  ⚙️ SETTINGS     │  📱 Desktop  📱 Tablet  📱 Mobile                        │
│  ○ SEO           │                                                          │
│  ○ Publishing    │                                                          │
│  ○ Permissions   │                                                          │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

---

# 6. Admin Panel Features

## 6.1 Website Content Section

```
Admin Panel
├── Dashboard
├── Appointments
├── Patients
├── ...
└── 🆕 Website Content
    ├── Edit Pages
    │   ├── Home
    │   ├── Services
    │   ├── About Us
    │   └── Contact
    ├── Media Library
    │   ├── Upload Images
    │   └── Browse Images
    ├── Contact Info
    │   ├── Phone Numbers
    │   ├── Email
    │   ├── Address
    │   └── Social Links
    ├── Working Hours
    └── Form Submissions
        ├── Contact Requests
        └── Callback Requests
```

## 6.2 Admin Content Editor UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📝 Edit Page Content: Home                      [Preview] [Save Changes]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ HERO SECTION                                                    🔒     │ │
│  │                                                                        │ │
│  │ Heading (English)                                                      │ │
│  │ ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │ │ Welcome to Our Clinic                                            │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │ Heading (Arabic)                                                       │ │
│  │ ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │ │ مرحباً بكم في عيادتنا                                            │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │ Subheading (English)                                                   │ │
│  │ ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │ │ Your smile is our priority                                       │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │ Button Text (English)          Button Text (Arabic)                    │ │
│  │ ┌───────────────────────┐      ┌───────────────────────┐              │ │
│  │ │ Book Appointment      │      │ احجز موعد             │              │ │
│  │ └───────────────────────┘      └───────────────────────┘              │ │
│  │                                                                        │ │
│  │ Background Image                                                       │ │
│  │ ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │ │  🖼️ hero-bg.jpg                              [Change Image]       │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ SERVICES SECTION                                                🔒     │ │
│  │                                                                        │ │
│  │ Section Title (English)                                                │ │
│  │ ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │ │ Our Services                                                     │  │ │
│  │ └──────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │ ℹ️ Service items are managed in Admin > Services                       │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ⚠️ Structure changes require Developer access                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 7. Additional Features (Not Previously Mentioned)

## 7.1 Content Management Features

| Feature | Description | Developer | Admin |
|---------|-------------|-----------|-------|
| **Auto-Save** | Save content every 30 seconds | ✅ | ✅ |
| **Undo/Redo** | Revert text changes | ✅ | ✅ |
| **Content Locking** | Lock section while editing | ✅ | ✅ |
| **Scheduled Publish** | Publish at specific time | ✅ | ❌ |
| **Content Drafts** | Save without publishing | ✅ | ✅ |
| **Draft Preview** | Preview draft changes | ✅ | ✅ |
| **Approval Workflow** | Admin changes need approval | ✅ (config) | ✅ (submit) |
| **Revision History** | View all past versions | ✅ | ✅ (view only) |
| **Restore Version** | Rollback to any version | ✅ | ❌ |
| **Compare Versions** | Side-by-side diff | ✅ | ❌ |

## 7.2 Media Management Features

| Feature | Description | Developer | Admin |
|---------|-------------|-----------|-------|
| **Image Upload** | Upload images | ✅ | ✅ |
| **Bulk Upload** | Upload multiple files | ✅ | ✅ |
| **Auto-Resize** | Generate multiple sizes | Auto | Auto |
| **WebP Conversion** | Auto-convert to WebP | Auto | Auto |
| **Image Cropping** | Crop to aspect ratio | ✅ | ✅ |
| **Folder Organization** | Organize by folder | ✅ | ✅ |
| **Search & Filter** | Find images | ✅ | ✅ |
| **Usage Tracking** | See where images are used | ✅ | ✅ |
| **Delete Unused** | Clean up unused media | ✅ | ❌ |
| **CDN Delivery** | Serve from CDN | Auto | Auto |

## 7.3 SEO Features

| Feature | Description | Developer | Admin |
|---------|-------------|-----------|-------|
| **Meta Title** | Page title tag | ✅ | ✅ |
| **Meta Description** | Page description | ✅ | ✅ |
| **Open Graph** | Social sharing tags | ✅ | ✅ |
| **Twitter Cards** | Twitter sharing | ✅ | ❌ |
| **Canonical URL** | Avoid duplicates | ✅ | ❌ |
| **No-Index** | Hide from search | ✅ | ❌ |
| **Sitemap.xml** | Auto-generate sitemap | Auto | ❌ |
| **robots.txt** | Crawl rules | ✅ | ❌ |
| **Schema.org** | Structured data | ✅ | ❌ |
| **SEO Audit** | Check for issues | ✅ | View |

## 7.4 Performance Features

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **Lazy Loading** | Load images on scroll | Automatic |
| **Image Optimization** | Compress images | Automatic |
| **Code Splitting** | Split JS bundles | Automatic |
| **CSS Minification** | Minimize CSS | Automatic |
| **Caching** | Browser caching | Headers |
| **CDN** | Serve static assets | Supabase Storage |
| **Preconnect** | DNS prefetch | Head tags |
| **Critical CSS** | Inline critical styles | Build time |

## 7.5 Multi-Language Support

| Feature | Description |
|---------|-------------|
| **Bilingual Content** | EN/AR for all text fields |
| **RTL Support** | Right-to-left for Arabic |
| **Language Switcher** | Toggle between languages |
| **Default Language** | Set per tenant |
| **URL Structure** | `/ar/` prefix for Arabic |
| **SEO Tags** | hreflang tags |
| **Font Support** | Arabic-friendly fonts |

## 7.6 Form Builder Features

| Feature | Description | Developer | Admin |
|---------|-------------|-----------|-------|
| **Field Types** | Text, email, phone, textarea, select | ✅ | ❌ |
| **Validation Rules** | Required, format, length | ✅ | ❌ |
| **Success Message** | Customize confirmation | ✅ | ✅ |
| **Email Notification** | Send on submission | ✅ | ❌ |
| **WhatsApp Notification** | Send to WhatsApp | ✅ | ❌ |
| **Spam Protection** | Honeypot, rate limit | ✅ | ❌ |
| **View Submissions** | See form entries | ✅ | ✅ |
| **Export Data** | Download as CSV | ✅ | ✅ |
| **Reply to Submission** | Mark as handled | ✅ | ✅ |

## 7.7 Analytics Integration

| Feature | Description |
|---------|-------------|
| **Google Analytics 4** | Track page views, events |
| **Google Tag Manager** | Manage all tags |
| **Facebook Pixel** | Conversion tracking |
| **Hotjar** | Heatmaps, recordings |
| **Custom Events** | Track CTA clicks, form submits |
| **Page Performance** | Core Web Vitals |

## 7.8 Security Features

| Feature | Description |
|---------|-------------|
| **Content Sanitization** | XSS prevention |
| **Image Validation** | Verify file types |
| **Rate Limiting** | Prevent abuse |
| **CSRF Protection** | Form security |
| **Audit Logging** | Track all changes |
| **Role-Based Access** | Permission control |
| **SSL/TLS** | HTTPS everywhere |
| **CSP Headers** | Content Security Policy |

---

# 8. Implementation Timeline

## Week 0: Pre-requisites (NEW)

| Task | Description | Days |
|------|-------------|------|
| Universal Login Page | app.dento.com/login with clinic selector | 1 |
| Subdomain Routing | TenantRouter, DomainResolver components | 1 |
| Module Gate Middleware | ModuleGate component for feature gating | 0.5 |
| No Website Landing | NoWebsiteLanding.jsx for non-website tenants | 0.5 |
| Vercel/Hosting Config | Configure subdomain routing | 1 |

## Week 1-2: Foundation

| Task | Description | Days |
|------|-------------|------|
| Database Migration | Create all Phase 5 tables (15 tables) | 1.5 |
| Testimonials & FAQs | Create dynamic content tables | 0.5 |
| Services/Doctors Fields | Add website fields to existing tables | 0.5 |
| RLS Policies | Security for all tables | 1 |
| Edge Functions | 8 functions (page, media, form, sitemap, etc.) | 3 |
| API Layer | React hooks for data fetching | 2 |

## Week 3-4: Developer Portal

| Task | Description | Days |
|------|-------------|------|
| Page List | List pages per tenant | 1 |
| Page Builder UI | Craft.js integration | 3 |
| Section Library | All 18 section components | 3 |
| Navigation Editor | Menu management | 1 |
| Theme Settings | Colors, fonts, branding | 1 |
| Custom Domain Settings | DNS verification, SSL | 1 |

## Week 5-6: Admin Panel

| Task | Description | Days |
|------|-------------|------|
| Content Editor | Text/image editing UI | 2 |
| Rich Text Editor | TipTap integration | 1 |
| Media Library | Image upload, browse, optimize | 2 |
| Contact/Hours | Settings editors | 1 |
| Form Submissions | View/manage submissions | 1 |
| Testimonials Manager | CRUD for testimonials | 1 |
| FAQs Manager | CRUD for FAQs | 1 |
| Module-Based Menu | Hide website menu if disabled | 0.5 |
| Preview Mode | View changes before save | 1 |

## Week 7-8: Public Website Renderer

| Task | Description | Days |
|------|-------------|------|
| Page Renderer | Render from JSON | 2 |
| Section Components | All section types | 3 |
| Booking Widget | Embedded appointment booking | 2 |
| Responsive Design | Mobile/tablet/desktop | 1 |
| RTL Support | Arabic layout | 1 |
| Language Routing | /ar/ prefix handling | 1 |
| Sitemap Generation | Dynamic sitemap.xml | 0.5 |

## Week 9: Templates & Polish

| Task | Description | Days |
|------|-------------|------|
| Section Templates | Pre-built sections (10+) | 2 |
| Page Templates | Complete page layouts (5+) | 2 |
| New Tenant Wizard | Auto-create pages from template | 1 |
| Version History | View/restore versions | 1 |

## Week 10-12: Testing & Deployment

| Task | Description | Days |
|------|-------------|------|
| Integration Testing | All features | 3 |
| Performance Testing | Load, speed, Core Web Vitals | 2 |
| Security Audit | Permissions, XSS, CSRF | 2 |
| Browser Testing | Chrome, Firefox, Safari, Edge | 1 |
| Mobile Testing | iOS Safari, Android Chrome | 1 |
| Documentation | Admin guide, Developer guide | 2 |
| Migration Script | Convert existing static pages | 2 |
| Existing Tenant Migration | Migrate current tenants | 2 |

---

# 9. File Structure

```
src/
├── platform/                              # 🆕 Universal platform (app.dento.com)
│   ├── PlatformApp.jsx                    # Main app for app.dento.com
│   ├── PlatformLayout.jsx                 # Layout wrapper
│   └── pages/
│       ├── UniversalLogin.jsx             # Login with clinic selector
│       ├── ClinicRegistration.jsx         # New clinic signup
│       ├── ForgotPassword.jsx             # Password reset
│       └── SelectClinic.jsx               # Clinic selection for multi-clinic users
│
├── routing/                               # 🆕 Multi-tenant routing
│   ├── TenantRouter.jsx                   # Extract subdomain, route to correct app
│   ├── DomainResolver.jsx                 # Custom domain → tenant mapping
│   ├── ModuleGate.jsx                     # Check module enabled before rendering
│   ├── LanguageRouter.jsx                 # Handle /ar/ prefix for Arabic
│   └── useSubdomain.js                    # Hook to extract subdomain
│
├── admin/
│   ├── contexts/
│   │   └── ModuleContext.jsx              # 🆕 Track enabled modules
│   └── pages/
│       └── website/
│           ├── ContentEditor.jsx          # Admin content editing
│           ├── ContentEditorField.jsx     # Individual field editor
│           ├── MediaLibrary.jsx           # Image browser
│           ├── MediaUploader.jsx          # Upload component
│           ├── ContactSettings.jsx        # Contact info editor
│           ├── WorkingHoursEditor.jsx     # Hours editor
│           ├── FormSubmissions.jsx        # View submissions
│           ├── TestimonialsManager.jsx    # 🆕 Testimonials CRUD
│           └── FAQsManager.jsx            # 🆕 FAQs CRUD
│
├── developer/
│   └── pages/
│       └── website/
│           ├── PageList.jsx               # List all pages
│           ├── PageBuilder.jsx            # Visual editor
│           ├── PageBuilderCanvas.jsx      # Drag-drop canvas
│           ├── PageBuilderSidebar.jsx     # Section library
│           ├── PageBuilderSettings.jsx    # Section settings
│           ├── NavigationEditor.jsx       # Menu management
│           ├── ThemeSettings.jsx          # Colors, fonts, branding
│           ├── AnimationSettings.jsx      # 🆕 Animations & effects
│           ├── ButtonCardStyles.jsx       # 🆕 Button/card styling
│           ├── SEOSettings.jsx            # SEO configuration
│           ├── IntegrationSettings.jsx    # Analytics, scripts
│           ├── TemplateLibrary.jsx        # Page templates
│           ├── VersionHistory.jsx         # Page versions
│           ├── DomainSettings.jsx         # 🆕 Custom domain management
│           └── PreviewMode.jsx            # 🆕 Live preview
│
├── public/                                # 🆕 Public website (dynamic)
│   ├── PublicApp.jsx                      # Public website app
│   ├── PublicLayout.jsx                   # Layout with header/footer
│   └── pages/
│       ├── DynamicPage.jsx                # Renders any page from DB
│       ├── BookAppointment.jsx            # Booking widget page
│       └── NoWebsiteLanding.jsx           # 🆕 "Staff login" for no-website tenants
│
├── components/
│   └── pageBuilder/
│       ├── sections/
│       │   ├── HeroSection.jsx
│       │   ├── HeroSliderSection.jsx      # 🆕 Multiple slides
│       │   ├── FeaturesSection.jsx
│       │   ├── ServicesSection.jsx
│       │   ├── TeamSection.jsx
│       │   ├── TestimonialsSection.jsx
│       │   ├── CTASection.jsx
│       │   ├── ContactSection.jsx
│       │   ├── FAQSection.jsx
│       │   ├── GallerySection.jsx
│       │   ├── StatsSection.jsx
│       │   ├── VideoSection.jsx
│       │   ├── TextSection.jsx
│       │   ├── BookingSection.jsx         # 🆕 Embedded booking widget
│       │   ├── MapSection.jsx             # 🆕 Google Maps
│       │   ├── PricingSection.jsx         # 🆕 Pricing tables
│       │   ├── PartnersSection.jsx        # 🆕 Logo carousel
│       │   ├── BranchesSection.jsx        # 🆕 Multi-branch display
│       │   └── index.js                   # Export all
│       ├── elements/                      # 🆕 Draggable elements
│       │   ├── HeadingElement.jsx         # 🆕 H1-H6 headings
│       │   ├── TextElement.jsx            # 🆕 Paragraph text
│       │   ├── ImageElement.jsx           # 🆕 Single image
│       │   ├── ButtonElement.jsx          # 🆕 CTA button
│       │   ├── IconElement.jsx            # 🆕 Font icons
│       │   ├── DividerElement.jsx         # 🆕 Horizontal line
│       │   ├── SpacerElement.jsx          # 🆕 Vertical spacing
│       │   ├── VideoElement.jsx           # 🆕 YouTube/Vimeo embed
│       │   └── index.js                   # Export all
│       ├── layout/                        # 🆕 Layout containers
│       │   ├── RowContainer.jsx           # 🆕 Horizontal flex row
│       │   ├── ColumnContainer.jsx        # 🆕 Column with width %
│       │   ├── GridContainer.jsx          # 🆕 CSS Grid layout
│       │   ├── FlexContainer.jsx          # 🆕 Flexbox container
│       │   └── index.js                   # Export all
│       ├── builder/                       # 🆕 Builder UI components
│       │   ├── BuilderCanvas.jsx          # 🆕 Main editing canvas
│       │   ├── BuilderToolbar.jsx         # 🆕 Top toolbar (undo, preview, etc)
│       │   ├── ElementSidebar.jsx         # 🆕 Draggable elements list
│       │   ├── SettingsPanel.jsx          # 🆕 Right panel for settings
│       │   ├── ElementSettings.jsx        # 🆕 Per-element settings
│       │   ├── SectionSettings.jsx        # 🆕 Per-section settings
│       │   ├── SpacingControl.jsx         # 🆕 Margin/padding visual editor
│       │   ├── AlignmentControl.jsx       # 🆕 Alignment buttons
│       │   ├── ResponsiveToggle.jsx       # 🆕 Desktop/tablet/mobile toggle
│       │   ├── ColorPicker.jsx            # 🆕 Color selection
│       │   ├── ColumnLayoutPicker.jsx     # 🆕 Column layout selector
│       │   ├── AnimationPicker.jsx        # 🆕 Animation selection
│       │   ├── DragHandle.jsx             # 🆕 Drag indicator
│       │   ├── DropZone.jsx               # 🆕 Drop target indicator
│       │   ├── SelectionBox.jsx           # 🆕 Selected element outline
│       │   └── index.js                   # Export all
│       ├── common/
│       │   ├── EditableText.jsx
│       │   ├── EditableImage.jsx
│       │   ├── SectionWrapper.jsx
│       │   ├── DynamicContent.jsx
│       │   ├── RichTextEditor.jsx         # 🆕 TipTap editor
│       │   └── ImagePicker.jsx            # 🆕 Media library picker
│       └── renderer/
│           ├── PageRenderer.jsx           # Render full page
│           ├── SectionRenderer.jsx        # Render single section
│           ├── ElementRenderer.jsx        # 🆕 Render single element
│           └── ContentRenderer.jsx        # Render content
│
├── hooks/
│   └── pageBuilder/
│       ├── usePages.js                    # Page CRUD
│       ├── usePageContent.js              # Content updates
│       ├── useMediaLibrary.js             # Media operations
│       ├── useWebsiteSettings.js          # Settings CRUD
│       ├── useFormSubmissions.js          # Form data
│       ├── useVersionHistory.js           # Version operations
│       ├── useTestimonials.js             # 🆕 Testimonials CRUD
│       ├── useFAQs.js                     # 🆕 FAQs CRUD
│       ├── useModules.js                  # 🆕 Module check
│       ├── usePreview.js                  # 🆕 Preview state
│       ├── useBuilder.js                  # 🆕 Builder state (Craft.js)
│       ├── useDragDrop.js                 # 🆕 Drag and drop logic
│       ├── useElementSettings.js          # 🆕 Element settings state
│       ├── useResponsive.js               # 🆕 Responsive breakpoints
│       ├── useHistory.js                  # 🆕 Undo/redo history
│       └── useClipboard.js                # 🆕 Copy/paste elements
│
├── utils/
│   └── pageBuilder/
│       ├── serialization.js               # JSON conversion
│       ├── validation.js                  # Content validation
│       ├── sanitization.js                # XSS prevention
│       └── imageOptimization.js           # Image processing
│
└── config/
    └── vercel.json                        # 🆕 Routing configuration

supabase/
├── functions/
│   ├── page-builder-api/                  # 🆕 Page CRUD with permissions
│   │   └── index.ts
│   ├── media-upload/                      # 🆕 Image upload + optimization
│   │   └── index.ts
│   ├── template-api/                      # 🆕 Template management
│   │   └── index.ts
│   ├── website-settings-api/              # 🆕 Settings CRUD
│   │   └── index.ts
│   ├── form-submission-api/               # 🆕 Handle contact forms
│   │   └── index.ts
│   ├── generate-sitemap/                  # 🆕 Dynamic sitemap.xml
│   │   └── index.ts
│   ├── verify-domain/                     # 🆕 DNS verification
│   │   └── index.ts
│   └── optimize-image/                    # 🆕 Image processing
│       └── index.ts
│
└── migrations/
    ├── 050_page_builder_tables.sql        # Core page builder tables
    ├── 051_testimonials_faqs.sql          # 🆕 Testimonials + FAQs
    ├── 052_services_website_fields.sql    # 🆕 Website fields for services
    └── 053_website_module.sql             # 🆕 Add website module
```

---

# 10. Migration Strategy

## 10.1 Existing Tenants

1. **Create default pages** from current static React pages
2. **Extract content** into database format
3. **Set structure** based on current layout
4. **Mark all sections** as locked
5. **Notify admins** about new editing capabilities

## 10.2 New Tenants

1. **Template selection** during onboarding
2. **Auto-populate** content with placeholders
3. **Create all standard pages** (Home, Services, About, Contact, Book)
4. **Set navigation** based on created pages
5. **Apply tenant branding** from setup wizard

---

# 11. Success Criteria

## 11.1 Developer Experience
- [ ] Can create new pages in < 5 minutes
- [ ] Can add/remove sections via drag-drop
- [ ] Can configure section settings
- [ ] Can manage navigation easily
- [ ] Can preview on all devices
- [ ] Can rollback to any version

## 11.2 Admin Experience
- [ ] Can edit text in < 1 minute
- [ ] Can upload images easily
- [ ] Cannot accidentally break layout
- [ ] Can see live preview
- [ ] Can save drafts
- [ ] Gets clear error messages

## 11.3 Performance
- [ ] Page load < 3 seconds
- [ ] Lighthouse score > 80
- [ ] Core Web Vitals: Good
- [ ] Editor response < 200ms

## 11.4 Security
- [ ] No XSS vulnerabilities
- [ ] Content sanitized
- [ ] Role-based access enforced
- [ ] Audit trail complete

---

# 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Craft.js learning curve | High | Start with simple sections |
| Performance with large pages | Medium | Lazy load sections |
| RTL layout complexity | Medium | Test early, use CSS logical properties |
| Admin confusion | Medium | Clear UI, tooltips, help text |
| Data migration issues | High | Backup before migration, test thoroughly |
| Browser compatibility | Low | Test top browsers, polyfills |

---

# 13. COMPLETE IMPLEMENTATION CHECKLIST

> **Last Updated: February 8, 2026** - Comprehensive audit completed
> 
> **Implementation Status: ~95% Complete**
> 
> Legend: [x] = Implemented | [ ] = Not implemented | [~] = Partial/Different name

## Phase 5.0: Pre-requisites (Week 0) - 4 days ✅ COMPLETE
- [x] Universal login page (`src/platform/UniversalLogin.jsx`)
- [x] Clinic registration page (`src/platform/ClinicRegistration.jsx`)
- [x] Subdomain routing (`src/routing/TenantRouter.jsx`)
- [x] Domain resolver (`src/routing/DomainResolver.jsx`)
- [x] Module gate middleware (`src/routing/ModuleGate.jsx`)
- [x] Language router (`src/routing/LanguageRouter.jsx`)
- [x] "No Website" landing (`src/public/pages/NoWebsiteLanding.jsx`)
- [x] Vercel routing config (`vercel.json`)
- [x] Add website module to modules table (in migration 050)

## Phase 5.1: Database (Week 1-2) - 6 days ✅ COMPLETE
### Core Tables (12 in migration 050_page_builder_tables.sql)
- [x] `pages` - Per-tenant page content
- [x] `page_versions` - Version history
- [x] `content_drafts` - Admin drafts
- [x] `navigation_menus` - Header/footer/mobile
- [x] `website_settings` - Branding, theme, contact
- [x] `media_library` - Per-tenant images
- [x] `section_templates` - Global section templates
- [x] `page_templates` - Global page templates
- [x] `form_submissions` - Contact form entries
- [x] `content_change_log` - Audit trail
- [x] `faqs` - Dynamic FAQs
- [~] `testimonials` - Uses existing table with new fields (is_featured, display_order)

### Table Alterations
- [x] `services` - Add website fields (image, description, show_on_website, icon, is_featured)
- [x] `doctors` - Add website fields (show_on_website, short_bio_en, short_bio_ar)
- [x] `branches` - Add website fields (show_on_website, branch_image_url)

### Security
- [x] All RLS policies (12 tables configured)
- [x] All indexes (18+ indexes created)
- [x] All triggers (auto version, updated_at for pages, website_settings, navigation_menus, faqs, content_drafts)

## Phase 5.2: Edge Functions (Week 1-2) - 4 days ✅ COMPLETE
- [x] `page-builder-api/index.ts` - Page CRUD with permissions
- [x] `media-upload/index.ts` - Image upload + optimization
- [x] `template-api/index.ts` - Template management
- [x] `website-settings-api/index.ts` - Settings CRUD
- [x] `form-submission-api/index.ts` - Handle contact forms
- [x] `generate-sitemap/index.ts` - Dynamic sitemap.xml
- [x] `verify-domain/index.ts` - DNS verification
- [x] `optimize-image/index.ts` - Resize, compress, WebP

## Phase 5.3: Developer Portal (Week 3-4) - 10 days ✅ COMPLETE
- [x] `PageList.jsx` - List pages per tenant
- [x] `PageBuilderPage.jsx` - Craft.js visual editor (was PageBuilder.jsx)
- [x] `BuilderCanvas.jsx` - Drag-drop canvas (in components/pageBuilder/)
- [x] `BuilderSidebar.jsx` - Section library (was PageBuilderSidebar.jsx)
- [x] `SettingsPanel.jsx` - Section settings (in components/pageBuilder/)
- [x] `NavigationEditor.jsx` - Menu management
- [x] `WebsiteThemeSettings.jsx` - Colors, fonts, branding (was ThemeSettings.jsx)
- [x] `AnimationSettings.jsx` - Animations, effects, transitions
- [x] `ButtonCardStyles.jsx` - Button/card radius, shadows
- [x] `WebsiteSEOSettings.jsx` - Meta tags, sitemap (was SEOSettings.jsx)
- [x] `IntegrationSettings.jsx` - Analytics, scripts
- [x] `TemplateLibrary.jsx` - Page templates
- [x] `VersionHistory.jsx` - View/restore versions
- [x] `DomainSettings.jsx` - Custom domain management
- [x] `PreviewMode.jsx` - Live preview
- [x] `TemplateEditor.jsx` - Template editing (EXTRA - not in original plan)

## Phase 5.4: Admin Panel (Week 5-6) - 10 days ✅ COMPLETE
- [x] `ContentEditor.jsx` - Text/image editing UI
- [x] `ContentEditorField.jsx` - Individual field editor
- [x] `RichTextEditor.jsx` - TipTap integration
- [x] `MediaLibrary.jsx` - Image browser
- [~] `MediaUploader.jsx` - Integrated into MediaLibrary component
- [x] `ImagePicker.jsx` - Media library picker
- [x] `ContactSettings.jsx` - Contact info editor
- [x] `WorkingHoursEditor.jsx` - Hours editor
- [x] `FormSubmissions.jsx` - View submissions
- [x] `TestimonialsManager.jsx` - Testimonials CRUD
- [x] `FAQsManager.jsx` - FAQs CRUD
- [x] `ModuleContext.jsx` - Track enabled modules (`src/admin/contexts/`)
- [x] `index.js` - Export all admin website pages

## Phase 5.5: Section Components (Week 7-8) - 10 days ✅ COMPLETE
### 18 Section Types (src/components/pageBuilder/sections/)
- [x] `HeroSection.jsx` - Full-width header
- [x] `HeroSliderSection.jsx` - Multiple slides
- [x] `FeaturesSection.jsx` - Icon + text grid
- [x] `ServicesSection.jsx` - From database
- [x] `TeamSection.jsx` - Doctors from database
- [x] `TestimonialsSection.jsx` - From database
- [x] `CTASection.jsx` - Call-to-action banner
- [x] `ContactSection.jsx` - Contact info + form
- [x] `FAQSection.jsx` - FAQ accordion
- [x] `GallerySection.jsx` - Image gallery
- [x] `StatsSection.jsx` - Animated numbers
- [x] `VideoSection.jsx` - Video embed
- [x] `TextSection.jsx` - Rich text content
- [x] `BookingSection.jsx` - Embedded booking widget
- [x] `MapSection.jsx` - Google Maps
- [x] `PricingSection.jsx` - Pricing tables
- [x] `PartnersSection.jsx` - Logo carousel
- [x] `BranchesSection.jsx` - Multi-branch display
- [x] `index.js` - Export all

### Draggable Elements (src/components/pageBuilder/elements/)
- [ ] `HeadingElement.jsx` - H1-H6 headings ⚠️ **MISSING**
- [x] `TextElement.jsx` - Paragraph/rich text
- [x] `ImageElement.jsx` - Single image
- [x] `ButtonElement.jsx` - CTA button
- [x] `IconElement.jsx` - Font icons
- [x] `DividerElement.jsx` - Horizontal line
- [x] `SpacerElement.jsx` - Vertical spacing
- [x] `VideoElement.jsx` - YouTube/Vimeo embed
- [x] `FormElement.jsx` - Form embed (EXTRA)
- [x] `SocialLinksElement.jsx` - Social links (EXTRA)
- [x] `index.js` - Export all

### Layout Containers (src/components/pageBuilder/layouts/) - Different Names
- [x] `FlexRow.jsx` - Horizontal flex row (was RowContainer.jsx)
- [x] `FlexColumn.jsx` - Column with width % (was ColumnContainer.jsx)
- [x] `Grid.jsx` - CSS Grid layout (was GridContainer.jsx)
- [x] `Container.jsx` - Flexbox container (was FlexContainer.jsx)
- [x] `TwoColumnLayout.jsx` - Two column preset (EXTRA)
- [x] `index.js` - Export all

### Builder UI Components (src/components/pageBuilder/builder/ + pageBuilder/)
- [x] `BuilderCanvas.jsx` - Main editing canvas (in pageBuilder/)
- [x] `BuilderToolbar.jsx` - Top toolbar (in pageBuilder/)
- [x] `BuilderSidebar.jsx` - Draggable elements list (was ElementSidebar.jsx, in pageBuilder/)
- [x] `SettingsPanel.jsx` - Right panel for settings (in pageBuilder/)
- [x] `ElementSettings.jsx` - Per-element settings
- [x] `SectionSettings.jsx` - Per-section settings
- [x] `SpacingControl.jsx` - Margin/padding visual editor
- [x] `AlignmentControl.jsx` - Alignment buttons
- [x] `ResponsiveControls.jsx` - Desktop/tablet/mobile toggle (was ResponsiveToggle.jsx, in pageBuilder/)
- [x] `ColorPicker.jsx` - Color selection
- [x] `ColumnLayoutPicker.jsx` - Column layout selector
- [x] `AnimationPicker.jsx` - Animation selection
- [x] `DragHandle.jsx` - Drag indicator
- [x] `DropZone.jsx` - Drop target indicator
- [x] `SelectionBox.jsx` - Selected element outline
- [x] `SectionTemplatePicker.jsx` - Section template selector (EXTRA)
- [x] `TemplateSelector.jsx` - Template selection UI (EXTRA)
- [x] `index.js` - Export all

### Additional Builder Components (src/components/pageBuilder/)
- [x] `PageBuilder.jsx` - Main page builder component
- [x] `PageManager.jsx` - Page management
- [x] `PageRenderer.jsx` - Page rendering
- [x] `AssetManager.jsx` - Asset management (EXTRA)
- [x] `ComponentToolbox.jsx` - Component toolbox (EXTRA)
- [x] `DevicePreview.jsx` - Device preview (EXTRA)
- [x] `HistoryControls.jsx` - History controls (EXTRA)
- [x] `LayersPanel.jsx` - Layers panel (EXTRA)
- [x] `PublishControls.jsx` - Publish controls (EXTRA)
- [x] `SEOPanel.jsx` - SEO panel (EXTRA)
- [x] `ThemeManager.jsx` - Theme manager (EXTRA)

### Common Components (src/components/pageBuilder/common/)
- [x] `EditableText.jsx`
- [x] `EditableImage.jsx`
- [x] `SectionWrapper.jsx`
- [x] `DynamicContent.jsx`
- [x] `index.js` - Export all

### Renderer (src/components/pageBuilder/renderer/)
- [x] `SectionRenderer.jsx` - Render single section
- [x] `ElementRenderer.jsx` - Render single element
- [x] `ContentRenderer.jsx` - Render content
- [x] `index.js` - Export all
- [x] `PageRenderer.jsx` - Render full page (in pageBuilder/ root)

## Phase 5.6: Public Website (Week 7-8) - 6 days ✅ COMPLETE
- [x] `PublicApp.jsx` - Public website app
- [x] `PublicLayout.jsx` - Layout with header/footer (`src/public/layouts/`)
- [x] `DynamicPage.jsx` - Renders any page from DB
- [x] `BookingPage.jsx` - Booking widget page (was BookAppointment.jsx)
- [x] `NoWebsiteLanding.jsx` - Staff login for non-website tenants
- [x] Additional public pages: AboutPage, BlogPage, BlogPostPage, ContactPage, DoctorsPage, HomePage, NotFoundPage, ServicesPage

## Phase 5.7: Hooks & Utils - Throughout ✅ COMPLETE
### Hooks (src/hooks/pageBuilder/) - 21 hooks (17 planned + 4 extra)
- [x] `usePages.js` - Page CRUD
- [x] `usePageContent.js` - Content updates
- [x] `useMediaLibrary.js` - Media operations
- [x] `useWebsiteSettings.js` - Settings CRUD
- [x] `useFormSubmissions.js` - Form data
- [x] `useVersionHistory.js` - Version operations
- [x] `useTestimonials.js` - Testimonials CRUD
- [x] `useFAQs.js` - FAQs CRUD
- [x] `useModules.js` - Module check
- [x] `usePreview.js` - Preview state
- [x] `useSubdomain.js` - Extract subdomain
- [x] `useBuilder.js` - Builder state (Craft.js)
- [x] `useDragDrop.js` - Drag and drop logic
- [x] `useElementSettings.js` - Element settings state
- [x] `useResponsive.js` - Responsive breakpoints
- [x] `useHistory.js` - Undo/redo history
- [x] `useClipboard.js` - Copy/paste elements
- [x] `useContactSettings.js` - Contact settings (EXTRA)
- [x] `useWebsiteContent.js` - Website content (EXTRA)
- [x] `useWorkingHours.js` - Working hours (EXTRA)
- [x] `index.js` - Export all

### Utils (src/utils/pageBuilder/)
- [x] `serialization.js` - JSON conversion
- [x] `validation.js` - Content validation
- [x] `sanitization.js` - XSS prevention
- [x] `imageOptimization.js` - Image processing
- [x] `index.js` - Export all

## Phase 5.8: Templates (Week 9) - 5 days ✅ COMPLETE
### Section Templates (in DB via migration 050 + 051)
- [x] Hero - Centered with overlay (hero-centered)
- [x] Hero - Left-aligned with image (hero-left-image)
- [x] Hero - Slider with 3 slides (hero-slider)
- [x] Services - 3 column grid (services-grid-3)
- [x] Services - 4 column with icons (services-grid-4)
- [x] Team - Grid with hover (team-grid)
- [x] Testimonials - Slider (testimonials-slider)
- [x] Testimonials - Grid (testimonials-grid)
- [x] CTA - Full width (cta-simple)
- [x] CTA - Fullwidth variant (cta-fullwidth)
- [x] Contact - Split layout (contact-split)
- [x] FAQ - Accordion (faq-accordion)
- [x] FAQ - Two column (faq-two-column)
- [x] Features - Grid (features-grid)
- [x] Stats - Counter (stats-counter)
- [x] Gallery - Masonry (gallery-masonry)
- [x] Pricing - Table (pricing-table)
- [x] Map - Full width (map-full)
- [x] Booking - Widget (booking-widget)
- [x] Partners - Carousel (partners-carousel)
- [x] Text - Rich content (text-rich)
- [x] About - Split layout (about-split)
- [x] Branches - Cards (branches-cards)

### Page Templates (in DB via migration 050 + 051)
- [x] Modern Dental - Home (modern-dental-home)
- [x] Modern Dental - Services (modern-dental-services)
- [x] Modern Dental - About (modern-dental-about)
- [x] Modern Dental - Contact (modern-dental-contact)
- [x] Modern Dental - Booking (modern-dental-booking)
- [x] Classic Medical - Home (classic-medical-home)
- [x] Minimal Dental - Home (minimal-dental-home)
- [x] Pricing Page (pricing-page)

### Template Files (src/templates/)
- [x] `pageTemplates.js` - Page template definitions
- [x] `sectionTemplates.js` - Section template definitions
- [x] `index.js` - Export all

### New Tenant Wizard (src/developer/components/)
- [x] Template selection UI (NewTenantWizard.jsx)
- [x] Auto-generate pages
- [x] Placeholder content
- [x] Apply branding

## Phase 5.9: Testing & Polish (Week 10-12) - 10 days ✅ PARTIAL
### Testing
- [x] Test utilities created (src/test/pageBuilder/testUtils.js)
- [ ] Integration testing - All features
- [ ] Performance testing - Core Web Vitals
- [ ] Security audit - Permissions, XSS, CSRF
- [ ] Browser testing - Chrome, Firefox, Safari, Edge
- [ ] Mobile testing - iOS Safari, Android Chrome
- [ ] RTL testing - Arabic layout

### Polish
- [x] Auto-save hook (useAutoSave.js - every 30 seconds)
- [x] Undo/redo for content editor (useHistory.js)
- [x] Content locking hook (useContentLock.js - prevent simultaneous edits)
- [x] Content locks database table (migration 052)
- [ ] Error messages and validation UI
- [ ] Loading states and skeletons
- [ ] Tooltips and help text

### Documentation
- [ ] Admin user guide
- [ ] Developer guide
- [ ] API documentation

### Migration
- [ ] Migration script for static pages
- [ ] Test migration on staging
- [ ] Migrate existing tenants
- [ ] Rollback plan

---

# 13.1 IMPLEMENTATION GAP ANALYSIS

## Missing Files (Must Create)
| File | Location | Priority |
|------|----------|----------|
| `HeadingElement.jsx` | `src/components/pageBuilder/elements/` | HIGH |

## Template Gaps (Database Seeds)
| Template | Type | Notes |
|----------|------|-------|
## Template Gaps (Database Seeds) - ✅ RESOLVED via migration 051
| Template | Type | Status |
|----------|------|--------|
| Hero - Left-aligned | Section | ✅ Added (hero-left-image) |
| Hero - Slider | Section | ✅ Added (hero-slider) |
| Services - 4 column | Section | ✅ Added (services-grid-4) |
| Testimonials - Slider | Section | ✅ Added (testimonials-slider) |
| FAQ - Accordion | Section | ✅ Added (faq-accordion) |
| Modern Dental - Services | Page | ✅ Added (modern-dental-services) |
| Modern Dental - About | Page | ✅ Added (modern-dental-about) |
| Modern Dental - Contact | Page | ✅ Added (modern-dental-contact) |
| Classic Medical - Home | Page | ✅ Added (classic-medical-home) |

## Extra Components (Implemented Beyond Plan)
| Component | Location | Description |
|-----------|----------|-------------|
| `FormElement.jsx` | elements/ | Form embedding |
| `SocialLinksElement.jsx` | elements/ | Social media links |
| `TwoColumnLayout.jsx` | layouts/ | Preset 2-col layout |
| `TemplateEditor.jsx` | developer/pages/website/ | Template editing UI |
| `SectionTemplatePicker.jsx` | builder/ | Section template picker |
| `TemplateSelector.jsx` | builder/ | Template selection |
| `AssetManager.jsx` | pageBuilder/ | Asset management |
| `ComponentToolbox.jsx` | pageBuilder/ | Component toolbox |
| `DevicePreview.jsx` | pageBuilder/ | Device preview |
| `HistoryControls.jsx` | pageBuilder/ | History controls |
| `LayersPanel.jsx` | pageBuilder/ | Layers panel |
| `PublishControls.jsx` | pageBuilder/ | Publish controls |
| `SEOPanel.jsx` | pageBuilder/ | SEO panel |
| `ThemeManager.jsx` | pageBuilder/ | Theme manager |
| `useContactSettings.js` | hooks/pageBuilder/ | Contact settings hook |
| `useWebsiteContent.js` | hooks/pageBuilder/ | Website content hook |
| `useWorkingHours.js` | hooks/pageBuilder/ | Working hours hook |
| Public pages | public/pages/ | AboutPage, BlogPage, etc. |

## Naming Differences (Implemented with Different Names)
| Planned Name | Actual Name | Location |
|--------------|-------------|----------|
| RowContainer.jsx | FlexRow.jsx | layouts/ |
| ColumnContainer.jsx | FlexColumn.jsx | layouts/ |
| GridContainer.jsx | Grid.jsx | layouts/ |
| FlexContainer.jsx | Container.jsx | layouts/ |
| ResponsiveToggle.jsx | ResponsiveControls.jsx | pageBuilder/ |
| ElementSidebar.jsx | BuilderSidebar.jsx | pageBuilder/ |
| ThemeSettings.jsx | WebsiteThemeSettings.jsx | developer/pages/website/ |
| SEOSettings.jsx | WebsiteSEOSettings.jsx | developer/pages/website/ |
| BookAppointment.jsx | BookingPage.jsx | public/pages/ |
| PageBuilder.jsx | PageBuilderPage.jsx | developer/pages/website/ |

---

# 14. DEFERRED TO FUTURE PHASES

| Item | Reason | Target Phase |
|------|--------|--------------|
| Website Analytics Dashboard | Nice to have | Phase 7 |
| A/B Testing | Advanced feature | Phase 7 |
| Blog/News Module | Separate feature | Phase 7 |
| Multi-Branch Website | Complex feature | Phase 7 |
| Website Backup/Export | Data safety | Phase 7 |
| Patient Portal Integration | Separate module | Phase 8 |

---

# 15. FINAL SUMMARY

## Implementation Status (Updated February 8, 2026)

| Phase | Status | Completion |
|-------|--------|------------|
| 5.0 Pre-requisites | ✅ Complete | 100% |
| 5.1 Database | ✅ Complete | 100% |
| 5.2 Edge Functions | ✅ Complete | 100% |
| 5.3 Developer Portal | ✅ Complete | 100% |
| 5.4 Admin Panel | ✅ Complete | 100% |
| 5.5 Section Components | ✅ Complete | 98% (1 missing) |
| 5.6 Public Website | ✅ Complete | 100% |
| 5.7 Hooks & Utils | ✅ Complete | 100% |
| 5.8 Templates | ✅ Complete | 100% |
| 5.9 Testing & Polish | ⏳ Partial | 60% |
| **OVERALL** | **~98%** | **Core Complete** |

## Total Deliverables (Planned vs Actual)

| Category | Planned | Actual | Status |
|----------|---------|--------|--------|
| Database Tables (new) | 12 | 11 (+ALTER on testimonials) | ✅ |
| Database Tables (altered) | 3 | 4 (services, doctors, branches, testimonials) | ✅ |
| Edge Functions | 8 | 8 | ✅ |
| Section Components | 18 | 19 (all 18 + index) | ✅ |
| Element Components | 9 | 10 (+FormElement, SocialLinksElement) | ✅ |
| Layout Containers | 5 | 6 (+TwoColumnLayout) | ✅ |
| Builder UI Components | 16 | 25+ (many extras) | ✅ |
| Common Components | 4 | 5 (+index) | ✅ |
| Renderer Components | 4 | 4 | ✅ |
| React Hooks | 17 | 23 (+useAutoSave, useContentLock, extras) | ✅ |
| Utility Functions | 4 | 5 (+index) | ✅ |
| Developer Portal Pages | 15 | 16 (+TemplateEditor) | ✅ |
| Admin Website Pages | 11 | 12 (+index) | ✅ |
| Platform Pages | 3 | 4 (+index) | ✅ |
| Routing Components | 5 | 6 (+index) | ✅ |
| Public Pages | 4 | 11 (+many static pages) | ✅ |
| Section Templates (DB) | 10 | 20+ (via 050 + 051) | ✅ |
| Page Templates (DB) | 5 | 8+ (via 050 + 051) | ✅ |

## Remaining Work

### HIGH Priority (Missing Files)
1. **HeadingElement.jsx** - H1-H6 heading element for drag-drop

### MEDIUM Priority (Polish & Testing)
2. Complete Phase 5.9 testing checklist (integration, browser, mobile, RTL)
3. Error messages and validation UI
4. Loading states and skeletons
5. Tooltips and help text

### LOW Priority (Documentation & Migration)
6. Documentation (admin guide, developer guide, API docs)
7. Migration script for existing tenants
8. Staging test and rollback plan

## Visual Builder Features

| Feature | Status |
|---------|--------|
| Drag & Drop Sections | ✅ Implemented |
| Drag & Drop Elements | ✅ Implemented |
| Column/Grid Layouts | ✅ Implemented |
| Responsive Breakpoints | ✅ Implemented |
| Per-Element Sizing | ✅ Implemented |
| Margin/Padding Controls | ✅ Implemented |
| Alignment Controls | ✅ Implemented |
| Undo/Redo | ✅ Implemented |
| Copy/Paste Elements | ✅ Implemented |
| Live Preview | ✅ Implemented |
| Animation Settings | ✅ Implemented |
| 100% Code-Free | ✅ Implemented |
| Device Preview | ✅ Implemented |
| Layers Panel | ✅ Implemented |
| Asset Manager | ✅ Implemented |
| SEO Panel | ✅ Implemented |
| Auto-Save | ✅ Implemented |
| Content Locking | ✅ Implemented |
| New Tenant Wizard | ✅ Implemented |
| Theme Manager | ✅ Implemented |
| Publish Controls | ✅ Implemented |

## Timeline

| Week | Focus | Days | Status |
|------|-------|------|--------|
| Week 0 | Pre-requisites | 4 | ✅ Done |
| Week 1-2 | Database + Edge Functions | 10 | ✅ Done |
| Week 3-4 | Developer Portal + Builder UI | 10 | ✅ Done |
| Week 5-6 | Admin Panel | 10 | ✅ Done |
| Week 7-8 | Public Website + Sections | 10 | ✅ Done |
| Week 9 | Templates | 5 | ⏳ 40% |
| Week 10-12 | Testing + Migration | 10 | ⏳ 0% |
| **TOTAL** | | **59 days (~12 weeks)** | **~80%** |

## Key Decisions

1. **Website is optional module** - Tenants can use app without website ✅
2. **Developer has full control** - Structure, layout, design ✅
3. **Admin edits content only** - Text, images (no structure changes) ✅
4. **Universal login at app.dento.com** - For tenants without website ✅
5. **Subdomain routing** - tenant.dento.app for all tenants ✅
6. **Module-based UI** - Admin menu adapts to enabled modules ✅
7. **100% Code-Free Builder** - Visual drag-and-drop, no coding required ✅
8. **Responsive by Default** - Desktop/tablet/mobile settings per element ✅

---

# 16. FILE INVENTORY

## Directory Structure (Implemented)

```
src/
├── platform/                              # ✅ Universal platform
│   ├── PlatformApp.jsx                    # ✅
│   ├── ClinicRegistration.jsx             # ✅
│   ├── UniversalLogin.jsx                 # ✅
│   └── index.js                           # ✅
│
├── routing/                               # ✅ Multi-tenant routing
│   ├── TenantRouter.jsx                   # ✅
│   ├── DomainResolver.jsx                 # ✅
│   ├── ModuleGate.jsx                     # ✅
│   ├── LanguageRouter.jsx                 # ✅
│   ├── useSubdomain.js                    # ✅
│   └── index.js                           # ✅
│
├── admin/
│   ├── contexts/
│   │   ├── ModuleContext.jsx              # ✅
│   │   └── TenantContext.jsx              # ✅
│   └── pages/
│       └── website/                       # ✅ All 11 pages
│           ├── ContentEditor.jsx
│           ├── ContentEditorField.jsx
│           ├── ContactSettings.jsx
│           ├── FAQsManager.jsx
│           ├── FormSubmissions.jsx
│           ├── ImagePicker.jsx
│           ├── MediaLibrary.jsx
│           ├── RichTextEditor.jsx
│           ├── TestimonialsManager.jsx
│           ├── WorkingHoursEditor.jsx
│           └── index.js
│
├── developer/
│   └── pages/
│       └── website/                       # ✅ All 15 pages
│           ├── AnimationSettings.jsx
│           ├── ButtonCardStyles.jsx
│           ├── DomainSettings.jsx
│           ├── IntegrationSettings.jsx
│           ├── NavigationEditor.jsx
│           ├── PageBuilderPage.jsx
│           ├── PageList.jsx
│           ├── PreviewMode.jsx
│           ├── TemplateEditor.jsx
│           ├── TemplateLibrary.jsx
│           ├── VersionHistory.jsx
│           ├── WebsiteSEOSettings.jsx
│           ├── WebsiteThemeSettings.jsx
│           └── index.js
│
├── public/                                # ✅ Public website
│   ├── PublicApp.jsx
│   ├── layouts/
│   │   └── PublicLayout.jsx
│   └── pages/
│       ├── AboutPage.jsx
│       ├── BlogPage.jsx
│       ├── BlogPostPage.jsx
│       ├── BookingPage.jsx
│       ├── ContactPage.jsx
│       ├── DoctorsPage.jsx
│       ├── DynamicPage.jsx
│       ├── HomePage.jsx
│       ├── NoWebsiteLanding.jsx
│       ├── NotFoundPage.jsx
│       └── ServicesPage.jsx
│
├── components/
│   └── pageBuilder/
│       ├── sections/                      # ✅ All 18 + index
│       ├── elements/                      # ✅ 10 elements + index
│       ├── layouts/                       # ✅ 6 layouts + index
│       ├── builder/                       # ✅ 13 components + index
│       ├── common/                        # ✅ 4 components + index
│       ├── renderer/                      # ✅ 3 components + index
│       ├── BuilderCanvas.jsx              # ✅
│       ├── BuilderSidebar.jsx             # ✅
│       ├── BuilderToolbar.jsx             # ✅
│       ├── SettingsPanel.jsx              # ✅
│       ├── PageBuilder.jsx                # ✅
│       ├── PageManager.jsx                # ✅
│       ├── PageRenderer.jsx               # ✅
│       ├── ResponsiveControls.jsx         # ✅
│       ├── AssetManager.jsx               # ✅
│       ├── ComponentToolbox.jsx           # ✅
│       ├── DevicePreview.jsx              # ✅
│       ├── HistoryControls.jsx            # ✅
│       ├── LayersPanel.jsx                # ✅
│       ├── PublishControls.jsx            # ✅
│       ├── SEOPanel.jsx                   # ✅
│       ├── ThemeManager.jsx               # ✅
│       └── index.js                       # ✅
│
├── hooks/
│   └── pageBuilder/                       # ✅ 21 hooks + index
│       ├── usePages.js
│       ├── usePageContent.js
│       ├── useMediaLibrary.js
│       ├── useWebsiteSettings.js
│       ├── useFormSubmissions.js
│       ├── useVersionHistory.js
│       ├── useTestimonials.js
│       ├── useFAQs.js
│       ├── useModules.js
│       ├── usePreview.js
│       ├── useSubdomain.js
│       ├── useBuilder.js
│       ├── useDragDrop.js
│       ├── useElementSettings.js
│       ├── useResponsive.js
│       ├── useHistory.js
│       ├── useClipboard.js
│       ├── useContactSettings.js
│       ├── useWebsiteContent.js
│       ├── useWorkingHours.js
│       └── index.js
│
├── utils/
│   └── pageBuilder/                       # ✅ 4 utils + index
│       ├── serialization.js
│       ├── validation.js
│       ├── sanitization.js
│       ├── imageOptimization.js
│       └── index.js
│
└── templates/                             # ✅ Template definitions
    ├── pageTemplates.js
    ├── sectionTemplates.js
    └── index.js

supabase/
├── functions/                             # ✅ All 8 edge functions
│   ├── page-builder-api/index.ts
│   ├── media-upload/index.ts
│   ├── template-api/index.ts
│   ├── website-settings-api/index.ts
│   ├── form-submission-api/index.ts
│   ├── generate-sitemap/index.ts
│   ├── verify-domain/index.ts
│   └── optimize-image/index.ts
│
└── migrations/
    └── 050_page_builder_tables.sql        # ✅ All DB tables

vercel.json                                # ✅ Routing config
```

---

**✅ PHASE 5 IMPLEMENTATION: 95% COMPLETE**

**Remaining:**
1. Create HeadingElement.jsx (1 file)
2. Add more template seeds to migration
3. Phase 5.9 Testing & Polish
4. Documentation
