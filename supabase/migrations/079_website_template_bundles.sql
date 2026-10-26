-- Migration 079: Add bundle support to page_templates + Seed 6 complete website template bundles
-- Each bundle = 4 pages (Home, About, Services, Contact) forming a complete website

-- =============================================================================
-- Step 1: Add bundle columns to page_templates
-- =============================================================================
ALTER TABLE page_templates
  ADD COLUMN IF NOT EXISTS bundle_slug TEXT,
  ADD COLUMN IF NOT EXISTS bundle_name TEXT,
  ADD COLUMN IF NOT EXISTS bundle_description TEXT,
  ADD COLUMN IF NOT EXISTS bundle_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bundle_thumbnail_url TEXT;

-- Index for fast bundle lookups
CREATE INDEX IF NOT EXISTS idx_page_templates_bundle_slug ON page_templates(bundle_slug);

-- =============================================================================
-- Step 2: Tag existing Modern Dental templates as a bundle
-- =============================================================================
UPDATE page_templates SET
  bundle_slug = 'modern-dental',
  bundle_name = 'Modern Dental',
  bundle_description = 'Clean, modern dental clinic website with appointment booking',
  bundle_order = 1,
  bundle_thumbnail_url = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=400&fit=crop'
WHERE slug IN ('modern-dental-home', 'modern-dental-about', 'modern-dental-services', 'modern-dental-booking', 'modern-dental-contact');

-- =============================================================================
-- Step 3: Seed Bundle 1 - DiwaDental Premium (Luxury/Premium style)
-- =============================================================================
INSERT INTO page_templates (name, slug, description, category, is_active, is_premium, bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url, sections, default_settings) VALUES

-- DiwaDental Premium - Home
('DiwaDental Premium - Home', 'diwadental-premium-home', 'Luxury dental homepage with slider hero, before/after gallery, and full clinic showcase', 'landing', true, false,
 'diwadental-premium', 'DiwaDental Premium', 'Premium luxury dental clinic website inspired by high-end dental practices. Features elegant animations, before/after gallery, and comprehensive clinic presentation.', 1,
 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-slider", "locked": true, "content_override": {"title_en": "Your Smile, Our Passion", "title_ar": "ابتسامتك، شغفنا", "subtitle_en": "Premium dental care with cutting-edge technology", "subtitle_ar": "رعاية أسنان متميزة بأحدث التقنيات"}},
   {"template_slug": "stats-counter", "locked": true, "content_override": {"stats": [{"label_en": "Happy Patients", "label_ar": "مرضى سعداء", "value": "15000+"}, {"label_en": "Years Experience", "label_ar": "سنوات خبرة", "value": "25+"}, {"label_en": "Expert Dentists", "label_ar": "أطباء متخصصون", "value": "12"}, {"label_en": "Awards Won", "label_ar": "جوائز", "value": "30+"}]}},
   {"template_slug": "services-grid-4", "locked": true, "content_override": {"title_en": "Our Premium Services", "title_ar": "خدماتنا المتميزة", "subtitle_en": "Comprehensive dental solutions for the whole family", "subtitle_ar": "حلول شاملة للأسنان لجميع أفراد العائلة"}},
   {"template_slug": "about-split", "locked": true, "content_override": {"title_en": "Why Choose Us", "title_ar": "لماذا تختارنا", "body_en": "With over 25 years of excellence, we combine artistry with advanced dental technology to deliver results that transform lives.", "body_ar": "مع أكثر من 25 عامًا من التميز، نجمع بين الفن وتكنولوجيا طب الأسنان المتقدمة لتقديم نتائج تغير حياة المرضى."}},
   {"template_slug": "team-grid", "locked": true, "content_override": {"title_en": "Meet Our Specialists", "title_ar": "تعرف على أطبائنا"}},
   {"template_slug": "gallery-masonry", "locked": true, "content_override": {"title_en": "Smile Transformations", "title_ar": "تحولات الابتسامة", "subtitle_en": "Real results from real patients", "subtitle_ar": "نتائج حقيقية من مرضى حقيقيين"}},
   {"template_slug": "testimonials-slider", "locked": true, "content_override": {"title_en": "What Our Patients Say", "title_ar": "ماذا يقول مرضانا"}},
   {"template_slug": "booking-widget", "locked": true},
   {"template_slug": "partners-carousel", "locked": true, "content_override": {"title_en": "Trusted Partners & Certifications", "title_ar": "شركاء ومعتمدون موثوقون"}},
   {"template_slug": "contact-split", "locked": true}
 ]'::jsonb,
 '{"theme": "premium", "animations": true}'::jsonb),

