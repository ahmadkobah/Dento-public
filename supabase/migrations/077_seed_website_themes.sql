-- Seed System Themes
-- 5 professional dental clinic themes available globally

-- ============================================
-- Theme 1: Teal Elegance (Canine Clinic Design)
-- ============================================
INSERT INTO website_themes (
  id, tenant_id, name, name_ar, slug, description, description_ar,
  is_system, is_premium, is_active,
  colors, typography, buttons, layout, animations, hero_style, navigation_style
) VALUES (
  'a1000000-0000-0000-0000-000000000001',
  NULL,
  'Teal Elegance',
  'الأناقة الفيروزية',
  'teal-elegance',
  'Modern teal/emerald theme with warm accents. Clean, professional, and inviting. The original Canine Clinic design.',
  'تصميم فيروزي/زمردي عصري مع لمسات دافئة. نظيف ومحترف وجذاب. تصميم عيادة كانين الأصلي.',
  true, false, false,
  '{
    "primary": {
      "50": "#f0fdfa", "100": "#ccfbf1", "200": "#99f6e4", "300": "#5eead4",
      "400": "#2dd4bf", "500": "#14b8a6", "600": "#0d9488", "700": "#0f766e",
      "800": "#115e59", "900": "#134e4a"
    },
    "accent": { "gold": "#f59e0b", "coral": "#fb7185", "navy": "#1e3a5f" },
    "neutral": { "dark": "#0f172a", "gray": "#64748b", "light": "#f8fafc" },
    "background": "#ffffff",
    "text": "#111827",
    "surface": "#f8fafc",
    "gradient": {
      "hero": "from-primary-50 via-white to-primary-100",
      "cta": "from-primary-600 to-primary-700",
      "card": "from-primary-100 to-primary-200"
    }
  }'::jsonb,
  '{
    "fontFamily": "Inter, system-ui, sans-serif",
    "displayFont": "Poppins, sans-serif",
    "arabicFont": "Cairo, sans-serif",
    "baseFontSize": "16px",
    "headingWeight": "700",
    "bodyWeight": "400",
    "lineHeight": "1.6"
  }'::jsonb,
  '{
    "borderRadius": "9999px",
    "paddingX": "2rem",
    "paddingY": "0.875rem",
    "hoverEffect": "translateY(-2px)",
    "shadowOnHover": true,
    "shadowColor": "rgba(13, 148, 136, 0.4)"
  }'::jsonb,
  '{
    "maxWidth": "1280px",
    "sectionPadding": "5rem",
    "cardRadius": "1rem",
    "cardShadow": "0 4px 6px -1px rgba(0,0,0,0.1)",
    "cardHoverEffect": "translateY(-8px)",
    "containerPadding": "1.5rem"
  }'::jsonb,
  '{
    "enabled": true,
    "duration": "0.3s",
    "easing": "ease",
    "hoverScale": false,
    "scrollReveal": true,
    "decorativeBlurs": true
  }'::jsonb,
  '{
    "variant": "gradient",
    "overlayOpacity": 0.5,
    "minHeight": "100vh",
    "backgroundGradient": "from-primary-50 via-white to-primary-100",
    "decorativeElements": true,
    "animatedWords": true
  }'::jsonb,
  '{
    "navbarStyle": "transparent",
    "navbarHeight": "80px",
    "stickyNavbar": true,
    "footerStyle": "dark",
    "footerColumns": 4,
    "showLanguageToggle": true
  }'::jsonb
);

