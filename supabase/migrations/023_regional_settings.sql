-- =====================================================
-- MIGRATION 023: Regional Settings & Multi-Currency Support
-- =====================================================
-- This migration adds:
-- 1. Countries reference table with phone codes, currencies
-- 2. Regional columns to patients, invoices, payments
-- 3. Regional settings in site_settings
-- =====================================================

-- =====================================================
-- 1. COUNTRIES REFERENCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS countries (
  code VARCHAR(3) PRIMARY KEY, -- ISO 3166-1 alpha-2 code
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100),
  phone_code VARCHAR(10) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  currency_name_en VARCHAR(50) NOT NULL,
  currency_name_ar VARCHAR(50),
  currency_symbol VARCHAR(10) NOT NULL,
  locale VARCHAR(10) DEFAULT 'en-US',
  flag_emoji VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_countries_active ON countries(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_countries_currency ON countries(currency_code);

-- =====================================================
-- 2. SEED COUNTRIES DATA (Common countries for dental tourism)
-- =====================================================

INSERT INTO countries (code, name_en, name_ar, phone_code, currency_code, currency_name_en, currency_name_ar, currency_symbol, locale, flag_emoji, sort_order) VALUES
  -- Middle East & North Africa (Primary markets)
  ('EG', 'Egypt', 'مصر', '+20', 'EGP', 'Egyptian Pound', 'جنيه مصري', 'E£', 'en-EG', '🇪🇬', 1),
  ('AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', '+971', 'AED', 'UAE Dirham', 'درهم إماراتي', 'د.إ', 'en-AE', '🇦🇪', 2),
  ('SA', 'Saudi Arabia', 'المملكة العربية السعودية', '+966', 'SAR', 'Saudi Riyal', 'ريال سعودي', '﷼', 'en-SA', '🇸🇦', 3),
  ('KW', 'Kuwait', 'الكويت', '+965', 'KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'د.ك', 'en-KW', '🇰🇼', 4),
  ('QA', 'Qatar', 'قطر', '+974', 'QAR', 'Qatari Riyal', 'ريال قطري', '﷼', 'en-QA', '🇶🇦', 5),
  ('BH', 'Bahrain', 'البحرين', '+973', 'BHD', 'Bahraini Dinar', 'دينار بحريني', '.د.ب', 'en-BH', '🇧🇭', 6),
  ('OM', 'Oman', 'عُمان', '+968', 'OMR', 'Omani Rial', 'ريال عماني', '﷼', 'en-OM', '🇴🇲', 7),
  ('JO', 'Jordan', 'الأردن', '+962', 'JOD', 'Jordanian Dinar', 'دينار أردني', 'د.ا', 'en-JO', '🇯🇴', 8),
  ('LB', 'Lebanon', 'لبنان', '+961', 'LBP', 'Lebanese Pound', 'ليرة لبنانية', 'ل.ل', 'en-LB', '🇱🇧', 9),
  ('IQ', 'Iraq', 'العراق', '+964', 'IQD', 'Iraqi Dinar', 'دينار عراقي', 'ع.د', 'en-IQ', '🇮🇶', 10),
  ('LY', 'Libya', 'ليبيا', '+218', 'LYD', 'Libyan Dinar', 'دينار ليبي', 'ل.د', 'ar-LY', '🇱🇾', 11),
  ('SD', 'Sudan', 'السودان', '+249', 'SDG', 'Sudanese Pound', 'جنيه سوداني', 'ج.س', 'ar-SD', '🇸🇩', 12),
  ('MA', 'Morocco', 'المغرب', '+212', 'MAD', 'Moroccan Dirham', 'درهم مغربي', 'د.م', 'ar-MA', '🇲🇦', 13),
  ('TN', 'Tunisia', 'تونس', '+216', 'TND', 'Tunisian Dinar', 'دينار تونسي', 'د.ت', 'ar-TN', '🇹🇳', 14),
  ('DZ', 'Algeria', 'الجزائر', '+213', 'DZD', 'Algerian Dinar', 'دينار جزائري', 'د.ج', 'ar-DZ', '🇩🇿', 15),
  ('PS', 'Palestine', 'فلسطين', '+970', 'ILS', 'Israeli Shekel', 'شيكل', '₪', 'ar-PS', '🇵🇸', 16),
  ('SY', 'Syria', 'سوريا', '+963', 'SYP', 'Syrian Pound', 'ليرة سورية', '£', 'ar-SY', '🇸🇾', 17),
  ('YE', 'Yemen', 'اليمن', '+967', 'YER', 'Yemeni Rial', 'ريال يمني', '﷼', 'ar-YE', '🇾🇪', 18),
  
  -- Major International
  ('US', 'United States', 'الولايات المتحدة', '+1', 'USD', 'US Dollar', 'دولار أمريكي', '$', 'en-US', '🇺🇸', 20),
  ('GB', 'United Kingdom', 'المملكة المتحدة', '+44', 'GBP', 'British Pound', 'جنيه إسترليني', '£', 'en-GB', '🇬🇧', 21),
  ('DE', 'Germany', 'ألمانيا', '+49', 'EUR', 'Euro', 'يورو', '€', 'de-DE', '🇩🇪', 22),
  ('FR', 'France', 'فرنسا', '+33', 'EUR', 'Euro', 'يورو', '€', 'fr-FR', '🇫🇷', 23),
  ('IT', 'Italy', 'إيطاليا', '+39', 'EUR', 'Euro', 'يورو', '€', 'it-IT', '🇮🇹', 24),
  ('ES', 'Spain', 'إسبانيا', '+34', 'EUR', 'Euro', 'يورو', '€', 'es-ES', '🇪🇸', 25),
  ('NL', 'Netherlands', 'هولندا', '+31', 'EUR', 'Euro', 'يورو', '€', 'nl-NL', '🇳🇱', 26),
  ('BE', 'Belgium', 'بلجيكا', '+32', 'EUR', 'Euro', 'يورو', '€', 'nl-BE', '🇧🇪', 27),
  ('AT', 'Austria', 'النمسا', '+43', 'EUR', 'Euro', 'يورو', '€', 'de-AT', '🇦🇹', 28),
  ('CH', 'Switzerland', 'سويسرا', '+41', 'CHF', 'Swiss Franc', 'فرنك سويسري', 'CHF', 'de-CH', '🇨🇭', 29),
  ('SE', 'Sweden', 'السويد', '+46', 'SEK', 'Swedish Krona', 'كرونا سويدية', 'kr', 'sv-SE', '🇸🇪', 30),
  ('NO', 'Norway', 'النرويج', '+47', 'NOK', 'Norwegian Krone', 'كرونا نرويجية', 'kr', 'no-NO', '🇳🇴', 31),
  ('DK', 'Denmark', 'الدنمارك', '+45', 'DKK', 'Danish Krone', 'كرونا دنماركية', 'kr', 'da-DK', '🇩🇰', 32),
  
  -- Other Common
  ('CA', 'Canada', 'كندا', '+1', 'CAD', 'Canadian Dollar', 'دولار كندي', 'C$', 'en-CA', '🇨🇦', 40),
  ('AU', 'Australia', 'أستراليا', '+61', 'AUD', 'Australian Dollar', 'دولار أسترالي', 'A$', 'en-AU', '🇦🇺', 41),
  ('NZ', 'New Zealand', 'نيوزيلندا', '+64', 'NZD', 'New Zealand Dollar', 'دولار نيوزيلندي', 'NZ$', 'en-NZ', '🇳🇿', 42),
  ('TR', 'Turkey', 'تركيا', '+90', 'TRY', 'Turkish Lira', 'ليرة تركية', '₺', 'tr-TR', '🇹🇷', 43),
  ('RU', 'Russia', 'روسيا', '+7', 'RUB', 'Russian Ruble', 'روبل روسي', '₽', 'ru-RU', '🇷🇺', 44),
  ('IN', 'India', 'الهند', '+91', 'INR', 'Indian Rupee', 'روبية هندية', '₹', 'en-IN', '🇮🇳', 45),
  ('PK', 'Pakistan', 'باكستان', '+92', 'PKR', 'Pakistani Rupee', 'روبية باكستانية', '₨', 'en-PK', '🇵🇰', 46),
  ('CN', 'China', 'الصين', '+86', 'CNY', 'Chinese Yuan', 'يوان صيني', '¥', 'zh-CN', '🇨🇳', 47),
  ('JP', 'Japan', 'اليابان', '+81', 'JPY', 'Japanese Yen', 'ين ياباني', '¥', 'ja-JP', '🇯🇵', 48),
  ('KR', 'South Korea', 'كوريا الجنوبية', '+82', 'KRW', 'South Korean Won', 'وون كوري', '₩', 'ko-KR', '🇰🇷', 49),
  ('SG', 'Singapore', 'سنغافورة', '+65', 'SGD', 'Singapore Dollar', 'دولار سنغافوري', 'S$', 'en-SG', '🇸🇬', 50),
  ('MY', 'Malaysia', 'ماليزيا', '+60', 'MYR', 'Malaysian Ringgit', 'رينغيت ماليزي', 'RM', 'ms-MY', '🇲🇾', 51),
  ('ID', 'Indonesia', 'إندونيسيا', '+62', 'IDR', 'Indonesian Rupiah', 'روبية إندونيسية', 'Rp', 'id-ID', '🇮🇩', 52),
  ('TH', 'Thailand', 'تايلاند', '+66', 'THB', 'Thai Baht', 'بات تايلاندي', '฿', 'th-TH', '🇹🇭', 53),
  ('PH', 'Philippines', 'الفلبين', '+63', 'PHP', 'Philippine Peso', 'بيزو فلبيني', '₱', 'en-PH', '🇵🇭', 54),
  ('ZA', 'South Africa', 'جنوب أفريقيا', '+27', 'ZAR', 'South African Rand', 'راند جنوب أفريقي', 'R', 'en-ZA', '🇿🇦', 55),
  ('BR', 'Brazil', 'البرازيل', '+55', 'BRL', 'Brazilian Real', 'ريال برازيلي', 'R$', 'pt-BR', '🇧🇷', 56),
  ('MX', 'Mexico', 'المكسيك', '+52', 'MXN', 'Mexican Peso', 'بيزو مكسيكي', '$', 'es-MX', '🇲🇽', 57),
  ('NG', 'Nigeria', 'نيجيريا', '+234', 'NGN', 'Nigerian Naira', 'نيرة نيجيرية', '₦', 'en-NG', '🇳🇬', 58),
  ('GH', 'Ghana', 'غانا', '+233', 'GHS', 'Ghanaian Cedi', 'سيدي غاني', '₵', 'en-GH', '🇬🇭', 59),
  ('KE', 'Kenya', 'كينيا', '+254', 'KES', 'Kenyan Shilling', 'شلن كيني', 'KSh', 'en-KE', '🇰🇪', 60)
ON CONFLICT (code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  phone_code = EXCLUDED.phone_code,
  currency_code = EXCLUDED.currency_code,
  currency_name_en = EXCLUDED.currency_name_en,
  currency_name_ar = EXCLUDED.currency_name_ar,
  currency_symbol = EXCLUDED.currency_symbol,
  locale = EXCLUDED.locale,
  flag_emoji = EXCLUDED.flag_emoji,
  sort_order = EXCLUDED.sort_order;

-- =====================================================
-- 3. CURRENCIES TABLE (Unique currencies with exchange rates)
-- =====================================================

CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name_en VARCHAR(50) NOT NULL,
  name_ar VARCHAR(50),
  symbol VARCHAR(10) NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  exchange_rate_to_base DECIMAL(15, 6) DEFAULT 1.0, -- Rate to clinic's base currency
  last_rate_update TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed currencies
INSERT INTO currencies (code, name_en, name_ar, symbol, decimal_places, exchange_rate_to_base) VALUES
  ('EGP', 'Egyptian Pound', 'جنيه مصري', 'E£', 2, 1.0),
  ('USD', 'US Dollar', 'دولار أمريكي', '$', 2, 50.0),
  ('EUR', 'Euro', 'يورو', '€', 2, 54.0),
  ('GBP', 'British Pound', 'جنيه إسترليني', '£', 2, 63.0),
  ('AED', 'UAE Dirham', 'درهم إماراتي', 'د.إ', 2, 13.6),
  ('SAR', 'Saudi Riyal', 'ريال سعودي', '﷼', 2, 13.3),
  ('KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'د.ك', 3, 163.0),
  ('QAR', 'Qatari Riyal', 'ريال قطري', '﷼', 2, 13.7),
  ('BHD', 'Bahraini Dinar', 'دينار بحريني', '.د.ب', 3, 132.5),
  ('OMR', 'Omani Rial', 'ريال عماني', '﷼', 3, 129.9),
  ('JOD', 'Jordanian Dinar', 'دينار أردني', 'د.ا', 3, 70.5),
  ('CAD', 'Canadian Dollar', 'دولار كندي', 'C$', 2, 37.0),
  ('AUD', 'Australian Dollar', 'دولار أسترالي', 'A$', 2, 33.0),
  ('CHF', 'Swiss Franc', 'فرنك سويسري', 'CHF', 2, 56.0),
  ('TRY', 'Turkish Lira', 'ليرة تركية', '₺', 2, 1.5)
ON CONFLICT (code) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  symbol = EXCLUDED.symbol,
  exchange_rate_to_base = EXCLUDED.exchange_rate_to_base;

-- =====================================================
-- 4. ADD REGIONAL COLUMNS TO PATIENTS
-- =====================================================

ALTER TABLE patients ADD COLUMN IF NOT EXISTS country_code VARCHAR(3) REFERENCES countries(code);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(10) DEFAULT '+20';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3) REFERENCES currencies(code);

-- Index for filtering patients by country
CREATE INDEX IF NOT EXISTS idx_patients_country ON patients(country_code);

-- =====================================================
-- 5. ADD CURRENCY COLUMNS TO INVOICES
-- =====================================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(3) REFERENCES currencies(code);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1.0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS base_currency_total DECIMAL(12, 2); -- Total in clinic's base currency

-- =====================================================
-- 6. ADD CURRENCY COLUMNS TO PAYMENTS
-- =====================================================

-- Check if payments table exists first
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(3);
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1.0;
    ALTER TABLE payments ADD COLUMN IF NOT EXISTS base_currency_amount DECIMAL(12, 2);
  END IF;
END $$;

-- =====================================================
-- 7. ADD REGIONAL SETTINGS TO SITE_SETTINGS
-- =====================================================

INSERT INTO site_settings (key, value) VALUES
  ('regional', '{
    "default_country": "EG",
    "default_currency": "EGP",
    "base_currency": "EGP",
    "timezone": "Africa/Cairo",
    "date_format": "DD/MM/YYYY",
    "time_format": "12h",
    "accepted_currencies": ["EGP", "USD", "EUR", "GBP", "AED", "SAR"],
    "show_currency_symbol": true,
    "currency_position": "before"
  }')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

-- Countries are public read
CREATE POLICY "Anyone can view countries" ON countries FOR SELECT USING (true);
CREATE POLICY "Admins can manage countries" ON countries FOR ALL USING (is_admin_or_developer());

-- Currencies are public read
CREATE POLICY "Anyone can view currencies" ON currencies FOR SELECT USING (true);
CREATE POLICY "Admins can manage currencies" ON currencies FOR ALL USING (is_admin_or_developer());

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Function to convert amount between currencies
CREATE OR REPLACE FUNCTION convert_currency(
  p_amount DECIMAL,
  p_from_currency VARCHAR(3),
  p_to_currency VARCHAR(3)
) RETURNS DECIMAL AS $$
DECLARE
  v_from_rate DECIMAL;
  v_to_rate DECIMAL;
BEGIN
  -- Get exchange rates (rates are stored as rate to base currency)
  SELECT exchange_rate_to_base INTO v_from_rate FROM currencies WHERE code = p_from_currency;
  SELECT exchange_rate_to_base INTO v_to_rate FROM currencies WHERE code = p_to_currency;
  
  IF v_from_rate IS NULL OR v_to_rate IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convert: amount * from_rate gives base currency, then divide by to_rate
  RETURN ROUND((p_amount * v_from_rate) / v_to_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to format currency amount
CREATE OR REPLACE FUNCTION format_currency(
  p_amount DECIMAL,
  p_currency_code VARCHAR(3)
) RETURNS TEXT AS $$
DECLARE
  v_symbol VARCHAR(10);
  v_decimals INTEGER;
BEGIN
  SELECT symbol, decimal_places INTO v_symbol, v_decimals 
  FROM currencies WHERE code = p_currency_code;
  
  IF v_symbol IS NULL THEN
    v_symbol := p_currency_code;
    v_decimals := 2;
  END IF;
  
  RETURN v_symbol || ' ' || TO_CHAR(p_amount, 'FM999,999,999.' || REPEAT('0', v_decimals));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. TRIGGERS
-- =====================================================

-- Update currencies updated_at
CREATE TRIGGER update_currencies_updated_at 
  BEFORE UPDATE ON currencies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_countries_count INTEGER;
  v_currencies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_countries_count FROM countries;
  SELECT COUNT(*) INTO v_currencies_count FROM currencies;
  
  RAISE NOTICE '✅ Migration 023 completed successfully';
  RAISE NOTICE '   - Countries: % records', v_countries_count;
  RAISE NOTICE '   - Currencies: % records', v_currencies_count;
  RAISE NOTICE '   - Patients table updated with regional columns';
  RAISE NOTICE '   - Invoices table updated with currency columns';
  RAISE NOTICE '   - Regional settings added to site_settings';
END $$;
