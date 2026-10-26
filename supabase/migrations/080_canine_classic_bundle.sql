-- Migration 080: Add Canine Dental Clinic default pages as a reusable bundle template
-- This converts the existing 7 Canine Clinic live pages into a template bundle
-- that any tenant can apply as a complete website.

-- ============================================================
-- CANINE CLASSIC BUNDLE (7 pages)
-- Based on the Canine Dental Clinic's actual live configuration
-- Pages: Home, Services, Dental Tourism, Portfolio, Who We Are,
--        Testimonials, Contact
-- ============================================================

-- 1) Home Page
INSERT INTO page_templates (
  name, slug, description, category, thumbnail_url,
  sections, default_settings, is_premium, is_active,
  bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url
) VALUES (
  'Canine Classic - Home',
  'canine-classic-home',
  'Full-featured dental clinic home page with hero, features, about, stats, services grid, and CTA',
  'landing',
  '/templates/canine-classic-home.png',
  '[
    {
      "template_slug": "hero-centered",
      "locked": true,
      "content_override": {
        "title_en": "Committed to your dental well-being.",
        "title_ar": "ملتزمون بصحة أسنانك.",
        "subtitle_en": "Experience exceptional dental care with our team of skilled professionals using the latest technology.",
        "subtitle_ar": "استمتع برعاية أسنان استثنائية مع فريقنا من المتخصصين المهرة باستخدام أحدث التقنيات.",
        "cta_text_en": "Book Consultation",
        "cta_text_ar": "احجز استشارة",
        "cta_link": "/contact"
      }
    },
    {
      "template_slug": "features-grid",
      "locked": true,
      "content_override": {
        "title_en": "Why Choose Us",
        "title_ar": "لماذا تختارنا",
        "items": [
          {
            "icon": "users",
            "title_en": "Expert Team",
            "title_ar": "فريق متخصص",
            "description_en": "Our team of experienced dental professionals is dedicated to providing the highest quality care.",
            "description_ar": "فريقنا من محترفي طب الأسنان ذوي الخبرة ملتزم بتقديم أعلى جودة رعاية."
          },
          {
            "icon": "monitor",
            "title_en": "Modern Technology",
            "title_ar": "تقنية حديثة",
            "description_en": "We use the latest dental technology to ensure accurate diagnoses and effective treatments.",
            "description_ar": "نستخدم أحدث تقنيات طب الأسنان لضمان تشخيصات دقيقة وعلاجات فعالة."
          },
          {
            "icon": "heart",
            "title_en": "Patient Comfort",
            "title_ar": "راحة المريض",
            "description_en": "Your comfort is our priority. We create a relaxing environment for all our patients.",
            "description_ar": "راحتك هي أولويتنا. نخلق بيئة مريحة لجميع مرضانا."
          }
        ]
      }
    },
    {
      "template_slug": "about-split",
      "locked": true,
      "content_override": {
        "title_en": "Your Trusted Partner for Dental Excellence",
        "title_ar": "شريكك الموثوق للتميز في طب الأسنان",
        "label_en": "About Our Clinic",
        "label_ar": "عن عيادتنا",
        "body_en": "With over 20 years of experience, we have been providing exceptional dental care to our community. Our state-of-the-art facility combined with our compassionate approach ensures that every patient receives the best possible treatment.",
        "body_ar": "مع أكثر من 20 عامًا من الخبرة، نقدم رعاية أسنان استثنائية لمجتمعنا. مرافقنا الحديثة بالإضافة إلى نهجنا الحنون تضمن حصول كل مريض على أفضل علاج ممكن.",
        "cta_text_en": "Learn More",
        "cta_text_ar": "اعرف المزيد",
        "cta_link": "/who-we-are",
        "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=700&fit=crop"
      }
    },
    {
      "template_slug": "stats-counter",
      "locked": true,
      "content_override": {
        "stats": [
          { "value": "20+", "label_en": "Years Experience", "label_ar": "سنوات خبرة" },
          { "value": "15K+", "label_en": "Happy Patients", "label_ar": "مريض سعيد" },
          { "value": "6", "label_en": "Expert Doctors", "label_ar": "أطباء متخصصين" }
        ]
      }
    },
    {
      "template_slug": "services-grid-4",
      "locked": true,
      "content_override": {
        "label_en": "What We Offer",
        "label_ar": "ما نقدمه",
        "title_en": "Our Services",
        "title_ar": "خدماتنا"
      }
    },
    {
      "template_slug": "cta-simple",
      "locked": true,
      "content_override": {
        "title_en": "Ready to Transform Your Smile?",
        "title_ar": "مستعد لتغيير ابتسامتك؟",
        "body_en": "Book your consultation today and take the first step towards a healthier, more beautiful smile.",
        "body_ar": "احجز استشارتك اليوم واتخذ الخطوة الأولى نحو ابتسامة أكثر صحة وجمالاً.",
        "cta_text_en": "Book Now",
        "cta_text_ar": "احجز الآن",
        "cta_link": "/contact"
      }
    }
  ]'::jsonb,
  '{"theme": "classic", "animations": true}'::jsonb,
  false, true,
  'canine-classic',
  'Canine Classic',
  'The original Canine Dental Clinic design — a proven 7-page dental website with home, services, dental tourism, portfolio, about us, testimonials, and contact pages. Full bilingual EN/AR content.',
  1,
  '/templates/canine-classic-bundle.png'
);

