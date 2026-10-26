-- =====================================================
-- MIGRATION 050: Page Builder Tables (Phase 5)
-- =====================================================
-- This migration creates all tables needed for the 
-- visual page builder feature.
-- =====================================================

-- ===========================================
-- 1. PAGES TABLE (Per Tenant)
-- ===========================================

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  published_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_tenant_page_slug UNIQUE(tenant_id, slug)
);

-- ===========================================
-- 2. PAGE VERSIONS TABLE (History)
-- ===========================================

CREATE TABLE IF NOT EXISTS page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ===========================================
-- 3. CONTENT DRAFTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  content JSONB NOT NULL,                    -- Draft content changes
  
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  approval_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ
);

-- ===========================================
-- 4. NAVIGATION MENUS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS navigation_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  menu_type VARCHAR(50) NOT NULL CHECK (menu_type IN ('header', 'footer', 'mobile')),
  items JSONB NOT NULL DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  
  CONSTRAINT unique_tenant_menu UNIQUE(tenant_id, menu_type)
);

-- ===========================================
-- 5. WEBSITE SETTINGS TABLE (Per Tenant)
-- ===========================================

CREATE TABLE IF NOT EXISTS website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  
  -- Animations & Effects
  animations_enabled BOOLEAN DEFAULT true,
  animation_style VARCHAR(50) DEFAULT 'smooth', -- none, subtle, smooth, dynamic
  animation_speed VARCHAR(20) DEFAULT 'normal', -- slow, normal, fast
  scroll_animations BOOLEAN DEFAULT true,
  hover_effects BOOLEAN DEFAULT true,
  page_transitions BOOLEAN DEFAULT true,
  loading_animation VARCHAR(50) DEFAULT 'fade', -- fade, slide, none
  parallax_enabled BOOLEAN DEFAULT false,
  
  -- Button Styles
  button_radius INTEGER DEFAULT 8,
  button_style VARCHAR(50) DEFAULT 'filled',    -- filled, outlined, ghost
  
  -- Card Styles
  card_radius INTEGER DEFAULT 12,
  card_shadow VARCHAR(50) DEFAULT 'medium',     -- none, subtle, medium, strong
  
  -- Section Spacing
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
  working_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00", "closed": false},
    "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
    "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
    "thursday": {"open": "09:00", "close": "18:00", "closed": false},
    "friday": {"open": "09:00", "close": "18:00", "closed": false},
    "saturday": {"open": "10:00", "close": "14:00", "closed": false},
    "sunday": {"open": null, "close": null, "closed": true}
  }',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 6. MEDIA LIBRARY TABLE (Per Tenant)
-- ===========================================

CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- File Info
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Metadata
  file_type VARCHAR(50) CHECK (file_type IN ('image', 'video', 'document')),
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

-- ===========================================
-- 7. SECTION TEMPLATES TABLE (Global)
-- ===========================================

CREATE TABLE IF NOT EXISTS section_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('hero', 'features', 'services', 'team', 'testimonials', 'cta', 'contact', 'faq', 'gallery', 'stats', 'pricing', 'text', 'video', 'map', 'booking', 'partners', 'branches')),
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

-- ===========================================
-- 8. PAGE TEMPLATES TABLE (Global)
-- ===========================================

CREATE TABLE IF NOT EXISTS page_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('landing', 'service', 'about', 'contact', 'booking')),
  thumbnail_url TEXT,
  
  -- Template
  sections JSONB NOT NULL DEFAULT '[]',      -- Array of section_template IDs + overrides
  default_settings JSONB NOT NULL DEFAULT '{}',
  
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 9. FORM SUBMISSIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  
  form_type VARCHAR(50) NOT NULL CHECK (form_type IN ('contact', 'callback', 'newsletter', 'booking_inquiry', 'custom')),
  data JSONB NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived', 'spam')),
  notes TEXT,
  
  -- Tracking
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES users(id)
);

-- ===========================================
-- 10. CONTENT CHANGE LOG (Audit Trail)
-- ===========================================

CREATE TABLE IF NOT EXISTS content_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('text', 'image', 'section', 'structure', 'settings', 'publish', 'unpublish')),
  field_path TEXT,                           -- e.g., "hero.title_en"
  old_value TEXT,
  new_value TEXT,
  
  changed_by UUID REFERENCES users(id),
  changed_by_role VARCHAR(20),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 11. FAQs TABLE (Dynamic Content)
-- ===========================================

CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- ===========================================
-- 12. ALTER EXISTING TABLES (Website Fields)
-- ===========================================

