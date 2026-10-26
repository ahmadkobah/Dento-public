-- Migration 085: Add storage_path column to media_library
-- Needed for: media-upload edge function writes storage path for delete operations

-- Add storage_path column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'media_library' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE media_library ADD COLUMN storage_path TEXT;
    COMMENT ON COLUMN media_library.storage_path IS 'Full path in Supabase Storage bucket (e.g. {tenant_id}/{timestamp}-{uuid}.jpg)';
  END IF;
END $$;

-- Create index for path lookups
CREATE INDEX IF NOT EXISTS idx_media_library_path ON media_library(storage_path);