-- 2) Services Page
INSERT INTO page_templates (
  name, slug, description, category, thumbnail_url,
  sections, default_settings, is_premium, is_active,
  bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url
) VALUES (
  'Canine Classic - Services',
  'canine-classic-services',
  'Services page with hero and services list grid',
  'service',
  '/templates/canine-classic-services.png',
  '[
    {
      "template_slug": "hero-centered",
      "locked": true,
      "content_override": {
        "title_en": "Our Dental Services",
        "title_ar": "خدماتنا لطب الأسنان",
        "subtitle_en": "Comprehensive dental care for the whole family",
        "subtitle_ar": "رعاية أسنان شاملة للعائلة بأكملها"
      }
    },
    {
      "template_slug": "services-grid-3",
      "locked": true,
      "content_override": {
        "title_en": "All Services",
        "title_ar": "جميع الخدمات",
        "subtitle_en": "Browse our complete range of dental treatments",
        "subtitle_ar": "تصفح مجموعتنا الكاملة من علاجات الأسنان"
      }
    }
  ]'::jsonb,
  '{"theme": "classic"}'::jsonb,
  false, true,
  'canine-classic',
  'Canine Classic',
  'The original Canine Dental Clinic design — a proven 7-page dental website with home, services, dental tourism, portfolio, about us, testimonials, and contact pages. Full bilingual EN/AR content.',
  2,
  '/templates/canine-classic-bundle.png'
);