-- ============================================
-- Theme 2: Royal Blue Professional
-- ============================================
INSERT INTO website_themes (
  id, tenant_id, name, name_ar, slug, description, description_ar,
  is_system, is_premium, is_active,
  colors, typography, buttons, layout, animations, hero_style, navigation_style
) VALUES (
  'a1000000-0000-0000-0000-000000000002',
  NULL,
  'Royal Blue Professional',
  'الأزرق الملكي المحترف',
  'royal-blue',
  'A sophisticated blue theme conveying trust and professionalism. Perfect for established clinics.',
  'سمة زرقاء راقية تعبر عن الثقة والاحترافية. مثالية للعيادات الراسخة.',
  true, false, false,
  '{
    "primary": {
      "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd",
      "400": "#60a5fa", "500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8",
      "800": "#1e40af", "900": "#1e3a8a"
    },
    "accent": { "gold": "#eab308", "coral": "#f43f5e", "navy": "#0f172a" },
    "neutral": { "dark": "#111827", "gray": "#6b7280", "light": "#f9fafb" },
    "background": "#ffffff",
    "text": "#1f2937",
    "surface": "#f3f4f6",
    "gradient": {
      "hero": "from-blue-50 via-white to-indigo-50",
      "cta": "from-blue-600 to-indigo-700",
      "card": "from-blue-50 to-blue-100"
    }
  }'::jsonb,
  '{
    "fontFamily": "''Plus Jakarta Sans'', system-ui, sans-serif",
    "displayFont": "''Plus Jakarta Sans'', sans-serif",
    "arabicFont": "''IBM Plex Sans Arabic'', sans-serif",
    "baseFontSize": "16px",
    "headingWeight": "800",
    "bodyWeight": "400",
    "lineHeight": "1.7"
  }'::jsonb,
  '{
    "borderRadius": "0.75rem",
    "paddingX": "1.75rem",
    "paddingY": "0.75rem",
    "hoverEffect": "translateY(-1px)",
    "shadowOnHover": true,
    "shadowColor": "rgba(37, 99, 235, 0.3)"
  }'::jsonb,
  '{
    "maxWidth": "1200px",
    "sectionPadding": "6rem",
    "cardRadius": "0.75rem",
    "cardShadow": "0 1px 3px rgba(0,0,0,0.1)",
    "cardHoverEffect": "translateY(-4px)",
    "containerPadding": "2rem"
  }'::jsonb,
  '{
    "enabled": true,
    "duration": "0.25s",
    "easing": "cubic-bezier(0.4, 0, 0.2, 1)",
    "hoverScale": false,
    "scrollReveal": true,
    "decorativeBlurs": false
  }'::jsonb,
  '{
    "variant": "split-image",
    "overlayOpacity": 0.3,
    "minHeight": "90vh",
    "backgroundGradient": "from-blue-50 via-white to-indigo-50",
    "decorativeElements": false,
    "animatedWords": false
  }'::jsonb,
  '{
    "navbarStyle": "solid-white",
    "navbarHeight": "72px",
    "stickyNavbar": true,
    "footerStyle": "dark-navy",
    "footerColumns": 3,
    "showLanguageToggle": true
  }'::jsonb
);

