-- Seed Canine Clinic Content into Database
-- Services, Testimonials, Portfolio Cases, Tourism Packages
-- This makes all website content admin-editable

-- ============================================
-- 1. SERVICES (6 items)
-- ============================================
INSERT INTO services (id, name_en, name_ar, description_en, description_ar, image_url, sort_order, is_active, is_featured, show_on_website, website_sort_order, icon, description_long_en, description_long_ar)
VALUES
  (
    gen_random_uuid(),
    'General Dentistry',
    'طب الأسنان العام',
    'Comprehensive care for your daily dental needs',
    'رعاية شاملة لاحتياجاتك اليومية للأسنان',
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=400&fit=crop',
    1, true, true, true, 1,
    'tooth',
    'Regular Check-ups & Cleaning, Dental Fillings, Tooth Extractions, Periodontal Treatment, Fluoride Treatment, Dental Sealants',
    'الفحوصات الدورية والتنظيف، حشوات الأسنان، خلع الأسنان، علاج اللثة، علاج الفلورايد، حشوات الأسنان الوقائية'
  ),
  (
    gen_random_uuid(),
    'Cosmetic Dentistry',
    'طب الأسنان التجميلي',
    'Transform your smile with aesthetic treatments',
    'حول ابتسامتك بعلاجات تجميلية متميزة',
    'https://images.unsplash.com/photo-1606265752439-1f18756aa5fc?w=400&h=400&fit=crop',
    2, true, true, true, 2,
    'sparkles',
    'Teeth Whitening, Porcelain Veneers, Dental Bonding, Smile Makeover, Gum Contouring, Composite Fillings',
    'تبييض الأسنان، قشور البورسلين، ترميم الأسنان، تجميل الابتسامة، تجميل اللثة، الحشوات التجميلية'
  ),
  (
    gen_random_uuid(),
    'Restorative Dentistry',
    'طب الأسنان الترميمي',
    'Restore function and beauty to damaged teeth',
    'استعادة الوظيفة والجمال للأسنان المتضررة',
    'https://images.unsplash.com/photo-1579684453423-f84349ef60b0?w=400&h=400&fit=crop',
    3, true, true, true, 3,
    'wrench',
    'Dental Crowns & Bridges, Dental Implants, Dentures, Inlays & Onlays, Full Mouth Reconstruction, Implant-Supported Dentures',
    'التيجان والجسور، زراعة الأسنان، أطقم الأسنان، الحشوات الداخلية والخارجية، إعادة بناء الفم الكامل، أطقم الأسنان المدعومة بالزرعات'
  ),
  (
    gen_random_uuid(),
    'Orthodontics',
    'تقويم الأسنان',
    'Straighten your teeth for a perfect smile',
    'قوّم أسنانك للحصول على ابتسامة مثالية',
    'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&h=400&fit=crop',
    4, true, true, true, 4,
    'align-center',
    'Traditional Braces, Clear Aligners, Invisalign, Retainers, Early Orthodontic Treatment, Adult Orthodontics',
    'التقويم التقليدي، التقويم الشفاف، إنفيزلاين، المثبتات، علاج تقويم مبكر، تقويم الكبار'
  ),
  (
    gen_random_uuid(),
    'Pediatric Dentistry',
    'طب أسنان الأطفال',
    'Specialized care for children''s dental health',
    'رعاية متخصصة لصحة أسنان الأطفال',
    'https://images.unsplash.com/photo-1514849302-984523450cf4?w=400&h=400&fit=crop',
    5, true, false, true, 5,
    'baby',
    'Children''s Dental Exams, Preventive Care, Fluoride Treatment, Dental Sealants, Cavity Treatment, Emergency Dental Care',
    'فحص أسنان الأطفال، الرعاية الوقائية، علاج الفلورايد، الحشوات الوقائية، علاج التسوس، رعاية الطوارئ'
  ),
  (
    gen_random_uuid(),
    'Advanced Procedures',
    'الإجراءات المتقدمة',
    'Cutting-edge treatments for complex cases',
    'علاجات متطورة للحالات المعقدة',
    'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400&h=400&fit=crop',
    6, true, false, true, 6,
    'zap',
    'Root Canal Therapy, Wisdom Teeth Removal, Bone Grafting, Sinus Lift, All-on-4 Implants, Laser Dentistry',
    'علاج جذور الأسنان، خلع ضرس العقل، زراعة العظام، رفع الجيب الأنفي، زراعة الكل على أربعة، طب الأسنان بالليزر'
  );