-- 3) Dental Tourism Page
INSERT INTO page_templates (
  name, slug, description, category, thumbnail_url,
  sections, default_settings, is_premium, is_active,
  bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url
) VALUES (
  'Canine Classic - Dental Tourism',
  'canine-classic-dental-tourism',
  'Dental tourism page with hero, benefits grid, pricing packages, and step-by-step process',
  'landing',
  '/templates/canine-classic-tourism.png',
  '[
    {
      "template_slug": "hero-centered",
      "locked": true,
      "content_override": {
        "title_en": "Dental Tourism",
        "title_ar": "سياحة الأسنان",
        "subtitle_en": "World-class dental care at affordable prices, combined with an unforgettable travel experience.",
        "subtitle_ar": "رعاية أسنان عالمية بأسعار معقولة، مع تجربة سفر لا تُنسى."
      }
    },
    {
      "template_slug": "features-grid",
      "locked": true,
      "content_override": {
        "title_en": "Why Choose Egypt for Dental Tourism?",
        "title_ar": "لماذا تختار مصر لسياحة الأسنان؟",
        "items": [
          {
            "icon": "dollar",
            "title_en": "Save Up to 70%",
            "title_ar": "وفر حتى 70%",
            "description_en": "Get the same quality treatments at a fraction of the cost compared to UK, US, or European prices.",
            "description_ar": "احصل على نفس جودة العلاج بجزء بسيط من التكلفة مقارنة بأسعار المملكة المتحدة أو الولايات المتحدة أو أوروبا."
          },
          {
            "icon": "award",
            "title_en": "International Standards",
            "title_ar": "معايير دولية",
            "description_en": "Our clinic follows strict international protocols and uses premium quality materials.",
            "description_ar": "عيادتنا تتبع بروتوكولات دولية صارمة وتستخدم مواد عالية الجودة."
          },
          {
            "icon": "plane",
            "title_en": "All-Inclusive Packages",
            "title_ar": "باقات شاملة",
            "description_en": "We handle everything from airport pickup to accommodation and sightseeing tours.",
            "description_ar": "نتولى كل شيء من الاستقبال في المطار إلى الإقامة وجولات مشاهدة المعالم."
          }
        ]
      }
    },
    {
      "template_slug": "pricing-table",
      "locked": true,
      "content_override": {
        "title_en": "Tourism Packages",
        "title_ar": "باقات السياحة",
        "subtitle_en": "Choose your dental tourism package",
        "subtitle_ar": "اختر باقة سياحة الأسنان الخاصة بك"
      }
    },
    {
      "template_slug": "features-grid",
      "locked": false,
      "content_override": {
        "title_en": "How It Works",
        "title_ar": "كيف تعمل",
        "items": [
          {
            "icon": "message-circle",
            "title_en": "1. Free Consultation",
            "title_ar": "1. استشارة مجانية",
            "description_en": "Send us your dental x-rays and photos for a free treatment plan.",
            "description_ar": "أرسل لنا صور أشعة أسنانك للحصول على خطة علاج مجانية."
          },
          {
            "icon": "calendar",
            "title_en": "2. Book Your Trip",
            "title_ar": "2. احجز رحلتك",
            "description_en": "Choose your package and we will arrange your travel details.",
            "description_ar": "اختر باقتك وسنرتب تفاصيل سفرك."
          },
          {
            "icon": "smile",
            "title_en": "3. Treatment & Tourism",
            "title_ar": "3. العلاج والسياحة",
            "description_en": "Receive your dental treatment while enjoying Egypt.",
            "description_ar": "احصل على علاج أسنانك أثناء الاستمتاع بمصر."
          }
        ]
      }
    }
  ]'::jsonb,
  '{"theme": "classic"}'::jsonb,
  false, true,
  'canine-classic',
  'Canine Classic',
  'The original Canine Dental Clinic design — a proven 7-page dental website with home, services, dental tourism, portfolio, about us, testimonials, and contact pages. Full bilingual EN/AR content.',
  3,
  '/templates/canine-classic-bundle.png'
);

