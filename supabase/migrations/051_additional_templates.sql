-- =====================================================
-- MIGRATION 051: Additional Section & Page Templates
-- =====================================================
-- This migration adds more section and page templates
-- to complete the template library for Phase 5.8
-- =====================================================

-- ===========================================
-- 1. ADDITIONAL SECTION TEMPLATES
-- ===========================================

INSERT INTO section_templates (slug, name, description, category, structure, default_content, editable_fields, is_active) VALUES

-- Hero - Left Aligned with Image
('hero-left-image', 'Hero - Left Aligned', 'Hero with left-aligned text and right image', 'hero', 
'{
  "type": "hero",
  "variant": "left-image",
  "settings": {
    "fullWidth": true,
    "minHeight": "70vh",
    "layout": "split",
    "imagePosition": "right"
  }
}',
'{
  "title_en": "Expert Dental Care You Can Trust",
  "title_ar": "رعاية أسنان متخصصة يمكنك الوثوق بها",
  "subtitle_en": "Experience personalized treatment with our team of specialists",
  "subtitle_ar": "تجربة علاج شخصي مع فريقنا من المتخصصين",
  "description_en": "We combine cutting-edge technology with compassionate care to give you the smile you deserve.",
  "description_ar": "نجمع بين التكنولوجيا المتطورة والرعاية الحانية لنمنحك الابتسامة التي تستحقها.",
  "buttonText_en": "Schedule Visit",
  "buttonText_ar": "حدد موعد الزيارة",
  "buttonLink": "/book",
  "secondaryButtonText_en": "Learn More",
  "secondaryButtonText_ar": "اعرف المزيد",
  "secondaryButtonLink": "/about",
  "image": null
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar", "description_en", "description_ar", "buttonText_en", "buttonText_ar", "secondaryButtonText_en", "secondaryButtonText_ar", "image"]',
true),

-- Hero - Slider
('hero-slider', 'Hero - Slider', 'Multi-slide hero with auto-rotation', 'hero', 
'{
  "type": "hero",
  "variant": "slider",
  "settings": {
    "fullWidth": true,
    "minHeight": "80vh",
    "autoPlay": true,
    "autoPlayInterval": 5000,
    "showDots": true,
    "showArrows": true,
    "transition": "fade"
  }
}',
'{
  "slides": [
    {
      "title_en": "Welcome to Our Clinic",
      "title_ar": "مرحباً بكم في عيادتنا",
      "subtitle_en": "Your smile is our priority",
      "subtitle_ar": "ابتسامتك أولويتنا",
      "buttonText_en": "Book Now",
      "buttonText_ar": "احجز الآن",
      "buttonLink": "/book",
      "backgroundImage": null
    },
    {
      "title_en": "Advanced Dental Technology",
      "title_ar": "تكنولوجيا طب الأسنان المتقدمة",
      "subtitle_en": "State-of-the-art equipment for precise treatment",
      "subtitle_ar": "معدات متطورة للعلاج الدقيق",
      "buttonText_en": "Our Services",
      "buttonText_ar": "خدماتنا",
      "buttonLink": "/services",
      "backgroundImage": null
    },
    {
      "title_en": "Expert Team of Dentists",
      "title_ar": "فريق متخصص من أطباء الأسنان",
      "subtitle_en": "Experienced professionals dedicated to your care",
      "subtitle_ar": "متخصصون ذوو خبرة مكرسون لرعايتك",
      "buttonText_en": "Meet Our Team",
      "buttonText_ar": "تعرف على فريقنا",
      "buttonLink": "/about",
      "backgroundImage": null
    }
  ]
}',
'["slides"]',
true),

-- Services - 4 Column with Icons
('services-grid-4', 'Services - 4 Column Icons', 'Display services in 4-column grid with icons', 'services',
'{
  "type": "services",
  "variant": "grid-icons",
  "settings": {
    "columns": 4,
    "showDescription": true,
    "showPrice": false,
    "showIcon": true,
    "iconStyle": "circle",
    "dataSource": "services"
  }
}',
'{
  "title_en": "What We Offer",
  "title_ar": "ما نقدمه",
  "subtitle_en": "Comprehensive dental solutions for every need",
  "subtitle_ar": "حلول شاملة لطب الأسنان لكل احتياج",
  "showAllLink": true,
  "showAllText_en": "View All Services",
  "showAllText_ar": "عرض جميع الخدمات"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar", "showAllText_en", "showAllText_ar"]',