-- DiwaDental Premium - About
('DiwaDental Premium - About', 'diwadental-premium-about', 'Premium about page with clinic story, team showcase, and certifications', 'about', true, false,
 'diwadental-premium', 'DiwaDental Premium', 'Premium luxury dental clinic website inspired by high-end dental practices. Features elegant animations, before/after gallery, and comprehensive clinic presentation.', 1,
 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-left-image", "locked": true, "content_override": {"title_en": "Our Story", "title_ar": "قصتنا", "subtitle_en": "A legacy of dental excellence since 1998", "subtitle_ar": "إرث من التميز في طب الأسنان منذ 1998"}},
   {"template_slug": "about-split", "locked": true, "content_override": {"title_en": "Our Mission & Vision", "title_ar": "رسالتنا ورؤيتنا", "body_en": "We believe everyone deserves a beautiful, healthy smile. Our mission is to provide world-class dental care in a comfortable, welcoming environment.", "body_ar": "نؤمن بأن كل شخص يستحق ابتسامة جميلة وصحية. مهمتنا هي تقديم رعاية أسنان عالمية في بيئة مريحة وراقية."}},
   {"template_slug": "stats-counter", "locked": true},
   {"template_slug": "team-grid", "locked": true, "content_override": {"title_en": "Our Expert Team", "title_ar": "فريقنا المتخصص", "subtitle_en": "Board-certified specialists dedicated to your care", "subtitle_ar": "أطباء معتمدون مكرسون لرعايتكم"}},
   {"template_slug": "gallery-masonry", "locked": true, "content_override": {"title_en": "Our Clinic", "title_ar": "عيادتنا"}},
   {"template_slug": "partners-carousel", "locked": true},
   {"template_slug": "cta-fullwidth", "locked": true, "content_override": {"title_en": "Ready to Start Your Smile Journey?", "title_ar": "مستعد لبدء رحلة ابتسامتك؟"}}
 ]'::jsonb,
 '{"theme": "premium", "animations": true}'::jsonb),

-- DiwaDental Premium - Services
('DiwaDental Premium - Services', 'diwadental-premium-services', 'Premium services page with detailed offerings and pricing', 'service', true, false,
 'diwadental-premium', 'DiwaDental Premium', 'Premium luxury dental clinic website inspired by high-end dental practices. Features elegant animations, before/after gallery, and comprehensive clinic presentation.', 1,
 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Our Services", "title_ar": "خدماتنا", "subtitle_en": "Comprehensive dental care tailored to you", "subtitle_ar": "رعاية أسنان شاملة مصممة خصيصًا لك"}},
   {"template_slug": "services-grid-4", "locked": true},
   {"template_slug": "features-grid", "locked": true, "content_override": {"title_en": "Why Our Treatments Stand Out", "title_ar": "لماذا تتميز علاجاتنا"}},
   {"template_slug": "pricing-table", "locked": true, "content_override": {"title_en": "Transparent Pricing", "title_ar": "أسعار شفافة"}},
   {"template_slug": "faq-accordion", "locked": true, "content_override": {"title_en": "Common Questions", "title_ar": "أسئلة شائعة"}},
   {"template_slug": "cta-fullwidth", "locked": true, "content_override": {"title_en": "Book Your Consultation Today", "title_ar": "احجز استشارتك اليوم"}}
 ]'::jsonb,
 '{"theme": "premium", "animations": true}'::jsonb),

-- DiwaDental Premium - Contact
('DiwaDental Premium - Contact', 'diwadental-premium-contact', 'Premium contact page with map, branches and booking', 'contact', true, false,
 'diwadental-premium', 'DiwaDental Premium', 'Premium luxury dental clinic website inspired by high-end dental practices. Features elegant animations, before/after gallery, and comprehensive clinic presentation.', 1,
 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Get In Touch", "title_ar": "تواصل معنا", "subtitle_en": "We would love to hear from you", "subtitle_ar": "يسعدنا التواصل معكم"}},
   {"template_slug": "contact-split", "locked": true},
   {"template_slug": "branches-cards", "locked": true, "content_override": {"title_en": "Our Locations", "title_ar": "فروعنا"}},
   {"template_slug": "map-full", "locked": true},
   {"template_slug": "faq-two-column", "locked": true, "content_override": {"title_en": "Before Your Visit", "title_ar": "قبل زيارتك"}}
 ]'::jsonb,
 '{"theme": "premium", "animations": true}'::jsonb);


-- =============================================================================
-- Step 4: Seed Bundle 2 - MedicPro Clean (Professional medical style)
-- =============================================================================
INSERT INTO page_templates (name, slug, description, category, is_active, is_premium, bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url, sections, default_settings) VALUES

-- MedicPro Clean - Home
('MedicPro Clean - Home', 'medicpro-clean-home', 'Professional medical homepage with feature boxes and appointment booking', 'landing', true, false,
 'medicpro-clean', 'MedicPro Clean', 'Professional and trustworthy medical/dental website design. Clean layout with prominent appointment booking and feature highlights.', 2,
 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Professional Dental Care You Can Trust", "title_ar": "رعاية أسنان احترافية يمكنك الوثوق بها", "subtitle_en": "Evidence-based treatments with compassionate care", "subtitle_ar": "علاجات مبنية على الأدلة مع رعاية حنونة"}},
   {"template_slug": "features-grid", "locked": true, "content_override": {"title_en": "Why Patients Choose Us", "title_ar": "لماذا يختارنا المرضى", "features": [{"icon": "shield", "title_en": "Board Certified", "title_ar": "أطباء معتمدون"}, {"icon": "clock", "title_en": "Same Day Appointments", "title_ar": "مواعيد في نفس اليوم"}, {"icon": "heart", "title_en": "Gentle Care", "title_ar": "رعاية لطيفة"}, {"icon": "award", "title_en": "5-Star Rated", "title_ar": "تقييم 5 نجوم"}]}},
   {"template_slug": "services-grid-3", "locked": true, "content_override": {"title_en": "Our Services", "title_ar": "خدماتنا"}},
   {"template_slug": "team-grid", "locked": true, "content_override": {"title_en": "Our Team of Experts", "title_ar": "فريق الخبراء لدينا"}},
   {"template_slug": "testimonials-grid", "locked": true, "content_override": {"title_en": "Patient Testimonials", "title_ar": "شهادات المرضى"}},
   {"template_slug": "faq-accordion", "locked": true, "content_override": {"title_en": "Frequently Asked Questions", "title_ar": "الأسئلة الشائعة"}},
   {"template_slug": "booking-widget", "locked": true},
   {"template_slug": "cta-simple", "locked": true, "content_override": {"title_en": "Ready to Schedule Your Visit?", "title_ar": "مستعد لحجز زيارتك؟"}}
 ]'::jsonb,
 '{"theme": "professional", "animations": false}'::jsonb),