-- 4) Portfolio Page
INSERT INTO page_templates (
  name, slug, description, category, thumbnail_url,
  sections, default_settings, is_premium, is_active,
  bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url
) VALUES (
  'Canine Classic - Portfolio',
  'canine-classic-portfolio',
  'Portfolio page with hero and before/after gallery masonry',
  'landing',
  '/templates/canine-classic-portfolio.png',
  '[
    {
      "template_slug": "hero-centered",
      "locked": true,
      "content_override": {
        "title_en": "Our Portfolio",
        "title_ar": "معرض أعمالنا",
        "subtitle_en": "See the amazing smile transformations achieved by our expert dental team.",
        "subtitle_ar": "شاهد تحولات الابتسامة المذهلة التي حققها فريقنا المتخصص."
      }
    },
    {
      "template_slug": "gallery-masonry",
      "locked": true,
      "content_override": {
        "title_en": "Before & After Gallery",
        "title_ar": "معرض قبل وبعد",
        "subtitle_en": "Real results from our patients",
        "subtitle_ar": "نتائج حقيقية من مرضانا"
      }
    }
  ]'::jsonb,
  '{"theme": "classic"}'::jsonb,
  false, true,
  'canine-classic',
  'Canine Classic',
  'The original Canine Dental Clinic design — a proven 7-page dental website with home, services, dental tourism, portfolio, about us, testimonials, and contact pages. Full bilingual EN/AR content.',
  4,
  '/templates/canine-classic-bundle.png'
);

-- 5) Who We Are (About) Page
INSERT INTO page_templates (
  name, slug, description, category, thumbnail_url,
  sections, default_settings, is_premium, is_active,
  bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url
) VALUES (
  'Canine Classic - Who We Are',
  'canine-classic-who-we-are',
  'About page with hero, story section, mission/vision, and team grid',
  'about',
  '/templates/canine-classic-about.png',
  '[
    {
      "template_slug": "hero-centered",
      "locked": true,
      "content_override": {
        "title_en": "Who We Are",
        "title_ar": "من نحن",
        "subtitle_en": "Dedicated to providing exceptional dental care since 2004",
        "subtitle_ar": "ملتزمون بتقديم رعاية أسنان استثنائية منذ 2004"
      }
    },
    {
      "template_slug": "text-rich",
      "locked": true,
      "content_override": {
        "title_en": "Our Story",
        "title_ar": "قصتنا",
        "body_en": "Founded in 2004, our clinic has grown from a small practice to one of the most respected dental centers in the region. Our commitment to excellence, combined with our passion for patient care, has earned us the trust of thousands of families.",
        "body_ar": "تأسست عيادتنا في عام 2004، ونمت من ممارسة صغيرة إلى واحدة من أكثر مراكز طب الأسنان احترامًا في المنطقة. التزامنا بالتميز، جنبًا إلى جنب مع شغفنا برعاية المرضى، أكسبنا ثقة آلاف العائلات.",
        "image_url": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=400&fit=crop"
      }
    },
    {
      "template_slug": "about-split",
      "locked": true,
      "content_override": {
        "title_en": "Our Mission",
        "title_ar": "مهمتنا",
        "body_en": "To provide the highest quality dental care in a comfortable, caring environment while utilizing the latest technology and techniques.",
        "body_ar": "تقديم أعلى جودة رعاية للأسنان في بيئة مريحة وحانية مع استخدام أحدث التقنيات والأساليب.",
        "label_en": "Our Vision",
        "label_ar": "رؤيتنا",
        "subtitle_en": "To be the leading dental care provider, known for excellence, innovation, and patient-centered care.",
        "subtitle_ar": "أن نكون مزود رعاية الأسنان الرائد، المعروف بالتميز والابتكار والرعاية المرتكزة على المريض."
      }
    },
    {
      "template_slug": "team-grid",
      "locked": true,
      "content_override": {
        "title_en": "Meet Our Team",
        "title_ar": "تعرف على فريقنا",
        "subtitle_en": "Skilled professionals dedicated to your dental health",
        "subtitle_ar": "متخصصون مهرة ملتزمون بصحة أسنانك"
      }
    }
  ]'::jsonb,
  '{"theme": "classic"}'::jsonb,
  false, true,
  'canine-classic',
  'Canine Classic',
  'The original Canine Dental Clinic design — a proven 7-page dental website with home, services, dental tourism, portfolio, about us, testimonials, and contact pages. Full bilingual EN/AR content.',
  5,
  '/templates/canine-classic-bundle.png'
);

