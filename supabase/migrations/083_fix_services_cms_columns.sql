-- =============================================
-- Migration 083: Fix services table for CMS admin
-- =============================================
-- The admin ServiceForm uses CMS-style columns (title_en, category, etc.)
-- but the services table was created with clinical columns (name_en, category_id, etc.)
-- This migration adds the missing CMS columns so the admin pages work correctly.

-- Add CMS-style columns that the admin ServiceForm/ServiceList expect
ALTER TABLE services ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS short_description_en TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS short_description_ar TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_from DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_to DECIMAL(10,2);
ALTER TABLE services ADD COLUMN IF NOT EXISTS features_en JSONB DEFAULT '[]'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS features_ar JSONB DEFAULT '[]'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Backfill: copy existing name_en/name_ar into title_en/title_ar for any existing rows
UPDATE services SET title_en = name_en WHERE title_en IS NULL AND name_en IS NOT NULL;
UPDATE services SET title_ar = name_ar WHERE title_ar IS NULL AND name_ar IS NOT NULL;

-- Backfill: copy sort_order to display_order
UPDATE services SET display_order = sort_order WHERE display_order = 0 AND sort_order > 0;

-- Backfill: copy price_min/price_max to price_from/price_to
UPDATE services SET price_from = price_min WHERE price_from IS NULL AND price_min IS NOT NULL;
UPDATE services SET price_to = price_max WHERE price_to IS NULL AND price_max IS NOT NULL;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_featured ON services(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);

-- =============================================
-- Seed default services for existing tenants
-- =============================================
-- Insert sample services for each tenant that has no services yet
INSERT INTO services (tenant_id, title_en, title_ar, name_en, name_ar, description_en, description_ar, short_description_en, short_description_ar, image_url, category, is_featured, is_active, display_order, duration_minutes)
SELECT 
  t.id,
  'General Dentistry',
  'طب الأسنان العام',
  'General Dentistry',
  'طب الأسنان العام',
  'Comprehensive dental care including cleanings, fillings, and preventive treatments to maintain your oral health.',
  'رعاية أسنان شاملة تشمل التنظيف والحشوات والعلاجات الوقائية للحفاظ على صحة فمك.',
  'Complete dental care for the whole family',
  'رعاية أسنان كاملة لجميع أفراد العائلة',
  'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&h=400&fit=crop',
  'general',
  true,
  true,
  1,
  45
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id)
LIMIT 1;

INSERT INTO services (tenant_id, title_en, title_ar, name_en, name_ar, description_en, description_ar, short_description_en, short_description_ar, image_url, category, is_featured, is_active, display_order, duration_minutes)
SELECT 
  t.id,
  'Cosmetic Dentistry',
  'تجميل الأسنان',
  'Cosmetic Dentistry',
  'تجميل الأسنان',
  'Transform your smile with our cosmetic treatments including veneers, bonding, and smile makeovers tailored to your needs.',
  'حوّل ابتسامتك مع علاجاتنا التجميلية بما في ذلك القشور والترابط وتجميل الابتسامة المصممة لاحتياجاتك.',
  'Veneers, bonding, and smile makeovers',
  'قشور، ترابط، وتجميل الابتسامة',
  'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=400&fit=crop',
  'cosmetic',
  true,
  true,
  2,
  60
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id AND s.title_en = 'Cosmetic Dentistry')
AND EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id)
LIMIT 1;

INSERT INTO services (tenant_id, title_en, title_ar, name_en, name_ar, description_en, description_ar, short_description_en, short_description_ar, image_url, category, is_featured, is_active, display_order, duration_minutes)
SELECT 
  t.id,
  'Dental Implants',
  'زراعة الأسنان',
  'Dental Implants',
  'زراعة الأسنان',
  'Permanent tooth replacement with state-of-the-art implant technology. Natural-looking results that last a lifetime.',
  'استبدال دائم للأسنان بأحدث تقنيات الزراعة. نتائج طبيعية تدوم مدى الحياة.',
  'Permanent, natural-looking tooth replacement',
  'استبدال دائم وطبيعي للأسنان',
  'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=600&h=400&fit=crop',
  'surgical',
  true,
  true,
  3,
  90
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id AND s.title_en = 'Dental Implants')
AND EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id)
LIMIT 1;