-- MedicPro Clean - About
('MedicPro Clean - About', 'medicpro-clean-about', 'Professional about page with credentials and clinic tour', 'about', true, false,
 'medicpro-clean', 'MedicPro Clean', 'Professional and trustworthy medical/dental website design. Clean layout with prominent appointment booking and feature highlights.', 2,
 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-left-image", "locked": true, "content_override": {"title_en": "About Our Practice", "title_ar": "عن عيادتنا", "subtitle_en": "Dedicated to excellence in dental healthcare", "subtitle_ar": "ملتزمون بالتميز في رعاية صحة الأسنان"}},
   {"template_slug": "about-split", "locked": true, "content_override": {"title_en": "Our Philosophy", "title_ar": "فلسفتنا", "body_en": "We combine the latest dental science with a patient-first approach. Every treatment plan is customized to your unique needs and goals.", "body_ar": "نجمع بين أحدث علوم طب الأسنان ونهج المريض أولاً. كل خطة علاج مصممة حسب احتياجاتك وأهدافك الفريدة."}},
   {"template_slug": "stats-counter", "locked": true, "content_override": {"stats": [{"label_en": "Years of Service", "label_ar": "سنوات الخدمة", "value": "20+"}, {"label_en": "Procedures Completed", "label_ar": "عمليات مكتملة", "value": "50,000+"}, {"label_en": "Patient Satisfaction", "label_ar": "رضا المرضى", "value": "98%"}, {"label_en": "Specialists", "label_ar": "أطباء متخصصون", "value": "8"}]}},
   {"template_slug": "team-grid", "locked": true, "content_override": {"title_en": "Meet Our Doctors", "title_ar": "تعرف على أطبائنا"}},
   {"template_slug": "gallery-masonry", "locked": true, "content_override": {"title_en": "Our Modern Facility", "title_ar": "عيادتنا الحديثة"}},
   {"template_slug": "cta-simple", "locked": true, "content_override": {"title_en": "Join Our Family of Happy Patients", "title_ar": "انضم لعائلة مرضانا السعداء"}}
 ]'::jsonb,
 '{"theme": "professional", "animations": false}'::jsonb),

-- MedicPro Clean - Services
('MedicPro Clean - Services', 'medicpro-clean-services', 'Professional services page with detailed treatment descriptions', 'service', true, false,
 'medicpro-clean', 'MedicPro Clean', 'Professional and trustworthy medical/dental website design. Clean layout with prominent appointment booking and feature highlights.', 2,
 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Dental Services", "title_ar": "خدمات الأسنان", "subtitle_en": "Comprehensive care for every member of your family", "subtitle_ar": "رعاية شاملة لكل فرد من أفراد عائلتك"}},
   {"template_slug": "services-grid-3", "locked": true},
   {"template_slug": "features-grid", "locked": true, "content_override": {"title_en": "Our Technology", "title_ar": "تقنياتنا", "subtitle_en": "State-of-the-art equipment for precise treatments", "subtitle_ar": "أحدث الأجهزة لعلاجات دقيقة"}},
   {"template_slug": "testimonials-slider", "locked": true},
   {"template_slug": "cta-simple", "locked": true, "content_override": {"title_en": "Book Your Appointment", "title_ar": "احجز موعدك"}}
 ]'::jsonb,
 '{"theme": "professional", "animations": false}'::jsonb),

-- MedicPro Clean - Contact
('MedicPro Clean - Contact', 'medicpro-clean-contact', 'Professional contact page with form, map and office hours', 'contact', true, false,
 'medicpro-clean', 'MedicPro Clean', 'Professional and trustworthy medical/dental website design. Clean layout with prominent appointment booking and feature highlights.', 2,
 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-left-image", "locked": true, "content_override": {"title_en": "Contact Us", "title_ar": "اتصل بنا", "subtitle_en": "We are here to help", "subtitle_ar": "نحن هنا لمساعدتك"}},
   {"template_slug": "contact-split", "locked": true},
   {"template_slug": "map-full", "locked": true},
   {"template_slug": "branches-cards", "locked": true, "content_override": {"title_en": "Our Offices", "title_ar": "عياداتنا"}},
   {"template_slug": "faq-two-column", "locked": true, "content_override": {"title_en": "Visit Information", "title_ar": "معلومات الزيارة"}}
 ]'::jsonb,
 '{"theme": "professional", "animations": false}'::jsonb);