true),

-- Testimonials - Slider
('testimonials-slider', 'Testimonials - Slider', 'Testimonials carousel with auto-rotation', 'testimonials',
'{
  "type": "testimonials",
  "variant": "slider",
  "settings": {
    "autoPlay": true,
    "autoPlayInterval": 6000,
    "showDots": true,
    "showArrows": true,
    "showRating": true,
    "showPhoto": true,
    "dataSource": "testimonials"
  }
}',
'{
  "title_en": "What Our Patients Say",
  "title_ar": "ماذا يقول مرضانا",
  "subtitle_en": "Real stories from real patients",
  "subtitle_ar": "قصص حقيقية من مرضى حقيقيين"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar"]',
true),

-- Testimonials - Grid
('testimonials-grid', 'Testimonials - Grid', 'Testimonials in a 3-column grid layout', 'testimonials',
'{
  "type": "testimonials",
  "variant": "grid",
  "settings": {
    "columns": 3,
    "showRating": true,
    "showPhoto": true,
    "maxItems": 6,
    "dataSource": "testimonials"
  }
}',
'{
  "title_en": "Patient Reviews",
  "title_ar": "آراء المرضى",
  "subtitle_en": "See what our patients have to say",
  "subtitle_ar": "شاهد ما يقوله مرضانا"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar"]',
true),

-- FAQ - Accordion
('faq-accordion', 'FAQ - Accordion', 'Frequently asked questions with expandable answers', 'faq',
'{
  "type": "faq",
  "variant": "accordion",
  "settings": {
    "allowMultiple": false,
    "showCategories": true,
    "dataSource": "faqs"
  }
}',
'{
  "title_en": "Frequently Asked Questions",
  "title_ar": "الأسئلة الشائعة",
  "subtitle_en": "Find answers to common questions",
  "subtitle_ar": "اعثر على إجابات للأسئلة الشائعة"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar"]',
true),

-- FAQ - Two Column
('faq-two-column', 'FAQ - Two Column', 'FAQ displayed in two columns', 'faq',
'{
  "type": "faq",
  "variant": "two-column",
  "settings": {
    "showCategories": false,
    "dataSource": "faqs"
  }
}',
'{
  "title_en": "Common Questions",
  "title_ar": "أسئلة شائعة",
  "subtitle_en": "Everything you need to know",
  "subtitle_ar": "كل ما تحتاج معرفته"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar"]',
true),

-- Features - Icon Grid
('features-grid', 'Features - Icon Grid', 'Feature highlights with icons', 'features',
'{
  "type": "features",
  "variant": "icon-grid",
  "settings": {
    "columns": 4,
    "iconStyle": "rounded"
  }
}',
'{
  "title_en": "Why Choose Us",
  "title_ar": "لماذا تختارنا",
  "subtitle_en": "The advantages of our dental clinic",
  "subtitle_ar": "مميزات عيادتنا لطب الأسنان",
  "features": [
    {
      "icon": "shield-check",
      "title_en": "Experienced Doctors",
      "title_ar": "أطباء ذوو خبرة",
      "description_en": "Our team has over 20 years of combined experience",
      "description_ar": "فريقنا لديه أكثر من 20 عاماً من الخبرة المجمعة"
    },
    {
      "icon": "clock",
      "title_en": "Flexible Hours",
      "title_ar": "ساعات مرنة",
      "description_en": "Open evenings and weekends for your convenience",
      "description_ar": "مفتوح في المساء وعطلات نهاية الأسبوع لراحتك"
    },
    {
      "icon": "credit-card",
      "title_en": "Payment Plans",
      "title_ar": "خطط الدفع",
      "description_en": "Flexible financing options available",
      "description_ar": "خيارات تمويل مرنة متاحة"
    },
    {
      "icon": "star",
      "title_en": "5-Star Service",
      "title_ar": "خدمة 5 نجوم",
      "description_en": "Consistently rated excellent by our patients",
      "description_ar": "تصنيف ممتاز باستمرار من قبل مرضانا"
    }
  ]
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar", "features"]',
true),

