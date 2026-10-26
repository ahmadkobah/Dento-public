-- Migration: 046_contact_messages
-- Description: Create contact_messages table for website contact form submissions
-- Author: Phase 4.5 Bug Fixes
-- Date: 2026-02-03

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    service_interested VARCHAR(100),
    message TEXT,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    source VARCHAR(50) DEFAULT 'website_contact_form',
    assigned_to UUID REFERENCES auth.users(id),
    notes TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_tenant ON contact_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to insert (for public contact form)
CREATE POLICY "Anyone can submit contact messages"
    ON contact_messages
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Only authenticated users can read
CREATE POLICY "Authenticated users can read contact messages"
    ON contact_messages
    FOR SELECT
    TO authenticated
    USING (true);

-- Only authenticated users can update
CREATE POLICY "Authenticated users can update contact messages"
    ON contact_messages
    FOR UPDATE
    TO authenticated
    USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_contact_messages_updated_at ON contact_messages;
CREATE TRIGGER trigger_contact_messages_updated_at
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_messages_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON contact_messages TO anon;
GRANT ALL ON contact_messages TO authenticated;

COMMENT ON TABLE contact_messages IS 'Stores contact form submissions from the website';
