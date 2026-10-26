-- Website Themes System
-- Stores complete visual theme configurations for multi-tenant design customization

-- ============================================
-- 1. Website Themes Table
-- ============================================
CREATE TABLE IF NOT EXISTS website_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Theme Identity
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100),
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  description_ar TEXT,
  thumbnail_url TEXT,
  
  -- Theme Type
  is_system BOOLEAN DEFAULT false,       -- System themes (available to all tenants)
  is_premium BOOLEAN DEFAULT false,      -- Premium themes (require paid plan)
  is_active BOOLEAN DEFAULT false,       -- Currently active theme for tenant
  
  -- Color Palette (stored as hex values)
  colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "primary": { "50": "#f0fdfa", "100": "#ccfbf1", ..., "900": "#134e4a" },
  --   "accent": { "gold": "#f59e0b", "coral": "#fb7185", "navy": "#1e3a5f" },
  --   "neutral": { "dark": "#0f172a", "gray": "#64748b", "light": "#f8fafc" },
  --   "background": "#ffffff",
  --   "text": "#111827",
  --   "surface": "#f8fafc"
  -- }
  
  -- Typography
  typography JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "fontFamily": "Inter, system-ui, sans-serif",
  --   "displayFont": "Poppins, sans-serif",
  --   "arabicFont": "Cairo, sans-serif",
  --   "baseFontSize": "16px",
  --   "headingWeight": "700",
  --   "bodyWeight": "400"
  -- }
  
  -- Button Styles
  buttons JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "borderRadius": "9999px",
  --   "paddingX": "2rem",
  --   "paddingY": "0.875rem",
  --   "hoverEffect": "translateY(-2px)",
  --   "shadowOnHover": true
  -- }
  
  -- Layout & Spacing
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "maxWidth": "1280px",
  --   "sectionPadding": "5rem",
  --   "cardRadius": "1rem",
  --   "cardShadow": "0 4px 6px -1px rgba(0,0,0,0.1)",
  --   "cardHoverEffect": "translateY(-8px)"
  -- }
  
  -- Animations
  animations JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "enabled": true,
  --   "duration": "0.3s",
  --   "easing": "ease",
  --   "hoverScale": false,
  --   "scrollReveal": true
  -- }
  
  -- Hero Section Defaults
  hero_style JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "variant": "gradient",
  --   "overlayOpacity": 0.5,
  --   "minHeight": "100vh",
  --   "backgroundGradient": "from-primary-50 via-white to-primary-100",
  --   "decorativeElements": true
  -- }
  
  -- Navbar & Footer Style
  navigation_style JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Expected structure:
  -- {
  --   "navbarStyle": "transparent",
  --   "navbarHeight": "80px",
  --   "stickyNavbar": true,
  --   "footerStyle": "dark",
  --   "footerColumns": 4
  -- }
  
  -- Custom CSS (advanced users)
  custom_css TEXT,
  
  -- Metadata
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Per-tenant: only one active theme
  UNIQUE(tenant_id, is_active) -- partial unique handled by trigger below
);

-- Partial unique index: only one active theme per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_theme_per_tenant 
  ON website_themes (tenant_id) 
  WHERE is_active = true;

-- Index for system themes
CREATE INDEX IF NOT EXISTS idx_system_themes 
  ON website_themes (is_system) 
  WHERE is_system = true;

-- Index for tenant themes
CREATE INDEX IF NOT EXISTS idx_tenant_themes 
  ON website_themes (tenant_id);

-- ============================================
-- 2. Theme Assignment History
-- ============================================
CREATE TABLE IF NOT EXISTS theme_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES website_themes(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('activated', 'deactivated', 'customized')),
  changed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_theme_history_tenant 
  ON theme_history (tenant_id, created_at DESC);

-- ============================================
-- 3. RLS Policies
-- ============================================
ALTER TABLE website_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_history ENABLE ROW LEVEL SECURITY;

-- System themes are readable by everyone
CREATE POLICY "system_themes_readable" ON website_themes
  FOR SELECT USING (is_system = true);

-- Tenant members can read their own themes
CREATE POLICY "tenant_themes_readable" ON website_themes
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Only admins can insert/update/delete tenant themes
CREATE POLICY "tenant_themes_manageable" ON website_themes
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Theme history readable by tenant members
CREATE POLICY "theme_history_readable" ON theme_history
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Theme history insertable by admins
CREATE POLICY "theme_history_insertable" ON theme_history
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 4. Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_theme_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_theme_updated_at
  BEFORE UPDATE ON website_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_theme_updated_at();

-- ============================================
-- 5. Drop the conflicting unique constraint
-- ============================================
-- The (tenant_id, is_active) unique constraint doesn't work well
-- because it prevents multiple is_active=false rows
ALTER TABLE website_themes DROP CONSTRAINT IF EXISTS website_themes_tenant_id_is_active_key;