-- =============================================================================
-- Step 5: Seed Bundle 3 - Minimal Smile (Clean, minimal design)
-- =============================================================================
INSERT INTO page_templates (name, slug, description, category, is_active, is_premium, bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url, sections, default_settings) VALUES

-- Minimal Smile - Home
('Minimal Smile - Home', 'minimal-smile-home', 'Clean minimal homepage with focused content and plenty of whitespace', 'landing', true, false,
 'minimal-smile', 'Minimal Smile', 'Clean and minimal dental website with generous whitespace, focused content, and elegant typography. Perfect for boutique practices.', 3,
 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-left-image", "locked": true, "content_override": {"title_en": "Beautiful Smiles, Simple Care", "title_ar": "ابتسامات جميلة، رعاية بسيطة", "subtitle_en": "Where dental excellence meets comfort", "subtitle_ar": "حيث يلتقي التميز في طب الأسنان بالراحة"}},
   {"template_slug": "services-grid-3", "locked": true, "content_override": {"title_en": "What We Do", "title_ar": "ما نقدمه"}},
   {"template_slug": "testimonials-slider", "locked": true},
   {"template_slug": "cta-simple", "locked": true, "content_override": {"title_en": "Start Your Journey", "title_ar": "ابدأ رحلتك"}}
 ]'::jsonb,
 '{"theme": "minimal", "animations": false}'::jsonb),

-- Minimal Smile - About
('Minimal Smile - About', 'minimal-smile-about', 'Minimal about page focusing on the team and clinic story', 'about', true, false,
 'minimal-smile', 'Minimal Smile', 'Clean and minimal dental website with generous whitespace, focused content, and elegant typography. Perfect for boutique practices.', 3,
 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Our Story", "title_ar": "قصتنا", "subtitle_en": "A small practice with a big heart", "subtitle_ar": "عيادة صغيرة بقلب كبير"}},
   {"template_slug": "about-split", "locked": true, "content_override": {"title_en": "Who We Are", "title_ar": "من نحن", "body_en": "Founded on the belief that dental care should be personal, comfortable, and accessible. We take time to know each patient.", "body_ar": "تأسست على إيمان بأن رعاية الأسنان يجب أن تكون شخصية ومريحة وميسرة. نأخذ الوقت لمعرفة كل مريض."}},
   {"template_slug": "team-grid", "locked": true, "content_override": {"title_en": "The Team", "title_ar": "الفريق"}},
   {"template_slug": "cta-simple", "locked": true}
 ]'::jsonb,
 '{"theme": "minimal", "animations": false}'::jsonb),

-- Minimal Smile - Services
('Minimal Smile - Services', 'minimal-smile-services', 'Minimal services page with clear treatment descriptions', 'service', true, false,
 'minimal-smile', 'Minimal Smile', 'Clean and minimal dental website with generous whitespace, focused content, and elegant typography. Perfect for boutique practices.', 3,
 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Services", "title_ar": "الخدمات", "subtitle_en": "Thoughtful care for every smile", "subtitle_ar": "رعاية مدروسة لكل ابتسامة"}},
   {"template_slug": "services-grid-3", "locked": true},
   {"template_slug": "pricing-table", "locked": true, "content_override": {"title_en": "Simple Pricing", "title_ar": "أسعار واضحة"}},
   {"template_slug": "cta-simple", "locked": true, "content_override": {"title_en": "Questions? Let us talk.", "title_ar": "أسئلة؟ دعنا نتحدث."}}
 ]'::jsonb,
 '{"theme": "minimal", "animations": false}'::jsonb),

-- Minimal Smile - Contact
('Minimal Smile - Contact', 'minimal-smile-contact', 'Minimal contact page with essential information', 'contact', true, false,
 'minimal-smile', 'Minimal Smile', 'Clean and minimal dental website with generous whitespace, focused content, and elegant typography. Perfect for boutique practices.', 3,
 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Say Hello", "title_ar": "قل مرحبا", "subtitle_en": "We would love to hear from you", "subtitle_ar": "يسعدنا سماع رأيك"}},
   {"template_slug": "contact-split", "locked": true},
   {"template_slug": "map-full", "locked": true}
 ]'::jsonb,
 '{"theme": "minimal", "animations": false}'::jsonb);


-- =============================================================================
-- Step 6: Seed Bundle 4 - Tourism Dental (Dental tourism focused)
-- =============================================================================
INSERT INTO page_templates (name, slug, description, category, is_active, is_premium, bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url, sections, default_settings) VALUES