INSERT INTO services (tenant_id, title_en, title_ar, name_en, name_ar, description_en, description_ar, short_description_en, short_description_ar, image_url, category, is_featured, is_active, display_order, duration_minutes)
SELECT 
  t.id,
  'Orthodontics',
  'تقويم الأسنان',
  'Orthodontics',
  'تقويم الأسنان',
  'Straighten your teeth with traditional braces or clear aligners. Customized treatment plans for all ages.',
  'قوّم أسنانك بالتقويم التقليدي أو الشفاف. خطط علاج مخصصة لجميع الأعمار.',
  'Braces and clear aligners for all ages',
  'تقويم وأجهزة شفافة لجميع الأعمار',
  'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=600&h=400&fit=crop',
  'orthodontics',
  false,
  true,
  4,
  30
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id AND s.title_en = 'Orthodontics')
AND EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id)
LIMIT 1;

INSERT INTO services (tenant_id, title_en, title_ar, name_en, name_ar, description_en, description_ar, short_description_en, short_description_ar, image_url, category, is_featured, is_active, display_order, duration_minutes)
SELECT 
  t.id,
  'Teeth Whitening',
  'تبييض الأسنان',
  'Teeth Whitening',
  'تبييض الأسنان',
  'Professional teeth whitening treatments for a brighter, more confident smile. Safe and effective results in just one visit.',
  'علاجات تبييض أسنان احترافية لابتسامة أكثر إشراقًا وثقة. نتائج آمنة وفعالة في زيارة واحدة.',
  'Professional whitening for a brighter smile',
  'تبييض احترافي لابتسامة أكثر إشراقًا',
  'https://images.unsplash.com/photo-1606265752439-1f18756aa5fc?w=600&h=400&fit=crop',
  'cosmetic',
  false,
  true,
  5,
  60
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id AND s.title_en = 'Teeth Whitening')
AND EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id)
LIMIT 1;

INSERT INTO services (tenant_id, title_en, title_ar, name_en, name_ar, description_en, description_ar, short_description_en, short_description_ar, image_url, category, is_featured, is_active, display_order, duration_minutes)
SELECT 
  t.id,
  'Root Canal Treatment',
  'علاج قناة الجذر',
  'Root Canal Treatment',
  'علاج قناة الجذر',
  'Save your natural tooth with our painless root canal therapy. Advanced techniques ensure comfort and fast recovery.',
  'حافظ على أسنانك الطبيعية مع علاج قناة الجذر بدون ألم. تقنيات متقدمة تضمن الراحة والتعافي السريع.',
  'Painless root canal therapy',
  'علاج قناة الجذر بدون ألم',
  'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&h=400&fit=crop',
  'general',
  false,
  true,
  6,
  75
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id AND s.title_en = 'Root Canal Treatment')
AND EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id)
LIMIT 1;

INSERT INTO services (tenant_id, title_en, title_ar, name_en, name_ar, description_en, description_ar, short_description_en, short_description_ar, image_url, category, is_featured, is_active, display_order, duration_minutes)
SELECT 
  t.id,
  'Oral Surgery',
  'جراحة الفم',  
  'Oral Surgery',
  'جراحة الفم',
  'Expert oral surgery including wisdom tooth extraction, bone grafting, and jaw surgery performed by experienced surgeons.',
  'جراحة فم متخصصة تشمل خلع ضرس العقل وترقيع العظام وجراحة الفك على يد جراحين ذوي خبرة.',
  'Wisdom teeth, bone grafts, and more',
  'ضرس العقل، ترقيع العظام، والمزيد',
  'https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=600&h=400&fit=crop',
  'surgical',
  false,
  true,
  7,
  90
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id AND s.title_en = 'Oral Surgery')
AND EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id)
LIMIT 1;

INSERT INTO services (tenant_id, title_en, title_ar, name_en, name_ar, description_en, description_ar, short_description_en, short_description_ar, image_url, category, is_featured, is_active, display_order, duration_minutes)
SELECT 
  t.id,
  'Pediatric Dentistry',
  'طب أسنان الأطفال',
  'Pediatric Dentistry',
  'طب أسنان الأطفال',
  'Gentle, child-friendly dental care in a fun environment. From first tooth to teen years, we make dental visits enjoyable.',
  'رعاية أسنان لطيفة ومناسبة للأطفال في بيئة ممتعة. من أول سن حتى سنوات المراهقة، نجعل زيارات الأسنان ممتعة.',
  'Fun, gentle dental care for kids',
  'رعاية أسنان لطيفة وممتعة للأطفال',
  'https://images.unsplash.com/photo-1588776813677-77aaf5595b83?w=600&h=400&fit=crop',
  'pediatric',
  false,
  true,
  8,
  30
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id AND s.title_en = 'Pediatric Dentistry')
AND EXISTS (SELECT 1 FROM services s WHERE s.tenant_id = t.id)
LIMIT 1;
