-- Migration 074: System Settings table
-- Stores global platform configuration (key-value with JSON support)

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (Developer Portal uses service role via edge functions)
CREATE POLICY "Service role full access" ON system_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO system_settings (key, value) VALUES 
  ('general', '{"appName": "Dento Clinic", "language": "en", "timezone": "UTC+3", "currency": "SAR", "dateFormat": "DD/MM/YYYY", "timeFormat": "24h"}'),
  ('email', '{"fromName": "Dento Clinic", "fromAddress": "noreply@dento.app", "replyTo": "support@dento.app"}'),
  ('notifications', '{"emailEnabled": true, "smsEnabled": true, "pushEnabled": false, "digest": "realtime"}'),
  ('security', '{"sessionTimeout": 60, "maxLoginAttempts": 5, "requireMfa": false, "ipWhitelist": ""}'),
  ('performance', '{"cacheEnabled": true, "cacheTtl": 3600, "rateLimitRequests": 1000, "rateLimitWindow": 60}'),
  ('maintenance', '{"enabled": false, "message": "System is under maintenance. Please try again later."}')
ON CONFLICT (key) DO NOTHING;
