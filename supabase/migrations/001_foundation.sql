-- =====================================================
-- DENTO DENTAL CLINIC MANAGEMENT SYSTEM
-- Database Migration - Phase 1: Foundation
-- =====================================================
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. AUTHENTICATION & USERS
-- =====================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('developer', 'admin', 'doctor', 'receptionist', 'cbct_tech', 'assistant', 'patient')),
  branch_id UUID,
  doctor_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Africa/Cairo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Login History (for security tracking)
CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  location TEXT,
  success BOOLEAN,
  failure_reason TEXT
);

-- =====================================================
-- 2. CLINIC STRUCTURE
-- =====================================================

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  address_en TEXT,
  address_ar TEXT,
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  map_link TEXT,
  work_hours JSONB DEFAULT '{"sunday": {"start": "10:00", "end": "22:00"}, "monday": {"start": "10:00", "end": "22:00"}, "tuesday": {"start": "10:00", "end": "22:00"}, "wednesday": {"start": "10:00", "end": "22:00"}, "thursday": {"start": "10:00", "end": "22:00"}, "friday": null, "saturday": {"start": "10:00", "end": "22:00"}}',
  ramadan_hours JSONB DEFAULT '{}',
  is_ramadan_mode BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint to users.branch_id (idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_branch'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id);
  END IF;
END $$;

-- Doctors
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  specialty_en TEXT,
  specialty_ar TEXT,
  bio_en TEXT,
  bio_ar TEXT,
  photo_url TEXT,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 30.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint to users.doctor_id
ALTER TABLE users ADD CONSTRAINT fk_users_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id);

-- Doctor Branch Assignments (many-to-many)
CREATE TABLE IF NOT EXISTS doctor_branch_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, branch_id)
);

-- Doctor Availability
CREATE TABLE IF NOT EXISTS doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. PATIENTS
-- =====================================================

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  national_id TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  source TEXT DEFAULT 'website',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient Medical History
CREATE TABLE IF NOT EXISTS patient_medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  condition TEXT NOT NULL,
  details TEXT,
  diagnosed_date DATE,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient Allergies
CREATE TABLE IF NOT EXISTS patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  allergen TEXT NOT NULL,
  reaction TEXT,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dental Charts
CREATE TABLE IF NOT EXISTS dental_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  tooth_number INTEGER CHECK (tooth_number BETWEEN 1 AND 32),
  condition TEXT CHECK (condition IN ('healthy', 'cavity', 'crown', 'bridge', 'implant', 'missing', 'rct', 'filling', 'extraction_needed', 'periodontal')),
  surface TEXT, -- occlusal, mesial, distal, buccal, lingual
  notes TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. APPOINTMENTS
-- =====================================================

-- Appointment Types
CREATE TABLE IF NOT EXISTS appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  color TEXT DEFAULT '#14b8a6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES doctors(id),
  branch_id UUID REFERENCES branches(id),
  appointment_type_id UUID REFERENCES appointment_types(id),
  chair_number INTEGER,
  datetime_start TIMESTAMPTZ NOT NULL,
  datetime_end TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'confirmed', 'in_progress', 'completed', 'no_show', 'cancelled')),
  cancellation_reason TEXT,
  notes TEXT,
  source TEXT DEFAULT 'admin' CHECK (source IN ('admin', 'website', 'phone', 'walk_in')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent double-booking for same doctor at same time
CREATE UNIQUE INDEX idx_appointments_no_overlap 
ON appointments (doctor_id, datetime_start) 
WHERE status NOT IN ('cancelled', 'no_show');

-- =====================================================
-- 5. CMS & WEBSITE CONTENT
-- =====================================================

-- Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES service_categories(id),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  image_url TEXT,
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  duration_minutes INTEGER DEFAULT 30,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members (for website display)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  role_en TEXT,
  role_ar TEXT,
  specialty_en TEXT,
  specialty_ar TEXT,
  bio_en TEXT,
  bio_ar TEXT,
  photo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name_en TEXT NOT NULL,
  patient_name_ar TEXT,
  treatment_en TEXT,
  treatment_ar TEXT,
  text_en TEXT NOT NULL,
  text_ar TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) DEFAULT 5,
  photo_url TEXT,
  video_url TEXT,
  location TEXT,
  date DATE,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio Cases