-- Stats - Counter
('stats-counter', 'Stats - Counter', 'Animated statistics counters', 'stats',
'{
  "type": "stats",
  "variant": "counter",
  "settings": {
    "columns": 4,
    "animated": true,
    "animationDuration": 2000
  }
}',
'{
  "title_en": "Our Numbers Speak",
  "title_ar": "أرقامنا تتحدث",
  "subtitle_en": "",
  "subtitle_ar": "",
  "stats": [
    {
      "value": 15000,
      "suffix": "+",
      "label_en": "Happy Patients",
      "label_ar": "مريض سعيد"
    },
    {
      "value": 25,
      "suffix": "+",
      "label_en": "Years Experience",
      "label_ar": "سنة خبرة"
    },
    {
      "value": 50,
      "suffix": "+",
      "label_en": "Dental Procedures",
      "label_ar": "إجراء طبي"
    },
    {
      "value": 99,
      "suffix": "%",
      "label_en": "Satisfaction Rate",
      "label_ar": "نسبة الرضا"
    }
  ]
}',
'["title_en", "title_ar", "stats"]',
true),

-- Gallery - Masonry
('gallery-masonry', 'Gallery - Masonry', 'Photo gallery with masonry layout', 'gallery',
'{
  "type": "gallery",
  "variant": "masonry",
  "settings": {
    "columns": 4,
    "gap": 16,
    "lightbox": true
  }
}',
'{
  "title_en": "Our Clinic",
  "title_ar": "عيادتنا",
  "subtitle_en": "Take a virtual tour of our facility",
  "subtitle_ar": "جولة افتراضية في منشأتنا",
  "images": []
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar", "images"]',
true),

-- Pricing - Table
('pricing-table', 'Pricing - Table', 'Service pricing comparison table', 'pricing',
'{
  "type": "pricing",
  "variant": "table",
  "settings": {
    "showFromPrice": true,
    "currency": "SAR"
  }
}',
'{
  "title_en": "Transparent Pricing",
  "title_ar": "أسعار شفافة",
  "subtitle_en": "No hidden fees, no surprises",
  "subtitle_ar": "لا توجد رسوم مخفية، لا مفاجآت",
  "note_en": "Prices may vary based on individual treatment plans",
  "note_ar": "قد تختلف الأسعار بناءً على خطط العلاج الفردية"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar", "note_en", "note_ar"]',
true),

-- Map - Full Width
('map-full', 'Map - Full Width', 'Full-width Google Maps embed', 'map',
'{
  "type": "map",
  "variant": "full-width",
  "settings": {
    "height": "400px",
    "zoom": 15,
    "showInfo": true
  }
}',
'{
  "title_en": "Find Us",
  "title_ar": "موقعنا",
  "subtitle_en": "Visit our clinic",
  "subtitle_ar": "زوروا عيادتنا"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar"]',
true),

-- Booking - Embedded Widget
('booking-widget', 'Booking - Widget', 'Embedded appointment booking section', 'booking',
'{
  "type": "booking",
  "variant": "widget",
  "settings": {
    "showCalendar": true,
    "showServices": true,
    "showDoctors": true
  }
}',
'{
  "title_en": "Book Your Appointment",
  "title_ar": "احجز موعدك",
  "subtitle_en": "Select your preferred date and time",
  "subtitle_ar": "اختر التاريخ والوقت المفضل لديك"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar"]',
true),

-- Partners - Logo Carousel
('partners-carousel', 'Partners - Carousel', 'Partner/Insurance logos carousel', 'partners',
'{
  "type": "partners",
  "variant": "carousel",
  "settings": {
    "autoPlay": true,
    "speed": 3000,
    "pauseOnHover": true
  }
}',
'{
  "title_en": "Trusted By",
  "title_ar": "موثوق من قبل",
  "subtitle_en": "We work with leading insurance providers",
  "subtitle_ar": "نعمل مع شركات التأمين الرائدة",
  "logos": []
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar", "logos"]',
true),

