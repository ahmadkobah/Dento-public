-- =====================================================
-- Migration: 032_notification_triggers.sql
-- Purpose: Connect notification triggers to appointments and payments
-- =====================================================

-- =====================================================
-- 1. NOTIFICATION TEMPLATES TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50), -- appointment_reminder, appointment_confirmation, payment_receipt, etc.
    channel VARCHAR(20) CHECK (channel IN ('whatsapp', 'email', 'sms')),
    subject VARCHAR(255), -- For email
    template_en TEXT,
    template_ar TEXT,
    variables JSONB DEFAULT '[]'::jsonb, -- List of variables used in template
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'type') THEN
        ALTER TABLE notification_templates ADD COLUMN type VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'channel') THEN
        ALTER TABLE notification_templates ADD COLUMN channel VARCHAR(20) CHECK (channel IN ('whatsapp', 'email', 'sms'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'subject') THEN
        ALTER TABLE notification_templates ADD COLUMN subject VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'template_en') THEN
        ALTER TABLE notification_templates ADD COLUMN template_en TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'template_ar') THEN
        ALTER TABLE notification_templates ADD COLUMN template_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'variables') THEN
        ALTER TABLE notification_templates ADD COLUMN variables JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add unique constraint on name if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'notification_templates_name_key' 
        AND conrelid = 'notification_templates'::regclass
    ) THEN
        ALTER TABLE notification_templates ADD CONSTRAINT notification_templates_name_key UNIQUE (name);
    END IF;
EXCEPTION WHEN duplicate_object THEN
    -- Constraint already exists, ignore
    NULL;
END $$;

-- Insert default templates (delete and re-insert to update)
DELETE FROM notification_templates WHERE name IN (
    'appointment_confirmation_whatsapp',
    'appointment_reminder_24h_whatsapp', 
    'payment_receipt_whatsapp',
    'appointment_cancelled_whatsapp'
);