-- ============================================
-- 2. TESTIMONIALS (6 items)
-- ============================================
INSERT INTO testimonials (id, patient_name_en, patient_name_ar, treatment_en, treatment_ar, text_en, text_ar, rating, location, date, is_featured, is_active, display_order)
VALUES
  (
    gen_random_uuid(),
    'Sarah Mitchell',
    'سارة ميتشل',
    'Dental Implants',
    'زراعة الأسنان',
    'The team at Canine Clinic transformed my smile completely! I was nervous about getting implants, but they made the entire process comfortable and painless. The results exceeded my expectations.',
    'فريق كانين كلينيك غيّر ابتسامتي تماماً! كنت قلقة من الزراعة، لكنهم جعلوا العملية مريحة وبدون ألم. النتائج فاقت توقعاتي.',
    5,
    'New York, USA',
    '2025-12-01',
    true, true, 1
  ),
  (
    gen_random_uuid(),
    'James Anderson',
    'جيمس أندرسون',
    'Teeth Whitening',
    'تبييض الأسنان',
    'Amazing results! My teeth are now several shades whiter, and the procedure was quick and painless. The staff was professional and friendly throughout.',
    'نتائج مذهلة! أسناني الآن أفتح بعدة درجات، والإجراء كان سريعاً وبدون ألم. الطاقم كان محترفاً وودوداً طوال الوقت.',
    5,
    'London, UK',
    '2025-11-01',
    true, true, 2
  ),
  (
    gen_random_uuid(),
    'Maria Garcia',
    'ماريا غارسيا',
    'Orthodontics',
    'تقويم الأسنان',
    'After years of being self-conscious about my crooked teeth, I finally got braces at Canine Clinic. The journey was worth it! My smile looks perfect now, and I cannot thank them enough.',
    'بعد سنوات من الخجل من أسناني المعوجة، أخيراً حصلت على تقويم في كانين كلينيك. الرحلة كانت تستحق! ابتسامتي الآن مثالية.',
    5,
    'Madrid, Spain',
    '2025-10-01',
    false, true, 3
  ),
  (
    gen_random_uuid(),
    'David Chen',
    'ديفيد تشين',
    'Full Smile Makeover',
    'تجميل الابتسامة الكامل',
    'I came to Canine Clinic for dental tourism and received a complete smile makeover. Not only did I save money, but I also got exceptional care. Highly recommend their services!',
    'جئت إلى كانين كلينيك للسياحة العلاجية وحصلت على تجميل كامل للابتسامة. ليس فقط وفرت المال، بل حصلت على رعاية استثنائية. أوصي بشدة!',
    5,
    'Singapore',
    '2025-09-01',
    true, true, 4
  ),
  (
    gen_random_uuid(),
    'Emma Thompson',
    'إيما طومسون',
    'Root Canal Treatment',
    'علاج الجذور',
    'I was terrified of getting a root canal, but the doctor made it completely painless. The advanced technology they use is impressive. I felt no discomfort at all!',
    'كنت مرعوبة من علاج الجذور، لكن الدكتور جعلها بدون ألم تماماً. التقنية المتقدمة المستخدمة مثيرة للإعجاب. لم أشعر بأي انزعاج!',
    5,
    'Sydney, Australia',
    '2025-08-01',
    false, true, 5
  ),
  (
    gen_random_uuid(),
    'Michael Brown',
    'مايكل براون',
    'Veneers',
    'الفينير',
    'My veneers look absolutely natural! The attention to detail and craftsmanship is outstanding. I smile with confidence now, all thanks to Canine Clinic.',
    'الفينير يبدو طبيعياً تماماً! الاهتمام بالتفاصيل والحرفية متميزة. أبتسم بثقة الآن، كل الشكر لكانين كلينيك.',
    5,
    'Toronto, Canada',
    '2025-07-01',
    true, true, 6
  );

