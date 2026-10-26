-- =============================================
-- ADD MISSING COLUMNS TO DOCTORS AND USERS TABLES
-- =============================================

-- Add gender column to doctors table for default avatar selection
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add constraint to ensure valid values for doctors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'doctors_gender_check'
  ) THEN
    ALTER TABLE doctors ADD CONSTRAINT doctors_gender_check 
    CHECK (gender IN ('male', 'female'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add constraint to ensure valid values for users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_gender_check 
    CHECK (gender IN ('male', 'female'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