-- Text - Rich Content
('text-rich', 'Text - Rich Content', 'Rich text content section', 'text',
'{
  "type": "text",
  "variant": "rich",
  "settings": {
    "maxWidth": "800px",
    "centered": true
  }
}',
'{
  "title_en": "About Our Practice",
  "title_ar": "عن ممارستنا",
  "content_en": "<p>Enter your content here...</p>",
  "content_ar": "<p>أدخل المحتوى الخاص بك هنا...</p>"
}',
'["title_en", "title_ar", "content_en", "content_ar"]',
true),

-- CTA - Full Width Background
('cta-fullwidth', 'CTA - Full Width', 'Full-width CTA with background image', 'cta',
'{
  "type": "cta",
  "variant": "fullwidth",
  "settings": {
    "overlay": true,
    "overlayOpacity": 0.7,
    "textColor": "white"
  }
}',
'{
  "title_en": "Start Your Smile Transformation",
  "title_ar": "ابدأ تحويل ابتسامتك",
  "subtitle_en": "Join thousands of happy patients",
  "subtitle_ar": "انضم إلى آلاف المرضى السعداء",
  "buttonText_en": "Contact Us Today",
  "buttonText_ar": "تواصل معنا اليوم",
  "buttonLink": "/contact",
  "backgroundImage": null
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar", "buttonText_en", "buttonText_ar", "backgroundImage"]',
true),

-- About/Team - Split
('about-split', 'About - Split Layout', 'About section with image and text split', 'text',
'{
  "type": "about",
  "variant": "split",
  "settings": {
    "imagePosition": "left"
  }
}',
'{
  "title_en": "About Our Clinic",
  "title_ar": "عن عيادتنا",
  "content_en": "We are dedicated to providing the highest quality dental care in a comfortable and welcoming environment. Our team of experienced professionals uses the latest technology to ensure the best outcomes for our patients.",
  "content_ar": "نحن ملتزمون بتقديم أعلى جودة من رعاية الأسنان في بيئة مريحة وترحيبية. يستخدم فريقنا من المهنيين ذوي الخبرة أحدث التقنيات لضمان أفضل النتائج لمرضانا.",
  "image": null,
  "buttonText_en": "Learn More",
  "buttonText_ar": "اعرف المزيد",
  "buttonLink": "/about"
}',
'["title_en", "title_ar", "content_en", "content_ar", "image", "buttonText_en", "buttonText_ar"]',
true),

-- Branches - Cards
('branches-cards', 'Branches - Cards', 'Multi-branch location cards', 'branches',
'{
  "type": "branches",
  "variant": "cards",
  "settings": {
    "columns": 3,
    "showMap": true,
    "showHours": true,
    "dataSource": "branches"
  }
}',
'{
  "title_en": "Our Locations",
  "title_ar": "فروعنا",
  "subtitle_en": "Find a clinic near you",
  "subtitle_ar": "ابحث عن عيادة قريبة منك"
}',
'["title_en", "title_ar", "subtitle_en", "subtitle_ar"]',
true)

ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- 2. ADDITIONAL PAGE TEMPLATES
-- ===========================================

INSERT INTO page_templates (slug, name, description, category, sections, default_settings, is_active) VALUES

-- Modern Dental - Services Page
('modern-dental-services', 'Modern Dental - Services', 'Services page template with grid and details', 'service',
'[
  {"template_slug": "hero-left-image", "locked": true, "content_override": {
    "title_en": "Our Dental Services",
    "title_ar": "خدماتنا لطب الأسنان",
    "subtitle_en": "Comprehensive care for your entire family",
    "subtitle_ar": "رعاية شاملة لعائلتك بأكملها"
  }},
  {"template_slug": "services-grid-4", "locked": true},
  {"template_slug": "features-grid", "locked": true},
  {"template_slug": "testimonials-slider", "locked": true},
  {"template_slug": "cta-simple", "locked": true}
]',
'{
  "animations": true,
  "style": "modern"
}',
true),