CREATE TABLE IF NOT EXISTS portfolio_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_ar TEXT,
  description_en TEXT,
  description_ar TEXT,
  category TEXT CHECK (category IN ('implants', 'veneers', 'whitening', 'orthodontics', 'restoration', 'crowns', 'other')),
  before_image_url TEXT,
  after_image_url TEXT,
  duration TEXT,
  doctor_id UUID REFERENCES doctors(id),
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tourism Packages
CREATE TABLE IF NOT EXISTS tourism_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  duration_days INTEGER,
  includes_json JSONB DEFAULT '[]',
  price_usd DECIMAL(10,2),
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Translations (for CMS)
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  en TEXT,
  ar TEXT,
  page TEXT,
  section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media Library
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  alt_text_en TEXT,
  alt_text_ar TEXT,
  size_bytes INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_doctor ON users(doctor_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(is_active);

CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(datetime_start);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_branch ON appointments(branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_doctor_availability_doctor ON doctor_availability(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_availability_day ON doctor_availability(day_of_week);

CREATE INDEX IF NOT EXISTS idx_dental_charts_patient ON dental_charts(patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_charts_tooth ON dental_charts(tooth_number);

CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key);
CREATE INDEX IF NOT EXISTS idx_translations_page ON translations(page);

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_doctor_availability_updated_at BEFORE UPDATE ON doctor_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_dental_charts_updated_at BEFORE UPDATE ON dental_charts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tourism_packages_updated_at BEFORE UPDATE ON tourism_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dental_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tourism_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if user is admin/developer
CREATE OR REPLACE FUNCTION is_admin_or_developer()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('admin', 'developer');
$$ LANGUAGE sql SECURITY DEFINER;

-- USERS TABLE POLICIES
CREATE POLICY "Users can view own record" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (is_admin_or_developer());
CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK (is_admin_or_developer());
CREATE POLICY "Admins can update users" ON users FOR UPDATE USING (is_admin_or_developer());
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (auth.uid() = id);

-- BRANCHES TABLE POLICIES (public read, admin write)
CREATE POLICY "Anyone can view active branches" ON branches FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all branches" ON branches FOR SELECT USING (is_admin_or_developer());
CREATE POLICY "Admins can insert branches" ON branches FOR INSERT WITH CHECK (is_admin_or_developer());
CREATE POLICY "Admins can update branches" ON branches FOR UPDATE USING (is_admin_or_developer());
CREATE POLICY "Admins can delete branches" ON branches FOR DELETE USING (is_admin_or_developer());

-- DOCTORS TABLE POLICIES
CREATE POLICY "Anyone can view active doctors" ON doctors FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all doctors" ON doctors FOR SELECT USING (is_admin_or_developer());
CREATE POLICY "Doctors can view own record" ON doctors FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Admins can manage doctors" ON doctors FOR ALL USING (is_admin_or_developer());
CREATE POLICY "Doctors can update own profile" ON doctors FOR UPDATE USING (
  user_id = auth.uid()
);

-- DOCTOR AVAILABILITY POLICIES
CREATE POLICY "Anyone can view doctor availability" ON doctor_availability FOR SELECT USING (true);
CREATE POLICY "Admins can manage availability" ON doctor_availability FOR ALL USING (is_admin_or_developer());
CREATE POLICY "Doctors can manage own availability" ON doctor_availability FOR ALL USING (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
);

-- PATIENTS TABLE POLICIES
CREATE POLICY "Admins/Receptionists can view patients" ON patients FOR SELECT USING (
  get_user_role() IN ('admin', 'developer', 'receptionist')
);
CREATE POLICY "Doctors can view assigned patients" ON patients FOR SELECT USING (
  get_user_role() = 'doctor' AND id IN (
    SELECT patient_id FROM appointments 
    WHERE doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  )
);
CREATE POLICY "Patients can view own record" ON patients FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Staff can insert patients" ON patients FOR INSERT WITH CHECK (
  get_user_role() IN ('admin', 'developer', 'receptionist', 'doctor')
);
CREATE POLICY "Staff can update patients" ON patients FOR UPDATE USING (
  get_user_role() IN ('admin', 'developer', 'receptionist', 'doctor')
);

-- APPOINTMENTS TABLE POLICIES
CREATE POLICY "Admins/Receptionists can view all appointments" ON appointments FOR SELECT USING (
  get_user_role() IN ('admin', 'developer', 'receptionist')
);
CREATE POLICY "Doctors can view own appointments" ON appointments FOR SELECT USING (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
);
CREATE POLICY "Staff can manage appointments" ON appointments FOR ALL USING (
  get_user_role() IN ('admin', 'developer', 'receptionist', 'doctor')
);

-- DENTAL CHARTS POLICIES
CREATE POLICY "Clinical staff can view dental charts" ON dental_charts FOR SELECT USING (
  get_user_role() IN ('admin', 'developer', 'doctor', 'assistant')
);
CREATE POLICY "Clinical staff can manage dental charts" ON dental_charts FOR ALL USING (
  get_user_role() IN ('admin', 'developer', 'doctor', 'assistant')
);

-- CMS CONTENT POLICIES (public read, admin write)
CREATE POLICY "Public can view active services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage services" ON services FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Public can view active categories" ON service_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON service_categories FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Public can view active team members" ON team_members FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage team members" ON team_members FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Public can view active testimonials" ON testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage testimonials" ON testimonials FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Public can view active portfolio" ON portfolio_cases FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage portfolio" ON portfolio_cases FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Public can view active packages" ON tourism_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage packages" ON tourism_packages FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Public can view translations" ON translations FOR SELECT USING (true);
CREATE POLICY "Admins can manage translations" ON translations FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Public can view site settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON site_settings FOR ALL USING (is_admin_or_developer());

CREATE POLICY "Public can view media" ON media FOR SELECT USING (true);
CREATE POLICY "Staff can manage media" ON media FOR ALL USING (
  get_user_role() IN ('admin', 'developer', 'receptionist')
);

CREATE POLICY "Public can view appointment types" ON appointment_types FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage appointment types" ON appointment_types FOR ALL USING (is_admin_or_developer());

-- =====================================================
-- 10. SEED DATA
-- =====================================================

-- Insert default appointment types
INSERT INTO appointment_types (name_en, name_ar, duration_minutes, color) VALUES
  ('Consultation', 'استشارة', 15, '#3b82f6'),
  ('Cleaning', 'تنظيف', 30, '#10b981'),
  ('Filling', 'حشو', 45, '#f59e0b'),
  ('Root Canal', 'علاج جذور', 90, '#ef4444'),
  ('Extraction', 'خلع', 30, '#8b5cf6'),
  ('Crown', 'تاج', 60, '#ec4899'),
  ('Implant', 'زراعة', 120, '#06b6d4'),
  ('Orthodontics', 'تقويم', 45, '#84cc16'),
  ('Whitening', 'تبييض', 60, '#f97316')
ON CONFLICT DO NOTHING;

-- Insert default service categories
INSERT INTO service_categories (name_en, name_ar, icon, sort_order) VALUES
  ('General Dentistry', 'طب الأسنان العام', 'tooth', 1),
  ('Cosmetic Dentistry', 'تجميل الأسنان', 'sparkles', 2),
  ('Orthodontics', 'تقويم الأسنان', 'align-center', 3),
  ('Oral Surgery', 'جراحة الفم', 'scissors', 4),
  ('Implants', 'زراعة الأسنان', 'pin', 5),
  ('Pediatric', 'طب أسنان الأطفال', 'baby', 6)
ON CONFLICT DO NOTHING;

-- Insert default site settings
INSERT INTO site_settings (key, value) VALUES
  ('theme', '{"primary": "#14b8a6", "secondary": "#f59e0b", "accent": "#3b82f6"}'),
  ('contact', '{"phone": "+201000000021", "email": "info@dento.clinic", "whatsapp": "+201000000021"}'),
  ('social', '{"facebook": "", "instagram": "", "twitter": "", "youtube": ""}'),
  ('seo', '{"title": "Dento Dental Clinic", "description": "Premium dental care in Egypt"}')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- DONE! 
-- Next steps:
-- 1. Create a user account in Supabase Auth
-- 2. Insert a record in the users table with that user's ID and role='developer'
-- =====================================================
