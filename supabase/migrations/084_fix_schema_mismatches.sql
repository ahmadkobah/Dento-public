-- ============================================================================
-- Migration 084: Fix Schema Mismatches (Repairplan Phase 1)
-- Adds missing columns that frontend code expects but DB doesn't have
-- Fixes UNIQUE constraints for multi-tenant support
-- Creates missing tables (contact_submissions, contact_settings)
-- Fixes RLS policies for proper tenant isolation
-- ============================================================================

-- ============================================================================
-- 1.1 TESTIMONIALS — Add columns the code expects
-- DB has: patient_name_en, text_en, text_ar, treatment_en, photo_url
-- Code needs: patient_name, content_en, content_ar, treatment_type, patient_avatar,
--             doctor_id, branch_id, is_approved
-- ============================================================================

ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS patient_avatar TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS content_en TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS content_ar TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS treatment_type TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Backfill from existing columns where possible
UPDATE testimonials SET patient_name = patient_name_en WHERE patient_name IS NULL AND patient_name_en IS NOT NULL;
UPDATE testimonials SET content_en = text_en WHERE content_en IS NULL AND text_en IS NOT NULL;
UPDATE testimonials SET content_ar = text_ar WHERE content_ar IS NULL AND text_ar IS NOT NULL;
UPDATE testimonials SET treatment_type = treatment_en WHERE treatment_type IS NULL AND treatment_en IS NOT NULL;
UPDATE testimonials SET patient_avatar = photo_url WHERE patient_avatar IS NULL AND photo_url IS NOT NULL;
UPDATE testimonials SET is_approved = true WHERE is_approved IS NULL;

-- ============================================================================
-- 1.2 TRANSLATIONS — Add columns the code expects
-- DB has: en, ar, page, section (+ UNIQUE on key alone)
-- Code needs: value_en, value_ar, category (+ UNIQUE on tenant_id, key)
-- ============================================================================

ALTER TABLE translations ADD COLUMN IF NOT EXISTS value_en TEXT;
ALTER TABLE translations ADD COLUMN IF NOT EXISTS value_ar TEXT;
ALTER TABLE translations ADD COLUMN IF NOT EXISTS category TEXT;

-- Backfill from existing columns
UPDATE translations SET value_en = en WHERE value_en IS NULL AND en IS NOT NULL;
UPDATE translations SET value_ar = ar WHERE value_ar IS NULL AND ar IS NOT NULL;
UPDATE translations SET category = page WHERE category IS NULL AND page IS NOT NULL;

-- Fix UNIQUE constraint: key alone → (tenant_id, key) for multi-tenant
DO $$
BEGIN
  -- Drop any single-column unique on key
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'translations'::regclass 
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'translations'::regclass AND attname = 'key')
  ) THEN
    -- Find and drop the constraint by name
    EXECUTE (
      SELECT 'ALTER TABLE translations DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint
      WHERE conrelid = 'translations'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'translations'::regclass AND attname = 'key')
      LIMIT 1
    );
  END IF;
END $$;

-- Add multi-tenant unique constraint (safe — won't fail if it already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'translations'::regclass 
    AND conname = 'translations_tenant_key_unique'
  ) THEN
    ALTER TABLE translations ADD CONSTRAINT translations_tenant_key_unique UNIQUE (tenant_id, key);
  END IF;
END $$;

-- ============================================================================
-- 1.3 TOURISM_PACKAGES — Add columns the code expects
-- DB has: duration_days, price_usd, includes_json
-- Code needs: duration, price_from, price_to, includes_en, includes_ar, is_featured
-- ============================================================================

ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS price_from DECIMAL(10,2);
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS price_to DECIMAL(10,2);
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS includes_en JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS includes_ar JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tourism_packages ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Backfill from existing columns
UPDATE tourism_packages SET duration = duration_days::text WHERE duration IS NULL AND duration_days IS NOT NULL;
UPDATE tourism_packages SET price_from = price_usd WHERE price_from IS NULL AND price_usd IS NOT NULL;
UPDATE tourism_packages SET includes_en = includes_json WHERE includes_en = '[]'::jsonb AND includes_json IS NOT NULL;

-- ============================================================================
-- 1.4 WEBSITE_SETTINGS — Add JSONB columns for Dev Portal pages
-- Code writes: animation_settings, button_card_styles, integration_settings, domain_settings
-- These columns don't exist yet
-- ============================================================================

ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS animation_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS button_card_styles JSONB DEFAULT '{}'::jsonb;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS integration_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS domain_settings JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- 1.5 SITE_SETTINGS — Fix UNIQUE constraint for multi-tenant
-- Current: UNIQUE(key) — blocks multiple tenants from having same key
-- Needed: UNIQUE(tenant_id, key)
-- ============================================================================

DO $$
BEGIN
  -- Drop single-column unique on key
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'site_settings'::regclass 
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'site_settings'::regclass AND attname = 'key')
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE site_settings DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint
      WHERE conrelid = 'site_settings'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'site_settings'::regclass AND attname = 'key')
      LIMIT 1
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'site_settings'::regclass 
    AND conname = 'site_settings_tenant_key_unique'
  ) THEN
    ALTER TABLE site_settings ADD CONSTRAINT site_settings_tenant_key_unique UNIQUE (tenant_id, key);
  END IF;
