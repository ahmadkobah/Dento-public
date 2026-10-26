-- =====================================================
-- MIGRATION 053: Seed Default Pages for All Tenants
-- =====================================================
-- Seeds default website pages for existing tenants.
-- Both Developer (structure) and Admin (content) portals
-- will share the same pages table as single source of truth.
-- =====================================================

-- Helper function to seed pages for a tenant
CREATE OR REPLACE FUNCTION seed_tenant_pages(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Only seed if tenant has no pages yet
  IF EXISTS (SELECT 1 FROM pages WHERE tenant_id = p_tenant_id LIMIT 1) THEN
    RETURN;
  END IF;

  -- ==========================================
  -- HOME PAGE
  -- ==========================================
  INSERT INTO pages (
    tenant_id, slug, title_en, title_ar, is_homepage, show_in_nav, nav_order, nav_label_en, nav_label_ar,
    seo_title_en, seo_title_ar, seo_description_en, seo_description_ar, status, published_at,
    structure, content
  ) VALUES (
    p_tenant_id,
    '/',
    'Home',
    'الرئيسية',
    true,
    true,
    0,
    'Home',
    'الرئيسية',
    'Welcome to Our Dental Clinic',
    'مرحباً بكم في عيادة الأسنان',
    'Professional dental care with modern technology and expert doctors.',
    'رعاية أسنان احترافية بتقنيات حديثة وأطباء متخصصين.',
    'published',
    NOW(),
    -- STRUCTURE: Defines layout and editable zones (Developer controls this)
    '[
      {
        "id": "hero",
        "type": "HeroSection",
        "layout": "centered",
        "editable": true,
        "fields": [
          {"id": "title", "type": "text", "label": "Title"},
          {"id": "subtitle", "type": "textarea", "label": "Subtitle"},
          {"id": "ctaText", "type": "text", "label": "Button Text"},
          {"id": "ctaLink", "type": "text", "label": "Button Link"},
          {"id": "backgroundImage", "type": "image", "label": "Background Image"}
        ]
      },
      {
        "id": "features",
        "type": "FeaturesGrid",
        "columns": 3,
        "editable": true,
        "fields": [
          {"id": "sectionTitle", "type": "text", "label": "Section Title"},
          {"id": "items", "type": "array", "label": "Feature Items", "itemFields": [
            {"id": "icon", "type": "icon"},
            {"id": "title", "type": "text"},
            {"id": "description", "type": "textarea"}
          ]}
        ]
      },
      {
        "id": "about",
        "type": "AboutSection",
        "layout": "imageLeft",
        "editable": true,
        "fields": [
          {"id": "sectionLabel", "type": "text", "label": "Section Label"},
          {"id": "title", "type": "text", "label": "Title"},
          {"id": "description", "type": "richtext", "label": "Description"},
          {"id": "image", "type": "image", "label": "Image"},
          {"id": "ctaText", "type": "text", "label": "Button Text"},
          {"id": "ctaLink", "type": "text", "label": "Button Link"}
        ]
      },
      {
        "id": "stats",
        "type": "StatsSection",
        "editable": true,
        "fields": [
          {"id": "items", "type": "array", "label": "Statistics", "itemFields": [
            {"id": "number", "type": "text"},
            {"id": "label", "type": "text"}
          ]}
        ]
      },
      {
        "id": "services",
        "type": "ServicesGrid",
        "columns": 4,
        "editable": true,
        "fields": [
          {"id": "sectionLabel", "type": "text", "label": "Section Label"},
          {"id": "sectionTitle", "type": "text", "label": "Section Title"}
        ]
      },
      {
        "id": "cta",
        "type": "CTASection",
        "editable": true,
        "fields": [
          {"id": "title", "type": "text", "label": "Title"},
          {"id": "description", "type": "textarea", "label": "Description"},
          {"id": "buttonText", "type": "text", "label": "Button Text"},
          {"id": "buttonLink", "type": "text", "label": "Button Link"}
        ]
      }
    ]'::jsonb,
    -- CONTENT: Actual text/images (Admin edits this)
    '{
      "hero": {
        "title": "Committed to your dental well-being.",
        "title_ar": "ملتزمون بصحة أسنانك.",
        "subtitle": "Experience exceptional dental care with our team of skilled professionals using the latest technology.",
        "subtitle_ar": "استمتع برعاية أسنان استثنائية مع فريقنا من المتخصصين المهرة باستخدام أحدث التقنيات.",
        "ctaText": "Book Consultation",
        "ctaText_ar": "احجز استشارة",
        "ctaLink": "/contact",
        "backgroundImage": null
      },
      "features": {
        "sectionTitle": "Why Choose Us",
        "sectionTitle_ar": "لماذا تختارنا",
        "items": [
          {
            "icon": "users",
            "title": "Expert Team",
            "title_ar": "فريق متخصص",
            "description": "Our team of experienced dental professionals is dedicated to providing the highest quality care.",
            "description_ar": "فريقنا من محترفي طب الأسنان ذوي الخبرة ملتزم بتقديم أعلى جودة رعاية."
          },
          {
            "icon": "monitor",
            "title": "Modern Technology",
            "title_ar": "تقنية حديثة",
            "description": "We use the latest dental technology to ensure accurate diagnoses and effective treatments.",
            "description_ar": "نستخدم أحدث تقنيات طب الأسنان لضمان تشخيصات دقيقة وعلاجات فعالة."
          },
          {
            "icon": "heart",
            "title": "Patient Comfort",
            "title_ar": "راحة المريض",
            "description": "Your comfort is our priority. We create a relaxing environment for all our patients.",
            "description_ar": "راحتك هي أولويتنا. نوفر بيئة مريحة لجميع مرضانا."
          }
        ]
      },
      "about": {
        "sectionLabel": "About Our Clinic",
        "sectionLabel_ar": "عن عيادتنا",
        "title": "Your Trusted Partner for Dental Excellence",
        "title_ar": "شريكك الموثوق للتميز في طب الأسنان",
        "description": "With over 20 years of experience, we have been providing exceptional dental care to our community. Our state-of-the-art facility combined with our compassionate approach ensures that every patient receives the best possible treatment.",
        "description_ar": "مع أكثر من 20 عامًا من الخبرة، نقدم رعاية أسنان استثنائية لمجتمعنا. مرافقنا الحديثة بالإضافة إلى نهجنا الحنون تضمن حصول كل مريض على أفضل علاج ممكن.",
        "image": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=700&fit=crop",
        "ctaText": "Learn More",
        "ctaText_ar": "اعرف المزيد",
        "ctaLink": "/who-we-are"
      },
      "stats": {
        "items": [
          {"number": "20+", "label": "Years Experience", "label_ar": "سنوات خبرة"},
          {"number": "15K+", "label": "Happy Patients", "label_ar": "مريض سعيد"},
          {"number": "6", "label": "Expert Doctors", "label_ar": "أطباء متخصصين"}
        ]
      },
      "services": {
        "sectionLabel": "Our Services",
        "sectionLabel_ar": "خدماتنا",
        "sectionTitle": "Comprehensive Dental Care",
        "sectionTitle_ar": "رعاية أسنان شاملة"
      },
      "cta": {
        "title": "Ready to Transform Your Smile?",
        "title_ar": "مستعد لتغيير ابتسامتك؟",
        "description": "Book your consultation today and take the first step towards a healthier, more beautiful smile.",
        "description_ar": "احجز استشارتك اليوم واتخذ الخطوة الأولى نحو ابتسامة أكثر صحة وجمالاً.",
        "buttonText": "Book Now",
        "buttonText_ar": "احجز الآن",
        "buttonLink": "/contact"
      }
    }'::jsonb
  );

  -- ==========================================
  -- SERVICES PAGE
  -- ==========================================
  INSERT INTO pages (
    tenant_id, slug, title_en, title_ar, is_homepage, show_in_nav, nav_order, nav_label_en, nav_label_ar,
    seo_title_en, seo_description_en, status, published_at,
    structure, content
  ) VALUES (
    p_tenant_id,
    '/services',
    'Services',
    'الخدمات',
    false,
    true,
    1,
    'Services',
    'الخدمات',
    'Our Dental Services',
    'Comprehensive dental services including general dentistry, cosmetic procedures, implants, and more.',
    'published',
    NOW(),
    '[
      {
        "id": "hero",
        "type": "PageHero",
        "editable": true,
        "fields": [
          {"id": "title", "type": "text", "label": "Title"},
          {"id": "subtitle", "type": "textarea", "label": "Subtitle"}
        ]
      },
      {
        "id": "servicesList",
        "type": "ServicesList",
        "editable": true,
        "fields": [
          {"id": "services", "type": "reference", "ref": "services_table", "label": "Services"}
        ]
      }
    ]'::jsonb,
    '{
      "hero": {
        "title": "Our Dental Services",
        "title_ar": "خدماتنا لطب الأسنان",
        "subtitle": "Comprehensive dental care for the whole family",
        "subtitle_ar": "رعاية أسنان شاملة للعائلة بأكملها"
      }
    }'::jsonb
  );

  -- ==========================================
  -- DENTAL TOURISM PAGE
  -- ==========================================
  INSERT INTO pages (
    tenant_id, slug, title_en, title_ar, is_homepage, show_in_nav, nav_order, nav_label_en, nav_label_ar,
    seo_title_en, seo_description_en, status, published_at,
    structure, content
  ) VALUES (
    p_tenant_id,
    '/dental-tourism',
    'Dental Tourism',
    'سياحة الأسنان',
    false,
    true,
    2,
    'Dental Tourism',
    'سياحة الأسنان',
    'Dental Tourism Packages',
    'Affordable dental care combined with a wonderful travel experience in Egypt.',
    'published',
    NOW(),
    '[
      {
        "id": "hero",
        "type": "PageHero",
        "editable": true,
        "fields": [
          {"id": "title", "type": "text", "label": "Title"},
          {"id": "subtitle", "type": "textarea", "label": "Subtitle"},
          {"id": "backgroundImage", "type": "image", "label": "Background"}
        ]
      },
      {
        "id": "whyChoose",
        "type": "FeaturesGrid",
        "columns": 3,
        "editable": true,
        "fields": [
          {"id": "sectionTitle", "type": "text", "label": "Section Title"},
          {"id": "items", "type": "array", "label": "Features"}
        ]
      },
      {
        "id": "packages",
        "type": "PackagesSection",
        "editable": true,
        "fields": [
          {"id": "sectionTitle", "type": "text", "label": "Section Title"},
          {"id": "packages", "type": "reference", "ref": "tourism_packages_table"}
        ]
      },
      {
        "id": "process",
        "type": "ProcessSteps",
        "editable": true,
        "fields": [
          {"id": "sectionTitle", "type": "text", "label": "Section Title"},
          {"id": "steps", "type": "array", "label": "Steps"}
        ]
      }
    ]'::jsonb,
    '{
      "hero": {
        "title": "Dental Tourism",
        "title_ar": "سياحة الأسنان",
        "subtitle": "World-class dental care at affordable prices, combined with an unforgettable travel experience.",
        "subtitle_ar": "رعاية أسنان عالمية بأسعار معقولة، مع تجربة سفر لا تُنسى.",
        "backgroundImage": null
      },
      "whyChoose": {
        "sectionTitle": "Why Choose Egypt for Dental Tourism?",
        "sectionTitle_ar": "لماذا تختار مصر لسياحة الأسنان؟",
        "items": [
          {
            "icon": "dollar",
            "title": "Save Up to 70%",
            "title_ar": "وفر حتى 70%",
            "description": "Get the same quality treatments at a fraction of the cost compared to UK, US, or European prices.",
            "description_ar": "احصل على نفس جودة العلاج بجزء بسيط من التكلفة مقارنة بأسعار المملكة المتحدة أو الولايات المتحدة أو أوروبا."
          },
          {
            "icon": "award",
            "title": "International Standards",
            "title_ar": "معايير دولية",
            "description": "Our clinic follows strict international protocols and uses premium quality materials.",
            "description_ar": "عيادتنا تتبع بروتوكولات دولية صارمة وتستخدم مواد عالية الجودة."
          },
          {
            "icon": "plane",
            "title": "All-Inclusive Packages",
            "title_ar": "باقات شاملة",
            "description": "We handle everything from airport pickup to accommodation and sightseeing tours.",
            "description_ar": "نتولى كل شيء من الاستقبال في المطار إلى الإقامة وجولات مشاهدة المعالم."
          }
        ]
      },
      "process": {
        "sectionTitle": "How It Works",
        "sectionTitle_ar": "كيف تعمل",
        "steps": [
          {"number": "1", "title": "Free Consultation", "title_ar": "استشارة مجانية", "description": "Send us your dental x-rays and photos for a free treatment plan.", "description_ar": "أرسل لنا صور أشعة أسنانك للحصول على خطة علاج مجانية."},
          {"number": "2", "title": "Book Your Trip", "title_ar": "احجز رحلتك", "description": "Choose your package and we will arrange your travel details.", "description_ar": "اختر باقتك وسنرتب تفاصيل سفرك."},
          {"number": "3", "title": "Treatment & Tourism", "title_ar": "العلاج والسياحة", "description": "Receive your dental treatment while enjoying Egypt.", "description_ar": "احصل على علاج أسنانك أثناء الاستمتاع بمصر."}
        ]
      }
    }'::jsonb
  );

  -- ==========================================
  -- PORTFOLIO PAGE
  -- ==========================================
  INSERT INTO pages (
    tenant_id, slug, title_en, title_ar, is_homepage, show_in_nav, nav_order, nav_label_en, nav_label_ar,
    seo_title_en, seo_description_en, status, published_at,
    structure, content
  ) VALUES (
    p_tenant_id,
    '/portfolio',
    'Portfolio',
    'المعرض',
    false,
    true,
    3,
    'Portfolio',
    'المعرض',
    'Our Work - Before & After',
    'See the amazing transformations achieved by our dental team.',
    'published',
    NOW(),
    '[
      {
        "id": "hero",
        "type": "PageHero",
        "editable": true,
        "fields": [
          {"id": "title", "type": "text", "label": "Title"},
          {"id": "subtitle", "type": "textarea", "label": "Subtitle"}
        ]
      },
      {
        "id": "gallery",
        "type": "BeforeAfterGallery",
        "editable": true,
        "fields": [
          {"id": "cases", "type": "reference", "ref": "portfolio_cases_table"}
        ]
      }
    ]'::jsonb,
    '{
      "hero": {
        "title": "Our Portfolio",
        "title_ar": "معرض أعمالنا",
        "subtitle": "See the amazing smile transformations achieved by our expert dental team.",
        "subtitle_ar": "شاهد تحولات الابتسامة المذهلة التي حققها فريقنا المتخصص."
      }
    }'::jsonb
  );

  -- ==========================================
  -- WHO WE ARE PAGE
  -- ==========================================
  INSERT INTO pages (
    tenant_id, slug, title_en, title_ar, is_homepage, show_in_nav, nav_order, nav_label_en, nav_label_ar,
    seo_title_en, seo_description_en, status, published_at,
    structure, content
  ) VALUES (
    p_tenant_id,
    '/who-we-are',
    'Who We Are',
    'من نحن',
    false,
    true,
    4,
    'Who We Are',
    'من نحن',
    'About Us - Our Story',
    'Learn about our clinic history, mission, and meet our team of experts.',
    'published',
    NOW(),
    '[
      {
        "id": "hero",
        "type": "PageHero",
        "editable": true,
        "fields": [
          {"id": "title", "type": "text", "label": "Title"},
          {"id": "subtitle", "type": "textarea", "label": "Subtitle"}
        ]
      },
      {
        "id": "story",
        "type": "ContentSection",
        "editable": true,
        "fields": [
          {"id": "sectionTitle", "type": "text", "label": "Section Title"},
          {"id": "content", "type": "richtext", "label": "Content"},
          {"id": "image", "type": "image", "label": "Image"}
        ]
      },
      {
        "id": "mission",
        "type": "MissionVision",
        "editable": true,
        "fields": [
          {"id": "missionTitle", "type": "text", "label": "Mission Title"},
          {"id": "missionText", "type": "textarea", "label": "Mission Text"},
          {"id": "visionTitle", "type": "text", "label": "Vision Title"},
          {"id": "visionText", "type": "textarea", "label": "Vision Text"}
        ]
      },
      {
        "id": "team",
        "type": "TeamSection",
        "editable": true,
        "fields": [
          {"id": "sectionTitle", "type": "text", "label": "Section Title"},
          {"id": "members", "type": "reference", "ref": "team_members_table"}
        ]
      }
    ]'::jsonb,
    '{
      "hero": {
        "title": "Who We Are",
        "title_ar": "من نحن",
        "subtitle": "Dedicated to providing exceptional dental care since 2004",
        "subtitle_ar": "ملتزمون بتقديم رعاية أسنان استثنائية منذ 2004"
      },
      "story": {
        "sectionTitle": "Our Story",
        "sectionTitle_ar": "قصتنا",
        "content": "Founded in 2004, our clinic has grown from a small practice to one of the most respected dental centers in the region. Our commitment to excellence, combined with our passion for patient care, has earned us the trust of thousands of families.",
        "content_ar": "تأسست عيادتنا في عام 2004، ونمت من ممارسة صغيرة إلى واحدة من أكثر مراكز طب الأسنان احترامًا في المنطقة. التزامنا بالتميز، جنبًا إلى جنب مع شغفنا برعاية المرضى، أكسبنا ثقة آلاف العائلات.",
        "image": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=400&fit=crop"
      },
      "mission": {
        "missionTitle": "Our Mission",
        "missionTitle_ar": "مهمتنا",
        "missionText": "To provide the highest quality dental care in a comfortable, caring environment while utilizing the latest technology and techniques.",
        "missionText_ar": "تقديم أعلى جودة رعاية للأسنان في بيئة مريحة وحانية مع استخدام أحدث التقنيات والأساليب.",
        "visionTitle": "Our Vision",
        "visionTitle_ar": "رؤيتنا",
        "visionText": "To be the leading dental care provider, known for excellence, innovation, and patient-centered care.",
        "visionText_ar": "أن نكون مزود رعاية الأسنان الرائد، المعروف بالتميز والابتكار والرعاية المرتكزة على المريض."
      },
      "team": {
        "sectionTitle": "Meet Our Team",
        "sectionTitle_ar": "تعرف على فريقنا"
      }
    }'::jsonb
  );

  -- ==========================================
  -- TESTIMONIALS PAGE
  -- ==========================================
  INSERT INTO pages (
    tenant_id, slug, title_en, title_ar, is_homepage, show_in_nav, nav_order, nav_label_en, nav_label_ar,
    seo_title_en, seo_description_en, status, published_at,
    structure, content
  ) VALUES (
    p_tenant_id,
    '/testimonials',
    'Testimonials',
    'آراء العملاء',
    false,
    true,
    5,
    'Testimonials',
    'آراء العملاء',
    'Patient Testimonials',
    'Read what our patients say about their experience with us.',
    'published',
    NOW(),
    '[
      {
        "id": "hero",
        "type": "PageHero",
        "editable": true,
        "fields": [
          {"id": "title", "type": "text", "label": "Title"},
          {"id": "subtitle", "type": "textarea", "label": "Subtitle"}
        ]
      },
      {
        "id": "testimonials",
        "type": "TestimonialsGrid",
        "editable": true,
        "fields": [
          {"id": "testimonials", "type": "reference", "ref": "testimonials_table"}
        ]
      }
    ]'::jsonb,
    '{
      "hero": {
        "title": "Patient Testimonials",
        "title_ar": "آراء المرضى",
        "subtitle": "Hear what our patients have to say about their experience",
        "subtitle_ar": "اسمع ما يقوله مرضانا عن تجربتهم"
      }
    }'::jsonb
  );

  -- ==========================================
  -- CONTACT PAGE
  -- ==========================================
  INSERT INTO pages (
    tenant_id, slug, title_en, title_ar, is_homepage, show_in_nav, nav_order, nav_label_en, nav_label_ar,
    seo_title_en, seo_description_en, status, published_at,
    structure, content
  ) VALUES (
    p_tenant_id,
    '/contact',
    'Contact',
    'اتصل بنا',
    false,
    true,
    6,
    'Contact',
    'اتصل بنا',
    'Contact Us',
    'Get in touch with our team. We are here to help with all your dental needs.',
    'published',
    NOW(),
    '[
      {
        "id": "hero",
        "type": "PageHero",
        "editable": true,
        "fields": [
          {"id": "title", "type": "text", "label": "Title"},
          {"id": "subtitle", "type": "textarea", "label": "Subtitle"}
        ]
      },
      {
        "id": "contactInfo",
        "type": "ContactInfo",
        "editable": true,
        "fields": [
          {"id": "address", "type": "textarea", "label": "Address"},
          {"id": "phone", "type": "text", "label": "Phone"},
          {"id": "email", "type": "text", "label": "Email"},
          {"id": "workingHours", "type": "textarea", "label": "Working Hours"}
        ]
      },
      {
        "id": "contactForm",
        "type": "ContactForm",
        "editable": false,
        "fields": []
      },
      {
        "id": "map",
        "type": "MapEmbed",
        "editable": true,
        "fields": [
          {"id": "lat", "type": "number", "label": "Latitude"},
          {"id": "lng", "type": "number", "label": "Longitude"},
          {"id": "zoom", "type": "number", "label": "Zoom Level"}
        ]
      }
    ]'::jsonb,
    '{
      "hero": {
        "title": "Contact Us",
        "title_ar": "اتصل بنا",
        "subtitle": "We would love to hear from you. Get in touch with us today.",
        "subtitle_ar": "نود أن نسمع منك. تواصل معنا اليوم."
      },
      "contactInfo": {
        "address": "123 Dental Street, Cairo, Egypt",
        "address_ar": "123 شارع الأسنان، القاهرة، مصر",
        "phone": "+20 123 456 7890",
        "email": "info@clinic.com",
        "workingHours": "Sunday - Thursday: 9:00 AM - 8:00 PM\nFriday: 9:00 AM - 2:00 PM\nSaturday: Closed",
        "workingHours_ar": "الأحد - الخميس: 9:00 صباحًا - 8:00 مساءً\nالجمعة: 9:00 صباحًا - 2:00 مساءً\nالسبت: مغلق"
      },
      "map": {
        "lat": 30.0444,
        "lng": 31.2357,
        "zoom": 15
      }
    }'::jsonb
  );

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED PAGES FOR ALL EXISTING TENANTS
-- =====================================================
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants WHERE status = 'active'
  LOOP
    PERFORM seed_tenant_pages(tenant_record.id);
    RAISE NOTICE 'Seeded pages for tenant: %', tenant_record.id;
  END LOOP;
END;
$$;

-- =====================================================
-- TRIGGER: Auto-seed pages when new tenant is created
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_seed_pages_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM seed_tenant_pages(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_seed_pages_on_tenant_create ON tenants;
CREATE TRIGGER auto_seed_pages_on_tenant_create
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_pages_for_new_tenant();

-- =====================================================
-- ENABLE REALTIME FOR PAGES TABLE
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'pages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pages;
  END IF;
END;
$$;

COMMENT ON FUNCTION seed_tenant_pages(UUID) IS 'Seeds default website pages for a new tenant including home, services, dental tourism, portfolio, who we are, testimonials, and contact pages.';
