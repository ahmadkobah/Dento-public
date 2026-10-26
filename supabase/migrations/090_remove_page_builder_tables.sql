-- Migration 090: Remove page builder system tables
-- The page builder / website builder module is being removed for now.
-- Static website pages are used instead.
-- Keep services, testimonials, portfolio_cases, contact_settings, website_settings 
-- as they contain clinical/business data.

-- Drop page builder specific tables (cascade to remove foreign keys)
DROP TABLE IF EXISTS auto_save_drafts CASCADE;
DROP TABLE IF EXISTS content_locks CASCADE;
DROP TABLE IF EXISTS content_change_log CASCADE;
DROP TABLE IF EXISTS content_drafts CASCADE;
DROP TABLE IF EXISTS page_versions CASCADE;
DROP TABLE IF EXISTS section_templates CASCADE;
DROP TABLE IF EXISTS page_templates CASCADE;
DROP TABLE IF EXISTS navigation_menus CASCADE;
DROP TABLE IF EXISTS theme_history CASCADE;
DROP TABLE IF EXISTS website_themes CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS media_library CASCADE;

-- Remove anon RLS policies on pages table (since it's dropped)
-- These were added in migrations 087-089 and are now orphaned
-- (CASCADE will handle these automatically)