-- Services website fields
ALTER TABLE services ADD COLUMN IF NOT EXISTS description_long_en TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS description_long_ar TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS website_sort_order INTEGER DEFAULT 0;

-- Doctors website fields
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT true;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS website_sort_order INTEGER DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS short_bio_en VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS short_bio_ar VARCHAR(255);

-- Branches website fields
ALTER TABLE branches ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN DEFAULT true;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_image_url TEXT;

-- Testimonials additional fields (if not exists)
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- ===========================================
-- 13. INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_pages_tenant ON pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pages_homepage ON pages(tenant_id, is_homepage) WHERE is_homepage = true;
CREATE INDEX IF NOT EXISTS idx_page_versions_page ON page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_tenant ON page_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_page ON content_drafts(page_id);
CREATE INDEX IF NOT EXISTS idx_content_drafts_status ON content_drafts(status);
CREATE INDEX IF NOT EXISTS idx_media_tenant ON media_library(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media_library(tenant_id, folder);
CREATE INDEX IF NOT EXISTS idx_media_type ON media_library(tenant_id, file_type);
CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant ON form_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_type ON form_submissions(tenant_id, form_type);
CREATE INDEX IF NOT EXISTS idx_change_log_tenant ON content_change_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_change_log_page ON content_change_log(page_id);
CREATE INDEX IF NOT EXISTS idx_faqs_tenant ON faqs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_section_templates_category ON section_templates(category);
CREATE INDEX IF NOT EXISTS idx_page_templates_category ON page_templates(category);

-- ===========================================
-- 14. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS pages_public_read ON pages;
DROP POLICY IF EXISTS pages_authenticated_all ON pages;
DROP POLICY IF EXISTS page_versions_authenticated ON page_versions;
DROP POLICY IF EXISTS content_drafts_authenticated ON content_drafts;
DROP POLICY IF EXISTS nav_menus_public_read ON navigation_menus;
DROP POLICY IF EXISTS nav_menus_authenticated_all ON navigation_menus;
DROP POLICY IF EXISTS website_settings_public_read ON website_settings;
DROP POLICY IF EXISTS website_settings_authenticated_all ON website_settings;
DROP POLICY IF EXISTS media_library_authenticated ON media_library;
DROP POLICY IF EXISTS form_submissions_public_insert ON form_submissions;
DROP POLICY IF EXISTS form_submissions_authenticated ON form_submissions;
DROP POLICY IF EXISTS change_log_authenticated ON content_change_log;
DROP POLICY IF EXISTS faqs_public_read ON faqs;
DROP POLICY IF EXISTS faqs_authenticated_all ON faqs;
DROP POLICY IF EXISTS section_templates_public_read ON section_templates;
DROP POLICY IF EXISTS page_templates_public_read ON page_templates;

-- Pages: Public read for published, authenticated write
CREATE POLICY pages_public_read ON pages
  FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY pages_authenticated_all ON pages
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Page Versions: Authenticated only
CREATE POLICY page_versions_authenticated ON page_versions
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Content Drafts: Authenticated only
CREATE POLICY content_drafts_authenticated ON content_drafts
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Navigation Menus: Public read, authenticated write
CREATE POLICY nav_menus_public_read ON navigation_menus
  FOR SELECT TO anon
  USING (true);

CREATE POLICY nav_menus_authenticated_all ON navigation_menus
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Website Settings: Public read, authenticated write
CREATE POLICY website_settings_public_read ON website_settings
  FOR SELECT TO anon
  USING (true);

CREATE POLICY website_settings_authenticated_all ON website_settings
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Media Library: Authenticated only
CREATE POLICY media_library_authenticated ON media_library
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Form Submissions: Public insert, authenticated read
CREATE POLICY form_submissions_public_insert ON form_submissions
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY form_submissions_authenticated ON form_submissions
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Content Change Log: Authenticated only
CREATE POLICY change_log_authenticated ON content_change_log
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- FAQs: Public read, authenticated write
CREATE POLICY faqs_public_read ON faqs
  FOR SELECT TO anon
  USING (is_published = true);

CREATE POLICY faqs_authenticated_all ON faqs
  FOR ALL TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Section Templates: Public read (global)
CREATE POLICY section_templates_public_read ON section_templates
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Page Templates: Public read (global)
CREATE POLICY page_templates_public_read ON page_templates
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- ===========================================
-- 15. TRIGGERS
-- ===========================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pages_timestamp
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_settings_timestamp
  BEFORE UPDATE ON website_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_navigation_menus_timestamp
  BEFORE UPDATE ON navigation_menus
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faqs_timestamp
  BEFORE UPDATE ON faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_drafts_timestamp
  BEFORE UPDATE ON content_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- ===========================================
-- 16. ADD WEBSITE MODULE
-- ===========================================

INSERT INTO modules (id, slug, name_en, name_ar, description_en, description_ar, category, is_free, base_price_monthly, base_price_yearly, status)
VALUES (
  gen_random_uuid(),
  'website',
  'Public Website',
  'الموقع العام',
  'Public-facing website with page builder, online booking, SEO, and custom domain support',
  'موقع إلكتروني عام مع أداة بناء الصفحات، الحجز الإلكتروني، تحسين محركات البحث، ودعم النطاقات المخصصة',
  'marketing',
  false,
  29.00,
  290.00,
  'active'
) ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- 17. SEED DEFAULT SECTION TEMPLATES
-- ===========================================

INSERT INTO section_templates (slug, name, description, category, structure, default_content, editable_fields, is_active) VALUES
-- Hero Section
('hero-centered', 'Hero - Centered', 'Full-width hero with centered text and CTA', 'hero', 
'{
  "type": "hero",
  "variant": "centered",
  "settings": {
    "fullWidth": true,
    "minHeight": "80vh",
    "overlay": true,
    "overlayOpacity": 0.5
  }
}',
'{
  "title_en": "Welcome to Our Clinic",
  "title_ar": "مرحباً بكم في عيادتنا",
  "subtitle_en": "Your smile is our priority",
  "subtitle_ar": "ابتسامتك أولويتنا",
  "buttonText_en": "Book Appointment",
  "buttonText_ar": "احجز موعد",
  "buttonLink": "/book",
  "backgroundImage": null
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar", "buttonText_en", "buttonText_ar", "backgroundImage"]',
true),