-- Check if 'key' column exists and insert accordingly
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_templates' AND column_name = 'key') THEN
        -- Table has 'key' column - use it as identifier
        INSERT INTO notification_templates (key, name, type, channel, subject, template_en, template_ar, variables) VALUES
        ('appointment_confirmation_whatsapp', 'appointment_confirmation_whatsapp', 'appointment_confirmation', 'whatsapp', NULL,
         E'✅ Appointment Confirmed!\n\nDear {patient_name},\n\nYour appointment has been confirmed:\n📅 Date: {appointment_date}\n⏰ Time: {appointment_time}\n🏥 Branch: {branch_name}\n👨‍⚕️ Doctor: Dr. {doctor_name}\n\nPlease arrive 10 minutes early.\n\nThank you for choosing {clinic_name}!',
         E'✅ تم تأكيد الموعد!\n\nعزيزي/عزيزتي {patient_name},\n\nتم تأكيد موعدك:\n📅 التاريخ: {appointment_date}\n⏰ الوقت: {appointment_time}\n🏥 الفرع: {branch_name}\n👨‍⚕️ الطبيب: د. {doctor_name}\n\nيرجى الحضور قبل 10 دقائق.\n\nشكراً لاختيارك {clinic_name}!',
         '["patient_name", "appointment_date", "appointment_time", "branch_name", "doctor_name", "clinic_name"]'),
        ('appointment_reminder_24h_whatsapp', 'appointment_reminder_24h_whatsapp', 'appointment_reminder', 'whatsapp', NULL,
         E'⏰ Appointment Reminder\n\nDear {patient_name},\n\nThis is a reminder for your appointment tomorrow:\n📅 Date: {appointment_date}\n⏰ Time: {appointment_time}\n🏥 Branch: {branch_name}\n👨‍⚕️ Doctor: Dr. {doctor_name}\n\nTo confirm, reply YES\nTo reschedule, reply RESCHEDULE\n\n{clinic_name}',
         E'⏰ تذكير بالموعد\n\nعزيزي/عزيزتي {patient_name},\n\nهذا تذكير بموعدك غداً:\n📅 التاريخ: {appointment_date}\n⏰ الوقت: {appointment_time}\n🏥 الفرع: {branch_name}\n👨‍⚕️ الطبيب: د. {doctor_name}\n\nللتأكيد، أرسل نعم\nلإعادة الجدولة، أرسل تغيير\n\n{clinic_name}',
         '["patient_name", "appointment_date", "appointment_time", "branch_name", "doctor_name", "clinic_name"]'),
        ('payment_receipt_whatsapp', 'payment_receipt_whatsapp', 'payment_receipt', 'whatsapp', NULL,
         E'💰 Payment Received\n\nDear {patient_name},\n\nWe have received your payment:\n\n📄 Invoice: #{invoice_number}\n💵 Amount: {amount}\n💳 Method: {payment_method}\n📅 Date: {payment_date}\n\nBalance: {balance_due}\n\nThank you!\n{clinic_name}',
         E'💰 تم استلام الدفع\n\nعزيزي/عزيزتي {patient_name},\n\nتم استلام دفعتك:\n\n📄 الفاتورة: #{invoice_number}\n💵 المبلغ: {amount}\n💳 طريقة الدفع: {payment_method}\n📅 التاريخ: {payment_date}\n\nالرصيد المتبقي: {balance_due}\n\nشكراً!\n{clinic_name}',
         '["patient_name", "invoice_number", "amount", "payment_method", "payment_date", "balance_due", "clinic_name"]'),
        ('appointment_cancelled_whatsapp', 'appointment_cancelled_whatsapp', 'appointment_cancelled', 'whatsapp', NULL,
         E'❌ Appointment Cancelled\n\nDear {patient_name},\n\nYour appointment has been cancelled:\n📅 Date: {appointment_date}\n⏰ Time: {appointment_time}\n\nTo book a new appointment, please contact us or visit our website.\n\n{clinic_name}',
         E'❌ تم إلغاء الموعد\n\nعزيزي/عزيزتي {patient_name},\n\nتم إلغاء موعدك:\n📅 التاريخ: {appointment_date}\n⏰ الوقت: {appointment_time}\n\nلحجز موعد جديد، يرجى التواصل معنا أو زيارة موقعنا.\n\n{clinic_name}',
         '["patient_name", "appointment_date", "appointment_time", "clinic_name"]');
    ELSE
        -- Table doesn't have 'key' column - use name only
        INSERT INTO notification_templates (name, type, channel, subject, template_en, template_ar, variables) VALUES
        ('appointment_confirmation_whatsapp', 'appointment_confirmation', 'whatsapp', NULL,
         E'✅ Appointment Confirmed!\n\nDear {patient_name},\n\nYour appointment has been confirmed:\n📅 Date: {appointment_date}\n⏰ Time: {appointment_time}\n🏥 Branch: {branch_name}\n👨‍⚕️ Doctor: Dr. {doctor_name}\n\nPlease arrive 10 minutes early.\n\nThank you for choosing {clinic_name}!',
         E'✅ تم تأكيد الموعد!\n\nعزيزي/عزيزتي {patient_name},\n\nتم تأكيد موعدك:\n📅 التاريخ: {appointment_date}\n⏰ الوقت: {appointment_time}\n🏥 الفرع: {branch_name}\n👨‍⚕️ الطبيب: د. {doctor_name}\n\nيرجى الحضور قبل 10 دقائق.\n\nشكراً لاختيارك {clinic_name}!',
         '["patient_name", "appointment_date", "appointment_time", "branch_name", "doctor_name", "clinic_name"]'),
        ('appointment_reminder_24h_whatsapp', 'appointment_reminder', 'whatsapp', NULL,
         E'⏰ Appointment Reminder\n\nDear {patient_name},\n\nThis is a reminder for your appointment tomorrow:\n📅 Date: {appointment_date}\n⏰ Time: {appointment_time}\n🏥 Branch: {branch_name}\n👨‍⚕️ Doctor: Dr. {doctor_name}\n\nTo confirm, reply YES\nTo reschedule, reply RESCHEDULE\n\n{clinic_name}',
         E'⏰ تذكير بالموعد\n\nعزيزي/عزيزتي {patient_name},\n\nهذا تذكير بموعدك غداً:\n📅 التاريخ: {appointment_date}\n⏰ الوقت: {appointment_time}\n🏥 الفرع: {branch_name}\n👨‍⚕️ الطبيب: د. {doctor_name}\n\nللتأكيد، أرسل نعم\nلإعادة الجدولة، أرسل تغيير\n\n{clinic_name}',
         '["patient_name", "appointment_date", "appointment_time", "branch_name", "doctor_name", "clinic_name"]'),
        ('payment_receipt_whatsapp', 'payment_receipt', 'whatsapp', NULL,
         E'💰 Payment Received\n\nDear {patient_name},\n\nWe have received your payment:\n\n📄 Invoice: #{invoice_number}\n💵 Amount: {amount}\n💳 Method: {payment_method}\n📅 Date: {payment_date}\n\nBalance: {balance_due}\n\nThank you!\n{clinic_name}',
         E'💰 تم استلام الدفع\n\nعزيزي/عزيزتي {patient_name},\n\nتم استلام دفعتك:\n\n📄 الفاتورة: #{invoice_number}\n💵 المبلغ: {amount}\n💳 طريقة الدفع: {payment_method}\n📅 التاريخ: {payment_date}\n\nالرصيد المتبقي: {balance_due}\n\nشكراً!\n{clinic_name}',
         '["patient_name", "invoice_number", "amount", "payment_method", "payment_date", "balance_due", "clinic_name"]'),
        ('appointment_cancelled_whatsapp', 'appointment_cancelled', 'whatsapp', NULL,
         E'❌ Appointment Cancelled\n\nDear {patient_name},\n\nYour appointment has been cancelled:\n📅 Date: {appointment_date}\n⏰ Time: {appointment_time}\n\nTo book a new appointment, please contact us or visit our website.\n\n{clinic_name}',
         E'❌ تم إلغاء الموعد\n\nعزيزي/عزيزتي {patient_name},\n\nتم إلغاء موعدك:\n📅 التاريخ: {appointment_date}\n⏰ الوقت: {appointment_time}\n\nلحجز موعد جديد، يرجى التواصل معنا أو زيارة موقعنا.\n\n{clinic_name}',
         '["patient_name", "appointment_date", "appointment_time", "clinic_name"]');
    END IF;