-- ============================================
-- 3. PORTFOLIO CASES (6 items)
-- ============================================
INSERT INTO portfolio_cases (id, title_en, title_ar, description_en, description_ar, category, duration, is_featured, is_active)
VALUES
  (
    gen_random_uuid(),
    'Complete Smile Transformation',
    'تحول ابتسامة كامل',
    'Porcelain veneers for a Hollywood smile',
    'قشور بورسلين لابتسامة هوليوود',
    'veneers',
    '2 weeks',
    true, true
  ),
  (
    gen_random_uuid(),
    'Full Arch Restoration',
    'ترميم القوس الكامل',
    'All-on-4 dental implants',
    'زراعة الكل على أربعة',
    'implants',
    '3 months',
    true, true
  ),
  (
    gen_random_uuid(),
    'Professional Teeth Whitening',
    'تبييض أسنان احترافي',
    'Laser whitening treatment',
    'علاج التبييض بالليزر',
    'whitening',
    '1 hour',
    false, true
  ),
  (
    gen_random_uuid(),
    'Invisalign Treatment',
    'علاج إنفيزلاين',
    'Clear aligner therapy',
    'علاج بالتقويم الشفاف',
    'orthodontics',
    '12 months',
    false, true
  ),
  (
    gen_random_uuid(),
    'Front Teeth Makeover',
    'تجميل الأسنان الأمامية',
    '6 porcelain veneers',
    '6 قشور بورسلين',
    'veneers',
    '3 weeks',
    true, true
  ),
  (
    gen_random_uuid(),
    'Crown & Bridge Work',
    'أعمال التاج والجسر',
    'Multiple crowns and bridges',
    'تيجان وجسور متعددة',
    'restoration',
    '6 weeks',
    false, true
  );

-- ============================================
-- 4. TOURISM PACKAGES (3 items)
-- ============================================
INSERT INTO tourism_packages (id, name_en, name_ar, description_en, description_ar, duration_days, includes_json, price_usd, sort_order, is_active)
VALUES
  (
    gen_random_uuid(),
    'Smile Makeover Package',
    'باقة تجميل الابتسامة',
    'Complete smile transformation with veneers, whitening, and luxury accommodation.',
    'تحول كامل للابتسامة مع قشور البورسلين والتبييض وإقامة فاخرة.',
    10,
    '{"en": ["Initial Consultation & Exam", "Dental Cleaning", "Teeth Whitening", "Porcelain Veneers (6-8 teeth)", "Airport Transfer", "5-Star Hotel Stay", "City Tour"], "ar": ["استشارة وفحص أولي", "تنظيف الأسنان", "تبييض الأسنان", "قشور البورسلين (6-8 أسنان)", "النقل من المطار", "إقامة فندق 5 نجوم", "جولة سياحية"]}'::jsonb,
    3500,
    1, true
  ),
  (
    gen_random_uuid(),
    'Dental Implant Package',
    'باقة زراعة الأسنان',
    'Professional dental implant treatment with comprehensive care and comfortable stay.',
    'علاج زراعة أسنان احترافي مع رعاية شاملة وإقامة مريحة.',
    7,
    '{"en": ["Comprehensive Evaluation", "3D Imaging & Planning", "Single/Multiple Implants", "Temporary Crown", "Airport Transfer", "Hotel Accommodation", "Post-Op Care Kit"], "ar": ["تقييم شامل", "تصوير ثلاثي الأبعاد والتخطيط", "زراعة واحدة/متعددة", "تاج مؤقت", "النقل من المطار", "إقامة فندقية", "مجموعة الرعاية بعد العملية"]}'::jsonb,
    2500,
    2, true
  ),
  (
    gen_random_uuid(),
    'Complete Restoration Package',
    'باقة الترميم الكامل',
    'Full mouth rehabilitation with All-on-4/6 implants and luxury accommodation.',
    'إعادة تأهيل كامل للفم بزراعة الكل على 4/6 مع إقامة فاخرة.',
    14,
    '{"en": ["Full Dental Assessment", "Digital Smile Design", "All-on-4/All-on-6 Implants", "Temporary Prosthesis", "Airport Transfer", "Luxury Hotel Stay", "Guided Tours", "Nutritional Support"], "ar": ["تقييم شامل للأسنان", "تصميم الابتسامة الرقمي", "زراعة الكل على 4/6", "طقم مؤقت", "النقل من المطار", "إقامة فندق فاخر", "جولات سياحية", "دعم غذائي"]}'::jsonb,
    6500,
    3, true
  );
