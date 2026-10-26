-- Migration: Add notification system tables
-- Created: 2025-01-10

-- 1. Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- appointment_reminder, appointment_confirmation, etc.
    channel VARCHAR(20) NOT NULL, -- whatsapp, email, sms
    recipient VARCHAR(100) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, delivered, failed
    error TEXT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_appointment ON notification_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_patient ON notification_logs(patient_id);

-- 3. Create role_permissions table for RBAC
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create notification_templates table for custom templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE, -- appointment_reminder, follow_up, etc.
    name VARCHAR(100) NOT NULL,
    description TEXT,
    whatsapp_template TEXT,
    email_subject VARCHAR(255),
    email_body TEXT,
    sms_template TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add reminder_sent column to appointments if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'reminder_sent'
    ) THEN
        ALTER TABLE appointments ADD COLUMN reminder_sent BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 6. Enable RLS on new tables
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for notification_logs
CREATE POLICY "Allow admins to view all notification logs" ON notification_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer')
        )
    );

CREATE POLICY "Allow admins to insert notification logs" ON notification_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer', 'receptionist')
        )
    );

-- Service role can do everything (for Edge Functions)
CREATE POLICY "Service role full access to notification_logs" ON notification_logs
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 8. RLS Policies for role_permissions
CREATE POLICY "Allow admins to view role permissions" ON role_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer')
        )
    );

CREATE POLICY "Allow admins to manage role permissions" ON role_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer')
        )
    );

-- 9. RLS Policies for notification_templates
CREATE POLICY "Allow admins to view notification templates" ON notification_templates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer')
        )
    );

CREATE POLICY "Allow admins to manage notification templates" ON notification_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'developer')
        )
    );

-- 10. Insert default notification templates
INSERT INTO notification_templates (key, name, description, whatsapp_template, email_subject, email_body) 
VALUES 
(
    'appointment_reminder',
    'Appointment Reminder',
    'Sent 24h before appointment',
    'مرحباً {patient_name}! 🦷

نذكرك بموعدك غداً في {branch_name}:
📅 {date}
⏰ {time}
دكتور: {doctor_name}

للتأكيد أو التعديل، اتصل بنا على {clinic_phone}',
    'تذكير بموعدك - {clinic_name}',
    'مرحباً {patient_name},

نود تذكيرك بموعدك القادم:

التاريخ: {date}
الوقت: {time}
الطبيب: {doctor_name}
الفرع: {branch_name}

للتأكيد أو إلغاء الموعد، يرجى الاتصال على {clinic_phone}.

مع تحيات فريق {clinic_name}'
),
(
    'appointment_confirmation',
    'Appointment Confirmation',
    'Sent when appointment is booked',
    'تم تأكيد موعدك! ✅

📅 {date}
⏰ {time}
👨‍⚕️ دكتور {doctor_name}
📍 {branch_name}

نتطلع لرؤيتك! 🦷',
    'تأكيد موعدك - {clinic_name}',
    'مرحباً {patient_name},

تم تأكيد موعدك بنجاح!

التفاصيل:
التاريخ: {date}
الوقت: {time}
الطبيب: {doctor_name}
الفرع: {branch_name}

مع تحيات فريق {clinic_name}'
),
(
    'appointment_cancelled',
    'Appointment Cancelled',
    'Sent when appointment is cancelled',
    'تم إلغاء موعدك ❌

كان الموعد:
📅 {date}
⏰ {time}

لحجز موعد جديد، يرجى الاتصال بنا على {clinic_phone}',
    'تم إلغاء موعدك - {clinic_name}',
    'مرحباً {patient_name},

نود إبلاغك بإلغاء موعدك:

التاريخ: {date}
الوقت: {time}

إذا كنت ترغب في إعادة جدولة الموعد، يرجى الاتصال بنا.

مع تحيات فريق {clinic_name}'
)
ON CONFLICT (key) DO NOTHING;

-- 11. Insert default role permissions
INSERT INTO role_permissions (role, permissions)
VALUES 
(
    'developer',
    '{
        "cms": ["view", "edit", "publish"],
        "branches": ["view", "create", "edit", "delete"],
        "doctors": ["view", "create", "edit", "delete", "assign_branch"],
        "appointments": ["view_own", "view_all", "create", "edit", "cancel"],
        "patients": ["view_own", "view_all", "create", "edit", "medical_history", "dental_chart"],
        "financial": ["view_own", "view_all", "create_invoice", "edit_invoice", "payments", "refunds"],
        "inventory": ["view", "manage", "order"],
        "analytics": ["view_own", "view_all", "export"],
        "settings": ["view", "edit", "users"]
    }'::jsonb
),
(
    'admin',
    '{
        "cms": ["view", "edit", "publish"],
        "branches": ["view", "create", "edit", "delete"],
        "doctors": ["view", "create", "edit", "delete", "assign_branch"],
        "appointments": ["view_own", "view_all", "create", "edit", "cancel"],
        "patients": ["view_own", "view_all", "create", "edit", "medical_history", "dental_chart"],
        "financial": ["view_own", "view_all", "create_invoice", "edit_invoice", "payments", "refunds"],
        "inventory": ["view", "manage", "order"],
        "analytics": ["view_own", "view_all", "export"],
        "settings": ["view", "edit", "users"]
    }'::jsonb
),
(
    'doctor',
    '{
        "cms": [],
        "branches": ["view"],
        "doctors": ["view"],
        "appointments": ["view_own", "create", "edit", "cancel"],
        "patients": ["view_own", "edit", "medical_history", "dental_chart"],
        "financial": ["view_own"],
        "inventory": ["view"],
        "analytics": ["view_own"],
        "settings": []
    }'::jsonb
),
(
    'receptionist',
    '{
        "cms": [],
        "branches": ["view"],
        "doctors": ["view"],
        "appointments": ["view_all", "create", "edit", "cancel"],
        "patients": ["view_all", "create", "edit"],
        "financial": ["view_all", "create_invoice", "payments"],
        "inventory": ["view"],
        "analytics": ["view_own"],
        "settings": []
    }'::jsonb
)
ON CONFLICT (role) DO NOTHING;

COMMENT ON TABLE notification_logs IS 'Log of all notifications sent via WhatsApp, Email, SMS';
COMMENT ON TABLE role_permissions IS 'Role-based access control permissions configuration';
COMMENT ON TABLE notification_templates IS 'Customizable notification message templates';