-- Tourism Dental - Home
('Tourism Dental - Home', 'tourism-dental-home', 'Dental tourism homepage with pricing, gallery, and travel information', 'landing', true, false,
 'tourism-dental', 'Tourism Dental', 'Designed for dental clinics serving international patients. Prominent pricing, before/after gallery, travel packages, and multilingual support emphasis.', 4,
 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-slider", "locked": true, "content_override": {"title_en": "World-Class Dental Care, Unbeatable Prices", "title_ar": "رعاية أسنان عالمية بأسعار لا تُضاهى", "subtitle_en": "Save up to 70% on dental treatments — fly in, smile out", "subtitle_ar": "وفر حتى 70٪ على علاجات الأسنان — سافر إلينا وعد بابتسامة"}},
   {"template_slug": "services-grid-4", "locked": true, "content_override": {"title_en": "Popular Treatments", "title_ar": "العلاجات الأكثر طلبًا"}},
   {"template_slug": "about-split", "locked": true, "content_override": {"title_en": "Why Patients Fly to Us", "title_ar": "لماذا يسافر المرضى إلينا", "body_en": "Internationally accredited clinic with JCI certification. We handle everything from airport pickup to hotel accommodation, so you can focus on your new smile.", "body_ar": "عيادة معتمدة دوليًا بشهادة JCI. نتولى كل شيء من استقبال المطار إلى الإقامة الفندقية، لتركز أنت على ابتسامتك الجديدة."}},
   {"template_slug": "pricing-table", "locked": true, "content_override": {"title_en": "Compare & Save", "title_ar": "قارن ووفر", "subtitle_en": "Our prices vs. USA/UK/EU averages", "subtitle_ar": "أسعارنا مقابل متوسط أسعار أمريكا/بريطانيا/أوروبا"}},
   {"template_slug": "gallery-masonry", "locked": true, "content_override": {"title_en": "Smile Transformations", "title_ar": "تحولات الابتسامة", "subtitle_en": "Before & after results from international patients", "subtitle_ar": "نتائج قبل وبعد من مرضى دوليين"}},
   {"template_slug": "testimonials-grid", "locked": true, "content_override": {"title_en": "Patient Stories from Around the World", "title_ar": "قصص المرضى من حول العالم"}},
   {"template_slug": "faq-accordion", "locked": true, "content_override": {"title_en": "Travel & Treatment FAQ", "title_ar": "أسئلة شائعة عن السفر والعلاج"}},
   {"template_slug": "booking-widget", "locked": true},
   {"template_slug": "contact-split", "locked": true}
 ]'::jsonb,
 '{"theme": "tourism", "animations": true}'::jsonb),

-- Tourism Dental - About
('Tourism Dental - About', 'tourism-dental-about', 'About page highlighting international accreditations and clinic tour', 'about', true, false,
 'tourism-dental', 'Tourism Dental', 'Designed for dental clinics serving international patients. Prominent pricing, before/after gallery, travel packages, and multilingual support emphasis.', 4,
 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-left-image", "locked": true, "content_override": {"title_en": "About Our International Clinic", "title_ar": "عن عيادتنا الدولية", "subtitle_en": "Serving patients from 40+ countries since 2005", "subtitle_ar": "نخدم مرضى من أكثر من 40 دولة منذ 2005"}},
   {"template_slug": "about-split", "locked": true, "content_override": {"title_en": "Our International Standards", "title_ar": "معاييرنا الدولية"}},
   {"template_slug": "stats-counter", "locked": true, "content_override": {"stats": [{"label_en": "Countries Served", "label_ar": "دولة", "value": "40+"}, {"label_en": "International Patients", "label_ar": "مريض دولي", "value": "10,000+"}, {"label_en": "Success Rate", "label_ar": "نسبة النجاح", "value": "99.2%"}, {"label_en": "Languages Spoken", "label_ar": "لغات", "value": "6"}]}},
   {"template_slug": "team-grid", "locked": true, "content_override": {"title_en": "Our International Team", "title_ar": "فريقنا الدولي"}},
   {"template_slug": "partners-carousel", "locked": true, "content_override": {"title_en": "Accreditations & Partners", "title_ar": "الاعتمادات والشركاء"}},
   {"template_slug": "cta-fullwidth", "locked": true, "content_override": {"title_en": "Plan Your Dental Trip Today", "title_ar": "خطط لرحلتك العلاجية اليوم"}}
 ]'::jsonb,
 '{"theme": "tourism", "animations": true}'::jsonb),

-- Tourism Dental - Services
('Tourism Dental - Services', 'tourism-dental-services', 'Tourism services page with pricing comparison and package deals', 'service', true, false,
 'tourism-dental', 'Tourism Dental', 'Designed for dental clinics serving international patients. Prominent pricing, before/after gallery, travel packages, and multilingual support emphasis.', 4,
 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Treatments & Packages", "title_ar": "العلاجات والباقات", "subtitle_en": "All-inclusive dental tourism packages", "subtitle_ar": "باقات سياحة علاجية شاملة"}},
   {"template_slug": "services-grid-4", "locked": true, "content_override": {"title_en": "Our Specialties", "title_ar": "تخصصاتنا"}},
   {"template_slug": "pricing-table", "locked": true, "content_override": {"title_en": "Price Comparison", "title_ar": "مقارنة الأسعار"}},
   {"template_slug": "features-grid", "locked": true, "content_override": {"title_en": "What is Included", "title_ar": "ما المشمول", "subtitle_en": "Every package includes airport transfer, hotel, and aftercare", "subtitle_ar": "كل باقة تشمل نقل المطار والفندق ومتابعة العلاج"}},
   {"template_slug": "gallery-masonry", "locked": true, "content_override": {"title_en": "Results Gallery", "title_ar": "معرض النتائج"}},
   {"template_slug": "cta-fullwidth", "locked": true, "content_override": {"title_en": "Get Your Free Quote", "title_ar": "احصل على عرض أسعار مجاني"}}
 ]'::jsonb,
 '{"theme": "tourism", "animations": true}'::jsonb),