-- ============================================
-- Theme 3: Warm Coral Friendly
-- ============================================
INSERT INTO website_themes (
  id, tenant_id, name, name_ar, slug, description, description_ar,
  is_system, is_premium, is_active,
  colors, typography, buttons, layout, animations, hero_style, navigation_style
) VALUES (
  'a1000000-0000-0000-0000-000000000003',
  NULL,
  'Warm Coral Friendly',
  'المرجاني الدافئ الودود',
  'warm-coral',
  'A warm, approachable theme with coral and peach tones. Great for family-oriented clinics.',
  'سمة دافئة وودودة بألوان مرجانية وخوخية. رائعة للعيادات الموجهة للعائلة.',
  true, false, false,
  '{
    "primary": {
      "50": "#fff1f2", "100": "#ffe4e6", "200": "#fecdd3", "300": "#fda4af",
      "400": "#fb7185", "500": "#f43f5e", "600": "#e11d48", "700": "#be123c",
      "800": "#9f1239", "900": "#881337"
    },
    "accent": { "gold": "#f59e0b", "coral": "#fb923c", "navy": "#7c3aed" },
    "neutral": { "dark": "#18181b", "gray": "#71717a", "light": "#fafafa" },
    "background": "#fffbfb",
    "text": "#27272a",
    "surface": "#fef2f2",
    "gradient": {
      "hero": "from-rose-50 via-white to-orange-50",
      "cta": "from-rose-500 to-pink-600",
      "card": "from-rose-50 to-pink-50"
    }
  }'::jsonb,
  '{
    "fontFamily": "''Nunito'', system-ui, sans-serif",
    "displayFont": "''Nunito'', sans-serif",
    "arabicFont": "''Tajawal'', sans-serif",
    "baseFontSize": "16px",
    "headingWeight": "700",
    "bodyWeight": "400",
    "lineHeight": "1.65"
  }'::jsonb,
  '{
    "borderRadius": "1rem",
    "paddingX": "2rem",
    "paddingY": "0.875rem",
    "hoverEffect": "scale(1.02)",
    "shadowOnHover": true,
    "shadowColor": "rgba(244, 63, 94, 0.3)"
  }'::jsonb,
  '{
    "maxWidth": "1280px",
    "sectionPadding": "5rem",
    "cardRadius": "1.25rem",
    "cardShadow": "0 4px 14px -3px rgba(0,0,0,0.08)",
    "cardHoverEffect": "translateY(-6px) scale(1.01)",
    "containerPadding": "1.5rem"
  }'::jsonb,
  '{
    "enabled": true,
    "duration": "0.35s",
    "easing": "ease-out",
    "hoverScale": true,
    "scrollReveal": true,
    "decorativeBlurs": true
  }'::jsonb,
  '{
    "variant": "gradient",
    "overlayOpacity": 0.4,
    "minHeight": "95vh",
    "backgroundGradient": "from-rose-50 via-white to-orange-50",
    "decorativeElements": true,
    "animatedWords": true
  }'::jsonb,
  '{
    "navbarStyle": "transparent",
    "navbarHeight": "76px",
    "stickyNavbar": true,
    "footerStyle": "warm",
    "footerColumns": 4,
    "showLanguageToggle": true
  }'::jsonb
);

-- ============================================
-- Theme 4: Dark Premium (Premium Theme)
-- ============================================
INSERT INTO website_themes (
  id, tenant_id, name, name_ar, slug, description, description_ar,
  is_system, is_premium, is_active,
  colors, typography, buttons, layout, animations, hero_style, navigation_style
) VALUES (
  'a1000000-0000-0000-0000-000000000004',
  NULL,
  'Dark Premium',
  'الداكن الفاخر',
  'dark-premium',
  'A luxurious dark theme with gold accents. Ideal for high-end cosmetic dentistry clinics.',
  'سمة داكنة فاخرة بلمسات ذهبية. مثالية لعيادات تجميل الأسنان الراقية.',
  true, true, false,
  '{
    "primary": {
      "50": "#fefce8", "100": "#fef9c3", "200": "#fef08a", "300": "#fde047",
      "400": "#facc15", "500": "#eab308", "600": "#ca8a04", "700": "#a16207",
      "800": "#854d0e", "900": "#713f12"
    },
    "accent": { "gold": "#f59e0b", "coral": "#d4a853", "navy": "#1a1a2e" },
    "neutral": { "dark": "#0a0a0f", "gray": "#9ca3af", "light": "#1f2937" },
    "background": "#0f0f1a",
    "text": "#f3f4f6",
    "surface": "#1a1a2e",
    "gradient": {
      "hero": "from-gray-900 via-gray-800 to-gray-900",
      "cta": "from-amber-600 to-yellow-500",
      "card": "from-gray-800 to-gray-700"
    }
  }'::jsonb,
  '{
    "fontFamily": "''Outfit'', system-ui, sans-serif",
    "displayFont": "''Playfair Display'', serif",
    "arabicFont": "''Amiri'', serif",
    "baseFontSize": "16px",
    "headingWeight": "600",
    "bodyWeight": "300",
    "lineHeight": "1.8"
  }'::jsonb,
  '{
    "borderRadius": "0.25rem",
    "paddingX": "2.5rem",
    "paddingY": "1rem",
    "hoverEffect": "translateY(-1px)",
    "shadowOnHover": true,
    "shadowColor": "rgba(234, 179, 8, 0.3)"
  }'::jsonb,
  '{
    "maxWidth": "1200px",
    "sectionPadding": "7rem",
    "cardRadius": "0.5rem",
    "cardShadow": "0 4px 20px rgba(0,0,0,0.3)",
    "cardHoverEffect": "translateY(-4px)",
    "containerPadding": "2rem"
  }'::jsonb,
  '{
    "enabled": true,
    "duration": "0.4s",
    "easing": "cubic-bezier(0.16, 1, 0.3, 1)",
    "hoverScale": false,
    "scrollReveal": true,
    "decorativeBlurs": true
  }'::jsonb,
  '{
    "variant": "dark-overlay",
    "overlayOpacity": 0.7,
    "minHeight": "100vh",
    "backgroundGradient": "from-gray-900 via-gray-800 to-gray-900",
    "decorativeElements": true,
    "animatedWords": true
  }'::jsonb,
  '{
    "navbarStyle": "dark-glass",
    "navbarHeight": "80px",
    "stickyNavbar": true,
    "footerStyle": "dark",
    "footerColumns": 4,
    "showLanguageToggle": true
  }'::jsonb
);