-- Modern Dental - About Page
('modern-dental-about', 'Modern Dental - About', 'About us page with team and story', 'about',
'[
  {"template_slug": "hero-left-image", "locked": true, "content_override": {
    "title_en": "About Our Clinic",
    "title_ar": "عن عيادتنا",
    "subtitle_en": "Your trusted dental partner since 2010",
    "subtitle_ar": "شريكك الموثوق لطب الأسنان منذ 2010"
  }},
  {"template_slug": "about-split", "locked": true},
  {"template_slug": "stats-counter", "locked": true},
  {"template_slug": "team-grid", "locked": true},
  {"template_slug": "gallery-masonry", "locked": true},
  {"template_slug": "cta-fullwidth", "locked": true}
]',
'{
  "animations": true,
  "style": "modern"
}',
true),

-- Modern Dental - Contact Page
('modern-dental-contact', 'Modern Dental - Contact', 'Contact page with form, map and info', 'contact',
'[
  {"template_slug": "hero-centered", "locked": true, "content_override": {
    "title_en": "Contact Us",
    "title_ar": "تواصل معنا",
    "subtitle_en": "We''d love to hear from you",
    "subtitle_ar": "يسعدنا سماع رأيك"
  }},
  {"template_slug": "contact-split", "locked": true},
  {"template_slug": "branches-cards", "locked": true},
  {"template_slug": "map-full", "locked": true},
  {"template_slug": "faq-accordion", "locked": true}
]',
'{
  "animations": true,
  "style": "modern"
}',
true),

-- Modern Dental - Booking Page
('modern-dental-booking', 'Modern Dental - Booking', 'Online appointment booking page', 'booking',
'[
  {"template_slug": "hero-centered", "locked": true, "content_override": {
    "title_en": "Book Your Appointment",
    "title_ar": "احجز موعدك",
    "subtitle_en": "Easy online scheduling",
    "subtitle_ar": "جدولة سهلة عبر الإنترنت"
  }},
  {"template_slug": "booking-widget", "locked": true},
  {"template_slug": "faq-two-column", "locked": true}
]',
'{
  "animations": true,
  "style": "modern"
}',
true),

-- Classic Medical - Home
('classic-medical-home', 'Classic Medical - Home', 'Classic medical/dental clinic homepage', 'landing',
'[
  {"template_slug": "hero-slider", "locked": true},
  {"template_slug": "features-grid", "locked": true},
  {"template_slug": "services-grid-3", "locked": true},
  {"template_slug": "about-split", "locked": true},
  {"template_slug": "stats-counter", "locked": true},
  {"template_slug": "team-grid", "locked": true},
  {"template_slug": "testimonials-grid", "locked": true},
  {"template_slug": "partners-carousel", "locked": true},
  {"template_slug": "cta-fullwidth", "locked": true},
  {"template_slug": "contact-split", "locked": true}
]',
'{
  "animations": true,
  "style": "classic"
}',
true),

-- Minimal Dental - Home
('minimal-dental-home', 'Minimal Dental - Home', 'Minimal and clean dental clinic homepage', 'landing',
'[
  {"template_slug": "hero-left-image", "locked": true},
  {"template_slug": "services-grid-3", "locked": true},
  {"template_slug": "testimonials-slider", "locked": true},
  {"template_slug": "cta-simple", "locked": true}
]',
'{
  "animations": false,
  "style": "minimal"
}',
true),

-- Pricing Page
('pricing-page', 'Pricing Page', 'Service pricing and packages page', 'service',
'[
  {"template_slug": "hero-centered", "locked": true, "content_override": {
    "title_en": "Our Pricing",
    "title_ar": "أسعارنا",
    "subtitle_en": "Transparent pricing for quality care",
    "subtitle_ar": "أسعار شفافة لرعاية عالية الجودة"
  }},
  {"template_slug": "pricing-table", "locked": true},
  {"template_slug": "faq-accordion", "locked": true},
  {"template_slug": "cta-simple", "locked": true}
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
