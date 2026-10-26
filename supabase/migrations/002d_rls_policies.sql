-- =============================================
-- PART 4: ENABLE RLS & SIMPLE POLICIES
-- Run this fourth
-- =============================================

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SIMPLE PERMISSIVE POLICIES
-- Allow all authenticated users full access
-- =============================================

-- BRANCHES
DROP POLICY IF EXISTS "Public can view active branches" ON branches;
DROP POLICY IF EXISTS "Admins can manage branches" ON branches;
CREATE POLICY "Anyone can view branches" ON branches FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage branches" ON branches FOR ALL USING (auth.uid() IS NOT NULL);

-- DOCTORS
DROP POLICY IF EXISTS "Public can view active doctors" ON doctors;
DROP POLICY IF EXISTS "Admins can manage doctors" ON doctors;
DROP POLICY IF EXISTS "Doctors can view own profile" ON doctors;
CREATE POLICY "Anyone can view doctors" ON doctors FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage doctors" ON doctors FOR ALL USING (auth.uid() IS NOT NULL);

-- PATIENTS
DROP POLICY IF EXISTS "Doctors can view their patients" ON patients;
DROP POLICY IF EXISTS "Receptionists can manage patients" ON patients;
DROP POLICY IF EXISTS "Admins can manage patients" ON patients;
CREATE POLICY "Authenticated can view patients" ON patients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert patients" ON patients FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update patients" ON patients FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete patients" ON patients FOR DELETE USING (auth.uid() IS NOT NULL);

-- MEDICAL HISTORY
DROP POLICY IF EXISTS "Doctors can view patient medical history" ON medical_history;
DROP POLICY IF EXISTS "Doctors can update patient medical history" ON medical_history;
DROP POLICY IF EXISTS "Admins can manage medical_history" ON medical_history;
CREATE POLICY "Authenticated can manage medical_history" ON medical_history FOR ALL USING (auth.uid() IS NOT NULL);

-- APPOINTMENTS
DROP POLICY IF EXISTS "Doctors can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Doctors can update their appointments" ON appointments;
DROP POLICY IF EXISTS "Receptionists can manage appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can manage appointments" ON appointments;
CREATE POLICY "Authenticated can manage appointments" ON appointments FOR ALL USING (auth.uid() IS NOT NULL);

-- TREATMENTS
DROP POLICY IF EXISTS "Doctors can view their treatments" ON treatments;
DROP POLICY IF EXISTS "Doctors can manage their treatments" ON treatments;
DROP POLICY IF EXISTS "Admins can manage treatments" ON treatments;
CREATE POLICY "Authenticated can manage treatments" ON treatments FOR ALL USING (auth.uid() IS NOT NULL);

-- INVOICES
DROP POLICY IF EXISTS "Receptionists can view invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can manage invoices" ON invoices;
CREATE POLICY "Authenticated can manage invoices" ON invoices FOR ALL USING (auth.uid() IS NOT NULL);

-- INVOICE ITEMS
DROP POLICY IF EXISTS "Admins can manage invoice_items" ON invoice_items;
CREATE POLICY "Authenticated can manage invoice_items" ON invoice_items FOR ALL USING (auth.uid() IS NOT NULL);

-- PAYMENTS
DROP POLICY IF EXISTS "Receptionists can manage payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
CREATE POLICY "Authenticated can manage payments" ON payments FOR ALL USING (auth.uid() IS NOT NULL);

-- MEDIA
DROP POLICY IF EXISTS "Public can view public media" ON media;
DROP POLICY IF EXISTS "Admins can manage media" ON media;
CREATE POLICY "Anyone can view media" ON media FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage media" ON media FOR ALL USING (auth.uid() IS NOT NULL);
