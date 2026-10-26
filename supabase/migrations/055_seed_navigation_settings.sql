-- =====================================================
-- MIGRATION 055: Seed Navigation Menus and Website Settings
-- =====================================================
-- Seeds default navigation menus and website settings for 
-- existing tenants. Also fixes RLS policies for all 
-- page builder tables.
-- =====================================================

-- =====================================================
-- SEED NAVIGATION MENUS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION seed_tenant_navigation(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Only seed if tenant has no menus yet
  IF EXISTS (SELECT 1 FROM navigation_menus WHERE tenant_id = p_tenant_id LIMIT 1) THEN
    RETURN;
  END IF;

  -- Header Menu
  INSERT INTO navigation_menus (tenant_id, menu_type, items)
  VALUES (
    p_tenant_id,
    'header',
    '[
      {"id": "home", "label": "Home", "labelAr": "الرئيسية", "url": "/", "type": "page"},
      {"id": "services", "label": "Services", "labelAr": "الخدمات", "url": "/services", "type": "page"},
      {"id": "dental-tourism", "label": "Dental Tourism", "labelAr": "سياحة الأسنان", "url": "/dental-tourism", "type": "page"},
      {"id": "portfolio", "label": "Portfolio", "labelAr": "المعرض", "url": "/portfolio", "type": "page"},
      {"id": "who-we-are", "label": "Who We Are", "labelAr": "من نحن", "url": "/who-we-are", "type": "page"},
      {"id": "testimonials", "label": "Testimonials", "labelAr": "آراء العملاء", "url": "/testimonials", "type": "page"},
      {"id": "contact", "label": "Contact", "labelAr": "اتصل بنا", "url": "/contact", "type": "page"}
    ]'::jsonb
  );

  -- Footer Menu
  INSERT INTO navigation_menus (tenant_id, menu_type, items)
  VALUES (
    p_tenant_id,
    'footer',
    '[
      {
        "id": "quick-links",
        "label": "Quick Links",
        "labelAr": "روابط سريعة",
        "type": "group",
        "children": [
          {"id": "home", "label": "Home", "labelAr": "الرئيسية", "url": "/", "type": "page"},
          {"id": "services", "label": "Services", "labelAr": "الخدمات", "url": "/services", "type": "page"},
          {"id": "portfolio", "label": "Portfolio", "labelAr": "المعرض", "url": "/portfolio", "type": "page"},
          {"id": "contact", "label": "Contact", "labelAr": "اتصل بنا", "url": "/contact", "type": "page"}
        ]
      },
      {
        "id": "services-group",
        "label": "Our Services",
        "labelAr": "خدماتنا",
        "type": "group",
        "children": [
          {"id": "general", "label": "General Dentistry", "labelAr": "طب الأسنان العام", "url": "/services#general", "type": "anchor"},
          {"id": "cosmetic", "label": "Cosmetic Dentistry", "labelAr": "تجميل الأسنان", "url": "/services#cosmetic", "type": "anchor"},
          {"id": "implants", "label": "Dental Implants", "labelAr": "زراعة الأسنان", "url": "/services#implants", "type": "anchor"},
          {"id": "orthodontics", "label": "Orthodontics", "labelAr": "تقويم الأسنان", "url": "/services#orthodontics", "type": "anchor"}
        ]
      },
      {
        "id": "legal",
        "label": "Legal",
        "labelAr": "قانوني",
        "type": "group",
        "children": [
          {"id": "privacy", "label": "Privacy Policy", "labelAr": "سياسة الخصوصية", "url": "/privacy", "type": "page"},
          {"id": "terms", "label": "Terms of Service", "labelAr": "شروط الخدمة", "url": "/terms", "type": "page"}
        ]
      }
    ]'::jsonb
  );

  -- Mobile Menu (simplified version of header)
  INSERT INTO navigation_menus (tenant_id, menu_type, items)
  VALUES (
    p_tenant_id,
    'mobile',
    '[
      {"id": "home", "label": "Home", "labelAr": "الرئيسية", "url": "/", "type": "page", "icon": "home"},
      {"id": "services", "label": "Services", "labelAr": "الخدمات", "url": "/services", "type": "page", "icon": "briefcase"},
      {"id": "dental-tourism", "label": "Dental Tourism", "labelAr": "سياحة الأسنان", "url": "/dental-tourism", "type": "page", "icon": "plane"},
      {"id": "portfolio", "label": "Portfolio", "labelAr": "المعرض", "url": "/portfolio", "type": "page", "icon": "image"},
      {"id": "about", "label": "Who We Are", "labelAr": "من نحن", "url": "/who-we-are", "type": "page", "icon": "users"},
      {"id": "testimonials", "label": "Testimonials", "labelAr": "آراء العملاء", "url": "/testimonials", "type": "page", "icon": "star"},
      {"id": "contact", "label": "Contact", "labelAr": "اتصل بنا", "url": "/contact", "type": "page", "icon": "phone"}
    ]'::jsonb
  );

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED WEBSITE SETTINGS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION seed_tenant_website_settings(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Only seed if tenant has no settings yet
  IF EXISTS (SELECT 1 FROM website_settings WHERE tenant_id = p_tenant_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO website_settings (
    tenant_id,
    primary_color,
    secondary_color,
    accent_color,
    background_color,
    text_color,
    heading_font,
    body_font,
    base_font_size,
    max_width,
    header_style,
    footer_style
  ) VALUES (
    p_tenant_id,
    '#0066CC',
    '#333333',
    '#FF6600',
    '#FFFFFF',
    '#333333',
    'Inter',
    'Inter',
    16,
    1200,
    'standard',
    'standard'
  );

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED FOR ALL EXISTING TENANTS
-- =====================================================
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants WHERE status = 'active'
  LOOP
    PERFORM seed_tenant_navigation(tenant_record.id);
    PERFORM seed_tenant_website_settings(tenant_record.id);
    RAISE NOTICE 'Seeded navigation and settings for tenant: %', tenant_record.id;
  END LOOP;
END;
$$;

-- =====================================================
-- TRIGGER: Auto-seed for new tenants
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_seed_website_data_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM seed_tenant_navigation(NEW.id);
    PERFORM seed_tenant_website_settings(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_seed_website_data_on_tenant_create ON tenants;
CREATE TRIGGER auto_seed_website_data_on_tenant_create
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_website_data_for_new_tenant();

-- =====================================================
-- FIX RLS POLICIES FOR ALL PAGE BUILDER TABLES
-- =====================================================

-- Helper function for developer check
CREATE OR REPLACE FUNCTION is_developer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'developer'
  );
$$;

-- Navigation Menus
DROP POLICY IF EXISTS nav_menus_public_read ON navigation_menus;
DROP POLICY IF EXISTS nav_menus_authenticated_all ON navigation_menus;
DROP POLICY IF EXISTS nav_menus_tenant_access ON navigation_menus;

CREATE POLICY nav_menus_public_read ON navigation_menus
  FOR SELECT TO anon
  USING (true);

CREATE POLICY nav_menus_tenant_access ON navigation_menus
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- Website Settings
DROP POLICY IF EXISTS website_settings_public_read ON website_settings;
DROP POLICY IF EXISTS website_settings_authenticated_all ON website_settings;
DROP POLICY IF EXISTS website_settings_tenant_access ON website_settings;

CREATE POLICY website_settings_public_read ON website_settings
  FOR SELECT TO anon
  USING (true);

CREATE POLICY website_settings_tenant_access ON website_settings
  FOR ALL TO authenticated
  USING (
    tenant_id IN (SELECT get_user_tenant_ids())
    OR is_developer()
  );

-- Enable realtime for navigation and settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'navigation_menus'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE navigation_menus;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'website_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE website_settings;
  END IF;
END;
$$;

-- Verify seeding
SELECT 'navigation_menus' as table_name, COUNT(*) as count FROM navigation_menus
UNION ALL
SELECT 'website_settings' as table_name, COUNT(*) as count FROM website_settings;