END $$;

-- =====================================================
-- 2. NOTIFICATION QUEUE TABLE (for async processing)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES notification_templates(id),
    patient_id UUID REFERENCES patients(id),
    recipient VARCHAR(255) NOT NULL, -- phone or email
    channel VARCHAR(20) NOT NULL,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_at);

-- =====================================================
-- 3. FUNCTIONS TO QUEUE NOTIFICATIONS
-- =====================================================

-- Function to queue appointment notification
CREATE OR REPLACE FUNCTION queue_appointment_notification(
    p_appointment_id UUID,
    p_template_type VARCHAR(50)
) RETURNS void AS $$
DECLARE
    v_appointment RECORD;
    v_template RECORD;
    v_patient RECORD;
    v_doctor RECORD;
    v_branch RECORD;
    v_clinic_name TEXT;
    v_variables JSONB;
BEGIN
    -- Get appointment details
    SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    -- Get patient
    SELECT * INTO v_patient FROM patients WHERE id = v_appointment.patient_id;
    IF NOT FOUND OR v_patient.phone IS NULL THEN RETURN; END IF;
    
    -- Get doctor
    SELECT d.*, u.full_name as doctor_name 
    INTO v_doctor 
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    WHERE d.id = v_appointment.doctor_id;
    
    -- Get branch
    SELECT * INTO v_branch FROM branches WHERE id = v_appointment.branch_id;
    
    -- Get clinic name from settings
    SELECT value INTO v_clinic_name FROM site_settings WHERE key = 'clinic_name';
    
    -- Get template
    SELECT * INTO v_template 
    FROM notification_templates 
    WHERE type = p_template_type AND channel = 'whatsapp' AND is_active = true
    LIMIT 1;
    
    IF NOT FOUND THEN RETURN; END IF;
    
    -- Build variables
    v_variables := jsonb_build_object(
        'patient_name', v_patient.full_name,
        'appointment_date', TO_CHAR(v_appointment.appointment_date, 'Mon DD, YYYY'),
        'appointment_time', TO_CHAR(v_appointment.start_time, 'HH12:MI AM'),
        'branch_name', COALESCE(v_branch.name_en, ''),
        'doctor_name', COALESCE(v_doctor.doctor_name, ''),
        'clinic_name', COALESCE(v_clinic_name, 'Dental Clinic')
    );
    
    -- Insert into queue
    INSERT INTO notification_queue (
        template_id,
        patient_id,
        recipient,
        channel,
        variables,
        scheduled_at
    ) VALUES (
        v_template.id,
        v_patient.id,
        v_patient.phone,
        'whatsapp',
        v_variables,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue payment notification
CREATE OR REPLACE FUNCTION queue_payment_notification(
    p_payment_id UUID
) RETURNS void AS $$
DECLARE
    v_payment RECORD;
    v_invoice RECORD;
    v_patient RECORD;
    v_template RECORD;
    v_clinic_name TEXT;
    v_currency TEXT;
    v_variables JSONB;
BEGIN
    -- Get payment details
    SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    -- Get invoice
    SELECT * INTO v_invoice FROM invoices WHERE id = v_payment.invoice_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    -- Get patient
    SELECT * INTO v_patient FROM patients WHERE id = v_invoice.patient_id;
    IF NOT FOUND OR v_patient.phone IS NULL THEN RETURN; END IF;
    
    -- Get settings
    SELECT value INTO v_clinic_name FROM site_settings WHERE key = 'clinic_name';
    SELECT value INTO v_currency FROM site_settings WHERE key = 'currency';
    
    -- Get template
    SELECT * INTO v_template 
    FROM notification_templates 
    WHERE type = 'payment_receipt' AND channel = 'whatsapp' AND is_active = true
    LIMIT 1;
    
    IF NOT FOUND THEN RETURN; END IF;
    
    -- Build variables
    v_variables := jsonb_build_object(
        'patient_name', v_patient.full_name,
        'invoice_number', v_invoice.invoice_number,
        'amount', CONCAT(COALESCE(v_currency, 'SAR'), ' ', v_payment.amount::TEXT),
        'payment_method', INITCAP(REPLACE(v_payment.payment_method, '_', ' ')),
        'payment_date', TO_CHAR(v_payment.created_at, 'Mon DD, YYYY'),
        'balance_due', CONCAT(COALESCE(v_currency, 'SAR'), ' ', (v_invoice.total_amount - v_invoice.paid_amount)::TEXT),
        'clinic_name', COALESCE(v_clinic_name, 'Dental Clinic')
    );
    
    -- Insert into queue
    INSERT INTO notification_queue (
        template_id,
        patient_id,
        recipient,
        channel,
        variables,
        scheduled_at
    ) VALUES (
        v_template.id,
        v_patient.id,
        v_patient.phone,
        'whatsapp',
        v_variables,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. TRIGGER FUNCTIONS
-- =====================================================

-- Trigger function for appointment changes
CREATE OR REPLACE FUNCTION trigger_appointment_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- On new appointment (confirmed status)
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        PERFORM queue_appointment_notification(NEW.id, 'appointment_confirmation');
    END IF;
    
    -- On status change to confirmed
    IF TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
        PERFORM queue_appointment_notification(NEW.id, 'appointment_confirmation');
    END IF;
    
    -- On status change to cancelled
    IF TG_OP = 'UPDATE' AND OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        PERFORM queue_appointment_notification(NEW.id, 'appointment_cancelled');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for payment
CREATE OR REPLACE FUNCTION trigger_payment_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- On new payment
    IF TG_OP = 'INSERT' THEN
        PERFORM queue_payment_notification(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS appointment_notification_trigger ON appointments;
DROP TRIGGER IF EXISTS payment_notification_trigger ON payments;

-- Create appointment notification trigger
CREATE TRIGGER appointment_notification_trigger
    AFTER INSERT OR UPDATE OF status ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_appointment_notification();

-- Create payment notification trigger
CREATE TRIGGER payment_notification_trigger
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_payment_notification();

-- =====================================================
-- 6. SCHEDULED REMINDER FUNCTION (for pg_cron)
-- =====================================================

-- Function to queue reminders for tomorrow's appointments
CREATE OR REPLACE FUNCTION queue_appointment_reminders()
RETURNS void AS $$
DECLARE
    v_appointment RECORD;
BEGIN
    -- Find confirmed appointments for tomorrow
    FOR v_appointment IN
        SELECT id 
        FROM appointments 
        WHERE appointment_date = CURRENT_DATE + INTERVAL '1 day'
        AND status = 'confirmed'
    LOOP
        PERFORM queue_appointment_notification(v_appointment.id, 'appointment_reminder');
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: To schedule daily reminders, use pg_cron (Supabase has this):
-- SELECT cron.schedule('daily-appointment-reminders', '0 18 * * *', 'SELECT queue_appointment_reminders()');

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Templates: Admins can manage, staff can view
CREATE POLICY "notification_templates_admin_all" ON notification_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('developer', 'admin'))
    );

CREATE POLICY "notification_templates_view" ON notification_templates
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Queue: Admins can see all, patients see their own
CREATE POLICY "notification_queue_admin_all" ON notification_queue
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('developer', 'admin'))
    );

CREATE POLICY "notification_queue_patient_view" ON notification_queue
    FOR SELECT TO authenticated
    USING (
        patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    );

-- =====================================================
-- 8. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_notification_queue_patient ON notification_queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type, channel);

COMMENT ON TABLE notification_templates IS 'Templates for automated notifications';
COMMENT ON TABLE notification_queue IS 'Queue of pending notifications to be sent';
COMMENT ON FUNCTION queue_appointment_notification IS 'Queues a notification for an appointment event';
COMMENT ON FUNCTION queue_payment_notification IS 'Queues a notification for a payment receipt';
