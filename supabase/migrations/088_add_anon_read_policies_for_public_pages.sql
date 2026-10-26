-- Migration 088: Add anonymous read policies for remaining public website tables
-- The public website needs to read: contact_settings, services, doctors, testimonials
-- for tenant-specific clinic pages (filtered by tenant_id in queries)

-- =====================================================
-- 1. contact_settings: anon read (clinic contact info displayed on public site)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'contact_settings'::regclass
      AND polname = 'anon_read_contact_settings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "anon_read_contact_settings" ON contact_settings
        FOR SELECT
        TO anon
        USING (true)
    $policy$;
  END IF;
END $$;

-- =====================================================
-- 2. services: anon read (services listed on public website)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'services'::regclass
      AND polname = 'anon_read_services'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "anon_read_services" ON services
        FOR SELECT
        TO anon
        USING (true)
    $policy$;
  END IF;
END $$;

-- =====================================================
-- 3. doctors: anon read (doctors listed on public website)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'doctors'::regclass
      AND polname = 'anon_read_doctors'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "anon_read_doctors" ON doctors
        FOR SELECT
        TO anon
        USING (true)
    $policy$;
  END IF;
END $$;

-- =====================================================
-- 4. testimonials: anon read (testimonials shown on public website)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'testimonials'::regclass
      AND polname = 'anon_read_testimonials'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "anon_read_testimonials" ON testimonials
        FOR SELECT
        TO anon
        USING (true)
    $policy$;
  END IF;
END $$;