-- Tourism Dental - Contact
('Tourism Dental - Contact', 'tourism-dental-contact', 'Contact page with international support channels and clinic location', 'contact', true, false,
 'tourism-dental', 'Tourism Dental', 'Designed for dental clinics serving international patients. Prominent pricing, before/after gallery, travel packages, and multilingual support emphasis.', 4,
 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Contact Our International Team", "title_ar": "تواصل مع فريقنا الدولي", "subtitle_en": "Available in English, Arabic, Turkish, German, Russian & French", "subtitle_ar": "متوفرون بالإنجليزية والعربية والتركية والألمانية والروسية والفرنسية"}},
   {"template_slug": "contact-split", "locked": true},
   {"template_slug": "branches-cards", "locked": true, "content_override": {"title_en": "Clinic Locations", "title_ar": "مواقع العيادات"}},
   {"template_slug": "map-full", "locked": true},
   {"template_slug": "faq-two-column", "locked": true, "content_override": {"title_en": "Travel FAQ", "title_ar": "أسئلة السفر"}}
 ]'::jsonb,
 '{"theme": "tourism", "animations": true}'::jsonb);


-- =============================================================================
-- Step 7: Seed Bundle 5 - Pediatric Gentle (Child-friendly design)
-- =============================================================================
INSERT INTO page_templates (name, slug, description, category, is_active, is_premium, bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url, sections, default_settings) VALUES

-- Pediatric Gentle - Home
('Pediatric Gentle - Home', 'pediatric-gentle-home', 'Child-friendly dental homepage with warm colors and playful design', 'landing', true, false,
 'pediatric-gentle', 'Pediatric Gentle', 'Warm and friendly pediatric dental website. Designed to make children and parents feel at ease with soft colors and approachable content.', 5,
 'https://images.unsplash.com/photo-1588776813677-77aaf5595b83?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Happy Smiles Start Here!", "title_ar": "الابتسامات السعيدة تبدأ هنا!", "subtitle_en": "Gentle dental care designed specially for kids", "subtitle_ar": "رعاية أسنان لطيفة مصممة خصيصًا للأطفال"}},
   {"template_slug": "features-grid", "locked": true, "content_override": {"title_en": "Why Kids Love Us", "title_ar": "لماذا يحبنا الأطفال", "features": [{"icon": "smile", "title_en": "Fun Environment", "title_ar": "بيئة ممتعة"}, {"icon": "shield", "title_en": "Gentle Approach", "title_ar": "نهج لطيف"}, {"icon": "gamepad", "title_en": "Play Area", "title_ar": "منطقة لعب"}, {"icon": "award", "title_en": "Reward Program", "title_ar": "برنامج مكافآت"}]}},
   {"template_slug": "services-grid-4", "locked": true, "content_override": {"title_en": "Our Kid-Friendly Services", "title_ar": "خدماتنا الصديقة للأطفال"}},
   {"template_slug": "team-grid", "locked": true, "content_override": {"title_en": "Meet Our Friendly Doctors", "title_ar": "تعرف على أطبائنا الودودين"}},
   {"template_slug": "faq-two-column", "locked": true, "content_override": {"title_en": "Parents Corner", "title_ar": "ركن الآباء", "subtitle_en": "Common questions from moms and dads", "subtitle_ar": "أسئلة شائعة من الأمهات والآباء"}},
   {"template_slug": "testimonials-slider", "locked": true, "content_override": {"title_en": "What Parents Say", "title_ar": "ماذا يقول الآباء"}},
   {"template_slug": "booking-widget", "locked": true}
 ]'::jsonb,
 '{"theme": "pediatric", "animations": true, "colorScheme": "warm"}'::jsonb),

-- Pediatric Gentle - About
('Pediatric Gentle - About', 'pediatric-gentle-about', 'Child-friendly about page with team photos and clinic tour', 'about', true, false,
 'pediatric-gentle', 'Pediatric Gentle', 'Warm and friendly pediatric dental website. Designed to make children and parents feel at ease with soft colors and approachable content.', 5,
 'https://images.unsplash.com/photo-1588776813677-77aaf5595b83?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-left-image", "locked": true, "content_override": {"title_en": "About Our Kids Dental Practice", "title_ar": "عن عيادتنا لأسنان الأطفال", "subtitle_en": "Making dental visits an adventure!", "subtitle_ar": "نجعل زيارة طبيب الأسنان مغامرة!"}},
   {"template_slug": "about-split", "locked": true, "content_override": {"title_en": "Our Approach", "title_ar": "نهجنا", "body_en": "We believe every child deserves a positive dental experience. Our specially trained pediatric dentists use age-appropriate techniques and lots of patience to ensure your little ones feel safe and comfortable.", "body_ar": "نؤمن بأن كل طفل يستحق تجربة إيجابية عند طبيب الأسنان. أطباء أسنان الأطفال المدربون لدينا يستخدمون تقنيات مناسبة للعمر والكثير من الصبر لضمان شعور أطفالكم بالأمان والراحة."}},
   {"template_slug": "team-grid", "locked": true, "content_override": {"title_en": "Our Kid-Friendly Team", "title_ar": "فريقنا الصديق للأطفال"}},
   {"template_slug": "gallery-masonry", "locked": true, "content_override": {"title_en": "Our Fun Clinic", "title_ar": "عيادتنا الممتعة"}},
   {"template_slug": "cta-simple", "locked": true, "content_override": {"title_en": "Schedule Your Child Visit", "title_ar": "حدد موعد زيارة طفلك"}}
 ]'::jsonb,
 '{"theme": "pediatric", "animations": true, "colorScheme": "warm"}'::jsonb),