-- Services Section
('services-grid-3', 'Services - 3 Column Grid', 'Display services in a 3-column grid', 'services',
'{
  "type": "services",
  "variant": "grid",
  "settings": {
    "columns": 3,
    "showDescription": true,
    "showPrice": false,
    "dataSource": "services"
  }
}',
'{
  "title_en": "Our Services",
  "title_ar": "خدماتنا",
  "subtitle_en": "Comprehensive dental care for the whole family",
  "subtitle_ar": "رعاية أسنان شاملة لجميع أفراد العائلة"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar"]',
true),

-- Team Section
('team-grid', 'Team - Grid Layout', 'Display doctors in a grid', 'team',
'{
  "type": "team",
  "variant": "grid",
  "settings": {
    "columns": 4,
    "showBio": true,
    "dataSource": "doctors"
  }
}',
'{
  "title_en": "Meet Our Team",
  "title_ar": "تعرف على فريقنا",
  "subtitle_en": "Expert dentists dedicated to your care",
  "subtitle_ar": "أطباء أسنان متخصصون مكرسون لرعايتك"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar"]',
true),

-- CTA Section
('cta-simple', 'CTA - Simple Banner', 'Call-to-action banner with button', 'cta',
'{
  "type": "cta",
  "variant": "simple",
  "settings": {
    "backgroundColor": "primary"
  }
}',
'{
  "title_en": "Ready to Transform Your Smile?",
  "title_ar": "هل أنت مستعد لتغيير ابتسامتك؟",
  "subtitle_en": "Book your free consultation today",
  "subtitle_ar": "احجز استشارتك المجانية اليوم",
  "buttonText_en": "Get Started",
  "buttonText_ar": "ابدأ الآن",
  "buttonLink": "/contact"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar", "buttonText_en", "buttonText_ar"]',
true),

-- Contact Section
('contact-split', 'Contact - Split Layout', 'Contact form with info sidebar', 'contact',
'{
  "type": "contact",
  "variant": "split",
  "settings": {
    "showMap": true,
    "showHours": true
  }
}',
'{
  "title_en": "Get in Touch",
  "title_ar": "تواصل معنا",
  "subtitle_en": "We would love to hear from you",
  "subtitle_ar": "يسعدنا التواصل معك"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar"]',
true)

ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- 18. SEED DEFAULT PAGE TEMPLATE
-- ===========================================

INSERT INTO page_templates (slug, name, description, category, sections, default_settings, is_active) VALUES
('modern-dental-home', 'Modern Dental - Home', 'Modern dental clinic homepage template', 'landing',
'[
  {"template_slug": "hero-centered", "locked": true},
  {"template_slug": "services-grid-3", "locked": true},
  {"template_slug": "team-grid", "locked": true},
  {"template_slug": "cta-simple", "locked": true},
  {"template_slug": "contact-split", "locked": true}
]',
'{
  "animations": true,
  "style": "modern"
}',
true)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- MIGRATION COMPLETE
-- ===========================================