-- 6) Testimonials Page
INSERT INTO page_templates (
  name, slug, description, category, thumbnail_url,
  sections, default_settings, is_premium, is_active,
  bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url
) VALUES (
  'Canine Classic - Testimonials',
  'canine-classic-testimonials',
  'Testimonials page with hero and testimonials grid',
  'landing',
  '/templates/canine-classic-testimonials.png',
  '[
    {
      "template_slug": "hero-centered",
      "locked": true,
      "content_override": {
        "title_en": "Patient Testimonials",
        "title_ar": "آراء المرضى",
        "subtitle_en": "Hear what our patients have to say about their experience",
        "subtitle_ar": "اسمع ما يقوله مرضانا عن تجربتهم"
      }
    },
    {
      "template_slug": "testimonials-grid",
      "locked": true,
      "content_override": {
        "title_en": "What Our Patients Say",
        "title_ar": "ماذا يقول مرضانا",
        "subtitle_en": "Real stories from real patients",
        "subtitle_ar": "قصص حقيقية من مرضى حقيقيين"
      }
    }
  ]'::jsonb,
  '{"theme": "classic"}'::jsonb,
  false, true,
  'canine-classic',
  'Canine Classic',
  'The original Canine Dental Clinic design — a proven 7-page dental website with home, services, dental tourism, portfolio, about us, testimonials, and contact pages. Full bilingual EN/AR content.',
  6,
  '/templates/canine-classic-bundle.png'
);

-- 7) Contact Page
INSERT INTO page_templates (
  name, slug, description, category, thumbnail_url,
  sections, default_settings, is_premium, is_active,
  bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url
) VALUES (
  'Canine Classic - Contact',
  'canine-classic-contact',
  'Contact page with hero, contact info split, contact form, and embedded map',
  'contact',
  '/templates/canine-classic-contact.png',
  '[
    {
      "template_slug": "hero-centered",
      "locked": true,
      "content_override": {
        "title_en": "Contact Us",
        "title_ar": "اتصل بنا",
        "subtitle_en": "We would love to hear from you. Get in touch with us today.",
        "subtitle_ar": "نود أن نسمع منك. تواصل معنا اليوم."
      }
    },
    {
      "template_slug": "contact-split",
      "locked": true,
      "content_override": {
        "title_en": "Get In Touch",
        "title_ar": "تواصل معنا",
        "email": "info@clinic.com",
        "phone": "+20 123 456 7890",
        "address_en": "123 Dental Street, Cairo, Egypt",
        "address_ar": "123 شارع الأسنان، القاهرة، مصر",
        "hours_en": "Sunday - Thursday: 9:00 AM - 8:00 PM\nFriday: 9:00 AM - 2:00 PM\nSaturday: Closed",
        "hours_ar": "الأحد - الخميس: 9:00 صباحًا - 8:00 مساءً\nالجمعة: 9:00 صباحًا - 2:00 مساءً\nالسبت: مغلق"
      }
    },
    {
      "template_slug": "booking-widget",
      "locked": false,
      "content_override": {
        "title_en": "Send Us a Message",
        "title_ar": "أرسل لنا رسالة",
        "subtitle_en": "Fill out the form and we will get back to you shortly",
        "subtitle_ar": "املأ النموذج وسنتواصل معك قريبًا"
      }
    },
    {
      "template_slug": "map-full",
      "locked": true,
      "content_override": {
        "title_en": "Find Us",
        "title_ar": "جدنا",
        "lat": 30.0444,
        "lng": 31.2357,
        "zoom": 15
      }
    }
  ]'::jsonb,
  '{"theme": "classic"}'::jsonb,
  false, true,
  'canine-classic',
  'Canine Classic',
  'The original Canine Dental Clinic design — a proven 7-page dental website with home, services, dental tourism, portfolio, about us, testimonials, and contact pages. Full bilingual EN/AR content.',
  7,
  '/templates/canine-classic-bundle.png'
);