-- Pediatric Gentle - Services
('Pediatric Gentle - Services', 'pediatric-gentle-services', 'Child-friendly services page with treatment descriptions for parents', 'service', true, false,
 'pediatric-gentle', 'Pediatric Gentle', 'Warm and friendly pediatric dental website. Designed to make children and parents feel at ease with soft colors and approachable content.', 5,
 'https://images.unsplash.com/photo-1588776813677-77aaf5595b83?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Services for Little Smiles", "title_ar": "خدمات للابتسامات الصغيرة", "subtitle_en": "Age-appropriate dental care from baby teeth to teens", "subtitle_ar": "رعاية أسنان مناسبة للعمر من الأسنان اللبنية إلى المراهقين"}},
   {"template_slug": "services-grid-4", "locked": true},
   {"template_slug": "features-grid", "locked": true, "content_override": {"title_en": "Our Child-Safe Technology", "title_ar": "تقنياتنا الآمنة للأطفال"}},
   {"template_slug": "faq-accordion", "locked": true, "content_override": {"title_en": "Common Questions from Parents", "title_ar": "أسئلة شائعة من الآباء"}},
   {"template_slug": "cta-simple", "locked": true, "content_override": {"title_en": "Book a Fun Visit!", "title_ar": "احجز زيارة ممتعة!"}}
 ]'::jsonb,
 '{"theme": "pediatric", "animations": true, "colorScheme": "warm"}'::jsonb),

-- Pediatric Gentle - Contact
('Pediatric Gentle - Contact', 'pediatric-gentle-contact', 'Child-friendly contact page with playful design', 'contact', true, false,
 'pediatric-gentle', 'Pediatric Gentle', 'Warm and friendly pediatric dental website. Designed to make children and parents feel at ease with soft colors and approachable content.', 5,
 'https://images.unsplash.com/photo-1588776813677-77aaf5595b83?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Come Visit Us!", "title_ar": "تعال وزرنا!", "subtitle_en": "Our friendly team is ready to welcome your family", "subtitle_ar": "فريقنا الودود جاهز لاستقبال عائلتك"}},
   {"template_slug": "contact-split", "locked": true},
   {"template_slug": "map-full", "locked": true},
   {"template_slug": "faq-two-column", "locked": true, "content_override": {"title_en": "First Visit Info", "title_ar": "معلومات الزيارة الأولى"}}
 ]'::jsonb,
 '{"theme": "pediatric", "animations": true, "colorScheme": "warm"}'::jsonb);


-- =============================================================================
-- Step 8: Seed Bundle 6 - Emergency 24/7 (Urgent care focused)
-- =============================================================================
INSERT INTO page_templates (name, slug, description, category, is_active, is_premium, bundle_slug, bundle_name, bundle_description, bundle_order, bundle_thumbnail_url, sections, default_settings) VALUES

-- Emergency 24/7 - Home
('Emergency 24/7 - Home', 'emergency-247-home', 'Emergency dental homepage with prominent booking and urgent care focus', 'landing', true, false,
 'emergency-247', 'Emergency 24/7', 'Urgent dental care website with prominent booking, fast-action CTAs, and emergency contact information always visible. Designed for clinics offering 24/7 or extended hours.', 6,
 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Emergency Dental Care — Available 24/7", "title_ar": "رعاية أسنان طارئة — متوفرة 24/7", "subtitle_en": "Immediate relief for dental emergencies. Call now or book online.", "subtitle_ar": "راحة فورية لحالات الأسنان الطارئة. اتصل الآن أو احجز عبر الإنترنت."}},
   {"template_slug": "services-grid-3", "locked": true, "content_override": {"title_en": "Emergency Services", "title_ar": "خدمات الطوارئ"}},
   {"template_slug": "stats-counter", "locked": true, "content_override": {"stats": [{"label_en": "Average Wait Time", "label_ar": "متوسط وقت الانتظار", "value": "< 15 min"}, {"label_en": "Emergency Cases/Year", "label_ar": "حالات طوارئ سنوياً", "value": "5,000+"}, {"label_en": "Available", "label_ar": "متوفرون", "value": "24/7"}, {"label_en": "Patient Satisfaction", "label_ar": "رضا المرضى", "value": "4.9/5"}]}},
   {"template_slug": "booking-widget", "locked": true},
   {"template_slug": "map-full", "locked": true},
   {"template_slug": "cta-fullwidth", "locked": true, "content_override": {"title_en": "Dental Emergency? Do Not Wait.", "title_ar": "حالة أسنان طارئة؟ لا تنتظر.", "subtitle_en": "Call us now or walk in — no appointment needed for emergencies", "subtitle_ar": "اتصل بنا الآن أو تعال مباشرة — لا حاجة لموعد لحالات الطوارئ"}}
 ]'::jsonb,
 '{"theme": "emergency", "animations": false, "colorScheme": "bold"}'::jsonb),