-- ============================================
-- Theme 5: Clean Minimal
-- ============================================
INSERT INTO website_themes (
  id, tenant_id, name, name_ar, slug, description, description_ar,
  is_system, is_premium, is_active,
  colors, typography, buttons, layout, animations, hero_style, navigation_style
) VALUES (
  'a1000000-0000-0000-0000-000000000005',
  NULL,
  'Clean Minimal',
  'النظيف البسيط',
  'clean-minimal',
  'A minimalist white theme with subtle green accents. Focuses on content and whitespace.',
  'سمة بيضاء بسيطة مع لمسات خضراء خفيفة. تركز على المحتوى والمساحات البيضاء.',
  true, false, false,
  '{
    "primary": {
      "50": "#f0fdf4", "100": "#dcfce7", "200": "#bbf7d0", "300": "#86efac",
      "400": "#4ade80", "500": "#22c55e", "600": "#16a34a", "700": "#15803d",
      "800": "#166534", "900": "#14532d"
    },
    "accent": { "gold": "#a3a3a3", "coral": "#10b981", "navy": "#374151" },
    "neutral": { "dark": "#111827", "gray": "#9ca3af", "light": "#f9fafb" },
    "background": "#ffffff",
    "text": "#374151",
    "surface": "#ffffff",
    "gradient": {
      "hero": "from-white to-green-50",
      "cta": "from-green-600 to-emerald-600",
      "card": "from-green-50 to-emerald-50"
    }
  }'::jsonb,
  '{
    "fontFamily": "''DM Sans'', system-ui, sans-serif",
    "displayFont": "''DM Sans'', sans-serif",
    "arabicFont": "''Noto Sans Arabic'', sans-serif",
    "baseFontSize": "15px",
    "headingWeight": "600",
    "bodyWeight": "400",
    "lineHeight": "1.75"
  }'::jsonb,
  '{
    "borderRadius": "0.5rem",
    "paddingX": "1.5rem",
    "paddingY": "0.75rem",
    "hoverEffect": "none",
    "shadowOnHover": false,
    "shadowColor": "transparent"
  }'::jsonb,
  '{
    "maxWidth": "1100px",
    "sectionPadding": "6rem",
    "cardRadius": "0.25rem",
    "cardShadow": "none",
    "cardHoverEffect": "none",
    "containerPadding": "2rem",
    "borderStyle": "1px solid #e5e7eb"
  }'::jsonb,
  '{
    "enabled": false,
    "duration": "0.2s",
    "easing": "ease",
    "hoverScale": false,
    "scrollReveal": false,
    "decorativeBlurs": false
  }'::jsonb,
  '{
    "variant": "minimal",
    "overlayOpacity": 0,
    "minHeight": "80vh",
    "backgroundGradient": "from-white to-green-50",
    "decorativeElements": false,
    "animatedWords": false
  }'::jsonb,
  '{
    "navbarStyle": "bordered",
    "navbarHeight": "64px",
    "stickyNavbar": true,
    "footerStyle": "minimal",
    "footerColumns": 3,
    "showLanguageToggle": true
  }'::jsonb
);