END $$;

-- ============================================================================
-- 1.6a CONTACT_SUBMISSIONS — Create missing table
-- src/public/pages/ContactPage.jsx inserts into this table
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Public can submit (anon insert)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_submissions' AND policyname = 'contact_submissions_anon_insert') THEN
    CREATE POLICY contact_submissions_anon_insert ON contact_submissions
      FOR INSERT TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- Authenticated users can manage their tenant's submissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_submissions' AND policyname = 'contact_submissions_tenant_access') THEN
    CREATE POLICY contact_submissions_tenant_access ON contact_submissions
      FOR ALL TO authenticated
      USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());
  END IF;
END $$;

-- ============================================================================
-- 1.6b CONTACT_SETTINGS — Create missing table
-- src/hooks/pageBuilder/useContactSettings.js queries this table
-- ============================================================================

CREATE TABLE IF NOT EXISTS contact_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT,
  name_ar TEXT,
  tagline TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  address_ar TEXT,
  city TEXT,
  country TEXT,
  maps_url TEXT,
  facebook TEXT,
  instagram TEXT,
  twitter TEXT,
  linkedin TEXT,
  youtube TEXT,
  tiktok TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id)
);

ALTER TABLE contact_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contact_settings' AND policyname = 'contact_settings_tenant_access') THEN
    CREATE POLICY contact_settings_tenant_access ON contact_settings
      FOR ALL TO authenticated
      USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());
  END IF;
END $$;

-- ============================================================================
-- 1.7 FIX RLS POLICIES — Tenant isolation on admin-managed tables
-- Current: USING (is_admin_or_developer()) — ANY admin sees ALL data
-- Fixed: USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
-- ============================================================================

-- Testimonials
DROP POLICY IF EXISTS "Admins can manage testimonials" ON testimonials;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'testimonials' AND policyname = 'testimonials_tenant_access') THEN
    CREATE POLICY testimonials_tenant_access ON testimonials
      FOR ALL TO authenticated
      USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
      WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());
  END IF;
END $$;

-- Portfolio cases
DROP POLICY IF EXISTS "Admins can manage portfolio" ON portfolio_cases;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'portfolio_cases' AND policyname = 'portfolio_tenant_access') THEN
    CREATE POLICY portfolio_tenant_access ON portfolio_cases
      FOR ALL TO authenticated
      USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
      WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());
  END IF;
END $$;

-- Tourism packages
DROP POLICY IF EXISTS "Admins can manage packages" ON tourism_packages;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tourism_packages' AND policyname = 'tourism_tenant_access') THEN
    CREATE POLICY tourism_tenant_access ON tourism_packages
      FOR ALL TO authenticated
      USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
      WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());
  END IF;
END $$;

-- Translations
DROP POLICY IF EXISTS "Admins can manage translations" ON translations;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'translations' AND policyname = 'translations_tenant_access') THEN
    CREATE POLICY translations_tenant_access ON translations
      FOR ALL TO authenticated
      USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
      WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());
  END IF;
END $$;

-- Site settings
DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_settings' AND policyname = 'site_settings_tenant_access') THEN
    CREATE POLICY site_settings_tenant_access ON site_settings
      FOR ALL TO authenticated
      USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer())
      WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) OR is_developer());
  END IF;
END $$;

-- ============================================================================
-- 1.8 ADD tenant_id TO TABLES THAT LACK IT
-- ============================================================================

ALTER TABLE content_locks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================================================
-- 4.1 SERVICES COLUMN SYNC TRIGGER
-- Auto-sync CMS columns (title_en/title_ar) ↔ clinical columns (name_en/name_ar)
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_services_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- CMS → Clinical sync
  IF TG_OP = 'INSERT' OR NEW.title_en IS DISTINCT FROM OLD.title_en THEN
    NEW.name_en := COALESCE(NEW.title_en, NEW.name_en);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.title_ar IS DISTINCT FROM OLD.title_ar THEN
    NEW.name_ar := COALESCE(NEW.title_ar, NEW.name_ar);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.price_from IS DISTINCT FROM OLD.price_from THEN
    NEW.price_min := COALESCE(NEW.price_from, NEW.price_min);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.price_to IS DISTINCT FROM OLD.price_to THEN
    NEW.price_max := COALESCE(NEW.price_to, NEW.price_max);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.display_order IS DISTINCT FROM OLD.display_order THEN
    NEW.sort_order := COALESCE(NEW.display_order, NEW.sort_order);
  END IF;

  -- Clinical → CMS sync (only if CMS column wasn't also changed)
  IF TG_OP = 'UPDATE' THEN
    IF NEW.name_en IS DISTINCT FROM OLD.name_en AND NEW.title_en IS NOT DISTINCT FROM OLD.title_en THEN
      NEW.title_en := NEW.name_en;
    END IF;
    IF NEW.name_ar IS DISTINCT FROM OLD.name_ar AND NEW.title_ar IS NOT DISTINCT FROM OLD.title_ar THEN
      NEW.title_ar := NEW.name_ar;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS services_column_sync ON services;
CREATE TRIGGER services_column_sync
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION sync_services_columns();

-- ============================================================================
-- DONE — Migration 084 complete
-- Issues covered: #4-12 (Phase 1) + #29 (Phase 4.1)
-- ============================================================================