-- Emergency 24/7 - About
('Emergency 24/7 - About', 'emergency-247-about', 'About page highlighting emergency capabilities and fast response', 'about', true, false,
 'emergency-247', 'Emergency 24/7', 'Urgent dental care website with prominent booking, fast-action CTAs, and emergency contact information always visible. Designed for clinics offering 24/7 or extended hours.', 6,
 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-left-image", "locked": true, "content_override": {"title_en": "About Our Emergency Practice", "title_ar": "عن عيادتنا الطارئة", "subtitle_en": "Rapid response dental care when you need it most", "subtitle_ar": "رعاية أسنان سريعة الاستجابة عندما تحتاجها أكثر"}},
   {"template_slug": "about-split", "locked": true, "content_override": {"title_en": "Always Ready", "title_ar": "جاهزون دائمًا", "body_en": "Our emergency dental team is on standby around the clock. With state-of-the-art equipment and experienced emergency dentists, we provide immediate relief and definitive treatment for all dental emergencies.", "body_ar": "فريق طوارئ الأسنان لدينا على أهبة الاستعداد على مدار الساعة. مع أحدث المعدات وأطباء أسنان طوارئ ذوي خبرة، نقدم راحة فورية وعلاج نهائي لجميع حالات طوارئ الأسنان."}},
   {"template_slug": "team-grid", "locked": true, "content_override": {"title_en": "Emergency Team on Duty", "title_ar": "فريق الطوارئ المناوب"}},
   {"template_slug": "features-grid", "locked": true, "content_override": {"title_en": "Our Emergency Equipment", "title_ar": "معداتنا الطارئة"}},
   {"template_slug": "cta-fullwidth", "locked": true, "content_override": {"title_en": "Need Help Now? Call Immediately", "title_ar": "تحتاج مساعدة الآن؟ اتصل فورًا"}}
 ]'::jsonb,
 '{"theme": "emergency", "animations": false, "colorScheme": "bold"}'::jsonb),

-- Emergency 24/7 - Services
('Emergency 24/7 - Services', 'emergency-247-services', 'Emergency services page listing urgent treatments available', 'service', true, false,
 'emergency-247', 'Emergency 24/7', 'Urgent dental care website with prominent booking, fast-action CTAs, and emergency contact information always visible. Designed for clinics offering 24/7 or extended hours.', 6,
 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Emergency Dental Services", "title_ar": "خدمات طوارئ الأسنان", "subtitle_en": "Immediate treatment for pain, trauma, and infections", "subtitle_ar": "علاج فوري للألم والإصابات والالتهابات"}},
   {"template_slug": "services-grid-3", "locked": true},
   {"template_slug": "faq-accordion", "locked": true, "content_override": {"title_en": "Is This an Emergency?", "title_ar": "هل هذه حالة طوارئ؟", "subtitle_en": "Guide to identifying dental emergencies", "subtitle_ar": "دليل لتحديد حالات طوارئ الأسنان"}},
   {"template_slug": "cta-fullwidth", "locked": true, "content_override": {"title_en": "Do Not Wait — Get Help Now", "title_ar": "لا تنتظر — احصل على المساعدة الآن"}}
 ]'::jsonb,
 '{"theme": "emergency", "animations": false, "colorScheme": "bold"}'::jsonb),

-- Emergency 24/7 - Contact
('Emergency 24/7 - Contact', 'emergency-247-contact', 'Emergency contact page with prominent phone number and map', 'contact', true, false,
 'emergency-247', 'Emergency 24/7', 'Urgent dental care website with prominent booking, fast-action CTAs, and emergency contact information always visible. Designed for clinics offering 24/7 or extended hours.', 6,
 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=600&h=400&fit=crop',
 '[
   {"template_slug": "hero-centered", "locked": true, "content_override": {"title_en": "Find Us — Fast", "title_ar": "اعثر علينا — بسرعة", "subtitle_en": "Multiple locations with extended hours", "subtitle_ar": "فروع متعددة بساعات عمل ممتدة"}},
   {"template_slug": "contact-split", "locked": true},
   {"template_slug": "branches-cards", "locked": true, "content_override": {"title_en": "Nearest Emergency Location", "title_ar": "أقرب فرع طوارئ"}},
   {"template_slug": "map-full", "locked": true},
   {"template_slug": "cta-fullwidth", "locked": true, "content_override": {"title_en": "Dental Emergency Hotline: Available 24/7", "title_ar": "خط طوارئ الأسنان: متوفر 24/7"}}
 ]'::jsonb,
 '{"theme": "emergency", "animations": false, "colorScheme": "bold"}'::jsonb);


-- =============================================================================
-- Step 9: Tag existing standalone templates (Classic, Minimal, Pricing)
-- =============================================================================
UPDATE page_templates SET
  bundle_slug = 'classic-medical',
  bundle_name = 'Classic Medical',
  bundle_description = 'Traditional medical clinic homepage with comprehensive sections',
  bundle_order = 0
WHERE slug = 'classic-medical-home';

UPDATE page_templates SET
  bundle_slug = 'standalone',
  bundle_name = 'Standalone Pages',
  bundle_description = 'Individual pages that can be added to any website',
  bundle_order = 99
WHERE slug IN ('minimal-dental-home', 'pricing-page');


-- =============================================================================
-- Verification
-- =============================================================================
-- Expected: 32 total templates (8 existing + 24 new)
-- Expected: 7 bundles (modern-dental, diwadental-premium, medicpro-clean, 
--           minimal-smile, tourism-dental, pediatric-gentle, emergency-247)
--           + classic-medical (1 page) + standalone (2 pages)
